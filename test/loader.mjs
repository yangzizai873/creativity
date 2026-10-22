// 测试用解析钩子：把宿主的 @deepseek-ai/schemastery 映射到本地替身，
// 这样测试不需要在包目录里留 node_modules，也不会把替身打进安装包。
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const stub = pathToFileURL(resolve(import.meta.dirname, 'stubs/schemastery.js')).href

registerHooks({
  resolve (specifier, context, nextResolve) {
    if (specifier === '@deepseek-ai/schemastery') return { url: stub, shortCircuit: true }
    return nextResolve(specifier, context)
  }
})
