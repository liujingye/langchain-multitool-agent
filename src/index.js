import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createMultiToolAgent } from './agent.js';
import { createModel } from './llm.js';
import { runAgent } from './runner.js';

const c = { dim: (s) => `\x1b[2m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m` };
const truncate = (s, n = 200) => (s.length > n ? `${s.slice(0, n)}...` : s);

async function ask(agent, question, threadId) {
  let streaming = false;
  for await (const event of runAgent(agent, question, { threadId })) {
    switch (event.type) {
      case 'token':
        if (!streaming) stdout.write(c.green('\n助手: ')), (streaming = true);
        stdout.write(event.text);
        break;
      case 'tool_call':
        if (streaming) stdout.write('\n'), (streaming = false);
        console.log(c.cyan(`  → 调用 ${event.name}(${JSON.stringify(event.args)})`));
        break;
      case 'tool_result':
        console.log(c.dim(`  ↳ ${event.name}: ${truncate(event.content)}`));
        break;
      case 'done':
        stdout.write('\n\n');
    }
  }
}

async function main() {
  const agent = createMultiToolAgent({ model: createModel() });
  let threadId = randomUUID();

  const oneShot = process.argv.slice(2).join(' ').trim();
  if (oneShot) return ask(agent, oneShot, threadId);

  const rl = createInterface({ input: stdin, output: stdout });
  console.log('多工具 Agent 已启动（天气 / 计算器 / 搜索）。输入 /new 开启新会话，/exit 退出。\n');
  while (true) {
    const q = (await rl.question('你: ')).trim();
    if (!q) continue;
    if (q === '/exit') break;
    if (q === '/new') {
      threadId = randomUUID();
      console.log(c.dim('已开启新会话\n'));
      continue;
    }
    try {
      await ask(agent, q, threadId);
    } catch (err) {
      console.error(`\n[错误] ${err.message}\n`);
    }
  }
  rl.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
