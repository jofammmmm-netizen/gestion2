from django.db.models import Sum
from rest_framework import filters, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from backend.eleves.models import AnneeScolaire, Eleve

from .models import FraisScolaire, Paiement, TarifFrais, TypeFrais
from .serializers import (
    ChoixFraisSerializer,
    FraisScolaireSerializer,
    PaiementSerializer,
    TarifFraisSerializer,
    TypeFraisSerializer,
)


class SuperAdminDeleteMixin:
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'detail': 'Seul un superadmin peut supprimer cet element.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class AnneeActiveRequiredMixin:
    def check_annee_active(self):
        if not AnneeScolaire.objects.filter(est_active=True).exists():
            return Response(
                {'detail': "Aucune annee scolaire active n'est definie. Definissez-la d'abord dans l'admin Django."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def create(self, request, *args, **kwargs):
        response = self.check_annee_active()
        if response:
            return response
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        response = self.check_annee_active()
        if response:
            return response
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        response = self.check_annee_active()
        if response:
            return response
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        response = self.check_annee_active()
        if response:
            return response
        return super().destroy(request, *args, **kwargs)


class TypeFraisViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = TypeFrais.objects.all()
    serializer_class = TypeFraisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code', 'description']
    ordering_fields = ['nom', 'actif', 'cree_le']

    def get_queryset(self):
        queryset = super().get_queryset()
        actif = self.request.query_params.get('actif')

        if actif in ['true', 'false']:
            queryset = queryset.filter(actif=actif == 'true')

        return queryset


class TarifFraisViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = TarifFrais.objects.select_related('annee_scolaire', 'niveau', 'section', 'classe', 'type_frais')
    serializer_class = TarifFraisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['type_frais__nom', 'niveau__nom', 'section__nom', 'classe__nom']
    ordering_fields = ['trimestre', 'montant', 'type_frais__nom', 'cree_le']

    def get_queryset(self):
        queryset = super().get_queryset()
        annee_active = AnneeScolaire.objects.filter(est_active=True).first()
        annee_scolaire = self.request.query_params.get('annee_scolaire')
        niveau = self.request.query_params.get('niveau')
        section = self.request.query_params.get('section')
        classe = self.request.query_params.get('classe')
        type_frais = self.request.query_params.get('type_frais')
        trimestre = self.request.query_params.get('trimestre')
        actif = self.request.query_params.get('actif')

        if annee_scolaire == 'all':
            pass
        elif annee_scolaire:
            queryset = queryset.filter(annee_scolaire_id=annee_scolaire)
        elif annee_active:
            queryset = queryset.filter(annee_scolaire=annee_active)
        else:
            queryset = queryset.none()

        if niveau:
            queryset = queryset.filter(niveau_id=niveau)
        if section:
            queryset = queryset.filter(section_id=section)
        if classe:
            queryset = queryset.filter(classe_id=classe)
        if type_frais:
            queryset = queryset.filter(type_frais_id=type_frais)
        if trimestre:
            queryset = queryset.filter(trimestre=trimestre)
        if actif in ['true', 'false']:
            queryset = queryset.filter(actif=actif == 'true')

        return queryset


class FraisScolaireViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = FraisScolaire.objects.select_related(
        'eleve',
        'annee_scolaire',
        'classe',
        'classe__niveau',
        'classe__section',
        'type_frais',
    ).prefetch_related('paiements')
    serializer_class = FraisScolaireSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['eleve__matricule', 'eleve__nom', 'eleve__post_nom', 'eleve__prenom', 'type_frais__nom']
    ordering_fields = ['eleve__nom', 'trimestre', 'montant_total', 'cree_le']

    def get_queryset(self):
        queryset = super().get_queryset()
        annee_active = AnneeScolaire.objects.filter(est_active=True).first()
        annee_scolaire = self.request.query_params.get('annee_scolaire')
        eleve = self.request.query_params.get('eleve')
        classe = self.request.query_params.get('classe')
        niveau = self.request.query_params.get('niveau')
        section = self.request.query_params.get('section')
        type_frais = self.request.query_params.get('type_frais')
        trimestre = self.request.query_params.get('trimestre')
        statut = self.request.query_params.get('statut')

        if annee_scolaire == 'all':
            pass
        elif annee_scolaire:
            queryset = queryset.filter(annee_scolaire_id=annee_scolaire)
        elif annee_active:
            queryset = queryset.filter(annee_scolaire=annee_active)
        else:
            queryset = queryset.none()

        if eleve:
            queryset = queryset.filter(eleve_id=eleve)
        if classe:
            queryset = queryset.filter(classe_id=classe)
        if niveau:
            queryset = queryset.filter(classe__niveau_id=niveau)
        if section:
            queryset = queryset.filter(classe__section_id=section)
        if type_frais:
            queryset = queryset.filter(type_frais_id=type_frais)
        if trimestre:
            queryset = queryset.filter(trimestre=trimestre)

        if statut in ['non_paye', 'partiel', 'paye']:
            ids = [frais.id for frais in queryset if frais.statut_paiement == statut]
            queryset = queryset.filter(id__in=ids)

        return queryset


class PaiementViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = Paiement.objects.select_related('frais', 'eleve', 'agent', 'frais__type_frais', 'frais__annee_scolaire')
    serializer_class = PaiementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'eleve__matricule', 'eleve__nom', 'eleve__post_nom', 'eleve__prenom']
    ordering_fields = ['date_paiement', 'montant_paye', 'reference', 'cree_le']

    def get_queryset(self):
        queryset = super().get_queryset()
        annee_active = AnneeScolaire.objects.filter(est_active=True).first()
        annee_scolaire = self.request.query_params.get('annee_scolaire')
        eleve = self.request.query_params.get('eleve')
        frais = self.request.query_params.get('frais')
        statut = self.request.query_params.get('statut')
        mode = self.request.query_params.get('mode_paiement')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')

        if annee_scolaire == 'all':
            pass
        elif annee_scolaire:
            queryset = queryset.filter(frais__annee_scolaire_id=annee_scolaire)
        elif annee_active:
            queryset = queryset.filter(frais__annee_scolaire=annee_active)
        else:
            queryset = queryset.none()

        if eleve:
            queryset = queryset.filter(eleve_id=eleve)
        if frais:
            queryset = queryset.filter(frais_id=frais)
        if statut:
            queryset = queryset.filter(statut=statut)
        if mode:
            queryset = queryset.filter(mode_paiement=mode)
        if date_debut:
            queryset = queryset.filter(date_paiement__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_paiement__lte=date_fin)

        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def choix_frais(request):
    return Response(ChoixFraisSerializer({}).data)


def trouver_tarif(eleve, type_frais, trimestre, annee_active):
    tarifs = TarifFrais.objects.filter(
        annee_scolaire=annee_active,
        type_frais=type_frais,
        trimestre=trimestre,
        actif=True,
    )

    if not eleve.classe:
        return None

    tarif = tarifs.filter(classe=eleve.classe).first()
    if tarif:
        return tarif

    if eleve.classe.section:
        tarif = tarifs.filter(
            classe__isnull=True,
            niveau=eleve.classe.niveau,
            section=eleve.classe.section,
        ).first()
        if tarif:
            return tarif

    return tarifs.filter(
        classe__isnull=True,
        section__isnull=True,
        niveau=eleve.classe.niveau,
    ).first()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def appliquer_frais(request):
    annee_active = AnneeScolaire.objects.filter(est_active=True).first()
    if not annee_active:
        return Response(
            {'detail': "Aucune annee scolaire active n'est definie."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tarif_id = request.data.get('tarif')
    description = request.data.get('description', '')

    if not tarif_id:
        return Response(
            {'detail': 'Le tarif est obligatoire pour appliquer les frais.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        tarif = TarifFrais.objects.select_related('annee_scolaire', 'type_frais', 'classe', 'niveau', 'section').get(
            pk=tarif_id,
            annee_scolaire=annee_active,
            actif=True,
        )
    except TarifFrais.DoesNotExist:
        return Response({'detail': 'Tarif actif introuvable pour cette annee scolaire.'}, status=status.HTTP_400_BAD_REQUEST)

    eleves = Eleve.objects.filter(annee_scolaire=annee_active).select_related('classe', 'classe__niveau', 'classe__section')

    if tarif.classe_id:
        eleves = eleves.filter(classe=tarif.classe)
    elif tarif.niveau_id and tarif.section_id:
        eleves = eleves.filter(classe__niveau=tarif.niveau, classe__section=tarif.section)
    elif tarif.niveau_id:
        eleves = eleves.filter(classe__niveau=tarif.niveau)

    created = []
    skipped = []

    for eleve in eleves:
        if FraisScolaire.objects.filter(
            eleve=eleve,
            annee_scolaire=annee_active,
            trimestre=tarif.trimestre,
            type_frais=tarif.type_frais,
        ).exists():
            skipped.append({'eleve': eleve.nom_complet, 'raison': 'deja applique'})
            continue

        frais = FraisScolaire.objects.create(
            eleve=eleve,
            annee_scolaire=annee_active,
            classe=eleve.classe,
            trimestre=tarif.trimestre,
            type_frais=tarif.type_frais,
            montant_total=tarif.montant,
            description=description,
        )
        created.append(FraisScolaireSerializer(frais, context={'request': request}).data)

    return Response({
        'created_count': len(created),
        'skipped_count': len(skipped),
        'created': created,
        'skipped': skipped,
        'message': f"{len(created)} application(s) de frais creee(s), {len(skipped)} ignoree(s).",
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resume_frais(request):
    annee_active = AnneeScolaire.objects.filter(est_active=True).first()

    if not annee_active:
        return Response({
            'defined': False,
            'annee_scolaire': None,
            'total_attendu': 0,
            'total_paye': 0,
            'solde': 0,
            'nb_frais': 0,
            'nb_paiements': 0,
        })

    frais = FraisScolaire.objects.filter(annee_scolaire=annee_active)
    paiements = Paiement.objects.filter(frais__annee_scolaire=annee_active, statut='valide')
    total_attendu = frais.aggregate(total=Sum('montant_total'))['total'] or 0
    total_paye = paiements.aggregate(total=Sum('montant_paye'))['total'] or 0

    return Response({
        'defined': True,
        'annee_scolaire': {'id': annee_active.id, 'nom': annee_active.nom},
        'total_attendu': total_attendu,
        'total_paye': total_paye,
        'solde': total_attendu - total_paye,
        'nb_frais': frais.count(),
        'nb_paiements': paiements.count(),
    })
