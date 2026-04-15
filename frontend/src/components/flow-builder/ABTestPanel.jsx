import { useState, useEffect } from 'react'
import { abTestService } from '../../api/services'
import { useToast } from '../Toast'

export default function ABTestPanel({ flowId }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    if (flowId) loadTests()
    else setLoading(false)
  }, [flowId])

  const loadTests = async () => {
    setLoading(true)
    try {
      const data = await abTestService.getByFlow(flowId)
      setTests(data || [])
    } catch {
      // API 실패 시 빈 상태 유지
    } finally {
      setLoading(false)
    }
  }

  const handleEnd = async (id) => {
    try {
      await abTestService.end(id)
      toast.success('테스트가 종료되었습니다')
      loadTests()
    } catch {
      toast.error('테스트 종료 실패')
    }
  }

  const handleReset = async (id) => {
    if (!confirm('테스트 데이터를 초기화하시겠습니까?')) return
    try {
      await abTestService.reset(id)
      toast.success('테스트가 초기화되었습니다')
      loadTests()
    } catch {
      toast.error('초기화 실패')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('테스트를 삭제하시겠습니까?')) return
    try {
      await abTestService.delete(id)
      toast.success('테스트가 삭제되었습니다')
      loadTests()
    } catch {
      toast.error('삭제 실패')
    }
  }

  if (loading) {
    return (
      <div className="abt-panel">
        <div className="abt-panel-header">
          <h3><i className="ri-flask-line" /> A/B 테스트</h3>
        </div>
        <div className="abt-panel-empty">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="abt-panel">
      <div className="abt-panel-header">
        <h3><i className="ri-flask-line" /> A/B 테스트 결과</h3>
        <button className="icon-btn" onClick={loadTests} title="새로고침">
          <i className="ri-refresh-line" />
        </button>
      </div>

      {tests.length === 0 ? (
        <div className="abt-panel-empty">
          <i className="ri-flask-line" />
          <p>아직 실행된 A/B 테스트가 없습니다</p>
          <span>플로우에 A/B 테스트 노드를 추가하고 실행하면 결과가 여기에 표시됩니다.</span>
        </div>
      ) : (
        <div className="abt-test-list">
          {tests.map(test => {
            const totalA = test.variantACount || 0
            const totalB = test.variantBCount || 0
            const total = totalA + totalB
            const rateA = totalA > 0 ? ((test.variantACompleted || 0) / totalA * 100).toFixed(1) : '0.0'
            const rateB = totalB > 0 ? ((test.variantBCompleted || 0) / totalB * 100).toFixed(1) : '0.0'
            const winner = parseFloat(rateA) > parseFloat(rateB) ? 'A' : parseFloat(rateB) > parseFloat(rateA) ? 'B' : null

            return (
              <div key={test.id} className="abt-test-card">
                <div className="abt-test-title">
                  <span>{test.testName}</span>
                  <span className={`abt-status ${test.status?.toLowerCase()}`}>
                    {test.status === 'RUNNING' ? '진행 중' : test.status === 'COMPLETED' ? '완료' : '일시중지'}
                  </span>
                </div>

                <div className="abt-split-info">
                  <span>분배: A {test.variantAPercent}% / B {100 - test.variantAPercent}%</span>
                  <span>총 {total}회 실행</span>
                </div>

                <div className="abt-variants">
                  <div className={`abt-variant${winner === 'A' ? ' winner' : ''}`}>
                    <div className="abt-variant-header">
                      <span className="abt-variant-label">A</span>
                      {winner === 'A' && <i className="ri-trophy-line" style={{ color: '#F59E0B' }} />}
                    </div>
                    <div className="abt-variant-bar">
                      <div className="abt-variant-fill a" style={{ width: `${rateA}%` }} />
                    </div>
                    <div className="abt-variant-stats">
                      <span className="abt-variant-rate">{rateA}%</span>
                      <span className="abt-variant-count">{test.variantACompleted || 0} / {totalA}</span>
                    </div>
                  </div>

                  <div className={`abt-variant${winner === 'B' ? ' winner' : ''}`}>
                    <div className="abt-variant-header">
                      <span className="abt-variant-label">B</span>
                      {winner === 'B' && <i className="ri-trophy-line" style={{ color: '#F59E0B' }} />}
                    </div>
                    <div className="abt-variant-bar">
                      <div className="abt-variant-fill b" style={{ width: `${rateB}%` }} />
                    </div>
                    <div className="abt-variant-stats">
                      <span className="abt-variant-rate">{rateB}%</span>
                      <span className="abt-variant-count">{test.variantBCompleted || 0} / {totalB}</span>
                    </div>
                  </div>
                </div>

                <div className="abt-test-actions">
                  {test.status === 'RUNNING' && (
                    <button className="btn-sm" onClick={() => handleEnd(test.id)}>
                      <i className="ri-stop-circle-line" /> 종료
                    </button>
                  )}
                  <button className="btn-sm" onClick={() => handleReset(test.id)}>
                    <i className="ri-restart-line" /> 초기화
                  </button>
                  <button className="btn-sm danger" onClick={() => handleDelete(test.id)}>
                    <i className="ri-delete-bin-line" /> 삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
