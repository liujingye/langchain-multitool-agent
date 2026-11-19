import { tool } from 'langchain';
import { z } from 'zod';
import { evaluate, formatNumber } from '../lib/math.js';

export const calculatorTool = tool(
  async ({ expression }) => {
    try {
      return JSON.stringify({ expression, result: formatNumber(evaluate(expression)) });
    } catch (err) {
      return JSON.stringify({ expression, error: err.message });
    }
  },
  {
    name: 'calculator',
    description:
      '精确计算数学表达式。凡是涉及数值运算（四则运算、百分比、乘方、开方、三角函数、对数、阶乘、单位换算中的算术）都必须使用此工具，不要心算。',
    schema: z.object({
      expression: z
        .string()
        .describe('合法的数学表达式，支持 + - * / % ^ ! ( ) 以及 sqrt, cbrt, abs, exp, sin, cos, tan, asin, acos, atan, ln, log(以10为底), log2, floor, ceil, round, min, max, pow 和常量 pi, e。三角函数使用弧度。例如 "sqrt(16) + 2^10 * 3%"'),
    }),
  },
);
