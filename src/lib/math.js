/**
 * 安全的数学表达式求值器（递归下降解析，不使用 eval）
 *
 * expr    := term (('+' | '-') term)*
 * term    := unary (('*' | '/' | '%') unary)*
 * unary   := ('+' | '-') unary | power
 * power   := postfix ('^' unary)?          // 右结合，-2^2 = -4
 * postfix := primary '!'*
 * primary := number | const | func '(' expr (',' expr)* ')' | '(' expr ')'
 */
const FUNCS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  ln: Math.log, log: Math.log10, log2: Math.log2,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E };

const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)|([a-zA-Z_]\w*)|(\*\*|[-+*/%^(),!]))/y;

function tokenize(input) {
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',');
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  while (TOKEN_RE.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN_RE.lastIndex))) break;
    const start = TOKEN_RE.lastIndex;
    const m = TOKEN_RE.exec(src);
    if (!m) throw new Error(`无法识别的字符: "${src.slice(start).trim()[0]}"`);
    if (m[1]) tokens.push({ type: 'num', value: Number(m[1]) });
    else if (m[2]) tokens.push({ type: 'id', value: m[2].toLowerCase() });
    else tokens.push({ type: 'op', value: m[3] === '**' ? '^' : m[3] });
  }
  return tokens;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('阶乘只支持非负整数');
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function evaluate(expression) {
  const tokens = tokenize(String(expression));
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek()?.type === 'op' && peek().value === v;
  const expect = (v) => {
    if (!isOp(v)) throw new Error(`期望 "${v}"`);
    pos++;
  };

  function parseExpr() {
    let left = parseTerm();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = tokens[pos++].value;
      const right = parseUnary();
      if ((op === '/' || op === '%') && right === 0) throw new Error('除数不能为 0');
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }

  function parseUnary() {
    if (isOp('+')) return pos++, parseUnary();
    if (isOp('-')) return pos++, -parseUnary();
    return parsePower();
  }

  function parsePower() {
    const base = parsePostfix();
    if (isOp('^')) {
      pos++;
      return base ** parseUnary();
    }
    return base;
  }

  function parsePostfix() {
    let v = parsePrimary();
    while (isOp('!')) pos++, (v = factorial(v));
    return v;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('表达式不完整');
    if (t.type === 'num') return pos++, t.value;
    if (isOp('(')) {
      pos++;
      const v = parseExpr();
      expect(')');
      return v;
    }
    if (t.type === 'id') {
      pos++;
      if (t.value in FUNCS && isOp('(')) {
        pos++;
        const args = [parseExpr()];
        while (isOp(',')) pos++, args.push(parseExpr());
        expect(')');
        return FUNCS[t.value](...args);
      }
      if (t.value in CONSTS) return CONSTS[t.value];
      throw new Error(`未知的标识符: ${t.value}`);
    }
    throw new Error(`意外的符号: ${t.value}`);
  }

  if (tokens.length === 0) throw new Error('表达式为空');
  const result = parseExpr();
  if (pos < tokens.length) throw new Error(`意外的符号: ${tokens[pos].value}`);
  if (Number.isNaN(result)) throw new Error('计算结果不是有效数字');
  return result;
}

export const formatNumber = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(12))));
