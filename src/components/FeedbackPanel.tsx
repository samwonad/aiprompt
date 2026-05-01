import { Clipboard, ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ClipboardEvent } from 'react'
import type { FeedbackOption, FeedbackReferenceImage, GenerationResult } from '../domain/types'
import { filesToReferenceImages, getMaxReferenceImageCount } from '../services/referenceImages'

interface FeedbackPanelProps {
  options: FeedbackOption[]
  result?: GenerationResult
  note: string
  referenceImages: FeedbackReferenceImage[]
  onNoteChange: (value: string) => void
  onReferenceImagesChange: (images: FeedbackReferenceImage[]) => void
  onFeedback: (feedback: FeedbackOption, note: string, referenceImages: FeedbackReferenceImage[]) => void
}

export function FeedbackPanel({
  options,
  result,
  note,
  referenceImages,
  onNoteChange,
  onReferenceImagesChange,
  onFeedback,
}: FeedbackPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState('')
  const maxImages = getMaxReferenceImageCount()

  const addFiles = async (files: File[]) => {
    if (!result || files.length === 0) return
    setImageError('')
    try {
      const nextImages = await filesToReferenceImages(files, referenceImages.length)
      if (nextImages.length === 0) {
        setImageError(`참조 이미지는 최대 ${maxImages}장까지 저장합니다.`)
        return
      }
      onReferenceImagesChange([...referenceImages, ...nextImages])
    } catch {
      setImageError('이미지를 읽지 못했습니다. 다른 이미지로 다시 시도하세요.')
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const itemFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))
    const directFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
    const files = dedupeFiles([...itemFiles, ...directFiles])
    if (files.length === 0) return
    event.preventDefault()
    void addFiles(files)
  }

  const removeImage = (id: string) => {
    onReferenceImagesChange(referenceImages.filter((image) => image.id !== id))
  }

  return (
    <section className="card" onPaste={handlePaste}>
      <div className="card-header">
        <div>
          <h2>결과 피드백</h2>
          <p>실패 이유, 짧은 메모, 참조 이미지를 함께 남깁니다.</p>
        </div>
      </div>
      <div className="feedback-note-wrap">
        <label htmlFor="feedback-note">짧은 메모</label>
        <textarea
          id="feedback-note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="예: 표지 소스가 아니라 농촌 풍경 배경처럼 나옴"
          disabled={!result}
        />
      </div>
      <div className="reference-upload">
        <div>
          <strong>참조 이미지</strong>
          <span>캡처 이미지를 붙여넣거나 파일을 업로드하세요. 최대 {maxImages}장.</span>
        </div>
        <div className="reference-actions">
          <button className="ghost-button" type="button" disabled={!result} onClick={() => inputRef.current?.click()}>
            <ImagePlus size={16} />
            이미지 업로드
          </button>
          <input
            ref={inputRef}
            aria-label="참조 이미지 업로드"
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              void addFiles(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
        </div>
        <div className={`paste-target ${result ? '' : 'disabled'}`} tabIndex={result ? 0 : -1}>
          <Clipboard size={16} />
          <span>이 영역을 클릭한 뒤 캡처 이미지를 붙여넣기</span>
        </div>
        {imageError && <p className="reference-error">{imageError}</p>}
        {referenceImages.length > 0 && (
          <div className="reference-grid">
            {referenceImages.map((image) => (
              <figure key={image.id}>
                <img src={image.dataUrl} alt={image.name} />
                <figcaption>
                  <span>
                    {image.width}x{image.height}
                  </span>
                  <button type="button" aria-label="참조 이미지 삭제" onClick={() => removeImage(image.id)}>
                    <X size={14} />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
      <div className="feedback-grid">
        {options.map((option) => (
          <button
            className={`feedback-button ${option.kind}`}
            disabled={!result}
            key={option.id}
            type="button"
            onClick={() => onFeedback(option, note, referenceImages)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function dedupeFiles(files: File[]) {
  const seen = new Set<string>()
  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
