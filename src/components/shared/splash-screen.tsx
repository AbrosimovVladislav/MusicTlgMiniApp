'use client'

export function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg z-50">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4400ff 0%, transparent 70%)' }}
        />
      </div>

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)' }}
          >
            <MusicIcon />
          </div>
          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-2xl animate-ping opacity-30"
            style={{ background: 'linear-gradient(135deg, #4400ff 0%, #3901d2 100%)' }}
          />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Music Expert
          </h1>
          <p className="text-sm text-muted mt-1">
            Найди своего эксперта
          </p>
        </div>

        {/* Equalizer loader */}
        <div className="flex items-end gap-1 h-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 rounded-full"
              style={{
                background: 'linear-gradient(to top, #4400ff, #a78bfa)',
                animation: `equalize 1s ease-in-out ${i * 0.15}s infinite alternate`,
                height: '100%',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes equalize {
          from { transform: scaleY(0.2); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

function MusicIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
