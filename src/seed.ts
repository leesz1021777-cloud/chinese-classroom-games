import { defaultSettings, type Database, type Question } from './domain'
import { upgradeContent } from './content'

// 教材示例目录来自项目委托方提供的2024版课目清单；下册不推测旧版顺序。
const lessonNames = [
  '天地人',
  '金木水火土',
  '口耳目手足',
  '日月山川',
  'a o e',
  'i u ü',
  'b p m f',
  'd t n l',
]
const stamp = '2026-10-12T00:00:00.000Z'
type Seed = Pick<Question, 'type' | 'prompt' | 'options' | 'answers' | 'explanation'> &
  Partial<Question>
const choice = (prompt: string, options: string[], answer: string, explanation: string): Seed => ({
  type: 'choice',
  prompt,
  options,
  answers: [answer],
  explanation,
})
const word = (prompt: string, options: string[], answers: string[], explanation: string): Seed => ({
  type: 'word',
  prompt,
  options,
  answers,
  explanation,
})
const pinyin = (prompt: string, options: string[], answer: string, parts: string[]): Seed => ({
  type: 'pinyin',
  prompt,
  options,
  answers: [answer],
  syllable: answer,
  parts,
  explanation: `正确音节是 ${answer}。请教师领读。`,
})
const tone = (prompt: string, n: number): Seed => ({
  type: 'tone',
  prompt,
  options: ['1', '2', '3', '4'],
  answers: [String(n)],
  tone: n,
  explanation: `这是第${n}声。`,
})
const sentence = (tokens: string[], orders: number[][] = [tokens.map((_, i) => i)]): Seed => ({
  type: 'sentence',
  prompt: '把词语排成一句完整的话。',
  options: [],
  answers: [],
  tokens,
  orders,
  explanation: orders.map((order) => order.map((i) => tokens[i]).join('')).join(' / '),
})
const reading = (text: string): Seed => ({
  type: 'reading',
  prompt: '跟着光点，一起读一读。',
  options: [],
  answers: [],
  readingText: text,
  explanation: '读准字音，遇到标点停一停。',
})
const lessons: Seed[][] = [
  [
    choice('请找到“天”。', ['天', '大', '人', '入', '土', '木'], '天', '“天”的上面有一横。'),
    choice('谁是“地”？', ['地', '他', '也', '土', '日', '目'], '地', '“地”有提土旁。'),
    choice(
      '找到表示人的“人”。',
      ['人', '入', '天', '大', '木', '本'],
      '人',
      '仔细比较“人”和“入”。',
    ),
    choice('找出“你”。', ['你', '他', '地', '人', '天', '也'], '你', '“你”有单人旁。'),
    choice('找到“我”。', ['我', '找', '你', '他', '人', '天'], '我', '仔细观察“我”的字形。'),
    choice('找出“他”。', ['他', '地', '你', '也', '土', '人'], '他', '“他”有单人旁。'),
    word('我和你一起（　）。', ['学习', '石头', '天空'], ['学习'], '“一起学习”是通顺的表达。'),
    sentence(['我', '和你', '一起玩。'], [[0, 1, 2]]),
    reading('你和我，一起学习。\n我们都是好朋友。'),
    pinyin('“人”的拼音是哪一个？', ['rén', 'rèn', 'rān'], 'rén', ['r', 'en', '第二声']),
  ],
  [
    choice('找出“一”。', ['一', '二', '三', '十', '土', '木'], '一', '“一”是一横。'),
    choice('找出“二”。', ['二', '一', '三', '工', '土', '十'], '二', '“二”是两横。'),
    choice('找出“三”。', ['三', '二', '一', '王', '土', '干'], '三', '“三”是三横。'),
    choice('找出“木”。', ['木', '本', '禾', '土', '士', '水'], '木', '“木”和“本”下面不同。'),
    choice('找出“水”。', ['水', '木', '火', '土', '小', '川'], '水', '认真观察“水”的字形。'),
    choice('找出“火”。', ['火', '人', '大', '木', '水', '入'], '火', '观察“火”两边的笔画。'),
    word('一（　）树。', ['棵', '只', '条'], ['棵'], '树可以用“棵”来计量。'),
    word('一（　）小河。', ['条', '棵', '本'], ['条'], '小河可以用“条”来计量。'),
    sentence(['小树', '在风中', '摇摆。']),
    reading('一棵树，两朵花。\n小河旁边是我家。'),
  ],
  [
    choice('请找到“口”。', ['口', '日', '目', '田', '耳', '手'], '口', '“口”中间没有横线。'),
    choice('请找到“耳”。', ['耳', '目', '日', '月', '手', '足'], '耳', '观察“耳”的横和竖。'),
    choice('请找到“目”。', ['目', '日', '口', '月', '田', '耳'], '目', '“目”表示眼睛。'),
    choice('请找到“手”。', ['手', '毛', '禾', '木', '足', '口'], '手', '注意“手”和“毛”的不同。'),
    choice('请找到“足”。', ['足', '走', '口', '手', '目', '耳'], '足', '“足”表示脚。'),
    word('用（　）看花朵。', ['眼睛', '耳朵', '双手'], ['眼睛'], '眼睛帮助我们看东西。'),
    word('用（　）听声音。', ['耳朵', '眼睛', '双脚'], ['耳朵'], '耳朵帮助我们听声音。'),
    sentence(['我', '用双手', '画画。']),
    reading('眼睛看，耳朵听。\n小手轻轻放整齐。'),
    pinyin('“手”的拼音是哪一个？', ['shǒu', 'shòu', 'sǒu'], 'shǒu', ['sh', 'ou', '第三声']),
  ],
  [
    choice('请找到“日”。', ['日', '目', '口', '田', '月', '山'], '日', '“日”中间有一横。'),
    choice('请找到“月”。', ['月', '目', '日', '用', '山', '川'], '月', '观察“月”的外形。'),
    choice('请找到“山”。', ['山', '出', '川', '凹', '木', '土'], '山', '“山”像连在一起的山峰。'),
    choice('请找到“川”。', ['川', '山', '三', '水', '日', '月'], '川', '“川”可以表示河流。'),
    choice('请找到“田”。', ['田', '日', '目', '口', '山', '月'], '田', '“田”中间有横和竖。'),
    word('（　）的月亮。', ['弯弯', '飞快', '热闹'], ['弯弯'], '“弯弯的月亮”很形象。'),
    word(
      '小河（　）流。',
      ['慢慢', '缓缓', '圆圆'],
      ['慢慢', '缓缓'],
      '“慢慢流”和“缓缓流”都通顺。',
    ),
    sentence(['月亮', '挂在', '天空中。']),
    reading('太阳升起，山川明亮。\n小河流过，田野青青。'),
    pinyin('“山”的拼音是哪一个？', ['shān', 'sān', 'shǎn'], 'shān', ['sh', 'an', '第一声']),
  ],
  [
    pinyin('找到韵母 a。', ['a', 'o', 'e'], 'a', ['a']),
    pinyin('找到韵母 o。', ['o', 'a', 'e'], 'o', ['o']),
    pinyin('找到韵母 e。', ['e', 'a', 'o'], 'e', ['e']),
    tone('ā 是第几声？', 1),
    tone('á 是第几声？', 2),
    tone('ǎ 是第几声？', 3),
    tone('à 是第几声？', 4),
    tone('é 是第几声？', 2),
    tone('ǒ 是第几声？', 3),
    reading('张大嘴巴 a a a。\n圆圆嘴巴 o o o。\n扁扁嘴巴 e e e。'),
  ],
  [
    pinyin('找到韵母 i。', ['i', 'u', 'ü'], 'i', ['i']),
    pinyin('找到韵母 u。', ['u', 'ü', 'i'], 'u', ['u']),
    pinyin('找到带两点的韵母 ü。', ['ü', 'u', 'i'], 'ü', ['ü']),
    tone('ǖ 是第几声？', 1),
    tone('ǘ 是第几声？', 2),
    tone('ǚ 是第几声？', 3),
    tone('ǜ 是第几声？', 4),
    reading('小小嘴巴 i i i。\n嘴巴突出 u u u。\n嘴巴吹笛 ü ü ü。'),
  ],
  [
    pinyin('选出 b 的第一声音节。', ['bā', 'bá', 'bǎ'], 'bā', ['b', 'a', '第一声']),
    pinyin('选出 b 的第二声音节。', ['bá', 'bà', 'bā'], 'bá', ['b', 'a', '第二声']),
    pinyin('选出 m 的第三声音节。', ['mǎ', 'mā', 'mà'], 'mǎ', ['m', 'a', '第三声']),
    pinyin('选出 f 的第一声音节。', ['fā', 'fá', 'fǎ'], 'fā', ['f', 'a', '第一声']),
    pinyin('选出 p 的第一声音节。', ['pō', 'pó', 'pò'], 'pō', ['p', 'o', '第一声']),
    pinyin('选出三拼音节 biǎo。', ['biǎo', 'biào', 'bā'], 'biǎo', ['b', 'i', 'ao', '第三声']),
    pinyin('选出三拼音节 piào。', ['piào', 'piāo', 'pò'], 'piào', ['p', 'i', 'ao', '第四声']),
    reading('小猫慢慢跑。\n宝宝拍拍手。'),
  ],
  [
    pinyin('选出 ní。', ['ní', 'nǐ', 'nì'], 'ní', ['n', 'i', '第二声']),
    pinyin('选出 nǚ。', ['nǚ', 'nǔ', 'nù'], 'nǚ', ['n', 'ü', '第三声']),
    pinyin('选出 lǜ。', ['lǜ', 'lù', 'lǔ'], 'lǜ', ['l', 'ü', '第四声']),
    pinyin('选出 lüè。', ['lüè', 'luò', 'lè'], 'lüè', ['l', 'üe', '第四声']),
    pinyin('选出三拼音节 tiān。', ['tiān', 'tián', 'tān'], 'tiān', ['t', 'i', 'an', '第一声']),
    pinyin('选出 duō。', ['duō', 'duó', 'dōu'], 'duō', ['d', 'uo', '第一声']),
    pinyin('选出 liù。', ['liù', 'lì', 'lǜ'], 'liù', ['l', 'iu', '第四声']),
    pinyin('选出 tuǐ。', ['tuǐ', 'tǔ', 'tuì'], 'tuǐ', ['t', 'ui', '第三声']),
  ],
]
export function createLegacySeed(): Database {
  const db: Database = {
    schemaVersion: 2,
    books: [
      {
        id: 'upper',
        versionId: 'pep-2024',
        name: '统编语文一年级上册',
        grade: 1,
        term: '上册',
        version: '2024年修订版',
      },
      {
        id: 'lower',
        versionId: 'pep-2024',
        name: '统编语文一年级下册',
        grade: 1,
        term: '下册',
        version: '2024年修订版',
      },
    ],
    units: [
      { id: 'welcome', bookId: 'upper', name: '我上学了', order: 0 },
      { id: 'literacy', bookId: 'upper', name: '第一单元 · 识字', order: 1 },
      { id: 'phonics', bookId: 'upper', name: '第二单元 · 汉语拼音', order: 2 },
      { id: 'lower-pending', bookId: 'lower', name: '待教师确认的目录', order: 0 },
    ],
    lessons: [
      {
        id: 'welcome',
        unitId: 'welcome',
        name: '我上学了',
        order: 0,
        confirmed: true,
        topic: false,
      },
      ...lessonNames.map((name, i) => ({
        id: `lesson-${i}`,
        unitId: i < 4 ? 'literacy' : 'phonics',
        name,
        order: i,
        confirmed: true,
        topic: false,
      })),
      {
        id: 'lower-pending',
        unitId: 'lower-pending',
        name: '请教师补充新版课目',
        order: 0,
        confirmed: false,
        topic: false,
      },
    ],
    questions: [],
    settings: structuredClone(defaultSettings),
    results: [],
  }
  lessons.forEach((items, lessonIndex) =>
    items.forEach((item, i) => {
      const gameMap: Record<Question['type'], Question['games']> = {
        choice: ['mole', 'detective'],
        pinyin: ['train'],
        tone: ['balloon'],
        word: ['bridge'],
        sentence: ['sentence'],
        reading: ['reading'],
      }
      db.questions.push({
        id: `demo-${lessonIndex}-${i}`,
        versionId: 'pep-2024',
        bookId: 'upper',
        unitId: lessonIndex < 4 ? 'literacy' : 'phonics',
        lessonId: `lesson-${lessonIndex}`,
        knowledge: '一年级基础练习',
        difficulty: 'easy',
        games: gameMap[item.type],
        notes: '原创课堂示例；教师可按实际教学修改。',
        enabled: true,
        createdAt: stamp,
        updatedAt: stamp,
        ...item,
      })
    }),
  )
  return db
}
export function createSeed(): Database {
  return { ...upgradeContent(createLegacySeed()).db, rosters: [] }
}
