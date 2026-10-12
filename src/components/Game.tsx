import { useEffect, useRef, useState } from 'react'
import {
  games,
  uid,
  type GameId,
  type Outcome,
  type Question,
  type Result,
  type Settings,
} from '../domain'
import { isAnswer, prepareChoices } from '../services'
import { sceneRegistry } from './sceneRegistry'
import { adventures, earnedStars } from '../adventure'
import { AdventureTrail, RewardGarden } from './Adventure'

type Props = {
  game: GameId
  questions: Question[]
  settings: Settings
  onExit: () => void
  onFinish: (result: Result) => Promise<void>
}
export default function Game({ game, questions, settings, onExit, onFinish }: Props) {
  const [queue, setQueue] = useState(questions),
    [index, setIndex] = useState(0),
    [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [feedback, setFeedback] = useState(''),
    [attempts, setAttempts] = useState(0),
    [solved, setSolved] = useState(false),
    [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false),
    [order, setOrder] = useState<number[]>([]),
    [inspection, setInspection] = useState(false)
  const [scores, setScores] = useState(settings.groups.map(() => 0)),
    [group, setGroup] = useState(0),
    [history, setHistory] = useState<number[][]>([])
  const [remaining, setRemaining] = useState(settings.seconds),
    [readIndex, setReadIndex] = useState(-1),
    [autoRead, setAutoRead] = useState(false)
  const [moleTick, setMoleTick] = useState(0),
    [resultError, setResultError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const q = queue[index],
    gameInfo = games.find((g) => g.id === game)!
  const readText = q?.readingText ?? '',
    chars =
      settings.readingUnit === 'word' && q.readingChunks?.length
        ? q.readingChunks
        : Array.from(readText)
  const [choices, setChoices] = useState(() =>
    prepareChoices(q, game === 'mole' ? settings.holes : q.options.length),
  )
  const audio = useRef<HTMLAudioElement | null>(null)
  const reportRef = useRef<Result | null>(null)
  function resetQuestion(next: number) {
    setIndex(next)
    setFeedback('')
    setAttempts(0)
    setSolved(false)
    setOrder([])
    setInspection(false)
    setRemaining(settings.seconds)
    setReadIndex(-1)
    setAutoRead(false)
    setChoices(
      prepareChoices(queue[next], game === 'mole' ? settings.holes : queue[next].options.length),
    )
    setMoleTick(0)
    setPaused(false)
  }
  function sound() {
    if (!settings.volume) return
    try {
      const ctx = new AudioContext(),
        osc = ctx.createOscillator(),
        gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(settings.volume * 0.08, ctx.currentTime)
      osc.frequency.value = 660
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
      osc.onended = () => {
        void ctx.close()
      }
    } catch {
      /* 音效为可选，不影响答题。 */
    }
  }
  function answer(value: string | number[]) {
    if (solved || paused || done) return
    setAttempts((a) => a + 1)
    if (isAnswer(q, value)) {
      setSolved(true)
      setFeedback('太棒了！我们一起找到了。')
      sound()
    } else setFeedback('再观察一下，你可以再试一次。')
  }
  async function finish(items: Outcome[]) {
    setDone(true)
    setAutoRead(false)
    const result = {
      id: uid(),
      date: new Date().toISOString(),
      game,
      outcomes: items,
      scores,
      groupNames: settings.cooperative ? settings.groups : [],
    }
    reportRef.current = result
    try {
      await onFinish(result)
      setResultError('')
    } catch {
      setResultError('课堂结果保存失败。请重试保存，或先导出备份。')
    }
  }
  function next(skip = false) {
    if (done) return
    const current: Outcome = {
      questionId: q.id,
      prompt: q.prompt,
      status: skip ? 'skipped' : solved ? 'correct' : attempts ? 'wrong' : 'skipped',
      attempts,
    }
    const items = [...outcomes.filter((o) => o.questionId !== q.id), current]
    setOutcomes(items)
    if (settings.cooperative && settings.rotate) setGroup((g) => (g + 1) % settings.groups.length)
    if (index === queue.length - 1) void finish(items)
    else resetQuestion(index + 1)
  }
  function previous() {
    if (index > 0) {
      setOutcomes((items) => items.filter((o) => o.questionId !== queue[index - 1].id))
      resetQuestion(index - 1)
    }
  }
  function restart(items: Question[] = questions) {
    setQueue(items)
    setIndex(0)
    setOutcomes([])
    setDone(false)
    setFeedback('')
    setSolved(false)
    setAttempts(0)
    setOrder([])
    setReadIndex(-1)
    setAutoRead(false)
    setRemaining(settings.seconds)
    setChoices(prepareChoices(items[0], game === 'mole' ? settings.holes : items[0].options.length))
    setMoleTick(0)
    setRetryKey((k) => k + 1)
    setPaused(false)
    setResultError('')
  }
  function adjustScore(delta: number) {
    setHistory((h) => [...h, scores])
    setScores((s) => s.map((n, i) => (i === group ? Math.max(0, n + delta) : n)))
  }
  useEffect(() => {
    if (done || paused || solved || !settings.seconds || remaining === 0) return
    const timer = setTimeout(() => setRemaining((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [done, paused, solved, settings.seconds, remaining])
  useEffect(() => {
    if (game !== 'mole' || paused || solved || done) return
    const timer = setInterval(() => setMoleTick((n) => n + 1), settings.moleSpeed)
    return () => clearInterval(timer)
  }, [game, paused, solved, done, settings.moleSpeed])
  useEffect(() => {
    if (!autoRead || paused || done || readIndex >= chars.length - 1) return
    const char = chars[readIndex] ?? '',
      delay =
        settings.readingSpeed +
        (/[，、：；]/.test(char)
          ? settings.pauseComma
          : /[。？！]/.test(char)
            ? settings.pauseEnd
            : 0)
    const timer = setTimeout(() => setReadIndex((i) => i + 1), delay)
    return () => clearTimeout(timer)
  }, [
    autoRead,
    paused,
    done,
    readIndex,
    chars,
    settings.readingSpeed,
    settings.pauseComma,
    settings.pauseEnd,
  ])
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select')) return
      if (e.code === 'Space') {
        e.preventDefault()
        setPaused((p) => !p)
      }
      if (e.key === 'Escape') onExit()
      if (!done && e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      }
      if (!done && e.key === 'ArrowLeft') {
        e.preventDefault()
        previous()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  })
  useEffect(
    () => () => {
      audio.current?.pause()
    },
    [],
  )
  const review = outcomes.filter((o) => o.status !== 'correct' || o.attempts > 1)
  if (done)
    return (
      <section className="panel results">
        <div className="celebration">🌟</div>
        <span className="eyebrow">一起成长的一堂课</span>
        <h1>本轮探险完成！</h1>
        <RewardGarden game={game} stars={earnedStars(outcomes)} total={queue.length} />
        <p>
          完成 {outcomes.length} 题 · 答对 {outcomes.filter((o) => o.status === 'correct').length}{' '}
          题 · 首次答对 {outcomes.filter((o) => o.status === 'correct' && o.attempts <= 1).length}{' '}
          题 · 跳过 {outcomes.filter((o) => o.status === 'skipped').length} 题
        </p>
        <h2>再练一练</h2>
        {review.length ? (
          review.map((o) => (
            <p key={o.questionId}>
              {o.prompt}{' '}
              <span className="tag">
                {o.status === 'skipped' ? '已跳过' : o.status === 'wrong' ? '待巩固' : '曾经答错'}
              </span>
            </p>
          ))
        ) : (
          <p>大家都掌握得很好！</p>
        )}
        {settings.cooperative && (
          <div className="scoreboard">
            {settings.groups.map((name, i) => (
              <span key={i}>
                {name} ⭐ {scores[i]}
              </span>
            ))}
          </div>
        )}
        {resultError && (
          <div role="alert" className="warning">
            {resultError}
            <button
              onClick={async () => {
                try {
                  await onFinish(reportRef.current!)
                  setResultError('')
                } catch {
                  setResultError('保存仍然失败，请导出备份。')
                }
              }}
            >
              重试保存
            </button>
          </div>
        )}
        <div className="actions">
          <button className="primary" onClick={() => restart()}>
            重新开始
          </button>
          <button
            disabled={!review.length}
            onClick={() =>
              restart(queue.filter((item) => review.some((o) => o.questionId === item.id)))
            }
          >
            错题再练
          </button>
          <button onClick={onExit}>返回游戏中心</button>
        </div>
      </section>
    )
  let displayChoices = choices
  if (game === 'mole') {
    const offset = moleTick % choices.length
    displayChoices = [...choices.slice(offset), ...choices.slice(0, offset)]
  }
  const Scene = sceneRegistry[game]
  return (
    <section
      className={`game-shell game-${game}`}
      style={
        {
          '--game-color': gameInfo.color,
          '--animation-speed': `${1 / settings.animation}s`,
        } as React.CSSProperties
      }
    >
      <div className="game-top">
        <button onClick={onExit}>← 退出课堂</button>
        <span>
          {gameInfo.icon} {gameInfo.name}
        </span>
        <span>
          {index + 1} / {queue.length}
        </span>
        <button onClick={() => setPaused((p) => !p)}>{paused ? '继续' : '暂停'}</button>
      </div>
      <AdventureTrail
        game={game}
        stars={earnedStars(
          outcomes.filter((o) => o.questionId !== q.id),
          solved,
        )}
        total={queue.length}
      />
      <div className="task">
        <span className="eyebrow">{q.knowledge}</span>
        <h1>{q.prompt}</h1>
        {settings.seconds > 0 && (
          <p className="timer">
            {remaining ? `剩余 ${remaining} 秒` : '时间到了，教师可以继续教学或手动跳过。'}
          </p>
        )}
      </div>
      {paused ? (
        <div className="paused">
          <span>☁️</span>
          <h2>休息一下，准备好再出发</h2>
          <button className="primary" onClick={() => setPaused(false)}>
            继续课堂
          </button>
        </div>
      ) : (
        <>
          <Scene
            key={q.id + retryKey}
            q={q}
            solved={solved}
            choices={displayChoices}
            answer={answer}
            index={index}
            total={queue.length}
            completedIndices={queue.flatMap((item, i) =>
              outcomes.some((o) => o.questionId === item.id && o.status === 'correct') ||
              (i === index && solved)
                ? [i]
                : [],
            )}
            order={order}
            setOrder={setOrder}
            inspection={inspection}
            setInspection={setInspection}
            readIndex={readIndex}
            setReadIndex={setReadIndex}
            autoRead={autoRead}
            readingSegments={chars}
            setAutoRead={setAutoRead}
            onReadComplete={() => {
              setSolved(true)
              setAttempts(1)
              setAutoRead(false)
              setFeedback('集体朗读完成！')
            }}
          />
          {q.audio && (
            <button
              onClick={() => {
                audio.current?.pause()
                audio.current = new Audio(q.audio)
                void audio.current
                  .play()
                  .catch(() => setFeedback('本地音频播放失败，请检查文件格式。'))
              }}
            >
              ▶ 播放本地音频
            </button>
          )}
          {settings.showAnswers && (
            <details>
              <summary>教师查看答案</summary>
              {q.type === 'sentence' ? q.explanation : q.answers.join('、') || '教师评价朗读'}
            </details>
          )}
          <div className={`feedback ${solved ? 'success' : ''}`} role="status">
            {solved && <span className="sparkle">✨ </span>}
            {feedback || adventures[game].intro}
            {solved && game !== 'detective' && <small>{q.explanation}</small>}
          </div>
        </>
      )}
      {settings.cooperative && (
        <div className="cooperation">
          <label>
            当前小组{' '}
            <select value={group} onChange={(e) => setGroup(Number(e.target.value))}>
              {settings.groups.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => adjustScore(1)}>⭐ 加1分</button>
          <button onClick={() => adjustScore(-1)}>修正1分</button>
          <button
            disabled={!history.length}
            onClick={() => {
              setScores(history[history.length - 1])
              setHistory((h) => h.slice(0, -1))
            }}
          >
            撤销
          </button>
          <button
            onClick={() => {
              if (confirm('清空本次课堂积分？')) {
                setHistory((h) => [...h, scores])
                setScores(scores.map(() => 0))
              }
            }}
          >
            清空积分
          </button>
          <div className="scoreboard">
            {settings.groups.map((name, i) => (
              <span className={i === group ? 'active' : ''} key={i}>
                {name} ⭐ {scores[i]}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="game-controls">
        <button disabled={index === 0 || paused} onClick={previous}>
          ← 上一题
        </button>
        <button
          disabled={paused}
          onClick={() => {
            setFeedback('')
            setSolved(false)
            setOrder([])
            setRemaining(settings.seconds)
            setReadIndex(-1)
            setAutoRead(false)
            setChoices(prepareChoices(q, game === 'mole' ? settings.holes : q.options.length))
            setMoleTick(0)
            setRetryKey((k) => k + 1)
          }}
        >
          重试本题
        </button>
        <button disabled={paused} onClick={() => next(true)}>
          跳过
        </button>
        <button className="primary" disabled={paused} onClick={() => next()}>
          {index === queue.length - 1 ? '结束本轮' : '下一题 →'}
        </button>
      </div>
    </section>
  )
}
