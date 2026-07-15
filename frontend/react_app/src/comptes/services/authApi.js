import {
  apiRequest,
  clearAuthTokens,
  getRefreshToken,
  setAuthTokens,
} from '../../services/api'

export async function getSession() {
  try {
    return await apiRequest('/comptes/session/')
  } catch {
    clearAuthTokens()
    return { authenticated: false, user: null }
  }
}

export async function loginUser(credentials) {
  const data = await apiRequest('/comptes/connexion/', {
    method: 'POST',
    body: credentials,
  })
  setAuthTokens(data.tokens)
  return data
}

export async function registerUser(data) {
  const response = await apiRequest('/comptes/inscription/', {
    method: 'POST',
    body: data,
  })
  setAuthTokens(response.tokens)
  return response
}

export async function logoutUser() {
  const refresh = getRefreshToken()

  try {
    return await apiRequest('/comptes/deconnexion/', {
      method: 'POST',
      body: { refresh },
      skipRefresh: true,
    })
  } finally {
    clearAuthTokens()
  }
}
