import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Home from './pages/Home'
import Order from './pages/Order'
import Status from './pages/Status'
import Admin from './pages/Admin'

// Rutas protegidas — esperan a que authReady sea true
function ProtectedRoute({ children, adminOnly }) {
  const { user, profile, authReady } = useStore()

  // Todavía verificando sesión → no hacer nada (evita redirect prematuro)
  if (!authReady) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '3rem', animation: 'float 1.5s ease-in-out infinite' }}>🔥</span>
    </div>
  )

  if (!user) return <Navigate to="/" replace />
  if (adminOnly && profile?.rol !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { setUser, setProfile, logout, setAuthReady, authReady } = useStore()

  useEffect(() => {
    // onAuthStateChange se dispara PRIMERO con la sesión existente (INITIAL_SESSION)
    // Esto reemplaza getSession() y es más confiable
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        // Cargar perfil
        const { data: prof } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(prof || null)
      } else {
        logout()
      }
      // Marcar que ya terminó la verificación inicial
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  // Splash mientras Supabase verifica la sesión guardada
  if (!authReady) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem'
    }}>
      <span style={{ fontSize: '3.5rem', animation: 'float 1.5s ease-in-out infinite' }}>🔥</span>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.6rem', letterSpacing: 2, color: 'var(--gray)' }}>
        Portal de las Alitas
      </div>
    </div>
  )

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/order" element={<ProtectedRoute><Order /></ProtectedRoute>} />
        <Route path="/status" element={<ProtectedRoute><Status /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  )
}
