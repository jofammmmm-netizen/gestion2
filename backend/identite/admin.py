from django.contrib import admin

from .models import Etablissement


@admin.register(Etablissement)
class EtablissementAdmin(admin.ModelAdmin):
    list_display = ("nom", "sigle", "telephone", "email")
    search_fields = ("nom", "sigle", "telephone", "email")
    readonly_fields = ("cree_le", "modifie_le")
