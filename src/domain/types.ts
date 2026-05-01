export type UseCaseId = 'cover' | 'signage' | 'leaflet' | 'sticker' | 'icon' | 'source'

export type ToneId = 'clean' | 'friendly' | 'public' | 'premium' | 'bold'

export type FeedbackKind = 'success' | 'failure'

export type ApiMode = 'draft' | 'generate'

export interface InferredContext {
  useCase: UseCaseId
  tone: ToneId
  keywords: string[]
  objectCount: number
}

export interface DesignRecipe {
  id: string
  version: string
  label: string
  staffLabel: string
  description: string
  useCase: string
  composition: string
  style: string
  output: string
  triggers: string[]
  rules: string[]
  avoid: string[]
}

export interface RecipeSuggestion extends DesignRecipe {
  score: number
  reasons: string[]
}

export interface DesignBrief {
  request: string
  context: InferredContext
  recipe: DesignRecipe
  prompt: string
  apiOptions: ImageApiOptions
}

export interface ImageApiOptions {
  model: string
  size: string
  quality: string
  background: 'transparent'
  output_format: 'png'
}

export interface GenerationResult {
  mode: ApiMode
  imageDataUrl?: string
  message: string
  brief: DesignBrief
}

export interface FeedbackOption {
  id: string
  label: string
  kind: FeedbackKind
}

export interface FeedbackReferenceImage {
  id: string
  name: string
  mimeType: string
  dataUrl: string
  width: number
  height: number
  originalSize: number
  storedSize: number
  createdAt: string
}

export interface FeedbackRecord {
  id: string
  createdAt: string
  request: string
  recipeId: string
  recipeVersion: string
  recipeLabel: string
  context: InferredContext
  prompt: string
  apiOptions: ImageApiOptions
  imageDataUrl?: string
  feedbackId: string
  feedbackLabel: string
  feedbackKind: FeedbackKind
  feedbackNote: string
  referenceImages: FeedbackReferenceImage[]
}
