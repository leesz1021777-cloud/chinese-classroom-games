import { adventures, adventureStage } from '../adventure'
import type { GameId } from '../domain'
export function AdventureTrail({
  game,
  stars,
  total,
}: {
  game: GameId
  stars: number
  total: number
}) {
  const story = adventures[game],
    stage = adventureStage(stars, total)
  return (
    <div className="adventure-trail">
      <div className="adventure-name">
        <span>{story.buddy}</span>
        <div>
          <strong>{story.name}</strong>
          <small>{story.stops[stage]}</small>
        </div>
      </div>
      <div className="journey-stops" aria-label="闯关进度">
        {story.stops.map((name, i) => (
          <span className={i <= stage ? 'reached' : ''} title={name} key={name}>
            {i === stage ? story.buddy : i < stage ? '✿' : '○'}
          </span>
        ))}
      </div>
      <span className="star-counter" aria-label={`已收集${stars}颗星星`}>
        ⭐ {stars} / {total}
      </span>
    </div>
  )
}
export function RewardGarden({
  game,
  stars,
  total,
}: {
  game: GameId
  stars: number
  total: number
}) {
  const story = adventures[game]
  return (
    <div className="reward-garden">
      <div className="flower-medal">
        <span>{story.buddy}</span>
        <strong>{story.reward}</strong>
      </div>
      <div>
        <h2>紫藤花又长大了一点！</h2>
        <p>
          一起收集了 {stars} 颗学习星星。
          {stars === total ? '这条探险路线已经点亮啦！' : '再练一练易错题，就能点亮更多花瓣。'}
        </p>
        <div className="reward-petals">
          {Array.from({ length: 5 }, (_, i) => (
            <span className={i < Math.ceil((stars / Math.max(1, total)) * 5) ? 'lit' : ''} key={i}>
              ✿
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
