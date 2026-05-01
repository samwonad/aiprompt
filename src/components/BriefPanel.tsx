import { Eye, ImagePlus } from 'lucide-react'
import type { DesignBrief } from '../domain/types'

interface BriefPanelProps {
  brief?: DesignBrief
  showPrompt: boolean
  onTogglePrompt: () => void
  onGenerate: () => void
  generating: boolean
}

export function BriefPanel({ brief, showPrompt, onTogglePrompt, onGenerate, generating }: BriefPanelProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>제작 브리프</h2>
          <p>{brief ? brief.recipe.version : 'recipe 없음'}</p>
        </div>
      </div>
      <div className="brief-grid">
        <BriefItem label="직원 입력" value={brief?.request ?? '입력 후 방향 추천을 누르세요.'} />
        <BriefItem label="사용처 판단" value={brief?.recipe.useCase ?? '대기'} />
        <BriefItem label="구성 방식" value={brief?.recipe.composition ?? '대기'} />
        <BriefItem label="스타일" value={brief?.recipe.style ?? '대기'} />
        <BriefItem label="출력" value={brief?.recipe.output ?? '투명 PNG 예정'} />
        <BriefItem label="키워드" value={brief?.context.keywords.join(', ') || '대기'} />
      </div>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={onGenerate} disabled={!brief || generating}>
          <ImagePlus size={16} />
          {generating ? '준비 중' : '생성 요청'}
        </button>
        <button className="ghost-button" type="button" onClick={onTogglePrompt} disabled={!brief}>
          <Eye size={16} />
          내부 프롬프트
        </button>
      </div>
      {showPrompt && brief && <pre className="prompt-view">{brief.prompt}</pre>}
    </section>
  )
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="brief-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
