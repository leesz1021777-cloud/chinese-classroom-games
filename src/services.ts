import Papa from 'papaparse'
import {
  databaseSchema,
  questionSchema,
  uid,
  type Database,
  type GameId,
  type Question,
} from './domain'
import { defaultSettings } from './domain'

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export function prepareChoices(q: Question, limit = q.options.length, random = Math.random) {
  const size = Math.max(2, Math.min(limit, q.options.length))
  if (size >= q.options.length) return shuffle(q.options, random)
  const correct = shuffle(q.answers, random)[0]
  const distractors = shuffle(
    q.options.filter((option) => option !== correct),
    random,
  ).slice(0, size - 1)
  return shuffle([correct, ...distractors], random)
}
export type Filter = {
  game: GameId
  lessonIds: string[]
  difficulty: 'all' | Question['difficulty']
  count: number
}
export function schedule(db: Database, filter: Filter) {
  const available = db.questions.filter(
    (q) =>
      q.enabled &&
      q.games.includes(filter.game) &&
      filter.lessonIds.includes(q.lessonId) &&
      (filter.difficulty === 'all' || q.difficulty === filter.difficulty),
  )
  const count = Math.max(1, Math.min(500, Math.floor(filter.count)))
  return {
    questions: shuffle(available)
      .slice(0, count)
      .map((q) => structuredClone(q)),
    available: available.length,
    shortfall: Math.max(0, count - available.length),
  }
}
export function isAnswer(q: Question, answer: string | number[]) {
  if (q.type === 'sentence')
    return (
      Array.isArray(answer) &&
      !!q.orders?.some(
        (order) => order.length === answer.length && order.every((v, i) => v === answer[i]),
      )
    )
  return typeof answer === 'string' && q.answers.includes(answer)
}
export function validateBackup(input: unknown): Database {
  if (!input || typeof input !== 'object') throw new Error('备份必须是JSON对象')
  const raw = structuredClone(input) as Record<string, unknown>
  // v1与v2共享教材和题目字段；v2新增课堂设置字段与结果记录。
  if (raw.schemaVersion === 1) {
    raw.schemaVersion = 2
    raw.settings = { ...defaultSettings, ...(typeof raw.settings === 'object' ? raw.settings : {}) }
    raw.results ??= []
  }
  const parsed = databaseSchema.safeParse(raw)
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .slice(0, 12)
        .map((i) => `${i.path.join('.') || '数据'}：${i.message}`)
        .join('\n'),
    )
  return parsed.data
}
export type Scope = { bookId?: string; unitId?: string; lessonId?: string }
export const inScope = (q: Question, scope: Scope) =>
  (!scope.bookId || q.bookId === scope.bookId) &&
  (!scope.unitId || q.unitId === scope.unitId) &&
  (!scope.lessonId || q.lessonId === scope.lessonId)
export function exportScope(db: Database, scope: Scope): Database {
  const lessons = db.lessons.filter(
    (l) =>
      (!scope.lessonId || l.id === scope.lessonId) &&
      (!scope.unitId || l.unitId === scope.unitId) &&
      (!scope.bookId || db.units.some((u) => u.id === l.unitId && u.bookId === scope.bookId)),
  )
  const units = db.units.filter((u) => lessons.some((l) => l.unitId === u.id))
  const books = db.books.filter((b) => units.some((u) => u.bookId === b.id))
  return validateBackup({
    ...db,
    books,
    units,
    lessons,
    questions: db.questions.filter((q) => inScope(q, scope)),
    results: [],
  })
}
export function importBackup(
  current: Database,
  incoming: Database,
  mode: 'merge' | 'replace',
  scope: Scope = {},
): Database {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...a, ...b].map((item) => [item.id, item])).values(),
  ]
  if (mode === 'replace' && !Object.values(scope).some(Boolean)) return validateBackup(incoming)
  const selected = incoming.questions.filter((q) => inScope(q, scope))
  const questions =
    mode === 'replace' ? current.questions.filter((q) => !inScope(q, scope)) : current.questions
  return validateBackup({
    ...current,
    books: merge(current.books, incoming.books),
    units: merge(current.units, incoming.units),
    lessons: merge(current.lessons, incoming.lessons),
    questions: merge(questions, selected),
  })
}
export function download(name: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const csvFields = [
  'prompt',
  'type',
  'options',
  'answers',
  'difficulty',
  'knowledge',
  'explanation',
  'notes',
  'syllable',
  'parts',
  'tone',
  'tokens',
  'orders',
  'readingText',
] as const
export type CsvField = (typeof csvFields)[number]
export function parseCsv(text: string) {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  })
  if (result.errors.length)
    throw new Error(result.errors.map((e) => `第${(e.row ?? 0) + 2}行：${e.message}`).join('\n'))
  return { rows: result.data, headers: result.meta.fields ?? [] }
}
export function mapCsv(
  rows: Record<string, string>[],
  mapping: Partial<Record<CsvField, string>>,
  db: Database,
  lessonId: string,
) {
  const lesson = db.lessons.find((l) => l.id === lessonId)!,
    unit = db.units.find((u) => u.id === lesson.unitId)!,
    book = db.books.find((b) => b.id === unit.bookId)!
  const questions: Question[] = [],
    errors: string[] = []
  const gameMap: Record<string, GameId[]> = {
    choice: ['mole', 'detective'],
    pinyin: ['train'],
    tone: ['balloon'],
    word: ['bridge'],
    sentence: ['sentence'],
    reading: ['reading'],
  }
  rows.forEach((row, index) => {
    const value = (key: CsvField) => row[mapping[key] ?? ''] ?? ''
    try {
      const type = value('type') || 'choice',
        stamp = new Date().toISOString()
      const list = (key: CsvField) =>
        value(key)
          ? value(key)
              .split('|')
              .map((v) => v.trim())
          : []
      const raw = {
        id: uid(),
        bookId: book.id,
        versionId: book.versionId,
        unitId: unit.id,
        lessonId,
        type,
        prompt: value('prompt'),
        options: list('options'),
        answers: list('answers'),
        difficulty: value('difficulty') || 'easy',
        knowledge: value('knowledge') || '教师导入',
        explanation: value('explanation'),
        notes: value('notes'),
        games: gameMap[type] ?? [],
        enabled: true,
        createdAt: stamp,
        updatedAt: stamp,
        ...(value('syllable') ? { syllable: value('syllable'), parts: list('parts') } : {}),
        ...(value('tone') ? { tone: Number(value('tone')) } : {}),
        ...(value('tokens') ? { tokens: list('tokens'), orders: JSON.parse(value('orders')) } : {}),
        ...(value('readingText') ? { readingText: value('readingText') } : {}),
      }
      questions.push(questionSchema.parse(raw))
    } catch (e) {
      errors.push(`第${index + 2}行：${e instanceof Error ? e.message : '字段错误'}`)
    }
  })
  return { questions, errors }
}
