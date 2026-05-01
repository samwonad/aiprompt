import OpenAI from 'openai'
import { z } from 'zod'

const requestSchema = z.object({
  brief: z.object({
    request: z.string(),
    prompt: z.string().min(10),
    apiOptions: z.object({
      model: z.string(),
      size: z.string(),
      quality: z.string(),
      background: z.literal('transparent'),
      output_format: z.literal('png'),
    }),
    recipe: z.object({
      id: z.string(),
      version: z.string(),
      staffLabel: z.string(),
    }).passthrough(),
    context: z.object({}).passthrough(),
  }).passthrough(),
})

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const parsed = requestSchema.safeParse(JSON.parse(event.body || '{}'))
  if (!parsed.success) {
    return json(400, { error: 'Invalid request', details: parsed.error.flatten() })
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(200, {
      mode: 'draft',
      message: 'OPENAI_API_KEY가 없어 드래프트 모드로 기록만 생성했습니다.',
      brief: parsed.data.brief,
    })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const options = parsed.data.brief.apiOptions
  const model = process.env.OPENAI_IMAGE_MODEL || options.model
  const supportsTransparentBackground = !model.startsWith('gpt-image-2')

  try {
    const request = {
      model,
      prompt: parsed.data.brief.prompt,
      size: process.env.OPENAI_IMAGE_SIZE || options.size,
      quality: process.env.OPENAI_IMAGE_QUALITY || options.quality,
      output_format: options.output_format,
    }

    if (supportsTransparentBackground) {
      request.background = options.background
    }

    const image = await client.images.generate(request)

    const b64 = image.data?.[0]?.b64_json
    if (!b64) {
      return json(502, { error: 'Image API returned no image data' })
    }

    return json(200, {
      mode: 'generate',
      imageDataUrl: `data:image/png;base64,${b64}`,
      message: supportsTransparentBackground
        ? '투명 PNG 생성 완료'
        : 'gpt-image-2 생성 완료. 이 모델은 transparent background API 옵션을 지원하지 않아 프롬프트 조건으로만 배경 제거를 요청했습니다.',
      brief: parsed.data.brief,
      model,
      backgroundApplied: supportsTransparentBackground,
    })
  } catch (error) {
    return json(502, {
      error: 'OpenAI image generation failed',
      message: error instanceof Error ? error.message : 'Unknown image generation error',
      model,
    })
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
