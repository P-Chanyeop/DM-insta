import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { flowService } from '../api/services'
import { nodeTypeMap } from '../components/flow-builder/nodeTypes'
import NodeEditor from '../components/flow-builder/NodeEditor'
import ABTestPanel from '../components/flow-builder/ABTestPanel'
import {
  flowDataToGraph,
  graphToFlowData,
  getDefaultGraph,
  NODE_PALETTE,
  generateNodeId,
  validateGraph,
  validateForActivation,
  extractTriggerType,
} from '../components/flow-builder/flowSerializer'
import { interpolateVariables, hasVariables } from '../components/flow-builder/VariableInserter'
import OnboardingTour from '../components/OnboardingTour'

/* ──────────────────────────────────────────────────────
 *  ManyChat-style 비주얼 플로우 빌더
 *  - 드래그 & 드롭 노드 추가
 *  - 노드 간 연결선
 *  - 노드 클릭 → 사이드바 속성 편집
 *  - 백엔드 flowData JSON 호환
 * ────────────────────────────────────────────────────── */

export default function FlowBuilderPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: urlFlowId } = useParams()
  const reactFlowWrapper = useRef(null)
  const tourRef = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const [currentFlowId, setCurrentFlowId] = useState(urlFlowId || location.state?.flowId || null)
  const [flowName, setFlowName] = useState('새 자동화')
  const [isLive, setIsLive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  // React Flow state
  const defaultGraph = getDefaultGraph()
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultGraph.edges)

  // 선택된 노드 (사이드바 편집용)
  const [selectedNode, setSelectedNode] = useState(null)

  // 노드 팔레트 열림 상태
  const [paletteOpen, setPaletteOpen] = useState(false)

  // DM 미리보기 패널 열림 상태
  const [previewOpen, setPreviewOpen] = useState(false)
  const [abTestOpen, setAbTestOpen] = useState(false)

  // 기존 플로우 로드
  useEffect(() => {
    if (!currentFlowId) return
    ;(async () => {
      try {
        const f = await flowService.get(currentFlowId)
        setFlowName(f.name)
        setIsLive(f.active || false)
        if (f.flowData) {
          try {
            const parsed = JSON.parse(f.flowData)
            const graph = flowDataToGraph(parsed)
            setNodes(graph.nodes)
            setEdges(graph.edges)
          } catch {}
        }
      } catch (err) {
        setError(err.message || '불러오기 실패')
      }
    })()
  }, [currentFlowId])

  // 엣지 연결
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#94A3B8', strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  // 노드 클릭 → 사이드바 열기
  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node)
  }, [])

  // 캔버스 클릭 → 사이드바 닫기
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // 노드 데이터 업데이트 (사이드바에서)
  const handleNodeUpdate = useCallback(
    (nodeId, newData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n))
      )
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: newData } : prev
      )
    },
    [setNodes]
  )

  // 노드 삭제
  const handleDeleteNode = useCallback(
    (nodeId) => {
      if (nodeId.startsWith('trigger')) return // 트리거는 삭제 불가
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      setSelectedNode(null)
    },
    [setNodes, setEdges]
  )

  // 드래그 앤 드롭: 팔레트에서 캔버스로
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      const dataStr = event.dataTransfer.getData('application/reactflow')
      if (!dataStr || !reactFlowInstance) return

      const { type, data } = JSON.parse(dataStr)
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNode = {
        id: generateNodeId(type),
        type,
        position,
        data: { ...data },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, setNodes]
  )

  // 저장
  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      // v2: 저장 전 그래프 검증
      const validation = validateGraph(nodes, edges)
      if (!validation.valid) {
        setError(validation.errors.join('\n'))
        return
      }

      // 활성화 상태로 저장 시 심화 검증
      if (isLive) {
        const activationCheck = validateForActivation(nodes, edges)
        if (!activationCheck.valid) {
          setError('플로우를 활성화 상태로 저장할 수 없습니다:\n' + activationCheck.errors.join('\n'))
          setIsLive(false)
          return
        }
      }

      const flowData = graphToFlowData(nodes, edges)
      const payload = {
        name: flowName,
        triggerType: extractTriggerType(flowData),
        flowData: JSON.stringify(flowData),
        active: isLive,
        status: isLive ? 'PUBLISHED' : 'DRAFT',
      }

      if (currentFlowId) {
        await flowService.update(currentFlowId, payload)
      } else {
        const created = await flowService.create(payload)
        if (created?.id) {
          setCurrentFlowId(created.id)
          navigate(`/app/flows/builder/${created.id}`, { replace: true })
        }
      }
      setSavedAt(new Date())
    } catch (err) {
      setError(err.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 팔레트 드래그 시작
  const onDragStart = (event, nodeType, nodeData) => {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ type: nodeType, data: nodeData })
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  // 팔레트 클릭으로 노드 추가
  const onPaletteClick = useCallback(
    (nodeType, nodeData) => {
      setNodes((nds) => {
        // 최신 nodes 배열에서 가장 아래 노드를 찾아 그 아래에 배치
        const lastNode = nds.length > 0
          ? nds.reduce((a, b) => (a.position.y > b.position.y ? a : b))
          : null
        const position = lastNode
          ? { x: lastNode.position.x, y: lastNode.position.y + 180 }
          : { x: 300, y: 100 }

        const newNode = {
          id: generateNodeId(nodeType),
          type: nodeType,
          position,
          data: { ...nodeData },
        }
        return [...nds, newNode]
      })
      setPaletteOpen(false)
    },
    [setNodes]
  )

  return (
    <div className="flow-builder-page">
      {/* ── 헤더 ── */}
      <div className="fb-header">
        <div className="fb-header-left">
          <button className="icon-btn" onClick={() => navigate('/app/flows')}>
            <i className="ri-arrow-left-line" />
          </button>
          <input
            className="fb-title-input"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="자동화 이름"
          />
        </div>
        <div className="fb-header-right">
          <div className={`fb-live-badge ${isLive ? 'live' : 'draft'}`}>
            {isLive ? '게시됨' : '임시저장'}
          </div>
          <label className="fb-live-toggle" title={isLive ? '비활성화하려면 토글 후 저장' : '활성화하려면 토글 후 저장'}>
            <input
              type="checkbox"
              checked={isLive}
              onChange={() => {
                if (!isLive) {
                  // 활성화 시도 → 심화 검증
                  const result = validateForActivation(nodes, edges)
                  if (!result.valid) {
                    setError('플로우를 활성화할 수 없습니다:\n' + result.errors.join('\n'))
                    return
                  }
                  if (result.warnings.length > 0) {
                    setError('⚠️ 경고:\n' + result.warnings.join('\n'))
                  }
                }
                setIsLive(!isLive)
                setSavedAt(null)
              }}
            />
            <span className="fb-toggle-slider" />
          </label>
          {savedAt === null && currentFlowId && (
            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>
              <i className="ri-error-warning-line" /> 저장되지 않은 변경
            </span>
          )}
          <button
            className="fb-guide-btn"
            onClick={() => tourRef.current?.restart()}
            title="사용법 가이드"
          >
            <i className="ri-question-line" />
          </button>
          <button
            className={`fb-preview-toggle-btn ${abTestOpen ? 'active' : ''}`}
            onClick={() => { setAbTestOpen(!abTestOpen); if (!abTestOpen) setPreviewOpen(false) }}
            title="A/B 테스트 결과"
          >
            <i className="ri-flask-line" />
          </button>
          <button
            className={`fb-preview-toggle-btn ${previewOpen ? 'active' : ''}`}
            onClick={() => { setPreviewOpen(!previewOpen); if (!previewOpen) setAbTestOpen(false) }}
            title="DM 미리보기"
          >
            <i className="ri-smartphone-line" />
          </button>
          <button
            className="btn-primary small"
            onClick={handleSave}
            disabled={saving}
          >
            <i className={saving ? 'ri-loader-4-line spin' : 'ri-save-line'} />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner error" style={{ margin: '8px 16px', whiteSpace: 'pre-line' }}>
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      {/* 연결선 삭제 안내 배너 — 노드가 2개 이상일 때만 표시 */}
      {nodes.length >= 2 && (
        <div style={{
          margin: '8px 16px 0', padding: '8px 14px',
          background: '#eef2ff', border: '1px solid #c7d2fe',
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, color: '#4338ca',
        }}>
          <i className="ri-information-line" style={{ fontSize: 16, color: '#6366f1' }} />
          <span>
            <strong>연결선 삭제:</strong> 선을 <u>클릭</u>해 빨간 점선으로 선택한 뒤{' '}
            <kbd style={{ padding: '1px 6px', background: '#fff', border: '1px solid #c7d2fe', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>Delete</kbd>
            {' '}또는{' '}
            <kbd style={{ padding: '1px 6px', background: '#fff', border: '1px solid #c7d2fe', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>Backspace</kbd>
            {' '}키를 누르세요. 노드 삭제도 동일합니다.
          </span>
        </div>
      )}

      {/* ── 메인 캔버스 영역 ── */}
      <div className="fb-canvas-layout">
        {/* 노드 팔레트 (좌측) */}
        <div className={`fb-palette ${paletteOpen ? 'open' : ''}`}>
          <div className="fb-palette-header">
            <h3><i className="ri-apps-line" /> 노드 추가</h3>
            <button className="fb-palette-close" onClick={() => setPaletteOpen(false)}>
              <i className="ri-close-line" />
            </button>
          </div>
          <div className="fb-palette-items">
            {NODE_PALETTE.map((item, i) => (
              <div
                key={i}
                className={`fb-palette-item${item.comingSoon ? ' coming-soon' : ''}`}
                draggable={!item.comingSoon}
                onDragStart={item.comingSoon ? undefined : (e) => onDragStart(e, item.type, item.defaultData)}
                onClick={item.comingSoon ? undefined : () => onPaletteClick(item.type, item.defaultData)}
              >
                <div
                  className="fb-palette-icon"
                  style={{ background: item.color + '18', color: item.color }}
                >
                  <i className={item.icon} />
                </div>
                <span>{item.label}</span>
                {item.comingSoon && <span className="coming-soon-badge">준비중</span>}
              </div>
            ))}
          </div>
        </div>

        {/* React Flow 캔버스 */}
        <div className="fb-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypeMap}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#94A3B8', strokeWidth: 2 },
            }}
          >
            <Background color="#CBD5E1" gap={20} size={1} />
            <Controls position="bottom-left" />
            <MiniMap
              position="bottom-right"
              nodeColor={(n) => {
                const colors = {
                  trigger: '#EF4444',
                  commentReply: '#06B6D4',
                  message: '#3B82F6',
                  condition: '#8B5CF6',
                  action: '#10B981',
                  delay: '#F59E0B',
                  webhook: '#6366F1',
                  carousel: '#EC4899',
                  abtest: '#F97316',
                  aiResponse: '#0EA5E9',
                }
                return colors[n.type] || '#94A3B8'
              }}
              maskColor="rgba(241, 245, 249, 0.7)"
            />

            {/* 팔레트 토글 버튼 */}
            <Panel position="top-left">
              <button
                className="fb-add-node-btn"
                onClick={() => setPaletteOpen(!paletteOpen)}
              >
                <i className="ri-add-line" /> 노드 추가
              </button>
            </Panel>

            {/* 저장 시각 */}
            {savedAt && (
              <Panel position="top-right">
                <div className="fb-saved-badge">
                  <i className="ri-check-line" /> 저장됨{' '}
                  {savedAt.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* 노드 편집 사이드바 (우측) */}
        {selectedNode && (
          <div className="fb-sidebar">
            <NodeEditor
              node={selectedNode}
              onUpdate={handleNodeUpdate}
              onClose={() => setSelectedNode(null)}
            />
            {!selectedNode.id.startsWith('trigger') && (
              <div className="fb-sidebar-footer">
                <button
                  className="btn-danger small"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                >
                  <i className="ri-delete-bin-line" /> 노드 삭제
                </button>
              </div>
            )}
          </div>
        )}

        {/* DM 미리보기 패널 (우측) */}
        {previewOpen && (
          <PhonePreview nodes={nodes} edges={edges} />
        )}

        {/* A/B 테스트 결과 패널 (우측) */}
        {abTestOpen && (
          <ABTestPanel flowId={currentFlowId} />
        )}
      </div>

      <OnboardingTour ref={tourRef} />
    </div>
  )
}

/* ── 인스타그램 DM 폰 프리뷰 (다크모드) ──
 * 엣지 연결 순서대로 노드를 방문하여 메시지 생성.
 * 연결되지 않은 고아 노드는 회색 '(미연결)' 배지와 함께 하단에 표시.
 */
function PhonePreview({ nodes, edges }) {
  const previewEndRef = useRef(null)
  const [selectedPathIdx, setSelectedPathIdx] = useState(0)
  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [nodes, edges, selectedPathIdx])

  // 트리거 정보 (첫 user 메시지 시뮬레이션용)
  const triggerNode = nodes.find(n => n.type === 'trigger')
  const commentReplyNode = nodes.find(n => n.type === 'commentReply')
  const triggerKeyword = triggerNode?.data?.keywords?.split(',')[0]?.trim() || '키워드'
  const triggerType = triggerNode?.data?.triggerType || 'comment'
  const previewCtx = { name: '홍길동', username: '@user123', keyword: triggerKeyword }
  const preview = (text) => interpolateVariables(text, previewCtx)

  // ─── 노드 → 메시지 변환기 ───
  const renderNodeMessages = (node, isOrphan = false) => {
    const out = []
    const d = node?.data || {}
    const orphanMark = isOrphan ? { orphan: true } : {}

    switch (node.type) {
      case 'trigger':
      case 'commentReply':
        // 대화 시작 구간. 미리보기에선 별도 표시 안 함 (헤더에서 처리)
        return out
      case 'message': {
        const role = d.role || 'main'
        const stepLabel = role === 'opening' ? '오프닝 DM' : role === 'followup' ? '팔로업' : '메인 DM'
        const linkBtns = (d.links || []).filter(l => l.label || l.url).map(l => ({ label: l.label || '링크', url: l.url }))
        const buttons = d.buttonText ? [{ label: d.buttonText }] : linkBtns
        out.push({
          type: 'bot-bubble',
          text: preview(d.message) || `${stepLabel} 메시지`,
          hasVars: hasVariables(d.message),
          buttons,
          step: stepLabel,
          ...orphanMark,
        })
        if (role === 'opening' && d.buttonText) {
          out.push({ type: 'user-action', text: `"${d.buttonText}" 버튼 탭` })
        }
        return out
      }
      case 'condition': {
        const ct = d.conditionType
        if (ct === 'followCheck') {
          const retry = d.retryOnFail !== false  // 기본 true
          const btnLabel = d.retryButton || '확인했어요'
          const buttons = retry
            ? [{ label: '팔로우 하기' }, { label: btnLabel }]
            : [{ label: '팔로우 하기' }]
          out.push({ type: 'bot-bubble', text: preview(d.message) || '팔로우 후 다시 시도해 주세요', hasVars: hasVariables(d.message), buttons, step: '팔로우 확인', ...orphanMark })
          if (retry) {
            out.push({ type: 'user-action', text: `"${btnLabel}" 버튼 탭` })
            out.push({ type: 'system-note', text: '🔁 팔로우 상태를 다시 확인합니다', ...orphanMark })
          } else {
            out.push({ type: 'user-action', text: '팔로우 완료 (수동)' })
          }
        } else if (ct === 'emailCheck') {
          out.push({ type: 'bot-bubble', text: preview(d.message) || '이메일을 입력해 주세요', hasVars: hasVariables(d.message), buttons: [], step: '이메일 수집', ...orphanMark })
          out.push({ type: 'user-text', text: 'example@email.com' })
        } else {
          const labels = { tagCheck: '태그 확인', customField: '필드 조건', timeRange: '시간 조건', random: '랜덤 분기' }
          let detail = ''
          if (ct === 'tagCheck') detail = `태그 "${d.tagName || '?'}" 보유 여부`
          else if (ct === 'customField') detail = `${d.fieldName || '?'} ${d.operator || '='} ${d.fieldValue || '?'}`
          else if (ct === 'timeRange') detail = `${d.startHour ?? 9}시~${d.endHour ?? 18}시 활성`
          else if (ct === 'random') detail = `${d.probability ?? 50}% 확률로 통과`
          out.push({ type: 'system-note', text: `🔀 ${labels[ct] || '조건'}: ${detail}`, step: labels[ct] || '조건', ...orphanMark })
        }
        return out
      }
      case 'delay':
        out.push({ type: 'delay', value: d.delay || 30, unit: d.unit || 'minutes', ...orphanMark })
        return out
      case 'action': {
        const labels = { addTag: '태그 추가', removeTag: '태그 제거', setVariable: '변수 설정', addNote: '노트 추가', subscribe: '구독 처리', unsubscribe: '구독 해제' }
        out.push({ type: 'system-note', text: `⚡ ${labels[d.actionType] || '액션'}: ${d.value || '(미설정)'}`, step: '액션', ...orphanMark })
        return out
      }
      case 'webhook':
        out.push({ type: 'system-note', text: `🔗 웹훅 ${d.method || 'POST'}: ${d.url || '(URL 미설정)'}`, step: '웹훅', ...orphanMark })
        return out
      case 'optIn':
        out.push({ type: 'bot-bubble', text: d.message || '새 소식을 받아보시겠어요?', buttons: [{ label: '알림 받기' }], step: '알림 구독', ...orphanMark })
        return out
      case 'inventory':
        out.push({ type: 'system-note', text: `📦 재고 확인 ${d.groupBuyId ? `(공동구매 #${d.groupBuyId})` : '(미연결)'}`, step: '재고 확인', ...orphanMark })
        return out
      case 'carousel': {
        const cards = (d.cards || []).map(c => ({ title: c.title || '제목 없음', subtitle: c.subtitle || '', buttonText: c.buttonText || '보기' }))
        out.push({ type: 'carousel', cards, step: '캐러셀', ...orphanMark })
        return out
      }
      case 'abtest': {
        const pct = d.variantA ?? 50
        out.push({ type: 'system-note', text: `🔀 A/B 테스트 (A:${pct}% / B:${100 - pct}%) — ${d.testName || '테스트'}`, step: 'A/B 테스트', ...orphanMark })
        return out
      }
      case 'aiResponse': {
        if (d.mode === 'faq') {
          const validFaqs = (d.faqItems || []).filter(f => f.keyword && f.answer)
          if (validFaqs.length > 0) {
            out.push({ type: 'user-text', text: validFaqs[0].keyword.split(',')[0]?.trim() || '질문' })
            out.push({ type: 'bot-bubble', text: preview(validFaqs[0].answer), hasVars: hasVariables(validFaqs[0].answer), buttons: [], step: 'AI FAQ 응답', ...orphanMark })
          } else {
            out.push({ type: 'system-note', text: '🤖 AI FAQ 응답 (항목 미설정)', step: 'AI 응답', ...orphanMark })
          }
        } else {
          const toneLabel = { friendly: '친근한', professional: '전문적', casual: '캐주얼' }[d.brandTone?.style] || '친근한'
          out.push({ type: 'user-text', text: '이 상품 가격이 어떻게 되나요?' })
          out.push({ type: 'ai-response', text: `안녕하세요! ${d.brandTone?.emoji !== false ? '😊 ' : ''}문의 주셔서 감사합니다. AI가 ${toneLabel} 톤으로 자동 응답합니다.`, step: 'AI 스마트 응답', ...orphanMark })
        }
        return out
      }
      case 'kakao': {
        const typeLabel = d.kakaoType === 'friendtalk' ? '친구톡' : '알림톡'
        out.push({ type: 'system-note', text: `💬 카카오 ${typeLabel}: ${d.kakaoType === 'alimtalk' ? (d.templateCode || '템플릿 미설정') : (d.message?.slice(0, 30) || '메시지 미설정')}`, step: `카카오 ${typeLabel}`, ...orphanMark })
        return out
      }
      default:
        return out
    }
  }

  // ─── 엣지/그래프 준비 ───
  const edgeBySource = new Map()
  edges.forEach(e => {
    if (!edgeBySource.has(e.source)) edgeBySource.set(e.source, [])
    edgeBySource.get(e.source).push(e)
  })
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const inDegree = new Map(nodes.map(n => [n.id, 0]))
  edges.forEach(e => inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1))
  const startNode = triggerNode || commentReplyNode || nodes.find(n => inDegree.get(n.id) === 0) || nodes[0]

  // ─── 분기 handle 한글 라벨 (long + short 쌍) ───
  // B안: 칩엔 짧은 라벨, 브레드크럼엔 긴 라벨
  const handleLabel = (sourceNode, handleId) => {
    if (!handleId) return null
    const h = String(handleId).toLowerCase()
    // 조건 노드
    if (sourceNode?.type === 'condition') {
      const ct = sourceNode.data?.conditionType
      if (/yes|true|pass/i.test(h)) {
        if (ct === 'followCheck') return { long: '팔로워', short: '팔로워 ✓' }
        if (ct === 'emailCheck') return { long: '이메일 수집 완료', short: '이메일 ✓' }
        if (ct === 'tagCheck') return { long: `태그 보유 (${sourceNode.data?.tagName || '?'})`, short: `${sourceNode.data?.tagName || '태그'} ✓` }
        if (ct === 'timeRange') return { long: `영업시간 내 (${sourceNode.data?.startHour ?? 9}~${sourceNode.data?.endHour ?? 18}시)`, short: '영업시간 ✓' }
        if (ct === 'customField') return { long: '조건 일치', short: '조건 ✓' }
        return { long: '통과', short: '통과' }
      }
      if (/no|false|fail/i.test(h)) {
        if (ct === 'followCheck') return { long: '미팔로우', short: '팔로워 ✗' }
        if (ct === 'emailCheck') return { long: '이메일 미수집', short: '이메일 ✗' }
        if (ct === 'tagCheck') return { long: '태그 없음', short: `${sourceNode.data?.tagName || '태그'} ✗` }
        if (ct === 'timeRange') return { long: '영업시간 외', short: '영업시간 ✗' }
        if (ct === 'customField') return { long: '조건 불일치', short: '조건 ✗' }
        return { long: '실패', short: '실패' }
      }
    }
    // A/B 테스트 노드
    if (sourceNode?.type === 'abtest') {
      const pct = sourceNode.data?.variantA ?? 50
      if (/^a$/i.test(h)) return { long: `A 변형 (${pct}%)`, short: `A ${pct}%` }
      if (/^b$/i.test(h)) return { long: `B 변형 (${100 - pct}%)`, short: `B ${100 - pct}%` }
    }
    // 랜덤 조건 (condition.random) — probability 사용
    if (sourceNode?.type === 'condition' && sourceNode.data?.conditionType === 'random') {
      const prob = sourceNode.data?.probability ?? 50
      if (/^a$/i.test(h) || /pass/i.test(h)) return { long: `통과 (${prob}%)`, short: `통과 ${prob}%` }
      if (/^b$/i.test(h) || /fail/i.test(h)) return { long: `불통과 (${100 - prob}%)`, short: `불통과 ${100 - prob}%` }
    }
    // 웹훅 응답 (webhook 노드만)
    if (sourceNode?.type === 'webhook') {
      if (/success|2xx|pass/i.test(h)) return { long: '응답 성공', short: '2xx ✓' }
      if (/error|fail|4xx|5xx/i.test(h)) return { long: '응답 실패', short: 'Err ✗' }
    }
    return null
  }

  // A안: 분기 노드의 "진짜 미사용" 케이스만 감지 (양쪽 다 미연결)
  // 한쪽만 비어있는 건 "그 분기에서 대화 종료" 의도로 허용
  const branchingTypes = new Set(['condition', 'abtest', 'webhook'])
  const incompleteBranchNodeIds = new Set()
  nodes.forEach(n => {
    if (!branchingTypes.has(n.type)) return
    const outs = edgeBySource.get(n.id) || []
    if (outs.length === 0) incompleteBranchNodeIds.add(n.id)
  })

  // ─── 경로 열거 (DFS, 순환 방지, 경로당 노드 최대 30) ───
  // path = { nodeIds, labels: [{atNodeId, long, short}], cyclic?, truncated?, incompleteAt? }
  const MAX_PATHS = 12
  const MAX_DEPTH = 30
  const allPaths = []
  const dfs = (nodeId, visited, pathNodes, pathLabels) => {
    if (allPaths.length >= MAX_PATHS) return
    if (visited.has(nodeId)) {
      allPaths.push({ nodeIds: pathNodes.slice(), labels: pathLabels.slice(), cyclic: true })
      return
    }
    if (pathNodes.length >= MAX_DEPTH) {
      allPaths.push({ nodeIds: pathNodes.slice(), labels: pathLabels.slice(), truncated: true })
      return
    }
    const newVisited = new Set(visited); newVisited.add(nodeId)
    const newPathNodes = pathNodes.concat([nodeId])
    const outs = edgeBySource.get(nodeId) || []
    // A안: 분기 노드인데 미완성이면 여기서 경로 종료 + incomplete 플래그
    if (incompleteBranchNodeIds.has(nodeId)) {
      allPaths.push({ nodeIds: newPathNodes, labels: pathLabels.slice(), incompleteAt: nodeId })
      // 연결된 일부 분기는 계속 탐색
      const sourceNode = nodeById.get(nodeId)
      outs.forEach(e => {
        const lbl = handleLabel(sourceNode, e.sourceHandle)
        const newLabels = lbl ? pathLabels.concat([{ atNodeId: nodeId, ...lbl }]) : pathLabels
        dfs(e.target, newVisited, newPathNodes, newLabels)
      })
      return
    }
    if (outs.length === 0) {
      allPaths.push({ nodeIds: newPathNodes, labels: pathLabels.slice() })
      return
    }
    const sourceNode = nodeById.get(nodeId)
    outs.forEach(e => {
      const lbl = handleLabel(sourceNode, e.sourceHandle)
      const newLabels = lbl ? pathLabels.concat([{ atNodeId: nodeId, ...lbl }]) : pathLabels
      dfs(e.target, newVisited, newPathNodes, newLabels)
    })
  }
  if (startNode) dfs(startNode.id, new Set(), [], [])

  // B안: 칩 라벨 = 번호 + 짧은 라벨 " · " 로 이음
  const pathNameFor = (path, idx) => {
    const num = `#${idx + 1}`
    if (!path) return num
    if (path.incompleteAt) {
      const shortLbls = path.labels.map(l => l.short).filter(Boolean).join(' · ')
      return `${num}${shortLbls ? ' · ' + shortLbls : ''} · ⚠ 미완성`
    }
    if (path.labels.length === 0) return `${num} · 기본`
    return `${num} · ${path.labels.map(l => l.short).join(' · ')}`
  }
  // C안: 브레드크럼 = 긴 라벨 " › "
  const pathBreadcrumbFor = (path) => {
    if (!path || path.labels.length === 0) return '기본 경로'
    return path.labels.map(l => l.long).join(' › ')
  }

  // 유효 경로 인덱스 클램프
  const safeIdx = Math.min(selectedPathIdx, Math.max(0, allPaths.length - 1))
  const selectedPath = allPaths[safeIdx]

  // ─── 선택된 경로만 메시지 렌더 ───
  const msgs = []
  const visitedInPath = new Set(selectedPath?.nodeIds || [])
  if (selectedPath) {
    selectedPath.nodeIds.forEach(id => {
      const node = nodeById.get(id)
      if (!node) return
      renderNodeMessages(node, false).forEach(m => msgs.push(m))
    })
    if (selectedPath.cyclic) {
      msgs.push({ type: 'divider', text: '🔁 순환 감지 — 이 경로는 반복됩니다' })
    }
    if (selectedPath.truncated) {
      msgs.push({ type: 'divider', text: `⚠️ 경로가 ${MAX_DEPTH}노드를 초과해 잘렸습니다` })
    }
    if (selectedPath.incompleteAt) {
      const node = nodeById.get(selectedPath.incompleteAt)
      const nodeLabel = node?.data?.conditionType === 'followCheck' ? '팔로우 확인'
        : node?.data?.conditionType === 'emailCheck' ? '이메일 수집'
        : node?.data?.conditionType === 'tagCheck' ? '태그 확인'
        : node?.data?.conditionType === 'timeRange' ? '시간 조건'
        : node?.data?.conditionType === 'customField' ? '필드 조건'
        : '조건 노드'
      msgs.push({ type: 'divider', text: `⚠️ "${nodeLabel}" 분기에 연결이 전혀 없습니다 — 이 조건 노드는 동작하지 않습니다` })
    } else if (!selectedPath.cyclic && !selectedPath.truncated) {
      // A안: 정상 경로 끝에 "대화 종료" 라벨 (마지막 분기 라벨이 있을 때만)
      const lastLabel = selectedPath.labels[selectedPath.labels.length - 1]
      if (lastLabel) {
        msgs.push({ type: 'divider', text: `💬 여기서 대화 종료 (${lastLabel.long})` })
      }
    }
  }

  // 고아 노드: 선택 경로에 포함되지도, 다른 경로에도 없는 노드
  const anyPathNodeIds = new Set()
  allPaths.forEach(p => p.nodeIds.forEach(id => anyPathNodeIds.add(id)))
  const orphans = nodes.filter(n =>
    !anyPathNodeIds.has(n.id) &&
    n.type !== 'trigger' && n.type !== 'commentReply'
  )
  if (orphans.length > 0) {
    msgs.push({ type: 'divider', text: `⚠️ 연결되지 않은 노드 ${orphans.length}개 — 실제 발송에선 동작하지 않습니다` })
    orphans.forEach(n => {
      renderNodeMessages(n, true).forEach(m => msgs.push(m))
    })
  }

  return (
    <div className="ig-preview-wrap">
      <div className="ig-phone">
        <div className="ig-phone-notch" />
        <div className="ig-screen">
          {/* 헤더 */}
          <div className="ig-header">
            <i className="ri-arrow-left-s-line" />
            <div className="ig-header-avatar">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='1' x2='1' y2='0'%3E%3Cstop stop-color='%23FCAF45'/%3E%3Cstop offset='.5' stop-color='%23FD1D1D'/%3E%3Cstop offset='1' stop-color='%23833AB4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='16' cy='16' r='16' fill='url(%23g)'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-size='14' font-weight='bold' font-family='sans-serif'%3EB%3C/text%3E%3C/svg%3E" alt="" />
            </div>
            <div className="ig-header-info">
              <strong>my_brand</strong>
              <span>Business chat</span>
            </div>
            <div className="ig-header-actions">
              <i className="ri-phone-line" />
              <i className="ri-vidicon-line" />
            </div>
          </div>

          {/* 시나리오 칩 선택기 — 분기가 있을 때만 (경로 2개 이상) */}
          {allPaths.length >= 2 && (
            <div className="ig-scenario-picker">
              <div className="ig-scenario-label">
                <i className="ri-route-line" /> 시나리오 ({allPaths.length}개)
                {incompleteBranchNodeIds.size > 0 && (
                  <span style={{ color: '#fbbf24', marginLeft: 6 }}>
                    <i className="ri-error-warning-line" /> 미완성 분기 {incompleteBranchNodeIds.size}개
                  </span>
                )}
              </div>
              <div className="ig-scenario-chips">
                {allPaths.map((p, idx) => {
                  const name = pathNameFor(p, idx)
                  const isIncomplete = !!p.incompleteAt
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`ig-scenario-chip${idx === safeIdx ? ' active' : ''}${isIncomplete ? ' incomplete' : ''}`}
                      onClick={() => setSelectedPathIdx(idx)}
                      title={pathBreadcrumbFor(p)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
              {/* C안: 브레드크럼 — 현재 선택 경로의 긴 라벨 */}
              {selectedPath && selectedPath.labels.length > 0 && (
                <div className="ig-scenario-breadcrumb">
                  <i className="ri-git-branch-line" />
                  <span>{pathBreadcrumbFor(selectedPath)}</span>
                </div>
              )}
            </div>
          )}

          {/* 대화 영역 */}
          <div className="ig-chat">
            <div className="ig-chat-notice">
              <i className="ri-store-2-line" /> Business chat
            </div>
            <div className="ig-timestamp">오늘</div>

            {/* 유저 시작 메시지 */}
            <div className="ig-msg-row sent">
              <div className="ig-bubble-sent">
                {triggerType === 'comment' ? (triggerKeyword || '키워드') : '안녕하세요'}
              </div>
            </div>

            {/* 댓글 답장 (댓글 트리거일 때) */}
            {commentReplyNode && triggerType === 'comment' && (
              <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> 공개 댓글 답장</div>
            )}

            {msgs.length === 0 && (
              <div className="ig-empty-hint">
                <p>노드를 추가하면 미리보기가 표시됩니다</p>
              </div>
            )}

            {msgs.map((msg, i) => {
              if (msg.type === 'bot-bubble') {
                const showAvatar = i === 0 || msgs[i-1]?.type === 'user-text' || msgs[i-1]?.type === 'user-action' || msgs[i-1]?.type === 'delay'
                return (
                  <div key={i} style={msg.orphan ? { opacity: 0.5 } : {}}>
                    {msg.step && <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> {msg.step}</div>}
                    <div className="ig-msg-row received">
                      {showAvatar ? <div className="ig-avatar-small">B</div> : <div className="ig-avatar-spacer" />}
                      <div className={`ig-bubble-received${msg.buttons?.length ? ' has-buttons' : ''}`}>
                        <div className="ig-bubble-text">
                          {msg.text}
                          {msg.hasVars && <span className="ig-var-badge" title="변수가 미리보기 값으로 표시됩니다"><i className="ri-braces-line" /></span>}
                        </div>
                        {msg.buttons?.length > 0 && (
                          <div className="ig-bubble-buttons">
                            {msg.buttons.map((btn, j) => (
                              <div key={j} className="ig-bubble-btn">
                                {btn.url && <i className="ri-external-link-line" />}
                                {btn.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
              if (msg.type === 'user-action') {
                return (
                  <div key={i} className="ig-user-action">
                    <i className="ri-cursor-line" /> {msg.text}
                  </div>
                )
              }
              if (msg.type === 'user-text') {
                return (
                  <div key={i} className="ig-msg-row sent">
                    <div className="ig-bubble-sent">{msg.text}</div>
                  </div>
                )
              }
              if (msg.type === 'delay') {
                const unitLabel = msg.unit === 'minutes' ? '분' : msg.unit === 'hours' ? '시간' : '일'
                return (
                  <div key={i} className="ig-delay-badge">
                    <i className="ri-time-line" /> {msg.value}{unitLabel} 후
                  </div>
                )
              }
              if (msg.type === 'system-note') {
                return (
                  <div key={i} style={msg.orphan ? { opacity: 0.5 } : {}}>
                    {msg.step && <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> {msg.step}</div>}
                    <div className="ig-system-note">{msg.text}</div>
                  </div>
                )
              }
              if (msg.type === 'ai-response') {
                return (
                  <div key={i} style={msg.orphan ? { opacity: 0.5 } : {}}>
                    {msg.step && <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> {msg.step}</div>}
                    <div className="ig-msg-row received">
                      <div className="ig-avatar-small ai">
                        <i className="ri-robot-line" style={{ fontSize: 10, color: '#fff' }} />
                      </div>
                      <div className="ig-bubble-received ig-ai-bubble">
                        <div className="ig-bubble-text">{msg.text}</div>
                        <div className="ig-ai-badge"><i className="ri-robot-line" /> AI 생성</div>
                      </div>
                    </div>
                  </div>
                )
              }
              if (msg.type === 'carousel') {
                return (
                  <div key={i} style={msg.orphan ? { opacity: 0.5 } : {}}>
                    {msg.step && <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> {msg.step}</div>}
                    <div className="ig-carousel-preview">
                      {msg.cards.map((card, j) => (
                        <div key={j} className="ig-carousel-card">
                          <div className="ig-carousel-img"><i className="ri-image-line" /></div>
                          <div className="ig-carousel-title">{card.title}</div>
                          {card.subtitle && <div className="ig-carousel-subtitle">{card.subtitle}</div>}
                          <div className="ig-carousel-btn">{card.buttonText}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              if (msg.type === 'divider') {
                return (
                  <div key={i} style={{
                    margin: '16px 0 8px',
                    padding: '8px 12px',
                    background: '#fef3c7',
                    border: '1px dashed #f59e0b',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#92400e',
                    textAlign: 'center',
                  }}>
                    {msg.text}
                  </div>
                )
              }
              return null
            })}
            <div ref={previewEndRef} className="ig-chat-anchor" />
          </div>

          {/* 하단 입력 */}
          <div className="ig-input-bar">
            <div className="ig-input-camera"><i className="ri-camera-line" /></div>
            <div className="ig-input-field">Message...</div>
            <div className="ig-input-icons">
              <i className="ri-mic-line" />
              <i className="ri-image-line" />
              <i className="ri-sticker-line" />
            </div>
          </div>
        </div>
      </div>

      {/* 공개 댓글 프리뷰 */}
      {commentReplyNode && triggerType === 'comment' && commentReplyNode.data.replies?.[0] && (
        <div className="fb-comment-preview">
          <h4><i className="ri-chat-3-line" /> 공개 댓글 답장 미리보기</h4>
          <div className="fb-comment-preview-body">
            <div className="fb-comment-item">
              <div className="fb-comment-avatar">U</div>
              <div>
                <strong>@user</strong>
                <p>{triggerKeyword || '키워드'}</p>
              </div>
            </div>
            <div className="fb-comment-item reply">
              <div className="fb-comment-avatar brand">B</div>
              <div>
                <strong>@my_brand</strong>
                <p>{preview(commentReplyNode.data.replies[0])}</p>
              </div>
            </div>
          </div>
          <div className="fb-comment-meta">
            <span><i className="ri-shuffle-line" /> {commentReplyNode.data.replies.filter(r => r.trim()).length}개 변형 랜덤</span>
            {commentReplyNode.data.replyDelay > 0 && (
              <span><i className="ri-timer-line" /> 딜레이 적용</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
