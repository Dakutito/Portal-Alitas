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
    // 1. Verificar sesión existente AL INICIO (antes de cualquier evento)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        try {
          const { data: prof } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          setProfile(prof || {
            id: session.user.id,
            email: session.user.email,
            nombre: session.user.user_metadata?.nombre || 'Usuario',
            rol: 'user'
          })
        } catch (e) { }
      } else {
        logout()
      }
      setReady(true)
    }).catch(err => {
      console.error('Initial session check failed:', err)
      setReady(true) // Al menos dejamos que la app se muestre
    })

    // 2. Escuchar cambios futuros (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        logout()
        return
      }
      if (session?.user) {
        setUser(session.user)
        try {
          const { data: prof } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          setProfile(prof || {
            id: session.user.id,
            email: session.user.email,
            nombre: session.user.user_metadata?.nombre || 'Usuario',
            rol: 'user'
          })
        } catch (e) { }
      }
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