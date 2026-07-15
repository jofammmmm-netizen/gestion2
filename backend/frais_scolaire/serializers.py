from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from backend.eleves.models import AnneeScolaire

from .models import (
    MODE_PAIEMENT_CHOICES,
    STATUT_PAIEMENT_CHOICES,
    TRIMESTRE_CHOICES,
    FraisScolaire,
    Paiement,
    TarifFrais,
    TypeFrais,
)


def get_annee_active():
    return AnneeScolaire.objects.filter(est_active=True).first()


class TypeFraisSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeFrais
        fields = '__all__'
        read_only_fields = ('code', 'cree_le', 'modifie_le')


class TarifFraisSerializer(serializers.ModelSerializer):
    annee_scolaire_nom = serializers.CharField(source='annee_scolaire.nom', read_only=True)
    niveau_nom = serializers.CharField(source='niveau.nom', read_only=True)
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    classe_nom = serializers.SerializerMethodField()
    type_frais_nom = serializers.CharField(source='type_frais.nom', read_only=True)
    trimestre_nom = serializers.CharField(source='get_trimestre_display', read_only=True)

    class Meta:
        model = TarifFrais
        fields = '__all__'
        read_only_fields = ('annee_scolaire', 'cree_le', 'modifie_le')

    def get_classe_nom(self, obj):
        return str(obj.classe) if obj.classe else ''

    def validate_montant(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le montant doit etre superieur a zero.')
        return value

    def create(self, validated_data):
        annee_active = get_annee_active()
        if not annee_active:
            raise serializers.ValidationError({
                'annee_scolaire': "Aucune annee scolaire active n'est definie."
            })

        validated_data['annee_scolaire'] = annee_active
        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)


class FraisScolaireSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source='eleve.nom_complet', read_only=True)
    eleve_matricule = serializers.CharField(source='eleve.matricule', read_only=True)
    annee_scolaire_nom = serializers.CharField(source='annee_scolaire.nom', read_only=True)
    classe_nom = serializers.SerializerMethodField()
    type_frais_nom = serializers.CharField(source='type_frais.nom', read_only=True)
    trimestre_nom = serializers.CharField(source='get_trimestre_display', read_only=True)
    total_paye = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    solde_restant = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    statut_paiement = serializers.CharField(read_only=True)

    class Meta:
        model = FraisScolaire
        fields = '__all__'
        read_only_fields = ('annee_scolaire', 'classe', 'cree_le', 'modifie_le')
        extra_kwargs = {
            'montant_total': {'required': False},
        }

    def get_classe_nom(self, obj):
        return str(obj.classe) if obj.classe else ''

    def validate_montant_total(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le montant total doit etre superieur a zero.')
        return value

    def _resolve_montant_total(self, validated_data):
        if validated_data.get('montant_total'):
            return validated_data

        eleve = validated_data.get('eleve')
        type_frais = validated_data.get('type_frais')
        trimestre = validated_data.get('trimestre')
        annee_active = get_annee_active()

        if not eleve or not type_frais or not trimestre or not annee_active:
            raise serializers.ValidationError({
                'montant_total': 'Le montant est obligatoire si aucun tarif actif ne correspond.'
            })

        tarifs = TarifFrais.objects.filter(
            annee_scolaire=annee_active,
            type_frais=type_frais,
            trimestre=trimestre,
            actif=True,
        )

        if eleve.classe:
            tarif = tarifs.filter(classe=eleve.classe).first()
            if not tarif and eleve.classe.section:
                tarif = tarifs.filter(classe__isnull=True, niveau=eleve.classe.niveau, section=eleve.classe.section).first()
            if not tarif:
                tarif = tarifs.filter(classe__isnull=True, section__isnull=True, niveau=eleve.classe.niveau).first()
        else:
            tarif = None

        if not tarif:
            raise serializers.ValidationError({
                'montant_total': 'Aucun tarif actif trouve. Saisissez le montant manuellement.'
            })

        validated_data['montant_total'] = tarif.montant
        return validated_data

    def create(self, validated_data):
        annee_active = get_annee_active()
        if not annee_active:
            raise serializers.ValidationError({
                'annee_scolaire': "Aucune annee scolaire active n'est definie."
            })

        validated_data['annee_scolaire'] = annee_active
        if validated_data.get('eleve'):
            validated_data['classe'] = validated_data['eleve'].classe
        validated_data = self._resolve_montant_total(validated_data)

        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

    def update(self, instance, validated_data):
        if validated_data.get('eleve'):
            validated_data['classe'] = validated_data['eleve'].classe
        validated_data = self._resolve_montant_total(validated_data)

        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)


class PaiementSerializer(serializers.ModelSerializer):
    eleve_nom = serializers.CharField(source='eleve.nom_complet', read_only=True)
    eleve_matricule = serializers.CharField(source='eleve.matricule', read_only=True)
    frais_libelle = serializers.SerializerMethodField()
    mode_paiement_nom = serializers.CharField(source='get_mode_paiement_display', read_only=True)
    statut_nom = serializers.CharField(source='get_statut_display', read_only=True)
    agent_nom = serializers.CharField(source='agent.username', read_only=True)

    class Meta:
        model = Paiement
        fields = '__all__'
        read_only_fields = ('reference', 'eleve', 'agent', 'cree_le', 'modifie_le')

    def get_frais_libelle(self, obj):
        return str(obj.frais) if obj.frais else ''

    def validate_montant_paye(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le montant paye doit etre superieur a zero.')
        return value

    def create(self, validated_data):
        frais = validated_data.get('frais')
        request = self.context.get('request')

        if frais:
            validated_data['eleve'] = frais.eleve
        if request and request.user.is_authenticated:
            validated_data['agent'] = request.user

        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

    def update(self, instance, validated_data):
        if validated_data.get('frais'):
            validated_data['eleve'] = validated_data['frais'].eleve

        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)


class ChoixFraisSerializer(serializers.Serializer):
    trimestres = serializers.SerializerMethodField()
    modes_paiement = serializers.SerializerMethodField()
    statuts_paiement = serializers.SerializerMethodField()

    def get_trimestres(self, obj):
        return [{'id': value, 'nom': label} for value, label in TRIMESTRE_CHOICES]

    def get_modes_paiement(self, obj):
        return [{'id': value, 'nom': label} for value, label in MODE_PAIEMENT_CHOICES]

    def get_statuts_paiement(self, obj):
        return [{'id': value, 'nom': label} for value, label in STATUT_PAIEMENT_CHOICES]
