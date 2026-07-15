from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from .models import AnneeScolaire, Classe, Eleve, Niveau, Section, StatutEleve, normaliser_telephone


class NiveauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Niveau
        fields = '__all__'
        read_only_fields = ('code', 'cree_le', 'modifie_le')


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'
        read_only_fields = ('code', 'cree_le', 'modifie_le')


class StatutEleveSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatutEleve
        fields = '__all__'
        read_only_fields = ('code', 'cree_le', 'modifie_le')


class AnneeScolaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnneeScolaire
        fields = '__all__'
        read_only_fields = ('cree_le', 'modifie_le')


class ClasseSerializer(serializers.ModelSerializer):
    niveau_nom = serializers.CharField(source='niveau.nom', read_only=True)
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    libelle = serializers.SerializerMethodField()

    class Meta:
        model = Classe
        fields = '__all__'
        read_only_fields = ('code', 'cree_le', 'modifie_le')

    def get_libelle(self, obj):
        return str(obj)


class EleveSerializer(serializers.ModelSerializer):
    nom_complet = serializers.CharField(read_only=True)
    classe_nom = serializers.SerializerMethodField()
    statut_nom = serializers.SerializerMethodField()
    annee_scolaire_nom = serializers.CharField(source='annee_scolaire.nom', read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Eleve
        fields = '__all__'
        read_only_fields = ('matricule', 'date_inscription', 'annee_scolaire', 'cree_le', 'modifie_le')

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if not obj.photo:
            return ''
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url

    def get_classe_nom(self, obj):
        return str(obj.classe) if obj.classe else ''

    def get_statut_nom(self, obj):
        return obj.statut.nom if obj.statut else ''

    def validate_telephone(self, value):
        if not value:
            return value
        return normaliser_telephone(value)

    def validate_date_naissance(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError('La date de naissance ne peut pas etre dans le futur.')
        return value

    def create(self, validated_data):
        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

    def update(self, instance, validated_data):
        try:
            return super().update(instance, validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
