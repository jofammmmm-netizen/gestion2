from django.db import models


class Etablissement(models.Model):
    nom = models.CharField("nom de l'etablissement", max_length=255)
    sigle = models.CharField("sigle", max_length=50, blank=True)
    adresse = models.CharField("adresse", max_length=255, blank=True)
    telephone = models.CharField("telephone", max_length=30, blank=True)
    email = models.EmailField("email", blank=True)
    site_web = models.URLField("site web", blank=True)
    devise = models.CharField("devise", max_length=255, blank=True)
    logo = models.ImageField("logo", upload_to="identite/logos/", blank=True, null=True)
    cree_le = models.DateTimeField("cree le", auto_now_add=True)
    modifie_le = models.DateTimeField("modifie le", auto_now=True)

    class Meta:
        verbose_name = "etablissement"
        verbose_name_plural = "etablissements"

    def __str__(self):
        return self.nom
