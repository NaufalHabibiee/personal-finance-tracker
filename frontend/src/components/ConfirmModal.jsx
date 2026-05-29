export default function ConfirmModal({ title, message, confirmLabel = 'Hapus', cancelLabel = 'Batal', onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="row">
          <button className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger' : ''}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
