from django.contrib import admin

from .models import AnneeScolaire, Classe, Eleve, Niveau, Section, StatutEleve


@admin.register(Niveau)
class NiveauAdmin(admin.ModelAdmin):
    list_display = ("nom", "code", "ordre", "actif")
    list_filter = ("actif",)
    search_fields = ("nom", "code")
    readonly_fields = ("code", "cree_le", "modifie_le")


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("nom", "code", "actif")
    list_filter = ("actif",)
    search_fields = ("nom", "code")
    readonly_fields = ("code", "cree_le", "modifie_le")


@admin.register(Classe)
class ClasseAdmin(admin.ModelAdmin):
    list_display = ("nom", "code", "niveau", "section", "ordre", "actif")
    list_filter = ("niveau", "section", "actif")
    search_fields = ("nom", "code", "niveau__nom", "section__nom")
    readonly_fields = ("code", "cree_le", "modifie_le")


@admin.register(StatutEleve)
class StatutEleveAdmin(admin.ModelAdmin):
    list_display = ("nom", "code", "actif")
    list_filter = ("actif",)
    search_fields = ("nom", "code")
    readonly_fields = ("code", "cree_le", "modifie_le")


@admin.register(AnneeScolaire)
class AnneeScolaireAdmin(admin.ModelAdmin):
    list_display = ("nom", "date_debut", "date_fin", "est_active")
    list_filter = ("est_active",)
    search_fields = ("nom",)
    readonly_fields = ("cree_le", "modifie_le")


@admin.register(Eleve)
class EleveAdmin(admin.ModelAdmin):
    list_display = ("matricule", "nom", "post_nom", "prenom", "sexe", "classe", "statut", "annee_scolaire")
    list_filter = ("sexe", "classe", "statut", "annee_scolaire")
    search_fields = ("matricule", "nom", "post_nom", "prenom", "telephone", "email")
    readonly_fields = ("matricule", "date_inscription", "annee_scolaire", "cree_le", "modifie_le")
