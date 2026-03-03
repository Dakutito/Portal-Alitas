const SI_MAP = {
  pendiente: { cls: 'st-pendiente', label: '⏳ Pendiente', icon: '⏳' },
  preparacion: { cls: 'st-preparacion', label: '🔥 En preparación', icon: '🔥' },
  listo: { cls: 'st-listo', label: '✅ Listo', icon: '✅' },
  completado: { cls: 'st-completado', label: '✔ Completado', icon: '✔' },
  eliminado: { cls: 'st-eliminado', label: '❌ Cancelado', icon: '❌' },
}
const TIPO_LABEL = { servir: '🍽 Servir en mesa', llevar: '🥡 Llevar', domicilio: '🛵 Domicilio' }

export default function StatusCard({ pedido, salsas, extras, combos, tiposArroz, isHist = false }) {
  const combo = combos?.find(c => c.id === pedido.combo_id)
  const sx = SI_MAP[pedido.estado] || SI_MAP.completado
  const arrozItems = buildArroz(pedido, tiposArroz)
  const sauceItems = salsas.map(s => ({ name: s.tipo_salsa, qty: s.cantidad }))
  const drinkItems = extras.map(e => ({ name: e.nombre, qty: e.cantidad }))
  const adicional = pedido.adicional || {}
  const adicionalTotal = Number(adicional.arroz || 0) + Number(adicional.bebidas || 0) + Number(adicional.papas || 0)
  const tipoLabel = TIPO_LABEL[pedido.tipo] || ''
  const esExtra = pedido.es_extra
  const extraTitle = esExtra
    ? (pedido.tipo_extra === 'arroz' ? '🍚 Solo Arroz' : pedido.tipo_extra === 'papas' ? '🍟 Solo Papas' : '🥤 Solo Bebidas')
    : `🍗 ${combo?.nombre || 'Combo'}`
  const mainTitle = (pedido.tipo !== 'domicilio' && pedido.mesa) ? `${extraTitle} — Mesa ${pedido.mesa}` : extraTitle

  return (
    <div className={`status-card ${isHist ? 'historial-card' : ''}`} style={isHist ? { opacity: .68 } : {}}>
      <div className="sc-header">
        <div className="sc-title-area">
          <span className="sc-combo-title">{mainTitle}</span>
          {pedido.modificado && <span className="mod-badge">ACTUALIZADO</span>}
        </div>
      </div>

      <div className={`pill-status ${sx.cls}`}>{sx.icon} {sx.label.replace(/^[^\s]+\s/, '')}</div>

      <div className="sc-info-row">
        <div className="sc-info-item"><span>{tipoLabel.split(' ')[0]}</span>{tipoLabel.split(' ').slice(1).join(' ')}</div>
        <div className="sc-info-item"><span>📅</span>{new Date(pedido.created_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      {arrozItems.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '1.15rem', fontWeight: 700, marginBottom: '.5rem', color: 'var(--white)' }}>
          {a.name} <span style={{ color: 'var(--orange)', marginLeft: '.4rem' }}>×{a.qty}</span>
        </div>
      ))}

      {adicional.papas > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '1.15rem', fontWeight: 700, marginBottom: '.5rem', color: 'var(--white)' }}>
          🍟 Porción de Papas <span style={{ color: 'var(--orange)', marginLeft: '.4rem' }}>×{Math.round(adicional.papas / 1)}</span>
        </div>
      )}

      {(sauceItems.length > 0 || drinkItems.length > 0) && (
        <div className="sc-items-container">
          {sauceItems.length > 0 && (
            <>
              <div className="sc-section-title"><span>🟡</span> SALSAS / SAUCES</div>
              <div className="sc-chip-grid" style={{ marginBottom: drinkItems.length > 0 ? '1.5rem' : 0 }}>
                {sauceItems.map((it, i) => (
                  <div key={i} className="sc-chip">
                    <span className="sc-chip-name">{it.name}</span>
                    <span className="sc-chip-qty">×{it.qty}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {drinkItems.length > 0 && (
            <>
              <div className="sc-section-title"><span>🍟</span> ADICIONALES / EXTRAS</div>
              <div className="sc-chip-grid">
                {drinkItems.map((it, i) => (
                  <div key={i} className="sc-chip">
                    <span className="sc-chip-name">{it.name}</span>
                    <span className="sc-chip-qty">×{it.qty}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {adicionalTotal > 0 && (
        <div className="sc-additional-box">
          <div className="sc-add-title"><span>➕</span> DESGLOSE DE EXTRAS</div>
          {Number(adicional.arroz || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(242,237,230,.75)', marginBottom: '.2rem', fontSize: '.8rem' }}>
              <span>🍚 Total Arroz</span><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>${Number(adicional.arroz).toFixed(2)}</span>
            </div>
          )}
          {Number(adicional.bebidas || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(242,237,230,.75)', marginBottom: '.2rem', fontSize: '.8rem' }}>
              <span>🥤 Total Bebidas</span><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>${Number(adicional.bebidas).toFixed(2)}</span>
            </div>
          )}
          {Number(adicional.papas || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(242,237,230,.75)', marginBottom: '.2rem', fontSize: '.8rem' }}>
              <span>🍟 Total Papas</span><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>${Number(adicional.papas).toFixed(2)}</span>
            </div>
          )}
          {(adicional.items || []).map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(242,237,230,.75)', marginBottom: '.2rem', fontSize: '.8rem', borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '.2rem' }}>
              <span>{it.desc}</span><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>${Number(it.subtotal).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid rgba(167,139,250,.2)', marginTop: '.4rem', paddingTop: '.4rem', fontSize: '.82rem' }}>
            <span style={{ color: 'var(--purple)' }}>Total adicional</span>
            <span style={{ color: 'var(--yellow)' }}>${adicionalTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {pedido.tipo === 'domicilio' && (pedido.direccion || pedido.telefono) && (
        <div style={{ marginTop: '1rem', padding: '.8rem', background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.2)', borderRadius: 10 }}>
          <div style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span>📍</span> DIRECCIÓN / CONTACTO
          </div>
          {pedido.direccion && (
            <div style={{ fontSize: '.9rem', color: 'var(--white)', fontWeight: 500, lineHeight: 1.4, marginBottom: pedido.telefono ? '.4rem' : 0 }}>
              {pedido.direccion}
            </div>
          )}
          {pedido.telefono && (
            <div style={{ fontSize: '.9rem', color: 'var(--yellow)', fontWeight: 600 }}>
              📞 Tel: {pedido.telefono}
            </div>
          )}
        </div>
      )}

      {pedido.mensaje && (
        <div style={{ marginTop: '1rem', padding: '.8rem', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <span>💬</span> NOTA DEL CLIENTE
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--white)', fontStyle: 'italic' }}>
            "{pedido.mensaje}"
          </div>
        </div>
      )}

      <div className="sc-total-row">
        <div className="sc-total-label"><span>💳</span> VALOR TOTAL</div>
        <div className="sc-total-amount">${Number(pedido.total || combo?.precio || 0).toFixed(2)}</div>
      </div>

      {!isHist && !['completado', 'eliminado', 'listo'].includes(pedido.estado) && (
        <div className="sc-nav-status">
          {['pendiente', 'preparacion', 'listo'].map((st, i) => (
            <div key={st} className={`sc-nav-item ${pedido.estado === st ? 'active' : ''}`}>
              <span className="sc-nav-icon">{['⏳', '🔥', '✅'][i]}</span>
              {['PENDIENTE', 'PREPARANDO', 'LISTO'][i]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function buildArroz(pedido, tiposArroz) {
  const items = []
  const arroz = pedido.arroz || {}
  Object.entries(arroz).forEach(([id, qty]) => {
    if (qty > 0) {
      const t = tiposArroz?.find(x => String(x.id) === String(id))
      if (t) items.push({ name: `${t.emoji || '🍚'} ${t.nombre}`, qty })
    }
  })
  return items
}
