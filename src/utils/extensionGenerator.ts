import { ExtensionConfig } from '../types/jira';

export function generateManifestJson(config: ExtensionConfig): string {
  const manifest = {
    manifest_version: 3,
    name: `Ozon Bank Jira Customizer (${config.projectKey} #${config.rapidViewId})`,
    short_name: 'Ozon Bank Jira',
    version: '1.4.0',
    description: `Кастомный визуал Jira RapidBoard (jit.o3.ru, проект ${config.projectKey}, борда #${config.rapidViewId}) в дизайн-системе Ozon Банка: эпик, компонент, исполнитель, автор, заказчик, дата, спринт и блоки связей «${config.linkTypeProjectTask}» и «${config.linkTypeInProject}».`,
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://jit.o3.ru/*'],
    action: {
      default_title: 'Ozon Bank Jira Customizer',
      default_popup: 'popup.html',
    },
    content_scripts: [
      {
        matches: [
          'https://jit.o3.ru/secure/RapidBoard.jspa*',
          'https://jit.o3.ru/browse/*',
        ],
        css: ['styles.css'],
        js: ['content.js'],
        run_at: 'document_idle',
      },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

export function generateStylesCss(config: ExtensionConfig): string {
  return `/* ==========================================================================
   Ozon Bank Design System — Jira RapidBoard Customizer (jit.o3.ru)
   Target Board: rapidView=${config.rapidViewId} & projectKey=${config.projectKey}
   ========================================================================== */

:root {
  --ozon-blue: #005BFF;
  --ozon-blue-hover: #004ED6;
  --ozon-blue-soft: #EBF2FF;
  --ozon-navy: #071026;
  --ozon-slate: #475569;
  --ozon-muted: #64748B;
  --ozon-canvas: #F5F7FA;
  --ozon-surface: #FFFFFF;
  --ozon-border: #E2E8F0;
  --ozon-emerald: #10B981;
  --ozon-amber: #F59E0B;
  --ozon-raspberry: #F91155;
  --ozon-font: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ozon-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* 1. Подготовка холста Jira RapidBoard (#ghx-pool, #ghx-work) */
#ghx-pool,
#ghx-work,
.ghx-work-wrapper {
  background-color: var(--ozon-canvas) !important;
  font-family: var(--ozon-font) !important;
}

${
  config.widenColumns
    ? `/* Расширение колонок доски для комфортного чтения блоков связей */
#ghx-pool-column .ghx-column,
.ghx-columns .ghx-column {
  min-width: ${config.columnMinWidthPx}px !important;
  background-color: #EEF2F7 !important;
  border-radius: 12px !important;
  padding: 10px !important;
  margin: 0 6px !important;
  border: 1px solid var(--ozon-border) !important;
}

#ghx-column-headers .ghx-column {
  min-width: ${config.columnMinWidthPx}px !important;
  background: transparent !important;
  border-bottom: 2px solid var(--ozon-blue) !important;
  padding: 8px 12px !important;
}`
    : ''
}

/* 2. Стилизация карточки задачи (.ghx-issue) в эстетике Ozon Банка */
.ghx-issue {
  background: var(--ozon-surface) !important;
  border: 1px solid var(--ozon-border) !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 2px rgba(7, 16, 38, 0.04) !important;
  margin-bottom: 12px !important;
  padding: ${config.compactMode ? '10px 12px' : '14px 16px'} !important;
  transition: transform 0.14s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.14s ease, box-shadow 0.14s ease !important;
}

.ghx-issue:hover,
.ghx-issue.ghx-selected {
  border-color: var(--ozon-blue) !important;
  box-shadow: 0 6px 18px rgba(0, 91, 255, 0.09) !important;
}

/* Скрываем стандартные дублирующиеся элементы Jira при активном кастомном рендере */
.ghx-issue.ozon-fcrm-upgraded .ghx-issue-content > *:not(.ozon-fcrm-card) {
  display: none !important;
}

.ghx-issue.ozon-fcrm-upgraded .ghx-grabber {
  display: none !important;
}

/* 3. Внутренняя структура карточки Ozon Bank FCRM */
.ozon-fcrm-card {
  display: flex;
  flex-direction: column;
  gap: ${config.compactMode ? '8px' : '10px'};
  font-family: var(--ozon-font);
  color: var(--ozon-navy);
}

.ozon-fcrm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--ozon-muted);
}

.ozon-fcrm-key {
  font-family: var(--ozon-mono);
  font-weight: 600;
  color: var(--ozon-blue);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.ozon-fcrm-key:hover {
  text-decoration: underline;
}

.ozon-fcrm-created {
  font-family: var(--ozon-mono);
  font-variant-numeric: tabular-nums;
  color: var(--ozon-muted);
}

.ozon-fcrm-summary {
  font-size: ${config.compactMode ? '13px' : '14px'};
  font-weight: 600;
  line-height: 1.4;
  color: var(--ozon-navy);
  margin: 0;
  word-break: break-word;
}

/* 4. Строка метаданных: Эпик · Компонент · Спринт (Zero-Pill чистая типографика) */
.ozon-fcrm-meta-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--ozon-slate);
  padding-top: 4px;
  border-top: 1px solid #F1F5F9;
}

.ozon-fcrm-epic {
  font-weight: 600;
  color: var(--ozon-blue);
}

.ozon-fcrm-sep {
  color: #CBD5E1;
  user-select: none;
}

/* 5. Сетка участников: Исполнитель, Автор, Заказчик */
.ozon-fcrm-people-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  padding: 8px 10px;
  background-color: #F8FAFC;
  border: 1px solid #EEF2F6;
  border-radius: 8px;
  font-size: 11.5px;
}

.ozon-fcrm-person-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.ozon-fcrm-person-label {
  color: var(--ozon-muted);
  white-space: nowrap;
}

.ozon-fcrm-person-value {
  font-weight: 600;
  color: var(--ozon-navy);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ozon-fcrm-customer-value {
  color: #004ED6;
  font-weight: 600;
}

/* 6. Два блока связей: «Задача проекта» и «В проекте» */
.ozon-fcrm-links-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--ozon-border);
}

.ozon-fcrm-link-block {
  background: #FAFBFD;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 6px 8px;
}

.ozon-fcrm-link-block-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ozon-slate);
  margin-bottom: 4px;
}

.ozon-fcrm-link-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
  padding: 2px 0;
  border-top: 1px dashed #EEF2F6;
}

.ozon-fcrm-link-item:first-of-type {
  border-top: none;
}

.ozon-fcrm-link-key {
  font-family: var(--ozon-mono);
  font-weight: 600;
  color: var(--ozon-blue);
  text-decoration: none;
  flex-shrink: 0;
}

.ozon-fcrm-link-summary {
  color: var(--ozon-navy);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ozon-fcrm-link-status {
  font-size: 10px;
  color: var(--ozon-muted);
  flex-shrink: 0;
}
`;
}

export function generateContentScriptJs(config: ExtensionConfig): string {
  return `/**
 * Ozon Bank Jira Customizer — Content Script for https://jit.o3.ru
 * Target Board: rapidView=${config.rapidViewId}, projectKey=${config.projectKey}
 * Automatically enriches RapidBoard cards with REST API /rest/api/2/issue/{key}
 */

(function () {
  'use strict';

  const DEFAULT_SETTINGS = ${JSON.stringify(config, null, 2)};
  let settings = { ...DEFAULT_SETTINGS };
  const issueCache = new Map();
  const pendingRequests = new Map();

  // Загружаем пользовательские настройки из chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['ozonFcrmSettings'], (res) => {
      if (res && res.ozonFcrmSettings) {
        settings = { ...DEFAULT_SETTINGS, ...res.ozonFcrmSettings };
      }
      initBoardObserver();
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.ozonFcrmSettings) {
        settings = { ...DEFAULT_SETTINGS, ...changes.ozonFcrmSettings.newValue };
        rerenderAllCards();
      }
    });
  } else {
    initBoardObserver();
  }

  // Проверка, что открыта нужная доска (или любая RapidBoard при желании)
  function isTargetBoard() {
    const url = window.location.href;
    if (!url.includes('RapidBoard.jspa')) return false;
    if (settings.rapidViewId && !url.includes('rapidView=' + settings.rapidViewId)) {
      return false;
    }
    return true;
  }

  // Форматирование даты создания в ДД.ММ.ГГГГ ЧЧ:мм
  function formatJiraDate(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      const pad = (n) => String(n).padStart(2, '0');
      return \`\${pad(d.getDate())}.\${pad(d.getMonth() + 1)}.\${d.getFullYear()} \${pad(d.getHours())}:\${pad(d.getMinutes())}\`;
    } catch (e) {
      return isoStr;
    }
  }

  // Извлечение названия спринта из массива GreenHopper строк или объектов
  function extractSprintName(rawSprint) {
    if (!rawSprint) return 'Вне спринта';
    const item = Array.isArray(rawSprint) ? rawSprint[rawSprint.length - 1] : rawSprint;
    if (!item) return 'Вне спринта';
    if (typeof item === 'object' && item.name) return item.name;
    if (typeof item === 'string') {
      const match = item.match(/name=([^,\\]]+)/);
      return match ? match[1] : item;
    }
    return String(item);
  }

  // Извлечение поля «Заказчик» (поддержка объекта user, строки, массива или кастомного справочника)
  function extractCustomer(fields) {
    const raw = fields[settings.customerFieldId];
    if (!raw) {
      // Fallback: поиск по имени в других customfield, если структура нестандартная
      return 'Не указан';
    }
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      return raw.map((x) => x.displayName || x.value || x.name || x).join(', ');
    }
    if (typeof raw === 'object') {
      return raw.displayName || raw.value || raw.name || JSON.stringify(raw);
    }
    return String(raw);
  }

  // Классификация связей на два блока: «Задача проекта» и «В проекте»
  function extractIssueLinks(issuelinks) {
    const projectTaskLinks = [];
    const inProjectLinks = [];

    if (!Array.isArray(issuelinks)) {
      return { projectTaskLinks, inProjectLinks };
    }

    const ptNeedle = (settings.linkTypeProjectTask || 'Задача проекта').toLowerCase();
    const ipNeedle = (settings.linkTypeInProject || 'В проекте').toLowerCase();

    for (const link of issuelinks) {
      const typeName = ((link.type && link.type.name) || '').toLowerCase();
      const inwardDesc = ((link.type && link.type.inward) || '').toLowerCase();
      const outwardDesc = ((link.type && link.type.outward) || '').toLowerCase();

      const target = link.outwardIssue || link.inwardIssue;
      if (!target || !target.key) continue;

      const item = {
        key: target.key,
        summary: (target.fields && target.fields.summary) || target.key,
        status:
          (target.fields && target.fields.status && target.fields.status.name) || 'Открыто',
      };

      const combinedType = \`\${typeName} \${inwardDesc} \${outwardDesc}\`;

      if (combinedType.includes(ptNeedle)) {
        projectTaskLinks.push(item);
      } else if (combinedType.includes(ipNeedle)) {
        inProjectLinks.push(item);
      } else if (target.key.startsWith('PROJ-')) {
        // Эвристика для проектных задач, если тип связи назван нестандартно
        projectTaskLinks.push(item);
      } else {
        inProjectLinks.push(item);
      }
    }

    return { projectTaskLinks, inProjectLinks };
  }

  // Запрос полных данных задачи через Jira REST API (использует текущую сессию jit.o3.ru)
  async function fetchIssueDetails(issueKey) {
    if (issueCache.has(issueKey)) {
      return issueCache.get(issueKey);
    }
    if (pendingRequests.has(issueKey)) {
      return pendingRequests.get(issueKey);
    }

    const fieldsParam = [
      'summary',
      'components',
      'assignee',
      'reporter',
      'creator',
      'created',
      'issuelinks',
      settings.epicFieldId,
      settings.sprintFieldId,
      settings.customerFieldId,
    ]
      .filter(Boolean)
      .join(',');

    const url = \`/rest/api/2/issue/\${encodeURIComponent(issueKey)}?fields=\${encodeURIComponent(fieldsParam)}\`;

    const promise = fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then((data) => {
        const f = data.fields || {};
        const links = extractIssueLinks(f.issuelinks);
        const parsed = {
          key: data.key || issueKey,
          summary: f.summary || '',
          epic: f[settings.epicFieldId] || 'Без эпика',
          component:
            Array.isArray(f.components) && f.components.length > 0
              ? f.components.map((c) => c.name).join(', ')
              : 'Без компонента',
          assignee:
            (f.assignee && (f.assignee.displayName || f.assignee.name)) || 'Не назначен',
          author:
            (f.reporter && (f.reporter.displayName || f.reporter.name)) ||
            (f.creator && (f.creator.displayName || f.creator.name)) ||
            'Неизвестен',
          customer: extractCustomer(f),
          createdAt: formatJiraDate(f.created),
          sprint: extractSprintName(f[settings.sprintFieldId]),
          projectTaskLinks: links.projectTaskLinks,
          inProjectLinks: links.inProjectLinks,
        };
        issueCache.set(issueKey, parsed);
        pendingRequests.delete(issueKey);
        return parsed;
      })
      .catch((err) => {
        console.warn('[Ozon Bank Jira Extension] Не удалось обогатить задачу', issueKey, err);
        pendingRequests.delete(issueKey);
        return null;
      });

    pendingRequests.set(issueKey, promise);
    return promise;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderLinksBlock(title, items) {
    const listHtml =
      items.length === 0
        ? '<div class="ozon-fcrm-link-item"><span class="ozon-fcrm-link-status">Нет связанных задач</span></div>'
        : items
            .map(
              (item) => \`
          <div class="ozon-fcrm-link-item">
            <a class="ozon-fcrm-link-key" href="/browse/\${escapeHtml(item.key)}" target="_blank">\${escapeHtml(item.key)}</a>
            <span class="ozon-fcrm-link-summary" title="\${escapeHtml(item.summary)}">\${escapeHtml(item.summary)}</span>
            <span class="ozon-fcrm-link-status">\${escapeHtml(item.status)}</span>
          </div>\`
            )
            .join('');

    return \`
      <div class="ozon-fcrm-link-block">
        <div class="ozon-fcrm-link-block-title">
          <span>\${escapeHtml(title)}</span>
          <span>\${items.length}</span>
        </div>
        \${listHtml}
      </div>
    \`;
  }

  function buildCardHtml(issue) {
    const metaParts = [];
    if (settings.showEpic) {
      metaParts.push(\`<span class="ozon-fcrm-epic">\${escapeHtml(issue.epic)}</span>\`);
    }
    if (settings.showComponent) {
      metaParts.push(\`<span>\${escapeHtml(issue.component)}</span>\`);
    }
    if (settings.showSprint) {
      metaParts.push(\`<span>\${escapeHtml(issue.sprint)}</span>\`);
    }

    const peopleRows = [];
    if (settings.showAssignee) {
      peopleRows.push(\`
        <div class="ozon-fcrm-person-row">
          <span class="ozon-fcrm-person-label">Исполнитель</span>
          <span class="ozon-fcrm-person-value">\${escapeHtml(issue.assignee)}</span>
        </div>\`);
    }
    if (settings.showAuthor) {
      peopleRows.push(\`
        <div class="ozon-fcrm-person-row">
          <span class="ozon-fcrm-person-label">Автор</span>
          <span class="ozon-fcrm-person-value">\${escapeHtml(issue.author)}</span>
        </div>\`);
    }
    if (settings.showCustomer) {
      peopleRows.push(\`
        <div class="ozon-fcrm-person-row">
          <span class="ozon-fcrm-person-label">Заказчик</span>
          <span class="ozon-fcrm-person-value ozon-fcrm-customer-value">\${escapeHtml(issue.customer)}</span>
        </div>\`);
    }

    const linksBlocks = [];
    if (settings.showProjectTaskLinks) {
      linksBlocks.push(renderLinksBlock(settings.linkTypeProjectTask || 'Задача проекта', issue.projectTaskLinks));
    }
    if (settings.showInProjectLinks) {
      linksBlocks.push(renderLinksBlock(settings.linkTypeInProject || 'В проекте', issue.inProjectLinks));
    }

    return \`
      <div class="ozon-fcrm-header">
        <a class="ozon-fcrm-key" href="/browse/\${escapeHtml(issue.key)}">\${escapeHtml(issue.key)}</a>
        \${settings.showCreatedAt ? \`<span class="ozon-fcrm-created">\${escapeHtml(issue.createdAt)}</span>\` : ''}
      </div>
      \${settings.showSummary ? \`<div class="ozon-fcrm-summary">\${escapeHtml(issue.summary)}</div>\` : ''}
      \${
        metaParts.length > 0
          ? \`<div class="ozon-fcrm-meta-line">\${metaParts.join('<span class="ozon-fcrm-sep">·</span>')}</div>\`
          : ''
      }
      \${
        peopleRows.length > 0
          ? \`<div class="ozon-fcrm-people-grid">\${peopleRows.join('')}</div>\`
          : ''
      }
      \${
        linksBlocks.length > 0
          ? \`<div class="ozon-fcrm-links-section">\${linksBlocks.join('')}</div>\`
          : ''
      }
    \`;
  }

  async function upgradeCardElement(cardEl) {
    const issueKey =
      cardEl.getAttribute('data-issue-key') ||
      (cardEl.querySelector('.ghx-key') && cardEl.querySelector('.ghx-key').textContent.trim());

    if (!issueKey) return;

    const issueData = await fetchIssueDetails(issueKey);
    if (!issueData) return;

    let contentWrapper = cardEl.querySelector('.ghx-issue-content') || cardEl;
    let customContainer = contentWrapper.querySelector('.ozon-fcrm-card');

    if (!customContainer) {
      customContainer = document.createElement('div');
      customContainer.className = 'ozon-fcrm-card';
      contentWrapper.appendChild(customContainer);
    }

    customContainer.innerHTML = buildCardHtml(issueData);
    cardEl.classList.add('ozon-fcrm-upgraded');
  }

  function scanAndUpgradeBoard() {
    if (!isTargetBoard()) return;
    const cards = document.querySelectorAll('.ghx-issue');
    cards.forEach((card) => {
      if (!card.classList.contains('ozon-fcrm-upgraded')) {
        upgradeCardElement(card);
      }
    });
  }

  function rerenderAllCards() {
    const cards = document.querySelectorAll('.ghx-issue');
    cards.forEach((card) => {
      card.classList.remove('ozon-fcrm-upgraded');
      upgradeCardElement(card);
    });
  }

  function initBoardObserver() {
    scanAndUpgradeBoard();

    const observer = new MutationObserver(() => {
      scanAndUpgradeBoard();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
})();
`;
}

export function generatePopupHtml(config: ExtensionConfig): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Ozon Bank Jira Customizer</title>
  <style>
    body {
      width: 340px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F5F7FA;
      color: #071026;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid #E2E8F0;
      margin-bottom: 12px;
    }
    .brand {
      font-weight: 700;
      font-size: 14px;
      color: #005BFF;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      margin: 10px 0 6px;
    }
    .field-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      padding: 5px 0;
    }
    input[type="text"] {
      width: 145px;
      padding: 4px 8px;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
    }
    .btn {
      width: 100%;
      margin-top: 12px;
      padding: 9px 12px;
      background: #005BFF;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn:hover {
      background: #004ED6;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="brand">Ozon Bank · Jira FCRM #${config.rapidViewId}</span>
    <span style="font-size:11px;color:#64748B;">v1.4.0</span>
  </div>

  <div class="section-title">ID кастомных полей Jira (jit.o3.ru)</div>
  <div class="field-row">
    <label>Поле «Заказчик»</label>
    <input id="customerFieldId" type="text" value="${config.customerFieldId}" />
  </div>
  <div class="field-row">
    <label>Поле «Эпик»</label>
    <input id="epicFieldId" type="text" value="${config.epicFieldId}" />
  </div>
  <div class="field-row">
    <label>Поле «Спринт»</label>
    <input id="sprintFieldId" type="text" value="${config.sprintFieldId}" />
  </div>
  <div class="field-row">
    <label>Связь 1 (Задача проекта)</label>
    <input id="linkTypeProjectTask" type="text" value="${config.linkTypeProjectTask}" />
  </div>
  <div class="field-row">
    <label>Связь 2 (В проекте)</label>
    <input id="linkTypeInProject" type="text" value="${config.linkTypeInProject}" />
  </div>

  <button class="btn" id="saveBtn">Сохранить и обновить доску</button>
  <script src="popup.js"></script>
</body>
</html>`;
}

export function generatePopupJs(config: ExtensionConfig): string {
  return `document.addEventListener('DOMContentLoaded', () => {
  const fields = ['customerFieldId', 'epicFieldId', 'sprintFieldId', 'linkTypeProjectTask', 'linkTypeInProject'];

  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['ozonFcrmSettings'], (res) => {
      const current = (res && res.ozonFcrmSettings) || {};
      fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el && current[id]) el.value = current[id];
      });
    });
  }

  document.getElementById('saveBtn').addEventListener('click', () => {
    const updated = ${JSON.stringify(config)};
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) updated[id] = el.value.trim();
    });

    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ozonFcrmSettings: updated }, () => {
        const btn = document.getElementById('saveBtn');
        btn.textContent = 'Сохранено!';
        setTimeout(() => {
          btn.textContent = 'Сохранить и обновить доску';
        }, 1200);
      });
    }
  });
});
`;
}
