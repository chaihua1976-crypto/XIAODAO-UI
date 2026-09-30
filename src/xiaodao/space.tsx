import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ROOM, TABLES, type Cam, type Table, type TableId, type ZoneId } from './data'

export const W = 390
export const H = 844

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** Camera tween — XR-Frame camera stand-in. Object feedback first, camera after `delay`. */
export function useCamera(target: Cam, duration = 680, delay = 80) {
  const [cam, setCam] = useState(target)
  const cur = useRef(target)
  const key = JSON.stringify(target)
  useEffect(() => {
    const from = { ...cur.current }
    let raf = 0
    let start = 0
    const tick = (t: number) => {
      if (!start) start = t
      const e = Math.min(1, Math.max(0, (t - start - delay) / duration))
      const k = ease(e)
      const next: Cam = {
        cx: lerp(from.cx, target.cx, k),
        cy: lerp(from.cy, target.cy, k),
        zoom: lerp(from.zoom, target.zoom, k),
        rot: lerp(from.rot, target.rot, k),
        tilt: lerp(from.tilt, target.tilt, k),
      }
      cur.current = next
      setCam(next)
      if (e < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const orbit = (dRot: number, limit: number) => {
    const r = Math.max(target.rot - limit, Math.min(target.rot + limit, cur.current.rot + dRot))
    cur.current = { ...cur.current, rot: r }
    setCam(cur.current)
  }
  return [cam, orbit] as const
}

export function projector(cam: Cam) {
  const r = (cam.rot * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const hz = Math.sqrt(1 - cam.tilt * cam.tilt)
  return (x: number, y: number, z = 0) => {
    const dx = x - cam.cx
    const dy = y - cam.cy
    const rx = dx * c - dy * s
    const ry = dx * s + dy * c
    return [W / 2 + rx * cam.zoom, H * 0.44 + ry * cam.zoom * cam.tilt - z * cam.zoom * hz, ry] as const
  }
}
type P = ReturnType<typeof projector>
const pts = (p: P, list: [number, number, number][]) => list.map(([x, y, z]) => p(x, y, z).slice(0, 2).join(',')).join(' ')
const circle = (cx: number, cy: number, r: number, z: number, n = 28) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI), z] as [number, number, number])
const rect = (cx: number, cy: number, w: number, d: number, z: number) =>
  [[cx - w / 2, cy - d / 2, z], [cx + w / 2, cy - d / 2, z], [cx + w / 2, cy + d / 2, z], [cx - w / 2, cy + d / 2, z]] as [number, number, number][]

export type TableVisual = 'idle' | 'lit' | 'selected' | 'muted' | 'mine'

type SceneProps = {
  cam: Cam
  focusZone?: ZoneId | null
  visual: (t: Table) => TableVisual
  onTable?: (id: TableId) => void
  people?: number
  children?: ReactNode
}

/** 2.5D stand-in for the XR-Frame GLB scene. Geometry follows the 1F plan. */
export function Scene({ cam, focusZone, visual, onTable }: SceneProps) {
  const p = projector(cam)
  const [, , cRy] = p(ROOM.w / 2, ROOM.h / 2)
  const walls: { a: [number, number]; b: [number, number]; id: string }[] = [
    { id: 'N', a: [0, 0], b: [ROOM.w, 0] },
    { id: 'E', a: [ROOM.w, 0], b: [ROOM.w, ROOM.h] },
    { id: 'S', a: [ROOM.w, ROOM.h], b: [0, ROOM.h] },
    { id: 'W', a: [0, ROOM.h], b: [0, 0] },
  ]
  const isBack = (w: (typeof walls)[number]) => p((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2)[2] < cRy
  const zoneAlpha = (z: ZoneId) => (focusZone && focusZone !== z ? 0.28 : 1)

  const wallFace = (w: (typeof walls)[number], h: number) =>
    pts(p, [[w.a[0], w.a[1], 0], [w.b[0], w.b[1], 0], [w.b[0], w.b[1], h], [w.a[0], w.a[1], h]])

  const renderWall = (w: (typeof walls)[number]) => {
    const back = isBack(w)
    const h = back ? 2700 : 260
    return (
      <g key={w.id}>
        <polygon points={wallFace(w, h)} fill={back ? (w.id === 'E' ? '#d9c6ad' : '#cdb89d') : '#3a2a21'} opacity={back ? 1 : 0.9} />
        {back && w.id === 'N' &&
          [0, 1, 2, 3, 4].map((i) => {
            const x0 = 520 + i * 1300
            return (
              <g key={i}>
                <polygon points={pts(p, [[x0, 0, 350], [x0 + 1180, 0, 350], [x0 + 1180, 0, 2500], [x0, 0, 2500]])} fill="url(#sky)" />
                <polyline points={pts(p, [[x0, 0, 1650], [x0 + 1180, 0, 1650]])} stroke="#f3dcc0" strokeWidth={0.6} opacity={0.35} fill="none" />
              </g>
            )
          })}
        {back && w.id === 'E' && (
          <g opacity={zoneAlpha('B')}>
            <polygon points={pts(p, [[ROOM.w, 3350, 900], [ROOM.w, 4700, 900], [ROOM.w, 4700, 2250], [ROOM.w, 3350, 2250]])} fill="#a8401f" />
            <polygon points={pts(p, [[ROOM.w, 4950, 1100], [ROOM.w, 5600, 1100], [ROOM.w, 5600, 2350], [ROOM.w, 4950, 2350]])} fill="#2f4a5a" />
            <polygon points={pts(p, Array.from({ length: 24 }, (_, i) => [ROOM.w, 6250 + 380 * Math.cos((i / 24) * 6.283), 1600 + 380 * Math.sin((i / 24) * 6.283)] as [number, number, number]))} fill="#e7b75c" />
            <polygon points={pts(p, [[ROOM.w, 5800, 900], [ROOM.w, 6700, 900], [ROOM.w, 6700, 1060], [ROOM.w, 5800, 1060]])} fill="#1f1511" opacity={0.6} />
          </g>
        )}
        {back && <polyline points={pts(p, [[w.a[0], w.a[1], h], [w.b[0], w.b[1], h]])} stroke="#fff4e4" strokeWidth={0.8} opacity={0.4} fill="none" />}
        {!back && <polyline points={pts(p, [[w.a[0], w.a[1], h], [w.b[0], w.b[1], h]])} stroke="#f2e7d7" strokeWidth={1} opacity={0.5} fill="none" />}
      </g>
    )
  }

  const objects = TABLES.flatMap((t) => {
    const v = visual(t)
    const chairs =
      t.shape === 'round'
        ? [[t.x - 850, t.y], [t.x, t.y + 850]]
        : t.w > 1000
          ? [[t.x - 500, t.y - 780], [t.x + 500, t.y - 780], [t.x - 500, t.y + 780], [t.x + 500, t.y + 780]]
          : [[t.x - 780, t.y], [t.x, t.y + 780]]
    return [
      ...chairs.map(([x, y], i) => ({ depth: p(x, y)[2], node: <Chair key={`${t.id}c${i}`} p={p} x={x} y={y} alpha={zoneAlpha(t.zone)} /> })),
      { depth: p(t.x, t.y)[2] + 1, node: <TableShape key={t.id} p={p} t={t} v={v} alpha={zoneAlpha(t.zone)} onClick={onTable} /> },
    ]
  }).sort((a, b) => a.depth - b.depth)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3a5c" />
          <stop offset="0.55" stopColor="#c7735a" />
          <stop offset="0.8" stopColor="#f2b27a" />
          <stop offset="1" stopColor="#2e4a5e" />
        </linearGradient>
        <radialGradient id="pool">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pool-mine">
          <stop offset="0" stopColor="#ffb35c" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd9a3" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffd9a3" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.5" stopColor="#120c09" stopOpacity="0" />
          <stop offset="1" stopColor="#120c09" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#1a120e" />
      {walls.filter(isBack).map(renderWall)}
      {/* floor */}
      <polygon points={pts(p, rect(ROOM.w / 2, ROOM.h / 2, ROOM.w, ROOM.h, 0))} fill="#b98a5c" />
      {Array.from({ length: 14 }, (_, i) => (
        <polyline key={i} points={pts(p, [[0, (i + 1) * 475, 0], [ROOM.w, (i + 1) * 475, 0]])} stroke="#8e6440" strokeWidth={0.5} opacity={0.35} />
      ))}
      {/* window light beams */}
      {[0, 1, 2, 3, 4].map((i) => {
        const x0 = 520 + i * 1300
        return <polygon key={i} points={pts(p, [[x0, 0, 0], [x0 + 1180, 0, 0], [x0 + 1580, 3000, 0], [x0 + 400, 3000, 0]])} fill="url(#beam)" opacity={zoneAlpha('A')} />
      })}
      {/* light pools */}
      {TABLES.map((t) => {
        const v = visual(t)
        return (
          <polygon
            key={t.id}
            points={pts(p, circle(t.x, t.y, v === 'mine' ? 1500 : 1250, 0))}
            fill={v === 'mine' ? 'url(#pool-mine)' : 'url(#pool)'}
            opacity={v === 'muted' ? 0.25 : v === 'idle' ? 0.55 * zoneAlpha(t.zone) : 1}
            style={{ transition: 'opacity 500ms ease' }}
          />
        )
      })}
      {/* entry */}
      <polygon points={pts(p, [[800, ROOM.h - 60, 0], [1700, ROOM.h - 60, 0], [1700, ROOM.h + 500, 0], [800, ROOM.h + 500, 0]])} fill="#2a1d16" />
      {objects.map((o) => o.node)}
      {/* pendants */}
      {TABLES.map((t) => {
        const [x1, y1] = p(t.x, t.y, 2800)
        const [x2, y2] = p(t.x, t.y, 1850)
        const v = visual(t)
        return (
          <g key={t.id} opacity={zoneAlpha(t.zone)}>
            <line x1={x1} y1={y1 - 400} x2={x2} y2={y2} stroke="#f2e7d7" strokeOpacity={0.25} strokeWidth={0.6} />
            <circle cx={x2} cy={y2} r={Math.max(1.5, cam.zoom * 55)} fill={v === 'muted' ? '#8b7d72' : '#ffd79a'} />
            <circle cx={x2} cy={y2} r={Math.max(4, cam.zoom * 220)} fill="#ffcf8a" opacity={v === 'muted' ? 0.05 : 0.18} />
          </g>
        )
      })}
      {walls.filter((w) => !isBack(w)).map(renderWall)}
      <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none" />
    </svg>
  )
}

function Chair({ p, x, y, alpha }: { p: P; x: number; y: number; alpha: number }) {
  return (
    <g opacity={alpha}>
      <polygon points={pts(p, [...rect(x, y, 440, 440, 0).slice(0, 2), ...rect(x, y, 440, 440, 450).slice(0, 2).reverse()])} fill="#3b2a20" />
      <polygon points={pts(p, rect(x, y, 440, 440, 450))} fill="#6f4a33" />
    </g>
  )
}

function TableShape({ p, t, v, alpha, onClick }: { p: P; t: Table; v: TableVisual; alpha: number; onClick?: (id: TableId) => void }) {
  const top = t.shape === 'round' ? circle(t.x, t.y, t.w / 2, 760) : rect(t.x, t.y, t.w, t.d, 760)
  const under = top.map(([x, y]) => [x, y, 700] as [number, number, number])
  const legs = t.shape === 'round' ? [[t.x, t.y]] : rect(t.x, t.y, t.w - 160, t.d - 160, 0).map(([x, y]) => [x, y])
  const stroke = v === 'selected' || v === 'mine' ? '#ffae52' : v === 'lit' ? '#ffe2b8' : 'none'
  const [cx, cy] = p(t.x, t.y, 790)
  return (
    <g opacity={v === 'muted' ? 0.55 : alpha} onClick={() => onClick?.(t.id)} className={onClick ? 'cursor-pointer' : ''} style={{ transition: 'opacity 400ms' }}>
      {legs.map(([x, y], i) => {
        const [a, b] = p(x, y, 0)
        const [c, d] = p(x, y, 700)
        return <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#2a1d16" strokeWidth={1.4} />
      })}
      <polygon points={pts(p, under)} fill="#4a3325" />
      <polygon points={pts(p, top)} fill={v === 'mine' ? '#f0cf9e' : '#e3c9a4'} stroke={stroke} strokeWidth={v === 'selected' || v === 'mine' ? 1.6 : 0.8} style={{ transition: 'fill 500ms' }} />
      <circle cx={cx} cy={cy} r={Math.max(1.2, p(t.x + 60, t.y, 790)[0] - cx)} fill="#fff1d6" opacity={v === 'muted' ? 0.2 : 0.95} />
    </g>
  )
}
