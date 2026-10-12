import { validateBackup } from './services'
import { createSeed } from './seed'
import type { Database } from './domain'
import { upgradeContent } from './content'

const key = 'little-universe-v2'
export type StorageMode = 'IndexedDB' | 'localStorage' | '内存'
export type Store = {
  mode: StorageMode
  warning: string
  contentAdded?: number
  load: () => Promise<Database>
  save: (db: Database) => Promise<void>
}
function transaction(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  value?: Database,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', mode),
      store = tx.objectStore('state')
    const req = mode === 'readonly' ? store.get(key) : store.put(value, key)
    let result: unknown
    req.onsuccess = () => {
      result = req.result
    }
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error ?? new Error('数据库事务失败'))
    tx.onabort = () => reject(tx.error ?? new Error('数据库写入被中止'))
  })
}
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('little-universe', 1)
    const timer = setTimeout(() => reject(new Error('数据库打开超时')), 4000)
    req.onupgradeneeded = () => req.result.createObjectStore('state')
    req.onerror = () => {
      clearTimeout(timer)
      reject(req.error)
    }
    req.onblocked = () => {
      clearTimeout(timer)
      reject(new Error('数据库被其他窗口占用'))
    }
    req.onsuccess = () => {
      clearTimeout(timer)
      resolve(req.result)
    }
  })
}
export async function createStore(): Promise<Store> {
  let previous: Database | undefined
  try {
    const db = await open()
    const stored = await transaction(db, 'readonly')
    if (stored !== undefined) previous = validateBackup(stored)
    const update = previous ? upgradeContent(previous) : { db: createSeed(), added: 0 }
    const initial = update.db
    await transaction(db, 'readwrite', initial)
    return {
      mode: 'IndexedDB',
      warning: '',
      contentAdded: update.added,
      load: async () => validateBackup(await transaction(db, 'readonly')),
      save: async (state) => {
        await transaction(db, 'readwrite', validateBackup(state))
      },
    }
  } catch (error) {
    // 不能在损坏数据上静默写入种子；保留原数据库，并给出恢复警告。
    const warning = `IndexedDB 不可用或数据校验失败（${error instanceof Error ? error.message : '未知错误'}）。已启用备用存储；请导出备份。`
    try {
      const existing = localStorage.getItem(key)
      const base = previous ?? (existing ? validateBackup(JSON.parse(existing)) : createSeed())
      const update = upgradeContent(base)
      const initial = update.db
      localStorage.setItem(key, JSON.stringify(initial))
      return {
        mode: 'localStorage',
        warning,
        contentAdded: update.added,
        load: async () => validateBackup(JSON.parse(localStorage.getItem(key)!)),
        save: async (db) => localStorage.setItem(key, JSON.stringify(validateBackup(db))),
      }
    } catch {
      let memory = upgradeContent(previous ?? createSeed()).db
      return {
        mode: '内存',
        warning: `${warning} 本次仅保存在内存中，关闭页面会丢失修改。`,
        load: async () => structuredClone(memory),
        save: async (db) => {
          memory = validateBackup(structuredClone(db))
        },
      }
    }
  }
}
