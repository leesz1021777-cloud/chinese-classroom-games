import { test, expect, type Page } from '@playwright/test'
import { createSeed } from '../../src/seed'
import { games, type GameId } from '../../src/domain'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function home(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /让语文课堂/ })).toBeVisible()
}
async function start(page: Page, game: GameId, lesson = 'lesson-0', count = 1) {
  await page.getByRole('button', { name: '开始课堂', exact: true }).click()
  await page
    .getByRole('combobox', { name: '单元', exact: true })
    .selectOption(lesson === 'lesson-4' ? 'phonics' : 'literacy')
  await page.getByRole('combobox', { name: '课文', exact: true }).selectOption(lesson)
  await page.getByRole('combobox', { name: '课堂游戏', exact: true }).selectOption(game)
  await page.getByLabel('自定义题量').fill(String(count))
  await page.getByRole('button', { name: '出发，开始游戏 →' }).click()
  await expect(page.locator('.game-shell')).toBeVisible()
}
test('首次启动、响应式布局与全部首页菜单', async ({ page }) => {
  await home(page)
  await expect(page.locator('.storage-status')).toContainText('IndexedDB')
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.getByRole('button', { name: '游戏乐园', exact: true }).click()
  await expect(page.locator('.game-card')).toHaveCount(7)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await expect(page.locator('.question-row')).toHaveCount(490)
  await page.getByRole('button', { name: '我的课堂', exact: true }).click()
  await expect(page.getByRole('heading', { name: '课堂表现汇总' })).toBeVisible()
})
for (const game of games)
  test(`${game.name}：错误、正确判断与课堂结束`, async ({ page }) => {
    await home(page)
    const lesson = game.id === 'balloon' ? 'lesson-4' : 'lesson-0'
    await start(page, game.id, lesson)
    const prompt = await page.locator('.task h1').innerText(),
      q = createSeed().questions.find(
        (q) => q.prompt === prompt && q.lessonId === lesson && q.games.includes(game.id),
      )!
    if (game.id === 'reading') {
      await page.getByRole('button', { name: '逐字 / 词前进' }).click()
      await expect(page.locator('.reading-active')).toHaveCount(1)
      await page.getByRole('button', { name: '逐句前进' }).click()
      await page.getByRole('button', { name: '重播' }).click()
      await expect(page.locator('.reading-active')).toHaveCount(0)
      await page.getByRole('button', { name: '标记朗读完成' }).click()
    } else if (game.id === 'sentence') {
      const reversed = q.tokens!.map((_, i) => i).reverse()
      for (const n of reversed)
        await page
          .locator('.token-bank')
          .getByRole('button', { name: q.tokens![n], exact: true })
          .click()
      await page.getByRole('button', { name: '检查答案' }).click()
      await expect(page.getByRole('status')).toContainText('再观察')
      await page.getByRole('button', { name: '重新排列' }).click()
      for (const n of q.orders![0])
        await page
          .locator('.token-bank')
          .getByRole('button', { name: q.tokens![n], exact: true })
          .click()
      await page.getByRole('button', { name: '检查答案' }).click()
    } else if (game.id === 'balloon') {
      await page
        .getByRole('button', { name: `选择第${q.tone === 1 ? 2 : 1}声`, exact: true })
        .click()
      await expect(page.getByRole('status')).toContainText('再观察')
      await page.getByRole('button', { name: `选择第${q.tone}声`, exact: true }).click()
    } else {
      const wrong = q.options.find((o) => !q.answers.includes(o))!
      await page
        .locator('.answer-grid')
        .getByRole('button', { name: wrong, exact: game.id !== 'mole' })
        .click()
      await expect(page.getByRole('status')).toContainText('再观察')
      await page
        .locator('.answer-grid')
        .getByRole('button', { name: q.answers[0], exact: game.id !== 'mole' })
        .click()
      if (game.id === 'detective') {
        await page.getByRole('button', { name: '放大观察字形', exact: false }).click()
        await expect(page.locator('.magnifier')).toBeVisible()
      }
    }
    if (game.id === 'mole') {
      for (const viewport of [
        { width: 1366, height: 768 },
        { width: 1920, height: 1080 },
      ]) {
        await page.setViewportSize(viewport)
        const controls = await page.locator('.game-controls').boundingBox()
        expect(controls!.y + controls!.height).toBeLessThanOrEqual(viewport.height)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
      }
    }
    await expect(page.locator('.feedback')).toContainText(
      game.id === 'reading' ? '集体朗读完成' : '太棒了',
    )
    await page.getByRole('button', { name: '结束本轮' }).click()
    await expect(page.getByRole('heading', { name: '本轮探险完成！' })).toBeVisible()
    await expect(page.locator('.results')).toContainText('答对 1 题')
    if (game.id !== 'reading') {
      await page.getByRole('button', { name: '错题再练' }).click()
      await expect(page.locator('.task')).toBeVisible()
    }
  })
test('题目新增、编辑、预览、持久化并立即用于游戏', async ({ page }) => {
  await home(page)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByRole('button', { name: '＋ 添加题目' }).click()
  await page.getByRole('combobox', { name: '所属课文', exact: true }).selectOption('lesson-0')
  await page.getByLabel('题目内容', { exact: true }).fill('找到测试汉字：日。')
  await page.getByLabel('答案选项', { exact: false }).fill('日\n目\n口')
  await page.getByLabel('正确答案', { exact: false }).fill('日')
  await page.getByRole('button', { name: '预览游戏', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '游戏预览' })).toBeVisible()
  await page.getByRole('button', { name: '退出课堂', exact: false }).click()
  await page.getByRole('button', { name: '保存题目', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '添加题目' })).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByPlaceholder('题目、知识点、备注').fill('找到测试汉字')
  await expect(page.locator('.question-row')).toHaveCount(1)
  await page.locator('.question-row').getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByLabel('答题反馈 / 知识卡片').fill('测试解析')
  await page.getByRole('button', { name: '保存题目', exact: true }).click()
  await start(page, 'mole', 'lesson-0', 500)
  await expect(page.locator('.game-top')).toContainText('1 / 7')
})
test('JSON往返、非法导入保护、CSV映射与预览确认', async ({ page }) => {
  test.setTimeout(60000)
  await home(page)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出全部备份' }).click()
  const file = await download
  const data = JSON.parse(await readFile((await file.path())!, 'utf8'))
  expect(data.questions).toHaveLength(490)
  await page.getByLabel('导入题库文件').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await expect(page.getByRole('dialog', { name: '导入备份' })).toContainText('更新 490')
  await page.getByRole('button', { name: '确认导入', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('备份导入成功')
  await page.getByLabel('导入题库文件').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ ...data, questions: [...data.questions, data.questions[0]] }),
    ),
  })
  await expect(page.getByRole('alert')).toContainText('重复ID')
  await expect(page.locator('.question-row')).toHaveCount(490)
  await page.getByLabel('导入题库文件').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('prompt,type,options,answers\n找出ü,pinyin,ü|u,ü'),
  })
  await page.getByRole('button', { name: '校验并预览' }).click()
  await expect(page.getByRole('dialog', { name: 'CSV字段映射' })).toContainText('错误 1 行')
  await expect(page.getByRole('button', { name: '确认导入', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByLabel('导入题库文件').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('prompt,type,options,answers\n找到土,choice,土|士,土'),
  })
  await page.getByRole('button', { name: '校验并预览' }).click()
  await page.getByRole('button', { name: '确认导入', exact: true }).click()
  await expect(page.locator('.question-row')).toHaveCount(491)
})
test('目录专题、批量复制、停用删除与范围导出', async ({ page }) => {
  await home(page)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByRole('button', { name: '教材与专题目录', exact: false }).click()
  await page.getByLabel('名称', { exact: true }).fill('复习小天地')
  await page.getByLabel('新课目作为专题题库').check()
  await page.getByRole('button', { name: '添加课文 / 专题' }).click()
  await expect(page.locator('.catalog-list')).toContainText('复习小天地')
  await page.getByRole('button', { name: '完成', exact: true }).click()
  await page.getByRole('combobox', { name: '课文', exact: true }).selectOption('lesson-0')
  await page.getByRole('checkbox', { name: '选择当前筛选全部', exact: false }).check()
  const topic = await page
    .getByRole('combobox', { name: '批量目标题库', exact: true })
    .locator('option')
    .filter({ hasText: '复习小天地' })
    .getAttribute('value')
  await page.getByRole('combobox', { name: '批量目标题库', exact: true }).selectOption(topic!)
  await page.getByRole('button', { name: '复制到', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('已复制')
  await page.getByRole('combobox', { name: '课文', exact: true }).selectOption(topic!)
  await expect(page.locator('.question-row')).toHaveCount(10)
  await page
    .locator('.question-row')
    .first()
    .getByRole('button', { name: '停用', exact: true })
    .click()
  await expect(page.locator('.question-row').first()).toContainText('已停用')
  const d = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出当前册 / 单元 / 课' }).click()
  const file = await d
  const data = JSON.parse(await readFile((await file.path())!, 'utf8'))
  expect(data.questions).toHaveLength(10)
  page.on('dialog', (dialog) => dialog.accept())
  await page
    .locator('.question-row')
    .first()
    .getByRole('button', { name: '删除', exact: true })
    .click()
  await expect(page.locator('.question-row')).toHaveCount(9)
})
test('课堂设置、快捷键、手动小组积分与撤销', async ({ page }) => {
  await home(page)
  await page.getByRole('button', { name: '我的课堂', exact: true }).click()
  await page.getByLabel('开启合作小组计分').check()
  await page.getByRole('combobox', { name: '小组数量', exact: false }).selectOption('4')
  await page.getByRole('combobox', { name: '主题皮肤', exact: true }).selectOption('lavender')
  await page.getByRole('button', { name: '保存课堂设置' }).click()
  await expect(page.getByRole('status')).toContainText('已保存')
  await start(page, 'mole', 'lesson-0', 2)
  await expect(page.locator('.app')).toHaveClass(/theme-lavender/)
  await page.getByRole('button', { name: '加1分', exact: false }).click()
  await expect(page.locator('.scoreboard')).toContainText('第1组 ⭐ 1')
  await page.getByRole('button', { name: '撤销', exact: true }).click()
  await expect(page.locator('.scoreboard')).toContainText('第1组 ⭐ 0')
  await page.keyboard.press('Space')
  await expect(page.getByRole('heading', { name: '休息一下，准备好再出发' })).toBeVisible()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.game-top')).toContainText('2 / 2')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.game-top')).toContainText('1 / 2')
})
test('断网后完整单文件可加载并进入游戏，无外部资源请求', async ({ page, context }) => {
  const html = await readFile(resolve('release/紫藤花语文游戏中心.html'), 'utf8')
  const errors: string[] = [],
    resources: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => {
    if (r.resourceType() !== 'document') resources.push(r.url())
  })
  await page.route('**/offline.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  )
  await page.goto('/offline.html')
  await expect(page.getByRole('heading', { name: /让语文课堂/ })).toBeVisible()
  await context.setOffline(true)
  await start(page, 'train')
  await expect(page.locator('.answer-grid')).toBeVisible()
  expect(errors).toEqual([])
  expect(resources).toEqual([])
})
test('Node本地HTTP启动方案可离线运行并保持题库', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await expect(page.getByRole('heading', { name: /让语文课堂/ })).toBeVisible()
  await expect(page.locator('.storage-status')).toContainText('IndexedDB')
  await start(page, 'detective')
  await page.reload()
  await expect(page.getByRole('heading', { name: /让语文课堂/ })).toBeVisible()
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await expect(page.locator('.question-row')).toHaveCount(490)
})
test('file协议离线发布可以直接打开', async ({ page }) => {
  try {
    await page.goto('file://' + resolve('release/紫藤花语文游戏中心.html'))
  } catch (error) {
    if (error instanceof Error && error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR'))
      test.skip(true, '云端管理员策略禁止file协议；须在教师实际浏览器验证双击模式')
    else throw error
  }
  await expect(page.getByRole('heading', { name: /让语文课堂/ })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('备份')
  await start(page, 'mole')
  await expect(page.locator('.answer-grid')).toBeVisible()
})
test('IndexedDB不可用时备用存储与纯内存告警', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('模拟数据库被禁用')
      },
    })
  })
  await home(page)
  await expect(page.locator('.storage-status')).toContainText('localStorage')
  await expect(page.getByRole('alert')).toContainText('备用存储')
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('模拟存储被禁用')
      },
    })
  })
  await page.reload()
  await expect(page.locator('.storage-status')).toContainText('内存')
  await expect(page.getByRole('alert')).toContainText('关闭页面会丢失修改')
})
test('模拟存储配额失败时不显示保存成功、不污染原有题库', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (value?.questions?.some((q: { prompt: string }) => q.prompt === '保存失败演示题'))
        throw new DOMException('模拟存储配额不足', 'QuotaExceededError')
      return original.call(this, value, key)
    }
  })
  await home(page)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByRole('button', { name: '＋ 添加题目' }).click()
  await page.getByLabel('题目内容', { exact: true }).fill('保存失败演示题')
  await page.getByLabel('答案选项', { exact: false }).fill('天\n大')
  await page.getByLabel('正确答案', { exact: false }).fill('天')
  await page.getByRole('button', { name: '保存题目', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '添加题目' })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('配额不足')
  await expect(page.locator('.storage-status')).toContainText('保存失败')
  await page.getByRole('button', { name: '关闭编辑器' }).click()
  await expect(page.locator('.question-row')).toHaveCount(490)
  await page.reload()
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await expect(page.locator('.question-row')).toHaveCount(490)
})
test('拼音卡片组合支持显式三拼和ü，错误后可重新排列', async ({ page }) => {
  await home(page)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByPlaceholder('题目、知识点、备注').fill('三拼音节 biǎo')
  await page.locator('.question-row').getByRole('button', { name: '预览', exact: true }).click()
  await page.getByRole('button', { name: '拼读卡片', exact: false }).click()
  for (const part of ['第三声', 'ao', 'i', 'b'])
    await page
      .locator('.assemble .token-bank')
      .getByRole('button', { name: part, exact: true })
      .click()
  await page.getByRole('button', { name: '检查拼读' }).click()
  await expect(page.locator('.feedback')).toContainText('再观察')
  await page.getByRole('button', { name: '重新选卡片' }).click()
  for (const part of ['b', 'i', 'ao', '第三声'])
    await page
      .locator('.assemble .token-bank')
      .getByRole('button', { name: part, exact: true })
      .click()
  await page.getByRole('button', { name: '检查拼读' }).click()
  await expect(page.locator('.feedback')).toContainText('太棒了')
  await page.getByRole('button', { name: '退出课堂', exact: false }).click()
  await page.getByPlaceholder('题目、知识点、备注').fill('选出 lǜ')
  await expect(page.locator('.question-row')).toHaveCount(1)
  await page.locator('.question-row').getByRole('button', { name: '预览', exact: true }).click()
  await expect(page.locator('.answer-grid')).toContainText('lǜ')
})
test('缺题提示可立即进入题库补充', async ({ page }) => {
  await home(page)
  await page.getByRole('button', { name: '开始课堂', exact: true }).click()
  await page.getByRole('combobox', { name: '课堂游戏', exact: true }).selectOption('balloon')
  await expect(page.locator('.warning')).toContainText('没有适合')
  await expect(page.getByRole('button', { name: '出发，开始游戏 →' })).toBeDisabled()
  await page.getByRole('button', { name: '去题库补充' }).click()
  await expect(page.getByRole('heading', { name: '教师题库管理' })).toBeVisible()
})
test('教师分词后可逐词朗读，标点原样显示', async ({ page }) => {
  await home(page)
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByRole('combobox', { name: '课文', exact: true }).selectOption('lesson-0')
  await page.getByPlaceholder('题目、知识点、备注').fill('跟着光点')
  await page.locator('.question-row').getByRole('button', { name: '编辑', exact: true }).click()
  await page.getByLabel('朗读正文', { exact: false }).fill('小鸟在树上唱歌。')
  await page.getByLabel('逐词分段', { exact: false }).fill('小鸟|在树上|唱歌|。')
  await page.getByRole('button', { name: '保存题目', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: '我的课堂', exact: true }).click()
  await page.getByRole('combobox', { name: '朗读高亮单位', exact: true }).selectOption('word')
  await page.getByRole('button', { name: '保存课堂设置' }).click()
  await expect(page.getByRole('status')).toContainText('已保存')
  await start(page, 'reading')
  await page.getByRole('button', { name: '逐字 / 词前进' }).click()
  await expect(page.locator('.reading-active')).toHaveText('小鸟')
  await page.getByRole('button', { name: '逐句前进' }).click()
  await expect(page.locator('.reading-active')).toHaveText('。')
})
