import { writeFileSync } from 'node:fs';
import { screens } from './screens.mjs';
import { themes } from './themes.mjs';
import { page } from './base.mjs';

const dir = new URL('.', import.meta.url).pathname;

const screensHtml = screens
  .map(
    (s) => `<figure class="shot">
  <div class="phone">${s.html}</div>
  <figcaption class="shot-cap"><b>${s.label}</b><i>${s.note}</i></figcaption>
</figure>`
  )
  .join('\n');

themes.forEach((theme, i) => {
  const html = page({ theme, screensHtml, n: i + 1 });
  writeFileSync(`${dir}${theme.id}.html`, html);
  console.log(`${theme.id}.html  ${(html.length / 1024).toFixed(1)} KB`);
});
