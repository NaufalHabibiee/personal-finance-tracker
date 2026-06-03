const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

function getToken() {
  return localStorage.getItem('pft_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('pft_token', token);
  else localStorage.removeItem('pft_token');
}

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.code = json?.error?.code;
    err.status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  // auth
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  signin: (body) => request('/auth/signin', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // categories
  listCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // transactions
  listTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? '?' + q : ''}`);
  },
  txSummary: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions/summary${q ? '?' + q : ''}`);
  },
  createTransaction: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // budgets
  listBudgets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/budgets${q ? '?' + q : ''}`);
  },
  createBudget: (body) => request('/budgets', { method: 'POST', body: JSON.stringify(body) }),
  updateBudget: (id, body) => request(`/budgets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // reports
  reportOverview: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/overview${q ? '?' + q : ''}`);
  },
  reportTrend: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/trend${q ? '?' + q : ''}`);
  },
  reportBreakdown: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/category-breakdown${q ? '?' + q : ''}`);
  },
  reportTopExpenses: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/top-expenses${q ? '?' + q : ''}`);
  },
  reportComparison: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/comparison${q ? '?' + q : ''}`);
  },

  // assistant chatbot
  chat: (message) => request('/chat', { method: 'POST', body: JSON.stringify({ message }) })
};
