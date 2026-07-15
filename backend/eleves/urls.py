from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClasseViewSet, EleveViewSet, NiveauViewSet, SectionViewSet, StatutEleveViewSet, annee_scolaire_active


router = DefaultRouter()
router.register('niveaux', NiveauViewSet, basename='niveau')
router.register('sections', SectionViewSet, basename='section')
router.register('classes', ClasseViewSet, basename='classe')
router.register('statuts', StatutEleveViewSet, basename='statut-eleve')
router.register('eleves', EleveViewSet, basename='eleve')

urlpatterns = [
    path('annee-active/', annee_scolaire_active, name='annee_scolaire_active'),
    path('', include(router.urls)),
]
