import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const show = useCallback((text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
