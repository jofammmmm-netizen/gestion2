from rest_framework import filters, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AnneeScolaire, Classe, Eleve, Niveau, Section, StatutEleve
from .serializers import (
    AnneeScolaireSerializer,
    ClasseSerializer,
    EleveSerializer,
    NiveauSerializer,
    SectionSerializer,
    StatutEleveSerializer,
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


class NiveauViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = Niveau.objects.all()
    serializer_class = NiveauSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code']
    ordering_fields = ['ordre', 'nom', 'actif']


class SectionViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code']
    ordering_fields = ['nom', 'actif']


class ClasseViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = Classe.objects.select_related('niveau', 'section')
    serializer_class = ClasseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code', 'niveau__nom', 'section__nom']
    ordering_fields = ['niveau__ordre', 'ordre', 'nom', 'actif']

    def get_queryset(self):
        queryset = super().get_queryset()
        niveau = self.request.query_params.get('niveau')
        section = self.request.query_params.get('section')
        actif = self.request.query_params.get('actif')

        if niveau:
            queryset = queryset.filter(niveau_id=niveau)
        if section:
            queryset = queryset.filter(section_id=section)
        if actif in ['true', 'false']:
            queryset = queryset.filter(actif=actif == 'true')

        return queryset


class StatutEleveViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = StatutEleve.objects.all()
    serializer_class = StatutEleveSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'code']
    ordering_fields = ['nom', 'actif']


class EleveViewSet(AnneeActiveRequiredMixin, SuperAdminDeleteMixin, viewsets.ModelViewSet):
    queryset = Eleve.objects.select_related('classe', 'statut', 'annee_scolaire', 'classe__niveau', 'classe__section')
    serializer_class = EleveSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['matricule', 'nom', 'post_nom', 'prenom', 'telephone', 'email']
    ordering_fields = ['nom', 'post_nom', 'prenom', 'date_inscription', 'matricule']

    def get_queryset(self):
        queryset = super().get_queryset()
        classe = self.request.query_params.get('classe')
        niveau = self.request.query_params.get('niveau')
        section = self.request.query_params.get('section')
        statut = self.request.query_params.get('statut')
        sexe = self.request.query_params.get('sexe')
        date_debut = self.request.query_params.get('date_debut')
        date_fin = self.request.query_params.get('date_fin')
        annee_scolaire = self.request.query_params.get('annee_scolaire')

        if annee_scolaire == 'all':
            pass
        elif annee_scolaire:
            queryset = queryset.filter(annee_scolaire_id=annee_scolaire)
        else:
            annee_active = AnneeScolaire.objects.filter(est_active=True).first()
            if annee_active:
                queryset = queryset.filter(annee_scolaire=annee_active)
            else:
                queryset = queryset.none()

        if classe:
            queryset = queryset.filter(classe_id=classe)
        if niveau:
            queryset = queryset.filter(classe__niveau_id=niveau)
        if section:
            queryset = queryset.filter(classe__section_id=section)
        if statut:
            queryset = queryset.filter(statut_id=statut)
        if sexe:
            queryset = queryset.filter(sexe=sexe)
        if date_debut:
            queryset = queryset.filter(date_inscription__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_inscription__lte=date_fin)

        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def annee_scolaire_active(request):
    annee = AnneeScolaire.objects.filter(est_active=True).first()

    if not annee:
        return Response({
            'defined': False,
            'annee_scolaire': None,
            'message': "Aucune annee scolaire active n'est definie. Definissez-la dans l'admin Django.",
        })

    return Response({
        'defined': True,
        'annee_scolaire': AnneeScolaireSerializer(annee).data,
        'message': '',
    })
