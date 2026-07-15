import { apiRequest } from '../../services/api'

const endpoints = {
  niveaux: '/eleves/niveaux/',
  sections: '/eleves/sections/',
  classes: '/eleves/classes/',
  statuts: '/eleves/statuts/',
  eleves: '/eleves/eleves/',
}

function cleanPayload(payload) {
  const nullableFields = ['section', 'classe', 'statut', 'date_naissance']
  const ignoredFields = [
    'id',
    'matricule',
    'nom_complet',
    'classe_nom',
    'statut_nom',
    'annee_scolaire',
    'annee_scolaire_nom',
    'date_inscription',
    'photo',
    'photo_url',
    'cree_le',
    'modifie_le',
  ]

  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !ignoredFields.includes(key))
      .map(([key, value]) => [
        key,
        nullableFields.includes(key) && value === '' ? null : value,
      ]),
  )
}

export function listResource(resource, params = {}) {
  const queryParams = new URLSearchParams()

  if (typeof params === 'string') {
    if (params) queryParams.set('search', params)
  } else {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.set(key, value)
      }
    })
  }

  const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
  return apiRequest(`${endpoints[resource]}${query}`)
}

export function getAnneeActive() {
  return apiRequest('/eleves/annee-active/')
}

export function createResource(resource, payload) {
  return apiRequest(endpoints[resource], {
    method: 'POST',
    body: cleanPayload(payload),
  })
}

export function updateResource(resource, id, payload) {
  return apiRequest(`${endpoints[resource]}${id}/`, {
    method: 'PUT',
    body: cleanPayload(payload),
  })
}

export function deleteResource(resource, id) {
  return apiRequest(`${endpoints[resource]}${id}/`, {
    method: 'DELETE',
  })
}

export function createEleve(payload) {
  return createResource('eleves', payload)
}

export function updateEleve(id, payload) {
  return updateResource('eleves', id, payload)
}
