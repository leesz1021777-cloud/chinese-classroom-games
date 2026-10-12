import { useState } from 'react'
import { games, type Database, type Settings } from '../domain'

export default function Classroom({
  db,
  save,
}: {
  db: Database
  save: (db: Database) => Promise<void>
}) {
  const [settings, setSettings] = useState<Settings>(structuredClone(db.settings)),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
    setMessage('设置尚未保存')
  }
  return (
    <section className="panel">
      <span className="eyebrow">让课堂，按自己的节奏</span>
      <h1>我的课堂</h1>
      <div className="form-grid settings">
        <label>
          主题皮肤
          <select
            value={settings.theme}
            onChange={(e) => set('theme', e.target.value as Settings['theme'])}
          >
            <option value="sky">晴空蓝</option>
            <option value="lavender">浅浅紫</option>
            <option value="cream">奶油黄</option>
          </select>
        </label>
        <label>
          音量（0 为静音）
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.volume}
            onChange={(e) => set('volume', Number(e.target.value))}
          />
          <small>当前 {Math.round(settings.volume * 100)}%；音效由本机合成。</small>
        </label>
        <label>
          动画速度
          <select
            value={settings.animation}
            onChange={(e) => set('animation', Number(e.target.value))}
          >
            <option value="0.5">舒缓</option>
            <option value="1">普通</option>
            <option value="2">轻快</option>
          </select>
        </label>
        <label>
          每题答题时间（秒，0 为无计时）
          <input
            type="number"
            min="0"
            max="300"
            value={settings.seconds}
            onChange={(e) => set('seconds', Number(e.target.value))}
          />
          <small>时间到仅提醒，不自动跳题。</small>
        </label>
        <label>
          地鼠数量
          <select value={settings.holes} onChange={(e) => set('holes', Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} 个
              </option>
            ))}
          </select>
        </label>
        <label>
          地鼠换位间隔（毫秒）
          <input
            type="number"
            min="500"
            max="10000"
            step="500"
            value={settings.moleSpeed}
            onChange={(e) => set('moleSpeed', Number(e.target.value))}
          />
        </label>
        <label>
          逐字朗读间隔（毫秒）
          <input
            type="number"
            min="100"
            max="2000"
            step="50"
            value={settings.readingSpeed}
            onChange={(e) => set('readingSpeed', Number(e.target.value))}
          />
        </label>
        <label>
          朗读高亮单位
          <select
            value={settings.readingUnit}
            onChange={(e) => set('readingUnit', e.target.value as Settings['readingUnit'])}
          >
            <option value="char">逐字</option>
            <option value="word">逐词（题目需配置分段，否则逐字）</option>
          </select>
        </label>
        <label>
          逗号停顿（毫秒）
          <input
            type="number"
            min="0"
            max="3000"
            step="100"
            value={settings.pauseComma}
            onChange={(e) => set('pauseComma', Number(e.target.value))}
          />
        </label>
        <label>
          句末停顿（毫秒）
          <input
            type="number"
            min="0"
            max="5000"
            step="100"
            value={settings.pauseEnd}
            onChange={(e) => set('pauseEnd', Number(e.target.value))}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.showAnswers}
            onChange={(e) => set('showAnswers', e.target.checked)}
          />
          显示可展开的教师答案
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.cooperative}
            onChange={(e) => set('cooperative', e.target.checked)}
          />
          开启合作小组计分
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.rotate}
            onChange={(e) => set('rotate', e.target.checked)}
          />
          下一题自动轮换小组
        </label>
        <label>
          小组数量（4—10）
          <select
            value={settings.groups.length}
            onChange={(e) =>
              set(
                'groups',
                Array.from(
                  { length: Number(e.target.value) },
                  (_, i) => settings.groups[i] ?? `第${i + 1}组`,
                ),
              )
            }
          >
            {[4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          全屏模式
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen()
              else
                void document.documentElement
                  .requestFullscreen()
                  .catch(() => setMessage('此浏览器不支持页面全屏，请使用 F11。'))
            }}
          >
            切换全屏
          </button>
        </label>
      </div>
      <div className="group-inputs">
        {settings.groups.map((name, i) => (
          <label key={i}>
            第{i + 1}组名称
            <input
              value={name}
              onChange={(e) =>
                set(
                  'groups',
                  settings.groups.map((n, j) => (j === i ? e.target.value : n)),
                )
              }
            />
          </label>
        ))}
      </div>
      <div className="actions">
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await save({ ...db, settings })
              setMessage('课堂设置已保存')
            } catch (e) {
              setMessage(`保存失败：${e instanceof Error ? e.message : '请重试'}`)
            } finally {
              setBusy(false)
            }
          }}
        >
          保存课堂设置
        </button>
        <span role="status">{message}</span>
      </div>
      <div className="shortcut-box">
        <h3>课堂快捷键</h3>
        <p>
          <kbd>F11</kbd> 浏览器全屏 · <kbd>Esc</kbd> 退出课堂 / 全屏 · <kbd>←</kbd>
          <kbd>→</kbd> 切题 · <kbd>空格</kbd> 暂停 / 继续
        </p>
        <p>
          所有按钮都支持 Tab 定位、Enter
          或空格操作。句子卡片也可点击并用移动按钮排序。快捷键在输入框内不触发。
        </p>
      </div>
      <h2>课堂表现汇总</h2>
      <p className="muted">只记录题目与小组分数，不记录学生身份。保留最近 100 轮课堂。</p>
      {db.results.length ? (
        <div className="history">
          {[...db.results].reverse().map((r) => (
            <article key={r.id}>
              <h3>{games.find((g) => g.id === r.game)?.name}</h3>
              <small>{new Date(r.date).toLocaleString('zh-CN')}</small>
              <p>
                答题 {r.outcomes.length} · 答对{' '}
                {r.outcomes.filter((o) => o.status === 'correct').length} · 待巩固{' '}
                {r.outcomes.filter((o) => o.status !== 'correct' || o.attempts > 1).length}
              </p>
              <details>
                <summary>查看本轮题目与小组积分</summary>
                {r.outcomes.map((o) => (
                  <p key={o.questionId}>
                    {o.prompt} ·{' '}
                    {o.status === 'correct' ? '答对' : o.status === 'wrong' ? '待巩固' : '跳过'} ·
                    尝试 {o.attempts} 次
                  </p>
                ))}
                <p>
                  {r.scores
                    .map((n, i) => `${r.groupNames?.[i] ?? `第${i + 1}组`}：${n}`)
                    .join(' / ')}
                </p>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">上一堂小小的游戏课，成长记录就会出现在这里。</div>
      )}
    </section>
  )
}
