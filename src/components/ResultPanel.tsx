import { Download } from 'lucide-react'
import type { GenerationResult } from '../domain/types'

interface ResultPanelProps {
  result?: GenerationResult
}

export function ResultPanel({ result }: ResultPanelProps) {
  const download = () => {
    if (!result?.imageDataUrl) return
    const anchor = document.createElement('a')
    anchor.href = result.imageDataUrl
    anchor.download = `samwon-source-${Date.now()}.png`
    anchor.click()
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>생성 결과</h2>
          <p>{result ? result.message : 'API 연결 전에는 생성 요청 구조를 먼저 검증합니다.'}</p>
        </div>
        {result?.imageDataUrl && (
          <button className="ghost-button" type="button" onClick={download}>
            <Download size={16} />
            PNG
          </button>
        )}
      </div>
      <div className="result-stage">
        {result?.imageDataUrl ? (
          <img src={result.imageDataUrl} alt="생성된 디자인 소스" />
        ) : (
          <div className="empty-result">
            <strong>{result ? '생성 요청 기록 준비 완료' : '아직 생성 요청이 없습니다.'}</strong>
            <span>{result?.brief.recipe.staffLabel ?? '먼저 제작 방향을 선택하세요.'}</span>
          </div>
        )}
      </div>
    </section>
  )
}
