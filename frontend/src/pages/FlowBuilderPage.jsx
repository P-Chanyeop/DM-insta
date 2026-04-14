import { useState, useEffect, useCallback, useRef } from 'react'
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
      </div>
    </div>
  )
}
