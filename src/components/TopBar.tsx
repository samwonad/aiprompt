import { Download, RotateCcw } from 'lucide-react'

interface TopBarProps {
  onExport: () => void
  onClear: () => void
}

export function TopBar({ onExport, onClear }: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <div className="brand">Samwon Design Generator</div>
        <div className="brand-sub">짧은 입력을 제작 레시피와 실패 데이터로 연결</div>
      </div>
      <span className="status-pill">MVP</span>
      <span className="status-pill">Recipe Driven</span>
      <div className="top-spacer" />
      <button className="ghost-button" type="button" onClick={onExport}>
        <Download size={16} />
        기록 내보내기
      </button>
      <button className="danger-button" type="button" onClick={onClear}>
        <RotateCcw size={16} />
        기록 초기화
      </button>
    </header>
  )
}
