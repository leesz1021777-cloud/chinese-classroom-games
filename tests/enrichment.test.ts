import { describe, it, expect } from 'vitest'
import { createLegacySeed, createSeed } from '../src/seed'
import { upgradeContent } from '../src/content'
import { prepareChoices, isAnswer, shuffle, validateBackup } from '../src/services'
import { textNames, jsonNames, rosterCsv, validateNames, nextStudent } from '../src/roster'
import { adventureStage, earnedStars } from '../src/adventure'

describe('扩充题库与保留教师数据的更新', () => {
  it('17个有题目的学习单元与490题均校验通过', () => {
    const db = createSeed()
    expect(validateBackup(db).questions).toHaveLength(490)
    const playable = db.units.filter((u) => db.questions.some((q) => q.unitId === u.id))
    expect(playable).toHaveLength(17)
    expect(playable.filter((u) => u.bookId === 'upper')).toHaveLength(9)
    expect(playable.filter((u) => u.bookId === 'lower')).toHaveLength(8)
    expect(new Set(db.questions.map((q) => q.id)).size).toBe(490)
    expect(db.questions.filter((q) => q.difficulty === 'challenge').length).toBeGreaterThan(20)
    expect(db.lessons.filter((l) => l.unitId.startsWith('extra-')).every((l) => !l.confirmed)).toBe(
      true,
    )
  })
  it('旧版升级只添加新内容，保留修改、停用、名单、设置和删题', () => {
    const old = createLegacySeed()
    old.questions[0].prompt = '教师自己改的题目'
    old.questions[0].enabled = false
    old.questions.splice(1, 1)
    old.settings.volume = 0.4
    old.rosters = [{ id: 'class', name: '测试班', students: [{ id: 'student', name: '虚构姓名' }] }]
    const original = JSON.stringify(old),
      update = upgradeContent(old)
    expect(update.added).toBe(416)
    expect(update.db.questions.find((q) => q.id === old.questions[0].id)?.prompt).toBe(
      '教师自己改的题目',
    )
    expect(update.db.questions[0].enabled).toBe(false)
    expect(update.db.questions.some((q) => q.id === 'demo-0-1')).toBe(false)
    expect(update.db.rosters).toEqual(old.rosters)
    expect(update.db.settings.volume).toBe(0.4)
    expect(JSON.stringify(old)).toBe(original)
    const again = upgradeContent(update.db)
    expect(again.added).toBe(0)
    expect(again.db).toEqual(update.db)
    update.db.questions = update.db.questions.filter(
      (q) => !q.id.startsWith('pack2-extra-upper-forest'),
    )
    expect(upgradeContent(update.db).db.questions).toEqual(update.db.questions)
  })
  it('教师已删除的册次不会被升级重新创建', () => {
    const db = createLegacySeed()
    db.books = db.books.filter((b) => b.id !== 'lower')
    db.units = db.units.filter((u) => u.bookId !== 'lower')
    db.lessons = db.lessons.filter((l) => l.unitId !== 'lower-pending')
    const update = upgradeContent(db)
    expect(update.db.books).toHaveLength(1)
    expect(update.db.questions.some((q) => q.bookId === 'lower')).toBe(false)
  })
  it('多种通顺表达和时间词语序都能答对', () => {
    const db = createSeed(),
      q = db.questions.find((q) => q.prompt === '一（　）大象。')!
    expect(isAnswer(q, '头')).toBe(true)
    expect(isAnswer(q, '只')).toBe(true)
    expect(isAnswer(q, '条')).toBe(false)
    const sentence = db.questions.find((q) => q.type === 'sentence' && q.orders!.length === 2)!
    for (const order of sentence.orders!) expect(isAnswer(sentence, order)).toBe(true)
  })
})
describe('统一选项随机化', () => {
  function random(seed: number) {
    let state = seed
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 4294967296
    }
  }
  it('正确答案不固定在第一位，所有题型保持选项唯一与原数据不变', () => {
    const db = createSeed()
    for (const type of ['choice', 'pinyin', 'word', 'tone'] as const) {
      const q = db.questions.find((q) => q.type === type)!
      const before = JSON.stringify(q),
        positions = new Set<number>()
      for (let n = 1; n <= 100; n++) {
        const choices = prepareChoices(q, q.options.length, random(n * 811))
        expect(new Set(choices).size).toBe(choices.length)
        expect([...choices].sort()).toEqual([...q.options].sort())
        positions.add(choices.findIndex((option) => q.answers.includes(option)))
      }
      expect(positions.size).toBeGreaterThan(1)
      expect(JSON.stringify(q)).toBe(before)
    }
  })
  it('减少地鼠洞数量时仍包含合理答案，答案所在洞随机', () => {
    const q = createSeed().questions[0],
      positions = new Set<number>()
    for (let n = 1; n <= 80; n++) {
      const choices = prepareChoices(q, 3, random(n * 991))
      expect(choices).toHaveLength(3)
      expect(choices.some((option) => q.answers.includes(option))).toBe(true)
      positions.add(choices.indexOf(q.answers[0]))
    }
    expect(positions.size).toBe(3)
  })
})
describe('本地点名名单和不重复抽取', () => {
  it('TXT/JSON/CSV导入支持中文，拒绝缺失姓名和超量数据', () => {
    expect(textNames('\uFEFF甲同学\n\n乙同学')).toEqual(['甲同学', '乙同学'])
    expect(jsonNames('{"students":[{"name":"甲同学"},"乙同学"]}')).toEqual(['甲同学', '乙同学'])
    const csv = rosterCsv('学号,姓名\n1,甲同学\n2,乙同学')
    expect(validateNames(csv.rows.map((row) => row['姓名']))).toEqual(['甲同学', '乙同学'])
    expect(() => jsonNames('["甲同学",{}]')).toThrow('第2项')
    expect(() => validateNames(Array(501).fill('虚构姓名'))).toThrow('最多500')
  })
  it('同名条目按ID各点一次，本轮结束不会偷偷重复', () => {
    const students = [
      { id: 'a', name: '同名' },
      { id: 'b', name: '同名' },
      { id: 'c', name: '其他' },
    ]
    let bag = shuffle(
      students.map((s) => s.id),
      () => 0.5,
    )
    const picked: string[] = []
    while (bag.length) {
      const result = nextStudent(students, bag, false)
      picked.push(result.chosen.id)
      bag = result.remaining
    }
    expect(new Set(picked).size).toBe(3)
    expect(() => nextStudent(students, bag, false)).toThrow('本轮已经全部')
    expect(nextStudent(students, [], true).chosen).toBeTruthy()
  })
  it('完整备份往返保留名单，重复学生ID不能破坏题库', () => {
    const db = createSeed()
    db.rosters = [
      {
        id: 'class',
        name: '测试班',
        students: [
          { id: 'a', name: '甲' },
          { id: 'b', name: '甲' },
        ],
      },
    ]
    expect(validateBackup(JSON.parse(JSON.stringify(db))).rosters).toEqual(db.rosters)
    db.rosters[0].students[1].id = 'a'
    expect(() => validateBackup(db)).toThrow('学生ID')
  })
})
it('闯关星星只计算正确题，跳过题不搭桥或获取正确星星', () => {
  const outcomes = [
    { questionId: 'a', prompt: '测试', status: 'correct' as const, attempts: 1 },
    { questionId: 'b', prompt: '测试', status: 'skipped' as const, attempts: 0 },
  ]
  expect(earnedStars(outcomes)).toBe(1)
  expect(earnedStars(outcomes, true)).toBe(2)
  expect(adventureStage(0, 5)).toBe(0)
  expect(adventureStage(5, 5)).toBe(4)
})
