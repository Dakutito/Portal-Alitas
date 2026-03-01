import { useStore } from '../store/useStore'

export default function Toast() {
  const toast = useStore(s => s.toast)
  if (!toast) return null
  return (
    <div className="toast-wrap">
      <div className={`toast t-${toast.type === 'order' ? 'order' : toast.type}`} key={toast.id}>
        <div style={{ fontSize: '1.25rem', lineHeight: 1 }}>{toast.icon}</div>
        <div>
          <div className="toast-title">{toast.title}</div>
          {toast.sub && <div className="toast-sub">{toast.sub}</div>}
        </div>
      </div>
    </div>
  )
}
