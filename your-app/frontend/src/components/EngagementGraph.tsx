import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import type { PersonaKey } from '@/data/lectureData'
import { buildEngagementCurve, TOTAL_DURATION } from '@/data/lectureData'
import { useMemo } from 'react'

const PERSONA_COLORS: Record<PersonaKey, { stroke: string; fill: string }> = {
  novice:   { stroke: '#f97316', fill: '#f9731620' },
  average:  { stroke: '#6366f1', fill: '#6366f120' },
  advanced: { stroke: '#06b6d4', fill: '#06b6d420' },
}

interface Props {
  persona: PersonaKey
  scrub: number  // 0–100
}

export default function EngagementGraph({ persona, scrub }: Props) {
  const data = useMemo(() => buildEngagementCurve(persona), [persona])
  const { stroke, fill } = PERSONA_COLORS[persona]
  const currentT = (scrub / 100) * TOTAL_DURATION

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="rounded-lg border border-white/10 bg-gray-900/90 px-3 py-2 text-xs text-white shadow-xl">
        <p className="font-semibold">{`${Math.floor(d.t / 60)}:${String(d.t % 60).padStart(2, '0')}`}</p>
        <p style={{ color: stroke }}>Engagement: {(d.engagement * 100).toFixed(0)}%</p>
        <p className="text-red-400">Confusion: {(d.confusion * 100).toFixed(0)}%</p>
      </div>
    )
  }

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id={`grad-${persona}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={stroke} stopOpacity={0.35} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false} tickLine={false}
            interval={14}
          />
          <YAxis domain={[0, 1]} hide />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: stroke, strokeWidth: 1, strokeDasharray: '4 2' }} />
          <Area
            type="monotone"
            dataKey="engagement"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#grad-${persona})`}
            dot={false}
            animationDuration={400}
          />
          <ReferenceLine
            x={currentT}
            stroke="white"
            strokeWidth={2}
            strokeOpacity={0.7}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
