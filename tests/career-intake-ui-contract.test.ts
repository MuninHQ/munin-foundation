import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const htmlPath = resolve(process.cwd(), 'apps/web/career-intake.html');

async function careerIntakeHtml() {
  return readFile(htmlPath, 'utf8');
}

test('career intake keeps URL, text and screenshot entry points', async () => {
  const html = await careerIntakeHtml();
  assert.match(html, /id="url"/);
  assert.match(html, /id="text"/);
  assert.match(html, /id="file"[^>]+accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(html, /addEventListener\('paste'/);
  assert.match(html, /ondrop=/);
});

test('career intake remains mobile responsive', async () => {
  const html = await careerIntakeHtml();
  assert.match(html, /name="viewport" content="width=device-width,initial-scale=1"/);
  assert.match(html, /@media\(max-width:850px\)/);
  assert.match(html, /\.grid\{grid-template-columns:1fr\}/);
});

test('career intake preserves analyze-before-commit safety boundary', async () => {
  const html = await careerIntakeHtml();
  assert.match(html, /\/api\/career-intake\/analyze/);
  assert.match(html, /\/api\/career-intake\/commit/);
  assert.match(html, /A vaga ainda não foi adicionada ao pipeline/);
  assert.match(html, /Adicionar ao pipeline/);
});

test('career intake keeps screenshot payload ephemeral until analysis', async () => {
  const html = await careerIntakeHtml();
  assert.match(html, /let imagePayload=null,lastAnalysis=null/);
  assert.match(html, /payload\(true\)/);
  assert.match(html, /payload\(false\)/);
  assert.match(html, /p\.extractedText=lastAnalysis\.extractedText\|\|p\.text/);
});
