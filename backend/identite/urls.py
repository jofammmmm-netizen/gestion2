from django.urls import path

from . import views


app_name = 'identite'

urlpatterns = [
    path('etablissement/', views.etablissement_actuel, name='etablissement_actuel'),
]
