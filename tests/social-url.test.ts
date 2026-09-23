import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSocialUrl } from '../src/lib/social-url';

test('normalizes handles and known platform URLs', () => {
  assert.equal(normalizeSocialUrl('instagram', '@brayden.petersen'), 'https://instagram.com/brayden.petersen');
  assert.equal(normalizeSocialUrl('twitter', 'https://www.twitter.com/bmptrsn?s=20'), 'https://x.com/bmptrsn');
  assert.equal(normalizeSocialUrl('github', 'braydenpetersen'), 'https://github.com/braydenpetersen');
  assert.equal(normalizeSocialUrl('instagram', ''), '');
});
test('rejects wrong hosts, deceptive hosts, credentials and non-profile paths', () => {
  for (const value of ['https://example.com/person', 'https://instagram.com.evil.com/person', 'https://instagram.com@evil.com/person', 'https://user:pass@instagram.com/person', 'javascript:alert(1)', 'https://instagram.com/p/123']) {
    assert.equal(normalizeSocialUrl('instagram', value), null, value);
  }
  assert.equal(normalizeSocialUrl('twitter', 'https://instagram.com/person'), null);
});
