import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLinkedIn } from '../src/lib/linkedin';

test('normalizes LinkedIn handles, paths and tracked URLs', () => {
  for (const input of [' alex-rivera ', 'in/alex-rivera', '/in/alex-rivera/', '@alex-rivera', 'https://www.linkedin.com/in/alex-rivera/?utm_source=share#about', 'linkedin.com/in/alex-rivera', 'https://ca.linkedin.com/in/alex-rivera?trk=share']) {
    assert.equal(normalizeLinkedIn(input), 'https://www.linkedin.com/in/alex-rivera', input);
  }
  assert.equal(normalizeLinkedIn(''), '');
});
test('rejects unrelated hosts and non-profile LinkedIn paths', () => {
  for (const input of ['https://linkedin.com.evil.test/in/alex', 'https://evil.test/in/alex', 'https://www.linkedin.com/company/example', 'javascript:alert(1)', 'a/b', 'first last', 'https://user@linkedin.com/in/alex', 'https://linkedin.com/in/alex/extra']) assert.equal(normalizeLinkedIn(input), null, input);
});
