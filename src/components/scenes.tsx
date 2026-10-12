import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Question } from '../domain'
import { shuffle } from '../services'

export type SceneProps = {
  q: Question
  solved: boolean
  choices: string[]
  answer: (answer: string | number[]) => void
  index: number
  total: number
  completedIndices: number[]
  order: number[]
  setOrder: Dispatch<SetStateAction<number[]>>
  inspection: boolean
  setInspection: Dispatch<SetStateAction<boolean>>
  readIndex: number
  setReadIndex: Dispatch<SetStateAction<number>>
  autoRead: boolean
  readingSegments: string[]
  setAutoRead: Dispatch<SetStateAction<boolean>>
  onReadComplete: () => void
}
function ChoiceCards({
  choices,
  solved,
  q,
  answer,
  mole = false,
}: {
  choices: string[]
  solved: boolean
  q: Question
  answer: SceneProps['answer']
  mole?: boolean
}) {
  return (
    <div className={`answer-grid ${mole ? 'holes' : ''}`}>
      {choices.map((option, i) => (
        <button
          aria-label={option}
          className={`answer ${solved && q.answers.includes(option) ? 'correct' : ''} ${mole ? 'mole bounce' : ''}`}
          style={{ animationDelay: `${i * 0.07}s` }}
          key={option}
          onClick={() => answer(option)}
          disabled={solved}
        >
          {mole && (
            <span className="mole-face" aria-hidden="true">
              🐹
            </span>
          )}
          <span>{option}</span>
        </button>
      ))}
    </div>
  )
}
export function Mole(p: SceneProps) {
  return (
    <div className="forest-scene">
      <span className="forest-decoration">🍄</span>
      <span className="forest-decoration right">🌿</span>
      <div className="forest-sign">🌸 紫藤花的汉字朋友</div>
      <ChoiceCards {...p} mole />
      {p.solved && <div className="scene-treasure">🌟 找到啦！地鼠把星星送给你。</div>}
    </div>
  )
}
export function Pinyin(p: SceneProps) {
  const [mode, setMode] = useState<'match' | 'assemble'>('match'),
    [selected, setSelected] = useState<number[]>([])
  const parts = p.q.parts ?? []
  const [partOrder] = useState(() => shuffle(parts.map((_, i) => i)))
  return (
    <>
      <div className="train-scene">
        <div className="rail-landscape" aria-hidden="true">
          <span>☁️</span>
          <span>🌳</span>
          <span>🏡</span>
          <span>🌈</span>
        </div>
        <div className="actions train-modes">
          <button className={mode === 'match' ? 'selected' : ''} onClick={() => setMode('match')}>
            音节 / 汉字匹配
          </button>
          <button
            className={mode === 'assemble' ? 'selected' : ''}
            disabled={!parts.length}
            onClick={() => setMode('assemble')}
          >
            拼读卡片（两拼 / 三拼 / 声调）
          </button>
        </div>
        <div
          className={p.solved ? 'train arrived' : 'train'}
          style={{ transform: `translateX(${p.solved ? 12 : 0}%)` }}
        >
          <span className="engine">🚂</span>
          {(mode === 'match' ? parts : selected.map((i) => parts[i])).map((part, i) => (
            <span className={`car car-${i}`} key={i}>
              {part}
            </span>
          ))}
          {mode === 'assemble' && !selected.length && (
            <span className="muted">依次选择卡片，让车厢排好队。</span>
          )}
        </div>
        <p>
          {mode === 'match'
            ? '选出题库中完整、正确的音节。'
            : '依照教师明确配置的声母、韵母、声调顺序拼读；不自动推测音节。'}
        </p>
      </div>
      {mode === 'match' ? (
        <ChoiceCards {...p} />
      ) : (
        <div className="assemble">
          <div className="token-bank">
            {partOrder.map((i) => (
              <button
                className="token"
                aria-label={parts[i]}
                key={i}
                disabled={selected.includes(i) || p.solved}
                draggable={!selected.includes(i) && !p.solved}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                onClick={() => setSelected((items) => [...items, i])}
              >
                {parts[i]}
              </button>
            ))}
          </div>
          <div
            className="car-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const payload = e.dataTransfer.getData('text/plain')
              if (!/^\d+$/.test(payload)) return
              const i = Number(payload)
              if (
                Number.isInteger(i) &&
                i >= 0 &&
                i < parts.length &&
                !selected.includes(i) &&
                !p.solved
              )
                setSelected((items) => [...items, i])
            }}
          >
            🚃 也可以把卡片拖到这里，添加一节车厢
          </div>
          <button
            className="primary"
            disabled={selected.length !== parts.length || p.solved}
            onClick={() => p.answer(selected.every((n, i) => n === i) ? p.q.syllable! : [])}
          >
            检查拼读
          </button>
          <button disabled={p.solved} onClick={() => setSelected([])}>
            重新选卡片
          </button>
          <button
            disabled={p.solved || !selected.length}
            onClick={() => setSelected((items) => items.slice(0, -1))}
          >
            撤回上一车厢
          </button>
        </div>
      )}
    </>
  )
}
export function Balloon(p: SceneProps) {
  return (
    <div className="balloon-sky">
      <div className="tone-guide">跟着手势读一读：一声平，二声扬，三声拐弯，四声降。</div>
      <div className="balloons">
        {p.choices.map((value) => {
          const i = Number(value) - 1,
            label = ['一声 · 平', '二声 · 扬', '三声 · 拐弯', '四声 · 降'][i]
          return (
            <button
              aria-label={`选择第${i + 1}声`}
              key={label}
              className={`balloon balloon-${i} ${p.solved && p.q.tone === i + 1 ? 'fly' : ''}`}
              disabled={p.solved}
              onClick={() => p.answer(String(i + 1))}
            >
              <span>{['ˉ', 'ˊ', 'ˇ', 'ˋ'][i]}</span>
              {label}
            </button>
          )
        })}
      </div>
      {p.solved && <div className="scene-treasure">✨ 正确气球飞向了天空花园！</div>}
    </div>
  )
}
export function Detective(p: SceneProps) {
  const [stamped, setStamped] = useState(false)
  return (
    <>
      <div className="detective-case">
        <span>🦉</span>
        <div>
          <strong>汉字案卷 #{String(p.index + 1).padStart(2, '0')}</strong>
          <small>放大观察，寻找字形线索，再收集证物。</small>
        </div>
        <span className="case-seal">字形调查</span>
      </div>
      <ChoiceCards {...p} />
      <button onClick={() => p.setInspection((v) => !v)} className="inspect">
        🔎 {p.inspection ? '收起观察' : '放大观察字形'}
      </button>
      {p.inspection && (
        <div className="magnifier">
          {p.q.options.map((o) => (
            <span key={o}>
              {p.q.highlight && o.includes(p.q.highlight) ? (
                <>
                  {o.split(p.q.highlight)[0]}
                  <mark>{p.q.highlight}</mark>
                  {o.split(p.q.highlight).slice(1).join(p.q.highlight)}
                </>
              ) : (
                o
              )}
            </span>
          ))}
        </div>
      )}
      {p.solved && <div className="knowledge-card">🔎 汉字小知识：{p.q.explanation}</div>}
      {p.solved && (
        <div className="stamp-collector">
          <button onClick={() => setStamped(true)} disabled={stamped}>
            {stamped ? '汉字印章已收集' : '领取汉字印章'}
          </button>
          {stamped && (
            <span className="character-stamp">
              {p.q.answers[0]}
              <small>发现证物</small>
            </span>
          )}
        </div>
      )}
    </>
  )
}
export function Bridge(p: SceneProps) {
  return (
    <>
      <div className="river-scene">
        <span
          className="walker"
          style={{ left: `${(p.completedIndices.length / p.total) * 80 + 3}%` }}
        >
          🐰
        </span>
        <div className="bridge-planks">
          {Array.from({ length: Math.min(p.total, 20) }, (_, i) => (
            <span
              className={
                i < (p.completedIndices.length / p.total) * Math.min(p.total, 20) ? 'built' : ''
              }
              key={i}
            />
          ))}
        </div>
        <div className="river-waves">～ ～ ～ ～ ～ ～ ～</div>
        <div className="river-mailbox">📮</div>
      </div>
      <p className="scene-caption">
        小兔的送信任务：已完成 {p.completedIndices.length} / {p.total}{' '}
        块桥板。跳过的题目不会自动搭桥。
      </p>
      <ChoiceCards {...p} />
    </>
  )
}
export function Sentence(p: SceneProps) {
  const dragIndex = useRef<number | null>(null)
  const [tokens] = useState(() => shuffle(p.q.tokens!.map((_, i) => i)))
  const [hint, setHint] = useState(false)
  function move(from: number, to: number) {
    p.setOrder((items) => {
      const copy = [...items]
      const [token] = copy.splice(from, 1)
      copy.splice(to, 0, token)
      return copy
    })
  }
  return (
    <div className="sentence-stage">
      <div className="sentence-banner">🎒 词语小队，准备集合！</div>
      <p>依次点击词语；已选卡片可拖动排序，或用旁边的箭头移动。</p>
      <div className="ordered" aria-label="已排句子">
        {p.order.length === 0 && <span className="muted">让词语在这里排好队…</span>}
        {p.order.map((token, pos) => (
          <div
            className="token-wrap"
            key={token}
            draggable={!p.solved}
            onDragStart={() => {
              dragIndex.current = pos
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex.current !== null) move(dragIndex.current, pos)
            }}
          >
            <button
              className="token"
              aria-label={p.q.tokens![token]}
              disabled={p.solved}
              onClick={() => p.setOrder((items) => items.filter((n) => n !== token))}
            >
              {p.q.tokens![token]}
            </button>
            <div>
              <button
                aria-label={`左移${p.q.tokens![token]}`}
                disabled={pos === 0 || p.solved}
                onClick={() => move(pos, pos - 1)}
              >
                ←
              </button>
              <button
                aria-label={`右移${p.q.tokens![token]}`}
                disabled={pos === p.order.length - 1 || p.solved}
                onClick={() => move(pos, pos + 1)}
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="token-bank">
        {tokens.map((token) => (
          <button
            className="token"
            aria-label={p.q.tokens![token]}
            key={token}
            disabled={p.order.includes(token) || p.solved}
            onClick={() => p.setOrder((items) => [...items, token])}
          >
            {p.q.tokens![token]}
          </button>
        ))}
      </div>
      <button
        className="primary"
        disabled={p.order.length !== p.q.tokens!.length || p.solved}
        onClick={() => p.answer(p.order)}
      >
        检查答案
      </button>
      <button onClick={() => p.setOrder([])} disabled={p.solved}>
        重新排列
      </button>
      <button onClick={() => setHint((v) => !v)} disabled={p.solved}>
        提示开头
      </button>
      {hint && !p.solved && (
        <p className="sentence-hint">
          一种合理开头是：{p.q.tokens![p.q.orders![0][0]]}。其他正确语序也会被接受。
        </p>
      )}
      {p.solved && (
        <div className="sentence-finale">
          🎭 小剧场开演啦：{p.order.map((i) => p.q.tokens![i]).join('')}
        </div>
      )}
    </div>
  )
}
export function Reading(p: SceneProps) {
  const chars = p.readingSegments
  const [leader, setLeader] = useState(true)
  return (
    <div className="reading-stage">
      <div className="reading-stage-top">
        <span>🎶 紫藤花朗读舞台</span>
        <button onClick={() => setLeader((v) => !v)}>
          {leader ? '教师领读' : '全班跟读'} · 切换
        </button>
        <span className="reading-beats" aria-hidden="true">
          ● ● ●
        </span>
      </div>
      <div className="reading-text">
        {chars.map((char, i) =>
          char === '\n' ? (
            <br key={i} />
          ) : (
            <span
              className={
                i === p.readIndex ? 'reading-active' : i < p.readIndex ? 'reading-done' : ''
              }
              key={i}
              onClick={() => p.setReadIndex(i)}
            >
              {char}
            </span>
          ),
        )}
      </div>
      <div className="actions">
        <button onClick={() => p.setAutoRead((v) => !v)}>
          {p.autoRead ? '暂停高亮' : '自动高亮'}
        </button>
        <button
          onClick={() => {
            p.setAutoRead(false)
            p.setReadIndex((i) => Math.min(i + 1, chars.length - 1))
          }}
        >
          逐字 / 词前进
        </button>
        <button
          onClick={() => {
            p.setAutoRead(false)
            const end = chars.findIndex((c, i) => i > p.readIndex && /[。？！\n]/.test(c))
            p.setReadIndex(end < 0 ? chars.length - 1 : end)
          }}
        >
          逐句前进
        </button>
        <button
          onClick={() => {
            p.setReadIndex(-1)
            p.setAutoRead(false)
          }}
        >
          重播
        </button>
        <button className="primary" onClick={p.onReadComplete} disabled={p.solved}>
          标记朗读完成
        </button>
      </div>
    </div>
  )
}
