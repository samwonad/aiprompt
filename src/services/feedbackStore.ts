import type { FeedbackRecord } from '../domain/types'

const STORAGE_KEY = 'samwon-design-feedback-v1'
const MAX_RECORDS = 300
const MAX_STORAGE_CHARS = 4_000_000

export interface SaveFeedbackResult {
  records: FeedbackRecord[]
  prunedCount: number
  warning: string
}

export function loadFeedbackRecords(): FeedbackRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as FeedbackRecord[]
  } catch {
    return []
  }
}

export function saveFeedbackRecords(records: FeedbackRecord[]): SaveFeedbackResult {
  const prepared = prepareForLocalStorage(records)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prepared.records))
    return prepared
  } catch {
    const fallbackRecords = prepared.records.map((record) => ({
      ...record,
      referenceImages: [],
      imageDataUrl: undefined,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackRecords))
    return {
      records: fallbackRecords,
      prunedCount: prepared.prunedCount,
      warning: '브라우저 저장공간이 부족해 참조 이미지는 제외하고 텍스트 피드백만 저장했습니다.',
    }
  }
}

export function exportFeedbackRecords(records: FeedbackRecord[]): void {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `samwon-design-feedback-${Date.now()}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function prepareForLocalStorage(records: FeedbackRecord[]): SaveFeedbackResult {
  const stripped = records.slice(0, MAX_RECORDS).map((record) => ({
    ...record,
    imageDataUrl: undefined,
  }))

  const originalCount = stripped.length
  const kept = [...stripped]

  while (kept.length > 1 && JSON.stringify(kept).length > MAX_STORAGE_CHARS) {
    kept.pop()
  }

  const prunedCount = originalCount - kept.length
  const warning =
    prunedCount > 0
      ? `브라우저 저장공간을 넘지 않도록 오래된 기록 ${prunedCount}건을 자동 정리했습니다.`
      : ''

  return { records: kept, prunedCount, warning }
}
