import { useState } from 'react'
import { loginUser } from '../services/authApi'

export function LoginPage({ onAuthenticated }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginUser(form)
      onAuthenticated(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Connexion</h2>
      {error && <div className="auth-message">{error}</div>}
      <label>
        Nom utilisateur
        <input
          name="username"
          value={form.username}
          onChange={updateField}
          autoComplete="username"
          required
        />
      </label>
      <label>
        Mot de passe
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  )
}
