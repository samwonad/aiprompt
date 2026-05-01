import { useMemo, useState } from 'react'
import './App.css'
import { analyzeRequest } from './domain/analyzer'
import { createBrief } from './domain/promptBuilder'
import { feedbackOptions } from './domain/recipes'
import type {
  DesignBrief,
  FeedbackOption,
  FeedbackReferenceImage,
  FeedbackRecord,
  GenerationResult,
  RecipeSuggestion,
  ToneId,
  UseCaseId,
} from './domain/types'
import { BriefPanel } from './components/BriefPanel'
import { DataPanel } from './components/DataPanel'
import { FeedbackPanel } from './components/FeedbackPanel'
import { RequestPanel } from './components/RequestPanel'
import { ResultPanel } from './components/ResultPanel'
import { SuggestionList } from './components/SuggestionList'
import { TopBar } from './components/TopBar'
import { generateDesign } from './services/designApi'
import { exportFeedbackRecords, loadFeedbackRecords, saveFeedbackRecords } from './services/feedbackStore'

function App() {
  const [request, setRequest] = useState('')
  const [useCase, setUseCase] = useState<'auto' | UseCaseId>('auto')
  const [tone, setTone] = useState<'auto' | ToneId>('auto')
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [brief, setBrief] = useState<DesignBrief>()
  const [showPrompt, setShowPrompt] = useState(false)
  const [generation, setGeneration] = useState<GenerationResult>()
  const [generating, setGenerating] = useState(false)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [referenceImages, setReferenceImages] = useState<FeedbackReferenceImage[]>([])
  const [records, setRecords] = useState<FeedbackRecord[]>(() => loadFeedbackRecords())
  const [storageWarning, setStorageWarning] = useState('')

  const selectedRecipe = useMemo(
    () => suggestions.find((suggestion) => suggestion.id === selectedId),
    [selectedId, suggestions],
  )

  const analyze = () => {
    const cleaned = request.trim()
    if (!cleaned) {
      setSuggestions([])
      setSelectedId(undefined)
      setBrief(undefined)
      setGeneration(undefined)
      return
    }

    const result = analyzeRequest({ request: cleaned, manualUseCase: useCase, manualTone: tone })
    setSuggestions(result.suggestions)
    setSelectedId(result.suggestions[0]?.id)
    setBrief(result.suggestions[0] ? createBrief(cleaned, result.suggestions[0], result.context) : undefined)
    setGeneration(undefined)
  }

  const selectSuggestion = (id: string) => {
    const recipe = suggestions.find((item) => item.id === id)
    if (!recipe) return
    const result = analyzeRequest({ request: request.trim(), manualUseCase: useCase, manualTone: tone })
    setSelectedId(id)
    setBrief(createBrief(request.trim(), recipe, result.context))
    setGeneration(undefined)
  }

  const loadSample = () => {
    setRequest('표지 디자인에 쓸 농업 소스. 농부, 채소밭, 농기계, 채소바구니')
    setUseCase('cover')
    setTone('clean')
  }

  const runGeneration = async () => {
    if (!brief) return
    setGenerating(true)
    try {
      const result = await generateDesign(brief)
      setGeneration(result)
      setFeedbackNote('')
      setReferenceImages([])
    } finally {
      setGenerating(false)
    }
  }

  const saveFeedback = (feedback: FeedbackOption, note: string, images: FeedbackReferenceImage[]) => {
    if (!generation) return
    const record: FeedbackRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      request: generation.brief.request,
      recipeId: generation.brief.recipe.id,
      recipeVersion: generation.brief.recipe.version,
      recipeLabel: generation.brief.recipe.staffLabel,
      context: generation.brief.context,
      prompt: generation.brief.prompt,
      apiOptions: generation.brief.apiOptions,
      imageDataUrl: generation.imageDataUrl,
      feedbackId: feedback.id,
      feedbackLabel: feedback.label,
      feedbackKind: feedback.kind,
      feedbackNote: note.trim(),
      referenceImages: images,
    }
    const next = [record, ...records].slice(0, 300)
    const saveResult = saveFeedbackRecords(next)
    setRecords(saveResult.records)
    setStorageWarning(saveResult.warning)
    setGeneration(undefined)
    setFeedbackNote('')
    setReferenceImages([])
  }

  const clearRecords = () => {
    if (!window.confirm('저장된 피드백 기록을 모두 지울까요?')) return
    setRecords([])
    saveFeedbackRecords([])
    setStorageWarning('')
  }

  return (
    <div className="app-shell">
      <TopBar onExport={() => exportFeedbackRecords(records)} onClear={clearRecords} />
      <main className="workspace">
        <aside className="left-column">
          <RequestPanel
            request={request}
            useCase={useCase}
            tone={tone}
            onRequestChange={setRequest}
            onUseCaseChange={setUseCase}
            onToneChange={setTone}
            onAnalyze={analyze}
            onSample={loadSample}
          />
          <SuggestionList suggestions={suggestions} selectedId={selectedId} onSelect={selectSuggestion} />
        </aside>

        <section className="center-column">
          <BriefPanel
            brief={selectedRecipe ? brief : undefined}
            showPrompt={showPrompt}
            onTogglePrompt={() => setShowPrompt((value) => !value)}
            onGenerate={runGeneration}
            generating={generating}
          />
          <ResultPanel result={generation} />
          <FeedbackPanel
            options={feedbackOptions}
            result={generation}
            note={feedbackNote}
            referenceImages={referenceImages}
            onNoteChange={setFeedbackNote}
            onReferenceImagesChange={setReferenceImages}
            onFeedback={saveFeedback}
          />
        </section>

        <DataPanel records={records} storageWarning={storageWarning} />
      </main>
    </div>
  )
}

export default App
