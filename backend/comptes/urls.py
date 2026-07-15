from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views


app_name = 'comptes'

urlpatterns = [
    path('session/', views.session, name='session'),
    path('inscription/', views.inscription, name='inscription'),
    path('connexion/', views.connexion, name='connexion'),
    path('deconnexion/', views.deconnexion, name='deconnexion'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
