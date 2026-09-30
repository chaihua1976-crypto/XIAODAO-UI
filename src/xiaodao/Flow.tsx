import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAM_LAUNCH, CAM_OVERVIEW, DATES, DEFAULT_CTX, SLOTS, TABLES, ZONES,
  freeCount, isFree, nextFree, tableById, type Cam, type Ctx, type TableId, type ZoneId,
} from './data'
import { Scene, projector, useCamera, type TableVisual } from './space'
import { SeatView } from './SeatView'
import {
  Availability, DateControl, EmptyState, NavBar, PeopleControl, PrimaryAction, ReservedTicket,
  SceneLoading, SecondaryAction, SeatInfo, TableMarker, TimeControl, Toast, ZoneIndicator, type MarkerState,
} from './ui'

export type Stage = 'launch' | 'overview' | 'zone' | 'seat' | 'reserve' | 'success'
export type Sim = { netError: boolean; slowLoad: boolean; xrFail: boolean }
export type Jump = { stage: Stage; zone?: ZoneId; table?: TableId; step?: number; ctx?: Partial<Ctx> }

const UI_DELAY = 860 // camera delay 80 + move 680 + ~100 settle

const seatCam = (id: TableId): Cam => {
  const t = tableById(id)
  return { cx: t.x, cy: t.y + (t.zone === 'A' ? 500 : 0), zoom: 0.22, rot: ZONES[t.zone].cam.rot, tilt: 0.3 }
}
const successCam = (id: TableId): Cam => {
  const t = tableById(id)
  return { cx: t.x - (t.zone === 'B' ? 500 : 0), cy: t.y + 700, zoom: 0.1, rot: ZONES[t.zone].cam.rot - 8, tilt: 0.62 }
}

const STEP_TITLES = ['哪一天、几点来？', '一共几位？', '怎么称呼你？', '再看一眼']

export function Flow({ sim, jump, onStage }: { sim: Sim; jump?: Jump; onStage?: (s: Stage) => void }) {
  const [stage, setStage] = useState<Stage>(jump?.stage ?? 'launch')
  const [zone, setZone] = useState<ZoneId | null>(jump?.zone ?? (jump?.table ? tableById(jump.table).zone : null))
  const [selected, setSelected] = useState<TableId | null>(jump?.table ?? null)
  const [ctx, setCtx] = useState<Ctx>({ ...DEFAULT_CTX, ...jump?.ctx })
  const [step, setStep] = useState(jump?.step ?? 0)
  const [progress, setProgress] = useState(jump?.stage && jump.stage !== 'launch' ? 100 : 0)
  const [loadErr, setLoadErr] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [toast, setToast] = useState<{ tone: 'info' | 'error' | 'success'; text: string; action?: string; onAction?: () => void } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [netFailedOnce, setNetFailedOnce] = useState(false)
  const [over, setOver] = useState(0)
  const [blocked, setBlocked] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', notes: [] as string[] })
  const [mine, setMine] = useState<{ table: TableId; ctx: Ctx; no: string } | null>(
    jump?.stage === 'success' && jump.table ? { table: jump.table, ctx: { ...DEFAULT_CTX, ...jump.ctx }, no: 'XD1001A' } : null,
  )
  const [dragged, setDragged] = useState(false)

  useEffect(() => onStage?.(stage), [stage, onStage])

  const retried = useRef(false)
  /* launch loader */
  useEffect(() => {
    if (stage !== 'launch' || loadErr) return
    const id = setInterval(() => {
      setProgress((p) => {
        const n = p + (sim.slowLoad ? 1.2 : 4.5) * (0.6 + Math.random())
        if (sim.xrFail && !retried.current && n > 62) {
          setLoadErr(true)
          return 62
        }
        return Math.min(100, n)
      })
    }, 60)
    return () => clearInterval(id)
  }, [stage, loadErr, sim.slowLoad, sim.xrFail])
  useEffect(() => {
    if (stage === 'launch' && progress >= 100) {
      const t = setTimeout(() => setStage('overview'), 350)
      return () => clearTimeout(t)
    }
  }, [progress, stage])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.action ? 6000 : 2600)
    return () => clearTimeout(t)
  }, [toast])

  const table = selected ? tableById(selected) : null

  const target: Cam =
    stage === 'launch' ? (progress >= 100 ? CAM_OVERVIEW : CAM_LAUNCH)
      : stage === 'overview' ? CAM_OVERVIEW
        : stage === 'zone' && zone ? ZONES[zone].cam
          : (stage === 'seat' || stage === 'reserve') && selected ? (leaving ? ZONES[tableById(selected).zone].cam : seatCam(selected))
            : stage === 'success' && selected ? successCam(selected)
              : CAM_OVERVIEW
  const [cam, orbit] = useCamera(target, stage === 'launch' || progress < 100 ? 1400 : 680)
  const proj = projector(cam)

  const tableState = (id: TableId): MarkerState => {
    const t = tableById(id)
    if (mine?.table === id) return 'mine'
    if (!isFree(id, ctx.date, ctx.slot)) return 'unavailable'
    if (ctx.people > t.cap) return 'unavailable'
    if (selected === id) return 'selected'
    return 'focus'
  }
  const visual = (t: (typeof TABLES)[number]): TableVisual => {
    if (mine?.table === t.id) return 'mine'
    if (stage === 'overview' || stage === 'launch') return 'idle'
    const s = tableState(t.id)
    if (s === 'unavailable') return 'muted'
    if (s === 'selected') return 'selected'
    return 'lit'
  }
  const zoneFree = (z: ZoneId) => TABLES.filter((t) => t.zone === z && isFree(t.id, ctx.date, ctx.slot) && ctx.people <= t.cap).length

  /* navigation */
  const goZone = (z: ZoneId) => {
    setZone(z)
    setSelected(null)
    setStage('zone')
  }
  const enterSeat = () => {
    setLeaving(false)
    setStage('seat')
  }
  const leaveSeat = () => {
    setLeaving(true)
    setTimeout(() => {
      setStage('zone')
      setLeaving(false)
    }, 420)
  }
  const back = () => {
    if (stage === 'zone') {
      setSelected(null)
      setStage('overview')
    } else if (stage === 'seat') leaveSeat()
    else if (stage === 'reserve') step > 0 ? setStep(step - 1) : setStage('seat')
  }
  const startReserve = () => {
    if (!table) return
    // keep a free slot preselected
    if (!isFree(table.id, ctx.date, ctx.slot)) {
      const i = SLOTS.findIndex((_, k) => k > ctx.slot && isFree(table.id, ctx.date, k))
      if (i >= 0) setCtx((c) => ({ ...c, slot: i }))
    }
    if (ctx.people > table.cap) setCtx((c) => ({ ...c, people: table.cap }))
    setStep(0)
    setStage('reserve')
  }
  const submit = () => {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      if (sim.netError && !netFailedOnce) {
        setNetFailedOnce(true)
        setToast({ tone: 'error', text: '网络有点不稳。别担心，这张桌先为你留着。', action: '再试一次', onAction: submit })
        return
      }
      setMine({ table: selected!, ctx, no: `XD${1000 + ctx.date * 10 + ctx.slot}${selected}` })
      setToast(null)
      setStage('success')
    }, 1100)
  }

  /* drag to orbit */
  const drag = useRef<{ x: number } | null>(null)
  const canOrbit = stage === 'overview' || stage === 'zone' || stage === 'success'
  const pointer = {
    onPointerDown: (e: React.PointerEvent) => canOrbit && (drag.current = { x: e.clientX }),
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.x
      drag.current.x = e.clientX
      orbit(dx * 0.28, stage === 'overview' ? 40 : 14)
      if (Math.abs(dx) > 1) setDragged(true)
    },
    onPointerUp: () => (drag.current = null),
    onPointerLeave: () => (drag.current = null),
  }

  const seatVisible = selected && (stage === 'seat' || stage === 'reserve')
  const inZone = stage === 'zone' || stage === 'success'
  const markerTables = inZone ? TABLES.filter((t) => t.zone === (stage === 'success' ? tableById(selected!).zone : zone)) : []

  const availText = useMemo(() => {
    if (!table) return null
    const free = isFree(table.id, ctx.date, ctx.slot)
    const d = DATES[ctx.date].label
    if (ctx.people > table.cap) return <Availability state="full" text={`最多坐 ${table.cap} 位 · 你们有 ${ctx.people} 位`} />
    if (free) return <Availability state="open" text={`${d} ${SLOTS[ctx.slot]} 空着 · 还有 ${freeCount(table.id, ctx.date) - 1} 个时段可约`} />
    const n = nextFree(table.id, ctx.date, ctx.slot)
    return <Availability state="full" text={n ? `${SLOTS[ctx.slot]} 已有客人 · ${n} 之后空出` : `${d}已满`} />
  }, [table, ctx])

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink select-none" {...pointer}>
      {/* ---------- XR-Frame layer ---------- */}
      <div className={`absolute inset-0 transition-all duration-700 ${stage === 'launch' && progress < 100 ? 'blur-[2px] brightness-75' : ''}`}>
        <Scene cam={cam} focusZone={stage === 'zone' ? zone : stage === 'success' && selected ? tableById(selected).zone : null} visual={visual} onTable={(id) => {
          const t = tableById(id)
          if (stage === 'overview') goZone(t.zone)
          else if (stage === 'zone' && t.zone === zone) selected === id ? enterSeat() : setSelected(id)
        }} />
      </div>

      {/* marker stems */}
      {inZone && (
        <svg className="absolute inset-0 pointer-events-none" width="390" height="844">
          {markerTables.map((t) => {
            const [x1, y1] = proj(t.x, t.y, 800)
            const [x2, y2] = proj(t.x, t.y, 1500)
            return <line key={t.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffae52" strokeOpacity={tableState(t.id) === 'unavailable' ? 0.2 : 0.55} strokeDasharray="2 3" className="animate-fade-in" style={{ animationDelay: `${UI_DELAY - 200}ms` }} />
          })}
        </svg>
      )}

      {/* zone indicators — overview */}
      {stage === 'overview' &&
        (['A', 'B'] as ZoneId[]).map((z, i) => {
          const [x, y] = proj(ZONES[z].center[0], ZONES[z].center[1], 2300)
          return (
            <div key={z} className="animate-rise" style={{ animationDelay: `${UI_DELAY + i * 120}ms` }}>
              <ZoneIndicator letter={z} name={ZONES[z].name} en={ZONES[z].en} free={zoneFree(z)} style={{ left: x, top: y }} onClick={() => goZone(z)} />
            </div>
          )
        })}
      {stage === 'overview' && mine && (() => {
        const t = tableById(mine.table)
        const [x, y] = proj(t.x, t.y, 1300)
        return <TableMarker state="mine" code={t.id} label="你的位置" style={{ left: x, top: y }} onClick={() => { setSelected(t.id); setStage('success') }} />
      })()}

      {/* table markers — zone / success */}
      {markerTables.map((t, i) => {
        const [x, y] = proj(t.x, t.y, 1500)
        const s = stage === 'success' ? (t.id === selected ? 'mine' : 'reserved') : tableState(t.id)
        if (stage === 'success' && t.id !== selected) return null
        const sub = s === 'unavailable'
          ? ctx.people > t.cap ? `最多${t.cap}位` : (nextFree(t.id, ctx.date, ctx.slot) ?? '') && `${nextFree(t.id, ctx.date, ctx.slot)} 后`
          : s === 'mine' ? '' : `${t.def}人`
        return (
          <div key={t.id} className="animate-rise" style={{ animationDelay: stage === 'success' ? '500ms' : `${UI_DELAY + i * 90}ms` }}>
            <TableMarker state={s} code={t.id} label={s === 'mine' ? '已属于你' : t.kind} sub={sub || undefined} style={{ left: x, top: y }}
              onClick={() => (stage === 'zone' ? (selected === t.id ? enterSeat() : setSelected(t.id)) : undefined)} />
          </div>
        )
      })}

      {/* follow panel for selected table */}
      {stage === 'zone' && table && (() => {
        const [x, y] = proj(table.x, table.y, 1500)
        const left = Math.max(16, Math.min(390 - 236, x - 110))
        const below = y < 520
        return (
          <div key={table.id} className="absolute z-20 w-[220px] animate-rise" style={{ left, top: below ? y + 26 : y - 150, animationDelay: '120ms' }}>
            <div className="rounded-[22px] bg-ink/80 backdrop-blur-xl p-4 text-plaster shadow-2xl border border-plaster/10">
              <div className="font-serif text-[16px] leading-snug">{table.title}</div>
              <div className="mt-2">{availText}</div>
              <button onClick={enterSeat} className="mt-3 w-full h-10 rounded-full bg-plaster text-ink text-[13px] font-medium flex items-center justify-center gap-2 active:scale-95 transition">
                坐下看看 <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        )
      })()}

      {/* ---------- First-person layer ---------- */}
      {seatVisible && table && (
        <div className={`absolute inset-0 transition-all duration-400 ${leaving ? 'opacity-0 scale-110 blur-sm' : ''}`}>
          <div key={table.id} className="absolute inset-0 animate-seat-in" style={{ transform: stage === 'reserve' ? 'translateY(-150px) scale(1.02)' : undefined, transition: 'transform 600ms cubic-bezier(.65,0,.35,1)' }}>
            <SeatView table={table} slot={ctx.slot} dim={stage === 'reserve'} />
          </div>
        </div>
      )}

      {/* ---------- Screen-space UI ---------- */}
      {stage !== 'launch' && (
        <NavBar
          tone="glass"
          onBack={stage === 'overview' || stage === 'success' ? undefined : back}
          title={stage === 'zone' && zone ? (
            <div key={zone} className="animate-rise ml-1" style={{ animationDelay: `${UI_DELAY}ms` }}>
              <div className="font-serif text-[15px] text-plaster leading-none"><span className="font-latin italic text-ember mr-1">{zone}</span>{ZONES[zone].name}</div>
            </div>
          ) : null}
        />
      )}

      {toast && (
        <div className="absolute inset-x-4 top-[100px] z-50">
          <Toast tone={toast.tone} action={toast.action} onAction={() => { const a = toast.onAction; setToast(null); a?.() }}>{toast.text}</Toast>
        </div>
      )}

      {/* overview chrome */}
      {stage === 'overview' && (
        <>
          <div className="absolute left-6 top-[104px] animate-rise" style={{ animationDelay: '300ms' }}>
            <div className="font-mono text-[10px] tracking-[0.3em] text-ember">1F · 48 m² · 4 张桌</div>
            <div className={`mt-2 font-serif text-[26px] leading-tight text-plaster transition-opacity duration-700 ${dragged ? 'opacity-0' : ''}`}>先进来<br />看看。</div>
          </div>
          <div className={`absolute inset-x-0 bottom-[150px] text-center text-[11px] text-plaster/60 transition-opacity duration-700 ${dragged ? 'opacity-0' : ''}`}>
            <span className="inline-flex items-center gap-2"><span>‹</span>左右拖动，转一转这间屋子<span>›</span></span>
          </div>
          <div className="absolute left-4 right-4 bottom-8 animate-rise" style={{ animationDelay: `${UI_DELAY + 300}ms` }}>
            {ctxOpen && (
              <div className="mb-2 rounded-[26px] bg-ink/85 backdrop-blur-xl p-4 space-y-4 animate-panel-in border border-plaster/10">
                <DateControl tone="dark" value={ctx.date} onChange={(date) => setCtx({ ...ctx, date })} />
                <TimeControl tone="dark" date={ctx.date} value={ctx.slot} onChange={(slot) => setCtx({ ...ctx, slot })} />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-plaster/70">几位一起</span>
                  <PeopleControl compact tone="dark" value={ctx.people} max={6} onChange={(people) => setCtx({ ...ctx, people })} />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button onClick={() => setCtxOpen(!ctxOpen)} className="h-10 rounded-full bg-ink/55 backdrop-blur-md pl-4 pr-3 flex items-center gap-2 text-[12.5px] text-plaster active:scale-95 transition border border-plaster/10">
                <span>{DATES[ctx.date].label}</span>
                <span className="text-plaster/30">/</span>
                <span className="font-mono">{SLOTS[ctx.slot]}</span>
                <span className="text-plaster/30">/</span>
                <span>{ctx.people} 位</span>
                <span className={`text-ember transition-transform ${ctxOpen ? 'rotate-180' : ''}`}>⌃</span>
              </button>
              {ctxOpen ? (
                <SecondaryAction onClick={() => setCtxOpen(false)}>好</SecondaryAction>
              ) : (
                <span className="text-[11px] text-plaster/55">轻点区域，走近一点</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* zone chrome */}
      {stage === 'zone' && zone && (
        <div key={zone} className="absolute left-6 right-6 bottom-9 flex items-end justify-between animate-rise" style={{ animationDelay: `${UI_DELAY + 200}ms` }}>
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-ember">{ZONES[zone].en}</div>
            <div className="mt-1.5 text-[13px] text-plaster/80 max-w-[200px] leading-relaxed">{ZONES[zone].blurb}</div>
            {!selected && <div className="mt-2 text-[11px] text-plaster/50">轻点一张桌，靠近看看</div>}
          </div>
          <button onClick={() => goZone(zone === 'A' ? 'B' : 'A')} className="text-right text-[12px] text-plaster/70 hover:text-plaster transition">
            去{ZONES[zone === 'A' ? 'B' : 'A'].name}<span className="ml-1 text-ember">→</span>
          </button>
        </div>
      )}

      {/* seat chrome — the peak: minimal */}
      {stage === 'seat' && table && !leaving && (
        <>
          <div className="absolute top-[100px] inset-x-0 text-center text-[11px] text-plaster/60 animate-fade-in" style={{ animationDelay: '1200ms' }}>‹ 拖动，看看四周 ›</div>
          <div className="absolute inset-x-0 bottom-0 pt-24 px-6 pb-8 bg-gradient-to-t from-ink via-ink/80 to-transparent pointer-events-none">
            <div className="pointer-events-auto">
              <div className="animate-rise" style={{ animationDelay: '1000ms' }}>
                <SeatInfo code={table.id} kind={table.kind} title={table.title} desc={table.desc} facts={table.facts} avail={availText} />
              </div>
              <div className="mt-6 flex items-center gap-2 animate-rise" style={{ animationDelay: '1700ms' }}>
                <PrimaryAction className="flex-1" onClick={startReserve}>
                  {isFree(table.id, ctx.date, ctx.slot) && ctx.people <= table.cap ? '就坐这里' : '换个时间，坐这里'}
                </PrimaryAction>
                <SecondaryAction onClick={leaveSeat}>再看看</SecondaryAction>
              </div>
            </div>
          </div>
        </>
      )}

      {/* reservation panel */}
      {stage === 'reserve' && table && (
        <div className="absolute inset-x-3 bottom-3 z-20 animate-panel-in">
          <div className="rounded-[30px] bg-paper text-ink shadow-[0_-20px_60px_-20px_rgba(0,0,0,.6)] overflow-hidden">
            <div className="px-5 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-ink/60">
                <span className="font-mono text-ember-deep">{table.id}</span>
                <span>{table.kind}</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? 'w-5 bg-ink' : 'w-2 bg-ink/15'}`} />)}
              </div>
            </div>
            <div key={step} className="px-5 pt-3 pb-5 animate-step-in">
              <h3 className="font-serif text-[22px] mb-4">{STEP_TITLES[step]}</h3>
              {step === 0 && (
                <div className="space-y-4">
                  <DateControl value={ctx.date} onChange={(date) => {
                    const firstFree = SLOTS.findIndex((_, k) => isFree(table.id, date, k))
                    setCtx({ ...ctx, date, slot: isFree(table.id, date, ctx.slot) ? ctx.slot : Math.max(0, firstFree) })
                    setBlocked(null)
                  }} />
                  {freeCount(table.id, ctx.date) === 0 ? (
                    <EmptyState title={`${DATES[ctx.date].full} 这张桌已满`} hint="画墙下的位置很抢手" action={`看看 ${DATES[Math.min(6, ctx.date + 1)].label}`} onAction={() => setCtx({ ...ctx, date: Math.min(6, ctx.date + 1), slot: 0 })} />
                  ) : (
                    <>
                      <TimeControl table={table.id} date={ctx.date} value={ctx.slot} onChange={(slot) => { setCtx({ ...ctx, slot }); setBlocked(null) }} onBlocked={setBlocked} />
                      <div className="h-4 text-[11.5px] text-ink/55">
                        {blocked !== null ? <span className="text-ember-deep">{SLOTS[blocked]} 这张桌已有客人{nextFree(table.id, ctx.date, blocked) ? `，${nextFree(table.id, ctx.date, blocked)} 之后空出` : ''}</span> : `约 2 小时 · ${ctx.slot >= 4 ? '天色会慢慢暗下来' : '能赶上日落'}`}
                      </div>
                    </>
                  )}
                </div>
              )}
              {step === 1 && (
                <div className="py-2">
                  <PeopleControl value={ctx.people} max={table.cap} over={over > 0} onChange={(people) => setCtx({ ...ctx, people })} onOver={() => { setOver((n) => n + 1); setTimeout(() => setOver(0), 400) }} />
                  <div className="mt-4 text-center text-[12px] text-ink/55 min-h-9">
                    {ctx.people >= table.cap ? (
                      table.zone === 'B'
                        ? <>这张桌最多 {table.cap} 位。人更多的话，<button className="text-ember-deep underline underline-offset-4" onClick={() => { setStage('zone'); setZone('A'); setSelected(null) }}>看看窗边长桌</button></>
                        : `${table.cap} 位刚好坐满这张长桌`
                    ) : table.cap === 3 && ctx.people === 2 ? '两个人刚好，也可以再加一位' : '桌上还有空位'}
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-3">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="称呼，例如：林小姐" className="w-full h-12 rounded-2xl bg-ink/[0.05] px-4 text-[14px] outline-none focus:ring-2 focus:ring-ember/60 placeholder:text-ink/35" />
                  <div className="flex gap-2">
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="手机号" className="flex-1 min-w-0 h-12 rounded-2xl bg-ink/[0.05] px-4 text-[14px] font-mono outline-none focus:ring-2 focus:ring-ember/60 placeholder:text-ink/35 placeholder:font-sans" />
                    <button onClick={() => setForm({ ...form, phone: '138 0013 2046' })} className="shrink-0 h-12 px-3 rounded-2xl border border-ink/15 text-[12px] active:scale-95 transition">微信手机号</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['纪念日', '生日', '不吃辣', '带小朋友', '靠窗更好'].map((n) => {
                      const on = form.notes.includes(n)
                      return (
                        <button key={n} onClick={() => setForm({ ...form, notes: on ? form.notes.filter((x) => x !== n) : [...form.notes, n] })}
                          className={`h-8 px-3 rounded-full text-[12px] transition active:scale-95 ${on ? 'bg-ink text-plaster' : 'bg-ink/[0.05] text-ink/70'}`}>{on ? '✓ ' : ''}{n}</button>
                      )
                    })}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="divide-y divide-ink/10 text-[13px]">
                  {[
                    ['位置', `${table.id} · ${table.kind}`, 0],
                    ['时间', `${DATES[ctx.date].full}  ${SLOTS[ctx.slot]}`, 0],
                    ['人数', `${ctx.people} 位`, 1],
                    ['称呼', `${form.name || '—'}  ${form.phone}`, 2],
                  ].map(([k, v, s]) => (
                    <button key={k as string} onClick={() => setStep(s as number)} className="w-full py-2.5 flex justify-between text-left group">
                      <span className="text-ink/50">{k}</span>
                      <span className="group-hover:text-ember-deep transition">{v}</span>
                    </button>
                  ))}
                  <div className="pt-2.5 text-[11px] text-ink/45">到店前 2 小时可免费取消 · 迟到 15 分钟后座位将释放</div>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex items-center gap-2">
              <SecondaryAction tone="paper" onClick={back}>{step === 0 ? '回到座位' : '上一步'}</SecondaryAction>
              {step < 3 ? (
                <PrimaryAction className="flex-1" state={step === 0 && !isFree(table.id, ctx.date, ctx.slot) ? 'disabled' : step === 2 && !(form.name && form.phone) ? 'disabled' : 'default'} onClick={() => setStep(step + 1)}>下一步</PrimaryAction>
              ) : (
                <PrimaryAction className="flex-1" state={submitting ? 'loading' : 'default'} onClick={submit}>{submitting ? '正在为你留位…' : '确认，就这张'}</PrimaryAction>
              )}
            </div>
          </div>
        </div>
      )}

      {/* success */}
      {stage === 'success' && mine && (
        <div className="absolute inset-x-3 bottom-3 z-20 animate-panel-in" style={{ animationDelay: '900ms' }}>
          <ReservedTicket code={mine.table} kind={tableById(mine.table).kind} date={DATES[mine.ctx.date].full} time={SLOTS[mine.ctx.slot]} people={mine.ctx.people} no={mine.no} />
          <div className="mt-2 flex gap-2">
            <SecondaryAction className="flex-1 bg-plaster/10" onClick={() => setToast({ tone: 'success', text: '已添加到日历，出发前 1 小时提醒你' })}>添加到日历</SecondaryAction>
            <PrimaryAction className="flex-1" onClick={() => { setSelected(null); setStage('overview') }}>回到空间</PrimaryAction>
          </div>
        </div>
      )}

      {stage === 'launch' && <SceneLoading progress={progress} error={loadErr} onRetry={() => { retried.current = true; setLoadErr(false); setProgress(0) }} />}
    </div>
  )
}
