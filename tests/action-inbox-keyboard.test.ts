import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web=(path:string)=>readFile(new URL(`../../apps/web/${path}`,import.meta.url),'utf8');

test('Action Inbox keyboard shortcuts cover only reversible view moves',async()=>{
  const page=await web('action-inbox.html');
  assert.match(page,/key==='j'\|\|key==='k'/);assert.match(page,/key==='z'/);assert.match(page,/undoHide/);
  const handler=page.slice(page.indexOf("document.addEventListener('keydown'"),page.indexOf('</script>',page.indexOf("document.addEventListener('keydown'")));
  assert.doesNotMatch(handler,/resolveApproval|approve|reject/);
});
