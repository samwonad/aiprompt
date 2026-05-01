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

  const image = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || options.model,
    prompt: parsed.data.brief.prompt,
    size: process.env.OPENAI_IMAGE_SIZE || options.size,
    quality: process.env.OPENAI_IMAGE_QUALITY || options.quality,
    background: options.background,
    output_format: options.output_format,
  })

  const b64 = image.data?.[0]?.b64_json
  if (!b64) {
    return json(502, { error: 'Image API returned no image data' })
  }

  return json(200, {
    mode: 'generate',
    imageDataUrl: `data:image/png;base64,${b64}`,
    message: '투명 PNG 생성 완료',
    brief: parsed.data.brief,
  })
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
