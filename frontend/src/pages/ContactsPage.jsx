import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SkeletonRow } from '../components/PageLoader'
import { useToast } from '../components/Toast'
import { usePlan } from '../components/PlanContext'
import { QuotaBar } from '../components/UpgradeModal'
import { contactService } from '../api/services'

const GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
]

function gradientFor(idx) {
  return GRADIENTS[idx % GRADIENTS.length]
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleDateString('ko-KR')
}

function formatRelative(value) {
  if (!value) return '-'
  const diff = Date.now() - new Date(value).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}

export default function ContactsPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const toast = useToast()
  const { getLimit } = usePlan()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pageData, setPageData] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('전체')

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Detail modal
  const [detailContact, setDetailContact] = useState(null)

  // Import UI
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState(null)

  // Segment form
  const [showSegmentForm, setShowSegmentForm] = useState(false)
  const [segmentName, setSegmentName] = useState('')
  const [segmentCondition, setSegmentCondition] = useState('tag')
  const [segmentValue, setSegmentValue] = useState('')
  const [customSegments, setCustomSegments] = useState([])

  const loadContacts = async (p = 0) => {
    try {
      setLoading(true)
      const data = await contactService.list(p, 20)
      setPageData(data)
      setPage(p)
    } catch (err) {
      setError(err.message || '연락처를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContacts(0) }, [])

  const contacts = pageData?.content || []
  const totalElements = pageData?.totalElements || 0
  const totalPages = pageData?.totalPages || 0

  // Filtering by tag/status and search
  const filtered = contacts.filter((c) => {
    if (search) {
      const s = search.toLowerCase()
      if (!(c.name || '').toLowerCase().includes(s) &&
          !(c.username || '').toLowerCase().includes(s) &&
          !(c.email || '').toLowerCase().includes(s)) return false
    }
    if (filter === 'VIP' && !(c.tags || []).includes('VIP')) return false
    if (filter === '신규' && !(c.tags || []).includes('신규')) return false
    if (filter === '비활성' && c.active) return false
    // Custom segments filter by tag name
    const customSeg = customSegments.find((s) => s.name === filter)
    if (customSeg) {
      if (customSeg.condition === 'tag' && !(c.tags || []).includes(customSeg.value)) return false
      if (customSeg.condition === 'active' && String(c.active) !== customSeg.value) return false
      if (customSeg.condition === 'name' && !(c.name || '').includes(customSeg.value)) return false
    }
    return true
  })

  // --- Select all ---
  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Export CSV ---
  const handleExport = () => {
    const rows = filtered.length > 0 ? filtered : contacts
    if (rows.length === 0) return
    const headers = ['이름', '사용자명', '이메일', '구독일', '태그', '메시지수', '상태']
    const csvRows = [
      headers.join(','),
      ...rows.map((c) => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.username || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${formatDate(c.subscribedAt)}"`,
        `"${(c.tags || []).join(', ')}"`,
        c.messageCount ?? 0,
        c.active ? '활성' : '비활성',
      ].join(',')),
    ]
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Import CSV ---
  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (file) setImportFile(file)
  }

  const handleImportSubmit = async () => {
    if (!importFile) return
    try {
      const text = await importFile.text()
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length < 2) {
        toast.warning('CSV 파일에 데이터가 없습니다. 헤더 행 아래에 데이터를 추가해주세요.')
        return
      }
      // Parse header
      const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase())
      const nameIdx = headers.findIndex((h) => h === '이름' || h === 'name')
      const usernameIdx = headers.findIndex((h) => h === '사용자명' || h === 'username')
      const memoIdx = headers.findIndex((h) => h === '메모' || h === 'memo')

      if (usernameIdx === -1 && nameIdx === -1) {
        toast.warning('CSV 파일에 "이름" 또는 "사용자명" 열이 필요합니다.')
        return
      }

      const contacts = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.replace(/"/g, '').trim())
        return {
          name: nameIdx >= 0 ? cols[nameIdx] || '' : '',
          username: usernameIdx >= 0 ? cols[usernameIdx] || '' : cols[nameIdx] || '',
          memo: memoIdx >= 0 ? cols[memoIdx] || '' : '',
        }
      }).filter((c) => c.username)

      if (contacts.length === 0) {
        toast.warning('가져올 수 있는 연락처가 없습니다.')
        return
      }

      const result = await contactService.import(contacts)
      setShowImport(false)
      setImportFile(null)
      setError('')
      await loadContacts(0)
      toast.success(`가져오기 완료: ${result.imported}명 추가, ${result.skipped}명 중복 스킵`)
    } catch (err) {
      toast.error(err.message || 'CSV 가져오기에 실패했습니다.')
    }
  }

  // --- View detail ---
  const handleView = async (contact) => {
    try {
      const full = await contactService.get(contact.id)
      setDetailContact(full || contact)
    } catch {
      setDetailContact(contact)
    }
  }

  // --- Message ---
  const handleMessage = (contact) => {
    navigate('/app/livechat', { state: { contactId: contact.id, contactName: contact.name || contact.username } })
  }

  // --- Segment add ---
  const handleAddSegment = () => {
    if (!segmentName.trim()) return
    setCustomSegments((prev) => [...prev, {
      name: segmentName.trim(),
      condition: segmentCondition,
      value: segmentValue.trim(),
    }])
    setSegmentName('')
    setSegmentValue('')
    setShowSegmentForm(false)
  }

  // --- Bulk actions ---
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size}명의 연락처를 삭제하시겠습니까?`)) return
    try {
      await contactService.deleteBulk([...selectedIds])
      setSelectedIds(new Set())
      toast.success(`${selectedIds.size}명의 연락처가 삭제되었습니다.`)
      await loadContacts(page)
    } catch (err) {
      toast.error(err.message || '연락처 삭제에 실패했습니다.')
    }
  }

  const handleBulkTag = async () => {
    if (selectedIds.size === 0) return
    const tag = prompt('추가할 태그를 입력하세요:')
    if (!tag) return
    try {
      for (const id of selectedIds) {
        const c = contacts.find((x) => x.id === id)
        if (c) {
          await contactService.update(id, { tags: [...new Set([...(c.tags || []), tag])] })
        }
      }
      setSelectedIds(new Set())
      toast.success('태그가 추가되었습니다.')
      await loadContacts(page)
    } catch (err) {
      toast.error('태그 추가에 실패했습니다.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>연락처 관리</h2>
          <p>총 {totalElements.toLocaleString('ko-KR')}명의 구독자를 관리하세요</p>
          {getLimit('contacts') !== Infinity && (
            <QuotaBar current={totalElements} max={getLimit('contacts')} label="연락처" loading={loading} />
          )}
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleExport}>
            <i className="ri-download-2-line" /> 내보내기
          </button>
          <button className="btn-secondary" onClick={() => setShowImport(!showImport)}>
            <i className="ri-upload-2-line" /> 가져오기
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner error">
          <i className="ri-error-warning-line" /> {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }} onClick={() => setError('')}>
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      {/* Import area */}
      {showImport && (
        <div className="alert-banner" style={{ background: 'var(--card)', border: '2px dashed var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
          <h4 style={{ margin: 0 }}>CSV 파일 가져오기</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            CSV 파일의 첫 번째 행은 헤더(이름, 사용자명, 이메일)로 구성해주세요.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportFile}
            style={{ fontSize: '0.9rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleImportSubmit} disabled={!importFile}>
              <i className="ri-upload-2-line" /> 업로드
            </button>
            <button className="btn-secondary" onClick={() => { setShowImport(false); setImportFile(null) }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* Segment bar */}
      <div className="segment-bar">
        <div className="segment-filters">
          {['전체', 'VIP', '신규', '비활성', ...customSegments.map((s) => s.name)].map((s) => (
            <div
              className={`segment-chip${filter === s ? ' active' : ''}`}
              key={s}
              onClick={() => setFilter(s)}
            >
              {s}
            </div>
          ))}
          <button className="segment-chip add" onClick={() => setShowSegmentForm(!showSegmentForm)}>
            <i className="ri-add-line" /> 세그먼트 추가
          </button>
        </div>
        <div className="segment-search">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="이름, 사용자명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Segment form */}
      {showSegmentForm && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>세그먼트 이름</label>
            <input
              type="text"
              placeholder="예: 프리미엄 고객"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>조건</label>
            <select
              value={segmentCondition}
              onChange={(e) => setSegmentCondition(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.9rem' }}
            >
              <option value="tag">태그 포함</option>
              <option value="active">활성 상태</option>
              <option value="name">이름 포함</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>값</label>
            {segmentCondition === 'active' ? (
              <select
                value={segmentValue}
                onChange={(e) => setSegmentValue(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.9rem' }}
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder="값 입력"
                value={segmentValue}
                onChange={(e) => setSegmentValue(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: '0.9rem' }}
              />
            )}
          </div>
          <button className="btn-primary" onClick={handleAddSegment} disabled={!segmentName.trim()}>
            추가
          </button>
          <button className="btn-secondary" onClick={() => setShowSegmentForm(false)}>
            취소
          </button>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--primary)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {selectedIds.size}명 선택됨
          </span>
          <button className="btn-secondary" onClick={handleBulkTag} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
            <i className="ri-price-tag-3-line" /> 태그 추가
          </button>
          <button className="btn-secondary" onClick={handleBulkDelete} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', color: '#ef4444' }}>
            <i className="ri-delete-bin-line" /> 삭제
          </button>
          <button className="btn-secondary" onClick={() => setSelectedIds(new Set())} style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', marginLeft: 'auto' }}>
            선택 해제
          </button>
        </div>
      )}

      <div className="contacts-table-wrapper">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>사용자</th>
              <th>구독일</th>
              <th>태그</th>
              <th>메시지 수</th>
              <th>마지막 활동</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && <><SkeletonRow cols={8} /><SkeletonRow cols={8} /><SkeletonRow cols={8} /></>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="empty-state">연락처가 없습니다.</td></tr>
            )}
            {filtered.map((c, idx) => (
              <tr key={c.id} className={selectedIds.has(c.id) ? 'selected-row' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                  />
                </td>
                <td>
                  <div className="contact-user">
                    <div className="contact-avatar" style={{ background: gradientFor(idx) }}>
                      {(c.name || c.username || '?').charAt(0)}
                    </div>
                    <div>
                      <strong>{c.name || c.username}</strong>
                      <span>@{c.username}</span>
                    </div>
                  </div>
                </td>
                <td>{formatDate(c.subscribedAt)}</td>
                <td>
                  {(c.tags || []).map((t) => (
                    <span className="mini-tag" key={t}>{t}</span>
                  ))}
                </td>
                <td>{c.messageCount}</td>
                <td>{formatRelative(c.lastActiveAt)}</td>
                <td>
                  <span className={`status-badge ${c.active ? 'active' : 'inactive'}`}>
                    {c.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td>
                  <button className="icon-btn" title="상세 보기" onClick={() => handleView(c)}>
                    <i className="ri-eye-line" />
                  </button>
                  <button className="icon-btn" title="메시지 보내기" onClick={() => handleMessage(c)}>
                    <i className="ri-message-3-line" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <span>
          {totalElements === 0 ? '0명' : `${page * 20 + 1}-${Math.min((page + 1) * 20, totalElements)} / 총 ${totalElements.toLocaleString('ko-KR')}명`}
        </span>
        <div className="pagination-btns">
          <button
            className="icon-btn"
            disabled={page <= 0}
            onClick={() => loadContacts(page - 1)}
          >
            <i className="ri-arrow-left-s-line" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show pages around current page
            let start = Math.max(0, page - 2)
            const end = Math.min(totalPages, start + 5)
            start = Math.max(0, end - 5)
            return start + i
          }).filter((i) => i < totalPages).map((i) => (
            <button
              key={i}
              className={`page-num${page === i ? ' active' : ''}`}
              onClick={() => loadContacts(i)}
            >
              {i + 1}
            </button>
          ))}
          {totalPages > 5 && page < totalPages - 3 && <span>...</span>}
          <button
            className="icon-btn"
            disabled={page >= totalPages - 1}
            onClick={() => loadContacts(page + 1)}
          >
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {detailContact && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setDetailContact(null)}
        >
          <div
            style={{ background: 'var(--card)', borderRadius: '1rem', padding: '2rem', minWidth: '400px', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>연락처 상세</h3>
              <button className="icon-btn" onClick={() => setDetailContact(null)}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="contact-avatar" style={{ background: gradientFor(0), width: '56px', height: '56px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 700 }}>
                {(detailContact.name || detailContact.username || '?').charAt(0)}
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{detailContact.name || detailContact.username}</h4>
                <span style={{ color: 'var(--muted)' }}>@{detailContact.username}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>이메일</div>
                <div>{detailContact.email || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>전화번호</div>
                <div>{detailContact.phone || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>구독일</div>
                <div>{formatDate(detailContact.subscribedAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>마지막 활동</div>
                <div>{formatRelative(detailContact.lastActiveAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>메시지 수</div>
                <div>{detailContact.messageCount ?? 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>상태</div>
                <span className={`status-badge ${detailContact.active ? 'active' : 'inactive'}`}>
                  {detailContact.active ? '활성' : '비활성'}
                </span>
              </div>
            </div>
            {(detailContact.tags || []).length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>태그</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(detailContact.tags || []).map((t) => (
                    <span className="mini-tag" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {detailContact.notes && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>메모</div>
                <div>{detailContact.notes}</div>
              </div>
            )}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => { setDetailContact(null); handleMessage(detailContact) }}>
                <i className="ri-message-3-line" /> 메시지 보내기
              </button>
              <button className="btn-secondary" onClick={() => setDetailContact(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
