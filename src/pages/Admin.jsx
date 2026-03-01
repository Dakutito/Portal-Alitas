import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import StatusCard from '../components/StatusCard'
import ConfirmDialog from '../components/ConfirmDialog'

const TABS = [
  { id: 'pedidos', label: '📋 Pedidos' },
  { id: 'usuarios', label: '👥 Usuarios' },
  { id: 'combos', label: '🍗 Combos' },
  { id: 'bebidas', label: '🥤 Bebidas' },
  { id: 'arroz', label: '🍚 Arroz' },
  { id: 'oferta', label: '⚡ Oferta' },
  { id: 'stats', label: '📊 Stats' },
]

export default function Admin() {
  const { user, profile, showToast } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('pedidos')
  const [pedidosActivos, setPedidosActivos] = useState(0)
  const lastCount = useRef(0)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      // If we don't have a user, it's possible we are hydrating
      if (!user) return

      // If we have a user but no profile yet, wait for App.jsx to fetch it
      if (!profile) return

      // If we have a profile and it's not admin, redirect
      if (profile.rol !== 'admin') {
        navigate('/')
        return
      }

      loadBadge()
      const ch = supabase.channel('admin-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => loadBadge())
        .subscribe()

      return () => {
        supabase.removeChannel(ch)
      }
    }

    const cleanup = checkAuth()
    return () => { if (cleanup && typeof cleanup === 'function') cleanup() }
  }, [user, profile])

  if (!user || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--gray)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
          <p>Verificando credenciales...</p>
        </div>
      </div>
    )
  }

  const loadBadge = async () => {
    const { count } = await supabase.from('pedidos').select('*', { count: 'exact', head: true }).in('estado', ['pendiente', 'preparacion', 'listo'])
    const pending = count || 0
    if (pending > lastCount.current) {
      playSound(); showToast('order', '🔔', `${pending - lastCount.current} nuevo(s) pedido(s)!`, 'Revisa el panel')
    }
    lastCount.current = pending
    setPedidosActivos(pending)
  }

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
        ;[523, 659, 784, 1047].forEach((f, i) => {
          const o = ctx.createOscillator(), g = ctx.createGain()
          o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = 'sine'
          const t = ctx.currentTime + i * .12; g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .25)
          o.start(t); o.stop(t + .25)
        })
    } catch (e) { }
  }

  return (
    <div style={{ paddingTop: 'var(--nav)', background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="admin-layout">
        <div className="admin-sidebar">
          <h2>👑 Admin</h2>
          <div className="admin-menu">
            {TABS.map(t => (
              <button key={t.id} className={`admin-menu-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === 'pedidos' && pedidosActivos > 0 && <span className="admin-badge">{pedidosActivos}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-content">
          {tab === 'pedidos' && <TabPedidos showToast={showToast} confirm={setConfirm} onBadge={loadBadge} />}
          {tab === 'usuarios' && <TabUsuarios />}
          {tab === 'combos' && <TabCombos showToast={showToast} confirm={setConfirm} />}
          {tab === 'bebidas' && <TabBebidas showToast={showToast} confirm={setConfirm} />}
          {tab === 'arroz' && <TabArroz showToast={showToast} confirm={setConfirm} />}
          {tab === 'oferta' && <TabOferta showToast={showToast} confirm={setConfirm} />}
          {tab === 'stats' && <TabStats showToast={showToast} confirm={setConfirm} />}
        </div>
      </div>
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ─── TAB PEDIDOS ───
function TabPedidos({ showToast, confirm, onBadge }) {
  const [pedidos, setPedidos] = useState([])
  const [combos, setCombos] = useState([])
  const [users, setUsers] = useState([])
  const [salsasMap, setSalsasMap] = useState({})
  const [extrasMap, setExtrasMap] = useState({})
  const [tiposArroz, setTiposArroz] = useState([])

  const load = async () => {
    const [p, c, u, a] = await Promise.all([
      supabase.from('pedidos').select('*').not('estado', 'in', '(completado,eliminado)').order('created_at', { ascending: true }),
      supabase.from('combos').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('tipos_arroz').select('*'),
    ])
    const allP = p.data || []
    setPedidos(allP); setCombos(c.data || []); setUsers(u.data || []); setTiposArroz(a.data || [])
    if (allP.length) {
      const ids = allP.map(x => x.id)
      const [s, e] = await Promise.all([supabase.from('pedido_salsas').select('*').in('pedido_id', ids), supabase.from('pedido_extras').select('*').in('pedido_id', ids)])
      const sm = {}; (s.data || []).forEach(x => { if (!sm[x.pedido_id]) sm[x.pedido_id] = []; sm[x.pedido_id].push(x) })
      const em = {}; (e.data || []).forEach(x => { if (!em[x.pedido_id]) em[x.pedido_id] = []; em[x.pedido_id].push(x) })
      setSalsasMap(sm); setExtrasMap(em)
    }
  }

  useEffect(() => { load(); const iv = setInterval(load, 3000); return () => clearInterval(iv) }, [])

  const updateEstado = async (id, estado) => {
    await supabase.from('pedidos').update({ estado }).eq('id', id)
    load(); onBadge(); showToast('info', '🔄', 'Estado actualizado', '')
  }

  const locales = pedidos.filter(p => p.tipo !== 'domicilio')
  const domicilios = pedidos.filter(p => p.tipo === 'domicilio')
  const eLabel = { pendiente: '⏳ Pendiente', preparacion: '🔥 En preparación', listo: '✅ Listo' }

  const renderPedido = (p) => {
    const u = users.find(x => x.id === p.usuario_id)
    const combo = combos.find(c => c.id === p.combo_id)
    return (
      <div key={p.id} style={{ marginBottom: '.7rem' }}>
        <StatusCard pedido={p} salsas={salsasMap[p.id] || []} extras={extrasMap[p.id] || []} combos={combos} tiposArroz={tiposArroz} />
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius) var(--radius)', padding: '.75rem 1rem', marginTop: -8 }}>
          <div style={{ fontSize: '.82rem', color: 'var(--gray)', marginBottom: '.5rem' }}>👤 {u?.nombre || '?'} ({u?.email || ''})</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <select className="pc-estado-select" value={p.estado} onChange={e => updateEstado(p.id, e.target.value)} style={{ flex: 1 }}>
              {['pendiente', 'preparacion', 'listo'].map(e => <option key={e} value={e}>{eLabel[e]}</option>)}
            </select>
            <button className="btn btn-success btn-sm" onClick={() => updateEstado(p.id, 'completado')}>✅ Completar</button>
            <button className="btn btn-danger btn-sm" onClick={() => confirm({ msg: '¿Cancelar este pedido?', onConfirm: () => updateEstado(p.id, 'eliminado') })}>❌</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <h2>📋 Pedidos Activos</h2>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={load}>🔄 Actualizar</button>
      {pedidos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>No hay pedidos activos 🎉</div>}
      <div className="pedidos-cols">
        <div>
          <div className="pedidos-col-title local">🍽 Local / Llevar ({locales.length})</div>
          {locales.length === 0 ? <div style={{ color: 'var(--gray)', fontSize: '.85rem' }}>Sin pedidos locales</div> : locales.map(renderPedido)}
        </div>
        <div>
          <div className="pedidos-col-title delivery">🛵 Domicilios ({domicilios.length})</div>
          {domicilios.length === 0 ? <div style={{ color: 'var(--gray)', fontSize: '.85rem' }}>Sin pedidos a domicilio</div> : domicilios.map(renderPedido)}
        </div>
      </div>
    </>
  )
}

// ─── TAB USUARIOS ───
function TabUsuarios() {
  const [users, setUsers] = useState([])
  const [pedidos, setPedidos] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('*').then(r => setUsers(r.data || []))
    supabase.from('pedidos').select('id, usuario_id').then(r => setPedidos(r.data || []))
  }, [])
  return (
    <>
      <h2>👥 Usuarios</h2>
      <table className="a-table">
        <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Pedidos</th></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.id}>
            <td>{u.nombre}</td><td>{u.email}</td>
            <td><span className={`sb-status ${u.rol === 'admin' ? 'st-listo' : 'st-pendiente'}`}>{u.rol}</span></td>
            <td>{pedidos.filter(p => p.usuario_id === u.id).length}</td>
          </tr>
        ))}</tbody>
      </table>
    </>
  )
}

// ─── TAB COMBOS ───
function TabCombos({ showToast, confirm }) {
  const [combos, setCombos] = useState([])
  const [form, setForm] = useState({ id: '', nombre: '', precio: '', alitas: '', descripcion: '' })
  const load = () => supabase.from('combos').select('*').then(r => setCombos(r.data || []))
  useEffect(() => { load() }, [])
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const save = async () => {
    if (!form.nombre || !form.precio || !form.alitas) { showToast('error', '⚠️', 'Error', 'Completa todos los campos.'); return }
    try {
      if (form.id) {
        const { error } = await supabase.from('combos').update({ nombre: form.nombre, precio: Number(form.precio), alitas: Number(form.alitas), descripcion: form.descripcion }).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('combos').insert({ nombre: form.nombre, precio: Number(form.precio), alitas: Number(form.alitas), descripcion: form.descripcion, estado: 'disponible', es_jueves: false, emoji: '🍗' })
        if (error) throw error
      }
      setForm({ id: '', nombre: '', precio: '', alitas: '', descripcion: '' })
      await load()
      showToast('success', '✅', 'Combo guardado', '')
    } catch (err) {
      console.error("Error saving combo:", err)
      showToast('error', '⚠️', 'Error al guardar', err.message)
    }
  }
  const toggleAgotado = async (c) => { await supabase.from('combos').update({ estado: c.estado === 'agotado' ? 'disponible' : 'agotado' }).eq('id', c.id); load() }
  const del = (id) => confirm({ msg: '¿Eliminar este combo?', onConfirm: async () => { await supabase.from('combos').delete().eq('id', id); load(); showToast('success', '🗑', 'Eliminado', '') } })
  return (
    <>
      <h2>🍗 Gestión de Combos</h2>
      <div className="admin-form-card">
        <h3 style={{ fontWeight: 700, marginBottom: '.9rem' }}>{form.id ? '✏ Editar' : '➕ Agregar'} Combo</h3>
        <div className="form-row">
          <div className="form-group"><label>Nombre</label><input value={form.nombre} onChange={f('nombre')} placeholder="Combo X" /></div>
          <div className="form-group"><label>Precio ($)</label><input type="number" value={form.precio} onChange={f('precio')} step="0.5" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Alitas</label><input type="number" value={form.alitas} onChange={f('alitas')} /></div>
          <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={f('descripcion')} /></div>
        </div>
        <div style={{ display: 'flex', gap: '.65rem' }}>
          <button className="btn btn-red btn-sm" onClick={save}>💾 Guardar</button>
          {form.id && <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: '', nombre: '', precio: '', alitas: '', descripcion: '' })}>Cancelar</button>}
        </div>
      </div>
      <div className="items-grid">
        {combos.map(c => (
          <div key={c.id} className="item-admin-card">
            <h4>{c.emoji} {c.nombre}</h4>
            <p>${Number(c.precio).toFixed(2)} · {c.alitas} alitas<br />{c.descripcion}</p>
            <p>Estado: <span className={`sb-status ${c.estado === 'agotado' ? 'st-eliminado' : 'st-listo'}`}>{c.estado}</span></p>
            <div className="item-admin-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setForm({ id: c.id, nombre: c.nombre, precio: c.precio, alitas: c.alitas, descripcion: c.descripcion })}>✏</button>
              <button className={`btn btn-sm ${c.estado === 'agotado' ? 'btn-success' : 'btn-danger'}`} onClick={() => toggleAgotado(c)}>{c.estado === 'agotado' ? '✅ Activar' : '🚫 Agotado'}</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TAB BEBIDAS ───
function TabBebidas({ showToast, confirm }) {
  const [bebidas, setBebidas] = useState([])
  const [form, setForm] = useState({ id: '', nombre: '', precio: '', tipo: 'normal', emoji: '' })
  const load = () => supabase.from('bebidas').select('*').then(r => setBebidas(r.data || []))
  useEffect(() => { load() }, [])
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const save = async () => {
    if (!form.nombre || !form.precio) { showToast('error', '⚠️', 'Error', 'Completa nombre y precio.'); return }
    try {
      const d = { nombre: form.nombre, precio: Number(form.precio), tipo: form.tipo, emoji: form.emoji || '🥤' }
      if (form.id) {
        const { error } = await supabase.from('bebidas').update(d).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('bebidas').insert({ ...d, activa: true })
        if (error) throw error
      }
      setForm({ id: '', nombre: '', precio: '', tipo: 'normal', emoji: '' })
      await load()
      showToast('success', '✅', 'Bebida guardada', '')
    } catch (err) {
      console.error("Error saving bebida:", err)
      showToast('error', '⚠️', 'Error al guardar', err.message)
    }
  }
  const toggle = async (b) => { await supabase.from('bebidas').update({ activa: !b.activa }).eq('id', b.id); load() }
  const del = (id) => confirm({ msg: '¿Eliminar esta bebida?', onConfirm: async () => { await supabase.from('bebidas').delete().eq('id', id); load() } })
  return (
    <>
      <h2>🥤 Gestión de Bebidas</h2>
      <div className="admin-form-card">
        <h3 style={{ fontWeight: 700, marginBottom: '.9rem' }}>{form.id ? '✏ Editar' : '➕ Agregar'} Bebida</h3>
        <div className="form-row">
          <div className="form-group"><label>Nombre</label><input value={form.nombre} onChange={f('nombre')} placeholder="Coca Cola" /></div>
          <div className="form-group"><label>Precio ($)</label><input type="number" value={form.precio} onChange={f('precio')} step="0.25" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Tipo</label><select value={form.tipo} onChange={f('tipo')}><option value="normal">Sin alcohol</option><option value="alcohol">Alcohólica</option></select></div>
          <div className="form-group"><label>Emoji</label><input value={form.emoji} onChange={f('emoji')} placeholder="🥤" maxLength={2} /></div>
        </div>
        <div style={{ display: 'flex', gap: '.65rem' }}>
          <button className="btn btn-red btn-sm" onClick={save}>💾 Guardar</button>
          {form.id && <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: '', nombre: '', precio: '', tipo: 'normal', emoji: '' })}>Cancelar</button>}
        </div>
      </div>
      {[['normal', '🥤 Sin alcohol'], ['alcohol', '🍺 Alcohólicas']].map(([tipo, label]) => (
        <div key={tipo} style={{ marginBottom: '1rem' }}>
          <div className="pedidos-col-title local" style={{ display: 'inline-flex', marginBottom: '.7rem' }}>{label}</div>
          <div className="items-grid">
            {bebidas.filter(b => b.tipo === tipo).map(b => (
              <div key={b.id} className="item-admin-card">
                <h4>{b.emoji} {b.nombre}</h4>
                <p>${Number(b.precio).toFixed(2)}</p>
                <p>Estado: <span className={`sb-status ${b.activa ? 'st-listo' : 'st-eliminado'}`}>{b.activa ? 'Activa' : 'Inactiva'}</span></p>
                <div className="item-admin-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setForm({ id: b.id, nombre: b.nombre, precio: b.precio, tipo: b.tipo, emoji: b.emoji })}>✏</button>
                  <button className={`btn btn-sm ${b.activa ? 'btn-danger' : 'btn-success'}`} onClick={() => toggle(b)}>{b.activa ? '🚫' : '✅'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(b.id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

// ─── TAB ARROZ ───
function TabArroz({ showToast, confirm }) {
  const [tipos, setTipos] = useState([])
  const [form, setForm] = useState({ id: '', nombre: '', emoji: '', precio: '1.00' })
  const load = () => supabase.from('tipos_arroz').select('*').then(r => setTipos(r.data || []))
  useEffect(() => { load() }, [])
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const save = async () => {
    if (!form.nombre) { showToast('error', '⚠️', 'Error', 'Ingresa el nombre.'); return }
    try {
      const d = { nombre: form.nombre, emoji: form.emoji || '🍚', precio: Number(form.precio) || 1 }
      if (form.id) {
        const { error } = await supabase.from('tipos_arroz').update(d).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tipos_arroz').insert({ ...d, activo: true })
        if (error) throw error
      }
      setForm({ id: '', nombre: '', emoji: '', precio: '1.00' })
      await load()
      showToast('success', '✅', 'Tipo de arroz guardado', '')
    } catch (err) {
      console.error("Error saving arroz:", err)
      showToast('error', '⚠️', 'Error al guardar', err.message)
    }
  }
  const toggle = async (t) => { await supabase.from('tipos_arroz').update({ activo: !t.activo }).eq('id', t.id); load() }
  const del = (id) => confirm({ msg: '¿Eliminar este tipo de arroz?', onConfirm: async () => { await supabase.from('tipos_arroz').delete().eq('id', id); load() } })
  return (
    <>
      <h2>🍚 Gestión de Arroz</h2>
      <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: '1.2rem' }}>Administra los tipos de arroz disponibles.</p>
      <div className="admin-form-card">
        <h3 style={{ fontWeight: 700, marginBottom: '.9rem' }}>{form.id ? '✏ Editar' : '➕ Agregar'} Tipo</h3>
        <div className="form-row">
          <div className="form-group"><label>Nombre</label><input value={form.nombre} onChange={f('nombre')} placeholder="Moro, Choclo..." /></div>
          <div className="form-group"><label>Emoji</label><input value={form.emoji} onChange={f('emoji')} placeholder="🍚" maxLength={4} /></div>
        </div>
        <div className="form-group"><label>Precio ($)</label><input type="number" value={form.precio} onChange={f('precio')} step="0.25" /></div>
        <div style={{ display: 'flex', gap: '.65rem' }}>
          <button className="btn btn-red btn-sm" onClick={save}>💾 Guardar</button>
          {form.id && <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: '', nombre: '', emoji: '', precio: '1.00' })}>Cancelar</button>}
        </div>
      </div>
      {tipos.length === 0 && <p style={{ color: 'var(--gray)', fontSize: '.85rem' }}>No hay tipos registrados.</p>}
      <div className="items-grid">
        {tipos.map(t => (
          <div key={t.id} className="item-admin-card">
            <h4>{t.emoji || '🍚'} {t.nombre}</h4>
            <p>${Number(t.precio).toFixed(2)} por porción</p>
            <p>Estado: <span className={`sb-status ${t.activo ? 'st-listo' : 'st-eliminado'}`}>{t.activo ? 'Disponible' : 'Agotado'}</span></p>
            <div className="item-admin-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setForm({ id: t.id, nombre: t.nombre, emoji: t.emoji || '', precio: t.precio })}>✏</button>
              <button className={`btn btn-sm ${t.activo ? 'btn-danger' : 'btn-success'}`} onClick={() => toggle(t)}>{t.activo ? '🚫 Agotado' : '✅ Activar'}</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(t.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── TAB OFERTA ───
function TabOferta({ showToast, confirm }) {
  const [oferta, setOferta] = useState(null)
  const [form, setForm] = useState({ titulo: '', descripcion: '', precio: '', alitas: '', emoji: '🔥', horas: '24' })
  const load = () => supabase.from('oferta').select('*').order('id', { ascending: false }).limit(1).then(r => setOferta(r.data?.[0] || null))
  useEffect(() => { load() }, [])
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const crear = async () => {
    if (!form.titulo || !form.descripcion || !form.precio || !form.alitas) { showToast('error', '⚠️', 'Error', 'Completa todos los campos.'); return }
    try {
      const fecha_fin = new Date(Date.now() + Number(form.horas) * 3600000).toISOString()
      const { error } = await supabase.from('oferta').insert({ titulo: form.titulo, descripcion: form.descripcion, precio: Number(form.precio), alitas: Number(form.alitas), emoji: form.emoji || '🔥', fecha_fin, activa: true })
      if (error) throw error
      setForm({ titulo: '', descripcion: '', precio: '', alitas: '', emoji: '🔥', horas: '24' })
      await load()
      showToast('success', '⚡', '¡Oferta publicada!', '')
    } catch (err) {
      console.error("Error creating oferta:", err)
      showToast('error', '⚠️', 'Error al publicar', err.message)
    }
  }
  const toggleEstado = async () => { await supabase.from('oferta').update({ activa: !oferta.activa }).eq('id', oferta.id); load() }
  const eliminar = () => confirm({ msg: '¿Eliminar la oferta especial?', onConfirm: async () => { await supabase.from('oferta').delete().eq('id', oferta.id); load(); showToast('success', '🗑', 'Oferta eliminada', '') } })
  return (
    <>
      <h2>⚡ Oferta Especial</h2>
      <p style={{ color: 'var(--gray)', fontSize: '.88rem', marginBottom: '1.5rem' }}>Crea una oferta de tiempo limitado. Solo puede haber una a la vez.</p>
      {oferta && (
        <div style={{ background: 'linear-gradient(135deg,#1a1000,#1d1d1d)', border: '1.5px solid rgba(255,198,51,.3)', borderRadius: 'var(--radius)', padding: '1.2rem', marginBottom: '1rem', opacity: oferta.activa ? 1 : .7 }}>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.4rem', color: 'var(--yellow)', letterSpacing: 1, marginBottom: '.3rem' }}>{oferta.activa ? '⚡' : '🚫'} {oferta.titulo}</div>
          <p style={{ fontSize: '.8rem', color: 'var(--gray)', marginBottom: '.6rem' }}>{oferta.descripcion}<br />Vence: {new Date(oferta.fecha_fin).toLocaleString('es')}</p>
          <div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${oferta.activa ? 'btn-outline' : 'btn-success'}`} onClick={toggleEstado}>{oferta.activa ? '🚫 Marcar Agotada' : '✅ Reactivar'}</button>
            <button className="btn btn-danger btn-sm" onClick={eliminar}>🗑 Eliminar</button>
          </div>
        </div>
      )}
      <div className="admin-form-card" style={oferta ? { opacity: .5, pointerEvents: 'none' } : {}}>
        <h3 style={{ fontWeight: 700, marginBottom: '.9rem' }}>➕ Crear Nueva Oferta</h3>
        <div className="form-group"><label>Título</label><input value={form.titulo} onChange={f('titulo')} placeholder="JUEVES LOCO" /></div>
        <div className="form-group"><label>Descripción</label><input value={form.descripcion} onChange={f('descripcion')} placeholder="20 alitas por solo $13..." /></div>
        <div className="form-row">
          <div className="form-group"><label>Precio ($)</label><input type="number" value={form.precio} onChange={f('precio')} step="0.01" /></div>
          <div className="form-group"><label>Nº Alitas</label><input type="number" value={form.alitas} onChange={f('alitas')} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Emoji</label><input value={form.emoji} onChange={f('emoji')} maxLength={4} /></div>
          <div className="form-group"><label>Duración (horas)</label><input type="number" value={form.horas} onChange={f('horas')} min="1" max="720" /></div>
        </div>
        <button className="btn btn-red btn-sm" onClick={crear}>🚀 Publicar Oferta</button>
      </div>
    </>
  )
}

// ─── TAB STATS ───
function TabStats({ showToast, confirm }) {
  const [stats, setStats] = useState(null)
  const [inv, setInv] = useState({})
  const [bebidas, setBebidas] = useState([])

  const load = async () => {
    const [p, c, u, pe, b, i] = await Promise.all([
      supabase.from('pedidos').select('*'),
      supabase.from('combos').select('*'),
      supabase.from('profiles').select('*').neq('rol', 'admin'),
      supabase.from('pedido_extras').select('*'),
      supabase.from('bebidas').select('*'),
      supabase.from('inventario').select('*'),
    ])
    const allP = p.data || [], allC = c.data || [], allU = u.data || [], allPE = pe.data || [], allB = b.data || []
    setBebidas(allB)
    const invObj = {}; (i.data || []).forEach(x => invObj[x.clave] = x.valor)
    setInv(invObj)
    const hoy = new Date().toDateString()
    const hoyP = allP.filter(x => new Date(x.created_at).toDateString() === hoy)
    const totalRev = allP.reduce((a, p) => a + Number(p.total || 0), 0)
    const totalAlitas = allP.reduce((a, p) => { const co = allC.find(c => c.id === p.combo_id); return a + (co ? co.alitas : 0) }, 0)
    const bebNormal = allPE.filter(e => { const b = allB.find(x => x.nombre === e.nombre); return b?.tipo === 'normal' }).reduce((a, e) => a + e.precio * e.cantidad, 0)
    const bebAlcohol = allPE.filter(e => { const b = allB.find(x => x.nombre === e.nombre); return b?.tipo === 'alcohol' }).reduce((a, e) => a + e.precio * e.cantidad, 0)
    setStats({ hoyP: hoyP.length, total: allP.length, usuarios: allU.length, pendientes: allP.filter(x => x.estado === 'pendiente').length, domicilios: allP.filter(x => x.tipo === 'domicilio').length, totalRev, totalAlitas, bebNormal, bebAlcohol })
  }

  useEffect(() => { load() }, [])

  const saveInv = async (clave, valor) => {
    const el = document.getElementById('inv-' + clave)
    if (!el) return
    const v = parseInt(el.value)
    if (isNaN(v) || v < 0) { showToast('error', '⚠️', 'Error', 'Número inválido'); return }
    await supabase.from('inventario').upsert({ clave, valor: v }, { onConflict: 'clave' })
    showToast('success', '✅', 'Inventario guardado', `${clave}: ${v}`)
    load()
  }

  const saveInvBeb = async (b) => {
    const el = document.getElementById('inv-beb-' + b.id)
    if (!el) return
    const v = parseInt(el.value)
    if (isNaN(v) || v < 0) { showToast('error', '⚠️', 'Error', 'Número inválido'); return }
    await supabase.from('inventario').upsert({ clave: 'beb_' + b.id, valor: v }, { onConflict: 'clave' })
    showToast('success', '✅', 'Stock guardado', `${b.nombre}: ${v}`)
    load()
  }

  const resetAll = () => confirm({ msg: '⚠ Esto eliminará TODOS los pedidos y estadísticas. ¿Estás segura?', onConfirm: async () => { await supabase.from('pedidos').delete().not('id', 'is', null); load(); showToast('success', '🗑', 'Stats reseteadas', '') } })

  if (!stats) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>Cargando...</div>

  return (
    <>
      <h2>📊 Totales & Estadísticas</h2>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={load}>🔄 Actualizar</button>
        <button className="btn btn-danger btn-sm" onClick={resetAll}>🗑 Resetear todo</button>
      </div>

      {/* INVENTARIO */}
      <div style={{ fontSize: '.7rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '.75rem' }}>📦 Control de Inventario</div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.2rem', marginBottom: '1.4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[['alitas', '🍗 Alitas'], ['arroz', '🍚 Arroz']].map(([k, label]) => (
            <div key={k}>
              <div style={{ fontSize: '.72rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '.5rem' }}>{label}</div>
              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="number" id={`inv-${k}`} defaultValue={inv[k] ?? ''} placeholder="Cantidad" min="0" style={{ background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.45rem .7rem', borderRadius: 8, fontSize: '.88rem', outline: 'none', width: 130 }} />
                <button className="btn btn-success btn-sm" onClick={() => saveInv(k, 0)}>💾 Guardar</button>
              </div>
              {inv[k] !== undefined && <div style={{ marginTop: '.5rem', fontSize: '.78rem', color: inv[k] <= 0 ? '#f87171' : 'var(--green)' }}>Disponibles: {inv[k]}{inv[k] <= 0 && ' ⚠ ¡Sin stock!'}</div>}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '.72rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '.65rem' }}>🥤 Control de Bebidas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '.65rem' }}>
            {bebidas.map(b => (
              <div key={b.id} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 9, padding: '.75rem' }}>
                <div style={{ fontSize: '.82rem', fontWeight: 600, marginBottom: '.4rem' }}>{b.emoji} {b.nombre}</div>
                <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.4rem', alignItems: 'center' }}>
                  <input type="number" id={`inv-beb-${b.id}`} defaultValue={inv['beb_' + b.id] ?? ''} placeholder="Stock" min="0" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.3rem .5rem', borderRadius: 6, fontSize: '.78rem', outline: 'none', width: 75 }} />
                  <button className="btn btn-success btn-sm" style={{ padding: '.28rem .55rem', fontSize: '.72rem' }} onClick={() => saveInvBeb(b)}>💾</button>
                </div>
                {inv['beb_' + b.id] !== undefined && <div style={{ fontSize: '.73rem', color: inv['beb_' + b.id] <= 0 ? '#f87171' : 'var(--green)' }}>Stock: {inv['beb_' + b.id]}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        {[['Pedidos Hoy', stats.hoyP], ['Pendientes', stats.pendientes, 'var(--red)'], ['Total Pedidos', stats.total], ['Usuarios', stats.usuarios], ['🛵 Domicilios', stats.domicilios, 'var(--blue)']].map(([l, v, color]) => (
          <div key={l} className="stat-card"><h4>{l}</h4><div className="stat-val" style={color ? { color } : {}}>{v}</div></div>
        ))}
      </div>
      <div style={{ fontSize: '.7rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '.7rem', marginTop: '1.2rem' }}>💰 Totales</div>
      <div className="totales-grid">
        <div className="totales-card hl"><h4>💵 Ingreso Total</h4><div className="tot-val">${stats.totalRev.toFixed(2)}</div></div>
        <div className="totales-card"><h4>🐔 Alitas Vendidas</h4><div className="tot-val">{stats.totalAlitas}</div></div>
        <div className="totales-card"><h4>🥤 Bebidas S/Alcohol</h4><div className="tot-val">${stats.bebNormal.toFixed(2)}</div></div>
        <div className="totales-card"><h4>🍺 Alcohólicas</h4><div className="tot-val">${stats.bebAlcohol.toFixed(2)}</div></div>
      </div>
    </>
  )
}
