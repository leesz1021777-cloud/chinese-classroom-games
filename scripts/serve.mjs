import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
const folder = dirname(fileURLToPath(import.meta.url))
const release = folder.endsWith('scripts') ? join(folder, '..', 'release') : folder
const file = join(release, '紫藤花语文游戏中心.html')
const html = await readFile(file)
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(html)
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})
server.on('error', (e) => {
  console.error('启动失败，请检查4173端口是否被占用：', e.message)
  process.exitCode = 1
})
server.listen(4173, '127.0.0.1', () => {
  console.log('紫藤花课堂已启动。请打开 http://127.0.0.1:4173 ，保持此窗口开启。Ctrl+C 停止。')
  if (process.platform === 'win32' && process.argv.includes('--open')) {
    const opener = spawn('cmd.exe', ['/c', 'start', '', 'http://127.0.0.1:4173'], {
      stdio: 'ignore',
    })
    opener.on('error', () => console.log('请手动打开上方地址。'))
  }
})
