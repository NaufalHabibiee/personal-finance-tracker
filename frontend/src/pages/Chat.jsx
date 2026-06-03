import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { formatIDR } from '../utils';
import { useToast } from '../components/Toast.jsx';

const GREETING = {
  id: 'greet',
  role: 'bot',
  text: 'Halo! 👋 Aku asisten keuanganmu. Ketik transaksi pakai bahasa sehari-hari dan aku catat otomatis.\n\nContoh:\n• "gaji 5 juta"\n• "beli kopi 25 ribu"\n• "bayar listrik 150rb"\n• "freelance project 2,5jt"',
};

const SUGGESTIONS = ['Gaji 5 juta', 'Beli kopi 25 ribu', 'Bayar listrik 150rb', 'Bensin 50k'];

export default function Chat() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput('');
    const userMsg = { id: 'u' + Date.now(), role: 'user', text: msg };
    setMessages(m => [...m, userMsg]);
    setSending(true);
    try {
      const res = await api.chat(msg);
      const botMsg = {
        id: 'b' + Date.now(),
        role: 'bot',
        text: res.reply,
        transaction: res.transaction || null,
      };
      setMessages(m => [...m, botMsg]);
      if (res.created) window.dispatchEvent(new CustomEvent('tx:changed'));
    } catch (err) {
      setMessages(m => [...m, { id: 'e' + Date.now(), role: 'bot', text: '⚠️ ' + err.message }]);
    } finally {
      setSending(false);
    }
  }

  async function undo(msgId, txId) {
    try {
      await api.deleteTransaction(txId);
      toast.show('Transaksi diurungkan');
      window.dispatchEvent(new CustomEvent('tx:changed'));
      setMessages(m => m.map(x => (x.id === msgId
        ? { ...x, transaction: null, text: x.text + '\n\n↩️ Dibatalkan.' }
        : x)));
    } catch (err) {
      toast.show(err.message);
    }
  }

  return (
    <>
      <div className="topbar"><h1>🤖 Asisten</h1></div>
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map(m => (
          <div key={m.id} className={`chat-row ${m.role}`}>
            <div className={`chat-bubble ${m.role}`}>
              {renderText(m.text)}
              {m.transaction && (
                <div className="chat-tx">
                  <div className="chat-tx-row">
                    <span className="chat-tx-cat">
                      {m.transaction.category.icon} {m.transaction.category.name}
                    </span>
                    <span className={`chat-tx-amount ${m.transaction.type}`}>
                      {m.transaction.type === 'expense' ? '-' : '+'}{formatIDR(m.transaction.amount)}
                    </span>
                  </div>
                  <button className="chat-undo" onClick={() => undo(m.id, m.transaction.id)}>
                    ↩️ Urungkan
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-row bot">
            <div className="chat-bubble bot typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggest">
          {SUGGESTIONS.map(s => (
            <button key={s} className="chip" onClick={() => send(s)} disabled={sending}>{s}</button>
          ))}
        </div>
      )}

      <form
        className="chat-input-bar"
        onSubmit={e => { e.preventDefault(); send(); }}
      >
        <input
          className="chat-input"
          placeholder='Ketik mis. "beli kopi 25 ribu"'
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
          autoFocus
        />
        <button type="submit" className="chat-send" disabled={sending || !input.trim()} aria-label="Kirim">
          {sending ? <span className="spinner" /> : '➤'}
        </button>
      </form>
    </>
  );
}

// Render text with *bold* segments and newlines.
function renderText(text) {
  return text.split('\n').map((line, i) => (
    <span key={i} style={{ display: 'block' }}>
      {line.split(/(\*[^*]+\*)/g).map((part, j) =>
        part.startsWith('*') && part.endsWith('*')
          ? <strong key={j}>{part.slice(1, -1)}</strong>
          : <span key={j}>{part}</span>
      )}
    </span>
  ));
}
