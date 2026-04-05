import { useState, useRef, useCallback } from 'react'
import { Upload, FileVideo, CheckCircle, Loader2, ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientBackground } from '@/components/ui/gradient-background-4'
import { cn } from '@/lib/utils'

type State = 'idle' | 'selected' | 'processing' | 'done'

const STEPS = [
  'Extracting audio and frames…',
  'Segmenting lecture into moments…',
  'Mapping engagement and difficulty…',
  'Simulating learner personas…',
]

interface Props {
  onBack: () => void
  onComplete: () => void
}

export default function UploadPage({ onBack, onComplete }: Props) {
  const [state, setState] = useState<State>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setState('selected')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // NOTE: This currently runs a simulated analysis with mock data.
  // When the backend API is wired, replace this with a real fetch()
  // to POST /api/analyze-lecture with the video file.
  const analyze = () => {
    setState('processing'); setStep(0)
    STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 900))
    setTimeout(() => {
      setState('done')
      setTimeout(onComplete, 700)
    }, STEPS.length * 900 + 400)
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <GradientBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center px-8 py-5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Upload a lecture clip</h1>
          <p className="mt-2 text-gray-500">We'll analyze engagement, difficulty, and learner response</p>
        </div>

        <div className="w-full max-w-lg">
          {/* Idle */}
          {state === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed p-16 transition-all',
                dragOver
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 bg-white/60 hover:border-indigo-300 hover:bg-indigo-50/40',
              )}
            >
              <input ref={inputRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100">
                <Upload className="h-7 w-7 text-indigo-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">Drop your lecture here</p>
                <p className="mt-1 text-sm text-gray-400">or click to choose a video file</p>
              </div>
              <span className="rounded-full bg-gray-100 px-4 py-1 text-xs font-medium text-gray-500">
                mp4 · mov · avi · webm &nbsp;·&nbsp; 2–60 minutes
              </span>
            </div>
          )}

          {/* Selected */}
          {state === 'selected' && (
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-gray-100 bg-white p-12 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <FileVideo className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 truncate max-w-xs">{file?.name}</p>
                <p className="mt-1 text-sm text-gray-400">{file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : ''}</p>
              </div>

              {/* Demo mode notice */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left w-full">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Demo mode</p>
                  <p className="text-xs text-amber-600">
                    Video is not sent to the backend yet. Results shown are from content-based analysis, not neural video processing.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button size="lg" onClick={analyze}>
                  Analyze Lecture <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => { setFile(null); setState('idle') }}>
                  Change file
                </Button>
              </div>
            </div>
          )}

          {/* Processing */}
          {state === 'processing' && (
            <div className="flex flex-col items-center gap-8 rounded-2xl border border-gray-100 bg-white p-12 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
                <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">Analyzing your lecture</p>
                <p className="mt-1 text-sm text-gray-400">Running content-based analysis</p>
              </div>
              <div className="w-full max-w-xs space-y-4">
                {STEPS.map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i < step
                      ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                      : i === step
                        ? <Loader2 className="h-4 w-4 flex-shrink-0 text-indigo-500 animate-spin" />
                        : <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-200" />}
                    <span className={cn('text-sm transition-colors',
                      i < step ? 'text-gray-400 line-through' : i === step ? 'font-medium text-gray-900' : 'text-gray-400'
                    )}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {state === 'done' && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-100 bg-green-50 p-12">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-gray-900">Analysis complete — opening results…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
