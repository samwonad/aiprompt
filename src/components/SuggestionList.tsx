import type { RecipeSuggestion } from '../domain/types'

interface SuggestionListProps {
  suggestions: RecipeSuggestion[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function SuggestionList({ suggestions, selectedId, onSelect }: SuggestionListProps) {
  return (
    <section className="panel-block">
      <div className="block-title">2. 추천 제작 방향</div>
      {suggestions.length === 0 ? (
        <p className="muted">입력 후 방향 추천을 누르면 3개 제작 방향을 제안합니다.</p>
      ) : (
        <div className="suggestion-list">
          {suggestions.map((recipe) => (
            <button
              className={`suggestion-card ${recipe.id === selectedId ? 'active' : ''}`}
              key={recipe.id}
              type="button"
              onClick={() => onSelect(recipe.id)}
            >
              <div className="suggestion-head">
                <strong>{recipe.staffLabel}</strong>
                <span>{recipe.score}%</span>
              </div>
              <p>{recipe.description}</p>
              <div className="chip-row">
                <span>{recipe.useCase}</span>
                <span>{recipe.composition}</span>
              </div>
              {recipe.reasons.length > 0 && <div className="reason">근거: {recipe.reasons.join(', ')}</div>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
