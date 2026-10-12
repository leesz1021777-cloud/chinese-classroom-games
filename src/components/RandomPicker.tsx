import { useEffect, useState } from 'react'
import { uid, type Database } from '../domain'
import { download, shuffle } from '../services'
import { jsonNames, nextStudent, rosterCsv, textNames, validateNames } from '../roster'

type Roster = NonNullable<Database['rosters']>[number]
type Student = Roster['students'][number]
type Edit = {
  id?: string
  name: string
  text: string
  csv?: ReturnType<typeof rosterCsv>
  column?: string
}
type Roll = {
  target: Student
  students: Student[]
  history: Student[]
  bag: { key: string; ids: string[] }
}
export default function RandomPicker({
  db,
  save,
}: {
  db: Database
  save: (db: Database) => Promise<void>
}) {
  const rosters = db.rosters ?? []
  const [selected, setSelected] = useState(rosters[0]?.id ?? ''),
    [repeat, setRepeat] = useState(false),
    [history, setHistory] = useState<Student[]>([])
  const [bag, setBag] = useState<{ key: string; ids: string[] }>({ key: '', ids: [] }),
    [display, setDisplay] = useState(''),
    [rolling, setRolling] = useState<Roll | null>(null)
  const [edit, setEdit] = useState<Edit | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const roster = rosters.find((r) => r.id === selected) ?? rosters[0]
  const key = roster ? `${roster.id}:${roster.students.map((s) => s.id).join('|')}` : ''
  const currentHistory = bag.key === key ? history : []
  const remaining = bag.key === key ? bag.ids.length : (roster?.students.length ?? 0)
  function clearRound() {
    setBag({ key: '', ids: [] })
    setHistory([])
    setDisplay('')
    setError('')
  }
  function finish(roll: Roll) {
    setDisplay(roll.target.name)
    setHistory(roll.history)
    setBag(roll.bag)
    setRolling(null)
  }
  useEffect(() => {
    if (!rolling) return
    const interval = setInterval(
      () => setDisplay(rolling.students[Math.floor(Math.random() * rolling.students.length)].name),
      110,
    )
    const timer = setTimeout(() => {
      setDisplay(rolling.target.name)
      setHistory(rolling.history)
      setBag(rolling.bag)
      setRolling(null)
    }, 1350)
    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [rolling])
  function pick() {
    if (!roster || rolling) return
    try {
      const ids = bag.key === key ? bag.ids : shuffle(roster.students.map((s) => s.id))
      const result = nextStudent(roster.students, ids, repeat)
      const old = bag.key === key ? history : []
      setRolling({
        target: result.chosen,
        students: roster.students,
        history: [...old, result.chosen],
        bag: { key, ids: result.remaining },
      })
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '点名失败')
    }
  }
  async function saveEdit() {
    if (!edit) return
    try {
      const names = edit.csv
        ? validateNames(edit.csv.rows.map((row) => row[edit.column ?? '']))
        : textNames(edit.text)
      if (!edit.name.trim()) throw new Error('请填写班级名称')
      if (edit.id && !confirm('替换当前班级名单？本轮点名进度会重置。')) return
      const next: Roster = {
        id: edit.id ?? uid(),
        name: edit.name.trim(),
        students: names.map((name) => ({ id: uid(), name })),
      }
      setBusy(true)
      await save({ ...db, rosters: [...rosters.filter((r) => r.id !== next.id), next] })
      setSelected(next.id)
      clearRound()
      setEdit(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '名单保存失败')
    } finally {
      setBusy(false)
    }
  }
  const preview = edit
    ? edit.csv
      ? edit.csv.rows.map((row) => row[edit.column ?? ''] ?? '')
      : edit.text.split(/\r?\n/).filter((s) => s.trim())
    : []
  return (
    <section className="panel picker">
      <div className="section-head">
        <div>
          <span className="eyebrow">每个孩子，都有一次闪亮登场</span>
          <h1>紫藤花随机点名器</h1>
          <p className="muted">导入名单，轻轻一点。默认一轮不重复，不记录个人成绩。</p>
        </div>
        <span className="picker-mark">🌸</span>
      </div>
      <div className="toolbar">
        <label className="file-button">
          导入名单（TXT / CSV / JSON）
          <input
            aria-label="导入学生名单"
            type="file"
            accept=".txt,.csv,.json"
            disabled={!!rolling}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setError('')
              try {
                if (file.size > 2_000_000) throw new Error('名单文件须小于2MB')
                const text = await file.text()
                if (file.name.toLowerCase().endsWith('.csv')) {
                  const csv = rosterCsv(text),
                    column =
                      csv.headers.find((h) => /^(姓名|名字|name|student)$/i.test(h)) ??
                      csv.headers[0]
                  setEdit({ name: file.name.replace(/\.[^.]+$/, ''), text: '', csv, column })
                } else {
                  const names = file.name.toLowerCase().endsWith('.json')
                    ? jsonNames(text)
                    : textNames(text)
                  setEdit({ name: file.name.replace(/\.[^.]+$/, ''), text: names.join('\n') })
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : '无法读取名单')
              }
              e.target.value = ''
            }}
          />
        </label>
        <button
          disabled={!!rolling}
          onClick={() => {
            setError('')
            setEdit({ name: '一年级班级', text: '' })
          }}
        >
          手动输入名单
        </button>
        <button
          disabled={!roster || !!rolling}
          onClick={() => {
            setError('')
            setEdit({
              id: roster.id,
              name: roster.name,
              text: roster.students.map((s) => s.name).join('\n'),
            })
          }}
        >
          编辑当前名单
        </button>
        <button
          disabled={!roster || !!rolling}
          onClick={() =>
            download(
              `${roster.name}-名单.json`,
              JSON.stringify({ students: roster.students.map((s) => s.name) }, null, 2),
            )
          }
        >
          导出当前名单
        </button>
      </div>
      <div className="picker-settings">
        <label>
          班级名单
          <select
            aria-label="班级名单"
            disabled={!!rolling || !rosters.length}
            value={roster?.id ?? ''}
            onChange={(e) => {
              setSelected(e.target.value)
              clearRound()
            }}
          >
            {!rosters.length && <option value="">请先导入或输入名单</option>}
            {rosters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.students.length}人
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={!repeat}
            disabled={!!rolling}
            onChange={(e) => {
              setRepeat(!e.target.checked)
              clearRound()
            }}
          />
          本轮不重复
        </label>
        <button
          disabled={!!rolling || !roster}
          onClick={() => {
            if (currentHistory.length && !confirm('开始新一轮？本轮点名记录将清空。')) return
            clearRound()
          }}
        >
          开始新一轮
        </button>
        <button
          disabled={!!rolling || !roster}
          onClick={async () => {
            if (!roster || !confirm(`删除“${roster.name}”的本地名单？`)) return
            try {
              await save({ ...db, rosters: rosters.filter((r) => r.id !== roster.id) })
              clearRound()
            } catch (e) {
              setError(String(e))
            }
          }}
        >
          删除当前名单
        </button>
      </div>
      <div className={`picker-stage ${rolling ? 'rolling' : ''}`}>
        <span className="picker-petal p1">✿</span>
        <span className="picker-petal p2">✿</span>
        <span className="picker-petal p3">✿</span>
        <span className="eyebrow">{roster?.name ?? '等待小伙伴加入'}</span>
        <div className="picked-name" aria-hidden={!!rolling}>
          {display || '谁会是下一位？'}
        </div>
        <p>
          {roster
            ? `${roster.students.length}位小伙伴 · ${repeat ? '允许重复点名' : `本轮还剩 ${remaining}人`}`
            : 'TXT每行一个姓名；CSV可选择姓名列；JSON可导入姓名数组。'}
        </p>
        {rolling ? (
          <button className="primary large" onClick={() => finish(rolling)}>
            停止点名
          </button>
        ) : (
          <button
            className="primary large"
            disabled={!roster?.students.length || (!repeat && bag.key === key && !bag.ids.length)}
            onClick={pick}
          >
            🌸 开始随机点名
          </button>
        )}
        <div role="status" className="picker-announcement">
          {rolling
            ? '正在随机点名…'
            : display
              ? `本次点名：${display}`
              : !repeat && roster && bag.key === key && !remaining
                ? '本轮已全部点名，可以开始新一轮。'
                : '准备好后，邀请一位小伙伴。'}
        </div>
      </div>
      {error && !edit && (
        <div role="alert" className="warning">
          {error}
        </div>
      )}
      {currentHistory.length > 0 && (
        <section className="picker-history">
          <h2>本轮登场的小伙伴</h2>
          <div>
            {currentHistory.map((s, i) => (
              <span key={`${i}-${s.id}`}>
                {i + 1}. {s.name}
              </span>
            ))}
          </div>
        </section>
      )}
      <p className="privacy-note">
        名单只保存到本机浏览器，不上传服务器。完整题库备份会包含本地名单；点名顺序仅保留在本次页面中，刷新后开始新一轮。同名学生按名单中的独立条目参与抽取。
      </p>
      {edit && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="名单导入预览">
            <div className="section-head">
              <h2>名单导入预览</h2>
              <button
                aria-label="关闭名单预览"
                disabled={busy}
                onClick={() => {
                  setEdit(null)
                  setError('')
                }}
              >
                ✕
              </button>
            </div>
            <label>
              班级名称
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            {edit.csv ? (
              <label>
                CSV姓名列
                <select
                  value={edit.column}
                  onChange={(e) => setEdit({ ...edit, column: e.target.value })}
                >
                  {edit.csv.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                姓名（每行一个）
                <textarea
                  rows={8}
                  value={edit.text}
                  onChange={(e) => setEdit({ ...edit, text: e.target.value })}
                />
              </label>
            )}
            <p>
              预览 {preview.length} 人；
              {new Set(preview).size < preview.length
                ? '含同名条目，每个条目都会独立参与点名。'
                : '每份名单最多500人。'}
            </p>
            <div className="roster-preview">
              {preview.slice(0, 15).map((name, i) => (
                <span key={i}>
                  {i + 1}. {name || '（缺少姓名）'}
                </span>
              ))}
              {preview.length > 15 && <span>…其余 {preview.length - 15} 人</span>}
            </div>
            {error && (
              <div role="alert" className="warning">
                {error}
              </div>
            )}
            <div className="actions">
              <button className="primary" disabled={busy} onClick={() => void saveEdit()}>
                {busy ? '保存中…' : '确认保存名单'}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setEdit(null)
                  setError('')
                }}
              >
                取消
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
