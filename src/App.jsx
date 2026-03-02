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


  useEffect(() => {
    // Sincroniza sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setUser(session.user)
        setProfile(prof)
      } else {
        // Si no hay sesión real pero hay datos persistidos, limpiar
        if (useStore.getState().user) logout()
      }
    })

    // Escucha cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setUser(session.user)
        setProfile(prof)
      }
      if (event === 'SIGNED_OUT') {
        logout()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, logout])



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
