import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import AuthModal from './AuthModal'

export default function Navbar() {
  const { user, profile, logout, showToast } = useStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = profile?.rol === 'admin'

  const handleLogout = async () => {
    setDrawerOpen(false)
    logout()
    await supabase.auth.signOut()
    showToast('info', '👋', 'Sesión cerrada', '¡Hasta pronto!')
    navigate('/')
  }

  const openAuth = (tab = 'login') => {
    setAuthTab(tab)
    setAuthOpen(true)
    setDrawerOpen(false)
  }

  const go = (path) => { navigate(path); setDrawerOpen(false) }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
        height: 'var(--nav)', background: 'rgba(14,14,14,.97)',
        backdropFilter: 'blur(18px)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1.2rem', gap: '.75rem'
      }}>

        {/* Logo */}
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, background: 'var(--red)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🔥</div>
          <span className="logo-text" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.35rem', letterSpacing: 2 }}>Portal de las Alitas</span>
        </div>

        {/* Links desktop */}
        <div className="desk-links">
          <NavLink onClick={() => navigate('/')} active={location.pathname === '/'}>Inicio</NavLink>
          {!isAdmin && (
            <NavLink onClick={() => user ? navigate('/order') : openAuth('login')} active={location.pathname === '/order'}>
              🍗 Menú
            </NavLink>
          )}
          {user && !isAdmin && (
            <NavLink onClick={() => navigate('/status')} active={location.pathname === '/status'}>
              📦 Pedidos
            </NavLink>
          )}
          {isAdmin && (
            <NavLink onClick={() => navigate('/admin')} active={location.pathname === '/admin'}>
              👑 Admin
            </NavLink>
          )}
        </div>

        {/* Derecha: solo avatar o botón login + hamburguesa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexShrink: 0 }}>
          {user ? (
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--red),var(--orange))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontFamily: "'Bebas Neue',cursive",
              fontSize: '.95rem', border: '2px solid rgba(255,255,255,.15)', flexShrink: 0
            }}>
              {profile?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
          ) : (
            <button onClick={() => openAuth('login')} className="btn-login-desk">
              Iniciar Sesión
            </button>
          )}
          <button onClick={() => setDrawerOpen(true)} className="hamburger-btn" aria-label="Menú">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Backdrop */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1198, background: 'rgba(0,0,0,.5)'
        }} />
      )}

      {/* Drawer lateral */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(300px, 85vw)',
        background: '#111', borderLeft: '1px solid var(--border)',
        zIndex: 1200, display: 'flex', flexDirection: 'column',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)'
      }}>
        {/* Header drawer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)', height: 'var(--nav)'
        }}>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.2rem', letterSpacing: 2 }}>🔥 Menú</span>
          <button onClick={() => setDrawerOpen(false)} style={{
            background: 'rgba(255,255,255,.07)', border: 'none', color: 'var(--white)',
            width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>

        {/* Info usuario */}
        {user && profile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.75rem',
            padding: '1.1rem 1.2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg3)'
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--red),var(--orange))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: '#fff', fontFamily: "'Bebas Neue',cursive",
              fontSize: '1.1rem', flexShrink: 0
            }}>
              {profile.nombre?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.93rem' }}>{profile.nombre}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--gray)' }}>{profile.email}</div>
              {isAdmin && (
                <span style={{
                  fontSize: '.65rem', background: 'rgba(232,34,10,.2)', color: 'var(--red)',
                  border: '1px solid rgba(232,34,10,.3)', padding: '.1rem .4rem',
                  borderRadius: 5, fontWeight: 700, textTransform: 'uppercase'
                }}>Admin</span>
              )}
            </div>
          </div>
        )}

        {/* Nav links */}
        <div style={{ flex: 1, padding: '1rem .75rem', display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
          <DrawerLink onClick={() => go('/')} active={location.pathname === '/'}>🏠 Inicio</DrawerLink>
          {!isAdmin && (
            <DrawerLink
              onClick={() => { setDrawerOpen(false); user ? navigate('/order') : openAuth('login') }}
              active={location.pathname === '/order'}>
              🍗 Hacer Pedido
            </DrawerLink>
          )}
          {user && !isAdmin && (
            <DrawerLink onClick={() => go('/status')} active={location.pathname === '/status'}>
              📦 Mis Pedidos
            </DrawerLink>
          )}
          {isAdmin && (
            <DrawerLink onClick={() => go('/admin')} active={location.pathname === '/admin'} admin>
              👑 Panel Admin
            </DrawerLink>
          )}
        </div>

        {/* Botones login / logout */}
        <div style={{
          padding: '1rem 1.2rem', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '.55rem'
        }}>
          {user ? (
            <button onClick={handleLogout} style={{
              background: 'rgba(232,34,10,.1)', border: '1px solid rgba(232,34,10,.3)',
              color: 'var(--red)', padding: '.75rem', borderRadius: 10,
              width: '100%', fontWeight: 700, cursor: 'pointer', fontSize: '.95rem'
            }}>
              👋 Cerrar Sesión
            </button>
          ) : (
            <>
              <button onClick={() => openAuth('login')} style={{
                background: 'var(--red)', border: 'none', color: '#fff', padding: '.75rem',
                borderRadius: 10, width: '100%', fontWeight: 700, cursor: 'pointer', fontSize: '.95rem'
              }}>
                🔥 Iniciar Sesión
              </button>
              <button onClick={() => openAuth('register')} style={{
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
                color: 'var(--white)', padding: '.75rem', borderRadius: 10,
                width: '100%', fontWeight: 600, cursor: 'pointer', fontSize: '.95rem'
              }}>
                ✨ Crear Cuenta
              </button>
            </>
          )}
        </div>
      </div>

      {authOpen && <AuthModal tab={authTab} onClose={() => setAuthOpen(false)} />}
    </>
  )
}

function NavLink({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(255,255,255,.07)' : 'none', border: 'none',
      color: active ? 'var(--white)' : 'rgba(242,237,230,.55)',
      fontSize: '.87rem', fontWeight: 500, padding: '.42rem .8rem',
      borderRadius: 8, cursor: 'pointer', transition: 'all .18s', whiteSpace: 'nowrap'
    }}>{children}</button>
  )
}

function DrawerLink({ children, onClick, active, admin }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(255,255,255,.06)' : 'none', border: 'none',
      color: admin ? 'var(--red)' : active ? 'var(--white)' : 'rgba(242,237,230,.7)',
      fontSize: '.97rem', fontWeight: 500, padding: '.82rem 1rem',
      borderRadius: 10, cursor: 'pointer', transition: 'all .18s',
      textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center', gap: '.6rem'
    }}>{children}</button>
  )
}