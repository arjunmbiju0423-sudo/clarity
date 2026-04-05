import { useState, useEffect } from 'react'
import { MOCK_RESPONSE } from '../data/mockResponse'

const USE_MOCK = true  // flip to false to call /api/analyze-lecture

export function useLectureData(requestBody = null) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (USE_MOCK) {
      // Simulate a brief load so the UI doesn't flash
      const t = setTimeout(() => {
        setData(MOCK_RESPONSE)
        setLoading(false)
      }, 400)
      return () => clearTimeout(t)
    }

    // Live API path
    fetch('/api/analyze-lecture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`)
        return r.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}
