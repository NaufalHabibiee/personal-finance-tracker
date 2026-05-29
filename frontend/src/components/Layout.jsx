import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import BottomNav from './BottomNav.jsx';
import AddTransactionSheet from './AddTransactionSheet.jsx';

export default function Layout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const showFab = !['/profile'].includes(location.pathname);
  return (
    <div className="app-shell">
      <Outlet context={{ openAdd: () => setSheetOpen(true) }} />
      {showFab && (
        <button className="fab" onClick={() => setSheetOpen(true)} aria-label="Add transaction">+</button>
      )}
      <BottomNav />
      {sheetOpen && (
        <AddTransactionSheet
          onClose={() => setSheetOpen(false)}
          onSaved={() => { /* pages refetch via window event */ window.dispatchEvent(new CustomEvent('tx:changed')); }}
        />
      )}
    </div>
  );
}
