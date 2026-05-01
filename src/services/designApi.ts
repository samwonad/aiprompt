import type { DesignBrief, GenerationResult } from '../domain/types'

export async function generateDesign(brief: DesignBrief): Promise<GenerationResult> {
  try {
    const response = await fetch('/.netlify/functions/generate-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    return (await response.json()) as GenerationResult
  } catch {
    return {
      mode: 'draft',
      message: '이미지 API는 아직 연결되지 않았습니다. 현재는 생성 요청과 피드백 구조를 검증합니다.',
      brief,
    }
  }
}
