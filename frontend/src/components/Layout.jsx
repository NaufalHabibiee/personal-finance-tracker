import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import BottomNav from './BottomNav.jsx';
import AddTransactionSheet from './AddTransactionSheet.jsx';
import ReceiptScanner from './ReceiptScanner.jsx';

export default function Layout() {
  const [addSheet, setAddSheet] = useState({ open: false, prefill: null });
  const [scanOpen, setScanOpen] = useState(false);
  const location = useLocation();
  const showFab = !['/profile', '/chat'].includes(location.pathname);

  const openAdd = () => setAddSheet({ open: true, prefill: null });
  const closeAdd = () => setAddSheet({ open: false, prefill: null });

  return (
    <div className="app-shell">
      <Outlet context={{ openAdd }} />

      {showFab && (
        <>
          <button className="fab-camera" onClick={() => setScanOpen(true)} aria-label="Scan struk" title="Scan struk">📷</button>
          <button className="fab" onClick={openAdd} aria-label="Tambah transaksi">+</button>
        </>
      )}

      <BottomNav />

      {addSheet.open && (
        <AddTransactionSheet
          prefill={addSheet.prefill}
          onClose={closeAdd}
          onSaved={() => { window.dispatchEvent(new CustomEvent('tx:changed')); }}
        />
      )}

      {scanOpen && (
        <ReceiptScanner
          onClose={() => setScanOpen(false)}
          onDetected={(prefill) => { setScanOpen(false); setAddSheet({ open: true, prefill }); }}
        />
      )}
    </div>
  );
}
