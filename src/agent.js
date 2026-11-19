import { MemorySaver } from '@langchain/langgraph-checkpoint';
import {
  createAgent,
  dynamicSystemPromptMiddleware,
  modelCallLimitMiddleware,
  modelRetryMiddleware,
  toolCallLimitMiddleware,
  toolRetryMiddleware,
} from 'langchain';
import { config } from './config.js';
import { networkToolNames, tools as defaultTools } from './tools/index.js';

export const buildSystemPrompt = (now = new Date()) => `你是一个多功能智能助手，可以调用工具来回答问题。
当前时间：${now.toLocaleString('zh-CN', { hour12: false })}（${Intl.DateTimeFormat().resolvedOptions().timeZone}）

## 可用工具
- get_weather：查询城市实时天气与预报
- calculator：精确数学计算
- web_search：搜索互联网获取外部或最新信息

## 工作流程
1. 分析意图：把用户问题拆解为若干子任务，判断每个子任务需要哪个工具；闲聊或常识问题可以直接回答。
2. 调用工具：彼此独立的子任务可以并行调用多个工具；有依赖关系时（如先查温度再计算温差），先拿到前一个结果再调用下一个。
3. 严禁编造：任何数值计算必须使用 calculator；天气与时事必须来自工具结果。
4. 错误处理：工具返回 error 时，尝试修正参数重试一次；仍失败则如实告知用户。
5. 整合回答：用中文给出结构清晰的最终答复，按子任务分点作答；引用搜索结果时附上来源链接。`;

/**
 * 创建多工具 Agent（ReAct 循环：模型推理 -> 调用工具 -> 观察结果 -> 再推理，直到给出最终答案）
 *
 * 中间件职责：
 * - dynamicSystemPrompt：每次调用模型前注入最新时间
 * - modelRetry / toolRetry：网络抖动时指数退避重试
 * - modelCallLimit / toolCallLimit：防止死循环与成本失控
 */
export function createMultiToolAgent({ model, tools = defaultTools, checkpointer = new MemorySaver() }) {
  return createAgent({
    model,
    tools,
    checkpointer,
    middleware: [
      dynamicSystemPromptMiddleware(() => buildSystemPrompt()),
      modelRetryMiddleware({ maxRetries: 2, initialDelayMs: 500 }),
      toolRetryMiddleware({ tools: networkToolNames, maxRetries: 2, initialDelayMs: 500, onFailure: 'continue' }),
      modelCallLimitMiddleware({ runLimit: config.agent.modelRunLimit, exitBehavior: 'end' }),
      toolCallLimitMiddleware({ runLimit: config.agent.toolRunLimit, exitBehavior: 'continue' }),
    ],
  });
}
