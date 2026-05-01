import type { DesignBrief, GenerationResult } from '../domain/types'

export async function generateDesign(brief: DesignBrief): Promise<GenerationResult> {
  try {
    const response = await fetch('/.netlify/functions/generate-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        mode: 'draft',
        message: `이미지 생성 실패: ${errorText}`,
        brief,
      }
    }

    return (await response.json()) as GenerationResult
  } catch (error) {
    return {
      mode: 'draft',
      message: `이미지 API 호출 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      brief,
    }
  }
}
