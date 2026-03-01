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
  const { user, profile } = useStore()

  if (!user) return <Navigate to="/" replace />

  // If we have a user but no profile yet, we wait (don't redirect)
  // This handles the gap during hydration or slow profile fetching.
  if (adminOnly && profile && profile.rol !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  const { setUser, setProfile, logout } = useStore()

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        setUser(session.user)
        setProfile(prof)
      }
    })

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
        setUser(session.user)
        setProfile(prof)
      }
      if (event === 'SIGNED_OUT') {
        logout()
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
