import type { Question, Lesson, Unit } from './domain'
type Row = [character: string, answer: string, options: string[], parts: string[], tone: number]
const journeys: {
  name: string
  reading: string
  words: [string, string[], string[]][]
  rows: Row[]
}[] = [
  {
    name: 'g k h 山谷站',
    reading: '哥哥唱歌，古树轻摇。\n西瓜甜甜，画笔轻描。',
    words: [
      ['“瓜”的音节中，介母是（　）。', ['u', 'i', 'a'], ['u']],
      ['“画”的音节 huà 是第（　）声。', ['四', '一', '二'], ['四']],
    ],
    rows: [
      ['哥', 'gē', ['gē', 'gé', 'gè'], ['g', 'e', '第一声'], 1],
      ['古', 'gǔ', ['gǔ', 'gū', 'gù'], ['g', 'u', '第三声'], 3],
      ['科', 'kē', ['kē', 'ké', 'kè'], ['k', 'e', '第一声'], 1],
      ['苦', 'kǔ', ['kǔ', 'kū', 'kù'], ['k', 'u', '第三声'], 3],
      ['哈', 'hā', ['hā', 'há', 'hǎ'], ['h', 'a', '第一声'], 1],
      ['喝', 'hē', ['hē', 'hé', 'hè'], ['h', 'e', '第一声'], 1],
      ['瓜', 'guā', ['guā', 'guǎ', 'guà'], ['g', 'u', 'a', '第一声'], 1],
      ['画', 'huà', ['huà', 'huā', 'huǎ'], ['h', 'u', 'a', '第四声'], 4],
    ],
  },
  {
    name: 'j q x 云朵站',
    reading: '小鸡轻叫，小手洗好。\n我爱学习，一起起跑。',
    words: [
      ['j q x 与 ü 相拼，ü 上两点要（　）。', ['省去', '加大', '变三点'], ['省去']],
      ['“洗”在“洗手”中读第（　）声。', ['三', '一', '四'], ['三']],
    ],
    rows: [
      ['鸡', 'jī', ['jī', 'jí', 'jì'], ['j', 'i', '第一声'], 1],
      ['旗', 'qí', ['qí', 'qǐ', 'qì'], ['q', 'i', '第二声'], 2],
      ['洗', 'xǐ', ['xǐ', 'xī', 'xì'], ['x', 'i', '第三声'], 3],
      ['句', 'jù', ['jù', 'jū', 'jú'], ['j', 'ü', '第四声'], 4],
      ['区', 'qū', ['qū', 'qú', 'qǔ'], ['q', 'ü', '第一声'], 1],
      ['学', 'xué', ['xué', 'xuě', 'xuè'], ['x', 'üe', '第二声'], 2],
      ['家', 'jiā', ['jiā', 'jiá', 'jià'], ['j', 'i', 'a', '第一声'], 1],
      ['取', 'qǔ', ['qǔ', 'qū', 'qù'], ['q', 'ü', '第三声'], 3],
    ],
  },
  {
    name: '平翘舌声音站',
    reading: '紫色小花，清晨开了。\n读一读词，数一数十。',
    words: [
      ['z c s 属于（　）声母。', ['平舌', '翘舌', '韵母'], ['平舌']],
      ['zh ch sh r 属于（　）声母。', ['翘舌', '平舌', '韵母'], ['翘舌']],
    ],
    rows: [
      ['紫', 'zǐ', ['zǐ', 'zhǐ', 'zì'], ['z', 'i', '第三声'], 3],
      ['词', 'cí', ['cí', 'chí', 'cì'], ['c', 'i', '第二声'], 2],
      ['四', 'sì', ['sì', 'shì', 'sǐ'], ['s', 'i', '第四声'], 4],
      ['知', 'zhī', ['zhī', 'zī', 'zhì'], ['zh', 'i', '第一声'], 1],
      ['吃', 'chī', ['chī', 'cī', 'chì'], ['ch', 'i', '第一声'], 1],
      ['十', 'shí', ['shí', 'sí', 'shì'], ['sh', 'i', '第二声'], 2],
      ['日', 'rì', ['rì', 'rí', 'rǐ'], ['r', 'i', '第四声'], 4],
      ['早', 'zǎo', ['zǎo', 'zhǎo', 'zào'], ['z', 'ao', '第三声'], 3],
    ],
  },
  {
    name: '复韵母和鼻韵母站',
    reading: '白云飘，美景好。\n小狗回家，树林静悄悄。',
    words: [
      ['“林”的韵母 in 是（　）。', ['前鼻韵母', '后鼻韵母', '声母'], ['前鼻韵母']],
      ['“冬”的韵母 ong 是（　）。', ['后鼻韵母', '前鼻韵母', '声母'], ['后鼻韵母']],
    ],
    rows: [
      ['白', 'bái', ['bái', 'bǎi', 'bài'], ['b', 'ai', '第二声'], 2],
      ['美', 'měi', ['měi', 'méi', 'mèi'], ['m', 'ei', '第三声'], 3],
      ['水', 'shuǐ', ['shuǐ', 'shuì', 'shuí'], ['sh', 'ui', '第三声'], 3],
      ['好', 'hǎo', ['hǎo', 'hào', 'háo'], ['h', 'ao', '第三声'], 3],
      ['狗', 'gǒu', ['gǒu', 'gòu', 'gōu'], ['g', 'ou', '第三声'], 3],
      ['六', 'liù', ['liù', 'liú', 'liǔ'], ['l', 'iu', '第四声'], 4],
      ['林', 'lín', ['lín', 'lìn', 'lǐn'], ['l', 'in', '第二声'], 2],
      ['冬', 'dōng', ['dōng', 'dòng', 'dǒng'], ['d', 'ong', '第一声'], 1],
    ],
  },
]
export function phonicsPack() {
  const unit: Unit = {
    id: 'extra-upper-phonics',
    bookId: 'upper',
    name: '拓展 · 拼音进阶旅行',
    order: 9,
  }
  const lessons: Lesson[] = [],
    questions: Question[] = [],
    stamp = '2026-10-12T00:00:00.000Z'
  journeys.forEach((journey, i) => {
    const lessonId = `extra-upper-phonics-${i}`
    lessons.push({
      id: lessonId,
      unitId: unit.id,
      name: journey.name,
      order: i,
      confirmed: false,
      topic: false,
    })
    const add = (
      key: string,
      q: Partial<Question> &
        Pick<Question, 'type' | 'prompt' | 'options' | 'answers' | 'games' | 'explanation'>,
    ) =>
      questions.push({
        id: `pack2-${lessonId}-${key}`,
        bookId: 'upper',
        versionId: 'pep-2024',
        unitId: unit.id,
        lessonId,
        knowledge: journey.name,
        difficulty: 'normal',
        enabled: true,
        notes: '原创拓展练习，非教材课序；教师按已学音节选用。',
        createdAt: stamp,
        updatedAt: stamp,
        ...q,
      })
    journey.rows.forEach(([character, answer, options, parts, tone], j) => {
      add(`sound-${j}`, {
        type: 'pinyin',
        prompt: `“${character}”的音节是哪一个？`,
        options,
        answers: [answer],
        syllable: answer,
        parts,
        games: ['train'],
        explanation: `这里的“${character}”读 ${answer}。`,
      })
      add(`tone-${j}`, {
        type: 'tone',
        prompt: `${answer} 是第几声？`,
        options: ['1', '2', '3', '4'],
        answers: [String(tone)],
        tone,
        games: ['balloon'],
        explanation: `${answer} 是第${tone}声。`,
      })
    })
    journey.words.forEach(([prompt, options, answers], j) =>
      add(`word-${j}`, {
        type: 'word',
        prompt,
        options,
        answers,
        games: ['bridge'],
        explanation: `正确答案：${answers.join('、')}。`,
        difficulty: 'challenge',
      }),
    )
    add('reading', {
      type: 'reading',
      prompt: `${journey.name}：一起朗读。`,
      options: [],
      answers: [],
      readingText: journey.reading,
      games: ['reading'],
      explanation: '跟着教师读准字音，在标点处适当停顿。',
    })
    add('sentence', {
      type: 'sentence',
      prompt: '小火车到站了，把词语排好队。',
      options: [],
      answers: [],
      tokens: ['我们', '一起', '读准拼音。'],
      orders: [[0, 1, 2]],
      games: ['sentence'],
      explanation: '我们一起读准拼音。',
    })
  })
  return { unit, lessons, questions }
}
