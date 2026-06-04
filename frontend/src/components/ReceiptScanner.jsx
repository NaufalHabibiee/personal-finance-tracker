import { useRef, useState } from 'react';
import { parseReceipt } from '../receiptParser';

const STATUS_ID = {
  'loading tesseract core': 'Memuat mesin OCR…',
  'initializing tesseract': 'Inisialisasi…',
  'loading language traineddata': 'Memuat data bahasa…',
  'initializing api': 'Menyiapkan…',
  'recognizing text': 'Membaca struk…',
};

export default function ReceiptScanner({ onClose, onDetected }) {
  const [stage, setStage] = useState('idle'); // idle | processing | error
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setStage('processing');
    setProgress(0);
    setStatusText('Memuat mesin OCR…');
    setErrorMsg('');

    try {
      // Lazy-load Tesseract only when actually scanning (keeps main bundle small).
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress || 0);
            setStatusText('Membaca struk… ' + Math.round((m.progress || 0) * 100) + '%');
          } else if (STATUS_ID[m.status]) {
            setStatusText(STATUS_ID[m.status]);
          }
        },
      });

      const parsed = parseReceipt(data?.text || '');
      onDetected({
        type: 'expense',
        amount: parsed.amount || undefined,
        date: parsed.date || undefined,
        note: parsed.note,
        categoryName: parsed.categoryName,
      });
    } catch (err) {
      console.error('OCR error', err);
      setErrorMsg('Gagal membaca struk. Pastikan foto jelas & terang, atau input manual.');
      setStage('error');
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStage('idle');
    setProgress(0);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function close() {
    if (preview) URL.revokeObjectURL(preview);
    onClose();
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={stage === 'processing' ? undefined : close} />
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>📷 Scan Struk</h3>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Foto struk belanjamu — nominal, tanggal & kategori akan terisi otomatis sebagai pengeluaran.
        </div>

        {/* Hidden input; opens camera on mobile, file picker on desktop. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        {stage === 'idle' && (
          <>
            <div className="ocr-pick" onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 40 }}>🧾</div>
              <div style={{ fontWeight: 600 }}>Ambil / Pilih Foto Struk</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Tips: pastikan tulisan & total terlihat jelas, tidak buram, cahaya cukup.
              </div>
            </div>
            <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={close}>
              Batal
            </button>
          </>
        )}

        {stage === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            {preview && <img src={preview} alt="struk" className="ocr-preview" />}
            <div className="ocr-progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <span className="spinner" /> {statusText}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 8 }}>
              Proses pertama bisa agak lama (mengunduh mesin OCR). Mohon tunggu…
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ textAlign: 'center' }}>
            {preview && <img src={preview} alt="struk" className="ocr-preview" />}
            <div className="auth-error" style={{ marginTop: 12 }}>{errorMsg}</div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={close}>Tutup</button>
              <button className="btn" onClick={reset}>Coba Lagi</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
