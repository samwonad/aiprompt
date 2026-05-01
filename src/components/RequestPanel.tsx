import { Wand2 } from 'lucide-react'
import type { ToneId, UseCaseId } from '../domain/types'

interface RequestPanelProps {
  request: string
  useCase: 'auto' | UseCaseId
  tone: 'auto' | ToneId
  onRequestChange: (value: string) => void
  onUseCaseChange: (value: 'auto' | UseCaseId) => void
  onToneChange: (value: 'auto' | ToneId) => void
  onAnalyze: () => void
  onSample: () => void
}

export function RequestPanel(props: RequestPanelProps) {
  return (
    <section className="panel-block">
      <div className="block-title">1. 직원 입력</div>
      <textarea
        className="request-input"
        value={props.request}
        onChange={(event) => props.onRequestChange(event.target.value)}
        placeholder="예: 표지 디자인에 쓸 농업 소스. 농부, 채소밭, 농기계, 채소바구니"
      />
      <div className="field-grid">
        <label>
          <span>사용처</span>
          <select value={props.useCase} onChange={(event) => props.onUseCaseChange(event.target.value as 'auto' | UseCaseId)}>
            <option value="auto">자동 판단</option>
            <option value="cover">표지/포스터</option>
            <option value="signage">간판/현수막</option>
            <option value="leaflet">리플렛/홍보물</option>
            <option value="sticker">스티커/컷팅</option>
            <option value="icon">아이콘/픽토그램</option>
          </select>
        </label>
        <label>
          <span>느낌</span>
          <select value={props.tone} onChange={(event) => props.onToneChange(event.target.value as 'auto' | ToneId)}>
            <option value="auto">자동 판단</option>
            <option value="clean">깔끔하게</option>
            <option value="friendly">친근하게</option>
            <option value="public">공공기관 느낌</option>
            <option value="premium">고급스럽게</option>
            <option value="bold">멀리서 잘 보이게</option>
          </select>
        </label>
      </div>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={props.onAnalyze}>
          <Wand2 size={16} />
          방향 추천
        </button>
        <button className="ghost-button" type="button" onClick={props.onSample}>
          예시 입력
        </button>
      </div>
    </section>
  )
}
