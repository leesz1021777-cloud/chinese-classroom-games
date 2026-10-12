import type { GameId, Outcome } from './domain'

export const adventures: Record<
  GameId,
  { name: string; buddy: string; stops: string[]; reward: string; intro: string }
> = {
  mole: {
    name: '蘑菇森林寻字记',
    buddy: '🐹',
    stops: ['森林入口', '蘑菇小屋', '大树广场', '花瓣小径', '森林宝箱'],
    reward: '森林识字章',
    intro: '找对汉字，邀请地鼠朋友为紫藤花收集星星。',
  },
  train: {
    name: '紫藤花拼音专列',
    buddy: '🚂',
    stops: ['紫藤花站', '风车站', '云朵站', '彩虹站', '星光终点'],
    reward: '拼音小司机章',
    intro: '每读准一个音节，就让小火车向下一站前进。',
  },
  balloon: {
    name: '声调天空旅行',
    buddy: '🎈',
    stops: ['草地起飞', '云朵之间', '彩虹桥边', '星星附近', '天空花园'],
    reward: '声调小飞行员章',
    intro: '找到正确声调，让气球带着星星飞向天空。',
  },
  detective: {
    name: '紫藤花汉字侦探社',
    buddy: '🦉',
    stops: ['领取案卷', '观察字形', '寻找线索', '收集证物', '发现真相'],
    reward: '细心小侦探章',
    intro: '观察细节，找到目标汉字，再领取自己的证物印章。',
  },
  bridge: {
    name: '小兔送信搭桥记',
    buddy: '🐰',
    stops: ['河边出发', '第一块木板', '河心小岛', '岸边花丛', '送信到家'],
    reward: '词语小桥梁章',
    intro: '选对通顺的词语，为小兔补上真正完成的桥板。',
  },
  sentence: {
    name: '词语小队去郊游',
    buddy: '🧩',
    stops: ['整理背包', '集合排队', '树林散步', '分享故事', '快乐合影'],
    reward: '句子小导演章',
    intro: '让词语小队站好位置，说出完整又通顺的话。',
  },
  reading: {
    name: '紫藤花朗读音乐会',
    buddy: '📖',
    stops: ['准备登台', '教师领读', '轻声跟读', '伙伴接龙', '全班合读'],
    reward: '朗读小歌手章',
    intro: '用自己的节奏，读准字音，在标点处轻轻停一停。',
  },
}
export function earnedStars(outcomes: Outcome[], currentSolved = false) {
  return outcomes.filter((o) => o.status === 'correct').length + (currentSolved ? 1 : 0)
}
export function adventureStage(stars: number, total: number) {
  return Math.min(4, Math.floor((stars / Math.max(1, total)) * 5))
}
