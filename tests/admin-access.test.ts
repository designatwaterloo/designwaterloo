import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasAdminAccess } from '../src/lib/admin-access';
test('review-only admins cannot use superadmin permissions',()=>{
 const user={app_metadata:{design_waterloo_role:'admin'}};
 assert.equal(hasAdminAccess('review',{is_admin:false},user),true);
 assert.equal(hasAdminAccess('superadmin',{is_admin:false},user),false);
 assert.equal(hasAdminAccess('review',null,user),false);
 assert.equal(hasAdminAccess('review',{is_admin:false},{app_metadata:{}}),false);
 assert.equal(hasAdminAccess('superadmin',{is_admin:true},user),true);
 assert.equal(hasAdminAccess('review',{is_admin:true},user),true);
});
test('editable metadata cannot grant review access; removing the role revokes it',()=>{
 const user={app_metadata:{design_waterloo_role:null},user_metadata:{design_waterloo_role:'admin',is_admin:true}};
 assert.equal(hasAdminAccess('review',{is_admin:false},user),false);
});
test('privileged routes retain the default superadmin guard; review is explicitly scoped',()=>{
 for(const route of ['data-issues','impersonate/[id]','members/[id]/set-admin','reviewers']) {
 const source=readFileSync(`src/app/api/admin/${route}/route.ts`,'utf8');
 assert.match(source,/await requireAdmin\(\)/);
 }
 for(const action of ['approve','reject']) {
 const source=readFileSync(`src/app/api/admin/members/[id]/${action}/route.ts`,'utf8');
 assert.match(source,/requireAdmin\("review"\)/);
 assert.match(source,/eq\("review_status", "pending_review"\)/);
 }
});
