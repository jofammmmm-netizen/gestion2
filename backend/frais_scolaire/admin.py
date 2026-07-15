from django.contrib import admin

from .models import FraisScolaire, Paiement, TarifFrais, TypeFrais


@admin.register(TypeFrais)
class TypeFraisAdmin(admin.ModelAdmin):
    list_display = ("nom", "code", "actif")
    list_filter = ("actif",)
    search_fields = ("nom", "code")
    readonly_fields = ("code", "cree_le", "modifie_le")


@admin.register(TarifFrais)
class TarifFraisAdmin(admin.ModelAdmin):
    list_display = ("type_frais", "annee_scolaire", "trimestre", "niveau", "section", "classe", "montant", "actif")
    list_filter = ("annee_scolaire", "trimestre", "type_frais", "niveau", "section", "classe", "actif")
    search_fields = ("type_frais__nom", "classe__nom", "niveau__nom", "section__nom")
    readonly_fields = ("cree_le", "modifie_le")


@admin.register(FraisScolaire)
class FraisScolaireAdmin(admin.ModelAdmin):
    list_display = ("eleve", "annee_scolaire", "trimestre", "type_frais", "montant_total", "total_paye", "solde_restant", "statut_paiement")
    list_filter = ("annee_scolaire", "trimestre", "type_frais", "classe")
    search_fields = ("eleve__matricule", "eleve__nom", "eleve__post_nom", "eleve__prenom", "type_frais__nom")
    readonly_fields = ("total_paye", "solde_restant", "statut_paiement", "cree_le", "modifie_le")


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ("reference", "eleve", "frais", "montant_paye", "date_paiement", "mode_paiement", "statut", "agent")
    list_filter = ("date_paiement", "mode_paiement", "statut", ("agent", admin.RelatedOnlyFieldListFilter))
    search_fields = ("reference", "eleve__matricule", "eleve__nom", "eleve__post_nom", "eleve__prenom")
    readonly_fields = ("reference", "cree_le", "modifie_le")
