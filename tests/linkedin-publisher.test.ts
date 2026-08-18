import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { addLinkedInPost } from '../src/linkedin-content.js';
import { approveForPublication, markManuallyPublished, publicationPackage, publisherPolicy, revokePublicationApproval } from '../src/linkedin-publisher.js';

test('publisher requires explicit approval and never enables external writes', async () => {
  const dir=await mkdtemp(path.join(tmpdir(),'munin-publisher-'));
  const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
  try{
    const post=await addLinkedInPost({title:'Governed post',body:'Body',status:'draft',themes:['Produto']});
    await assert.rejects(()=>publicationPackage(post.id),/Explicit approval/);
    const approved=await approveForPublication(post.id);
    assert.equal(approved.status,'approved');
    const pack=await publicationPackage(post.id);
    assert.equal(pack.body,'Body');
    assert.equal(pack.publicationBoundary,'manual-only');
    assert.equal(publisherPolicy().externalWriteAllowed,false);
    await assert.rejects(()=>markManuallyPublished(post.id,{url:'https://www.linkedin.com/posts/example',confirmation:'wrong'}),/confirmation/);
    const published=await markManuallyPublished(post.id,{url:'https://www.linkedin.com/posts/example',confirmation:'I_PUBLISHED_THIS_MANUALLY'});
    assert.equal(published.status,'published');
    assert.match(published.publishedUrl??'',/^https:\/\//);
  } finally { if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true}); }
});

test('publisher approval can be revoked before publication', async () => {
  const dir=await mkdtemp(path.join(tmpdir(),'munin-publisher-'));
  const previous=process.env.MUNIN_DATA_DIR;process.env.MUNIN_DATA_DIR=dir;
  try{
    const post=await addLinkedInPost({title:'Revocable post',body:'Body',status:'draft'});
    await approveForPublication(post.id);
    const revoked=await revokePublicationApproval(post.id,'Needs revision');
    assert.equal(revoked.status,'revoked');
    await assert.rejects(()=>publicationPackage(post.id),/Explicit approval/);
  } finally { if(previous===undefined)delete process.env.MUNIN_DATA_DIR;else process.env.MUNIN_DATA_DIR=previous;await rm(dir,{recursive:true,force:true}); }
});
