export type ZoneId = 'A' | 'B'
export type TableId = 'A1' | 'A2' | 'B1' | 'B2'
export type Cam = { cx: number; cy: number; zoom: number; rot: number; tilt: number }

// 1F geometry in mm (CAD bounding box 7486 × 7111)
export const ROOM = { w: 7486, h: 7111 }

export const CAM_OVERVIEW: Cam = { cx: 3743, cy: 3700, zoom: 0.037, rot: -32, tilt: 0.56 }
export const CAM_LAUNCH: Cam = { cx: 3743, cy: 3555, zoom: 0.018, rot: -95, tilt: 0.8 }

export type Zone = {
  id: ZoneId
  name: string
  en: string
  blurb: string
  center: [number, number]
  cam: Cam
}

export const ZONES: Record<ZoneId, Zone> = {
  A: {
    id: 'A',
    name: '窗边',
    en: 'BY THE WINDOW',
    blurb: '整面落地窗，傍晚的光从海面上来',
    center: [3350, 1350],
    cam: { cx: 3350, cy: 1900, zoom: 0.078, rot: -10, tilt: 0.6 },
  },
  B: {
    id: 'B',
    name: '艺术墙',
    en: 'THE ART WALL',
    blurb: '一整面墙的画，适合两三个人慢慢聊',
    center: [6150, 5150],
    cam: { cx: 5500, cy: 5150, zoom: 0.08, rot: -68, tilt: 0.6 },
  },
}

export type Table = {
  id: TableId
  zone: ZoneId
  shape: 'rect' | 'round'
  x: number
  y: number
  w: number
  d: number
  cap: number
  def: number
  kind: string
  title: string
  desc: string
  facts: string[]
}

export const TABLES: Table[] = [
  {
    id: 'A1', zone: 'A', shape: 'rect', x: 1850, y: 1250, w: 1900, d: 900, cap: 4, def: 4,
    kind: '窗边长桌',
    title: '日落那一侧的长桌',
    desc: '正对海湾，19:40 前后日落。整张桌都落在窗光里。',
    facts: ['四人位', '桌面 1.9 m', '面朝西侧海面'],
  },
  {
    id: 'A2', zone: 'A', shape: 'rect', x: 4850, y: 1250, w: 1900, d: 900, cap: 4, def: 4,
    kind: '窗边长桌',
    title: '看得见整面画墙的长桌',
    desc: '左手是窗，右手能望到艺术墙，是全场视野最开阔的一张。',
    facts: ['四人位', '桌面 1.9 m', '窗景 + 画墙'],
  },
  {
    id: 'B1', zone: 'B', shape: 'round', x: 6150, y: 4250, w: 1000, d: 1000, cap: 3, def: 2,
    kind: '画墙圆桌',
    title: '画下面那张小圆桌',
    desc: '头顶一盏画灯，离墙一臂距离，说话不用提高声音。',
    facts: ['两人位 · 可加至三人', '直径 1.0 m', '背靠画墙'],
  },
  {
    id: 'B2', zone: 'B', shape: 'rect', x: 6150, y: 5950, w: 900, d: 900, cap: 3, def: 2,
    kind: '画墙方桌',
    title: '角落里的方桌',
    desc: '最安静的一角，余光里是窗外的天色。',
    facts: ['两人位 · 可加至三人', '0.9 × 0.9 m', '角落 · 私密'],
  },
]

export const tableById = (id: TableId) => TABLES.find((t) => t.id === id)!

export const SLOTS = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const BASE = new Date(2026, 8, 30)
export const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(BASE)
  d.setDate(BASE.getDate() + i)
  return {
    idx: i,
    label: i === 0 ? '今天' : i === 1 ? '明天' : WEEK[d.getDay()],
    day: d.getDate(),
    month: d.getMonth() + 1,
    full: `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`,
  }
})

// booked slot indices per table per date
const BOOKED: Record<TableId, number[][]> = {
  A1: [[0, 1], [3, 4], [4, 5, 6], [], [2], [3, 4, 5], [1]],
  A2: [[2, 3, 4, 5], [0], [4], [5, 6], [], [4], [3]],
  B1: [[6], [2, 3], [], [0, 1, 2, 3, 4, 5, 6, 7], [4], [1], []],
  B2: [[3], [], [5, 6], [2], [3, 4], [], [6, 7]],
}

export const isFree = (t: TableId, date: number, slot: number) => !BOOKED[t][date].includes(slot)
export const freeCount = (t: TableId, date: number) => SLOTS.filter((_, i) => isFree(t, date, i)).length
export const nextFree = (t: TableId, date: number, slot: number) => {
  for (let i = slot + 1; i < SLOTS.length; i++) if (isFree(t, date, i)) return SLOTS[i]
  return null
}

export type Ctx = { date: number; slot: number; people: number }
export const DEFAULT_CTX: Ctx = { date: 0, slot: 4, people: 2 }
