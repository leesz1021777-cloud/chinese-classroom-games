import { useState } from 'react'
import { uid, type Database } from '../domain'

export default function Catalog({
  db,
  save,
  onClose,
}: {
  db: Database
  save: (db: Database) => Promise<void>
  onClose: () => void
}) {
  const [bookId, setBook] = useState(db.books[0].id),
    [unitId, setUnit] = useState(db.units.find((u) => u.bookId === db.books[0].id)!.id)
  const [name, setName] = useState(''),
    [topic, setTopic] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [version, setVersion] = useState('教师自定义版本'),
    [grade, setGrade] = useState(1),
    [term, setTerm] = useState<'上册' | '下册' | '自定义'>('自定义')
  const units = db.units.filter((u) => u.bookId === bookId).sort((a, b) => a.order - b.order),
    lessons = db.lessons.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order)
  async function commit(next: Database) {
    setBusy(true)
    setError('')
    try {
      await save(next)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }
  function move(id: string, delta: number) {
    const index = lessons.findIndex((l) => l.id === id),
      other = lessons[index + delta]
    if (!other) return
    const reordered = [...lessons]
    ;[reordered[index], reordered[index + delta]] = [reordered[index + delta], reordered[index]]
    void commit({
      ...db,
      lessons: db.lessons.map((l) =>
        reordered.some((item) => item.id === l.id)
          ? { ...l, order: reordered.findIndex((item) => item.id === l.id) }
          : l,
      ),
    })
  }
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-label="教材与专题目录">
        <div className="section-head">
          <h2>教材与专题目录</h2>
          <button aria-label="关闭目录" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="muted">
          内置上册示例来自项目提供的新版清单。其余目录请对照教材确认；下册未推测旧版课目。
        </p>
        <div className="form-grid">
          <label>
            教材
            <select
              value={bookId}
              onChange={(e) => {
                setBook(e.target.value)
                setUnit(db.units.find((u) => u.bookId === e.target.value)?.id ?? '')
              }}
            >
              {db.books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.version}
                </option>
              ))}
            </select>
          </label>
          <label>
            单元
            <select value={unitId} onChange={(e) => setUnit(e.target.value)}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button
            disabled={busy}
            onClick={() => {
              const title = prompt('新的教材名称', db.books.find((b) => b.id === bookId)?.name)
              if (title?.trim())
                void commit({
                  ...db,
                  books: db.books.map((b) => (b.id === bookId ? { ...b, name: title.trim() } : b)),
                })
            }}
          >
            重命名教材
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (db.books.length === 1) {
                setError('至少保留一册教材')
                return
              }
              if (!confirm('删除此教材、全部单元、课文和题目？请先备份。')) return
              const removedUnits = db.units.filter((u) => u.bookId === bookId).map((u) => u.id),
                books = db.books.filter((b) => b.id !== bookId),
                units = db.units.filter((u) => u.bookId !== bookId)
              void commit({
                ...db,
                books,
                units,
                lessons: db.lessons.filter((l) => !removedUnits.includes(l.unitId)),
                questions: db.questions.filter((q) => q.bookId !== bookId),
              })
              setBook(books[0].id)
              setUnit(units.find((u) => u.bookId === books[0].id)!.id)
            }}
          >
            删除教材
          </button>
          <button
            disabled={busy}
            onClick={() => {
              const title = prompt('新的单元名称', db.units.find((u) => u.id === unitId)?.name)
              if (title?.trim())
                void commit({
                  ...db,
                  units: db.units.map((u) => (u.id === unitId ? { ...u, name: title.trim() } : u)),
                })
            }}
          >
            重命名单元
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (units.length === 1) {
                setError('每册至少保留一个单元')
                return
              }
              if (!confirm('删除此单元及其中所有题目？')) return
              void commit({
                ...db,
                units: db.units.filter((u) => u.id !== unitId),
                lessons: db.lessons.filter((l) => l.unitId !== unitId),
                questions: db.questions.filter((q) => q.unitId !== unitId),
              })
              setUnit(units.find((u) => u.id !== unitId)!.id)
            }}
          >
            删除单元
          </button>
        </div>
        <div className="catalog-list">
          {lessons.map((l, i) => (
            <div key={l.id}>
              <strong>
                {l.topic ? '专题 · ' : ''}
                {l.name}
              </strong>
              <span className="tag">{l.confirmed ? '已确认' : '待教师确认'}</span>
              <button
                disabled={busy || i === 0}
                onClick={() => move(l.id, -1)}
                aria-label={`上移${l.name}`}
              >
                ↑
              </button>
              <button
                disabled={busy || i === lessons.length - 1}
                onClick={() => move(l.id, 1)}
                aria-label={`下移${l.name}`}
              >
                ↓
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  const title = prompt('修改课文名称', l.name)
                  if (title?.trim())
                    void commit({
                      ...db,
                      lessons: db.lessons.map((item) =>
                        item.id === l.id ? { ...item, name: title.trim() } : item,
                      ),
                    })
                }}
              >
                改名
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void commit({
                    ...db,
                    lessons: db.lessons.map((item) =>
                      item.id === l.id ? { ...item, confirmed: !item.confirmed } : item,
                    ),
                  })
                }
              >
                {l.confirmed ? '标记待确认' : '确认课目'}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (lessons.length === 1) {
                    setError('每个单元至少保留一课；可改名或删除整个单元。')
                    return
                  }
                  if (confirm(`删除《${l.name}》及其全部题目？`))
                    void commit({
                      ...db,
                      lessons: db.lessons.filter((item) => item.id !== l.id),
                      questions: db.questions.filter((q) => q.lessonId !== l.id),
                    })
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
        <h3>添加目录</h3>
        <label>
          名称
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="课文、专题、单元或教材名称"
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={topic} onChange={(e) => setTopic(e.target.checked)} />
          新课目作为专题题库
        </label>
        <div className="actions">
          <button
            disabled={!name.trim() || !unitId || busy}
            onClick={() =>
              void commit({
                ...db,
                lessons: [
                  ...db.lessons,
                  {
                    id: uid(),
                    unitId,
                    name: name.trim(),
                    order: lessons.length,
                    confirmed: false,
                    topic,
                  },
                ],
              })
            }
          >
            添加课文 / 专题
          </button>
          <button
            disabled={!name.trim() || busy}
            onClick={() => {
              const id = uid()
              void commit({
                ...db,
                units: [...db.units, { id, bookId, name: name.trim(), order: units.length }],
                lessons: [
                  ...db.lessons,
                  {
                    id: uid(),
                    unitId: id,
                    name: '新课目（待确认）',
                    order: 0,
                    confirmed: false,
                    topic: false,
                  },
                ],
              })
              setUnit(id)
            }}
          >
            添加单元
          </button>
        </div>
        <div className="form-grid">
          <label>
            新教材版本
            <input value={version} onChange={(e) => setVersion(e.target.value)} />
          </label>
          <label>
            年级
            <input
              type="number"
              min="1"
              max="6"
              value={grade}
              onChange={(e) => setGrade(Math.min(6, Math.max(1, Number(e.target.value))))}
            />
          </label>
          <label>
            册次
            <select value={term} onChange={(e) => setTerm(e.target.value as typeof term)}>
              <option>上册</option>
              <option>下册</option>
              <option>自定义</option>
            </select>
          </label>
        </div>
        <button
          disabled={!name.trim() || !version.trim() || busy}
          onClick={() => {
            const b = uid(),
              u = uid()
            void commit({
              ...db,
              books: [
                ...db.books,
                { id: b, versionId: uid(), name: name.trim(), grade, term, version },
              ],
              units: [...db.units, { id: u, bookId: b, name: '自定义单元', order: 0 }],
              lessons: [
                ...db.lessons,
                {
                  id: uid(),
                  unitId: u,
                  name: '新课目（待确认）',
                  order: 0,
                  confirmed: false,
                  topic: false,
                },
              ],
            })
            setBook(b)
            setUnit(u)
          }}
        >
          添加教材版本
        </button>
        {error && (
          <div role="alert" className="warning">
            {error}
          </div>
        )}
        <div className="actions">
          <button onClick={onClose}>完成</button>
        </div>
      </section>
    </div>
  )
}
