import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FakeToolCallingModel } from 'langchain';
import { createMultiToolAgent } from '../src/agent.js';
import { runAgent } from '../src/runner.js';

// 用假模型模拟 LLM 的决策，离线验证 Agent 的工具路由与事件流
test('Agent 按模型决策调用 calculator 并返回结果', async () => {
  const model = new FakeToolCallingModel({
    toolCalls: [[{ name: 'calculator', args: { expression: '(3 + 5) * 12' }, id: 'call_1' }], []],
  });
  const agent = createMultiToolAgent({ model });

  const events = [];
  for await (const e of runAgent(agent, '帮我算 (3+5)*12', { threadId: 't1' })) events.push(e);

  const call = events.find((e) => e.type === 'tool_call');
  const result = events.find((e) => e.type === 'tool_result');
  assert.equal(call.name, 'calculator');
  assert.deepEqual(call.args, { expression: '(3 + 5) * 12' });
  assert.equal(JSON.parse(result.content).result, '96');
  assert.equal(events.at(-1).type, 'done');
});
