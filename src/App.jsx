import { useEffect } from 'react'
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
  const { user, profile, ready } = useStore()
  if (!ready) return null
  if (!user) return <Navigate to="/" replace />
  if (adminOnly && profile?.rol !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { setUser, setProfile, logout, setReady } = useStore()

  useEffect(() => {
    const updateAuth = async (session) => {
      if (!session) {
        logout()
        setReady(true)
        return
      }

      const user = session.user
      setUser(user)

      try {
        const { data: prof } = await supabase
          .from('profiles').select('*').eq('id', user.id).single()

        setProfile(prof || {
          id: user.id,
          email: user.email,
          nombre: user.user_metadata?.nombre || 'Usuario',
          rol: 'user'
        })
      } catch (e) {
        console.error('Auth sync error:', e)
      } finally {
        setReady(true)
      }
    }

    // 1. Carga inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuth(session)
    })

    // 2. Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuth(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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