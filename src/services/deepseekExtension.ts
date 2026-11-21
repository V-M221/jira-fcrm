import { answerMarkup } from '../utils/answerMarkup';
import { structuredAnswer } from '../utils/structuredAnswer';
﻿import {
  completeDeepseekChat,
  DEEPSEEK_AUTHS_URL,
  DEEPSEEK_CHAT_MESSAGE_TYPE,
  DEEPSEEK_PROMPT_STORAGE_KEY,
  DEEPSEEK_TOKEN_STORAGE_KEY,
  DEFAULT_DEEPSEEK_SYSTEM_PROMPT,
  DESIGN_TASK_SYSTEM_PROMPT,
  parseJiraDraft,
  saveJiraDraft,
} from './deepseek';

export function generateBackgroundJs(): string {
  return `const completeDeepseekChat = ${completeDeepseekChat.toString()};
const TOKEN_KEY = ${JSON.stringify(DEEPSEEK_TOKEN_STORAGE_KEY)};
const PROMPT_KEY = ${JSON.stringify(DEEPSEEK_PROMPT_STORAGE_KEY)};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== ${JSON.stringify(DEEPSEEK_CHAT_MESSAGE_TYPE)}) {
    return;
  }
  chrome.storage.local
    .get([TOKEN_KEY, PROMPT_KEY])
    .then((stored) => {
      const raw = stored && stored[TOKEN_KEY] ? String(stored[TOKEN_KEY]) : '';
      const prompt = message.mode === 'design' ? ${JSON.stringify(DESIGN_TASK_SYSTEM_PROMPT)} : stored && stored[PROMPT_KEY] ? String(stored[PROMPT_KEY]) : ${JSON.stringify(DEFAULT_DEEPSEEK_SYSTEM_PROMPT)};
      return completeDeepseekChat(message.issueKey, message.mode, raw || null, message.approvedDescription || '', prompt, message.clarification, message.additionalContext || '');
    })
    .then((text) => {
      sendResponse({ ok: true, text: text });
    })
    .catch((err) => {
      sendResponse({
        ok: false,
        error: err && err.message ? String(err.message).replace(/^THREAD_INPUT_INVALID: /, '') : 'Не удалось получить ответ DeepSeek',
        errorCode: err && String(err.message || '').startsWith('THREAD_INPUT_INVALID: ') ? 'THREAD_INPUT_INVALID' : undefined,
      });
    });
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

  const formatAnswer = ${answerMarkup.toString()};
  const formatStructuredAnswer = ${structuredAnswer.toString()};
  const parseJiraDraft = ${parseJiraDraft.toString()};
  const saveJiraDraft = ${saveJiraDraft.toString()};
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
    style.textContent = [
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
      '#o3ds-layer .o3ds-skel{height:12px!important;margin:0 0 8px!important;border-radius:3px!important;background:linear-gradient(90deg,#F4F5F7 25%,#EBECF0 37%,#F4F5F7 63%)!important;background-size:400% 100%!important;animation:o3ds-shimmer 1.2s ease infinite!important;}',
      '#o3ds-layer .o3ds-skel.short{width:62%!important;}',
      '@keyframes o3ds-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}',
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
      '#o3ds-layer .o3ds-draft-heading{display:block;font-size:13px;font-weight:700;margin:0 0 7px;color:#071026}#o3ds-layer .o3ds-draft-name{margin:0 0 12px;color:#334155}#o3ds-layer .o3ds-draft details{margin:0 0 12px;padding:9px 12px;background:#f4f7fb;border-radius:8px}#o3ds-layer .o3ds-draft summary{cursor:pointer;font-weight:650}#o3ds-layer .o3ds-draft details>div{margin-top:8px}',
      '#o3ds-layer .o3ds-draft-links{margin:0 0 12px;padding:10px 12px;border:1px solid #d7e0ec;border-radius:8px;min-width:0}#o3ds-layer .o3ds-draft-link{display:flex;gap:8px;padding:6px 0;align-items:flex-start;cursor:pointer}#o3ds-layer .o3ds-draft-link input{width:15px;height:15px;margin-top:2px;flex:none;accent-color:#005bff}#o3ds-layer .o3ds-draft-link span{min-width:0;overflow-wrap:anywhere}#o3ds-layer .o3ds-draft-link small{display:block;color:#626f86}',
      '#o3ds-layer .o3ds-draft-footer{padding-top:12px;border-top:1px solid #d7e0ec;background:#fff;flex:none}#o3ds-layer .o3ds-draft-footer .o3ds-actions{justify-content:flex-start}#o3ds-layer .o3ds-draft-refine{margin-bottom:10px}#o3ds-layer .o3ds-draft-refine summary{cursor:pointer;color:#005bff;width:max-content}#o3ds-layer .o3ds-draft-refine[open] summary{margin-bottom:8px}',
      '@media(max-width:800px){body:has(#ozon-structure-root #ozon-ext-sidebar-panel) > #o3ds-layer{width:min(480px,100vw)!important;}}',
      '#o3ds-layer textarea{box-sizing:border-box;width:100%;min-height:76px!important;padding:10px;resize:vertical;border:1px solid #D7E0EC;border-radius:8px;font:inherit;margin-bottom:8px;background:#fff;color:#071026;}#o3ds-layer textarea:focus{outline:none;border-color:#005BFF;box-shadow:0 0 0 3px rgba(0,91,255,.12)}',
      '#o3ds-layer .o3ds-actions{flex-wrap:wrap;}'
    ].join('');
    document.documentElement.appendChild(style);
  }

  function sparkleSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path fill="currentColor" d="M8 1.2l1.05 3.35L12.4 5.6 9.05 6.65 8 10 6.95 6.65 3.6 5.6l3.35-1.05L8 1.2zm4.2 7.1.55 1.75 1.75.55-1.75.55-.55 1.75-.55-1.75-1.75-.55 1.75-.55.55-1.75zM3.1 9.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z"/>';
    return svg;
  }

  function syncButtons() {
    const busy = session.phase === 'loading' || session.phase === 'applying' || session.phase === 'design-creating';
    document.querySelectorAll('.o3ds-btn').forEach((node) => {
      const button = node;
      const sameIssue = button.getAttribute('data-issue-key') === session.issueKey;
      button.disabled = busy && sameIssue;
    });
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
    const issueKey = session.issueKey;
    session.phase = 'loading';
    session.error = '';
    renderLayer();
    const serial = ++requestSerial;
    ask('analyze', issueKey)
      .then((text) => {
        if (serial !== requestSerial) return;
        session.phase = 'preview';
        session.preview = text;
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

  function openDesignSession(issueKey) {
    if (!issueKey) return;
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
    document.dispatchEvent(new CustomEvent('ozon-fcrm-issue-applied', { detail: { issueKey } }));
    session.savedText = saved.changed ? 'Описание сохранено в Jira' : 'Описание уже актуально в Jira';
    session.success = '';
    if (selectedLinks.length) {
      session.applyingLinks = true;
      renderLayer();
      try {
        session.success = await ask('apply_links', issueKey, JSON.stringify(selectedLinks));
      } catch (err) {
        session.error = err?.message || 'Сохранение связей не подтверждено';
      } finally {
        session.applyingLinks = false;
        document.dispatchEvent(new CustomEvent('ozon-fcrm-issue-applied', { detail: { issueKey } }));
      }
    }
    if (serial !== requestSerial) return;
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
        actionButton('Улучшить описание', 'o3ds-primary', startDescriptionAnalysis, false),
        actionButton('Отмена', 'o3ds-subtle', closeSession, false)
      );
      layer.append(hint, label, context, actions);
      return;
    }

    if (session.phase === 'loading' || session.phase === 'applying' || session.phase === 'design-creating') {
      const caption = document.createElement('p');
      caption.className = 'o3ds-key';
      caption.textContent = session.phase === 'design-creating' ? 'Создаю задачу FTD и связываю с исходной…' : session.applyingLinks ? 'Описание сохранено. DeepSeek проверяет и устанавливает выбранные связи…' : session.phase === 'applying' ? 'Сохраняю описание в Jira…' : 'Готовлю черновик на основе задачи и нужных источников…';
      layer.appendChild(caption);
      for (let i = 0; i < 4; i += 1) {
        const bone = document.createElement('div');
        bone.className = i === 2 ? 'o3ds-skel short' : 'o3ds-skel';
        layer.appendChild(bone);
      }
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
        actionButton('Повторить', 'o3ds-primary', () => session.kind === 'design' ? openDesignSession(session.issueKey) : startDescriptionAnalysis(), false),
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
      ok.textContent = session.savedText;
      layer.append(ok);
      if (session.success) {
        const result = document.createElement('div');
        result.className = 'o3ds-answer';
        result.innerHTML = formatStructuredAnswer(session.success, 'result', formatAnswer);
        layer.append(result);
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
    const send = actionButton(session.kind === 'design' ? 'Отправить ответ' : 'Обновить черновик', 'o3ds-subtle', async () => {
      if (!reply.value.trim() || session.phase !== 'preview') return;
      const serial = ++requestSerial;
      session.phase = 'loading';
      session.error = '';
      renderLayer();
      try {
        const updated = await ask(session.kind === 'design' ? 'design' : 'analyze', session.issueKey, '', { preview: session.preview, reply: session.reply });
        if (serial !== requestSerial) return;
        session.preview = updated;
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
      send.disabled = !reply.value.trim();
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
    if (draft.links.length) {
      const group = document.createElement('fieldset');
      group.className = 'o3ds-draft-links';
      const legend = document.createElement('legend');
      legend.textContent = 'Предложенные связи';
      group.append(legend);
      for (const link of draft.links) {
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
    if (draft.notes) {
      const notes = document.createElement('details');
      const title = document.createElement('summary');
      title.textContent = 'Что требует уточнения';
      const details = document.createElement('div');
      details.innerHTML = formatAnswer(draft.notes);
      notes.append(title, details);
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
      if (session.phase === 'loading' || session.phase === 'applying') return;
      openSession(issueKey);
    });
    summaryEl.insertAdjacentElement('afterend', button);
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
