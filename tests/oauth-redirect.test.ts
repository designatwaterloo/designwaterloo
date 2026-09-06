import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { oauthRedirect } from '../src/lib/auth/redirect';

test('SDK authorize request uses the exact allowlisted callback even with a destination', async () => {
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce' },
  });
  for (const origin of ['http://localhost:3000','https://www.designwaterloo.com']) {
    const target = oauthRedirect(origin, '/directory/me?edit=true');
    const { data, error } = await client.auth.signInWithOAuth({ provider:'azure', options:{ redirectTo:target.redirectTo, skipBrowserRedirect:true } });
    assert.equal(error,null);
    assert.equal(new URL(data.url!).searchParams.get('redirect_to'),origin+'/auth/callback');
    assert.match(target.cookie,/dw-auth-next=%2Fdirectory%2Fme%3Fedit%3Dtrue;/);
    assert.equal(target.cookie.includes('; Secure'),origin.startsWith('https:'));
  }
  assert.match(oauthRedirect('https://www.designwaterloo.com','//evil.example').cookie,/dw-auth-next=%2Fdashboard;/);
});
