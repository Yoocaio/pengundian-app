const BASE = '/api';

function getToken() { return localStorage.getItem('token'); }

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, otp, new_password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, new_password }) }),

  getProjects: () => request('/projects'),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getProject: (id) => request(`/projects/${id}`),

  getColumns: (pid) => request(`/config/${pid}/columns`),
  createColumn: (pid, data) => request(`/config/${pid}/columns`, { method: 'POST', body: JSON.stringify(data) }),
  updateColumn: (pid, cid, data) => request(`/config/${pid}/columns/${cid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColumn: (pid, cid) => request(`/config/${pid}/columns/${cid}`, { method: 'DELETE' }),

  getCategories: (pid) => request(`/config/${pid}/categories`),
  createCategory: (pid, data) => request(`/config/${pid}/categories`, { method: 'POST', body: JSON.stringify(data) }),
  deleteCategory: (pid, cid) => request(`/config/${pid}/categories/${cid}`, { method: 'DELETE' }),

  getPrizes: (pid) => request(`/config/${pid}/prizes`),
  createPrize: (pid, fd) => request(`/config/${pid}/prizes`, { method: 'POST', body: fd }),
  updatePrize: (pid, prid, fd) => request(`/config/${pid}/prizes/${prid}`, { method: 'PUT', body: fd }),
  deletePrize: (pid, prid) => request(`/config/${pid}/prizes/${prid}`, { method: 'DELETE' }),

  getParticipants: (pid, page = 1, limit = 50) => request(`/config/${pid}/participants?page=${page}&limit=${limit}`),
  uploadParticipants: (pid, fd) => request(`/config/${pid}/participants/upload`, { method: 'POST', body: fd }),
  deleteParticipants: (pid) => request(`/config/${pid}/participants`, { method: 'DELETE' }),
  getColumnValues: (pid, col) => request(`/config/${pid}/participants/values/${encodeURIComponent(col)}`),
  getParticipantSettings: (pid) => request(`/config/${pid}/participant-settings`),
  saveParticipantSettings: (pid, data) => request(`/config/${pid}/participant-settings`, { method: 'PUT', body: JSON.stringify(data) }),

  getLogics: (pid) => request(`/config/${pid}/logics`),
  createLogic: (pid, data) => request(`/config/${pid}/logics`, { method: 'POST', body: JSON.stringify(data) }),
  updateLogic: (pid, lid, data) => request(`/config/${pid}/logics/${lid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLogic: (pid, lid) => request(`/config/${pid}/logics/${lid}`, { method: 'DELETE' }),
  deleteAllLogics: (pid) => request(`/config/${pid}/logics`, { method: 'DELETE' }),

  getLandingConfig: (pid) => request(`/config/${pid}/landing`),
  saveLandingConfig: (pid, fd) => request(`/config/${pid}/landing`, { method: 'POST', body: fd }),

  getDrawingData: (pid) => request(`/drawing/${pid}/data`),
  getWinners: (pid) => request(`/drawing/${pid}/winners`),
  deleteWinner: (pid, wid) => request(`/drawing/${pid}/winners/${wid}`, { method: 'DELETE' }),
  saveWinners: (pid, fileName) => request(`/drawing/${pid}/winners/save`, { method: 'POST', body: JSON.stringify({ file_name: fileName }) }),

  getReports: () => request('/reporting'),
  getDownloadUrl: (rid) => `${BASE}/reporting/download/${rid}?token=${encodeURIComponent(getToken()||'')}`,
  deleteReport: (rid) => request(`/reporting/${rid}`, { method: 'DELETE' }),

  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
