import { useEffect, useRef, useState } from 'react'
import { games, type Database, type GameId, type Question } from './domain'
import { createStore, type Store } from './storage'
import { validateBackup } from './services'
import Game from './components/Game'
import Setup from './components/Setup'
import Bank from './components/Bank'
import Classroom from './components/Classroom'
import RandomPicker from './components/RandomPicker'
import LearningMap from './components/LearningMap'
import './App.css'
import './enrichment.css'

type Page = 'home' | 'setup' | 'games' | 'bank' | 'classroom' | 'picker'
const nav = [
  { id: 'home', name: '首页', icon: '⌂' },
  { id: 'setup', name: '开始课堂', icon: '✦' },
  { id: 'games', name: '游戏乐园', icon: '◈' },
  { id: 'bank', name: '教师题库', icon: '▤' },
  { id: 'classroom', name: '我的课堂', icon: '☀' },
  { id: 'picker', name: '随机点名', icon: '✿' },
] as const
export default function App() {
  const [db, setDb] = useState<Database | null>(null),
    [store, setStore] = useState<Store | null>(null),
    [error, setError] = useState(''),
    [saveStatus, setSaveStatus] = useState('')
  const [page, setPage] = useState<Page>('home'),
    [selectedGame, setSelectedGame] = useState<GameId>('mole'),
    [session, setSession] = useState<{ game: GameId; questions: Question[] } | null>(null),
    [preview, setPreview] = useState<Question | null>(null)
  const [selectedUnit, setSelectedUnit] = useState('')
  const pending = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => {
    let active = true
    void createStore()
      .then(async (s) => {
        const data = await s.load()
        if (active) {
          setStore(s)
          setDb(data)
        }
      })
      .catch((e) => {
        if (active) setError(`无法加载题库：${String(e)}`)
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    const handle = (event: BeforeUnloadEvent) => {
      if (saveStatus === '正在保存…') {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handle)
    return () => window.removeEventListener('beforeunload', handle)
  }, [saveStatus])
  async function save(next: Database) {
    if (!store) throw new Error('存储尚未就绪')
    const valid = validateBackup(next)
    setSaveStatus('正在保存…')
    const operation = pending.current
      .catch(() => {})
      .then(async () => {
        await store.save(valid)
        setDb(valid)
        setSaveStatus(store.mode === '内存' ? '已保存到内存，请导出备份' : '已自动保存')
      })
    pending.current = operation
    try {
      await operation
    } catch (e) {
      setSaveStatus('保存失败，请重试或导出备份')
      throw e
    }
  }
  function openSetup(game: GameId = 'mole', unitId = '') {
    setSelectedGame(game)
    setSelectedUnit(unitId)
    setPage('setup')
  }
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else
      void document.documentElement
        .requestFullscreen()
        .catch(() => setError('此浏览器无法进入页面全屏，请使用 F11。'))
  }
  if (!db || !store)
    return (
      <div className="loading">
        <div className="brand-orbit">✦</div>
        <h1>紫藤花语文游戏中心</h1>
        <p role="status">{error || '正在准备课堂题库…'}</p>
        {error && <button onClick={() => location.reload()}>重新加载</button>}
      </div>
    )
  return (
    <div className={`app theme-${db.settings.theme} ${session ? 'class-mode' : ''}`}>
      {!session && (
        <aside className="sidebar">
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault()
              setPage('home')
            }}
          >
            <span className="brand-orbit">✦</span>
            <div>
              紫藤花<span>语文游戏中心</span>
            </div>
          </a>
          <div className="nav-label">课堂小天地</div>
          <nav>
            {nav.map((item) => (
              <button
                aria-label={item.name}
                className={page === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => {
                  setPage(item.id)
                  if (item.id === 'setup') setSelectedUnit('')
                }}
              >
                <span>{item.icon}</span>
                {item.name}
                {item.id === 'setup' && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="offline-badge">
              <span />
              离线也能快乐学习
            </div>
            <p>
              一年级 · 统编语文
              <br />
              2024年修订版示例
            </p>
            <small>不上传名单或课堂数据</small>
          </div>
        </aside>
      )}
      <div className="main-wrap">
        <header className="topbar">
          <div>
            <span className="breadcrumb">
              {session ? '课堂展示' : nav.find((n) => n.id === page)?.name}
            </span>
            <span className="top-hint">每一次探索，都是一点进步</span>
          </div>
          <div className="top-actions">
            <span className="storage-status" title={store.warning}>
              {store.mode} · {saveStatus || '题库就绪'}
            </span>
            <button
              aria-label={db.settings.volume ? '静音' : '开启音效'}
              onClick={() => {
                void save({
                  ...db,
                  settings: { ...db.settings, volume: db.settings.volume ? 0 : 0.3 },
                }).catch(() => setError('音量设置保存失败'))
              }}
            >
              {db.settings.volume ? '🔔' : '🔕'}
            </button>
            <button onClick={fullscreen}>⛶ 全屏</button>
          </div>
        </header>
        {(store.warning || location.protocol === 'file:' || error) && (
          <div className="global-warning" role="alert">
            {error ||
              store.warning ||
              '单文件模式的存储可靠性取决于浏览器。请定期导出备份，推荐使用本地 HTTP 运行。'}
            {error && <button onClick={() => setError('')}>关闭提示</button>}
          </div>
        )}
        <main>
          {!session && (store.contentAdded ?? 0) > 0 && (
            <div className="readiness content-upgrade">
              新版已添加 {store.contentAdded} 道原创拓展练习，原有教师题目、停用状态和设置已保留。
            </div>
          )}
          {session ? (
            <Game
              key={session.questions.map((q) => q.id).join('-') + session.game}
              {...session}
              settings={db.settings}
              onExit={() => {
                setSession(null)
                setPage('games')
              }}
              onFinish={(r) =>
                save({
                  ...db,
                  results: [...db.results.filter((old) => old.id !== r.id), r].slice(-100),
                })
              }
            />
          ) : (
            <>
              {page === 'home' && (
                <>
                  <div className="welcome-line">
                    <span className="eyebrow">你好，老师！</span>
                    <span className="date-tag">✿ 今天也一起快乐学习</span>
                  </div>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="hero-tag">小小课堂，大大宇宙</span>
                      <h1>
                        让语文课堂
                        <br />
                        变成一场<span>快乐探险</span>
                      </h1>
                      <p>
                        认汉字、拼拼音、读句子。
                        <br />
                        用孩子喜欢的方式，点亮每一份好奇心。
                      </p>
                      <button className="primary large" onClick={() => openSetup()}>
                        ✦ 开始今天的课堂 <span>→</span>
                      </button>
                      <small>无需登录 · 全程离线 · 老师掌握节奏</small>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="art-sun">☀</div>
                      <div className="cloud cloud-a" />
                      <div className="cloud cloud-b" />
                      <span className="art-star star-a">✧</span>
                      <span className="art-star star-b">✦</span>
                      <div className="planet">
                        <div className="planet-ring" />
                        <span>语</span>
                      </div>
                      <div className="floating-card card-a">
                        天<small>tiān</small>
                      </div>
                      <div className="floating-card card-b">a o e</div>
                      <div className="floating-card card-c">
                        人<small>rén</small>
                      </div>
                      <div className="art-ground">
                        <span>🌱</span>
                        <span>🌼</span>
                        <span>🌱</span>
                      </div>
                      <div className="art-buddy">
                        🐻<span>一起出发吧！</span>
                      </div>
                    </div>
                  </section>
                  <div className="quick-grid">
                    <button onClick={() => setPage('games')}>
                      <span className="quick-icon purple">🎮</span>
                      <div>
                        <h3>游戏乐园</h3>
                        <p>7种玩法，学习不重样</p>
                      </div>
                      <span>↗</span>
                    </button>
                    <button onClick={() => setPage('bank')}>
                      <span className="quick-icon green">📚</span>
                      <div>
                        <h3>教师题库管理</h3>
                        <p>{db.questions.length}道题，随时添加与备份</p>
                      </div>
                      <span>↗</span>
                    </button>
                    <button onClick={() => setPage('classroom')}>
                      <span className="quick-icon peach">🌟</span>
                      <div>
                        <h3>我的课堂</h3>
                        <p>课堂设置与合作成长记录</p>
                      </div>
                      <span>↗</span>
                    </button>
                    <button onClick={() => setPage('picker')}>
                      <span className="quick-icon purple">🌸</span>
                      <div>
                        <h3>随机点名器</h3>
                        <p>导入名单，本轮不重复登场</p>
                      </div>
                      <span>↗</span>
                    </button>
                  </div>
                  <LearningMap db={db} onChoose={(unitId, game) => openSetup(game, unitId)} />
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">玩着学，学着玩</span>
                      <h2>今天，想探索什么？</h2>
                    </div>
                    <button className="text-button" onClick={() => setPage('games')}>
                      全部游戏 →
                    </button>
                  </div>
                  <div className="game-cards">
                    {games.slice(0, 3).map((g) => (
                      <GameCard key={g.id} game={g} onClick={() => openSetup(g.id)} />
                    ))}
                  </div>
                  <div className="tip-strip">
                    <span>💡</span>
                    <div>
                      <strong>给老师的小提示</strong>
                      <p>先选课文，再挑游戏。题目自动筛选，让备课轻松一点。</p>
                    </div>
                    <button onClick={() => setPage('bank')}>看看示例题库 →</button>
                  </div>
                </>
              )}
              {page === 'games' && (
                <>
                  <span className="eyebrow">每个孩子，都有自己的闪光时刻</span>
                  <h1>游戏乐园</h1>
                  <p className="page-intro">七种课堂小冒险，认识一个更有趣的语文世界。</p>
                  <div className="game-cards all-games">
                    {games.map((g) => (
                      <GameCard key={g.id} game={g} onClick={() => openSetup(g.id)} />
                    ))}
                  </div>
                </>
              )}
              {page === 'setup' && (
                <Setup
                  key={selectedGame + selectedUnit}
                  db={db}
                  initialGame={selectedGame}
                  initialUnit={selectedUnit}
                  onBank={() => setPage('bank')}
                  onStart={(game, questions) => setSession({ game, questions })}
                />
              )}
              {page === 'bank' && <Bank db={db} save={save} onPreview={setPreview} />}
              {page === 'classroom' && <Classroom db={db} save={save} />}
              {page === 'picker' && <RandomPicker db={db} save={save} />}
            </>
          )}
        </main>
        {!session && (
          <footer>
            ✦ 紫藤花语文游戏中心 <span>把每一份好奇心，变成成长的星光。</span>
          </footer>
        )}
      </div>
      {preview && (
        <div className="modal-backdrop preview-modal">
          <div className="preview-box" role="dialog" aria-modal="true" aria-label="游戏预览">
            <div className="preview-label">教师预览 · 不计入课堂记录</div>
            <Game
              key={preview.id}
              game={preview.games[0]}
              questions={[preview]}
              settings={{ ...db.settings, cooperative: false }}
              onExit={() => setPreview(null)}
              onFinish={async () => {}}
            />
          </div>
        </div>
      )}
    </div>
  )
}
function GameCard({ game, onClick }: { game: (typeof games)[number]; onClick: () => void }) {
  return (
    <article className="game-card" style={{ '--card-color': game.color } as React.CSSProperties}>
      <div className={`game-card-art art-${game.id}`} aria-hidden="true">
        <span className="scene-dot d1" />
        <span className="scene-dot d2" />
        <span className="scene-star">✦</span>
        <span className="game-emoji">{game.icon}</span>
        {game.id === 'mole' && (
          <>
            <span className="tiny-character">木</span>
            <span className="tiny-character second">天</span>
          </>
        )}
        {game.id === 'train' && (
          <div className="mini-cars">
            <span>b</span>
            <span>ā</span>
          </div>
        )}
        {game.id === 'balloon' && <span className="tiny-character">ǎ</span>}
      </div>
      <div className="game-card-body">
        <span className="game-goal">{game.goal}</span>
        <h3>{game.name}</h3>
        <p>{game.description}</p>
        <button onClick={onClick}>
          开始游戏 <span>→</span>
        </button>
      </div>
    </article>
  )
}
