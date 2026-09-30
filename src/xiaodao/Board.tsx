import { useState, type ReactNode } from 'react'
import type { Jump } from './Flow'
import {
  Availability, DateControl, EmptyState, PeopleControl, PrimaryAction, ReservedTicket, SceneLoading,
  SecondaryAction, SeatInfo, Spinner, TableMarker, TimeControl, Toast, ZoneIndicator, type MarkerState,
} from './ui'

export type BoardView = 'map' | 'components' | 'tokens' | 'motion' | 'states'

const Section = ({ no, title, lede, children }: { no: string; title: string; lede?: string; children: ReactNode }) => (
  <section className="mb-16">
    <div className="flex items-baseline gap-4 border-b border-plaster/25 pb-3 mb-6">
      <span className="font-mono text-[11px] text-ember">{no}</span>
      <h2 className="font-serif text-[28px]">{title}</h2>
      {lede && <p className="ml-auto text-[12px] text-plaster/65 max-w-sm text-right">{lede}</p>}
    </div>
    {children}
  </section>
)
const Spec = ({ name, api, children, paper = false, className = '' }: { name: string; api: string; children: ReactNode; paper?: boolean; className?: string }) => (
  <div className={`rounded-[22px] overflow-hidden ${className}`}>
    <div className={`relative min-h-[120px] p-5 flex items-center justify-center ${paper ? 'bg-paper text-ink' : 'bg-dusk'}`}>{children}</div>
    <div className="bg-rust-deep px-4 py-2.5 flex justify-between gap-3 text-[11px]">
      <span className="font-serif">{name}</span>
      <code className="font-mono text-plaster/55 truncate">{api}</code>
    </div>
  </div>
)

export function Board({ view, onPlay }: { view: BoardView; onPlay: (j: Jump) => void }) {
  return (
    <div className="h-full overflow-y-auto no-scrollbar px-10 py-12 max-[1000px]:px-5">
      {view === 'map' && <MapView onPlay={onPlay} />}
      {view === 'components' && <Components />}
      {view === 'tokens' && <Tokens />}
      {view === 'motion' && <Motion />}
      {view === 'states' && <States onPlay={onPlay} />}
    </div>
  )
}

function MapView({ onPlay }: { onPlay: (j: Jump) => void }) {
  const steps: { no: string; t: string; feel: string; ui: string; jump: Jump }[] = [
    { no: '01', t: '俯瞰', feel: '“我在哪里？”', ui: '空间 90% · UI 仅两枚区域标记与一枚情境胶囊', jump: { stage: 'overview' } },
    { no: '02', t: '走近区域', feel: '“那里好像不错。”', ui: '相机推近，非目标区降至 28%，桌位标记依次亮起', jump: { stage: 'zone', zone: 'A' } },
    { no: '03', t: '坐下', feel: '“如果今晚坐这里…”', ui: '第一视角 · 窗景随所选时段变化 · CTA 最后出现', jump: { stage: 'seat', table: 'A1' } },
    { no: '04', t: '留位', feel: '“就是这里。”', ui: '空间上移让位，悬浮纸面分四步收拢信息', jump: { stage: 'reserve', table: 'A1' } },
    { no: '05', t: '属于你', feel: '“已经是我的位置了。”', ui: '相机退回，桌位暖光沉降，信息收束为一张票根', jump: { stage: 'success', table: 'B1' } },
  ]
  return (
    <>
      <Section no="00" title="体验论点">
        <p className="font-serif text-[40px] leading-[1.35] max-w-3xl text-balance max-[1000px]:text-[28px]">
          先走进这间屋子，<span className="text-ember">再决定</span>今晚坐在哪。预约是探索的尾声，而不是体验本身。
        </p>
        <div className="mt-8 grid grid-cols-3 gap-6 max-w-3xl text-[13px] text-plaster/75 max-[1000px]:grid-cols-1">
          <p><b className="font-serif text-plaster">空间优先</b><br />空间 → 空间标记 → 情境 UI → 动作。UI 从不压缩 XR-Frame 画面。</p>
          <p><b className="font-serif text-plaster">先探索后交易</b><br />日期人数只以一枚胶囊存在，进入座位后才展开预约。</p>
          <p><b className="font-serif text-plaster">对象先回应</b><br />0–80ms 桌位反馈 → 80–760ms 相机 → 稳定后 100ms UI 跟随。</p>
        </div>
      </Section>
      <Section no="01" title="用户流程" lede="每一格都可以直接进入原型对应状态">
        <div className="grid grid-cols-5 gap-3 max-[1000px]:grid-cols-1">
          {steps.map((s, i) => (
            <button key={s.no} onClick={() => onPlay(s.jump)} className="group text-left rounded-[22px] bg-dusk p-5 hover:bg-dusk-2 transition relative" style={{ marginTop: i % 2 ? 28 : 0 }}>
              <div className="font-mono text-[10px] text-ember">{s.no}</div>
              <div className="mt-6 font-serif text-[24px]">{s.t}</div>
              <div className="mt-1 text-[13px] text-ember/90">{s.feel}</div>
              <div className="mt-4 text-[11.5px] leading-relaxed text-plaster/60">{s.ui}</div>
              <div className="mt-5 text-[11px] text-plaster/50 group-hover:text-ember transition">进入 →</div>
            </button>
          ))}
        </div>
      </Section>
    </>
  )
}

function Components() {
  const [date, setDate] = useState(0)
  const [slot, setSlot] = useState(4)
  const [ppl, setPpl] = useState(2)
  const markers: MarkerState[] = ['default', 'focus', 'selected', 'unavailable', 'reserved', 'mine']
  const mLabel: Record<MarkerState, [string, string?]> = { default: [''], focus: ['画墙圆桌', '2人'], selected: ['画墙圆桌', '2人'], unavailable: ['窗边长桌', '20:30 后'], reserved: ['角落方桌', '已订'], mine: ['已属于你'] }
  return (
    <Section no="06" title="组件" lede="每个组件以 props 表达 variant，可一一映射为 Taro 组件">
      <div className="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-1">
        <Spec name="Table Marker · 6 态" api="<TableMarker state />" className="col-span-2 max-[1000px]:col-span-1">
          <div className="grid grid-cols-3 gap-y-10 w-full py-4">
            {markers.map((m) => (
              <div key={m} className="relative h-10">
                <TableMarker state={m} code="B1" label={mLabel[m][0]} sub={mLabel[m][1]} style={{ left: 24, top: 12 }} />
                <div className="absolute left-0 top-10 font-mono text-[10px] text-plaster/45">{m}</div>
              </div>
            ))}
          </div>
        </Spec>
        <Spec name="Zone Indicator" api="<ZoneIndicator state />">
          <div className="relative h-24 w-full">
            <ZoneIndicator letter="A" name="窗边" en="WINDOW" free={2} style={{ left: '28%', top: 90 }} />
            <ZoneIndicator letter="B" name="画墙" en="ART" free={0} state="active" style={{ left: '74%', top: 90 }} />
          </div>
        </Spec>
        <Spec name="Date Control" api="<DateControl value />" paper><div className="w-full"><DateControl value={date} onChange={setDate} /></div></Spec>
        <Spec name="Time Control · 含不可用" api="<TimeControl table date />" paper><div className="w-full"><TimeControl table="A2" date={0} value={slot} onChange={setSlot} /></div></Spec>
        <Spec name="People Control · 超出容量抖动" api="<PeopleControl max over />" paper><PeopleControl value={ppl} max={3} onChange={setPpl} onOver={() => {}} /></Spec>
        <Spec name="Availability" api="<Availability state />">
          <div className="flex flex-col gap-2 text-plaster">
            <Availability state="open" text="19:30 空着 · 还有 5 个时段" />
            <Availability state="few" text="只剩 20:30 一个时段" />
            <Availability state="full" text="19:30 已有客人 · 20:30 之后空出" />
            <Availability state="loading" text="正在查看空位…" />
          </div>
        </Spec>
        <Spec name="Seat Information" api="<SeatInfo />" className="col-span-2 max-[1000px]:col-span-1">
          <div className="w-full"><SeatInfo code="A1" kind="窗边长桌" title="日落那一侧的长桌" desc="正对海湾，19:40 前后日落。" facts={['四人位', '桌面 1.9 m']} avail={<Availability state="open" text="今天 19:30 空着" />} /></div>
        </Spec>
        <Spec name="Primary / Secondary Action" api="<PrimaryAction state />">
          <div className="flex flex-col gap-2 w-full">
            <PrimaryAction>就坐这里</PrimaryAction>
            <PrimaryAction state="loading">正在为你留位…</PrimaryAction>
            <PrimaryAction state="disabled">下一步</PrimaryAction>
            <SecondaryAction>再看看</SecondaryAction>
          </div>
        </Spec>
        <Spec name="Toast" api="<Toast tone action />" className="col-span-2 max-[1000px]:col-span-1">
          <div className="flex flex-col gap-2 w-full">
            <Toast tone="error" action="再试一次">网络有点不稳。别担心，这张桌先为你留着。</Toast>
            <Toast tone="success">已添加到日历，出发前 1 小时提醒你</Toast>
          </div>
        </Spec>
        <Spec name="Empty" api="<EmptyState />" paper><EmptyState title="10月3日 这张桌已满" hint="画墙下的位置很抢手" action="看看周日" /></Spec>
        <Spec name="Reserved State" api="<ReservedTicket />" className="col-span-2 max-[1000px]:col-span-1">
          <div className="w-[340px] bg-ink p-3 rounded-[30px]"><ReservedTicket code="B1" kind="画墙圆桌" date="9月30日 周三" time="19:30" people={2} no="XD1004B1" /></div>
        </Spec>
        <Spec name="Loading" api="<Spinner /> · <SceneLoading />"><div className="flex items-center gap-3 text-ember"><Spinner /> <span className="text-[12px] text-plaster/70">XR 场景 · 按阶段文案</span></div></Spec>
      </div>
    </Section>
  )
}

function Tokens() {
  const colors = [
    ['ink', '#17100c', '夜 · 文字与深底'], ['dusk', '#211712', '空间底色'], ['plaster', '#f2e7d7', '墙面 · 浅文字'], ['paper', '#faf4ea', '预约纸面'],
    ['ember', '#ffae52', '唯一的“光” · 可约 / 主动作'], ['ember-deep', '#e2702c', '纸面上的强调'], ['rust', '#9a3d1e', '品牌画布'], ['oak', '#c89a6a', '地板 · 桌面'],
    ['ash', '#8b7d72', '不可约 · 已订'], ['sea', '#33506a', '窗外海面'],
  ]
  return (
    <>
      <Section no="07" title="设计 Tokens" lede="只有一种强调色：光。可约的东西会发光，不可约的东西会熄灭。">
        <div className="grid grid-cols-5 gap-3 max-[1000px]:grid-cols-2">
          {colors.map(([n, h, d]) => (
            <div key={n}>
              <div className="h-24 rounded-2xl border border-plaster/10" style={{ background: h }} />
              <div className="mt-2 font-mono text-[11px]">color.{n}</div>
              <div className="font-mono text-[10px] text-plaster/50">{h}</div>
              <div className="text-[11px] text-plaster/70 mt-0.5">{d}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section no="07.2" title="字体">
        <div className="space-y-5">
          <div className="flex items-baseline gap-6"><span className="w-40 font-mono text-[10px] text-plaster/50">serif · Noto Serif SC</span><span className="font-serif text-[40px]">日落那一侧的长桌</span></div>
          <div className="flex items-baseline gap-6"><span className="w-40 font-mono text-[10px] text-plaster/50">latin · Fraunces</span><span className="font-latin italic text-[40px]">A · 19 · 30</span></div>
          <div className="flex items-baseline gap-6"><span className="w-40 font-mono text-[10px] text-plaster/50">sans · Noto Sans SC</span><span className="text-[15px]">正对海湾，19:40 前后日落。整张桌都落在窗光里。</span></div>
          <div className="flex items-baseline gap-6"><span className="w-40 font-mono text-[10px] text-plaster/50">mono · DM Mono</span><span className="font-mono text-[13px] tracking-[0.25em] text-ember">SEAT A1 · 1F · 48 M²</span></div>
        </div>
      </Section>
      <Section no="07.3" title="间距 · 圆角 · 时长">
        <div className="grid grid-cols-3 gap-8 text-[12px] max-[1000px]:grid-cols-1">
          <div className="space-y-2">{[4, 8, 12, 16, 24, 32].map((s) => <div key={s} className="flex items-center gap-3"><span className="font-mono w-14 text-plaster/60">space.{s}</span><span className="h-2 bg-ember rounded" style={{ width: s * 3 }} /></div>)}</div>
          <div className="space-y-2">{[['pill', 999], ['panel', 30], ['card', 22], ['control', 12]].map(([n, r]) => <div key={n} className="flex items-center gap-3"><span className="font-mono w-24 text-plaster/60">radius.{n}</span><span className="size-8 border border-plaster/60" style={{ borderRadius: Math.min(16, r as number) }} /><span className="font-mono text-plaster/50">{r}</span></div>)}</div>
          <div className="space-y-2 font-mono text-plaster/70">
            <div>motion.feedback · 80ms</div><div>motion.camera · 680ms · ease-space</div><div>motion.ui.delay · camera + 100ms</div><div>motion.panel · 560ms · ease-settle</div><div>motion.step · 420ms</div><div>motion.settle · 1100ms</div>
          </div>
        </div>
      </Section>
    </>
  )
}

function Motion() {
  const [run, setRun] = useState(0)
  const rows = [
    ['点击桌位', 0, 80, '桌位 / 标记立即反馈 · ring ping'],
    ['相机重构', 80, 760, '缩放 + 旋转 + 俯仰同步插值，不做页面滑动'],
    ['焦点形成', 400, 700, '非目标区降至 28% · 光池亮起'],
    ['情境 UI', 860, 1300, 'rise：10px 位移 + 4px 模糊消散'],
  ] as const
  return (
    <Section no="08" title="动效时序" lede="对象先回应 → 空间回应 → UI 跟随">
      <div className="rounded-[22px] bg-dusk p-6">
        <div className="relative ml-28 h-5 font-mono text-[10px] text-plaster/40">
          {[0, 200, 400, 600, 800, 1000, 1200].map((t) => <span key={t} className="absolute" style={{ left: `${(t / 1300) * 100}%` }}>{t}ms</span>)}
        </div>
        {rows.map(([n, a, b, d]) => (
          <div key={`${n}${run}`} className="flex items-center gap-4 py-3 border-t border-plaster/10">
            <span className="w-24 font-serif text-[14px]">{n}</span>
            <div className="relative flex-1 h-6">
              <div className="absolute inset-y-1.5 rounded-full bg-ember/85 origin-left animate-[rise_1s_both]" style={{ left: `${(a / 1300) * 100}%`, width: `${((b - a) / 1300) * 100}%`, animationDelay: `${a}ms` }} />
            </div>
            <span className="w-64 text-[11px] text-plaster/60 max-[1000px]:hidden">{d}</span>
          </div>
        ))}
        <button onClick={() => setRun(run + 1)} className="mt-4 text-[12px] text-ember">↻ 重播时间轴</button>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4 text-[12.5px] text-plaster/75 max-[1000px]:grid-cols-1">
        <div className="rounded-[22px] bg-dusk p-5"><b className="font-serif text-plaster text-[16px]">面板：Follow → Dock</b><p className="mt-2">区域内的桌位卡片跟随标记漂浮（Follow）；进入预约后空间上移 150px，纸面从底部带弹性停靠（Dock）。测试后 Dock 最稳：不遮挡第一视角的窗景。</p></div>
        <div className="rounded-[22px] bg-dusk p-5"><b className="font-serif text-plaster text-[16px]">相机：俯瞰 → 区域 → 座位</b><p className="mt-2">三段均为同一相机的连续插值，旋转幅度 ≤ 60°，保留地板木纹与窗光作为方向锚点。进入座位时在推近末段交叉淡入第一视角。</p></div>
        <div className="rounded-[22px] bg-dusk p-5"><b className="font-serif text-plaster text-[16px]">成功：Settle</b><p className="mt-2">相机退回半空，桌位标记从 1.9× 沉降至 1×，光池转为更暖的琥珀色，信息收束为票根。没有彩带。</p></div>
      </div>
    </Section>
  )
}

function States({ onPlay }: { onPlay: (j: Jump) => void }) {
  const list: { t: string; d: string; j: Jump }[] = [
    { t: '桌位可预约', d: '艺术墙区 · B1 默认 19:30 空着', j: { stage: 'zone', zone: 'B' } },
    { t: '桌位不可预约', d: '窗边 A2 在 19:30 已有客人，标记熄灭并提示 20:30 后', j: { stage: 'zone', zone: 'A' } },
    { t: '已选中', d: 'B1 被选中 · 跟随面板出现', j: { stage: 'zone', zone: 'B', table: 'B1' } },
    { t: '时间不可用', d: 'A2 预约面板 · 划线时段可点击查看原因', j: { stage: 'reserve', table: 'A2', step: 0, ctx: { slot: 6 } } },
    { t: '人数超出容量', d: 'B1 最多 3 位 · 继续加人会抖动并引导去窗边', j: { stage: 'reserve', table: 'B1', step: 1, ctx: { people: 3 } } },
    { t: '整天已满', d: 'B1 在 10月3日 · 空状态建议次日', j: { stage: 'reserve', table: 'B1', step: 0, ctx: { date: 3 } } },
    { t: '人数过多时的空间', d: '5 位时画墙区桌位全部熄灭', j: { stage: 'zone', zone: 'B', ctx: { people: 5 } } },
    { t: '预约成功', d: '桌位暖光沉降 · 票根', j: { stage: 'success', table: 'A1' } },
  ]
  return (
    <Section no="09" title="状态与边界" lede="网络异常、XR 加载失败与慢加载可在左侧“模拟”中打开，然后从头试玩">
      <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-1">
        {list.map((s) => (
          <button key={s.t} onClick={() => onPlay(s.j)} className="text-left rounded-[22px] bg-dusk p-5 hover:bg-dusk-2 transition group">
            <div className="font-serif text-[18px]">{s.t}</div>
            <div className="mt-2 text-[12px] text-plaster/60 leading-relaxed">{s.d}</div>
            <div className="mt-4 text-[11px] text-plaster/45 group-hover:text-ember">在原型中打开 →</div>
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 max-[1000px]:grid-cols-1">
        <div className="relative h-72 rounded-[22px] overflow-hidden bg-dusk"><SceneLoading progress={46} /></div>
        <div className="relative h-72 rounded-[22px] overflow-hidden bg-dusk"><SceneLoading progress={62} error /></div>
      </div>
    </Section>
  )
}
