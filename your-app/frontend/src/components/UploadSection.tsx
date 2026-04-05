import { useState, useRef, useCallback } from 'react'
import { Upload, FileVideo, CheckCircle, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MOCK_RESPONSE } from '@/data/mockResponse'

type UploadState = 'idle' | 'selected' | 'processing' | 'complete'

const PROCESSING_STEPS = [
  'Analyzing lecture content…',
  'Segmenting into moments…',
  'Identifying key insights…',
]

interface UploadSectionProps {
  onComplete: (data: typeof MOCK_RESPONSE) => void
}

export default function UploadSection({ onComplete }: UploadSectionProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setState('selected')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const startProcessing = () => {
    setState('processing')
    setStep(0)
    // Simulate step-by-step processing
    PROCESSING_STEPS.forEach((_, i) => {
      setTimeout(() => setStep(i + 1), (i + 1) * 1000)
    })
    setTimeout(() => {
      setState('complete')
      setTimeout(() => onComplete(MOCK_RESPONSE), 600)
    }, PROCESSING_STEPS.length * 1000 + 500)
  }

  return (
    <div id="upload" className="w-full max-w-xl mx-auto">
      {/* Idle + selected state: drop zone */}
      {(state === 'idle' || state === 'selected') && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => state === 'idle' && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-4',
            'rounded-2xl border-2 border-dashed p-12 transition-all cursor-pointer',
            dragOver
              ? 'border-indigo-500 bg-indigo-50'
              : state === 'selected'
              ? 'border-green-400 bg-green-50 cursor-default'
              : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov,.avi,.webm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {state === 'idle' ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                <Upload className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">Drop your lecture here</p>
                <p className="mt-1 text-sm text-gray-500">or click to choose a file</p>
              </div>
              <p className="text-xs text-gray-400">mp4, mov, avi, webm · 2–60 minutes</p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
                <FileVideo className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 truncate max-w-xs">{file?.name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : ''}
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="lg" onClick={startProcessing}>
                  Analyze Lecture <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setState('idle') }}
                >
                  Change file
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Processing state */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-white p-12 shadow-sm animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">Analyzing your lecture</p>
            <p className="mt-1 text-sm text-gray-500">This takes about 30 seconds</p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            {PROCESSING_STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                {i < step ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 flex-shrink-0 text-indigo-500 animate-spin" />
                ) : (
                  <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-200" />
                )}
                <span className={cn(
                  'text-sm transition-colors',
                  i < step ? 'text-gray-500 line-through' : i === step ? 'text-gray-900 font-medium' : 'text-gray-400'
                )}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete state */}
      {state === 'complete' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-100 bg-green-50 p-12 animate-fade-in">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="font-semibold text-gray-900">Analysis complete!</p>
        </div>
      )}
    </div>
  )
}
