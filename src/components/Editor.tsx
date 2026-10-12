import { useState } from 'react'
import { games, questionSchema, uid, type Database, type GameId, type Question } from '../domain'

const typeNames: Record<Question['type'], string> = {
  choice: '汉字选择',
  pinyin: '拼音选择',
  tone: '声调辨认',
  word: '词语选择',
  sentence: '句子排序',
  reading: '朗读内容',
}
export default function Editor({
  db,
  question,
  lessonId,
  onSave,
  onClose,
  onPreview,
}: {
  db: Database
  question?: Question
  lessonId: string
  onSave: (q: Question) => Promise<void>
  onClose: () => void
  onPreview: (q: Question) => void
}) {
  const stamp = new Date().toISOString(),
    lesson = db.lessons.find((l) => l.id === (question?.lessonId ?? lessonId))!,
    unit = db.units.find((u) => u.id === lesson.unitId)!,
    book = db.books.find((b) => b.id === unit.bookId)!
  const initial: Question = question ?? {
    id: uid(),
    versionId: book.versionId,
    bookId: book.id,
    unitId: unit.id,
    lessonId: lesson.id,
    type: 'choice',
    knowledge: '生字认读',
    prompt: '',
    options: [],
    answers: [],
    difficulty: 'easy',
    games: ['mole', 'detective'],
    explanation: '',
    notes: '',
    enabled: true,
    createdAt: stamp,
    updatedAt: stamp,
  }
  const [draft, setDraft] = useState(initial),
    [options, setOptions] = useState(initial.options.join('\n')),
    [answers, setAnswers] = useState(initial.answers.join('\n'))
  const [tokens, setTokens] = useState(initial.tokens?.join('|') ?? ''),
    [orders, setOrders] = useState(
      initial.orders?.map((order) => order.map((i) => initial.tokens![i]).join('|')).join('\n') ??
        '',
    )
  const [parts, setParts] = useState(initial.parts?.join('|') ?? ''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const set = <K extends keyof Question>(key: K, value: Question[K]) =>
    setDraft((q) => ({ ...q, [key]: value }))
  function build(): Question {
    const l = db.lessons.find((l) => l.id === draft.lessonId)!,
      u = db.units.find((u) => u.id === l.unitId)!,
      b = db.books.find((b) => b.id === u.bookId)!
    const list = (str: string) =>
      str
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    const ts = tokens
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
    const ords = list(orders).map((line) => {
      const used = new Set<number>()
      return line.split('|').map((word) => {
        const idx = ts.findIndex((token, i) => token === word.trim() && !used.has(i))
        used.add(idx)
        return idx
      })
    })
    const q = {
      ...draft,
      versionId: b.versionId,
      bookId: b.id,
      unitId: u.id,
      updatedAt: new Date().toISOString(),
      options:
        draft.type === 'tone'
          ? ['1', '2', '3', '4']
          : ['sentence', 'reading'].includes(draft.type)
            ? []
            : list(options),
      answers:
        draft.type === 'tone'
          ? [String(draft.tone ?? 1)]
          : ['sentence', 'reading'].includes(draft.type)
            ? []
            : list(answers),
      ...(draft.type === 'sentence' ? { tokens: ts, orders: ords } : {}),
      ...(draft.type === 'pinyin' ? { parts: parts.split('|').filter(Boolean) } : {}),
    }
    const result = questionSchema.safeParse(q)
    if (!result.success) throw new Error(result.error.issues.map((i) => i.message).join('；'))
    return result.data
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="section-head">
          <h2 id="editor-title">{question ? '编辑题目' : '添加题目'}</h2>
          <button onClick={onClose} aria-label="关闭编辑器">
            ✕
          </button>
        </div>
        <div className="form-grid">
          <label>
            所属课文
            <select value={draft.lessonId} onChange={(e) => set('lessonId', e.target.value)}>
              {db.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {
                    db.books.find((b) => b.id === db.units.find((u) => u.id === l.unitId)?.bookId)
                      ?.name
                  }{' '}
                  / {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            题型
            <select
              value={draft.type}
              onChange={(e) => {
                const type = e.target.value as Question['type']
                setDraft((q) => ({
                  ...q,
                  type,
                  games: games
                    .filter((g) => (g.types as readonly string[]).includes(type))
                    .map((g) => g.id),
                  ...(type === 'tone' ? { tone: 1 } : {}),
                }))
              }}
            >
              {Object.entries(typeNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            题目内容
            <textarea
              value={draft.prompt}
              onChange={(e) => set('prompt', e.target.value)}
              required
              placeholder="例如：请找到“天”。"
            />
          </label>
          <label>
            教学知识点
            <input value={draft.knowledge} onChange={(e) => set('knowledge', e.target.value)} />
          </label>
          <label>
            难度
            <select
              value={draft.difficulty}
              onChange={(e) => set('difficulty', e.target.value as Question['difficulty'])}
            >
              <option value="easy">简单</option>
              <option value="normal">普通</option>
              <option value="challenge">挑战</option>
            </select>
          </label>
          {['choice', 'pinyin', 'word'].includes(draft.type) && (
            <>
              <label>
                答案选项（每行一个，不重复）
                <textarea value={options} onChange={(e) => setOptions(e.target.value)} />
              </label>
              <label>
                正确答案（每行一个，可多个）
                <textarea value={answers} onChange={(e) => setAnswers(e.target.value)} />
              </label>
            </>
          )}
          {draft.type === 'pinyin' && (
            <>
              <label>
                明确的合法音节答案
                <input
                  value={draft.syllable ?? ''}
                  onChange={(e) => set('syllable', e.target.value)}
                  placeholder="例如：jué（不用字符串推测音节）"
                />
              </label>
              <label>
                展示卡片（用 | 分隔）
                <input
                  value={parts}
                  onChange={(e) => setParts(e.target.value)}
                  placeholder="j|üe|第二声"
                />
              </label>
            </>
          )}
          {draft.type === 'tone' && (
            <label>
              正确声调
              <select value={draft.tone ?? 1} onChange={(e) => set('tone', Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    第{n}声
                  </option>
                ))}
              </select>
            </label>
          )}
          {draft.type === 'sentence' && (
            <>
              <label className="full">
                词语卡片（用 | 分隔，保留标点）
                <input
                  value={tokens}
                  onChange={(e) => setTokens(e.target.value)}
                  placeholder="小鸟|在树上|唱歌。"
                />
              </label>
              <label className="full">
                正确句子（每行一种排序，用 | 分隔）
                <textarea
                  value={orders}
                  onChange={(e) => setOrders(e.target.value)}
                  placeholder="小鸟|在树上|唱歌。"
                />
              </label>
            </>
          )}
          {draft.type === 'reading' && (
            <>
              <label className="full">
                朗读正文（可换行）
                <textarea
                  rows={5}
                  value={draft.readingText ?? ''}
                  onChange={(e) => set('readingText', e.target.value)}
                />
              </label>
              <label className="full">
                逐词分段（可选，用 | 分隔；拼接须与正文完全一致）
                <textarea
                  value={draft.readingChunks?.join('|') ?? ''}
                  onChange={(e) =>
                    set('readingChunks', e.target.value ? e.target.value.split('|') : undefined)
                  }
                  placeholder="你|和|我|，|一起|学习|。"
                />
              </label>
            </>
          )}
          <label className="full">
            答题反馈 / 知识卡片
            <textarea
              value={draft.explanation}
              onChange={(e) => set('explanation', e.target.value)}
            />
          </label>
          <label>
            教师备注
            <textarea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
          <label>
            明确的部件高亮（可选）
            <input
              value={draft.highlight ?? ''}
              onChange={(e) => set('highlight', e.target.value)}
              placeholder="仅高亮教师输入的字符或部件"
            />
            <small>不生成或推测标准笔顺。</small>
          </label>
          <label className="full">
            本地音频（可选，MP3/WAV/OGG/M4A/WebM，最大2MB）
            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 2_000_000) {
                  setError('音频须小于2MB')
                  return
                }
                const reader = new FileReader()
                reader.onload = () => {
                  set('audio', reader.result as string)
                }
                reader.readAsDataURL(file)
              }}
            />
            {draft.audio && <button onClick={() => set('audio', undefined)}>移除音频</button>}
          </label>
        </div>
        <fieldset>
          <legend>适用游戏</legend>
          <div className="checkbox-list">
            {games
              .filter((g) => (g.types as readonly string[]).includes(draft.type))
              .map((g) => (
                <label key={g.id}>
                  <input
                    type="checkbox"
                    checked={draft.games.includes(g.id)}
                    onChange={(e) =>
                      set(
                        'games',
                        e.target.checked
                          ? [...draft.games, g.id as GameId]
                          : draft.games.filter((id) => id !== g.id),
                      )
                    }
                  />
                  {g.name}
                </label>
              ))}
          </div>
        </fieldset>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          启用此题
        </label>
        {error && (
          <p role="alert" className="warning">
            {error}
          </p>
        )}
        <div className="actions">
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              try {
                const q = build()
                setBusy(true)
                await onSave(q)
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : '保存失败')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? '正在保存…' : '保存题目'}
          </button>
          <button
            onClick={() => {
              try {
                onPreview(build())
              } catch (e) {
                setError(e instanceof Error ? e.message : '请检查输入')
              }
            }}
          >
            预览游戏
          </button>
          <button onClick={onClose}>取消</button>
        </div>
      </section>
    </div>
  )
}
