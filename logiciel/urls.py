"""
URL configuration for logiciel project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, Http404
from django.db.utils import OperationalError, ProgrammingError
from django.urls import include, path


FRONTEND_DIST_DIR = settings.BASE_DIR / 'frontend' / 'react_app' / 'dist'


def get_admin_identity():
    try:
        from backend.identite.models import Etablissement

        etablissement = Etablissement.objects.order_by('-modifie_le').first()
    except (OperationalError, ProgrammingError):
        etablissement = None

    if not etablissement:
        return {
            'nom': 'Gestion ecole',
            'sigle': 'GE',
            'devise': 'Administration de la plateforme scolaire',
        }

    return {
        'nom': etablissement.nom,
        'sigle': etablissement.sigle or etablissement.nom[:2].upper(),
        'devise': etablissement.devise or 'Administration de la plateforme scolaire',
    }


_admin_each_context = admin.site.each_context


def admin_each_context(request):
    identite = get_admin_identity()
    admin.site.site_header = identite['nom']
    admin.site.site_title = f"{identite['sigle']} admin"
    admin.site.index_title = identite['devise']

    context = _admin_each_context(request)
    context.update({
        'site_header': admin.site.site_header,
        'site_title': admin.site.site_title,
        'index_title': admin.site.index_title,
    })
    return context


admin.site.each_context = admin_each_context


def serve_frontend_file(filename):
    file_path = FRONTEND_DIST_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise Http404("Fichier frontend introuvable. Lancez npm run build dans frontend/react_app.")
    return FileResponse(open(file_path, 'rb'))


def react_app(request, route=''):
    return serve_frontend_file('index.html')


def react_asset(request, path):
    return serve_frontend_file(f'assets/{path}')


def react_public_file(request, filename):
    return serve_frontend_file(filename)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/comptes/', include('backend.comptes.urls')),
    path('api/identite/', include('backend.identite.urls')),
    path('api/eleves/', include('backend.eleves.urls')),
    path('api/frais-scolaire/', include('backend.frais_scolaire.urls')),
    path('assets/<path:path>', react_asset, name='react_asset'),
    path('favicon.svg', react_public_file, {'filename': 'favicon.svg'}, name='react_favicon'),
    path('icons.svg', react_public_file, {'filename': 'icons.svg'}, name='react_icons'),
    path('', react_app, name='react_app'),
    path('<path:route>', react_app, name='react_app_route'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
