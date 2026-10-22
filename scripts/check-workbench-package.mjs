#!/usr/bin/env node
/**
 * 工作台包自检：只读检查 package.json、入口文件、cordis.patch.yml 与客户端注册。
 * 用法：
 *   node scripts/check-workbench-package.mjs
 *   node scripts/check-workbench-package.mjs --tarball ../dsh-creativity-hall-0.1.0.tgz
 * 不联网、不写文件、不启动宿主。
 */
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const notes = []

function pass (message) { notes.push(`PASS  ${message}`) }
function fail (message) { failures.push(message) }

async function readText (path) {
  try {
    return await readFile(join(root, path), 'utf8')
  } catch {
    return null
  }
}

function semver (value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)
}

const pkgText = await readText('package.json')
if (!pkgText) {
  fail('缺少 package.json')
} else {
  let pkg
  try {
    pkg = JSON.parse(pkgText)
  } catch (error) {
    fail(`package.json 不是有效 JSON：${error.message}`)
  }
  if (pkg) {
    if (typeof pkg.name !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(pkg.name)) fail('package.json 的 name 不是合法 npm 包名')
    else pass(`包名 ${pkg.name}`)
    if (!semver(pkg.version)) fail('package.json 的 version 不是完整 SemVer')
    else pass(`版本 ${pkg.version}`)

    const main = pkg.exports?.['.'] ?? pkg.main
    if (!main) fail('缺少服务端入口 exports["."] 或 main')
    else if (!existsSync(join(root, main))) fail(`服务端入口不存在：${main}`)
    else pass(`服务端入口 ${main}`)

    if (!pkg.exports?.['./client']) fail('缺少 exports["./client"]')
    else if (!existsSync(join(root, pkg.exports['./client']))) fail(`客户端入口不存在：${pkg.exports['./client']}`)
    else pass(`客户端入口 ${pkg.exports['./client']}`)

    if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') fail('dsh.bundle.patch 必须指向 ./cordis.patch.yml')
    else pass('dsh.bundle.patch 已声明')

    if (pkg.dsh?.client?.platform !== 'web') fail('dsh.client.platform 必须是 "web"')
    else pass('dsh.client.platform = web')

    const inject = pkg.dsh?.client?.inject
    if (!Array.isArray(inject) || !inject.includes('dsh-desktop-workbenches')) fail('dsh.client.inject 必须包含 dsh-desktop-workbenches')
    else pass('dsh.client.inject 包含 dsh-desktop-workbenches')

    if (!Array.isArray(pkg.files) || !pkg.files.includes('cordis.patch.yml')) fail('files 必须包含 cordis.patch.yml')
    else pass('files 覆盖 patch 与入口')
  }
}

const patch = await readText('cordis.patch.yml')
if (!patch) fail('缺少 cordis.patch.yml')
else {
  const trimmed = patch.replace(/^\s*#.*$/gm, '').trim()
  if (!trimmed) fail('cordis.patch.yml 为空（空文件会导致启动失败，应写 []）')
  else if (!/insert:/.test(patch)) fail('cordis.patch.yml 没有 insert 条目')
  else if (!/name:\s*dsh-creativity-hall/.test(patch)) fail('cordis.patch.yml 的 name 必须是 npm 包名')
  else pass('cordis.patch.yml 含 insert 且 name 为包名')
}

const client = await readText('lib/client.js')
if (!client) fail('缺少 lib/client.js')
else {
  const match = client.match(/__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/)
  if (!match) fail('客户端入口没有 window.__ModuleLoader__.load({ id })')
  else if (match[1] !== 'dsh-creativity-hall') fail(`客户端模块 id 与包名不一致：${match[1]}`)
  else pass('客户端模块 id 与包名一致')
  if (!/desktopWorkbenches\.register\(/.test(client)) fail('客户端没有注册业务面板')
  else pass('客户端注册了业务面板')
  if (!/conversation/.test(client)) fail('customFrame 面板没有使用宿主 conversation 节点')
  else pass('customFrame 面板使用宿主 conversation 节点')
}

const server = await readText('dsh/index.js')
if (!server) fail('缺少 dsh/index.js')
else {
  if (!/from '@deepseek-ai\/schemastery'/.test(server)) fail('服务端没有使用 Schemastery 定义 Config')
  else pass('服务端 Config 使用 Schemastery')
  if (!/export const Config/.test(server)) fail('服务端没有导出 Config')
  if (!/export function apply/.test(server)) fail('服务端没有导出 apply')
  if (!/export const name/.test(server)) fail('服务端没有导出 name')
  if (/\/api\/(?!creativity-hall\/)[a-z-]+\//.test(server)) fail('服务端占用了其他插件的接口路径')
  else pass('服务端接口使用专属路径前缀')
}

for (const file of ['README.md', 'LICENSE']) {
  if (!existsSync(join(root, file))) fail(`缺少 ${file}`)
}

let bytes = 0
for (const file of ['package.json', 'cordis.patch.yml', 'dsh/index.js', 'lib/client.js']) {
  try {
    bytes += (await stat(join(root, file))).size
  } catch {}
}
const secretPattern = /(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/
for (const file of ['package.json', 'cordis.patch.yml', 'dsh/index.js', 'lib/client.js', 'README.md']) {
  const text = await readText(file)
  if (text && secretPattern.test(text)) fail(`${file} 里疑似包含凭证`)
}
if (bytes > 8 * 1024 * 1024) fail('包内核心文件超过 8 MiB')
else pass(`核心文件合计 ${(bytes / 1024).toFixed(1)} KiB`)

const tarballIndex = process.argv.indexOf('--tarball')
if (tarballIndex > -1) {
  const tarball = process.argv[tarballIndex + 1]
  if (!tarball) fail('--tarball 缺少路径')
  else {
    try {
      const listing = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
      const entries = listing.split(/\r?\n/).filter(Boolean)
      for (const required of ['package/package.json', 'package/cordis.patch.yml', 'package/dsh/index.js', 'package/lib/client.js']) {
        if (entries.includes(required)) pass(`tarball 含 ${required}`)
        else fail(`tarball 缺少 ${required}`)
      }
      if (entries.some((entry) => /(?:^|\/)\.env$/.test(entry))) fail('tarball 里含 .env')
    } catch (error) {
      fail(`无法读取 tarball：${error.message}`)
    }
  }
}

for (const line of notes) console.log(line)
for (const line of failures) console.log(`FAIL  ${line}`)
console.log(failures.length ? `\n${failures.length} 项未通过` : '\n全部检查通过')
process.exitCode = failures.length ? 1 : 0
