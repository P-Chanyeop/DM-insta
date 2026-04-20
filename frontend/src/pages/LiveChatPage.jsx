import { useState, useRef, useCallback, useEffect } from 'react'
import EmptyState from '../components/EmptyState'
import PageLoader from '../components/PageLoader'
import { conversationService, contactService } from '../api/services'
import { useToast } from '../components/Toast'
import { uploadFile } from '../api/client'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// 현재 로그인한 사용자를 팀 멤버로 사용 (팀 기능 확장 시 API로 교체)
function getTeamMembers() {
  try {
    const raw = localStorage.getItem('authUser')
    const user = raw ? JSON.parse(raw) : null
    if (user?.name) return [{ id: 1, name: user.name, role: '관리자' }]
  } catch {}
  return [{ id: 1, name: '나', role: '관리자' }]
}

const QUICK_REPLIES = [
  '안녕하세요! 무엇을 도와드릴까요?',
  '감사합니다! 좋은 하루 되세요 :)',
  '확인 후 안내드리겠습니다. 잠시만 기다려주세요!',
  '주문 확인되었습니다. 감사합니다!',
  '해당 상품은 현재 품절입니다. 재입고 시 안내드릴까요?',
]

const PRESET_TAGS = ['VIP', '스킨케어', '재구매', '신규', '문의중', '불만', '메이크업', '바디케어']

const now = () => {
  const d = new Date()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h >= 12 ? '오후' : '오전'} ${h > 12 ? h - 12 : h}:${m}`
}

// Map backend conversation object to the shape used by the UI
function mapConversation(conv) {
  // 백엔드 ConversationDto.Response의 contact* 필드를 우선 매핑
  const displayName = conv.contactName || conv.contactUsername
    || conv.participantName || conv.name || '알 수 없음'
  const username = conv.contactUsername || conv.participantUsername || conv.username || null
  const profilePic = conv.contactProfilePictureUrl || conv.profilePictureUrl || null
  return {
    id: conv.id,
    contactId: conv.contactId ?? null,
    name: displayName,
    username,
    profilePictureUrl: profilePic,
    time: conv.lastMessageTime || '',
    bg: conv.avatarGradient || 'linear-gradient(135deg, #667eea, #764ba2)',
    initial: (displayName || '?').charAt(0),
    badge: conv.automationType === 'auto' ? 'auto' : null,
    status: conv.status || 'open',
    unread: conv.unreadCount || 0,
    tags: conv.tags || [],
    memo: conv.memo || '',
    assignee: conv.assignedTo || null,
    automationPaused: conv.automationPaused || false,
    automationPauseEnd: conv.automationPauseEnd ? new Date(conv.automationPauseEnd).getTime() : null,
    followers: conv.followerCount || 0,
    firstMessage: conv.firstMessageDate || '',
    subscribed: conv.subscribed ?? false,
    messages: [], // messages are loaded separately
  }
}

// Map backend message object to the shape used by the UI
function mapMessage(msg) {
  const msgType = (msg.type || '').toUpperCase()
  // 백엔드 direction은 대문자 enum (INBOUND/OUTBOUND) — 소문자 비교 시 안 매칭됨
  const dir = (msg.direction || '').toUpperCase()
  return {
    id: msg.id,
    type: dir === 'INBOUND' ? 'received' : dir === 'OUTBOUND' ? 'sent' : (msg.type || 'received'),
    text: msg.content || msg.text || '',
    time: msg.sentAt ? formatTime(msg.sentAt) : (msg.time || ''),
    auto: msg.auto || msg.isAutomated || msg.automated || false,
    buttons: msg.buttons || undefined,
    card: msg.card || (msgType === 'CARD' ? { title: msg.content || '카드', desc: '', btnText: '' } : undefined),
    isImage: msg.isImage || msgType === 'IMAGE',
    mediaUrl: msg.mediaUrl || undefined,
  }
}

function formatTime(isoString) {
  const d = new Date(isoString)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h >= 12 ? '오후' : '오전'} ${h > 12 ? h - 12 : h}:${m}`
}

export default function LiveChatPage() {
  const toast = useToast()
  const [chats, setChats] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [refreshingProfile, setRefreshingProfile] = useState(false)
  const [inputText, setInputText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('전체')
  const [infoPanelOpen, setInfoPanelOpen] = useState(true)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTagText, setNewTagText] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const [automationTimers, setAutomationTimers] = useState({})
  const [loading, setLoading] = useState(true)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const tagInputRef = useRef(null)
  const stompClientRef = useRef(null)
  const messageSubRef = useRef(null)

  const selectedChat = chats.find((c) => c.id === selectedId)

  // ---- Fetch conversations on mount ----
  useEffect(() => {
    let cancelled = false
    async function fetchConversations() {
      try {
        setLoading(true)
        const data = await conversationService.list()
        if (cancelled) return
        const mapped = (Array.isArray(data) ? data : data?.content || []).map(mapConversation)
        setChats(mapped)
        if (mapped.length > 0 && !selectedId) {
          setSelectedId(mapped[0].id)
        }
      } catch (err) {
        console.error('대화 목록 로드 실패:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchConversations()
    return () => { cancelled = true }
  }, [])

  // ---- Fetch messages when selecting a chat ----
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    async function fetchMessages() {
      try {
        const data = await conversationService.getMessages(selectedId)
        if (cancelled) return
        const messages = (Array.isArray(data) ? data : data?.content || []).map(mapMessage)
        setChats((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, messages } : c))
        )
      } catch (err) {
        console.error('메시지 로드 실패:', err)
      }
    }
    fetchMessages()
    return () => { cancelled = true }
  }, [selectedId])

  // ---- WebSocket connection ----
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:8080/ws'

    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBaseUrl}?token=${encodeURIComponent(token || '')}`),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        // WebSocket connected

        // Subscribe to conversation-level updates (new conversations, status changes, etc.)
        const userId = localStorage.getItem('userId') || 'me'
        client.subscribe(`/topic/conversations/${userId}`, (frame) => {
          try {
            const payload = JSON.parse(frame.body)
            if (payload.type === 'new_message_notification') {
              // Update the chat list entry (unread count, last message, time)
              setChats((prev) => {
                const exists = prev.find((c) => c.id === payload.conversationId)
                if (exists) {
                  return prev.map((c) =>
                    c.id === payload.conversationId
                      ? {
                          ...c,
                          time: payload.time || '방금',
                          unread: c.id === selectedId ? c.unread : c.unread + 1,
                        }
                      : c
                  )
                }
                // New conversation - refetch list
                conversationService.list().then((data) => {
                  const mapped = (Array.isArray(data) ? data : data?.content || []).map(mapConversation)
                  setChats(mapped)
                }).catch(() => {})
                return prev
              })
            } else if (payload.type === 'conversation_update') {
              const updated = mapConversation(payload.conversation || payload)
              setChats((prev) => {
                const exists = prev.find((c) => c.id === updated.id)
                if (exists) {
                  return prev.map((c) =>
                    c.id === updated.id ? { ...c, ...updated, messages: c.messages } : c
                  )
                }
                return [updated, ...prev]
              })
            }
          } catch (e) {
            console.error('WebSocket 메시지 파싱 오류:', e)
          }
        })
      },
      onStompError: (frame) => {
        console.error('STOMP 오류:', frame.headers?.message)
      },
      onWebSocketClose: () => {
        // WebSocket disconnected
      },
    })

    client.activate()
    stompClientRef.current = client

    return () => {
      if (client.active) {
        client.deactivate()
      }
    }
  }, [])

  // ---- Subscribe to messages for the active conversation ----
  useEffect(() => {
    const client = stompClientRef.current
    if (!client || !client.connected || !selectedId) return

    // Unsubscribe from previous conversation messages
    if (messageSubRef.current) {
      messageSubRef.current.unsubscribe()
      messageSubRef.current = null
    }

    messageSubRef.current = client.subscribe(
      `/topic/messages/${selectedId}`,
      (frame) => {
        try {
          const payload = JSON.parse(frame.body)
          const newMsg = mapMessage(payload)
          setChats((prev) =>
            prev.map((c) => {
              if (c.id !== selectedId) return c
              // Avoid duplicate messages
              if (c.messages.some((m) => m.id === newMsg.id)) return c
              // Outbound일 경우, optimistic temp 메시지(같은 text, 실제 id 없음)와 매칭되면 교체
              if (newMsg.type === 'sent') {
                const tempIdx = c.messages.findIndex(
                  (m) => m.type === 'sent' && typeof m.id === 'number' && m.id > 1e12 && m.text === newMsg.text
                )
                if (tempIdx !== -1) {
                  const messages = [...c.messages]
                  messages[tempIdx] = newMsg
                  return { ...c, messages, time: '방금' }
                }
              }
              return {
                ...c,
                messages: [...c.messages, newMsg],
                time: '방금',
              }
            })
          )
        } catch (e) {
          console.error('메시지 수신 오류:', e)
        }
      }
    )

    return () => {
      if (messageSubRef.current) {
        messageSubRef.current.unsubscribe()
        messageSubRef.current = null
      }
    }
  }, [selectedId, stompClientRef.current?.connected])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedChat?.messages?.length])

  // Focus tag input when it appears
  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus()
    }
  }, [showTagInput])

  // Automation pause countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.automationPaused && c.automationPauseEnd) {
            if (Date.now() >= c.automationPauseEnd) {
              return { ...c, automationPaused: false, automationPauseEnd: null }
            }
          }
          return c
        })
      )
      // Update displayed timers
      setAutomationTimers((prev) => {
        const next = { ...prev }
        chats.forEach((c) => {
          if (c.automationPaused && c.automationPauseEnd) {
            const remaining = Math.max(0, c.automationPauseEnd - Date.now())
            const mins = Math.floor(remaining / 60000)
            const secs = Math.floor((remaining % 60000) / 1000)
            next[c.id] = `${mins}:${String(secs).padStart(2, '0')}`
          } else {
            delete next[c.id]
          }
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [chats])

  const updateChat = useCallback((chatId, updater) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? (typeof updater === 'function' ? updater(c) : { ...c, ...updater }) : c)))
  }, [])

  const addMessage = useCallback((chatId, msg) => {
    updateChat(chatId, (c) => ({
      ...c,
      messages: [...c.messages, { id: Date.now(), ...msg }],
      time: '방금',
    }))
  }, [updateChat])

  // ---- Handlers ----

  const handleSelectChat = (chatId) => {
    setSelectedId(chatId)
    // Mark as read
    updateChat(chatId, { unread: 0 })
    setShowQuickReplies(false)
    setShowAssignDropdown(false)
  }

  const handleSendMessage = async () => {
    const text = inputText.trim()
    if (!text || !selectedChat) return

    // Optimistic UI update
    const tempId = Date.now()
    addMessage(selectedId, { id: tempId, type: 'sent', text, time: now() })
    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const savedMsg = await conversationService.sendMessage(selectedId, text)
      // Replace the temp message with the real one from the server.
      // 주의: WebSocket이 HTTP 응답보다 먼저 도착해 동일 id가 이미 있으면
      //      temp 를 교체하지 말고 제거만 해야 중복이 생기지 않음.
      if (savedMsg && savedMsg.id) {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== selectedId) return c
            const alreadyExists = c.messages.some((m) => m.id === savedMsg.id)
            const messages = alreadyExists
              ? c.messages.filter((m) => m.id !== tempId)
              : c.messages.map((m) => (m.id === tempId ? mapMessage(savedMsg) : m))
            return { ...c, messages }
          })
        )
      }
    } catch (err) {
      console.error('메시지 전송 실패:', err)
      // Mark the message as failed
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== selectedId) return c
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === tempId ? { ...m, failed: true } : m
            ),
          }
        })
      )
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextareaInput = (e) => {
    setInputText(e.target.value)
    // Auto-grow
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!selectedId) return

    // Optimistic UI
    const tempId = Date.now()
    addMessage(selectedId, {
      id: tempId, type: 'sent', text: `[이미지 전송 중... ${file.name}]`,
      time: now(), isImage: true,
    })

    try {
      // 1. 서버에 파일 업로드
      const uploaded = await uploadFile(file)
      // 2. Instagram으로 이미지 DM 발송
      const savedMsg = await conversationService.sendImage(selectedId, uploaded.url)
      // 3. Optimistic → 실제 메시지로 교체
      if (savedMsg?.id) {
        setChats((prev) => {
          const msgs = [...(prev[selectedId] || [])]
          const idx = msgs.findIndex((m) => m.id === tempId)
          if (idx >= 0) msgs[idx] = { ...msgs[idx], id: savedMsg.id, text: '[이미지]', mediaUrl: uploaded.url }
          return { ...prev, [selectedId]: msgs }
        })
      }
    } catch (err) {
      // 실패 시 에러 표시
      setChats((prev) => {
        const msgs = [...(prev[selectedId] || [])]
        const idx = msgs.findIndex((m) => m.id === tempId)
        if (idx >= 0) msgs[idx] = { ...msgs[idx], text: `[이미지 전송 실패: ${err.message}]` }
        return { ...prev, [selectedId]: msgs }
      })
    }
  }

  const [showCardModal, setShowCardModal] = useState(false)
  const [cardForm, setCardForm] = useState({ title: '', subtitle: '', buttonText: '', buttonUrl: '' })

  const handleSendCard = () => {
    if (!selectedId) return
    setCardForm({ title: '', subtitle: '', buttonText: '', buttonUrl: '' })
    setShowCardModal(true)
  }

  const handleCardSubmit = async () => {
    if (!cardForm.title.trim()) return
    setShowCardModal(false)

    const tempId = Date.now()
    addMessage(selectedId, {
      id: tempId, type: 'sent',
      text: `[카드] ${cardForm.title}`,
      card: { title: cardForm.title, desc: cardForm.subtitle, btnText: cardForm.buttonText },
      time: now(),
    })

    try {
      const savedMsg = await conversationService.sendCard(selectedId, cardForm)
      if (savedMsg?.id) {
        setChats((prev) => {
          const msgs = [...(prev[selectedId] || [])]
          const idx = msgs.findIndex((m) => m.id === tempId)
          if (idx >= 0) msgs[idx] = { ...msgs[idx], id: savedMsg.id }
          return { ...prev, [selectedId]: msgs }
        })
      }
    } catch (err) {
      setChats((prev) => {
        const msgs = [...(prev[selectedId] || [])]
        const idx = msgs.findIndex((m) => m.id === tempId)
        if (idx >= 0) msgs[idx] = { ...msgs[idx], text: `[카드 전송 실패: ${err.message}]` }
        return { ...prev, [selectedId]: msgs }
      })
    }
  }

  const handleQuickReply = async (reply) => {
    // Optimistic update
    const tempId = Date.now()
    addMessage(selectedId, { id: tempId, type: 'sent', text: reply, time: now() })
    setShowQuickReplies(false)

    try {
      const savedMsg = await conversationService.sendMessage(selectedId, reply)
      if (savedMsg && savedMsg.id) {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== selectedId) return c
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === tempId ? mapMessage(savedMsg) : m
              ),
            }
          })
        )
      }
    } catch (err) {
      console.error('빠른 답장 전송 실패:', err)
    }
  }

  const handleToggleQuickReplies = () => {
    setShowQuickReplies((v) => !v)
  }

  const handleTagToolClick = () => {
    setShowTagInput(true)
    setShowTagSuggestions(true)
  }

  const handleAddTag = async (tag) => {
    const trimmed = (tag || newTagText).trim()
    if (!trimmed || !selectedChat) return
    if (selectedChat.tags.includes(trimmed)) return

    const newTags = [...selectedChat.tags, trimmed]
    updateChat(selectedId, (c) => ({ ...c, tags: newTags }))
    setNewTagText('')
    setShowTagInput(false)
    setShowTagSuggestions(false)

    try {
      await conversationService.update(selectedId, { tags: newTags })
    } catch (err) {
      console.error('태그 추가 실패:', err)
      // Revert on failure
      updateChat(selectedId, (c) => ({ ...c, tags: c.tags.filter((t) => t !== trimmed) }))
    }
  }

  const handleRemoveTag = async (tag) => {
    const newTags = selectedChat.tags.filter((t) => t !== tag)
    updateChat(selectedId, (c) => ({ ...c, tags: newTags }))

    try {
      await conversationService.update(selectedId, { tags: newTags })
    } catch (err) {
      console.error('태그 삭제 실패:', err)
      // Revert on failure
      updateChat(selectedId, (c) => ({ ...c, tags: [...c.tags, tag] }))
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === 'Escape') {
      setShowTagInput(false)
      setShowTagSuggestions(false)
      setNewTagText('')
    }
  }

  const handleMemoBlur = async (e) => {
    const memo = e.target.value
    updateChat(selectedId, { memo })
    try {
      await conversationService.update(selectedId, { memo })
    } catch (err) {
      console.error('메모 저장 실패:', err)
    }
  }

  // 기존 Contact의 프로필을 Meta Graph API로 재조회해 DB 갱신
  const handleRefreshProfile = async () => {
    if (refreshingProfile) return
    if (!selectedChat) { toast.warning('대화를 먼저 선택해주세요.'); return }
    if (!selectedChat.contactId) {
      toast.warning('대화에 연결된 연락처 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.')
      return
    }
    setRefreshingProfile(true)
    try {
      const updated = await contactService.refreshProfile(selectedChat.contactId)
      // 리스트/선택된 채팅에 즉시 반영
      updateChat(selectedId, {
        name: updated.name || updated.username || '알 수 없음',
        username: updated.username,
        profilePictureUrl: updated.profilePictureUrl,
        initial: ((updated.name || updated.username || '?') + '').charAt(0),
      })
      // 전체 목록도 재조회 (다른 대화 참가자도 섞였을 수 있음)
      // 기존 messages는 보존 — mapConversation이 messages=[]로 초기화하므로 merge
      try {
        const data = await conversationService.list()
        const mapped = (Array.isArray(data) ? data : data?.content || []).map(mapConversation)
        setChats(prev => mapped.map(m => {
          const existing = prev.find(p => p.id === m.id)
          return existing ? { ...m, messages: existing.messages } : m
        }))
      } catch {}
      toast.success('프로필을 재조회했습니다.')
    } catch (err) {
      toast.error(err.message || '프로필 재조회에 실패했습니다. (App Review 권한 필요할 수 있음)')
    } finally {
      setRefreshingProfile(false)
    }
  }

  const handleToggleAutomation = async () => {
    if (!selectedChat) return

    const newPaused = !selectedChat.automationPaused
    const pauseEnd = newPaused ? Date.now() + 24 * 60 * 60 * 1000 : null

    updateChat(selectedId, {
      automationPaused: newPaused,
      automationPauseEnd: pauseEnd,
    })

    try {
      await conversationService.update(selectedId, {
        automationPaused: newPaused,
        automationPauseEnd: pauseEnd ? new Date(pauseEnd).toISOString() : null,
      })
    } catch (err) {
      console.error('자동화 상태 변경 실패:', err)
      // Revert
      updateChat(selectedId, {
        automationPaused: !newPaused,
        automationPauseEnd: !newPaused ? null : selectedChat.automationPauseEnd,
      })
    }
  }

  const handleAssign = async (member) => {
    const prevAssignee = selectedChat?.assignee
    updateChat(selectedId, { assignee: member.name })
    setShowAssignDropdown(false)
    addMessage(selectedId, {
      type: 'system',
      text: `대화가 ${member.name} (${member.role})에게 배정되었습니다.`,
      time: now(),
    })

    try {
      await conversationService.update(selectedId, { assignedTo: member.name })
    } catch (err) {
      console.error('배정 실패:', err)
      updateChat(selectedId, { assignee: prevAssignee })
    }
  }

  const handleUnassign = async () => {
    const prevAssignee = selectedChat?.assignee
    updateChat(selectedId, { assignee: null })
    setShowAssignDropdown(false)
    addMessage(selectedId, {
      type: 'system',
      text: '대화 배정이 해제되었습니다.',
      time: now(),
    })

    try {
      await conversationService.update(selectedId, { assignedTo: null })
    } catch (err) {
      console.error('배정 해제 실패:', err)
      updateChat(selectedId, { assignee: prevAssignee })
    }
  }

  const handleStatusToggle = async () => {
    if (!selectedChat) return
    const newStatus = selectedChat.status === 'open' ? 'done' : 'open'
    updateChat(selectedId, (c) => ({ ...c, status: newStatus }))

    try {
      await conversationService.update(selectedId, { status: newStatus })
    } catch (err) {
      console.error('상태 변경 실패:', err)
      updateChat(selectedId, (c) => ({ ...c, status: c.status === 'open' ? 'done' : 'open' }))
    }
  }

  const handleMsgButtonClick = (btnLabel) => {
    addMessage(selectedId, { type: 'received', text: btnLabel, time: now() })
  }

  const handleCardBtnClick = (btnText) => {
    addMessage(selectedId, { type: 'received', text: `[${btnText} 클릭]`, time: now() })
  }

  // ---- Filters ----

  const filteredChats = chats.filter((c) => {
    const matchesSearch = !searchQuery || c.name.includes(searchQuery) || c.messages.some((m) => m.text?.includes(searchQuery))
    const matchesFilter =
      activeFilter === '전체' ||
      (activeFilter === '열림' && c.status === 'open') ||
      (activeFilter === '완료' && c.status === 'done')
    return matchesSearch && matchesFilter
  })

  const openCount = chats.filter((c) => c.status === 'open').length

  // Tag suggestions (excluding already assigned tags)
  const tagSuggestions = PRESET_TAGS.filter(
    (t) => !selectedChat?.tags.includes(t) && (!newTagText || t.includes(newTagText))
  )

  return (
    <div className="livechat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>대화 목록</h3>
          <div className="chat-filters">
            {['전체', '열림', '완료'].map((f) => (
              <button
                key={f}
                className={`chat-filter${activeFilter === f ? ' active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
                {f === '열림' && <span className="filter-count">{openCount}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="chat-search">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="대화 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: '#999' }}>
              <i className="ri-close-line" />
            </button>
          )}
        </div>
        <div className="chat-list">
          {loading && <PageLoader compact text="대화 목록을 불러오는 중..." />}
          {!loading && filteredChats.length === 0 && chats.length === 0 && (
            <EmptyState
              compact
              icon="ri-chat-3-line"
              title="대화가 없습니다"
              description="Instagram DM이 수신되면 여기에 표시됩니다"
            />
          )}
          {!loading && filteredChats.length === 0 && chats.length > 0 && (
            <EmptyState
              compact
              icon="ri-search-line"
              title="검색 결과가 없습니다"
              description="다른 키워드로 검색해 보세요"
            />
          )}
          {filteredChats.map((c) => (
            <div
              key={c.id}
              className={`chat-item${c.id === selectedId ? ' active' : ''}${c.unread > 0 ? ' unread' : ''}`}
              onClick={() => handleSelectChat(c.id)}
            >
              <div
                className="chat-item-avatar"
                style={{
                  background: c.profilePictureUrl ? 'transparent' : c.bg,
                  overflow: 'hidden',
                }}
              >
                {c.profilePictureUrl ? (
                  <img
                    src={c.profilePictureUrl}
                    alt={c.username || c.name || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : c.initial}
              </div>
              <div className="chat-item-info">
                <div className="chat-item-top">
                  <strong>{c.name}</strong>
                  <span>{c.time}</span>
                </div>
                <p>{c.messages[c.messages.length - 1]?.text || ''}</p>
              </div>
              {c.badge && <div className="chat-item-badge auto">자동</div>}
              {c.unread > 0 && <span className="unread-dot">{c.unread}</span>}
              {c.assignee && (
                <span style={{ fontSize: '10px', color: '#888', position: 'absolute', right: 12, bottom: 8 }}>
                  {c.assignee}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Main */}
      <div className="chat-main">
        {!selectedChat && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon="ri-message-3-line"
              title="대화를 선택하세요"
              description="왼쪽 목록에서 대화를 선택하면 메시지가 표시됩니다"
            />
          </div>
        )}
        {selectedChat && <><div className="chat-main-header">
          <div className="chat-user-info">
            <div
              className="chat-user-avatar"
              style={{
                background: selectedChat?.profilePictureUrl ? 'transparent' : selectedChat?.bg,
                overflow: 'hidden',
              }}
            >
              {selectedChat?.profilePictureUrl ? (
                <img
                  src={selectedChat.profilePictureUrl}
                  alt={selectedChat.username || selectedChat.name || ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : selectedChat?.initial}
            </div>
            <div>
              <strong>{selectedChat?.name || selectedChat?.username || '알 수 없음'}</strong>
              <span>
                {selectedChat?.username ? `@${selectedChat.username}` : '@알 수 없음'}
                {selectedChat?.followers > 0 && ` · 팔로워 ${selectedChat.followers.toLocaleString()}`}
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              className="btn-secondary small"
              onClick={handleRefreshProfile}
              disabled={refreshingProfile}
              title="Instagram 프로필 다시 불러오기 (이름·사진)"
              aria-label="프로필 재조회"
              style={{ whiteSpace: 'nowrap', padding: '6px 10px' }}
            >
              <i className={refreshingProfile ? 'ri-loader-4-line spin' : 'ri-refresh-line'} />
            </button>
            <button
              className={`btn-secondary small${selectedChat?.automationPaused ? ' paused' : ''}`}
              onClick={handleToggleAutomation}
              style={selectedChat?.automationPaused ? { background: '#fff3cd', borderColor: '#ffc107', color: '#856404' } : {}}
            >
              <i className={selectedChat?.automationPaused ? 'ri-play-circle-line' : 'ri-robot-2-line'} />
              {selectedChat?.automationPaused
                ? ` 자동화 재개 (${automationTimers[selectedId] || '...'})`
                : ' 자동화 일시정지'}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                className="btn-secondary small"
                onClick={() => setShowAssignDropdown((v) => !v)}
              >
                <i className="ri-user-shared-line" />
                {selectedChat?.assignee ? ` ${selectedChat.assignee}` : ' 배정'}
              </button>
              {showAssignDropdown && (
                <div className="assign-dropdown" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 200, overflow: 'hidden',
                }}>
                  <div style={{ padding: '8px 12px', fontSize: 12, color: '#999', borderBottom: '1px solid #f0f0f0' }}>
                    팀원 배정
                  </div>
                  {getTeamMembers().map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleAssign(m)}
                      style={{
                        padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', borderBottom: '1px solid #f8f8f8',
                        background: selectedChat?.assignee === m.name ? '#f0f7ff' : '#fff',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = selectedChat?.assignee === m.name ? '#f0f7ff' : '#fff' }}
                    >
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: '#999' }}>{m.role}</span>
                    </div>
                  ))}
                  {selectedChat?.assignee && (
                    <div
                      onClick={handleUnassign}
                      style={{ padding: '10px 12px', cursor: 'pointer', textAlign: 'center', color: '#e74c3c', fontSize: 13, borderTop: '1px solid #f0f0f0' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fef5f5' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                    >
                      배정 해제
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="btn-secondary small"
              onClick={() => setInfoPanelOpen((v) => !v)}
              title={infoPanelOpen ? '정보 패널 닫기' : '정보 패널 열기'}
            >
              <i className={infoPanelOpen ? 'ri-layout-right-2-line' : 'ri-layout-right-line'} />
            </button>
          </div>
        </div>

        <div className="chat-messages" onClick={() => { setShowAssignDropdown(false); setShowQuickReplies(false) }}>
          <div className="chat-date-divider">오늘</div>
          {selectedChat?.messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="chat-msg system" style={{
                  textAlign: 'center', padding: '8px 0', fontSize: 12, color: '#999',
                }}>
                  <span style={{ background: '#f5f5f5', padding: '4px 12px', borderRadius: 12 }}>
                    {msg.text}
                  </span>
                </div>
              )
            }
            return (
              <div key={msg.id} className={`chat-msg ${msg.type}${msg.auto ? ' auto' : ''}${msg.failed ? ' failed' : ''}`}>
                {msg.auto && (
                  <div className="msg-auto-badge"><i className="ri-robot-2-line" /> 자동 응답</div>
                )}
                {msg.isImage || msg.mediaUrl ? (
                  <div className="msg-image-wrap">
                    {msg.mediaUrl ? (
                      <img
                        src={msg.mediaUrl}
                        alt="이미지"
                        style={{ maxWidth: 240, maxHeight: 240, borderRadius: 10, cursor: 'pointer' }}
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                      />
                    ) : null}
                    <p style={{ fontStyle: msg.mediaUrl ? 'normal' : 'italic', color: msg.mediaUrl ? '#374151' : '#666', display: msg.mediaUrl ? 'none' : 'block' }}>
                      <i className="ri-image-line" style={{ marginRight: 4 }} />{msg.text}
                    </p>
                  </div>
                ) : msg.card ? (
                  <div className="msg-card" style={{ background: '#F8FAFC', borderRadius: 10, padding: 12, border: '1px solid #E2E8F0', maxWidth: 260 }}>
                    <strong style={{ fontSize: 14, color: '#1E293B' }}>{msg.card.title}</strong>
                    {msg.card.desc && <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 8px' }}>{msg.card.desc}</p>}
                    {msg.card.btnText && (
                      <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>
                        <i className="ri-external-link-line" /> {msg.card.btnText}
                      </span>
                    )}
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
                {msg.failed && (
                  <span style={{ fontSize: 11, color: '#e74c3c' }}>전송 실패</span>
                )}
                {msg.buttons && (
                  <div className="msg-buttons">
                    {msg.buttons.map((b) => (
                      <button key={b} onClick={() => handleMsgButtonClick(b)}>{b}</button>
                    ))}
                  </div>
                )}
                {msg.card && (
                  <div className="msg-card">
                    <div className="msg-card-img"><i className="ri-image-line" /> 상품 이미지</div>
                    <div className="msg-card-body">
                      <strong>{msg.card.title}</strong>
                      <span>{msg.card.desc}</span>
                    </div>
                    <button className="msg-card-btn" onClick={() => handleCardBtnClick(msg.card.btnText)}>
                      {msg.card.btnText}
                    </button>
                  </div>
                )}
                <span className="msg-time">
                  {msg.time}
                  {msg.auto && ' · 자동 발송'}
                </span>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {showQuickReplies && (
            <div className="quick-replies-panel" style={{
              background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8,
              marginBottom: 8, overflow: 'hidden', boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#999', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>빠른 답장</span>
                <button onClick={() => setShowQuickReplies(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                  <i className="ri-close-line" />
                </button>
              </div>
              {QUICK_REPLIES.map((r) => (
                <div
                  key={r}
                  onClick={() => handleQuickReply(r)}
                  style={{
                    padding: '10px 12px', cursor: 'pointer', fontSize: 14,
                    borderBottom: '1px solid #f8f8f8', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
          <div className="chat-input-tools">
            <button className="icon-btn" title="이미지" onClick={handleImageClick}>
              <i className="ri-image-line" />
            </button>
            <button className="icon-btn" title="카드" onClick={handleSendCard}>
              <i className="ri-layout-cards-line" />
            </button>
            <button
              className={`icon-btn${showQuickReplies ? ' active' : ''}`}
              title="빠른 답장"
              onClick={handleToggleQuickReplies}
              style={showQuickReplies ? { color: '#7c3aed', background: '#f3f0ff' } : {}}
            >
              <i className="ri-flashlight-line" />
            </button>
            <button className="icon-btn" title="태그" onClick={handleTagToolClick}>
              <i className="ri-price-tag-3-line" />
            </button>
          </div>
          <div className="chat-input-box">
            <textarea
              ref={textareaRef}
              placeholder="메시지를 입력하세요..."
              rows={1}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              style={{ opacity: inputText.trim() ? 1 : 0.5 }}
            >
              <i className="ri-send-plane-fill" />
            </button>
          </div>
          <div className="chat-input-note">
            {selectedChat?.automationPaused
              ? '자동화가 일시정지 상태입니다.'
              : '수동 메시지를 보내면 이 대화의 자동화가 24시간 일시정지됩니다'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </div>
        </>
        }
      </div>

      {/* Info Panel */}
      {infoPanelOpen && selectedChat && (
        <div className="chat-info-panel">
          <div className="info-panel-header">
            <h4>연락처 정보</h4>
            <button className="icon-btn" onClick={() => setInfoPanelOpen(false)}>
              <i className="ri-close-line" />
            </button>
          </div>
          <div className="info-panel-body">
            <div className="info-profile">
              <div
                className="info-avatar"
                style={{
                  background: selectedChat.profilePictureUrl ? 'transparent' : selectedChat.bg,
                  overflow: 'hidden',
                }}
              >
                {selectedChat.profilePictureUrl ? (
                  <img
                    src={selectedChat.profilePictureUrl}
                    alt={selectedChat.username || selectedChat.name || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : selectedChat.initial}
              </div>
              <h4>{selectedChat.name || selectedChat.username || '알 수 없음'}</h4>
              <span>{selectedChat.username ? `@${selectedChat.username}` : '@알 수 없음'}</span>
            </div>
            <div className="info-section">
              <h5>기본 정보</h5>
              <div className="info-row"><label>팔로워</label><span>{selectedChat.followers?.toLocaleString()}</span></div>
              <div className="info-row"><label>첫 메시지</label><span>{selectedChat.firstMessage}</span></div>
              <div className="info-row"><label>마지막 활동</label><span>{selectedChat.time}</span></div>
              <div className="info-row">
                <label>구독 상태</label>
                <span className={`status-badge ${selectedChat.subscribed ? 'active' : ''}`}>
                  {selectedChat.subscribed ? '구독 중' : '미구독'}
                </span>
              </div>
              <div className="info-row">
                <label>배정</label>
                <span>{selectedChat.assignee || '미배정'}</span>
              </div>
              <div className="info-row">
                <label>상태</label>
                <span
                  className={`status-badge ${selectedChat.status === 'open' ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={handleStatusToggle}
                >
                  {selectedChat.status === 'open' ? '열림' : '완료'}
                </span>
              </div>
            </div>
            <div className="info-section">
              <h5>태그</h5>
              <div className="info-tags">
                {selectedChat.tags.map((t) => (
                  <span key={t} className="info-tag" style={{ cursor: 'pointer', position: 'relative' }}>
                    {t}
                    <i
                      className="ri-close-line"
                      style={{ marginLeft: 4, fontSize: 10, cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); handleRemoveTag(t) }}
                    />
                  </span>
                ))}
                {!showTagInput && (
                  <button
                    className="add-tag-btn"
                    onClick={() => { setShowTagInput(true); setShowTagSuggestions(true) }}
                  >
                    <i className="ri-add-line" />
                  </button>
                )}
              </div>
              {showTagInput && (
                <div style={{ marginTop: 8, position: 'relative' }}>
                  <input
                    ref={tagInputRef}
                    type="text"
                    placeholder="태그 입력..."
                    value={newTagText}
                    onChange={(e) => { setNewTagText(e.target.value); setShowTagSuggestions(true) }}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => { setTimeout(() => { setShowTagInput(false); setShowTagSuggestions(false); setNewTagText('') }, 200) }}
                    style={{
                      width: '100%', padding: '6px 10px', border: '1px solid #d0d0d0',
                      borderRadius: 6, fontSize: 13, outline: 'none',
                    }}
                  />
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
                      background: '#fff', border: '1px solid #e0e0e0', borderRadius: 6,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: 160, overflowY: 'auto',
                    }}>
                      {tagSuggestions.map((t) => (
                        <div
                          key={t}
                          onMouseDown={(e) => { e.preventDefault(); handleAddTag(t) }}
                          style={{ padding: '8px 10px', cursor: 'pointer', fontSize: 13 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="info-section">
              <h5>메모</h5>
              <textarea
                className="info-memo"
                placeholder="내부 메모를 남기세요..."
                defaultValue={selectedChat.memo}
                key={selectedChat.id}
                onBlur={handleMemoBlur}
              />
            </div>
          </div>
        </div>
      )}

      {/* 카드 전송 모달 */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>카드 메시지 전송</h3>
              <button className="modal-close" onClick={() => setShowCardModal(false)}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>제목 *</label>
                <input
                  className="input"
                  placeholder="예: 인기 상품 안내"
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>부제목</label>
                <input
                  className="input"
                  placeholder="예: 지금 구매 시 20% 할인!"
                  value={cardForm.subtitle}
                  onChange={(e) => setCardForm({ ...cardForm, subtitle: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>버튼 텍스트</label>
                <input
                  className="input"
                  placeholder="예: 자세히 보기"
                  value={cardForm.buttonText}
                  onChange={(e) => setCardForm({ ...cardForm, buttonText: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>버튼 URL</label>
                <input
                  className="input"
                  placeholder="https://..."
                  value={cardForm.buttonUrl}
                  onChange={(e) => setCardForm({ ...cardForm, buttonUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowCardModal(false)}>취소</button>
              <button
                className="btn-primary"
                disabled={!cardForm.title.trim()}
                onClick={handleCardSubmit}
              >
                <i className="ri-send-plane-fill" /> 전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
