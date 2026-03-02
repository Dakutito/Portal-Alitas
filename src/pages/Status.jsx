import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import StatusCard from '../components/StatusCard'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Status() {
  const { user, showToast } = useStore()
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState([])
  const [salsasMap, setSalsasMap] = useState({})
  const [extrasMap, setExtrasMap] = useState({})
  const [combos, setCombos] = useState([])
  const [tiposArroz, setTiposArroz] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    loadData()
    // Realtime
    const ch = supabase.channel('status-updates').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `usuario_id=eq.${user.id}` }, () => loadData()).subscribe()
    const interval = setInterval(loadData, 5000)
    return () => { supabase.removeChannel(ch); clearInterval(interval) }
  }, [user])

  const loadData = async () => {
    const [pRes, cRes, aRes] = await Promise.all([
      supabase.from('pedidos').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false }),
      supabase.from('combos').select('*'),
      supabase.from('tipos_arroz').select('*'),
    ])
    const allP = pRes.data || []
    setPedidos(allP)
    setCombos(cRes.data || [])
    setTiposArroz(aRes.data || [])
    // Load salsas and extras for all pedidos
    if (allP.length) {
      const ids = allP.map(p => p.id)
      const [sRes, eRes] = await Promise.all([
        supabase.from('pedido_salsas').select('*').in('pedido_id', ids),
        supabase.from('pedido_extras').select('*').in('pedido_id', ids),
      ])
      const sm = {}; (sRes.data || []).forEach(s => { if (!sm[s.pedido_id]) sm[s.pedido_id] = []; sm[s.pedido_id].push(s) })
      const em = {}; (eRes.data || []).forEach(e => { if (!em[e.pedido_id]) em[e.pedido_id] = []; em[e.pedido_id].push(e) })
      setSalsasMap(sm); setExtrasMap(em)
    }
    setLoading(false)
  }

  const activos = pedidos.filter(p => !['completado', 'eliminado'].includes(p.estado))
  const hist = pedidos.filter(p => ['completado', 'eliminado'].includes(p.estado))

  const limpiarHistorial = () => setConfirm({
    msg: '¿Eliminar todo tu historial? Esta acción no se puede deshacer.',
    onConfirm: async () => {
      const ids = hist.map(p => p.id)
      if (ids.length) await supabase.from('pedidos').delete().in('id', ids)
      setConfirm(null); loadData(); showToast('success', '🗑', 'Historial eliminado', '')
    }
  })

  return (
    <div style={{ paddingTop: 'calc(var(--nav) + 2rem)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '2.4rem', letterSpacing: 1, marginBottom: '.4rem' }}>📦 Mis Pedidos</h1>
          <p style={{ color: 'var(--gray)', fontSize: '.9rem' }}>Estado en tiempo real de tus pedidos activos</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { loadData(); showToast('info', '🔄', 'Actualizado', '') }}>🔄 Actualizar Estado</button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>Cargando...</div>}

        {!loading && activos.length === 0 && (
          <div className="no-orders">
            <span className="no-orders-icon">🍗</span>
            <p>No tienes pedidos activos.</p>
            <button className="btn btn-red" style={{ marginTop: '1rem' }} onClick={() => navigate('/order')}>Hacer un pedido</button>
          </div>
        )}

        {activos.map(p => (
          <StatusCard key={p.id} pedido={p} salsas={salsasMap[p.id] || []} extras={extrasMap[p.id] || []} combos={combos} tiposArroz={tiposArroz} />
        ))}

        {hist.length > 0 && (
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '.65rem' }}>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.75rem', letterSpacing: 1, color: 'var(--gray)' }}>📜 Historial de Compras</div>
              <button className="btn btn-danger btn-sm" onClick={limpiarHistorial}>🗑 Limpiar</button>
            </div>
            {hist.map(p => (
              <StatusCard key={p.id} pedido={p} salsas={salsasMap[p.id] || []} extras={extrasMap[p.id] || []} combos={combos} tiposArroz={tiposArroz} isHist />
            ))}
          </div>
        )}
      </div>
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
