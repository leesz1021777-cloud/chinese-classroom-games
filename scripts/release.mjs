import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
const root = process.cwd(),
  dist = join(root, 'dist'),
  release = join(root, 'release')
let html = await readFile(join(dist, 'index.html'), 'utf8')
for (const match of [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(join(dist, match[1]), 'utf8')
  html = html.replace(
    match[0],
    () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`,
  )
}
for (const match of [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css = await readFile(join(dist, match[1]), 'utf8')
  html = html.replace(match[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
}
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '')
if (/(?:src|href)="(?:\.\/)?assets\//.test(html)) throw new Error('单文件仍含外部构建资源')
await mkdir(release, { recursive: true })
await writeFile(join(release, '紫藤花语文游戏中心.html'), html)
await copyFile(join(root, 'scripts', 'serve.mjs'), join(release, 'serve.mjs'))
await writeFile(
  join(release, '启动课堂.bat'),
  '@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul\r\nif errorlevel 1 (\r\n  echo 请先安装 Node.js 24 LTS。安装后可完全离线运行。\r\n  pause\r\n  exit /b 1\r\n)\r\nnode serve.mjs --open\r\npause\r\n',
)
const instructions = `紫藤花语文游戏中心 v0.2 — 离线使用说明

1. 完整解压本压缩包。预先安装Node.js 24 LTS后，双击“启动课堂.bat”。
2. 浏览器打开本机 http://127.0.0.1:4173 ，保持启动窗口开启。课堂运行无需网络和npm。
3. 默认包含490道原创练习、上册9个及下册8个有题目的学习单元、七款互动游戏。
4. 新增单元为原创拓展主题，不是已核实的2024新版教材目录。请教师按进度确认。
5. 答案选项每题、重试和重新开局随机排列。声调气球也随机排列，以标签判断声调。
6. 随机点名支持TXT（每行一个姓名）、CSV（可映射姓名列）、JSON姓名数组。
   默认本轮不重复；可手动停止滚动、开启新一轮。名单只保存本机，不上传。
7. 完整JSON备份包含本地名单，妥善保管；点名顺序不跨刷新保存。
8. 更新前先在旧版导出完整JSON备份。使用相同浏览器和4173端口运行新版时，
   新增内容会自动加入，原有修改、停用状态、名单和设置保留。不会恢复本版本中主动删除的题目。
9. 换浏览器、端口或HTML文件时，先备份再导入；如导入旧版备份，刷新后加载新增内容。

也可尝试双击HTML，但file协议的存储可靠性取决于浏览器。云端管理员策略禁止
file协议测试，推荐已验证的本地HTTP方案；Windows启动器需在实际设备试用。
完整教材目录、题目适配性、授权课文节选与音频需教师确认。
左右方向键切题，空格暂停/继续，Esc退出课堂，F11全屏。默认无计时、静音。
`
await writeFile(join(release, '使用说明.txt'), instructions)
const entries = {}
for (const name of ['紫藤花语文游戏中心.html', 'serve.mjs', '启动课堂.bat', '使用说明.txt'])
  entries[name] = new Uint8Array(await readFile(join(release, name)))
const archive = zipSync(entries, { level: 9 })
await writeFile(join(release, 'wisteria-classroom-offline.zip'), archive)
await writeFile(join(release, 'chinese-classroom-offline.zip'), archive)
await writeFile(
  join(release, '版本信息.json'),
  strToU8(
    JSON.stringify(
      { version: '0.2.0', title: '紫藤花语文游戏中心', questions: 490, learningUnits: 17 },
      null,
      2,
    ),
  ),
)
console.log('离线发布完成：release/紫藤花语文游戏中心.html（无需外部资源）')
