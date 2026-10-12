import { useState } from 'react'
import {
  csvFields,
  download,
  exportScope,
  importBackup,
  inScope,
  mapCsv,
  parseCsv,
  validateBackup,
  type CsvField,
  type Scope,
} from '../services'
import { uid, type Database, type Question } from '../domain'
import Editor from './Editor'
import Catalog from './Catalog'

export default function Bank({
  db,
  save,
  onPreview,
}: {
  db: Database
  save: (db: Database) => Promise<void>
  onPreview: (q: Question) => void
}) {
  const [bookId, setBook] = useState(''),
    [unitId, setUnit] = useState(''),
    [lessonId, setLesson] = useState(''),
    [search, setSearch] = useState(''),
    [type, setType] = useState(''),
    [enabled, setEnabled] = useState('all')
  const [selection, setSelection] = useState<string[]>([]),
    [moveTarget, setMoveTarget] = useState(db.lessons[0].id),
    [editor, setEditor] = useState<Question | null | undefined>(undefined),
    [catalog, setCatalog] = useState(false)
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const [incoming, setIncoming] = useState<Database | null>(null),
    [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [allScope, setAllScope] = useState(true)
  const [csv, setCsv] = useState<ReturnType<typeof parseCsv> | null>(null),
    [mapping, setMapping] = useState<Partial<Record<CsvField, string>>>({})
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof mapCsv> | null>(null)
  const scope: Scope = {
    ...(bookId ? { bookId } : {}),
    ...(unitId ? { unitId } : {}),
    ...(lessonId ? { lessonId } : {}),
  }
  const filtered = db.questions.filter(
    (q) =>
      inScope(q, scope) &&
      (!type || q.type === type) &&
      (enabled === 'all' || q.enabled === (enabled === 'yes')) &&
      `${q.prompt} ${q.knowledge} ${q.notes}`.includes(search),
  )
  async function commit(next: Database, message: string) {
    setBusy(true)
    setError('')
    try {
      await save(next)
      setNotice(message)
      setSelection([])
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
      throw e
    } finally {
      setBusy(false)
    }
  }
  const run = (action: () => Promise<void>) => {
    void action().catch(() => {})
  }
  function moveQuestion(q: Question): Question {
    const lesson = db.lessons.find((l) => l.id === moveTarget)!,
      unit = db.units.find((u) => u.id === lesson.unitId)!,
      book = db.books.find((b) => b.id === unit.bookId)!
    return {
      ...q,
      lessonId: lesson.id,
      unitId: unit.id,
      bookId: book.id,
      versionId: book.versionId,
      updatedAt: new Date().toISOString(),
    }
  }
  const importScope = allScope ? {} : scope
  let summary = { added: 0, updated: 0, removed: 0 }
  if (incoming) {
    const selected = incoming.questions.filter((q) => inScope(q, importScope))
    summary = {
      added: selected.filter((q) => !db.questions.some((old) => old.id === q.id)).length,
      updated: selected.filter((q) => db.questions.some((old) => old.id === q.id)).length,
      removed:
        mode === 'replace'
          ? db.questions.filter(
              (q) => inScope(q, importScope) && !selected.some((n) => n.id === q.id),
            ).length
          : 0,
    }
  }
  return (
    <section className="panel bank">
      <div className="section-head">
        <div>
          <span className="eyebrow">每一道题，都可以慢慢打磨</span>
          <h1>教师题库管理</h1>
          <p className="muted">{db.questions.length} 道题 · 自动本地保存 · 建议定期导出备份</p>
        </div>
        <button className="primary" onClick={() => setEditor(null)}>
          ＋ 添加题目
        </button>
      </div>
      <div className="toolbar">
        <button onClick={() => setCatalog(true)}>📚 教材与专题目录</button>
        <button
          onClick={() => {
            try {
              download('紫藤花完整备份.json', JSON.stringify(db, null, 2))
              setNotice('备份已生成，请妥善保存。')
            } catch {
              setError('导出失败')
            }
          }}
        >
          导出全部备份
        </button>
        <button
          disabled={!Object.keys(scope).length}
          onClick={() => {
            try {
              download('紫藤花范围题库.json', JSON.stringify(exportScope(db, scope), null, 2))
            } catch (e) {
              setError(String(e))
            }
          }}
        >
          导出当前册 / 单元 / 课
        </button>
        <label className="file-button">
          导入 JSON / CSV
          <input
            aria-label="导入题库文件"
            type="file"
            accept=".json,.csv"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setError('')
              setNotice('')
              try {
                if (file.size > 30_000_000) throw new Error('文件须小于30MB')
                const text = await file.text()
                if (file.name.toLowerCase().endsWith('.csv')) {
                  const data = parseCsv(text)
                  setCsv(data)
                  setMapping(
                    Object.fromEntries(
                      csvFields.map((f) => [f, data.headers.includes(f) ? f : '']),
                    ),
                  )
                  setCsvPreview(null)
                } else {
                  setIncoming(validateBackup(JSON.parse(text)))
                }
              } catch (error) {
                setError(error instanceof Error ? error.message : '文件格式错误')
              }
              e.target.value = ''
            }}
          />
        </label>
        <button
          onClick={() =>
            download(
              '题库导入示例.csv',
              '\uFEFFprompt,type,options,answers,difficulty,knowledge,explanation\r\n请找到天,choice,天|大|人,天,easy,生字认读,天的上面有一横\r\n',
              'text/csv',
            )
          }
        >
          CSV 示例
        </button>
      </div>
      <div className="filter-grid">
        <label>
          教材
          <select
            value={bookId}
            onChange={(e) => {
              setBook(e.target.value)
              setUnit('')
              setLesson('')
              setSelection([])
            }}
          >
            <option value="">全部教材</option>
            {db.books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          单元
          <select
            value={unitId}
            onChange={(e) => {
              setUnit(e.target.value)
              setLesson('')
              setSelection([])
            }}
          >
            <option value="">全部单元</option>
            {db.units
              .filter((u) => !bookId || u.bookId === bookId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          课文
          <select
            value={lessonId}
            onChange={(e) => {
              setLesson(e.target.value)
              setSelection([])
            }}
          >
            <option value="">全部课文</option>
            {db.lessons
              .filter(
                (l) =>
                  (!unitId || l.unitId === unitId) &&
                  (!bookId || db.units.some((u) => u.id === l.unitId && u.bookId === bookId)),
              )
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          题型
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">全部题型</option>
            <option value="choice">汉字选择</option>
            <option value="pinyin">拼音选择</option>
            <option value="tone">声调</option>
            <option value="word">词语</option>
            <option value="sentence">句子</option>
            <option value="reading">朗读</option>
          </select>
        </label>
        <label>
          状态
          <select value={enabled} onChange={(e) => setEnabled(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="yes">已启用</option>
            <option value="no">已停用</option>
          </select>
        </label>
        <label>
          搜索题目
          <input
            placeholder="题目、知识点、备注"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <div role="alert" className="warning pre">
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="readiness">
          {notice}
        </p>
      )}
      <div className="bulk">
        <label className="check">
          <input
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((q) => selection.includes(q.id))}
            onChange={(e) => setSelection(e.target.checked ? filtered.map((q) => q.id) : [])}
          />
          选择当前筛选全部（{filtered.length}）
        </label>
        <span>已选 {selection.length}</span>
        <select
          aria-label="批量目标题库"
          value={moveTarget}
          onChange={(e) => setMoveTarget(e.target.value)}
        >
          {db.lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.topic ? '专题 · ' : ''}
              {l.name}
            </option>
          ))}
        </select>
        <button
          disabled={!selection.length || busy}
          onClick={() =>
            run(() =>
              commit(
                {
                  ...db,
                  questions: db.questions.map((q) =>
                    selection.includes(q.id) ? moveQuestion(q) : q,
                  ),
                },
                '已批量移动',
              ),
            )
          }
        >
          移动到
        </button>
        <button
          disabled={!selection.length || busy}
          onClick={() =>
            run(() =>
              commit(
                {
                  ...db,
                  questions: [
                    ...db.questions,
                    ...db.questions
                      .filter((q) => selection.includes(q.id))
                      .map((q) => ({
                        ...moveQuestion(q),
                        id: uid(),
                        createdAt: new Date().toISOString(),
                      })),
                  ],
                },
                '已复制到目标题库',
              ),
            )
          }
        >
          复制到
        </button>
        <button
          disabled={!selection.length || busy}
          onClick={() => {
            if (confirm(`删除选中的 ${selection.length} 道题？请确保已有备份。`))
              run(() =>
                commit(
                  { ...db, questions: db.questions.filter((q) => !selection.includes(q.id)) },
                  '已删除所选题目',
                ),
              )
          }}
        >
          批量删除
        </button>
      </div>
      <div className="question-list">
        {filtered.length ? (
          filtered.map((q) => (
            <article className="question-row" key={q.id}>
              <input
                aria-label={`选择${q.prompt}`}
                type="checkbox"
                checked={selection.includes(q.id)}
                onChange={(e) =>
                  setSelection((items) =>
                    e.target.checked ? [...items, q.id] : items.filter((id) => id !== q.id),
                  )
                }
              />
              <div className="question-content">
                <span className="tag">{db.lessons.find((l) => l.id === q.lessonId)?.name}</span>
                <span className="tag">
                  {q.difficulty === 'easy' ? '简单' : q.difficulty === 'normal' ? '普通' : '挑战'}
                </span>
                {!q.enabled && <span className="tag">已停用</span>}
                <h3>{q.prompt}</h3>
                <small>
                  {q.knowledge} ·{' '}
                  {q.options.join(' / ') || q.tokens?.join(' / ') || q.readingText?.slice(0, 40)}
                </small>
              </div>
              <div className="row-actions">
                <button onClick={() => setEditor(q)}>编辑</button>
                <button
                  onClick={() =>
                    run(() =>
                      commit(
                        {
                          ...db,
                          questions: [
                            ...db.questions,
                            {
                              ...q,
                              id: uid(),
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            },
                          ],
                        },
                        '题目已复制',
                      ),
                    )
                  }
                >
                  复制
                </button>
                <button onClick={() => onPreview(q)}>预览</button>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      commit(
                        {
                          ...db,
                          questions: db.questions.map((item) =>
                            item.id === q.id
                              ? {
                                  ...item,
                                  enabled: !item.enabled,
                                  updatedAt: new Date().toISOString(),
                                }
                              : item,
                          ),
                        },
                        q.enabled ? '题目已停用' : '题目已启用',
                      ),
                    )
                  }
                >
                  {q.enabled ? '停用' : '启用'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm('删除这道题？'))
                      run(() =>
                        commit(
                          { ...db, questions: db.questions.filter((item) => item.id !== q.id) },
                          '题目已删除',
                        ),
                      )
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">还没有匹配的题目，添加一道试试吧。</div>
        )}
      </div>
      {editor !== undefined && (
        <Editor
          db={db}
          question={editor ?? undefined}
          lessonId={lessonId || db.lessons[0].id}
          onClose={() => setEditor(undefined)}
          onPreview={onPreview}
          onSave={(q) =>
            commit(
              {
                ...db,
                questions: db.questions.some((item) => item.id === q.id)
                  ? db.questions.map((item) => (item.id === q.id ? q : item))
                  : [...db.questions, q],
              },
              '题目已保存，可立即用于课堂',
            )
          }
        />
      )}
      {catalog && <Catalog db={db} save={save} onClose={() => setCatalog(false)} />}
      {incoming && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="导入备份">
            <h2>确认导入备份</h2>
            <p>
              校验通过：{incoming.books.length} 册教材 · {incoming.lessons.length} 课 ·{' '}
              {incoming.questions.length} 道题。
            </p>
            <label>
              导入方式
              <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="merge">合并（相同ID更新，其他题目保留）</option>
                <option value="replace">覆盖（完整恢复或覆盖指定范围）</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={allScope}
                onChange={(e) => setAllScope(e.target.checked)}
              />
              全部范围{!allScope && <span>：使用题库页面当前册次 / 单元 / 课文筛选</span>}
            </label>
            <div className="readiness">
              新增 {summary.added} · 更新 {summary.updated} · 移除 {summary.removed} 道题
              {mode === 'replace' && allScope && '；同时恢复教材目录、设置和课堂记录。'}
            </div>
            {!allScope && !Object.keys(scope).length && (
              <p className="warning">请先取消导入，在题库页选择要覆盖的范围。</p>
            )}
            <div className="actions">
              <button
                className="primary"
                disabled={busy || (!allScope && !Object.keys(scope).length)}
                onClick={() => {
                  if (mode === 'replace' && !confirm('确认覆盖？被覆盖范围中的原有数据将被替换。'))
                    return
                  run(async () => {
                    await commit(importBackup(db, incoming, mode, importScope), '备份导入成功')
                    setIncoming(null)
                  })
                }}
              >
                确认导入
              </button>
              <button onClick={() => setIncoming(null)}>取消</button>
            </div>
          </section>
        </div>
      )}
      {csv && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="CSV字段映射">
            <h2>CSV 字段映射与预览</h2>
            <p>
              UTF-8，选项 / 答案用 | 分隔；sentence 的 orders 使用JSON索引数组。共 {csv.rows.length}{' '}
              行。
            </p>
            <label>
              导入至
              <select
                value={moveTarget}
                onChange={(e) => {
                  setMoveTarget(e.target.value)
                  setCsvPreview(null)
                }}
              >
                {db.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              {csvFields.map((field) => (
                <label key={field}>
                  {field}
                  <select
                    value={mapping[field] ?? ''}
                    onChange={(e) => {
                      setMapping((m) => ({ ...m, [field]: e.target.value }))
                      setCsvPreview(null)
                    }}
                  >
                    <option value="">不映射 / 默认</option>
                    {csv.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button onClick={() => setCsvPreview(mapCsv(csv.rows, mapping, db, moveTarget))}>
              校验并预览
            </button>
            {csvPreview && (
              <>
                <p>
                  可导入 {csvPreview.questions.length} 题 · 错误 {csvPreview.errors.length} 行
                </p>
                {csvPreview.errors.length > 0 && (
                  <div role="alert" className="warning pre">
                    {csvPreview.errors.join('\n')}
                  </div>
                )}
                {csvPreview.questions.slice(0, 8).map((q) => (
                  <p key={q.id}>
                    {q.prompt} → {q.answers.join('、')}
                  </p>
                ))}
              </>
            )}
            <div className="actions">
              <button
                className="primary"
                disabled={!csvPreview?.questions.length || !!csvPreview.errors.length || busy}
                onClick={() =>
                  run(async () => {
                    await commit(
                      { ...db, questions: [...db.questions, ...csvPreview!.questions] },
                      'CSV导入成功',
                    )
                    setCsv(null)
                  })
                }
              >
                确认导入
              </button>
              <button onClick={() => setCsv(null)}>取消</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
