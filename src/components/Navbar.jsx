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
    try {
      logout() // Clear local state immediately for better UX
      await supabase.auth.signOut()
      showToast('info', '👋', 'Sesión cerrada', '¡Hasta pronto!')
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      navigate('/')
      setDrawerOpen(false)
    }
  }

  const openAuth = (tab = 'login') => {
    setAuthTab(tab)
    setAuthOpen(true)
    setDrawerOpen(false)
  }

  const go = (path) => {
    navigate(path)
    setDrawerOpen(false)
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900, height: 'var(--nav)',
        background: 'rgba(14,14,14,.96)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 1.5rem', gap: '1rem'
      }}>
        {/* Logo */}
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '.55rem', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, background: 'var(--red)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🔥</div>
          <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.4rem', letterSpacing: 2 }}>Portal de las Alitas</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '.15rem', flex: 1, justifyContent: 'center' }} className="nav-links-desktop hide-mobile">
          <NavBtn onClick={() => navigate('/')} active={location.pathname === '/'}>Home</NavBtn>
          {user && !isAdmin && <NavBtn onClick={() => navigate('/order')} active={location.pathname === '/order'}>Menú</NavBtn>}
          {user && !isAdmin && <NavBtn onClick={() => navigate('/status')} active={location.pathname === '/status'}>Mis Pedidos</NavBtn>}
          {isAdmin && <NavBtn onClick={() => navigate('/admin')} active={location.pathname === '/admin'}>Admin</NavBtn>}
        </div>

        {/* Right section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexShrink: 0 }}>
          {!user && (
            <button className="btn-nav-cta hide-mobile" onClick={() => openAuth('login')} style={{
              background: 'var(--red)', color: '#fff', border: 'none', padding: '.45rem 1.1rem',
              borderRadius: 8, fontWeight: 600, fontSize: '.88rem', cursor: 'pointer', whiteSpace: 'nowrap'
            }}>Iniciar Sesión</button>
          )}
          {user && !isAdmin && (
            <button onClick={() => navigate('/order')} className="hide-mobile" style={{
              background: 'var(--red)', color: '#fff', border: 'none', padding: '.45rem 1.1rem',
              borderRadius: 8, fontWeight: 600, fontSize: '.88rem', cursor: 'pointer', whiteSpace: 'nowrap'
            }}>🛒 Pedir Ahora</button>
          )}
          {user && (
            <div className="hide-mobile" style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--red),var(--orange))', border: '2px solid rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.92rem', fontWeight: 700, cursor: 'pointer', color: '#fff', fontFamily: "'Bebas Neue',cursive" }}>
              {profile?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          {/* Hamburger */}
          <button onClick={() => setDrawerOpen(true)} className="hide-desktop" style={{
            background: 'none', border: 'none', color: 'var(--white)', cursor: 'pointer',
            padding: '.25rem', width: 38, height: 38, borderRadius: 8, display: 'flex',
            flexDirection: 'column', gap: 5, transition: 'background .2s',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--white)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--white)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--white)', borderRadius: 2 }} />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`} style={{ display: drawerOpen ? 'flex' : 'none' }}>
        <div className="drawer-header">
          <div onClick={() => go('/')} style={{ display: 'flex', alignItems: 'center', gap: '.55rem', cursor: 'pointer' }}>
            <div style={{ width: 34, height: 34, background: 'var(--red)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔥</div>
            <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.4rem', letterSpacing: 2 }}>Portal de las Alitas</span>
          </div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        {user && profile && (
          <div className="drawer-user">
            <div className="drawer-avatar">{profile.nombre?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{profile.nombre}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--gray)' }}>{profile.email}</div>
              {isAdmin && <span style={{ fontSize: '.68rem', background: 'rgba(232,34,10,.2)', color: 'var(--red)', border: '1px solid rgba(232,34,10,.3)', padding: '.1rem .45rem', borderRadius: 6, fontWeight: 600, textTransform: 'uppercase' }}>Admin</span>}
            </div>
          </div>
        )}

        <div className="drawer-nav">
          <button className="drawer-nav-link" onClick={() => go('/')}>🏠 &nbsp;Inicio</button>
          {user && !isAdmin && <button className="drawer-nav-link" onClick={() => go('/order')}>🍗 &nbsp;Hacer Pedido</button>}
          {user && !isAdmin && <button className="drawer-nav-link" onClick={() => go('/status')}>📦 &nbsp;Mis Pedidos</button>}
          {isAdmin && <button className="drawer-nav-link" style={{ color: 'var(--red)' }} onClick={() => go('/admin')}>👑 &nbsp;Panel Admin</button>}
        </div>

        <div className="drawer-bottom">
          {user
            ? <button className="drawer-logout" onClick={handleLogout}>👋 Cerrar Sesión</button>
            : <button className="drawer-login-btn" onClick={() => openAuth('login')}>🔥 Iniciar Sesión</button>
          }
        </div>
      </div>
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1199 }} />}

      {authOpen && <AuthModal tab={authTab} onClose={() => setAuthOpen(false)} />}
    </>
  )
}

function NavBtn({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(255,255,255,.07)' : 'none', border: 'none',
      color: active ? 'var(--white)' : 'var(--gray)', fontSize: '.88rem', fontWeight: 500,
      padding: '.45rem .85rem', borderRadius: 8, cursor: 'pointer', transition: 'all .2s'
    }}>{children}</button>
  )
}
