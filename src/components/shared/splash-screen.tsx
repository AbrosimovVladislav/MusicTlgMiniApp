'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

interface SplashScreenProps {
  onContinue?: () => void
}

export function SplashScreen({ onContinue }: SplashScreenProps) {
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    if (!onContinue) return
    const t = setTimeout(() => setShowButton(true), 900)
    return () => clearTimeout(t)
  }, [onContinue])

  return (
    <div
      className="fixed inset-0 flex flex-col bg-bg z-50 overflow-hidden"
      style={{ minHeight: 'var(--tg-viewport-stable-height, 100svh)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
      </div>

      {/* Hero image */}
      <div className="relative w-full splash-image" style={{ flex: '0 0 62%' }}>
        <Image
          src="/splash-hero.png"
          alt="Связи"
          fill
          priority
          className="object-cover object-top"
          sizes="100vw"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, #0b002a 100%)' }}
        />
        <div
          className="absolute inset-y-0 left-0 w-12 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #0b002a 0%, transparent 100%)' }}
        />
        <div
          className="absolute inset-y-0 right-0 w-12 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #0b002a 0%, transparent 100%)' }}
        />
      </div>

      {/* Bottom content */}
      <div className="relative flex flex-col items-center justify-center flex-1 px-6 pb-10 splash-content">
        <div className="text-center mb-6">
          <h1
            className="font-bold text-white leading-none tracking-tight mb-2"
            style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)' }}
          >
            Связи
          </h1>
          <p
            className="text-sm font-medium tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em' }}
          >
            маркетплейс экспертных консультаций
          </p>
        </div>

        {/* Equalizer → Button crossfade */}
        <div className="relative h-12 flex items-center justify-center w-full">
          {/* Equalizer */}
          <div
            className="flex items-end gap-[5px] h-6 absolute transition-all duration-500"
            style={{ opacity: showButton ? 0 : 1, transform: showButton ? 'scale(0.8)' : 'scale(1)' }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  background: 'linear-gradient(to top, #4400ff, #a78bfa)',
                  animation: `equalize 1s ease-in-out ${i * 0.15}s infinite alternate`,
                  height: '100%',
                }}
              />
            ))}
          </div>

          {/* Continue button */}
          {onContinue && (
            <button
              onClick={onContinue}
              className="absolute w-full max-w-xs py-4 rounded-[1000px] font-semibold text-white text-base transition-all duration-500"
              style={{
                background: 'linear-gradient(162deg, #4400FF 18%, #3901D2 103%)',
                opacity: showButton ? 1 : 0,
                transform: showButton ? 'translateY(0)' : 'translateY(10px)',
                pointerEvents: showButton ? 'auto' : 'none',
              }}
            >
              Продолжить
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes equalize {
          from { transform: scaleY(0.15); }
          to   { transform: scaleY(1); }
        }
        .splash-image {
          animation: splashImageIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .splash-content {
          animation: splashContentIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
        }
        @keyframes splashImageIn {
          from { opacity: 0; transform: scale(1.06); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashContentIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
