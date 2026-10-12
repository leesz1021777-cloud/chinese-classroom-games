import { useState } from 'react'
import { games, type Database, type GameId } from '../domain'
import { themes } from '../content'

export default function LearningMap({
  db,
  onChoose,
}: {
  db: Database
  onChoose: (unitId: string, game: GameId) => void
}) {
  const [bookId, setBook] = useState(db.books[0].id)
  const book = db.books.find((b) => b.id === bookId) ?? db.books[0]
  const units = db.units
    .filter((u) => u.bookId === book.id && db.questions.some((q) => q.unitId === u.id && q.enabled))
    .sort((a, b) => a.order - b.order)
  const icons = ['🌱', '🔤', '🚉', '🌳', '🌤️', '🏫', '🏡', '🪄', '🏝️']
  return (
    <section className="learning-map">
      <div className="section-head">
        <div>
          <span className="eyebrow">一本学习地图，许多有趣的发现</span>
          <h2>紫藤花学习地图</h2>
        </div>
        <div className="book-tabs">
          {db.books.map((b) => (
            <button
              className={book.id === b.id ? 'selected' : ''}
              key={b.id}
              onClick={() => setBook(b.id)}
            >
              {b.term}
            </button>
          ))}
        </div>
      </div>
      <p className="muted">
        新增主题均为原创拓展练习，课目适配性待教师确认；不代表已核实的新版教材目录。
      </p>
      <div className="unit-cards">
        {units.map((u, i) => {
          const questions = db.questions.filter((q) => q.unitId === u.id && q.enabled),
            lessons = db.lessons.filter((l) => l.unitId === u.id),
            compatible = games.filter((g) => questions.some((q) => q.games.includes(g.id)))
          const theme = themes.find((t) => u.id === `extra-${t.bookId}-${t.id}`)
          return (
            <button
              className="unit-card"
              key={u.id}
              onClick={() => onChoose(u.id, compatible[0].id)}
            >
              <span className="unit-icon">{theme?.icon ?? icons[i % icons.length]}</span>
              <span className="unit-tag">
                {u.id.startsWith('extra-') ? '原创拓展' : '教材示例'}
              </span>
              <h3>{u.name.replace(/^拓展 · /, '')}</h3>
              <p>
                {lessons.length}个课题 · {questions.length}道练习
              </p>
              <small>
                {compatible.map((g) => g.icon).join(' ')} <span>去探险 →</span>
              </small>
            </button>
          )
        })}
      </div>
      {!units.length && <div className="empty">当前册次没有启用题目，请在教师题库补充。</div>}
    </section>
  )
}
