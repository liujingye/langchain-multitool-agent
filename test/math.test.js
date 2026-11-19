import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate } from '../src/lib/math.js';

test('四则运算与优先级', () => {
  assert.equal(evaluate('1 + 2 * 3'), 7);
  assert.equal(evaluate('(1 + 2) * 3'), 9);
  assert.equal(evaluate('10 / 4'), 2.5);
  assert.equal(evaluate('10 % 3'), 1);
  assert.equal(evaluate('3 × （2 ÷ 4）'), 1.5);
});

test('乘方右结合与一元负号', () => {
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('-2^2'), -4);
  assert.equal(evaluate('2^-1'), 0.5);
  assert.equal(evaluate('2**10'), 1024);
});

test('函数、常量、阶乘', () => {
  assert.equal(evaluate('sqrt(16) + abs(-3)'), 7);
  assert.equal(evaluate('max(1, 5, 3)'), 5);
  assert.equal(evaluate('5!'), 120);
  assert.ok(Math.abs(evaluate('sin(pi / 2)') - 1) < 1e-12);
  assert.equal(evaluate('1.5e3'), 1500);
});

test('非法输入抛错', () => {
  assert.throws(() => evaluate('1 / 0'), /除数不能为 0/);
  assert.throws(() => evaluate('1 +'), /不完整/);
  assert.throws(() => evaluate('process.exit()'), /未知的标识符|无法识别/);
  assert.throws(() => evaluate('(1 + 2'), /期望/);
  assert.throws(() => evaluate(''), /为空/);
});
