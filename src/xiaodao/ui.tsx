import type { ReactNode } from 'react'
import { DATES, SLOTS, isFree, type TableId } from './data'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Navigation (WeChat capsule safe) ---------- */
export function NavBar({ onBack, title, tone = 'dark' }: { onBack?: () => void; title?: ReactNode; tone?: 'dark' | 'glass' }) {
  return (
    <div className="absolute inset-x-0 top-0 z-30 pointer-events-none">
      <div className="h-11 px-6 flex items-end justify-between font-mono text-[11px] text-plaster/80">
        <span>19:02</span>
        <span>5G ▮▮▮</span>
      </div>
      <div className="h-11 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2 pointer-events-auto">
          {onBack ? (
            <button onClick={onBack} aria-label="返回" className={cx('size-9 rounded-full grid place-items-center text-plaster transition active:scale-90', tone === 'glass' ? 'bg-ink/40 backdrop-blur' : 'bg-plaster/10')}>
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
            </button>
          ) : (
            <span className="pl-2 font-serif text-[15px] tracking-[0.2em] text-plaster">小岛之约</span>
          )}
          {title}
        </div>
        <div className="pointer-events-auto h-8 w-[87px] rounded-full border border-plaster/25 bg-ink/35 backdrop-blur flex items-center justify-around text-plaster/90">
          <span className="tracking-[2px] -mt-1.5 text-lg leading-none">···</span>
          <span className="h-4 w-px bg-plaster/25" />
          <span className="size-4 rounded-full border-2 border-plaster/80 grid place-items-center"><span className="size-1 rounded-full bg-plaster" /></span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Spatial / Table Marker ---------- */
export type MarkerState = 'default' | 'focus' | 'selected' | 'unavailable' | 'reserved' | 'mine'
export function TableMarker({ state, code, label, sub, onClick, style }: { state: MarkerState; code: string; label?: string; sub?: string; onClick?: () => void; style?: React.CSSProperties }) {
  const hot = state === 'selected' || state === 'mine'
  const showLabel = state !== 'default'
  return (
    <button onClick={onClick} style={style} className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 group" aria-label={`${code} ${label ?? ''}`}>
      <span className={cx('relative grid place-items-center rounded-full transition-all duration-300 ease-settle', hot ? 'size-7' : 'size-5', state === 'focus' && 'group-hover:scale-110')}>
        {(state === 'default' || state === 'focus') && <span className="absolute inset-0 rounded-full bg-ember/60 animate-breathe" />}
        {state === 'selected' && <span className="absolute inset-0 rounded-full bg-ember/50 animate-ping-once" />}
        {state === 'mine' && <span className="absolute -inset-3 rounded-full bg-ember/25 blur-md animate-settle" />}
        <span
          className={cx(
            'relative rounded-full grid place-items-center font-mono text-[9px] font-medium transition-all duration-300',
            state === 'unavailable' && 'size-4 border border-ash bg-ink/60 text-ash',
            state === 'reserved' && 'size-4 bg-ash/70',
            (state === 'default' || state === 'focus') && 'size-3.5 bg-ember shadow-[0_0_14px_#ffae52]',
            hot && 'size-7 bg-ember text-ink shadow-[0_0_28px_#ffae52] animate-settle',
          )}
        >
          {hot ? code : state === 'unavailable' ? '–' : ''}
        </span>
      </span>
      <span
        className={cx(
          'whitespace-nowrap text-left rounded-full px-2.5 py-1 backdrop-blur-md transition-all duration-300 ease-settle origin-left',
          showLabel ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none',
          hot ? 'bg-ink/80 text-plaster' : 'bg-ink/55 text-plaster/90',
        )}
      >
        <span className="font-mono text-[10px] text-ember mr-1.5">{code}</span>
        <span className={cx('text-[12px]', state === 'unavailable' && 'text-ash')}>{label}</span>
        {sub && <span className={cx('ml-1.5 text-[10px]', state === 'unavailable' || state === 'reserved' ? 'text-ash' : 'text-plaster/60')}>{sub}</span>}
      </span>
    </button>
  )
}

/* ---------- Zone Indicator ---------- */
export function ZoneIndicator({ letter, name, en, free, state = 'default', onClick, style }: { letter: string; name: string; en: string; free: number; state?: 'default' | 'active' | 'dim'; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={style} className={cx('absolute -translate-x-1/2 -translate-y-full flex flex-col items-center transition-all duration-500', state === 'dim' && 'opacity-30')}>
      <span className={cx('flex items-center gap-2 rounded-full pl-1 pr-3 py-1 backdrop-blur-md transition active:scale-95', state === 'active' ? 'bg-ember text-ink' : 'bg-ink/50 text-plaster hover:bg-ink/70')}>
        <span className={cx('size-6 rounded-full grid place-items-center font-latin italic text-[13px]', state === 'active' ? 'bg-ink text-ember' : 'border border-ember/70 text-ember')}>{letter}</span>
        <span className="font-serif text-[14px]">{name}</span>
        <span className={cx('font-mono text-[9px] tracking-wider', state === 'active' ? 'text-ink/70' : 'text-plaster/50')}>{en}</span>
      </span>
      <span className="mt-1 text-[10px] text-plaster/70">{free > 0 ? `此刻 ${free} 张桌空着` : '此刻已满'}</span>
      <span className="w-px h-6 bg-gradient-to-b from-plaster/60 to-transparent" />
    </button>
  )
}

/* ---------- Availability ---------- */
export function Availability({ state, text }: { state: 'open' | 'few' | 'full' | 'loading'; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span className={cx('size-1.5 rounded-full', state === 'open' && 'bg-ember shadow-[0_0_6px_#ffae52]', state === 'few' && 'bg-ember/60', state === 'full' && 'bg-ash', state === 'loading' && 'bg-plaster/40 animate-pulse')} />
      <span className={state === 'full' ? 'text-ash' : 'opacity-80'}>{text}</span>
    </span>
  )
}

/* ---------- Date Control ---------- */
export function DateControl({ value, onChange, tone = 'paper' }: { value: number; onChange: (i: number) => void; tone?: 'paper' | 'dark' }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
      {DATES.map((d) => {
        const on = d.idx === value
        return (
          <button
            key={d.idx}
            onClick={() => onChange(d.idx)}
            className={cx(
              'shrink-0 w-[46px] py-2 rounded-2xl flex flex-col items-center transition-all duration-300 active:scale-95',
              on ? 'bg-ink text-plaster' : tone === 'paper' ? 'text-ink/70 hover:bg-ink/5' : 'text-plaster/70 hover:bg-plaster/10',
            )}
          >
            <span className="text-[10px]">{d.label}</span>
            <span className="font-latin text-[20px] leading-tight">{d.day}</span>
            <span className={cx('size-1 rounded-full mt-0.5', on ? 'bg-ember' : 'bg-transparent')} />
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Time Control ---------- */
export function TimeControl({ table, date, value, onChange, onBlocked, tone = 'paper' }: { table?: TableId; date: number; value: number; onChange: (i: number) => void; onBlocked?: (i: number) => void; tone?: 'paper' | 'dark' }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {SLOTS.map((s, i) => {
        const free = table ? isFree(table, date, i) : true
        const on = i === value && free
        return (
          <button
            key={s}
            onClick={() => (free ? onChange(i) : onBlocked?.(i))}
            aria-disabled={!free}
            className={cx(
              'h-10 rounded-xl font-mono text-[13px] transition-all duration-200 active:scale-95 relative',
              on && 'bg-ember text-ink shadow-[0_6px_18px_-6px_#e2702c]',
              !on && free && (tone === 'paper' ? 'bg-ink/[0.05] text-ink hover:bg-ink/10' : 'bg-plaster/10 text-plaster hover:bg-plaster/15'),
              !free && (tone === 'paper' ? 'text-ink/25 line-through' : 'text-plaster/25 line-through'),
            )}
          >
            {s}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- People Control ---------- */
export function PeopleControl({ value, max, onChange, onOver, over, compact = false, tone = 'paper' }: { value: number; max: number; onChange: (n: number) => void; onOver?: () => void; over?: boolean; compact?: boolean; tone?: 'paper' | 'dark' }) {
  const btn = cx('rounded-full grid place-items-center transition active:scale-90 disabled:opacity-25', compact ? 'size-8' : 'size-12', tone === 'paper' ? 'bg-ink/[0.06] text-ink' : 'bg-plaster/10 text-plaster')
  return (
    <div className={cx('flex items-center', compact ? 'gap-3' : 'gap-6 justify-center', over && 'animate-shake')}>
      <button className={btn} disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="减少">
        <svg width="14" height="14"><path d="M2 7h10" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <span className={cx('font-latin tabular-nums text-center', compact ? 'text-[20px] w-6' : 'text-[64px] leading-none w-16')}>{value}</span>
      <button className={btn} onClick={() => (value >= max ? onOver?.() : onChange(value + 1))} aria-label="增加">
        <svg width="14" height="14"><path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
    </div>
  )
}

/* ---------- Actions ---------- */
export function PrimaryAction({ children, onClick, state = 'default', className }: { children: ReactNode; onClick?: () => void; state?: 'default' | 'loading' | 'disabled'; className?: string }) {
  return (
    <button
      onClick={state === 'default' ? onClick : undefined}
      disabled={state === 'disabled'}
      className={cx(
        'min-h-[52px] rounded-full px-6 flex items-center justify-center gap-2 text-[15px] font-medium transition-all duration-300 active:scale-[0.97]',
        state === 'disabled' ? 'bg-ash/30 text-ink/40' : 'bg-ember text-ink shadow-[0_10px_30px_-10px_#e2702c] hover:brightness-105',
        className,
      )}
    >
      {state === 'loading' && <Spinner />}
      {children}
    </button>
  )
}
export function SecondaryAction({ children, onClick, tone = 'dark', className }: { children: ReactNode; onClick?: () => void; tone?: 'dark' | 'paper'; className?: string }) {
  return (
    <button onClick={onClick} className={cx('h-11 px-4 rounded-full text-[13px] transition active:scale-95', tone === 'dark' ? 'text-plaster/80 hover:text-plaster hover:bg-plaster/10' : 'text-ink/60 hover:text-ink hover:bg-ink/5', className)}>
      {children}
    </button>
  )
}
export function Spinner({ className }: { className?: string }) {
  return <span className={cx('size-4 rounded-full border-2 border-current border-r-transparent animate-spin', className)} />
}

/* ---------- Toast ---------- */
export function Toast({ tone = 'info', children, action, onAction }: { tone?: 'info' | 'error' | 'success'; children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="animate-rise flex items-center gap-3 rounded-2xl bg-ink/85 backdrop-blur-md px-4 py-3 text-[12.5px] text-plaster shadow-2xl">
      <span className={cx('size-2 rounded-full shrink-0', tone === 'error' ? 'bg-[#e0664a]' : tone === 'success' ? 'bg-ember' : 'bg-plaster/60')} />
      <span className="flex-1 leading-snug">{children}</span>
      {action && (
        <button onClick={onAction} className="text-ember font-medium shrink-0">
          {action}
        </button>
      )}
    </div>
  )
}

/* ---------- Loading (XR scene) ---------- */
export function SceneLoading({ progress, error, onRetry }: { progress: number; error?: boolean; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end p-8 pb-16 bg-gradient-to-t from-ink via-ink/70 to-ink/20">
      <div className="font-mono text-[10px] tracking-[0.3em] text-ember mb-3">XIAODAO · 1F</div>
      <div className="font-serif text-[30px] leading-tight text-plaster whitespace-pre-line">{error ? '这张平面图\n没能加载出来' : '先进来\n看看。'}</div>
      <div className="mt-6 h-px bg-plaster/15 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-ember transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-plaster/60">
        {error ? (
          <>
            <span>网络似乎断开了</span>
            <button className="text-ember" onClick={onRetry}>重新进入</button>
          </>
        ) : (
          <>
            <span>{progress < 40 ? '正在搭起墙和窗' : progress < 80 ? '正在摆好四张桌' : '点亮灯'}</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Empty ---------- */
export function EmptyState({ title, hint, action, onAction }: { title: string; hint: string; action?: string; onAction?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 px-4 py-5 text-center">
      <div className="font-serif text-[16px] text-ink">{title}</div>
      <div className="mt-1 text-[12px] text-ink/55">{hint}</div>
      {action && <button onClick={onAction} className="mt-3 text-[13px] text-ember-deep font-medium">{action} →</button>}
    </div>
  )
}

/* ---------- Seat Information ---------- */
export function SeatInfo({ code, kind, title, desc, facts, avail }: { code: string; kind: string; title: string; desc: string; facts: string[]; avail: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-ember">
        <span>SEAT {code}</span>
        <span className="h-px w-6 bg-ember/60" />
        <span className="font-sans tracking-normal text-plaster/70 text-[11px]">{kind}</span>
      </div>
      <h2 className="mt-3 font-serif text-[30px] leading-[1.2] text-plaster text-balance">{title}</h2>
      <p className="mt-3 text-[13px] leading-relaxed text-plaster/75 max-w-[290px]">{desc}</p>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-plaster/60">
        {facts.map((f) => <span key={f}>{f}</span>)}
      </div>
      <div className="mt-3 text-plaster">{avail}</div>
    </div>
  )
}

/* ---------- Reserved State (ticket) ---------- */
export function ReservedTicket({ code, kind, date, time, people, no }: { code: string; kind: string; date: string; time: string; people: number; no: string }) {
  return (
    <div className="relative rounded-[26px] bg-paper text-ink overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="font-mono text-[10px] tracking-[0.25em] text-ember-deep">RESERVED · 已为你留好</div>
        <div className="mt-2 font-serif text-[22px] leading-snug">今晚，这张桌是你的。</div>
      </div>
      <div className="relative border-t border-dashed border-ink/20">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-ink" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full bg-ink" />
      </div>
      <div className="px-5 py-4 grid grid-cols-3 gap-3 text-[11px] text-ink/55">
        <div>
          <div>位置</div>
          <div className="mt-1 text-ink text-[14px]"><span className="font-mono text-ember-deep">{code}</span> {kind}</div>
        </div>
        <div>
          <div>时间</div>
          <div className="mt-1 text-ink text-[14px]">{date.split(' ')[0]} <span className="font-mono">{time}</span></div>
        </div>
        <div>
          <div>人数</div>
          <div className="mt-1 text-ink text-[14px]">{people} 位</div>
        </div>
      </div>
      <div className="px-5 pb-4 flex justify-between font-mono text-[10px] text-ink/40">
        <span>NO. {no}</span>
        <span>保留 15 分钟</span>
      </div>
    </div>
  )
}
