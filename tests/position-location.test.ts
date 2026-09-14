import test from 'node:test';
import assert from 'node:assert/strict';
import { cityCountry } from '../src/lib/position-location';
test('profile locations show city and country without region or arrangement', () => {
  assert.equal(cityCountry('Toronto, Ontario, Canada · Hybrid'), 'Toronto, Canada');
  assert.equal(cityCountry('San Francisco, California, United States · On-site'), 'San Francisco, United States');
  assert.equal(cityCountry('London, United Kingdom'), 'London, United Kingdom');
  assert.equal(cityCountry('Remote'), null);
  assert.equal(cityCountry(null), null);
});
