import { useRef, useState } from 'react'
import type { Table } from './data'
import { H, W } from './space'

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) =>
  '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')

/** First-person stand-in for the XR-Frame seat camera. Sky follows the chosen time slot. */
export function SeatView({ table, slot, dim = false }: { table: Table; slot: number; dim?: boolean }) {
  const [px, setPx] = useState(0)
  const drag = useRef<{ x: number; base: number } | null>(null)
  const t = slot / 7
  const sky = { top: mix('#7f97b8', '#171a33', t), mid: mix('#f0c18c', '#5b3a5c', t), hor: mix('#ffe0a8', '#c6603e', t), sea: mix('#5f839c', '#172636', t) }
  const sunY = 300 + t * 140
  const id = table.id

  const layer = (k: number) => ({ transform: `translateX(${px * k}px)`, transition: drag.current ? 'none' : 'transform 700ms cubic-bezier(.2,.9,.25,1)' })

  const Sky = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
    <g>
      <clipPath id={`win-${id}-${x}`}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#win-${id}-${x})`}>
        <g style={layer(-10)}>
          <rect x={-40} y={0} width={W + 80} height={420} fill="url(#fp-sky)" />
          {t < 0.75 && <circle cx={270} cy={sunY} r={16} fill={mix('#fff3d6', '#ff9a5c', t)} opacity={1 - t * 0.6} />}
          <rect x={-40} y={420} width={W + 80} height={300} fill={sky.sea} />
          <rect x={250} y={424} width={40} height={2} fill={sky.hor} opacity={0.8 - t * 0.5} />
          <rect x={240} y={432} width={60} height={1.5} fill={sky.hor} opacity={0.6 - t * 0.4} />
          <rect x={258} y={442} width={26} height={1.5} fill={sky.hor} opacity={0.5 - t * 0.3} />
          {/* 小岛 */}
          <path d="M60 421 C 90 404, 112 398, 140 406 C 160 396, 176 402, 196 421 Z" fill={mix('#3d4a58', '#0d1219', t)} />
          <path d="M320 421 C 336 414, 350 413, 372 421 Z" fill={mix('#4a5664', '#10161d', t)} />
        </g>
      </g>
    </g>
  )

  const Art = ({ k }: { k: number }) => (
    <g style={layer(k)}>
      <rect x={104} y={196} width={96} height={128} fill="#a8401f" />
      <rect x={116} y={210} width={30} height={100} fill="#c9592f" opacity={0.7} />
      <rect x={220} y={180} width={62} height={160} fill="#2f4a5a" />
      <circle cx={336} cy={262} r={34} fill="#e7b75c" />
      <path d="M60 150 L 400 150 L 340 360 L 120 360 Z" fill="#ffe3b0" opacity={0.08} />
    </g>
  )

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      style={{ filter: dim ? 'brightness(.62) saturate(.9)' : 'none', transition: 'filter 500ms ease' }}
      onPointerDown={(e) => (drag.current = { x: e.clientX, base: px })}
      onPointerMove={(e) => {
        if (!drag.current) return
        setPx(Math.max(-1.4, Math.min(1.4, drag.current.base + (e.clientX - drag.current.x) / 90)))
      }}
      onPointerUp={() => {
        drag.current = null
        setPx((v) => v * 0.5)
      }}
      onPointerLeave={() => (drag.current = null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0">
        <defs>
          <linearGradient id="fp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky.top} />
            <stop offset="0.65" stopColor={sky.mid} />
            <stop offset="1" stopColor={sky.hor} />
          </linearGradient>
          <linearGradient id="fp-oak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b4895e" />
            <stop offset="1" stopColor="#6e4a31" />
          </linearGradient>
          <radialGradient id="fp-candle">
            <stop offset="0" stopColor="#ffd08a" stopOpacity="0.8" />
            <stop offset="1" stopColor="#ffd08a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fp-lamp" cx="0.5" cy="0">
            <stop offset="0" stopColor="#ffdca0" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffdca0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fp-vig" cx="0.5" cy="0.45" r="0.8">
            <stop offset="0.55" stopColor="#0f0a07" stopOpacity="0" />
            <stop offset="1" stopColor="#0f0a07" stopOpacity="0.8" />
          </radialGradient>
        </defs>
        {/* room shell */}
        <rect width={W} height={H} fill={mix('#3a2a21', '#1c130f', t)} />

        {id === 'A1' && (
          <g>
            <Sky x={0} y={70} w={W} h={500} />
            <g style={layer(14)}>
              {[-20, 118, 256, 394].map((x) => <rect key={x} x={x} y={60} width={12} height={520} fill="#1b130f" />)}
              <rect x={-40} y={300} width={W + 80} height={6} fill="#1b130f" />
              <rect x={-40} y={560} width={W + 80} height={40} fill="#241913" />
            </g>
          </g>
        )}
        {id === 'A2' && (
          <g>
            <g style={layer(14)}>
              <path d="M180 40 L 420 110 L 420 620 L 180 560 Z" fill="#d6c2a6" />
            </g>
            <Sky x={0} y={40} w={180} h={520} />
            <g style={layer(14)}>
              <path d="M180 40 L 180 560" stroke="#1b130f" strokeWidth={14} />
              <path d="M60 40 L 60 560" stroke="#1b130f" strokeWidth={8} />
            </g>
            <g style={layer(16)}>
              <path d="M226 190 L 290 206 L 290 330 L 226 318 Z" fill="#a8401f" />
              <path d="M312 212 L 350 222 L 350 360 L 312 350 Z" fill="#2f4a5a" />
              <ellipse cx={392} cy={300} rx={18} ry={30} fill="#e7b75c" />
            </g>
          </g>
        )}
        {id === 'B1' && (
          <g>
            <g style={layer(12)}>
              <rect x={-40} y={0} width={W + 80} height={640} fill="#dcc9ae" />
            </g>
            <Sky x={-10} y={120} w={56} h={420} />
            <Art k={16} />
            <g style={layer(16)}>
              <rect x={150} y={150} width={90} height={6} rx={3} fill="#2a1d16" />
            </g>
          </g>
        )}
        {id === 'B2' && (
          <g>
            <g style={layer(12)}>
              <path d="M-40 0 L 250 90 L 250 610 L -40 680 Z" fill="#cdb89d" />
              <path d="M250 90 L 440 20 L 440 680 L 250 610 Z" fill="#dcc9ae" />
            </g>
            <Sky x={20} y={150} w={150} h={330} />
            <g style={layer(12)}>
              <path d="M20 150 L 170 170 M 20 480 L 170 470" stroke="#1b130f" strokeWidth={6} />
              <path d="M95 158 L 95 476" stroke="#1b130f" strokeWidth={5} />
            </g>
            <g style={layer(16)}>
              <path d="M290 200 L 350 180 L 350 330 L 290 346 Z" fill="#a8401f" />
              <circle cx={400} cy={250} r={26} fill="#e7b75c" />
            </g>
          </g>
        )}

        {/* pendant */}
        <g style={layer(20)}>
          <line x1={195} y1={0} x2={195} y2={140} stroke="#120c09" strokeWidth={1.5} />
          <path d="M172 140 Q 195 118 218 140 Z" fill="#1a120e" />
          <ellipse cx={195} cy={142} rx={20} ry={3} fill="#ffe2ad" />
          <rect x={20} y={140} width={350} height={560} fill="url(#fp-lamp)" />
        </g>

        {/* opposite chairs (long tables) */}
        {table.w > 1000 && (
          <g style={layer(24)}>
            <path d="M92 520 Q 92 470 140 470 L 160 470 Q 190 470 190 520 L 190 600 L 92 600 Z" fill="#2a1d16" />
            <path d="M212 520 Q 212 470 250 470 L 270 470 Q 306 470 306 520 L 306 600 L 212 600 Z" fill="#2a1d16" />
          </g>
        )}

        {/* table surface */}
        <g style={layer(34)}>
          {table.shape === 'round' ? (
            <ellipse cx={195} cy={760} rx={250} ry={150} fill="url(#fp-oak)" />
          ) : table.w > 1000 ? (
            <path d="M40 580 L 350 580 L 480 860 L -90 860 Z" fill="url(#fp-oak)" />
          ) : (
            <path d="M70 600 L 320 600 L 400 860 L -10 860 Z" fill="url(#fp-oak)" />
          )}
          <ellipse cx={195} cy={640} rx={140} ry={60} fill="url(#fp-candle)" />
          <ellipse cx={195} cy={770} rx={78} ry={26} fill="#f4ecdf" />
          <ellipse cx={195} cy={768} rx={52} ry={16} fill="#e7dccb" />
          {table.w > 1000 && (
            <>
              <ellipse cx={140} cy={605} rx={30} ry={8} fill="#efe6d8" opacity={0.9} />
              <ellipse cx={256} cy={605} rx={30} ry={8} fill="#efe6d8" opacity={0.9} />
            </>
          )}
          <rect x={286} y={686} width={14} height={34} rx={4} fill="#fff" opacity={0.18} />
          <rect x={186} y={626} width={18} height={18} rx={3} fill="#f4ecdf" />
          <path d="M195 604 Q 200 614 195 624 Q 190 614 195 604 Z" fill="#ffc46e" />
          <circle cx={195} cy={616} r={16} fill="#ffc46e" opacity={0.25} />
        </g>
        <rect width={W} height={H} fill="url(#fp-vig)" />
      </svg>
    </div>
  )
}
