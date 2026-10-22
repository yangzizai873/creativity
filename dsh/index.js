import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Schema from '@deepseek-ai/schemastery'

export const name = 'creativity-hall'
export const inject = ['connection']
export const Config = Schema.object({
  root: Schema.string().required()
})

const MAX_BODY_BYTES = 2 * 1024 * 1024
const MAX_IDEAS = 5000
const MAX_TITLE = 200
const MAX_NOTE = 20000
const MAX_STEP = 5000
const MAX_TAGS = 12
const MAX_TAG = 24
const STATUSES = new Set(['spark', 'active', 'done', 'parked'])

// 网络灵感：默认从这几组公开线索里轮流检索，用户可以换成自己的主题。
const FEED_QUERIES = [
  '有人想做但市面上还没有的产品 创意',
  'SomebodyMakeThis 没人做的点子',
  'halfbakery 未实现的发明 创意',
  '为什么没有这样的产品 想法 吐槽',
  'unbuilt invention ideas never built',
  '创意许愿 要是有个东西能 就好了',
  'abandoned startup ideas list 未实现',
  '小工具 创意 征集 没人做'
]

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function cleanText (value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/\u0000/g, '').slice(0, max)
}

function normalizeTag (tag) {
  return cleanText(tag, MAX_TAG).trim()
}

function normalizeResearch (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const prior = value.priorArt && typeof value.priorArt === 'object' ? value.priorArt : {}
  const commercial = value.commercial && typeof value.commercial === 'object' ? value.commercial : {}
  const levels = new Set(['none', 'similar', 'exists'])
  const sources = Array.isArray(prior.sources)
    ? prior.sources.map((source) => ({
      url: cleanText(source?.url, 500).trim(),
      title: cleanText(source?.title, 200).trim(),
      snippet: cleanText(source?.snippet, 400).trim()
    })).filter((source) => /^https?:\/\//i.test(source.url)).slice(0, 8)
    : []
  const applications = Array.isArray(value.applications)
    ? value.applications.map((item) => ({
      area: cleanText(item?.area, 80).trim(),
      note: cleanText(item?.note, 300).trim()
    })).filter((item) => item.area).slice(0, 6)
    : []
  const score = Number(commercial.score)
  return {
    at: typeof value.at === 'string' && !Number.isNaN(Date.parse(value.at)) ? new Date(value.at).toISOString() : new Date().toISOString(),
    model: cleanText(value.model, 120),
    online: value.online === true,
    query: cleanText(value.query, 200),
    priorArt: {
      level: levels.has(prior.level) ? prior.level : 'similar',
      summary: cleanText(prior.summary, 2000),
      sources
    },
    commercial: {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      verdict: cleanText(commercial.verdict, 1200),
      reasons: Array.isArray(commercial.reasons)
        ? commercial.reasons.map((reason) => cleanText(reason, 300)).filter(Boolean).slice(0, 6)
        : []
    },
    applications
  }
}

function normalizeAssociations (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const items = Array.isArray(value.items)
    ? value.items.map((item) => {
      if (!item || typeof item !== 'object') return null
      const area = cleanText(item.area, 60).trim()
      if (!area) return null
      const rawDraft = item.draft && typeof item.draft === 'object' ? item.draft : null
      const text = rawDraft ? cleanText(rawDraft.text, 6000).trim() : ''
      return {
        area,
        why: cleanText(item.why, 400).trim(),
        firstStep: cleanText(item.firstStep, 300).trim(),
        deliverable: cleanText(item.deliverable, 300).trim(),
        draft: text
          ? {
              at: typeof rawDraft.at === 'string' && !Number.isNaN(Date.parse(rawDraft.at))
                ? new Date(rawDraft.at).toISOString()
                : new Date().toISOString(),
              text
            }
          : null
      }
    }).filter(Boolean).slice(0, 6)
    : []
  if (!items.length) return null
  return {
    at: typeof value.at === 'string' && !Number.isNaN(Date.parse(value.at)) ? new Date(value.at).toISOString() : new Date().toISOString(),
    model: cleanText(value.model, 120),
    items
  }
}

function normalizeIdea (value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim().slice(0, 80) : null
  const title = cleanText(value.title, MAX_TITLE).trim()
  if (!id || !title) return null
  const tags = Array.isArray(value.tags)
    ? [...new Set(value.tags.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS)
    : []
  const createdAt = typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
    ? new Date(value.createdAt).toISOString()
    : new Date().toISOString()
  const updatedAt = typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt))
    ? new Date(value.updatedAt).toISOString()
    : createdAt
  return {
    id,
    title,
    note: cleanText(value.note, MAX_NOTE),
    tags,
    status: STATUSES.has(value.status) ? value.status : 'spark',
    nextStep: cleanText(value.nextStep, MAX_STEP),
    research: normalizeResearch(value.research),
    associations: normalizeAssociations(value.associations),
    createdAt,
    updatedAt
  }
}

function normalizeState (value) {
  const ideas = Array.isArray(value?.ideas) ? value.ideas : []
  return {
    version: 1,
    ideas: ideas.map(normalizeIdea).filter(Boolean).slice(0, MAX_IDEAS)
  }
}

async function readBody (request) {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new ApiError('创意数据太大，无法保存。', 413)
  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) throw new ApiError('创意数据太大，无法保存。', 413)
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('请求内容不是有效的 JSON。')
  }
}

const RESEARCH_SYSTEM = [
  '你是一名审慎的产品与市场研究员，帮助个人把创意想清楚。',
  '你会收到一条创意，以及可选的公开网络检索结果。',
  '只输出一个 JSON 对象，不要输出任何解释、Markdown 代码块或多余文字。',
  'JSON 结构：{"priorArt":{"level":"none|similar|exists","summary":"..."},"commercial":{"score":0,"verdict":"...","reasons":["..."]},"applications":[{"area":"...","note":"..."}]}',
  'level 的含义：none=基本没找到同类提法；similar=有相近概念或相邻产品；exists=已有明确同类产品或公开方案。',
  'commercial.score 是 0-100 的整数，表示在中国市场里由个人或小团队做成的商用潜力；要保守，资料不足时给低分并说明。',
  'applications 给 2-5 个具体可用方向，每个一句说明。',
  '所有结论必须区分「检索到的事实」和「你的推断」，不要编造来源；引用检索结果时用 [编号]。'
].join('\n')

function stripFences (text) {
  const fenced = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(text)
  return (fenced ? fenced[1] : text).trim()
}

function parseJsonCandidates (text, open, close) {
  const cleaned = stripFences(String(text || ''))
  const start = cleaned.indexOf(open)
  const end = cleaned.lastIndexOf(close)
  const candidates = [cleaned]
  if (start >= 0 && end > start) {
    const sliced = cleaned.slice(start, end + 1)
    candidates.push(sliced)
    candidates.push(sliced.replace(/,\s*([}\]])/g, '$1'))
  }
  return candidates
}

function parseModelJson (text) {
  for (const candidate of parseJsonCandidates(text, '{', '}')) {
    try {
      const value = JSON.parse(candidate)
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
    } catch {}
  }
  return null
}

function parseModelArray (text) {
  for (const candidate of parseJsonCandidates(text, '[', ']')) {
    try {
      const value = JSON.parse(candidate)
      if (Array.isArray(value)) return value
    } catch {}
  }
  return null
}

/**
 * 让模型输出 JSON，并在解析失败时做一次「修复成 JSON」的重试。
 * 解析失败会把原始输出记进日志，便于下次定位是截断还是格式问题。
 */
async function askForJson (ctx, system, prompt, maxTokens, mode = 'object') {
  const first = await completeText(ctx, system, prompt, maxTokens)
  const parser = mode === 'array' ? parseModelArray : parseModelJson
  const value = parser(first.text)
  if (value) return value
  ctx.logger?.warn?.(`creativity-hall: ${mode} JSON parse failed (finish=${first.finish || 'unknown'}); raw=${String(first.text).slice(0, 600)}`)
  if (!String(first.text).trim()) throw new ApiError('模型没有返回内容，请重试。', 502)
  const repairPrompt = `把下面的内容改写成严格合法的 JSON ${mode === 'array' ? '数组' : '对象'}，只输出 JSON 本身，不要代码块或解释：\n\n${String(first.text).slice(0, 6000)}`
  const repaired = await completeText(ctx, '你是 JSON 修复器。只输出一个严格合法的 JSON，不要代码块、注释或解释。', repairPrompt, 2000)
  const repairedValue = parser(repaired.text)
  if (repairedValue) return repairedValue
  throw new ApiError(first.finish === 'max-tokens'
    ? '模型输出被截断，请重试。'
    : '模型返回的内容无法解析，请重试。', 502)
}

function buildResearchPrompt (idea, sources, searchNote) {
  const lines = [
    `创意标题：${idea.title}`,
    idea.note ? `补充描述：${idea.note}` : '补充描述：（无）',
    idea.tags.length ? `标签：${idea.tags.join('、')}` : '标签：（无）',
    idea.nextStep ? `下一步：${idea.nextStep}` : '下一步：（无）',
    ''
  ]
  if (sources.length) {
    lines.push('公开检索结果（可能相关，也可能不相关）：')
    for (const [index, source] of sources.entries()) {
      lines.push(`[${index + 1}] ${source.title || '(无标题)'} — ${source.url}`)
      if (source.snippet) lines.push(`    摘要：${source.snippet}`)
    }
  } else {
    lines.push('公开检索结果：无。')
  }
  if (searchNote) lines.push('', `检索说明：${searchNote}`)
  lines.push('', '请按系统提示的 JSON 结构，输出对这条创意的查新结论、商用价值和可用方向。')
  return lines.join('\n')
}

async function runResearch (ctx, idea) {
  const llm = ctx.get('llm')
  const models = ctx.get('agentDefaultModel')
  if (!llm || !models) {
    throw new ApiError('这个 DSH Desktop 没有提供可用的模型服务，暂时无法生成评估。', 503)
  }
  const web = ctx.get('web')
  const queries = [idea.title.slice(0, 80)]
  queries.push(idea.tags.length
    ? `${idea.title.slice(0, 60)} ${idea.tags.slice(0, 2).join(' ')}`.trim()
    : `${idea.title.slice(0, 60)} 产品 已有`)

  let sources = []
  let online = false
  let searchNote = ''
  if (web) {
    try {
      const seen = new Map()
      for (const query of queries) {
        const result = await web.search({ query, maxResults: 5 }, AbortSignal.timeout(20000))
        for (const source of result?.sources || []) {
          if (!source || !source.url || seen.has(source.url)) continue
          seen.set(source.url, {
            url: String(source.url).slice(0, 500),
            title: String(source.title || '').slice(0, 200),
            snippet: String(source.snippet || '').slice(0, 400)
          })
        }
      }
      sources = [...seen.values()].slice(0, 8)
      online = sources.length > 0
      if (!sources.length) searchNote = '本次检索没有返回可用来源。'
    } catch (error) {
      searchNote = '本次联网检索没有成功，结论主要基于创意本身。'
      ctx.logger?.warn?.(`creativity-hall search: ${error?.stack ?? error}`)
    }
  } else {
    searchNote = '当前环境没有联网检索能力，结论主要基于创意本身。'
  }

  const selection = models.currentSelection()
  const parsed = await askForJson(ctx, RESEARCH_SYSTEM, buildResearchPrompt(idea, sources, searchNote), 2400)

  return normalizeResearch({
    at: new Date().toISOString(),
    model: `${selection.provider}/${selection.model}`,
    online,
    query: queries.join(' | '),
    priorArt: { ...(parsed.priorArt || {}), sources },
    commercial: parsed.commercial || {},
    applications: parsed.applications || []
  })
}

const DISCOVER_SYSTEM = [
  '你是一名创意编辑，专门从公开网络里找「有人提出过、但还没看到成熟实现」的创意。',
  '你会收到一组搜索结果（标题、摘要、链接编号）。',
  '只输出一个 JSON 数组，不要输出解释、Markdown 代码块或多余文字。',
  '数组元素结构：{"title":"...","summary":"...","source":1}',
  'title 是具体可执行的一句话创意，不要照抄网页标题；summary 一句话说明需求，以及目前是没人做还是做得不好；source 是所用来源的编号。',
  '只保留确实像「未实现或实现得很粗糙」的创意；宁少勿滥，最多 8 条；不要编造来源。'
].join('\n')

function hostOf (url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

async function searchSources (ctx, queries) {
  const web = ctx.get('web')
  if (!web) throw new ApiError('这个 DSH Desktop 没有提供联网检索能力，暂时无法浏览网络灵感。', 503)
  const seen = new Map()
  let failures = 0
  for (const query of queries) {
    try {
      const result = await web.search({ query, maxResults: 6 }, AbortSignal.timeout(20000))
      for (const source of result?.sources || []) {
        if (!source?.url || !/^https?:\/\//i.test(source.url) || seen.has(source.url)) continue
        seen.set(source.url, {
          url: String(source.url).slice(0, 500),
          title: String(source.title || '').slice(0, 200),
          snippet: String(source.snippet || '').slice(0, 400)
        })
      }
    } catch {
      failures++
    }
  }
  if (!seen.size) {
    throw new ApiError(failures ? '联网检索没有成功，请稍后再试。' : '这次没有检索到可用来源，换个主题试试。', 502)
  }
  return [...seen.values()].slice(0, 10)
}

async function completeText (ctx, system, prompt, maxTokens) {
  const llm = ctx.get('llm')
  const models = ctx.get('agentDefaultModel')
  if (!llm || !models) return { text: '', finish: 'unavailable' }
  const selection = models.currentSelection()
  const stream = llm.stream({
    provider: selection.provider,
    model: selection.model,
    ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
    system,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxTokens,
    temperature: 0.4,
    signal: AbortSignal.timeout(120000)
  })
  let text = ''
  let finish = ''
  for await (const chunk of stream) {
    if (chunk?.type === 'text-delta') text += chunk.text
    else if (chunk?.type === 'finish') {
      finish = chunk.reason?.kind || ''
      if (finish === 'error') throw new Error(chunk.reason?.failure?.message || '模型调用失败。')
      if (finish === 'aborted') throw new Error('生成被中断，请重试。')
    }
  }
  return { text, finish }
}

function fallbackFeedItems (sources) {
  return sources.slice(0, 8).map((source) => ({
    title: cleanText(source.title, 120).trim() || hostOf(source.url),
    summary: cleanText(source.snippet, 300).trim(),
    url: source.url,
    host: hostOf(source.url)
  }))
}

async function runDiscover (ctx, { query, page }) {
  const topic = cleanText(query, 100).trim()
  const queries = topic
    ? [topic]
    : (() => {
        const start = (Math.max(0, Number(page) || 0) * 3) % FEED_QUERIES.length
        return [0, 1, 2].map((offset) => FEED_QUERIES[(start + offset) % FEED_QUERIES.length])
      })()
  const sources = await searchSources(ctx, queries)
  let items = null
  try {
    const prompt = [
      topic ? `主题：${topic}` : '主题：公开网络上的未实现创意',
      '',
      '搜索结果：',
      ...sources.map((source, index) => `[${index + 1}] ${source.title || '(无标题)'} — ${source.url}\n    摘要：${source.snippet || '（无）'}`)
    ].join('\n')
    const list = await askForJson(ctx, DISCOVER_SYSTEM, prompt, 2000, 'array')
    if (list) {
      items = list.map((item) => {
        const source = sources[Number(item?.source) - 1]
        if (!source) return null
        const title = cleanText(item?.title, 120).trim()
        if (!title) return null
        return {
          title,
          summary: cleanText(item?.summary, 300).trim(),
          url: source.url,
          host: hostOf(source.url)
        }
      }).filter(Boolean).slice(0, 8)
    }
  } catch (error) {
    ctx.logger?.warn?.(`creativity-hall discover: ${error?.stack ?? error}`)
  }
  const extracted = Array.isArray(items) && items.length > 0
  if (!extracted) items = fallbackFeedItems(sources)
  if (!items.length) throw new ApiError('这次没有找到合适的创意线索，换个主题再试。', 502)
  return { items, queries, extracted }
}

const ASSOCIATE_SYSTEM = [
  '你是一名动手型项目顾问，帮个人把创意拆成「要做成它，需要什么」。',
  '你会收到一条创意。只输出一个 JSON 对象，不要输出解释、Markdown 代码块或多余文字。',
  '结构：{"items":[{"area":"...","why":"...","firstStep":"...","deliverable":"..."}]}',
  '要求：',
  '- 4-6 项，覆盖这个创意最缺的能力、材料、知识、工具或合作方，按重要性排序。',
  '- area 是具体领域，例如「PCB 原理图与打样」「嵌入式程序」「机械结构」「供应链」；不要写「市场调研」这类空泛项。',
  '- why 一句话说明为什么需要。',
  '- firstStep 是个体一天内能开始的动作。',
  '- deliverable 是 AI 能直接产出的东西（一份清单、一段示例代码、一个模板、一份物料清单草案），要具体，不要写「帮你规划」。'
].join('\n')

const DRAFT_SYSTEM = [
  '你是一名动手型助手。用户会给你一条创意和其中一个待办领域，请直接产出可用的初稿。',
  '要求：具体、可执行；不要客套和免责声明；400-800 字；用短段落和「-」列表。',
  '如果是编程，给出可运行的最小代码片段并注明依赖；如果是硬件，给出元件清单草案、接口或布局注意点。',
  '结尾用一行说明「这是初稿，需要按实际情况调整」。'
].join('\n')

function requireModel (ctx) {
  if (!ctx.get('llm') || !ctx.get('agentDefaultModel')) {
    throw new ApiError('这个 DSH Desktop 没有提供可用的模型服务，暂时无法生成联想。', 503)
  }
}

function modelLabel (ctx) {
  try {
    const selection = ctx.get('agentDefaultModel').currentSelection()
    return selection ? `${selection.provider}/${selection.model}` : ''
  } catch {
    return ''
  }
}

function buildIdeaBrief (idea) {
  return [
    `创意：${idea.title}`,
    idea.note ? `描述：${idea.note}` : '',
    idea.tags && idea.tags.length ? `标签：${idea.tags.join('、')}` : '',
    '请给出这个创意要做成，需要哪些具体能力或材料。'
  ].filter(Boolean).join('\n')
}

async function runAssociate (ctx, idea) {
  requireModel(ctx)
  const parsed = await askForJson(ctx, ASSOCIATE_SYSTEM, buildIdeaBrief(idea), 2400)
  const items = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(items)) throw new ApiError('模型返回的内容无法解析，请重试。', 502)
  const associations = normalizeAssociations({
    at: new Date().toISOString(),
    model: modelLabel(ctx),
    items
  })
  if (!associations) throw new ApiError('模型没有给出可用的联想，请重试。', 502)
  return associations
}

async function runDraft (ctx, idea, area, deliverable) {
  requireModel(ctx)
  const prompt = [
    `创意：${idea.title}`,
    idea.note ? `描述：${idea.note}` : '',
    '',
    `要处理的领域：${area}`,
    deliverable ? `期望产出：${deliverable}` : '',
    '请直接给出初稿。'
  ].filter(Boolean).join('\n')
  const { text: raw } = await completeText(ctx, DRAFT_SYSTEM, prompt, 2200)
  const text = cleanText(raw, 6000).trim()
  if (!text) throw new ApiError('模型没有返回内容，请重试。', 502)
  return { at: new Date().toISOString(), text }
}

export function apply (ctx, config) {
  const file = join(config.root, 'ideas.json')
  let queue = Promise.resolve()

  async function readState () {
    try {
      const text = await readFile(file, 'utf8')
      return normalizeState(JSON.parse(text))
    } catch (error) {
      if (error?.code === 'ENOENT') return { version: 1, ideas: [] }
      throw error
    }
  }

  function writeState (state) {
    const task = queue.then(async () => {
      await mkdir(config.root, { recursive: true })
      const target = `${file}.tmp`
      await writeFile(target, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
      await rename(target, file)
      return { ok: true, count: state.ideas.length }
    })
    queue = task.catch(() => {})
    return task
  }

  const json = (body, status = 200) => Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' }
  })

  const failure = (error) => {
    if (error instanceof ApiError) return json({ error: error.message }, error.status)
    ctx.logger?.warn?.(`creativity-hall: ${error?.stack ?? error}`)
    return json({ error: '创意堂暂时无法读取数据，请稍后重试。' }, 500)
  }

  const researchFailure = (error) => {
    if (error instanceof ApiError) return json({ error: error.message }, error.status)
    ctx.logger?.warn?.(`creativity-hall research: ${error?.stack ?? error}`)
    return json({ error: '评估没有完成，请稍后重试。' }, 502)
  }

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/state',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch () {
      try {
        return json(await readState())
      } catch (error) {
        return failure(error)
      }
    }
  })

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/state/write',
    methods: ['PUT'],
    requestBody: 'buffered',
    async fetch (request) {
      try {
        const state = normalizeState(await readBody(request))
        return json(await writeState(state))
      } catch (error) {
        return failure(error)
      }
    }
  })

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/health',
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch () {
      try {
        await mkdir(config.root, { recursive: true })
        const state = await readState()
        return json({ ok: true, count: state.ideas.length, root: config.root })
      } catch (error) {
        return failure(error)
      }
    }
  })

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/research',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch (request) {
      try {
        const payload = await readBody(request)
        const title = cleanText(payload?.title, MAX_TITLE).trim()
        if (!title) throw new ApiError('请先填写创意标题。')
        return json({ research: await runResearch(ctx, {
          title,
          note: cleanText(payload?.note, 1200),
          tags: Array.isArray(payload?.tags) ? payload.tags.map(normalizeTag).filter(Boolean).slice(0, MAX_TAGS) : [],
          nextStep: cleanText(payload?.nextStep, 600)
        }) })
      } catch (error) {
        return researchFailure(error)
      }
    }
  })

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/discover',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch (request) {
      try {
        const payload = await readBody(request)
        return json(await runDiscover(ctx, { query: payload?.query, page: payload?.page }))
      } catch (error) {
        return researchFailure(error)
      }
    }
  })

  const ideaFromPayload = async (request) => {
    const payload = await readBody(request)
    const title = cleanText(payload?.title, MAX_TITLE).trim()
    if (!title) throw new ApiError('请先填写创意标题。')
    return {
      title,
      note: cleanText(payload?.note, 1200),
      tags: Array.isArray(payload?.tags) ? payload.tags.map(normalizeTag).filter(Boolean).slice(0, MAX_TAGS) : [],
      area: cleanText(payload?.area, 60).trim(),
      deliverable: cleanText(payload?.deliverable, 300).trim()
    }
  }

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/associate',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch (request) {
      try {
        const idea = await ideaFromPayload(request)
        return json({ associations: await runAssociate(ctx, idea) })
      } catch (error) {
        return researchFailure(error)
      }
    }
  })

  ctx.connection.fetch.register({
    path: '/api/creativity-hall/draft',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch (request) {
      try {
        const idea = await ideaFromPayload(request)
        if (!idea.area) throw new ApiError('请指定要处理的领域。')
        return json({ draft: await runDraft(ctx, idea, idea.area, idea.deliverable) })
      } catch (error) {
        return researchFailure(error)
      }
    }
  })
}
