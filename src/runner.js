import { AIMessageChunk } from '@langchain/core/messages';

/**
 * 以事件流的方式运行 Agent，把 LangGraph 的底层流统一成几类业务事件：
 * - { type: 'token', text }                   模型输出的文本增量
 * - { type: 'tool_call', name, args, id }     模型决定调用工具
 * - { type: 'tool_result', name, content, id } 工具执行结果
 * - { type: 'done', answer }                  最终答案
 * UI 层（CLI / HTTP / SSE）只需要消费这些事件，与 Agent 实现解耦。
 */
export async function* runAgent(agent, input, { threadId = 'default', signal } = {}) {
  const stream = await agent.stream(
    { messages: [{ role: 'user', content: input }] },
    { configurable: { thread_id: threadId }, streamMode: ['messages', 'updates'], signal },
  );

  let answer = '';
  // updates 模式的每个节点输出是累积状态而非增量，同一消息会被多个节点重复上报，按 id 去重
  const seenCalls = new Set();
  const seenResults = new Set();
  for await (const [mode, chunk] of stream) {
    if (mode === 'messages') {
      const [msg] = chunk;
      if (AIMessageChunk.isInstance(msg) && msg.text) yield { type: 'token', text: msg.text };
      continue;
    }

    for (const update of Object.values(chunk ?? {})) {
      for (const msg of update?.messages ?? []) {
        if (msg.type === 'ai') {
          for (const call of msg.tool_calls ?? []) {
            const key = call.id ?? `${call.name}:${JSON.stringify(call.args)}`;
            if (seenCalls.has(key)) continue;
            seenCalls.add(key);
            yield { type: 'tool_call', name: call.name, args: call.args, id: call.id };
          }
          if (!msg.tool_calls?.length && msg.text) answer = msg.text;
        } else if (msg.type === 'tool') {
          const key = msg.tool_call_id ?? `${msg.name}:${msg.text}`;
          if (seenResults.has(key)) continue;
          seenResults.add(key);
          yield { type: 'tool_result', name: msg.name, content: msg.text, id: msg.tool_call_id };
        }
      }
    }
  }
  yield { type: 'done', answer };
}
