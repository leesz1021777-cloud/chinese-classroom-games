import { describe, it, expect } from 'vitest'
import { createSeed } from '../src/seed'
import { databaseSchema, questionSchema } from '../src/domain'
import {
  exportScope,
  importBackup,
  isAnswer,
  mapCsv,
  parseCsv,
  schedule,
  validateBackup,
} from '../src/services'

describe('校验和题目调度', () => {
  it('逐词朗读分段必须保留原文和标点', () => {
    const q = {
      ...createSeed().questions.find((q) => q.type === 'reading')!,
      readingText: '小鸟唱歌。',
      readingChunks: ['小鸟', '唱歌', '。'],
    }
    expect(questionSchema.parse(q).readingChunks).toEqual(['小鸟', '唱歌', '。'])
    expect(questionSchema.safeParse({ ...q, readingChunks: ['小鸟', '唱歌'] }).success).toBe(false)
  })
  it('490道原创示例校验通过，覆盖七款游戏', () => {
    const db = createSeed()
    expect(databaseSchema.parse(db).questions).toHaveLength(490)
    for (const game of [
      'mole',
      'train',
      'balloon',
      'detective',
      'bridge',
      'sentence',
      'reading',
    ] as const)
      expect(db.questions.some((q) => q.games.includes(game))).toBe(true)
  })
  it('抽取不重复、不改变原题；题量不足会提示', () => {
    const db = createSeed(),
      snapshot = JSON.stringify(db)
    const plan = schedule(db, {
      game: 'mole',
      lessonIds: ['lesson-0'],
      difficulty: 'easy',
      count: 20,
    })
    expect(plan.available).toBe(6)
    expect(plan.shortfall).toBe(14)
    expect(new Set(plan.questions.map((q) => q.id)).size).toBe(6)
    plan.questions[0].prompt = '测试'
    expect(JSON.stringify(db)).toBe(snapshot)
  })
  it('停用题与不兼容题不被调度', () => {
    const db = createSeed()
    db.questions.forEach((q) => (q.enabled = false))
    expect(
      schedule(db, { game: 'mole', lessonIds: ['lesson-0'], difficulty: 'all', count: 5 })
        .questions,
    ).toHaveLength(0)
  })
  it('允许多个合理答案与多种句子排序', () => {
    const db = createSeed(),
      word = db.questions.find((q) => q.answers.includes('缓缓'))!
    expect(isAnswer(word, '缓缓')).toBe(true)
    expect(isAnswer(word, '慢慢')).toBe(true)
    expect(isAnswer(word, '圆圆')).toBe(false)
    const q = {
      ...db.questions.find((q) => q.type === 'sentence')!,
      orders: [
        [0, 1, 2],
        [1, 0, 2],
      ],
    }
    expect(questionSchema.parse(q)).toBeTruthy()
    expect(isAnswer(q, [1, 0, 2])).toBe(true)
    expect(isAnswer(q, [2, 1, 0])).toBe(false)
  })
  it('拒绝重复选项、不存在的答案和不兼容游戏', () => {
    const q = createSeed().questions[0]
    for (const invalid of [
      { ...q, options: ['天', '天'] },
      { ...q, answers: ['不存在'] },
      { ...q, games: ['train'] },
    ])
      expect(questionSchema.safeParse(invalid).success).toBe(false)
  })
  it('拒绝错误声调与非法句子索引', () => {
    const db = createSeed()
    expect(
      questionSchema.safeParse({ ...db.questions.find((q) => q.type === 'tone'), tone: 5 }).success,
    ).toBe(false)
    expect(
      questionSchema.safeParse({
        ...db.questions.find((q) => q.type === 'sentence'),
        orders: [[0, 0, 2]],
      }).success,
    ).toBe(false)
  })
  it('保留 ü 和带声调音节，不自动拼接', () => {
    const q = {
      ...createSeed().questions.find((q) => q.type === 'pinyin')!,
      options: ['lǜ', 'lù'],
      answers: ['lǜ'],
      syllable: 'lǜ',
      parts: ['l', 'ü', '第四声'],
    }
    expect(questionSchema.parse(q).syllable).toBe('lǜ')
    expect(isAnswer(q, 'lǜ')).toBe(true)
  })
})
describe('备份、导入与迁移', () => {
  it('完整JSON往返不丢数据', () => {
    const db = createSeed()
    expect(validateBackup(JSON.parse(JSON.stringify(db)))).toEqual(db)
  })
  it('拒绝重复ID、损坏层级、未知版本，保留原库', () => {
    const db = createSeed(),
      before = JSON.stringify(db)
    expect(() => validateBackup({ ...db, questions: [...db.questions, db.questions[0]] })).toThrow(
      '重复ID',
    )
    expect(() =>
      validateBackup({ ...db, questions: [{ ...db.questions[0], unitId: 'broken' }] }),
    ).toThrow('归属')
    expect(() => validateBackup({ ...db, schemaVersion: 99 })).toThrow()
    expect(JSON.stringify(db)).toBe(before)
  })
  it('支持v1升级到v2', () => {
    const db = createSeed()
    const result = validateBackup({
      ...db,
      schemaVersion: 1,
      settings: { volume: 0 },
      results: undefined,
    })
    expect(result.schemaVersion).toBe(2)
    expect(result.settings.holes).toBe(6)
  })
  it('按课导出后合并保持其他课题目', () => {
    const db = createSeed(),
      partial = exportScope(db, { lessonId: 'lesson-0' })
    expect(partial.questions).toHaveLength(10)
    partial.questions[0].prompt = '修改题目'
    const merged = importBackup(db, partial, 'merge')
    expect(merged.questions).toHaveLength(490)
    expect(merged.questions.find((q) => q.id === partial.questions[0].id)?.prompt).toBe('修改题目')
  })
  it('覆盖指定范围不删除其他课', () => {
    const db = createSeed(),
      partial = exportScope(db, { lessonId: 'lesson-0' })
    partial.questions = partial.questions.slice(0, 2)
    const merged = importBackup(db, partial, 'replace', { lessonId: 'lesson-0' })
    expect(merged.questions).toHaveLength(482)
    expect(merged.questions.filter((q) => q.lessonId === 'lesson-1')).toHaveLength(10)
  })
  it('UTF-8 CSV支持引号、映射，定位错误行', () => {
    const { rows, headers } = parseCsv(
      '\uFEFF题干,选项,答案\n"请找天，认真看",天|大,天\n坏题,天|天,人',
    )
    expect(headers).toContain('题干')
    const result = mapCsv(
      rows,
      { prompt: '题干', options: '选项', answers: '答案' },
      createSeed(),
      'lesson-0',
    )
    expect(result.questions).toHaveLength(1)
    expect(result.errors[0]).toContain('第3行')
    expect(result.questions[0].prompt).toBe('请找天，认真看')
  })
})
