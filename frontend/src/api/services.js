import { api, setToken, setStoredUser } from './client'

export const authService = {
  async signup({ email, password, name }) {
    const res = await api.post('/auth/signup', { email, password, name })
    setToken(res.token)
    setStoredUser({ email: res.email, name: res.name, plan: res.plan, emailVerified: res.emailVerified, onboardingCompleted: res.onboardingCompleted })
    return res
  },

  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password })
    setToken(res.token)
    setStoredUser({ email: res.email, name: res.name, plan: res.plan, emailVerified: res.emailVerified, onboardingCompleted: res.onboardingCompleted })
    return res
  },

  async verifyEmail({ email, code }) {
    const res = await api.post('/auth/verify-email', { email, code })
    setToken(res.token)
    setStoredUser({ email: res.email, name: res.name, plan: res.plan, emailVerified: res.emailVerified, onboardingCompleted: res.onboardingCompleted })
    return res
  },

  resendVerification: ({ email }) => api.post('/auth/resend-verification', { email }),
  forgotPassword: ({ email }) => api.post('/auth/forgot-password', { email }),
  resetPassword: ({ email, code, newPassword }) => api.post('/auth/reset-password', { email, code, newPassword }),

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
  conflicts: (id) => api.get(`/flows/${id}/conflicts`),
  allConflicts: () => api.get('/flows/conflicts'),
  reorder: (orderedIds) => api.patch('/flows/reorder', { orderedIds }),
}

export const pendingActionService = {
  list: () => api.get('/pending-actions'),
  cleanupAll: () => api.post('/pending-actions/cleanup'),
  complete: (id) => api.delete(`/pending-actions/${id}`),
}

export const contactService = {
  list: (page = 0, size = 20) => api.get(`/contacts?page=${page}&size=${size}`),
  get: (id) => api.get(`/contacts/${id}`),
  update: (id, data) => api.patch(`/contacts/${id}`, data),
  deleteBulk: (ids) => api.post('/contacts/bulk-delete', ids),
  import: (contacts) => api.post('/contacts/import', contacts),
  // Instagram Graph API 로 이름·프로필 사진 재조회 — LiveChatPage 의 새로고침 아이콘 버튼에서 호출.
  refreshProfile: (id) => api.post(`/contacts/${id}/refresh-profile`),
}

export const broadcastService = {
  list: () => api.get('/broadcasts'),
  create: (data) => api.post('/broadcasts', data),
  cancel: (id) => api.patch(`/broadcasts/${id}/cancel`),
}

export const recurringService = {
  getTopics: () => api.get('/recurring/topics'),
  getSubscribers: (topic) => api.get(`/recurring/topics/${topic}/subscribers`),
  send: (topic, message) => api.post(`/recurring/topics/${topic}/send`, { message }),
  unsubscribe: (id) => api.delete(`/recurring/subscriptions/${id}`),
  getQuota: () => api.get('/recurring/quota'),
}

export const groupBuyService = {
  list: () => api.get('/group-buys'),
  get: (id) => api.get(`/group-buys/${id}`),
  create: (data) => api.post('/group-buys', data),
  update: (id, data) => api.put(`/group-buys/${id}`, data),
  updateStatus: (id, status) => api.patch(`/group-buys/${id}/status`, { status }),
  delete: (id) => api.delete(`/group-buys/${id}`),
  getParticipants: (id) => api.get(`/group-buys/${id}/participants`),
  updateParticipant: (id, participantId, data) => api.patch(`/group-buys/${id}/participants/${participantId}`, data),
  getStats: (id) => api.get(`/group-buys/${id}/stats`),
}

export const abTestService = {
  getByFlow: (flowId) => api.get(`/ab-tests/flow/${flowId}`),
  end: (id) => api.patch(`/ab-tests/${id}/end`),
  reset: (id) => api.patch(`/ab-tests/${id}/reset`),
  delete: (id) => api.delete(`/ab-tests/${id}`),
}

export const dashboardService = {
  get: () => api.get('/dashboard'),
}

export const sequenceService = {
  list: () => api.get('/sequences'),
  get: (id) => api.get(`/sequences/${id}`),
  create: (data) => api.post('/sequences', data),
  update: (id, data) => api.put(`/sequences/${id}`, data),
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
  markOnboardingComplete: () => api.patch('/users/me/onboarding-complete'),
  updateMarketingConsent: (agreed) => api.patch('/users/me/marketing-consent', { agreed }),
}

export const teamService = {
  listMembers: () => api.get('/team/members'),
  inviteMember: (data) => api.post('/team/members', data),
  updateRole: (memberId, data) => api.patch(`/team/members/${memberId}/role`, data),
  removeMember: (memberId) => api.delete(`/team/members/${memberId}`),
}

export const analyticsService = {
  get: (period) => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    return api.get(`/analytics?days=${days}`)
  },
  getFlowFunnel: (flowId, days = 7) => api.get(`/analytics/flows/${flowId}/funnel?days=${days}`),
}

export const billingService = {
  getInfo: () => api.get('/billing/info'),
  // 토스페이먼츠: 프론트 requestBillingAuth 에 쓸 clientKey/customerKey/orderId 발급
  createCheckout: (data) => api.post('/billing/checkout', data),
  // successUrl 콜백에서 authKey 받아 서버로 전달 → billingKey 발급 + 첫 결제
  confirmBillingAuth: (data) => api.post('/billing/confirm', data),
  cancel: () => api.post('/billing/cancel'),
  // 결제 내역 — 최신순 페이지네이션
  listEvents: (page = 0, size = 20) => api.get('/billing/events', { params: { page, size } }),
}

export const accountService = {
  list: () => api.get('/accounts'),
  connect: (data) => api.post('/accounts', data),
  switch: (id) => api.patch(`/accounts/${id}/switch`),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  disconnect: (id) => api.patch(`/accounts/${id}/disconnect`),
  remove: (id) => api.delete(`/accounts/${id}`),
  getOverview: () => api.get('/accounts/overview'),
}

export const kakaoService = {
  getChannel: () => api.get('/kakao/channel'),
  connectChannel: (data) => api.post('/kakao/channel', data),
  disconnectChannel: () => api.delete('/kakao/channel'),
  sendAlimtalk: (data) => api.post('/kakao/alimtalk', data),
  sendFriendtalk: (data) => api.post('/kakao/friendtalk', data),
}

export const instagramProfileService = {
  setIceBreakers: (items) => api.post('/instagram/ice-breakers', { items }),
  deleteIceBreakers: () => api.delete('/instagram/ice-breakers'),
  setPersistentMenu: (items) => api.post('/instagram/persistent-menu', { items }),
  deletePersistentMenu: () => api.delete('/instagram/persistent-menu'),
}

// IG 자산 선택 — 매니챗 동일 UX (사용자가 어떤 IG 계정 연결할지 선택)
export const instagramAssetService = {
  // 사용자의 facebookAccessToken 으로 /me/accounts 조회 → IG 자산 list 반환
  list: () => api.get('/instagram/assets').then(r => r.data?.assets ?? []),
  // 선택한 자산 (pageId, igUserId) 으로 InstagramAccount 저장
  select: ({ pageId, igUserId }) => api.post('/instagram/select-asset', { pageId, igUserId }).then(r => r.data),
}

export const notificationService = {
  list: () => api.get('/notifications').then(r => r.data),
  unreadCount: () => api.get('/notifications/unread').then(r => r.data?.count ?? 0),
  markAllRead: () => api.post('/notifications/read-all'),
  getSettings: () => api.get('/notifications/settings').then(r => r.data),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
}

export const conversationService = {
  list: (status) => api.get(`/conversations${status ? `?status=${status}` : ''}`),
  get: (id) => api.get(`/conversations/${id}`),
  getMessages: (id) => api.get(`/conversations/${id}/messages`),
  sendMessage: (id, content) => api.post(`/conversations/${id}/messages`, { content }),
  sendImage: (id, mediaUrl) => api.post(`/conversations/${id}/messages`, { type: 'IMAGE', mediaUrl }),
  sendCard: (id, { title, subtitle, buttonText, buttonUrl }) =>
    api.post(`/conversations/${id}/messages`, {
      type: 'CARD', cardTitle: title, cardSubtitle: subtitle,
      cardButtonText: buttonText, cardButtonUrl: buttonUrl,
    }),
  update: (id, data) => api.patch(`/conversations/${id}`, data),
  // 대화 내 수신(INBOUND) 메시지 일괄 읽음 처리 — 사이드바 뱃지/unread 카운트를 DB에 반영.
  markAsRead: (id) => api.post(`/conversations/${id}/read`),
  // 배정 해제 전용 — PATCH + null 은 "필드 변경 없음" 이라 혼선이 있어 DELETE 로 분리.
  unassign: (id) => api.delete(`/conversations/${id}/assignee`),
}
