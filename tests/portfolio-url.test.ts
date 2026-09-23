import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePortfolioUrl } from '../src/lib/portfolio-url';
test('accepts portfolio URLs with and without a protocol', () => {
  for (const value of [' example.com/work ', 'https://example.com/work', '//example.com/work']) assert.equal(normalizePortfolioUrl(value), 'https://example.com/work');
  assert.equal(normalizePortfolioUrl('www.example.com'), 'https://www.example.com/');
  assert.equal(normalizePortfolioUrl('http://example.com/work'), 'http://example.com/work');
  assert.equal(normalizePortfolioUrl(''), '');
});
test('removes tracking while retaining project parameters and anchors', () => {
  assert.equal(normalizePortfolioUrl('example.com/view?id=123&utm_source=share&fbclid=abc#project'), 'https://example.com/view?id=123#project');
  assert.equal(normalizePortfolioUrl('example.com/MyProject?key=a%2Fb#Chapter2'), 'https://example.com/MyProject?key=a%2Fb#Chapter2');
});
test('rejects malformed or non-web links', () => {
  for (const value of ['javascript:alert(1)', 'ftp://example.com', 'hello world', 'not-a-domain', 'https://person@example.com']) assert.equal(normalizePortfolioUrl(value), null);
});
