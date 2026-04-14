import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import {
  flowDataToGraph,
  graphToFlowData,
  getDefaultGraph,
  NODE_PALETTE,
  generateNodeId,
} from '../components/flow-builder/flowSerializer'
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
  const reactFlowWrapper = useRef(null)
  const tourRef = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const [currentFlowId, setCurrentFlowId] = useState(location.state?.flowId || null)
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

      const flowData = graphToFlowData(nodes, edges)
      const payload = {
        name: flowName,
        triggerType: (flowData.trigger?.type || 'comment').toUpperCase(),
        flowData: JSON.stringify(flowData),
        active: isLive,
        status: isLive ? 'PUBLISHED' : 'DRAFT',
      }

      if (currentFlowId) {
        await flowService.update(currentFlowId, payload)
      } else {
        const created = await flowService.create(payload)
        if (created?.id) setCurrentFlowId(created.id)
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
            {isLive ? 'Live' : 'Draft'}
          </div>
          <label className="fb-live-toggle">
            <input
              type="checkbox"
              checked={isLive}
              onChange={() => setIsLive(!isLive)}
            />
            <span className="fb-toggle-slider" />
          </label>
          <button
            className="fb-guide-btn"
            onClick={() => tourRef.current?.restart()}
            title="사용법 가이드"
          >
            <i className="ri-question-line" />
          </button>
          <button
            className={`fb-preview-toggle-btn ${previewOpen ? 'active' : ''}`}
            onClick={() => setPreviewOpen(!previewOpen)}
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
        <div className="alert-banner error" style={{ margin: '8px 16px' }}>
          <i className="ri-error-warning-line" /> {error}
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
                className="fb-palette-item"
                draggable
                onDragStart={(e) => onDragStart(e, item.type, item.defaultData)}
              >
                <div
                  className="fb-palette-icon"
                  style={{ background: item.color + '18', color: item.color }}
                >
                  <i className={item.icon} />
                </div>
                <span>{item.label}</span>
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
                  delay: '#F59E0B',
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
          <PhonePreview nodes={nodes} />
        )}
      </div>

      <OnboardingTour ref={tourRef} />
    </div>
  )
}

/* ── 인스타그램 DM 폰 프리뷰 (다크모드) ── */
function PhonePreview({ nodes }) {
  const msgs = []

  // 노드 데이터에서 메시지 목록 생성
  const triggerNode = nodes.find(n => n.type === 'trigger')
  const commentReplyNode = nodes.find(n => n.type === 'commentReply')
  const openingNode = nodes.find(n => n.type === 'message' && n.data.role === 'opening')
  const followCheckNode = nodes.find(n => n.type === 'condition' && n.data.conditionType === 'followCheck')
  const emailCheckNode = nodes.find(n => n.type === 'condition' && n.data.conditionType === 'emailCheck')
  const mainNode = nodes.find(n => n.type === 'message' && n.data.role === 'main')
  const delayNode = nodes.find(n => n.type === 'delay')
  const followUpNode = nodes.find(n => n.type === 'message' && n.data.role === 'followup')

  // 오프닝 DM
  if (openingNode) {
    msgs.push({
      type: 'bot-bubble',
      text: openingNode.data.message || '오프닝 메시지',
      buttons: openingNode.data.buttonText ? [{ label: openingNode.data.buttonText }] : [],
      step: '오프닝 DM',
    })
    if (openingNode.data.buttonText) {
      msgs.push({ type: 'user-action', text: `"${openingNode.data.buttonText}" 버튼 탭` })
    }
  }

  // 팔로우 체크
  if (followCheckNode) {
    msgs.push({
      type: 'bot-bubble',
      text: followCheckNode.data.message || '팔로우 후 다시 시도해 주세요',
      buttons: [{ label: '팔로우 하기' }],
      step: '팔로우 확인',
    })
    msgs.push({ type: 'user-action', text: '팔로우 완료' })
  }

  // 이메일 수집
  if (emailCheckNode) {
    msgs.push({ type: 'bot-bubble', text: emailCheckNode.data.message || '이메일을 입력해 주세요', buttons: [], step: '이메일 수집' })
    msgs.push({ type: 'user-text', text: 'example@email.com' })
  }

  // 메인 DM + 링크
  if (mainNode) {
    const linkBtns = (mainNode.data.links || []).filter(l => l.label || l.url).map(l => ({ label: l.label || '링크', url: l.url }))
    msgs.push({ type: 'bot-bubble', text: mainNode.data.message || '메인 메시지', buttons: linkBtns, step: '메인 DM' })
  }

  // 팔로업
  if (followUpNode) {
    const d = delayNode?.data
    const unitLabel = d?.unit === 'hours' ? '시간' : d?.unit === 'days' ? '일' : '분'
    msgs.push({ type: 'delay', value: d?.delay || 30, unit: d?.unit || 'minutes' })
    msgs.push({ type: 'bot-bubble', text: followUpNode.data.message || '팔로업 메시지', buttons: [], step: '팔로업' })
  }

  const triggerKeyword = triggerNode?.data.keywords || '키워드'
  const triggerType = triggerNode?.data.triggerType || 'comment'

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
                  <div key={i}>
                    {msg.step && <div className="ig-step-label"><i className="ri-arrow-right-s-fill" /> {msg.step}</div>}
                    <div className="ig-msg-row received">
                      {showAvatar ? <div className="ig-avatar-small">B</div> : <div className="ig-avatar-spacer" />}
                      <div className={`ig-bubble-received${msg.buttons?.length ? ' has-buttons' : ''}`}>
                        <div className="ig-bubble-text">{msg.text}</div>
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
              return null
            })}
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
                <p>{commentReplyNode.data.replies[0]}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
