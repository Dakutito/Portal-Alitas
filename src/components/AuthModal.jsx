import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'admin@portalalitas.com').toLowerCase()
const ADMIN_CLAVE = import.meta.env.VITE_ADMIN_CLAVE || 'admin123may'

export default function AuthModal({ tab: initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab || 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { showToast } = useStore()
  const navigate = useNavigate()

  // NO llamamos setUser/setProfile aquí — onAuthStateChange en App.jsx lo hace automáticamente

  const isAdmin = email.trim().toLowerCase() === ADMIN_EMAIL

  const doLogin = async () => {
    if (!email || !password) { setErr('Ingresa email y contraseña.'); return }
    if (isAdmin && adminKey && adminKey !== ADMIN_CLAVE) { setErr('Clave de admin incorrecta.'); return }

    setErr('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        setErr('Email o contraseña incorrectos.')
        setLoading(false)
        return
      }

      // Si es exitoso, App.jsx se encargará de setear el perfil via onAuthStateChange
      showToast('success', '🎉', '¡Bienvenido!', '')
      onClose()

      if (isAdmin) {
        navigate('/admin')
      }
    } catch (error) {
      console.error('Login error:', error)
      setErr('Ocurrió un error inesperado al iniciar sesión.')
    } finally {
      // ESTO ES CRUCIAL: siempre liberar el botón
      setLoading(false)
    }
  }

  const doRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password) { setErr('Todos los campos son requeridos.'); return }
    if (password.length < 6) { setErr('Contraseña mínimo 6 caracteres.'); return }

    setErr('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { nombre: nombre.trim() } }
      })

      if (error) {
        setErr(error.message.includes('already') ? 'Este email ya está registrado.' : error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          rol: 'user'
        }, { onConflict: 'id' })

        showToast('success', '✅', '¡Cuenta creada!', `Bienvenido, ${nombre.trim()}`)
        onClose()
      }
    } catch (error) {
      console.error('Register error:', error)
      setErr('Ocurrió un error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (t) => {
    setTab(t); setErr('')
    setEmail(''); setPassword(''); setNombre(''); setAdminKey('')
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {tab === 'login' ? (
          <>
            <h2 className="modal-title">🔥 Iniciar Sesión</h2>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" autoFocus
                onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            {isAdmin && (
              <div style={{ background: 'rgba(232,34,10,.06)', border: '1px solid rgba(232,34,10,.25)', borderRadius: 10, padding: '.9rem', marginTop: '.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>🔒 Clave de Admin</label>
                  <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                    placeholder="Clave admin..."
                    onKeyDown={e => e.key === 'Enter' && doLogin()} />
                </div>
              </div>
            )}
            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-red" style={{ width: '100%', marginTop: '.9rem', justifyContent: 'center' }}
              onClick={doLogin} disabled={loading}>
              {loading ? '⏳ Entrando...' : 'Entrar →'}
            </button>
            <div className="auth-switch">
              ¿No tienes cuenta? <a onClick={() => switchTab('register')}>Regístrate aquí</a>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-title">✨ Crear Cuenta</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" autoFocus />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                onKeyDown={e => e.key === 'Enter' && doRegister()} />
            </div>
            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-red" style={{ width: '100%', marginTop: '.9rem', justifyContent: 'center' }}
              onClick={doRegister} disabled={loading}>
              {loading ? '⏳ Creando...' : 'Crear Cuenta →'}
            </button>
            <div className="auth-switch">
              ¿Ya tienes cuenta? <a onClick={() => switchTab('login')}>Inicia sesión</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
