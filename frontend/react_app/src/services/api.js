const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const ACCESS_TOKEN_KEY = 'ecole_access_token'
const REFRESH_TOKEN_KEY = 'ecole_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setAuthTokens(tokens) {
  if (!tokens) {
    return
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken()

  if (!refresh) {
    throw new Error('Session expiree.')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/comptes/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
  } catch {
    throw new Error('Service momentanement indisponible. Veuillez reessayer dans un instant.')
  }

  const data = await response.json()

  if (!response.ok) {
    clearAuthTokens()
    throw new Error(data.detail || 'Session expiree.')
  }

  setAuthTokens({
    access: data.access,
    refresh: data.refresh || refresh,
  })

  return data.access
}

export async function apiRequest(path, options = {}) {
  const method = options.method || 'GET'
  const token = getAccessToken()
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      body: options.body
        ? isFormData
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    })
  } catch {
    throw new Error('Service momentanement indisponible. Veuillez reessayer dans un instant.')
  }

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() }

  if (response.status === 401 && !options.skipRefresh) {
    const newAccess = await refreshAccessToken()
    return apiRequest(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newAccess}`,
      },
      skipRefresh: true,
    })
  }

  if (!response.ok) {
    throw new Error(formatApiError(data))
  }

  return data
}

function formatApiError(data) {
  if (typeof data === 'string') {
    return data
  }

  if (data.error || data.detail) {
    return data.error || data.detail
  }

  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([field, errors]) => {
        const label = field === 'non_field_errors' ? 'Erreur' : field
        const value = Array.isArray(errors) ? errors.join(', ') : String(errors)
        return `${label}: ${value}`
      })
      .join(' | ')
  }

  return 'Une erreur est survenue.'
}
