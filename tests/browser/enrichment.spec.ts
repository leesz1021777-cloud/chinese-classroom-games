import { test, expect } from '@playwright/test'
import { createSeed, createLegacySeed } from '../../src/seed'

test('紫藤花品牌和上下册学习地图可实际开课', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('紫藤花语文游戏中心')
  await expect(page.locator('.brand')).toContainText('紫藤花')
  await expect(page.locator('.unit-card')).toHaveCount(9)
  await page.locator('.book-tabs').getByRole('button', { name: '下册', exact: true }).click()
  await expect(page.locator('.unit-card')).toHaveCount(8)
  await page.locator('.unit-card').filter({ hasText: '春天的发现' }).click()
  await expect(page.getByRole('combobox', { name: '教材册次', exact: true })).toHaveValue('lower')
  await page.getByLabel('自定义题量').fill('1')
  await page.getByRole('button', { name: '出发，开始游戏 →' }).click()
  const prompt = await page.locator('.task h1').innerText(),
    q = createSeed().questions.find((q) => q.prompt === prompt && q.games.includes('mole'))!
  await page
    .locator('.answer-grid')
    .getByRole('button', { name: q.answers[0], exact: true })
    .click()
  await expect(page.locator('.star-counter')).toContainText('1 / 1')
  await page.getByRole('button', { name: '结束本轮' }).click()
  await expect(page.locator('.reward-garden')).toContainText('紫藤花又长大了一点')
})
for (const game of ['mole', 'balloon'])
  test(`${game}：重试时答案位置随机且判断正确`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '开始课堂', exact: true }).click()
    if (game === 'balloon') {
      await page.getByRole('combobox', { name: '单元', exact: true }).selectOption('phonics')
      await page.getByRole('combobox', { name: '课文', exact: true }).selectOption('lesson-4')
    }
    await page.getByRole('combobox', { name: '课堂游戏', exact: true }).selectOption(game)
    await page.getByLabel('自定义题量').fill('1')
    await page.getByRole('button', { name: '出发，开始游戏 →' }).click()
    const prompt = await page.locator('.task h1').innerText(),
      q = createSeed().questions.find(
        (q) => q.prompt === prompt && q.games.includes(game as 'mole' | 'balloon'),
      )!,
      positions = new Set<number>()
    for (let i = 0; i < 12; i++) {
      const options = await page
        .locator(game === 'mole' ? '.answer-grid .answer' : '.balloons .balloon')
        .evaluateAll((items) => items.map((e) => e.getAttribute('aria-label')))
      positions.add(options.indexOf(game === 'mole' ? q.answers[0] : `选择第${q.tone}声`))
      await page.getByRole('button', { name: '重试本题' }).click()
    }
    expect(positions.size).toBeGreaterThan(1)
    await page
      .getByRole('button', {
        name: game === 'mole' ? q.answers[0] : `选择第${q.tone}声`,
        exact: true,
      })
      .click()
    await expect(page.locator('.feedback')).toContainText('太棒了')
  })
test('旧版74题升级到490题时保留教师修改、停用状态和名单', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /让语文课堂/ })).toBeVisible()
  const legacy = createLegacySeed()
  legacy.questions[0].prompt = '教师保留的个性化题目'
  legacy.questions[0].enabled = false
  legacy.rosters = [
    { id: 'legacy-roster', name: '原有测试班', students: [{ id: 'demo-id', name: '虚构姓名' }] },
  ]
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('little-universe', 1)
      request.onsuccess = () => {
        const database = request.result,
          tx = database.transaction('state', 'readwrite')
        tx.objectStore('state').put(data, 'little-universe-v2')
        tx.oncomplete = () => {
          database.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      request.onerror = () => reject(request.error)
    })
  }, legacy)
  await page.reload()
  await expect(page.locator('.content-upgrade')).toContainText('416')
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await expect(page.locator('.question-row')).toHaveCount(490)
  await page.getByPlaceholder('题目、知识点、备注').fill('教师保留的个性化题目')
  await expect(page.locator('.question-row')).toContainText('已停用')
  await page.getByRole('button', { name: '随机点名', exact: true }).click()
  await expect(page.getByRole('combobox', { name: '班级名单', exact: true })).toContainText(
    '原有测试班',
  )
})
test('CSV姓名列预览、刷新持久化、本轮不重复、手动停止与新一轮', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '随机点名', exact: true }).click()
  await page.getByLabel('导入学生名单').setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('学号,学生姓名\n1,甲同学\n2,乙同学\n3,丙同学'),
  })
  await page.getByRole('combobox', { name: 'CSV姓名列', exact: true }).selectOption('学生姓名')
  await page.getByLabel('班级名称', { exact: true }).fill('本地测试班')
  await expect(page.locator('.roster-preview')).toContainText('甲同学')
  await page.getByRole('button', { name: '确认保存名单' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: '随机点名', exact: true }).click()
  await expect(page.getByRole('combobox', { name: '班级名单', exact: true })).toContainText(
    '本地测试班',
  )
  const names = new Set<string>()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '开始随机点名', exact: false }).click()
    if (i === 0) await page.getByRole('button', { name: '停止点名', exact: true }).click()
    await expect(page.locator('.picker-history span')).toHaveCount(i + 1)
    names.add(await page.locator('.picked-name').innerText())
  }
  expect(names.size).toBe(3)
  await expect(page.getByRole('button', { name: '开始随机点名', exact: false })).toBeDisabled()
  await expect(page.getByRole('status')).toContainText('本次点名')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '开始新一轮', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始随机点名', exact: false })).toBeEnabled()
  await expect(page.locator('.picker-history')).toHaveCount(0)
})
test('TXT和JSON名单可导入，错误名单不会覆盖原班级', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '随机点名', exact: true }).click()
  await page.getByLabel('导入学生名单').setInputFiles({
    name: 'demo.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('甲同学\n乙同学'),
  })
  await page.getByRole('button', { name: '确认保存名单' }).click()
  await expect(
    page.getByRole('combobox', { name: '班级名单', exact: true }).locator('option'),
  ).toHaveCount(1)
  await page.getByLabel('导入学生名单').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('["甲同学",{}]'),
  })
  await expect(page.getByRole('alert')).toContainText('第2项')
  await expect(
    page.getByRole('combobox', { name: '班级名单', exact: true }).locator('option'),
  ).toHaveCount(1)
  await page.getByLabel('导入学生名单').setInputFiles({
    name: 'second.json',
    mimeType: 'application/json',
    buffer: Buffer.from('["丙同学","丁同学"]'),
  })
  await page.getByRole('button', { name: '确认保存名单' }).click()
  await expect(
    page.getByRole('combobox', { name: '班级名单', exact: true }).locator('option'),
  ).toHaveCount(2)
})
test('词语搭桥接受多个合理答案，跳过题不会生成木板', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '教师题库', exact: true }).click()
  await page.getByPlaceholder('题目、知识点、备注').fill('一（　）大象')
  await page.locator('.question-row').getByRole('button', { name: '预览', exact: true }).click()
  await page.locator('.answer-grid').getByRole('button', { name: '只', exact: true }).click()
  await expect(page.locator('.feedback')).toContainText('太棒了')
  await expect(page.locator('.bridge-planks .built')).toHaveCount(1)
  await page.getByRole('button', { name: '重试本题' }).click()
  await expect(page.locator('.bridge-planks .built')).toHaveCount(0)
  await page.locator('.answer-grid').getByRole('button', { name: '头', exact: true }).click()
  await expect(page.locator('.feedback')).toContainText('太棒了')
})
test('点名器在断网的单文件HTTP版本中可运行', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173')
  await expect(page).toHaveTitle('紫藤花语文游戏中心')
  await page.getByRole('button', { name: '随机点名', exact: true }).click()
  await page.getByRole('button', { name: '手动输入名单' }).click()
  await page.getByLabel('姓名（每行一个）').fill('甲同学\n乙同学')
  await page.getByRole('button', { name: '确认保存名单' }).click()
  await page.context().setOffline(true)
  await page.getByRole('button', { name: '开始随机点名', exact: false }).click()
  await expect(page.locator('.picker-history span')).toHaveCount(1)
})
