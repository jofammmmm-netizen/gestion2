import datetime
import random

from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, RegexValidator
from django.db import models
from django.utils import timezone


def generer_code_unique(modele, prefixe):
    while True:
        code = f"{prefixe}-{random.randint(100000, 999999)}"
        if not modele.objects.filter(code=code).exists():
            return code


def normaliser_telephone(numero):
    return ''.join(caractere for caractere in numero if caractere.isdigit() or caractere == '+')


class Niveau(models.Model):
    code = models.SlugField(max_length=50, unique=True, editable=False, blank=True, verbose_name="Code")
    nom = models.CharField(max_length=100, unique=True, verbose_name="Nom")
    ordre = models.PositiveSmallIntegerField(default=0, verbose_name="Ordre")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "niveau"
        verbose_name_plural = "niveaux"
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generer_code_unique(Niveau, "NIV")
        super().save(*args, **kwargs)


class Section(models.Model):
    code = models.SlugField(max_length=50, unique=True, editable=False, blank=True, verbose_name="Code")
    nom = models.CharField(max_length=100, unique=True, verbose_name="Nom")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "section"
        verbose_name_plural = "sections"
        ordering = ['nom']

    def __str__(self):
        return self.nom

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generer_code_unique(Section, "SEC")
        super().save(*args, **kwargs)


class Classe(models.Model):
    niveau = models.ForeignKey(
        Niveau,
        on_delete=models.PROTECT,
        related_name="classes",
        verbose_name="Niveau",
    )
    nom = models.CharField(max_length=100, verbose_name="Nom")
    code = models.SlugField(max_length=50, unique=True, editable=False, blank=True, verbose_name="Code")
    section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="classes",
        verbose_name="Section",
    )
    ordre = models.PositiveSmallIntegerField(default=0, verbose_name="Ordre")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "classe"
        verbose_name_plural = "classes"
        ordering = ['niveau__ordre', 'ordre', 'nom']
        constraints = [
            models.UniqueConstraint(
                fields=['niveau', 'nom', 'section'],
                name='classe_unique_par_niveau_nom_section',
            ),
        ]

    def __str__(self):
        if self.section:
            return f"{self.nom} - {self.section}"
        return self.nom

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generer_code_unique(Classe, "CLS")
        super().save(*args, **kwargs)


class StatutEleve(models.Model):
    code = models.SlugField(max_length=50, unique=True, editable=False, blank=True, verbose_name="Code")
    nom = models.CharField(max_length=100, unique=True, verbose_name="Nom")
    actif = models.BooleanField(default=True, verbose_name="Actif")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "statut eleve"
        verbose_name_plural = "statuts eleves"
        ordering = ['nom']

    def __str__(self):
        return self.nom

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generer_code_unique(StatutEleve, "STA")
        super().save(*args, **kwargs)


class AnneeScolaire(models.Model):
    nom = models.CharField(max_length=100, unique=True, verbose_name="Nom")
    date_debut = models.DateField(verbose_name="Date de debut")
    date_fin = models.DateField(verbose_name="Date de fin")
    est_active = models.BooleanField(default=False, verbose_name="Annee active")
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "annee scolaire"
        verbose_name_plural = "annees scolaires"
        ordering = ['-date_debut']

    def clean(self):
        super().clean()

        if self.date_debut and self.date_fin and self.date_debut >= self.date_fin:
            raise ValidationError({'date_fin': 'La date de fin doit etre superieure a la date de debut.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

        if self.est_active:
            AnneeScolaire.objects.exclude(pk=self.pk).update(est_active=False)

    def __str__(self):
        return self.nom


class Eleve(models.Model):
    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Feminin'),
    ]

    nom = models.CharField(max_length=100, verbose_name="Nom")
    post_nom = models.CharField(max_length=100, verbose_name="Post-nom")
    prenom = models.CharField(max_length=100, verbose_name="Prenom")
    lieu_de_naissance = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Lieu de naissance",
    )
    date_naissance = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date de naissance",
    )
    sexe = models.CharField(
        max_length=1,
        choices=SEXE_CHOICES,
        verbose_name="Sexe",
    )
    adresse = models.TextField(blank=True, verbose_name="Adresse")
    telephone = models.CharField(
        max_length=20,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?[\d\s().-]{9,25}$',
                message='Numero de telephone invalide.',
            ),
        ],
        verbose_name="Telephone",
    )
    email = models.EmailField(
        blank=True,
        validators=[EmailValidator(message='Email invalide.')],
        verbose_name="Email",
    )
    matricule = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name="Matricule",
    )
    classe = models.ForeignKey(
        Classe,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="eleves",
        verbose_name="Classe",
    )
    date_inscription = models.DateField(
        default=timezone.localdate,
        editable=False,
        verbose_name="Date d'inscription",
    )
    annee_scolaire = models.ForeignKey(
        AnneeScolaire,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="eleves",
        editable=False,
        verbose_name="Annee scolaire",
    )
    photo = models.ImageField(
        upload_to='eleves/photos/',
        blank=True,
        null=True,
        verbose_name="Photo",
    )
    statut = models.ForeignKey(
        StatutEleve,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="eleves",
        verbose_name="Statut",
    )
    cree_le = models.DateTimeField(auto_now_add=True, verbose_name="Cree le")
    modifie_le = models.DateTimeField(auto_now=True, verbose_name="Modifie le")

    class Meta:
        verbose_name = "eleve"
        verbose_name_plural = "eleves"
        ordering = ['nom', 'post_nom', 'prenom']

    @property
    def nom_complet(self):
        return f"{self.nom} {self.post_nom} {self.prenom}".strip()

    def clean(self):
        super().clean()

        if self.date_naissance and self.date_naissance > timezone.localdate():
            raise ValidationError({'date_naissance': 'La date de naissance ne peut pas etre dans le futur.'})

        if not self.annee_scolaire:
            raise ValidationError({
                'annee_scolaire': "Aucune annee scolaire active n'est definie. Definissez-la d'abord dans l'admin.",
            })

    def generer_matricule(self):
        annee = self.date_inscription.year if self.date_inscription else datetime.datetime.now().year
        prefixe = f"{annee}E"
        dernier_eleve = (
            Eleve.objects.filter(matricule__startswith=prefixe)
            .order_by('-matricule')
            .first()
        )

        if dernier_eleve and dernier_eleve.matricule:
            try:
                dernier_numero = int(dernier_eleve.matricule[-6:])
            except ValueError:
                dernier_numero = 0
        else:
            dernier_numero = 0

        return f"{prefixe}{dernier_numero + 1:06d}"

    def get_annee_active(self):
        if self.date_inscription:
            annee = AnneeScolaire.objects.filter(
                date_debut__lte=self.date_inscription,
                date_fin__gte=self.date_inscription,
                est_active=True,
            ).first()
            if annee:
                return annee

        return AnneeScolaire.objects.filter(est_active=True).first()

    def save(self, *args, **kwargs):
        if self.telephone:
            self.telephone = normaliser_telephone(self.telephone)
        if not self.date_inscription:
            self.date_inscription = timezone.localdate()
        if not self.annee_scolaire:
            self.annee_scolaire = self.get_annee_active()
        if not self.matricule:
            self.matricule = self.generer_matricule()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.matricule} - {self.nom_complet}"
