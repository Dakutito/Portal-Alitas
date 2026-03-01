export default function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <h3>⚠ Confirmar</h3>
        <p>{msg}</p>
        <div className="confirm-btns">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
