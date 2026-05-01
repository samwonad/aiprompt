import type { DesignBrief, DesignRecipe, ImageApiOptions, InferredContext } from './types'

const toneText: Record<string, string> = {
  clean: 'clean professional commercial design',
  friendly: 'friendly approachable commercial illustration',
  public: 'clean public-information design style',
  premium: 'premium refined commercial illustration',
  bold: 'bold high-readability commercial graphic',
}

export function createBrief(request: string, recipe: DesignRecipe, context: InferredContext): DesignBrief {
  const apiOptions: ImageApiOptions = {
    model: 'gpt-image-2',
    size: '1536x1024',
    quality: 'high',
    background: 'transparent',
    output_format: 'png',
  }

  return {
    request,
    recipe,
    context,
    apiOptions,
    prompt: buildPrompt(request, recipe, context),
  }
}

export function buildPrompt(request: string, recipe: DesignRecipe, context: InferredContext): string {
  return [
    `Create a ${recipe.useCase} for practical print and layout use.`,
    '',
    `User request: ${request}`,
    `Design direction: ${recipe.staffLabel}`,
    `Composition: ${recipe.composition}`,
    `Style: ${toneText[context.tone] ?? recipe.style}`,
    `Detected keywords: ${context.keywords.join(', ') || 'none'}`,
    '',
    'Production rules:',
    ...recipe.rules.map((rule) => `- ${rule}`),
    '- Output as an isolated transparent PNG asset with real alpha transparency.',
    '- Keep clean sharp edges and enough transparent padding around the full subject.',
    '- No text, no letters, no numbers, no logo, no watermark, no signature.',
    '',
    `Avoid: ${recipe.avoid.join(', ')}.`,
    '',
    'The result must be a reusable design source, not a finished advertisement layout.',
  ].join('\n')
}
