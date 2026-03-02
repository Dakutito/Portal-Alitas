import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@portalalitas.com'
const ADMIN_KEY = import.meta.env.VITE_ADMIN_CLAVE || 'admin123may'

export default function AuthModal({ tab: initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab || 'login')
  const [form, setForm] = useState({ email: '', password: '', nombre: '', adminKey: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setProfile, showToast } = useStore()
  const navigate = useNavigate()

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const isAdminEmail = form.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const doLogin = async () => {
    setErr('')
    if (!form.email || !form.password) { setErr('Ingresa email y contraseña.'); return }
    if (isAdminEmail && form.adminKey && form.adminKey !== ADMIN_KEY) {
      setErr('Clave de admin incorrecta.'); return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(), password: form.password
      })
      if (error) {
        setErr('Email o contraseña incorrectos.')
        setLoading(false); return
      }
      // El perfil se cargará automáticamente en App.jsx vía onAuthStateChange
      onClose()
      showToast('success', '🎉', 'Sesión iniciada', 'Bienvenido de nuevo')
    } catch (e) {
      setErr('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const doRegister = async () => {
    setErr('')
    if (!form.nombre.trim() || !form.email.trim() || !form.password) {
      setErr('Todos los campos son requeridos.'); return
    }
    if (form.password.length < 6) {
      setErr('La contraseña debe tener al menos 6 caracteres.'); return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { nombre: form.nombre.trim(), rol: 'user' } }
      })
      if (error) { setErr(error.message); setLoading(false); return }

      // Upsert perfil manualmente para asegurar disponibilidad inmediata
      await supabase.from('profiles').upsert({
        id: data.user.id, nombre: form.nombre.trim(), email: form.email.trim(), rol: 'user'
      }, { onConflict: 'id' })

      onClose()
      showToast('success', '✅', '¡Cuenta creada!', 'Bienvenido, ' + form.nombre.trim())
    } catch (e) {
      setErr('Error al crear cuenta. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {tab === 'login' ? (
          <>
            <h2 className="modal-title">🔥 Iniciar Sesión</h2>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={f('email')} placeholder="tu@email.com"
                onKeyDown={e => e.key === 'Enter' && doLogin()} autoFocus />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={f('password')} placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            {isAdminEmail && (
              <div style={{ background: 'rgba(232,34,10,.06)', border: '1px solid rgba(232,34,10,.25)', borderRadius: 10, padding: '.9rem', marginTop: '.9rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>🔒 Clave de Admin</label>
                  <input type="password" value={form.adminKey} onChange={f('adminKey')} placeholder="Clave admin..."
                    onKeyDown={e => e.key === 'Enter' && doLogin()} />
                </div>
              </div>
            )}
            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-red" style={{ width: '100%', marginTop: '.9rem', justifyContent: 'center' }}
              onClick={doLogin} disabled={loading}>
              {loading ? '⏳ Entrando...' : 'Entrar'}
            </button>
            <div className="auth-switch">¿No tienes cuenta? <a onClick={() => { setTab('register'); setErr('') }}>Regístrate aquí</a></div>
          </>
        ) : (
          <>
            <h2 className="modal-title">✨ Crear Cuenta</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={form.nombre} onChange={f('nombre')} placeholder="Tu nombre" autoFocus />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={f('email')} placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={f('password')} placeholder="Mínimo 6 caracteres"
                onKeyDown={e => e.key === 'Enter' && doRegister()} />
            </div>
            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-red" style={{ width: '100%', marginTop: '.9rem', justifyContent: 'center' }}
              onClick={doRegister} disabled={loading}>
              {loading ? '⏳ Creando...' : 'Crear Cuenta'}
            </button>
            <div className="auth-switch">¿Ya tienes cuenta? <a onClick={() => { setTab('login'); setErr('') }}>Inicia sesión</a></div>
          </>
        )}
      </div>
    </div>
  )
}
