import { useRef, useState } from 'react'

const navItems = [
  { id: 'tableau', label: 'Tableau de bord' },
  { id: 'eleves', label: 'Eleves' },
  {
    id: 'frais-types',
    label: 'Frais scolaire',
    children: [
      { id: 'frais-types', label: 'Types de frais' },
      { id: 'frais-tarifs', label: 'Tarifs' },
      { id: 'frais-application', label: 'Application des frais' },
      { id: 'frais-eleves', label: 'Frais des eleves' },
      { id: 'frais-paiements', label: 'Paiements' },
    ],
  },
  { id: 'deconnexion', label: 'Deconnexion' },
]

export function Navbar({ page, user, etablissement, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const loadingTimer = useRef(null)
  const nom = etablissement?.nom || 'Gestion ecole'
  const sigle = etablissement?.sigle || 'GE'
  const initials = sigle.slice(0, 2).toUpperCase()

  const navigate = (pageId) => {
    if (pageId === page) {
      setMenuOpen(false)
      return
    }

    window.clearTimeout(loadingTimer.current)
    setIsNavigating(true)
    onNavigate(pageId)
    setMenuOpen(false)
    loadingTimer.current = window.setTimeout(() => {
      setIsNavigating(false)
    }, 520)
  }

  return (
    <>
      <style>{`
        .navbar-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 14px 0;
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .navbar-inner {
          position: relative;
          min-height: 72px;
          display: grid;
          grid-template-columns: minmax(230px, 1fr) auto minmax(180px, 1fr);
          align-items: center;
          gap: 18px;
          padding: 10px 14px;
          border: 1px solid rgba(203, 213, 225, 0.72);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.09);
          backdrop-filter: blur(14px);
        }

        .navbar-page-loader {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: none;
          place-items: center;
          background: rgba(248, 250, 252, 0.34);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .navbar-page-loader.active {
          display: grid;
        }

        .navbar-dots {
          position: relative;
          width: 74px;
          height: 74px;
          display: block;
          margin-top: 112px;
          border: 1px solid rgba(191, 219, 254, 0.9);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 22px 48px rgba(37, 99, 235, 0.2);
          animation: navbar-loader-spin 0.9s linear infinite;
        }

        .navbar-dots span {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 11px;
          height: 11px;
          margin: -5.5px 0 0 -5.5px;
          border-radius: 999px;
          background: #2563eb;
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.24);
        }

        .navbar-dots span:nth-child(2) {
          transform: rotate(72deg) translateY(-27px);
          background: #059669;
        }

        .navbar-dots span:nth-child(3) {
          transform: rotate(144deg) translateY(-27px);
          background: #1d4ed8;
        }

        .navbar-dots span:nth-child(1) {
          transform: rotate(0deg) translateY(-27px);
          background: #0f766e;
        }

        .navbar-dots span:nth-child(4) {
          transform: rotate(216deg) translateY(-27px);
          background: #38bdf8;
        }

        .navbar-dots span:nth-child(5) {
          transform: rotate(288deg) translateY(-27px);
          background: #1e40af;
        }

        @keyframes navbar-loader-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .navbar-brand {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          width: fit-content;
          border: 0;
          padding: 0;
          color: #0f172a;
          background: transparent;
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .navbar-logo {
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 8px;
          color: #ffffff;
          background: linear-gradient(135deg, #1d4ed8 0%, #047857 100%);
          box-shadow: 0 14px 26px rgba(29, 78, 216, 0.24);
          font-size: 15px;
          font-weight: 900;
        }

        .navbar-brand-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .navbar-brand-copy strong {
          max-width: 270px;
          overflow: hidden;
          color: #0f172a;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          line-height: 1.1;
        }

        .navbar-brand-copy span {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .navbar-nav {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 8px;
          background: #f8fafc;
        }

        .navbar-link {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 6px;
          padding: 0 14px;
          color: #475569;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          white-space: nowrap;
          transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
        }

        .navbar-nav-item {
          position: relative;
        }

        .navbar-link-chevron {
          margin-left: 7px;
          font-size: 12px;
          line-height: 1;
        }

        .navbar-submenu {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          z-index: 40;
          min-width: 220px;
          display: none;
          transform: translateX(-50%);
          padding: 8px;
          border: 1px solid rgba(203, 213, 225, 0.9);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 22px 44px rgba(15, 23, 42, 0.16);
        }

        .navbar-nav-item:hover .navbar-submenu,
        .navbar-nav-item:focus-within .navbar-submenu {
          display: grid;
          gap: 6px;
        }

        .navbar-submenu-button {
          min-height: 38px;
          border: 0;
          border-radius: 6px;
          padding: 0 12px;
          color: #334155;
          background: transparent;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          text-align: left;
        }

        .navbar-submenu-button:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .navbar-submenu-button.active {
          color: #ffffff;
          background: linear-gradient(135deg, #0f766e 0%, #2563eb 100%);
        }

        .navbar-link:hover {
          color: #0f172a;
          background: #ffffff;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.07);
          transform: translateY(-1px);
        }

        .navbar-link.active {
          color: #ffffff;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
          box-shadow: 0 12px 22px rgba(37, 99, 235, 0.24);
        }

        .navbar-user {
          justify-self: end;
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 8px;
          background: #ffffff;
        }

        .navbar-avatar {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 8px;
          color: #1d4ed8;
          background: #dbeafe;
          font-size: 13px;
          font-weight: 900;
        }

        .navbar-user-copy {
          min-width: 0;
          display: grid;
          gap: 1px;
        }

        .navbar-user-copy strong {
          max-width: 150px;
          overflow: hidden;
          color: #0f172a;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .navbar-user-copy span {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .navbar-menu-toggle {
          display: none;
          min-height: 42px;
          border: 1px solid rgba(203, 213, 225, 0.86);
          border-radius: 8px;
          padding: 0 12px;
          color: #0f172a;
          background: #ffffff;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.07);
        }

        .navbar-menu-icon {
          width: 18px;
          height: 14px;
          display: inline-grid;
          gap: 4px;
          margin-right: 8px;
          vertical-align: -2px;
        }

        .navbar-menu-icon span {
          display: block;
          height: 2px;
          border-radius: 999px;
          background: #0f172a;
        }

        @media (max-width: 900px) {
          .navbar-inner {
            grid-template-columns: 1fr auto;
            align-items: center;
          }

          .navbar-brand {
            max-width: 100%;
          }

          .navbar-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            justify-self: end;
          }

          .navbar-nav {
            grid-column: 1 / -1;
            display: none;
            width: 100%;
            box-sizing: border-box;
            overflow: visible;
            flex-direction: column;
            align-items: stretch;
            padding: 8px;
          }

          .navbar-nav.open {
            display: flex;
          }

          .navbar-link {
            width: 100%;
            justify-content: flex-start;
            text-align: left;
          }

          .navbar-nav-item {
            width: 100%;
          }

          .navbar-submenu {
            position: static;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
            display: grid;
            gap: 6px;
            margin-top: 6px;
            transform: none;
            box-shadow: none;
            background: #ffffff;
          }

          .navbar-user {
            grid-column: 1 / -1;
            display: none;
            justify-self: start;
            width: 100%;
            box-sizing: border-box;
          }

          .navbar-user.open {
            display: inline-flex;
          }
        }

        @media (max-width: 520px) {
          .navbar-shell {
            padding: 10px 0;
          }

          .navbar-inner {
            padding: 10px;
          }

          .navbar-logo {
            width: 40px;
            height: 40px;
          }

          .navbar-brand-copy strong {
            max-width: 175px;
          }

          .navbar-menu-toggle {
            padding: 0 10px;
          }

          .navbar-menu-toggle-text {
            display: none;
          }
        }
      `}</style>

      <header className="navbar-shell">
        <div className="navbar-inner">
          <button className="navbar-brand" type="button" onClick={() => navigate('tableau')}>
            <span className="navbar-logo">{initials}</span>
            <span className="navbar-brand-copy">
              <strong>{nom}</strong>
              <span>Plateforme scolaire</span>
            </span>
          </button>

          <button
            className="navbar-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="navbar-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="navbar-menu-icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="navbar-menu-toggle-text">Menu</span>
          </button>

          <nav id="navbar-menu" className={`navbar-nav ${menuOpen ? 'open' : ''}`} aria-label="Navigation principale">
            {navItems.map((item) => {
              const isActive = page === item.id || item.children?.some((child) => child.id === page)

              return (
                <div key={item.id} className="navbar-nav-item">
                  <button
                    type="button"
                    className={`navbar-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                  >
                    {item.label}
                    {item.children && <span className="navbar-link-chevron">v</span>}
                  </button>

                  {item.children && (
                    <div className="navbar-submenu">
                      {item.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          className={`navbar-submenu-button ${page === child.id ? 'active' : ''}`}
                          onClick={() => navigate(child.id)}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className={`navbar-user ${menuOpen ? 'open' : ''}`}>
            <span className="navbar-avatar">
              {(user?.username || 'I').slice(0, 1).toUpperCase()}
            </span>
            <span className="navbar-user-copy">
              <strong>{user ? user.username : 'Invite'}</strong>
              <span>{user?.is_superuser ? 'Superadmin' : 'Utilisateur'}</span>
            </span>
          </div>

          <div className={`navbar-page-loader ${isNavigating ? 'active' : ''}`} aria-hidden="true">
            <span className="navbar-dots">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      </header>
    </>
  )
}
