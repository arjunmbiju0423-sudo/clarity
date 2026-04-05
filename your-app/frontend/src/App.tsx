import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { AnimatePresence } from 'framer-motion'
import LandingPage      from '@/pages/LandingPage'
import UploadPage       from '@/pages/UploadPage'
import InteractivePage  from '@/pages/InteractivePage'
import FullAnalysisPage from '@/pages/FullAnalysisPage'
import ClarityIntro     from '@/components/ClarityIntro'

type Page = 'landing' | 'upload' | 'interactive' | 'analysis'

export default function App() {
  const [showIntro, setShowIntro] = useState(true)
  const [page, setPage] = useState<Page>('landing')

  const go = (p: Page) => { setPage(p); window.scrollTo({ top: 0 }) }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AnimatePresence>
        {showIntro && (
          <ClarityIntro onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {!showIntro && (
        <>
          {page === 'landing'     && <LandingPage     onStart={() => go('upload')} />}
          {page === 'upload'      && <UploadPage       onBack={() => go('landing')} onComplete={() => go('interactive')} />}
          {page === 'interactive' && <InteractivePage  onBack={() => go('upload')}  onFullAnalysis={() => go('analysis')} />}
          {page === 'analysis'    && <FullAnalysisPage onBack={() => go('interactive')} />}
        </>
      )}
    </ThemeProvider>
  )
}
