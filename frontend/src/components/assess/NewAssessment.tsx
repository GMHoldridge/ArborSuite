import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Client, Job, Assessment } from '../../types/index'

const MAX_IMAGE_SIZE = 1920

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
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
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

export default function NewAssessment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedJobId = searchParams.get('job_id')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [clientId, setClientId] = useState('')
  const [jobId, setJobId] = useState(preselectedJobId || '')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Client[]>('/clients'),
      api.get<Job[]>('/jobs'),
    ]).then(([c, j]) => {
      setClients(c)
      setJobs(j)
    })
  }, [])

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
    if (!selectedFile) {
      setError('Please select a photo first')
      return
    }

    setError('')
    setUploading(true)

    try {
      const resized = await resizeImage(selectedFile)
      const form = new FormData()
      form.append('file', resized, selectedFile.name)
      if (jobId) form.append('job_id', jobId)
      if (clientId) form.append('client_id', clientId)

      const uploadRes = await api.post<{ photo_url: string }>('/upload', form)

      setUploading(false)
      setAnalyzing(true)

      const assessment = await api.post<Assessment>('/assess', {
        photo_url: uploadRes.photo_url,
        job_id: jobId ? Number(jobId) : null,
        client_id: clientId ? Number(clientId) : null,
        client_notes: notes || null,
      })

      navigate(`/assess/${assessment.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const filteredJobs = clientId
    ? jobs.filter((j) => j.client_id === Number(clientId))
    : jobs

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-5">New Assessment</h1>

      {/* Photo capture area */}
      {preview ? (
        <div className="relative mb-5">
          <img
            src={preview}
            alt="Tree photo"
            className="w-full rounded-xl object-cover max-h-80"
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
          {/* Camera capture */}
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#228B22]/40 rounded-xl bg-green-50/50 cursor-pointer active:bg-green-50 transition-colors">
            <svg className="w-12 h-12 text-[#228B22]/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-[#228B22]/80">Take Photo</span>
            <span className="text-xs text-gray-400 mt-0.5">Point at the tree</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {/* Gallery select */}
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

      {/* Optional fields */}
      <div className="space-y-3 mb-5">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Client (optional)</span>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setJobId('')
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent bg-white"
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Link to Job (optional)</span>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent bg-white"
          >
            <option value="">Select job...</option>
            {filteredJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any observations, client requests, access info..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#228B22] focus:border-transparent resize-none"
          />
        </label>
      </div>

      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedFile || uploading || analyzing}
        className="w-full py-4 rounded-xl bg-[#228B22] text-white font-semibold text-base disabled:opacity-50 active:bg-[#1a6b1a] transition-colors min-h-[48px] flex items-center justify-center gap-2"
      >
        {uploading && (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </>
        )}
        {analyzing && (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            AI Analyzing...
          </>
        )}
        {!uploading && !analyzing && 'Analyze Tree'}
      </button>

      {analyzing && (
        <p className="text-center text-sm text-gray-500 mt-3">
          Our AI is identifying species, assessing hazards, and estimating the work...
        </p>
      )}
    </div>
  )
}
