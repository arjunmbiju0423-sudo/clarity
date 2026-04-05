import React from 'react'
import { motion } from 'framer-motion'

interface SectionWithMockupProps {
  title: string | React.ReactNode
  description: string | React.ReactNode
  mockupContent: React.ReactNode
  reverseLayout?: boolean
  accentColor?: string
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const SectionWithMockup: React.FC<SectionWithMockupProps> = ({
  title,
  description,
  mockupContent,
  reverseLayout = false,
  accentColor = '#2dd4bf',
}) => {
  const layoutClasses = reverseLayout ? 'md:grid-cols-2 md:grid-flow-col-dense' : 'md:grid-cols-2'
  const textOrderClass = reverseLayout ? 'md:col-start-2' : ''
  const imageOrderClass = reverseLayout ? 'md:col-start-1' : ''

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative z-10 w-full">
        <motion.div
          className={`grid grid-cols-1 gap-12 md:gap-8 w-full items-center ${layoutClasses}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Text Content */}
          <motion.div
            className={`flex flex-col items-start gap-5 max-w-[520px] ${textOrderClass}`}
            variants={itemVariants}
          >
            <div className="space-y-3">
              <h2 className="text-white text-3xl md:text-4xl font-bold leading-tight">
                {title}
              </h2>
            </div>
            <div
              className="text-sm md:text-base leading-relaxed"
              style={{ color: '#94a3b8' }}
            >
              {description}
            </div>
          </motion.div>

          {/* Mockup Content */}
          <motion.div
            className={`relative w-full ${imageOrderClass}`}
            variants={itemVariants}
          >
            {/* Glow backdrop */}
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-20 z-0"
              style={{ background: accentColor }}
            />
            {/* Card */}
            <div
              className="relative z-10 rounded-3xl border overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {mockupContent}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom separator line */}
      <div
        className="absolute w-full h-px bottom-0 left-0 z-0"
        style={{
          background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
    </section>
  )
}

export default SectionWithMockup
