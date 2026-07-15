import { apiRequest } from '../../services/api'

export function getEtablissement() {
  return apiRequest('/identite/etablissement/')
}
