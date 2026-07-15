from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    FraisScolaireViewSet,
    PaiementViewSet,
    TarifFraisViewSet,
    TypeFraisViewSet,
    appliquer_frais,
    choix_frais,
    resume_frais,
)


router = DefaultRouter()
router.register('types', TypeFraisViewSet, basename='type-frais')
router.register('tarifs', TarifFraisViewSet, basename='tarif-frais')
router.register('frais', FraisScolaireViewSet, basename='frais-scolaire')
router.register('paiements', PaiementViewSet, basename='paiement-frais')

urlpatterns = [
    path('application/', appliquer_frais, name='appliquer_frais'),
    path('choix/', choix_frais, name='choix_frais'),
    path('resume/', resume_frais, name='resume_frais'),
    path('', include(router.urls)),
]
