import type { ComponentType } from 'react'
import type { GameId } from '../domain'
import {
  Mole,
  Pinyin,
  Balloon,
  Detective,
  Bridge,
  Sentence,
  Reading,
  type SceneProps,
} from './scenes'
// 新玩法在这里注册组件；筛题、存储、计分、结果由共享服务负责。
export const sceneRegistry: Record<GameId, ComponentType<SceneProps>> = {
  mole: Mole,
  train: Pinyin,
  balloon: Balloon,
  detective: Detective,
  bridge: Bridge,
  sentence: Sentence,
  reading: Reading,
}
