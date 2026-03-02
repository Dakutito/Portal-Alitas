import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

const SALSAS = ['BBQ', 'Honey', 'BBQ Picante', 'Queso', 'Champiñones', 'Sin salsa', 'Variadas']

export default function Order() {
  const { user, profile, showToast } = useStore()
  const navigate = useNavigate()
  const [combos, setCombos] = useState([])
  const [bebidas, setBebidas] = useState([])
  const [tiposArroz, setTiposArroz] = useState([])
  const [oferta, setOferta] = useState(null)

  // Sidebar state
  const [selCombo, setSelCombo] = useState(null)
  const [salsas, setSalsas] = useState({})
  const [arrozQty, setArrozQty] = useState({})
  const [bebCounts, setBebCounts] = useState({})
  const [tipoServicio, setTipoServicio] = useState('servir')
  const [mesa, setMesa] = useState('')
  const [direccion, setDireccion] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  // Extra orders
  const [eaQty, setEaQty] = useState({})
  const [ebCounts, setEbCounts] = useState({})
  const [eaMesa, setEaMesa] = useState('')
  const [ebMesa, setEbMesa] = useState('')

  // Modals
  const [ccCombo, setCcCombo] = useState(null) // confirm combo modal
  const [ocOpen, setOcOpen] = useState(false) // confirm order modal
  const [success, setSuccess] = useState(false)
  const [successDom, setSuccessDom] = useState(false)

  const isMobile = window.innerWidth <= 900

  const { selOffer, setSelOffer } = useStore() // Use store for pre-selected offer

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      supabase.from('combos').select('*'),
      supabase.from('bebidas').select('*').eq('activa', true),
      supabase.from('tipos_arroz').select('*').eq('activo', true),
      supabase.from('oferta').select('*').order('id', { ascending: false }).limit(1),
    ]).then(([c, b, a, o]) => {
      setCombos(c.data || [])
      const bList = b.data || []
      setBebidas(bList)
      const bc = {}; bList.forEach(x => bc[x.id] = 0)
      setBebCounts(bc); setEbCounts({ ...bc })
      const aList = a.data || []
      setTiposArroz(aList)
      const aq = {}; aList.forEach(x => aq[x.id] = 0)
      setArrozQty(aq); setEaQty({ ...aq })

      const of = o.data?.[0]
      if (of && of.activa) setOferta(of)

      // Auto-select offer if coming from Home
      if (selOffer && selOffer.activa) {
        confirmOffer(selOffer)
        setSelOffer(null) // Reset in store
      }
    })
    const init = {}; SALSAS.forEach(s => init[s] = 0); setSalsas(init)
  }, [user])

  const totalSalsas = Object.values(salsas).reduce((a, b) => a + b, 0)
  const maxAlitas = selCombo?.alitas || 0
  const pct = maxAlitas > 0 ? Math.min(totalSalsas / maxAlitas * 100, 100) : 0
  const arrozCost = tiposArroz.reduce((acc, t) => acc + (t.precio * (arrozQty[t.id] || 0)), 0)
  const bebCost = bebidas.reduce((acc, b) => acc + (b.precio * (bebCounts[b.id] || 0)), 0)
  const total = (selCombo?.precio || 0) + arrozCost + bebCost

  const canOrder = selCombo && totalSalsas === maxAlitas

  const changeSalsa = (name, delta) => {
    if (delta > 0 && totalSalsas >= maxAlitas) { showToast('error', '⚠️', 'Límite', `Solo puedes elegir ${maxAlitas} salsas`); return }
    setSalsas(p => ({ ...p, [name]: Math.max(0, (p[name] || 0) + delta) }))
  }

  const selectCombo = (c) => { setCcCombo(c) }
  const confirmCombo = () => {
    setSelCombo(ccCombo)
    const init = {}; SALSAS.forEach(s => init[s] = 0); setSalsas(init)
    setCcCombo(null)
    if (isMobile) setSidebarExpanded(true)
    showToast('info', ccCombo?.es_jueves ? '⚡' : '🍗', 'Combo seleccionado', ccCombo.nombre + ' — elige tus salsas')
  }

  const confirmOffer = (off) => {
    // Treat offer as a special combo
    const offCombo = { ...off, isOffer: true }
    setSelCombo(offCombo)
    const init = {}; SALSAS.forEach(s => init[s] = 0); setSalsas(init)
    if (isMobile) setSidebarExpanded(true)
    showToast('info', '⚡', 'Oferta seleccionada', off.titulo + ' — elige tus salsas')
  }

  const doEnviarPedido = async () => {
    setOcOpen(false)
    const arrozSnapshot = {}
    tiposArroz.forEach(t => { if ((arrozQty[t.id] || 0) > 0) arrozSnapshot[t.id] = arrozQty[t.id] })

    // Preparation for inserted data
    const pedidoData = {
      usuario_id: user.id,
      combo_id: selCombo.isOffer ? null : selCombo.id,
      combo_precio: selCombo.precio,
      total,
      tipo: tipoServicio,
      mesa: tipoServicio !== 'domicilio' ? mesa : '',
      direccion: tipoServicio === 'domicilio' ? direccion : '',
      estado: 'pendiente',
      arroz: arrozSnapshot,
      mensaje: selCombo.isOffer ? `[OFERTA: ${selCombo.titulo}] ${mensaje}` : mensaje
    }

    const { data: ped, error } = await supabase.from('pedidos').insert(pedidoData).select().single()

    if (error) {
      console.error("Error inserting order:", error)
      showToast('error', '⚠️', 'Error', error.message)
      return
    }

    // --- INVENTORY UPDATE ---
    try {
      // 1. Alitas
      const alitasNeeded = selCombo.alitas || 0
      if (alitasNeeded > 0) {
        const { data: invAlitas } = await supabase.from('inventario').select('valor').eq('clave', 'alitas').single()
        if (invAlitas) {
          await supabase.from('inventario').update({ valor: Math.max(0, invAlitas.valor - alitasNeeded) }).eq('clave', 'alitas')
        }
      }

      // 2. Arroz
      for (const tId in arrozSnapshot) {
        const qty = arrozSnapshot[tId]
        const { data: invArroz } = await supabase.from('inventario').select('valor').eq('clave', 'arroz').single()
        if (invArroz) {
          await supabase.from('inventario').update({ valor: Math.max(0, invArroz.valor - qty) }).eq('clave', 'arroz')
        }
      }

      // 3. Bebidas
      for (const bId in bebCounts) {
        const qty = bebCounts[bId]
        if (qty > 0) {
          const { data: invBeb } = await supabase.from('inventario').select('valor').eq('clave', 'beb_' + bId).single()
          if (invBeb) {
            await supabase.from('inventario').update({ valor: Math.max(0, invBeb.valor - qty) }).eq('clave', 'beb_' + bId)
          }
        }
      }
    } catch (invErr) {
      console.error("Inventory update error:", invErr)
    }

    // Insert salsas into NEW TABLE
    const salsaRows = Object.entries(salsas).filter(([, v]) => v > 0).map(([s, c]) => ({
      pedido_id: ped.id,
      tipo_salsa: s,
      cantidad: c
    }))
    if (salsaRows.length) {
      const { error: sError } = await supabase.from('pedido_salsas').insert(salsaRows)
      if (sError) console.error("Error inserting salsas:", sError)
    }

    // Insert bebidas extras into NEW TABLE
    const bebRows = Object.entries(bebCounts).filter(([, v]) => v > 0).map(([id, qty]) => {
      const b = bebidas.find(x => x.id == id)
      return b ? { pedido_id: ped.id, nombre: b.nombre, cantidad: qty, precio: b.precio, tipo: b.tipo } : null
    }).filter(Boolean)
    if (bebRows.length) {
      const { error: eError } = await supabase.from('pedido_extras').insert(bebRows)
      if (eError) console.error("Error inserting extras:", eError)
    }

    useStore.getState().resetOrder() // Clean store
    setSuccessDom(tipoServicio === 'domicilio')
    setSuccess(true)
  }
  const pedirExtraArroz = async () => {
    if (!eaMesa) { showToast('error', '⚠️', 'Error', 'Ingresa el número de mesa.'); return }
    const selTipos = tiposArroz.filter(t => (eaQty[t.id] || 0) > 0)
    if (!selTipos.length) { showToast('error', '⚠️', 'Error', 'Selecciona al menos una porción.'); return }
    const tot = selTipos.reduce((acc, t) => acc + t.precio * (eaQty[t.id] || 0), 0)
    const arrozExtra = {}; selTipos.forEach(t => arrozExtra[t.id] = eaQty[t.id])

    // Try to find active order for same mesa
    const { data: activos } = await supabase.from('pedidos').select('*')
      .eq('usuario_id', user.id).eq('mesa', eaMesa).in('estado', ['pendiente', 'preparacion', 'listo']).is('es_extra', false)

    const activo = activos?.[0]
    if (activo) {
      const newArroz = { ...(activo.arroz || {}) }
      selTipos.forEach(t => newArroz[t.id] = (Number(newArroz[t.id]) || 0) + (eaQty[t.id] || 0))
      const adicional = activo.adicional || { arroz: 0, bebidas: 0, items: [] }
      selTipos.forEach(t => adicional.items.push({ desc: `${t.emoji || '🍚'} ${t.nombre} ×${eaQty[t.id]}`, subtotal: t.precio * eaQty[t.id] }))
      adicional.arroz = Number(adicional.arroz || 0) + tot
      await supabase.from('pedidos').update({ arroz: newArroz, adicional, total: Number(activo.total) + tot, modificado: true, ultima_mod: new Date().toISOString() }).eq('id', activo.id)

      // Update inventory for arroz
      const { data: invArroz } = await supabase.from('inventario').select('valor').eq('clave', 'arroz').single()
      if (invArroz) {
        const totalQty = selTipos.reduce((a, t) => a + eaQty[t.id], 0)
        await supabase.from('inventario').update({ valor: Math.max(0, invArroz.valor - totalQty) }).eq('clave', 'arroz')
      }

      showToast('success', '🍚', '¡Arroz agregado!', `Mesa ${eaMesa} · +$${tot.toFixed(2)}`)
    } else {
      await supabase.from('pedidos').insert({ usuario_id: user.id, combo_id: null, combo_precio: 0, total: tot, tipo: 'servir', mesa: eaMesa, mensaje: 'Solo arroz', estado: 'pendiente', es_extra: true, tipo_extra: 'arroz', arroz: arrozExtra })

      // Update inventory for arroz
      const { data: invArroz } = await supabase.from('inventario').select('valor').eq('clave', 'arroz').single()
      if (invArroz) {
        const totalQty = selTipos.reduce((a, t) => a + eaQty[t.id], 0)
        await supabase.from('inventario').update({ valor: Math.max(0, invArroz.valor - totalQty) }).eq('clave', 'arroz')
      }

      showToast('success', '🍚', '¡Arroz pedido!', `Mesa ${eaMesa} · $${tot.toFixed(2)}`)
    }
    const reset = {}; tiposArroz.forEach(t => reset[t.id] = 0)
    setEaQty(reset); setEaMesa('')
  }

  const pedirExtraBebida = async () => {
    if (!ebMesa) { showToast('error', '⚠️', 'Error', 'Ingresa el número de mesa.'); return }
    const selBeb = bebidas.filter(b => (ebCounts[b.id] || 0) > 0)
    if (!selBeb.length) { showToast('error', '⚠️', 'Error', 'Selecciona al menos una bebida.'); return }
    const tot = selBeb.reduce((acc, b) => acc + b.precio * (ebCounts[b.id] || 0), 0)

    const { data: activos } = await supabase.from('pedidos').select('*')
      .eq('usuario_id', user.id).eq('mesa', ebMesa).in('estado', ['pendiente', 'preparacion', 'listo']).is('es_extra', false)

    const activo = activos?.[0]
    const bebRows = selBeb.map(b => ({ pedido_id: null, nombre: b.nombre, cantidad: ebCounts[b.id], precio: b.precio, tipo: b.tipo }))

    if (activo) {
      const adicional = activo.adicional || { arroz: 0, bebidas: 0, items: [] }
      selBeb.forEach(b => adicional.items.push({ desc: `${b.emoji} ${b.nombre} ×${ebCounts[b.id]}`, subtotal: b.precio * ebCounts[b.id] }))
      adicional.bebidas = Number(adicional.bebidas || 0) + tot
      await supabase.from('pedidos').update({ adicional, total: Number(activo.total) + tot, modificado: true, ultima_mod: new Date().toISOString() }).eq('id', activo.id)
      const rows = bebRows.map(r => ({ ...r, pedido_id: activo.id }))
      await supabase.from('pedido_extras').insert(rows)

      // Update inventory for bebidas
      for (const b of selBeb) {
        const { data: invBeb } = await supabase.from('inventario').select('valor').eq('clave', 'beb_' + b.id).single()
        if (invBeb) {
          await supabase.from('inventario').update({ valor: Math.max(0, invBeb.valor - ebCounts[b.id]) }).eq('clave', 'beb_' + b.id)
        }
      }

      showToast('success', '🥤', '¡Bebidas agregadas!', `Mesa ${ebMesa} · +$${tot.toFixed(2)}`)
    } else {
      const { data: ped } = await supabase.from('pedidos').insert({ usuario_id: user.id, combo_id: null, combo_precio: 0, total: tot, tipo: 'servir', mesa: ebMesa, mensaje: 'Solo bebidas', estado: 'pendiente', es_extra: true, tipo_extra: 'bebida' }).select().single()
      if (ped) {
        const rows = bebRows.map(r => ({ ...r, pedido_id: ped.id }))
        await supabase.from('pedido_extras').insert(rows)

        // Update inventory for bebidas
        for (const b of selBeb) {
          const { data: invBeb } = await supabase.from('inventario').select('valor').eq('clave', 'beb_' + b.id).single()
          if (invBeb) {
            await supabase.from('inventario').update({ valor: Math.max(0, invBeb.valor - ebCounts[b.id]) }).eq('clave', 'beb_' + b.id)
          }
        }
      }
      showToast('success', '🥤', '¡Bebidas pedidas!', `Mesa ${ebMesa} · $${tot.toFixed(2)}`)
    }
    const reset = {}; bebidas.forEach(b => reset[b.id] = 0)
    setEbCounts(reset); setEbMesa('')
  }

  if (success) return <SuccessOverlay dom={successDom} onNew={() => { setSuccess(false); setSelCombo(null); const i = {}; SALSAS.forEach(s => i[s] = 0); setSalsas(i) }} onStatus={() => navigate('/status')} />

  const normales = bebidas.filter(b => b.tipo === 'normal')
  const alcohol = bebidas.filter(b => b.tipo === 'alcohol')

  return (
    <div style={{ paddingTop: 'var(--nav)', background: 'var(--bg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 400px', minHeight: 'calc(100vh - var(--nav))' }}>
        {/* LEFT */}
        <div style={{ padding: '2rem 2rem 4rem 2.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '2.4rem', letterSpacing: 1, marginBottom: '.2rem' }}>Place Your Order</h1>
            <p style={{ color: 'var(--gray)', fontSize: '.9rem' }}>Alitas frescas y crujientes directas a tu mesa.</p>
          </div>

          {oferta && (
            <div className={`order-card ${selCombo?.isOffer ? 'selected' : ''}`}
              onClick={() => confirmOffer(oferta)}
              style={{
                background: 'linear-gradient(135deg,#1a1000,#1d0d00)',
                border: `1.5px solid ${selCombo?.isOffer ? 'var(--red)' : 'rgba(255,198,51,.35)'}`,
                borderRadius: 15, padding: '1.5rem', marginBottom: '1.5rem', cursor: 'pointer',
                boxShadow: selCombo?.isOffer ? '0 0 0 3px rgba(232,34,10,.18)' : 'none'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(232,34,10,.2)', color: 'var(--red)', border: '1px solid rgba(232,34,10,.3)', fontSize: '.73rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '.28rem .75rem', borderRadius: 20, display: 'inline-block', marginBottom: '.5rem' }}>⚡ Oferta Especial</div>
                {selCombo?.isOffer && <span style={{ background: 'var(--red)', color: '#fff', fontSize: '.7rem', fontWeight: 700, padding: '.18rem .55rem', borderRadius: 6 }}>✔ Selected</span>}
              </div>
              <h3 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '2.2rem', marginBottom: '.3rem' }}>{oferta.titulo}</h3>
              <p style={{ color: 'var(--gray)', fontSize: '.9rem', marginBottom: '.4rem' }} dangerouslySetInnerHTML={{ __html: oferta.descripcion }} />
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.3rem', color: 'var(--yellow)', marginBottom: '1rem' }}>${Number(oferta.precio).toFixed(2)} · {oferta.alitas} Alitas</div>
              {!selCombo?.isOffer && <button className="btn btn-ghost btn-sm">+ Select Offer</button>}
            </div>
          )}

          {/* COMBO CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1rem' }}>
            {combos.map(c => (
              <div key={c.id} className={`order-card ${c.estado === 'agotado' ? 'agotado' : ''} ${selCombo?.id === c.id ? 'selected' : ''}`}
                onClick={c.estado !== 'agotado' ? () => selectCombo(c) : undefined}
                style={{
                  background: 'var(--bg3)', border: `1.5px solid ${selCombo?.id === c.id ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', overflow: 'hidden', cursor: c.estado === 'agotado' ? 'not-allowed' : 'pointer',
                  transition: 'all .25s', opacity: c.estado === 'agotado' ? .42 : 1,
                  boxShadow: selCombo?.id === c.id ? '0 0 0 3px rgba(232,34,10,.18)' : 'none'
                }}>
                <div style={{ width: '100%', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.6rem', background: 'linear-gradient(135deg,#1a1a1a,#222)' }}>{c.emoji}</div>
                <div style={{ padding: '.85rem 1rem .75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.4rem', marginBottom: '.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{c.nombre}</div>
                    <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.35rem', color: 'var(--red)', whiteSpace: 'nowrap' }}>${Number(c.precio).toFixed(2)}</div>
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--gray)', marginBottom: '.75rem', lineHeight: 1.5 }}>{c.alitas} alitas · {c.descripcion}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {c.estado === 'agotado'
                      ? <span style={{ background: 'rgba(127,29,29,.5)', color: '#fca5a5', fontSize: '.7rem', fontWeight: 700, letterSpacing: 1, padding: '.18rem .55rem', borderRadius: 6 }}>🚫 Agotado</span>
                      : <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); selectCombo(c) }}>+ Select Options</button>
                    }
                    {selCombo?.id === c.id && <span style={{ background: 'var(--red)', color: '#fff', fontSize: '.7rem', fontWeight: 700, padding: '.18rem .55rem', borderRadius: 6 }}>✔ Selected</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* EXTRAS */}
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.6rem', letterSpacing: 1, color: 'var(--gray)', marginBottom: '.3rem' }}>¿Olvidaste algo? 🤔</div>
            <div style={{ fontSize: '.82rem', color: 'var(--gray)', marginBottom: '1.25rem' }}>Agrega arroz o bebidas extra sin hacer un nuevo combo.</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              {/* Solo Arroz */}
              <div style={{ background: 'linear-gradient(135deg,#1a1208,#1d1d1d)', border: '1.5px solid rgba(161,110,55,.3)', borderRadius: 'var(--radius)', padding: '1.2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🍚</div>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.1rem' }}>Solo Arroz</div>
                <div style={{ fontSize: '.75rem', color: 'var(--gray)', marginBottom: '.85rem' }}>Porción extra de arroz</div>
                {tiposArroz.length === 0
                  ? <p style={{ color: 'var(--gray)', fontSize: '.8rem' }}>Sin tipos de arroz disponibles.</p>
                  : tiposArroz.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '.42rem .7rem', marginBottom: '.35rem' }}>
                      <div style={{ fontSize: '.84rem', fontWeight: 500 }}>{t.emoji} {t.nombre} <span style={{ color: 'var(--yellow)', fontSize: '.72rem' }}>${Number(t.precio).toFixed(2)}</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <QtyBtn onClick={() => setEaQty(p => ({ ...p, [t.id]: Math.max(0, (p[t.id] || 0) - 1) }))} disabled={(eaQty[t.id] || 0) === 0}>−</QtyBtn>
                        <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1rem', minWidth: 18, textAlign: 'center', color: (eaQty[t.id] || 0) > 0 ? 'var(--yellow)' : 'inherit' }}>{eaQty[t.id] || 0}</span>
                        <QtyBtn onClick={() => setEaQty(p => ({ ...p, [t.id]: (p[t.id] || 0) + 1 }))}>+</QtyBtn>
                      </div>
                    </div>
                  ))}
                <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '.38rem .7rem', fontSize: '.82rem', fontWeight: 700, color: 'var(--yellow)', textAlign: 'right', marginBottom: '.6rem' }}>
                  Total: ${tiposArroz.reduce((acc, t) => acc + t.precio * (eaQty[t.id] || 0), 0).toFixed(2)}
                </div>
                <div style={{ marginBottom: '.5rem' }}>
                  <label style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray)', display: 'block', marginBottom: '.3rem' }}>Mesa</label>
                  <input type="number" value={eaMesa} onChange={e => setEaMesa(e.target.value)} placeholder="Nº mesa" min="1" style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.5rem .7rem', borderRadius: 8, fontSize: '.85rem', outline: 'none' }} />
                </div>
                <button className="btn btn-red btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={pedirExtraArroz}>➤ Pedir Arroz</button>
              </div>

              {/* Solo Bebida */}
              <div style={{ background: 'linear-gradient(135deg,#080f1a,#1d1d1d)', border: '1.5px solid rgba(96,165,250,.2)', borderRadius: 'var(--radius)', padding: '1.2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🥤</div>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.1rem' }}>Solo Bebidas</div>
                <div style={{ fontSize: '.75rem', color: 'var(--gray)', marginBottom: '.85rem' }}>Agrega bebidas a tu mesa</div>
                {bebidas.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '.38rem .65rem', marginBottom: '.35rem' }}>
                    <div>
                      <div style={{ fontSize: '.8rem', fontWeight: 500 }}>{b.emoji} {b.nombre}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--yellow)' }}>${b.precio.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                      <QtyBtn onClick={() => setEbCounts(p => ({ ...p, [b.id]: Math.max(0, (p[b.id] || 0) - 1) }))} disabled={(ebCounts[b.id] || 0) === 0}>−</QtyBtn>
                      <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1rem', minWidth: 14, textAlign: 'center', color: (ebCounts[b.id] || 0) > 0 ? 'var(--yellow)' : 'inherit' }}>{ebCounts[b.id] || 0}</span>
                      <QtyBtn onClick={() => setEbCounts(p => ({ ...p, [b.id]: (p[b.id] || 0) + 1 }))}>+</QtyBtn>
                    </div>
                  </div>
                ))}
                <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '.38rem .7rem', fontSize: '.82rem', fontWeight: 700, color: 'var(--yellow)', textAlign: 'right', marginBottom: '.6rem' }}>
                  Total: ${bebidas.reduce((acc, b) => acc + b.precio * (ebCounts[b.id] || 0), 0).toFixed(2)}
                </div>
                <div style={{ marginBottom: '.5rem' }}>
                  <label style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray)', display: 'block', marginBottom: '.3rem' }}>Mesa</label>
                  <input type="number" value={ebMesa} onChange={e => setEbMesa(e.target.value)} placeholder="Nº mesa" min="1" style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.5rem .7rem', borderRadius: 8, fontSize: '.85rem', outline: 'none' }} />
                </div>
                <button className="btn btn-blue btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={pedirExtraBebida}>➤ Pedir Bebidas</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div id="order-sidebar" style={{
          background: 'var(--bg2)', borderLeft: isMobile ? 'none' : '1px solid var(--border)',
          padding: '1.1rem', position: isMobile ? 'fixed' : 'sticky',
          bottom: isMobile ? 0 : undefined, left: isMobile ? 0 : undefined,
          right: isMobile ? 0 : undefined, top: isMobile ? undefined : 'var(--nav)',
          height: isMobile ? (sidebarExpanded ? '70vh' : '54px') : 'calc(100vh - var(--nav))',
          maxHeight: isMobile ? '70vh' : undefined,
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.85rem',
          borderTop: isMobile ? '2px solid var(--red)' : 'none',
          borderRadius: isMobile ? '18px 18px 0 0' : undefined,
          zIndex: isMobile ? 800 : undefined,
          transition: isMobile ? 'height .3s ease' : undefined
        }}>
          {isMobile && (
            <div onClick={() => setSidebarExpanded(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--red)', margin: '-1.1rem -1.1rem .85rem', padding: '.8rem 1.1rem', cursor: 'pointer', borderRadius: '18px 18px 0 0' }}>
              <span style={{ fontWeight: 700, fontSize: '.88rem' }}>🛒 Personalizar Pedido</span>
              <span>{sidebarExpanded ? '▼' : '▲'}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Customize Order</div>
            <div style={{ background: 'rgba(232,34,10,.15)', color: 'var(--red)', border: '1px solid rgba(232,34,10,.3)', fontSize: '.72rem', fontWeight: 700, padding: '.18rem .6rem', borderRadius: 20, whiteSpace: 'nowrap' }}>{selCombo ? selCombo.nombre : '— Elige un combo'}</div>
          </div>
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

          {/* Tipo */}
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.55rem' }}>Tipo de Pedido</div>
            <div style={{ display: 'flex', gap: '.5rem', background: 'var(--bg4)', borderRadius: 10, padding: '.35rem' }}>
              {[['servir', '🍽 Servir', 'active-servir'], ['llevar', '🥡 Llevar', 'active-llevar'], ['domicilio', '🛵 Domicilio', 'active-domicilio']].map(([v, label, cls]) => (
                <button key={v} onClick={() => setTipoServicio(v)} style={{
                  flex: 1, background: tipoServicio === v ? (v === 'servir' ? 'var(--red)' : v === 'llevar' ? 'rgba(255,198,51,.15)' : 'rgba(96,165,250,.15)') : 'none',
                  border: tipoServicio === v && v !== 'servir' ? `1px solid ${v === 'llevar' ? 'rgba(255,198,51,.25)' : 'rgba(96,165,250,.3)'}` : 'none',
                  color: tipoServicio === v ? (v === 'servir' ? '#fff' : v === 'llevar' ? 'var(--yellow)' : 'var(--blue)') : 'var(--gray)',
                  fontSize: '.8rem', fontWeight: 600, padding: '.4rem .3rem', borderRadius: 7, cursor: 'pointer', transition: 'all .2s'
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

          {/* Salsas */}
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.55rem' }}>
              {selCombo ? `Selecciona tus Salsas (${selCombo.alitas} total)` : 'Selecciona tus Salsas'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.7rem' }}>
              <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? 'var(--green)' : 'linear-gradient(90deg,var(--red),var(--orange))', borderRadius: 3, transition: 'width .3s' }} />
              </div>
              <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.05rem', color: pct >= 100 ? 'var(--green)' : 'var(--yellow)', whiteSpace: 'nowrap' }}>{totalSalsas} / {maxAlitas}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
              {SALSAS.map(s => (
                <div key={s} style={{ background: salsas[s] > 0 ? 'rgba(232,34,10,.09)' : 'var(--bg4)', border: `1.5px solid ${salsas[s] > 0 ? 'var(--red)' : 'var(--border)'}`, borderRadius: 9, padding: '.42rem .52rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all .15s' }}>
                  <span style={{ fontSize: '.73rem', fontWeight: 500, flex: 1 }}>{s}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.2rem' }}>
                    <QtyBtn small onClick={() => changeSalsa(s, -1)} disabled={salsas[s] === 0}>−</QtyBtn>
                    <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '.9rem', minWidth: 13, textAlign: 'center' }}>{salsas[s]}</span>
                    <QtyBtn small onClick={() => changeSalsa(s, 1)} disabled={totalSalsas >= maxAlitas || !selCombo}>+</QtyBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

          {/* Arroz */}
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.55rem' }}>Arroz <span style={{ fontSize: '.65rem', color: 'var(--gray)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '.3rem', background: 'rgba(255,255,255,.07)', padding: '.08rem .38rem', borderRadius: 5 }}>Opcional</span></div>
            {tiposArroz.length === 0
              ? <div style={{ color: 'var(--gray)', fontSize: '.8rem' }}>Sin tipos de arroz disponibles.</div>
              : tiposArroz.map(t => (
                <div key={t.id} onClick={() => setArrozQty(p => ({ ...p, [t.id]: (p[t.id] || 0) > 0 ? 0 : 1 }))}
                  style={{ background: (arrozQty[t.id] || 0) > 0 ? 'rgba(232,34,10,.08)' : 'var(--bg4)', border: `1.5px solid ${(arrozQty[t.id] || 0) > 0 ? 'var(--red)' : 'var(--border)'}`, borderRadius: 9, padding: '.48rem .72rem', display: 'flex', alignItems: 'center', gap: '.55rem', cursor: 'pointer', transition: 'all .2s', marginBottom: '.35rem' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                    <span>{t.emoji}</span><span style={{ fontSize: '.84rem', fontWeight: 500 }}>{t.nombre}</span>
                    <span style={{ fontSize: '.7rem', color: 'var(--yellow)', fontWeight: 600, marginLeft: 'auto' }}>${Number(t.precio).toFixed(2)}</span>
                  </div>
                  {(arrozQty[t.id] || 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.28rem' }} onClick={e => e.stopPropagation()}>
                      <QtyBtn small onClick={() => setArrozQty(p => ({ ...p, [t.id]: Math.max(0, (p[t.id] || 0) - 1) }))} disabled={(arrozQty[t.id] || 0) <= 1}>−</QtyBtn>
                      <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '.9rem', minWidth: 13, textAlign: 'center' }}>{arrozQty[t.id]}</span>
                      <QtyBtn small onClick={() => setArrozQty(p => ({ ...p, [t.id]: (p[t.id] || 0) + 1 }))}>+</QtyBtn>
                    </div>
                  )}
                </div>
              ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

          {/* Bebidas */}
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.55rem' }}>Bebidas <span style={{ fontSize: '.65rem', color: 'var(--gray)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '.3rem', background: 'rgba(255,255,255,.07)', padding: '.08rem .38rem', borderRadius: 5 }}>Opcional</span></div>
            <BebSep label="Sin alcohol" />
            {normales.map(b => <BebRow key={b.id} b={b} count={bebCounts[b.id] || 0} onChange={(d) => setBebCounts(p => ({ ...p, [b.id]: Math.max(0, (p[b.id] || 0) + d) }))} />)}
            <BebSep label="Alcohólicas" />
            {alcohol.map(b => <BebRow key={b.id} b={b} count={bebCounts[b.id] || 0} onChange={(d) => setBebCounts(p => ({ ...p, [b.id]: Math.max(0, (p[b.id] || 0) + d) }))} />)}
          </div>
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

          {/* Mesa / Dirección */}
          {tipoServicio !== 'domicilio' ? (
            <div>
              <label style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: '.35rem' }}>Número de Mesa</label>
              <input type="number" value={mesa} onChange={e => setMesa(e.target.value)} min="1" max="99" placeholder="Ej. 12" style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.52rem .75rem', borderRadius: 9, fontSize: '.85rem', outline: 'none' }} />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: '.35rem' }}>📍 Dirección de Entrega</label>
              <textarea value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle, número, referencia..." rows={2} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.52rem .75rem', borderRadius: 9, fontSize: '.85rem', outline: 'none', resize: 'vertical', minHeight: 50 }} />
            </div>
          )}

          {/* Mensaje */}
          <div>
            <label style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--gray)', display: 'block', marginBottom: '.35rem' }}>Instrucciones <span style={{ fontSize: '.65rem', color: 'var(--gray)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, background: 'rgba(255,255,255,.07)', padding: '.08rem .38rem', borderRadius: 5 }}>Opcional</span></label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Agregar nota..." rows={2} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--white)', padding: '.52rem .75rem', borderRadius: 9, fontSize: '.85rem', outline: 'none', resize: 'vertical', minHeight: 50 }} />
          </div>

          {/* Total */}
          <div style={{ background: 'var(--bg4)', borderRadius: 10, padding: '.85rem', flexShrink: 0 }}>
            {[['Combo', (selCombo?.precio || 0).toFixed(2)], ['Arroz', arrozCost.toFixed(2)], ['Bebidas', bebCost.toFixed(2)]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.28rem', color: 'var(--gray)' }}><span>{l}</span><span>${v}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '.98rem', paddingTop: '.42rem', borderTop: '1px solid var(--border)', marginTop: '.42rem' }}>
              <span>Total</span><span style={{ color: 'var(--red)' }}>${total.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: '.66rem', color: 'var(--gray)', textAlign: 'center', marginTop: '.3rem' }}>Precios incluyen impuestos</div>
          </div>

          <button className="btn btn-red" disabled={!canOrder} onClick={() => {
            if (!selCombo) return
            if (tipoServicio !== 'domicilio' && !mesa) { showToast('error', '⚠️', 'Error', 'Ingresa el número de mesa.'); return }
            if (tipoServicio === 'domicilio' && !direccion) { showToast('error', '⚠️', 'Error', 'Ingresa la dirección de entrega.'); return }
            setOcOpen(true)
          }} style={{ width: '100%', justifyContent: 'center', padding: '.82rem', flexShrink: 0 }}>
            ➤ Send Order
          </button>
        </div>
      </div>

      {/* CONFIRM COMBO */}
      {ccCombo && (
        <div className="overlay">
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(232,34,10,.35)', borderRadius: 20, padding: '1.85rem', maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.9rem', letterSpacing: 1, marginBottom: '.22rem' }}>🍗 Confirmar Combo</h3>
            <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '.9rem', margin: '.9rem 0', fontSize: '.88rem', lineHeight: 1.8, textAlign: 'center' }}>
              <div style={{ fontSize: '2.3rem', marginBottom: '.4rem' }}>{ccCombo.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.2rem' }}>{ccCombo.nombre}</div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.9rem', color: 'var(--yellow)' }}>${Number(ccCombo.precio).toFixed(2)}</div>
              <div style={{ color: 'var(--gray)', fontSize: '.83rem' }}>🍗 {ccCombo.alitas} alitas · {ccCombo.descripcion}</div>
            </div>
            <div style={{ display: 'flex', gap: '.65rem', marginTop: '.9rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCcCombo(null)}>✕ Cancelar</button>
              <button className="btn btn-red" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmCombo}>✔ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ORDER */}
      {ocOpen && selCombo && (
        <ConfirmOrderModal selCombo={selCombo} salsas={salsas} arrozQty={arrozQty} bebCounts={bebCounts} bebidas={bebidas} tiposArroz={tiposArroz} tipoServicio={tipoServicio} mesa={mesa} direccion={direccion} mensaje={mensaje} total={total} onClose={() => setOcOpen(false)} onConfirm={doEnviarPedido} />
      )}
    </div>
  )
}

function QtyBtn({ children, onClick, disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: small ? 19 : 22, height: small ? 19 : 22, borderRadius: small ? 5 : 6, background: 'rgba(255,255,255,.08)', border: 'none', color: 'var(--white)', cursor: 'pointer', fontSize: small ? '.82rem' : '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s', opacity: disabled ? .22 : 1, flexShrink: 0 }}>{children}</button>
  )
}

function BebSep({ label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', margin: '.28rem 0' }}>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    <span style={{ fontSize: '.65rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
  </div>
}

function BebRow({ b, count, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.38rem 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '.8rem', fontWeight: 500 }}>{b.emoji} {b.nombre}</div>
        <div style={{ fontSize: '.68rem', color: 'var(--yellow)' }}>${b.precio.toFixed(2)} c/u</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.28rem' }}>
        <QtyBtn small onClick={() => onChange(-1)} disabled={count === 0}>−</QtyBtn>
        <span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '.9rem', minWidth: 15, textAlign: 'center' }}>{count}</span>
        <QtyBtn small onClick={() => onChange(1)}>+</QtyBtn>
      </div>
    </div>
  )
}

function ConfirmOrderModal({ selCombo, salsas, arrozQty, bebCounts, bebidas, tiposArroz, tipoServicio, mesa, direccion, mensaje, total, onClose, onConfirm }) {
  const tipoLabel = { servir: '🍽 Servir en mesa', llevar: '🥡 Llevar', domicilio: '🛵 Domicilio' }
  const salsList = Object.entries(salsas).filter(([, v]) => v > 0).map(([s, c]) => `${s} ×${c}`).join(', ') || '—'
  const arrozStr = tiposArroz.filter(t => (arrozQty[t.id] || 0) > 0).map(t => `${t.emoji} ${t.nombre} ×${arrozQty[t.id]}`).join(' + ') || 'Sin arroz'
  const bebList = bebidas.filter(b => (bebCounts[b.id] || 0) > 0).map(b => `${b.emoji} ${b.nombre} ×${bebCounts[b.id]}`).join(', ') || '—'
  const Row = ({ l, v }) => <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.28rem', marginBottom: '.28rem', fontSize: '.86rem' }}><span style={{ color: 'var(--gray)' }}>{l}</span><span style={{ textAlign: 'right', maxWidth: 200 }}>{v}</span></div>
  return (
    <div className="overlay">
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 20, padding: '1.85rem', maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.9rem', letterSpacing: 1, marginBottom: '.85rem', color: 'var(--green)' }}>✅ Confirmar Pedido</h3>
        <p style={{ color: 'var(--gray)', fontSize: '.85rem', marginBottom: '.65rem' }}>Revisa tu pedido antes de enviarlo:</p>
        <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '1.05rem', marginBottom: '.85rem', fontSize: '.86rem', lineHeight: 2 }}>
          <Row l="📋 Tipo" v={tipoLabel[tipoServicio]} />
          <Row l="🍗 Combo" v={`${selCombo.nombre} — $${Number(selCombo.precio).toFixed(2)}`} />
          <Row l="🫙 Salsas" v={salsList} />
          <Row l="🍚 Arroz" v={arrozStr} />
          <Row l="🥤 Bebidas" v={bebList} />
          {tipoServicio !== 'domicilio' && <Row l="🪑 Mesa" v={`#${mesa}`} />}
          {tipoServicio === 'domicilio' && <Row l="📍 Dirección" v={direccion} />}
          {mensaje && <Row l="💬 Nota" v={`"${mensaje}"`} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '.98rem', paddingTop: '.45rem', borderTop: '1px solid var(--border)', marginTop: '.3rem' }}>
            <span>Total a pagar</span><span style={{ color: 'var(--yellow)', fontFamily: "'Bebas Neue',cursive", fontSize: '1.35rem' }}>${total.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.65rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>✕ Cancelar</button>
          <button className="btn btn-red" style={{ flex: 1, justifyContent: 'center' }} onClick={onConfirm}>🚀 Confirmar y Enviar</button>
        </div>
      </div>
    </div>
  )
}

function SuccessOverlay({ dom, onNew, onStatus }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.97)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '2rem', animation: 'fadeIn .4s ease' }}>
      <div style={{ fontSize: '5rem', animation: 'bounce .6s ease .3s both' }}>✅</div>
      <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '3rem', color: 'var(--green)', letterSpacing: 2 }}>{dom ? '¡Pedido en Camino!' : '¡Pedido Enviado!'}</h2>
      <p style={{ color: 'var(--gray)', maxWidth: 320 }}>Tu pedido fue recibido. Espera aproximadamente <strong style={{ color: 'var(--white)' }}>{dom ? '25 minutos' : '10 minutos'}</strong>.</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={onNew}>Hacer otro pedido</button>
        <button className="btn btn-red" onClick={onStatus}>Ver mi pedido</button>
      </div>
    </div>
  )
}
