import { useState } from 'react'
import { logoutUser } from '../services/authApi'

export function LogoutPage({ user, onLogout }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setError('')
    setLoading(true)

    try {
      await logoutUser()
      onLogout()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="logout-page">
      <h2>Deconnexion</h2>
      {error && <div className="auth-message">{error}</div>}
      <p>
        {user
          ? `Connecte avec le compte ${user.username}.`
          : 'Aucun utilisateur connecte.'}
      </p>
      <button className="logout-button" type="button" onClick={handleLogout} disabled={loading}>
        {loading ? 'Deconnexion...' : 'Se deconnecter'}
      </button>
    </div>
  )
}
