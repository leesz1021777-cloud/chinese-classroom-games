import { useState } from 'react'
import { games, type Database, type GameId, type Question } from '../domain'
import { schedule } from '../services'

export default function Setup({
  db,
  initialGame,
  initialUnit,
  onStart,
  onBank,
}: {
  db: Database
  initialGame: GameId
  initialUnit?: string
  onStart: (game: GameId, questions: Question[]) => void
  onBank: () => void
}) {
  const defaultUnit =
    db.units.find((u) => u.id === initialUnit) ??
    db.units.find(
      (u) =>
        u.bookId === db.books[0].id && db.questions.some((q) => q.unitId === u.id && q.enabled),
    ) ??
    db.units.find((u) => u.bookId === db.books[0].id)!
  const [bookId, setBook] = useState(defaultUnit.bookId),
    [unitId, setUnit] = useState(defaultUnit.id)
  const ordered = db.lessons
    .filter((l) => l.unitId === defaultUnit.id)
    .sort((a, b) => a.order - b.order)
  const first = (initialUnit ? ordered.at(-1) : ordered[0])?.id ?? db.lessons[0].id
  const [lessonId, setLesson] = useState(first),
    [game, setGame] = useState(initialGame),
    [scope, setScope] = useState(initialUnit ? 'unit' : 'lesson')
  const [selected, setSelected] = useState<string[]>([first]),
    [count, setCount] = useState(10),
    [difficulty, setDifficulty] = useState<'all' | Question['difficulty']>('all')
  const units = db.units.filter((u) => u.bookId === bookId).sort((a, b) => a.order - b.order),
    lessons = db.lessons.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order)
  const lessonIds =
    scope === 'lesson'
      ? [lessonId]
      : scope === 'unit'
        ? lessons
            .filter((l) => l.order <= (db.lessons.find((l) => l.id === lessonId)?.order ?? 0))
            .map((l) => l.id)
        : selected
  const plan = schedule(db, { game, lessonIds, difficulty, count })
  return (
    <section className="panel setup">
      <span className="eyebrow">准备一场小小的课堂探险</span>
      <h1>开始课堂</h1>
      <p className="muted">
        选好学习内容，剩下的交给游戏。选项每题随机排列；默认不计时，老师掌握节奏。
      </p>
      <div className="form-grid">
        <label>
          教材册次
          <select
            value={bookId}
            onChange={(e) => {
              const b = e.target.value,
                u = db.units.find((u) => u.bookId === b)!
              setBook(b)
              setUnit(u.id)
              setLesson(db.lessons.find((l) => l.unitId === u.id)?.id ?? '')
            }}
          >
            {db.books.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name} · {b.version}
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
              setLesson(db.lessons.find((l) => l.unitId === e.target.value)?.id ?? '')
            }}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {` · ${db.questions.filter((q) => q.unitId === u.id && q.enabled).length}题`}
              </option>
            ))}
          </select>
        </label>
        <label>
          课文
          <select value={lessonId} onChange={(e) => setLesson(e.target.value)}>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {!l.confirmed ? '（待教师确认）' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          课堂游戏
          <select value={game} onChange={(e) => setGame(e.target.value as GameId)}>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          题目范围
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="lesson">只用当前课文</option>
            <option value="unit">当前单元已学课文（至当前课）</option>
            <option value="mixed">多个课文混合</option>
            <option value="topic">教师专题</option>
          </select>
        </label>
        <label>
          难度
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
          >
            <option value="all">全部难度</option>
            <option value="easy">简单</option>
            <option value="normal">普通</option>
            <option value="challenge">挑战</option>
          </select>
        </label>
        <label>
          题目数量
          <div className="count-options">
            {[5, 10, 15, 20].map((n) => (
              <button className={count === n ? 'selected' : ''} key={n} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
            <input
              aria-label="自定义题量"
              type="number"
              min="1"
              max="500"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value))))}
            />
          </div>
        </label>
      </div>
      {(scope === 'mixed' || scope === 'topic') && (
        <fieldset>
          <legend>{scope === 'topic' ? '选择专题' : '选择课文（可跨册次）'}</legend>
          <div className="checkbox-list">
            {db.lessons
              .filter((l) => (scope === 'topic' ? l.topic : !l.topic))
              .map((l) => (
                <label key={l.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(l.id)}
                    onChange={(e) =>
                      setSelected((items) =>
                        e.target.checked ? [...items, l.id] : items.filter((id) => id !== l.id),
                      )
                    }
                  />
                  {l.name}
                </label>
              ))}
          </div>
        </fieldset>
      )}
      <div className={plan.available ? 'readiness' : 'warning'}>
        {plan.available ? (
          <>
            找到 <strong>{plan.available}</strong> 道适合的题目。
            {plan.shortfall > 0 &&
              ` 题量不足，本轮将使用 ${plan.questions.length} 道，不重复抽取。`}
          </>
        ) : (
          <>
            当前范围没有适合「{games.find((g) => g.id === game)!.name}
            」的题目。请选择其他课文或游戏，也可以立即补充题目。{' '}
            <button onClick={onBank}>去题库补充</button>
          </>
        )}
      </div>
      <button
        className="primary large"
        disabled={!plan.available}
        onClick={() => onStart(game, plan.questions)}
      >
        出发，开始游戏 →
      </button>
    </section>
  )
}
