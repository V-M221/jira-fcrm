import { ExtensionConfig, FcrmTask, LinkedIssueItem } from '../types/jira';

export function generateManifestJson(config: ExtensionConfig): string {
  const manifest = {
    manifest_version: 3,
    name: `Ozon Bank · Jira FCRM Structure (#${config.rapidViewId})`,
    short_name: 'Ozon Structure',
    version: '2.4.0',
    description: `Компактный реестр Jira Structure с группировкой по спринтам для доски jit.o3.ru (rapidView=${config.rapidViewId}, projectKey=${config.projectKey}) в дизайн-системе Ozon Банка.`,
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://jit.o3.ru/*'],
    action: {
      default_title: 'Ozon Bank · FCRM Structure',
      default_popup: 'popup.html',
    },
    content_scripts: [
      {
        matches: [
          'https://jit.o3.ru/secure/RapidBoard.jspa*',
          'https://jit.o3.ru/browse/*',
          'https://jit.o3.ru/issues/*',
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
  return `/* ============================================================================
   Ozon Bank Design System — Jira Structure Extension for jit.o3.ru
   Target: https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=${config.rapidViewId}&projectKey=${config.projectKey}
   ============================================================================ */

:root {
  --ozon-label-action: #005BFF;
  --ozon-label-action-hover-veil: rgba(0, 91, 255, 0.10);
  --ozon-label-action-active-veil: rgba(0, 91, 255, 0.20);
  --ozon-layer-surface: #F2F4F8;
  --ozon-graphic-accent-primary: #E11D68;
  --ozon-graphic-secondary: #1E293B;
  --ozon-negative-bg: #FBECE9;
  --ozon-negative-text: #D9381E;
  --ozon-disabled-bg: #E9ECEF;
  --ozon-disabled-text: #868E96;
  --ozon-navy: #071026;
  --ozon-border: #E2E8F0;
}

/* Кнопка переключения режима Ozon Structure в шапке Jira */
#ozon-structure-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  margin-left: 10px;
  background-color: #E5F0FF;
  color: #005BFF;
  font-family: -apple-system, BlinkMacSystemFont, 'Manrope', 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 120ms ease;
  z-index: 9999;
}

#ozon-structure-toggle-btn:hover {
  background-color: #D0E3FF;
}

#ozon-structure-toggle-btn:active {
  background-color: #B8D4FF;
}

#ozon-structure-toggle-btn.active {
  background-color: #005BFF;
  color: #FFFFFF;
}

/* Контейнер компактного реестра Ozon Structure поверх стандартной доски Jira */
#ozon-structure-root {
  position: fixed;
  top: 42px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9990;
  background: #F5F7FA;
  color: #071026;
  font-family: -apple-system, BlinkMacSystemFont, 'Manrope', 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ozon-ext-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  font-size: 12px;
}

.ozon-ext-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #FFFFFF;
}

.ozon-ext-table-pane {
  flex: 1;
  overflow: auto;
}

.ozon-ext-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
  user-select: none;
}

.ozon-ext-table th {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #F1F5F9;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid #CBD5E1;
  border-right: 1px solid #E2E8F0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ozon-ext-col-resizer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
}

.ozon-ext-col-resizer:hover {
  background: #005BFF;
}

.ozon-ext-sprint-row {
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  font-weight: 700;
  cursor: pointer;
}

.ozon-ext-sprint-row:hover {
  background: #F2F4F8;
}

.ozon-ext-sprint-row td {
  padding: 6px 12px;
}

.ozon-ext-task-row {
  height: 28px;
  border-bottom: 1px solid #EEF2F6;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.ozon-ext-task-row:hover:not(:has(.ozon-ext-inner-ctrl:hover)) {
  background: var(--ozon-layer-surface);
}

.ozon-ext-task-row.selected {
  background: #E8F1FF;
}

.ozon-ext-task-row td {
  padding: 2px 8px;
  border-right: 1px solid #EEF2F6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
}

.ozon-ext-inline-select {
  width: 100%;
  font-size: 11px;
  font-weight: 600;
  color: #071026;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 1px 4px;
  cursor: pointer;
}

.ozon-ext-inline-select:hover {
  background: var(--ozon-label-action-hover-veil);
  border-color: rgba(0, 91, 255, 0.25);
}

.ozon-ext-inline-select:focus-visible {
  background: #FFFFFF;
  outline: 2px solid var(--ozon-graphic-accent-primary);
  outline-offset: 2px;
}

.ozon-ext-resizer-bar {
  width: 6px;
  background: #E2E8F0;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background-color 120ms ease;
}

.ozon-ext-resizer-bar:hover {
  background: #005BFF;
}

.ozon-ext-sidebar {
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
}
`;
}

export function generateContentScriptJs(
  config: ExtensionConfig,
  initialTasks: FcrmTask[],
  umbEpicCatalog: LinkedIssueItem[]
): string {
  return `/**
 * Ozon Bank · Jira FCRM Structure Chrome Extension (Manifest V3)
 * Works directly on https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=${config.rapidViewId}&projectKey=${config.projectKey}
 * Fetches real issues via Jira REST API (/rest/agile/1.0/board/${config.rapidViewId}/issue & /rest/api/2/search?jql=labels=fcrm_umb_epic)
 * with fallback to preloaded FCRM structure data.
 */
(function () {
  'use strict';

  const CONFIG = ${JSON.stringify(config, null, 2)};
  let tasks = ${JSON.stringify(initialTasks, null, 2)};
  let umbCatalog = ${JSON.stringify(umbEpicCatalog, null, 2)};
  let isStructureVisible = true;
  let selectedTaskKey = tasks[0] ? tasks[0].key : null;
  let sidebarWidth = 460;
  let collapsedSprints = {};
  let expandedRows = {};
  let searchQuery = '';

  let colWidths = {
    task: 330,
    status: 110,
    epic: 175,
    component: 150,
    assignee: 135,
    author: 120,
    customer: 170,
    created: 110,
    sprint: 145,
    projectTask: 185,
    inProject: 215
  };

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) {
      return iso;
    }
  }

  function parseSprint(raw) {
    if (!raw) return 'Бэклог FCRM';
    const item = Array.isArray(raw) ? raw[raw.length - 1] : raw;
    if (!item) return 'Бэклог FCRM';
    if (typeof item === 'object' && item.name) return item.name;
    if (typeof item === 'string') {
      const m = item.match(/name=([^,\\]]+)/);
      return m ? m[1] : item;
    }
    return String(item);
  }

  // Подгрузка задач из фильтра JQL: labels = fcrm_umb_epic
  async function loadUmbEpicTasksFromJira() {
    try {
      const res = await fetch('/rest/api/2/search?jql=' + encodeURIComponent('labels = fcrm_umb_epic') + '&fields=key,summary,status&maxResults=100', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.issues) && data.issues.length > 0) {
        umbCatalog = data.issues.map((iss, idx) => ({
          id: 'umb-' + idx,
          key: iss.key,
          summary: (iss.fields && iss.fields.summary) || iss.key,
          status: (iss.fields && iss.fields.status && iss.fields.status.name) || 'Открыто'
        }));
        renderStructure();
      }
    } catch (e) {
      console.info('[Ozon Structure] Используется локальный каталог fcrm_umb_epic');
    }
  }

  // Подгрузка задач доски FCRM #9349 через Jira REST API
  async function loadBoardIssuesFromJira() {
    try {
      const fields = [
        'summary',
        'status',
        'components',
        'assignee',
        'reporter',
        'created',
        'issuelinks',
        CONFIG.epicFieldId,
        CONFIG.sprintFieldId,
        CONFIG.customerFieldId
      ].join(',');

      const res = await fetch('/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/issue?maxResults=150&fields=' + encodeURIComponent(fields), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.issues) || data.issues.length === 0) return;

      tasks = data.issues.map((iss) => {
        const f = iss.fields || {};
        const rawLinks = Array.isArray(f.issuelinks) ? f.issuelinks : [];
        const ptLinks = [];
        const ipLinks = [];

        rawLinks.forEach((lnk, idx) => {
          const target = lnk.outwardIssue || lnk.inwardIssue;
          if (!target) return;
          const tName = ((lnk.type && lnk.type.name) || '').toLowerCase();
          const item = {
            id: 'lnk-' + idx,
            key: target.key,
            summary: (target.fields && target.fields.summary) || target.key,
            status: (target.fields && target.fields.status && target.fields.status.name) || 'В работе',
            component: 'Core-Scoring',
            sprint: parseSprint(f[CONFIG.sprintFieldId])
          };
          if (tName.includes('задача проекта') || target.key.startsWith('PROJ-')) {
            ptLinks.push(item);
          } else {
            ipLinks.push(item);
          }
        });

        const custRaw = f[CONFIG.customerFieldId];
        const custName = custRaw
          ? (typeof custRaw === 'object' ? (custRaw.displayName || custRaw.value || custRaw.name) : String(custRaw))
          : 'Не указан';

        return {
          key: iss.key,
          summary: f.summary || '',
          epicKey: f[CONFIG.epicFieldId] || 'FCRM-EPIC',
          epicName: f[CONFIG.epicFieldId] || 'Без эпика',
          component: Array.isArray(f.components) && f.components[0] ? f.components[0].name : 'Core-Scoring',
          assignee: {
            name: (f.assignee && f.assignee.displayName) || 'Не назначен',
            login: (f.assignee && f.assignee.name) || '',
            role: 'Engineer'
          },
          author: {
            name: (f.reporter && f.reporter.displayName) || 'Неизвестен',
            login: (f.reporter && f.reporter.name) || ''
          },
          customer: {
            name: custName,
            department: 'Ozon Банк'
          },
          createdAt: formatDate(f.created),
          sprint: parseSprint(f[CONFIG.sprintFieldId]),
          status: 'in_progress',
          priority: 'Высокий',
          projectTaskLinks: ptLinks,
          inProjectLinks: ipLinks
        };
      });

      if (tasks.length > 0 && !selectedTaskKey) {
        selectedTaskKey = tasks[0].key;
      }
      renderStructure();
    } catch (e) {
      console.info('[Ozon Structure] Отображаются предзагруженные задачи FCRM');
    }
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStructure() {
    let root = document.getElementById('ozon-structure-root');
    if (!isStructureVisible) {
      if (root) root.style.display = 'none';
      return;
    }
    if (!root) {
      root = document.createElement('div');
      root.id = 'ozon-structure-root';
      document.body.appendChild(root);
    }
    root.style.display = 'flex';

    const q = searchQuery.trim().toLowerCase();
    const filtered = tasks.filter((t) => {
      if (!q) return true;
      return (
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.component.toLowerCase().includes(q) ||
        t.customer.name.toLowerCase().includes(q)
      );
    });

    const groups = {};
    filtered.forEach((t) => {
      if (!groups[t.sprint]) groups[t.sprint] = [];
      groups[t.sprint].push(t);
    });

    const allComponents = Array.from(new Set(['Core-Scoring', 'KYC-Verify', 'Corp-Cards', 'CRM-DocGen', 'AntiFraud-UI', 'Tariff-Engine', 'API-Gateway', 'Sign-Crypto-UI', ...tasks.map((t) => t.component)]));
    const allSprints = Array.from(new Set(tasks.map((t) => t.sprint)));

    let rowsHtml = '';
    Object.keys(groups).forEach((sprintName) => {
      const groupItems = groups[sprintName];
      const collapsed = Boolean(collapsedSprints[sprintName]);
      rowsHtml += \`
        <tr class="ozon-ext-sprint-row" data-sprint="\${escapeHtml(sprintName)}">
          <td colspan="11">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <span>\${escapeHtml(sprintName)}</span>
                <span style="color:#94A3B8;margin:0 6px;">·</span>
                <span style="color:#005BFF;font-family:monospace;">\${groupItems.length} задач</span>
              </div>
              <span style="color:#64748B;">\${collapsed ? '▼' : '▲'}</span>
            </div>
          </td>
        </tr>
      \`;

      if (!collapsed) {
        groupItems.forEach((task) => {
          const isSelected = task.key === selectedTaskKey;
          const compOptions = allComponents
            .map((c) => \`<option value="\${escapeHtml(c)}" \${c === task.component ? 'selected' : ''}>\${escapeHtml(c)}</option>\`)
            .join('');
          const sprintOptions = allSprints
            .map((sp) => \`<option value="\${escapeHtml(sp)}" \${sp === task.sprint ? 'selected' : ''}>\${escapeHtml(sp.replace('FCRM ', ''))}</option>\`)
            .join('');

          rowsHtml += \`
            <tr class="ozon-ext-task-row \${isSelected ? 'selected' : ''}" data-key="\${escapeHtml(task.key)}">
              <td>
                <strong style="color:#005BFF;font-family:monospace;margin-right:6px;">\${escapeHtml(task.key)}</strong>
                <span>\${escapeHtml(task.summary)}</span>
              </td>
              <td>\${escapeHtml(task.status)}</td>
              <td><strong style="color:#005BFF;font-family:monospace;">\${escapeHtml(task.epicKey)}</strong> \${escapeHtml(task.epicName)}</td>
              <td>
                <select class="ozon-ext-inner-ctrl ozon-ext-inline-select" data-action="change-component" data-key="\${escapeHtml(task.key)}">
                  \${compOptions}
                </select>
              </td>
              <td>\${escapeHtml(task.assignee.name)}</td>
              <td>\${escapeHtml(task.author.name)}</td>
              <td><strong style="color:#004ED6;">\${escapeHtml(task.customer.name)}</strong> · \${escapeHtml(task.customer.department)}</td>
              <td style="font-family:monospace;">\${escapeHtml(task.createdAt)}</td>
              <td>
                <select class="ozon-ext-inner-ctrl ozon-ext-inline-select" data-action="change-sprint" data-key="\${escapeHtml(task.key)}">
                  \${sprintOptions}
                </select>
              </td>
              <td>\${task.projectTaskLinks.map((l) => l.key).join(', ') || '—'}</td>
              <td>\${task.inProjectLinks.map((l) => l.key + ' (' + (l.component || '—') + ' · ' + (l.sprint || '—').replace('FCRM ', '') + ')').join(', ') || '—'}</td>
            </tr>
          \`;
        });
      }
    });

    root.innerHTML = \`
      <div class="ozon-ext-toolbar">
        <div style="display:flex;align-items:center;gap:12px;">
          <strong style="font-size:13px;color:#071026;">Ozon Bank · FCRM Structure</strong>
          <a href="#all" id="ozon-ext-all-sprints" style="color:#005BFF;font-weight:600;text-decoration:none;">Все спринты (\${tasks.length})</a>
          <input id="ozon-ext-search" type="text" value="\${escapeHtml(searchQuery)}" placeholder="Поиск по ключу, задаче, заказчику..." style="width:260px;padding:4px 8px;border:1px solid #CBD5E1;border-radius:6px;font-size:11.5px;" />
        </div>
        <div style="font-size:11px;color:#64748B;">Задач: \${filtered.length} · Потяните границу заголовка столбца для изменения ширины</div>
      </div>
      <div class="ozon-ext-workspace">
        <div class="ozon-ext-table-pane">
          <table class="ozon-ext-table">
            <colgroup>
              <col style="width:\${colWidths.task}px" />
              <col style="width:\${colWidths.status}px" />
              <col style="width:\${colWidths.epic}px" />
              <col style="width:\${colWidths.component}px" />
              <col style="width:\${colWidths.assignee}px" />
              <col style="width:\${colWidths.author}px" />
              <col style="width:\${colWidths.customer}px" />
              <col style="width:\${colWidths.created}px" />
              <col style="width:\${colWidths.sprint}px" />
              <col style="width:\${colWidths.projectTask}px" />
              <col style="width:\${colWidths.inProject}px" />
            </colgroup>
            <thead>
              <tr>
                <th>Задача</th>
                <th>Статус</th>
                <th>Эпик</th>
                <th style="color:#005BFF;">Компонент ▾</th>
                <th>Исполнитель</th>
                <th>Автор</th>
                <th>Заказчик</th>
                <th>Создана</th>
                <th>Спринт ▾</th>
                <th>Задача проекта (fcrm_umb_epic)</th>
                <th>В проекте (Статус · Комп. · Спринт)</th>
              </tr>
            </thead>
            <tbody>
              \${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    \`;

    // Привязка обработчиков
    const searchEl = document.getElementById('ozon-ext-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderStructure();
      });
    }

    root.querySelectorAll('.ozon-ext-sprint-row').forEach((row) => {
      row.addEventListener('click', () => {
        const sp = row.getAttribute('data-sprint');
        collapsedSprints[sp] = !collapsedSprints[sp];
        renderStructure();
      });
    });

    root.querySelectorAll('select[data-action="change-component"]').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        const key = sel.getAttribute('data-key');
        const newComp = e.target.value;
        tasks = tasks.map((t) => (t.key === key ? { ...t, component: newComp } : t));
        // Отправка обновления в Jira REST API при наличии сессии
        fetch('/rest/api/2/issue/' + encodeURIComponent(key), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { components: [{ name: newComp }] } })
        }).catch(() => {});
        renderStructure();
      });
    });

    root.querySelectorAll('select[data-action="change-sprint"]').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        const key = sel.getAttribute('data-key');
        const newSp = e.target.value;
        tasks = tasks.map((t) => (t.key === key ? { ...t, sprint: newSp } : t));
        renderStructure();
      });
    });
  }

  function injectToggleButton() {
    if (document.getElementById('ozon-structure-toggle-btn')) return;
    const headerTarget =
      document.querySelector('#ghx-modes-tools') ||
      document.querySelector('#ghx-header') ||
      document.querySelector('.aui-header-primary .aui-nav') ||
      document.body;

    const btn = document.createElement('button');
    btn.id = 'ozon-structure-toggle-btn';
    btn.className = 'active';
    btn.textContent = 'Ozon Structure FCRM';
    btn.addEventListener('click', () => {
      isStructureVisible = !isStructureVisible;
      btn.classList.toggle('active', isStructureVisible);
      renderStructure();
    });

    headerTarget.appendChild(btn);
  }

  function init() {
    injectToggleButton();
    renderStructure();
    loadBoardIssuesFromJira();
    loadUmbEpicTasksFromJira();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

export function generatePopupHtml(config: ExtensionConfig): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Ozon Bank · FCRM Structure</title>
  <style>
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F5F7FA;
      color: #071026;
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #071026;
      margin-bottom: 6px;
    }
    .desc {
      font-size: 12px;
      color: #475569;
      line-height: 1.45;
      margin-bottom: 12px;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      padding: 9px 12px;
      background: #E5F0FF;
      color: #005BFF;
      font-weight: 700;
      font-size: 12px;
      text-decoration: none;
      border-radius: 10px;
      border: none;
      cursor: pointer;
    }
    .btn:hover {
      background: #D0E3FF;
    }
  </style>
</head>
<body>
  <div class="title">Ozon Bank · FCRM Structure (#${config.rapidViewId})</div>
  <div class="desc">
    Расширение активно для доски <strong>${config.projectKey}</strong> (rapidView=${config.rapidViewId}) и JQL-фильтра <code>labels = fcrm_umb_epic</code>.
  </div>
  <a class="btn" href="${config.boardUrl}" target="_blank" rel="noopener noreferrer">
    Открыть доску FCRM на jit.o3.ru
  </a>
  <script src="popup.js"></script>
</body>
</html>`;
}

export function generatePopupJs(_config: ExtensionConfig): string {
  return `// Ozon Bank FCRM Structure Popup Controller`;
}
