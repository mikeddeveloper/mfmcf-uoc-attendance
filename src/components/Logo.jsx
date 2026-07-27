import { useState } from 'react'

export function Logo({ size = 80, onDark = true, style = {} }) {
  const [err, setErr] = useState(false)

  if (!err) {
    if (onDark) {
      /* On dark backgrounds: white circular frame so the logo sits cleanly */
      return (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
          boxShadow: '0 3px 14px rgba(0,0,0,.25), 0 1px 4px rgba(0,0,0,.15)',
          ...style,
        }}>
          <img
            src="/logo.png"
            alt="MFMCF Campus Fellowship"
            width={size * 0.86} height={size * 0.86}
            style={{ objectFit: 'contain' }}
            onError={() => setErr(true)}
          />
        </div>
      )
    }

    /* On light backgrounds: show image directly */
    return (
      <img
        src="/logo.png"
        alt="MFMCF Campus Fellowship"
        width={size} height={size}
        style={{ objectFit: 'contain', flexShrink: 0, ...style }}
        onError={() => setErr(true)}
      />
    )
  }

  return <CfBadge size={size} onDark={onDark} style={style} />
}

/* Fallback if logo.png fails to load */
function CfBadge({ size, onDark, style }) {
  const s      = size
  const col    = onDark ? 'rgba(255,255,255,.95)' : '#B018C0'
  const border = onDark ? 'rgba(255,255,255,.3)'  : 'rgba(176,24,192,.4)'
  const bg     = onDark ? 'rgba(255,255,255,.09)' : '#FDF0FE'
  const sub    = onDark ? 'rgba(255,255,255,.45)' : 'rgba(176,24,192,.45)'

  return (
    <div style={{
      width: s, height: s, borderRadius: '50%',
      border: `${Math.ceil(s * .030)}px solid ${border}`,
      background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      backdropFilter: onDark ? 'blur(12px)' : undefined,
      boxShadow: onDark
        ? '0 4px 20px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.12)'
        : '0 2px 12px rgba(176,24,192,.15)',
      ...style,
    }}>
      <span style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: s * .42, fontWeight: 900,
        color: col, lineHeight: 1,
        fontStyle: 'italic', letterSpacing: '-1px',
        userSelect: 'none',
      }}>Cf</span>
      <span style={{ fontSize: s * .18, lineHeight: 1.1, color: sub, userSelect: 'none' }}>🔥</span>
    </div>
  )
}
