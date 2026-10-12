import { z } from 'zod'
import { legalPinyin } from './pinyin'

export const games = [
  {
    id: 'mole',
    name: '汉字打地鼠',
    icon: '🐹',
    color: '#fcbd59',
    types: ['choice'],
    description: '找一找，谁举着正确的汉字？',
    goal: '认读汉字 · 辨析字形',
  },
  {
    id: 'train',
    name: '拼音小火车',
    icon: '🚂',
    color: '#91c6fd',
    types: ['pinyin'],
    description: '选好拼音卡片，一起开往终点站。',
    goal: '音节拼读 · 拼音与汉字',
  },
  {
    id: 'balloon',
    name: '声调气球大作战',
    icon: '🎈',
    color: '#f9a4b5',
    types: ['tone'],
    description: '一声平，二声扬，找到声调气球。',
    goal: '四声辨认 · 声调对比',
  },
  {
    id: 'detective',
    name: '汉字侦探社',
    icon: '🔎',
    color: '#b5a5eb',
    types: ['choice'],
    description: '睁大眼睛，发现汉字的小秘密。',
    goal: '形近字 · 汉字结构',
  },
  {
    id: 'bridge',
    name: '词语搭桥',
    icon: '🌉',
    color: '#8cd2b9',
    types: ['word'],
    description: '选对词语，搭起通往对岸的小桥。',
    goal: '词语搭配 · 量词运用',
  },
  {
    id: 'sentence',
    name: '句子排排队',
    icon: '🧩',
    color: '#f5c181',
    types: ['sentence'],
    description: '把词语排好队，说出完整的一句话。',
    goal: '语序训练 · 完整表达',
  },
  {
    id: 'reading',
    name: '朗读节奏大师',
    icon: '📖',
    color: '#96ccdf',
    types: ['reading'],
    description: '跟着光点，读出自己的小节奏。',
    goal: '指读练习 · 停顿节奏',
  },
] as const
export type GameId = (typeof games)[number]['id']
const text = z.string().trim().min(1).max(4000)
const id = z.string().min(1).max(150)
export const questionSchema = z
  .object({
    id,
    versionId: id,
    bookId: id,
    unitId: id,
    lessonId: id,
    type: z.enum(['choice', 'pinyin', 'tone', 'word', 'sentence', 'reading']),
    knowledge: text,
    prompt: text,
    options: z.array(text).max(12),
    answers: z.array(text).max(12),
    difficulty: z.enum(['easy', 'normal', 'challenge']),
    games: z
      .array(z.enum(['mole', 'train', 'balloon', 'detective', 'bridge', 'sentence', 'reading']))
      .min(1),
    explanation: z.string().max(4000),
    notes: z.string().max(4000),
    enabled: z.boolean(),
    createdAt: text,
    updatedAt: text,
    syllable: z.string().max(100).optional(),
    parts: z.array(text).max(5).optional(),
    tone: z.number().int().min(1).max(4).optional(),
    tokens: z.array(text).max(30).optional(),
    orders: z
      .array(z.array(z.number().int().min(0)))
      .max(12)
      .optional(),
    readingText: z.string().max(4000).optional(),
    readingChunks: z.array(z.string().min(1).max(4000)).max(1000).optional(),
    audio: z
      .string()
      .max(3_000_000)
      .regex(/^data:audio\/(mpeg|wav|ogg|mp4|webm);base64,[A-Za-z0-9+/=]+$/)
      .optional(),
    highlight: z.string().max(100).optional(),
  })
  .superRefine((q, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (new Set(q.options).size !== q.options.length) issue('选项不能重复')
    if (new Set(q.answers).size !== q.answers.length) issue('正确答案不能重复')
    if (new Set(q.games).size !== q.games.length) issue('适用游戏不能重复')
    if (
      q.games.some(
        (g) => !(games.find((item) => item.id === g)!.types as readonly string[]).includes(q.type),
      )
    )
      issue('游戏与题型不兼容')
    if (['choice', 'pinyin', 'word'].includes(q.type)) {
      if (
        q.options.length < 2 ||
        !q.answers.length ||
        q.answers.some((a) => !q.options.includes(a))
      )
        issue('至少两个选项，且正确答案必须存在于选项中')
    }
    if (q.type === 'pinyin' && (!q.syllable || !q.answers.includes(q.syllable)))
      issue('拼音题须提供明确的合法音节答案')
    if (q.type === 'pinyin' && q.options.some((option) => !legalPinyin(option)))
      issue('拼音选项须为合法音节，声调位置和ü省写须正确')
    if (
      q.type === 'tone' &&
      (!q.tone ||
        q.answers.length !== 1 ||
        q.answers[0] !== String(q.tone) ||
        q.options.join('|') !== '1|2|3|4')
    )
      issue('声调须为1—4，并与正确答案一致')
    if (q.type === 'sentence') {
      if (!q.tokens?.length || !q.orders?.length) issue('句子题需要词语卡片和正确排序')
      else if (
        q.orders.some(
          (order) =>
            order.length !== q.tokens!.length ||
            new Set(order).size !== order.length ||
            order.some((n) => n >= q.tokens!.length),
        )
      )
        issue('每个排序须包含所有词语索引且不重复')
    }
    if (q.type === 'reading' && !q.readingText?.trim()) issue('朗读题须提供正文')
    if (
      q.type === 'reading' &&
      q.readingChunks?.length &&
      q.readingChunks.join('') !== q.readingText
    )
      issue('逐词分段拼接后须与朗读正文完全一致')
  })
export type Question = z.infer<typeof questionSchema>
export const bookSchema = z.object({
  id,
  versionId: id,
  name: text,
  grade: z.number().int().min(1).max(6),
  term: z.enum(['上册', '下册', '自定义']),
  version: text,
})
export const unitSchema = z.object({ id, bookId: id, name: text, order: z.number().int().min(0) })
export const lessonSchema = z.object({
  id,
  unitId: id,
  name: text,
  order: z.number().int().min(0),
  confirmed: z.boolean(),
  topic: z.boolean(),
})
export type Book = z.infer<typeof bookSchema>
export type Unit = z.infer<typeof unitSchema>
export type Lesson = z.infer<typeof lessonSchema>
export const settingsSchema = z.object({
  volume: z.number().min(0).max(1),
  animation: z.number().min(0.5).max(2),
  seconds: z.number().int().min(0).max(300),
  showAnswers: z.boolean(),
  theme: z.enum(['sky', 'lavender', 'cream']),
  cooperative: z.boolean(),
  rotate: z.boolean(),
  groups: z.array(text).min(4).max(10),
  readingSpeed: z.number().min(100).max(2000),
  readingUnit: z.enum(['char', 'word']).default('char'),
  pauseComma: z.number().min(0).max(3000),
  pauseEnd: z.number().min(0).max(5000),
  holes: z.number().int().min(2).max(6),
  moleSpeed: z.number().min(500).max(10000),
})
export type Settings = z.infer<typeof settingsSchema>
export type Outcome = {
  questionId: string
  prompt: string
  status: 'correct' | 'wrong' | 'skipped'
  attempts: number
}
export type Result = {
  id: string
  date: string
  game: GameId
  outcomes: Outcome[]
  scores: number[]
  groupNames?: string[]
}
const resultSchema = z.object({
  id,
  date: text,
  game: z.enum(['mole', 'train', 'balloon', 'detective', 'bridge', 'sentence', 'reading']),
  outcomes: z
    .array(
      z.object({
        questionId: id,
        prompt: text,
        status: z.enum(['correct', 'wrong', 'skipped']),
        attempts: z.number().int().min(0),
      }),
    )
    .max(500),
  scores: z.array(z.number().int().min(0)).max(10),
  groupNames: z.array(text).max(10).optional(),
})
export const databaseSchema = z
  .object({
    schemaVersion: z.literal(2),
    contentRevision: z.number().int().min(1).optional(),
    books: z.array(bookSchema).min(1).max(100),
    units: z.array(unitSchema).min(1).max(1000),
    lessons: z.array(lessonSchema).min(1).max(5000),
    questions: z.array(questionSchema).max(20000),
    settings: settingsSchema,
    results: z.array(resultSchema).max(100),
    rosters: z
      .array(z.object({ id, name: text, students: z.array(z.object({ id, name: text })).max(500) }))
      .max(30)
      .optional(),
  })
  .superRefine((db, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
    for (const key of ['books', 'units', 'lessons', 'questions'] as const)
      if (new Set(db[key].map((x) => x.id)).size !== db[key].length) issue(`${key} 中存在重复ID`)
    for (const b of db.books)
      if (!db.units.some((u) => u.bookId === b.id)) issue(`教材 ${b.name} 至少需要一个单元`)
    for (const u of db.units)
      if (!db.lessons.some((l) => l.unitId === u.id))
        issue(`单元 ${u.name} 至少需要一课，可保留待确认占位课目`)
    for (const u of db.units)
      if (!db.books.some((b) => b.id === u.bookId)) issue(`单元 ${u.name} 的教材不存在`)
    for (const l of db.lessons)
      if (!db.units.some((u) => u.id === l.unitId)) issue(`课文 ${l.name} 的单元不存在`)
    for (const q of db.questions) {
      const lesson = db.lessons.find((l) => l.id === q.lessonId)
      const unit = db.units.find((u) => u.id === q.unitId)
      const book = db.books.find((b) => b.id === q.bookId)
      if (
        !lesson ||
        !unit ||
        !book ||
        lesson.unitId !== q.unitId ||
        unit.bookId !== q.bookId ||
        book.versionId !== q.versionId
      )
        issue(`题目 ${q.id} 的教材归属不一致`)
    }
    if (db.rosters) {
      if (new Set(db.rosters.map((r) => r.id)).size !== db.rosters.length) issue('班级ID不能重复')
      for (const roster of db.rosters)
        if (new Set(roster.students.map((s) => s.id)).size !== roster.students.length)
          issue('名单中的学生ID不能重复')
    }
  })
export type Database = z.infer<typeof databaseSchema>
export const defaultSettings: Settings = {
  volume: 0,
  animation: 1,
  seconds: 0,
  showAnswers: false,
  theme: 'sky',
  cooperative: false,
  rotate: true,
  groups: Array.from({ length: 8 }, (_, i) => `第${i + 1}组`),
  readingSpeed: 650,
  readingUnit: 'char',
  pauseComma: 550,
  pauseEnd: 900,
  holes: 6,
  moleSpeed: 2500,
}
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
