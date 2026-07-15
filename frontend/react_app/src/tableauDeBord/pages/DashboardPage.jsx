import { useEffect, useMemo, useState } from 'react'
import { getAnneeActive, listResource } from '../../eleves/services/elevesApi'
import { getFraisResume, listFraisResource, resultList } from '../../fraisScolaire/services/fraisScolaireApi'

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FC`
}

function percent(value, total) {
  if (!total) return 0
  return Math.min(100, Math.round((Number(value || 0) / Number(total || 0)) * 100))
}

export function DashboardPage({ etablissement, user }) {
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [anneeActive, setAnneeActive] = useState(null)
  const [anneeDefined, setAnneeDefined] = useState(false)
  const [items, setItems] = useState({
    eleves: [],
    classes: [],
    niveaux: [],
    sections: [],
    statuts: [],
    types: [],
    tarifs: [],
    frais: [],
    paiements: [],
  })
  const [resumeFrais, setResumeFrais] = useState(null)

  const nom = etablissement?.nom || 'Gestion ecole'
  const sigle = etablissement?.sigle || 'GE'
  const devise = etablissement?.devise || 'Former, suivre et reussir'

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      setLoading(true)
      try {
        const [
          anneeData,
          eleves,
          classes,
          niveaux,
          sections,
          statuts,
          resume,
          types,
          tarifs,
          frais,
          paiements,
        ] = await Promise.all([
          getAnneeActive(),
          listResource('eleves'),
          listResource('classes'),
          listResource('niveaux'),
          listResource('sections'),
          listResource('statuts'),
          getFraisResume(),
          listFraisResource('types'),
          listFraisResource('tarifs'),
          listFraisResource('frais'),
          listFraisResource('paiements'),
        ])

        if (!mounted) return

        setAnneeDefined(anneeData.defined)
        setAnneeActive(anneeData.annee_scolaire)
        setResumeFrais(resume)
        setItems({
          eleves: resultList(eleves),
          classes: resultList(classes),
          niveaux: resultList(niveaux),
          sections: resultList(sections),
          statuts: resultList(statuts),
          types: resultList(types),
          tarifs: resultList(tarifs),
          frais: resultList(frais),
          paiements: resultList(paiements),
        })
      } catch (error) {
        if (mounted) setMessage(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const tauxPaiement = percent(resumeFrais?.total_paye, resumeFrais?.total_attendu)
  const elevesAvecFrais = useMemo(
    () => new Set(items.frais.map((frais) => frais.eleve)).size,
    [items.frais],
  )
  const paiementsRecents = useMemo(
    () => [...items.paiements].slice(0, 5),
    [items.paiements],
  )
  const repartitionStatuts = useMemo(() => {
    const statuts = { paye: 0, partiel: 0, non_paye: 0 }
    items.frais.forEach((frais) => {
      statuts[frais.statut_paiement] = (statuts[frais.statut_paiement] || 0) + 1
    })
    return statuts
  }, [items.frais])

  const stats = [
    { label: 'Eleves inscrits', value: items.eleves.length, detail: anneeActive?.nom || 'Annee non definie' },
    { label: 'Classes actives', value: items.classes.filter((classe) => classe.actif).length, detail: `${items.niveaux.length} niveau(x)` },
    { label: 'Frais appliques', value: items.frais.length, detail: `${elevesAvecFrais} eleve(s) concerne(s)` },
    { label: 'Taux paiement', value: `${tauxPaiement}%`, detail: `${money(resumeFrais?.total_paye)} encaisse` },
  ]

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <span className="dashboard-kicker">Tableau de bord reel</span>
          <h1>{nom}</h1>
          <p>{devise}</p>
        </div>
        <div className="school-badge">
          <span>{sigle.slice(0, 2).toUpperCase()}</span>
        </div>
      </div>

      <div className="identity-grid">
        <div>
          <span>Annee scolaire</span>
          <strong>{anneeActive?.nom || 'Non definie'}</strong>
        </div>
        <div>
          <span>Adresse</span>
          <strong>{etablissement?.adresse || 'Adresse non definie'}</strong>
        </div>
        <div>
          <span>Telephone</span>
          <strong>{etablissement?.telephone || 'Telephone non defini'}</strong>
        </div>
        <div>
          <span>Utilisateur</span>
          <strong>{user?.username || 'Invite'}</strong>
        </div>
      </div>

      {!anneeDefined && (
        <div className="admin-note">
          Aucune annee scolaire active n'est definie. Les operations principales restent bloquees.
        </div>
      )}

      {message && <div className="form-alert error">{message}</div>}

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{loading ? '...' : stat.value}</strong>
            <p>{stat.detail}</p>
          </article>
        ))}
      </div>

      <section className="dashboard-finance">
        <div className="finance-summary">
          <span>Situation financiere</span>
          <h2>{money(resumeFrais?.solde)} de solde restant</h2>
          <div className="finance-progress">
            <span style={{ width: `${tauxPaiement}%` }}></span>
          </div>
          <p>{money(resumeFrais?.total_paye)} payes sur {money(resumeFrais?.total_attendu)} attendus.</p>
        </div>
        <div className="finance-grid">
          <div><span>Types de frais</span><strong>{items.types.length}</strong></div>
          <div><span>Tarifs actifs</span><strong>{items.tarifs.filter((tarif) => tarif.actif).length}</strong></div>
          <div><span>Frais payes</span><strong>{repartitionStatuts.paye}</strong></div>
          <div><span>Frais partiels</span><strong>{repartitionStatuts.partiel}</strong></div>
          <div><span>Non payes</span><strong>{repartitionStatuts.non_paye}</strong></div>
          <div><span>Paiements</span><strong>{items.paiements.length}</strong></div>
        </div>
      </section>

      <section className="dashboard-panels">
        <article className="activity-panel">
          <h2>Derniers paiements</h2>
          {paiementsRecents.length ? (
            <ul className="payment-list">
              {paiementsRecents.map((paiement) => (
                <li key={paiement.id}>
                  <span>
                    <strong>{paiement.eleve_nom}</strong>
                    <small>{paiement.reference} - {paiement.mode_paiement_nom}</small>
                  </span>
                  <em>{money(paiement.montant_paye)}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-empty">Aucun paiement enregistre pour le moment.</p>
          )}
        </article>

        <article className="activity-panel">
          <h2>Structure scolaire</h2>
          <ul className="dashboard-list">
            <li><strong>{items.niveaux.length}</strong><span>Niveaux definis</span></li>
            <li><strong>{items.sections.length}</strong><span>Sections definies</span></li>
            <li><strong>{items.classes.length}</strong><span>Classes creees</span></li>
            <li><strong>{items.statuts.length}</strong><span>Statuts eleves</span></li>
          </ul>
        </article>
      </section>
    </section>
  )
}
