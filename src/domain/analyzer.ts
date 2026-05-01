import { recipes } from './recipes'
import type { InferredContext, RecipeSuggestion, ToneId, UseCaseId } from './types'

export interface AnalyzeInput {
  request: string
  manualUseCase: 'auto' | UseCaseId
  manualTone: 'auto' | ToneId
}

const useCaseHints: Array<[UseCaseId, string[]]> = [
  ['cover', ['표지', '포스터', '책자', '보고서', '리플렛', '홍보물']],
  ['signage', ['간판', '현수막', '배너', '입간판', '멀리']],
  ['icon', ['아이콘', '픽토그램', '표시', '분류']],
  ['sticker', ['스티커', '컷팅']],
  ['leaflet', ['리플렛', '전단', '홍보물']],
]

const toneHints: Array<[ToneId, string[]]> = [
  ['public', ['공공', '관공서', '안전', '캠페인', '안내']],
  ['friendly', ['귀엽', '친근', '어린이', '가족', '체험']],
  ['premium', ['고급', '프리미엄', '정갈']],
  ['bold', ['멀리', '크게', '눈에', '강조']],
]

export function analyzeRequest(input: AnalyzeInput): { context: InferredContext; suggestions: RecipeSuggestion[] } {
  const request = normalize(input.request)
  const keywords = extractKeywords(input.request)
  const context: InferredContext = {
    useCase: input.manualUseCase === 'auto' ? inferUseCase(request) : input.manualUseCase,
    tone: input.manualTone === 'auto' ? inferTone(request) : input.manualTone,
    keywords,
    objectCount: keywords.length,
  }

  const suggestions = recipes
    .map((recipe) => {
      const { score, reasons } = scoreRecipe(recipe.id, recipe.triggers, request, context)
      return { ...recipe, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  return { context, suggestions }
}

function scoreRecipe(
  recipeId: string,
  triggers: string[],
  request: string,
  context: InferredContext,
): { score: number; reasons: string[] } {
  let score = 16
  const reasons: string[] = []

  for (const trigger of triggers) {
    if (request.includes(trigger)) {
      score += 14
      reasons.push(`'${trigger}' 감지`)
    }
  }

  if (context.useCase === 'cover' && recipeId === 'cover-source-cluster') {
    score += 34
    reasons.push('표지/포스터 사용처')
  }
  if (context.useCase === 'signage' && recipeId === 'signage-bold') {
    score += 34
    reasons.push('간판/현수막 사용처')
  }
  if (context.useCase === 'icon' && recipeId === 'icon-set') {
    score += 34
    reasons.push('아이콘 사용처')
  }
  if (context.tone === 'friendly' && recipeId === 'mascot-main') {
    score += 22
    reasons.push('친근한 느낌')
  }
  if (context.tone === 'bold' && recipeId === 'signage-bold') {
    score += 18
    reasons.push('큰 가독성 우선')
  }
  if (context.objectCount >= 4 && recipeId === 'explain-infographic') {
    score += 18
    reasons.push('요소가 많음')
  }
  if (context.objectCount <= 2 && recipeId === 'single-object') {
    score += 10
    reasons.push('단일/소수 소재')
  }

  return { score: Math.min(score, 99), reasons: reasons.slice(0, 3) }
}

function inferUseCase(request: string): UseCaseId {
  for (const [useCase, hints] of useCaseHints) {
    if (hints.some((hint) => request.includes(hint))) return useCase
  }
  return 'source'
}

function inferTone(request: string): ToneId {
  for (const [tone, hints] of toneHints) {
    if (hints.some((hint) => request.includes(hint))) return tone
  }
  return 'clean'
}

function extractKeywords(request: string): string[] {
  return normalize(request)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word) => !['디자인', '소스', '생성', '제작', '사용', '위한', '으로'].includes(word))
    .slice(0, 12)
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
