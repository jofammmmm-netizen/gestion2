import { apiRequest } from '../../services/api'

const endpoints = {
  types: '/frais-scolaire/types/',
  tarifs: '/frais-scolaire/tarifs/',
  frais: '/frais-scolaire/frais/',
  paiements: '/frais-scolaire/paiements/',
}

const ignoredFields = [
  'id',
  'code',
  'reference',
  'annee_scolaire',
  'annee_scolaire_nom',
  'niveau_nom',
  'section_nom',
  'classe_nom',
  'type_frais_nom',
  'trimestre_nom',
  'eleve_nom',
  'eleve_matricule',
  'frais_libelle',
  'mode_paiement_nom',
  'statut_nom',
  'agent',
  'agent_nom',
  'total_paye',
  'solde_restant',
  'statut_paiement',
  'cree_le',
  'modifie_le',
]

const nullableFields = ['niveau', 'section', 'classe', 'frais', 'type_frais', 'eleve']

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !ignoredFields.includes(key))
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        nullableFields.includes(key) && value === '' ? null : value,
      ]),
  )
}

export function resultList(data) {
  return Array.isArray(data) ? data : data.results || []
}

export function listFraisResource(resource, params = {}) {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, value)
    }
  })

  const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
  return apiRequest(`${endpoints[resource]}${query}`)
}

export function createFraisResource(resource, payload) {
  return apiRequest(endpoints[resource], {
    method: 'POST',
    body: cleanPayload(payload),
  })
}

export function updateFraisResource(resource, id, payload) {
  return apiRequest(`${endpoints[resource]}${id}/`, {
    method: 'PUT',
    body: cleanPayload(payload),
  })
}

export function deleteFraisResource(resource, id) {
  return apiRequest(`${endpoints[resource]}${id}/`, {
    method: 'DELETE',
  })
}

export function getFraisChoices() {
  return apiRequest('/frais-scolaire/choix/')
}

export function getFraisResume() {
  return apiRequest('/frais-scolaire/resume/')
}

export function applyFrais(payload) {
  return apiRequest('/frais-scolaire/application/', {
    method: 'POST',
    body: cleanPayload(payload),
  })
}
