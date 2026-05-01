import type { FeedbackRecord } from '../domain/types'

interface DataPanelProps {
  records: FeedbackRecord[]
  storageWarning?: string
}

export function DataPanel({ records, storageWarning }: DataPanelProps) {
  const successCount = records.filter((record) => record.feedbackKind === 'success').length
  const failureCount = records.length - successCount
  const referenceCount = records.reduce((sum, record) => sum + (record.referenceImages?.length ?? 0), 0)
  const recipeStats = buildRecipeStats(records)

  return (
    <aside className="data-column">
      <section className="card">
        <div className="card-header">
          <div>
            <h2>개선 데이터</h2>
            <p>프롬프트는 직원에게 숨기고 내부 기록으로만 저장합니다.</p>
          </div>
        </div>
        <div className="stats-grid">
          <Stat label="기록" value={records.length} />
          <Stat label="쓸만함" value={successCount} />
          <Stat label="실패" value={failureCount} />
          <Stat label="참조 이미지" value={referenceCount} />
        </div>
        {storageWarning && <p className="storage-warning">{storageWarning}</p>}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>레시피별 개선 우선순위</h2>
            <p>실패가 많이 쌓인 레시피부터 고칩니다.</p>
          </div>
        </div>
        <div className="recipe-stat-list">
          {recipeStats.length === 0 ? (
            <p className="muted">피드백이 쌓이면 레시피별 실패가 표시됩니다.</p>
          ) : (
            recipeStats.map((stat) => (
              <article className="recipe-stat" key={stat.recipeId}>
                <div className="recipe-stat-head">
                  <strong>{stat.recipeLabel}</strong>
                  <span>{stat.failureCount} 실패</span>
                </div>
                <div className="recipe-stat-meter">
                  <i style={{ width: `${Math.max(6, stat.failureRate * 100)}%` }} />
                </div>
                <p>{stat.topFailure || '쓸만함 기록 중심'}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>최근 기록</h2>
            <p>최대 300건을 브라우저에 보관합니다.</p>
          </div>
        </div>
        <div className="record-list">
          {records.length === 0 ? (
            <p className="muted">아직 저장된 피드백이 없습니다.</p>
          ) : (
            records.slice(0, 20).map((record) => (
              <article className="record-item" key={record.id}>
                <div>
                  <strong>{record.recipeLabel}</strong>
                  <span>{record.request}</span>
                  {record.feedbackNote && <small>{record.feedbackNote}</small>}
                  {record.referenceImages?.length > 0 && (
                    <div className="record-reference-row">
                      <strong className="record-reference-count">참조 이미지 {record.referenceImages.length}장</strong>
                      {record.referenceImages.slice(0, 3).map((image) => (
                        <img src={image.dataUrl} alt={image.name} key={image.id} />
                      ))}
                      {record.referenceImages.length > 3 && <b>+{record.referenceImages.length - 3}</b>}
                    </div>
                  )}
                </div>
                <em className={record.feedbackKind}>{record.feedbackLabel}</em>
              </article>
            ))
          )}
        </div>
      </section>
    </aside>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function buildRecipeStats(records: FeedbackRecord[]) {
  const grouped = new Map<
    string,
    {
      recipeId: string
      recipeLabel: string
      totalCount: number
      failureCount: number
      failures: Map<string, number>
    }
  >()

  for (const record of records) {
    const current = grouped.get(record.recipeId) ?? {
      recipeId: record.recipeId,
      recipeLabel: record.recipeLabel,
      totalCount: 0,
      failureCount: 0,
      failures: new Map<string, number>(),
    }

    current.totalCount += 1
    if (record.feedbackKind === 'failure') {
      current.failureCount += 1
      current.failures.set(record.feedbackLabel, (current.failures.get(record.feedbackLabel) ?? 0) + 1)
    }
    grouped.set(record.recipeId, current)
  }

  return [...grouped.values()]
    .map((stat) => {
      const topFailure = [...stat.failures.entries()].sort((a, b) => b[1] - a[1])[0]
      return {
        recipeId: stat.recipeId,
        recipeLabel: stat.recipeLabel,
        totalCount: stat.totalCount,
        failureCount: stat.failureCount,
        failureRate: stat.totalCount === 0 ? 0 : stat.failureCount / stat.totalCount,
        topFailure: topFailure ? `${topFailure[0]} ${topFailure[1]}건` : '',
      }
    })
    .sort((a, b) => b.failureCount - a.failureCount || b.failureRate - a.failureRate)
    .slice(0, 6)
}
