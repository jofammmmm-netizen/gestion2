import { useState } from 'react'
import { registerUser } from '../services/authApi'

export function RegisterPage({ onAuthenticated }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
  })
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
      const data = await registerUser(form)
      onAuthenticated(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Inscription</h2>
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
        Email
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={updateField}
          autoComplete="email"
        />
      </label>
      <label>
        Mot de passe
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        Confirmer
        <input
          name="password_confirm"
          type="password"
          value={form.password_confirm}
          onChange={updateField}
          autoComplete="new-password"
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? 'Creation...' : "S'inscrire"}
      </button>
    </form>
  )
}
