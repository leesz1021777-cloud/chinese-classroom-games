import { describe, it, expect } from 'vitest'
import { legalPinyin } from '../src/pinyin'
import { questionSchema } from '../src/domain'
import { createSeed } from '../src/seed'
describe('拼音显式音节与声调位置校验', () => {
  it('认可两拼、三拼、ü省写与常见标调', () => {
    for (const text of [
      'bā',
      'biǎo',
      'tiān',
      'jué',
      'yuè',
      'nǚ',
      'lǜ',
      'lüè',
      'liù',
      'tuǐ',
      'tuì',
      'ǜ',
    ])
      expect(legalPinyin(text), text).toBe(true)
  })
  it('拒绝错误拼接、ü省写和标调位置', () => {
    for (const text of ['jǚ', 'yüè', 'tùi', 'lìu', 'bīao', 'báá', 'foobar', 'v'])
      expect(legalPinyin(text), text).toBe(false)
  })
  it('题库拒绝非法拼音选项，教师仍须校核题意', () => {
    const q = createSeed().questions.find((q) => q.type === 'pinyin')!
    expect(
      questionSchema.safeParse({ ...q, options: ['jǚ', 'jū'], answers: ['jū'], syllable: 'jū' })
        .success,
    ).toBe(false)
  })
})
