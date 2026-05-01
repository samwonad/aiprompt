import type { FeedbackReferenceImage } from '../domain/types'

const MAX_IMAGES = 3
const MAX_EDGE = 900
const OUTPUT_TYPE = 'image/jpeg'
const OUTPUT_QUALITY = 0.78

export async function filesToReferenceImages(
  files: File[],
  existingCount: number,
): Promise<FeedbackReferenceImage[]> {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  const slots = Math.max(0, MAX_IMAGES - existingCount)
  const selected = imageFiles.slice(0, slots)
  return Promise.all(selected.map((file) => fileToReferenceImage(file)))
}

export function getMaxReferenceImageCount() {
  return MAX_IMAGES
}

async function fileToReferenceImage(file: File): Promise<FeedbackReferenceImage> {
  const sourceDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(sourceDataUrl)
  const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, MAX_EDGE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas context is not available')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const dataUrl = canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY)
  return {
    id: crypto.randomUUID(),
    name: file.name || `reference-${Date.now()}.jpg`,
    mimeType: OUTPUT_TYPE,
    dataUrl,
    width,
    height,
    originalSize: file.size,
    storedSize: Math.round((dataUrl.length * 3) / 4),
    createdAt: new Date().toISOString(),
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded'))
    image.src = src
  })
}

function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
