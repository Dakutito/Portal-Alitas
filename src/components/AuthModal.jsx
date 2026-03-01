import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@portalalitas.com'
const ADMIN_KEY = import.meta.env.VITE_ADMIN_CLAVE || 'admin123may'


export default function AuthModal({ tab: initialTab, onClose }) {
  const [tab, setTab] = useState(initialTab)
  const [form, setForm] = useState({ email: '', password: '', nombre: '', adminKey: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setProfile, showToast } = useStore()
  const navigate = useNavigate()

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const emailClean = form.email.trim().toLowerCase()
  const isAdminEmail = emailClean === ADMIN_EMAIL.trim().toLowerCase()

  const doLogin = async () => {
    console.log('--- Login Start ---')
    setErr(''); setLoading(true)
    try {
      if (isAdminEmail && form.adminKey !== ADMIN_KEY) {
        setErr('Clave de admin incorrecta.'); return
      }

      console.log('Attempting signInWithPassword...')

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), 8000)
      )

      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password
        }),
        timeoutPromise
      ])

      if (error) {
        console.error('Login Error:', error)
        if (error.status === 429) setErr('Límite de intentos excedido. Espera 1 minuto.')
        else setErr('Email o contraseña incorrectos.')
        return
      }

      if (data?.user) {
        console.log('Login success, fetching profile...')
        let { data: prof, error: profErr } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()

        if (!prof && !profErr) {
          console.log('Profile missing, creating fallback...')
          const { data: newProf, error: upError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            nombre: data.user.user_metadata?.nombre || (isAdminEmail ? 'Admin' : 'Usuario'),
            email: data.user.email,
            rol: isAdminEmail ? 'admin' : 'user'
          }).select().maybeSingle()
          if (upError) console.error('Profile Upsert Error:', upError)
          prof = newProf
        }

        const finalProfile = prof || { id: data.user.id, nombre: 'Usuario', email: data.user.email, rol: isAdminEmail ? 'admin' : 'user' }
        console.log('Final Profile:', finalProfile)
        setUser(data.user); setProfile(finalProfile)
        showToast('success', '🎉', '¡Bienvenido!', finalProfile.nombre)
        onClose()
        if (finalProfile.rol === 'admin') navigate('/admin')
      }
    } catch (e) {
      if (e.message === 'SUPABASE_TIMEOUT') {
        console.error('Supabase tardó demasiado. Limpiando caché local...')
        localStorage.clear()
        sessionStorage.clear()
        setErr('La conexión se atascó. He limpiado la caché, intenta de nuevo ahora mismo.')
      } else {
        console.error('Unexpected Login catch:', e)
        setErr('Error de conexión o de red. Intenta de nuevo.')
      }
    } finally {
      console.log('--- Login End ---')
      setLoading(false)
    }
  }

  const doRegister = async () => {
    setErr(''); setLoading(true)
    try {
      if (!form.nombre || !form.email || !form.password) { setErr('Todos los campos son requeridos.'); return }
      if (form.password.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return }
      if (isAdminEmail && form.adminKey !== ADMIN_KEY) {
        setErr('Para registrar el email de admin necesitas la Clave de Admin.'); return
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { nombre: form.nombre, rol: isAdminEmail ? 'admin' : 'user' } }
      })

      if (error) {
        if (error.status === 429) setErr('Demasiados registros. Espera 1 minuto.')
        else if (error.message.includes('is invalid')) {
          console.error('Gotrue Invalid Email Error:', error)
          setErr('Supabase rechazó este correo. Revisa en tu panel: Authentication -> Providers -> SMTP o reestricciones de dominio.')
        } else {
          setErr(error.message)
        }
        return
      }

      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre: form.nombre,
          email: form.email.trim(),
          rol: isAdminEmail ? 'admin' : 'user'
        })
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
        const finalProfile = prof || { id: data.user.id, nombre: form.nombre, email: form.email.trim(), rol: isAdminEmail ? 'admin' : 'user' }
        setUser(data.user); setProfile(finalProfile)
        showToast('success', '✅', '¡Cuenta creada!', 'Bienvenido, ' + form.nombre)
        onClose()
      }
    } catch (e) {
      console.error('Register error:', e)
      setErr('Error inesperado al registrarse.')
    } finally {
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
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={f('email')} placeholder="tu@email.com" /></div>
            <div className="form-group"><label>Contraseña</label><input type="password" value={form.password} onChange={f('password')} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && doLogin()} /></div>
            {isAdminEmail && (
              <div style={{ background: 'rgba(232,34,10,.06)', border: '1px solid rgba(232,34,10,.25)', borderRadius: 10, padding: '.9rem', marginTop: '.9rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>🔒 Clave de Admin</label>
                  <input type="password" value={form.adminKey} onChange={f('adminKey')} placeholder="Clave admin..." />
                </div>
              </div>
            )}
            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-red" style={{ width: '100%', marginTop: '.9rem', justifyContent: 'center' }} onClick={doLogin} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            <div className="auth-switch">¿No tienes cuenta? <a onClick={() => setTab('register')}>Regístrate aquí</a></div>
          </>
        ) : (
          <>
            <h2 className="modal-title">✨ Crear Cuenta</h2>
            <div className="form-group"><label>Nombre</label><input type="text" value={form.nombre} onChange={f('nombre')} placeholder="Tu nombre" /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={f('email')} placeholder="tu@email.com" /></div>
            <div className="form-group"><label>Contraseña</label><input type="password" value={form.password} onChange={f('password')} placeholder="Mínimo 6 caracteres" /></div>
            {isAdminEmail && (
              <div style={{ background: 'rgba(232,34,10,.06)', border: '1px solid rgba(232,34,10,.25)', borderRadius: 10, padding: '.9rem', marginTop: '.9rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>🔒 Clave de Admin Requerida</label>
                  <input type="password" value={form.adminKey} onChange={f('adminKey')} placeholder="Clave admin para este email..." />
                </div>
              </div>
            )}
            {err && <div className="form-err">{err}</div>}
            <button className="btn btn-red" style={{ width: '100%', marginTop: '.9rem', justifyContent: 'center' }} onClick={doRegister} disabled={loading}>{loading ? 'Creando...' : 'Crear Cuenta'}</button>
            <div className="auth-switch">¿Ya tienes cuenta? <a onClick={() => setTab('login')}>Inicia sesión</a></div>
          </>
        )}
      </div>
    </div>
  )
}
