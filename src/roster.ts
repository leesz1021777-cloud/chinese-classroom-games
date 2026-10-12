import Papa from 'papaparse'
import { shuffle } from './services'

export function validateNames(names: unknown[]): string[] {
  if (!names.length) throw new Error('名单为空，请至少填写一个姓名')
  if (names.length > 500) throw new Error('每份名单最多500人')
  return names.map((name, i) => {
    if (typeof name !== 'string' || !name.trim()) throw new Error(`第${i + 1}项缺少姓名`)
    const value = name.replace(/^\uFEFF/, '').trim()
    if (value.length > 80) throw new Error(`第${i + 1}项超过80字，请检查分隔符`)
    return value
  })
}
export function textNames(text: string) {
  return validateNames(
    text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  )
}
export function jsonNames(text: string) {
  const raw: unknown = JSON.parse(text)
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && 'students' in raw
      ? raw.students
      : null
  if (!Array.isArray(rows)) throw new Error('JSON须为姓名数组，或包含students数组的对象')
  return validateNames(
    rows.map((row) =>
      typeof row === 'string'
        ? row
        : row && typeof row === 'object' && 'name' in row
          ? row.name
          : undefined,
    ),
  )
}
export function rosterCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  })
  if (parsed.errors.length)
    throw new Error(parsed.errors.map((e) => `第${(e.row ?? 0) + 2}行：${e.message}`).join('；'))
  if (!parsed.meta.fields?.length) throw new Error('CSV需要表头，例如“姓名”')
  return { headers: parsed.meta.fields, rows: parsed.data }
}
export function nextStudent<T extends { id: string }>(
  students: T[],
  remainingIds: string[],
  repeat: boolean,
  random = Math.random,
) {
  if (!students.length) throw new Error('请先导入名单')
  const ids = repeat
    ? shuffle(
        students.map((s) => s.id),
        random,
      )
    : remainingIds
  if (!ids.length) throw new Error('本轮已经全部点名，请开始新一轮')
  const chosen = students.find((s) => s.id === ids[0])
  if (!chosen) throw new Error('名单已变化，请重新开始本轮')
  return { chosen, remaining: repeat ? [] : ids.slice(1) }
}
