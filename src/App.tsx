import { useCallback, useEffect, useState } from 'react'
import { Flow, type Jump, type Sim, type Stage } from './xiaodao/Flow'
import { Board, type BoardView } from './xiaodao/Board'

type View = 'play' | BoardView

const INDEX: { no: string; label: string; view: View; jump?: Jump }[] = [
  { no: '00', label: '体验论点', view: 'map' },
  { no: '01', label: '用户流程', view: 'map' },
  { no: '02', label: '俯瞰 · Overview', view: 'play', jump: { stage: 'overview' } },
  { no: '03', label: '区域 · 桌位', view: 'play', jump: { stage: 'zone', zone: 'A' } },
  { no: '04', label: '座位 · 第一视角', view: 'play', jump: { stage: 'seat', table: 'A1' } },
  { no: '05', label: '预约', view: 'play', jump: { stage: 'reserve', table: 'B1' } },
  { no: '06', label: '组件', view: 'components' },
  { no: '07', label: 'Tokens', view: 'tokens' },
  { no: '08', label: '动效', view: 'motion' },
  { no: '09', label: '状态与边界', view: 'states' },
  { no: '10', label: '完整试玩', view: 'play', jump: { stage: 'launch' } },
]

const FEEL: Record<Stage, [string, string]> = {
  launch: ['进入', '空间先于一切加载。文案描述正在“布置”的东西，而非百分比。'],
  overview: ['“我在哪里？”', '整间屋子占满画面。只有两枚区域标记和一枚情境胶囊。拖动旋转。'],
  zone: ['“那里好像不错。”', '相机推近，另一区域退暗。桌位标记依次亮起，第一次点击选中，第二次坐下。'],
  seat: ['“如果今晚坐这里…”', '第一视角，窗外天色随所选时段变化。先是视野，然后是文字，最后才是按钮。'],
  reserve: ['“就是这里。”', '空间上移但不消失。纸面四步：时间 → 人数 → 称呼 → 确认。'],
  success: ['“已经是我的位置了。”', '相机退回，桌位沉降进暖光，信息收束为票根。'],
}

export default function App() {
  const [view, setView] = useState<View>('play')
  const [jump, setJump] = useState<Jump>({ stage: 'launch' })
  const [run, setRun] = useState(0)
  const [stage, setStage] = useState<Stage>('launch')
  const [sim, setSim] = useState<Sim>({ netError: false, slowLoad: false, xrFail: false })
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / 864))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const play = useCallback((j: Jump) => {
    setJump(j)
    setRun((r) => r + 1)
    setView('play')
  }, [])

  return (
    <div className="h-screen flex max-[1000px]:flex-col max-[1000px]:h-auto">
      {/* index rail */}
      <aside className="w-[260px] shrink-0 px-7 py-9 flex flex-col border-r border-plaster/15 max-[1000px]:w-full max-[1000px]:border-r-0 max-[1000px]:border-b">
        <div className="font-mono text-[10px] tracking-[0.35em] text-ember">XIAODAO · v0.1</div>
        <h1 className="mt-3 font-serif text-[34px] leading-none">小岛之约</h1>
        <p className="mt-3 text-[12px] leading-relaxed text-plaster/70">空间预约原型。先走进来，再决定坐哪。</p>
        <nav className="mt-8 flex-1 space-y-0.5 max-[1000px]:grid max-[1000px]:grid-cols-2 max-[1000px]:space-y-0">
          {INDEX.map((it) => {
            const on = it.view === view && (it.view !== 'play' || (it.jump?.stage === jump.stage))
            return (
              <button key={it.no} onClick={() => (it.jump ? play(it.jump) : setView(it.view))}
                className={`w-full flex items-baseline gap-3 py-1.5 text-left text-[13px] transition ${on ? 'text-plaster' : 'text-plaster/55 hover:text-plaster'}`}>
                <span className={`font-mono text-[10px] ${on ? 'text-ember' : ''}`}>{it.no}</span>
                <span className={on ? 'font-serif' : ''}>{it.label}</span>
                {on && <span className="ml-auto size-1.5 rounded-full bg-ember" />}
              </button>
            )
          })}
        </nav>
        <div className="mt-6 pt-5 border-t border-plaster/15">
          <div className="font-mono text-[10px] tracking-[0.25em] text-plaster/50 mb-2">模拟</div>
          {([['netError', '提交时网络异常'], ['xrFail', 'XR 场景加载失败'], ['slowLoad', '慢速加载']] as const).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between py-1 text-[12px] text-plaster/75 cursor-pointer">
              {l}
              <button role="switch" aria-checked={sim[k]} onClick={() => setSim({ ...sim, [k]: !sim[k] })}
                className={`w-8 h-[18px] rounded-full relative transition ${sim[k] ? 'bg-ember' : 'bg-plaster/20'}`}>
                <span className={`absolute top-0.5 size-3.5 rounded-full bg-ink transition-all ${sim[k] ? 'left-4' : 'left-0.5'}`} />
              </button>
            </label>
          ))}
          <button onClick={() => play({ stage: 'launch' })} className="mt-3 text-[12px] text-ember">↻ 从头试玩</button>
        </div>
      </aside>

      {view === 'play' ? (
        <main className="flex-1 flex items-center justify-center gap-14 min-w-0 py-6 max-[1000px]:flex-col">
          <div style={{ width: 410 * scale, height: 864 * scale }} className="shrink-0">
            <div className="origin-top-left rounded-[56px] bg-ink p-[10px] shadow-[0_40px_120px_-30px_rgba(0,0,0,.7)]" style={{ width: 410, height: 864, transform: `scale(${scale})` }}>
              <div className="relative w-[390px] h-[844px] rounded-[46px] overflow-hidden">
                <Flow key={run} sim={sim} jump={jump} onStage={setStage} />
              </div>
            </div>
          </div>
          <div className="w-[260px] max-[1180px]:hidden">
            <div className="font-mono text-[10px] tracking-[0.3em] text-ember">此刻 · {stage.toUpperCase()}</div>
            <div key={stage} className="animate-rise">
              <div className="mt-3 font-serif text-[30px] leading-snug">{FEEL[stage][0]}</div>
              <p className="mt-4 text-[13px] leading-relaxed text-plaster/75">{FEEL[stage][1]}</p>
            </div>
            <div className="mt-10 flex gap-1.5">
              {(['overview', 'zone', 'seat', 'reserve', 'success'] as Stage[]).map((s) => (
                <span key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s === stage ? 'bg-ember' : 'bg-plaster/20'}`} />
              ))}
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 min-w-0">
          <Board view={view} onPlay={play} />
        </main>
      )}
    </div>
  )
}
