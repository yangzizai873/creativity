// 本地测试替身：真实宿主会把官方 @deepseek-ai/schemastery 注入插件。
const string = () => {
  const schema = { type: 'string' }
  schema.required = () => ({ type: 'string', required: true })
  return schema
}

const Schema = {
  string,
  object: (shape) => ({ type: 'object', shape })
}

export default Schema
