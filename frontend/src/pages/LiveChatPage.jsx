import { useState, useRef, useCallback, useEffect } from 'react'

const TEAM_MEMBERS = [
  { id: 1, name: '박지민', role: '매니저' },
  { id: 2, name: '김하늘', role: '상담사' },
  { id: 3, name: '이서준', role: '상담사' },
  { id: 4, name: '정유진', role: '팀장' },
]

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

const INITIAL_CHATS = [
  {
    id: 1,
    name: '김수현',
    time: '2분 전',
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    initial: '김',
    badge: 'auto',
    status: 'open',
    unread: 0,
    tags: ['VIP', '스킨케어', '재구매'],
    memo: 'VIP 고객. 스킨케어 제품 관심 높음.',
    assignee: null,
    automationPaused: false,
    automationPauseEnd: null,
    followers: 1234,
    firstMessage: '2024.02.15',
    subscribed: true,
    messages: [
      { id: 1, type: 'received', text: '안녕하세요! 인스타에서 봤는데 상품 가격이 궁금해요', time: '오후 2:15' },
      {
        id: 2, type: 'sent', auto: true, text: '안녕하세요! 반갑습니다 :) 어떤 상품이 궁금하신가요?',
        buttons: ['스킨케어', '메이크업', '바디케어'], time: '오후 2:15',
      },
      { id: 3, type: 'received', text: '스킨케어 가격 알려주세요!', time: '오후 2:16' },
      {
        id: 4, type: 'sent', auto: true, text: '스킨케어 베스트 제품을 안내드릴게요!',
        card: { title: '수분 크림 50ml', desc: '₩38,000 → ₩29,000 (24% 할인)', btnText: '구매하기' },
        time: '오후 2:16',
      },
    ],
  },
  {
    id: 2,
    name: '이지은',
    time: '5분 전',
    bg: 'linear-gradient(135deg, #f093fb, #f5576c)',
    initial: '이',
    status: 'open',
    unread: 2,
    tags: ['신규'],
    memo: '',
    assignee: null,
    automationPaused: false,
    automationPauseEnd: null,
    followers: 892,
    firstMessage: '2024.03.01',
    subscribed: true,
    messages: [
      { id: 1, type: 'received', text: '예약 변경하고 싶어요', time: '오후 1:50' },
      { id: 2, type: 'received', text: '내일로 바꿀 수 있나요?', time: '오후 1:51' },
    ],
  },
  {
    id: 3,
    name: '박준호',
    time: '12분 전',
    bg: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    initial: '박',
    status: 'done',
    unread: 0,
    tags: ['재구매'],
    memo: '단골 고객. 매달 주문.',
    assignee: '박지민',
    automationPaused: false,
    automationPauseEnd: null,
    followers: 456,
    firstMessage: '2023.11.20',
    subscribed: true,
    messages: [
      { id: 1, type: 'received', text: '감사합니다! 주문했습니다', time: '오후 1:43' },
      { id: 2, type: 'sent', text: '감사합니다! 빠르게 배송 도와드리겠습니다.', time: '오후 1:45' },
    ],
  },
  {
    id: 4,
    name: '최유리',
    time: '15분 전',
    bg: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    initial: '최',
    status: 'open',
    unread: 1,
    tags: ['문의중'],
    memo: '',
    assignee: null,
    automationPaused: false,
    automationPauseEnd: null,
    followers: 2100,
    firstMessage: '2024.03.10',
    subscribed: false,
    messages: [
      { id: 1, type: 'received', text: '배송은 얼마나 걸리나요?', time: '오후 1:40' },
    ],
  },
  {
    id: 5,
    name: '정다운',
    time: '1시간 전',
    bg: 'linear-gradient(135deg, #fa709a, #fee140)',
    initial: '정',
    status: 'open',
    unread: 0,
    tags: ['메이크업'],
    memo: '메이크업 관심 고객',
    assignee: '김하늘',
    automationPaused: false,
    automationPauseEnd: null,
    followers: 3500,
    firstMessage: '2024.01.05',
    subscribed: true,
    messages: [
      { id: 1, type: 'received', text: '제품 추천해주세요', time: '오후 12:30' },
      {
        id: 2, type: 'sent', auto: true, text: '어떤 제품을 찾고 계신가요?',
        buttons: ['립스틱', '파운데이션', '아이섀도'], time: '오후 12:30',
      },
    ],
  },
]

export default function LiveChatPage() {
  const [chats, setChats] = useState(INITIAL_CHATS)
  const [selectedId, setSelectedId] = useState(1)
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
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const tagInputRef = useRef(null)

  const selectedChat = chats.find((c) => c.id === selectedId)

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

  const handleSendMessage = () => {
    const text = inputText.trim()
    if (!text || !selectedChat) return
    addMessage(selectedId, { type: 'sent', text, time: now() })
    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
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

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    addMessage(selectedId, {
      type: 'sent',
      text: `[이미지 첨부: ${file.name}]`,
      time: now(),
      isImage: true,
    })
    e.target.value = ''
  }

  const handleSendCard = () => {
    addMessage(selectedId, {
      type: 'sent',
      text: '상품 카드를 전송합니다.',
      card: { title: '인기 상품', desc: '지금 구매시 20% 할인!', btnText: '자세히 보기' },
      time: now(),
    })
  }

  const handleQuickReply = (reply) => {
    addMessage(selectedId, { type: 'sent', text: reply, time: now() })
    setShowQuickReplies(false)
  }

  const handleToggleQuickReplies = () => {
    setShowQuickReplies((v) => !v)
  }

  const handleTagToolClick = () => {
    setShowTagInput(true)
    setShowTagSuggestions(true)
  }

  const handleAddTag = (tag) => {
    const trimmed = (tag || newTagText).trim()
    if (!trimmed || !selectedChat) return
    if (selectedChat.tags.includes(trimmed)) return
    updateChat(selectedId, (c) => ({ ...c, tags: [...c.tags, trimmed] }))
    setNewTagText('')
    setShowTagInput(false)
    setShowTagSuggestions(false)
  }

  const handleRemoveTag = (tag) => {
    updateChat(selectedId, (c) => ({ ...c, tags: c.tags.filter((t) => t !== tag) }))
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

  const handleMemoBlur = (e) => {
    updateChat(selectedId, { memo: e.target.value })
  }

  const handleToggleAutomation = () => {
    if (!selectedChat) return
    if (selectedChat.automationPaused) {
      updateChat(selectedId, { automationPaused: false, automationPauseEnd: null })
    } else {
      const pauseEnd = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      updateChat(selectedId, { automationPaused: true, automationPauseEnd: pauseEnd })
    }
  }

  const handleAssign = (member) => {
    updateChat(selectedId, { assignee: member.name })
    setShowAssignDropdown(false)
    addMessage(selectedId, {
      type: 'system',
      text: `대화가 ${member.name} (${member.role})에게 배정되었습니다.`,
      time: now(),
    })
  }

  const handleUnassign = () => {
    updateChat(selectedId, { assignee: null })
    setShowAssignDropdown(false)
    addMessage(selectedId, {
      type: 'system',
      text: '대화 배정이 해제되었습니다.',
      time: now(),
    })
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
          {filteredChats.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
              검색 결과가 없습니다.
            </div>
          )}
          {filteredChats.map((c) => (
            <div
              key={c.id}
              className={`chat-item${c.id === selectedId ? ' active' : ''}${c.unread > 0 ? ' unread' : ''}`}
              onClick={() => handleSelectChat(c.id)}
            >
              <div className="chat-item-avatar" style={{ background: c.bg }}>{c.initial}</div>
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
        <div className="chat-main-header">
          <div className="chat-user-info">
            <div className="chat-user-avatar" style={{ background: selectedChat?.bg }}>
              {selectedChat?.initial}
            </div>
            <div>
              <strong>{selectedChat?.name}</strong>
              <span>@user_{selectedChat?.initial} · 팔로워 {selectedChat?.followers?.toLocaleString()}</span>
            </div>
          </div>
          <div className="chat-header-actions">
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
                  {TEAM_MEMBERS.map((m) => (
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
              <div key={msg.id} className={`chat-msg ${msg.type}${msg.auto ? ' auto' : ''}`}>
                {msg.auto && (
                  <div className="msg-auto-badge"><i className="ri-robot-2-line" /> 자동 응답</div>
                )}
                {msg.isImage ? (
                  <p style={{ fontStyle: 'italic', color: '#666' }}>
                    <i className="ri-image-line" style={{ marginRight: 4 }} />{msg.text}
                  </p>
                ) : (
                  <p>{msg.text}</p>
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
              <div className="info-avatar" style={{ background: selectedChat.bg }}>
                {selectedChat.initial}
              </div>
              <h4>{selectedChat.name}</h4>
              <span>@user_{selectedChat.initial}</span>
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
                  onClick={() => updateChat(selectedId, (c) => ({ ...c, status: c.status === 'open' ? 'done' : 'open' }))}
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
    </div>
  )
}
