import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('Phase 4 public routes exist', () => {
  for (const p of ['app/page.js','app/o-nama/page.js','app/turniri/page.js','app/prijave/page.js','app/poredak/page.js','app/rezultati/page.js','app/vijesti/page.js','app/faq/page.js','app/kontakt/page.js']) assert.ok(fs.existsSync(p), p);
});

test('public navigation contains requested portal sections', () => {
  const h = read('app/components/PublicHeader.js');
  for (const text of ['O nama','Turniri','Ljestvice','Rezultati','Vijesti','FAQ','Kontakt','Prijavi se']) assert.match(h, new RegExp(text));
});

test('SEO metadata and sitemap are present', () => {
  assert.match(read('app/layout.js'), /metadataBase/);
  assert.match(read('app/layout.js'), /robots/);
  assert.ok(fs.existsSync('app/sitemap.js'));
  assert.ok(fs.existsSync('app/robots.js'));
});

test('mobile responsive styles are present', () => {
  const css = read('app/public.css');
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
});
