// 客户端入口的接线测试：确认模块 id、注册参数和 inject 正确，不渲染 DOM。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
assert.match(source, /__ModuleLoader__\.load\(\{\s*id: 'dsh-creativity-hall'/, '模块 id 与包名一致')

let definition
globalThis.window = {
  __ModuleLoader__: { load: (value) => { definition = value } }
}

await import('../lib/client.js')
assert.ok(definition, '调用了 __ModuleLoader__.load')
assert.equal(definition.id, 'dsh-creativity-hall')

const ReactStub = {}
const requireStub = createRequire(import.meta.url)
const factoryRequire = (name) => {
  if (name === 'react') return ReactStub
  return requireStub(name)
}

const exported = definition.factory(factoryRequire)
assert.equal(typeof exported.apply, 'function')
assert.deepEqual(exported.inject, ['desktopWorkbenches'])

let descriptor = null
const ctx = {
  effect (callback) {
    const disposer = callback()
    return () => { if (typeof disposer === 'function') disposer() }
  },
  desktopWorkbenches: {
    register (value, Component) {
      descriptor = { value, Component }
      return () => {}
    }
  }
}

exported.apply(ctx)

assert.ok(descriptor, '注册了业务面板')
assert.equal(descriptor.value.title, '创意堂')
assert.equal(descriptor.value.panelTitle, '创意堂')
assert.equal(descriptor.value.customFrame, true)
assert.match(descriptor.value.description, /创意/)
assert.match(descriptor.value.repository, /^https:\/\/github\.com\/[^/]+\/[^/]+$/)
assert.equal(typeof descriptor.Component, 'function')

console.log('client tests: 全部通过')
