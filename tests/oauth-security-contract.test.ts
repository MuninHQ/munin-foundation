import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReadOnlyOAuthScopes, oauthSecurityProfile } from '../src/oauth.js';

test('Gmail connector requests only read-only mailbox/calendar scopes',()=>{
 const profile=assertReadOnlyOAuthScopes('gmail');
 assert.equal(profile.readOnly,true);
 assert.equal(profile.externalMutationAllowed,false);
 assert.deepEqual(profile.writeScopes,[]);
 assert.ok(profile.scopes.some(scope=>scope.endsWith('/gmail.readonly')));
 assert.ok(profile.scopes.some(scope=>scope.endsWith('/calendar.readonly')));
 assert.equal(profile.scopes.some(scope=>/gmail\.(?:modify|compose|send)/i.test(scope)),false);
});

test('Outlook connector requests Mail.Read but no send/read-write scope',()=>{
 const profile=assertReadOnlyOAuthScopes('outlook');
 assert.equal(profile.readOnly,true);
 assert.equal(profile.externalMutationAllowed,false);
 assert.deepEqual(profile.writeScopes,[]);
 assert.ok(profile.scopes.includes('Mail.Read'));
 assert.equal(profile.scopes.some(scope=>/Mail\.(?:ReadWrite|Send)/i.test(scope)),false);
});

test('security profile makes local token-at-rest boundary explicit',()=>{
 for(const provider of ['gmail','outlook'] as const){
  const profile=oauthSecurityProfile(provider);
  assert.equal(profile.tokenStorage,'local-runtime-json');
  assert.equal(profile.readOnly,true);
 }
});
