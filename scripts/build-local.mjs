import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import JSZip from 'jszip';

const archive = await JSZip.loadAsync(await readFile('FCRM-Chrome-3.3.zip'));
for (const [name, entry] of Object.entries(archive.files)) {
  if (entry.dir) continue;
  const packaged = await entry.async('nodebuffer');
  const local = await readFile('FCRM-Chrome-3.3/' + name);
  if (!packaged.equals(local)) throw new Error('ZIP отличается от файлов предпросмотра: ' + name + '. Выполните npm run build:all.');
}

const result = await build({
  build: { write: false, rollupOptions: { output: { inlineDynamicImports: true } } },
});
const files = (Array.isArray(result) ? result[0] : result).output;
const js = files.find(file => file.type === 'chunk' && file.isEntry);
const css = files.filter(file => file.fileName.endsWith('.css')).map(file => file.source).join('\n');
const template = await readFile('index.html', 'utf8');
const html = template.replace(/^.*<link .*fonts\.(?:googleapis|gstatic)\.com.*\r?\n/gm, '')
  .replace('</head>', () => '<style>' + css + '</style></head>')
  .replace('<script type="module" src="/src/main.tsx"></script>', () =>
    '<script type="module">' + js.code.replace(/<\/script/gi, '<\\/script') + '</script>');
await writeFile('Конструктор.html', html);
