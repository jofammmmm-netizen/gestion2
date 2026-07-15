import { useEffect, useMemo, useState } from 'react'
import { getAnneeActive, listResource } from '../../eleves/services/elevesApi'
import {
  applyFrais,
  createFraisResource,
  deleteFraisResource,
  getFraisChoices,
  getFraisResume,
  listFraisResource,
  resultList,
  updateFraisResource,
} from '../services/fraisScolaireApi'

const sections = [
  { id: 'frais-types', resource: 'types', label: 'Types de frais' },
  { id: 'frais-tarifs', resource: 'tarifs', label: 'Tarifs' },
  { id: 'frais-application', resource: 'application', label: 'Application des frais' },
  { id: 'frais-eleves', resource: 'frais', label: 'Frais des eleves' },
  { id: 'frais-paiements', resource: 'paiements', label: 'Paiements' },
]

const emptyForms = {
  types: { nom: '', description: '', actif: true },
  tarifs: { type_frais: '', trimestre: 1, montant: '', niveau: '', section: '', classe: '', actif: true },
  application: { tarif: '', description: '' },
  frais: { eleve: '', type_frais: '', trimestre: 1, montant_total: '', description: '' },
  paiements: { frais: '', montant_paye: '', mode_paiement: 'cash', statut: 'valide', description: '' },
}

const emptyFilters = {
  search: '',
  trimestre: '',
  type_frais: '',
  eleve: '',
  classe: '',
  niveau: '',
  section: '',
  statut: '',
  mode_paiement: '',
}

function money(value) {
  const amount = Number(value || 0)
  return `${amount.toLocaleString('fr-FR')} FC`
}

function buildStudentApplications(fraisItems) {
  const grouped = new Map()

  fraisItems.forEach((frais) => {
    const key = frais.eleve
    const current = grouped.get(key) || {
      eleve: frais.eleve,
      eleve_nom: frais.eleve_nom,
      eleve_matricule: frais.eleve_matricule,
      classe_nom: frais.classe_nom,
      frais: [],
      total: 0,
      paye: 0,
      solde: 0,
    }

    current.frais.push(frais)
    current.total += Number(frais.montant_total || 0)
    current.paye += Number(frais.total_paye || 0)
    current.solde += Number(frais.solde_restant || 0)
    grouped.set(key, current)
  })

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    statut:
      item.paye <= 0
        ? 'non_paye'
        : item.solde <= 0
          ? 'paye'
          : 'partiel',
  }))
}

function getEligibleElevesForTarif(tarif, eleves, classes, fraisItems) {
  if (!tarif) return []

  const classeMap = new Map(classes.map((classe) => [String(classe.id), classe]))

  return eleves.filter((eleve) => {
    const classe = classeMap.get(String(eleve.classe))
    const alreadyAffected = fraisItems.some((frais) => (
      String(frais.eleve) === String(eleve.id)
      && String(frais.type_frais) === String(tarif.type_frais)
      && String(frais.trimestre) === String(tarif.trimestre)
    ))

    if (alreadyAffected || !classe) return false

    if (tarif.classe) {
      return String(eleve.classe) === String(tarif.classe)
    }

    if (tarif.niveau && String(classe.niveau) !== String(tarif.niveau)) {
      return false
    }

    if (tarif.section && String(classe.section) !== String(tarif.section)) {
      return false
    }

    return Boolean(tarif.niveau)
  })
}

function AlertDialog({ message, onClose }) {
  if (!message) return null

  const isError = !message.toLowerCase().includes('reussi')

  return (
    <div className="frais-alert-backdrop" role="presentation">
      <section className={`frais-alert ${isError ? 'error' : 'success'}`} role="alertdialog" aria-modal="true">
        <span>{isError ? 'Avertissement' : 'Information'}</span>
        <h2>{isError ? 'Action impossible' : 'Operation reussie'}</h2>
        <p>{message}</p>
        <button type="button" onClick={onClose}>OK</button>
      </section>
    </div>
  )
}

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? 'wide' : ''}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function FraisModal({ resource, form, refs, editing, paymentContext, onField, onSubmit, onClose }) {
  const choices = refs.choices
  const selectedTarif = refs.tarifs.find((tarif) => String(tarif.id) === String(form.tarif))
  const eligibleEleves = getEligibleElevesForTarif(selectedTarif, refs.eleves, refs.classes, refs.frais)
  const paiementFrais = paymentContext
    ? refs.frais.filter((frais) => (
      frais.eleve === paymentContext.eleveId
      && String(frais.trimestre) === String(paymentContext.trimestre)
    ))
    : refs.frais

  return (
    <div className="frais-modal-backdrop" role="presentation">
      <section className="frais-modal" role="dialog" aria-modal="true">
        <div className="frais-modal-head">
          <div>
            <span>{editing ? 'Modification' : 'Nouvel enregistrement'}</span>
            <h2>{sections.find((item) => item.resource === resource)?.label}</h2>
          </div>
          <button type="button" onClick={onClose}>Fermer</button>
        </div>

        <form className="frais-form" onSubmit={onSubmit}>
          {resource === 'types' && (
            <>
              <Field label="Nom du frais"><input value={form.nom || ''} onChange={(e) => onField('nom', e.target.value)} required /></Field>
              <Field label="Description" wide><textarea value={form.description || ''} onChange={(e) => onField('description', e.target.value)} /></Field>
              <label className="frais-check"><input type="checkbox" checked={Boolean(form.actif)} onChange={(e) => onField('actif', e.target.checked)} /> Actif</label>
            </>
          )}

          {resource === 'tarifs' && (
            <>
              <Field label="Type de frais">
                <select value={form.type_frais || ''} onChange={(e) => onField('type_frais', e.target.value)} required>
                  <option value="">Choisir</option>
                  {refs.types.map((type) => <option key={type.id} value={type.id}>{type.nom}</option>)}
                </select>
              </Field>
              <Field label="Trimestre">
                <select value={form.trimestre || 1} onChange={(e) => onField('trimestre', e.target.value)} required>
                  {choices.trimestres.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
                </select>
              </Field>
              <Field label="Montant"><input type="number" min="1" step="0.01" value={form.montant || ''} onChange={(e) => onField('montant', e.target.value)} required /></Field>
              <Field label="Niveau">
                <select value={form.niveau || ''} onChange={(e) => onField('niveau', e.target.value)}>
                  <option value="">Selon la classe</option>
                  {refs.niveaux.map((niveau) => <option key={niveau.id} value={niveau.id}>{niveau.nom}</option>)}
                </select>
              </Field>
              <Field label="Section">
                <select value={form.section || ''} onChange={(e) => onField('section', e.target.value)}>
                  <option value="">Aucune</option>
                  {refs.sections.map((section) => <option key={section.id} value={section.id}>{section.nom}</option>)}
                </select>
              </Field>
              <Field label="Classe">
                <select value={form.classe || ''} onChange={(e) => onField('classe', e.target.value)}>
                  <option value="">Toutes les classes du niveau</option>
                  {refs.classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.libelle || classe.nom}</option>)}
                </select>
              </Field>
              <label className="frais-check"><input type="checkbox" checked={Boolean(form.actif)} onChange={(e) => onField('actif', e.target.checked)} /> Actif</label>
            </>
          )}

          {resource === 'application' && (
            <>
              <div className="frais-payment-context">
                <span>Application des frais</span>
                <strong>Affecter depuis un tarif deja cree</strong>
                <small>Le tarif definit deja le frais, le trimestre, le montant et la cible.</small>
              </div>
              <Field label="Tarif a appliquer" wide>
                <select value={form.tarif || ''} onChange={(e) => onField('tarif', e.target.value)} required>
                  <option value="">Choisir un tarif actif</option>
                  {refs.tarifs.filter((tarif) => tarif.actif).map((tarif) => (
                    <option key={tarif.id} value={tarif.id}>
                      {tarif.type_frais_nom} / {tarif.trimestre_nom} / {tarif.classe_nom || [tarif.niveau_nom, tarif.section_nom].filter(Boolean).join(' - ')} / {money(tarif.montant)}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedTarif && (
                <div className="application-preview">
                  <div><span>Frais</span><strong>{selectedTarif.type_frais_nom}</strong></div>
                  <div><span>Trimestre</span><strong>{selectedTarif.trimestre_nom}</strong></div>
                  <div><span>Montant</span><strong>{money(selectedTarif.montant)}</strong></div>
                  <div><span>Cible</span><strong>{selectedTarif.classe_nom || [selectedTarif.niveau_nom, selectedTarif.section_nom].filter(Boolean).join(' - ')}</strong></div>
                  <div className="wide"><span>Eleves a affecter</span><strong>{eligibleEleves.length}</strong></div>
                  <div className="application-preview-list wide">
                    {eligibleEleves.length ? eligibleEleves.slice(0, 8).map((eleve) => (
                      <small key={eleve.id}>{eleve.matricule} - {eleve.nom_complet}</small>
                    )) : <small>Tous les eleves correspondant a ce tarif sont deja affectes.</small>}
                    {eligibleEleves.length > 8 && <small>+ {eligibleEleves.length - 8} autre(s) eleve(s)</small>}
                  </div>
                </div>
              )}
              <Field label="Description" wide><textarea value={form.description || ''} onChange={(e) => onField('description', e.target.value)} /></Field>
            </>
          )}

          {resource === 'frais' && (
            <>
              <Field label="Eleve">
                <select value={form.eleve || ''} onChange={(e) => onField('eleve', e.target.value)} required>
                  <option value="">Choisir</option>
                  {refs.eleves.map((eleve) => <option key={eleve.id} value={eleve.id}>{eleve.matricule} - {eleve.nom_complet}</option>)}
                </select>
              </Field>
              <Field label="Type de frais">
                <select value={form.type_frais || ''} onChange={(e) => onField('type_frais', e.target.value)} required>
                  <option value="">Choisir</option>
                  {refs.types.map((type) => <option key={type.id} value={type.id}>{type.nom}</option>)}
                </select>
              </Field>
              <Field label="Trimestre">
                <select value={form.trimestre || 1} onChange={(e) => onField('trimestre', e.target.value)} required>
                  {choices.trimestres.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
                </select>
              </Field>
              <Field label="Montant total">
                <input type="number" min="0" step="0.01" value={form.montant_total || ''} onChange={(e) => onField('montant_total', e.target.value)} placeholder="Vide = tarif actif" />
              </Field>
              <Field label="Description" wide><textarea value={form.description || ''} onChange={(e) => onField('description', e.target.value)} /></Field>
            </>
          )}

          {resource === 'paiements' && (
            <>
              {paymentContext && (
                <div className="frais-payment-context">
                  <span>Paiement rapide</span>
                  <strong>{paymentContext.eleveNom}</strong>
                  <small>{paymentContext.trimestreNom}</small>
                </div>
              )}
              <Field label="Frais concerne" wide>
                <select value={form.frais || ''} onChange={(e) => onField('frais', e.target.value)} required>
                  <option value="">Choisir</option>
                  {paiementFrais.map((frais) => (
                    <option key={frais.id} value={frais.id}>
                      {frais.type_frais_nom} / {frais.trimestre_nom} / solde {money(frais.solde_restant)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Montant paye"><input type="number" min="1" step="0.01" value={form.montant_paye || ''} onChange={(e) => onField('montant_paye', e.target.value)} required /></Field>
              <Field label="Mode paiement">
                <select value={form.mode_paiement || 'cash'} onChange={(e) => onField('mode_paiement', e.target.value)}>
                  {choices.modes_paiement.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select value={form.statut || 'valide'} onChange={(e) => onField('statut', e.target.value)}>
                  {choices.statuts_paiement.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
                </select>
              </Field>
              <Field label="Observations" wide><textarea value={form.description || ''} onChange={(e) => onField('description', e.target.value)} /></Field>
            </>
          )}

          <div className="frais-modal-actions">
            <button type="submit">{editing ? 'Modifier' : 'Enregistrer'}</button>
            <button type="button" onClick={onClose}>Annuler</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function ApplicationFraisView({
  applications,
  selectedApplication,
  choices,
  paiements,
  canDelete,
  onSelect,
  onApply,
  onEditFrais,
  onDeleteFrais,
  onPay,
}) {
  if (!applications.length) {
    return <div className="frais-empty">Aucun eleve n'a encore recu une application de frais.</div>
  }

  return (
    <div className="application-layout">
      {!selectedApplication && (
        <div className="affected-students-panel">
          <div className="application-list-head">
            <span>Liste des eleves affectes</span>
            <button type="button" onClick={onApply}>Application des frais</button>
          </div>

          <div className="affected-students-table-wrap">
            <table className="affected-students-table">
              <thead>
                <tr>
                  <th>Eleve</th>
                  <th>Classe</th>
                  <th>A payer</th>
                  <th>Paye</th>
                  <th>Solde</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.eleve}>
                    <td>
                      <strong>{application.eleve_nom}</strong>
                      <small>{application.eleve_matricule}</small>
                    </td>
                    <td>{application.classe_nom || 'Sans classe'}</td>
                    <td>{money(application.total)}</td>
                    <td>{money(application.paye)}</td>
                    <td><strong>{money(application.solde)}</strong></td>
                    <td>
                      <span className={`frais-badge ${application.statut === 'paye' ? 'green' : 'orange'}`}>
                        {application.statut}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="detail-button" onClick={() => onSelect(application.eleve)}>
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedApplication && (
        <div className="application-detail">
          <div className="application-detail-head">
            <div>
              <span>Dossier frais eleve</span>
              <h2>{selectedApplication.eleve_nom}</h2>
              <p>{selectedApplication.eleve_matricule} | {selectedApplication.classe_nom || 'Sans classe'}</p>
            </div>
            <div className={`frais-badge ${selectedApplication.statut === 'paye' ? 'green' : 'orange'}`}>
              {selectedApplication.statut}
            </div>
          </div>

          <button type="button" className="back-to-list-button" onClick={() => onSelect(null)}>
            Retour a la liste
          </button>

          <div className="application-metrics">
            <div><span>Total applique</span><strong>{money(selectedApplication.total)}</strong></div>
            <div><span>Total paye</span><strong>{money(selectedApplication.paye)}</strong></div>
            <div><span>Solde restant</span><strong>{money(selectedApplication.solde)}</strong></div>
          </div>

          <div className="trimestre-stack">
            {choices.trimestres.map((trimestre) => {
              const fraisTrimestre = selectedApplication.frais.filter((frais) => String(frais.trimestre) === String(trimestre.id))
              const fraisIds = fraisTrimestre.map((frais) => frais.id)
              const paiementsTrimestre = paiements.filter((paiement) => fraisIds.includes(paiement.frais))
              const total = fraisTrimestre.reduce((sum, frais) => sum + Number(frais.montant_total || 0), 0)
              const paye = fraisTrimestre.reduce((sum, frais) => sum + Number(frais.total_paye || 0), 0)
              const solde = fraisTrimestre.reduce((sum, frais) => sum + Number(frais.solde_restant || 0), 0)

              return (
                <section key={trimestre.id} className="trimestre-panel">
                  <div className="trimestre-head">
                    <div>
                      <span>{trimestre.nom}</span>
                      <strong>{money(solde)} restant</strong>
                    </div>
                    <button
                      type="button"
                      disabled={!fraisTrimestre.length || solde <= 0}
                      onClick={() => onPay(selectedApplication, trimestre, fraisTrimestre)}
                    >
                      Effectuer paiement
                    </button>
                  </div>

                  <div className="trimestre-grid">
                    <div><span>Applique</span><strong>{money(total)}</strong></div>
                    <div><span>Paye</span><strong>{money(paye)}</strong></div>
                    <div><span>Frais</span><strong>{fraisTrimestre.length}</strong></div>
                  </div>

                  <div className="mini-table">
                    <h3>Frais affectes</h3>
                    {fraisTrimestre.length ? fraisTrimestre.map((frais) => (
                      <div key={frais.id} className="mini-row">
                        <span><strong>{frais.type_frais_nom}</strong><small>{frais.description || 'Application de frais'}</small></span>
                        <span>{money(frais.montant_total)}</span>
                        <span>{money(frais.solde_restant)} solde</span>
                        <span className="mini-actions">
                          {canDelete && <button type="button" onClick={() => onDeleteFrais(frais)}>Supprimer</button>}
                        </span>
                      </div>
                    )) : <p>Aucun frais applique pour ce trimestre.</p>}
                  </div>

                  <div className="mini-table">
                    <h3>Paiements traces</h3>
                    {paiementsTrimestre.length ? paiementsTrimestre.map((paiement) => (
                      <div key={paiement.id} className="mini-row">
                        <span><strong>{paiement.reference}</strong><small>{paiement.agent_nom ? `Par ${paiement.agent_nom}` : 'Agent non renseigne'}</small></span>
                        <span>{money(paiement.montant_paye)}</span>
                        <span>{paiement.mode_paiement_nom}</span>
                        <span>{paiement.date_paiement}</span>
                      </div>
                    )) : <p>Aucun paiement enregistre pour ce trimestre.</p>}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ApplicationBulkView({ refs, items, choices, onApply, onNavigate }) {
  const fraisActifs = items.types.filter((type) => type.actif)
  const tarifsActifs = items.tarifs.filter((tarif) => tarif.actif)

  return (
    <div className="bulk-application">
      <div className="bulk-panel">
        <span>Application des frais</span>
        <h2>Affecter les frais depuis les tarifs</h2>
        <p>
          Choisissez un tarif actif. Le systeme reprend automatiquement le type de frais, le trimestre,
          le montant et la cible du tarif, puis applique seulement aux eleves non encore affectes.
        </p>
        <button type="button" onClick={onApply}>Nouvelle application</button>
      </div>

      <div className="bulk-grid">
        <div><span>Types actifs</span><strong>{fraisActifs.length}</strong></div>
        <div><span>Tarifs actifs</span><strong>{tarifsActifs.length}</strong></div>
        <div><span>Eleves actifs</span><strong>{refs.eleves.length}</strong></div>
        <div><span>Trimestres</span><strong>{choices.trimestres.length}</strong></div>
      </div>

      <div className="bulk-shortcuts">
        <button type="button" onClick={() => onNavigate('frais-tarifs')}>Verifier les tarifs</button>
        <button type="button" onClick={() => onNavigate('frais-eleves')}>Voir frais des eleves</button>
        <button type="button" onClick={() => onNavigate('frais-paiements')}>Voir paiements</button>
      </div>
    </div>
  )
}

export function FraisScolairePage({ section = 'frais-types', user, onNavigate }) {
  const active = sections.find((item) => item.id === section) || sections[0]
  const [items, setItems] = useState({ types: [], tarifs: [], frais: [], paiements: [] })
  const [refs, setRefs] = useState({ eleves: [], niveaux: [], sections: [], classes: [] })
  const [choices, setChoices] = useState({ trimestres: [], modes_paiement: [], statuts_paiement: [] })
  const [resume, setResume] = useState(null)
  const [anneeDefined, setAnneeDefined] = useState(false)
  const [anneeActive, setAnneeActive] = useState(null)
  const [filters, setFilters] = useState(emptyFilters)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalResource, setModalResource] = useState(active.resource)
  const [editing, setEditing] = useState(null)
  const [paymentContext, setPaymentContext] = useState(null)
  const [selectedEleveId, setSelectedEleveId] = useState(null)
  const [form, setForm] = useState(emptyForms[active.resource])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const canDelete = Boolean(user?.is_superuser)

  const loadAll = async (nextFilters = filters) => {
    setLoading(true)
    try {
      const [anneeData, choicesData, resumeData, types, tarifs, frais, paiements, eleves, niveaux, sectionsData, classes] = await Promise.all([
        getAnneeActive(),
        getFraisChoices(),
        getFraisResume(),
        listFraisResource('types'),
        listFraisResource('tarifs', nextFilters),
        listFraisResource('frais', nextFilters),
        listFraisResource('paiements', nextFilters),
        listResource('eleves'),
        listResource('niveaux'),
        listResource('sections'),
        listResource('classes'),
      ])

      setAnneeDefined(anneeData.defined)
      setAnneeActive(anneeData.annee_scolaire)
      setChoices(choicesData)
      setResume(resumeData)
      setItems({
        types: resultList(types),
        tarifs: resultList(tarifs),
        frais: resultList(frais),
        paiements: resultList(paiements),
      })
      setRefs({
        eleves: resultList(eleves),
        niveaux: resultList(niveaux),
        sections: resultList(sectionsData),
        classes: resultList(classes),
      })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    setForm(emptyForms[active.resource])
    setEditing(null)
    setPaymentContext(null)
    setModalResource(active.resource)
    setModalOpen(false)
  }, [active.resource])

  const activeItems = items[active.resource] || []
  const applications = useMemo(() => buildStudentApplications(items.frais), [items.frais])
  const selectedApplication = applications.find((application) => application.eleve === selectedEleveId) || null
  const modalRefs = useMemo(() => ({ ...refs, ...items, choices }), [refs, items, choices])

  useEffect(() => {
    if (!applications.length || !applications.some((application) => application.eleve === selectedEleveId)) {
      setSelectedEleveId(null)
    }
  }, [applications, selectedEleveId])

  const openCreate = () => {
    setEditing(null)
    setPaymentContext(null)
    setModalResource(active.resource)
    setForm(emptyForms[active.resource])
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setPaymentContext(null)
    setModalResource(active.resource)
    setForm({ ...emptyForms[active.resource], ...item })
    setModalOpen(true)
  }

  const openFraisEdit = (item) => {
    setEditing(item)
    setPaymentContext(null)
    setModalResource('frais')
    setForm({ ...emptyForms.frais, ...item })
    setModalOpen(true)
  }

  const openPaymentForTrimestre = (application, trimestre, fraisTrimestre) => {
    const firstFraisWithSolde = fraisTrimestre.find((frais) => Number(frais.solde_restant || 0) > 0) || fraisTrimestre[0]

    setEditing(null)
    setModalResource('paiements')
    setPaymentContext({
      eleveId: application.eleve,
      eleveNom: application.eleve_nom,
      trimestre: trimestre.id,
      trimestreNom: trimestre.nom,
    })
    setForm({
      ...emptyForms.paiements,
      frais: firstFraisWithSolde?.id || '',
      montant_paye: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      if (editing) {
        await updateFraisResource(modalResource, editing.id, form)
        setMessage('Operation reussie: modification enregistree.')
      } else if (modalResource === 'application') {
        const data = await applyFrais(form)
        setMessage(`Operation reussie: ${data.message}`)
      } else {
        await createFraisResource(modalResource, form)
        setMessage('Operation reussie: enregistrement effectue.')
      }
      setModalOpen(false)
      setEditing(null)
      setPaymentContext(null)
      setForm(emptyForms[modalResource])
      await loadAll()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm('Confirmer la suppression ?')) return
    try {
      await deleteFraisResource(active.resource, item.id)
      setMessage('Operation reussie: suppression effectuee.')
      await loadAll()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const applyFilters = (event) => {
    event.preventDefault()
    loadAll(filters)
  }

  return (
    <>
      <style>{`
        .frais-page {
          width: min(1180px, 100%);
          margin: 18px auto 48px;
          color: #0f172a;
        }

        .frais-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
          gap: 18px;
          align-items: stretch;
          padding: 24px;
          border-radius: 8px;
          background:
            linear-gradient(135deg, rgba(14, 116, 144, 0.94), rgba(22, 101, 52, 0.9)),
            url("https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80");
          background-size: cover;
          background-position: center;
          color: #fff;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
        }

        .frais-hero h1 {
          margin: 4px 0 8px;
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: 0;
        }

        .frais-hero p {
          max-width: 640px;
          margin: 0;
          color: rgba(255,255,255,0.86);
          font-weight: 650;
        }

        .frais-year {
          display: grid;
          gap: 8px;
          align-content: center;
          padding: 18px;
          border: 1px solid rgba(255,255,255,0.26);
          border-radius: 8px;
          background: rgba(255,255,255,0.14);
          backdrop-filter: blur(8px);
        }

        .frais-year span,
        .frais-hero-kicker,
        .frais-stat span {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        .frais-year strong {
          font-size: 22px;
        }

        .frais-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .frais-stat {
          min-height: 92px;
          display: grid;
          align-content: center;
          gap: 8px;
          padding: 16px;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
        }

        .frais-stat strong {
          font-size: 22px;
          color: #075985;
        }

        .frais-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
        }

        .frais-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .frais-tabs button,
        .frais-toolbar > button,
        .frais-filter button,
        .frais-row-actions button,
        .frais-modal-actions button,
        .frais-modal-head button,
        .frais-alert button {
          border: 0;
          border-radius: 7px;
          padding: 10px 13px;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
        }

        .frais-tabs button {
          color: #334155;
          background: #f1f5f9;
        }

        .frais-tabs button.active {
          color: #fff;
          background: linear-gradient(135deg, #0f766e, #2563eb);
        }

        .frais-toolbar > button,
        .frais-filter button,
        .frais-modal-actions button:first-child {
          color: #fff;
          background: #0f766e;
        }

        .frais-filter {
          display: grid;
          grid-template-columns: repeat(5, minmax(140px, 1fr)) auto;
          gap: 10px;
          margin: 14px 0;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
        }

        .frais-filter input,
        .frais-filter select,
        .frais-form input,
        .frais-form select,
        .frais-form textarea {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          padding: 10px 11px;
          color: #0f172a;
          background: #fff;
          font: inherit;
        }

        .frais-table-wrap {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
        }

        .frais-table {
          width: 100%;
          min-width: 880px;
          border-collapse: collapse;
        }

        .frais-table th,
        .frais-table td {
          padding: 13px 14px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
          vertical-align: middle;
          font-size: 14px;
        }

        .frais-table th {
          color: #475569;
          background: #f8fafc;
          font-size: 12px;
          text-transform: uppercase;
        }

        .frais-badge {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          border-radius: 999px;
          padding: 0 10px;
          color: #075985;
          background: #e0f2fe;
          font-size: 12px;
          font-weight: 900;
        }

        .frais-badge.green {
          color: #166534;
          background: #dcfce7;
        }

        .frais-badge.orange {
          color: #9a3412;
          background: #ffedd5;
        }

        .frais-row-actions {
          display: flex;
          gap: 8px;
        }

        .frais-row-actions button {
          color: #0f172a;
          background: #e2e8f0;
        }

        .frais-row-actions button.danger {
          color: #fff;
          background: #dc2626;
        }

        .bulk-application {
          display: grid;
          gap: 14px;
          margin-top: 14px;
        }

        .bulk-panel {
          display: grid;
          gap: 10px;
          padding: 22px;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          background:
            linear-gradient(135deg, rgba(236, 254, 255, 0.96), rgba(240, 253, 244, 0.96)),
            url("https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80");
          background-size: cover;
          background-position: center;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
        }

        .bulk-panel span,
        .bulk-grid span {
          color: #0f766e;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .bulk-panel h2 {
          margin: 0;
          font-size: 28px;
        }

        .bulk-panel p {
          max-width: 720px;
          margin: 0;
          color: #475569;
          font-weight: 750;
        }

        .bulk-panel button,
        .bulk-shortcuts button {
          width: fit-content;
          border: 0;
          border-radius: 7px;
          padding: 11px 14px;
          color: #fff;
          background: #0f766e;
          cursor: pointer;
          font: inherit;
          font-weight: 900;
        }

        .bulk-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .bulk-grid div {
          display: grid;
          gap: 7px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
        }

        .bulk-grid strong {
          color: #075985;
          font-size: 24px;
        }

        .bulk-shortcuts {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .bulk-shortcuts button {
          color: #0f172a;
          background: #e0f2fe;
        }

        .application-layout {
          margin-top: 14px;
        }

        .affected-students-panel,
        .application-list,
        .application-detail,
        .trimestre-panel {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
        }

        .application-list {
          align-self: start;
          overflow: hidden;
        }

        .affected-students-table-wrap {
          overflow-x: auto;
        }

        .affected-students-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }

        .affected-students-table th,
        .affected-students-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
          vertical-align: middle;
        }

        .affected-students-table th {
          color: #475569;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .affected-students-table td strong,
        .affected-students-table td small {
          display: block;
        }

        .affected-students-table td small {
          margin-top: 3px;
          color: #64748b;
          font-weight: 750;
        }

        .application-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .application-list-head span,
        .application-detail-head span,
        .application-metrics span,
        .trimestre-head span,
        .trimestre-grid span,
        .frais-payment-context span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .application-list-head button,
        .trimestre-head button {
          border: 0;
          border-radius: 7px;
          padding: 9px 11px;
          color: #ffffff;
          background: #0f766e;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .trimestre-head button:disabled {
          cursor: not-allowed;
          color: #94a3b8;
          background: #e2e8f0;
        }

        .application-student {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 0;
          border-bottom: 1px solid #e2e8f0;
          padding: 13px;
          color: #0f172a;
          background: #ffffff;
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .application-student.active {
          background: linear-gradient(135deg, #ecfeff, #f0fdf4);
          box-shadow: inset 4px 0 0 #0f766e;
        }

        .application-student span {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .application-student strong,
        .application-student small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .application-student small {
          color: #64748b;
          font-weight: 750;
        }

        .application-student em {
          flex: 0 0 auto;
          color: #075985;
          font-style: normal;
          font-weight: 900;
        }

        .application-detail {
          position: relative;
          overflow: hidden;
          padding: 0;
          background:
            linear-gradient(180deg, rgba(240, 253, 244, 0.98), rgba(255, 255, 255, 1) 260px),
            #ffffff;
        }

        .application-detail-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 22px;
          border-bottom: 1px solid #dbeafe;
          background:
            linear-gradient(135deg, rgba(14, 116, 144, 0.94), rgba(37, 99, 235, 0.86)),
            url("https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80");
          background-size: cover;
          background-position: center;
          color: #ffffff;
        }

        .application-detail-head h2 {
          margin: 4px 0;
          font-size: 30px;
          line-height: 1.05;
        }

        .application-detail-head p {
          margin: 0;
          color: rgba(255, 255, 255, 0.86);
          font-weight: 800;
        }

        .application-detail-head span {
          color: rgba(255, 255, 255, 0.72);
        }

        .application-detail-head .frais-badge {
          color: #064e3b;
          background: rgba(220, 252, 231, 0.96);
        }

        .application-metrics,
        .trimestre-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 18px;
        }

        .application-metrics div,
        .trimestre-grid div {
          display: grid;
          gap: 6px;
          padding: 15px;
          border: 1px solid rgba(191, 219, 254, 0.9);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
        }

        .application-metrics strong,
        .trimestre-grid strong {
          color: #075985;
          font-size: 20px;
        }

        .trimestre-stack {
          display: grid;
          gap: 14px;
          padding: 0 18px 18px;
        }

        .trimestre-panel {
          overflow: hidden;
          padding: 0;
          border-color: rgba(203, 213, 225, 0.92);
          box-shadow: none;
        }

        .trimestre-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px;
          background: linear-gradient(135deg, #f0fdfa, #eff6ff);
          border-bottom: 1px solid #dbeafe;
        }

        .trimestre-head div {
          display: grid;
          gap: 4px;
        }

        .trimestre-head strong {
          color: #0f172a;
          font-size: 20px;
        }

        .mini-table {
          display: grid;
          gap: 7px;
          margin: 0;
          padding: 14px;
        }

        .mini-table h3 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
        }

        .mini-table p {
          margin: 0;
          padding: 10px;
          border-radius: 7px;
          color: #64748b;
          background: #f8fafc;
          font-weight: 750;
        }

        .mini-row {
          display: grid;
          grid-template-columns: minmax(180px, 1.1fr) minmax(110px, 0.6fr) minmax(110px, 0.6fr) minmax(130px, 0.7fr);
          gap: 10px;
          align-items: center;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 7px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
        }

        .mini-row span {
          display: grid;
          gap: 2px;
          font-weight: 850;
        }

        .mini-row small {
          color: #64748b;
          font-weight: 700;
        }

        .mini-actions {
          display: flex !important;
          gap: 7px !important;
          justify-content: flex-end;
        }

        .mini-actions button {
          border: 0;
          border-radius: 6px;
          padding: 8px 9px;
          color: #0f172a;
          background: #e2e8f0;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .detail-button,
        .back-to-list-button {
          border: 0;
          border-radius: 7px;
          padding: 10px 12px;
          color: #ffffff;
          background: #2563eb;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .back-to-list-button {
          width: fit-content;
          margin: 16px 18px 0;
          color: #ffffff;
          background: #f97316;
        }

        .frais-payment-context {
          grid-column: 1 / -1;
          display: grid;
          gap: 4px;
          padding: 12px;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          background: linear-gradient(135deg, #ecfeff, #f0fdf4);
        }

        .frais-payment-context strong {
          color: #0f172a;
          font-size: 18px;
        }

        .frais-payment-context small {
          color: #0f766e;
          font-weight: 900;
        }

        .application-preview {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          padding: 12px;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          background: #f8fafc;
        }

        .application-preview div {
          display: grid;
          gap: 4px;
          padding: 10px;
          border-radius: 7px;
          background: #ffffff;
        }

        .application-preview .wide {
          grid-column: 1 / -1;
        }

        .application-preview span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .application-preview strong {
          color: #0f172a;
        }

        .application-preview-list {
          max-height: 160px;
          overflow: auto;
        }

        .application-preview-list small {
          display: block;
          color: #475569;
          font-weight: 800;
        }

        .frais-empty,
        .frais-lock {
          margin-top: 16px;
          padding: 24px;
          border: 1px dashed #94a3b8;
          border-radius: 8px;
          background: #f8fafc;
          text-align: center;
        }

        .frais-modal-backdrop,
        .frais-alert-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(15, 23, 42, 0.42);
          backdrop-filter: blur(4px);
        }

        .frais-modal,
        .frais-alert {
          width: min(760px, 100%);
          max-height: 90vh;
          overflow: auto;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
        }

        .frais-modal-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 18px;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f0fdfa, #eff6ff);
        }

        .frais-modal-head h2 {
          margin: 3px 0 0;
        }

        .frais-modal-head span,
        .frais-form label span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .frais-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
          padding: 18px;
        }

        .frais-form label {
          display: grid;
          gap: 7px;
        }

        .frais-form .wide {
          grid-column: 1 / -1;
        }

        .frais-check {
          grid-column: 1 / -1;
          display: flex !important;
          align-items: center;
          gap: 8px !important;
          font-weight: 800;
        }

        .frais-check input {
          width: auto;
          min-height: auto;
        }

        .frais-modal-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .frais-modal-actions button:last-child,
        .frais-modal-head button {
          color: #334155;
          background: #e2e8f0;
        }

        .frais-alert {
          max-width: 420px;
          padding: 22px;
          text-align: center;
        }

        .frais-alert.error {
          border-top: 5px solid #dc2626;
        }

        .frais-alert.success {
          border-top: 5px solid #16a34a;
        }

        .frais-alert h2 {
          margin: 6px 0;
        }

        .frais-alert button {
          margin-top: 12px;
          color: #fff;
          background: #0f766e;
        }

        @media (max-width: 880px) {
          .frais-hero,
          .frais-stats,
          .frais-filter,
          .bulk-grid,
          .application-layout,
          .application-metrics,
          .trimestre-grid {
            grid-template-columns: 1fr;
          }

          .application-preview {
            grid-template-columns: 1fr;
          }

          .application-detail-head,
          .trimestre-head {
            align-items: stretch;
            flex-direction: column;
          }

          .mini-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .frais-page {
            margin-top: 8px;
          }

          .frais-hero {
            padding: 18px;
          }

          .frais-hero h1 {
            font-size: 26px;
          }

          .frais-form {
            grid-template-columns: 1fr;
          }

          .application-detail-head {
            padding: 18px;
          }

          .application-detail-head h2 {
            font-size: 24px;
          }

          .application-metrics,
          .trimestre-stack {
            margin-left: 10px;
            margin-right: 10px;
          }
        }
      `}</style>

      <section className="frais-page">
        <div className="frais-hero">
          <div>
            <span className="frais-hero-kicker">Gestion financiere</span>
            <h1>Frais scolaire</h1>
            <p>Tarifs, frais des eleves et paiements suivent l'annee scolaire active definie dans l'administration.</p>
          </div>
          <div className="frais-year">
            <span>Annee active</span>
            <strong>{anneeActive?.nom || 'Non definie'}</strong>
            <small>{anneeDefined ? 'Les operations sont disponibles.' : 'Definissez une annee scolaire active dans admin Django.'}</small>
          </div>
        </div>

        <div className="frais-stats">
          <div className="frais-stat"><span>Total attendu</span><strong>{money(resume?.total_attendu)}</strong></div>
          <div className="frais-stat"><span>Total paye</span><strong>{money(resume?.total_paye)}</strong></div>
          <div className="frais-stat"><span>Solde</span><strong>{money(resume?.solde)}</strong></div>
          <div className="frais-stat"><span>Paiements</span><strong>{resume?.nb_paiements || 0}</strong></div>
        </div>

        <div className="frais-toolbar">
          <div className="frais-tabs">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className={active.id === item.id ? 'active' : ''}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {active.resource === 'paiements' ? null : active.resource === 'frais' ? (
            <button type="button" onClick={() => onNavigate('frais-application')} disabled={!anneeDefined}>
              Application des frais
            </button>
          ) : (
            <button type="button" onClick={openCreate} disabled={!anneeDefined}>
              {active.resource === 'application' ? 'Nouvelle application' : 'Ajouter'}
            </button>
          )}
        </div>

        {!anneeDefined && (
          <div className="frais-lock">
            <h2>Plateforme bloquee pour les operations</h2>
            <p>Veuillez definir une annee scolaire active dans l'admin Django avant d'enregistrer les frais.</p>
          </div>
        )}

        {active.resource !== 'application' && (
          <form className="frais-filter" onSubmit={applyFilters}>
            <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Recherche" />
            <select value={filters.trimestre} onChange={(e) => setFilters({ ...filters, trimestre: e.target.value })}>
              <option value="">Tous les trimestres</option>
              {choices.trimestres.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
            </select>
            <select value={filters.type_frais} onChange={(e) => setFilters({ ...filters, type_frais: e.target.value })}>
              <option value="">Tous les frais</option>
              {items.types.map((type) => <option key={type.id} value={type.id}>{type.nom}</option>)}
            </select>
            <select value={filters.classe} onChange={(e) => setFilters({ ...filters, classe: e.target.value })}>
              <option value="">Toutes les classes</option>
              {refs.classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.libelle || classe.nom}</option>)}
            </select>
            <select value={filters.niveau} onChange={(e) => setFilters({ ...filters, niveau: e.target.value })}>
              <option value="">Tous les niveaux</option>
              {refs.niveaux.map((niveau) => <option key={niveau.id} value={niveau.id}>{niveau.nom}</option>)}
            </select>
            <select value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
              <option value="">Toutes les sections</option>
              {refs.sections.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
            </select>
            <select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })}>
              <option value="">Tous les statuts</option>
              <option value="non_paye">Non paye</option>
              <option value="partiel">Partiel</option>
              <option value="paye">Paye</option>
              {choices.statuts_paiement.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}
            </select>
            <button type="submit">{loading ? 'Chargement...' : 'Filtrer'}</button>
          </form>
        )}

        {active.resource === 'application' ? (
          <ApplicationBulkView
            refs={refs}
            items={items}
            choices={choices}
            onApply={openCreate}
            onNavigate={onNavigate}
          />
        ) : active.resource === 'frais' ? (
          <ApplicationFraisView
            applications={applications}
            selectedApplication={selectedApplication}
            choices={choices}
            paiements={items.paiements}
            canDelete={canDelete}
            onSelect={setSelectedEleveId}
            onApply={() => onNavigate('frais-application')}
            onEditFrais={openFraisEdit}
            onDeleteFrais={handleDelete}
            onPay={openPaymentForTrimestre}
          />
        ) : (
          <div className="frais-table-wrap">
          <table className="frais-table">
            <thead>
              {active.resource === 'types' && <tr><th>Nom</th><th>Code</th><th>Description</th><th>Etat</th><th>Actions</th></tr>}
              {active.resource === 'tarifs' && <tr><th>Type</th><th>Cible</th><th>Trimestre</th><th>Montant</th><th>Etat</th><th>Actions</th></tr>}
              {active.resource === 'paiements' && <tr><th>Reference</th><th>Eleve</th><th>Frais</th><th>Montant</th><th>Mode</th><th>Date</th><th>Statut</th><th>Actions</th></tr>}
            </thead>
            <tbody>
              {active.resource === 'types' && activeItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.nom}</strong></td>
                  <td>{item.code}</td>
                  <td>{item.description || '-'}</td>
                  <td><span className={`frais-badge ${item.actif ? 'green' : 'orange'}`}>{item.actif ? 'Actif' : 'Inactif'}</span></td>
                  <td><RowActions item={item} canDelete={canDelete} onEdit={openEdit} onDelete={handleDelete} /></td>
                </tr>
              ))}

              {active.resource === 'tarifs' && activeItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.type_frais_nom}</strong></td>
                  <td>{item.classe_nom || [item.niveau_nom, item.section_nom].filter(Boolean).join(' - ')}</td>
                  <td>{item.trimestre_nom}</td>
                  <td>{money(item.montant)}</td>
                  <td><span className={`frais-badge ${item.actif ? 'green' : 'orange'}`}>{item.actif ? 'Actif' : 'Inactif'}</span></td>
                  <td><RowActions item={item} canDelete={canDelete} onEdit={openEdit} onDelete={handleDelete} /></td>
                </tr>
              ))}

              {active.resource === 'paiements' && activeItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.reference}</strong></td>
                  <td>{item.eleve_matricule}<br />{item.eleve_nom}</td>
                  <td>{item.frais_libelle}</td>
                  <td>{money(item.montant_paye)}</td>
                  <td>{item.mode_paiement_nom}</td>
                  <td>{item.date_paiement}</td>
                  <td><span className={`frais-badge ${item.statut === 'valide' ? 'green' : 'orange'}`}>{item.statut_nom}</span></td>
                  <td><RowActions item={item} canDelete={canDelete} onEdit={openEdit} onDelete={handleDelete} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {!['application', 'frais'].includes(active.resource) && !activeItems.length && <div className="frais-empty">Aucune donnee a afficher pour cette rubrique.</div>}

        {modalOpen && (
          <FraisModal
            resource={modalResource}
            form={form}
            refs={modalRefs}
            editing={editing}
            paymentContext={paymentContext}
            onField={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
            onSubmit={handleSubmit}
            onClose={() => {
              setPaymentContext(null)
              setModalOpen(false)
            }}
          />
        )}

        <AlertDialog message={message} onClose={() => setMessage('')} />
      </section>
    </>
  )
}

function RowActions({ item, canDelete, onEdit, onDelete }) {
  return (
    <div className="frais-row-actions">
      <button type="button" onClick={() => onEdit(item)}>Modifier</button>
      {canDelete && <button type="button" className="danger" onClick={() => onDelete(item)}>Supprimer</button>}
    </div>
  )
}
