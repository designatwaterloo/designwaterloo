import test from 'node:test';
import assert from 'node:assert/strict';
import { isAccountDestination } from '../src/lib/navigation';

test('profile and account actions bypass delayed curtain navigation, including edit query',()=>{
  for (const path of ['/directory/brayden-petersen-1','/directory/brayden-petersen-1?edit=true','/dashboard','/profile/edit','/sign-in?redirectTo=%2Fdashboard','/admin/members']) {
    assert.equal(isAccountDestination(path),true,path);
  }
  for (const path of ['/','/about','/directory','/directory?s=PRD','https://example.com/profile','//example.com/dashboard']) {
    assert.equal(isAccountDestination(path),false,path);
  }
});
