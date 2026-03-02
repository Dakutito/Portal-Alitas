import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Home from './pages/Home'
import Order from './pages/Order'
import Status from './pages/Status'
import Admin from './pages/Admin'

function ProtectedRoute({ children, adminOnly }) {
  const { user, profile } = useStore()
  if (!user) return <Navigate to="/" replace />
  if (adminOnly && profile?.rol !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { setUser, setProfile, logout } = useStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Carga sesión inicial rápidamente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setUser(session.user)
        setProfile(prof)
      }
      setReady(true)
    })

    // Escucha cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setUser(session.user)
        setProfile(prof)
      }
      if (event === 'SIGNED_OUT') logout()
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, logout])

  // Pequeño splash mientras carga sesión
  if (!ready) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <span style={{ fontSize: '3.5rem', animation: 'float 1.5s ease-in-out infinite' }}>🔥</span>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.6rem', letterSpacing: 2, color: 'var(--gray)' }}>Portal de las Alitas</div>
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
