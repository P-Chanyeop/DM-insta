import { api, setToken, setStoredUser } from './client'

export const authService = {
  async signup({ email, password, name }) {
    const res = await api.post('/auth/signup', { email, password, name })
    setToken(res.token)
    setStoredUser({ email: res.email, name: res.name, plan: res.plan })
    return res
  },

  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password })
    setToken(res.token)
    setStoredUser({ email: res.email, name: res.name, plan: res.plan })
    return res
  },

  logout() {
    setToken(null)
    setStoredUser(null)
  },
}

export const flowService = {
  list: () => api.get('/flows'),
  get: (id) => api.get(`/flows/${id}`),
  create: (data) => api.post('/flows', data),
  update: (id, data) => api.put(`/flows/${id}`, data),
  toggle: (id) => api.patch(`/flows/${id}/toggle`),
  delete: (id) => api.delete(`/flows/${id}`),
}

export const automationService = {
  list: (type) => api.get(`/automations${type ? `?type=${type}` : ''}`),
  create: (data) => api.post('/automations', data),
  toggle: (id) => api.patch(`/automations/${id}/toggle`),
  delete: (id) => api.delete(`/automations/${id}`),
}

export const contactService = {
  list: (page = 0, size = 20) => api.get(`/contacts?page=${page}&size=${size}`),
  get: (id) => api.get(`/contacts/${id}`),
  update: (id, data) => api.patch(`/contacts/${id}`, data),
  deleteBulk: (ids) => api.post('/contacts/bulk-delete', ids),
  import: (contacts) => api.post('/contacts/import', contacts),
}

export const broadcastService = {
  list: () => api.get('/broadcasts'),
  create: (data) => api.post('/broadcasts', data),
  cancel: (id) => api.patch(`/broadcasts/${id}/cancel`),
}

export const dashboardService = {
  get: () => api.get('/dashboard'),
}

export const sequenceService = {
  list: () => api.get('/sequences'),
  create: (data) => api.post('/sequences', data),
  toggle: (id) => api.patch(`/sequences/${id}/toggle`),
  delete: (id) => api.delete(`/sequences/${id}`),
}

export const templateService = {
  list: (category) => api.get(`/templates${category ? `?category=${category}` : ''}`),
  use: (id) => api.post(`/templates/${id}/use`),
}

export const growthToolService = {
  list: () => api.get('/growth-tools'),
  create: (data) => api.post('/growth-tools', data),
  delete: (id) => api.delete(`/growth-tools/${id}`),
}

export const integrationService = {
  list: () => api.get('/integrations'),
  create: (data) => api.post('/integrations', data),
  toggle: (id) => api.patch(`/integrations/${id}/toggle`),
  delete: (id) => api.delete(`/integrations/${id}`),
}

export const userService = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/password', data),
}

export const analyticsService = {
  get: (period) => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    return api.get(`/analytics?days=${days}`)
  },
}

export const conversationService = {
  list: (status) => api.get(`/conversations${status ? `?status=${status}` : ''}`),
  get: (id) => api.get(`/conversations/${id}`),
  getMessages: (id) => api.get(`/conversations/${id}/messages`),
  sendMessage: (id, content) => api.post(`/conversations/${id}/messages`, { content }),
  update: (id, data) => api.patch(`/conversations/${id}`, data),
}
