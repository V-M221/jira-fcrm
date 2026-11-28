import { useMemo } from 'react';
import JSZip from 'jszip';
import { installPreviewApi } from '../services/previewApi';

// The local page executes the packaged extension, rather than a second UI.
const packagedFiles = import.meta.glob('../../FCRM-Chrome-3.3/*', {
  eager: true, query: '?raw', import: 'default',
}) as Record<string, string>;
const files = Object.fromEntries(Object.entries(packagedFiles).map(([path, content]) => [path.split('/').pop()!, content]));
const manifest = JSON.parse(files['manifest.json']);

function readEmbeddedJson(marker: string): unknown {
  const source = files['content.js'];
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('В сборке не найден блок ' + marker);
  const from = start + marker.length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = from; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') depth++;
    else if (char === '}' || char === ']') {
      depth--;
      if (!depth) return JSON.parse(source.slice(from, index + 1));
    }
  }
  throw new Error('Не удалось прочитать данные сборки');
}

function createPreviewDocument(): string {
  const guard = 'function isTargetBoardPage() {';
  if (!files['content.js'].includes(guard)) throw new Error('Не удалось подготовить предпросмотр сборки');
  // Only adapt the hosting environment. All rendering and event handlers come
  // directly from the packaged script, including its version label.
  const runtime = files['content.js'].replace(guard, guard + '\nreturn true;');
  const script = (text: string) => '<script>' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
  const fixture = {
    tasks: readEmbeddedJson('let tasks = '),
    catalog: readEmbeddedJson('let umbCatalog = '),
    config: readEmbeddedJson('const CONFIG = '),
  };
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:white;}html #ozon-structure-root{top:0!important;}html #ozon-thread-sidebar{top:0!important;}</style></head><body>' +
    script('(' + installPreviewApi.toString() + ')(' + JSON.stringify(fixture) + ');') +
    script(files['background.js']) + script(runtime) + script(files['issue-enhance.js']) + '</body></html>';
}

export default function ExtensionPreview() {
  const document = useMemo(createPreviewDocument, []);
  const download = async () => {
    const zip = new JSZip();
    Object.entries(files).forEach(([name, content]) => zip.file(name, content));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'FCRM-Chrome-3.3.zip';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ minHeight: 40, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '6px 12px', background: '#071026', color: '#fff', fontSize: 12 }}>
        <strong>Предпросмотр расширения v{manifest.version}</strong>
        <span style={{ color: '#b8c4d0', flex: 1 }}>Демонстрационные данные · Jira и DeepSeek работают в установленном расширении</span>
        <button onClick={download} style={{ padding: '5px 10px', border: 0, borderRadius: 8, color: '#005bff', background: '#e5f2ff', cursor: 'pointer' }}>Скачать эту сборку ZIP</button>
      </div>
      <iframe title="Интерфейс расширения из ZIP" srcDoc={document} allowFullScreen style={{ width: '100%', flex: 1, minHeight: 0, border: 0 }} sandbox="allow-scripts allow-same-origin allow-popups allow-downloads" />
    </main>
  );
}
