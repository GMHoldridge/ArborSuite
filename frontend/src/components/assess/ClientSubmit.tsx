import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'

const MAX_IMAGE_SIZE = 1920
const API_BASE = '/api'

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
        resolve(file)
        return
      }
      const scale = MAX_IMAGE_SIZE / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Resize failed'))),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export default function ClientSubmit() {
  const { token } = useParams<{ token: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function clearPhoto() {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit() {
    if (!selectedFile || !token) return
    setSubmitting(true)
    setError('')

    try {
      const resized = await resizeImage(selectedFile)
      const form = new FormData()
      form.append('file', resized, selectedFile.name)
      form.append('token', token)
      if (notes.trim()) form.append('notes', notes.trim())

      const resp = await fetch(`${API_BASE}/submit/${token}`, {
        method: 'POST',
        body: form,
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Submission failed' }))
        throw new Error(err.detail || `Error ${resp.status}`)
      }

      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Invalid submission link.</p>
          <p className="text-gray-400 text-sm mt-1">Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Photo Submitted</h1>
          <p className="text-gray-500">
            Thank you! Your arborist will review the photo and get back to you with an assessment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-[#228B22] text-white px-4 py-6 text-center">
        <h1 className="text-xl font-bold">ArborSuite</h1>
        <p className="text-sm text-white/80 mt-1">Submit a tree photo for assessment</p>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto">
        <p className="text-gray-600 text-sm mb-6">
          Take a clear photo of the tree you need assessed. Try to capture the full tree including the base and canopy.
        </p>

        {/* Photo area */}
        {preview ? (
          <div className="relative mb-5">
            <img
              src={preview}
              alt="Tree photo"
              className="w-full rounded-xl object-cover max-h-72"
            />
            <button
              onClick={clearPhoto}
              className="absolute top-2 right-2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center text-lg"
              aria-label="Remove photo"
            >
              x
            </button>
          </div>
        ) : (
          <div className="mb-5 space-y-3">
            <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-[#228B22]/30 rounded-xl bg-white cursor-pointer active:bg-gray-50 transition-colors">
              <svg className="w-12 h-12 text-[#228B22]/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-[#228B22]/70">Take Photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <label className="flex items-center justify-center w-full py-3.5 border border-gray-200 rounded-xl bg-white cursor-pointer active:bg-gray-50 transition-colors min-h-[48px]">
              <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">Choose from Gallery</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Notes */}
        <label className="block mb-5">
          <span className="text-sm font-medium text-gray-700">Additional Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe any concerns, what you'd like done, access details..."
            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent resize-none bg-white"
          />
        </label>

        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedFile || submitting}
          className="w-full py-4 rounded-xl bg-[#228B22] text-white font-semibold text-base disabled:opacity-50 active:bg-[#1a6b1a] transition-colors min-h-[48px] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Photo'
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Your photo will be reviewed by a certified arborist.
        </p>
      </div>
    </div>
  )
}
