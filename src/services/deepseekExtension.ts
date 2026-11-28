import { answerMarkup } from '../utils/answerMarkup';
import { installWidgetTheme, themeWidgetColors, WIDGET_THEME_STYLES } from '../utils/widgetTheme';
import { bindExtensionUpdateMessages, EXTENSION_UPDATE_CACHE_TTL, EXTENSION_UPDATE_MESSAGES, EXTENSION_UPDATE_METADATA_URL } from './extensionUpdate';
﻿import {
  completeDeepseekChat,
  createDeepseekReadinessProbe,
  DEEPSEEK_AUTHS_URL,
  DEEPSEEK_CHAT_MESSAGE_TYPE,
  DEEPSEEK_PROMPT_STORAGE_KEY,
  DEEPSEEK_TOKEN_STORAGE_KEY,
  DEFAULT_DEEPSEEK_SYSTEM_PROMPT,
  DESIGN_TASK_SYSTEM_PROMPT,
  createJiraDraftLinkClient,
  parseJiraDraft,
  saveJiraDraft,
} from './deepseek';

function isThreadReferenceEndpoint(url: URL) {
  if (url.username || url.password || url.hash) return false;
  const query = url.searchParams;
  const params = [...query.keys()];
  if (url.origin === 'https://jit.o3.ru') {
    if (url.pathname === '/rest/api/2/search') {
      if (params.length !== 3 || new Set(params).size !== 3 || query.get('fields') !== 'summary,description,components,labels,issuetype,status,issuelinks') return false;
      const jql = query.get('jql') || '';
      const allowed = /^(project = FCRM|project in \(OB,OBFRONT,FTD,FACS\)|project = FCRM AND labels = fcrm_umb_epic AND statusCategory != Done) AND \((.+)\) ORDER BY updated DESC$/.exec(jql);
      if (!allowed || query.get('maxResults') !== (allowed[1].includes('labels') ? '16' : '24')) return false;
      const terms = allowed[2].split(' OR ');
      return terms.length <= 8 && terms.every(term => /^text ~ "[\p{L}\p{N}][\p{L}\p{N}_-]{4,39}"$/u.test(term) ||
        /^key in \((?:(?:FCRM|OB|OBFRONT|FTD|FACS)-[0-9]+,){0,9}(?:FCRM|OB|OBFRONT|FTD|FACS)-[0-9]+\)$/.test(term));
    }
    return /^\/rest\/api\/2\/issue\/[A-Z][A-Z0-9_]+-[0-9]+$/.test(url.pathname) &&
      params.length === 1 && query.get('fields') === 'summary,description,comment,issuelinks,labels,status';
  }
  if (url.origin !== 'https://confluence.o3.ru' && url.origin !== 'https://confluence.o3t.ru') return false;
  if (query.get('expand') !== 'body.view') return false;
  if (/^\/rest\/api\/content\/[0-9]+$/.test(url.pathname)) return params.length === 1;
  return url.pathname === '/rest/api/content' && params.length === 4 && new Set(params).size === 4 &&
    query.get('type') === 'page' && Boolean(query.get('spaceKey')?.trim()) && Boolean(query.get('title')?.trim());
}

function bindThreadReferenceReceiver(api: any, current: Location, validate: typeof isThreadReferenceEndpoint) {
  api.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: unknown) => void) => {
    if (message?.type !== 'o3ds:thread-reference' || sender.id !== api.runtime.id || sender.tab ||
        typeof message.endpoint !== 'string' || message.endpoint.length > 4000) return;
    let endpoint: URL;
    try { endpoint = new URL(message.endpoint); } catch { return; }
    if (endpoint.origin !== current.origin || !validate(endpoint)) return;
    async function read() {
      try {
        const response = await fetch(endpoint.pathname + endpoint.search, {
          method:'GET', credentials:'same-origin', cache:'no-store', redirect:'manual',
          headers:{Accept:'application/json'}, signal:AbortSignal.timeout(8000),
        });
        if (response.type === 'opaqueredirect' || response.status === 401 || (response.status >= 300 && response.status < 400)) {
          return {reason:'Нужно войти в сервис'};
        }
        if (response.status === 403) return {reason:'Доступ запрещён'};
        if (response.status === 404) return {reason:'Источник не найден или скрыт правами'};
        if (!response.ok) return {reason:'Сервис не ответил (HTTP ' + response.status + ')'};
        if (response.headers.get('Content-Type')?.includes('text/html')) return {reason:'Сервис вернул страницу входа или HTML'};
        const data = await response.json().catch(() => null);
        return data && typeof data === 'object' ? {data} : {reason:'Сервис вернул неизвестный формат'};
      } catch (error) {
        return {reason:error instanceof Error && ['TimeoutError','AbortError'].includes(error.name)
          ? 'Истекло время чтения' : 'Не удалось подключиться'};
      }
    }
    void read().then(sendResponse);
    return true;
  });
}

function createThreadReferenceRouter(api: any, jiraTabId: number, validate: typeof isThreadReferenceEndpoint) {
  const confluenceTabs = new Map<string, Promise<any[]>>();
  return async (endpoint: string): Promise<{data?: any; reason?: string}> => {
    const url = new URL(endpoint);
    if (!validate(url)) return {reason:'Ссылка не поддерживается'};
    const message = {type:'o3ds:thread-reference',endpoint:url.href};
    async function send(tabId: number) {
      return api.tabs.sendMessage(tabId, message, {frameId:0}).catch(() => undefined);
    }
    if (url.origin === 'https://jit.o3.ru') {
      return (await send(jiraTabId)) ?? {reason:'Обновите вкладку Jira и повторите подготовку'};
    }
    let candidates = confluenceTabs.get(url.origin);
    if (!candidates) {
      const query = api.tabs.query({url:url.origin + '/*'}).catch(() => []) as Promise<any[]>;
      confluenceTabs.set(url.origin, query);
      candidates = query;
    }
    const tabs = (await candidates).filter(tab => Number.isInteger(tab.id));
    for (const tab of tabs.slice(0,3)) {
      const result = await send(tab.id);
      if (result) return result;
    }
    return {reason:'Откройте или обновите вкладку Confluence в этом браузере и повторите подготовку'};
  };
}


export function generateBackgroundJs(): string {
  return `(${bindExtensionUpdateMessages.toString()})(chrome, ${JSON.stringify(EXTENSION_UPDATE_MESSAGES)}, ${JSON.stringify(EXTENSION_UPDATE_METADATA_URL)}, ${EXTENSION_UPDATE_CACHE_TTL});

const completeDeepseekChat = ${completeDeepseekChat.toString()};
const TOKEN_KEY = ${JSON.stringify(DEEPSEEK_TOKEN_STORAGE_KEY)};
const PROMPT_KEY = ${JSON.stringify(DEEPSEEK_PROMPT_STORAGE_KEY)};
const checkReadiness = (${createDeepseekReadinessProbe.toString()})(
  async () => (await chrome.storage.local.get(TOKEN_KEY))[TOKEN_KEY], ${JSON.stringify(DEEPSEEK_AUTHS_URL)}
);

const defaultPrompt = ${JSON.stringify(DEFAULT_DEEPSEEK_SYSTEM_PROMPT)};
const designPrompt = ${JSON.stringify(DESIGN_TASK_SYSTEM_PROMPT)};
const threadPhases = new Map();
const validateThreadReference = ${isThreadReferenceEndpoint.toString()};
const createThreadReferenceRouter = ${createThreadReferenceRouter.toString()};

async function getPromptCatalog(savedPrompt) {
  const thread = {urls:['https://chatzone.o3t.ru/example/pl/00000000000000000000000000'], issueTypeName:'Задача',componentName:'Пример компонента', themes:[{key:'FCRM-2',title:'Пример тематики'}]};
  const revision = {preview:'Предыдущий черновик',reply:'Сделай короче.'};
  const channel = {channels:['https://chatzone.o3t.ru/example/channels/sample']};
  const examples = [
    {title:'Создать FCRM из треда', description:'Готовит черновик по треду и прочитанным источникам. Сравнивает его с кандидатами на дубли FCRM.',
      buttons:['Создать FCRM из треда','Подготовить черновик'], phase:'После чтения треда, до подтверждения создания', mode:'thread', key:'FCRM', input:thread},
    {title:'Уточнить черновик из треда', description:'Пересобирает черновик с учётом ответа пользователя и предыдущего текста.',
      buttons:['Отправить уточнение'], phase:'В мастере, после ответа на вопрос DeepSeek', mode:'thread', key:'FCRM',
      input:{...thread,continuation:true,clarification:'Уточнить, для кого нужно изменение.',previousDraft:{summary:'Пример темы',description:'Пример описания'}}},
    {title:'Улучшить описание', description:'Готовит предпросмотр описания и предлагает уместные связи. Сохранение выполняется отдельным действием в Jira.',
      buttons:['Улучшить','Улучшить описание'], phase:'В карточке задачи, после ввода дополнительного контекста', mode:'analyze'},
    {title:'Уточнить описание', description:'Редактирует предыдущий черновик по указанным фактам и правкам.',
      buttons:['Добавить контекст','Обновить черновик'], phase:'После первого предпросмотра описания', mode:'analyze', clarification:revision},
    {title:'Перепроверить источник', description:'По прямой просьбе проверяет нужную задачу или связь и обновляет предпросмотр.',
      buttons:['Добавить контекст','Обновить черновик'], phase:'Если в уточнении явно запрошена проверка источника', mode:'analyze',
      clarification:{...revision,reply:'Проверь связь с FCRM-2.'}},
    {title:'Подготовить дизайн-задачу FTD', description:'Предлагает название и описание по открытой FCRM-задаче. Создание выполняется после отдельного подтверждения.',
      buttons:['Дизайн · FTD'], phase:'В меню создания задачи в блоке «В проекте»', mode:'design'},
    {title:'Уточнить дизайн-задачу', description:'Обновляет черновик FTD по ответу пользователя.',
      buttons:['Отправить ответ'], phase:'После предпросмотра FTD, до подтверждения создания', mode:'design', clarification:revision},
    {title:'Найти похожие задачи FCRM', description:'Оценивает смысловое сходство кандидатов, прочитанных в Jira. Правила различения дублей и связанных задач общие с мастером из треда.',
      buttons:['Искать похожие в FCRM'], phase:'В карточке задачи, после выборки кандидатов Jira', mode:'search_fcrm', input:{}},
    {title:'Найти обсуждения в chatZone', description:'Ищет похожие сообщения в одном выбранном канале за последние 30 дней.',
      buttons:['Искать по тредам','Продолжить','Повторить поиск'], phase:'На каждом шаге поиска по выбранным каналам', mode:'search_threads', input:channel},
    {title:'Уточнить результаты поиска chatZone', description:'Уточняет результаты текущего канала с учётом ответа и предыдущего обсуждения.',
      buttons:['Ответить'], phase:'После результата текущего канала', mode:'search_threads', input:{...channel,reply:'Уточнить результаты.',conversation:[]}},
    {title:'Проверить и установить тематическую связь', description:'Проверяет прямую связь «Задача проекта» и при однозначном совпадении создаёт или исправляет её.',
      buttons:['Сгенерировать связи'], phase:'В карточке задачи, по явной команде проверки тематической связи', mode:'links'},
  ];
  return Promise.all(examples.map(async ({title, description, buttons, phase, mode, key = 'FCRM-1', input, clarification}) => ({
    title, description, buttons, phase,
    ...JSON.parse(await completeDeepseekChat(key, mode, null, input ? JSON.stringify(input) : '', mode === 'design' ? designPrompt : savedPrompt, clarification, '', true)),
  })));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const requestId = typeof message?.requestId === 'string' && /^[a-f0-9-]{36}$/i.test(message.requestId) ? message.requestId : '';
  const tabRequest = String(sender.tab?.id ?? '') + ':' + requestId;
  if (message?.type === 'o3ds:thread-status') {
    sendResponse({phase: requestId ? threadPhases.get(tabRequest) || null : null});
    return;
  }
  if (message?.type === 'o3ds:readiness' && sender.id === chrome.runtime.id) {
    void checkReadiness(message.refresh === true).then(sendResponse);
    return true;
  }
  if (message?.type === 'o3ds:prompt-catalog') {
    chrome.storage.local.get(PROMPT_KEY)
      .then(stored => getPromptCatalog(stored[PROMPT_KEY] || defaultPrompt))
      .then(entries => sendResponse({ok:true,entries}), () => sendResponse({ok:false,error:'Не удалось загрузить промпты виджета.'}));
    return true;
  }
  if (message?.type !== ${JSON.stringify(DEEPSEEK_CHAT_MESSAGE_TYPE)}) return;
  let readThreadReference;
  if (message.mode === 'thread' || message.mode === 'search_fcrm') {
    let origin;
    try { origin = new URL(sender.url); } catch { return; }
    if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id) ||
        origin.origin !== 'https://jit.o3.ru' || origin.pathname !== '/secure/RapidBoard.jspa') return;
    readThreadReference = createThreadReferenceRouter(chrome, sender.tab.id, validateThreadReference);
    if (requestId && message.mode === 'thread') threadPhases.set(tabRequest, 'source');
  }
  chrome.storage.local
    .get([TOKEN_KEY, PROMPT_KEY])
    .then(stored => {
      const token = stored[TOKEN_KEY] ? String(stored[TOKEN_KEY]) : null;
      const prompt = message.mode === 'design' ? designPrompt : stored[PROMPT_KEY] || defaultPrompt;
      return completeDeepseekChat(message.issueKey, message.mode, token, message.approvedDescription || '', prompt, message.clarification, message.additionalContext || '', false, phase => {
        if (requestId && message.mode === 'thread') threadPhases.set(tabRequest, phase);
      }, readThreadReference);
    })
    .then(text => sendResponse({ok:true, text}))
    .catch(err => {
      const message = err?.message ? String(err.message) : 'Не удалось получить ответ DeepSeek';
      sendResponse({ok:false,error:message.replace(/^THREAD_INPUT_INVALID: /, ''),errorCode:message.startsWith('THREAD_INPUT_INVALID: ') ? 'THREAD_INPUT_INVALID' : undefined});
    })
    .finally(() => { if (requestId && message.mode === 'thread') threadPhases.delete(tabRequest); });
  return true;
});
`;
}

export function generateOptionsHtml(): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>DeepSeek · токен</title>
  <style>
    body {
      margin: 0;
      padding: 32px 20px;
      background: #F4F5F7;
      color: #172B4D;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
    }
    main {
      max-width: 560px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #DFE1E6;
      border-radius: 3px;
      box-shadow: 0 1px 1px rgba(9, 30, 66, 0.25);
      padding: 20px;
    }
    h1 { margin: 0 0 8px; font-size: 20px; line-height: 1.25; }
    p { margin: 0 0 16px; color: #44546F; font-size: 14px; line-height: 1.45; }
    label { display: block; font-size: 12px; font-weight: 650; margin-bottom: 6px; }
    input {
      width: 100%;
      box-sizing: border-box;
      height: 36px;
      border: 2px solid #DFE1E6;
      border-radius: 3px;
      padding: 0 10px;
      font-size: 14px;
      color: #172B4D;
    }
    input:focus { outline: none; border-color: #0C66E4; }
    textarea {
      width: 100%; box-sizing: border-box; min-height: 220px; resize: vertical;
      border: 1px solid #DFE1E6; border-radius: 3px; padding: 10px;
      font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; color: #172B4D;
    }
    textarea:focus { outline: none; border-color: #0C66E4; }
    .row { display: flex; gap: 8px; margin-top: 12px; }
    button {
      height: 32px;
      padding: 0 12px;
      border-radius: 3px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .primary { background: #0C66E4; color: #fff; border: none; }
    .primary:hover { background: #0055CC; }
    .subtle { background: #fff; color: #172B4D; border: 1px solid #DFE1E6; }
    .subtle:hover { background: #F7F8F9; }
    .status { min-height: 20px; margin-top: 12px; font-size: 13px; color: #216E4E; }
    code { font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>&#x41D;&#x430;&#x441;&#x442;&#x440;&#x43E;&#x439;&#x43A;&#x438; DeepSeek</h1>
    <p>
      Bearer-токен для <code>${DEEPSEEK_AUTHS_URL}</code>. Если поле пустое, расширение
      само запросит сессию на deepseek.o3t.ru и возьмёт токен из ответа, когда вы уже вошли в корпоративную модель.
    </p>
    <label for="token">Bearer токен</label>
    <input id="token" type="password" autocomplete="off" spellcheck="false" placeholder="Вставьте токен без слова Bearer" />
    <div class="row">
      <button type="button" class="primary" id="save">Сохранить</button>
      <button type="button" class="subtle" id="clear">Очистить</button>
    </div>
    <label for="system-prompt" style="margin-top:22px">Системный промпт</label>
    <p>Настройте общие правила для черновика. Порядок чтения Jira, проверки связей и формат ответа расширение добавляет автоматически.</p>
    <textarea id="system-prompt" spellcheck="false"></textarea>
    <div class="row">
      <button type="button" class="primary" id="save-prompt">Сохранить промпт</button>
      <button type="button" class="subtle" id="reset-prompt">Вернуть стандартный</button>
    </div>
    <div class="status" id="status" role="status"></div>
  </main>
  <script src="options.js"></script>
</body>
</html>`;
}

export function generateOptionsJs(): string {
  return `const TOKEN_KEY = ${JSON.stringify(DEEPSEEK_TOKEN_STORAGE_KEY)};
const PROMPT_KEY = ${JSON.stringify(DEEPSEEK_PROMPT_STORAGE_KEY)};
const DEFAULT_PROMPT = ${JSON.stringify(DEFAULT_DEEPSEEK_SYSTEM_PROMPT)};
const tokenInput = document.getElementById('token');
const promptInput = document.getElementById('system-prompt');
const statusEl = document.getElementById('status');

function showStatus(text) {
  statusEl.textContent = text;
}

chrome.storage.local.get([TOKEN_KEY, PROMPT_KEY]).then((stored) => {
  const value = stored && stored[TOKEN_KEY] ? String(stored[TOKEN_KEY]) : '';
  tokenInput.value = value;
  promptInput.value = stored && stored[PROMPT_KEY] ? String(stored[PROMPT_KEY]) : DEFAULT_PROMPT;
  showStatus(value ? 'Сохранённый токен подставлен в поле.' : 'Токен не задан: будет использована сессия deepseek.o3t.ru.');
});

document.getElementById('save-prompt').addEventListener('click', () => {
  const value = promptInput.value.trim();
  chrome.storage.local.set({ [PROMPT_KEY]: value }).then(() => {
    showStatus(value ? 'Системный промпт сохранён.' : 'Используется стандартный системный промпт.');
  });
});

document.getElementById('reset-prompt').addEventListener('click', () => {
  promptInput.value = DEFAULT_PROMPT;
  chrome.storage.local.remove(PROMPT_KEY).then(() => {
    showStatus('Возвращён стандартный системный промпт.');
  });
});

document.getElementById('save').addEventListener('click', () => {
  const value = tokenInput.value.trim();
  chrome.storage.local.set({ [TOKEN_KEY]: value }).then(() => {
    showStatus(value ? 'Токен сохранён в расширении.' : 'Поле пустое. Запросы пойдут через сессию deepseek.o3t.ru.');
  });
});

document.getElementById('clear').addEventListener('click', () => {
  tokenInput.value = '';
  chrome.storage.local.remove(TOKEN_KEY).then(() => {
    showStatus('Токен удалён.');
  });
});
`;
}

export function generateIssueEnhanceJs(): string {
  return `(() => {
  'use strict';

  if (['https://jit.o3.ru','https://confluence.o3.ru','https://confluence.o3t.ru'].includes(location.origin)) {
    (${bindThreadReferenceReceiver.toString()})(chrome, location, (${isThreadReferenceEndpoint.toString()}));
  }
  if (location.origin === 'https://confluence.o3.ru' || location.origin === 'https://confluence.o3t.ru') return;

  const widgetTheme = (${installWidgetTheme.toString()})(window, document);
  const formatAnswer = ${answerMarkup.toString()};
  const parseJiraDraft = ${parseJiraDraft.toString()};
  const saveJiraDraft = ${saveJiraDraft.toString()};
  const jiraDraftLinks = (${createJiraDraftLinkClient.toString()})();
  const MESSAGE_TYPE = ${JSON.stringify(DEEPSEEK_CHAT_MESSAGE_TYPE)};
  const NATIVE_SELECTORS = [
    '#summary-val',
    '#issue-content h1',
    '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
    '#ghx-detail-view .ghx-summary',
    '.ghx-detail-summary'
  ];

  const session = {
    issueKey: '',
    kind: 'description',
    phase: 'idle',
    preview: '',
    success: '',
    designProposal: null,
    error: ''
  };
  let requestSerial = 0;
  let readiness = null;
  let readinessPending = false;

  function issueKeyFromText(value) {
    const match = String(value || '').toUpperCase().match(/\\b([A-Z][A-Z0-9]+-\\d+)\\b/);
    return match ? match[1] : '';
  }

  function issueKeyNear(el) {
    const scope = el.closest('#ozon-ext-sidebar-panel, #issue-content, #ghx-detail-view, #jira') || document.body;
    const link = scope.querySelector('a[href*="/browse/"]');
    if (link) {
      const fromHref = issueKeyFromText(link.getAttribute('href') || '');
      if (fromHref) return fromHref;
      const fromText = issueKeyFromText(link.textContent || '');
      if (fromText) return fromText;
    }
    const keyVal = document.getElementById('key-val');
    if (keyVal) {
      const fromKey = issueKeyFromText(keyVal.textContent || '');
      if (fromKey) return fromKey;
    }
    const selected = new URLSearchParams(window.location.search).get('selectedIssue');
    if (selected) {
      const fromQuery = issueKeyFromText(selected);
      if (fromQuery) return fromQuery;
    }
    return issueKeyFromText(window.location.pathname);
  }

  function ensureStyles() {
    if (document.getElementById('o3ds-styles')) return;
    const style = document.createElement('style');
    style.id = 'o3ds-styles';
    style.textContent = (${themeWidgetColors.toString()})([
      '.o3ds-btn{display:inline-flex!important;align-items:center!important;gap:5px!important;height:28px!important;margin:0 0 0 8px!important;padding:0 10px!important;border:1px solid #005BFF!important;border-radius:7px!important;background:#E5F0FF!important;color:#005BFF!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;font-size:12px!important;font-weight:700!important;line-height:1!important;letter-spacing:0!important;cursor:pointer!important;vertical-align:middle!important;box-shadow:0 1px 2px rgba(7,16,38,.08)!important;text-decoration:none!important;}',
      '.o3ds-btn:hover{background:#d5e7ff!important;border-color:#004bd1!important;}',
      '.o3ds-btn:disabled{opacity:.55!important;cursor:default!important;}',
      '.o3ds-btn svg{display:block!important;width:14px!important;height:14px!important;flex:0 0 auto!important;}',
      '#o3ds-layer{position:fixed!important;top:0!important;bottom:0!important;right:0!important;width:min(640px,100vw)!important;display:flex!important;flex-direction:column!important;z-index:2147483000!important;overflow:auto!important;background:#FFFFFF!important;color:#071026!important;border:0!important;border-left:1px solid #D7E0EC!important;border-radius:0!important;box-shadow:-8px 0 24px rgba(7,16,38,.10)!important;padding:16px!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,sans-serif!important;font-size:12px!important;line-height:1.45!important;box-sizing:border-box!important;}',
      '@keyframes o3ds-panel-enter{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}',
      '@media(prefers-reduced-motion:no-preference){#o3ds-layer{animation:o3ds-panel-enter 220ms cubic-bezier(.2,.7,.2,1) both}}',
      '#o3ds-layer *{box-sizing:border-box!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,sans-serif!important;}',
      '#o3ds-layer h2{margin:0 0 4px!important;font-size:14px!important;line-height:1.25!important;font-weight:700!important;color:#071026!important;}',
      '#o3ds-layer .o3ds-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px;}#o3ds-layer .o3ds-header .o3ds-key{margin-bottom:0!important;}#o3ds-layer .o3ds-header-close{width:28px!important;height:28px!important;flex:0 0 28px!important;padding:0!important;border:0!important;border-radius:8px!important;background:#f1f5f9!important;color:#334155!important;font-size:16px!important;}',
      '#o3ds-layer .o3ds-key{margin:0 0 12px!important;color:#626F86!important;font-size:12px!important;font-weight:600!important;}',
      '.o3ds-connection-note{display:inline-flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;margin:0 0 6px 8px;font-size:12px;color:var(--ozon-fcrm-muted,#475569);vertical-align:middle;}.o3ds-connection-note[hidden]{display:none!important;} .o3ds-connection-note a,.o3ds-connection-refresh{color:var(--ozon-fcrm-link,#005bff);}',
      '#o3ds-layer .o3ds-connection-note{display:flex;margin:0 0 12px;} .o3ds-connection-refresh,#o3ds-layer .o3ds-connection-refresh{padding:0!important;height:auto!important;border:0;background:none;font:inherit!important;text-decoration:underline;cursor:pointer;}',
      '#o3ds-layer .o3ds-load-track{width:100%;height:6px;overflow:hidden;border-radius:99px;background:var(--ozon-fcrm-border,#E8EEF7);margin:0 0 12px;} #o3ds-layer .o3ds-load-fill{width:35%;height:100%;border-radius:99px;background:var(--ozon-fcrm-link,#005bff);animation:o3ds-progress 1.35s ease-in-out infinite alternate;}',
      '@keyframes o3ds-progress{from{transform:translateX(0)}to{transform:translateX(185%)}} @media(prefers-reduced-motion:reduce){#o3ds-layer .o3ds-load-fill{animation:none;}}',
      '#o3ds-layer .o3ds-answer{margin:0 0 12px!important;white-space:pre-wrap!important;word-break:break-word!important;font-family:inherit!important;font-size:14px!important;line-height:1.6!important;color:#172B4D!important;background:#F7F8F9!important;border:1px solid #DFE1E6!important;border-radius:3px!important;padding:10px!important;flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow:auto!important;}',
      '#o3ds-layer .o3ds-actions{display:flex!important;gap:8px!important;}',
      '#o3ds-layer button{height:32px!important;padding:0 12px!important;border-radius:3px!important;font-size:14px!important;font-weight:600!important;cursor:pointer!important;}',
      '#o3ds-layer .o3ds-primary{background:#005BFF!important;color:#FFFFFF!important;border:1px solid #005BFF!important;border-radius:7px!important;}',
      '#o3ds-layer .o3ds-primary:hover{background:#004bd1!important;}',
      '#o3ds-layer .o3ds-primary:disabled{opacity:.55!important;cursor:default!important;}',
      '#o3ds-layer .o3ds-subtle{background:#FFFFFF!important;color:#334155!important;border:1px solid #D7E0EC!important;border-radius:7px!important;}',
      '#o3ds-layer .o3ds-subtle:hover{background:#F7F8F9!important;}',
      '#o3ds-layer .o3ds-error{margin:0 0 12px!important;color:#AE2E24!important;font-size:13px!important;}',
      '#o3ds-layer .o3ds-ok{margin:0 0 8px!important;color:#216E4E!important;font-size:13px!important;font-weight:650!important;}'
      ,'body:has(> #o3ds-layer) #ozon-structure-root #ozon-ext-sidebar-panel{right:min(640px,50vw)!important;max-width:calc(100vw - min(640px,50vw))!important;}',
      'body:has(> #o3ds-layer) #ozon-structure-root #ozon-ext-sidebar-resizer{display:none!important;}',
      'body:has(#ozon-structure-root #ozon-ext-sidebar-panel) > #o3ds-layer{width:min(640px,50vw)!important;}',
      '#o3ds-layer .o3ds-answer,#o3ds-layer{scrollbar-width:thin!important;scrollbar-color:#a8b5c5 transparent!important;color-scheme:light;}',
      '#o3ds-layer .o3ds-answer h3{font-size:15px;font-weight:700;margin:12px 0 4px}#o3ds-layer .o3ds-answer p{margin:0 0 6px}#o3ds-layer .o3ds-answer ul,#o3ds-layer .o3ds-answer ol{padding-left:22px}#o3ds-layer .o3ds-answer a{color:#005bff;text-decoration:underline}',
      '#o3ds-layer .o3ds-draft{flex:1 1 0;min-height:min(140px,28vh);overflow:auto;padding:4px 4px 10px 0}#o3ds-layer .o3ds-draft .o3ds-answer{overflow:visible!important;background:#fff!important;border:1px solid #d7e0ec!important;border-radius:10px!important;padding:14px!important}#o3ds-layer .o3ds-draft h3:first-child{margin-top:0}',
      '#o3ds-layer .o3ds-draft-heading{display:block;font-size:13px;font-weight:700;margin:0 0 7px;color:#071026}#o3ds-layer .o3ds-draft-name{margin:0 0 12px;color:#334155}',
      '#o3ds-layer .o3ds-draft-notes .o3ds-answer{background:#f4f7fb!important}#o3ds-layer .o3ds-draft-notes ol{list-style:decimal outside!important;margin:0!important;padding:0 0 0 22px!important}#o3ds-layer .o3ds-draft-notes li{display:list-item!important;list-style:inherit!important;font-size:inherit!important;line-height:inherit!important;margin:0;padding:0 0 0 3px}#o3ds-layer .o3ds-draft-notes li+li{margin-top:6px}',
      '#o3ds-layer .o3ds-theme-notice{margin:0 0 12px;padding:9px 12px;border-radius:8px;background:#f4f7fb;color:#334155}#o3ds-layer .o3ds-link-outcomes{margin:0 0 12px;padding:0;list-style:none}#o3ds-layer .o3ds-link-outcomes li{padding:7px 0;overflow-wrap:anywhere}#o3ds-layer .o3ds-link-outcomes a{color:#005bff}',
      '#o3ds-layer .o3ds-draft-links{margin:0 0 12px;padding:10px 12px;border:1px solid #d7e0ec;border-radius:8px;min-width:0}#o3ds-layer .o3ds-draft-link{display:flex;gap:8px;padding:6px 0;align-items:flex-start;cursor:pointer}#o3ds-layer .o3ds-draft-link input{width:15px;height:15px;margin-top:2px;flex:none;accent-color:#005bff}#o3ds-layer .o3ds-draft-link span{min-width:0;overflow-wrap:anywhere}#o3ds-layer .o3ds-draft-link small{display:block;color:#626f86}',
      '#o3ds-layer .o3ds-draft-footer{padding-top:12px;border-top:1px solid #d7e0ec;background:#fff;flex:none}#o3ds-layer .o3ds-draft-footer .o3ds-actions{justify-content:flex-start}#o3ds-layer .o3ds-draft-refine{margin-bottom:10px}#o3ds-layer .o3ds-draft-refine summary{cursor:pointer;color:#005bff;width:max-content}#o3ds-layer .o3ds-draft-refine[open] summary{margin-bottom:8px}',
      '@media(max-width:800px){body:has(#ozon-structure-root #ozon-ext-sidebar-panel) > #o3ds-layer{width:min(480px,100vw)!important;}}',
      '#o3ds-layer textarea{box-sizing:border-box;width:100%;min-height:76px!important;padding:10px;resize:vertical;border:1px solid #D7E0EC;border-radius:8px;font:inherit;margin-bottom:8px;background:#fff;color:#071026;}#o3ds-layer textarea:focus{outline:none;border-color:#005BFF;box-shadow:0 0 0 3px rgba(0,91,255,.12)}',
      '#o3ds-layer .o3ds-actions{flex-wrap:wrap;}'
    ].join('')) + ${JSON.stringify(WIDGET_THEME_STYLES)};
    document.documentElement.appendChild(style);
  }

  function sparkleSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path fill="currentColor" d="M8 1.2l1.05 3.35L12.4 5.6 9.05 6.65 8 10 6.95 6.65 3.6 5.6l3.35-1.05L8 1.2zm4.2 7.1.55 1.75 1.75.55-1.75.55-.55 1.75-.55-1.75-1.75-.55 1.75-.55.55-1.75zM3.1 9.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z"/>';
    return svg;
  }

  function readinessMessage() {
    if (readiness?.reason === 'sign-in') return 'Для действий с ИИ войдите в DeepSeek.';
    if (readiness?.reason === 'unavailable') return 'Не удалось проверить доступ к DeepSeek.';
    return readiness?.canRun ? '' : 'Проверяю доступ к DeepSeek…';
  }

  function updateReadinessNotice(notice) {
    const [label, open, retry] = notice.children;
    const text = readinessMessage();
    notice.hidden = !text;
    if (label.textContent !== text) label.textContent = text;
    open.hidden = readiness?.reason !== 'sign-in';
    retry.hidden = !readiness;
    retry.disabled = readinessPending;
  }

  function readinessNotice() {
    const notice = document.createElement('span');
    notice.className = 'o3ds-connection-note';
    const label = document.createElement('span');
    label.setAttribute('role', 'status');
    const open = document.createElement('a');
    open.href = 'https://deepseek.o3t.ru/';
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'Открыть DeepSeek';
    const retry = actionButton('Повторить проверку', 'o3ds-connection-refresh', () => refreshReadiness(true), false);
    notice.append(label, open, retry);
    updateReadinessNotice(notice);
    return notice;
  }

  function refreshReadiness(refresh = false) {
    if (readinessPending || typeof chrome.runtime?.sendMessage !== 'function') return;
    readinessPending = true;
    syncButtons();
    function finish(response) {
      readinessPending = false;
      const valid = response && ((response.canRun === true && ['token','session'].includes(response.reason)) ||
        (response.canRun === false && ['sign-in','unavailable'].includes(response.reason)));
      readiness = valid ? response : {canRun: false, reason: 'unavailable'};
      syncButtons();
    }
    try {
      chrome.runtime.sendMessage({type:'o3ds:readiness',refresh}, response => {
        finish(chrome.runtime.lastError ? undefined : response);
      });
    } catch { finish(); }
  }

  function updateModelButton(button, blocked) {
    button.disabled = blocked || readinessPending || !readiness?.canRun;
    button.title = readinessMessage();
  }

  function syncButtons() {
    const busy = session.phase === 'loading' || session.phase === 'applying' || session.phase === 'design-creating';
    document.querySelectorAll('.o3ds-btn').forEach(button => {
      const sameIssue = button.getAttribute('data-issue-key') === session.issueKey;
      updateModelButton(button, busy && sameIssue);
      if (!button.title) button.title = 'Улучшить описание через DeepSeek';
    });
    document.querySelectorAll('#o3ds-layer [data-o3ds-model-action]').forEach(button => {
      updateModelButton(button, button.dataset.o3dsModelAction === 'blocked');
    });
    document.querySelectorAll('.o3ds-connection-note').forEach(updateReadinessNotice);
  }

  function openSession(issueKey) {
    ++requestSerial;
    session.kind = 'description';
    session.reply = '';
    session.additionalContext = '';
    session.issueKey = issueKey;
    session.phase = 'context';
    session.preview = '';
    session.success = '';
    session.error = '';
    renderLayer();
  }

  function startDescriptionAnalysis() {
    if (readinessPending || !readiness?.canRun) return;
    const issueKey = session.issueKey;
    session.phase = 'loading';
    session.error = '';
    renderLayer();
    const serial = ++requestSerial;
    ask('analyze', issueKey)
      .then(async (text) => {
        if (serial !== requestSerial) return;
        const warning = await themeWarning(issueKey, text);
        if (serial !== requestSerial) return;
        session.phase = 'preview';
        session.preview = text;
        session.themeWarning = warning;
        renderLayer();
      })
      .catch((err) => {
        if (serial !== requestSerial) return;
        session.phase = 'error';
        session.error = err && err.message ? err.message : 'Не удалось улучшить описание';
        renderLayer();
      });
  }

  function parseDesignProposal(text) {
    const summary = /<ftd_summary>([\\s\\S]*?)<\\/ftd_summary>/i.exec(String(text || ''))?.[1]?.trim();
    const description = /<ftd_description>([\\s\\S]*?)<\\/ftd_description>/i.exec(String(text || ''))?.[1]?.trim();
    if (!summary || !description) throw new Error('Не удалось разобрать тему и описание дизайн-задачи. Попросите DeepSeek подготовить черновик заново.');
    return { summary, description };
  }

  function themeWarning(issueKey, preview) {
    const theme = parseJiraDraft(preview, issueKey).links.find(link => link.kind === 'theme');
    return theme ? jiraDraftLinks.themeWarning(issueKey, theme) : '';
  }

  function openDesignSession(issueKey) {
    if (!issueKey || readinessPending || !readiness?.canRun) return;
    session.kind = 'design';
    session.reply = '';
    session.issueKey = issueKey;
    session.phase = 'loading';
    session.preview = '';
    session.success = '';
    session.designProposal = null;
    session.error = '';
    renderLayer();
    const serial = ++requestSerial;
    ask('design', issueKey)
      .then((text) => {
        if (serial !== requestSerial) return;
        session.preview = text;
        session.designProposal = parseDesignProposal(text);
        session.phase = 'preview';
        renderLayer();
      })
      .catch((err) => {
        if (serial !== requestSerial) return;
        session.phase = 'error';
        session.error = err && err.message ? err.message : 'Не удалось подготовить дизайн-задачу';
        renderLayer();
      });
  }

  function requestDesignCreation() {
    if (session.kind !== 'design' || !session.designProposal) return;
    session.phase = 'design-creating';
    session.error = '';
    renderLayer();
    document.dispatchEvent(new CustomEvent('ozon-fcrm-create-design-task-request', {
      detail: JSON.stringify({ issueKey: session.issueKey, summary: session.designProposal.summary, description: session.designProposal.description })
    }));
  }

  function showDesignResult(detail) {
    if (session.kind !== 'design' || !detail || detail.issueKey !== session.issueKey) return;
    if (detail.ok) {
      session.phase = 'design-created';
      session.success = detail.key || '';
      session.designLinked = detail.linked !== false;
      session.error = '';
    } else {
      session.phase = 'design-confirm';
      session.error = detail.error || 'Не удалось создать задачу FTD';
    }
    renderLayer();
  }

  async function applySession(draft, selectedLinks) {
    if (session.phase !== 'preview' || !session.issueKey) return;
    const issueKey = session.issueKey;
    const serial = ++requestSerial;
    session.phase = 'applying';
    session.saveIncludesLinks = selectedLinks.length > 0;
    session.error = '';
    renderLayer();
    let saved;
    try {
      saved = await saveJiraDraft(issueKey, draft);
    } catch (err) {
      if (serial !== requestSerial) return;
      session.phase = 'preview';
      session.error = err && err.message ? err.message : 'Не удалось сохранить описание';
      renderLayer();
      return;
    }
    if (serial !== requestSerial) return;
    const outcomes = [];
    for (const link of selectedLinks) {
      try {
        outcomes.push({link, status:await jiraDraftLinks.apply(issueKey, link)});
      } catch (err) {
        outcomes.push({link, status:err?.message || 'Jira не подтвердила связь.', failed:true});
      }
    }
    document.dispatchEvent(new CustomEvent('ozon-fcrm-issue-applied', { detail: { issueKey } }));
    if (serial !== requestSerial) return;
    session.savedText = saved.changed ? 'Описание сохранено в Jira' : 'Описание уже актуально в Jira';
    session.linkOutcomes = outcomes;
    session.phase = 'success';
    renderLayer();
  }

  function closeSession() {
    requestSerial += 1;
    session.phase = 'idle';
    session.preview = '';
    session.success = '';
    session.reply = '';
    session.error = '';
    session.kind = 'description';
    session.designProposal = null;
    renderLayer();
  }
  document.addEventListener('ozon-close-assistant', closeSession);

  function ask(mode, issueKey, approvedDescription, clarification) {
    return new Promise((resolve, reject) => {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error('Нет доступа к background service worker'));
        return;
      }
      chrome.runtime.sendMessage({ type: MESSAGE_TYPE, mode, issueKey, approvedDescription: approvedDescription || '', clarification, additionalContext: session.kind === 'description' ? session.additionalContext || '' : '' }, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (!response || !response.ok) {
          refreshReadiness(true);
          reject(new Error((response && response.error) || 'Пустой ответ DeepSeek'));
          return;
        }
        resolve(response.text || '');
      });
    });
  }

  function actionButton(label, className, onClick, disabled) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener('click', onClick);
    return button;
  }

  function modelAction(label, className, onClick, blocked = false) {
    const button = actionButton(label, className, () => {
      if (!readinessPending && readiness?.canRun) onClick();
    }, blocked);
    button.dataset.o3dsModelAction = blocked ? 'blocked' : 'enabled';
    updateModelButton(button, blocked);
    return button;
  }

  function renderLayer() {
    syncButtons();
    let layer = document.getElementById('o3ds-layer');
    if (session.phase === 'idle') {
      if (layer) layer.remove();
      return;
    }
    if (!layer) {
      layer = document.createElement('aside');
      layer.id = 'o3ds-layer';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-label', 'Улучшение описания');
      document.body.appendChild(layer);
    }
    layer.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = session.kind === 'design' ? 'Подготовить дизайн-задачу FTD' : 'Улучшить описание';
    const keyLine = document.createElement('p');
    keyLine.className = 'o3ds-key';
    keyLine.textContent = session.kind === 'design' ? session.issueKey + ' · черновик для проекта FTD' : session.issueKey;
    const header = document.createElement('div');
    header.className = 'o3ds-header';
    const heading = document.createElement('div');
    heading.append(title, keyLine);
    const close = actionButton('✕', 'o3ds-header-close', closeSession, session.phase === 'applying');
    close.setAttribute('aria-label', 'Закрыть помощника');
    header.append(heading, close);
    layer.appendChild(header);
    if (['context','preview','error'].includes(session.phase)) layer.appendChild(readinessNotice());

    if (session.phase === 'context') {
      const hint = document.createElement('p');
      hint.className = 'o3ds-key';
      hint.textContent = 'Одной фразы достаточно. Можно оставить поле пустым.';
      const label = document.createElement('label');
      label.htmlFor = 'o3ds-additional-context';
      label.textContent = 'Дополнительный контекст';
      label.style.fontWeight = '600';
      label.style.marginBottom = '6px';
      const context = document.createElement('textarea');
      context.id = 'o3ds-additional-context';
      context.rows = 5;
      context.placeholder = 'Например: для кого нужна доработка, что важно учесть и какой результат ожидается';
      context.value = session.additionalContext || '';
      context.addEventListener('input', () => {
        session.additionalContext = context.value;
        context.style.height = 'auto';
        context.style.height = Math.min(Math.max(context.scrollHeight, 120), 300) + 'px';
        context.style.overflowY = context.scrollHeight > 300 ? 'auto' : 'hidden';
      });
      const actions = document.createElement('div');
      actions.className = 'o3ds-actions';
      actions.append(
        modelAction('Улучшить описание', 'o3ds-primary', startDescriptionAnalysis),
        actionButton('Отмена', 'o3ds-subtle', closeSession, false)
      );
      layer.append(hint, label, context, actions);
      return;
    }

    if (session.phase === 'loading' || session.phase === 'applying' || session.phase === 'design-creating') {
      const caption = document.createElement('p');
      caption.className = 'o3ds-key';
      caption.setAttribute('role', 'status');
      caption.textContent = session.phase === 'design-creating' ? 'Создаю задачу FTD и связываю с исходной…' : session.phase === 'applying'
        ? (session.saveIncludesLinks ? 'Сохраняю описание и выбранные связи в Jira…' : 'Сохраняю описание в Jira…')
        : 'Готовлю черновик на основе задачи и нужных источников…';
      layer.appendChild(caption);
      const track = document.createElement('div');
      track.className = 'o3ds-load-track';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', caption.textContent);
      const fill = document.createElement('div');
      fill.className = 'o3ds-load-fill';
      track.appendChild(fill);
      layer.appendChild(track);
      if (session.phase === 'loading') {
        layer.appendChild(actionButton('Отмена', 'o3ds-subtle', closeSession, false));
      }
      return;
    }

    if (session.error) {
      const error = document.createElement('p');
      error.className = 'o3ds-error';
      error.textContent = session.error;
      layer.appendChild(error);
    }

    if (session.phase === 'error') {
      const actions = document.createElement('div');
      actions.className = 'o3ds-actions';
      actions.append(
        modelAction('Повторить', 'o3ds-primary', () => session.kind === 'design' ? openDesignSession(session.issueKey) : startDescriptionAnalysis()),
        actionButton('Закрыть', 'o3ds-subtle', closeSession, false)
      );
      if (session.kind === 'description') actions.insertBefore(actionButton('Добавить контекст', 'o3ds-subtle', () => {
        session.error = '';
        session.phase = 'context';
        renderLayer();
      }, false), actions.lastChild);
      layer.appendChild(actions);
      return;
    }

    if (session.phase === 'design-confirm') {
      const note = document.createElement('p');
      note.className = 'o3ds-key';
      note.textContent = 'Будет создана задача в проекте FTD, тип «Задача», компонент «bank crm», без Epic. Продолжить?';
      const proposal = document.createElement('div');
      proposal.className = 'o3ds-answer';
      const proposalData = session.designProposal || parseDesignProposal(session.preview);
      proposal.innerHTML = formatAnswer('**Тема**\\n' + proposalData.summary + '\\n\\n**Описание**\\n' + proposalData.description);
      const actions = document.createElement('div');
      actions.className = 'o3ds-actions';
      actions.append(
        actionButton('Подтвердить и создать', 'o3ds-primary', requestDesignCreation, false),
        actionButton('Назад к черновику', 'o3ds-subtle', () => { session.phase = 'preview'; session.error = ''; renderLayer(); }, false),
        actionButton('Отмена', 'o3ds-subtle', closeSession, false)
      );
      layer.append(note, proposal, actions);
      return;
    }

    if (session.phase === 'design-created') {
      const note = document.createElement('p');
      note.className = 'o3ds-ok';
      note.textContent = session.designLinked === false
        ? 'Задача FTD создана (' + session.success + '), но Jira не подтвердила связь с исходной задачей.'
        : 'Задача FTD создана и связана с исходной: ' + session.success;
      const actions = document.createElement('div');
      actions.className = 'o3ds-actions';
      actions.append(actionButton('Закрыть', 'o3ds-primary', closeSession, false));
      layer.append(note, actions);
      return;
    }

    if (session.phase === 'success') {
      const ok = document.createElement('p');
      ok.className = 'o3ds-ok';
      ok.setAttribute('role', 'status');
      ok.textContent = session.savedText;
      layer.append(ok);
      if (session.linkOutcomes.length) {
        const list = document.createElement('ul');
        list.className = 'o3ds-link-outcomes';
        for (const outcome of session.linkOutcomes) {
          const item = document.createElement('li');
          const target = document.createElement('a');
          target.href = outcome.link.kind === 'source' ? outcome.link.key : '/browse/' + encodeURIComponent(outcome.link.key);
          target.target = '_blank';
          target.rel = 'noopener noreferrer';
          target.textContent = outcome.link.key;
          const status = document.createElement('span');
          status.textContent = outcome.failed ? ' · Требует внимания. ' + outcome.status : ' · ' + outcome.status;
          if (outcome.failed) status.className = 'o3ds-error';
          item.append(target, status);
          list.append(item);
        }
        layer.append(list);
      }
      const actions = document.createElement('div');
      actions.className = 'o3ds-actions';
      actions.append(actionButton('Закрыть', 'o3ds-subtle', closeSession, false));
      layer.append(actions);
      return;
    }

    const pre = document.createElement('div');
    pre.className = 'o3ds-answer';
    if (session.kind === 'design' && session.designProposal) {
      pre.innerHTML = formatAnswer('**Тема**\\n' + session.designProposal.summary + '\\n\\n**Описание**\\n' + session.designProposal.description);
    }
    const reply = document.createElement('textarea');
    reply.placeholder = session.kind === 'design' ? 'Уточнение к дизайн-задаче или ответ на вопросы DeepSeek' : 'Факты или правки для черновика';
    reply.setAttribute('aria-label', reply.placeholder);
    reply.rows = 2;
    reply.style.resize = 'none';
    reply.style.overflowY = 'hidden';
    reply.style.minHeight = '76px';
    reply.style.maxHeight = '180px';
    reply.style.height = '76px';
    reply.value = session.reply || '';
    const send = modelAction(session.kind === 'design' ? 'Отправить ответ' : 'Обновить черновик', 'o3ds-subtle', async () => {
      if (!reply.value.trim() || session.phase !== 'preview') return;
      const serial = ++requestSerial;
      session.phase = 'loading';
      session.error = '';
      renderLayer();
      try {
        const issueKey = session.issueKey;
        const updated = await ask(session.kind === 'design' ? 'design' : 'analyze', issueKey, '', { preview: session.preview, reply: session.reply });
        if (serial !== requestSerial) return;
        const warning = session.kind === 'description' ? await themeWarning(issueKey, updated) : '';
        if (serial !== requestSerial) return;
        session.preview = updated;
        session.themeWarning = warning;
        session.designProposal = session.kind === 'design' ? parseDesignProposal(updated) : null;
        session.reply = '';
      } catch (err) {
        if (serial !== requestSerial) return;
        session.error = err.message || 'Не удалось отправить ответ';
      }
      session.phase = 'preview';
      renderLayer();
    }, !reply.value.trim());
    reply.oninput = () => {
      session.reply = reply.value;
      reply.style.height = '76px';
      reply.style.height = Math.min(reply.scrollHeight, 180) + 'px';
      reply.style.overflowY = reply.scrollHeight > 180 ? 'auto' : 'hidden';
      const blocked = !reply.value.trim();
      send.dataset.o3dsModelAction = blocked ? 'blocked' : 'enabled';
      updateModelButton(send, blocked);
    };
    const actions = document.createElement('div');
    actions.className = 'o3ds-actions';
    const cancel = actionButton('Отмена', 'o3ds-subtle', closeSession, false);
    if (session.kind === 'design') {
      actions.append(send, actionButton('Перейти к подтверждению', 'o3ds-primary', () => { session.phase = 'design-confirm'; renderLayer(); }, false), cancel);
      layer.append(pre, reply, actions);
      return;
    }

    const draft = parseJiraDraft(session.preview, session.issueKey);
    const content = document.createElement('div');
    content.className = 'o3ds-draft';
    pre.innerHTML = formatAnswer(draft.description);
    const draftHeading = document.createElement('strong');
    draftHeading.className = 'o3ds-draft-heading';
    draftHeading.textContent = 'Черновик описания';
    content.append(draftHeading, pre);
    let approveTitle;
    if (draft.summary) {
      const proposedName = document.createElement('label');
      proposedName.className = 'o3ds-draft-name o3ds-draft-link';
      approveTitle = document.createElement('input');
      approveTitle.type = 'checkbox';
      const titleText = document.createElement('span');
      titleText.textContent = 'Применить предложенное название — ' + draft.summary;
      proposedName.append(approveTitle, titleText);
      content.append(proposedName);
    }

    const selected = new Map();
    const save = actionButton('Сохранить описание', 'o3ds-primary', () => applySession({
      description:draft.description, summary:approveTitle?.checked ? draft.summary : undefined
    }, [...selected.values()]), !draft.description);
    const proposals = draft.links.filter(link => link.kind !== 'theme' || !session.themeWarning);
    if (proposals.length) {
      const group = document.createElement('fieldset');
      group.className = 'o3ds-draft-links';
      const legend = document.createElement('legend');
      legend.textContent = 'Предложенные связи';
      group.append(legend);
      for (const link of proposals) {
        const label = document.createElement('label');
        label.className = 'o3ds-draft-link';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.onchange = () => {
          if (checkbox.checked) selected.set(link.key, link);
          else selected.delete(link.key);
          save.textContent = selected.size ? 'Сохранить и применить связи (' + selected.size + ')' : 'Сохранить описание';
        };
        const text = document.createElement('span');
        const type = link.kind === 'theme' ? 'Задача проекта' : link.kind === 'development' ? 'В проекте' : 'Веб-ссылка';
        text.textContent = link.replaceKey
          ? 'Заменить тематику ' + link.replaceKey + ' → ' + link.key
          : (link.action === 'repair' ? 'Исправить связь · ' : '') + type + ' · ' + link.key;
        if (link.reason) {
          const reason = document.createElement('small');
          reason.textContent = link.reason;
          text.append(reason);
        }
        label.append(checkbox, text);
        group.append(label);
      }
      content.append(group);
    }
    if (session.themeWarning) {
      const notice = document.createElement('p');
      notice.className = 'o3ds-theme-notice';
      const theme = draft.links.find(link => link.kind === 'theme');
      notice.textContent = 'Тематика ' + theme.key + ' пропущена. ' + session.themeWarning;
      content.append(notice);
    }
    if (draft.notes) {
      const notes = document.createElement('section');
      notes.className = 'o3ds-draft-notes';
      const title = document.createElement('strong');
      title.className = 'o3ds-draft-heading';
      title.textContent = 'Что требует уточнения';
      const questions = document.createElement('div');
      questions.className = 'o3ds-answer';
      questions.innerHTML = formatAnswer(draft.notes, true);
      notes.append(title, questions);
      content.append(notes);
    }
    const footer = document.createElement('footer');
    footer.className = 'o3ds-draft-footer';
    const refine = document.createElement('details');
    refine.className = 'o3ds-draft-refine';
    const refineLabel = document.createElement('summary');
    refineLabel.textContent = 'Добавить контекст';
    refine.open = Boolean(session.reply);
    refine.append(refineLabel, reply, send);
    actions.append(save, cancel);
    footer.append(refine, actions);
    layer.append(content, footer);
  }

  function mountNear(summaryEl) {
    if (!summaryEl || summaryEl.dataset.o3dsMounted === '1') return;
    const issueKey = issueKeyNear(summaryEl);
    if (!issueKey) return;
    summaryEl.dataset.o3dsMounted = '1';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'o3ds-btn';
    button.setAttribute('data-issue-key', issueKey);
    button.title = 'Улучшить описание через DeepSeek';
    button.append(sparkleSvg(), document.createTextNode('Улучшить'));
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (readinessPending || !readiness?.canRun || session.phase === 'loading' || session.phase === 'applying') return;
      openSession(issueKey);
    });
    summaryEl.insertAdjacentElement('afterend', button);
    if (!summaryEl.closest('#ozon-structure-root')) button.insertAdjacentElement('afterend', readinessNotice());
    syncButtons();
  }

  function scan() {
    ensureStyles();
    const summaryInput = document.getElementById('ozon-sb-summary');
    if (summaryInput) mountNear(summaryInput);
    NATIVE_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => mountNear(node));
    });
  }

  let queued = false;
  function scheduleScan() {
    if (queued) return;
    queued = true;
    window.setTimeout(() => {
      queued = false;
      scan();
    }, 200);
  }

  ensureStyles();
  scan();
  refreshReadiness();
  window.addEventListener?.('focus', () => refreshReadiness(true));
  window.addEventListener?.('pageshow', () => refreshReadiness());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshReadiness(true); });
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.ozon_deepseek_bearer_token) refreshReadiness(true);
  });
  document.addEventListener('ozon-fcrm-start-design-task', (event) => {
    let detail = event && event.detail;
    if (typeof detail === 'string') { try { detail = JSON.parse(detail); } catch { detail = null; } }
    if (detail && detail.issueKey) openDesignSession(detail.issueKey);
  });
  document.addEventListener('ozon-fcrm-design-task-result', (event) => {
    let detail = event && event.detail;
    if (typeof detail === 'string') { try { detail = JSON.parse(detail); } catch { detail = null; } }
    showDesignResult(detail);
  });
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && session.phase !== 'idle' && session.phase !== 'applying') {
      closeSession();
    }
  });
})();
`;
}
