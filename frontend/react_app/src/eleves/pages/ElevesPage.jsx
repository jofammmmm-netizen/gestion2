import { useEffect, useMemo, useState } from 'react'
import {
  createEleve,
  createResource,
  deleteResource,
  getAnneeActive,
  listResource,
  updateEleve,
  updateResource,
} from '../services/elevesApi'

const tabs = [
  { id: 'eleves', label: 'Eleves' },
  { id: 'classes', label: 'Classes' },
  { id: 'niveaux', label: 'Niveaux' },
  { id: 'sections', label: 'Sections' },
  { id: 'statuts', label: 'Statuts' },
]

const emptySimple = { nom: '', ordre: 0, actif: true }
const emptyClasse = { niveau: '', nom: '', section: '', ordre: 0, actif: true }
const emptyEleve = {
  nom: '',
  post_nom: '',
  prenom: '',
  lieu_de_naissance: '',
  date_naissance: '',
  sexe: 'M',
  adresse: '',
  telephone: '',
  email: '',
  classe: '',
  statut: '',
}
const emptyFilters = {
  search: '',
  niveau: '',
  classe: '',
  section: '',
  statut: '',
  sexe: '',
  date_debut: '',
  date_fin: '',
}

function resultList(data) {
  return Array.isArray(data) ? data : data.results || []
}

function BooleanField({ checked, onChange }) {
  return (
    <label className="inline-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Actif
    </label>
  )
}

function AlertDialog({ message, onClose }) {
  if (!message) return null

  const isError = message.includes(':') || message.includes('superadmin') || message.includes('Erreur') || message.includes('future')

  return (
    <div className="alert-backdrop" role="presentation">
      <section className={`alert-dialog ${isError ? 'error' : 'success'}`} role="alertdialog" aria-modal="true">
        <span>{isError ? 'Avertissement' : 'Information'}</span>
        <h2>{isError ? 'Enregistrement impossible' : 'Operation reussie'}</h2>
        <p>{message}</p>
        <button type="button" onClick={onClose}>OK</button>
      </section>
    </div>
  )
}

function EleveForm({ form, items, editing, onField, onSubmit, onCancel }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <div className="modal-form-grid">
        <label>Nom<input value={form.nom || ''} onChange={(e) => onField('nom', e.target.value)} required /></label>
        <label>Post-nom<input value={form.post_nom || ''} onChange={(e) => onField('post_nom', e.target.value)} required /></label>
        <label>Prenom<input value={form.prenom || ''} onChange={(e) => onField('prenom', e.target.value)} required /></label>
        <label>
          Sexe
          <select value={form.sexe || 'M'} onChange={(e) => onField('sexe', e.target.value)}>
            <option value="M">Masculin</option>
            <option value="F">Feminin</option>
          </select>
        </label>
        <label>Date naissance<input type="date" value={form.date_naissance || ''} onChange={(e) => onField('date_naissance', e.target.value)} /></label>
        <label>Lieu de naissance<input value={form.lieu_de_naissance || ''} onChange={(e) => onField('lieu_de_naissance', e.target.value)} /></label>
        <label>Telephone<input value={form.telephone || ''} onChange={(e) => onField('telephone', e.target.value)} /></label>
        <label>Email<input type="email" value={form.email || ''} onChange={(e) => onField('email', e.target.value)} /></label>
        <label>
          Classe
          <select value={form.classe || ''} onChange={(e) => onField('classe', e.target.value)}>
            <option value="">Aucune</option>
            {items.classes.map((classe) => (
              <option key={classe.id} value={classe.id}>{classe.libelle || classe.nom}</option>
            ))}
          </select>
        </label>
        <label>
          Statut
          <select value={form.statut || ''} onChange={(e) => onField('statut', e.target.value)}>
            <option value="">Aucun</option>
            {items.statuts.map((statut) => (
              <option key={statut.id} value={statut.id}>{statut.nom}</option>
            ))}
          </select>
        </label>
        <label className="span-2">Adresse<textarea value={form.adresse || ''} onChange={(e) => onField('adresse', e.target.value)} /></label>
      </div>
      <div className="modal-actions">
        <button type="submit">{editing ? 'Modifier' : 'Enregistrer'}</button>
        <button type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  )
}

function EleveDetails({ eleve, onClose, onEdit, canDelete, onDelete }) {
  if (!eleve) return null

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="student-detail-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <span>Dossier eleve</span>
            <h2>{eleve.nom_complet}</h2>
            <p>{eleve.matricule}</p>
          </div>
          <button type="button" onClick={onClose}>Fermer</button>
        </div>

        <div className="detail-grid">
          <div><span>Classe</span><strong>{eleve.classe_nom || 'Sans classe'}</strong></div>
          <div><span>Statut</span><strong>{eleve.statut_nom || 'Sans statut'}</strong></div>
          <div><span>Annee scolaire</span><strong>{eleve.annee_scolaire_nom || '-'}</strong></div>
          <div><span>Sexe</span><strong>{eleve.sexe === 'F' ? 'Feminin' : 'Masculin'}</strong></div>
          <div><span>Date inscription</span><strong>{eleve.date_inscription || '-'}</strong></div>
          <div><span>Telephone</span><strong>{eleve.telephone || '-'}</strong></div>
          <div><span>Email</span><strong>{eleve.email || '-'}</strong></div>
          <div><span>Naissance</span><strong>{eleve.date_naissance || '-'}</strong></div>
          <div><span>Lieu</span><strong>{eleve.lieu_de_naissance || '-'}</strong></div>
          <div className="span-2"><span>Adresse</span><strong>{eleve.adresse || '-'}</strong></div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={() => window.print()}>Imprimer</button>
          <button type="button" onClick={() => onEdit(eleve)}>Modifier</button>
          {canDelete && <button type="button" className="danger-button" onClick={() => onDelete(eleve)}>Supprimer</button>}
        </div>
      </section>
    </div>
  )
}

export function ElevesPage({ user }) {
  const [activeTab, setActiveTab] = useState('eleves')
  const [items, setItems] = useState({ niveaux: [], sections: [], classes: [], statuts: [], eleves: [] })
  const [anneeActive, setAnneeActive] = useState(null)
  const [anneeDefined, setAnneeDefined] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(emptyEleve)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [eleveModalOpen, setEleveModalOpen] = useState(false)
  const canDelete = Boolean(user?.is_superuser)

  const loadAll = async (nextFilters = filters) => {
    setLoading(true)
    try {
      const [anneeData, niveaux, sections, classes, statuts, eleves] = await Promise.all([
        getAnneeActive(),
        listResource('niveaux'),
        listResource('sections'),
        listResource('classes'),
        listResource('statuts'),
        listResource('eleves', nextFilters),
      ])
      setAnneeDefined(anneeData.defined)
      setAnneeActive(anneeData.annee_scolaire)
      setItems({
        niveaux: resultList(niveaux),
        sections: resultList(sections),
        classes: resultList(classes),
        statuts: resultList(statuts),
        eleves: resultList(eleves),
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

  const activeItems = items[activeTab]
  const title = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label, [activeTab])

  const resetForm = (tab = activeTab) => {
    setEditing(null)
    if (tab === 'classes') setForm(emptyClasse)
    else if (tab === 'eleves') setForm(emptyEleve)
    else setForm({ ...emptySimple, ordre: tab === 'niveaux' ? 0 : undefined })
    setMessage('')
  }

  const openEleveModal = (eleve = null) => {
    if (!anneeDefined) {
      setMessage("Aucune annee scolaire active n'est definie dans l'admin Django.")
      return
    }
    setActiveTab('eleves')
    setEditing(eleve)
    setDetail(null)
    setForm(eleve ? {
      ...emptyEleve,
      ...eleve,
      classe: eleve.classe || '',
      statut: eleve.statut || '',
      date_naissance: eleve.date_naissance || '',
    } : emptyEleve)
    setEleveModalOpen(true)
  }

  const changeTab = (tab) => {
    setActiveTab(tab)
    resetForm(tab)
  }

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const setFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const editItem = (item) => {
    setEditing(item)
    if (activeTab === 'eleves') {
      openEleveModal(item)
    } else if (activeTab === 'classes') {
      setForm({
        niveau: item.niveau || '',
        nom: item.nom || '',
        section: item.section || '',
        ordre: item.ordre || 0,
        actif: item.actif,
      })
    } else {
      setForm({
        nom: item.nom || '',
        ordre: activeTab === 'niveaux' ? item.ordre || 0 : undefined,
        actif: item.actif,
      })
    }
  }

  const saveItem = async (event) => {
    event.preventDefault()
    setMessage('')

    if (!anneeDefined) {
      setMessage("Aucune annee scolaire active n'est definie dans l'admin Django.")
      return
    }

    try {
      if (activeTab === 'eleves') {
        if (editing) await updateEleve(editing.id, form)
        else await createEleve(form)
        setEleveModalOpen(false)
      } else if (editing) {
        await updateResource(activeTab, editing.id, form)
      } else {
        await createResource(activeTab, form)
      }
      resetForm()
      await loadAll()
      setMessage('Enregistrement effectue.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const removeItem = async (item) => {
    if (!anneeDefined) {
      setMessage("Aucune annee scolaire active n'est definie dans l'admin Django.")
      return
    }
    const confirmed = window.confirm('Voulez-vous supprimer cet element ?')
    if (!confirmed) return

    try {
      await deleteResource(activeTab, item.id)
      setDetail(null)
      await loadAll()
      setMessage('Suppression effectuee.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const applyFilters = async (event) => {
    event.preventDefault()
    await loadAll(filters)
  }

  const clearFilters = async () => {
    setFilters(emptyFilters)
    await loadAll(emptyFilters)
  }

  return (
    <section className="eleves-page">
      <div className="eleves-hero">
        <div>
          <span>Gestion scolaire</span>
          <h1>Dossier des eleves</h1>
          <p>
            {anneeActive
              ? `Annee scolaire active : ${anneeActive.nom}`
              : "Aucune annee scolaire active definie dans l'admin."}
          </p>
        </div>
        <div className="hero-metrics">
          <div><strong>{items.eleves.length}</strong><span>Eleves</span></div>
          <div><strong>{items.classes.length}</strong><span>Classes</span></div>
          <div><strong>{items.niveaux.length}</strong><span>Niveaux</span></div>
        </div>
      </div>

      <div className="page-heading">
        <div>
          <h2>{title}</h2>
          <p>{activeTab === 'eleves' ? 'Registre et filtres avances' : 'Parametres definis par votre etablissement'}</p>
        </div>
        <button type="button" onClick={() => (activeTab === 'eleves' ? openEleveModal() : resetForm())}>
          {activeTab === 'eleves' ? 'Ajouter eleve' : 'Nouveau'}
        </button>
      </div>

      <div className="module-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => changeTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <AlertDialog message={message} onClose={() => setMessage('')} />

      {!anneeDefined && (
        <section className="school-year-lock">
          <span>Configuration requise</span>
          <h2>Annee scolaire active non definie</h2>
          <p>
            Avant de gerer les eleves, classes, niveaux, sections ou statuts, vous devez definir une annee scolaire active dans l'admin Django.
          </p>
          <p className="lock-path">Admin Django &gt; Eleves &gt; Annees scolaires</p>
        </section>
      )}

      {anneeDefined && activeTab === 'eleves' ? (
        <div className="students-workspace">
          <form className="filters-panel" onSubmit={applyFilters}>
            <label>Recherche<input value={filters.search} onChange={(e) => setFilter('search', e.target.value)} placeholder="Nom, matricule, telephone..." /></label>
            <label>
              Niveau
              <select value={filters.niveau} onChange={(e) => setFilter('niveau', e.target.value)}>
                <option value="">Tous</option>
                {items.niveaux.map((niveau) => <option key={niveau.id} value={niveau.id}>{niveau.nom}</option>)}
              </select>
            </label>
            <label>
              Section
              <select value={filters.section} onChange={(e) => setFilter('section', e.target.value)}>
                <option value="">Toutes</option>
                {items.sections.map((section) => <option key={section.id} value={section.id}>{section.nom}</option>)}
              </select>
            </label>
            <label>
              Classe
              <select value={filters.classe} onChange={(e) => setFilter('classe', e.target.value)}>
                <option value="">Toutes</option>
                {items.classes.map((classe) => <option key={classe.id} value={classe.id}>{classe.libelle || classe.nom}</option>)}
              </select>
            </label>
            <label>
              Statut
              <select value={filters.statut} onChange={(e) => setFilter('statut', e.target.value)}>
                <option value="">Tous</option>
                {items.statuts.map((statut) => <option key={statut.id} value={statut.id}>{statut.nom}</option>)}
              </select>
            </label>
            <label>
              Sexe
              <select value={filters.sexe} onChange={(e) => setFilter('sexe', e.target.value)}>
                <option value="">Tous</option>
                <option value="M">Masculin</option>
                <option value="F">Feminin</option>
              </select>
            </label>
            <label>Inscrit depuis<input type="date" value={filters.date_debut} onChange={(e) => setFilter('date_debut', e.target.value)} /></label>
            <label>Jusqu'au<input type="date" value={filters.date_fin} onChange={(e) => setFilter('date_fin', e.target.value)} /></label>
            <div className="filter-actions">
              <button type="submit">Filtrer</button>
              <button type="button" onClick={clearFilters}>Effacer</button>
            </div>
          </form>

          <section className="students-table-card">
            <div className="list-head">
              <div>
                <span>Registre</span>
                <h2>Eleves</h2>
              </div>
            </div>

            {loading ? (
              <p>Chargement...</p>
            ) : (
              <div className="students-table">
                <div className="students-row students-header">
                  <span>Matricule</span>
                  <span>Eleve</span>
                  <span>Classe</span>
                  <span>Statut</span>
                  <span>Contact</span>
                  <span>Actions</span>
                </div>
                {items.eleves.map((eleve) => (
                  <div className="students-row" key={eleve.id}>
                    <strong>{eleve.matricule}</strong>
                    <span>{eleve.nom_complet}</span>
                    <span>{eleve.classe_nom || 'Sans classe'}</span>
                    <span>{eleve.statut_nom || 'Sans statut'}</span>
                    <span>{eleve.telephone || eleve.email || '-'}</span>
                    <div className="row-actions">
                      <button type="button" onClick={() => setDetail(eleve)}>Detail</button>
                      <button type="button" onClick={() => openEleveModal(eleve)}>Modifier</button>
                      {canDelete && <button type="button" onClick={() => removeItem(eleve)}>Supprimer</button>}
                    </div>
                  </div>
                ))}
                {items.eleves.length === 0 && <p className="empty-state">Aucun eleve ne correspond aux filtres.</p>}
              </div>
            )}
          </section>
        </div>
      ) : anneeDefined ? (
        <div className="management-grid">
          <form className="management-form" onSubmit={saveItem}>
            <div className="panel-title">
              <span>{editing ? 'Edition' : 'Creation'}</span>
              <h2>{editing ? `Modifier ${title}` : `Ajouter ${title}`}</h2>
            </div>

            {['niveaux', 'sections', 'statuts'].includes(activeTab) && (
              <>
                <label>Nom<input value={form.nom || ''} onChange={(e) => setField('nom', e.target.value)} required /></label>
                {activeTab === 'niveaux' && (
                  <label>Ordre<input type="number" value={form.ordre || 0} onChange={(e) => setField('ordre', e.target.value)} /></label>
                )}
                <BooleanField checked={Boolean(form.actif)} onChange={(value) => setField('actif', value)} />
              </>
            )}

            {activeTab === 'classes' && (
              <>
                <label>
                  Niveau
                  <select value={form.niveau || ''} onChange={(e) => setField('niveau', e.target.value)} required>
                    <option value="">Choisir</option>
                    {items.niveaux.map((niveau) => <option key={niveau.id} value={niveau.id}>{niveau.nom}</option>)}
                  </select>
                </label>
                <label>Nom<input value={form.nom || ''} onChange={(e) => setField('nom', e.target.value)} required /></label>
                <label>
                  Section
                  <select value={form.section || ''} onChange={(e) => setField('section', e.target.value)}>
                    <option value="">Aucune</option>
                    {items.sections.map((section) => <option key={section.id} value={section.id}>{section.nom}</option>)}
                  </select>
                </label>
                <label>Ordre<input type="number" value={form.ordre || 0} onChange={(e) => setField('ordre', e.target.value)} /></label>
                <BooleanField checked={Boolean(form.actif)} onChange={(value) => setField('actif', value)} />
              </>
            )}

            <div className="form-actions">
              <button type="submit">{editing ? 'Modifier' : 'Enregistrer'}</button>
              <button type="button" onClick={() => resetForm()}>Annuler</button>
            </div>
          </form>

          <section className="management-list">
            <div className="list-head">
              <div><span>Registre</span><h2>{title}</h2></div>
            </div>
            <div className="data-table">
              {activeItems.map((item) => (
                <article className="data-row" key={item.id}>
                  <div>
                    <strong>{item.libelle || item.nom}</strong>
                    <span>Code automatique: {item.code}</span>
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => editItem(item)}>Modifier</button>
                    {canDelete && <button type="button" onClick={() => removeItem(item)}>Supprimer</button>}
                  </div>
                </article>
              ))}
              {activeItems.length === 0 && <p className="empty-state">Aucune donnee pour le moment.</p>}
            </div>
          </section>
        </div>
      ) : null}

      {eleveModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="student-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <span>{editing ? 'Modification' : 'Nouvelle inscription'}</span>
                <h2>{editing ? 'Modifier un eleve' : 'Ajouter un eleve'}</h2>
              </div>
              <button type="button" onClick={() => setEleveModalOpen(false)}>Fermer</button>
            </div>
            <EleveForm
              form={form}
              items={items}
              editing={editing}
              onField={setField}
              onSubmit={saveItem}
              onCancel={() => setEleveModalOpen(false)}
            />
          </section>
        </div>
      )}

      <EleveDetails
        eleve={detail}
        onClose={() => setDetail(null)}
        onEdit={openEleveModal}
        canDelete={canDelete}
        onDelete={removeItem}
      />
    </section>
  )
}
