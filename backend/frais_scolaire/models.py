from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.template.defaultfilters import slugify
from django.utils import timezone

from backend.eleves.models import AnneeScolaire, Classe, Eleve, Niveau, Section


TRIMESTRE_CHOICES = [
    (1, '1er trimestre'),
    (2, '2eme trimestre'),
    (3, '3eme trimestre'),
]

MODE_PAIEMENT_CHOICES = [
    ('cash', 'Especes'),
    ('mobile_money', 'Mobile Money'),
    ('banque', 'Virement bancaire'),
    ('cheque', 'Cheque'),
    ('carte', 'Carte bancaire'),
]

STATUT_PAIEMENT_CHOICES = [
    ('valide', 'Valide'),
    ('annule', 'Annule'),
    ('en_attente', 'En attente'),
]


class TypeFrais(models.Model):
    nom = models.CharField(max_length=100, unique=True, verbose_name="Type de frais")
    code = models.SlugField(max_length=50, unique=True, blank=True, verbose_name="Code")
    description = models.TextField(blank=True, verbose_name="Description")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "type de frais"
        verbose_name_plural = "types de frais"
        ordering = ['nom']

    def save(self, *args, **kwargs):
        if not self.code:
            base_code = slugify(self.nom)
            code = base_code
            compteur = 1
            while TypeFrais.objects.filter(code=code).exclude(pk=self.pk).exists():
                compteur += 1
                code = f"{base_code}-{compteur}"
            self.code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom


class TarifFrais(models.Model):
    annee_scolaire = models.ForeignKey(
        AnneeScolaire,
        on_delete=models.CASCADE,
        related_name="tarifs_frais",
        verbose_name="Annee scolaire",
    )
    niveau = models.ForeignKey(
        Niveau,
        on_delete=models.CASCADE,
        related_name="tarifs_frais",
        blank=True,
        null=True,
        verbose_name="Niveau",
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="tarifs_frais",
        blank=True,
        null=True,
        verbose_name="Section",
    )
    classe = models.ForeignKey(
        Classe,
        on_delete=models.CASCADE,
        related_name="tarifs_frais",
        blank=True,
        null=True,
        verbose_name="Classe",
    )
    trimestre = models.PositiveSmallIntegerField(choices=TRIMESTRE_CHOICES, verbose_name="Trimestre")
    type_frais = models.ForeignKey(
        TypeFrais,
        on_delete=models.PROTECT,
        related_name="tarifs",
        verbose_name="Type de frais",
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Montant")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "tarif de frais"
        verbose_name_plural = "tarifs de frais"
        ordering = ['annee_scolaire', 'trimestre', 'classe', 'type_frais']
        constraints = [
            models.UniqueConstraint(
                fields=['annee_scolaire', 'niveau', 'section', 'classe', 'trimestre', 'type_frais'],
                name='tarif_unique_par_annee_classe_trimestre_type',
            ),
        ]

    def clean(self):
        super().clean()

        if self.classe:
            self.niveau = self.classe.niveau
            self.section = self.classe.section

        if not self.niveau and not self.classe:
            raise ValidationError({'niveau': 'Le niveau ou la classe est obligatoire.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        cible = self.classe or self.niveau
        if self.section and not self.classe:
            cible = f"{cible} - {self.section}"
        return f"{cible} - {self.type_frais} - {self.get_trimestre_display()} - {self.montant} FC"


class FraisScolaire(models.Model):
    eleve = models.ForeignKey(
        Eleve,
        on_delete=models.CASCADE,
        related_name="frais_scolaires",
        verbose_name="Eleve",
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire,
        on_delete=models.CASCADE,
        related_name="frais_scolaires",
        verbose_name="Annee scolaire",
    )
    classe = models.ForeignKey(
        Classe,
        on_delete=models.SET_NULL,
        related_name="frais_scolaires",
        blank=True,
        null=True,
        verbose_name="Classe",
    )
    trimestre = models.PositiveSmallIntegerField(choices=TRIMESTRE_CHOICES, verbose_name="Trimestre")
    type_frais = models.ForeignKey(
        TypeFrais,
        on_delete=models.PROTECT,
        related_name="frais_scolaires",
        verbose_name="Type de frais",
    )
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Montant total a payer")
    description = models.TextField(blank=True, verbose_name="Description")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "frais scolaire"
        verbose_name_plural = "frais scolaires"
        ordering = ['eleve__nom', 'trimestre', 'type_frais']
        constraints = [
            models.UniqueConstraint(
                fields=['eleve', 'annee_scolaire', 'trimestre', 'type_frais'],
                name='frais_unique_par_eleve_annee_trimestre_type',
            ),
        ]

    def save(self, *args, **kwargs):
        if self.eleve:
            if not self.annee_scolaire:
                self.annee_scolaire = self.eleve.annee_scolaire
            if not self.classe:
                self.classe = self.eleve.classe
        super().save(*args, **kwargs)

    @property
    def total_paye(self):
        total = self.paiements.filter(statut='valide').aggregate(total=Sum('montant_paye'))['total']
        return total or 0

    @property
    def solde_restant(self):
        return self.montant_total - self.total_paye

    @property
    def statut_paiement(self):
        if self.total_paye <= 0:
            return 'non_paye'
        if self.total_paye >= self.montant_total:
            return 'paye'
        return 'partiel'

    def __str__(self):
        return f"{self.eleve.nom_complet} - {self.type_frais} - {self.get_trimestre_display()}"


class Paiement(models.Model):
    frais = models.ForeignKey(
        FraisScolaire,
        on_delete=models.CASCADE,
        related_name="paiements",
        verbose_name="Frais concerne",
    )
    eleve = models.ForeignKey(
        Eleve,
        on_delete=models.CASCADE,
        related_name="paiements",
        verbose_name="Eleve",
    )
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Montant paye")
    date_paiement = models.DateField(default=timezone.localdate, verbose_name="Date de paiement")
    mode_paiement = models.CharField(max_length=50, choices=MODE_PAIEMENT_CHOICES, verbose_name="Mode de paiement")
    reference = models.CharField(max_length=100, unique=True, editable=False, verbose_name="Numero de recu")
    statut = models.CharField(
        max_length=20,
        choices=STATUT_PAIEMENT_CHOICES,
        default='valide',
        verbose_name="Statut",
    )
    description = models.TextField(blank=True, verbose_name="Observations")
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="paiements_scolaires_enregistres",
        verbose_name="Agent",
    )
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "paiement"
        verbose_name_plural = "paiements"
        ordering = ['-date_paiement', '-cree_le']

    def clean(self):
        super().clean()

        if self.frais_id and self.montant_paye and self.montant_paye <= 0:
            raise ValidationError({'montant_paye': 'Le montant paye doit etre superieur a zero.'})

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self.generer_reference()
        if self.frais_id and not self.eleve_id:
            self.eleve = self.frais.eleve
        self.full_clean()
        super().save(*args, **kwargs)

    def generer_reference(self):
        annee = timezone.localdate().year
        prefixe = f"REC-{annee}"
        dernier = Paiement.objects.filter(reference__startswith=prefixe).order_by('-reference').first()

        if dernier and dernier.reference:
            try:
                dernier_numero = int(dernier.reference.split('-')[-1])
            except ValueError:
                dernier_numero = 0
        else:
            dernier_numero = 0

        return f"{prefixe}-{dernier_numero + 1:06d}"

    def __str__(self):
        return f"{self.reference} - {self.eleve.nom_complet} - {self.montant_paye} FC"
