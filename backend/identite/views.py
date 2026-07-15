from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Etablissement


def etablissement_payload(etablissement):
    if etablissement is None:
        return {
            'nom': 'Gestion ecole',
            'sigle': 'GE',
            'adresse': 'Adresse non definie',
            'telephone': 'Telephone non defini',
            'email': 'contact@gestion-ecole.local',
            'site_web': '',
            'devise': 'Former, suivre et reussir',
            'logo': '',
            'est_defini': False,
        }

    return {
        'nom': etablissement.nom,
        'sigle': etablissement.sigle,
        'adresse': etablissement.adresse,
        'telephone': etablissement.telephone,
        'email': etablissement.email,
        'site_web': etablissement.site_web,
        'devise': etablissement.devise,
        'logo': etablissement.logo.url if etablissement.logo else '',
        'est_defini': True,
    }


@require_GET
def etablissement_actuel(request):
    etablissement = Etablissement.objects.order_by('-modifie_le').first()
    return JsonResponse({'etablissement': etablissement_payload(etablissement)})
