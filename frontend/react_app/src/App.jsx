import { useEffect, useState } from 'react'
import { LoginPage } from './comptes/pages/LoginPage'
import { RegisterPage } from './comptes/pages/RegisterPage'
import { LogoutPage } from './comptes/pages/LogoutPage'
import { getSession } from './comptes/services/authApi'
import { Navbar } from './commun/components/Navbar'
import { ElevesPage } from './eleves/pages/ElevesPage'
import { FraisScolairePage } from './fraisScolaire/pages/FraisScolairePage'
import { getEtablissement } from './identite/services/identiteApi'
import { DashboardPage } from './tableauDeBord/pages/DashboardPage'
import './App.css'

function App() {
  const [page, setPage] = useState('connexion')
  const [user, setUser] = useState(null)
  const [etablissement, setEtablissement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSession(), getEtablissement()])
      .then(([sessionData, identiteData]) => {
        setUser(sessionData.user)
        setEtablissement(identiteData.etablissement)
        if (sessionData.authenticated) {
          setPage('tableau')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleAuthenticated = (nextUser) => {
    setUser(nextUser)
    setPage('tableau')
  }

  const handleLogout = () => {
    setUser(null)
    setPage('connexion')
  }

  if (loading) {
    return <main className="auth-shell">Chargement...</main>
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="auth-brand">
            <span className="auth-mark">E</span>
            <div>
              <h1>{etablissement?.nom || 'Gestion ecole'}</h1>
              <p>Acces utilisateur</p>
            </div>
          </div>

          <nav className="auth-tabs two-tabs" aria-label="Navigation comptes">
            <button
              type="button"
              className={page === 'connexion' ? 'active' : ''}
              onClick={() => setPage('connexion')}
            >
              Connexion
            </button>
            <button
              type="button"
              className={page === 'inscription' ? 'active' : ''}
              onClick={() => setPage('inscription')}
            >
              Inscription
            </button>
          </nav>

          {page === 'inscription' ? (
            <RegisterPage onAuthenticated={handleAuthenticated} />
          ) : (
            <LoginPage onAuthenticated={handleAuthenticated} />
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <Navbar
        page={page}
        user={user}
        etablissement={etablissement}
        onNavigate={setPage}
      />

      {page === 'tableau' && (
        <DashboardPage etablissement={etablissement} user={user} />
      )}

      {page === 'eleves' && <ElevesPage user={user} />}

      {page.startsWith('frais-') && (
        <FraisScolairePage section={page} user={user} onNavigate={setPage} />
      )}

      {page === 'deconnexion' && (
        <section className="auth-panel">
        <div className="auth-brand">
          <span className="auth-mark">E</span>
          <div>
            <h1>{etablissement?.nom || 'Gestion ecole'}</h1>
            <p>Acces utilisateur</p>
          </div>
        </div>

        <LogoutPage user={user} onLogout={handleLogout} />
      </section>
      )}
    </main>
  )
}

export default App
