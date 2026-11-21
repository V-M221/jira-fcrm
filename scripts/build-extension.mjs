import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import JSZip from 'jszip';

const outputDir = 'FCRM-Chrome-3.3';
const archivePath = outputDir + '.zip';
const source = await readFile('src/utils/extensionGenerator.ts', 'utf8');
const bundledAssets = ['options.html', 'update.bat', 'update.ps1'];
let previousArchive;
async function readPackagedFile(name) {
  try {
    return await readFile(join(outputDir, name));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    previousArchive ||= await JSZip.loadAsync(await readFile(archivePath));
    const entry = previousArchive.file(name);
    if (!entry) throw new Error(`В исходной сборке отсутствует ${name}`);
    return entry.async('nodebuffer');
  }
}
const oldContent = (await readPackagedFile('content.js')).toString('utf8');

function jsonAfter(marker, text) {
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Не найден блок ${marker}`);
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = jsonStart; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(jsonStart, i + 1));
    }
  }
  throw new Error(`Не удалось разобрать JSON блока ${marker}`);
}

const config = jsonAfter('const CONFIG = ', oldContent);
const initialTasks = jsonAfter('let tasks = ', oldContent);
const umbCatalog = jsonAfter('let umbCatalog = ', oldContent);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
const structuredAnswer = loadTranspiledModule(await readFile('src/utils/structuredAnswer.ts', 'utf8'));
const answerMarkup = loadTranspiledModule(await readFile('src/utils/answerMarkup.ts', 'utf8'));
const taskDetailsSidebar = loadTranspiledModule(await readFile('src/services/taskDetailsSidebar.ts', 'utf8'));
const developmentDashboard = loadTranspiledModule(await readFile('src/services/developmentDashboard.ts', 'utf8'));
const jiraPriority = loadTranspiledModule(await readFile('src/services/jiraPriority.ts', 'utf8'));
const strategicDashboard = loadTranspiledModule(await readFile('src/services/strategicDashboard.ts', 'utf8'));
const jiraLabelSuggestions = loadTranspiledModule(await readFile('src/services/jiraLabelSuggestions.ts', 'utf8'));
const sprintReportModel = loadTranspiledModule(await readFile('src/services/sprintReportModel.ts', 'utf8'));
const sprintReportDashboard = loadTranspiledModule(await readFile('src/services/sprintReportDashboard.ts', 'utf8'));
const jiraGroupingUi = loadTranspiledModule(await readFile('src/services/jiraGroupingUi.ts','utf8'));
const jiraPeopleUi = loadTranspiledModule(await readFile('src/services/jiraPeopleUi.ts','utf8'));
new Function('exports', 'require', 'module', compiled)(module.exports, (specifier) => {
  if (specifier === './structuredAnswer') return structuredAnswer;
  if (specifier === './answerMarkup') return answerMarkup;
  if (specifier === '../services/taskDetailsSidebar') return taskDetailsSidebar;
  if (specifier === '../services/developmentDashboard') return developmentDashboard;
  if (specifier === '../services/jiraPriority') return jiraPriority;
  if (specifier === '../services/strategicDashboard') return strategicDashboard;
  if (specifier === '../services/jiraLabelSuggestions') return jiraLabelSuggestions;
  if (specifier === '../services/sprintReportModel') return sprintReportModel;
  if (specifier === '../services/sprintReportDashboard') return sprintReportDashboard;
  if (specifier === '../services/jiraGroupingUi') return jiraGroupingUi;
  if (specifier === '../services/jiraPeopleUi') return jiraPeopleUi;
  return createRequire(import.meta.url)(specifier);
}, module);
const generator = module.exports;

function loadTranspiledModule(sourceText, customRequire = createRequire(import.meta.url)) {
  const output = ts.transpileModule(sourceText, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('exports', 'require', 'module', output)(loaded.exports, customRequire, loaded);
  return loaded.exports;
}

const deepseek = loadTranspiledModule(await readFile('src/services/deepseek.ts', 'utf8'));
const deepseekExtensionSource = await readFile('src/services/deepseekExtension.ts', 'utf8');
const deepseekExtension = loadTranspiledModule(deepseekExtensionSource, (specifier) => {
  if (specifier === './deepseek') return deepseek;
  if (specifier === '../utils/answerMarkup') return answerMarkup;
  if (specifier === '../utils/structuredAnswer') return structuredAnswer;
  throw new Error(`Unexpected extension build dependency: ${specifier}`);
});

const files = {
  'manifest.json': generator.generateManifestJson(config),
  'content.js': generator.generateContentScriptJs(config, initialTasks, umbCatalog),
  'styles.css': generator.generateStylesCss(config),
  'popup.html': generator.generatePopupHtml(config),
  'popup.js': generator.generatePopupJs(config),
  'background.js': deepseekExtension.generateBackgroundJs(),
  'issue-enhance.js': deepseekExtension.generateIssueEnhanceJs(),
  'options.js': deepseekExtension.generateOptionsJs(),
};
for (const name of bundledAssets) files[name] = await readPackagedFile(name);

await mkdir(outputDir, { recursive: true });
const zip = new JSZip();
for (const [name, contents] of Object.entries(files)) {
  await writeFile(join(outputDir, name), contents, 'utf8');
  zip.file(name, contents);
}
await writeFile(archivePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
console.log(`Собрано расширение ${generator.EXTENSION_VERSION} в ${outputDir}`);
