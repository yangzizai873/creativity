// 服务端接口的本地功能测试：不启动宿主，直接调用注册的 route handler。
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, Config } from '../dsh/index.js'

const root = await mkdtemp(join(tmpdir(), 'creativity-hall-test-'))
const routes = new Map()
const registeredPaths = new Set()
// 与宿主一致：同一个精确路径不允许注册两次（不同方法也不行）。
const ctx = {
  connection: {
    fetch: {
      register: (route) => {
        if (registeredPaths.has(route.path)) throw new Error(`connection: exact Fetch route "${route.path}" is already registered`)
        registeredPaths.add(route.path)
        routes.set(`${route.methods.join(',')} ${route.path}`, route)
      }
    }
  },
  get: () => undefined,
  logger: { warn: () => {} }
}

apply(ctx, { root })

assert.ok(Config, '导出 Config')
assert.equal(registeredPaths.size, 7, '注册了 7 条互不重复的接口')
assert.equal(routes.size, 7)

const getState = routes.get('GET /api/creativity-hall/state')
const putState = routes.get('PUT /api/creativity-hall/state/write')
const health = routes.get('GET /api/creativity-hall/health')
const researchRoute = routes.get('POST /api/creativity-hall/research')
const discoverRoute = routes.get('POST /api/creativity-hall/discover')
const associateRoute = routes.get('POST /api/creativity-hall/associate')
const draftRoute = routes.get('POST /api/creativity-hall/draft')

const call = (route, init) => route.fetch(new Request('http://localhost' + route.path, init))
const put = (payload) => call(putState, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload)
})

// 1. 空状态
let response = await call(getState)
assert.equal(response.status, 200)
assert.deepEqual(await response.json(), { version: 1, ideas: [] })

// 2. 写入并规范化
const now = new Date().toISOString()
response = await put({
  version: 1,
  ideas: [
    {
      id: 'a',
      title: '  周末把菜市场逛成散步路线  ',
      note: '从东门进，绕一圈',
      tags: ['生活', '生活', ' 散步 ', '', 'x'.repeat(40)],
      status: 'active',
      nextStep: '先画一张简单路线图',
      createdAt: now,
      updatedAt: now
    },
    { id: 'b', title: '这条没有标题之外的东西' },
    { title: '没有 id，应被丢弃' },
    { id: 'c', title: '   ' }
  ]
})
assert.equal(response.status, 200)
assert.deepEqual(await response.json(), { ok: true, count: 2 })

response = await call(getState)
const state = await response.json()
assert.equal(state.ideas.length, 2)
assert.equal(state.ideas[0].title, '周末把菜市场逛成散步路线')
assert.deepEqual(state.ideas[0].tags, ['生活', '散步', 'x'.repeat(24)])
assert.equal(state.ideas[0].status, 'active')
assert.equal(state.ideas[0].nextStep, '先画一张简单路线图')
assert.equal(state.ideas[1].status, 'spark')
assert.ok(!Number.isNaN(Date.parse(state.ideas[1].createdAt)))

// 3. 落盘
const saved = JSON.parse(await readFile(join(root, 'ideas.json'), 'utf8'))
assert.equal(saved.ideas.length, 2)

// 4. 非法 JSON
response = await call(putState, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{oops' })
assert.equal(response.status, 400)
assert.match((await response.json()).error, /JSON/)

// 5. 超大请求
response = await call(putState, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ ideas: [{ id: 'x', title: 'y'.repeat(2 * 1024 * 1024 + 10) }] })
})
assert.equal(response.status, 413)

// 6. 健康检查
response = await call(health)
assert.equal(response.status, 200)
const info = await response.json()
assert.equal(info.ok, true)
assert.equal(info.count, 2)
assert.equal(info.root, root)

// 7. 连续写入按顺序完成
await Promise.all([
  put({ ideas: [{ id: 'p', title: '并发 A' }] }),
  put({ ideas: [{ id: 'q', title: '并发 B' }] })
])
response = await call(getState)
const finalState = await response.json()
assert.equal(finalState.ideas.length, 1)

// 8. 查新与商用评估结果随创意一起保存
const at = new Date().toISOString()
await put({
  ideas: [{
    id: 'r1',
    title: '带评估的创意',
    research: {
      at,
      model: 'deepseek-official/deepseek-flash',
      online: true,
      query: '带评估的创意',
      priorArt: {
        level: 'exists',
        summary: '已有相近产品 [1]',
        sources: [{ url: 'https://example.com/a', title: '示例来源', snippet: '摘要' }]
      },
      commercial: { score: 73, verdict: '有一定空间', reasons: ['需求明确'] },
      applications: [{ area: '社区工具', note: '先做小范围试用' }]
    }
  }]
})
response = await call(getState)
const researched = (await response.json()).ideas[0]
assert.equal(researched.research.priorArt.level, 'exists')
assert.equal(researched.research.commercial.score, 73)
assert.equal(researched.research.priorArt.sources[0].url, 'https://example.com/a')
assert.equal(researched.research.applications[0].area, '社区工具')
assert.equal(researched.research.online, true)

// 9. 没有模型服务时给出可读的失败原因
response = await call(researchRoute, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '测试创意' })
})
assert.equal(response.status, 503)
assert.match((await response.json()).error, /模型服务/)

// 10. 没有标题时不发起评估
response = await call(researchRoute, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '   ' })
})
assert.equal(response.status, 400)

// 11. 没有联网能力时，网络灵感给出可读原因
response = await call(discoverRoute, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({})
})
assert.equal(response.status, 503)
assert.match((await response.json()).error, /联网/)

// 12. 有联网、没有模型时，退回检索结果卡片；来源去重、域名正确
const root2 = await mkdtemp(join(tmpdir(), 'creativity-hall-discover-'))
const routes2 = new Map()
const webStub = {
  async search () {
    return {
      sources: [
        { url: 'https://example.com/a', title: 'A 创意', snippet: '摘要 A' },
        { url: 'https://example.com/a', title: '重复来源', snippet: '重复' },
        { url: 'https://example.com/b', title: 'B 创意', snippet: '摘要 B' }
      ]
    }
  }
}
const ctx2 = {
  connection: { fetch: { register: (route) => routes2.set(`${route.methods.join(',')} ${route.path}`, route) } },
  get: (name) => (name === 'web' ? webStub : undefined),
  logger: { warn: () => {} }
}
apply(ctx2, { root: root2 })
const discover2 = routes2.get('POST /api/creativity-hall/discover')
response = await discover2.fetch(new Request('http://localhost/api/creativity-hall/discover', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: '老人陪伴' })
}))
assert.equal(response.status, 200)
const feed = await response.json()
assert.equal(feed.items.length, 2)
assert.equal(feed.items[0].host, 'example.com')
assert.equal(feed.items[0].url, 'https://example.com/a')
assert.equal(feed.extracted, false)
assert.deepEqual(feed.queries, ['老人陪伴'])
await rm(root2, { recursive: true, force: true })

// 13. 联想结果（含 AI 打样初稿）随创意保存
await put({
  ideas: [{
    id: 'a1',
    title: '做一个能自己浇花的机器人',
    associations: {
      at: new Date().toISOString(),
      model: 'deepseek-official/deepseek-flash',
      items: [
        {
          area: 'PCB 绘制',
          why: '需要控制水泵和传感器',
          firstStep: '先用开发板搭出最小控制回路',
          deliverable: '一份接口定义和元件清单草案',
          draft: { at: new Date().toISOString(), text: '初稿：主控选 ESP32…' }
        },
        { area: '程序', why: '控制浇水节奏', firstStep: '写一个定时循环', deliverable: '最小示例代码' }
      ]
    }
  }]
})
response = await call(getState)
const associated = (await response.json()).ideas[0]
assert.equal(associated.associations.items.length, 2)
assert.equal(associated.associations.items[0].area, 'PCB 绘制')
assert.equal(associated.associations.items[0].draft.text, '初稿：主控选 ESP32…')
assert.equal(associated.associations.items[1].draft, null)

// 14. 没有模型服务时，联想与打样给出可读原因
for (const route of [associateRoute, draftRoute]) {
  response = await call(route, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: '做一个小机器人', area: 'PCB 绘制' })
  })
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /模型服务/)
}

// 15. 打样缺少领域时拒绝
response = await call(draftRoute, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '做一个小机器人' })
})
assert.equal(response.status, 400)

// 16. 模型把 JSON 包在代码块里也能解析
const root3 = await mkdtemp(join(tmpdir(), 'creativity-hall-json-'))
const makeModelCtx = (responses, finish = 'stop') => {
  let index = 0
  const llm = {
    stream () {
      const text = responses[Math.min(index, responses.length - 1)]
      index++
      return (async function * () {
        yield { type: 'text-delta', text }
        yield { type: 'finish', reason: { kind: finish } }
      })()
    }
  }
  const routes3 = new Map()
  const ctx3 = {
    connection: { fetch: { register: (route) => routes3.set(`${route.methods.join(',')} ${route.path}`, route) } },
    get: (name) => (name === 'llm' ? llm : name === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'p', model: 'm' }) } : undefined),
    logger: { warn: () => {} }
  }
  apply(ctx3, { root: root3 })
  return routes3.get('POST /api/creativity-hall/associate')
}

const fenced = makeModelCtx(['```json\n{"items":[{"area":"PCB 绘制","why":"w","firstStep":"s","deliverable":"d"}]}\n```'])
response = await fenced.fetch(new Request('http://localhost/api/creativity-hall/associate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '做一个小机器人' })
}))
assert.equal(response.status, 200)
assert.equal((await response.json()).associations.items[0].area, 'PCB 绘制')

// 17. 第一次没给出 JSON 时，会自动做一次「修复成 JSON」重试
const repaired = makeModelCtx([
  '这个创意需要 PCB、程序和结构，我先说明一下。',
  '{"items":[{"area":"嵌入式程序","why":"w","firstStep":"s","deliverable":"d"}]}'
])
response = await repaired.fetch(new Request('http://localhost/api/creativity-hall/associate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ title: '做一个小机器人' })
}))
assert.equal(response.status, 200)
assert.equal((await response.json()).associations.items[0].area, '嵌入式程序')
await rm(root3, { recursive: true, force: true })

await rm(root, { recursive: true, force: true })
console.log('server tests: 全部通过')
