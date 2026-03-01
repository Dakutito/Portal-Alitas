import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import AuthModal from '../components/AuthModal'

const SALSAS = ['BBQ', 'Honey', 'BBQ Picante', 'Queso', 'Champiñones', 'Sin salsa', 'Variadas']
const SABORES = [
  { icon: '🔥', name: 'BBQ Clásica', level: 'Nivel: Suave 😊' },
  { icon: '🍯', name: 'Honey', level: 'Nivel: Dulce 🍬' },
  { icon: '🌶️', name: 'BBQ Picante', level: 'Nivel: Picante 🔥' },
  { icon: '🧀', name: 'Queso', level: 'Nivel: Cremoso 🤤' },
  { icon: '🍄', name: 'Champiñones', level: 'Nivel: Terroso 🌿' },
  { icon: '🎉', name: 'Variadas', level: 'Mix de todo 🎲' },
]

export default function Home() {
  const [combos, setCombos] = useState([])
  const [oferta, setOferta] = useState(null)
  const [timer, setTimer] = useState({ h: '00', m: '00', s: '00' })
  const [authOpen, setAuthOpen] = useState(false)
  const { user, profile } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('combos').select('*').then(({ data }) => setCombos(data || []))
    supabase.from('oferta').select('*').order('id', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data[0] && data[0].activa) setOferta(data[0])
    })
  }, [])

  useEffect(() => {
    if (!oferta) return
    const tick = () => {
      const rem = new Date(oferta.fecha_fin) - new Date()
      if (rem <= 0) { setOferta(null); return }
      const h = Math.floor(rem / 3600000), m = Math.floor((rem % 3600000) / 60000), s = Math.floor((rem % 60000) / 1000)
      setTimer({ h: String(h).padStart(2, '0'), m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [oferta])

  const handleOrder = () => {
    if (!user) { setAuthOpen(true); return }
    navigate('/order')
  }

  return (
    <div style={{ paddingTop: 'var(--nav)' }}>
      {/* HERO */}
      <section style={{
        minHeight: 'calc(100vh - var(--nav))', background: 'linear-gradient(135deg,#0e0e0e 0%,#1a0804 40%,#0e0e0e 100%)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '4rem 5vw', gap: '2rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 60% 50%,rgba(232,34,10,.12),transparent 70%)', pointerEvents: 'none' }} />
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(255,198,51,.12)', border: '1px solid rgba(255,198,51,.3)', color: 'var(--yellow)', fontSize: '.78rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '.3rem .85rem', borderRadius: 20, marginBottom: '1.5rem' }}>
            🔥 Sabor Explosivo
          </div>
          <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 'clamp(3.5rem,7vw,6.5rem)', lineHeight: .95, letterSpacing: 2, marginBottom: '1rem' }}>
            LAS ALITAS<br />MÁS <span style={{ color: 'var(--red)' }}>CRUJIENTES</span>
          </h1>
          <p style={{ color: 'rgba(242,237,230,.6)', fontSize: '1.05rem', maxWidth: 420, marginBottom: '2rem', lineHeight: 1.7 }}>
            Elaboradas con ingredientes premium y nuestras salsas secretas. Cada mordida es una experiencia.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-red" onClick={handleOrder}>🍗 Pedir Ahora</button>
            <button className="btn btn-ghost" onClick={() => document.getElementById('sec-combos')?.scrollIntoView({ behavior: 'smooth' })}>Ver Menú</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 'min(420px,42vw)', aspectRatio: 1, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,34,10,.2),transparent 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 'clamp(7rem,14vw,13rem)', filter: 'drop-shadow(0 20px 60px rgba(232,34,10,.5))', animation: 'float 4s ease-in-out infinite' }}>🍗</span>
          </div>
        </div>
      </section>

      {/* COMBOS */}
      <section style={{ padding: '5rem 5vw' }} id="sec-combos">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <span className="section-tag">Nuestros Combos</span>
          <h2 className="section-title">Elige tu Favorito</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1.2rem' }}>
            {combos.map(c => (
              <div key={c.id} onClick={c.estado !== 'agotado' ? handleOrder : undefined}
                style={{
                  background: c.es_jueves ? 'linear-gradient(135deg,#1a1200,#1d1d1d)' : 'var(--bg3)',
                  border: `1px solid ${c.es_jueves ? 'rgba(255,198,51,.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)', padding: '1.4rem', transition: 'all .3s', position: 'relative',
                  overflow: 'hidden', cursor: c.estado === 'agotado' ? 'not-allowed' : 'pointer',
                  opacity: c.estado === 'agotado' ? .5 : 1
                }}
              >
                {c.estado === 'agotado' && <span style={{ position: 'absolute', top: '.9rem', right: '.9rem', background: 'rgba(127,29,29,.4)', color: '#fca5a5', fontSize: '.68rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '.2rem .55rem', borderRadius: 6 }}>🚫 Agotado</span>}
                {c.es_jueves && c.estado !== 'agotado' && <span style={{ position: 'absolute', top: '.9rem', right: '.9rem', background: 'rgba(255,198,51,.15)', color: 'var(--yellow)', border: '1px solid rgba(255,198,51,.3)', fontSize: '.68rem', fontWeight: 700, padding: '.2rem .55rem', borderRadius: 6 }}>🔥 Especial</span>}
                <div style={{ fontSize: '2.3rem', marginBottom: '.65rem' }}>{c.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.2rem' }}>{c.nombre}</div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '2rem', color: 'var(--yellow)', lineHeight: 1, margin: '.2rem 0' }}>${Number(c.precio).toFixed(2)}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--gray)', marginBottom: '.35rem' }}>🍗 {c.alitas} alitas</div>
                <div style={{ fontSize: '.8rem', color: 'var(--gray)', marginBottom: '1.1rem', lineHeight: 1.5 }}>{c.descripcion}</div>
                <button className={`btn btn-sm ${c.estado === 'agotado' ? 'btn-ghost' : 'btn-red'}`} disabled={c.estado === 'agotado'}>
                  {c.estado === 'agotado' ? 'No disponible' : '+ Seleccionar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTA ESPECIAL */}
      {oferta && (
        <section style={{ padding: '2rem 5vw' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a1000,#1d0d00)', border: '1.5px solid rgba(255,198,51,.35)', borderRadius: 20, padding: '2.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-1.5rem', top: '-1rem', fontSize: '10rem', opacity: .07, pointerEvents: 'none' }}>🔥</div>
              <div>
                <div style={{ display: 'inline-flex', background: 'rgba(232,34,10,.2)', color: 'var(--red)', border: '1px solid rgba(232,34,10,.3)', fontSize: '.73rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '.28rem .75rem', borderRadius: 20, marginBottom: '.9rem' }}>⚡ Oferta de Tiempo Limitado</div>
                <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 'clamp(2.2rem,5vw,4rem)', letterSpacing: 2, marginBottom: '.4rem' }}>{oferta.titulo}</h2>
                <p style={{ color: 'rgba(242,237,230,.6)', fontSize: '.93rem', marginBottom: '1rem' }} dangerouslySetInnerHTML={{ __html: oferta.descripcion }} />
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.6rem', color: 'var(--yellow)', marginBottom: '1rem' }}>${Number(oferta.precio).toFixed(2)} · {oferta.alitas} Alitas</div>
                <div style={{ display: 'flex', gap: '.65rem', marginBottom: '1.4rem' }}>
                  {[{ v: timer.h, l: 'Horas' }, { v: timer.m, l: 'Mins' }, { v: timer.s, l: 'Segs' }].map(({ v, l }) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', borderRadius: 10, padding: '.55rem .85rem', textAlign: 'center', minWidth: 54 }}>
                      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.9rem', lineHeight: 1, color: l === 'Segs' ? 'var(--red)' : 'var(--yellow)' }}>{v}</div>
                      <div style={{ fontSize: '.58rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-red" onClick={() => {
                  useStore.getState().setSelOffer(oferta)
                  handleOrder()
                }}>🔥 Aprovechar Ahora</button>
              </div>
              <div style={{ fontSize: 'min(7rem,14vw)', textAlign: 'center' }}>{oferta.emoji}</div>
            </div>
          </div>
        </section>
      )}

      {/* SALSAS */}
      <section style={{ padding: '4rem 5vw', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <span className="section-tag">Salsas</span>
          <h2 className="section-title">Nuestros Sabores</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.65rem', marginTop: '1.4rem' }}>
            {SALSAS.map(s => (
              <div key={s} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '.45rem 1.1rem', borderRadius: 30, fontSize: '.86rem', transition: 'all .2s', cursor: 'default' }}>🫙 {s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* SABORES */}
      <section style={{ padding: '4rem 5vw' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <span className="section-tag">Estilos</span>
          <h2 className="section-title">Variedad de Sabores</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: '1rem', marginTop: '1.4rem' }}>
            {SABORES.map(s => (
              <div key={s.name} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.2rem', textAlign: 'center', transition: 'all .25s' }}>
                <div style={{ fontSize: '1.9rem', marginBottom: '.4rem' }}>{s.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '.92rem', marginBottom: '.2rem' }}>{s.name}</div>
                <div style={{ fontSize: '.76rem', color: 'var(--gray)' }}>{s.level}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '3rem 5vw', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '2rem', marginTop: '4rem' }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: '1.75rem', letterSpacing: 2, marginBottom: '.4rem' }}>🔥 Portal de las Alitas</div>
          <div style={{ color: 'var(--gray)', fontSize: '.86rem', maxWidth: 240, lineHeight: 1.6 }}>Redefiniendo el concepto de alitas con la mejor calidad desde 2024.</div>
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '.82rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.9rem' }}>Menú</h4>
          {[['Inicio', '/'], ['Hacer Pedido', '/order'], ['Ver Estado', '/status']].map(([l, p]) => (
            <div key={l} onClick={() => navigate(p)} style={{ color: 'rgba(242,237,230,.5)', fontSize: '.86rem', marginBottom: '.4rem', cursor: 'pointer' }}>{l}</div>
          ))}
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '.82rem', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '.9rem' }}>Contacto</h4>
          <div style={{ color: 'rgba(242,237,230,.5)', fontSize: '.86rem', marginBottom: '.4rem' }}>📍 Downtown Av. 452</div>
          <div style={{ color: 'rgba(242,237,230,.5)', fontSize: '.86rem', marginBottom: '.4rem' }}>📞 01 800 ALITAS</div>
          <div style={{ color: 'rgba(242,237,230,.5)', fontSize: '.86rem' }}>✉ hola@alitas.com</div>
        </div>
      </footer>
      <div style={{ borderTop: '1px solid var(--border)', padding: '1.4rem 5vw', textAlign: 'center', color: 'var(--gray)', fontSize: '.78rem' }}>
        © 2025 Portal de las Alitas. Todos los derechos reservados.
      </div>

      {authOpen && <AuthModal tab="login" onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
