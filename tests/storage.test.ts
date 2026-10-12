import 'fake-indexeddb/auto'
import { it, expect } from 'vitest'
import { createStore } from '../src/storage'
import { uid } from '../src/domain'
it('IndexedDB写入后重新打开仍然保留题目', async () => {
  const store = await createStore()
  expect(store.mode).toBe('IndexedDB')
  const db = await store.load(),
    q = { ...db.questions[0], id: uid(), prompt: '持久化测试' }
  db.questions.push(q)
  await store.save(db)
  const reopened = await createStore()
  expect((await reopened.load()).questions.some((item) => item.id === q.id)).toBe(true)
})
it('校验失败时不破坏已保存数据', async () => {
  const store = await createStore(),
    db = await store.load(),
    before = JSON.stringify(db)
  await expect(
    store.save({ ...db, questions: [{ ...db.questions[0], answers: ['非法'] }] }),
  ).rejects.toThrow()
  expect(JSON.stringify(await store.load())).toBe(before)
})
