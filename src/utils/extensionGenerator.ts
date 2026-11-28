import { createJiraPriorityService } from '../services/jiraPriority';
import { ExtensionConfig, FcrmTask, LinkedIssueItem } from '../types/jira';
import { structuredAnswer } from './structuredAnswer';
import { answerMarkup } from './answerMarkup';
import { installWidgetTheme, themeWidgetColors, WIDGET_THEME_STYLES } from './widgetTheme';
import { createDevelopmentDashboard, createDevelopmentPointColumns, renderJiraBadge } from '../services/developmentDashboard';
import { createSprintReportModel } from '../services/sprintReportModel';
import { createSprintReportDashboard } from '../services/sprintReportDashboard';
import { createStrategicDashboard } from '../services/strategicDashboard';
import { createTaskDetailsSidebar } from '../services/taskDetailsSidebar';
import { bindJiraLabelSuggestions } from '../services/jiraLabelSuggestions';
import { createJiraGroupingUi } from '../services/jiraGroupingUi';
import { createJiraPeopleUi } from '../services/jiraPeopleUi';
import { createExtensionUpdateNotice, EXTENSION_UPDATE_INTERVAL, EXTENSION_UPDATE_MESSAGES, EXTENSION_UPDATE_ZIP_URL } from '../services/extensionUpdate';

import { createJiraDraftLinkClient } from '../services/deepseek';
import { createFcrmThreadWriter } from '../services/fcrmThreadWriter';

export const EXTENSION_VERSION = '3.5.201';

export function fcrmReviewRowClass(key:string, status:string):string {
  if (!/^FCRM-\d+$/i.test(key)) return '';
  const name = String(status || '').trim().toLowerCase().replace(/[\s/‐‑–—-]+/g, ' ');
  return ['product design review', 'user testing', 'продуктовое дизайн ревью', 'пользовательское тестирование'].includes(name)
    ? ' ozon-fcrm-review' : '';
}

export function generateManifestJson(config: ExtensionConfig): string {
  const manifest = {
    manifest_version: 3,
    name: `Ozon Bank В· Jira FCRM Structure (#${config.rapidViewId})`,
    short_name: 'Ozon Structure',
    version: EXTENSION_VERSION,
    description: `Компактный реестр Jira Structure (v3.2): свернутые по умолчанию спринты и компоненты, Input-Select поиск для Эпиков (FCRM) и Компонентов (по проекту задачи), группировка связей OB/OBFRONT/FTD, кнопка «Улучшить» у заголовка задачи через DeepSeek и MCP jit.`,
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://jit.o3.ru/*', 'https://deepseek.o3t.ru/*', 'https://chatzone.o3t.ru/*', 'https://chatzone.o3.ru/*', 'https://confluence.o3.ru/*', 'https://confluence.o3t.ru/*'],
    action: {
      default_title: 'Ozon Bank В· FCRM Structure',
      default_popup: 'popup.html',
    },
    background: {
      service_worker: 'background.js',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    content_scripts: [
      {
        matches: ['https://jit.o3.ru/secure/RapidBoard.jspa*'],
        css: ['styles.css'],
        js: ['content.js'],
        run_at: 'document_idle',
      },
      {
        matches: ['https://jit.o3.ru/*', 'https://confluence.o3.ru/*', 'https://confluence.o3t.ru/*'],
        js: ['issue-enhance.js'],
        run_at: 'document_idle',
      },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

export function generateStylesCss(config: ExtensionConfig): string {
  return themeWidgetColors(`/* ============================================================================
   Ozon Bank Design System — Jira Structure Extension for jit.o3.ru (v3.2)
   Target ONLY: https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=${config.rapidViewId}&projectKey=${config.projectKey}
   ============================================================================ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap');

:root {
  --ozon-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ozon-font-display: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --ozon-font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --ozon-label-action: #005BFF;
  --ozon-label-action-hover-veil: rgba(0, 91, 255, 0.08);
  --ozon-label-action-active-veil: rgba(0, 91, 255, 0.16);
  --ozon-layer-surface: #F2F4F8;
  --ozon-graphic-accent-primary: #E11D68;
  --ozon-graphic-secondary: #1E293B;
  --ozon-negative-bg: #FBECE9;
  --ozon-negative-text: #D9381E;
  --ozon-navy: #071026;
  --ozon-border: #E2E8F0;
}

@keyframes ozon-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes ozon-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: no-preference) {
  .ozon-ext-section-head { transition: background-color 140ms ease, color 140ms ease; }
  .ozon-ext-btn, .ozon-ext-search-select-trigger, .ozon-ext-toolbar-trigger { transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease; }
}

.ozon-ext-skeleton {
  background: linear-gradient(90deg, #EEF2F6 25%, #E2E8F0 50%, #EEF2F6 75%) !important;
  background-size: 200% 100% !important;
  animation: ozon-skeleton-shimmer 1.2s infinite linear !important;
  border-radius: 5px !important;
  display: inline-block;
}

.ozon-ext-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(0, 91, 255, 0.22);
  border-top-color: #005BFF;
  border-radius: 50%;
  animation: ozon-spin 0.65s linear infinite;
  flex-shrink: 0;
}

#ozon-structure-toggle-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 5px 12px !important;
  position: fixed !important;
  right: 16px !important;
  bottom: 16px !important;
  background-color: #E5F0FF !important;
  color: #005BFF !important;
  font-family: var(--ozon-font-sans) !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  border: none !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  transition: background-color 120ms ease !important;
  z-index: 9999 !important;
  box-shadow: 0 2px 10px #07102622 !important;
}

#ozon-structure-toggle-btn:hover {
  background-color: #D0E3FF !important;
}

#ozon-structure-toggle-btn[hidden],#ozon-structure-root[hidden],
body.ozon-native-board-visible > :is(.ozon-component-editor,#ozon-thread-sidebar,#ozon-links-snackbars) { display:none!important; }
#ozon-structure-toggle-btn:focus-visible { outline:2px solid #005BFF;outline-offset:2px; }

#ozon-structure-root {
  position: fixed !important;
  top: 40px !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 9990 !important;
  background: #F5F7FA !important;
  color: #071026 !important;
  font-family: var(--ozon-font-sans) !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

:is(#ozon-structure-root,#ozon-thread-sidebar) *,
:is(#ozon-structure-root,#ozon-thread-sidebar) *::before,
:is(#ozon-structure-root,#ozon-thread-sidebar) *::after {
  box-sizing: border-box;
  font-family: var(--ozon-font-sans);
}

#ozon-structure-root .ozon-mono {
  font-family: var(--ozon-font-mono) !important;
  font-variant-numeric: tabular-nums !important;
}

#ozon-structure-root select option {
  background-color: #FFFFFF !important;
  color: #071026 !important;
  font-weight: 500 !important;
  padding: 4px 8px !important;
}

.ozon-ext-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 12px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  flex-shrink: 0;
}

.ozon-ext-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  flex-shrink: 0;
}

.ozon-ext-filter-select {
  appearance: none !important;
  -webkit-appearance: none !important;
  background-color: #F5F7FA !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 7px center !important;
  color: #071026 !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 8px !important;
  padding: 4px 22px 4px 8px !important;
  font-size: 11.5px !important;
  font-weight: 500 !important;
  height: 26px !important;
  max-width: 195px !important;
  cursor: pointer !important;
  outline: none !important;
  text-overflow: ellipsis !important;
}

.ozon-ext-filter-select:hover {
  border-color: #CBD5E1 !important;
  background-color: #EEF2F6 !important;
}

.ozon-ext-filter-select:focus {
  border-color: #005BFF !important;
  background-color: #FFFFFF !important;
  box-shadow: 0 0 0 3px rgba(0,91,255,.10) !important;
}
.ozon-ext-toolbar-combo { position:relative; min-width:142px; max-width:245px; }
.ozon-ext-toolbar-trigger { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; height:30px; padding:5px 10px; border:1px solid #E2E8F0; border-radius:9px; background:#fff; color:#071026; box-shadow:0 1px 2px rgba(7,16,38,.04); font:500 11.5px var(--ozon-font-sans); cursor:pointer; }
.ozon-ext-toolbar-trigger:hover,.ozon-ext-toolbar-trigger[aria-expanded="true"] { border-color:#a8bbd2; background:#f8fbff; }
.ozon-ext-toolbar-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ozon-ext-toolbar-chevron,.ozon-ext-search-select-caret { position:relative; display:inline-flex; align-items:center; justify-content:center; align-self:center; width:14px; height:20px; flex:0 0 14px; color:#64748b; line-height:0; font-size:0; }
.ozon-ext-toolbar-chevron::before,.ozon-ext-search-select-caret::before { content:""; width:7px; height:7px; border-right:1.8px solid currentColor; border-bottom:1.8px solid currentColor; transform:translateY(-1px) rotate(45deg); }
.ozon-ext-toolbar-popover { z-index:10030; left:0; right:auto; top:calc(100% + 4px); min-width:100%; width:max-content; max-width:340px; padding:5px; }
.ozon-ext-toolbar-popover input { width:100%; margin-bottom:4px; }
.ozon-ext-toolbar-popover .ozon-ext-combo-item { display:block !important; width:100%; border:0; background:transparent; text-align:left; }
#ozon-structure-root .ozon-ext-toolbar-popover .ozon-dev-filter-list { scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
#ozon-structure-root .ozon-ext-toolbar-popover .ozon-dev-filter-list::-webkit-scrollbar { width:6px;height:6px; }
#ozon-structure-root .ozon-ext-toolbar-popover .ozon-dev-filter-list::-webkit-scrollbar-track { background:transparent; }
#ozon-structure-root .ozon-ext-toolbar-popover .ozon-dev-filter-list::-webkit-scrollbar-thumb { background:#A8B5C5;border-radius:8px; }
.ozon-ext-epic-filter-popover { width:440px!important;max-width:calc(100vw - 32px)!important; }
.ozon-ext-epic-filter-popover .ozon-ext-combo-item { height:auto!important;min-height:30px;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere;line-height:1.45!important; }
.ozon-ext-epic-picker-popover { width:440px!important;max-width:calc(100vw - 32px)!important; }
.ozon-ext-combo-item.ozon-ext-epic-option { display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:4px!important;height:auto!important;white-space:normal!important; }
.ozon-ext-epic-option .ozon-ext-epic-option-title { white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere;line-height:1.45;color:#071026; }
.ozon-ext-toolbar-empty { padding:8px 10px; color:#64748b; font-size:11px; }
.ozon-ext-search-select { position:relative; width:100%; min-width:0; }
.ozon-ext-search-select-trigger { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; min-width:0; height:30px; padding:5px 10px; border:1px solid #CBD5E1; border-radius:8px; background:#F8FAFC; color:#071026; font:500 11.5px var(--ozon-font-sans); text-align:left; cursor:pointer; }
.ozon-ext-search-select-trigger:hover,.ozon-ext-search-select-trigger[aria-expanded="true"] { border-color:#005BFF; background:#fff; box-shadow:0 0 0 2px rgba(0,91,255,.08); }
.ozon-ext-field-grid .ozon-ext-search-select-trigger,.ozon-ext-field-grid .ozon-ext-sb-combo-trigger { height:30px!important; min-height:30px!important; padding:5px 10px!important; border:1px solid #E2E8F0!important; border-radius:9px!important; background:#fff!important; color:#071026!important; box-shadow:0 1px 2px rgba(7,16,38,.04)!important; font:500 11.5px var(--ozon-font-sans)!important; }
.ozon-ext-field-grid .ozon-ext-search-select-trigger:hover,.ozon-ext-field-grid .ozon-ext-search-select-trigger[aria-expanded="true"],.ozon-ext-field-grid .ozon-ext-sb-combo-trigger:hover { border-color:#a8bbd2!important; background:#f8fbff!important; box-shadow:0 0 0 2px rgba(0,91,255,.08)!important; }
.ozon-ext-field-grid input[type="text"] { min-height:30px!important; border:1px solid #E2E8F0!important; border-radius:9px!important; background:#fff!important; box-shadow:0 1px 2px rgba(7,16,38,.04)!important; font:500 11.5px var(--ozon-font-sans)!important; }
.ozon-ext-search-select.workflow { width:auto; min-width:115px; flex:none; }
.ozon-ext-search-select.workflow .ozon-ext-search-select-trigger { width:auto; min-width:115px; height:26px; border-radius:999px; padding:3px 10px; background:#F8FAFC; }
.ozon-ext-search-select-value { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.ozon-ext-search-select-popover { width:100% !important; min-width:220px !important; max-width:min(380px,calc(100vw - 24px)) !important; max-height:320px !important; padding:6px !important; }
.ozon-ext-search-select-popover .ozon-ext-combo-list { max-height:260px !important; }
.ozon-ext-search-select.compact { width:100%; }
.ozon-ext-search-select.compact .ozon-ext-search-select-trigger { height:22px; padding:1px 6px; border-color:transparent; border-radius:5px; background:transparent; font-size:10.5px; }
.ozon-ext-search-select.compact .ozon-ext-search-select-trigger:hover,.ozon-ext-search-select.compact .ozon-ext-search-select-trigger[aria-expanded="true"] { border-color:rgba(0,91,255,.3); background:#fff; }
.ozon-ext-search-select.compact .ozon-ext-search-select-popover { width:280px !important; min-width:250px !important; }
.ozon-ext-search-select-option { display:flex !important; width:100%; border:0; background:transparent; text-align:left; }
.ozon-ext-search-select-empty { padding:8px 10px; color:#64748b; font-size:11px; }
.ozon-ext-load-progress { min-width:220px; flex:1; max-width:520px; }
.ozon-ext-load-progress-track { height:6px; margin-top:6px; overflow:hidden; border-radius:99px; background:#E8EEF7; }
.ozon-ext-load-progress-fill { height:100%; width:var(--load-progress,5%); border-radius:99px; background:linear-gradient(90deg,#005BFF,#60A5FA); transition:width .35s ease; }
.ozon-ext-sprint-progress-cell { padding:5px 12px 7px !important; }
.ozon-ext-cell-singleline:has(.ozon-ext-search-select) { overflow:visible !important; }
.ozon-ext-filter-bar > div:first-child { gap:7px !important; }
.ozon-ext-filter-select { min-width:132px !important; height:30px !important; padding:5px 30px 5px 10px !important; border-radius:9px !important; background-color:#fff !important; box-shadow:0 1px 2px rgba(7,16,38,.04); transition:border-color .15s,box-shadow .15s,background-color .15s; }
.ozon-ext-filter-select:hover { border-color:#a8bbd2 !important; background-color:#f8fbff !important; }
.ozon-ext-filter-bar input[type="text"] { height:30px !important; border-radius:9px !important; background:#fff !important; box-shadow:0 1px 2px rgba(7,16,38,.04); }
.ozon-ext-filter-bar .ozon-ext-btn { min-height:30px !important; border-radius:9px !important; box-shadow:0 1px 2px rgba(7,16,38,.04); }
.ozon-ext-sprint-load { padding:7px 9px 9px; color:#64748b; font-size:10px; }
.ozon-ext-sprint-load-track { height:4px; margin-top:5px; overflow:hidden; border-radius:9px; background:#e8eef7; }
.ozon-ext-sprint-load-fill { height:100%; width:var(--sprint-load,12%); border-radius:9px; background:linear-gradient(90deg,#005bff,#60a5fa); transition:width .25s ease; }

#ozon-structure-root input[type="text"],
#ozon-structure-root input[type="search"],
#ozon-structure-root textarea {
  background-color: #F5F7FA !important;
  color: #071026 !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 8px !important;
  padding: 4px 10px !important;
  font-size: 11.5px !important;
  font-family: var(--ozon-font-sans) !important;
  line-height: 1.4 !important;
  box-shadow: none !important;
  outline: none !important;
}

#ozon-structure-root input[type="text"]::placeholder,
#ozon-structure-root textarea::placeholder {
  color: #64748B !important;
}

#ozon-structure-root input[type="text"]:focus,
#ozon-structure-root input[type="search"]:focus,
#ozon-structure-root textarea:focus {
  background-color: #FFFFFF !important;
  border-color: #005BFF !important;
  box-shadow: 0 0 0 2px rgba(0, 91, 255, 0.16) !important;
  outline: none !important;
  outline-offset: 0 !important;
}

.ozon-ext-workspace {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  max-height: 100% !important;
  display: flex !important;
  overflow: hidden !important;
  background: #FFFFFF !important;
  position: relative !important;
}

.ozon-ext-table-pane {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  height: 100% !important;
  max-height: 100% !important;
  overflow: auto !important;
  overflow-anchor: none !important;
  background: #FFFFFF !important;
}

#ozon-ext-table-pane {
  scrollbar-width: auto !important;
  scrollbar-color: auto !important;
}
#ozon-ext-table-pane::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
#ozon-ext-table-pane::-webkit-scrollbar-track,
#ozon-ext-table-pane::-webkit-scrollbar-corner {
  background: transparent;
}
#ozon-ext-table-pane::-webkit-scrollbar-thumb {
  background: rgba(7, 16, 38, 0.14);
  border-radius: 3px;
}
#ozon-ext-table-pane::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 91, 255, 0.45);
}

.ozon-ext-table {
  table-layout: fixed !important;
  border-collapse: collapse !important;
  font-size: 11.5px !important;
  user-select: none;
  margin: 0 !important;
}

.ozon-ext-table th {
  position: sticky !important;
  top: 0 !important;
  z-index: 20 !important;
  background: #F1F5F9 !important;
  color: #334155 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-align: left !important;
  padding: 6px 10px 6px 8px !important;
  height: 29px !important;
  border-bottom: 1px solid #CBD5E1 !important;
  border-right: 1px solid #E2E8F0 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

#ozon-ext-main-table {border-collapse:separate!important;border-spacing:0}
#ozon-ext-main-table th[data-col="task"] {left:0;z-index:24!important;box-shadow:3px 0 6px #07102610}
#ozon-ext-main-table .ozon-ext-task-cell {position:sticky;left:0;z-index:2;background:#fff;box-shadow:3px 0 6px #07102610}
#ozon-ext-main-table .ozon-ext-subrow .ozon-ext-task-cell {background:#fafbfd}
#ozon-ext-main-table tr.ozon-tree-depth-1 .ozon-ext-task-cell {background:#edf4ff}
#ozon-ext-main-table tr:hover .ozon-ext-task-cell {background:#f2f4f8}
#ozon-ext-main-table tr.selected .ozon-ext-task-cell {background:#ebf3ff}
.ozon-ext-col-resizer {
  position: absolute !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 6px !important;
  cursor: col-resize !important;
  z-index: 35 !important;
  background: transparent;
  transition: background-color 100ms ease;
}

.ozon-ext-col-resizer:hover,
.ozon-ext-col-resizer.active {
  background: #005BFF !important;
}

.ozon-ext-sprint-row {
  background: #F8FAFC !important;
  border-bottom: 1px solid #E2E8F0 !important;
  height: 30px !important;
  cursor: pointer !important;
  transition: background-color 110ms ease;
}

.ozon-ext-sprint-row:hover {
  background: #F1F5F9 !important;
}

.ozon-ext-sprint-row td {
  padding: 4px 12px 4px 10px !important;
  height: 30px !important;
  font-size: 12px !important;
  vertical-align: middle !important;
}

.ozon-ext-comp-group-row {
  background: #FAFBFD !important;
  border-bottom: 1px solid #E2E8F0 !important;
  height: 26px !important;
  cursor: pointer !important;
  transition: background-color 110ms ease;
}

.ozon-ext-comp-group-row:hover {
  background: #F1F5F9 !important;
}

.ozon-ext-comp-group-row td {
  padding: 2px 12px 2px 28px !important;
  border-left: 3px solid #CBD5E1 !important;
  height: 26px !important;
  font-size: 11px !important;
  color: #334155 !important;
  vertical-align: middle !important;
}

/* СТРОГО ЕДИНАЯ ВЫСОТА ВСЕХ СТРОК ЗАДАЧ (28px) */
.ozon-ext-task-row {
  height: 28px !important;
  max-height: 28px !important;
  min-height: 28px !important;
  border-bottom: 1px solid #E2E8F0 !important;
  cursor: pointer !important;
  background: #FFFFFF !important;
  transition: background-color 100ms ease;
}
.ozon-ext-task-row.completed > td,.ozon-ext-subrow.completed > td { background-color:#EFFBF3!important; }
.ozon-ext-task-row.completed:hover > td,.ozon-ext-subrow.completed:hover > td { background-color:#E0F5E8!important; }
.ozon-ext-status-summary { display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap; }
.ozon-ext-status-count { color:#64748B;font-size:10px;font-weight:400;white-space:nowrap; }
.ozon-ext-status-count + .ozon-ext-status-count::before { content:'·';margin-right:8px;color:#CBD5E1; }
.ozon-ext-view-tabs { display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid #E2E8F0;background:#fff;flex-shrink:0; }

#ozon-thread-sidebar {position:fixed;right:0;top:40px;bottom:0;width:min(var(--thread-width,clamp(720px,76vw,1040px)),100vw);box-sizing:border-box;z-index:100050;height:auto!important;font:12px/1.35 var(--ozon-font-sans);color:var(--ozon-navy);-webkit-font-smoothing:antialiased;}
#ozon-thread-sidebar[hidden],#ozon-thread-sidebar [hidden] {display:none!important;}

#ozon-thread-sidebar {--thread-gap:10px;scrollbar-color:#b8c4d0 transparent;scrollbar-width:thin;animation:ozon-thread-enter 160ms ease-out;}
@keyframes ozon-thread-enter {from {transform:translateX(10px);opacity:.86} to {transform:translateX(0);opacity:1}}
#ozon-thread-sidebar [data-thread-width] {position:fixed;top:50%;left:max(0px,calc(100vw - var(--thread-width,clamp(720px,76vw,1040px))));width:10px;height:56px;z-index:2;border:1px solid #d7e0ec;border-left:0;border-radius:0 6px 6px 0;background:#f2f5fa;color:#627b9a;cursor:ew-resize;touch-action:none;transform:translateY(-50%);display:grid;place-items:center;font-size:12px;user-select:none;}
#ozon-thread-sidebar [data-thread-width]:focus-visible {outline:2px solid #005bff;outline-offset:2px;}
#ozon-thread-sidebar [data-thread-step-body], .ozon-ext-disclosure-content, #ozon-thread-sidebar details[open] > :not(summary) {animation:ozon-thread-body 150ms ease-out;}
@keyframes ozon-thread-body {from {opacity:.72} to {opacity:1}}
@media (prefers-reduced-motion:reduce) {#ozon-thread-sidebar,#ozon-thread-sidebar [data-thread-step-body],.ozon-ext-disclosure-content,#ozon-thread-sidebar details[open] > :not(summary) {animation:none;}}
@media (max-width:760px) {#ozon-thread-sidebar {width:100vw;}#ozon-thread-sidebar [data-thread-width] {display:none;}}
#ozon-thread-sidebar .ozon-thread-head h2 {font-size:13.5px;font-weight:700;}
#ozon-thread-sidebar [data-thread-status] {margin:0 0 16px;padding:10px 12px;border:1px solid #d7e0ec;border-left:3px solid #94a3b8;border-radius:8px;background:#f5f8fd;color:#334155;}
#ozon-thread-sidebar [data-thread-status][data-tone="progress"] {border-left-color:#005bff;background:#edf4ff;color:#173b7a;}
#ozon-thread-sidebar [data-thread-status][data-tone="error"] {border-color:#fac9c6;border-left-color:#bd302b;background:#fff3f2;color:#89221e;}
#ozon-thread-sidebar [data-thread-status][data-tone="success"] {border-color:#a4cfb3;border-left-color:#277747;background:var(--ozon-fcrm-success-surface,#edf8ef);color:var(--ozon-fcrm-success-text,#1c5d39);}
#ozon-thread-sidebar [data-thread-status][data-tone="success"]::before {content:"✓ ";}
#ozon-thread-sidebar [data-thread-status][data-tone="warning"]::before {content:"⚠ ";}
#ozon-thread-sidebar [data-thread-status][data-tone="error"]::before {content:"! ";font-weight:700;}
#ozon-thread-sidebar [data-thread-status][data-tone="warning"] {border-color:#f2d9a7;border-left-color:#a35e09;background:#fff8e8;color:#76440a;}
#ozon-thread-sidebar [name="draftDescription"] {min-height:156px;field-sizing:content;}
#ozon-thread-sidebar :is(input,textarea,select):disabled {background:var(--ozon-layer-surface)!important;color:#64748b!important;opacity:1;cursor:wait;}
#ozon-thread-sidebar [data-thread-context-sources] {margin:0 0 12px;color:#475569;}
#ozon-thread-sidebar details.ozon-ext-section-card {padding:0;}
#ozon-thread-sidebar details.ozon-ext-section-card > summary {cursor:pointer;font-weight:700;display:list-item;padding:10px 12px;}
#ozon-thread-sidebar details.ozon-ext-section-card > :not(summary) {margin:0;padding:10px 12px 10px 28px;}
.ozon-ext-disclosure-trigger[aria-expanded="false"] > span:first-child, button[aria-expanded="false"] .ozon-ext-disclosure-trigger > span:first-child {rotate:-90deg;}
.ozon-ext-disclosure-trigger > span:first-child {display:inline-block;transition:rotate 150ms ease;}
@media (prefers-reduced-motion:reduce) {.ozon-ext-disclosure-trigger > span:first-child {transition:none;}}
#ozon-thread-sidebar [data-thread-context-sources] a {color:#005bff;}
#ozon-thread-sidebar [data-thread-theme-reason] {margin:0 0 8px;color:#475569;}
#ozon-thread-sidebar [data-thread-related] {min-width:0;margin:0;padding:0;}
#ozon-thread-sidebar [data-thread-linked-sources] ul {list-style:none;margin:4px 0 0;padding:0;display:grid;gap:4px;}
#ozon-thread-sidebar .ozon-ext-section-head {cursor:default;}
#ozon-thread-sidebar .ozon-ext-section-head:hover {background:#f8fafc;}
#ozon-thread-sidebar .ozon-thread-section-body {padding:10px 12px;}
#ozon-thread-sidebar [data-thread-preflight] {gap:0;}
#ozon-thread-sidebar [data-thread-preflight-message] {margin:0;}
#ozon-thread-sidebar [data-thread-preflight-matches] {padding-left:16px;margin:8px 0 12px;}
#ozon-thread-sidebar [data-thread-preflight-matches] small {display:block;margin:2px 0 6px;}
#ozon-thread-sidebar [data-thread-related] .ozon-thread-section-body {container-type:inline-size;}
#ozon-thread-sidebar .ozon-thread-proposal {display:grid;grid-template-columns:auto minmax(0,1fr) minmax(184px,auto);align-items:start;gap:8px;margin:0;padding:10px 0;border-bottom:1px solid #e2e8f0;}
#ozon-thread-sidebar .ozon-thread-proposal-actions {display:grid;grid-template-columns:minmax(0,176px) auto;gap:8px;align-items:center;justify-content:end;min-width:0;}
#ozon-thread-sidebar .ozon-thread-proposal-actions button {height:30px;}
#ozon-thread-sidebar .ozon-thread-link-note {display:block;margin:2px 0 0;}
#ozon-thread-sidebar [data-thread-link-status]:empty {display:none;}
#ozon-thread-sidebar [data-thread-link-status]:not(:empty) {display:block;margin-top:4px;}
#ozon-thread-sidebar .ozon-thread-proposal > span {min-width:0;overflow-wrap:anywhere;}
#ozon-thread-sidebar .ozon-thread-proposal > span a {white-space:nowrap;}
#ozon-thread-sidebar .ozon-thread-link-add {display:flex;gap:8px;align-items:center;margin-top:8px;}
#ozon-thread-sidebar .ozon-thread-link-add button {flex-shrink:0;}
#ozon-thread-sidebar [data-thread-early-duplicates] {gap:6px;}
#ozon-thread-sidebar [data-thread-early-duplicates] ul {margin:0;padding:0;list-style:none;}
#ozon-thread-sidebar [data-thread-early-duplicates] li {padding:10px 12px;border:1px solid #d7e0ec;border-radius:8px;margin-bottom:6px;}
#ozon-thread-sidebar [data-thread-early-duplicates] small {display:block;}
#ozon-thread-sidebar [data-thread-early-duplicates] p {margin:0;}
@container (max-width:520px) {#ozon-thread-sidebar .ozon-thread-proposal {grid-template-columns:auto minmax(0,1fr);}#ozon-thread-sidebar .ozon-thread-proposal-actions {grid-column:2;grid-template-columns:minmax(0,1fr) auto;justify-content:stretch;}}
#ozon-thread-sidebar .ozon-thread-proposal .ozon-thread-link-check {appearance:none;display:inline-grid;place-content:center;width:16px;height:16px;margin:4px 0 0;border:1px solid var(--ozon-fcrm-muted-border,#a8b5c5);border-radius:4px;background:var(--ozon-fcrm-input,#fff);cursor:pointer;}
#ozon-thread-sidebar .ozon-thread-link-check:checked {border-color:#005bff;background:#005bff;}
#ozon-thread-sidebar .ozon-thread-link-check:checked::after {content:"";width:7px;height:4px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;color:var(--ozon-fcrm-text,#fff);transform:rotate(-45deg) translate(1px,-1px);}
#ozon-thread-sidebar .ozon-thread-link-check:disabled {opacity:.6;cursor:default;}
#ozon-thread-sidebar .ozon-thread-proposal-actions .ozon-ext-search-select {min-width:0;}
#ozon-thread-sidebar .ozon-thread-proposal-actions .ozon-ext-search-select-trigger {width:100%;}
#ozon-thread-sidebar .ozon-thread-proposal-actions .ozon-ext-search-select-popover {left:auto!important;right:0;width:min(300px,calc(100vw - 120px))!important;min-width:0!important;}
#ozon-thread-sidebar .ozon-thread-proposal small {display:block;}
#ozon-thread-sidebar [data-thread-result] {padding:16px;border:1px solid #d7e0ec;border-radius:10px;background:#f8fafc;}
#ozon-thread-sidebar [data-thread-result] h3 {margin:0;font-size:12px;}
#ozon-thread-sidebar [data-thread-result-title] {margin:0;font-size:12px;font-weight:700;}
#ozon-thread-sidebar [data-thread-key] {width:fit-content;padding:6px 10px;border:1px solid #a8c8fb;border-radius:8px;background:#e6f0ff;font-weight:650;text-decoration:none;}
#ozon-thread-sidebar [data-thread-link-outcomes] h4 {margin:6px 0;}
#ozon-thread-sidebar [data-thread-link-outcomes] ul {padding-left:20px;margin:6px 0;}
#ozon-thread-sidebar [data-thread-link-outcomes] li {margin:4px 0;}
#ozon-thread-sidebar [data-thread-link-outcomes] a,#ozon-thread-sidebar [data-thread-linked-sources] a {color:#005bff;overflow-wrap:anywhere;}
#ozon-thread-sidebar [data-thread-link-outcomes] [data-confirmed="true"] {color:#1b5b3a;}
#ozon-thread-sidebar [data-thread-link-outcomes] [data-confirmed="false"] {color:#89221e;}
#ozon-thread-sidebar .ozon-thread-steps {list-style:none;margin:0;padding:0;}
#ozon-thread-sidebar [data-thread-step] {position:relative;padding:0 0 16px 38px;}
#ozon-thread-sidebar [data-thread-step]:not(:last-child)::before {content:"";position:absolute;inset:28px auto 0 13px;width:2px;background:#d7e0ec;}
#ozon-thread-sidebar .ozon-thread-step-marker {position:absolute;left:0;top:0;width:28px;height:28px;display:grid;place-items:center;border:1px solid #a8bbd2;border-radius:50%;color:#475569;background:#fff;font-weight:700;}
#ozon-thread-sidebar [data-step-state="active"] .ozon-thread-step-marker {border-color:#005bff;background:#005bff;color:#fff;}
#ozon-thread-sidebar [data-step-state="complete"] .ozon-thread-step-marker {border-color:#005bff;background:#e5f0ff;color:#005bff;}
#ozon-thread-sidebar [data-step-state="complete"]::before {background:#91b7fb;}
#ozon-thread-sidebar .ozon-thread-step-heading {display:flex;min-height:28px;align-items:center;}
#ozon-thread-sidebar .ozon-thread-step-heading h3 {margin:0;font:700 13px/1.35 var(--ozon-font-sans);color:var(--ozon-fcrm-text,#14233a)!important;}
#ozon-thread-sidebar [data-step-state="future"] .ozon-thread-step-heading h3 {color:var(--ozon-fcrm-muted,#516078)!important;}
#ozon-thread-sidebar [data-thread-step-summary] {margin:3px 0 0;color:#475569;}
#ozon-thread-sidebar [data-thread-step-body] {padding-top:10px;}
#ozon-thread-sidebar [data-thread-final-fields] {margin:0 0 12px;display:grid;grid-template-columns:max-content minmax(0,1fr);gap:6px 12px;}
#ozon-thread-sidebar [data-thread-final-fields] dt {font-weight:600;}
#ozon-thread-sidebar [data-thread-final-fields] dd {margin:0;overflow-wrap:anywhere;}
#ozon-thread-sidebar .ozon-thread-final-description {overflow-wrap:anywhere;padding:12px;border:1px solid #d7e0ec;border-radius:8px;background:#f6f8fb;}
#ozon-thread-sidebar [data-thread-duplicate-links] {margin:8px 0 12px;padding-left:20px;overflow-wrap:anywhere;}
#ozon-thread-sidebar [data-thread-duplicate-links] li {margin-bottom:6px;}
#ozon-thread-sidebar [data-thread-duplicate-links] a {color:#005bff;text-decoration:underline;}
#ozon-thread-sidebar [data-thread-create-actions] {margin:var(--thread-gap) 0;}
#ozon-thread-sidebar .ozon-thread-editor {border:1px solid var(--ozon-border);border-radius:10px;}
#ozon-thread-sidebar .ozon-thread-editor-nav {display:flex;gap:4px;padding:6px 8px;background:#f8fafc;border-bottom:1px solid var(--ozon-border);border-radius:10px 10px 0 0;}
#ozon-thread-sidebar .ozon-thread-editor-nav button[aria-pressed=true] {color:#005bff;background:#e6effd;}
#ozon-thread-sidebar [data-thread-description-preview] {padding:12px;min-height:156px;overflow-wrap:anywhere;}
#ozon-thread-sidebar :is([data-thread-description-preview],.ozon-thread-final-description) :is(h3,h4) {margin:0 0 6px;font-size:12px;}
#ozon-thread-sidebar :is([data-thread-description-preview],.ozon-thread-final-description) :is(p,ul,ol) {margin:0 0 10px;}
#ozon-thread-sidebar :is([data-thread-description-preview],.ozon-thread-final-description) :last-child {margin-bottom:0;}
#ozon-thread-sidebar :is(h2,h3,h4) {margin:0;font-size:12px;line-height:inherit;font-weight:700;}
#ozon-thread-sidebar .ozon-thread-head {flex-shrink:0;background:var(--ozon-fcrm-raised,#f8fafc)!important;}
#ozon-thread-sidebar .ozon-thread-head h2 {color:var(--ozon-fcrm-text,#14233a)!important;}
#ozon-thread-sidebar .ozon-thread-head [data-thread-close] {color:var(--ozon-fcrm-link,#004bbb)!important;}
#ozon-thread-sidebar .ozon-thread-head [data-thread-close]:focus-visible {outline:2px solid var(--ozon-fcrm-focus,#005bff);outline-offset:2px;}
#ozon-thread-sidebar:has(> .ozon-thread-footer:not([hidden])) > .ozon-ext-sidebar-body {flex:1 1 0;min-height:0;overflow:auto;}
#ozon-thread-sidebar .ozon-thread-footer {flex:none;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid var(--ozon-border);background:var(--ozon-fcrm-raised,#f8fafc);}
body:has(> #ozon-thread-sidebar:not([hidden]) > .ozon-thread-footer:not([hidden])) > #ozon-links-snackbars {bottom:80px!important;max-height:calc(100vh - 104px)!important;}
#ozon-thread-sidebar [data-thread-early-duplicates] {margin-top:var(--thread-gap);}
#ozon-thread-sidebar :is(.ozon-thread-link-add,[data-thread-link-add]) {width:100%;}
#ozon-thread-sidebar .ozon-thread-link-add {display:grid;gap:8px;}
#ozon-thread-sidebar p {margin:10px 0;overflow-wrap:anywhere;}
#ozon-thread-sidebar :is(form,section) {display:flex;flex-direction:column;gap:var(--thread-gap);}
#ozon-thread-sidebar label {display:grid;gap:4px;}
#ozon-thread-sidebar .ozon-ext-field-label {padding-top:0;}
#ozon-thread-sidebar small {color:#64748b;font-size:11.5px;}
#ozon-thread-sidebar :is(input:not([type="checkbox"]),textarea) {display:block;width:100%;min-height:30px;font:500 11.5px/1.35 var(--ozon-font-sans);color:var(--ozon-navy);}
#ozon-thread-sidebar .ozon-ext-search-select-trigger {height:auto;min-height:30px;}
#ozon-thread-sidebar [data-thread-link-add] {height:30px;}
#ozon-thread-sidebar :is(a,summary) {overflow-wrap:anywhere;}
#ozon-thread-sidebar textarea {resize:vertical;}
#ozon-thread-sidebar [name="draftSummary"] {field-sizing:content;min-height:calc(2em + 14px);overflow-wrap:anywhere;}
#ozon-thread-sidebar [data-thread-theme-current] {margin:4px 0 8px;}
#ozon-thread-sidebar [data-thread-theme-menu] {margin-top:8px;border:1px solid #d7e0ec;border-radius:8px;padding:8px;}
#ozon-thread-sidebar [data-thread-theme-results] {display:grid;gap:4px;max-height:300px;overflow:auto;scrollbar-width:thin;scrollbar-color:#b8c7da transparent;}
#ozon-thread-sidebar [data-thread-theme-results] summary,#ozon-thread-sidebar .ozon-thread-theme-group {padding:6px 8px;color:#304662;cursor:pointer;}
#ozon-thread-sidebar .ozon-thread-theme-children {margin-inline-start:10px;padding-inline-start:8px;border-inline-start:1px solid #d7e0ec;}
#ozon-thread-sidebar [data-thread-theme-option] {width:100%;min-height:32px;padding:6px 8px;border:1px solid transparent;border-radius:6px;background:#f5f7fa;text-align:start;color:#071026;font:inherit;overflow-wrap:anywhere;cursor:pointer;}
#ozon-thread-sidebar [data-thread-theme-option]:hover,#ozon-thread-sidebar [data-thread-theme-option][aria-pressed="true"] {background:#e5f0ff;border-color:#a8c8fb;}
#ozon-thread-sidebar [data-thread-followup] {margin:12px 0;}
#ozon-thread-sidebar [data-thread-question] {padding:12px;border:1px solid #d7e0ec;border-radius:8px;background:#f5f8fd;}
#ozon-thread-sidebar [data-thread-question] h3 {margin:0;}
#ozon-thread-sidebar [data-thread-question] [data-thread-question-text] {margin:6px 0;font-weight:600;}
#ozon-thread-sidebar [data-thread-question-reason] {margin:4px 0;color:#475569;}
#ozon-thread-sidebar [data-thread-question-policy] {display:block;margin-top:6px;}
#ozon-thread-sidebar .ozon-thread-actions {display:flex;flex-wrap:wrap;gap:6px;}
#ozon-thread-sidebar :is(a,summary,select):focus-visible {outline:2px solid #ff007a;outline-offset:2px;}
#ozon-prompt-catalog :is(button,summary):focus-visible {outline:2px solid #005bff;outline-offset:2px;}
#ozon-thread-sidebar [data-thread-key] {color:#005bff;text-decoration:underline;}
#ozon-prompt-catalog {overflow:auto;min-height:0;padding:16px;background:#f8fafc;color:#071026;}
#ozon-prompt-catalog h2 {margin:0 0 8px;font-size:16px;}
#ozon-prompt-catalog h3 {margin:12px 0 4px;font-size:12px;}
#ozon-prompt-catalog details {max-width:85ch;margin-bottom:8px;border:1px solid #d7e0ec;border-radius:8px;padding:8px 12px;background:white;}
#ozon-prompt-catalog summary {font-weight:600;cursor:pointer;}
#ozon-prompt-catalog pre {margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.55;}

.ozon-ext-view-tabs > nav {display:flex;gap:6px;align-items:center;min-width:0;overflow-x:auto;}
.ozon-ext-view-tabs [role="tab"] { border:1px solid transparent;border-radius:8px;padding:6px 12px;background:transparent;color:#64748B;font:600 12px var(--ozon-font-sans);cursor:pointer;white-space:nowrap; }
.ozon-ext-view-tabs [aria-selected="true"] { color:#005BFF;background:#E5F0FF; }
.ozon-ext-board-switch {flex:none;white-space:nowrap;}
#ozon-structure-root.ozon-dashboard-fullscreen {top:0!important}
#ozon-structure-root.ozon-dashboard-fullscreen .ozon-report-inner {max-width:none}
#ozon-structure-root .ozon-ext-fullscreen-toggle {display:inline-flex;align-items:center;gap:6px;flex:none;margin-inline-start:auto;min-height:30px;white-space:nowrap}
#ozon-structure-root.ozon-dashboard-fullscreen .ozon-ext-fullscreen-toggle {color:#005bff;background:#e5f0ff}
#ozon-structure-root .ozon-ext-fullscreen-toggle:focus-visible {outline:2px solid #005bff;outline-offset:2px}
@media (max-width:640px) {
  #ozon-structure-root .ozon-ext-fullscreen-toggle {justify-content:center;width:32px;padding-inline:0}
  .ozon-ext-fullscreen-toggle>span {display:none}
}
#ozon-structure-root .ozon-extension-update { display:block;flex-shrink:0;background:#edf4ff;color:#071026;border-bottom:1px solid #d7e5f8;font-size:12px; }
#ozon-structure-root .ozon-extension-update > summary { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 16px;padding:7px 12px;min-height:32px;list-style:none;cursor:pointer; }
.ozon-extension-update > summary::-webkit-details-marker { display:none; }
.ozon-extension-update > summary:hover { background:#e5f0ff; }
.ozon-extension-update > summary:focus-visible { outline:2px solid #005bff;outline-offset:-2px; }
.ozon-extension-update-versions,.ozon-extension-update-actions { display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px; }
.ozon-extension-update-versions > span,.ozon-extension-update-content > p { color:#526780; }
.ozon-extension-update-guide { display:flex;align-items:center;gap:8px;color:#005bff;font-weight:600; }
.ozon-extension-update[open] .ozon-extension-update-guide .ozon-ext-toolbar-chevron { transform:rotate(180deg); }
.ozon-extension-update-content { display:grid;gap:8px;padding:0 12px 12px;line-height:1.5; }
.ozon-extension-update-content > ol { margin:2px 0 0;padding-inline-start:20px; }
.ozon-extension-update-content > p { margin:0; }
.ozon-extension-update-actions > a { color:#005bff;font-weight:600; }
.ozon-product-filter-hint {font-size:11px;color:#64748b;} .ozon-strategy-dashboard { display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;background:#fff;color:#071026;font:400 11.5px var(--ozon-font-sans); }
.ozon-strategy-actions { display:flex;align-items:center;gap:10px; }
.ozon-strategy-description { padding:8px 12px;color:#64748b;border-bottom:1px solid #e2e8f0; }
.ozon-strategy-scroll { flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
.ozon-strategy-table { width:100%;min-width:0;table-layout:fixed;border-collapse:collapse;font:inherit; }
.ozon-strategy-table th,.ozon-strategy-table td { height:28px;padding:0 6px;text-align:left;border-bottom:1px solid #e2e8f0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.ozon-strategy-table th { position:sticky;top:0;z-index:2;background:#eef3f8;color:#475569;font-weight:600; }

.ozon-strategy-table th .ozon-dev-col-resizer {position:absolute;right:0;top:0;bottom:0;width:8px;cursor:col-resize;z-index:3}.ozon-strategy-filters {flex-wrap:wrap}.ozon-strategy-table tbody tr:hover td { background:#f5f9ff; }.ozon-strategy-table .ozon-strategy-group td { background:#f1f5f9;font-weight:700; }
.ozon-strategy-table a { color:#005bff;text-decoration:none; }.ozon-strategy-type,.ozon-strategy-key { display:flex;align-items:center;gap:5px;min-width:0; }.ozon-strategy-type span { overflow:hidden;text-overflow:ellipsis; }
.ozon-strategy-table tbody tr.ozon-strategy-depth-1 td {background:#edf4ff;}
#ozon-ext-tbody tr.ozon-tree-depth-1:not(.completed) > td,.ozon-dev-table tbody tr.ozon-tree-depth-1:not(.ozon-dev-completed):not(.ozon-dev-no-epic) > td {background-color:#edf4ff;}
#ozon-ext-tbody tr.ozon-tree-depth-1:not(.completed):hover > td,.ozon-dev-table tbody tr.ozon-tree-depth-1:not(.ozon-dev-completed):not(.ozon-dev-no-epic):hover > td {background-color:#e4efff;}
.ozon-strategy-indent {display:inline-block;box-sizing:border-box;color:#7692b7;text-align:right;padding-right:4px;vertical-align:middle;overflow:hidden;white-space:nowrap;}
.ozon-strategy-epic-relation {display:inline-flex;align-items:center;border-radius:4px;padding:1px 4px;background:#edf2ff;color:#526ab2;font-size:10px;line-height:16px;}
.ozon-strategy-copy-key,.ozon-strategy-link-button {display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;min-width:19px;padding:0;border:0;border-radius:5px;background:transparent;color:#71849d;cursor:pointer;font-size:13px;line-height:1;}
.ozon-strategy-copy-key:hover,.ozon-strategy-link-button:hover {background:#e4efff;color:#005bff;}
.ozon-strategy-unlink {float:right;border:0;border-radius:5px;background:#fff0ee;color:#d92d20;cursor:pointer;padding:3px 7px;line-height:1.3;}
.ozon-strategy-unlink:hover {background:#ffded9;}
.ozon-strategy-sprint-edit {cursor:pointer;padding:4px 2px;border-radius:5px}.ozon-strategy-sprint-edit:hover {background:#eaf3ff}.ozon-strategy-sprint-edit:focus-visible {outline:2px solid #005bff;outline-offset:-2px}.ozon-strategy-sprint-locked {color:#94a3b8}
.ozon-strategy-toggle,.ozon-strategy-toggle-spacer { display:inline-flex;align-items:center;justify-content:center;flex:0 0 18px;width:18px;height:20px;border:0;background:transparent;color:#005bff;cursor:pointer; }
.ozon-strategy-component-group td {padding:0 8px}
.ozon-strategy-component-group .ozon-strategy-toggle {margin-right:4px}
.ozon-strategy-component-group .ozon-ext-group-total {margin-left:4px}
.ozon-strategy-descendant-count {flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:18px;padding:1px 5px;border-radius:9px;background:#e8f0fc;color:#526b8c;font-size:10px;line-height:16px;font-weight:600;}
.ozon-strategy-warning { color:#b45309;font-size:10px;margin-left:6px; }
.ozon-strategy-type img {width:14px;height:14px;object-fit:contain;flex:none}.ozon-strategy-type .ozon-ext-type-pill {min-width:0}.ozon-strategy-sprint {display:flex;align-items:center;gap:4px;min-width:0}.ozon-strategy-sprint > span:first-child {overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ozon-strategy-sprint .ozon-ext-badge {margin-left:auto;flex:none}.ozon-strategy-linked-themes {flex:none;padding:12px 0;color:#071026}.ozon-strategy-linked-themes strong {font-size:12px}.ozon-strategy-linked-themes p {margin:8px 0;color:#71839b}.ozon-strategy-linked-list {max-height:180px;overflow:auto;margin-top:8px}.ozon-strategy-linked-item {padding:7px 8px;border-bottom:1px solid #e3eaf2}.ozon-strategy-linked-title {margin-top:4px;line-height:1.4;overflow-wrap:anywhere}.ozon-strategy-component-edit {display:flex;align-items:center;gap:6px;width:100%;min-width:0;border:0;background:transparent;color:#071026;font:inherit;text-align:left;cursor:pointer;padding:4px 2px}.ozon-strategy-component-edit span:first-child {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.ozon-strategy-component-edit span:last-child {color:#90a2b8}.ozon-strategy-component-edit:hover {background:#eaf3ff;border-radius:5px}.ozon-strategy-component-edit:focus-visible {outline:2px solid #005bff;outline-offset:-2px;border-radius:5px}.ozon-strategy-epic-value {min-width:0;overflow:hidden;flex:1}.ozon-strategy-editor-options {overflow:auto;min-height:0}.ozon-strategy-editor-options button {display:flex;gap:8px;align-items:center;width:100%;text-align:left}.ozon-strategy-notice {display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 12px;padding:7px 10px;border:1px solid #dbe4ef;border-radius:8px;color:#334155;background:#f7faff}.ozon-strategy-message { padding:20px;color:#64748b; }

.ozon-strategy-filters { display:flex;gap:8px;padding:8px 12px; }.ozon-strategy-filters input[type="search"],#ozon-strategy-label-input { border:1px solid #d5e1ef;border-radius:8px;background:white;color:#071026;padding:7px 10px;font:inherit;min-width:180px; }
.ozon-strategy-label-popover {width:min(340px,calc(100vw - 24px))!important;min-width:0;box-sizing:border-box}
.ozon-strategy-filters .ozon-strategy-label-popover input[type="search"] {box-sizing:border-box;min-width:0}
.ozon-strategy-label-popover .ozon-dev-filter-list {overflow-x:hidden}
.ozon-strategy-label-option {display:flex;align-items:center;gap:8px;min-height:30px;padding:5px 8px;border-radius:6px;box-sizing:border-box;cursor:pointer}
.ozon-strategy-label-option>span {min-width:0;overflow-wrap:anywhere}
.ozon-strategy-label-option:hover,.ozon-strategy-label-option:has(input:checked) {background:#eaf3ff}
.ozon-strategy-component-popover .ozon-strategy-label-option[hidden] {display:none}
.ozon-strategy-labels { display:flex;align-items:center;gap:4px;overflow:auto;scrollbar-width:thin; }.ozon-strategy-label { display:inline-flex;align-items:center;gap:3px;padding:2px 5px;border-radius:5px;background:#eff4f9;color:#475569; }.ozon-strategy-label button { border:0;background:transparent;color:#64748b;cursor:pointer; }.ozon-strategy-table tr[data-strategy-expandable="true"] { cursor:pointer; }
.ozon-strategy-table {border-collapse:separate;border-spacing:0}.ozon-strategy-table .ozon-strategy-task-header {position:sticky;left:0;z-index:5}.ozon-strategy-table .ozon-strategy-task-cell {position:sticky;left:0;z-index:1;background:#fff;overflow:visible;box-shadow:3px 0 6px #0710260d}.ozon-strategy-table tbody tr.ozon-strategy-depth-1 .ozon-strategy-task-cell {background:#edf4ff}.ozon-strategy-table tbody tr:hover .ozon-strategy-task-cell {background:#f5f9ff}.ozon-strategy-task-line {display:flex;align-items:center;gap:6px;min-width:0}.ozon-strategy-task-line .ozon-strategy-type,.ozon-strategy-task-line .ozon-strategy-key {flex:none}.ozon-strategy-task-summary {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ozon-strategy-context td {color:#8190a3}.ozon-strategy-context-label,.ozon-strategy-legend {font-size:10px;color:#71839b}.ozon-strategy-relation {font-size:10px;padding:2px 4px;border-radius:4px;background:#e7effb;color:#526b8c}.ozon-strategy-copy-menu {position:relative;flex:none}.ozon-strategy-copy-menu summary {display:flex;align-items:center;cursor:pointer;color:#71849d;list-style:none}.ozon-strategy-copy-menu summary::-webkit-details-marker {display:none}.ozon-strategy-copy-options {position:absolute;top:100%;left:0;z-index:10;width:150px;padding:4px;background:#fff;border:1px solid #dbe4ef;border-radius:8px;box-shadow:0 5px 18px #07102626}.ozon-strategy-copy-options button {display:block;width:100%;padding:7px;border:0;border-radius:4px;background:#fff;color:#071026;text-align:left;cursor:pointer}.ozon-strategy-copy-options button:hover {background:#eaf3ff}.ozon-strategy-theme-scope {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;color:#64748b}.ozon-strategy-theme-row {display:flex;align-items:flex-start}.ozon-strategy-theme-toggle,.ozon-strategy-theme-toggle-space {flex:none;width:20px;height:28px;border:0;background:transparent;color:#005bff;cursor:pointer}.ozon-strategy-theme-row .ozon-strategy-theme-option {min-width:0;flex:1}
.ozon-strategy-table td:has(.ozon-strategy-copy-menu[open]) {overflow:visible;z-index:20}.ozon-strategy-copy-menu .ozon-strategy-copy-options {position:fixed;z-index:100;box-sizing:border-box}
.ozon-dev-priority-edit { border:1px solid transparent;border-radius:5px;padding:2px;background:transparent;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto; }
.ozon-dev-priority-edit:hover,.ozon-dev-priority-edit:focus-visible { background:#e5f0ff;border-color:#80adff;outline:none; }

.ozon-dev-dashboard { display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;background:#fff;color:#071026;font:400 11.5px var(--ozon-font-sans); }
.ozon-dev-dashboard a { color:#005BFF;text-decoration:none; }
.ozon-dev-controls { display:flex;align-items:center;justify-content:flex-start!important;flex-wrap:wrap;gap:6px!important;padding:6px 12px;border-bottom:1px solid #E2E8F0; }
.ozon-dev-controls .ozon-ext-toolbar-combo { min-width:142px;max-width:245px; }
.ozon-dev-controls .ozon-dev-grouping-control { width:142px;max-width:142px; }
.ozon-dev-header-actions { display:flex;align-items:center;gap:10px;margin-left:auto; }
.ozon-dev-help { position:relative; }
.ozon-dev-help>button { width:26px;height:26px;padding:4px!important;display:flex;align-items:center;justify-content:center; }
.ozon-dev-help>button svg { display:block;width:18px!important;height:18px!important;min-width:18px;flex-shrink:0; }
.ozon-dev-help [role="tooltip"] { display:none;position:absolute;right:0;top:calc(100% + 6px);width:390px;max-width:calc(100vw - 32px);max-height:calc(100vh - 160px);overflow:auto;padding:12px 14px;border:1px solid #E2E8F0;border-radius:10px;background:#fff;color:#475569;box-shadow:0 4px 18px rgba(25,47,68,.12);font:400 11px/1.5 var(--ozon-font-sans);z-index:120; }
.ozon-dev-help:hover [role="tooltip"],.ozon-dev-help:focus-within [role="tooltip"] { display:block; }
.ozon-dev-help [role="tooltip"] p { margin:8px 0 0; }
.ozon-dev-popover { top:calc(100% + 6px);left:0;right:auto;padding:8px;min-width:100%; }
.ozon-dev-popover .ozon-ext-combo-item { display:block;width:100%;text-align:left;cursor:pointer; }
#ozon-structure-root .ozon-dev-popover, #ozon-structure-root .ozon-dev-popover * { scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
#ozon-structure-root .ozon-dev-popover::-webkit-scrollbar, #ozon-structure-root .ozon-dev-popover *::-webkit-scrollbar { width:6px;height:6px; }
#ozon-structure-root .ozon-dev-popover::-webkit-scrollbar-thumb, #ozon-structure-root .ozon-dev-popover *::-webkit-scrollbar-thumb { background:#A8B5C5;border-radius:8px; }
#ozon-structure-root .ozon-ext-epic-picker-popover { position:fixed!important;top:0!important;right:0!important;left:auto!important;bottom:0!important;width:min(560px,100vw)!important;min-width:0!important;max-width:100vw!important;height:100vh!important;max-height:100vh!important;z-index:2147483001!important;border-radius:0!important;padding:20px!important;box-shadow:-8px 0 28px #07102633!important;overflow:hidden!important; }
#ozon-structure-root .ozon-ext-epic-picker-popover #ozon-table-combo-list { flex:1 1 0!important;min-height:0!important;max-height:none!important;overflow:auto;scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
#ozon-structure-root .ozon-dev-popover button.ozon-ext-combo-item { appearance:none;border:0!important;box-shadow:none!important;background:transparent;color:#071026;border-radius:6px!important;font:400 11.5px var(--ozon-font-sans);padding:6px 8px;min-height:30px; }
#ozon-structure-root .ozon-dev-popover button.ozon-ext-combo-item:hover,#ozon-structure-root .ozon-dev-popover button.ozon-ext-combo-item.active { background:#E5F0FF;color:#005BFF; }
#ozon-structure-root .ozon-dev-team-popover { width:180px!important;min-width:180px!important;max-width:180px!important; }
.ozon-dev-column-menu { width:340px;max-height:65vh;overflow:auto; }
.ozon-dev-column-label { flex:1; }
.ozon-dev-column-child { padding-left:20px;border-left:2px solid #E2E8F0;margin-left:8px; }
.ozon-dev-col-resizer { position:absolute;right:-3px;top:0;bottom:0;width:7px;cursor:col-resize;touch-action:none;z-index:4; }
.ozon-dev-col-resizer:hover,.ozon-dev-col-resizer:focus-visible { background:#005BFF;outline:0; }
.ozon-dev-table thead tr:nth-child(2) th { top:30px; }
.ozon-dev-table th { padding-right:12px; }
.ozon-dev-sp-parent { text-align:center!important;border-bottom:1px solid #CBD5E1!important; }
.ozon-dev-point-pair { white-space:nowrap; }
.ozon-dev-points-divider { color:#94A3B8;font-weight:400; }
.ozon-dev-point-percent { color:#64748B;font-size:10px;font-weight:400;margin-left:3px; }
.ozon-dev-burned { color:#039855; }
.ozon-dev-sprints { width:440px;max-width:calc(100vw - 32px); }
.ozon-dev-sprints input[type="search"] { width:100%;margin-bottom:8px; }
.ozon-dev-sprint-list { max-height:300px;overflow:auto; }
.ozon-dev-sprint-option { display:flex;gap:8px;align-items:center;padding:6px;border-radius:6px;cursor:pointer; }
.ozon-dev-sprint-option:hover { background:#F1F6FF; }
.ozon-dev-sprint-option > span:not(.ozon-ext-badge) { flex:1;white-space:normal; }
.ozon-dev-sprint-option input { accent-color:#005BFF;flex-shrink:0; }
.ozon-sprint-current {display:flex;flex-direction:column;gap:5px;padding:12px;margin:0 0 12px;border-radius:8px;background:#f3f7fc;color:#667b93}.ozon-sprint-current strong {color:#071026;font-weight:600}.ozon-component-editor {font:400 12px/1.4 var(--ozon-font-sans,Arial,sans-serif)!important;color:#071026!important;gap:0!important;padding:20px!important}
.ozon-component-editor .component-editor-head {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.ozon-component-editor .component-editor-head strong {font-size:13px;font-weight:700}
.ozon-component-editor .component-editor-context {margin:-10px 0 14px;color:#64748b;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
.ozon-component-editor .component-editor-close {display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:#f0f3f8;color:#41566f;cursor:pointer;font-size:15px}
.ozon-component-editor .component-editor-close:hover {background:#e5f0ff;color:#005bff}
.ozon-component-editor .component-editor-search {position:relative;display:flex;align-items:center;margin-bottom:14px}
.ozon-component-editor .component-editor-search svg {position:absolute;left:11px;width:16px;height:16px;color:#93a4b8;pointer-events:none}
.ozon-component-editor .component-editor-search input {box-sizing:border-box;width:100%;height:36px;padding:0 10px 0 34px;border:1px solid #d6e0ec;border-radius:8px;background:#fff;color:#071026;font:inherit;outline:none}
.ozon-component-editor .component-editor-search input:focus {border-color:#005bff;box-shadow:0 0 0 1px #005bff}
.ozon-component-editor .component-editor-caption {display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;color:#64748b;font-size:11px}
.ozon-component-editor .component-editor-list {overflow:auto;flex:1;min-height:0;scrollbar-width:thin;scrollbar-color:#a8b5c5 transparent}
.ozon-component-editor .component-editor-section {margin:8px 10px 3px;color:#52647d;font-size:11px;font-weight:650}
.ozon-component-editor .component-editor-option small {color:#64748b;font-size:11px;font-weight:400}
.ozon-component-editor .component-editor-list::-webkit-scrollbar {width:6px}.ozon-component-editor .component-editor-list::-webkit-scrollbar-thumb {background:#a8b5c5;border-radius:8px}
.ozon-component-editor .component-editor-option {display:flex;align-items:center;gap:10px;min-height:38px;box-sizing:border-box;padding:8px 10px;margin:2px 4px 2px 0;border-radius:7px;cursor:pointer;color:#071026;transition:background .15s}
.ozon-component-editor .component-editor-option:hover {background:#f1f6ff}.ozon-component-editor .component-editor-option.is-selected {background:#eaf3ff;color:#005bff;font-weight:600}
.ozon-component-editor button.component-editor-option {width:calc(100% - 4px);border:0;background:transparent;text-align:left;font:inherit}.ozon-component-editor button.component-editor-option:hover {background:#f1f6ff}.ozon-component-editor button.component-editor-option.is-selected {background:#eaf3ff;color:#005bff;font-weight:600}.ozon-component-editor button.component-editor-option:focus-visible {outline:2px solid #005bff;outline-offset:-2px}.ozon-component-editor button.component-editor-option > span:first-child:not(.ozon-person-avatar) {flex:1;min-width:0}.ozon-component-editor .component-editor-list {overflow-x:hidden}.ozon-component-editor .component-editor-option input {appearance:none;-webkit-appearance:none;display:grid;place-content:center;width:16px;height:16px;min-width:16px;margin:0;padding:0;border:1px solid #a8b5c5;border-radius:4px;background:#fff;cursor:pointer}
.ozon-priority-editor button.component-editor-option {justify-content:flex-start}.ozon-priority-editor button.component-editor-option > span.ozon-dev-priority:first-child {flex:0 0 auto}
.ozon-strategy-table tbody tr.ozon-strategy-exact-match td {background:#dcecff}
.ozon-report {display:flex;flex:1;flex-direction:column;min-height:0;background:#f5f8fc;color:#071026}
.ozon-report-scroll {flex:1;overflow:auto;min-height:0;scrollbar-gutter:stable}
.ozon-report-inner {max-width:1320px;padding:20px 24px 32px;margin:0 auto}
.ozon-report-toolbar,.ozon-report-tools,.ozon-report-daybar,.ozon-report-sections,.ozon-report-legend {display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.ozon-report-sections {position:sticky;top:0;z-index:5;padding:8px 0;margin:0 0 10px;background:#f4f7fb;border-bottom:1px solid #dbe5f1}
.ozon-report-panel {scroll-margin-top:58px}
.ozon-report-toolbar {align-items:end;margin-bottom:18px}
.ozon-report-field {display:grid;gap:5px;font-weight:600;color:#334155;font-size:12px}
.ozon-report input {max-width:100%;border:1px solid #ccd8e7;border-radius:8px;padding:7px 10px;min-height:30px;background:#fff;color:#071026;font:inherit}
.ozon-report-sprint-field {grid-template-columns:minmax(0,1fr);min-width:0;max-width:min(320px,100%)}
.ozon-report-sprint-field>.ozon-ext-toolbar-combo {min-width:0;max-width:100%}
.ozon-report-sprint-field .ozon-ext-toolbar-trigger {justify-content:flex-start;gap:6px}
.ozon-report-sprint-field .ozon-ext-toolbar-label {min-width:0;text-align:left}
.ozon-report-sprint-field .ozon-ext-toolbar-chevron {margin-left:auto}
.ozon-report-options {max-height:min(280px,50vh);overflow:auto;overscroll-behavior:contain}
.ozon-report-options.ozon-report-sprint-options {display:flex;flex-direction:column;overflow:hidden}
.ozon-report-sprint-options .ozon-report-sprint-search {flex:none;box-sizing:border-box;margin-bottom:4px}
.ozon-report-sprint-options .ozon-report-option-list {min-height:0;overflow-y:auto;overscroll-behavior:contain}
.ozon-report-options.ozon-report-sprint-options {width:min(340px,calc(100vw - 24px));min-width:0;max-height:min(360px,60vh)}
.ozon-report-sprint-options .ozon-dev-sprint-option {padding-inline:6px}
.ozon-report-sprint-options .ozon-dev-sprint-option input[type="checkbox"] {min-height:0}
.ozon-report-sprint-options .ozon-dev-sprint-option:has(input:checked) {background:#eaf3ff}
.ozon-report-sprint-footer {display:flex;align-items:center;justify-content:flex-end;gap:6px;flex:none;flex-wrap:wrap;padding:7px 2px 2px;border-top:1px solid #e2e8f0}
.ozon-report-sprint-footer>span {margin-right:auto;color:#52647d;font-size:11px;white-space:nowrap}
.ozon-report-picker-empty {margin:4px 0;padding:6px 8px;color:#52647d;font-weight:400}
#ozon-structure-root .ozon-report-options .ozon-ext-combo-item {display:flex!important;align-items:center;gap:6px;justify-content:flex-start}
.ozon-report-options .ozon-ext-combo-item>span:first-child {min-width:0;white-space:normal;overflow-wrap:anywhere}
.ozon-report-field .ozon-ext-badge,.ozon-report-options .ozon-ext-badge {flex:none}
.ozon-report-toolbar .ozon-ext-btn {min-height:30px}
.ozon-report-period {display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}
#ozon-structure-root .ozon-report-period strong {margin:0;font-size:15px}
.ozon-report-period span:not(.ozon-ext-badge),.ozon-report-hint,.ozon-report-tools>span,.ozon-report-method {color:#52647d}
.ozon-report-cards {display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:10px}
.ozon-report-card {display:grid;text-align:left;align-content:start;gap:6px;border:1px solid #dae4f1;border-radius:12px;padding:13px;background:#fff;color:#071026;font:inherit;cursor:pointer}
.ozon-report-card:hover {border-color:#84aefb;background:#f8fbff}.ozon-report-card:focus-visible {outline:2px solid #005bff;outline-offset:2px}
.ozon-report-card>span {font-size:12px;color:#334155;font-weight:600}.ozon-report-card strong {font-size:22px;line-height:1.2}.ozon-report-card small {color:#52647d;font-size:11.5px}
.ozon-report-totals {display:flex;flex-wrap:wrap;gap:6px 20px;margin:0 0 12px;color:#40536e;font-size:12px}.ozon-report-totals strong {color:#071026;margin-left:3px}
.ozon-report-method.ozon-report-definitions {margin:0 0 14px;font-size:12px}.ozon-report-definitions p {max-width:84ch;line-height:1.5}
.ozon-report-panel {margin-top:12px;background:#fff;border:1px solid #dae4f1;border-radius:12px;padding:16px}
.ozon-report-panel h2 {font-size:16px;margin:0 0 12px}.ozon-report-panel>p {margin:0 0 10px}
.ozon-report-trend-top,.ozon-report-trend-controls,.ozon-report-trend-unit,.ozon-report-trend-legend {display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.ozon-report-trend-top {justify-content:space-between;margin-bottom:8px}
.ozon-report-trend-top h2 {margin:0}
.ozon-report-trend-legend {gap:8px 16px;color:#40536e;font-size:11.5px}
.ozon-report-comparison {--trend-planned:#789de0;--trend-completed:#228663;--trend-remaining:#9273c3}
.ozon-report-trend-legend span::before {content:'';display:inline-block;width:10px;height:8px;border-radius:2px;margin-inline-end:4px;background:var(--trend-color)}
.ozon-report-comparison .planned {--trend-color:var(--trend-planned)}
.ozon-report-comparison .completed {--trend-color:var(--trend-completed)}
.ozon-report-comparison .remaining {--trend-color:var(--trend-remaining)}
.ozon-report-trend-chart {display:grid;grid-template-columns:42px minmax(0,1fr);margin:3px 0 14px;--trend-height:148px}
.ozon-report-trend-axis {display:flex;flex-direction:column;justify-content:space-between;text-align:right;color:#52647d;font-size:11px;height:calc(var(--trend-height) + 13px);padding-inline-end:7px;margin-block-start:14px}
.ozon-report-trend-scroll {overflow-x:auto;padding-top:22px;scrollbar-width:thin}
.ozon-report-trend-plot {display:grid;grid-template-columns:repeat(var(--trend-sprints),minmax(120px,1fr));min-width:calc(var(--trend-sprints) * 120px);background:repeating-linear-gradient(to top,#e0e8f3 0 1px,transparent 1px 25%) left top/100% var(--trend-height) no-repeat}
.ozon-report-trend-sprint {min-width:0;text-align:center;border-inline-start:1px solid #e9edf4}
.ozon-report-trend-bars {position:relative;display:flex;align-items:end;justify-content:center;gap:5px;width:100%;height:var(--trend-height);background:transparent;border:0;border-bottom:1px solid #d5dfed;padding:0 4px}
button.ozon-report-trend-bars,.ozon-report-trend-link {cursor:pointer}
button.ozon-report-trend-bars:hover,.ozon-report-trend-bars:focus-visible {background:#eaf3ff60}
.ozon-report-trend-bars:focus-visible,.ozon-report-trend-link:focus-visible {outline:2px solid #005bff;outline-offset:-2px}
.ozon-report-trend-bar {position:relative;width:clamp(18px,17%,28px);height:max(2px,var(--bar-height));background:var(--trend-color);border-radius:3px 3px 0 0}
.ozon-report-trend-bar>span {position:absolute;bottom:calc(100% + 2px);left:50%;transform:translateX(-50%);color:#233853;font:600 11px var(--ozon-font-sans);white-space:nowrap}
.ozon-report-trend-pending {align-self:center;color:#52647d}
.ozon-report-trend-name {display:block;padding:6px 5px;color:#334155;overflow-wrap:anywhere}
.ozon-report-trend-name small,.ozon-report-trend-table th small {display:block;color:#52647d;font-weight:400}
.ozon-report-trend-table {border:1px solid #e4ecf6;border-radius:8px}
.ozon-report-trend-table table {min-width:710px}
.ozon-report-trend-table tbody th {width:25%;text-align:left}
.ozon-report-trend-table th .ozon-ext-badge {margin-top:4px}
.ozon-report-trend-table td {font-variant-numeric:tabular-nums}
.ozon-report-trend-link {display:block;padding:0;border:0;text-align:left;background:transparent;color:#005bff;font:inherit}
.ozon-report-trend-link:hover strong {text-decoration:underline}
.ozon-report-trend-warning {margin-top:5px;color:#774600;font-size:11px;font-weight:400}
.ozon-report-trend-warning ul {margin:4px 0;padding-inline-start:16px}
.ozon-report-chart-toolbar,.ozon-report-chart-modes {display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.ozon-report-chart-toolbar {justify-content:space-between;margin:4px 0 10px}
.ozon-report-chart {margin-bottom:8px}
.ozon-report-project-charts {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:12px}
.ozon-report-project-charts>.ozon-report-chart {min-width:0;margin:0;padding:9px 10px 3px;border:1px solid #e4ecf6;border-radius:9px}
.ozon-report-chart h3 {margin:0 0 6px;font-size:13px;color:#071026}
.ozon-report-graph {overflow-x:auto;position:relative}.ozon-report-graph svg {display:block;width:100%;min-width:640px;max-height:204px}
.ozon-report-chart.is-project svg {min-width:370px;max-height:300px}
@media(max-width:900px){.ozon-report-project-charts {grid-template-columns:minmax(0,1fr)}}
.ozon-report-graph-hit {cursor:crosshair}
.ozon-report-tooltip {position:absolute;z-index:2;top:6px;min-width:145px;padding:8px 10px;border-radius:8px;background:#14223b;color:#fff;box-shadow:0 3px 12px #0f172a30;pointer-events:none;font-size:11.5px;line-height:1.45}
.ozon-report-tooltip:not([hidden]) {display:grid;gap:2px}
.ozon-report-tooltip>span:empty {display:none}
.ozon-report-grid line {stroke:#dbe4f0;stroke-width:1;vector-effect:non-scaling-stroke}
.ozon-report-grid .ozon-report-grid-day {stroke:#edf2f8}.ozon-report-grid .ozon-report-grid-day.is-major {stroke:#dbe4f0}
.ozon-report-grid text,.ozon-report-axis-title {fill:#52647d;font-size:14px}
.ozon-report-axis {fill:none;stroke:#97a9bf;stroke-width:1;vector-effect:non-scaling-stroke}.ozon-report-axis-title {font-weight:600;font-size:13px}
.ozon-report-scope-dot {fill:#7b5ab8}.ozon-report-remaining-dot {fill:#005bff}
.ozon-report-plot-label {font-size:13px;font-weight:550;stroke:#fff;stroke-width:2px;stroke-linejoin:round;paint-order:stroke}
.ozon-report-plot-label.scope {fill:#614396}.ozon-report-plot-label.remaining {fill:#0048cb}.ozon-report-plot-label.shared {fill:#334155}
.ozon-report-line-scope,.ozon-report-line-remaining,.ozon-report-line-selected {fill:none;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.ozon-report-line-scope {stroke:#7b5ab8;stroke-width:1.25;stroke-dasharray:5 4}.ozon-report-line-remaining {stroke:#005bff;stroke-width:1.5}.ozon-report-line-selected {stroke:#a9c3e9;stroke-width:1}
.ozon-report-burn-bar {fill:#6cb99b}.ozon-report-burn-bar.is-selected {fill:#368563}
.ozon-report-burn-delta {fill:#064b35;font-size:12px;font-weight:700;stroke:#fff;stroke-width:2px;stroke-linejoin:round;paint-order:stroke;pointer-events:none}
.ozon-report-legend {color:#40536e;font-size:12px}.ozon-report-legend>span::before {content:'';display:inline-block;width:18px;border-top:1.5px solid #005bff;vertical-align:middle;margin-right:6px}.ozon-report-legend>span:nth-child(2)::before {border-top:1.25px dashed #7b5ab8}.ozon-report-legend>small {color:#64748b}
.ozon-report-legend>.ozon-report-burn-legend::before {width:12px;height:8px;border:0;border-radius:2px;background:#6cb99b}
.ozon-report-daybar,.ozon-report-tools {margin:8px 0 12px}.ozon-report-tools input {width:min(280px,100%)}.ozon-report-filter {display:flex;align-items:center;gap:6px}
.ozon-report-journal {margin-top:16px}
.ozon-report-journal h3 {margin:0;font-size:13px}
.ozon-report-journal .ozon-report-daybar {align-items:flex-end;gap:8px 12px}
.ozon-report-date-controls {display:flex;align-items:center;gap:4px}
.ozon-report-date-controls > button {width:28px;height:30px;padding:0;justify-content:center;font-size:15px}
.ozon-report-journal [data-report-picker="event"] {min-width:148px}
.ozon-report-projectbar {display:flex;align-items:center;gap:8px;margin:0 0 7px;font-size:12px;color:#334155;font-weight:600}
.ozon-report-view-options {display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.ozon-report-view-options .ozon-report-projectbar {margin:0}
.ozon-report-projects {margin-bottom:12px;border:1px solid #dae4f1;border-radius:10px;background:#fff}
.ozon-report-projects small,.ozon-report-group small {font-size:11px;color:#536682;font-weight:400}
.ozon-report-projects .ozon-report-project-selected>td,.ozon-report-projects .ozon-report-project-selected>th {background:#eaf3ff}
.ozon-report-leaders {display:grid;gap:7px}
.ozon-report-leader {display:flex;align-items:center;gap:7px;min-width:136px;color:#071026}
.ozon-report-leader-name {display:grid;gap:2px;min-width:0}
.ozon-report-leader strong {font-size:11.5px;line-height:1.25}
.ozon-report-leader small {font-size:11px;color:#536682}
.ozon-report-leader-avatar {position:relative;display:grid;place-items:center;width:26px;height:26px;flex:0 0 26px;border-radius:50%;overflow:hidden;background:#e7eff9;color:#40536e;font-size:10px;font-weight:650}
.ozon-report-leader-avatar img {position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff}
.ozon-report-leader-avatar img[hidden] {display:none}
.ozon-report-single-leader {display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;color:#40536e;font-size:12px}
.ozon-report-streams {margin:14px 0;padding:12px 14px;border:1px solid #dae4f1;border-radius:10px;background:#fff}
.ozon-report-streams>summary {font-weight:650;font-size:13px;cursor:pointer}
.ozon-report-streams[open]>summary {margin-bottom:8px}
.ozon-report-streams p {font-size:12px;color:#52647d;margin:0 0 10px}
.ozon-report-rollup-tools {margin-bottom:10px}
.ozon-report-rollup-wrap {border:1px solid #e4ecf6;border-radius:8px}
.ozon-report-rollup-wrap table {min-width:1050px;table-layout:auto}
.ozon-report-rollup-wrap .ozon-report-rollup-group {width:25%;min-width:250px;position:sticky;left:0;z-index:1;border-right:1px solid #e4ecf6;vertical-align:middle}
.ozon-report-rollup-epic {min-width:0}
.ozon-report-rollup-epic-meta {display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.ozon-report-rollup-epic-meta a {white-space:nowrap}
.ozon-report-rollup-epic .ozon-report-epic-title {display:block;margin-top:3px;white-space:normal;overflow-wrap:anywhere}
.ozon-report-rollup-wrap thead th {vertical-align:middle}
.ozon-report-rollup-wrap tbody .ozon-report-rollup-row:not(.ozon-report-rollup-highlight)>th {background:#fff;font-weight:400}
.ozon-report-rollup-wrap .ozon-report-rollup-highlight :is(th,td) {background:#f1f5fb}
.ozon-report-rollup-wrap td.ozon-report-rollup-total {background:#eaf2fb}
.ozon-report-rollup-pair {display:flex;align-items:baseline;gap:5px;white-space:nowrap}
.ozon-report-rollup-pair > span {color:#748399}
.ozon-report-rollup-value {display:inline-flex;align-items:baseline;gap:4px;color:#40536e;font-variant-numeric:tabular-nums;font-size:11px}
.ozon-report-rollup-value.is-fact {color:#1755aa}
.ozon-report-rollup-value strong {font-size:13px}
.ozon-report-rollup-value small {color:inherit;font-size:10.5px}
.ozon-report-settings-button {margin-left:auto}
.ozon-report-settings p {margin:0;color:#52647d}
.ozon-report-settings [data-report-settings="inherit"][aria-pressed="true"] {background:#e4efff;color:#005bff}
.ozon-report-epic-title {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ozon-report-stream-chip {flex:none;padding:2px 6px;border-radius:6px;background:#eaf1fa;color:#435872;font-size:10px;font-weight:500;white-space:nowrap}
.ozon-report-day-breakdown {margin:0 0 12px}.ozon-report-day-breakdown>div {margin-top:6px}
.ozon-report-table-wrap {overflow:auto}.ozon-report-table-wrap table {width:100%;border-collapse:collapse;text-align:left}.ozon-report-table-wrap th,.ozon-report-table-wrap td {padding:8px;border-bottom:1px solid #e4ecf6;vertical-align:top}.ozon-report-table-wrap th {background:#f1f5fb;color:#334155;font-size:11.5px}.ozon-report-table-wrap td:first-child,.ozon-report-table-wrap td:last-child {white-space:nowrap}.ozon-report-table-wrap td:nth-child(2) {min-width:100px}.ozon-report-table-wrap td:last-child {white-space:normal}.ozon-report-table-wrap tr:hover td {background:#f7faff}
.ozon-report-tree-wrap .ozon-report-tree {table-layout:fixed;min-width:810px}
.ozon-report-tree .ozon-report-tree-key {width:calc(170px + var(--report-depth) * 16px)}
.ozon-report-tree .ozon-report-tree-assignee {width:16%}
.ozon-report-tree .ozon-report-tree-time {width:58px}
.ozon-report-tree .ozon-report-tree-status {width:23%}
.ozon-report-tree .ozon-report-tree-points {width:100px}
.ozon-report-tree td {overflow-wrap:anywhere}
.ozon-report-tree-line {display:flex;align-items:center;gap:7px;min-width:0;padding-left:calc(var(--report-depth) * 16px);background:repeating-linear-gradient(to right,#d7e2f0 0 1px,transparent 1px 16px) 8px center/calc(var(--report-depth) * 16px) 100% no-repeat}
.ozon-report-group th>div>span {overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ozon-report-group th small {white-space:nowrap}
.ozon-report button[data-report-group] {flex:0 0 16px;border:0;border-radius:4px;background:transparent;color:#005bff;padding:0;cursor:pointer}
.ozon-report button[data-report-group]:not(:disabled):hover {background:#e3eeff}
.ozon-report button[data-report-group]:disabled {cursor:default}
.ozon-report-group-1 th {background:#f5f8fd}.ozon-report-group-2 th {background:#f8fafd}
.ozon-report-task-key {display:flex;align-items:center;gap:7px;white-space:nowrap}
.ozon-report-task-key .ozon-report-epic-edit {font-size:11px;line-height:1.2;padding:3px 6px}
.ozon-report-table-wrap .ozon-report-assignee {display:inline-flex;align-items:center;gap:6px;max-width:200px;text-align:left;font-size:11px;line-height:1.2;padding:3px 6px}
.ozon-report-assignee>span:first-child {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ozon-report-assignee.is-empty {color:#536682}
#ozon-structure-root .ozon-person-line, .ozon-component-editor .ozon-person-line {display:flex;align-items:center;min-width:0;gap:5px}
.ozon-person {display:inline-flex;align-items:center;gap:5px;min-width:0;vertical-align:middle;font-size:inherit}
.ozon-person-name {overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.ozon-person-avatar {position:relative;display:inline-grid;place-items:center;flex:0 0 20px;width:20px;height:20px;border-radius:50%;overflow:hidden;background:#e8eef7;color:#405775;font-size:8px;font-weight:700}
.ozon-person-avatar img {position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff}
.ozon-person-avatar img[hidden] {display:none}
#ozon-structure-root button.ozon-person-copy,.ozon-component-editor button.ozon-person-copy {display:inline-grid;place-items:center;flex:0 0 21px;width:21px;height:22px;padding:0;border:0;border-radius:5px;background:transparent;color:#526782;cursor:pointer}
#ozon-structure-root button.ozon-person-copy:hover,.ozon-component-editor button.ozon-person-copy:hover {background:#e5f0ff;color:#005bff}
.ozon-person-copy:focus-visible,.ozon-grouping-order button:focus-visible {outline:2px solid #005bff;outline-offset:1px}
.ozon-person-input>input,.ozon-person-line>.ozon-ext-cell-combo-trigger {flex:1;min-width:0}
.ozon-person-line>.ozon-ext-cell-combo-trigger>.ozon-person {flex:1}
.ozon-person-line>.ozon-report-assignee,.ozon-person-line>.component-editor-option {flex:1;min-width:0}
.ozon-report-assignee-line:not(:has(>.ozon-person-copy)) {padding-inline-end:26px}
.ozon-sb-author {color:#576a82;font-size:10.5px;max-width:min(275px,100%)}
.ozon-sb-author>span:first-child {flex:none}
.ozon-grouping-order {display:grid;gap:4px}
.ozon-grouping-order p {margin:4px 0 6px;color:#576a82;font-size:11.5px}
.ozon-grouping-level {position:relative;display:flex;align-items:center;gap:4px;padding:3px 5px;border:1px solid #e7edf5;border-radius:8px;background:#f8fafd;transform:translateY(var(--group-shift,0));min-height:32px}
.ozon-grouping-level.is-dragging {z-index:2;background:white;border-color:#9dc1ff;box-shadow:0 4px 12px #1d427c32}
.ozon-grouping-level label,.ozon-grouping-title {display:flex;align-items:center;gap:8px;flex:1;min-width:0}
.ozon-grouping-level label {cursor:pointer}
.ozon-sb-label-form,#ozon-strategy-label-form {position:relative}
.ozon-label-suggestions {position:absolute;top:calc(100% + 4px);left:0;z-index:12;width:min(290px,100%);padding:4px;box-sizing:border-box;border:1px solid #d6e2f0;border-radius:9px;background:#fff;box-shadow:0 8px 24px #07102626;color:#10213d;line-height:1.35}
.ozon-label-suggestions [role="status"]:not(:empty) {padding:6px 8px;color:#526782;font-size:11px}
.ozon-label-suggestions [role="listbox"] {max-height:166px;overflow:auto}
.ozon-label-suggestions [role="option"] {padding:6px 8px;border-radius:6px;overflow-wrap:anywhere;cursor:pointer}
.ozon-label-suggestions [role="option"]:hover,.ozon-label-suggestions [aria-selected="true"] {background:#e5f0ff;color:#005bff}
.ozon-depth-control {display:inline-block}
.ozon-depth-label {color:#526782;margin-right:4px}
.ozon-depth-options[hidden] {display:none!important}
.ozon-grouping-level:not([data-group-enabled]) {background:#fff;color:#64748b}
#ozon-structure-root :is(.ozon-grouping-grip,.ozon-grouping-step) {display:inline-grid;place-items:center;flex:0 0 25px;width:25px;height:26px;padding:0;border:0;border-radius:5px;color:#516783;background:transparent}
#ozon-structure-root button.ozon-grouping-grip {cursor:grab;touch-action:none}
#ozon-structure-root .is-dragging button.ozon-grouping-grip {cursor:grabbing}
#ozon-structure-root button.ozon-grouping-step {cursor:pointer}
#ozon-structure-root :is(.ozon-grouping-step,.ozon-grouping-grip):disabled,.ozon-grouping-level:not([data-group-enabled]) .ozon-grouping-grip {opacity:.35;cursor:default}
#ozon-structure-root button:is(.ozon-grouping-grip,.ozon-grouping-step):not(:disabled):hover {background:#e5f0ff;color:#005bff}
@media (prefers-reduced-motion: no-preference) {
  #ozon-structure-root :is(button,a,input,select,summary,.ozon-depth-control,.ozon-ext-combo-item,.ozon-ext-user-option,.ozon-ext-cell-combo-trigger,.ozon-ext-sb-combo-trigger,.ozon-ext-section-head,.ozon-ext-view-tabs button,.ozon-ext-table tbody tr,.ozon-ext-table tbody td,.ozon-dev-table tbody td,.ozon-strategy-table tbody td,.ozon-report-tree tbody :is(th,td)),
  .ozon-component-editor :is(button,input,label),#ozon-structure-root .ozon-label-suggestions [role="option"] {transition:background-color 150ms ease,border-color 150ms ease,color 150ms ease,box-shadow 150ms ease,filter 150ms ease;}
  #ozon-structure-root :is(.ozon-ext-toolbar-chevron,.ozon-ext-search-select-caret) {transition:transform 150ms ease,opacity 150ms ease;}
  #ozon-structure-root .ozon-grouping-level:not(.is-dragging) {transition:transform 160ms cubic-bezier(.2,.7,.3,1),background-color 150ms ease,border-color 150ms ease;}
  body>.ozon-component-editor {animation:ozon-editor-enter 160ms ease-out;}
  @keyframes ozon-editor-enter {from {opacity:.55;translate:14px 0;} to {opacity:1;translate:0 0;}}
}
@media (prefers-reduced-motion: reduce) {
  #ozon-structure-root *, body>.ozon-component-editor, body>.ozon-component-editor * {transition-duration:0s!important;animation-duration:0s!important;scroll-behavior:auto!important;}
}
.ozon-report-empty,.ozon-report-banner,.ozon-report-warning {padding:10px 12px;border-radius:8px;background:#eef4fb;color:#334155}.ozon-report-banner {display:flex;align-items:center;gap:8px;margin:0 0 12px}.ozon-report-warning {background:#fff4dc;color:#774600;margin:8px 0 12px}.ozon-report-warning:is(ul) {padding-left:28px}.ozon-report-history-warning {color:#884c06;display:inline-block}.ozon-report-method {margin-top:12px}.ozon-report-method summary {cursor:pointer}.ozon-report-method p {margin:6px 0 0}.ozon-report-panel [data-report-more] {margin-top:10px}
@media(max-width:950px){.ozon-report-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.ozon-report-inner{padding:12px}.ozon-report-panel{padding:10px}.ozon-report-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.ozon-report-sprint-field .ozon-report-options{width:100%}.ozon-report-legend>small{margin-left:0}}
.ozon-strategy-table tbody tr.ozon-strategy-exact-match .ozon-strategy-task-cell {box-shadow:inset 3px 0 #005bff,3px 0 6px #0710260d}
.ozon-planning-editor .ozon-planning-option-text {display:flex;flex:1;min-width:0;flex-direction:column;gap:3px;overflow-wrap:anywhere}
.ozon-planning-editor .ozon-planning-option-key {font-size:11px;color:#526b8c}
.ozon-planning-editor [data-message] {min-height:1em;font-size:12px;color:#64748b;overflow-wrap:anywhere}
.ozon-planning-editor [data-message][role="alert"] {color:#b42318}
.ozon-component-editor .component-editor-option input:checked {border-color:#005bff;background:#005bff}.ozon-component-editor .component-editor-option input:checked::after {content:"";width:7px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translate(1px,-1px)}
.ozon-component-editor .component-editor-option input:focus-visible {outline:2px solid #005bff;outline-offset:2px}
.ozon-component-editor .component-editor-footer {display:flex;justify-content:flex-end;gap:8px;padding-top:14px;margin-top:12px;border-top:1px solid #e4ebf3}
.ozon-component-editor .component-editor-button {min-height:32px;padding:0 13px;border:1px solid #d6e0ec;border-radius:8px;background:#fff;color:#005bff;font:600 12px var(--ozon-font-sans,Arial,sans-serif);cursor:pointer}
.ozon-component-editor .component-editor-button:hover {background:#f1f6ff}.ozon-component-editor .component-editor-button.primary {border-color:#005bff;background:#005bff;color:#fff}.ozon-component-editor .component-editor-button.primary:hover {background:#004dd6}.ozon-component-editor .component-editor-button:disabled {opacity:.55;cursor:wait}
.ozon-dev-popover-footer { display:flex;justify-content:space-between;gap:8px;border-top:1px solid #EEF2F6;padding-top:8px; }
.ozon-dev-content,.ozon-dev-table-scroll { flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
.ozon-dev-content { display:flex;min-width:0;overflow:hidden; }
.ozon-dev-table-scroll { min-width:0;width:100%; }
.ozon-dev-table { max-width:none!important; }
.ozon-dev-table tfoot td { position:sticky;bottom:0;z-index:3;background:#eef3fa;border-top:1px solid #cad7e7;font-weight:600; }
.ozon-dev-table .ozon-dev-filler td { padding:0!important;border:0!important;background:#fff!important; }
.ozon-dev-settings .ozon-dev-column-child { margin-left:20px;padding-left:12px;border-left:2px solid #d6e3f3; }
.ozon-dev-content>.ozon-dev-empty { flex:1;min-width:0; }
.ozon-dev-empty { padding:28px 20px;color:#64748B; }
.ozon-dev-empty strong { color:#334155; }
.ozon-dev-error { margin:10px 16px;padding:10px 12px;background:#FFF0EE;color:#B42318;border-radius:8px; }
.ozon-dev-filter-list { max-height:280px;overflow:auto; }
.ozon-dev-filter-list .ozon-ext-combo-item { white-space:normal;text-align:left;height:auto;overflow-wrap:anywhere; }
#ozon-structure-root .ozon-dev-sprints, #ozon-structure-root .ozon-dev-epic-filter-sidebar { min-width:0!important;transform:none!important;position:fixed!important;top:0!important;right:0!important;left:auto!important;bottom:0!important;width:min(560px,100vw)!important;max-width:100vw!important;height:100vh!important;max-height:100vh!important;z-index:2147483001!important;border-radius:0!important;padding:20px!important;display:flex!important;flex-direction:column!important;gap:8px;box-sizing:border-box;box-shadow:-8px 0 28px #07102633!important; }
#ozon-structure-root .ozon-dev-epic-filter-sidebar .ozon-dev-filter-list { flex:1;min-height:0;max-height:none;overflow:auto;scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
#ozon-structure-root .ozon-dev-sprints .ozon-dev-sprint-list { flex:1;min-height:0;max-height:none;overflow:auto;scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
#ozon-structure-root .ozon-dev-epic-filter-sidebar .ozon-dev-filter-list .ozon-ext-combo-item:has(.ozon-dev-option-title) { display:grid!important;grid-template-columns:max-content max-content minmax(0,1fr);gap:4px 8px!important;align-items:center;padding:9px 10px!important; }
#ozon-structure-root .ozon-dev-epic-filter-sidebar .ozon-dev-option-title { grid-column:1 / -1;white-space:normal;overflow-wrap:anywhere;line-height:1.4; }
#ozon-structure-root .ozon-dev-epic-filter-sidebar .ozon-dev-option-components { justify-self:start;padding:2px 6px;border-radius:5px;background:#F1F5F9;color:#52647A;font-size:10.5px; }
#ozon-structure-root .ozon-dev-epic-filter-sidebar .ozon-ext-badge { justify-self:start;width:max-content; }
#ozon-structure-root .ozon-dev-filter-list .ozon-ext-combo-item { white-space:normal!important;overflow-wrap:anywhere;height:auto!important; }
#ozon-structure-root .ozon-dev-controls .ozon-dev-popover { max-width:calc(100vw - 24px)!important; }
#ozon-structure-root aside.ozon-dev-editor { position:fixed!important;top:50%!important;left:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(980px,calc(100vw - 32px))!important;min-width:0!important;max-width:calc(100vw - 32px)!important;max-height:84vh!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;z-index:10100!important;box-sizing:border-box!important; }
#ozon-structure-root aside.ozon-dev-editor { top:0!important;right:0!important;bottom:0!important;left:auto!important;transform:none!important;width:min(560px,100vw)!important;max-height:100vh!important;height:100vh!important;border-radius:0!important;padding:20px!important;box-shadow:-8px 0 28px #07102633!important; }
#ozon-structure-root aside.ozon-dev-editor { z-index:2147483001!important; }
#ozon-structure-root .ozon-dev-editor-options { flex:1;max-height:none;min-height:0; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) .ozon-dev-editor-head { order:0; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) .ozon-dev-link-sprint-picker { order:1; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) #ozon-dev-editor-search { order:2; margin-top:8px; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) #ozon-dev-editor-message { order:3; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) .ozon-dev-menu-hint { order:4; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) #ozon-dev-editor-results { order:5; }
#ozon-structure-root .ozon-dev-editor:has(.ozon-dev-link-sprint-picker) #ozon-dev-editor-busy { order:6; }
#ozon-structure-root .ozon-dev-link-sprint-picker .ozon-dev-editor-options { max-height:220px; flex:none; }

#ozon-structure-root .ozon-dev-editor-options .ozon-ext-combo-item { display:flex;align-items:center;gap:7px;padding:7px 8px!important; }
#ozon-structure-root .ozon-dev-editor-options .ozon-mono,#ozon-structure-root .ozon-dev-editor-options .ozon-ext-badge { flex:0 0 auto;white-space:nowrap!important; }
#ozon-structure-root .ozon-dev-option-title { flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap!important; }
#ozon-structure-root .ozon-dev-editor-options .ozon-ext-combo-item { flex-wrap:nowrap; }
#ozon-structure-root .ozon-dev-epic-options .ozon-ext-combo-item:has(.ozon-dev-option-title) { display:grid!important;grid-template-columns:max-content max-content minmax(0,1fr);gap:4px 8px!important;align-items:center!important;padding:9px 10px!important; }
#ozon-structure-root .ozon-dev-epic-options .ozon-ext-combo-item > .ozon-ext-badge { justify-self:start;align-self:center;width:max-content; }
#ozon-structure-root .ozon-dev-epic-options .ozon-dev-option-title { grid-column:1 / -1;white-space:normal!important;overflow:visible!important;overflow-wrap:anywhere;line-height:1.4; }
#ozon-structure-root .ozon-dev-epic-options .ozon-dev-option-components { grid-column:3;grid-row:1;justify-self:start;align-self:center;max-width:100%;padding:2px 6px;border-radius:5px;background:#F1F5F9;color:#52647A;font-size:10.5px;white-space:normal;overflow-wrap:anywhere; }
#ozon-structure-root .ozon-dev-team-option { display:grid!important;grid-template-columns:16px minmax(0,1fr)!important;align-items:center;gap:9px;min-height:34px;padding:6px 10px;border-bottom:1px solid #EEF2F6;color:#071026;cursor:pointer;box-sizing:border-box;width:100%; }
#ozon-structure-root .ozon-dev-team-option:hover { background:#F1F6FF; }
#ozon-structure-root .ozon-dev-team-option>input[type="checkbox"] { display:block!important;width:16px!important;min-width:16px!important;max-width:16px!important;height:16px!important;margin:0!important;padding:0!important;justify-self:start;flex:none!important; }
#ozon-structure-root .ozon-dev-team-name { display:block;min-width:0;width:100%;color:#071026!important;font-size:12px!important;line-height:18px!important;white-space:nowrap!important; }
#ozon-structure-root #ozon-dev-editor-search,#ozon-structure-root #ozon-dev-link-sprint-search { direction:ltr;text-align:left; }

.ozon-dev-editor-head { display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px; }
.ozon-dev-editor-options { max-height:min(480px,60vh);overflow:auto;overscroll-behavior:contain;margin-top:6px; }
#ozon-structure-root .ozon-dev-editor-options button { width:100%;border:0;background:transparent;text-align:left;white-space:normal!important;height:auto!important;font:400 11.5px var(--ozon-font-sans); }
#ozon-structure-root .ozon-strategy-editor-options button.ozon-ext-combo-item {appearance:none!important;border:0!important;box-shadow:none!important;background:transparent!important;color:#071026!important;cursor:pointer!important;}
#ozon-structure-root .ozon-strategy-editor-options button.ozon-ext-combo-item:hover,#ozon-structure-root .ozon-strategy-editor-options button.ozon-ext-combo-item:focus-visible {background:#E5F0FF!important;color:#005BFF!important;}
#ozon-structure-root .ozon-strategy-editor-options button.ozon-ext-combo-item.active {background:#E5F0FF!important;color:#005BFF!important;box-shadow:inset 3px 0 #005bff!important;font-weight:600;}
#ozon-structure-root .ozon-strategy-editor-options .ozon-strategy-theme-option {border-left:2px solid #dbe7f6!important;border-radius:0!important;}
#ozon-structure-root .ozon-strategy-theme-list {overflow-x:hidden}
.ozon-strategy-theme-row {display:grid;grid-template-columns:20px minmax(0,1fr);gap:5px;align-items:start;margin-bottom:4px}
#ozon-structure-root .ozon-strategy-theme-list .ozon-strategy-theme-toggle {width:20px;min-height:24px;margin-top:6px;border-radius:5px;padding:0;text-align:center;color:#005bff;background:#eef4ff;cursor:pointer}
#ozon-structure-root .ozon-strategy-theme-list button.ozon-strategy-theme-option {display:grid!important;grid-template-columns:minmax(0,1fr);justify-content:stretch;min-width:0;gap:4px;padding:7px 9px!important}
.ozon-strategy-theme-meta {display:flex;align-items:center;flex-wrap:wrap;gap:5px}
.ozon-strategy-theme-title {font-weight:600;overflow-wrap:anywhere}
.ozon-strategy-theme-components {color:#52647d;font-size:11px;overflow-wrap:anywhere}
#ozon-strategy-create-form {display:grid;gap:7px;min-width:0}
.ozon-strategy-create-form label,.ozon-strategy-create-label {font-weight:600;color:#334155}
#ozon-structure-root .ozon-strategy-create-form input {width:100%;min-width:0;min-height:34px;padding:7px 10px;border:1px solid #d5e0ef;border-radius:8px;background:#fff;color:#071026;font:inherit}
#ozon-structure-root .ozon-strategy-create-form :is(input,summary):focus-visible {outline:2px solid #005bff;outline-offset:1px}
.ozon-strategy-create-label {margin-top:7px}
.ozon-strategy-create-picker > summary {display:flex;width:100%;list-style:none}
.ozon-strategy-create-picker > summary::-webkit-details-marker {display:none}
.ozon-strategy-create-picker[open] .ozon-ext-toolbar-chevron {transform:rotate(180deg)}
.ozon-strategy-create-options {margin-top:5px;padding:6px;border:1px solid #dce5f0;border-radius:8px;background:#f8fafd}
#ozon-structure-root .ozon-strategy-create-list {max-height:min(220px,38vh);flex:none}
#ozon-structure-root .ozon-strategy-create-list [hidden] {display:none!important}
#ozon-structure-root .ozon-strategy-create-list button[aria-pressed="true"] {background:#e5f0ff!important;color:#005bff!important}
.ozon-strategy-create-list p {color:#52647d;margin:6px}
.ozon-strategy-create-actions {display:flex;justify-content:flex-end;gap:8px;margin-top:8px}
.ozon-dev-cell-edit { display:flex!important;align-items:center;gap:5px;width:100%;max-width:100%;min-width:0;cursor:pointer;border-radius:6px; }
.ozon-dev-cell-edit:hover { background:#E5F0FF; }
.ozon-dev-cell-edit>.ozon-ext-toolbar-chevron { flex-shrink:0;margin-left:auto; }
.ozon-dev-cell-edit>.ozon-dev-epic-inline { flex:1;min-width:0; }
.ozon-dev-stream-edit { display:inline-flex!important;align-items:center;gap:8px;border:1px solid #DCE3EB!important;border-radius:6px;padding:1px 6px!important;color:#005BFF!important;background:#fff!important;font-size:10px!important;flex-shrink:0; }
.ozon-dev-stream-edit.is-empty { color:#D92D20!important;border-color:#F5B8B3!important;background:#FFF3F2!important; }
.ozon-dev-stream-edit.is-empty .ozon-ext-toolbar-chevron { border-color:#D92D20!important; }
.ozon-dev-header-settings { display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-left:4px;padding:0;border:0;border-radius:6px;background:transparent;color:#708198;cursor:pointer;vertical-align:middle; }
.ozon-dev-header-settings:hover,.ozon-dev-header-settings:focus-visible { color:#005BFF;background:#E5F0FF; }
.ozon-dev-group-option { display:flex;align-items:center;gap:6px;padding:6px 0; }
.ozon-dev-group-option label { display:flex;align-items:center;gap:8px;flex:1; }
.ozon-dev-menu-hint { color:#64748B;font-size:11px;margin:4px 0 8px; }
.ozon-dev-epic-inline,.ozon-dev-task-key,.ozon-dev-task-title,.ozon-dev-indicators { display:flex;align-items:center;gap:5px;min-width:0; }
.ozon-dev-epic-inline { width:100%; }
.ozon-dev-epic-inline a,.ozon-dev-epic-inline .ozon-ext-badge,.ozon-dev-task-key a { flex-shrink:0;white-space:nowrap!important; }
.ozon-dev-ellipsis { min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.ozon-dev-task-title>.ozon-dev-ellipsis { flex:1; }
.ozon-dev-indicators,.ozon-dev-priority { flex-shrink:0; }
.ozon-dev-indicator { display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:6px;flex-shrink:0; }
.ozon-dev-indicator.absent { color:#94A3B8;background:#F1F5F9; }
.ozon-dev-indicator.done { color:#039855;background:#DCFCE7; }
.ozon-dev-indicator.active { color:#005BFF;background:#E5F0FF; }
.ozon-dev-indicator.missing { color:#D92D20;background:#FFF0EE; }
#ozon-structure-root .ozon-ext-ip-table-row > .ozon-ext-ip-table-secondary[hidden] { display:none!important; }
.ozon-dev-table { width:100%;min-width:1985px;border-collapse:collapse;table-layout:fixed;font:400 11.5px var(--ozon-font-sans); }
.ozon-dev-table th { position:sticky;top:0;z-index:2;background:#F1F5F9;text-align:left;font-size:11px;color:#475569;height:30px; }
.ozon-dev-table th,.ozon-dev-table td { border-bottom:1px solid #E2E8F0;border-right:1px solid #EEF2F6;padding:0 6px;vertical-align:middle;white-space:nowrap;height:28px;overflow:hidden;text-overflow:ellipsis; }
.ozon-dev-table [data-column="key"] { position:sticky;left:0;box-shadow:2px 0 4px #07102614; }
.ozon-dev-table tbody td[data-column="key"] { z-index:1; }
.ozon-dev-table :where(tbody) :where(td[data-column="key"]) { background:#fff; }
.ozon-dev-table tfoot td[data-column="key"] { z-index:4; }
.ozon-dev-table thead th[data-column="key"] { z-index:5; }
.ozon-dev-table td>div { max-width:100%;overflow:hidden; }
.ozon-dev-table .ozon-ext-badge { white-space:nowrap; }
.ozon-dev-table .ozon-dev-sprint td { background:#F8FAFC;font-weight:600;height:30px;padding:4px 10px; }
.ozon-dev-table .ozon-dev-group-line { display:flex;align-items:center;gap:6px;min-height:22px; }
.ozon-dev-table .ozon-dev-group .ozon-ext-badge { flex-shrink:0; }
.ozon-dev-table .ozon-dev-group .ozon-ext-status-summary { flex-wrap:nowrap; }
.ozon-dev-table .ozon-dev-epic td { background:#FAFBFD;font-size:11px;height:26px; }
.ozon-dev-table .ozon-dev-completed td { background:#EFFBF3; }
.ozon-dev-table .ozon-dev-no-epic td { background:#FFF1F0; }
.ozon-dev-table .ozon-dev-project td { background:#FAFBFD;font-weight:600;height:26px; }
.ozon-dev-table .ozon-dev-related td { background:#F8FAFC;font-size:11px;height:28px; }
.ozon-dev-table [data-dev-row] { cursor:pointer;transition:background-color 110ms ease; }
.ozon-dev-table .ozon-dev-group:hover>td { background:#F1F5F9; }
.ozon-dev-table .ozon-dev-task:hover>td { background:#F2F4F8; }
.ozon-dev-table .ozon-dev-completed:hover>td { background:#E0F5E8; }
.ozon-dev-table .ozon-dev-no-epic:hover>td { background:#FFE4E2; }
.ozon-dev-table .ozon-dev-group .ozon-ext-status-summary { margin-left:10px;font-weight:400; }
.ozon-dev-table .ozon-dev-link-toggle { width:16px;flex-shrink:0;color:#005BFF; }
.ozon-dev-table button { border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:0 5px 0 0;text-align:left; }
#ozon-structure-root .ozon-dev-table .ozon-dev-link-toggle[aria-expanded="true"] { box-shadow:none!important;border-color:transparent!important; }
.ozon-dev-sprint .ozon-ext-group-total { margin-left:10px; }
.ozon-dev-points { font-variant-numeric:tabular-nums; }
.ozon-ext-group-total { color:#64748B;font-size:10px;font-weight:400;white-space:nowrap; }
.ozon-ext-table-epic-line { display:flex;align-items:center;gap:5px;min-width:0;font-size:10px; }
.ozon-ext-table-epic-line a { color:#005BFF;text-decoration:none;flex-shrink:0; }
.ozon-ext-table-epic-line .ozon-ext-badge { flex:0 0 auto!important;max-width:none!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap;font-size:9px;padding:0 4px; }
.ozon-ext-table-epic-line .epic-title { flex:1 1 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0; }
#ozon-structure-root .ozon-ext-cell-combo-trigger[data-action="open-table-epic-combo"] { border:0!important;box-shadow:none!important;background:transparent!important;border-radius:6px!important;padding:0 4px!important; }
#ozon-structure-root .ozon-ext-cell-combo-trigger[data-action="open-table-epic-combo"]:hover { background:#E5F0FF!important; }
.ozon-ext-epic-project-tag { flex-shrink:0;color:#64748B;border:1px solid #E2E8F0;border-radius:4px;padding:0 3px;font-size:9px;line-height:16px; }
.ozon-ext-sprint-row > td > div > div:first-child,.ozon-ext-comp-group-row > td > div > div:first-child { flex-wrap:wrap;min-width:0; }

.ozon-ext-task-row:hover:not(:has(.ozon-ext-inner-ctrl:hover)) {
  background: #F2F4F8 !important;
}

#ozon-structure-root tr.ozon-details-source > td { background-color:#E3EFFF!important; }
#ozon-structure-root tr.ozon-details-source > td:first-child { box-shadow:inset 3px 0 #005BFF; }

.ozon-ext-task-row td {
  padding: 0 6px !important;
  height: 28px !important;
  max-height: 28px !important;
  line-height: 28px !important;
  border-right: 1px solid #EEF2F6 !important;
  white-space: nowrap !important;
  overflow: visible !important;
  font-size: 11.5px !important;
  vertical-align: middle !important;
  color: #071026 !important;
  position: relative;
}

.ozon-ext-cell-singleline {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  height: 26px !important;
  max-height: 26px !important;
  width: 100% !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
}

.ozon-ext-subrow {
  background: #FAFBFD !important;
  border-bottom: 1px solid #E2E8F0 !important;
  height: 28px !important;
  max-height: 28px !important;
}

.ozon-ext-subrow:hover {
  background: #F1F5F9 !important;
}

.ozon-ext-subrow td {
  padding: 0 6px !important;
  height: 28px !important;
  max-height: 28px !important;
  line-height: 28px !important;
  border-right: 1px solid #EEF2F6 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-size: 11px !important;
  vertical-align: middle !important;
  color: #334155 !important;
}

/* Нейтральный тег типа связи («Задача проекта» / «В проекте»), чтобы не путать со статусами */
.ozon-ext-link-type-tag {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 0 6px !important;
  height: 18px !important;
  line-height: 16px !important;
  border-radius: 4px !important;
  background: #F8FAFC !important;
  color: #64748B !important;
  border: 1px solid #CBD5E1 !important;
  font-size: 9.5px !important;
  font-weight: 600 !important;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
}

.ozon-ext-inline-select {
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  background-image: none !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 22px !important;
  line-height: 20px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  color: #071026 !important;
  background-color: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 5px !important;
  padding: 0 4px !important;
  cursor: pointer !important;
  outline: none !important;
  box-shadow: none !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ozon-ext-inline-select.comp-bold {
  font-weight: 600 !important;
  color: #071026 !important;
}

.ozon-ext-inline-select.sprint-muted {
  color: #475569 !important;
  font-variant-numeric: tabular-nums !important;
}

.ozon-ext-inline-select:hover {
  background-color: rgba(0, 91, 255, 0.08) !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23005BFF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 4px center !important;
  padding-right: 16px !important;
  border-color: rgba(0, 91, 255, 0.25) !important;
  color: #005BFF !important;
}

/* Ячейка с кликабельным Input-Select Popover в таблице */
.ozon-ext-cell-combo-trigger {
  position: relative !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 5px !important;
  width: 100% !important;
  height: 22px !important;
  line-height: 20px !important;
  padding: 0 5px !important;
  border-radius: 5px !important;
  border: 1px solid transparent !important;
  overflow: visible !important;
  white-space: nowrap !important;
  cursor: pointer !important;
}

.ozon-ext-cell-combo-trigger:hover {
  background-color: rgba(0, 91, 255, 0.08) !important;
  border-color: rgba(0, 91, 255, 0.25) !important;
}

/* Кнопка открытия сайдбара деталей задачи в строке списка */
.ozon-ext-open-sb-btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 3px !important;
  height: 19px !important;
  line-height: 17px !important;
  padding: 0 6px !important;
  margin-left: auto !important;
  border-radius: 5px !important;
  border: 1px solid #CBD5E1 !important;
  background: #F8FAFC !important;
  color: #005BFF !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
  transition: all 100ms ease !important;
}

.ozon-ext-open-sb-btn:hover {
  background: #E5F0FF !important;
  border-color: #005BFF !important;
}

#ozon-structure-root [data-details-trigger][aria-expanded="true"] {
  background: #005BFF !important;
  border-color: #005BFF !important;
  color: #FFFFFF !important;
}

/* Всплывающий Input-Select Popover для ячеек таблицы и полей сайдбара */
.ozon-ext-combo-popover {
  position: absolute !important;
  top: calc(100% + 4px) !important;
  left: 0 !important;
  z-index: 99999 !important;
  width: 340px !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 10px !important;
  box-shadow: 0 12px 32px rgba(7, 16, 38, 0.18) !important;
  padding: 8px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  line-height: 1.4 !important;
  white-space: normal !important;
}

.ozon-ext-combo-popover input:is([type="text"],[type="search"]) {
  width: 100% !important;
  height: 30px !important;
  padding: 5px 10px !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  margin: 0 !important;
  background: #F8FAFC !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 7px !important;
  outline: none !important;
  box-shadow: none !important;
}

.ozon-ext-combo-popover input:is([type="text"],[type="search"]):focus {
  background: #FFFFFF !important;
  border-color: #005BFF !important;
  box-shadow: 0 0 0 2px rgba(0, 91, 255, 0.15) !important;
  outline: none !important;
}

.ozon-ext-combo-list {
  max-height: 235px !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  padding: 2px 2px 2px 0 !important;
}

.ozon-ext-combo-item {
  padding: 6px 10px !important;
  min-height: 28px !important;
  line-height: 18px !important;
  border-radius: 6px !important;
  font-size: 11.5px !important;
  color: #071026 !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-shrink: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ozon-ext-combo-item:hover,
.ozon-ext-combo-item.active {
  background: #E5F0FF !important;
  color: #005BFF !important;
}

/* Input-Select в сайдбаре */
.ozon-ext-sb-combo {
  position: relative !important;
  width: 100% !important;
}

.ozon-ext-sb-combo-trigger {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 6px !important;
  width: 100% !important;
  min-height: 28px !important;
  padding: 4px 10px !important;
  background: #F8FAFC !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  line-height: 1.35 !important;
  cursor: pointer !important;
}

.ozon-ext-sb-combo-trigger:hover {
  border-color: #005BFF !important;
  background: #FFFFFF !important;
}

.ozon-ext-sb-combo-dropdown {
  max-height: 185px !important;
  overflow-y: auto !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 8px !important;
  margin-top: 4px !important;
  box-shadow: 0 6px 18px rgba(7, 16, 38, 0.1) !important;
}

.ozon-ext-inline-input {
  width: 100% !important;
  height: 22px !important;
  line-height: 20px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #004ED6 !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 5px !important;
  padding: 0 4px !important;
  outline: none !important;
  box-shadow: none !important;
  text-overflow: ellipsis !important;
}

.ozon-ext-inline-input.is-empty {
  color: #94A3B8 !important;
  font-weight: 400 !important;
}

.ozon-ext-inline-input:hover {
  background: rgba(0, 91, 255, 0.08) !important;
  border-color: rgba(0, 91, 255, 0.25) !important;
  color: #071026 !important;
}

.ozon-ext-inline-input:focus {
  background: #FFFFFF !important;
  border-color: #005BFF !important;
  color: #071026 !important;
  font-weight: 500 !important;
}

.ozon-ext-status-select {
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 20px !important;
  line-height: 18px !important;
  font-size: 10.5px !important;
  font-weight: 600 !important;
  border-radius: 5px !important;
  padding: 0 14px 0 6px !important;
  cursor: pointer !important;
  outline: none !important;
  border: 1px solid transparent !important;
  background-repeat: no-repeat !important;
  background-position: right 4px center !important;
  text-overflow: ellipsis !important;
}

.ozon-ext-status-select option {
  background-color: #FFFFFF !important;
  color: #071026 !important;
  font-weight: 500 !important;
}

.ozon-ext-status-select.status-progress {
  background-color: #E5F0FF !important;
  color: #005BFF !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%23005BFF' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
}

.ozon-ext-status-select.status-done {
  background-color: #DCFCE7 !important;
  color: #15803D !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%2315803D' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
}

.ozon-ext-status-select.status-review {
  background-color: #FEF3C7 !important;
  color: #B45309 !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%23B45309' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
}

.ozon-ext-status-select.status-todo {
  background-color: #F1F5F9 !important;
  color: #475569 !important;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
}

.ozon-ext-status-select:hover {
  border-color: rgba(0, 91, 255, 0.4) !important;
}

.ozon-ext-more-links-pill {
  display: inline-flex !important;
  align-items: center !important;
  padding: 0 5px !important;
  height: 17px !important;
  line-height: 17px !important;
  border-radius: 4px !important;
  background: #E5F0FF !important;
  color: #005BFF !important;
  font-family: var(--ozon-font-mono) !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  border: none !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
}

.ozon-ext-more-links-pill:hover {
  background: #D0E3FF !important;
}

.ozon-ext-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 10px;
  height: 26px;
  background-color: #E5F0FF;
  color: #005BFF;
  font-size: 11px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
  text-decoration: none;
  white-space: nowrap;
}

.ozon-ext-btn:hover {
  background-color: #D0E3FF;
}

.ozon-ext-btn-surface {
  background-color: #F2F4F8;
  color: #071026;
}

.ozon-ext-btn-surface:hover {
  background-color: #E2E8F0;
}

.ozon-ext-btn-negative {
  background-color: #FBECE9;
  color: #D9381E;
}

.ozon-ext-btn-negative:hover {
  background-color: #F7D8D2;
}

.ozon-ext-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 3px 11px;
  border: 1px solid #DCE4F0;
  border-radius: 999px;
  background: #FFFFFF;
  color: #005BFF;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.ozon-ext-status-chip:hover {
  border-color: #93C5FD;
  background: #F4F8FF;
}

.ozon-ext-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
}

.ozon-ext-badge-progress {
  background: #E5F0FF;
  color: #005BFF;
}

.ozon-ext-badge-done {
  background: #DCFCE7;
  color: #15803D;
}

.ozon-ext-badge-todo {
  background: #F1F5F9;
  color: #475569;
}

.ozon-ext-badge-review {
  background: #FEF3C7;
  color: #B45309;
}

.ozon-ext-badge-critical {
  background: #FEE2E2;
  color: #DC2626;
}

.ozon-ext-resizer-bar {
  width: 6px;
  background: #E2E8F0;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  z-index: 25;
  transition: background-color 120ms ease;
}

.ozon-ext-resizer-bar:hover,
.ozon-ext-resizer-bar.active {
  background: #005BFF;
}

.ozon-ext-sidebar {
  background: #FFFFFF !important;
  border-left: 1px solid #E2E8F0 !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  overflow-y: auto !important;
  overflow-anchor: none !important;
  flex-shrink: 0 !important;
  box-shadow: -4px 0 16px rgba(7, 16, 38, 0.05) !important;
}
#ozon-structure-root #ozon-ext-sidebar-panel { position:fixed!important;right:0!important;top:0!important;bottom:0!important;height:100vh!important;max-height:100vh!important;z-index:100000!important;box-sizing:border-box; }
#ozon-structure-root #ozon-ext-sidebar-resizer { position:fixed!important;top:0;bottom:0;height:100vh;z-index:100001;touch-action:none; }
#ozon-structure-root #ozon-ext-sidebar-resizer[hidden] {display:none!important}

.ozon-ext-sidebar-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ozon-ext-sidebar-body {
  padding: 12px 14px 28px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ozon-ext-field-grid {
  display: grid;
  grid-template-columns: 118px 1fr;
  gap: 8px 10px;
  align-items: start;
  font-size: 12px;
}

.ozon-ext-field-label {
  color: #64748B;
  font-size: 11.5px;
  font-weight: 600;
  padding-top: 5px;
}

.ozon-ext-sidebar select {
  width: 100%;
  background-color: #F8FAFC !important;
  color: #071026 !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 8px !important;
  padding: 4px 8px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  outline: none !important;
  cursor: pointer !important;
}

.ozon-ext-sidebar select:focus {
  border-color: #005BFF !important;
  background-color: #FFFFFF !important;
}

.ozon-ext-section-card {
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  background: #FFFFFF;
  overflow: visible;
}

.ozon-ext-section-head {
  box-sizing: border-box;
  min-height: 40px;
  padding: 8px 12px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: #071026;
  cursor: pointer;
  user-select: none;
  transition: background-color 110ms ease;
}

.ozon-ext-section-head:hover {
  background: #F1F5F9;
}

.ozon-ext-section-head.collapsed {
  border-bottom: none;
  border-radius: 10px;
}
#ozon-structure-root .ozon-sb-description-preview.is-compact {max-height:132px;overflow:hidden;position:relative}
#ozon-structure-root .ozon-sb-description-preview.is-compact::after {content:'';position:absolute;left:0;right:0;bottom:0;height:24px;background:linear-gradient(transparent,#fff);pointer-events:none}
#ozon-structure-root .ozon-sb-description-more {margin:0 12px 10px}
#ozon-structure-root .ozon-sb-link-add {height:24px;padding:2px 8px;font-size:10px;white-space:nowrap}
.ozon-sb-comments:not([open]) > summary {border-bottom:0;border-radius:10px}
.ozon-sb-comments > summary {list-style:none}
.ozon-sb-comments > summary::-webkit-details-marker {display:none}
.ozon-sb-comments > summary:focus-visible {outline:2px solid #005BFF;outline-offset:-2px}
.ozon-sb-comments-heading,.ozon-sb-comments-loading {display:flex;align-items:center;gap:6px}
.ozon-sb-comments:not([open]) .ozon-ext-toolbar-chevron {transform:rotate(-90deg)}
.ozon-sb-comments-heading [data-comments-count] {color:#576a82}
.ozon-sb-comments-heading [data-comments-count]:empty {display:none}
.ozon-sb-comments-content {display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px 12px;font-size:12px;color:#576a82}
.ozon-sb-comments-content > p {margin:0}
.ozon-sb-comment-list {list-style:none;width:100%;padding:0;margin:0}
.ozon-sb-comment-list > li {padding:10px 0;border-bottom:1px solid #E2E8F0}
.ozon-sb-comment-list > li:first-child {padding-top:0}
.ozon-sb-comment-list > li:last-child {padding-bottom:0;border-bottom:0}
.ozon-sb-comment-meta {display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px}
.ozon-sb-comment-meta > .ozon-person-line {min-width:0;color:#071026;font-weight:600}
.ozon-sb-comment-meta time {font-size:11px}
.ozon-sb-comment-body {margin-top:5px;color:#071026;line-height:1.5;overflow-wrap:anywhere}
.ozon-sb-comment-body :is(p,ul,ol,h3) {margin:0 0 4px}
.ozon-sb-comment-body > :last-child {margin-bottom:0}

/* Форматированное описание задачи (Jira Wiki / Markdown) */
.ozon-ext-desc-rendered {
  font-size: 12px !important;
  line-height: 1.52 !important;
  color: #071026 !important;
  word-break: break-word !important;
}

.ozon-ext-desc-rendered .ozon-desc-heading {
  font-size: 12.5px !important;
  font-weight: 700 !important;
  color: #071026 !important;
  margin: 10px 0 4px 0 !important;
  padding-bottom: 2px !important;
  border-bottom: 1px solid #EEF2F6 !important;
}

.ozon-ext-desc-rendered .ozon-desc-heading:first-child {
  margin-top: 0 !important;
}

.ozon-ext-desc-rendered .ozon-desc-p {
  margin: 0 0 6px 0 !important;
  color: #1E293B !important;
}

.ozon-ext-desc-rendered .ozon-desc-li {
  display: flex !important;
  align-items: flex-start !important;
  gap: 6px !important;
  margin: 2px 0 3px 4px !important;
  color: #1E293B !important;
}

.ozon-ext-desc-rendered .ozon-desc-bullet {
  color: #005BFF !important;
  font-weight: 700 !important;
  flex-shrink: 0 !important;
}

.ozon-ext-desc-rendered .ozon-desc-num {
  color: #005BFF !important;
  font-family: var(--ozon-font-mono) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  min-width: 16px !important;
  flex-shrink: 0 !important;
}

.ozon-ext-desc-rendered .ozon-desc-hr {
  border: none !important;
  border-top: 1px solid #E2E8F0 !important;
  margin: 8px 0 !important;
}

.ozon-ext-desc-rendered .ozon-desc-code {
  background: #F8FAFC !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 6px !important;
  padding: 6px 8px !important;
  margin: 6px 0 !important;
  font-family: var(--ozon-font-mono) !important;
  font-size: 11px !important;
  overflow-x: auto !important;
  white-space: pre-wrap !important;
  color: #0F172A !important;
}

.ozon-ext-desc-rendered .ozon-desc-inline-code {
  background: #F1F5F9 !important;
  border: 1px solid #E2E8F0 !important;
  border-radius: 4px !important;
  padding: 1px 4px !important;
  font-family: var(--ozon-font-mono) !important;
  font-size: 11px !important;
  color: #0F172A !important;
}

.ozon-ext-desc-rendered .ozon-desc-quote {
  border-left: 3px solid #005BFF !important;
  background: #F8FAFC !important;
  padding: 5px 10px !important;
  margin: 6px 0 !important;
  color: #334155 !important;
  border-radius: 0 6px 6px 0 !important;
}

.ozon-ext-desc-rendered .ozon-desc-issue-pill {
  display: inline-flex !important;
  align-items: center !important;
  gap: 3px !important;
  padding: 0 5px !important;
  border-radius: 4px !important;
  background: #E5F0FF !important;
  color: #005BFF !important;
  font-family: var(--ozon-font-mono) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-decoration: none !important;
}

.ozon-ext-desc-rendered .ozon-desc-issue-pill:hover {
  background: #D0E3FF !important;
  text-decoration: underline !important;
}

.ozon-ext-desc-rendered .ozon-desc-link {
  color: #005BFF !important;
  text-decoration: none !important;
  font-weight: 500 !important;
}

.ozon-ext-desc-rendered .ozon-desc-link:hover {
  text-decoration: underline !important;
}

/* Компактная строка связанной задачи с иконкой и чёткой лесенкой вложенности (Уровень 1 → 2 → 3 → 4) */
.ozon-ext-link-group-header {
  padding: 5px 12px 5px 26px !important;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  border-left: 3px solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
}

.ozon-ext-link-group-header:hover {
  background: #F1F5F9;
}

.ozon-ext-link-compact-row {
  padding: 6px 12px 6px 42px !important;
  border-bottom: 1px solid #EEF2F6;
  border-left: 3px solid #E2E8F0;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ozon-ext-link-compact-row.ozon-ext-pt-level2 {
  padding: 6px 12px 6px 26px !important;
  border-left: 3px solid #CBD5E1;
}

.ozon-ext-sidebar { scrollbar-width:thin!important; scrollbar-color:#a8b5c5 transparent!important; container-type:inline-size; }
.ozon-ext-ip-row .ozon-ext-ip-fields { display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px!important;padding-left:22px!important;align-items:center;margin-top:6px; }
.ozon-ext-ip-row .ozon-ext-sb-combo-trigger > span:first-child { white-space:normal!important;overflow-wrap:anywhere; }
.ozon-ip-column-resizer { position:absolute;right:0;top:0;bottom:0;width:7px;cursor:col-resize;touch-action:none; }
.ozon-ext-ip-table-head>span { position:relative; }
#ozon-structure-root .ozon-dev-table button.ozon-ext-btn { border:1px solid #D5E0EF;background:#fff;color:#005BFF;border-radius:8px;padding:4px 10px;font:500 11px var(--ozon-font-body,sans-serif);min-height:26px;text-align:center; }
#ozon-structure-root .ozon-ext-search-select-caret,#ozon-structure-root .ozon-ext-toolbar-chevron { width:18px;min-width:18px;height:18px; }
#ozon-structure-root .ozon-ext-sb-combo svg { width:16px;min-width:16px;height:16px; }
.ozon-ext-product-settings { position:fixed!important;top:0!important;right:0!important;bottom:0!important;left:auto!important;width:390px!important;max-width:100vw!important;height:100vh!important;z-index:2147483645!important;box-sizing:border-box!important;display:flex!important;flex-direction:column;gap:16px;padding:20px;background:#fff;box-shadow:-8px 0 32px #07102620;overflow:auto; }
.ozon-ext-product-settings .ozon-ext-toolbar-combo { width:100%; }
.ozon-ext-product-settings .ozon-ext-toolbar-trigger { width:100%; }
.ozon-dev-settings { position:fixed;right:0;top:0;bottom:0;width:390px;max-width:100vw;background:#fff;box-shadow:-8px 0 32px #07102620;z-index:2147483645;display:flex;flex-direction:column;padding:20px;gap:16px;overflow:auto;animation:ozon-settings-enter .18s ease-out; }
.ozon-dev-settings footer { margin-top:auto;display:flex;gap:8px;position:sticky;bottom:-20px;background:#fff;padding:12px 0; }
.ozon-dev-settings .ozon-dev-group-option { display:flex;align-items:center;gap:8px;min-height:34px; }
.ozon-dev-settings .ozon-dev-group-option label,.ozon-dev-settings .ozon-dev-column-label { flex:1; }
.ozon-dev-settings select { width:100%;height:32px;border:1px solid #D5E0EF;border-radius:8px;padding:0 10px;color:#071026;background:#fff;font:inherit; }
#ozon-structure-root .ozon-dev-settings .ozon-ext-combo-popover { padding:6px!important;background:#fff!important;border:1px solid #dbe4ef!important;border-radius:10px!important;box-shadow:0 8px 24px #0710261c!important; }
#ozon-structure-root .ozon-dev-settings .ozon-ext-combo-popover button.ozon-ext-combo-item { appearance:none!important;display:block!important;width:100%!important;min-height:32px!important;height:auto!important;padding:7px 10px!important;border:0!important;border-radius:6px!important;background:transparent!important;box-shadow:none!important;color:#071026!important;text-align:left!important;font:400 12px var(--ozon-font-sans)!important;cursor:pointer; }
#ozon-structure-root .ozon-dev-settings .ozon-ext-combo-popover button.ozon-ext-combo-item:hover,#ozon-structure-root .ozon-dev-settings .ozon-ext-combo-popover button.ozon-ext-combo-item:focus-visible,#ozon-structure-root .ozon-dev-settings .ozon-ext-combo-popover button.ozon-ext-combo-item.active { background:#E5F0FF!important;color:#005BFF!important; }
@keyframes ozon-settings-enter { from { transform:translateX(100%); } to { transform:translateX(0); } }

#ozon-structure-root .ozon-ext-ip-table-row { min-height:36px!important; }
#ozon-structure-root .ozon-ext-ip-table-row>div { height:36px;justify-content:flex-start; }
#ozon-structure-root .ozon-ext-ip-task-cell { justify-content:flex-start!important;gap:5px!important;flex-wrap:nowrap!important; }
#ozon-structure-root .ozon-ext-ip-task-cell>.ozon-ext-type-pill,#ozon-structure-root .ozon-ext-ip-task-cell>span[title^="Приоритет"] { flex:0 0 auto!important; }
#ozon-structure-root .ozon-ext-ip-task-cell>.ozon-ip-summary { flex:1 1 auto;min-width:0; }
.ozon-ext-ip-epic-cell { overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }
.ozon-ext-ip-epic-cell a {min-width:0;white-space:normal;overflow-wrap:anywhere}
#ozon-structure-root #ozon-sb-comp-trigger svg,#ozon-structure-root #ozon-sb-epic-trigger svg { width:18px!important;height:18px!important;min-width:18px!important;flex:0 0 18px!important; }
[data-ticket-search-run] { margin-left:8px!important; }
.ozon-dev-settings.ozon-dev-settings-stable { animation:none!important; }


#ozon-structure-root .ozon-dev-team-popover { min-width:240px!important;width:260px!important;max-width:calc(100vw - 24px)!important; }
#ozon-structure-root .ozon-dev-sprint-option { display:flex!important;justify-content:flex-start!important;gap:9px!important;width:100%;box-sizing:border-box; }
#ozon-structure-root .ozon-dev-sprint-option input { width:16px!important;min-width:16px!important;height:16px!important;margin:0!important;flex:0 0 16px!important; }
#ozon-structure-root .ozon-dev-sprint-option>span:not(.ozon-ext-badge) { display:block;min-width:0;flex:1;white-space:normal; }
#ozon-structure-root .ozon-dev-editor,#ozon-structure-root .ozon-dev-editor-options { scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
#ozon-structure-root .ozon-dev-editor::-webkit-scrollbar,#ozon-structure-root .ozon-dev-editor-options::-webkit-scrollbar { width:6px;height:6px; }
#ozon-structure-root .ozon-dev-editor::-webkit-scrollbar-thumb,#ozon-structure-root .ozon-dev-editor-options::-webkit-scrollbar-thumb { background:#A8B5C5;border-radius:8px;border:0; }
#ozon-structure-root .ozon-ext-ip-table-viewport { overflow-x:clip!important;overflow-y:visible;max-width:100%;min-width:0; }
#ozon-structure-root .ozon-ext-ip-table-body { min-width:0!important;width:100%;max-width:100%; }
#ozon-structure-root .ozon-ext-ip-table-head>span { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0; }
#ozon-structure-root .ozon-ext-ip-table-row>div { padding-left:4px;padding-right:4px;overflow:hidden; }
#ozon-structure-root .ozon-ext-ip-table-row>.ozon-ext-sb-combo { overflow:visible; }
#ozon-structure-root .ozon-ext-ip-table-row>:is(.ozon-ext-ip-component-cell,.ozon-ext-ip-sprint-cell) {height:auto;min-height:36px;padding-block:3px;box-sizing:border-box}
#ozon-structure-root .ozon-ext-ip-status-cell .ozon-ext-badge {white-space:normal;overflow-wrap:anywhere}
#ozon-structure-root .ozon-ext-ip-task-cell {flex-wrap:wrap!important;height:auto!important;min-height:36px;gap:3px 5px!important;padding-block:4px}
#ozon-structure-root .ozon-ext-ip-task-cell>.ozon-ip-summary {flex:1 1 100%;min-width:0;white-space:normal!important;overflow-wrap:anywhere;line-height:1.35;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
#ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-ip-table-row { min-height:36px!important; }
#ozon-structure-root .ozon-ext-ip-status-cell .ozon-ext-badge {max-width:100%}
.ozon-ip-status-label {display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-align:left}
#ozon-structure-root .ozon-ext-ip-action-cell { flex-wrap:wrap;gap:2px!important; }
#ozon-structure-root .ozon-link-actions { position:relative;display:inline-flex;flex-shrink:0; }
#ozon-structure-root .ozon-link-actions summary { list-style:none;cursor:pointer;color:#005BFF;padding:2px 6px;border-radius:6px;background:#E5F0FF; }
#ozon-structure-root .ozon-link-actions summary::-webkit-details-marker { display:none; }
#ozon-structure-root .ozon-link-actions-menu { position:fixed;z-index:2147483647;right:20px;min-width:170px;padding:6px;background:white;border:1px solid #D5E0EF;border-radius:8px;box-shadow:0 8px 24px #07102633; }
#ozon-structure-root .ozon-link-actions-menu button { display:block;width:100%;border:0!important;background:#fff!important;color:#071026!important;text-align:left;padding:7px;border-radius:5px;cursor:pointer;font:inherit; }
#ozon-structure-root .ozon-link-actions-menu button:hover { background:#E5F0FF!important;color:#005BFF!important; }
#ozon-structure-root .ozon-link-actions-menu button[data-action="delete-link"] { color:#D92D20!important; }
#ozon-structure-root .ozon-link-actions-menu button[data-action="delete-link"]:hover { background:#FFF1EF!important; }
#ozon-structure-root .ozon-ext-ip-table-row .ozon-ext-ip-action-cell .ozon-ext-btn { min-width:18px!important;width:18px!important;padding:0!important; }
#ozon-structure-root .ozon-ext-ip-table-body input { min-width:0!important; }
#ozon-structure-root .ozon-ext-attributes-columns { display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:12px 18px!important; }
#ozon-structure-root .ozon-ext-attribute-field { display:grid;grid-template-columns:112px minmax(0,1fr);align-items:center;gap:8px;min-width:0; }
#ozon-structure-root .ozon-ext-attribute-field>.ozon-ext-field-label { margin:0;min-width:0; }
#ozon-structure-root .ozon-ext-attribute-field>div { min-width:0; }
#ozon-structure-root .ozon-ext-attribute-labels { grid-column:1/-1; }
#ozon-structure-root .ozon-sb-labels { display:flex;align-items:center;gap:5px;flex-wrap:wrap;min-height:30px;min-width:0; }
#ozon-structure-root .ozon-sb-label-chip { display:inline-flex;align-items:center;gap:4px;max-width:100%;overflow-wrap:anywhere; }
#ozon-structure-root .ozon-sb-label-remove { border:0;background:transparent;color:#64748b;cursor:pointer;font-size:15px;line-height:1;padding:0 2px; }
#ozon-structure-root .ozon-sb-label-form { display:inline-flex;align-items:center;gap:5px;max-width:100%; }
#ozon-structure-root .ozon-sb-label-form input { width:165px;min-width:80px; }
#ozon-structure-root .ozon-sb-label-error { flex-basis:100%;color:#d92d20;font-size:11px; }

.ozon-ext-ip-table-viewport { overflow:auto;scrollbar-width:thin;scrollbar-color:#A8B5C5 transparent; }
.ozon-ext-ip-table-body { min-width:var(--ozon-ip-width,1220px); }
.ozon-ext-ip-table-head,.ozon-ext-ip-table-row { display:grid!important;grid-template-columns:var(--ozon-ip-columns,360px 240px 125px 200px 245px 70px);align-items:center;gap:0!important; }
.ozon-ext-ip-table-head { background:#F1F5F9;color:#475569;font-size:10px;font-weight:600;min-height:28px;position:sticky;top:0;z-index:1; }
.ozon-ext-ip-table-head>span { padding:4px 6px;border-right:1px solid #E2E8F0; }
#ozon-structure-root .ozon-ext-ip-table-row { padding:0!important;border:0!important;border-bottom:1px solid #E2E8F0!important;border-radius:0!important;background:#fff;min-height:28px; }
.ozon-ext-ip-table-row:hover { background:#F2F4F8; }
.ozon-ext-ip-table-row.completed { background:#EFFBF3!important; }
.ozon-ext-ip-table-row>div { min-width:0;padding:0 6px;min-height:28px;display:flex;align-items:center;border-right:1px solid #EEF2F6; }
.ozon-ext-ip-task-cell>.ozon-ip-summary { min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap!important; }
.ozon-ext-ip-table-row>.ozon-ext-ip-table-secondary { grid-column:1/-1;height:auto;min-height:20px;border-top:1px solid #EEF2F6;padding-left:28px!important; }
#ozon-structure-root button.ozon-ext-copy-ref { display:inline-flex;align-items:center;justify-content:center;flex:0 0 18px;width:18px;height:20px;border:0;background:transparent;color:#64748B;padding:2px;cursor:pointer;vertical-align:middle;border-radius:4px; }
#ozon-structure-root button.ozon-ext-copy-ref:hover { color:#005BFF;background:#E5F0FF; }
.ozon-ext-select-content { display:flex;align-items:center;gap:7px;min-width:0;flex:1; }
.ozon-ext-select-content>.ozon-ext-filter-icon {display:inline-flex;flex:none}
.ozon-ext-select-content > .ozon-ext-select-text { min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1; }
.ozon-ext-search-select-value:has(.ozon-ext-select-content) { flex:1; }
.ozon-ext-link-compact-row:hover {
  background: #FAFBFD;
}

.ozon-ext-link-icon-box {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #E5F0FF;
  color: #005BFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ozon-ext-user-dropdown {
  max-height: 175px !important;
  overflow-y: auto !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 8px !important;
  margin-top: 4px !important;
  box-shadow: 0 4px 12px rgba(7, 16, 38, 0.08) !important;
}

.ozon-ext-user-option {
  padding: 6px 10px !important;
  min-height: 28px !important;
  line-height: 18px !important;
  border-bottom: 1px solid #F1F5F9 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  font-size: 11.5px !important;
  cursor: pointer !important;
  transition: background-color 100ms ease !important;
}

.ozon-ext-user-option:last-child {
  border-bottom: none !important;
}

.ozon-ext-user-option:hover {
  background: #E5F0FF !important;
}

.ozon-ext-type-pill { display:inline-flex;align-items:center;gap:5px;flex:none;white-space:nowrap;border:1px solid #dbe4ef;border-radius:5px;padding:1px 6px;background:white;color:#334155;font-size:10px;font-weight:600; }
.ozon-ext-type-pill :is(img,svg),.ozon-ext-issue-type-icon {width:12px;height:12px;object-fit:contain;flex:none;vertical-align:middle}
.ozon-ext-status-trigger { display:flex;align-items:center;justify-content:space-between;gap:4px;position:relative;cursor:pointer;color:#475569; }
.ozon-ext-status-trigger.status-progress { color:#005bff; }
.ozon-ext-status-trigger.status-review { color:#b45309; }
.ozon-ext-status-trigger.status-testing { color:#7c3aed; }
.ozon-ext-status-trigger.status-done { color:#15803d; }
.ozon-ext-header-bar > div:first-child { flex:1;flex-wrap:wrap; }
.ozon-ext-header-bar strong { margin-right:auto; }
.ozon-ext-header-bar #ozon-ext-show-all-sprints { margin-left:auto; }
#ozon-structure-root .ozon-ext-sidebar { max-width:100vw!important; }
.ozon-ext-sidebar-header { flex-wrap:wrap; }
.ozon-ext-title-line { flex:0 0 100%;display:flex;align-items:center;gap:6px; }
.ozon-ext-title-line #ozon-sb-summary:not(:focus) { background:transparent!important;border-color:transparent!important; }
.ozon-ext-title-line #ozon-sb-summary { min-width:0;font-size:15px!important; }
.ozon-ext-workflow { display:flex;align-items:center;gap:5px;flex-wrap:wrap; }
.ozon-ext-workflow-label {font-size:11px;color:#64748b;font-weight:600;margin-right:2px}
.ozon-ext-workflow-current {display:flex;align-items:center;gap:6px;margin-right:10px}
.ozon-sidebar-draft-overlay {position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#07102680;font:12px/1.5 Arial,sans-serif}
.ozon-sidebar-draft-dialog {width:min(470px,calc(100vw - 32px));box-sizing:border-box;padding:20px;background:#fff;border-radius:12px;box-shadow:0 10px 40px #07102640;color:#071026}
.ozon-sidebar-draft-dialog strong {font-size:15px}.ozon-sidebar-draft-dialog p {color:#526b8c}.ozon-sidebar-draft-dialog div {display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.ozon-sidebar-draft-dialog button {padding:8px 12px;border:1px solid #dbe4ef;border-radius:8px;color:#005bff;background:#fff;cursor:pointer}.ozon-sidebar-draft-dialog button.primary {background:#005bff;color:#fff;border-color:#005bff}
.ozon-sidebar-more {position:relative}.ozon-sidebar-more summary {list-style:none;cursor:pointer;padding:4px 9px;border-radius:6px;background:#f0f3f8;color:#005bff;font-weight:700}.ozon-sidebar-more summary::-webkit-details-marker {display:none}.ozon-sidebar-more-menu {position:absolute;right:0;top:100%;z-index:20;min-width:180px;display:flex;flex-direction:column;gap:4px;padding:8px;background:#fff;border:1px solid #dbe4ef;border-radius:8px;box-shadow:0 8px 24px #07102626}.ozon-sidebar-more-menu button,.ozon-sidebar-more-menu a {width:auto!important;text-align:left!important}
#ozon-ext-sidebar-panel {container:ozon-sidebar / inline-size}
@container ozon-sidebar (max-width: 780px) {
  #ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-attributes-columns {grid-template-columns:minmax(0,1fr)!important}
}
@container ozon-sidebar (max-width: 840px) {
  #ozon-ext-sidebar-panel .ozon-ext-ip-table-head {display:none!important}
  #ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-ip-table-row {grid-template-columns:minmax(0,1fr) minmax(0,1fr) 82px 24px!important;gap:3px 6px!important;padding:5px 8px!important}
  #ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-ip-table-row>div {height:auto!important;min-height:0;border:0;padding-inline:0}
  .ozon-ext-ip-table-row>.ozon-ext-ip-task-cell {grid-column:1/3;grid-row:1}
  #ozon-structure-root .ozon-ext-ip-table-row>.ozon-ext-ip-status-cell {grid-column:3;grid-row:1;justify-content:flex-end}
  #ozon-structure-root .ozon-ext-ip-table-row>.ozon-ext-ip-action-cell {grid-column:4;grid-row:1;justify-content:flex-end}
  .ozon-ext-ip-table-row>.ozon-ext-ip-component-cell {grid-column:1;grid-row:2}
  .ozon-ext-ip-table-row>.ozon-ext-ip-sprint-cell {grid-column:2/-1;grid-row:2}
  .ozon-ext-ip-table-row>.ozon-ext-sb-combo {display:grid;grid-template-columns:auto minmax(0,1fr);gap:5px;align-self:start}
  .ozon-ext-ip-table-row>[data-field-label]::before {content:attr(data-field-label);color:#52647d;font-size:10.5px}
  .ozon-ext-ip-table-row>.ozon-ext-ip-epic-cell {grid-column:1/-1;grid-row:3;gap:6px;font-size:11px}
  .ozon-ext-ip-table-row>.ozon-ext-ip-epic-cell.is-empty {display:none}
  .ozon-ext-ip-table-row>.ozon-ext-ip-epic-cell::before {content:'Эпик';color:#52647d}
}
@container ozon-sidebar (max-width: 440px) {
  #ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-attribute-field {grid-template-columns:minmax(0,1fr);gap:4px}
  #ozon-ext-sidebar-panel .ozon-ext-ip-component-cell,#ozon-ext-sidebar-panel .ozon-ext-ip-sprint-cell {grid-column:1/-1}
  #ozon-ext-sidebar-panel .ozon-ext-ip-sprint-cell {grid-row:3}
  #ozon-ext-sidebar-panel .ozon-ext-ip-epic-cell {grid-row:4}
}
.ozon-ext-workflow > div { margin:0!important; }
#ozon-sb-params-card { border-radius:12px; }
#ozon-sb-description-card { margin:0 12px 12px;border:0;border-top:1px solid #e2e8f0; }
#ozon-sb-description-card .ozon-ext-section-head { background:white;font-size:11px; }
#ozon-sb-desc-preview { background:#f8fafc;border:1px solid #dbe4ef;border-radius:9px; }
.ozon-ext-field-grid { grid-template-columns:minmax(100px,32%) minmax(0,1fr);align-items:center; }
.ozon-ext-field-grid > .ozon-ext-field-label { padding-top:0;align-self:center; }
.ozon-ext-obproject-value { box-sizing:border-box;flex-wrap:wrap;padding:5px 10px;border:1px solid #E2E8F0;border-radius:9px;background:#fff; }
.ozon-ext-obproject-value > a,.ozon-ext-obproject-value > .ozon-ext-badge { flex-shrink:0; }
.ozon-ext-obproject-value > span:not(.ozon-ext-badge) { flex:1 1 48px; }
#ozon-structure-root #ozon-sb-comp-trigger {height:auto!important}
#ozon-structure-root #ozon-sb-comp-trigger>span:first-child {white-space:normal!important;overflow-wrap:anywhere;min-width:0}
#ozon-structure-root .ozon-ext-field-grid .ozon-sb-priority-trigger {justify-content:flex-start!important;gap:6px;text-align:left}
#ozon-structure-root .ozon-sb-priority-trigger>.ozon-ext-toolbar-chevron {margin-left:auto;flex:none}
.ozon-ext-delivery-indicators { display:inline-flex;align-items:center;gap:3px;flex-shrink:0; }
.ozon-ext-delivery-indicator { display:inline-flex;align-items:center;justify-content:center;width:21px;height:22px;border-radius:6px;flex-shrink:0; }
.ozon-ext-delivery-indicator.absent { color:#94A3B8;background:#F1F5F9; }
.ozon-ext-delivery-indicator.done { color:#008A52;background:#DCFCE7; }
.ozon-ext-delivery-indicator.active { color:#005BFF;background:#E5F0FF; }
.ozon-ext-field-grid details summary { cursor:pointer;color:#005bff;font-size:10px; }
.ozon-ext-sidebar-header .ozon-ext-btn-surface,.ozon-ext-filter-bar .ozon-ext-btn-surface { background:white!important;color:#005bff!important;border:1px solid #dbe4ef!important; }
.ozon-ext-open-sb-btn[aria-expanded="false"] { background:white!important;color:#475569!important;border-radius:6px!important; }
.ozon-strategy-task-line > .ozon-ext-open-sb-btn {flex:none}
#ozon-structure-root .ozon-strategy-table tbody tr.ozon-strategy-completed > td {background:#effbf3}
#ozon-structure-root .ozon-strategy-table tbody tr.ozon-strategy-completed:hover > td {background:#e0f5e8}
.ozon-ext-create-overlay { position:fixed;inset:0;z-index:2147482000;background:rgba(15,23,42,.38);display:flex;align-items:center;justify-content:center;padding:18px; }
.ozon-ext-create-dialog { width:min(520px,94vw);max-height:min(82vh,760px);overflow:auto;background:#fff;border:1px solid #dbe4ef;border-radius:12px;box-shadow:0 20px 55px rgba(7,16,38,.24);padding:18px;display:flex;flex-direction:column;gap:12px;color:#071026;font:13px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
.ozon-ext-create-dialog strong { font-size:15px; }
.ozon-ext-create-dialog label { display:flex;flex-direction:column;gap:5px;color:#334155;font-size:11px;font-weight:650; }
.ozon-ext-create-dialog input,.ozon-ext-create-dialog textarea { width:100%;box-sizing:border-box;min-height:34px;padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#071026;font:inherit;font-size:13px; }
.ozon-ext-create-dialog textarea { resize:vertical;min-height:88px; }
.ozon-ext-create-components { max-height:190px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px;padding:5px;display:flex;flex-wrap:wrap;gap:5px; }
.ozon-ext-create-caption { flex:0 0 100%;padding:4px 3px 1px;color:#64748b;font-size:10px;font-weight:700; }
.ozon-ext-create-component { border:1px solid #dbe4ef;border-radius:999px;background:#fff;color:#334155;padding:5px 9px;font:inherit;font-size:11px;font-weight:600;cursor:pointer; }
.ozon-ext-create-component.active { color:#005bff;border-color:#8cb8ff;background:#eaf2ff; }
.ozon-ext-create-note { color:#64748b;font-size:11px; }
.ozon-ext-create-error { border-radius:7px;background:#fff1f0;color:#b42318;padding:8px 10px;font-size:11px; }
.ozon-ext-create-actions { display:flex;justify-content:flex-end;gap:7px;margin-top:2px; }
.ozon-ext-create-menu { position:absolute!important;top:calc(100% + 5px)!important;right:0!important;z-index:10040!important;width:204px!important;max-width:min(204px,calc(100vw - 24px))!important;padding:6px!important;display:flex!important;flex-direction:column!important;gap:5px!important;background:#fff!important;border:1px solid #dbe4ef!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(7,16,38,.16)!important; }
.ozon-ext-create-menu button { display:flex!important;align-items:center!important;width:100%!important;min-height:32px!important;padding:6px 9px!important;border:1px solid #dbe4ef!important;border-radius:7px!important;background:#fff!important;color:#005bff!important;text-align:left!important;font:600 11px Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;white-space:normal!important;cursor:pointer!important; }
.ozon-ext-create-menu button:hover { background:#eaf2ff!important;border-color:#a8c7ff!important; }


#ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-ip-table-row .ozon-ext-search-select-trigger {
  box-sizing:border-box;width:100%;min-width:0!important;height:auto!important;min-height:30px!important;max-height:none!important;padding:5px 7px!important;gap:5px;
  border:1px solid #dce3eb!important;border-radius:9px!important;background:#fff!important;
  box-shadow:none!important;font:500 11.5px/1.35 var(--ozon-font-sans)!important;text-align:left;
}
#ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-ip-table-row .ozon-ext-search-select-trigger:hover {border-color:#a8c7ff!important;background:#f8fbff!important}
#ozon-structure-root #ozon-ext-sidebar-panel .ozon-ext-ip-table-row .ozon-ext-search-select-trigger:focus-visible {outline:2px solid #005bff;outline-offset:-2px}
#ozon-structure-root .ozon-ip-field {display:flex;align-items:center;flex-wrap:wrap;gap:2px 6px;min-width:0;flex:1 1 auto}
#ozon-structure-root .ozon-ip-field-value {white-space:normal;overflow-wrap:anywhere;min-width:0}
#ozon-structure-root [data-action="open-ip-comp-combo"] .ozon-ip-field-value {
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;
}
#ozon-structure-root [data-action="open-ip-sprint-combo"] .ozon-ip-field-value {
  white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;
}
#ozon-structure-root #ozon-ext-sidebar-panel :is(input[type="text"],input[type="search"]) {
  min-height:30px!important;border-radius:9px!important;border-color:#dce3eb!important;background-color:white!important;
}
/* OBI size 400 badges and dense board controls. */
#ozon-structure-root :is(.ozon-ext-badge,.ozon-ext-type-pill) {
  box-sizing:border-box; min-height:20px; min-width:20px; justify-content:center;
  padding:2px 6px!important; border:0; border-radius:8px;
  font:600 12px/16px Onest,var(--ozon-font-sans)!important;
}
#ozon-structure-root .ozon-ext-type-pill {background:#f2f4f7;}
#ozon-structure-root .ozon-ext-badge-progress {background:rgba(0,150,255,.08);color:#005bff;}
:is(#ozon-structure-root,#ozon-thread-sidebar) :is(.ozon-ext-btn,.ozon-ext-open-sb-btn) {
  border-radius:10px!important; font-weight:600; box-shadow:none!important;
}
:is(#ozon-structure-root,#ozon-thread-sidebar) .ozon-ext-btn:not(.ozon-ext-btn-negative):not(.ozon-ext-btn-surface) {background-color:#e5f2ff;color:#005bff;}
:is(#ozon-structure-root,#ozon-thread-sidebar) :is(.ozon-ext-btn,.ozon-ext-open-sb-btn):hover:enabled {filter:brightness(.96);}
:is(#ozon-structure-root,#ozon-thread-sidebar) :is(.ozon-ext-btn,.ozon-ext-open-sb-btn):active:enabled {filter:brightness(.91);}
#ozon-structure-root .ozon-ext-filter-bar button[aria-pressed] {border-radius:999px!important;padding-inline:12px;}
#ozon-structure-root .ozon-ext-filter-bar button[aria-pressed="true"] {color:#005bff;background:#e5f2ff;box-shadow:inset 0 0 0 1px #a4ccff!important;}
#ozon-structure-root :is(.ozon-ext-field-grid,.ozon-ext-create-dialog) :is(input[type="text"],textarea),
#ozon-thread-sidebar :is(input:not([type="checkbox"]),textarea,.ozon-ext-search-select-trigger) {
  box-sizing:border-box;border:1px solid #dce3eb!important;border-radius:10px!important;background-color:#fff!important;
  padding:6px 10px; min-width:0; caret-color:#005bff;
}
#ozon-structure-root :is(.ozon-ext-field-grid,.ozon-ext-create-dialog) :is(input,textarea):focus,
#ozon-thread-sidebar :is(input:not([type="checkbox"]),textarea,.ozon-ext-search-select-trigger):focus {
  border-color:#005bff!important;box-shadow:inset 0 0 0 1px #005bff!important;
}
:is(#ozon-structure-root,#ozon-thread-sidebar) :is(button,input,textarea):focus-visible {outline:2px solid #ff007a!important;outline-offset:2px;}
:is(#ozon-structure-root,#ozon-thread-sidebar) .ozon-ext-btn:disabled {opacity:.45;cursor:default;}
/* Compact density for the Jira board, with the states from the field spec. */
#ozon-structure-root :is(.ozon-ext-toolbar-trigger,.ozon-ext-search-select-trigger,.ozon-ext-sb-combo-trigger,.ozon-ext-cell-combo-trigger,input[type="search"]) {
  box-sizing:border-box; background-color:white!important; border:1px solid #dce3eb!important;
  border-radius:9px!important; box-shadow:none!important;
}
#ozon-structure-root :is(.ozon-ext-toolbar-trigger,.ozon-ext-search-select-trigger,.ozon-ext-sb-combo-trigger,.ozon-ext-cell-combo-trigger,input[type="search"]):hover {border-color:#b8c4d0!important;}
#ozon-structure-root :is([aria-expanded="true"],input[type="search"]:focus,.ozon-ext-sb-combo-trigger:has(~ .ozon-ext-combo-popover),.ozon-ext-cell-combo-trigger:has(~ .ozon-ext-combo-popover)) {border-color:#005bff!important;box-shadow:inset 0 0 0 1px #005bff!important;}
#ozon-structure-root :is(.ozon-ext-toolbar-trigger,.ozon-ext-search-select-trigger,.ozon-ext-sb-combo-trigger,.ozon-ext-cell-combo-trigger):focus-visible {outline:2px solid #ff007a!important;outline-offset:2px;}
/* Table cells are editable, but their controls share the borderless table appearance. */
#ozon-structure-root .ozon-ext-table :is(.ozon-ext-search-select-trigger,.ozon-ext-cell-combo-trigger,.ozon-ext-sb-combo-trigger) { border-color:transparent!important;border-radius:5px!important;box-shadow:none!important;background:transparent!important; }
#ozon-structure-root .ozon-ext-table :is(.ozon-ext-search-select-trigger,.ozon-ext-cell-combo-trigger,.ozon-ext-sb-combo-trigger):hover { background:#e5f0ff!important; }
#ozon-structure-root .ozon-dev-sprint-value > .ozon-dev-ellipsis,#ozon-structure-root .ozon-ext-sprint-value > span:first-child { flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
#ozon-structure-root :is(.ozon-dev-sprint-value,.ozon-ext-sprint-value,.ozon-ext-sprint-select .ozon-ext-select-content) > .ozon-ext-badge { margin-left:auto;flex:0 0 auto; }
#ozon-structure-root [data-action="pick-ip-sprint"],#ozon-structure-root [data-dev-action="link-sprint-pick"] { display:flex!important;align-items:center;gap:8px; }
#ozon-structure-root [data-action="pick-ip-sprint"] > .ozon-ext-badge,#ozon-structure-root [data-dev-action="link-sprint-pick"] > .ozon-ext-badge { margin-left:auto;flex:0 0 auto; }
#ozon-structure-root #ozon-dev-editor-panel[aria-label="Спринт задачи"] .ozon-dev-editor-options > button { display:flex!important;align-items:center;gap:8px; }
#ozon-structure-root #ozon-dev-editor-panel[aria-label="Спринт задачи"] .ozon-dev-editor-options > button > .ozon-ext-badge { margin-left:auto;flex:0 0 auto; }
#ozon-structure-root input[type="search"] {
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%239aa6b2' stroke-width='2'%3E%3Ccircle cx='6.5' cy='6.5' r='4.5'/%3E%3Cpath d='m10 10 4 4'/%3E%3C/svg%3E")!important;
  background-position:left 9px center!important;background-repeat:no-repeat!important;padding-left:32px!important;caret-color:#005bff;
}
#ozon-structure-root input[type="search"]::placeholder {color:#98a5b3;}
#ozon-structure-root input[type="search"]::-webkit-search-cancel-button {cursor:pointer;}
#ozon-structure-root [aria-expanded="true"] :is(.ozon-ext-toolbar-chevron,.ozon-ext-search-select-caret)::before {transform:translateY(1px) rotate(225deg);}
#ozon-structure-root .ozon-ext-combo-popover {border-color:#edf1f5!important;box-shadow:0 4px 18px rgba(25,47,68,.09)!important;}
#ozon-structure-root :is(input[type="search"],.ozon-ext-search-select-trigger,.ozon-ext-toolbar-trigger):disabled {opacity:.45;cursor:default;}
#ozon-structure-root .ozon-ext-ip-row :is(input[type="text"],input[type="search"],.ozon-ext-sb-combo-trigger) {min-height:30px!important;border:1px solid #dce3eb!important;border-radius:9px!important;background:#fff!important;font:500 11.5px var(--ozon-font-sans)!important;}
#ozon-structure-root .ozon-ext-ip-row :is(input[type="text"],input[type="search"]):focus {border-color:#005bff!important;box-shadow:inset 0 0 0 1px #005bff!important;}
#ozon-structure-root .ozon-ext-ip-row :is(input[type="text"],input[type="search"])::placeholder {color:#98a5b3!important;}

/* The development view keeps its team links and build version visible regardless of the selected tab. */
#ozon-structure-root .ozon-dev-header-actions { display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px; }
#ozon-structure-root .ozon-dev-header-actions a { display:inline-flex;align-items:center;min-height:26px;padding:3px 8px;border-radius:7px;background:#F2F7FF;color:#005BFF;text-decoration:none;font:500 11px var(--ozon-font-sans);white-space:nowrap; }
#ozon-structure-root .ozon-dev-header-actions a:hover { background:#E5F0FF;text-decoration:none; }
#ozon-structure-root .ozon-dev-version { color:#64748B;font:500 10px var(--ozon-font-sans);white-space:nowrap; }
#ozon-structure-root .ozon-dev-team-popover { min-width:240px!important;width:260px!important;max-width:calc(100vw - 24px)!important;padding:6px!important; }
#ozon-structure-root .ozon-dev-team-option { display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;min-height:38px!important;width:100%!important;padding:7px 10px!important;box-sizing:border-box!important;overflow:hidden!important; }
#ozon-structure-root :is(.ozon-dev-team-option,.ozon-dev-sprint-option,.ozon-dev-settings,.ozon-strategy-label-option) input[type="checkbox"] { appearance:none!important;-webkit-appearance:none!important;display:inline-grid!important;place-content:center!important;width:16px!important;height:16px!important;min-width:16px!important;max-width:16px!important;margin:0!important;padding:0!important;border:1px solid #A8B5C5!important;border-radius:4px!important;background:#fff!important;flex:0 0 16px!important;cursor:pointer!important; }
#ozon-structure-root :is(.ozon-dev-team-option,.ozon-dev-sprint-option,.ozon-dev-settings,.ozon-strategy-label-option) input[type="checkbox"]:checked { border-color:#005BFF!important;background:#005BFF!important; }
#ozon-structure-root :is(.ozon-dev-team-option,.ozon-dev-sprint-option,.ozon-dev-settings,.ozon-strategy-label-option) input[type="checkbox"]:checked::after { content:"";width:7px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translate(1px,-1px); }
#ozon-structure-root .ozon-dev-team-option>.ozon-dev-team-name { display:block!important;position:static!important;inset:auto!important;flex:1 1 auto!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;line-height:20px!important;text-align:left!important; }
#ozon-structure-root .ozon-dev-team-popover>.ozon-ext-btn { display:flex!important;width:100%!important;justify-content:center!important;margin-top:6px!important; }
#ozon-structure-root {--ozon-sidebar-standard-limit:calc(100vw - 124px)}
#ozon-structure-root :is(.ozon-ext-filter-bar,.ozon-strategy-filters,.ozon-report-view-options) {align-items:center}
#ozon-structure-root :is(.ozon-ext-filter-bar,.ozon-strategy-filters,.ozon-report-toolbar,.ozon-report-view-options) .ozon-ext-toolbar-trigger,
#ozon-structure-root :is(.ozon-ext-filter-bar,.ozon-strategy-filters,.ozon-report-toolbar) > :is(button,a.ozon-ext-btn,input[type="search"]) {
  box-sizing:border-box;height:30px!important;min-height:30px!important;border-radius:9px!important;align-items:center;
}
#ozon-structure-root :is(.ozon-ext-filter-bar,.ozon-strategy-filters,.ozon-report-toolbar,.ozon-report-view-options) :is(button,input,select,a):focus-visible {outline:2px solid #005bff!important;outline-offset:2px}
#ozon-structure-root #ozon-ext-sidebar-expand {width:28px;padding:0;justify-content:center}
#ozon-structure-root #ozon-ext-sidebar-expand:focus-visible {outline:2px solid #005bff;outline-offset:2px}
@media (max-width:820px) {
  #ozon-structure-root {--ozon-sidebar-standard-limit:calc(100vw - 64px)}
}
@media (max-width:540px) {
  #ozon-structure-root #ozon-ext-sidebar-panel {width:100vw!important}
  #ozon-structure-root #ozon-ext-sidebar-expand,#ozon-structure-root #ozon-ext-sidebar-resizer {display:none!important}
}
#ozon-structure-root .ozon-dev-sprint-option { display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:9px!important;width:100%;box-sizing:border-box; }
#ozon-structure-root .ozon-dev-settings label { display:flex;align-items:center;gap:8px; }
#ozon-structure-root .ozon-dev-settings input[type="checkbox"] { flex:0 0 16px!important; }

#ozon-structure-root tr.ozon-fcrm-review > td,
#ozon-structure-root div.ozon-fcrm-review { background-color:#fff3e3!important; }
#ozon-structure-root tr.ozon-fcrm-review:is(:hover,.ozon-details-source) > td,
#ozon-structure-root div.ozon-fcrm-review:hover { background-color:#ffead0!important; }

`) + WIDGET_THEME_STYLES;
}

export function generateContentScriptJs(
  config: ExtensionConfig,
  initialTasks: FcrmTask[],
  umbEpicCatalog: LinkedIssueItem[]
): string {
  return `/**
 * Ozon Bank · Jira FCRM Structure Chrome Extension (Manifest V3 — v3.0)
 *
 * Строго для доски: https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=${config.rapidViewId}&projectKey=${config.projectKey}
 *
 * Что реализовано в v3.0:
 * 1. СТРОГИЙ ФИЛЬТР СПРИНТОВ ДОСКИ FCRM (#${config.rapidViewId}): чужие спринты смежных команд с 0 задач (TXCTRL_VED_REQ, PFM B2C, Loan Factoring, HOGWARTS_CD, CRM_CORE, CRM_BO, CS, Collection и др.), у которых originBoardId != ${config.rapidViewId} и нет задач FCRM, полностью скрыты! Отображаются только реальные спринты вашей доски (Product Dicsvery, #Разработка..., Бэклог FCRM).
 * 2. РЕАЛЬНОЕ СОХРАНЕНИЕ И УДАЛЕНИЕ СВЯЗЕЙ В JIRA REST API: при нажатии «+ Выбрать» / «✓ Привязана» в блоке «Задача проекта» (labels = fcrm_umb_epic), «+ Добавить» в «В проекте» или «✕» отправляются реальные запросы POST /rest/api/2/issueLink и DELETE /rest/api/2/issueLink/{id} с автоматическим определением типа связи Jira (Задача проекта / В проекте / Relates).
 * 3. Строго единая высота всех строк таблицы (28px): ячейки связей рендерятся строго в 1 линию с бейджем «+N ещё ▾».
 * 4. 100% соответствие шрифтов и верстки превью AI Studio (Inter, Plus Jakarta Sans, JetBrains Mono), Описание задачи, Приоритет и реальные компоненты/спринты у связанных задач.
 */
(function () {
  'use strict';

  const CONFIG = ${JSON.stringify(config, null, 2)};
  const renderStructuredAnswer = ${structuredAnswer.toString()};
  const renderAnswerMarkup = ${answerMarkup.toString()};

  function isTargetBoardPage() {
    const path = window.location.pathname || '';
    if (!path.includes('/secure/RapidBoard.jspa')) {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    const rv = params.get('rapidView');
    const pk = params.get('projectKey');
    if (rv && String(rv) !== String(CONFIG.rapidViewId) && String(rv) !== '6197') {
      return false;
    }
    if (!rv && pk && String(pk).toUpperCase() !== String(CONFIG.projectKey).toUpperCase()) {
      return false;
    }
    const viewMode = params.get('view');
    if (viewMode === 'manage' || viewMode === 'reporting') {
      return false;
    }
    return true;
  }

  if (!isTargetBoardPage()) {
    return;
  }

  function ensureGoogleFontsLoaded() {
    if (!document.getElementById('ozon-ext-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'ozon-ext-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap';
      document.head.appendChild(link);
    }
    if (!document.getElementById('ozon-ext-runtime-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'ozon-ext-runtime-styles';
      styleEl.textContent = ${JSON.stringify(generateStylesCss(config))};
      document.head.appendChild(styleEl);
    }
  }
  const widgetTheme = (${installWidgetTheme.toString()})(window, document);
  ensureGoogleFontsLoaded();

  const STORAGE_KEY_COL_WIDTHS = 'ozon_fcrm_col_widths_v31';
  const STORAGE_KEY_COL_ORDER = 'ozon_fcrm_col_order_v31';
  const STORAGE_KEY_SIDEBAR_W = 'ozon_fcrm_sidebar_width_v32';
  const STORAGE_KEY_NATIVE_BOARD = 'ozon_fcrm_native_board';

  let tasks = ${JSON.stringify(initialTasks, null, 2)};
  let umbCatalog = ${JSON.stringify(umbEpicCatalog, null, 2)};
  let umbCatalogReady = false;
  let umbCatalogRequest = null;
  let isStructureVisible = true;
  let structureRenderPending = false;
  try { isStructureVisible = sessionStorage.getItem(STORAGE_KEY_NATIVE_BOARD) !== 'true'; } catch (_) {}
  let activeDashboardView = new URLSearchParams(window.location.search).get('rapidView') === '6197' ? 'development' : 'product';
  let productDashboardLoaded = false;
  const renderBadge = (${renderJiraBadge.toString()});
  const reviewRowClass = (${fcrmReviewRowClass.toString()});
  const jiraPriorityService = (${createJiraPriorityService.toString()})();
  const jiraGroupingUi = (${createJiraGroupingUi.toString()})();
  const jiraPeople = (${createJiraPeopleUi.toString()})();
  jiraPeople.bind(document,showSaveToast);
  const bindLabelSuggestions = (${bindJiraLabelSuggestions.toString()});
  const strategicDashboard = (${createStrategicDashboard.toString()})(() => { if (activeDashboardView === 'strategy') renderStructure(); }, renderBadge, ${JSON.stringify(EXTENSION_VERSION)}, jiraPriorityService, CONFIG.sprintFieldId, { boardId:CONFIG.rapidViewId, components:()=>loadIssueCreateComponents(CONFIG.projectKey), create:(summary,componentId)=>createIssueFromSidebar({kind:'epic',projectKey:CONFIG.projectKey,summary,componentId}), link:(source,target)=>createIssueLinkInJira(source,target,'projectTask',true,true), notify:(message)=>{ const update=showLinksSnackbar(message); update(message); }, details:openSharedFcrmDetails, issueTypeBadge:getIssueTypeBadgeHtml, bindLabelSuggestions },jiraGroupingUi,reviewRowClass);
  async function openSharedFcrmDetails(link, button) {
    if (!/^FCRM-[0-9]+$/i.test(link.key)) return;
    const source = getSidebarSource(button);
    if (isSidebarOpen && selectedTaskKey === link.key) {
      sidebarSource = source;
      renderStructure();
      return true;
    }
    if (isSidebarOpen && selectedTaskKey !== link.key && !await confirmSidebarExit()) return;
    if (!tasks.some(task => task.key === link.key)) tasks.push({
      key:link.key,summary:link.summary || link.key,description:'',status:link.status || 'todo',priority:link.priority || 'Средний',issueTypeName:link.issueType || 'Задача',
      component:'Без компонента',sprint:link.sprint?.name || 'Бэклог FCRM',epicKey:'',epicName:'',
      assignee:{name:'Не назначен'},customer:{name:'Не указан'},projectTaskLinks:[],inProjectLinks:[],otherLinks:[]
    });
    developmentDashboard.dismissEditor();
    sidebarSource = source;
    selectedTaskKey = link.key; isSidebarOpen = true; isEditingDescription = false; collapsedSidebarSections.pt = true;
    reloadSingleTaskFromJira(link.key,true,true);
    return true;
  }
  const developmentPointColumns = (${createDevelopmentPointColumns.toString()})();
  const developmentDashboard = (${createDevelopmentDashboard.toString()})(() => renderStructure(), openSharedFcrmDetails,()=>{sbEpicComboOpen=false;sbCompComboOpen=false;sbIpCompOpenIdx=null;sbIpSprintOpenIdx=null;activeSearchSelectId='';}, renderBadge, getStatusCategoryClass, ${JSON.stringify(EXTENSION_VERSION)}, jiraPriorityService,jiraGroupingUi,developmentPointColumns,getIssueTypeBadgeHtml,reviewRowClass);
  const sprintReport = (${createSprintReportDashboard.toString()})(() => { if (activeDashboardView === 'report') renderStructure(); }, (${createSprintReportModel.toString()})(),
    [{id:String(CONFIG.rapidViewId),name:'FCRM'}, {id:'6197',name:'CS'}, {id:'7180',name:'CRM_CORE'}, {id:'12696',name:'CRM_BO'}], CONFIG.sprintFieldId, CONFIG.epicFieldId, renderBadge, isEpicIssueType,jiraPeople,developmentPointColumns,()=>developmentDashboard.getState().grouping,jiraGroupingUi,reviewRowClass);
  const generatingLinkKeys = new Set();
  const ticketSearchStates = new Map();
  let draggedThreadChannel = null;

  function getTicketSearchState(key, kind) {
    const id = key + ':' + kind;
    if (!ticketSearchStates.has(id)) ticketSearchStates.set(id, {
      open: false, loading: false, channels: '', items: null, errors: [], error: '', raw: '', message: '', reply: '',
      choices: ['bank-crm-dev', 'cs_incident_techsup', 'crmcs', 'quality_cs', 'bank_cs_team', 'bank_cs_team_public', 'crm_bo_team_public', 'crm_bo_team_dev', 'crm_dev_team', 'bank_crm_core_team', 'trs', 'ob_trs_public', 'cs_fcrm_changes', 'crm-vs-srm', 'tmp_db2c', 'case-study', 'case-study-b2b', 'suppproduct_b2c', 'bi-weekly--support'].map(name => ({ url: 'https://chatzone.o3t.ru/ozon/channels/' + name, checked: false })),
      queue: [], index: -1, history: []
    });
    return ticketSearchStates.get(id);
  }

  function parseTicketSearchResponse(text, kind, issueKey) {
    const block = /<search_results>([\\s\\S]*?)<\\/search_results>/i.exec(String(text));
    const raw = block ? block[1] : String(text).trim().replace(/^\\x60\\x60\\x60(?:json)?\\s*/i, '').replace(/\\x60\\x60\\x60\\s*$/, '');
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items) || (data.errors != null && !Array.isArray(data.errors))) throw new Error('DeepSeek вернул ответ без списка результатов. Повторите поиск.');
    const errors = [];
    const noMatchNotes = [];
    (data.errors || []).map(String).forEach(note => {
      // Some responses put a successful empty search in errors. Only reclassify
      // explicit no-match messages; access and partial-search failures stay errors.
      if (kind === 'threads' && !data.items.length && /не найден[оы]?\\s+(?:обсуждений|совпадений|сообщений|результатов)/i.test(note) && !/(?:недоступ|не удалось|ошибк|не выполнен|не проверен|нет доступа)/i.test(note)) noMatchNotes.push(note);
      else errors.push(note);
    });
    const items = [];
    const seen = new Set();
    for (const item of data.items) {
      if (!item || typeof item !== 'object') { errors.push('Пропущен некорректный результат поиска.'); continue; }
      if (kind === 'fcrm') {
        const key = String(item.key || '').trim().toUpperCase();
        if (key === issueKey || seen.has(key)) continue;
        if (!/^FCRM-[0-9]+$/.test(key) || typeof item.title !== 'string' || !item.title.trim() || typeof item.status !== 'string' || !item.status.trim()) {
          errors.push('Пропущена задача без корректного ключа, названия или статуса.');
          continue;
        }
        seen.add(key);
        items.push({ key, title:item.title.trim(), status:item.status.trim(), kind:item.kind === 'duplicate' ? 'duplicate' : 'related', reason:typeof item.reason === 'string' ? item.reason.trim().slice(0,240) : '' });
      } else {
        try {
          const url = new URL(String(item.url || ''));
          if (url.protocol !== 'https:' || url.username || url.password || !['chatzone.o3t.ru', 'chatzone.o3.ru'].includes(url.hostname) || !/\\/pl\\/[^/]+\\/?$/.test(url.pathname) || typeof item.text !== 'string' || !item.text.trim()) throw new Error('invalid');
          if (seen.has(url.href)) continue;
          seen.add(url.href);
          items.push({ url: url.href, text: item.text.trim().slice(0, 300) });
        } catch (_) { errors.push('Пропущено сообщение без корректной ссылки chatZone или текста.'); }
      }
    }
    const coverage = kind === 'fcrm' && ['checked','partial','unavailable'].includes(data.coverage) ? data.coverage : undefined;
    return { items: items.slice(0, 10), errors: Array.from(new Set(errors)), coverage, message: [typeof data.message === 'string' ? data.message : '', ...noMatchNotes].filter(Boolean).join(' ') };
  }

  function addThreadChannels(state) {
    const urls = state.channels.trim().split(/[\\s,;]+/).filter(Boolean).map(value => {
      let url;
      try { url = new URL(value); } catch (_) { throw new Error('Некорректная ссылка на канал: ' + value); }
      if (url.protocol !== 'https:' || url.username || url.password || !['chatzone.o3t.ru', 'chatzone.o3.ru'].includes(url.hostname) || !/^\\/[^/]+\\/channels\\/[^/]+\\/?$/.test(url.pathname)) throw new Error('Некорректная ссылка на канал: ' + value);
      return url.origin + url.pathname.replace(/\\/$/, '');
    });
    urls.forEach(url => { if (!state.choices.some(choice => choice.url === url)) state.choices.push({ url, checked: true }); });
    state.channels = '';
  }

  async function runThreadChannelStep(key, reply = '', retryIndex = -1) {
    const state = getTicketSearchState(key, 'threads');
    const previous = retryIndex >= 0 ? state.history[retryIndex] : null;
    if (state.loading || (retryIndex >= 0 && (!previous || (!previous.error && !previous.errors.length))) || (retryIndex < 0 && !state.queue[state.index])) return;
    const channel = previous ? previous.channel : state.queue[state.index];
    if (previous) reply = previous.reply || '';
    const conversation = state.history.filter((step, index) => step.channel === channel && (retryIndex < 0 || index < retryIndex) && !step.error && !step.errors.length).map(step => ({ reply: step.reply, response: step.response }));
    state.loading = true;
    state.retryIndex = retryIndex;
    state.error = '';
    renderStructure();
    let step = { channel, reply, response: '', items: null, errors: [], error: '', raw: '', message: '' };
    try {
      const text = await new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { reject(new Error('Поиск доступен в установленном расширении Chrome')); return; }
        chrome.runtime.sendMessage({type:'o3ds:chat',mode:'search_threads',issueKey:key,approvedDescription:JSON.stringify({channels:[channel],reply,conversation})}, response => {
          const error = chrome.runtime.lastError;
          if (error || !response?.ok) reject(new Error(error?.message || response?.error || 'Нет ответа DeepSeek'));
          else resolve(response.text || '');
        });
      });
      step.response = String(text);
      try { Object.assign(step, parseTicketSearchResponse(step.response, 'threads', key)); }
      catch (error) { step.error = String(error.message || error); step.raw = step.response; }
    } catch (error) {
      step.error = String(error.message || error);
      step.response = step.error;
    } finally {
      if (retryIndex >= 0) state.history[retryIndex] = step;
      else { state.history.push(step); state.reply = ''; }
      state.loading = false;
      state.retryIndex = -1;
      if (selectedTaskKey === key) renderStructure();
    }
  }

  function renderThreadChannelControls(key, state) {
    const locked = state.queue.length > 0 || state.loading;
    const disabled = locked ? ' disabled' : '';
    let html = '<div style="font-size:11px;color:#64748b;margin-bottom:8px;">Последние 30 дней. Выберите каналы и перетащите их в нужном порядке. Проверяется один канал за шаг.</div>';
    html += '<div style="max-height:260px;overflow:auto;margin-bottom:10px;">' + state.choices.map((choice, index) =>
      '<div data-thread-channel-row="' + index + '" data-issue-key="' + escapeHtml(key) + '" draggable="' + !locked + '" style="display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid #e2e8f0;">' +
      '<span aria-hidden="true" style="color:#94a3b8;cursor:grab;">⠿</span><label style="display:flex;gap:6px;align-items:center;min-width:0;flex:1;"><input type="checkbox" data-thread-channel-check="' + index + '" data-issue-key="' + escapeHtml(key) + '"' + (choice.checked ? ' checked' : '') + disabled + '><span style="overflow-wrap:anywhere;">' + escapeHtml(new URL(choice.url).pathname.split('/').pop()) + '</span></label>' +
      '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-thread-channel-move="' + index + '" data-direction="-1" data-issue-key="' + escapeHtml(key) + '" aria-label="Канал выше"' + (locked || index === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-thread-channel-move="' + index + '" data-direction="1" data-issue-key="' + escapeHtml(key) + '" aria-label="Канал ниже"' + (locked || index === state.choices.length - 1 ? ' disabled' : '') + '>↓</button></div>').join('') + '</div>';
    if (!locked) html += '<label>Дополнительные каналы<textarea data-ticket-search-channels="' + escapeHtml(key) + '" rows="2" placeholder="Ссылки на каналы, каждая с новой строки" style="width:100%;box-sizing:border-box;resize:vertical;">' + escapeHtml(state.channels) + '</textarea></label><button type="button" class="ozon-ext-btn" data-thread-channels-add data-issue-key="' + escapeHtml(key) + '" style="margin:6px 0;">Добавить каналы</button>';
    if (state.queue.length) html += '<div style="font-weight:600;margin:8px 0;">Канал ' + (state.index + 1) + ' из ' + state.queue.length + ': ' + escapeHtml(new URL(state.queue[state.index]).pathname.split('/').pop()) + '</div>';
    return html;
  }

  function renderThreadSearchResult(key, item) {
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #e2e8f0;"><div style="white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;flex:1;">' + escapeHtml(item.text) + '</div><div style="display:flex;gap:6px;flex-shrink:0;"><a class="ozon-ext-btn ozon-ext-btn-surface" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">Открыть сообщение</a><button type="button" class="ozon-ext-btn" data-thread-link-url="' + escapeHtml(item.url) + '" data-issue-key="' + escapeHtml(key) + '">Связать</button></div></div>';
  }

  function renderThreadSearchHistory(key, state) {
    let html = state.history.map((step, index) => '<details' + (index === state.history.length - 1 || step.error || step.errors.length || state.retryIndex === index ? ' open' : '') + ' style="margin:10px 0;"><summary style="font-weight:600;">' + escapeHtml(new URL(step.channel).pathname.split('/').pop()) + (step.reply ? ' · уточнение' : '') + '</summary><div style="padding-top:8px;">' +
      (step.error ? '<div role="alert" style="color:#b42318;">' + escapeHtml(step.error) + '</div>' : '') +
      (step.message ? '<p>' + escapeHtml(step.message) + '</p>' : '') +
      (step.items && !step.items.length ? '<p>' + (step.errors.length ? 'Нет подтверждённых результатов. Есть ошибки поиска.' : 'Совпадений не найдено.') + '</p>' : '') +
      (step.items || []).map(item => renderThreadSearchResult(key, item)).join('') +
      step.errors.map(error => '<div style="color:#b42318;">' + escapeHtml(error) + '</div>').join('') +
      ((step.error || step.errors.length) ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-thread-search-retry="' + index + '" data-issue-key="' + escapeHtml(key) + '"' + (state.loading ? ' disabled' : '') + '>' + (state.loading && state.retryIndex === index ? 'Повторный поиск…' : 'Повторить поиск') + '</button>' : '') +
      (step.raw ? '<details><summary>Ответ DeepSeek</summary>' + renderAnswerMarkup(step.raw) + '</details>' : '') + '</div></details>').join('');
    if (state.queue.length && !state.loading && state.history.length) {
      html += '<div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="ozon-ext-btn" data-thread-search-next data-issue-key="' + escapeHtml(key) + '"' + (state.index + 1 >= state.queue.length ? ' disabled' : '') + '>Продолжить</button><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-thread-search-reset data-issue-key="' + escapeHtml(key) + '">Изменить каналы</button></div>';
      if (state.index + 1 >= state.queue.length) html += '<p>' + (state.history.some(step => step.error || step.errors.length) ? 'Поиск завершён с ошибками. Можно повторить поиск в нужном канале.' : 'Все выбранные каналы проверены. Можно уточнить последний результат.') + '</p>';
      html += '<textarea data-thread-search-reply="' + escapeHtml(key) + '" rows="3" placeholder="Уточнение по текущему каналу" style="width:100%;box-sizing:border-box;margin-top:10px;resize:vertical;">' + escapeHtml(state.reply) + '</textarea><button type="button" class="ozon-ext-btn" data-thread-search-answer data-issue-key="' + escapeHtml(key) + '"' + (!state.reply.trim() ? ' disabled' : '') + '>Ответить</button>';
    }
    return html;
  }

  function renderTicketSearchSection(key, kind) {
    const state = getTicketSearchState(key, kind);
    const title = kind === 'fcrm' ? 'Похожие задачи FCRM' : 'Обсуждения chatZone';
    const button = kind === 'fcrm' ? 'Искать похожие в FCRM' : 'Искать по тредам';
    let body = '';
    if (state.open) {
      if (kind === 'threads') body += renderThreadChannelControls(key, state);
      if (kind === 'fcrm' || !state.queue.length) body += '<button type="button" class="ozon-ext-btn" data-ticket-search-run="' + kind + '" data-issue-key="' + escapeHtml(key) + '"' + (state.loading ? ' disabled' : '') + '>' + button + '</button>';
      if (kind === 'threads') body += renderThreadSearchHistory(key, state);
      if (state.loading) {
        body += '<div role="status" aria-label="Поиск выполняется" style="padding-top:10px;">' + [90, 65, 80].map(width => '<div class="ozon-ext-skeleton" style="display:block;height:18px;margin:10px 0;width:' + width + '%;"></div>').join('') + '</div>';
      } else {
        if (state.error) body += '<div role="alert" style="margin-top:10px;color:#b42318;">' + escapeHtml(state.error) + '</div>';
        if (state.items) {
          if (state.coverage === 'unavailable') body += '<p>Поиск дублей недоступен.</p>';
          else if (state.coverage === 'partial') body += '<p>Проверена часть задач. Возможны пропущенные совпадения.</p>';
          else if (!state.items.length) body += '<p>' + (state.errors.length ? 'Подтверждённых результатов нет. Поиск выполнен с ошибками.' : 'Среди проверенных задач совпадений нет.') + '</p>';
          body += state.items.map(item => kind === 'fcrm'
            ? '<div class="' + reviewRowClass(item.key,item.status) + '" style="display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid #e2e8f0;"><div style="min-width:0;flex:1;"><a href="/browse/' + encodeURIComponent(item.key) + '" target="_blank" rel="noopener noreferrer" style="color:#005bff;font-weight:700;">' + escapeHtml(item.key) + '</a><div style="overflow-wrap:anywhere;">' + escapeHtml(item.title) + '</div>' + (item.reason ? '<small>' + (item.kind === 'duplicate' ? 'Возможный дубль · ' : 'Связанная задача · ') + escapeHtml(item.reason) + '</small>' : '') + '</div>' + getStatusBadgeHtml(item.status) + '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-similar-link="' + escapeHtml(item.key) + '" data-issue-key="' + escapeHtml(key) + '">Связать</button></div>'
            : renderThreadSearchResult(key, item)).join('');
        }
        if (state.errors.length) body += '<div role="alert" style="margin-top:10px;color:#b42318;">' + state.errors.map(error => '<div>' + escapeHtml(error) + '</div>').join('') + '</div>';
        if (state.raw) body += '<details style="margin-top:10px;"><summary>Ответ DeepSeek</summary><div>' + renderAnswerMarkup(state.raw) + '</div></details>';
      }
    }
    return '<div class="ozon-ext-section-card"><button type="button" class="ozon-ext-section-head ' + (state.open ? '' : 'collapsed') + '" data-ticket-search-toggle="' + kind + '" data-issue-key="' + escapeHtml(key) + '" aria-expanded="' + state.open + '" style="width:100%;border:0;text-align:left;"><span class="ozon-ext-disclosure-trigger" style="display:flex;align-items:center;gap:6px;"><span aria-hidden="true" style="color:var(--ozon-fcrm-link,#005BFF);font-size:10px;">▾</span><span>' + title + '</span></span></button>' + (state.open ? '<div class="ozon-ext-disclosure-content" aria-live="polite" aria-busy="' + state.loading + '" style="padding:12px;">' + body + '</div>' : '') + '</div>';
  }

  function showLinksSnackbar(message) {
    let stack = document.getElementById('ozon-links-snackbars');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'ozon-links-snackbars';
      stack.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:100100;width:min(560px,calc(100vw - 48px));max-height:calc(100vh - 48px);overflow-y:auto;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(stack);
    }
    const bar = document.createElement('div');
    {
      bar.className = 'ozon-links-snackbar';
      bar.setAttribute('role', 'status');
      bar.setAttribute('aria-live', 'polite');
      bar.style.cssText = 'position:relative;overflow:hidden;padding:14px 16px 18px;border-radius:12px;background:#071026;color:white;box-shadow:0 8px 28px #07102633;font:13px/1.5 sans-serif;display:flex;align-items:flex-start;gap:12px;flex-shrink:0;pointer-events:auto;';
      const text = document.createElement('div');
      text.style.cssText = 'white-space:normal;overflow:auto;max-height:140px;min-width:0;flex:1;';
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Закрыть';
      close.style.cssText = 'border:0;background:transparent;color:#a9d2ff;cursor:pointer;padding:0;font:inherit;';
      close.onclick = () => bar.remove();
      const progress = document.createElement('div');
      progress.style.cssText = 'position:absolute;bottom:0;left:0;height:3px;width:100%;background:#459bff;transform-origin:left;display:none;';
      bar.append(text, close, progress);
      stack.appendChild(bar);
    }
    bar.firstChild.textContent = message;
    let timer = null, startedAt = 0, remaining = 5000;
    const progress = bar.lastChild;
    const resume = () => {
      if (!bar.isConnected || remaining <= 0) return;
      startedAt = Date.now();
      progress.style.display = 'block';
      progress.style.transition = 'none';
      progress.style.transform = 'scaleX(' + (remaining / 5000) + ')';
      requestAnimationFrame(() => { progress.style.transition = 'transform ' + remaining + 'ms linear'; progress.style.transform = 'scaleX(0)'; });
      timer = setTimeout(() => bar.remove(), remaining);
    };
    bar.addEventListener('mouseenter', () => { if (!timer) return; clearTimeout(timer); timer = null; remaining = Math.max(0, remaining - (Date.now() - startedAt)); progress.style.transition = 'none'; progress.style.transform = 'scaleX(' + (remaining / 5000) + ')'; });
    bar.addEventListener('mouseleave', () => { if (progress.style.display !== 'none' && !timer) resume(); });
    return (nextMessage, html = false) => {
      if (!bar.isConnected) return;
      if (html) {
        const tmp = document.createElement('div'); tmp.innerHTML = nextMessage;
        bar.firstChild.textContent = (tmp.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 240);
      } else bar.firstChild.textContent = nextMessage;
      clearTimeout(timer); timer = null; remaining = 5000;
      if (!bar.matches(':hover')) resume(); else progress.style.display = 'block';
    };
  }


  const threadThemeLinks = (${createJiraDraftLinkClient.toString()})();
  const threadWriter = (${createFcrmThreadWriter.toString()})((key, themeKey) => threadThemeLinks.apply(key, {kind:'theme',key:themeKey,reason:''}),
    (key, proposal) => threadThemeLinks.apply(key, {kind:'development',key:proposal.key,reason:''}));

  let resumeThreadFromDetails = null;

  async function openThreadCreationSidebar(event) {
    const launcher = event.currentTarget;
    const existing = document.getElementById('ozon-thread-sidebar');
    if (existing) { existing.hidden = false; existing.querySelector('[data-thread-close]').focus(); return; }
    const panel = document.createElement('aside');
    panel.id = 'ozon-thread-sidebar';
    panel.className = 'ozon-ext-sidebar';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'ozon-thread-title');
    const stepStart = (number,title) => '<li data-thread-step="' + number + '"><div class="ozon-thread-step-heading"><span class="ozon-thread-step-marker" aria-hidden="true">' + number +
      '</span><h3 tabindex="-1">' + title + '</h3></div><p data-thread-step-summary hidden></p><div data-thread-step-body' + (number === 1 ? '' : ' hidden') + '>';
    const stepEnd = '</div></li>';
    panel.innerHTML = '<div data-thread-width role="separator" tabindex="0" aria-label="Ширина панели" aria-orientation="vertical">⋮</div><header class="ozon-thread-head ozon-ext-sidebar-header"><h2 id="ozon-thread-title" tabindex="-1">Создать FCRM из треда</h2><button type="button" data-thread-close class="ozon-ext-btn ozon-ext-btn-surface">Закрыть</button></header>' +
      '<div class="ozon-ext-sidebar-body"><p data-thread-status role="status" tabindex="-1">Загружаю типы задач и компоненты FCRM…</p><ol class="ozon-thread-steps" aria-label="Этапы создания задачи">' +
      stepStart(1,'Исходные данные') +
      '<form data-thread-source><label class="ozon-ext-field-label">Ссылки на треды chatZone<textarea name="urls" rows="3" required aria-describedby="ozon-thread-url-hint" placeholder="https://chatzone.o3t.ru/o3/pl/…"></textarea></label>' +
      '<small id="ozon-thread-url-hint">До 10 ссылок, каждая с новой строки.</small>' +
      '<label class="ozon-ext-field-label">Тип задачи<input name="issueType"></label><label class="ozon-ext-field-label">Компонент FCRM<input name="component"></label>' +
      '<label class="ozon-ext-field-label">Дополнительная информация<textarea name="additionalInfo" rows="3"></textarea></label>' +
      '<div class="ozon-thread-actions"><button class="ozon-ext-btn" type="submit" disabled>Подготовить черновик</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-load-fields hidden>Повторить загрузку полей Jira</button></div></form>' +
      '<section data-thread-preflight class="ozon-ext-section-card" aria-labelledby="ozon-thread-preflight-title" hidden><h3 id="ozon-thread-preflight-title" class="ozon-ext-section-head" tabindex="-1"></h3>' +
      '<div class="ozon-thread-section-body"><p data-thread-preflight-message></p><ul data-thread-preflight-matches></ul><div class="ozon-thread-actions">' +
      '<button type="button" class="ozon-ext-btn" data-thread-preflight-continue>Продолжить к черновику</button>' +
      '<button type="button" class="ozon-ext-btn" data-thread-preflight-retry>Повторить проверку</button>' +
      '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-thread-preflight-back>Изменить исходные данные</button></div></div></section>' + stepEnd +
      stepStart(2,'Черновик') + '<details data-thread-context-sources class="ozon-ext-section-card" hidden><summary class="ozon-ext-section-head">Дополнительные источники</summary><ul></ul></details>' +
      '<section data-thread-review hidden>' +
      '<label class="ozon-ext-field-label">Название<textarea name="draftSummary" rows="2" maxlength="255"></textarea></label>' +
      '<div><strong class="ozon-ext-field-label">Описание</strong><div class="ozon-thread-editor"><div class="ozon-thread-editor-nav" role="group" aria-label="Режим описания">' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-description-edit aria-pressed="false">Jira Wiki</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-description-read aria-pressed="true">Предпросмотр</button></div>' +
      '<div data-thread-description-preview></div><textarea name="draftDescription" rows="7" aria-label="Описание" hidden></textarea></div></div>' +
      '<div><strong class="ozon-ext-field-label">Тематика FCRM</strong><p data-thread-theme-current>Не выбрана</p><p data-thread-theme-reason hidden></p>' +
      '<div class="ozon-thread-actions"><button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-theme-toggle aria-controls="ozon-thread-theme-menu" aria-expanded="false">Выбрать тематику</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-theme-clear hidden>Без тематики</button></div>' +
      '<div id="ozon-thread-theme-menu" data-thread-theme-menu hidden><label class="ozon-ext-field-label">Поиск по названию или ключу<input type="search" name="draftThemeSearch" autocomplete="off"></label>' +
      '<p data-thread-theme-status role="status"></p><div data-thread-theme-results role="group" aria-label="Подходящие тематики"></div></div></div>' +
      '<div class="ozon-ext-section-card" data-thread-related role="group" aria-labelledby="ozon-thread-links-title"><h3 class="ozon-ext-section-head" id="ozon-thread-links-title">Связи с задачами Jira <small class="ozon-thread-link-note">Необязательно</small></h3><div class="ozon-thread-section-body"><div data-thread-linked-sources></div><div class="ozon-thread-link-add"><input name="linkKey" type="text" aria-label="Ключ или ссылка Jira" placeholder="Ключ или ссылка Jira"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-thread-link-add>Добавить связь</button></div><small data-thread-link-status role="status"></small><div data-thread-issue-proposals></div></div></div></section>' +
      '<section data-thread-early-duplicates hidden><h3>Возможные дубли</h3><p data-thread-early-status role="status"></p><ul></ul></section>' +
      '<form data-thread-followup hidden><div data-thread-question hidden><h3 data-thread-question-heading></h3>' +
      '<p id="ozon-thread-question-text" data-thread-question-text></p><p id="ozon-thread-question-reason" data-thread-question-reason hidden></p>' +
      '<small id="ozon-thread-question-policy" data-thread-question-policy></small></div>' +
      '<label class="ozon-ext-field-label"><span data-thread-reply-label>Дополнение к черновику</span><textarea name="reply" rows="3"></textarea></label>' +
      '<div class="ozon-thread-actions"><button class="ozon-ext-btn ozon-ext-btn-surface" type="submit" disabled>Отправить уточнение</button></div></form>' +
      '<div class="ozon-thread-actions"><button class="ozon-ext-btn" type="button" data-thread-inspect hidden>Проверить перед созданием</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-back>Изменить исходные данные</button></div>' + stepEnd +
      stepStart(3,'Проверка и создание') +
      '<div data-thread-verification><dl data-thread-final-fields></dl><details data-thread-final-description class="ozon-ext-section-card"><summary class="ozon-ext-section-head">Описание задачи</summary><div class="ozon-thread-final-description"></div></details></div>' +
      '<p data-thread-duplicate-note hidden></p><ul data-thread-duplicate-links hidden></ul>' +
      '<div class="ozon-thread-actions" data-thread-create-actions><button class="ozon-ext-btn" type="button" data-thread-create>Создать в Jira</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-confirm-duplicate hidden>Создать отдельную задачу</button></div>' +
      '<section data-thread-result aria-labelledby="ozon-thread-result-heading" hidden><h3 id="ozon-thread-result-heading" tabindex="-1"></h3><p data-thread-result-title hidden></p>' +
      '<button type="button" class="ozon-ext-btn" data-thread-key hidden></button><ul data-thread-existing-matches hidden></ul><div data-thread-link-outcomes hidden></div></section>' +
      '<div class="ozon-thread-actions"><button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-recover hidden>Проверить Jira</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-retry-links hidden>Повторить добавление связей</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-redo-inspect hidden>Повторить проверку</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-edit>Вернуться к черновику</button></div>' + stepEnd + '</ol></div>' +
      '<footer class="ozon-thread-footer" data-thread-footer aria-label="Действия мастера" hidden>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-new hidden>Создать другую</button>' +
      '<button class="ozon-ext-btn ozon-ext-btn-surface" type="button" data-thread-return hidden>Вернуться к доске</button></footer>';
    const form = panel.querySelector('[data-thread-source]');
    const preflight = panel.querySelector('[data-thread-preflight]');
    const preflightTitle = preflight?.querySelector('h3');
    const preflightMessage = preflight?.querySelector('[data-thread-preflight-message]');
    const preflightMatches = preflight?.querySelector('[data-thread-preflight-matches]');
    const preflightContinue = preflight?.querySelector('[data-thread-preflight-continue]');
    const preflightRetry = preflight?.querySelector('[data-thread-preflight-retry]');
    const preflightBack = preflight?.querySelector('[data-thread-preflight-back]');
    const status = panel.querySelector('[data-thread-status]');
    const verification = panel.querySelector('[data-thread-verification]');
    const resultCard = panel.querySelector('[data-thread-result]');
    const resultHeading = resultCard.querySelector('h3');
    const resultTitle = resultCard.querySelector('[data-thread-result-title]');
    const resultLinks = resultCard.querySelector('[data-thread-link-outcomes]');
    const existingMatches = resultCard.querySelector('[data-thread-existing-matches]');
    const returnToBoard = panel.querySelector('[data-thread-return]');
    const linkedSources = panel.querySelector('[data-thread-linked-sources]');
    const issueProposals = panel.querySelector('[data-thread-issue-proposals]');
    const linkField = panel.querySelector('[name="linkKey"]');
    const linkAdd = panel.querySelector('[data-thread-link-add]');
    const linkStatus = panel.querySelector('[data-thread-link-status]');
    const earlyDuplicates = panel.querySelector('[data-thread-early-duplicates]');
    const earlyStatus = earlyDuplicates?.querySelector('[data-thread-early-status]');
    const earlyMatches = earlyDuplicates?.querySelector('ul');
    const contextSources = panel.querySelector('[data-thread-context-sources]');
    const contextSourceList = contextSources.querySelector('ul');
    const submit = form.querySelector('[type="submit"]');
    const retryFields = form.querySelector('[data-thread-load-fields]');
    const heading = panel.querySelector('h2');
    const back = panel.querySelector('[data-thread-back]');
    const newTask = panel.querySelector('[data-thread-new]');
    const close = panel.querySelector('[data-thread-close]');
    const review = panel.querySelector('[data-thread-review]');
    const steps = Array.from(panel.querySelectorAll('[data-thread-step]'));
    const inspect = panel.querySelector('[data-thread-inspect]');
    const redoInspect = panel.querySelector('[data-thread-redo-inspect]');
    const edit = panel.querySelector('[data-thread-edit]');
    const finalFields = panel.querySelector('[data-thread-final-fields]');
    const finalDescription = panel.querySelector('[data-thread-final-description]');
    const duplicateNote = panel.querySelector('[data-thread-duplicate-note]');
    const footer = panel.querySelector('[data-thread-footer]');
    const summary = review.querySelector('[name="draftSummary"]');
    const description = review.querySelector('[name="draftDescription"]');
    const descriptionView = review.querySelector('[data-thread-description-preview]');
    const descriptionEdit = review.querySelector('[data-thread-description-edit]');
    const descriptionRead = review.querySelector('[data-thread-description-read]');
    const widthControl = panel.querySelector('[data-thread-width]');
    const themeCurrent = review.querySelector('[data-thread-theme-current]');
    const themeReason = review.querySelector('[data-thread-theme-reason]');
    const themeToggle = review.querySelector('[data-thread-theme-toggle]');
    const themeClear = review.querySelector('[data-thread-theme-clear]');
    const themeMenu = review.querySelector('[data-thread-theme-menu]');
    const themeInput = themeMenu.querySelector('input');
    const themeStatus = themeMenu.querySelector('[data-thread-theme-status]');
    const themeResults = themeMenu.querySelector('[data-thread-theme-results]');
    const question = panel.querySelector('[data-thread-question]');
    const questionHeading = question.querySelector('[data-thread-question-heading]');
    const questionText = question.querySelector('[data-thread-question-text]');
    const questionReason = question.querySelector('[data-thread-question-reason]');
    const questionPolicy = question.querySelector('[data-thread-question-policy]');
    const duplicateLinks = panel.querySelector('[data-thread-duplicate-links]');
    const followup = panel.querySelector('[data-thread-followup]');
    const reply = followup.querySelector('[name="reply"]');
    const replyLabel = followup.querySelector('[data-thread-reply-label]');
    const continueButton = followup.querySelector('[type="submit"]');
    const createActions = panel.querySelector('[data-thread-create-actions]');
    const create = panel.querySelector('[data-thread-create]');
    const confirmDuplicate = panel.querySelector('[data-thread-confirm-duplicate]');
    const recover = panel.querySelector('[data-thread-recover]');
    const retryLinks = panel.querySelector('[data-thread-retry-links]');
    const keyLink = panel.querySelector('[data-thread-key]');
    let busy = false;
    let ready = false;
    let requestSnapshot = null;
    let preflightDraft = null;
    let draft = null;
    let pendingWrite = null;
    let created = null;
    let initialClarification = false;
    let step = 1;
    let checkedInput = null;
    let reviewResult = null;
    let inspectionFailed = false;
    let loadSearchThemes = null;
    let loadThemeTree = null;
    let catalogUnavailable = false;
    let resetFields = () => {};
    let selectedTheme = null;
    const selectedIssueLinks = new Map();
    const linkKindLabels = new Map();
    const linkKindsByKey = new Map();
    const linkEdits = new Map();
    const hiddenIssueLinks = new Set();
    let loadingLink = false;
    let earlySerial = 0;
    let earlyTimer = 0;
    let themeOverridden = false;
    let themeSearchSerial = 0;
    let themeSearchTimer = 0;


    function renderDescription(target, text) {
      if (target) target.innerHTML = renderAnswerMarkup(text || '');
    }
    function viewDescription(editing, moveFocus = false) {
      if (!descriptionEdit || !descriptionRead || !descriptionView) return;
      description.hidden = !editing;
      descriptionView.hidden = editing;
      descriptionEdit.setAttribute('aria-pressed', String(editing));
      descriptionRead.setAttribute('aria-pressed', String(!editing));
      if (!editing) renderDescription(descriptionView, description.value);
      if (editing && moveFocus) focus(description);
    }
    if (descriptionEdit) descriptionEdit.onclick = () => viewDescription(true, true);
    if (descriptionRead) descriptionRead.onclick = () => viewDescription(false);
    function bindPanelWidth() {
      if (!widthControl) return;
      const widthKey = 'ozon:fcrm-thread-sidebar-width';
      const minimum = () => Math.min(560, window.innerWidth);
      function updateWidth(value, save = false) {
        const width = Math.round(Math.min(window.innerWidth, Math.max(minimum(), value)));
        panel.style.setProperty('--thread-width', width + 'px');
        widthControl.setAttribute('aria-valuemin', String(minimum()));
        widthControl.setAttribute('aria-valuemax', String(window.innerWidth));
        widthControl.setAttribute('aria-valuenow', String(width));
        widthControl.setAttribute('aria-valuetext', width + ' пикселей');
        if (save) try { localStorage.setItem(widthKey, String(width)); } catch (_) {}
      }
      let saved = 0;
      try { saved = Number(localStorage.getItem(widthKey)); } catch (_) {}
      if (Number.isFinite(saved) && saved > 0) updateWidth(saved);
      widthControl.addEventListener('focus', () => updateWidth(panel.getBoundingClientRect().width));
      widthControl.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        widthControl.setPointerCapture(event.pointerId);
      });
      widthControl.addEventListener('pointermove', event => {
        if (widthControl.hasPointerCapture(event.pointerId)) updateWidth(window.innerWidth - event.clientX);
      });
      widthControl.addEventListener('pointerup', event => {
        if (widthControl.hasPointerCapture(event.pointerId)) updateWidth(panel.getBoundingClientRect().width, true);
      });
      widthControl.addEventListener('keydown', event => {
        const current = panel.getBoundingClientRect().width;
        const values = {ArrowLeft:current + 32,ArrowRight:current - 32,Home:minimum(),End:window.innerWidth};
        if (!(event.key in values)) return;
        event.preventDefault();
        updateWidth(values[event.key], true);
      });
    }

    function say(text, tone = busy ? 'progress' : 'info') {
      status.textContent = text;
      status.dataset.tone = tone;
    }
    function focus(target) { if (!panel.hidden && target) target.focus(); }
    function setStep(number, moveFocus = true) {
      step = number;
      steps.forEach((item, index) => {
        const state = index + 1 === step ? 'active' : index + 1 < step ? 'complete' : 'future';
        item.dataset.stepState = state;
        if (state === 'active') item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
        item.querySelector('[data-thread-step-body]').hidden = state !== 'active';
        const caption = item.querySelector('[data-thread-step-summary]');
        caption.hidden = state !== 'complete';
        if (!caption.hidden) {
          caption.textContent = index === 0 ? ['Тредов: ' + requestSnapshot.urls.length, requestSnapshot.issueTypeName, requestSnapshot.componentName].join(' · ') : normalizedSummary(summary.value);
        }
      });
      const active = steps[step - 1];
      active.querySelector('[data-thread-step-body]').prepend(status);
      if (moveFocus) focus(active.querySelector('h3'));
    }
    function draftReady() {
      return Boolean(draft) && !initialClarification && Boolean(normalizedSummary(summary.value) && description.value.trim());
    }
    function updateControls() {
      const locked = busy || Boolean(pendingWrite) || Boolean(created);
      const state = reviewResult?.state;
      const terminal = Boolean(created);
      verification.hidden = terminal || state === 'existing';
      returnToBoard.hidden = !terminal && state !== 'uncertain';
      returnToBoard.disabled = busy;
      footer.hidden = returnToBoard.hidden;
      submit.disabled = busy || !ready;
      if (preflight) for (const button of [preflightContinue,preflightRetry,preflightBack]) button.disabled = busy;
      continueButton.disabled = busy || Boolean(pendingWrite && !created) || !reply.value.trim();
      inspect.hidden = !draft || initialClarification;
      inspect.disabled = locked || loadingLink || !draftReady();
      createActions.hidden = !['ready','possible-duplicate','existing'].includes(state);
      create.hidden = state !== 'ready';
      create.disabled = locked || step !== 3 || !checkedInput;
      confirmDuplicate.hidden = state !== 'possible-duplicate' && state !== 'existing';
      confirmDuplicate.disabled = create.disabled;
      redoInspect.hidden = !inspectionFailed;
      redoInspect.disabled = locked;
      edit.hidden = Boolean(pendingWrite) || terminal;
      edit.disabled = busy;
      recover.hidden = state !== 'uncertain' || Boolean(created);
      recover.disabled = busy;
      retryLinks.disabled = busy;
      newTask.hidden = !created;
      newTask.disabled = busy;
      back.disabled = locked;
      themeToggle.disabled = locked;
      if (descriptionEdit) descriptionEdit.disabled = locked;
      themeClear.disabled = locked;
      if (locked && !themeMenu.hidden) closeThemeMenu();
      if (locked) panel.querySelectorAll('.ozon-ext-search-select-trigger[aria-expanded="true"]').forEach(button => button.click());
      for (const field of form.querySelectorAll('input,textarea,.ozon-ext-search-select button')) field.disabled = busy;
      if (linkField) linkField.disabled = locked || loadingLink;
      if (linkAdd) linkAdd.disabled = locked || loadingLink;
      earlyMatches?.querySelectorAll('button').forEach(button => { button.disabled = locked; });
      for (const field of [summary, description, themeInput, ...issueProposals.querySelectorAll('input,select,button')]) field.disabled = locked;
      reply.disabled = busy;
      form.setAttribute('aria-busy', String(busy));
      review.setAttribute('aria-busy', String(busy));
    }
    function closePanel() {
      if (busy || requestSnapshot || pendingWrite || created) panel.hidden = true;
      else panel.remove();
      (launcher.isConnected ? launcher : document.getElementById('ozon-thread-create'))?.focus({preventScroll:true});
    }
    close.onclick = closePanel;
    returnToBoard.onclick = closePanel;
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closePanel();
      }
    });
    function clearInspection() {
      checkedInput = null;
      reviewResult = null;
      inspectionFailed = false;
      duplicateNote.hidden = true;
      duplicateLinks.hidden = true;
      resultCard.hidden = true;
    }
    function showSources() {
      clearPreflight();
      clearInspection();
      clearEarlyDuplicates();
      setStep(1);
      say('Выберите тип задачи и компонент FCRM.');
      updateControls();
    }
    back.onclick = showSources;
    edit.onclick = () => {
      clearInspection();
      setStep(2);
      queueEarlyDuplicates();
      fitSummary();
      say('Проверьте черновик перед созданием.');
      updateControls();
    };
    function resetDraft() {
      clearPreflight();
      draft = null;
      initialClarification = false;
      loadSearchThemes = null;
      loadThemeTree = null;
      catalogUnavailable = false;
      themeOverridden = false;
      setTheme(null);
      closeThemeMenu();
      review.hidden = true;
      followup.hidden = true;
      selectedIssueLinks.clear();
      linkEdits.clear();
      hiddenIssueLinks.clear();
      clearEarlyDuplicates();
      if (linkField) linkField.value = '';
      if (linkStatus) linkStatus.textContent = '';
      linkedSources.replaceChildren();
      issueProposals.replaceChildren();
      renderContextSources([]);
      reply.value = '';
      showQuestion();
    }
    newTask.onclick = () => {
      form.reset();
      resetFields();
      requestSnapshot = null;
      pendingWrite = null;
      created = null;
      resetDraft();
      inspect.parentNode.before(followup);
      review.before(contextSources);
      keyLink.hidden = true;
      retryLinks.hidden = true;
      finalDescription.open = false;
      showSources();
    };
    document.body.appendChild(panel);
    bindPanelWidth();
    setStep(1, false);
    updateControls();
    focus(heading);

    function requestFromExtension(message) {
      return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
          reject(new Error('Откройте установленное расширение.'));
          return;
        }
        try {
          chrome.runtime.sendMessage(message, response => {
            const failed = chrome.runtime.lastError;
            if (failed || !response) { reject(new Error('Расширение не ответило. Обновите страницу Jira.')); return; }
            resolve(response);
          });
        } catch (_) { reject(new Error('Расширение не ответило. Обновите страницу Jira.')); }
      });
    }

    function themeTerms(query) {
      return (query.toLocaleLowerCase('ru').match(/[\\p{L}\\p{N}]+/gu) || []).slice(0,5);
    }
    async function findThemes(query = '', component = '', limit = 25) {
      const backslash = String.fromCharCode(92);
      const quotedComponent = '"' + component.replaceAll(backslash,backslash + backslash).replaceAll('"',backslash + '"') + '"';
      const scope = 'project = FCRM AND labels = fcrm_umb_epic AND statusCategory != Done' + (component ? ' AND component = ' + quotedComponent : '');
      const search = /^FCRM-\\d+$/i.test(query)
        ? ' AND key = ' + query.toUpperCase()
        : themeTerms(query).map(term => {
          const word = term.slice(0,60);
          return ' AND (summary ~ "' + word + '" OR summary ~ "' + word + '*")';
        }).join('');
      const params = new URLSearchParams({jql:scope + search + ' ORDER BY updated DESC',fields:'summary,description,components,issuelinks',maxResults:String(limit)});
      const response = await fetch('/rest/api/2/search?' + params, {
        credentials:'same-origin',headers:{Accept:'application/json'},signal:AbortSignal.timeout(4000)
      });
      if (!response.ok) throw new Error('Не удалось загрузить тематики Jira.');
      const data = await response.json();
      if (!Array.isArray(data?.issues)) throw new Error('Не удалось загрузить тематики Jira.');
      return data.issues.slice(0,limit).flatMap(issue => (
        /^FCRM-\\d+$/.test(issue.key) && typeof issue.fields?.summary === 'string' && issue.fields.summary.trim()
          ? [{key:issue.key,title:issue.fields.summary.trim().slice(0,255),
            milestone:/(?:^|[\\s\\[])\\s*веха\\s*(?=[:—–\\]-]|$)/i.test(issue.fields.summary),
            parents:(Array.isArray(issue.fields.issuelinks) ? issue.fields.issuelinks : []).flatMap(link => {
              const target = link.inwardIssue || link.outwardIssue;
              const role = link.inwardIssue ? link.type?.inward : link.type?.outward;
              return /^FCRM-\\d+$/.test(target?.key || '') && /задача проекта|project task/i.test(role || '')
                ? [{key:target.key,title:typeof target.fields?.summary === 'string' ? target.fields.summary : target.key}] : [];
            }).slice(0,4),
            description:typeof issue.fields.description === 'string' ? issue.fields.description.slice(0,1600) : '',
            components:Array.isArray(issue.fields.components) ? issue.fields.components.map(component => component.name).filter(name => typeof name === 'string').slice(0,5) : []}] : []
      ));
    }
    function sourceThemes() {
      if (!loadSearchThemes) {
        loadSearchThemes = Promise.allSettled([
          findThemes('', requestSnapshot.componentName), findThemes()
        ]).then(results => {
          const catalog = new Map();
          for (const result of results) if (result.status === 'fulfilled') {
            for (const theme of result.value) if (!catalog.has(theme.key)) catalog.set(theme.key,theme);
          }
          catalogUnavailable = results.every(result => result.status === 'rejected');
          if (catalogUnavailable) loadSearchThemes = null;
          return [...catalog.values()].filter(theme => !theme.milestone).slice(0,25);
        });
      }
      return loadSearchThemes;
    }
    function themeLabel(item) { return item.title + ' · ' + item.key; }
    function setTheme(item, manual = false, reason = '') {
      selectedTheme = item;
      const removedLink = item ? selectedIssueLinks.delete(item.key) : false;
      if (manual) themeOverridden = true;
      themeCurrent.textContent = item ? themeLabel(item) : 'Не выбрана';
      themeReason.textContent = removedLink ? 'Отдельная связь снята: задача уже выбрана тематикой.' : item && !manual ? reason : '';
      themeReason.hidden = !themeReason.textContent;
      themeToggle.textContent = item ? 'Изменить тематику' : 'Выбрать тематику';
      themeClear.hidden = !item;
      if (manual) {
        if (draft && !review.hidden) renderDraftLinks();
        confirmDuplicate.hidden = true;
        duplicateLinks.hidden = true;
      }
    }
    function closeThemeMenu(restoreFocus = false) {
      window.clearTimeout(themeSearchTimer);
      themeSearchSerial += 1;
      themeMenu.hidden = true;
      themeToggle.setAttribute('aria-expanded', 'false');
      if (restoreFocus) focus(themeToggle);
    }
    function renderThemeTree(items, expanded) {
      const nodes = new Map(items.map(item => [item.key,{item,children:new Set()}]));
      const nested = new Set();
      for (const item of items) {
        for (const parent of item.parents || []) {
          if (parent.key === item.key) continue;
          if (!nodes.has(parent.key)) nodes.set(parent.key,{item:{...parent,milestone:true},children:new Set()});
          nodes.get(parent.key).children.add(item.key);
          nested.add(item.key);
        }
      }
      const rendered = new Set();
      function renderNode(key) {
        if (rendered.has(key)) return null;
        rendered.add(key);
        const {item,children} = nodes.get(key);
        const childrenNodes = [...children].flatMap(child => {
          const node = renderNode(child);
          return node ? [node] : [];
        });
        const canSelect = !item.milestone;
        const entry = document.createElement(childrenNodes.length ? 'details' : 'div');
        if (childrenNodes.length) {
          entry.open = expanded || Boolean(selectedTheme && (item.key === selectedTheme.key || children.has(selectedTheme.key)));
          const branch = document.createElement('summary');
          branch.textContent = themeLabel(item);
          entry.appendChild(branch);
        }
        if (canSelect) {
          const option = document.createElement('button');
          option.type = 'button';
          option.dataset.threadThemeOption = item.key;
          option.textContent = childrenNodes.length ? 'Выбрать ' + themeLabel(item) : themeLabel(item);
          option.setAttribute('aria-pressed', String(item.key === selectedTheme?.key));
          option.addEventListener('click', () => {
            setTheme(item,true);
            closeThemeMenu(true);
          });
          entry.appendChild(option);
        } else if (!childrenNodes.length) {
          const note = document.createElement('span');
          note.className = 'ozon-thread-theme-group';
          note.textContent = themeLabel(item);
          entry.appendChild(note);
        }
        if (childrenNodes.length) {
          const subgroup = document.createElement('div');
          subgroup.className = 'ozon-thread-theme-children';
          subgroup.append(...childrenNodes);
          entry.appendChild(subgroup);
        }
        return entry;
      }
      for (const key of [...nodes.keys()].sort((a,b) => Number(nested.has(a)) - Number(nested.has(b)))) {
        const row = renderNode(key);
        if (row) themeResults.appendChild(row);
      }
    }

    function queueThemeSearch() {
      window.clearTimeout(themeSearchTimer);
      const request = ++themeSearchSerial;
      const query = themeInput.value.trim();
      themeResults.replaceChildren();
      themeStatus.textContent = 'Ищу тематики в Jira…';
      themeSearchTimer = window.setTimeout(async () => {
        const terms = themeTerms(query);
        const exactKey = /^FCRM-\\d+$/i.test(query) ? query.toUpperCase() : '';
        const matches = item => exactKey ? item.key === exactKey : terms.every(term => themeLabel(item).toLocaleLowerCase('ru').includes(term));
        if (!loadThemeTree) loadThemeTree = findThemes('', '', 100).catch(() => null);
        const [cached, remote] = await Promise.all([loadThemeTree, query ? findThemes(query).catch(() => null) : Promise.resolve([])]);
        if (request !== themeSearchSerial || themeMenu.hidden || !panel.isConnected) return;
        if (!cached) loadThemeTree = null;
        const candidates = new Map();
        for (const item of cached || []) if (matches(item) || item.parents.some(matches)) candidates.set(item.key,item);
        for (const item of remote || []) if (!exactKey || matches(item) || item.parents.some(matches)) candidates.set(item.key,item);
        if (!candidates.size) {
          themeStatus.textContent = !cached || !remote ? 'Не удалось полностью загрузить тематики Jira. Повторите поиск.' : 'Подходящих тематик нет.';
          return;
        }
        themeStatus.textContent = !cached || !remote ? 'Загружена часть каталога Jira.' : '';
        renderThemeTree([...candidates.values()], Boolean(query));
      }, query ? 260 : 0);
    }
    themeToggle.addEventListener('click', () => {
      if (!themeMenu.hidden) { closeThemeMenu(); return; }
      themeMenu.hidden = false;
      themeToggle.setAttribute('aria-expanded', 'true');
      themeInput.value = '';
      focus(themeInput);
      queueThemeSearch();
    });
    themeClear.addEventListener('click', () => {
      setTheme(null, true);
      closeThemeMenu(true);
    });
    themeInput.addEventListener('input', queueThemeSearch);
    themeMenu.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeThemeMenu(true);
        return;
      }
      const options = Array.from(themeResults.querySelectorAll('button')).filter(button => button.getClientRects().length);
      if (!options.length) return;
      if (event.key === 'Enter' && event.target === themeInput) {
        event.preventDefault();
        options[0].click();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const index = options.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown' ? (index + 1) % options.length : (index <= 0 ? options.length - 1 : index - 1);
        options[next].focus();
      }
    });
    function normalizedSummary(text) { return text.replace(/\\s+/g, ' ').trim(); }
    function fitSummary() {
      if (CSS.supports('field-sizing', 'content')) return;
      summary.style.height = 'auto';
      summary.style.height = summary.scrollHeight + 2 + 'px';
    }
    function readDraft() {
      return {summary:normalizedSummary(summary.value),description:description.value.trim(),themeKey:selectedTheme?.key || ''};
    }
    function showQuestion(text = '', reason = '', required = false) {
      question.hidden = !text;
      questionHeading.textContent = required ? 'Нужно уточнение для задачи' : 'Вопрос к черновику';
      questionText.textContent = text;
      questionReason.textContent = reason;
      questionReason.hidden = !reason;
      questionPolicy.textContent = required ? 'Ответьте, чтобы подготовить черновик.' :
        created ? 'Ответ поможет уточнить предложение к задаче.' : 'Ответ необязателен. Можно перейти к проверке.';
      replyLabel.textContent = text ? 'Ответ на вопрос' : (created ? 'Уточнение к созданной задаче' : 'Дополнение к черновику');
      if (text) {
        reply.setAttribute('aria-describedby', 'ozon-thread-question-text ' + (reason ? 'ozon-thread-question-reason ' : '') + 'ozon-thread-question-policy');
      } else {
        reply.removeAttribute('aria-describedby');
      }
    }


    function safeSourceUrl(value) {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
          ['chatzone.o3t.ru','chatzone.o3.ru'].includes(url.hostname) &&
          /\\/pl\\/[a-z0-9]{26}\\/?$/.test(url.pathname) ? url.href : '';
      } catch (_) { return ''; }
    }
    async function openThreadIssue(key, title, trigger) {
      if (busy || !panel.isConnected) return;
      const opened = await openSharedFcrmDetails({key,summary:title},trigger);
      if (!opened || !panel.isConnected) return;
      panel.hidden = true;
      resumeThreadFromDetails = () => {
        if (!panel.isConnected) return;
        panel.hidden = false;
        focus(trigger.isConnected ? trigger : heading);
      };
      document.getElementById('ozon-ext-sidebar-close')?.focus({preventScroll:true});
    }
    function linkFor(key, label) {
      const href = /^(FCRM|OB|OBFRONT|FTD|FACS)-\\d+$/.test(key) ? '/browse/' + encodeURIComponent(key) : safeSourceUrl(key);
      const element = document.createElement(href ? 'a' : 'span');
      element.textContent = label;
      if (href) {
        element.href = href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        if (/^FCRM-\\d+$/.test(key)) element.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          event.stopPropagation();
          void openThreadIssue(key,label,element);
        });
      }
      return element;
    }
    function parseProposals(value) {
      const proposals = new Map();
      for (const item of Array.isArray(value) ? value : []) {
        if (!item || typeof item.key !== 'string' || typeof item.title !== 'string' || !item.title.trim()) continue;
        const key = item.key.trim().toUpperCase();
        const pattern = item.kind === 'development' ? /^(OB|OBFRONT|FTD|FACS)-\\d+$/ : /^(FCRM|OB|OBFRONT|FTD|FACS)-\\d+$/;
        if (!['development','related'].includes(item.kind) || !pattern.test(key) || proposals.has(key)) continue;
        proposals.set(key,{
          key,kind:item.kind,title:item.title.trim().slice(0,255),
          reason:typeof item.reason === 'string' ? item.reason.trim().slice(0,240) : ''
        });
        if (proposals.size === 10) break;
      }
      return proposals;
    }
    function issueLinkKind(kind) {
      return ({development:'В проекте',related:'Связанная задача',duplicate:'Дубликат'})[kind] || linkKindLabels.get(kind) || 'Связь Jira';
    }
    function createThreadPicker(options, placeholder, selected = null, onPick = () => {}) {
      const wrapper = document.createElement('div');
      wrapper.className = 'ozon-ext-search-select';
      wrapper.style.position = 'relative';
      wrapper.innerHTML = '<button type="button" class="ozon-ext-search-select-trigger" aria-expanded="false"><span class="ozon-ext-search-select-value"></span><span class="ozon-ext-search-select-caret" aria-hidden="true"></span></button><div class="ozon-ext-combo-popover ozon-ext-search-select-popover" hidden><input type="search" autocomplete="off"><div class="ozon-ext-combo-list"></div></div>';
      const trigger = wrapper.querySelector('button');
      const label = trigger.querySelector('span');
      function updateLabel() {
        label.textContent = selected?.name || placeholder;
        trigger.setAttribute('aria-label', selected ? placeholder + ': ' + selected.name : placeholder);
      }
      updateLabel();
      const menu = wrapper.querySelector('.ozon-ext-combo-popover');
      const search = menu.querySelector('input');
      const list = menu.querySelector('.ozon-ext-combo-list');
      menu.style.setProperty('display', 'none', 'important');
      search.placeholder = placeholder;
      search.setAttribute('aria-label', placeholder);
      const close = () => {
        menu.hidden = true;
        menu.style.setProperty('display', 'none', 'important');
        trigger.setAttribute('aria-expanded', 'false');
      };
      const draw = () => {
        list.replaceChildren();
        const query = search.value.trim().toLocaleLowerCase('ru');
        options.filter(item => item.name.toLocaleLowerCase('ru').includes(query)).forEach(item => {
          const option = document.createElement('button');
          option.type = 'button';
          option.className = 'ozon-ext-combo-item ozon-ext-search-select-option' + (selected?.id === item.id ? ' active' : '');
          option.textContent = item.name;
          option.style.cssText = 'background:transparent;border:0;text-align:left;width:100%;';
          option.onclick = () => {
            selected = item;
            updateLabel();
            onPick(item);
            close();
            trigger.focus();
          };
          list.appendChild(option);
        });
        if (!list.children.length) list.textContent = 'Ничего не найдено';
      };
      trigger.onclick = () => {
        if (!menu.hidden) { close(); return; }
        if (trigger.disabled) return;
        panel.querySelectorAll('.ozon-ext-search-select-trigger[aria-expanded="true"]').forEach(other => other.click());
        menu.hidden = false;
        menu.style.setProperty('display', 'flex', 'important');
        trigger.setAttribute('aria-expanded', 'true');
        search.value = '';
        draw();
        search.focus();
      };
      search.oninput = draw;
      wrapper.addEventListener('keydown', event => {
        if (event.key === 'Escape') { close(); trigger.focus(); event.preventDefault(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const items = Array.from(list.querySelectorAll('button'));
          const index = items.indexOf(document.activeElement);
          const next = event.key === 'ArrowDown' ? index + 1 : index <= 0 ? items.length - 1 : index - 1;
          items[(next + items.length) % items.length]?.focus();
          event.preventDefault();
        }
        if (event.key === 'Enter' && document.activeElement === search) {
          event.preventDefault();
          list.querySelector('button')?.click();
        }
      });
      wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
      return {element:wrapper, selected:() => selected, update(next) {
        options = next;
        selected = next.find(item => item.id === selected?.id) || selected;
        updateLabel();
        if (!menu.hidden) draw();
      }, reset() {
        selected = null;
        updateLabel();
        close();
      }};
    }

    function renderDraftLinks() {
      linkedSources.replaceChildren();
      if (draft.urls.length) {
        const sources = document.createElement('div');
        const title = document.createElement('strong');
        title.className = 'ozon-ext-field-label';
        title.textContent = 'Исходные треды chatZone';
        const list = document.createElement('ul');
        for (const url of draft.urls) {
          const item = document.createElement('li');
          item.append(linkFor(url,url));
          list.appendChild(item);
        }
        sources.append(title,list);
        linkedSources.appendChild(sources);
      }
      const proposals = new Map([...linkEdits, ...[...draft.links].filter(([key]) => !linkEdits.has(key))]);
      if (selectedTheme) proposals.delete(selectedTheme.key);
      for (const key of hiddenIssueLinks) proposals.delete(key);
      issueProposals.replaceChildren();
      for (const item of [...proposals.values()].slice(0,10)) {
        const row = document.createElement('div');
        row.className = 'ozon-thread-proposal';
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'ozon-thread-link-check';
        check.setAttribute('aria-label','Добавить связь с ' + item.key);
        check.checked = selectedIssueLinks.has(item.key);
        const text = document.createElement('span');
        text.append(document.createTextNode(item.title + ' · '),linkFor(item.key,item.key));
        if (item.reason) {
          const reason = document.createElement('small');
          reason.textContent = item.reason;
          text.appendChild(reason);
        }
        const builtIn = item.key.startsWith('FCRM-') ? ['related','duplicate'] : ['related','development'];
        const options = new Map(builtIn.map(kind => [kind,issueLinkKind(kind)]));
        if (!options.has(item.kind)) options.set(item.kind,issueLinkKind(item.kind));
        const choices = () => [...options].map(([id,name]) => ({id,name}));
        const type = createThreadPicker(choices(),'Тип связи с ' + item.key,{id:item.kind,name:options.get(item.kind)},option => {
          if (busy || pendingWrite || created) return;
          const edited = {...item,kind:option.id};
          linkEdits.set(item.key,edited);
          if (check.checked) selectedIssueLinks.set(item.key,edited);
        });
        if (typeof threadWriter.listLinkKinds === 'function') {
          if (!linkKindsByKey.has(item.key)) linkKindsByKey.set(item.key,threadWriter.listLinkKinds(item.key).catch(() => {
            linkKindsByKey.delete(item.key);
            return [];
          }));
          linkKindsByKey.get(item.key).then(kinds => {
            if (!kinds.length || !type.element.isConnected) return;
            for (const {kind,label} of kinds) { options.set(kind,label); linkKindLabels.set(kind,label); }
            type.update(choices());
          });
        }
        check.addEventListener('change', () => {
          if (busy || pendingWrite || created) return;
          const edited = {...item,kind:type.selected().id};
          linkEdits.set(item.key,edited);
          if (check.checked) selectedIssueLinks.set(item.key,edited);
          else selectedIssueLinks.delete(item.key);
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Удалить';
        remove.className = 'ozon-ext-btn ozon-ext-btn-negative';
        remove.setAttribute('aria-label','Удалить связь с ' + item.key);
        remove.onclick = () => {
          if (busy || pendingWrite || created) return;
          hiddenIssueLinks.add(item.key);
          linkEdits.delete(item.key);
          selectedIssueLinks.delete(item.key);
          renderDraftLinks();
          focus(linkField);
        };
        const actions = document.createElement('span');
        actions.className = 'ozon-thread-proposal-actions';
        actions.append(type.element,remove);
        row.append(check,text,actions);
        issueProposals.appendChild(row);
      }
      updateControls();
    }

    function stageLink(item) {
      if (selectedTheme?.key === item.key) {
        linkStatus.textContent = 'Эта задача уже выбрана тематикой.';
        return false;
      }
      if (linkEdits.size >= 10 && !linkEdits.has(item.key)) {
        linkStatus.textContent = 'Можно подготовить до 10 дополнительных связей.';
        return false;
      }
      hiddenIssueLinks.delete(item.key);
      const entry = linkEdits.get(item.key) || {...item,kind:'related'};
      linkEdits.set(item.key,entry);
      selectedIssueLinks.set(item.key,entry);
      linkStatus.textContent = item.key + ' добавлена в список связей.';
      renderDraftLinks();
      return true;
    }

    async function addIssueLink() {
      if (busy || pendingWrite || created || loadingLink || !draft) return;
      let key = linkField.value.trim().toUpperCase();
      if (key.startsWith('HTTPS://')) {
        try {
          const url = new URL(linkField.value.trim());
          key = url.origin === 'https://jit.o3.ru' && !url.username && !url.password
            ? (url.pathname.match(/^\\/browse\\/([A-Z]+-\\d+)\\/?$/i)?.[1] || '').toUpperCase() : '';
        } catch (_) { key = ''; }
      }
      if (!/^(FCRM|OB|OBFRONT|FTD|FACS)-\\d+$/.test(key)) {
        linkStatus.textContent = 'Введите ключ Jira, например FCRM-1234, или ссылку на задачу.';
        return;
      }
      const currentDraft = draft;
      loadingLink = true;
      linkStatus.textContent = 'Проверяю задачу ' + key + '…';
      updateControls();
      try {
        const target = await threadWriter.resolveLinkTarget(key);
        if (draft === currentDraft && !busy && !pendingWrite && stageLink(target)) linkField.value = '';
      } catch (error) {
        if (draft === currentDraft) linkStatus.textContent = error.status === 403 || error.status === 404
          ? 'Задача ' + key + ' недоступна или не найдена.' : 'Jira не подтвердила задачу ' + key + '. Повторите поиск.';
      } finally {
        loadingLink = false;
        updateControls();
      }
    }

    function combineDuplicates(checked, suggested) {
      if (!['ready','possible-duplicate'].includes(checked?.state) || !Array.isArray(suggested) || !suggested.length) return checked;
      const matches = new Map(checked.issues.map(item => [item.key,item]));
      for (const item of suggested) {
        const jira = matches.get(item.key);
        const reason = [jira?.reason, 'DeepSeek: ' + item.reason].filter(Boolean).join(' · ');
        matches.set(item.key,{...item,...jira,reason});
      }
      return {state:'possible-duplicate',issues:[...matches.values()],jiraDuplicateKeys:checked.issues.map(item => item.key)};
    }
    function clearEarlyDuplicates() {
      earlySerial += 1;
      window.clearTimeout(earlyTimer);
      if (earlyDuplicates) earlyDuplicates.hidden = true;
    }

    function queueEarlyDuplicates(result = draft, wait = false, prior) {
      if (!earlyDuplicates || !result || !requestSnapshot) return;
      clearEarlyDuplicates();
      const serial = earlySerial;
      earlyDuplicates.hidden = false;
      earlyStatus.textContent = 'Проверяю совпадения в Jira…';
      earlyMatches.replaceChildren();
      earlyTimer = window.setTimeout(async () => {
        try {
          const input = {urls:result.urls,mentionedIssueKeys:result.mentionedIssueKeys,summary:result.summary ? normalizedSummary(summary.value) : ''};
          const checked = prior || combineDuplicates(await threadWriter.inspect(input),result.duplicates);
          if (serial !== earlySerial || step !== 2) return;
          earlyStatus.textContent = ({
            ready:result.duplicateSearch === 'checked' ? 'DeepSeek не нашёл дублей среди прочитанных задач Jira.' : result.duplicateSearch === 'partial' ? 'DeepSeek проверил часть задач. Возможны пропущенные совпадения.' : 'Поиск дублей через DeepSeek недоступен. Учитываются совпадения по треду, упоминаниям и названию.',
            existing:'По этому треду уже есть задача. Откройте её в Jira.',
            'possible-duplicate':'Проверьте совпадения. Их можно включить в связи новой задачи.',
            uncertain:'Jira ещё проверяет результат предыдущей записи.'
          })[checked.state] || 'Jira не подтвердила проверку.';
          for (const match of checked.issues || []) {
            if (!/^FCRM-\\d+$/.test(match.key)) continue;
            const row = document.createElement('li');
            const link = linkFor(match.key,match.title ? match.title + ' · ' + match.key : match.key);
            row.appendChild(link);
            if (match.reason) {
              const reason = document.createElement('small');
              reason.textContent = match.reason;
              row.appendChild(reason);
            }
            if (checked.state === 'possible-duplicate' && result.summary) {
              const move = document.createElement('button');
              move.type = 'button';
              move.className = 'ozon-ext-btn ozon-ext-btn-surface';
              move.textContent = 'В список связей';
              move.onclick = () => {
                if (busy || pendingWrite || created) return;
                if (stageLink({...match,title:match.title || match.key})) move.textContent = 'В списке связей';
              };
              row.appendChild(move);
            }
            earlyMatches.appendChild(row);
          }
        } catch (_) {
          if (serial === earlySerial && step === 2) earlyStatus.textContent = 'Jira недоступна. Повторная проверка пройдёт перед созданием.';
        }
      }, wait ? 340 : 0);
    }


    function renderContextSources(value) {
      contextSourceList.replaceChildren();
      let read = 0;
      let unavailable = 0;
      for (const source of Array.isArray(value) ? value.slice(0,32) : []) {
        if (!source || !['jira','confluence','logs'].includes(source.kind) || !['read','unavailable'].includes(source.status)) continue;
        const row = document.createElement('li');
        const type = {jira:'Jira',confluence:'Confluence',logs:'Логи'}[source.kind];
        const title = typeof source.title === 'string' ? source.title.trim().slice(0,200) : '';
        let href = '';
        try {
          const url = new URL(source.url);
          const trusted = source.kind === 'jira' ? url.hostname === 'jit.o3.ru' :
            source.kind === 'confluence' ? ['confluence.o3.ru','confluence.o3t.ru'].includes(url.hostname) :
            /^(?:logs?|logging|logviewer|seq)(?:[-.][a-z0-9-]+)?\\.o3t?\\.ru$/.test(url.hostname);
          if (trusted && url.protocol === 'https:' && !url.username && !url.password && !url.port) href = url.href;
        } catch (_) {}
        const reference = document.createElement(href ? 'a' : 'span');
        reference.textContent = source.kind === 'logs' && href ? 'Логи · ' + new URL(href).hostname : title || type;
        if (href) {
          reference.href = href;
          reference.target = '_blank';
          reference.rel = 'noopener noreferrer';
        }
        const state = document.createElement('span');
        const reason = typeof source.reason === 'string' ? source.reason.trim().slice(0,180) : '';
        if (source.status === 'read') {
          read += 1;
          state.textContent = ' · прочитан';
        } else {
          unavailable += 1;
          state.textContent = ' · недоступен' + (reason ? ' (' + reason + ')' : '');
        }
        row.append(reference,state);
        contextSourceList.appendChild(row);
      }
      if (catalogUnavailable) {
        unavailable += 1;
        const item = document.createElement('li');
        item.textContent = 'Каталог тематик Jira · не удалось загрузить';
        contextSourceList.appendChild(item);
      }
      contextSources.hidden = !read && !unavailable;
      contextSources.open = unavailable > 0;
      contextSources.querySelector('summary').textContent = 'Дополнительные источники: прочитано ' + read + (unavailable ? ', недоступно ' + unavailable : '');
    }

    function readResult(text) {
      let result;
      try { result = JSON.parse(text); } catch (_) { throw new Error('DeepSeek вернул черновик в неожиданном формате. Повторите запрос.'); }
      const questionReason = typeof result?.questionReason === 'string' ? result.questionReason.trim().slice(0,180) : '';
      const themeReason = typeof result?.themeReason === 'string' ? result.themeReason.trim().slice(0,240) : '';
      const sourceUrls = Array.isArray(result?.urls) && result.urls.length > 0 && result.urls.length <= requestSnapshot.urls.length && result.urls.every(url => typeof url === 'string') ? result.urls : requestSnapshot.urls;
      const duplicates = Array.isArray(result?.duplicates) ? result.duplicates.slice(0,8).filter(item => /^FCRM-\\d+$/.test(item?.key) && typeof item.title === 'string' && typeof item.reason === 'string' && item.reason.trim()).map(item => ({key:item.key,title:item.title.slice(0,255),reason:item.reason.trim().slice(0,240)})) : [];
      const foundThemes = Array.isArray(result?.themes) ? result.themes.slice(0,25).filter(item => /^FCRM-\\d+$/.test(item?.key) && typeof item.title === 'string') : [];
      const duplicateSearch = ['checked','partial','unavailable'].includes(result?.duplicateSearch) ? result.duplicateSearch : 'unavailable';
      const mentions = Array.isArray(result?.mentionedIssueKeys) ? result.mentionedIssueKeys.filter(key => /^FCRM-\\d+$/.test(key)).slice(0,12) : [];
      if (result?.status === 'clarification') {
        const detail = typeof result.message === 'string' ? result.message.trim().slice(0,500) : '';
        return {question:detail || 'Какие детали нужно учесть в черновике?', questionReason, sources:result.sources, urls:sourceUrls, mentionedIssueKeys:mentions, duplicates, duplicateSearch};
      }
      if (result?.status !== 'draft' || typeof result.summary !== 'string' || !result.summary.trim() || typeof result.description !== 'string' || !result.description.trim()) {
        throw new Error('DeepSeek вернул неполный черновик. Повторите запрос.');
      }
      return {
        summary:normalizedSummary(result.summary).slice(0,255),
        description:result.description.trim(),
        themeKey:/^FCRM-\\d+$/.test(result.themeKey) ? result.themeKey : '',
        question:typeof result.message === 'string' ? result.message.trim().slice(0,500) : '',
        questionReason,
        themeReason,
        sources:result.sources,
        links:parseProposals(result.links),
        duplicates, duplicateSearch, themeSearch:result.themeSearch, foundThemes,
        mentionedIssueKeys:mentions,
        urls:sourceUrls
      };
    }
    function modelFailure(response) {
      if (response?.errorCode === 'THREAD_INPUT_INVALID') return 'Проверьте ссылки на треды и поля задачи.';
      const hint = String(response?.error || '').toLowerCase();
      if (/сесси|bearer|\\b40[13]\\b|авторизац|войдите/.test(hint)) return 'Проверьте вход в DeepSeek и chatZone в этом браузере.';
      if (/chatzone|тред|нескольких|сообщени/.test(hint)) return 'Не удалось прочитать все обсуждения. Проверьте ссылки и доступ к ним в chatZone.';
      if (/формат|неполный|json/.test(hint)) return 'DeepSeek вернул неполный черновик. Повторите запрос.';
      return 'DeepSeek не подготовил черновик. Повторите запрос.';
    }
    function renderDraftResult(result, themes, previousDraft, keepSummary, keepDescription, earlyCheck) {
      renderContextSources(result.sources);
      followup.hidden = false;
      reply.value = '';
      setStep(2);
      initialClarification = !result.summary;
      showQuestion(result.question, result.questionReason, initialClarification);
      if (initialClarification) {
        say('Для черновика нужно уточнение.', 'warning');
      } else {
        draft = result;
        summary.value = keepSummary ? previousDraft.summary : result.summary;
        description.value = keepDescription ? previousDraft.description : result.description;
        if (description.hidden) renderDescription(descriptionView, description.value);
        if (!themeOverridden) {
          const candidate = [...(result.foundThemes || []), ...themes].find(item => item.key === result.themeKey);
          setTheme(candidate || null, false, result.themeReason);
          if (!candidate) {
            themeReason.textContent = result.themeSearch === 'unavailable' ? 'Поиск по контексту Jira недоступен. Тематику можно указать вручную.' : 'DeepSeek не подтвердил подходящую тематику. Её можно указать вручную.';
            themeReason.hidden = false;
          }
        }
        review.hidden = false;
        fitSummary();
        renderDraftLinks();
        say(keepSummary || keepDescription ? 'Черновик уточнён. Ваши правки сохранены.' : 'Черновик готов. Проверьте поля и перейдите к проверке Jira.', 'success');
      }
      queueEarlyDuplicates(result, false, earlyCheck);
      return initialClarification ? reply : steps[1].querySelector('h3');
    }

    function clearPreflight() {
      preflightDraft = null;
      if (!preflight) return;
      preflight.hidden = true;
      preflightMatches.replaceChildren();
      form.hidden = false;
    }

    function acceptPreflight(result) {
      const prepared = preflightDraft;
      clearPreflight();
      return renderDraftResult(prepared.result,prepared.themes,null,false,false,result);
    }

    async function inspectBeforeDraft() {
      const {result} = preflightDraft;
      say('Проверяю возможные дубли в Jira…');
      let checked;
      try {
        const input = {urls:result.urls,mentionedIssueKeys:result.mentionedIssueKeys,summary:result.summary || ''};
        checked = await threadWriter.inspect(input);
        if (!['ready','existing','possible-duplicate','uncertain'].includes(checked?.state) || !Array.isArray(checked.issues) ||
            (['existing','possible-duplicate'].includes(checked.state) && !checked.issues.some(issue => /^FCRM-\\d+$/.test(issue?.key)))) throw new Error();
      } catch (_) {
        checked = {state:'unavailable',issues:[]};
      }
      checked = combineDuplicates(checked,result.duplicates);
      if (checked.state === 'ready') return acceptPreflight(checked);
      const existing = checked.state === 'existing';
      const possible = checked.state === 'possible-duplicate';
      preflightDraft.checked = checked;
      preflight.hidden = false;
      form.hidden = true;
      preflightContinue.hidden = false;
      preflightRetry.hidden = existing || possible;
      preflightContinue.textContent = existing ? 'Подготовить отдельную задачу' : result.summary ? 'Продолжить к черновику' : 'Продолжить к уточнению';
      preflightTitle.textContent = existing ? 'Задача уже есть в Jira' : possible ? 'Возможные дубли' : 'Проверка дублей';
      preflightMessage.textContent = ({
        existing:'С этим тредом уже связана задача. Откройте её карточку или продолжите, если вам нужна отдельная задача.',
        'possible-duplicate':result.summary ? 'Посмотрите совпадения. Если нужна отдельная задача, продолжите к черновику.' : 'Посмотрите совпадения. Если нужна отдельная задача, продолжите к уточнению.',
        uncertain:'Исход предыдущей записи ещё не подтверждён. Перед созданием Jira проверит его снова.',
        unavailable:'Jira не ответила на проверку дублей. Повторите проверку или продолжите. Перед созданием проверка обязательна.'
      })[checked.state];
      preflightMatches.replaceChildren();
      for (const match of checked.issues || []) {
        if (!/^FCRM-\\d+$/.test(match.key)) continue;
        const item = document.createElement('li');
        item.appendChild(linkFor(match.key,match.title ? match.title + ' · ' + match.key : match.key));
        if (match.reason) {
          const reason = document.createElement('small');
          reason.textContent = match.reason;
          item.appendChild(reason);
        }
        preflightMatches.appendChild(item);
      }
      const possibleStatus = checked.jiraDuplicateKeys ? 'DeepSeek нашёл похожие задачи в Jira.' : 'Jira нашла возможные совпадения.';
      say(existing ? 'Jira нашла задачу с этим тредом.' : possible ? possibleStatus : 'Проверку Jira нужно повторить.', 'warning');
      return preflightTitle;
    }


    async function requestDraft(clarification) {
      if (busy || !requestSnapshot || pendingWrite || created) return;
      const previousDraft = draft && readDraft();
      const keepSummary = previousDraft && previousDraft.summary !== draft.summary;
      const keepDescription = previousDraft && previousDraft.description !== draft.description;
      const clarificationWithQuestion = clarification && !question.hidden && questionText.textContent
        ? questionText.textContent + '\\nОтвет: ' + clarification : clarification;
      busy = true;
      if (!created) clearEarlyDuplicates();
      confirmDuplicate.hidden = true;
      duplicateLinks.hidden = true;
      updateControls();
      say('Читаю обсуждения chatZone…');
      focus(status);
      const requestId = crypto.randomUUID();
      const progress = {
        source:'Читаю обсуждения chatZone…',
        model:'Готовлю черновик FCRM…',
        format:'Проверяю черновик…'
      };
      let progressActive = true;
      const timer = window.setInterval(() => requestFromExtension({type:'o3ds:thread-status',requestId}).then(value => {
        if (progressActive && progress[value.phase]) say(progress[value.phase]);
      }).catch(() => {}), 3000);
      let nextFocus = status;
      try {
        const themes = await sourceThemes();
        const response = await requestFromExtension({
          type:'o3ds:chat', mode:'thread', issueKey:'FCRM', requestId,
          approvedDescription:JSON.stringify({
            ...requestSnapshot, themes, clarification:clarificationWithQuestion, previousDraft:previousDraft ? {
              summary:previousDraft.summary,description:previousDraft.description,themeKey:previousDraft.themeKey
            } : undefined,
            continuation:Boolean(clarification)
          })
        });
        if (!response.ok) throw new Error(modelFailure(response));
        const result = readResult(response.text);
        if (preflight && (step === 1 || !draft && result.summary)) {
          setStep(1, false);
          progressActive = false;
          preflightDraft = {result,themes,checked:null};
          nextFocus = await inspectBeforeDraft();
        } else {
          nextFocus = renderDraftResult(result,themes,previousDraft,keepSummary,keepDescription);
        }
      } catch (error) {
        say(error.message, 'error');
      } finally {
        progressActive = false;
        window.clearInterval(timer);
        busy = false;
        updateControls();
        focus(nextFocus);
      }
    }

    function writeInput() {
      return {
        ...readDraft(), urls:draft.urls, issueTypeId:requestSnapshot.issueTypeId,
        componentId:requestSnapshot.componentId, mentionedIssueKeys:draft.mentionedIssueKeys, suggestedDuplicates:draft.duplicates, duplicateSearch:draft.duplicateSearch,
        issueLinks:[...selectedIssueLinks.values()].map(({key,kind}) => ({key,kind}))
      };
    }
    function showFinalFields() {
      finalFields.replaceChildren();
      const fields = [
        ['Название',checkedInput.summary], ['Тип',requestSnapshot.issueTypeName],
        ['Компонент',requestSnapshot.componentName], ['Тематика',selectedTheme ? themeLabel(selectedTheme) : 'Не выбрана'],
        ['Треды chatZone',String(checkedInput.urls.length)],
        ['Связи с задачами',checkedInput.issueLinks.map(item => item.key + ' · ' + issueLinkKind(item.kind)).join(', ') || 'Не выбраны']
      ];
      for (const [label,value] of fields) {
        const name = document.createElement('dt');
        name.textContent = label;
        const detail = document.createElement('dd');
        detail.textContent = value;
        finalFields.append(name,detail);
      }
      renderDescription(finalDescription.querySelector('.ozon-thread-final-description'), checkedInput.description);
      finalDescription.open = true;
    }
    function showDuplicates(result) {
      const note = {
        existing:'Создавайте отдельную задачу, только если найденная задача не подходит. Проверьте также возможные дубли ниже.',
        'possible-duplicate':'Проверьте найденные совпадения перед созданием отдельной задачи.',
        uncertain:'Jira ещё не подтвердила результат. Проверьте существующую запись.'
      }[result.state];
      duplicateNote.textContent = note || '';
      duplicateNote.hidden = !note;
      duplicateLinks.replaceChildren();
      const issues = result.state === 'existing' ? result.possibleIssues : result.issues;
      for (const item of issues || []) {
        if (!/^FCRM-\\d+$/.test(item.key)) continue;
        const row = document.createElement('li');
        row.append(linkFor(item.key,item.title ? item.title + ' · ' + item.key : item.key));
        if (item.reason) {
          const reason = document.createElement('div');
          reason.textContent = item.reason;
          row.append(reason);
        }
        duplicateLinks.append(row);
      }
      duplicateLinks.hidden = !duplicateLinks.childElementCount;
    }
    async function checkTask(input, moveFocus = true) {
      if (busy || created || pendingWrite || !input) return;
      clearInspection();
      checkedInput = input;
      showFinalFields();
      setStep(3, moveFocus);
      busy = true;
      say('Проверяю возможные дубли в Jira…');
      updateControls();
      try {
        const result = combineDuplicates(await threadWriter.inspect(checkedInput),checkedInput.suggestedDuplicates);
        if (!['ready','existing','possible-duplicate','uncertain'].includes(result?.state) ||
            !Array.isArray(result?.issues) ||
            (['existing','possible-duplicate'].includes(result.state) && !result.issues.some(issue => /^FCRM-\\d+$/.test(issue.key)))) {
          throw new Error('Jira не подтвердила результат проверки.');
        }
        reviewResult = result;
        showDuplicates(result);
        if (result.state === 'existing') {
          const matches = result.issues.filter(issue => /^FCRM-\\d+$/.test(issue.key));
          if (matches.length === 1) {
            showResultCard({key:matches[0].key,title:matches[0].title,existing:true});
          } else {
            showResultCard({existing:true});
            resultHeading.textContent = 'Найдены задачи с этими источниками';
            for (const item of matches) {
              const row = document.createElement('li');
              row.append(linkFor(item.key,item.title ? item.title + ' · ' + item.key : item.key));
              if (item.reason) row.append(document.createTextNode(' · ' + item.reason));
              existingMatches.appendChild(row);
            }
            existingMatches.hidden = false;
          }
          focus(keyLink.hidden ? resultHeading : keyLink);
        }
        if (result.state === 'uncertain') pendingWrite = checkedInput;
        const messages = {
          ready:checkedInput.duplicateSearch === 'checked' ? 'Jira не нашла точных совпадений. DeepSeek не нашёл дублей среди прочитанных задач.' : checkedInput.duplicateSearch === 'partial' ? 'Jira не нашла точных совпадений. DeepSeek проверил часть задач.' : 'Jira не нашла точных совпадений. Поиск дублей через DeepSeek недоступен.',
          existing:result.issues.length > 1 ? 'В Jira найдены задачи с этими источниками.' : 'В Jira найдена задача с теми же источниками.',
          'possible-duplicate':'Найдены возможные дубли.',
          uncertain:'Результат предыдущего создания требует проверки.'
        };
        say(messages[result.state], result.state !== 'ready' || checkedInput.duplicateSearch !== 'checked' ? 'warning' : 'info');
      } catch (error) {
        inspectionFailed = true;
        say(error?.code === 'THREAD_DUPLICATE' ? error.message : 'Jira не завершила проверку. Повторите её перед созданием.', 'error');
      } finally {
        busy = false;
        updateControls();
      }
    }

    function showResultCard(result) {
      resultCard.hidden = false;
      resultHeading.textContent = result.existing ? 'Найдена задача в Jira' : 'Задача создана в Jira';
      resultTitle.textContent = result.title || (!result.existing ? checkedInput?.summary || '' : '');
      resultTitle.hidden = !resultTitle.textContent;
      keyLink.hidden = !result.key;
      if (result.key) {
        keyLink.textContent = 'Открыть карточку ' + result.key;
        keyLink.onclick = () => openThreadIssue(result.key,result.title,keyLink);
      }
      existingMatches.replaceChildren();
      existingMatches.hidden = true;
      resultLinks.replaceChildren();
      const outcomes = Array.isArray(result.linkOutcomes) ? result.linkOutcomes :
        (result.linkFailures || []).map(key => ({key, kind:safeSourceUrl(key) ? 'source' : 'related', confirmed:false}));
      for (const [confirmed, title] of [[true,'Связи подтверждены Jira'],[false,'Связи требуют проверки']]) {
        const list = document.createElement('ul');
        for (const item of outcomes) {
          if (!item || item.confirmed !== confirmed || typeof item.key !== 'string') continue;
          const row = document.createElement('li');
          const type = {source:'Тред chatZone',theme:'Тематика'}[item.kind] || issueLinkKind(item.kind);
          row.append(document.createTextNode((type || 'Связь') + ' · '),linkFor(item.key,item.key));
          row.dataset.confirmed = String(confirmed);
          list.appendChild(row);
        }
        if (!list.childElementCount) continue;
        const subtitle = document.createElement('h4');
        subtitle.textContent = title;
        resultLinks.append(subtitle,list);
      }
      resultLinks.hidden = !resultLinks.childElementCount;
    }
    function showWritten(result) {
      created = result;
      showQuestion();
      followup.hidden = true;
      duplicateNote.hidden = true;
      duplicateLinks.hidden = true;
      showResultCard(result.existing && result.canRetryLinks !== true ? {...result,linkOutcomes:[],linkFailures:[]} : result);
      const safeToRetry = !result.existing || result.canRetryLinks === true;
      const failures = safeToRetry ? result.linkFailures || [] : [];
      retryLinks.hidden = !failures.length || !safeToRetry;
      say(failures.length ? 'Задача создана. Часть связей Jira не подтвердила.' : result.existing ? 'Jira нашла существующую задачу.' : 'Jira подтвердила создание задачи.',
        failures.length || result.existing ? 'warning' : 'success');
    }
    async function writeTask(action, acceptDuplicates = false) {
      if (busy || step !== 3) return;
      if (action === 'create') {
        const exact = reviewResult?.state === 'existing';
        const expected = acceptDuplicates ? ['possible-duplicate','existing'] : ['ready'];
        if (created || pendingWrite || !expected.includes(reviewResult?.state) || !checkedInput) return;
        pendingWrite = exact ? {
          ...checkedInput, separateIntentId:crypto.randomUUID(),
          confirmedExistingKeys:reviewResult.issues.map(issue => issue.key),
          confirmedDuplicateKeys:(reviewResult.possibleIssues || []).map(issue => issue.key)
        } : acceptDuplicates ? {
          ...checkedInput, confirmedDuplicateKeys:reviewResult.jiraDuplicateKeys || reviewResult.issues.map(issue => issue.key)
        } : checkedInput;
      }
      if (!pendingWrite) return;
      busy = true;
      updateControls();
      say(action === 'create' ? 'Создаю задачу FCRM…' : action === 'recover' ? 'Проверяю результат в Jira…' : 'Проверяю и добавляю связи в Jira…');
      focus(status);
      let nextFocus = status;
      let refresh = false;
      try {
        const result = await threadWriter[action](pendingWrite);
        if (action === 'recover' && result.separateApproval) pendingWrite = {...pendingWrite,...result.separateApproval};
        if (action !== 'retryLinks') draft = {...draft, ...pendingWrite};
        reviewResult = null;
        showWritten(action === 'retryLinks' && created ? {...result, existing:created.existing,
          title:result.title || created.title, canRetryLinks:created.canRetryLinks} : result);
        nextFocus = keyLink;
      } catch (error) {
        if (error.code === 'THREAD_POSSIBLE_DUPLICATE' || error.code === 'THREAD_EXACT_REVIEW') {
          pendingWrite = null;
          refresh = true;
        } else if (error.code === 'THREAD_CREATE_UNKNOWN' || error.code === 'THREAD_CREATED_DIFFERENT' || action === 'recover') {
          reviewResult = {state:'uncertain',issues:[]};
          showDuplicates(reviewResult);
          say('Jira не подтвердила результат создания. Проверьте Jira перед повторной попыткой.', 'warning');
          nextFocus = recover;
        } else if (action === 'retryLinks') {
          say('Не удалось подтвердить связи. Повторите добавление или откройте задачу в Jira.', 'error');
          nextFocus = retryLinks;
        } else {
          pendingWrite = null;
          reviewResult = null;
          inspectionFailed = true;
          keepOnlyInspectionError(error);
        }
      } finally {
        busy = false;
        if (!refresh) {
          updateControls();
          focus(nextFocus);
        }
      }
      if (refresh) {
        await checkTask(checkedInput);
        if (['existing','possible-duplicate'].includes(reviewResult?.state)) say('Список совпадений изменился. Проверьте его перед подтверждением.', 'warning');
      }
    }
    function keepOnlyInspectionError(error) {
      duplicateNote.hidden = true;
      duplicateLinks.hidden = true;
      say(error.code === 'THREAD_REQUIRED_FIELD' || error.code === 'THREAD_DUPLICATE'
        ? error.message : 'Jira не завершила создание задачи. Проверьте поля, доступ и соединение.', 'error');
    }
    inspect.onclick = () => {
      if (step === 2 && draftReady()) checkTask(writeInput());
    };
    redoInspect.onclick = () => checkTask(checkedInput);
    create.onclick = () => writeTask('create');
    confirmDuplicate.onclick = () => writeTask('create', true);
    recover.onclick = () => writeTask('recover');
    retryLinks.onclick = () => writeTask('retryLinks');
    if (preflight) {
      preflightContinue.onclick = () => {
        if (busy || !preflightDraft) return;
        const checked = preflightDraft.checked?.state === 'possible-duplicate' ? preflightDraft.checked : undefined;
        const next = acceptPreflight(checked);
        updateControls();
        focus(next);
      };
      preflightRetry.onclick = async () => {
        if (busy || !preflightDraft) return;
        busy = true;
        updateControls();
        const next = await inspectBeforeDraft();
        busy = false;
        updateControls();
        focus(next);
      };
      preflightBack.onclick = () => { showSources(); focus(form.querySelector('[name="urls"]')); };
    }
    followup.onsubmit = event => {
      event.preventDefault();
      const clarification = reply.value.trim();
      if (clarification) requestDraft(clarification);
    };
    summary.addEventListener('input', fitSummary);
    summary.addEventListener('input', () => { if (!busy && !pendingWrite && !created && step === 2) queueEarlyDuplicates(draft, true); });
    if (linkAdd) linkAdd.onclick = addIssueLink;
    linkField?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); void addIssueLink(); } });
    description.addEventListener('input', () => renderDescription(descriptionView, description.value));
    [summary, description, reply].forEach(field => field.addEventListener('input', () => { confirmDuplicate.hidden = true; duplicateLinks.hidden = true; updateControls(); }));
    async function loadFields() {
      retryFields.hidden = true;
      say('Загружаю типы задач и компоненты FCRM…');
      try {
        const [types, components] = await Promise.all([loadIssueCreateMeta('FCRM'), loadIssueCreateComponents('FCRM')]);
        const availableTypes = types.filter(type => !type.subtask && !/sub.?task|подзадач/i.test(type.name));
        if (!availableTypes.length || !components.length) throw new Error();
        const makeSelect = (name, options, placeholder) => {
          const picker = createThreadPicker(options,placeholder);
          form.querySelector('[name="' + name + '"]').replaceWith(picker.element);
          return Object.assign(picker.selected,{reset:picker.reset});
        };
        const getType = makeSelect('issueType', availableTypes, 'Поиск типа задачи');
        const getComponent = makeSelect('component', components, 'Поиск компонента');
        resetFields = () => { getType.reset(); getComponent.reset(); };
        ready = true;
        say('Выберите тип задачи и компонент FCRM.');
        updateControls();
        form.onsubmit = event => {
          event.preventDefault();
          if (busy) return;
          const values = new FormData(form);
          const urls = Array.from(new Set(String(values.get('urls') || '').trim().split(/[\\s,;]+/).filter(Boolean)));
          const type = getType();
          const component = getComponent();
          if (!urls.length || urls.length > 10) { say('Укажите от 1 до 10 ссылок на треды chatZone.'); return; }
          const invalidUrl = urls.some(value => {
            try {
              const url = new URL(value);
              return url.protocol !== 'https:' || url.username || url.password || url.port ||
                !['chatzone.o3t.ru','chatzone.o3.ru'].includes(url.hostname) || !/^\\/(?:[^/]+\\/)*pl\\/[a-z0-9]{26}\\/?$/.test(url.pathname);
            } catch (_) { return true; }
          });
          if (invalidUrl) { say('Проверьте ссылки на сообщения chatZone.'); return; }
          if (!type || !component) { say('Выберите тип задачи и компонент из списков.'); return; }
          const input = {
            urls, issueTypeName:type.name, componentName:component.name, issueTypeId:String(type.id),
            componentId:String(component.id), additionalInfo:String(values.get('additionalInfo') || '').trim()
          };
          if (JSON.stringify(input) === JSON.stringify(requestSnapshot) && (draft || initialClarification)) {
            setStep(2);
            if (draft) fitSummary();
            say(initialClarification ? 'Для черновика нужно уточнение.' : 'Проверьте черновик перед созданием.');
            updateControls();
            return;
          }
          resetDraft();
          requestSnapshot = input;
          requestDraft('');
        };
      } catch (_) {
        say('Не удалось загрузить поля FCRM. Проверьте наличие доступа к проекту Jira.', 'error');
        retryFields.hidden = false;
      }
    }
    retryFields.onclick = loadFields;
    await loadFields();
  }

  function generationIconHtml() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 1) scale(.85)"/><path d="m19 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/></svg>';
  }

  function renderMissingCustomerIndicator(task) {
    if (/^(ошибка|bug)$/i.test(String(task.issueTypeName || '').trim())) return '';
    const customer = task.customer || {};
    const name = String(customer.name || '').trim().toLowerCase();
    if (customer.login || (name && !['не указан', 'не назначен', '—', '-', 'unknown', 'unassigned'].includes(name))) return '';
    return '<span class="ozon-ext-delivery-indicator" role="img" aria-label="Нет заказчика" title="Не указан Заказчик/Owner" style="color:#D92D20;background:#FFF0EE;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 10-4M18 12v5M18 21h.01"/></svg></span>';
  }

  function renderDeliveryIndicators(task) {
    const links = (task.inProjectLinks || []).filter(link => !isCanceledStatus(link.status));
    return '<span class="ozon-ext-delivery-indicators">' + [
      { project: 'FTD', label: 'Дизайн' },
      { project: 'OB', label: 'Бэкенд' },
      { project: 'OBFRONT', label: 'Фронтенд' }
    ].map(group => {
      const items = links.filter(link => String(link.key || '').split('-')[0].toUpperCase() === group.project);
      const state = !items.length ? 'absent' : items.every(isDoneTask) ? 'done' : 'active';
      const title = group.label + ': ' + (!items.length ? 'нет задач' : state === 'done' ? 'все задачи закрыты' : 'есть незакрытые задачи');
      const detail = title + (items.length ? ' · ' + items.map(item => item.key + ' — ' + item.status).join('; ') : '');
      return '<span class="ozon-ext-delivery-indicator ' + state + '" role="img" aria-label="' + escapeHtml(title) + '" title="' + escapeHtml(detail) + '">' + getLinkedProjectGroupMeta(group.project + '-1', false).iconSvg + '</span>';
    }).join('') + '</span>';
  }

  async function refreshGeneratedTaskLinks(key) {
    const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=issuelinks', {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Не удалось обновить связи ' + key);
    const raw = await response.json();
    await syncStrategyLinks(raw);
    const updated = (await normalizeAndEnrichJiraIssues([raw]))[0];
    if (!updated) throw new Error('Нет данных связей ' + key);
    tasks = tasks.map(task => task.key === key ? Object.assign({}, task, {
      projectTaskLinks: updated.projectTaskLinks,
      inProjectLinks: updated.inProjectLinks,
      otherLinks: updated.otherLinks
    }) : task);
  }
  let isInitialBoardLoading = false;
  let initialLoadProgress = 4;
  let initialLoadStage = 'Подключаемся к Jira';
  let groupByComponentInsideSprint = true;
  const productGroupingStorage = 'ozon-product-grouping-v1';
  let productGroupingOrder = (() => { try { const saved = JSON.parse(localStorage.getItem(productGroupingStorage) || 'null'); if (Array.isArray(saved) && saved.every((x) => ['sprint', 'component'].includes(x)) && new Set(saved).size === saved.length) return saved; } catch (_) {} return ['sprint', 'component']; })();
  groupByComponentInsideSprint = productGroupingOrder.length > 1;
  let productExpandedGroups = {};
  let selectedTaskKey = null;
  let isSidebarOpen = false;
  let sidebarSource = null;
  function syncStrategyIssue(raw) {
    const issue = raw?.key && strategicDashboard.getState().issues.find((item) => item.key === raw.key);
    if (!issue?.fields || !raw.fields) return;
    Object.assign(issue.fields, raw.fields);
    strategicDashboard.invalidateGraph();
  }
  async function refreshStrategyIssue(key, fields, deferRender) {
    if (!strategicDashboard.getState().issues.some((item) => item.key === key)) return;
    try {
      const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=' + encodeURIComponent(fields), {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) return;
      syncStrategyIssue(await response.json());
      if (!deferRender && activeDashboardView === 'strategy') renderStructure();
    } catch (_) { /* Следующее обновление списка повторит чтение из Jira. */ }
  }
  async function syncStrategyLinks(raw) {
    const issue = raw?.key && strategicDashboard.getState().issues.find((item) => item.key === raw.key);
    if (!issue?.fields || !Array.isArray(raw.fields?.issuelinks)) return;
    const oldLinks = issue.fields.issuelinks || [];
    const newLinks = raw.fields.issuelinks;
    const signature = (links) => links.map((link) => String(link.id || '') + ':' + ((link.inwardIssue || link.outwardIssue || {}).key || '') + ':' + (link.type?.name || '')).sort().join('|');
    const changed = signature(oldLinks) !== signature(newLinks);
    syncStrategyIssue(raw);
    if (!changed) return;
    const keys = [...new Set([...oldLinks, ...newLinks].map((link) => (link.inwardIssue || link.outwardIssue || {}).key).filter((key) => key && key !== raw.key))];
    await Promise.all(keys.map((key) => refreshStrategyIssue(key, 'issuelinks', true)));
  }
  let isEditingDescription = false;
  const sidebarDrafts = new Map();
  function sidebarDraft(key) {
    if (!sidebarDrafts.has(key)) sidebarDrafts.set(key, {});
    return sidebarDrafts.get(key);
  }
  async function saveSidebarFields(key, fields) {
    const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key), {
      method:'PUT', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({fields})
    });
    if (!response.ok) throw new Error('Jira ответила с ошибкой ' + response.status);
    tasks = tasks.map((task) => task.key === key ? Object.assign({}, task, fields) : task);
    saveTaskOverride(key, fields);
    const draft = sidebarDraft(key);
    Object.keys(fields).forEach((field) => { if (draft[field] === fields[field] || (field === 'summary' && String(draft[field] || '').trim() === fields[field])) delete draft[field]; });
    const strategyIssue = strategicDashboard.getState().issues.find((issue) => issue.key === key);
    if (strategyIssue?.fields) { Object.assign(strategyIssue.fields, fields); strategicDashboard.invalidateGraph(); }
  }
  async function confirmSidebarExit() {
    const key = selectedTaskKey;
    const draft = sidebarDrafts.get(key);
    if (!draft || (!Object.prototype.hasOwnProperty.call(draft, 'summary') && !Object.prototype.hasOwnProperty.call(draft, 'description'))) return true;
    const choice = await new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'ozon-sidebar-draft-overlay';
      overlay.innerHTML = '<div class="ozon-sidebar-draft-dialog" role="dialog" aria-modal="true" aria-labelledby="ozon-draft-title"><strong id="ozon-draft-title">Есть несохранённые изменения</strong><p>Сохранить изменения задачи ' + escapeHtml(key) + ' перед закрытием?</p><div><button type="button" data-choice="stay">Продолжить редактирование</button><button type="button" data-choice="discard">Не сохранять</button><button type="button" class="primary" data-choice="save">Сохранить</button></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => { const value = button.getAttribute('data-choice'); overlay.remove(); resolve(value); }));
      overlay.querySelector('[data-choice="stay"]').focus();
    });
    if (choice === 'stay') return false;
    if (choice === 'discard') { sidebarDrafts.delete(key); return true; }
    const fields = Object.assign({}, draft);
    if (Object.prototype.hasOwnProperty.call(fields, 'summary')) { fields.summary = fields.summary.trim(); if (!fields.summary) { showSaveToast('Название задачи не может быть пустым'); return false; } }
    try { await saveSidebarFields(key, fields); sidebarDrafts.delete(key); showSaveToast('Изменения ' + key + ' сохранены'); return true; }
    catch (error) { showSaveToast('Не удалось сохранить изменения: ' + (error.message || 'ошибка запроса')); return false; }
  }
  let loadingSidebarTaskKey = null;
  let sidebarBlockLoading = { taskKey: null, desc: false, params: false, links: false, ipMeta: false };
  let frontDesignLinksByKey = {};
  const rememberedSidebarWidth=Number(localStorage.getItem(STORAGE_KEY_SIDEBAR_W));
  const legacySidebarWidth=Number(localStorage.getItem('ozon_fcrm_sidebar_width_v31'));
  let sidebarWidth=rememberedSidebarWidth>=340 && rememberedSidebarWidth<=1040 ? rememberedSidebarWidth : legacySidebarWidth>=800 && legacySidebarWidth<=1040 ? legacySidebarWidth : 900;
  let sidebarExpanded=false;
  function sidebarWidthCss() {
    return sidebarExpanded ? '100vw' : 'min(' + sidebarWidth + 'px,var(--ozon-sidebar-standard-limit))';
  }
  function expandCornersIcon(expanded) {
    const corners = expanded ? 'M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5' : 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5';
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + corners + '"/></svg>';
  }
  function sidebarExpandTitle() {
    return sidebarExpanded ? 'Вернуть обычную ширину' : 'Развернуть сайдбар';
  }

  // ПО УМОЛЧАНИЮ ВСЕ СПРИНТЫ И ВСЕ КОМПОНЕНТЫ СВЕРНУТЫ!
  // Храним явно развернутые пользователем спринты и компоненты:
  let expandedSprints = {}; // { [sprintName]: true }
  let expandedComponents = {}; // { [sprintName + '::' + compName]: true }
  let expandedSubRows = {};

  // Сворачиваемые аккордеоны в сайдбаре и группы связей OB / OBFRONT / FTD
  let collapsedSidebarSections = {
    desc: false,
    params: false,
    pt: true,
    pt_quick: true, // Быстрый фильтр в аккордеоне «Задачи проекта» по умолчанию закрыт
    ip: false,
    other: false
  };
  let collapsedIpGroups = {}; // { [groupKey]: true }
  let createInProjectMenuOpen = false;
  let otherLinkMenuOpen = false;
  const expandedSidebarDescriptions = new Set();
  let linkCreateDraft = null;
  let issueCreateDraft = null;
  let issueCreateBusy = false;
  let issueCreateLoading = false;
  const projectComponentRequests = new Map();
  const projectComponentRecords = new Map();
  const issueCreateMetaByProject = {};

  // Состояние открытых Input-Select комбобоксов в таблице и сайдбаре
  let activeTableCombo = null; // { type: 'status' | 'epic' | 'component' | 'assignee' | 'customer' | 'sprint', taskKey, query }
  let tableUserSearchResults = [];
  let tableUserSearchTimer = null;
  let sbEpicComboOpen = false;
  let sbEpicSearchQuery = '';
  let sbCompComboOpen = false;
  let sbCompSearchQuery = '';
  let sbIpCompOpenIdx = null; // индекс связи «В проекте», у которой открыт Input-Select компонента
  let sbIpCompSearchQuery = '';
  let sbIpSprintOpenIdx = null;
  let sbIpSprintSearchQuery = '';
  let ipSprintLoadProgress = {};
  let filterEpicComboOpen = false;
  let filterEpicSearchQuery = '';
  let filterCompComboOpen = false;
  let filterCompSearchQuery = '';
  let activeToolbarFilter = '';
  let toolbarFilterSearch = '';
  let activeSearchSelectId = '';
  let searchSelectQuery = '';
  let isColOrderPanelOpen = false;
  let draggedColKey = null;

  // Фильтры и сортировка верхней панели
  let searchQuery = '';
  let filterComponent = 'all';
  let filterEpic = 'all';
  let filterStatus = 'all';
  let allSprintIssuesLoaded = false;
  let loadedSprintMode = null;
  let filterSprintState = 'open_future_backlog'; // активные, будущие и бэклог
  let hideDone = false;
  let filterIssueType = 'all';
  let tableTreeLevel = 'sprints';
  let treeLevelApplied = false;
  let sortByField = 'default'; // 'default' | 'priority_desc' | 'priority_asc' | 'created_desc' | 'created_asc'

  let umbSearchQuery = '';
  let umbSearchTimer = null;
  let epicRemoteSearchTimer = null;
  let assigneeSearchQuery = '';
  let customerSearchQuery = '';
  let searchedUsersResults = [];
  let searchedCustomerResults = [];
  let userSearchTimer = null;
  let custSearchTimer = null;
  let statusMessage = 'Выберите фильтры и загрузите задачи';
  let saveToastText = '';
  let saveToastTimer = null;

  // Динамически обнаруженные метаданные Jira
  let discoveredFields = {
    sprint: null,
    epicLink: null,
    epicName: null,
    storyPoints: null,
    customer: null
  };
  let discoveredCustomerFieldIds = [];
  let issueFieldDiscoveryPromise = null;
  let discoveredIssueLinkTypes = [];
  let discoveredIssueLinkTypesPromise = null;
  async function loadIssueLinkTypes() {
    if (Array.isArray(discoveredIssueLinkTypes) && discoveredIssueLinkTypes.length) return discoveredIssueLinkTypes;
    if (!discoveredIssueLinkTypesPromise) {
      discoveredIssueLinkTypesPromise = fetch('/rest/api/2/issueLinkType', {
        credentials: 'same-origin', headers: { Accept: 'application/json' }
      }).then(async (response) => {
        if (!response.ok) throw new Error('Не удалось получить типы связей Jira');
        const data = await response.json();
        discoveredIssueLinkTypes = Array.isArray(data.issueLinkTypes) ? data.issueLinkTypes : [];
        return discoveredIssueLinkTypes;
      }).catch((error) => { discoveredIssueLinkTypesPromise = null; throw error; });
    }
    return discoveredIssueLinkTypesPromise;
  }
  let sprintNameById = {};
  let sprintIdByName = {};
  let sprintStateByName = {};
  let sprintOrderWeight = {};
  let boardOwnedSprintIds = new Set();
  let boardOwnedSprintNames = new Set();
  let closedSprintIds = new Set();
  let closedSprintNames = new Set();
  let epicNameByKey = {}; // Все эпики (для отображения названий)
  let epicStatusByKey = {};
  let epicLabelsByKey = {};
  let epicObprojectByFcrmEpicKey = {};
  let fcrmEpicNameByKey = {}; // СТРОГО эпики проекта FCRM для Input-Select выбора эпика
  let projectComponentsList = [];
  let externalProjectComponentsMap = {}; // { [projectKey]: string[] }
  let externalProjectSprintsMap = {}; // { [projectKey + '::' + compName]: string[] }
  let discoveredEpicIssueTypeName = null;
  let projectIssueTypesList = []; // [{ id, name, subtask }] — типы задач, доступные в проекте
  let issueTypeIdByName = {}; // { [typeName]: typeId }
  let projectStatusesList = [];
  let statusesByIssueTypeMap = {}; // { [issueTypeName]: string[] } — статусы строго из схемы типа задачи
  let projectPrioritiesList = [];
  let priorityIconUrlMap = {}; // { [priorityName]: iconUrl }
  let assignableUsersList = [];
  let issueTransitionsByKey = {};

  function isCanceledStatus(statusName) {
    if (!statusName) return false;
    const low = String(statusName).trim().toLowerCase();
    return (
      low === 'canceled' ||
      low === 'cancelled' ||
      low.includes('cancel') ||
      low.includes('отмен') ||
      low.includes('отклон') ||
      low === 'rejected'
    );
  }

  function isEpicIssueType(typeName) {
    if (!typeName) return false;
    const low = String(typeName).trim().toLowerCase();
    return low === 'epic' || low === 'эпик' || low.includes('epic') || low.includes('эпик');
  }

  function getPrioritySortWeight(priorityName) {
    const low = String(priorityName || 'Medium').trim().toLowerCase();
    if (low.includes('block') || low.includes('блок')) return 100;
    if (low.includes('crit') || low.includes('highest') || low.includes('крит') || low.includes('наивысш')) return 80;
    if (low.includes('high') || low.includes('major') || low.includes('высок') || low.includes('важн')) return 60;
    if (low.includes('lowest') || low.includes('triv') || low.includes('миним') || low.includes('трив')) return 10;
    if (low.includes('low') || low.includes('minor') || low.includes('низк') || low.includes('незнач')) return 20;
    return 40; // Medium / Стандартный / Средний
  }

  function parseTaskCreatedTimestamp(task) {
    if (!task) return 0;
    if (typeof task.createdTimestamp === 'number' && !isNaN(task.createdTimestamp) && task.createdTimestamp > 0) {
      return task.createdTimestamp;
    }
    const str = String(task.createdAt || '').trim();
    const m = str.match(/^(\\d{2})\\.(\\d{2})\\.(\\d{4})(?:\\s+(\\d{2}):(\\d{2}))?/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]) - 1;
      const year = Number(m[3]);
      const hour = m[4] ? Number(m[4]) : 0;
      const min = m[5] ? Number(m[5]) : 0;
      return new Date(year, month, day, hour, min).getTime();
    }
    const parsed = Date.parse(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  function sortTasksList(list) {
    if (!Array.isArray(list) || list.length <= 1 || sortByField === 'default') {
      return list;
    }
    const copy = list.slice();
    if (sortByField === 'priority_desc' || sortByField === 'priority_asc') {
      const dir = sortByField === 'priority_desc' ? -1 : 1;
      copy.sort((a, b) => {
        const wa = getPrioritySortWeight(a.priority);
        const wb = getPrioritySortWeight(b.priority);
        if (wa !== wb) return (wa - wb) * dir;
        return parseTaskCreatedTimestamp(b) - parseTaskCreatedTimestamp(a);
      });
    } else if (sortByField === 'created_desc' || sortByField === 'created_asc') {
      const dir = sortByField === 'created_desc' ? -1 : 1;
      copy.sort((a, b) => {
        const ta = parseTaskCreatedTimestamp(a);
        const tb = parseTaskCreatedTimestamp(b);
        if (ta !== tb) return (ta - tb) * dir;
        return String(a.key || '').localeCompare(String(b.key || ''), 'ru', { numeric: true });
      });
    }
    return copy;
  }

  function isRealHumanJiraUser(u) {
    if (!u) return false;
    const dn = String(u.displayName || '').trim();
    const nm = String(u.name || u.key || '').trim();
    if (!dn && !nm) return false;
    if (dn.startsWith('$') || nm.startsWith('$')) return false;
    if (/^\$[A-Z0-9_-]+$/i.test(dn) || /^\$[A-Z0-9_-]+$/i.test(nm)) return false;
    // Отсекаем технических роботов, тестовые и почтовые/номерные учетки (08 Robot test, srv_..., 1, 10supervisor@okcall.ru, mailer и т.д.)
    if (/^\d+$/.test(dn) || /^\d+$/.test(nm)) return false;
    if (dn.includes('@') || nm.includes('@')) return false;
    const lowDn = dn.toLowerCase();
    const lowNm = nm.toLowerCase();
    if (
      lowNm.startsWith('srv_') ||
      lowNm.startsWith('bot_') ||
      lowNm.startsWith('svc_') ||
      lowNm.startsWith('tech_') ||
      lowDn.includes('robot') ||
      lowNm.includes('robot') ||
      lowDn.includes('supervisor') ||
      lowNm.includes('supervisor') ||
      lowDn.includes('mailer') ||
      lowNm.includes('mailer') ||
      lowDn.includes('autotest') ||
      /\btest\b/i.test(lowDn)
    ) {
      return false;
    }
    return true;
  }

  function getSprintStateCode(sprintName) {
    if (!sprintName) return 'BACKLOG';
    const clean = String(sprintName).trim();
    const low = clean.toLowerCase();
    if (!clean || clean === 'Не в спринте' || low.includes('бэклог') || low.includes('backlog')) {
      return 'BACKLOG';
    }
    if (sprintStateByName[clean]) {
      const st = String(sprintStateByName[clean]).toUpperCase();
      if (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED') return st;
    }
    if (closedSprintNames.has(clean)) {
      return 'CLOSED';
    }
    if (low.includes('прошедш') || low.includes('closed')) return 'CLOSED';
    if (low.includes('будущ') || low.includes('future')) return 'FUTURE';
    return 'ACTIVE';
  }

  function getSprintStateLabelRu(code) {
    if (code === 'CLOSED') return 'Прошедший';
    if (code === 'ACTIVE') return 'Активный';
    if (code === 'FUTURE') return 'Будущий';
    return '';
  }

  function formatSprintWithStateText(sprintName) {
    if (!sprintName) return 'Не в спринте';
    const clean = String(sprintName).trim();
    const label = getSprintStateLabelRu(getSprintStateCode(clean));
    if (!label) return clean;
    if (clean.includes('(' + label + ')')) return clean;
    return clean + ' (' + label + ')';
  }

  function getSprintStateBadgeHtml(sprintName, code = getSprintStateCode(sprintName)) {
    const label = getSprintStateLabelRu(code);
    return label ? renderBadge(escapeHtml(label), code.toLowerCase()) : '';
  }

  const DEFAULT_COLUMNS_META = [
    { key: 'task', label: 'Задача (Спринт → Компонент → Задача)', width: 370 },
    { key: 'status', label: 'Статус ▾', width: 130 },
    { key: 'epic', label: 'Epic Link ▾', width: 240 },
    { key: 'epicObproject', label: 'Эпик OBPROJECT', width: 220 },
    { key: 'component', label: 'Компонент ▾', width: 180 },
    { key: 'assignee', label: 'Исполнитель ▾', width: 165 },
    { key: 'created', label: 'Создана', width: 115 },
    { key: 'sprint', label: 'Спринт ▾', width: 175 }
  ];

  const DEFAULT_COLUMN_ORDER = DEFAULT_COLUMNS_META.map((c) => c.key);
  let epicSearchTimer = null;
  let componentsByProjectMap = externalProjectComponentsMap;

  function getIssueProjectKey(issueKey) {
    if (!issueKey || typeof issueKey !== 'string') return CONFIG.projectKey;
    const parts = issueKey.trim().split('-');
    return (parts[0] || CONFIG.projectKey).toUpperCase();
  }

  async function loadRemoteIssueLinks(issueKey) {
    try {
      const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/remotelink', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) return [];
      const links = await response.json();
      if (!Array.isArray(links)) return [];
      return links.map((link) => {
        const object = link && link.object || {};
        const url = String(object.url || '');
        return {
          id: 'remote-' + String(link.id || url),
          key: String(object.title || url || 'Веб-ссылка'),
          summary: String(object.title || url || 'Веб-ссылка'),
          status: 'Открыто',
          url: url,
          linkType: String(link.relationship || 'Веб-ссылка')
        };
      }).filter((link) => link.url);
    } catch (e) { return []; }
  }

  async function loadEpicObprojectDetails(fcrmEpicKey, suppliedCustomFieldValue) {
    const key = String(fcrmEpicKey || '').trim().toUpperCase();
    if (!key) return;
    const existing = epicObprojectByFcrmEpicKey[key];
    if (existing && existing.loading && arguments.length < 2) return;
    if (existing && existing.key && arguments.length < 2) return;
    const initialSelectedIssue = tasks.find((task) => task.key === selectedTaskKey) || {};
    const initialSourceKey = isEpicIssueType(initialSelectedIssue.issueTypeName) ? initialSelectedIssue.key : initialSelectedIssue.epicKey;
    let obprojectKey = '';
    try {
      let rawValue = suppliedCustomFieldValue;
      if (arguments.length < 2) {
        const fcrmResponse = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=customfield_20100', {
          credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store'
        });
        if (!fcrmResponse.ok) throw new Error('Не удалось прочитать customfield_20100');
        const fcrmIssue = await fcrmResponse.json();
        rawValue = fcrmIssue && fcrmIssue.fields ? fcrmIssue.fields.customfield_20100 : null;
      }
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      obprojectKey = String(value && typeof value === 'object' ? value.key || value.value || value.name || value.url || '' : value || '').trim().toUpperCase();
      const matchedKey = /[A-Z][A-Z0-9]+-[0-9]+/.exec(obprojectKey);
      if (!matchedKey) {
        epicObprojectByFcrmEpicKey[key] = { loading: false, key: '', summary: '', status: '' };
      } else {
        obprojectKey = matchedKey[0];
        // Show the key as soon as customfield_20100 is received. Loading the
        // linked issue's summary/status is supplementary and must not hide it.
        epicObprojectByFcrmEpicKey[key] = { loading: true, key: obprojectKey, summary: '', status: '' };
        if (selectedTaskKey && initialSourceKey === key) renderStructure();
        const obKey = obprojectKey;
        const issueResponse = await fetch('/rest/api/2/issue/' + encodeURIComponent(obKey) + '?fields=summary,status', {
          credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store'
        });
        if (issueResponse.ok) {
          const obIssue = await issueResponse.json();
          epicObprojectByFcrmEpicKey[key] = {
            loading: false,
            key: obKey,
            summary: String(obIssue.fields && obIssue.fields.summary || ''),
            status: readStatusName(obIssue.fields && obIssue.fields.status, '')
          };
        } else {
          epicObprojectByFcrmEpicKey[key] = { loading: false, key: obKey, summary: '', status: '', error: true };
        }
      }
    } catch (_) {
      epicObprojectByFcrmEpicKey[key] = obprojectKey
        ? { loading: false, key: obprojectKey, summary: '', status: '', error: true }
        : { loading: false, error: true };
    }
    const selectedIssue = tasks.find((task) => task.key === selectedTaskKey) || {};
    const selectedObprojectSource = isEpicIssueType(selectedIssue.issueTypeName) ? selectedIssue.key : selectedIssue.epicKey;
    if (selectedTaskKey && selectedObprojectSource === key) renderStructure();
  }

  function cacheEpicMetadata(issues) {
    issues.forEach(issue => {
      const fields = issue.fields || {};
      if (fields.summary) epicNameByKey[issue.key] = String(fields.summary);
      if (fields.status) epicStatusByKey[issue.key] = readStatusName(fields.status, '');
      if (Array.isArray(fields.labels)) epicLabelsByKey[issue.key] = fields.labels;
      if (!Object.prototype.hasOwnProperty.call(fields, 'customfield_20100')) return;
      let value = fields.customfield_20100;
      if (Array.isArray(value)) value = value[0];
      const raw = value && typeof value === 'object' ? value.key || value.value || value.name || value.url || '' : value || '';
      const match = /[A-Z][A-Z0-9]+-[0-9]+/.exec(String(raw).toUpperCase());
      const key = match ? match[0] : '';
      const previous = epicObprojectByFcrmEpicKey[issue.key];
      if (!previous || previous.key !== key) epicObprojectByFcrmEpicKey[issue.key] = { loading:false, key, summary:'', status:'' };
    });
  }

  async function loadTableObprojectMetadata(epicKeys) {
    const sourcesByKey = new Map();
    for (const source of epicKeys) {
      const key = epicObprojectByFcrmEpicKey[source]?.key;
      if (!key) continue;
      if (!sourcesByKey.has(key)) sourcesByKey.set(key, []);
      sourcesByKey.get(key).push(source);
    }
    const keys = Array.from(sourcesByKey.keys());
    for (let offset = 0; offset < keys.length; offset += 50) {
      const chunk = keys.slice(offset, offset + 50);
      try {
        const response = await fetch('/rest/api/2/search?jql=' + encodeURIComponent('key in (' + chunk.join(',') + ')') + '&fields=summary,status&maxResults=100', { credentials:'same-origin', cache:'no-store', headers:{ Accept:'application/json' } });
        if (!response.ok) continue;
        const data = await response.json();
        (data.issues || []).forEach(issue => {
          (sourcesByKey.get(issue.key) || []).forEach((source) => {
            if (epicObprojectByFcrmEpicKey[source]?.key !== issue.key) return;
            epicObprojectByFcrmEpicKey[source] = { loading:false, key:issue.key, summary:String(issue.fields.summary || ''), status:readStatusName(issue.fields.status, '') };
          });
        });
      } catch (_) {}
    }
  }

  async function refreshTaskEpicDetails(taskKey, rawIssue) {
    const task = tasks.find((item) => item.key === taskKey);
    if (!task) return;
    if (isEpicIssueType(task.issueTypeName)) {
      await loadEpicObprojectDetails(task.key, rawIssue.fields.customfield_20100);
      return;
    }
    if (!task.epicKey) return;
    const epicKey = task.epicKey;
    const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(epicKey) + '?fields=summary,status,customfield_20100,labels', {
      credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store'
    });
    if (!response.ok) throw new Error('Не удалось обновить эпик ' + epicKey);
    const epic = await response.json();
    cacheEpicMetadata([epic]);
    epicNameByKey[epicKey] = String(epic.fields.summary || '');
    epicStatusByKey[epicKey] = readStatusName(epic.fields.status, '');
    tasks = tasks.map((item) => item.epicKey === epicKey ? Object.assign({}, item, { epicName: epicNameByKey[epicKey] }) : item);
    await loadEpicObprojectDetails(epicKey, epic.fields.customfield_20100);
  }

  const refreshingSidebarSections = new Set();
  async function refreshSidebarSection(taskKey, section) {
    const requestRevision = taskEditRevision;
    const requestKey = taskKey + ':' + section;
    if (refreshingSidebarSections.has(requestKey)) return;
    refreshingSidebarSections.add(requestKey);
    renderStructure();
    try {
      await discoverJiraIssueFields();
      const fields = section === 'params' ? getBoardFieldsParam() : 'issuelinks';
      const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '?fields=' + fields, {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Jira: HTTP ' + response.status);
      const raw = await response.json();
      await syncStrategyLinks(raw);
      syncStrategyIssue(raw);
      const updated = (await normalizeAndEnrichJiraIssues([raw], true))[0];
      if (!updated) throw new Error('Jira не вернула данные задачи');
      if (section === 'params') {
        const keys = ['issueTypeName', 'issueTypeId', 'priority', 'sprint', 'component', 'components', 'epicKey', 'epicName', 'assignee', 'customer', 'labels', 'status', 'createdAt', 'createdTimestamp'];
        const patch = {};
        keys.forEach((key) => { patch[key] = updated[key]; });
        clearTaskOverride(taskKey, requestRevision);
        tasks = applyLocalOverridesToTasks(tasks.map((item) => item.key === taskKey ? Object.assign({}, item, patch) : item), requestRevision, taskKey);
        const transitions = await fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '/transitions', { credentials: 'same-origin', cache: 'no-store' });
        if (transitions.ok) issueTransitionsByKey[taskKey] = (await transitions.json()).transitions || [];
        await refreshTaskEpicDetails(taskKey, raw);
      } else {
        const field = section === 'pt' ? 'projectTaskLinks' : 'inProjectLinks';
        tasks = tasks.map((item) => item.key === taskKey ? Object.assign({}, item, { [field]: updated[field] }) : item);
        if (section === 'ip') {
          await Promise.all(updated.inProjectLinks.map(async (link) => {
            delete frontDesignLinksByKey[link.key];
            await Promise.all([loadFrontDesignRelation(link.key)]);
          }));
        }
      }
      showSaveToast('✓ Блок обновлён из Jira');
    } catch (error) {
      showSaveToast('Не удалось обновить блок: ' + error.message);
    } finally {
      refreshingSidebarSections.delete(requestKey);
      renderStructure();
    }
  }

  function sidebarRefreshButton(taskKey, section) {
    const busy = refreshingSidebarSections.has(taskKey + ':' + section) || (sidebarBlockLoading.taskKey === taskKey && sidebarBlockLoading[section === 'params' ? 'params' : 'links']);
    return '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="refresh-sidebar-section" data-section="' + section + '" title="Перезагрузить" aria-label="Перезагрузить" ' + (busy ? 'disabled aria-busy="true"' : '') + ' style="width:26px;height:26px;padding:4px;flex-shrink:0;">' + (busy ? '<span class="ozon-ext-spinner"></span>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-3L4 10M4 4v6h6M4 13a8 8 0 0 0 14.9 3L20 14M20 20v-6h-6"/></svg>') + '</button>';
  }

  async function loadFrontDesignRelation(issueKey) {
    if (!issueKey || frontDesignLinksByKey[issueKey]) return;
    frontDesignLinksByKey[issueKey] = { loading: true, keys: [] };
    try {
      const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '?fields=issuelinks', {
        credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store'
      });
      if (!response.ok) throw new Error('Не удалось проверить связи');
      const data = await response.json();
      const links = data && data.fields && Array.isArray(data.fields.issuelinks) ? data.fields.issuelinks : [];
      const keys = links.map((link) => (link.inwardIssue || link.outwardIssue || {}).key).filter((key) => /^FTD-/i.test(String(key || '')));
      frontDesignLinksByKey[issueKey] = { loading: false, keys };
    } catch (_) {
      frontDesignLinksByKey[issueKey] = { loading: false, keys: [], error: true };
    }
    if (selectedTaskKey) renderStructure();
  }

  async function loadExternalProjectComponents(projKey) {
    return ensureProjectComponentsLoaded(projKey);
  }

  let defaultColWidths = {};
  DEFAULT_COLUMNS_META.forEach((c) => {
    defaultColWidths[c.key] = c.width;
  });
  defaultColWidths.createdAt = 115;

  let columnOrder = [...DEFAULT_COLUMN_ORDER];
  try {
    const savedOrder = JSON.parse(localStorage.getItem(STORAGE_KEY_COL_ORDER) || 'null');
    if (Array.isArray(savedOrder) && savedOrder.length > 0) {
      const normalized = savedOrder.map((k) => (k === 'createdAt' ? 'created' : k));
      const validKeys = normalized.filter((k) => defaultColWidths[k]);
      DEFAULT_COLUMNS_META.forEach((c) => {
        if (!validKeys.includes(c.key)) {
          if (c.key === 'epicObproject' && validKeys.includes('epic')) validKeys.splice(validKeys.indexOf('epic') + 1, 0, c.key);
          else validKeys.push(c.key);
        }
      });
      columnOrder = validKeys;
    }
  } catch (e) {}

  let colWidths = Object.assign({}, defaultColWidths);
  try {
    const savedCols = JSON.parse(localStorage.getItem(STORAGE_KEY_COL_WIDTHS) || 'null');
    if (savedCols && typeof savedCols === 'object') {
      colWidths = Object.assign({}, defaultColWidths, savedCols);
    }
  } catch (e) {}

  function getColumnLabel(colKey) {
    const found = DEFAULT_COLUMNS_META.find((c) => c.key === colKey);
    return found ? found.label : colKey;
  }

  function getTotalTableWidth() {
    return columnOrder.reduce((sum, k) => sum + (Number(colWidths[k]) || defaultColWidths[k] || 150), 0);
  }

  function showSaveToast(msg) {
    const update = showLinksSnackbar(msg);
    update(msg);
  }

  // Only edits made during an in-flight request may override Jira's response.
  let taskEditRevision = 0;
  const taskEdits = {};
  function saveTaskOverride(taskKey, patch) {
    if (!taskKey) return;
    const edits = taskEdits[taskKey] || (taskEdits[taskKey] = {});
    Object.keys(patch).forEach((field) => {
      if (['inProjectLinks', 'projectTaskLinks', 'otherLinks'].includes(field)) return;
      edits[field] = { value: patch[field], revision: ++taskEditRevision };
    });
  }

  function applyLocalOverridesToTasks(list, requestRevision, onlyTaskKey) {
    return list.map((task) => {
      if (onlyTaskKey && task.key !== onlyTaskKey) return task;
      const edits = taskEdits[task.key];
      if (!edits) return task;
      const patch = {};
      Object.keys(edits).forEach((field) => {
        if (edits[field].revision > requestRevision) patch[field] = edits[field].value;
      });
      return Object.assign({}, task, patch);
    });
  }

  function clearTaskOverride(taskKey, throughRevision) {
    const edits = taskEdits[taskKey];
    if (!edits) return;
    Object.keys(edits).forEach((field) => {
      if (edits[field].revision <= throughRevision) delete edits[field];
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) {
      return String(iso);
    }
  }

  const doneByStatus = new Map();
  const categoryByStatus = new Map();
  function readStatusName(status, fallback) {
    if (status && status.name && status.statusCategory) {
      doneByStatus.set(status.name, status.statusCategory.key === 'done');
      categoryByStatus.set(status.name, status.statusCategory.key);
    }
    return status && status.name || fallback;
  }

  function getStatusCategoryClass(statusName) {
    const jiraCategory = categoryByStatus.get(statusName);
    if (jiraCategory === 'done') return 'done';
    if (jiraCategory === 'indeterminate') return 'progress';
    if (jiraCategory === 'new') return 'todo';
    const low = String(statusName || '').toLowerCase();
    if (low.includes('к выполнению') || low.includes('to do') || low.includes('backlog')) return 'todo';
    if (
      low.includes('ondev') ||
      low.includes('onanalysis') ||
      low.includes('analysis') ||
      low.includes('работ') ||
      low.includes('progress') ||
      low.includes('аналитик') ||
      low.includes('разработ') ||
      low.includes('исполн')
    ) {
      return 'progress';
    }
    if (
      low.includes('готов') ||
      low.includes('закр') ||
      low.includes('done') ||
      low.includes('closed') ||
      low.includes('resolved') ||
      low.includes('выполн') ||
      low.includes('заверш')
    ) {
      return 'done';
    }
    if (
      low.includes('planning') ||
      low.includes('ontest') ||
      low.includes('waiting') ||
      low.includes('ревью') ||
      low.includes('тест') ||
      low.includes('review') ||
      low.includes('qa') ||
      low.includes('ожид') ||
      low.includes('соглас')
    ) {
      return 'review';
    }
    return 'todo';
  }

  function getStatusBadgeHtml(statusName) {
    const s = String(statusName || 'Открыто');
    const cat = getStatusCategoryClass(s);
    return renderBadge(escapeHtml(s), cat);
  }

  /**
   * Нейтральный тег типа связи («Задача проекта» / «В проекте») с иконкой связи,
   * чтобы визуально НЕ путать с цветными бейджами статусов («Закрыт», «В работе»).
   */
  function getLinkTypeTagHtml(isProjectTask) {
    if (isProjectTask) {
      return '<span class="ozon-ext-link-type-tag" role="img" aria-label="Задача проекта" title="Тип связи: Задача проекта (fcrm_umb_epic)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg></span>';
    }
    return '<span class="ozon-ext-link-type-tag" role="img" aria-label="В проекте" title="Тип связи: В проекте (смежная задача реализации)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>';
  }

  /**
   * Форматирование описания задачи Jira (поддержка Jira Wiki Markup и Markdown):
   * - *Жирные заголовки* и *жирный текст*, _курсив_, +подчеркнутый+, {{моноширинный}}
   * - Заголовки h1. - h6. и разделители h2. / ----
   * - Списки (маркированные * / - и нумерованные 1. / 1 клиент... / #)
   * - Кликабельные ссылки https://... и пиллы задач Jira (OB-277222, FCRM-1365 и др.)
   * - Блоки {code}, {noformat}, {quote}
   */
  function formatInlineJiraMarkup(escapedLine) {
    let s = String(escapedLine || '');

    // Инлайн-код {{...}}
    s = s.replace(/\\{\\{([^}]+)\\}\\}/g, '<code class="ozon-desc-inline-code">$1</code>');
    s = s.replace(/\\x60([^\\x60]+)\\x60/g, '<code class="ozon-desc-inline-code">$1</code>');

    // Ссылки формата Jira [Текст|https://...]
    s = s.replace(/\\[([^\\]|]+)\\|(https?:\\/\\/[^\\]]+)\\]/g, function (_, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="ozon-desc-link">' + label + ' ↗</a>';
    });

    // Ссылки на задачи Jira вида https://jit.o3.ru/browse/OB-277222 и обычные URL
    s = s.replace(/(https?:\\/\\/[^\\s<)"']+)/g, function (rawUrl) {
      const cleanUrl = rawUrl.replace(/[.,;:!?]+$/, '');
      const trailing = rawUrl.slice(cleanUrl.length);
      const browseMatch = cleanUrl.match(/\\/browse\\/([A-Z][A-Z0-9_]+-\\d+)$/i);
      if (browseMatch && browseMatch[1]) {
        const key = browseMatch[1].toUpperCase();
        return '<a href="' + cleanUrl + '" target="_blank" rel="noopener noreferrer" class="ozon-desc-issue-pill">' + key + ' ↗</a>' + trailing;
      }
      return '<a href="' + cleanUrl + '" target="_blank" rel="noopener noreferrer" class="ozon-desc-link">' + cleanUrl + ' ↗</a>' + trailing;
    });

    // Цвета {color:#hex}...{color}
    s = s.replace(/\\{color:([^}]+)\\}([\\s\\S]*?)\\{color\\}/gi, '<span style="color:$1;font-weight:600;">$2</span>');

    // Жирный текст *текст*
    s = s.replace(/(^|[\\s(В«"'])\\*([^\\s*][^*]*?[^\\s*]|[^\\s*])\\*(?=[\\s)В»"',.:;!?]|$)/g, '$1<strong style="color:#071026;font-weight:700;">$2</strong>');
    // Курсив _текст_
    s = s.replace(/(^|[\\s(В«"'])_([^\\s_][^_]*?[^\\s_]|[^\\s_])_(?=[\\s)В»"',.:;!?]|$)/g, '$1<em>$2</em>');

    return s;
  }

  function formatJiraDescriptionHtml(rawText) {
    const raw = String(rawText || '').trim();
    if (!raw) {
      return '<div style="color:#94A3B8;font-style:italic;font-size:11.5px;">Описание задачи отсутствует. Нажмите «✎ Редактировать», чтобы добавить описание.</div>';
    }

    let text = escapeHtml(raw).replace(/\\r\\n/g, '\\n');

    // Выделяем многострочные блоки {code}...{code} и {noformat}...{noformat}
    const codeBlocks = [];
    text = text.replace(/\\{(?:code|noformat)(?::[^}]*)?\\}([\\s\\S]*?)\\{(?:code|noformat)\\}/gi, function (_, codeContent) {
      const idx = codeBlocks.length;
      codeBlocks.push('<pre class="ozon-desc-code"><code>' + codeContent.trim() + '</code></pre>');
      return '___OZON_CODE_BLOCK_' + idx + '___';
    });

    // Блоки {quote}...{quote}
    text = text.replace(/\\{quote\\}([\\s\\S]*?)\\{quote\\}/gi, function (_, qContent) {
      return '<blockquote class="ozon-desc-quote">' + formatInlineJiraMarkup(qContent.trim()).replace(/\\n/g, '<br/>') + '</blockquote>';
    });

    const lines = text.split('\\n');
    const out = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const codeMatch = trimmed.match(/^___OZON_CODE_BLOCK_(\\d+)___$/);
      if (codeMatch) {
        out.push(codeBlocks[Number(codeMatch[1])] || '');
        continue;
      }

      // Пустой заголовок вида "h2." или разделитель "----"
      if (/^h[1-6]\\.\\s*$/i.test(trimmed) || /^-{3,}$/.test(trimmed)) {
        out.push('<hr class="ozon-desc-hr" />');
        continue;
      }

      // Заголовки Jira h1. - h6.
      const hMatch = trimmed.match(/^h([1-6])\\.\\s+(.+)$/i);
      if (hMatch) {
        out.push('<div class="ozon-desc-heading">' + formatInlineJiraMarkup(hMatch[2]) + '</div>');
        continue;
      }

      // Строка целиком в звездочках *Цель / Зачем*, *Контекст*, *Суть / Что делаем* или **Заголовок**
      const boldHeadingMatch = trimmed.match(/^\\*{1,2}([^*]+)\\*{1,2}:?$/);
      if (boldHeadingMatch && trimmed.length < 95) {
        out.push('<div class="ozon-desc-heading">' + formatInlineJiraMarkup(boldHeadingMatch[1].trim()) + '</div>');
        continue;
      }

      // Цитата bq.
      if (/^bq\\.\\s+/i.test(trimmed)) {
        out.push('<blockquote class="ozon-desc-quote">' + formatInlineJiraMarkup(trimmed.replace(/^bq\\.\\s+/i, '')) + '</blockquote>');
        continue;
      }

      // Маркированный список (* пункт, - пункт, • пункт)
      const bulletMatch = trimmed.match(/^(?:\\*{1,3}|-|•)\\s+(.+)$/);
      if (bulletMatch) {
        out.push(
          '<div class="ozon-desc-li"><span class="ozon-desc-bullet">•</span><span style="flex:1;">' +
            formatInlineJiraMarkup(bulletMatch[1]) +
            '</span></div>'
        );
        continue;
      }

      // Нумерованный список (# пункт, 1. пункт, 1) пункт, либо "1 клиент переводит..." как в задачах FCRM)
      const numMatch = trimmed.match(/^(?:(#+)|(\\d+)[.)]|(\\d+)\\s+(?=[^\\x00-\\x7F]))\\s*(.+)$/);
      if (numMatch) {
        const numLabel = numMatch[2] ? numMatch[2] + '.' : numMatch[3] ? numMatch[3] + '.' : '•';
        out.push(
          '<div class="ozon-desc-li"><span class="ozon-desc-num">' +
            numLabel +
            '</span><span style="flex:1;">' +
            formatInlineJiraMarkup(numMatch[4]) +
            '</span></div>'
        );
        continue;
      }

      out.push('<div class="ozon-desc-p">' + formatInlineJiraMarkup(trimmed) + '</div>');
    }

    return '<div class="ozon-ext-desc-rendered">' + out.join('') + '</div>';
  }

  /**
   * Стандартные SVG-иконки приоритетов Jira (Blocker, Highest/Critical, High/Major, Medium/Стандартный, Low/Minor, Lowest/Trivial)
   * Никаких эмодзи!
   */
  function getJiraPriorityIconSvg(priorityName) {
    const p = String(priorityName || 'Medium').trim();
    const low = p.toLowerCase();
    if (low.includes('block') || low.includes('блок')) {
      return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;vertical-align:middle;" title="Приоритет: ' + escapeHtml(p) + '"><circle cx="8" cy="8" r="6.5" fill="#DC2626"/><rect x="4.2" y="7" width="7.6" height="2" rx="1" fill="#FFFFFF"/></svg>';
    }
    if (low.includes('crit') || low.includes('highest') || low.includes('крит') || low.includes('наивысш')) {
      return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;vertical-align:middle;" title="Приоритет: ' + escapeHtml(p) + '"><path d="M3 7.5L8 2.5L13 7.5" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12.5L8 7.5L13 12.5" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (low.includes('high') || low.includes('major') || low.includes('высок') || low.includes('важн')) {
      return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;vertical-align:middle;" title="Приоритет: ' + escapeHtml(p) + '"><path d="M3 10.5L8 5.5L13 10.5" stroke="#EA580C" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (low.includes('lowest') || low.includes('triv') || low.includes('миним') || low.includes('трив')) {
      return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;vertical-align:middle;" title="Приоритет: ' + escapeHtml(p) + '"><path d="M3 3.5L8 8.5L13 3.5" stroke="#64748B" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 8.5L8 13.5L13 8.5" stroke="#64748B" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (low.includes('low') || low.includes('minor') || low.includes('низк') || low.includes('незнач')) {
      return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;vertical-align:middle;" title="Приоритет: ' + escapeHtml(p) + '"><path d="M3 5.5L8 10.5L13 5.5" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    // Medium / Стандартный / Средний (две горизонтальные полосы Jira Medium)
    return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;vertical-align:middle;" title="Приоритет: ' + escapeHtml(p) + '"><path d="M3 6H13" stroke="#D97706" stroke-width="2.2" stroke-linecap="round"/><path d="M3 10H13" stroke="#D97706" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }

  /**
   * Иконка и компактный бейдж типа задачи Jira (Эпик, История/Story, Ошибка/Bug, Задача/Task, Аналитика, Дизайн и др.)
   */
  function getJiraIssueTypeIconSvg(issueTypeName) {
    const t = String(issueTypeName || 'Задача').trim();
    const low = t.toLowerCase();
    if (low === 'epic' || low === 'эпик' || low.includes('epic') || low.includes('эпик')) {
      return '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;" title="Тип задачи: ' + escapeHtml(t) + '"><rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#9333EA"/><path d="M8.8 3.5L4.8 8.7H7.7L7.2 12.5L11.2 7.3H8.3L8.8 3.5Z" fill="#FFFFFF"/></svg>';
    }
    if (low.includes('bug') || low.includes('ошибк') || low.includes('дефект') || low.includes('инцидент')) {
      return '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;" title="Тип задачи: ' + escapeHtml(t) + '"><rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#DC2626"/><circle cx="8" cy="8" r="2.8" fill="#FFFFFF"/></svg>';
    }
    if (low.includes('story') || low.includes('истори') || low.includes('feature') || low.includes('фича')) {
      return '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;" title="Тип задачи: ' + escapeHtml(t) + '"><rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#16A34A"/><path d="M5 4.2H11V12L8 9.8L5 12V4.2Z" fill="#FFFFFF"/></svg>';
    }
    if (low.includes('аналит') || low.includes('analysis') || low.includes('research') || low.includes('исслед')) {
      return '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;" title="Тип задачи: ' + escapeHtml(t) + '"><rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#0284C7"/><circle cx="7.5" cy="7.5" r="2.5" stroke="#FFFFFF" stroke-width="1.6"/><path d="M9.5 9.5L11.8 11.8" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/></svg>';
    }
    // Задача / Task / Разработка (стандартный синий чекбокс Jira Task)
    return '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;" title="Тип задачи: ' + escapeHtml(t) + '"><rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="#2563EB"/><path d="M4.8 8.2L7 10.4L11.3 5.8" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function getJiraIssueTypeIconHtml(name, iconUrl) {
    const reference = iconUrl || projectIssueTypesList.find(type => type.name === name)?.iconUrl;
    if (reference) {
      try {
        const url = new URL(reference, location.href);
        if (url.origin === location.origin && /^https?:$/.test(url.protocol)) return '<img class="ozon-ext-issue-type-icon" width="12" height="12" alt="" src="' + escapeHtml(url.href) + '">';
      } catch (_) { /* Use the local icon when Jira did not supply a usable URL. */ }
    }
    return getJiraIssueTypeIconSvg(name);
  }

  function getIssueTypeBadgeHtml(issueTypeName, iconUrl) {
    const t = String(issueTypeName || 'Задача').trim() || 'Задача';
    return '<span class="ozon-ext-type-pill" title="' + escapeHtml(t) + '">' + getJiraIssueTypeIconHtml(t, iconUrl) + escapeHtml(t) + '</span>';
  }

  /**
   * Иконка красной скрепки для задач, у которых НЕТ привязанной «Задачи проекта»
   */
  function getMissingProjectTaskWarnSvg() {
    return '<span class="ozon-ext-inner-ctrl" title="Внимание: у задачи нет связи «Задача проекта» (fcrm_umb_epic)" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:#FEE2E2;color:#DC2626;flex-shrink:0;cursor:help;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>';
  }

  /**
   * Иконка красного человечка для задач, у которых НЕ назначен Исполнитель
   */
  function getMissingAssigneeWarnSvg() {
    return '<span class="ozon-ext-inner-ctrl" title="Внимание: у задачи не назначен Исполнитель" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:4px;background:#FEE2E2;color:#DC2626;flex-shrink:0;cursor:help;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>';
  }

  function isTaskMissingAssignee(task) {
    if (!task || !task.assignee) return true;
    const nm = String(task.assignee.name || '').trim();
    const lg = String(task.assignee.login || '').trim();
    if (!nm && !lg) return true;
    const lower = nm.toLowerCase();
    return (
      lower === 'не назначен' ||
      lower === 'не указан' ||
      lower === 'unassigned' ||
      lower === '—' ||
      lower === '-'
    );
  }

  /**
   * Иконки и метаданные групп связанных задач (OB — Бэкенд, OBFRONT — Фронтенд, FTD — Дизайн, FCRM — Задача проекта / CRM)
   */
  function getLinkedProjectGroupMeta(issueKey, isProjectTaskBlock) {
    const prefix = String(issueKey || '').split('-')[0].toUpperCase();
    if (isProjectTaskBlock) {
      const icon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><circle cx="12" cy="13" r="2"/></svg>';
      return {
        id: 'UMB',
        groupKey: 'UMB',
        label: 'Задачи проекта (fcrm_umb_epic)',
        title: 'Задачи проекта (fcrm_umb_epic)',
        shortTag: 'Проект',
        order: 0,
        bg: '#E5F0FF',
        color: '#005BFF',
        iconSvg: icon,
        svg: icon
      };
    }
    if (prefix === 'OB') {
      const icon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>';
      return {
        id: 'OB',
        groupKey: 'OB',
        label: 'OB · Бэкенд',
        title: 'OB · Бэкенд',
        shortTag: 'Бэкенд',
        order: 1,
        bg: '#EDE9FE',
        color: '#6D28D9',
        iconSvg: icon,
        svg: icon
      };
    }
    if (prefix === 'OBFRONT') {
      const icon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>';
      return {
        id: 'OBFRONT',
        groupKey: 'OBFRONT',
        label: 'OBFRONT · Фронтенд',
        title: 'OBFRONT · Фронтенд',
        shortTag: 'Фронтенд',
        order: 2,
        bg: '#E0F2FE',
        color: '#0284C7',
        iconSvg: icon,
        svg: icon
      };
    }
    if (prefix === 'FTD') {
      const icon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>';
      return {
        id: 'FTD',
        groupKey: 'FTD',
        label: 'FTD · Дизайн',
        title: 'FTD · Дизайн',
        shortTag: 'Дизайн',
        order: 3,
        bg: '#FCE7F3',
        color: '#DB2777',
        iconSvg: icon,
        svg: icon
      };
    }
    const icon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
    return {
      id: prefix || 'OTHER',
      groupKey: prefix || 'OTHER',
      label: (prefix || 'CRM') + ' · Смежные задачи',
      title: (prefix || 'CRM') + ' · Смежные задачи',
      shortTag: prefix || 'CRM',
      order: 4,
      bg: '#E5F0FF',
      color: '#005BFF',
      iconSvg: icon,
      svg: icon
    };
  }

  function getPriorityBadgeClass(priorityName) {
    const low = String(priorityName || '').toLowerCase();
    if (low.includes('block') || low.includes('crit') || low.includes('крит') || low.includes('блок') || low.includes('highest')) {
      return 'ozon-ext-badge-critical';
    }
    if (low.includes('high') || low.includes('major') || low.includes('высок')) {
      return 'ozon-ext-badge-review';
    }
    if (low.includes('low') || low.includes('minor') || low.includes('triv') || low.includes('низк')) {
      return 'ozon-ext-badge-todo';
    }
    return 'ozon-ext-badge-progress';
  }

  function isBogusEpicTitle(text, epicKey) {
    if (!text) return true;
    const clean = String(text).trim();
    if (!clean) return true;
    const low = clean.toLowerCase();
    if (
      low === 'epic link' ||
      low === 'ссылка на эпик' ||
      low === 'epic name' ||
      low === 'имя эпика' ||
      low === 'название эпика' ||
      low === 'без эпика' ||
      low === 'no epic'
    ) {
      return true;
    }
    if (epicKey && clean.toUpperCase() === String(epicKey).trim().toUpperCase()) {
      return true;
    }
    return false;
  }

  /**
   * Проверяет, является ли имя спринта родным спринтом доски FCRM (#9349),
   * отсекая чужие спринты других команд (TXCTRL_VED_REQ, PFM B2C, HOGWARTS_CD, CRM_CORE, CRM_BO, CS, Collection и т.д.).
   */
  function isNativeFcrmBoardSprintName(sprintName, originBoardId) {
    if (!sprintName) return false;
    const clean = String(sprintName).trim();
    if (!clean || clean === '9223372036854775807' || /^\\d+$/.test(clean)) return false;
    if (clean === 'Бэклог FCRM') return true;
    if (closedSprintNames.has(clean)) return false;

    // Если Jira явно указала originBoardId:
    if (originBoardId != null) {
      return String(originBoardId) === String(CONFIG.rapidViewId);
    }

    // Если спринт уже подтверждён как принадлежащий доске 9349:
    if (boardOwnedSprintNames.has(clean)) return true;

    const low = clean.toLowerCase();
    if (
      low.startsWith('#разработка') ||
      low.startsWith('разработка') ||
      low.includes('product dicsvery') ||
      low.includes('product discovery') ||
      low.includes('fcrm')
    ) {
      return true;
    }
    return false;
  }

  function isFcrmSprintCandidate(sprintId, sprintName, originBoardId, stateStr, rawStr, allowClosed) {
    if (!sprintName || sprintName === '9223372036854775807' || /^\\d+$/.test(String(sprintName).trim())) {
      return false;
    }
    const nameClean = String(sprintName).trim();
    if (nameClean === 'Бэклог FCRM') return true;

    const isClosed =
      (sprintId && closedSprintIds.has(String(sprintId))) ||
      closedSprintNames.has(nameClean) ||
      (stateStr && String(stateStr).toUpperCase() === 'CLOSED') ||
      (rawStr && typeof rawStr === 'string' && /state=CLOSED/i.test(rawStr));

    if (isClosed) {
      if (sprintId) closedSprintIds.add(String(sprintId));
      closedSprintNames.add(nameClean);
      sprintStateByName[nameClean] = 'CLOSED';
      if (!allowClosed) return false;
    }

    if (originBoardId != null && String(originBoardId) !== String(CONFIG.rapidViewId)) {
      if (!isNativeFcrmBoardSprintName(nameClean, originBoardId)) {
        return false;
      }
    }

    return true;
  }

  function extractCleanSprintName(rawVal, allowClosed) {
    if (!rawVal) return null;

    if (Array.isArray(rawVal)) {
      for (let i = rawVal.length - 1; i >= 0; i--) {
        const parsed = extractCleanSprintName(rawVal[i], allowClosed);
        if (parsed) return parsed;
      }
      return null;
    }

    if (typeof rawVal === 'object') {
      const sId = rawVal.id ? String(rawVal.id) : null;
      const sName = rawVal.name ? String(rawVal.name).trim() : null;
      const originId = rawVal.originBoardId || rawVal.rapidViewId || null;
      const st = rawVal.state ? String(rawVal.state).toUpperCase() : null;

      if (sName && st && (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED')) {
        sprintStateByName[sName] = st;
      }
      if (sId && sName) {
        sprintNameById[sId] = sName;
        sprintIdByName[sName] = sId;
      }

      if (st === 'CLOSED') {
        if (sId) closedSprintIds.add(sId);
        if (sName) closedSprintNames.add(sName);
        if (!allowClosed) return null;
      }

      if (sName && isFcrmSprintCandidate(sId, sName, originId, st, null, allowClosed)) {
        return sName;
      }
      if (sId && sprintNameById[sId] && (allowClosed || !closedSprintIds.has(sId))) {
        return sprintNameById[sId];
      }
      return null;
    }

    const str = String(rawVal).trim();
    if (!str || str === '9223372036854775807' || str === 'null' || str === 'undefined') {
      return null;
    }

    const idMatch = str.match(/id=(\\d+)/);
    const sId = idMatch && idMatch[1] ? idMatch[1] : null;
    const stateMatch = str.match(/state=([^,\\]]+)/);
    const st = stateMatch && stateMatch[1] ? stateMatch[1].trim().toUpperCase() : null;
    const nameMatch = str.match(/name=([^,\\]]+)/);
    const viewMatch = str.match(/rapidViewId=(\\d+)/);
    const originId = viewMatch && viewMatch[1] ? viewMatch[1] : null;

    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      if (st && (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED')) {
        sprintStateByName[candidate] = st;
      }
      if (sId) {
        sprintNameById[sId] = candidate;
        sprintIdByName[candidate] = sId;
      }
      if (st === 'CLOSED') {
        if (sId) closedSprintIds.add(sId);
        closedSprintNames.add(candidate);
        if (!allowClosed) return null;
      }
      if (isFcrmSprintCandidate(sId, candidate, originId, st, str, allowClosed)) {
        return candidate;
      }
      return null;
    }

    if (st === 'CLOSED') {
      if (sId) closedSprintIds.add(sId);
      if (!allowClosed) return null;
    }

    if (sId && sprintNameById[sId] && (allowClosed || !closedSprintIds.has(sId))) {
      return sprintNameById[sId];
    }

    if (/^\\d+$/.test(str)) {
      return sprintNameById[str] && (allowClosed || !closedSprintIds.has(str)) ? sprintNameById[str] : null;
    }

    return isFcrmSprintCandidate(null, str, originId, st, str, allowClosed) ? str : null;
  }

  function resolveIssueSprint(iss) {
    if (!iss) return 'Бэклог FCRM';
    const f = iss.fields || {};

    if (Array.isArray(f.closedSprints)) {
      f.closedSprints.forEach((cs) => {
        if (cs && cs.id) closedSprintIds.add(String(cs.id));
        if (cs && cs.name) {
          const csN = String(cs.name).trim();
          closedSprintNames.add(csN);
          sprintStateByName[csN] = 'CLOSED';
          if (cs.id) {
            sprintNameById[String(cs.id)] = csN;
            sprintIdByName[csN] = String(cs.id);
          }
        }
      });
    }

    // Jira sprint fields take precedence over historical board membership.
    const fromAgileActive = extractCleanSprintName(f.sprint, false);
    if (fromAgileActive) return fromAgileActive;

    if (discoveredFields.sprint && f[discoveredFields.sprint]) {
      const fromCustomActive = extractCleanSprintName(f[discoveredFields.sprint], false);
      if (fromCustomActive) return fromCustomActive;
    }

    for (const k of Object.keys(f)) {
      const val = f[k];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].includes('greenhopper.service.sprint.Sprint')) {
        const parsedActive = extractCleanSprintName(val, false);
        if (parsedActive) return parsedActive;
      }
    }

    // Use closed sprints only when there is no active or future sprint.
    const fromAgileClosed = extractCleanSprintName(f.sprint, true);
    if (fromAgileClosed) return fromAgileClosed;

    if (discoveredFields.sprint && f[discoveredFields.sprint]) {
      const fromCustomClosed = extractCleanSprintName(f[discoveredFields.sprint], true);
      if (fromCustomClosed) return fromCustomClosed;
    }

    if (Array.isArray(f.closedSprints) && f.closedSprints.length > 0) {
      const fromClosedArr = extractCleanSprintName(f.closedSprints, true);
      if (fromClosedArr) return fromClosedArr;
    }

    for (const k of Object.keys(f)) {
      const val = f[k];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].includes('greenhopper.service.sprint.Sprint')) {
        const parsedClosed = extractCleanSprintName(val, true);
        if (parsedClosed) return parsedClosed;
      }
    }

    return 'Бэклог FCRM';
  }

  function readJiraEpicKey(fields) {
    const epicField = discoveredFields.epicLink;
    if (epicField && Object.hasOwn(fields, epicField)) {
      const value = fields[epicField];
      return String(typeof value === 'string' ? value : value?.key || value?.value || '').trim();
    }
    if (Object.hasOwn(fields, 'epic')) return fields.epic?.key || '';
    return undefined;
  }

  function extractAnyRealSprintName(rawVal) {
    if (!rawVal) return null;
    if (Array.isArray(rawVal)) {
      for (let i = rawVal.length - 1; i >= 0; i--) {
        const name = extractAnyRealSprintName(rawVal[i]);
        if (name) return name;
      }
      return null;
    }
    if (typeof rawVal === 'object') {
      if (rawVal.name && String(rawVal.name).trim() && String(rawVal.name).trim() !== '9223372036854775807') {
        const cleanN = String(rawVal.name).trim();
        const st = rawVal.state ? String(rawVal.state).trim().toUpperCase() : '';
        if (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED') {
          sprintStateByName[cleanN] = st;
        }
        if (rawVal.id) {
          sprintNameById[String(rawVal.id)] = cleanN;
          sprintIdByName[cleanN] = String(rawVal.id);
        }
        return cleanN;
      }
      if (rawVal.id && sprintNameById[String(rawVal.id)]) {
        return sprintNameById[String(rawVal.id)];
      }
      return null;
    }
    const str = String(rawVal).trim();
    if (!str || str === '9223372036854775807' || str === 'null' || str === 'undefined') return null;
    const idMatch = str.match(/id=(\\d+)/);
    const sId = idMatch && idMatch[1] ? idMatch[1] : null;
    const stateMatch = str.match(/state=([^,\\]]+)/);
    const st = stateMatch && stateMatch[1] ? stateMatch[1].trim().toUpperCase() : '';
    const nameMatch = str.match(/name=([^,\\]]+)/);
    if (nameMatch && nameMatch[1]) {
      const cleanN = nameMatch[1].trim();
      if (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED') {
        sprintStateByName[cleanN] = st;
      }
      if (sId) {
        sprintNameById[sId] = cleanN;
        sprintIdByName[cleanN] = sId;
      }
      return cleanN;
    }
    if (sId && sprintNameById[sId]) {
      return sprintNameById[sId];
    }
    if (!str.includes('com.atlassian.greenhopper') && !/^\\d+$/.test(str)) {
      return str;
    }
    return null;
  }

  function resolveRealLinkedIssueSprint(lIss) {
    if (!lIss) return 'Не в спринте';
    const fields = lIss.fields || {};
    const candidates = [fields.sprint];
    if (discoveredFields.sprint) candidates.push(fields[discoveredFields.sprint]);
    Object.keys(fields).forEach((key) => {
      const value = fields[key];
      if (Array.isArray(value) && value.length && typeof value[0] === 'string' && value[0].includes('greenhopper.service.sprint.Sprint')) candidates.push(value);
    });
    candidates.push(fields.closedSprints);
    let closed = null;
    for (const candidate of candidates) {
      const values = Array.isArray(candidate) ? candidate.slice().reverse() : [candidate];
      for (const value of values) {
        const name = extractAnyRealSprintName(value);
        if (!name) continue;
        const state = sprintStateByName[name];
        if (state !== 'CLOSED') return name;
        if (!closed) closed = name;
      }
    }
    return closed || 'Не в спринте';
  }

  function resolveRealLinkedIssueComponent(lIss) {
    if (!lIss || !lIss.fields) return 'Без компонента';
    const comps = lIss.fields.components;
    if (Array.isArray(comps) && comps.length > 0) {
      const names = comps.map((c) => c && c.name).filter(Boolean);
      if (names.length > 0) return names.join(', ');
    }
    return 'Без компонента';
  }

  function fetchProjectComponents(key, refresh = false) {
    if (projectComponentRequests.has(key)) return projectComponentRequests.get(key);
    if (!refresh && projectComponentRecords.has(key)) return Promise.resolve(projectComponentRecords.get(key));
    const request = fetch('/rest/api/2/project/' + encodeURIComponent(key) + '/components', {
      credentials: 'same-origin', headers: { Accept: 'application/json' }
    }).then(async response => {
      if (!response.ok) throw new Error('Не удалось загрузить компоненты проекта ' + key);
      const items = await response.json();
      if (!Array.isArray(items)) throw new Error('Неизвестный формат списка компонентов ' + key);
      const records = items.filter(item => item && item.name);
      projectComponentRecords.set(key, records);
      return records;
    }).finally(() => projectComponentRequests.delete(key));
    projectComponentRequests.set(key, request);
    return request;
  }

  async function ensureProjectComponentsLoaded(projKey) {
    if (!projKey) return [];
    const key = String(projKey).trim().toUpperCase();
    if (key === String(CONFIG.projectKey).toUpperCase()) return getAllComponentOptions();
    if (externalProjectComponentsMap[key]) return externalProjectComponentsMap[key];
    try {
      const components = await fetchProjectComponents(key);
      const names = ['Без компонента', ...components.map(item => item.name)];
      externalProjectComponentsMap[key] = prioritizeFavoriteComponents(Array.from(new Set(names)));
      return externalProjectComponentsMap[key];
    } catch {
      return ['Без компонента'];
    }
  }

  async function loadIssueCreateComponents(projectKey) {
    const components = await fetchProjectComponents(String(projectKey).trim().toUpperCase());
    const favorites = ['CS', 'CRM_BO', 'CRM_CORE'];
    const rank = name => {
      const index = favorites.indexOf(name.toUpperCase());
      return index < 0 ? favorites.length : index;
    };
    return components.filter(item => item.id).sort((a, b) =>
      rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'ru'));
  }

  async function loadIssueCreateMeta(projectKey) {
    const key = String(projectKey || '').toUpperCase();
    if (issueCreateMetaByProject[key]) return issueCreateMetaByProject[key];
    const base = '/rest/api/2/issue/createmeta/' + encodeURIComponent(key) + '/issuetypes';
    const response = await fetch(base + '?startAt=0&maxResults=1000', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      const fallback = await fetch('/rest/api/2/project/' + encodeURIComponent(key) + '/statuses', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (fallback.ok) {
        const statusTypes = await fallback.json();
        const fallbackTypes = Array.isArray(statusTypes) ? statusTypes.filter((item) => item && item.id && item.name).map((item) => ({ id: String(item.id), name: String(item.name), subtask: Boolean(item.subtask), fields: {} })) : [];
        if (fallbackTypes.length) {
          issueCreateMetaByProject[key] = fallbackTypes;
          return fallbackTypes;
        }
      }
      throw new Error('Jira did not return create issue types for ' + key + ' (HTTP ' + response.status + ')');
    }
    const payload = await response.json();
    const issueTypes = Array.isArray(payload) ? payload : payload.values || payload.issueTypes || [];
    if (!issueTypes.length) throw new Error('No issue types are available in ' + key);
    issueCreateMetaByProject[key] = await Promise.all(issueTypes.map(async (type) => {
      try {
        const fieldsResponse = await fetch(base + '/' + encodeURIComponent(type.id) + '?startAt=0&maxResults=1000', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!fieldsResponse.ok) return type;
        const detail = await fieldsResponse.json();
        const rawFields = Array.isArray(detail.values) ? detail.values : detail.fields || {};
        const fields = Array.isArray(rawFields)
          ? Object.fromEntries(rawFields.map((field) => [field.fieldId || field.key, field]).filter(([id]) => id))
          : rawFields;
        return Object.assign({}, type, { fields });
      } catch (e) { return type; }
    }));
    return issueCreateMetaByProject[key];
  }

  function getIssueCreateType(projectKey, kind, issueTypes) {
    const epic = kind === 'epic';
    const candidates = (issueTypes || []).filter((type) => epic
      ? /epic|эпик/i.test(String(type.name || ''))
      : !/epic|эпик|sub.?task|подзадач/i.test(String(type.name || '')) && /task|задач/i.test(String(type.name || '')));
    if (candidates.length) return candidates[0];
    if (!epic) return (issueTypes || []).find((type) => !/sub.?task|подзадач/i.test(String(type.name || '')));
    return null;
  }

  function isEpicNameCreateField(meta) {
    return Boolean(meta && (
      /gh-epic-label$/i.test(String(meta.schema && meta.schema.custom || '')) ||
      /epic[ _-]*(name|label|метка)|название эпика|эпик.*(метка|название)/i.test(String(meta.name || ''))
    ));
  }

  async function createIssueFromSidebar(draft) {
    const projectKey = String(draft.projectKey).toUpperCase();
    const [issueTypes, components] = await Promise.all([
      loadIssueCreateMeta(projectKey),
      loadIssueCreateComponents(projectKey)
    ]);
    const issueType = getIssueCreateType(projectKey, draft.kind, issueTypes);
    if (!issueType) throw new Error(draft.kind === 'epic' ? 'В FCRM не найден тип задачи Epic' : 'В проекте не найден обычный тип задачи');
    const component = components.find((item) => String(item.id) === String(draft.componentId));
    if (!component) throw new Error('Выберите компонент проекта ' + projectKey);

    const fieldsMeta = issueType.fields || {};
    const fields = {
      project: { key: projectKey },
      issuetype: { id: String(issueType.id) },
      summary: String(draft.summary || '').trim(),
      components: [{ id: String(component.id) }]
    };
    if (draft.kind !== 'epic' && String(draft.description || '').trim()) fields.description = String(draft.description).trim();
    if (draft.kind === 'epic') {
      fields.labels = ['fcrm_umb_epic'];
      fields.description = String(draft.summary || '').trim();
      const epicNameField = Object.entries(fieldsMeta).find(([, meta]) => isEpicNameCreateField(meta));
      if (epicNameField) fields[epicNameField[0]] = String(draft.summary).trim();
      else {
        const allFieldsResponse = await fetch('/rest/api/2/field', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (allFieldsResponse.ok) {
          const allFields = await allFieldsResponse.json();
          const epicName = Array.isArray(allFields) && allFields.find(isEpicNameCreateField);
          if (epicName && epicName.id) fields[epicName.id] = String(draft.summary).trim();
        }
        if (!Object.keys(fields).some(id => id.startsWith('customfield_'))) {
          throw new Error('Не удалось найти поле «Epic Метка» для создания тематики. Обновите данные Jira и повторите попытку.');
        }
      }
    }

    if (fieldsMeta.reporter && fieldsMeta.reporter.required) {
      const myselfResponse = await fetch('/rest/api/2/myself', {
        credentials: 'same-origin', headers: { Accept: 'application/json' }
      });
      if (!myselfResponse.ok) throw new Error('Не удалось определить автора задачи Jira');
      const myself = await myselfResponse.json();
      if (!myself.name) throw new Error('Jira не вернула имя текущего пользователя для поля «Автор»');
      fields.reporter = { name: String(myself.name) };
    }

    Object.entries(fieldsMeta).forEach(([fieldId, meta]) => {
      if (!meta || !meta.required || Object.prototype.hasOwnProperty.call(fields, fieldId)) return;
      const fieldName = String(meta.name || '').toLowerCase();
      const schema = meta.schema || {};
      if (fieldId === 'labels' || /метки|labels/i.test(fieldName)) {
        fields[fieldId] = draft.kind === 'epic' ? ['fcrm_umb_epic'] : [String(draft.summary || '').trim()];
      } else if (schema.type === 'string' || fieldId === 'description' || isEpicNameCreateField(meta)) {
        fields[fieldId] = String(draft.summary || '').trim();
      } else if (schema.type === 'array' && schema.items === 'string') {
        fields[fieldId] = [String(draft.summary || '').trim()];
      } else if (meta.defaultValue != null) {
        fields[fieldId] = meta.defaultValue;
      }
    });

    const missing = Object.entries(fieldsMeta)
      .filter(([fieldId, meta]) => meta && meta.required && !meta.hasDefaultValue && !Object.prototype.hasOwnProperty.call(fields, fieldId))
      .map(([, meta]) => meta.name || 'обязательное поле');
    if (missing.length) throw new Error('Для создания Jira требует заполнить ещё: ' + missing.join(', '));

    const response = await fetch('/rest/api/2/issue', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ fields })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = result.errors ? Object.values(result.errors).join('; ') : result.errorMessages && result.errorMessages.join('; ');
      throw new Error(details || 'Jira не создала задачу (HTTP ' + response.status + ')');
    }
    return { key: result.key, summary: fields.summary, component: component.name, issueType: issueType.name, kind: draft.kind };
  }

  async function createDesignIssueFromSidebar(sourceTaskKey, summary, description) {
    const projectKey = 'FTD';
    const [issueTypes, components] = await Promise.all([loadIssueCreateMeta(projectKey), loadIssueCreateComponents(projectKey)]);
    const issueType = issueTypes.find((type) => /^(задача|task)$/i.test(String(type.name || '').trim()));
    if (!issueType) throw new Error('В проекте FTD не найден тип задачи «Задача»');
    const component = components.find((item) => String(item.name || '').trim().toLowerCase() === 'bank crm');
    if (!component) throw new Error('В проекте FTD не найден компонент «bank crm»');
    const fields = {
      project: { key: projectKey },
      issuetype: { id: String(issueType.id) },
      summary: String(summary || '').trim(),
      description: String(description || '').trim(),
      components: [{ id: String(component.id) }]
    };
    const requiredMissing = Object.entries(issueType.fields || {})
      .filter(([fieldId, meta]) => meta && meta.required && !Object.prototype.hasOwnProperty.call(fields, fieldId))
      .map(([, meta]) => meta.name || 'обязательное поле');
    if (requiredMissing.length) throw new Error('Для создания задачи FTD требуется заполнить: ' + requiredMissing.join(', '));
    const response = await fetch('/rest/api/2/issue', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ fields })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = result.errors ? Object.values(result.errors).join('; ') : result.errorMessages && result.errorMessages.join('; ');
      throw new Error(details || 'Jira не создала задачу FTD (HTTP ' + response.status + ')');
    }
    if (!result.key) throw new Error('Jira создала задачу FTD, но не вернула её ключ');
    const linked = await createIssueLinkInJira(sourceTaskKey, result.key, 'inProject');
    await reloadSingleTaskFromJira(sourceTaskKey, true);
    return { key: result.key, linked };
  }

  async function beginSidebarIssueCreate(kind) {
    const projectKey = kind === 'epic' ? CONFIG.projectKey : kind === 'front' ? 'OBFRONT' : 'OB';
    createInProjectMenuOpen = false;
    issueCreateBusy = false;
    issueCreateLoading = true;
    issueCreateDraft = { kind, projectKey, summary: '', description: '', componentId: '', componentQuery: '', components: [], error: '' };
    const draft = issueCreateDraft;
    renderStructure();
    try {
      const [metaResult, componentResult] = await Promise.allSettled([
        loadIssueCreateMeta(projectKey),
        loadIssueCreateComponents(projectKey)
      ]);
      if (issueCreateDraft !== draft) return;
      if (componentResult.status === 'fulfilled') issueCreateDraft.components = componentResult.value;
      if (metaResult.status === 'rejected') throw metaResult.reason;
      const issueTypes = metaResult.value;
      if (!getIssueCreateType(projectKey, kind, issueTypes)) {
        throw new Error(kind === 'epic' ? 'В FCRM не найден тип задачи Epic' : 'В проекте не найден тип задачи');
      }
    } catch (error) {
      if (issueCreateDraft !== draft) return;
      issueCreateDraft.error = error && error.message ? error.message : 'Не удалось загрузить данные Jira';
    }
    issueCreateLoading = false;
    renderStructure();
    setTimeout(() => document.getElementById('ozon-create-issue-summary')?.focus(), 0);
  }

  async function submitSidebarIssueCreate() {
    if (!issueCreateDraft || issueCreateBusy) return;
    issueCreateDraft.summary = String(document.getElementById('ozon-create-issue-summary')?.value || issueCreateDraft.summary).trim();
    issueCreateDraft.description = String(document.getElementById('ozon-create-issue-description')?.value || issueCreateDraft.description).trim();
    if (!issueCreateDraft.summary) {
      issueCreateDraft.error = 'Введите название';
      renderStructure();
      document.getElementById('ozon-create-issue-summary')?.focus();
      return;
    }
    if (issueCreateDraft.kind !== 'epic' && !String(issueCreateDraft.description || '').trim()) {
      issueCreateDraft.error = 'Введите описание задачи';
      renderStructure();
      document.getElementById('ozon-create-issue-description')?.focus();
      return;
    }
    if (!issueCreateDraft.componentId) {
      issueCreateDraft.error = 'Выберите компонент';
      renderStructure();
      return;
    }

    const sourceTaskKey = selectedTaskKey;
    issueCreateBusy = true;
    issueCreateDraft.error = '';
    renderStructure();
    try {
      const created = await createIssueFromSidebar(issueCreateDraft);
      if (!created.key) throw new Error('Jira создала задачу, но не вернула её ключ');
      if (created.kind === 'epic') {
        umbCatalog = [{
          key: created.key,
          summary: created.summary,
          status: 'Открыто',
          component: created.component,
          issueType: 'Epic',
          issueTypeName: 'Epic'
        }, ...umbCatalog.filter((item) => item.key !== created.key)];
      }
      issueCreateDraft = null;
      issueCreateBusy = false;
      renderStructure();
      const linkCategory = created.kind === 'epic' ? 'projectTask' : 'inProject';
      const linked = await createIssueLinkInJira(sourceTaskKey, created.key, linkCategory);
      if (!linked) {
        showSaveToast('Создана ' + created.key + ', но автоматическую связь сохранить не удалось');
        await reloadSingleTaskFromJira(sourceTaskKey, true);
      } else {
        await reloadSingleTaskFromJira(sourceTaskKey, true);
        showSaveToast('Создана и связана задача ' + created.key);
      }
    } catch (error) {
      issueCreateBusy = false;
      if (issueCreateDraft) issueCreateDraft.error = error && error.message ? error.message : 'Не удалось создать задачу';
      renderStructure();
    }
  }

  /**
   * Извлекает командный префикс серии спринта (например из "CS #73 (20.10 - 02.11)" -> "CS")
   */
  function extractSprintSeriesPrefix(sprintName) {
    if (!sprintName || sprintName === 'Не в спринте' || sprintName.includes('Бэклог')) return '';
    const m = String(sprintName).trim().match(/^([A-Za-z\\p{L}0-9_&\\-\\s]+?)(?:\\s*#\\d+|\\s+\\d+|\\s*\\()/u);
    return m && m[1] ? m[1].trim() : '';
  }

  /**
   * Загружает реальные активные и будущие спринты для связанной задачи (например OBFRONT + компонент CS),
   * НЕ подмешивая спринты из FCRM.
   */
  async function loadSprintsForLinkedIssue(lnk) {
    if (!lnk || !lnk.key) return [];
    const projKey = getIssueProjectKey(lnk.key);
    if (projKey === CONFIG.projectKey) {
      return getEditableSprintOptions();
    }
    const compName = lnk.component && lnk.component !== 'Без компонента' ? String(lnk.component).split(',')[0].trim() : '';
    const curSprint = lnk.sprint && lnk.sprint !== 'Не в спринте' ? String(lnk.sprint).trim() : '';
    const cacheKey = projKey + '::' + (compName || '*');
    if (!externalProjectSprintsMap[cacheKey]) {
      ipSprintLoadProgress[lnk.key] = 12;
      renderStructure();
    }
    const foundSprints = new Set((externalProjectSprintsMap[cacheKey] || []).filter((sp) => isEditableSprintOption(sp)));
    if (curSprint && isEditableSprintOption(curSprint)) {
      foundSprints.add(curSprint);
    }

    const seriesPrefix = extractSprintSeriesPrefix(curSprint) || compName;

    // 1. Запрос к GreenHopper Sprint Picker API по префиксу спринта или компоненту (например "CS") — берём ТОЛЬКО Активные и Будущие
    const pickerQueries = Array.from(new Set([seriesPrefix, compName].filter(Boolean)));
    for (const qTerm of pickerQueries) {
      try {
        const ghRes = await fetch('/rest/greenhopper/1.0/sprint/picker?query=' + encodeURIComponent(qTerm), {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (ghRes.ok) {
          ipSprintLoadProgress[lnk.key] = 48;
          renderStructure();
          const ghData = await ghRes.json();
          const allMatches = [
            ...(Array.isArray(ghData && ghData.suggestions) ? ghData.suggestions : []),
            ...(Array.isArray(ghData && ghData.allMatches) ? ghData.allMatches : [])
          ];
          const qLow = qTerm.toLowerCase();
          allMatches.forEach((sp) => {
            if (!sp || !sp.name) return;
            const stKey = String(sp.stateKey || sp.state || '').toUpperCase();
            const spName = String(sp.name).trim();
            if (stKey === 'ACTIVE' || stKey === 'FUTURE' || stKey === 'CLOSED') {
              sprintStateByName[spName] = stKey;
            }
            if (stKey === 'CLOSED') {
              closedSprintNames.add(spName);
              if (sp.id) closedSprintIds.add(String(sp.id));
              return;
            }
            if (sp.id) {
              sprintIdByName[spName] = String(sp.id);
              sprintNameById[String(sp.id)] = spName;
            }
            if ((spName.toLowerCase().startsWith(qLow) || spName.toLowerCase().includes(qLow)) && isEditableSprintOption(spName)) {
              foundSprints.add(spName);
            }
          });
        }
      } catch (e) {}
    }

    // 2. Поиск открытых и будущих спринтов конкретно для проекта (OBFRONT/OB/FTD) и компонента (CS и др.) через JQL
    try {
      const sprintField = discoveredFields.sprint || CONFIG.sprintFieldId;
      const fieldsList = ['sprint', 'closedSprints', sprintField].filter(Boolean).join(',');
      const jqlWithComp =
        compName
          ? 'project = "' + projKey + '" AND component = "' + compName.replace(/"/g, '') + '" AND Sprint is not EMPTY ORDER BY updated DESC'
          : 'project = "' + projKey + '" AND Sprint is not EMPTY ORDER BY updated DESC';

      const sRes = await fetch(
        '/rest/api/2/search?jql=' + encodeURIComponent(jqlWithComp) + '&fields=' + encodeURIComponent(fieldsList) + '&maxResults=50',
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      if (sRes.ok) {
        ipSprintLoadProgress[lnk.key] = 82;
        renderStructure();
        const sData = await sRes.json();
        if (Array.isArray(sData.issues)) {
          sData.issues.forEach((iss) => {
            const lf = (iss && iss.fields) || {};
            const registerRawSprint = (raw, isFromClosedField) => {
              if (!raw) return;
              if (Array.isArray(raw)) {
                raw.forEach((item) => registerRawSprint(item, isFromClosedField));
                return;
              }
              if (typeof raw === 'object' && raw.name) {
                const st = isFromClosedField ? 'CLOSED' : String(raw.state || '').toUpperCase();
                const nm = String(raw.name).trim();
                if (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED') {
                  sprintStateByName[nm] = st;
                }
                if (st === 'CLOSED') {
                  closedSprintNames.add(nm);
                  if (raw.id) closedSprintIds.add(String(raw.id));
                  return;
                }
                if (raw.id) {
                  sprintIdByName[nm] = String(raw.id);
                  sprintNameById[String(raw.id)] = nm;
                }
                if (isEditableSprintOption(nm)) {
                  foundSprints.add(nm);
                }
                return;
              }
              const sStr = String(raw);
              const stMatch = sStr.match(/state=([^,\\]]+)/);
              const parsedSt = isFromClosedField ? 'CLOSED' : stMatch && stMatch[1] ? stMatch[1].trim().toUpperCase() : '';
              const nm = extractAnyRealSprintName(raw);
              if (nm && (parsedSt === 'ACTIVE' || parsedSt === 'FUTURE' || parsedSt === 'CLOSED')) {
                sprintStateByName[nm] = parsedSt;
              }
              if (nm && parsedSt === 'CLOSED') {
                closedSprintNames.add(nm);
                return;
              }
              if (nm && isEditableSprintOption(nm)) {
                foundSprints.add(nm);
              }
            };
            registerRawSprint(lf.closedSprints, true);
            registerRawSprint(lf.sprint, false);
            if (sprintField && lf[sprintField]) registerRawSprint(lf[sprintField], false);
          });
        }
      }
    } catch (e) {}

    const teamPrefix = compName.toLowerCase();
    externalProjectSprintsMap[cacheKey] = Array.from(foundSprints).filter((sp) =>
      isEditableSprintOption(sp) && getSprintStateCode(sp) !== 'CLOSED' && (!teamPrefix || sp.toLowerCase().startsWith(teamPrefix))
    );
    delete ipSprintLoadProgress[lnk.key];
    return externalProjectSprintsMap[cacheKey];
  }

  function getSprintsForLinkedIssue(lnk) {
    if (!lnk || !lnk.key) return ['Не в спринте'];
    const projKey = getIssueProjectKey(lnk.key);
    const realSprintVal = (lnk.sprint && String(lnk.sprint).trim()) || 'Не в спринте';

    // Если связанная задача из самого FCRM — возвращаем ТОЛЬКО активные и будущие спринты FCRM (+ Бэклог / Не в спринте)
    if (projKey === CONFIG.projectKey) {
      return Array.from(new Set([...getEditableSprintOptions(), 'Не в спринте'])).filter((sp) => isEditableSprintOption(sp));
    }

    // Для внешних проектов (OBFRONT, OB, FTD и др.) НИКОГДА не подмешиваем спринты из FCRM и исключаем Прошедшие (CLOSED) спринты!
    const compName = lnk.component && lnk.component !== 'Без компонента' ? String(lnk.component).split(',')[0].trim() : '';
    const cacheKey = projKey + '::' + (compName || '*');
    const cached = (externalProjectSprintsMap[cacheKey] || []).filter((sp) =>
      isEditableSprintOption(sp)
    );

    // Также собираем активные и будущие спринты других связанных задач того же проекта и компонента
    const fromSameProjectCompLinks = [];
    const seriesPrefix = compName || extractSprintSeriesPrefix(realSprintVal);
    const prefixLow = seriesPrefix ? seriesPrefix.toLowerCase() : '';

    tasks.forEach((t) => {
      (t.inProjectLinks || []).forEach((otherLnk) => {
        if (!otherLnk || !otherLnk.key) return;
        const otherProj = getIssueProjectKey(otherLnk.key);
        if (otherProj !== projKey) return;
        const otherComp = otherLnk.component && otherLnk.component !== 'Без компонента' ? String(otherLnk.component).split(',')[0].trim() : '';
        const otherSp = otherLnk.sprint && otherLnk.sprint !== 'Не в спринте' ? String(otherLnk.sprint).trim() : '';
        if (!otherSp || !isEditableSprintOption(otherSp)) return;
        if (compName && otherComp.toLowerCase() === compName.toLowerCase()) {
          fromSameProjectCompLinks.push(otherSp);
        }
      });
    });

    // И проверяем известные активные и будущие спринты в sprintIdByName с тем же командным префиксом (например "CS #74", "CS #75")
    const fromKnownPrefix = [];
    if (prefixLow && prefixLow.length >= 2) {
      Object.keys(sprintIdByName).forEach((spName) => {
        if (boardOwnedSprintNames.has(spName)) return; // исключаем спринты FCRM
        if (!isEditableSprintOption(spName)) return; // исключаем прошедшие спринты
        if (spName.toLowerCase().startsWith(prefixLow)) {
          fromKnownPrefix.push(spName);
        }
      });
    }

    const teamSprints = compName ? [...cached, ...fromKnownPrefix, ...fromSameProjectCompLinks] : [realSprintVal];
    const combined = Array.from(
      new Set([
        ...(isEditableSprintOption(realSprintVal) ? [realSprintVal] : []),
        ...teamSprints,
        'Не в спринте'
      ])
    ).filter((sp) => isEditableSprintOption(sp) && getSprintStateCode(sp) !== 'CLOSED');

    const dummyGroups = {};
    combined.forEach((s) => {
      dummyGroups[s] = true;
    });
    return getSortedSprintNames(dummyGroups);
  }

  // ============================================================================
  // РЕАЛЬНОЕ СОЗДАНИЕ И УДАЛЕНИЕ СВЯЗЕЙ (ISSUE LINKS) В JIRA REST API
  // ============================================================================
  function renderLinkActions(link, current) {
    if (!link || !link.key) return '';
    const attrs = ' data-link-key="' + escapeHtml(link.key) + '" data-jira-link-id="' + escapeHtml(link.jiraLinkId || link.id || '') + '" data-current="' + current + '"';
    const types = [['projectTask','Задача проекта'],['inProject','В проекте'],['linkedTask','Связанная задача'],['duplicates','Дублирует']];
    return '<details class="ozon-link-actions"><summary aria-label="Действия со связью" title="Действия со связью">⋯</summary><div class="ozon-link-actions-menu">' + types.filter(([id]) => id !== current).map(([id,label]) => '<button type="button" data-action="change-link-type" data-link-type="' + id + '"' + attrs + '>' + label + '</button>').join('') + '<button type="button" data-action="delete-link"' + attrs + '>Удалить связь</button><div class="ozon-link-action-message" role="status" style="color:#D92D20;font-size:11px;white-space:normal;"></div></div></details>';
  }
  async function createIssueLinkInJira(sourceTaskKey, targetTaskKey, category /* 'projectTask' | 'inProject' */, strictType, deferReload) {
    if (!sourceTaskKey || !targetTaskKey) return false;
    try {
      // Подгружаем типы связей, если они ещё не загружены
      await loadIssueLinkTypes();

      // Ищем тип связи "Задача проекта" / "В проекте" в вашей Jira
      const categoryPattern = category === 'projectTask' ? /задача проекта|project task/i : category === 'linkedTask' ? /связанная задача|relates to|relates/i : category === 'duplicates' ? /дублирует|дубликат|duplicates?/i : /в проекте|in project/i;
      let chosenType = discoveredIssueLinkTypes.find((lt) => {
        const n = String(lt.name || '').toLowerCase();
        const inw = String(lt.inward || '').toLowerCase();
        const outw = String(lt.outward || '').toLowerCase();
        return categoryPattern.test(n) || categoryPattern.test(inw) || categoryPattern.test(outw);
      });

      if (!chosenType) {
        if (strictType) throw new Error('В Jira не найден тип связи «' + (category === 'duplicates' ? 'Дублирует' : category === 'linkedTask' ? 'Связанная задача' : category === 'projectTask' ? 'Задача проекта' : 'В проекте') + '».');
        chosenType =
          discoveredIssueLinkTypes.find((lt) => /relates|связ|project/i.test(String(lt.name || ''))) ||
          discoveredIssueLinkTypes[0] || {
            name: CONFIG.linkTypeProjectTask || 'Задача проекта',
            inward: 'задача проекта',
            outward: 'в проекте'
          };
      }

      const inwDesc = String(chosenType.inward || '').toLowerCase();
      const outwDesc = String(chosenType.outward || '').toLowerCase();

      // В Jira REST API POST /rest/api/2/issueLink:
      // На карточке задачи A связанная задача B отображается в направлении inward, если в POST передано:
      // inwardIssue: { key: B }, outwardIssue: { key: A }
      // И отображается в направлении outward, если передано:
      // inwardIssue: { key: A }, outwardIssue: { key: B }
      let inwardKey = targetTaskKey;
      let outwardKey = sourceTaskKey;

      if (category === 'projectTask') {
        if (outwDesc.includes('задача проекта') && !inwDesc.includes('задача проекта')) {
          inwardKey = sourceTaskKey;
          outwardKey = targetTaskKey;
        } else {
          inwardKey = targetTaskKey;
          outwardKey = sourceTaskKey;
        }
      } else if (category === 'duplicates') {
        if (/дублирует|дубликат|duplicates?/i.test(outwDesc)) { inwardKey = sourceTaskKey; outwardKey = targetTaskKey; }
        else if (/дублирует|дубликат|duplicates?/i.test(inwDesc)) { inwardKey = targetTaskKey; outwardKey = sourceTaskKey; }
        else throw new Error('Направление связи «Дублирует» недоступно');
      } else {
        // Связанная задача — симметричный тип; Jira всё равно покажет его с обеих сторон.
        if (inwDesc.includes('в проекте') && !outwDesc.includes('в проекте')) {
          inwardKey = targetTaskKey;
          outwardKey = sourceTaskKey;
        } else {
          inwardKey = sourceTaskKey;
          outwardKey = targetTaskKey;
        }
      }

      const postRes = await fetch('/rest/api/2/issueLink', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: { name: chosenType.name },
          inwardIssue: { key: inwardKey },
          outwardIssue: { key: outwardKey }
        })
      });

      if (postRes.ok) {
        showSaveToast('✓ Связь ' + sourceTaskKey + ' ↔ ' + targetTaskKey + ' сохранена в Jira');
        // Перезагружаем задачу из Jira, чтобы подтянуть реальный ID связи и все поля связанной задачи
        if (!deferReload) await reloadSingleTaskFromJira(sourceTaskKey);
        return true;
      } else {
        // Резервная попытка с Relates, если кастомное имя типа связи отличается
        const fallbackType = discoveredIssueLinkTypes.find((lt) => /relates|связ/i.test(String(lt.name || ''))) || discoveredIssueLinkTypes[0];
        if (!strictType && fallbackType && fallbackType.name !== chosenType.name) {
          const retryRes = await fetch('/rest/api/2/issueLink', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              type: { name: fallbackType.name },
              inwardIssue: { key: inwardKey },
              outwardIssue: { key: outwardKey }
            })
          });
          if (retryRes.ok) {
            showSaveToast('✓ Связь ' + sourceTaskKey + ' ↔ ' + targetTaskKey + ' сохранена в Jira');
            if (!deferReload) await reloadSingleTaskFromJira(sourceTaskKey);
            return true;
          }
        }
        showSaveToast('⚠ Не удалось создать связь с ' + targetTaskKey + ' (проверьте ключ задачи)');
        return false;
      }
    } catch (e) {
      if (strictType) throw e;
      return false;
    }
  }

  async function deleteIssueLinkInJira(sourceTaskKey, targetTaskKey, explicitJiraLinkId) {
    if (!sourceTaskKey || !targetTaskKey) return false;
    try {
      let linkIdToDelete = explicitJiraLinkId && /^\\d+$/.test(String(explicitJiraLinkId)) ? String(explicitJiraLinkId) : null;

      if (!linkIdToDelete) {
        const r = await fetch('/rest/api/2/issue/' + encodeURIComponent(sourceTaskKey) + '?fields=issuelinks', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (r.ok) {
          const d = await r.json();
          const links = (d && d.fields && Array.isArray(d.fields.issuelinks)) ? d.fields.issuelinks : [];
          const found = links.find((lnk) => {
            const k1 = lnk.inwardIssue && lnk.inwardIssue.key;
            const k2 = lnk.outwardIssue && lnk.outwardIssue.key;
            return k1 === targetTaskKey || k2 === targetTaskKey;
          });
          if (found && found.id) {
            linkIdToDelete = String(found.id);
          }
        }
      }

      if (!linkIdToDelete) {
        showSaveToast('Связь ' + targetTaskKey + ' убрана');
        return false;
      }

      const delRes = await fetch('/rest/api/2/issueLink/' + encodeURIComponent(linkIdToDelete), {
        method: 'DELETE',
        credentials: 'same-origin'
      });

      if (delRes.ok || delRes.status === 204) {
        showSaveToast('✓ Связь с ' + targetTaskKey + ' удалена из Jira');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async function requestAssignableJiraUsers(query, issueKey, signal) {
    const params = new URLSearchParams(issueKey ? {issueKey} : {project:CONFIG.projectKey});
    if (query) { params.set('username',query); params.set('query',query); }
    params.set('maxResults','25');
    const response = await fetch('/rest/api/2/user/assignable/search?' + params, {credentials:'same-origin',headers:{Accept:'application/json'},signal});
    if (!response.ok) throw new Error('Не удалось найти исполнителей в Jira (HTTP ' + response.status + ')');
    const users = await response.json();
    if (!Array.isArray(users)) throw new Error('Jira не вернула список исполнителей');
    return users;
  }

  function assignableUser(user) {
    const person = jiraPeople.fromJira(user);
    return {...person,name:user.name || user.key || user.displayName,displayName:person.name,email:user.emailAddress || ''};
  }

  function pickedAssignee(name, id, candidate) {
    const match = candidate || assignableUsersList.find(user=>user.name===id);
    return {name,login:match ? match.login : id || '',avatarUrl:match?.avatarUrl || '',role:'Ozon Банк'};
  }

  // Живой поиск пользователей в Jira по ФИО или логину (отфильтровывая технические аккаунты с $)
  async function searchJiraUsers(query, issueKey) {
    const q = String(query || '').trim();
    const qLow = q.toLowerCase();

    const localMatches = assignableUsersList.filter(
      (u) =>
        isRealHumanJiraUser(u) &&
        (!qLow ||
          (u.displayName && u.displayName.toLowerCase().includes(qLow)) ||
          (u.name && u.name.toLowerCase().includes(qLow)))
    );

    if (!q) {
      return localMatches.slice(0, 25);
    }

    const mergedMap = new Map();
    localMatches.forEach((u) => mergedMap.set(u.name, u));

    try {
      const users = await requestAssignableJiraUsers(q, issueKey);
      users.forEach((u) => {
        if (!isRealHumanJiraUser(u)) return;
        const login = u.name || u.key || u.displayName;
        if (login && u.displayName) {
          const item = assignableUser(u);
          mergedMap.set(login, item);
          if (!assignableUsersList.some((ex) => ex.name === login)) assignableUsersList.push(item);
        }
      });
    } catch (e) {}

    if (mergedMap.size < 5) {
      try {
        const res2 = await fetch(
          '/rest/api/2/user/search?username=' + encodeURIComponent(q) + '&query=' + encodeURIComponent(q) + '&maxResults=25',
          { credentials: 'same-origin', headers: { Accept: 'application/json' } }
        );
        if (res2.ok) {
          const arr2 = await res2.json();
          if (Array.isArray(arr2)) {
            arr2.forEach((u) => {
              if (!isRealHumanJiraUser(u)) return;
              const login = u.name || u.key || u.displayName;
              if (login && u.displayName) {
                const item = assignableUser(u);
                mergedMap.set(login, item);
                if (!assignableUsersList.some((ex) => ex.name === login)) {
                  assignableUsersList.push(item);
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    return Array.from(mergedMap.values()).slice(0, 30);
  }

  async function transitionIssueStatusInJira(issueKey, targetStatusName, explicitTransitionId) {
    try {
      let trId = explicitTransitionId;
      let transitions = issueTransitionsByKey[issueKey];

      if (!trId) {
        const trRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/transitions', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (trRes.ok) {
          const trData = await trRes.json();
          transitions = Array.isArray(trData.transitions) ? trData.transitions : [];
          issueTransitionsByKey[issueKey] = transitions;
        }
      }

      if (!trId && Array.isArray(transitions)) {
        const targetLow = String(targetStatusName || '').trim().toLowerCase();
        const matched = transitions.find((tr) => {
          const toName = (tr.to && tr.to.name ? String(tr.to.name) : '').trim().toLowerCase();
          const trName = (tr.name ? String(tr.name) : '').trim().toLowerCase();
          return toName === targetLow || trName === targetLow || toName.includes(targetLow) || trName.includes(targetLow);
        });
        if (matched && matched.id) {
          trId = String(matched.id);
        }
      }

      if (!trId) {
        showSaveToast('Статус ' + issueKey + ' → ' + targetStatusName + ' (локально)');
        return false;
      }

      const postRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/transitions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ transition: { id: String(trId) } })
      });
      if (postRes.ok) {
        showSaveToast('✓ Статус ' + issueKey + ' переведён в «' + targetStatusName + '»');
        void refreshStrategyIssue(issueKey, 'status');
        fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/transitions', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d && Array.isArray(d.transitions)) {
              issueTransitionsByKey[issueKey] = d.transitions;
              renderStructure();
            }
          })
          .catch(() => {});
      }
      return postRes.ok;
    } catch (e) {
      return false;
    }
  }

  async function updateIssueTypeInJira(issueKey, newTypeName) {
    if (!issueKey || !newTypeName) return false;
    try {
      const cleanName = String(newTypeName).trim();
      const typeId = issueTypeIdByName[cleanName] || null;
      const issuetypePayload = typeId ? { id: String(typeId) } : { name: cleanName };

      const putRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ fields: { issuetype: issuetypePayload } })
      });

      if (putRes.ok || putRes.status === 204) {
        showSaveToast('✓ Тип задачи ' + issueKey + ' → ' + cleanName);
        void refreshStrategyIssue(issueKey, 'issuetype');
        return true;
      }

      // Фоллбэк по имени типа задачи, если по ID вернулась ошибка схемы
      if (typeId) {
        const retryRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ fields: { issuetype: { name: cleanName } } })
        });
        if (retryRes.ok || retryRes.status === 204) {
          showSaveToast('✓ Тип задачи ' + issueKey + ' → ' + cleanName);
          void refreshStrategyIssue(issueKey, 'issuetype');
          return true;
        }
      }

      showSaveToast('✓ Тип задачи ' + issueKey + ' → ' + cleanName);
      return false;
    } catch (e) {
      return false;
    }
  }

  async function updateIssueEpicInJira(issueKey, newEpicKey) {
    try {
      const cleanEpKey = newEpicKey ? String(newEpicKey).trim().toUpperCase() : '';

      // 1. Если для нового эпика ещё не загружено название — подтягиваем из Jira
      if (cleanEpKey && !epicNameByKey[cleanEpKey]) {
        try {
          const epInfoRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(cleanEpKey) + '?fields=summary', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          });
          if (epInfoRes.ok) {
            const epInfo = await epInfoRes.json();
            const epSum = epInfo && epInfo.fields && epInfo.fields.summary ? String(epInfo.fields.summary).trim() : '';
            if (epSum) {
              epicNameByKey[cleanEpKey] = epSum;
              if (cleanEpKey.startsWith(CONFIG.projectKey + '-')) {
                fcrmEpicNameByKey[cleanEpKey] = epSum;
              }
              tasks = tasks.map((t) =>
                t.key === issueKey ? Object.assign({}, t, { epicKey: cleanEpKey, epicName: epSum }) : t
              );
              saveTaskOverride(issueKey, { epicKey: cleanEpKey, epicName: epSum });
              renderStructure();
            }
          }
        } catch (e) {}
      }

      // 2. Если ID кастомного поля Epic Link ещё не обнаружен — определяем через editmeta задачи
      if (!discoveredFields.epicLink) {
        try {
          const metaRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/editmeta', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          });
          if (metaRes.ok) {
            const metaData = await metaRes.json();
            const metaFields = (metaData && metaData.fields) || {};
            Object.keys(metaFields).forEach((fKey) => {
              const mf = metaFields[fKey];
              const cType = (mf && mf.schema && mf.schema.custom) || '';
              const fName = String((mf && mf.name) || '').toLowerCase();
              if (cType.includes('gh-epic-link') || fName === 'epic link' || fName === 'ссылка на эпик' || fName.includes('эпик')) {
                discoveredFields.epicLink = fKey;
              }
            });
          }
        } catch (e) {}
      }

      let savedOk = false;

      // 3. Обновляем поле Epic Link через стандартный PUT /rest/api/2/issue/{issueKey}
      if (discoveredFields.epicLink) {
        const payload = { fields: {} };
        payload.fields[discoveredFields.epicLink] = cleanEpKey || null;
        const putRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        if (putRes.ok || putRes.status === 204) {
          savedOk = true;
        }
      }

      // 4. Дублируем через Agile API /rest/agile/1.0/epic/{epicKey|none}/issue
      const agileTarget = cleanEpKey ? encodeURIComponent(cleanEpKey) : 'none';
      const agRes = await fetch('/rest/agile/1.0/epic/' + agileTarget + '/issue', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ issues: [issueKey] })
      });
      if (agRes.ok || agRes.status === 204) {
        savedOk = true;
      }

      if (savedOk) {
        showSaveToast('✓ Эпик ' + issueKey + ' → ' + (cleanEpKey || 'Без эпика') + ' сохранён в Jira');
        void refreshStrategyIssue(issueKey, [discoveredFields.epicLink, 'epic'].filter(Boolean).join(','));
      } else {
        showSaveToast('⚠ Проверьте код эпика ' + (cleanEpKey || ''));
      }
    } catch (e) {}
  }

  function putIssueAssignee(issueKey, loginName) {
    return fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/assignee', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: loginName })
    });
  }

  async function updateIssueAssigneeInJira(issueKey, displayNameOrLogin, explicitLogin) {
    try {
      const foundUser = assignableUsersList.find(
        (u) => u.displayName === displayNameOrLogin || u.name === displayNameOrLogin
      );
      const loginName =
        displayNameOrLogin === 'Не назначен' || !displayNameOrLogin
          ? null
          : explicitLogin || (foundUser && foundUser.name) || displayNameOrLogin;

      const res = await putIssueAssignee(issueKey, loginName);

      if (!res.ok && loginName) {
        await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { assignee: { name: loginName } } })
        }).catch(() => {});
      }
      showSaveToast('✓ Исполнитель ' + issueKey + ' → ' + (displayNameOrLogin || 'Не назначен'));
    } catch (e) {}
  }

  async function updateIssueCustomerInJira(issueKey, customerValue, explicitLogin) {
    try {
      const foundUser = assignableUsersList.find(
        (u) => u.displayName === customerValue || u.name === customerValue
      );
      const resolvedLogin = explicitLogin || (foundUser && foundUser.name) || null;
      const candidateFields = Array.from(new Set([discoveredFields.customer, ...discoveredCustomerFieldIds].filter(Boolean)));

      for (const fId of candidateFields) {
        if (customerValue === 'Не указан' || !customerValue) {
          const payload = { fields: { [fId]: null } };
          const r = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (r.ok || r.status === 204) {
            discoveredFields.customer = fId;
            break;
          }
          continue;
        }

        // Вариант 1: User Picker ({ name: login }) — основной формат для поля "Заказчик/Owner" в Jira
        if (resolvedLogin) {
          const pUser = { fields: { [fId]: { name: resolvedLogin } } };
          const r1 = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pUser)
          });
          if (r1.ok || r1.status === 204) {
            discoveredFields.customer = fId;
            break;
          }
          // Вариант 2: Multi-User Picker ([{ name: login }])
          const pMulti = { fields: { [fId]: [{ name: resolvedLogin }] } };
          const r2 = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pMulti)
          });
          if (r2.ok || r2.status === 204) {
            discoveredFields.customer = fId;
            break;
          }
        }

        // Вариант 3: Текстовое поле
        const pStr = { fields: { [fId]: customerValue } };
        const r3 = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pStr)
        });
        if (r3.ok || r3.status === 204) {
          discoveredFields.customer = fId;
          break;
        }
      }
      showSaveToast('✓ Заказчик/Owner ' + issueKey + ' → ' + customerValue);
    } catch (e) {}
  }

  async function updateIssueSprintInJira(issueKey, newSprintName) {
    try {
      const isRemoveFromSprint =
        !newSprintName ||
        newSprintName.includes('Бэклог') ||
        newSprintName === 'Не в спринте';

      const targetSpId = !isRemoveFromSprint ? sprintIdByName[newSprintName] : null;

      if (targetSpId) {
        await fetch('/rest/agile/1.0/sprint/' + encodeURIComponent(targetSpId) + '/issue', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues: [issueKey] })
        }).catch(() => {});
        if (discoveredFields.sprint) {
          const p = { fields: {} };
          p.fields[discoveredFields.sprint] = Number(targetSpId) || targetSpId;
          await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
          }).catch(() => {});
        }
        showSaveToast('✓ Спринт ' + issueKey + ' → ' + newSprintName);
      } else {
        await fetch('/rest/agile/1.0/backlog/issue', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issues: [issueKey] })
        }).catch(() => {});
        if (discoveredFields.sprint) {
          const p = { fields: {} };
          p.fields[discoveredFields.sprint] = null;
          await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
          }).catch(() => {});
        }
        showSaveToast('✓ Задача ' + issueKey + ' удалена из спринта (в Бэклог)');
      }
    } catch (e) {}
  }

  /**
   * Живой поиск эпиков СТРОГО внутри проекта FCRM без ошибки 400 Bad Request на issuetype in (Epic, "Эпик")
   */
  async function searchFcrmEpicsInJira(query) {
    const qClean = String(query || '').trim().replace(/"/g, '');

    // 1. Нативный GreenHopper Epic Picker API для проекта FCRM
    try {
      const ghEpRes = await fetch(
        '/rest/greenhopper/1.0/epics?searchQuery=' + encodeURIComponent(qClean) + '&projectKey=' + encodeURIComponent(CONFIG.projectKey) + '&maxResults=100',
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      if (ghEpRes.ok) {
        const ghEpData = await ghEpRes.json();
        const lists = (ghEpData && Array.isArray(ghEpData.epicLists) ? ghEpData.epicLists : []);
        lists.forEach((lst) => {
          if (lst && Array.isArray(lst.epicNames)) {
            lst.epicNames.forEach((ep) => {
              if (ep && ep.key && String(ep.key).startsWith(CONFIG.projectKey + '-') && ep.name) {
                const title = String(ep.name).trim();
                if (!isBogusEpicTitle(title, ep.key)) {
                  fcrmEpicNameByKey[ep.key] = title;
                  epicNameByKey[ep.key] = title;
                }
              }
            });
          }
        });
      }
    } catch (e) {}

    // 2. Поиск через JQL /rest/api/2/search с безопасным определением типа задачи Epic и поддержкой префиксного поиска (почт*)
    const epFields = ['summary', 'status', 'labels', 'customfield_20100'];
    if (discoveredFields.epicName) epFields.push(discoveredFields.epicName);

    const buildEpicJql = (epicTypeClause) => {
      let base = 'project = ' + CONFIG.projectKey + (epicTypeClause ? ' AND ' + epicTypeClause : '');
      if (qClean) {
        if (/^[A-Za-z]+-\\d+$/i.test(qClean)) {
          base += ' AND (key = "' + qClean.toUpperCase() + '" OR summary ~ "' + qClean + '*")';
        } else {
          base += ' AND (summary ~ "' + qClean + '*" OR summary ~ "' + qClean + '")';
        }
      }
      return base + ' ORDER BY updated DESC';
    };

    const candidateClauses = [];
    if (discoveredEpicIssueTypeName) {
      candidateClauses.push('issuetype = "' + discoveredEpicIssueTypeName.replace(/"/g, '') + '"');
    } else {
      candidateClauses.push('issuetype = Epic');
      candidateClauses.push('issuetype = "Эпик"');
    }
    if (discoveredFields.epicName) {
      const cfNum = String(discoveredFields.epicName).replace('customfield_', '');
      if (/^\\d+$/.test(cfNum)) {
        candidateClauses.push('cf[' + cfNum + '] is not EMPTY');
      }
    }

    for (const clause of candidateClauses) {
      try {
        const jql = buildEpicJql(clause);
        const res = await fetch(
          '/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=' + epFields.join(',') + '&maxResults=100',
          { credentials: 'same-origin', headers: { Accept: 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.issues)) {
            cacheEpicMetadata(data.issues);
            data.issues.forEach((epIss) => {
              if (!epIss || !epIss.key || !String(epIss.key).startsWith(CONFIG.projectKey + '-')) return;
              const ef = epIss.fields || {};
              const sum = ef.summary ? String(ef.summary).trim() : '';
              const cName = discoveredFields.epicName && ef[discoveredFields.epicName] ? String(ef[discoveredFields.epicName]).trim() : '';
              const title = !isBogusEpicTitle(sum, epIss.key) ? sum : !isBogusEpicTitle(cName, epIss.key) ? cName : epIss.key;
              fcrmEpicNameByKey[epIss.key] = title;
              epicNameByKey[epIss.key] = title;
            });
          }
          break; // Успешный запрос — не нужно перебирать запасные варианты
        }
      } catch (e) {}
    }
  }

  function discoverJiraIssueFields() {
    if (!issueFieldDiscoveryPromise) {
      issueFieldDiscoveryPromise = fetch('/rest/api/2/field', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      }).then(async response => {
        if (!response.ok) throw new Error('Jira: HTTP ' + response.status);
        const fields = await response.json();
        if (!Array.isArray(fields)) throw new Error('Jira не вернула список полей');
        const nameOf = field => String(field.name || '').toLowerCase().trim();
        const fieldId = (schema, names) => fields.find(field => (field.schema?.custom || '').includes(schema))?.id ||
          fields.find(field => names.test(nameOf(field)))?.id;
        discoveredFields.sprint = fieldId('gh-sprint', /^(sprint|спринт)$/) || discoveredFields.sprint;
        discoveredFields.epicLink = fieldId('gh-epic-link', /^(epic link|epic связь|ссылка на эпик)$/) || discoveredFields.epicLink;
        discoveredFields.epicName = fieldId('gh-epic-label', /^(epic name|название эпика|имя эпика)$/) || discoveredFields.epicName;
        discoveredFields.storyPoints = fields.find(field => /^(story points?|стори поинты)$/.test(nameOf(field)))?.id || discoveredFields.storyPoints;
        const owners = fields.filter(field => /заказчик|^owner$|^customer$/.test(nameOf(field)));
        const exact = owners.filter(field => nameOf(field).includes('заказчик') && nameOf(field).includes('owner'));
        discoveredCustomerFieldIds = [...new Set([...exact, ...owners].map(field => field.id).filter(Boolean))];
        discoveredFields.customer = discoveredCustomerFieldIds[0] || discoveredFields.customer;
      }).catch(() => { issueFieldDiscoveryPromise = null; });
    }
    return issueFieldDiscoveryPromise;
  }

  async function discoverJiraFieldsAndComponents() {
    await discoverJiraIssueFields();

    try { await loadIssueLinkTypes(); } catch (e) {}

    // Компоненты СТРОГО проекта FCRM
    try {
      const key = String(CONFIG.projectKey).toUpperCase();
      const components = await fetchProjectComponents(key, true);
      projectComponentsList = components
        .filter(item => !item.project || String(item.project).toUpperCase() === key)
        .map(item => item.name);
    } catch (e) {}

    // Статусы и типы задач проекта FCRM строго в разрезе каждого типа задачи (Workflow Scheme!) + точное имя типа задачи Epic
    try {
      const stRes = await fetch('/rest/api/2/project/' + encodeURIComponent(CONFIG.projectKey) + '/statuses', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (stRes.ok) {
        const stData = await stRes.json();
        const stSet = new Set();
        const typesList = [];
        if (Array.isArray(stData)) {
          stData.forEach((issueTypeObj) => {
            const typeName = issueTypeObj && issueTypeObj.name ? String(issueTypeObj.name).trim() : '';
            const typeId = issueTypeObj && issueTypeObj.id ? String(issueTypeObj.id) : '';
            if (typeName) {
              if (typeId) {
                issueTypeIdByName[typeName] = typeId;
              }
              if (!typesList.some((it) => it.name === typeName)) {
                typesList.push({ id: typeId, name: typeName, subtask: Boolean(issueTypeObj.subtask), iconUrl:issueTypeObj.iconUrl });
              }
            }
            if (typeName.toLowerCase() === 'epic' || typeName.toLowerCase() === 'эпик') {
              discoveredEpicIssueTypeName = typeName;
            }
            const typeStatuses = [];
            if (Array.isArray(issueTypeObj.statuses)) {
              issueTypeObj.statuses.forEach((s) => {
                if (s && s.name && !isCanceledStatus(s.name)) {
                  stSet.add(s.name);
                  typeStatuses.push(s.name);
                } else if (s && s.name) {
                  typeStatuses.push(s.name);
                }
              });
            }
            if (typeName && typeStatuses.length > 0) {
              statusesByIssueTypeMap[typeName] = typeStatuses;
            }
            if (typeId && typeStatuses.length > 0) {
              statusesByIssueTypeMap[typeId] = typeStatuses;
            }
          });
        }
        if (typesList.length > 0) {
          projectIssueTypesList = typesList;
        }
        if (stSet.size > 0) {
          projectStatusesList = Array.from(stSet);
        }
      }
    } catch (e) {}

    // Дополнительно проверяем типы задач проекта через /rest/api/2/project/{projectKey}, если список пуст
    if (projectIssueTypesList.length === 0) {
      try {
        const prjRes = await fetch('/rest/api/2/project/' + encodeURIComponent(CONFIG.projectKey), {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (prjRes.ok) {
          const prjData = await prjRes.json();
          if (prjData && Array.isArray(prjData.issueTypes)) {
            prjData.issueTypes.forEach((it) => {
              if (it && it.name) {
                const tName = String(it.name).trim();
                const tId = it.id ? String(it.id) : '';
                if (tId) issueTypeIdByName[tName] = tId;
                if (!projectIssueTypesList.some((x) => x.name === tName)) {
                  projectIssueTypesList.push({ id: tId, name: tName, subtask: Boolean(it.subtask), iconUrl:it.iconUrl });
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    // Все приоритеты Jira
    try {
      const prRes = await fetch('/rest/api/2/priority', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (prRes.ok) {
        const prData = await prRes.json();
        if (Array.isArray(prData)) {
          projectPrioritiesList = prData.map((p) => p && p.name).filter(Boolean);
          prData.forEach((p) => {
            if (p && p.name && p.iconUrl) {
              priorityIconUrlMap[p.name] = p.iconUrl;
            }
          });
        }
      }
    } catch (e) {}

    // Исполнители проекта FCRM (без технических ботов $)
    try {
      const usrRes = await fetch('/rest/api/2/user/assignable/search?project=' + encodeURIComponent(CONFIG.projectKey) + '&maxResults=100', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (usrRes.ok) {
        const usrs = await usrRes.json();
        if (Array.isArray(usrs)) {
          assignableUsersList = usrs
            .filter((u) => u && (u.name || u.key) && u.displayName && isRealHumanJiraUser(u))
            .map((u) => ({ name: u.name || u.key, displayName: u.displayName, email: u.emailAddress || '' }));
        }
      }
    } catch (e) {}
  }

  /**
   * Шаг 2. Подгрузка родных Активных, Будущих И Закрытых (Прошедших) спринтов доски FCRM (#9349) с пагинацией (дозапросами) и эпиков FCRM.
   */
  async function loadBoardSprintsAndEpics() {
    try {
      let spStartAt = 0;
      let spIsLast = false;
      let spPageGuard = 0;
      let globalSpIdx = 0;

      while (!spIsLast && spPageGuard < 15) {
        spPageGuard++;
        const spRes = await fetch(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint?state=active,future,closed&startAt=' + spStartAt + '&maxResults=50',
          {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
          }
        );
        if (!spRes.ok) break;
        const spData = await spRes.json();
        const vals = Array.isArray(spData.values) ? spData.values : [];
        if (vals.length === 0) break;

        vals.forEach((sp) => {
          globalSpIdx++;
          if (!sp || !sp.id || !sp.name) return;
          const spIdStr = String(sp.id);
          const spNameClean = String(sp.name).trim();
          const stateLow = String(sp.state || '').toLowerCase();
          const stateUp = stateLow.toUpperCase();

          if (stateLow === 'closed') {
            closedSprintIds.add(spIdStr);
            closedSprintNames.add(spNameClean);
          } else if (stateLow === 'active' || stateLow === 'future') {
            closedSprintIds.delete(spIdStr);
            closedSprintNames.delete(spNameClean);
          }

          sprintNameById[spIdStr] = sp.name;
          sprintIdByName[sp.name] = spIdStr;
          sprintIdByName[spNameClean] = spIdStr;
          if (stateUp === 'ACTIVE' || stateUp === 'FUTURE' || stateUp === 'CLOSED') {
            sprintStateByName[sp.name] = stateUp;
            sprintStateByName[spNameClean] = stateUp;
          }

          const isOwnedByBoard =
            (sp.originBoardId && String(sp.originBoardId) === String(CONFIG.rapidViewId)) ||
            isNativeFcrmBoardSprintName(sp.name, sp.originBoardId);

          if (!isOwnedByBoard) {
            return;
          }

          boardOwnedSprintIds.add(spIdStr);
          boardOwnedSprintNames.add(spNameClean);
          if (stateLow === 'active') sprintOrderWeight[sp.name] = 1 + globalSpIdx;
          else if (stateLow === 'future') sprintOrderWeight[sp.name] = 50 + globalSpIdx;
          else sprintOrderWeight[sp.name] = Math.max(200, 450 - Number(sp.id || globalSpIdx));
        });

        spStartAt += vals.length;
        if (isInitialBoardLoading && Number(spData.total) > 0) {
          initialLoadProgress = Math.max(initialLoadProgress, Math.min(31, 15 + Math.round((spStartAt / Number(spData.total)) * 16)));
          initialLoadStage = 'Загружаю спринты: ' + Math.min(spStartAt, Number(spData.total)) + ' из ' + Number(spData.total);
          renderStructure();
        }
        if (spData.isLast === true || vals.length < (spData.maxResults || 50)) {
          spIsLast = true;
        }
      }
    } catch (e) {}

    try {
      const ghRes = await fetch('/rest/greenhopper/1.0/xboard/plan/backlog/data.json?rapidViewId=' + CONFIG.rapidViewId, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        const fcrmIssueIdsOnBoard = new Set();
        if (Array.isArray(ghData.issues)) {
          ghData.issues.forEach((iss) => {
            if (iss && iss.id && iss.key && String(iss.key).startsWith(CONFIG.projectKey + '-')) {
              fcrmIssueIdsOnBoard.add(String(iss.id));
            }
          });
        }

        if (Array.isArray(ghData.sprints)) {
          ghData.sprints.forEach((sp, idx) => {
            if (!sp || !sp.id || !sp.name) return;
            const st = String(sp.state || '').toUpperCase();
            const spIdStr = String(sp.id);
            const spNameClean = String(sp.name).trim();

            if (st === 'CLOSED') {
              closedSprintIds.add(spIdStr);
              closedSprintNames.add(spNameClean);
            }
            if (st === 'ACTIVE' || st === 'FUTURE' || st === 'CLOSED') {
              sprintStateByName[sp.name] = st;
              sprintStateByName[spNameClean] = st;
            }
            sprintNameById[spIdStr] = sp.name;
            sprintIdByName[sp.name] = spIdStr;

            const spIssuesIds = Array.isArray(sp.issuesIds) ? sp.issuesIds.map(String) : [];
            const hasFcrmIssuesInSprint = spIssuesIds.some((id) => fcrmIssueIdsOnBoard.has(id));
            const isNative =
              boardOwnedSprintIds.has(spIdStr) ||
              hasFcrmIssuesInSprint ||
              isNativeFcrmBoardSprintName(sp.name, null);

            if (!isNative) {
              return;
            }

            boardOwnedSprintIds.add(spIdStr);
            boardOwnedSprintNames.add(spNameClean);
            if (!sprintOrderWeight[sp.name]) {
              sprintOrderWeight[sp.name] = st === 'ACTIVE' ? 10 + idx : st === 'FUTURE' ? 60 + idx : 300 + idx;
            }
          });
        }

        if (ghData.epicData && Array.isArray(ghData.epicData.epics)) {
          ghData.epicData.epics.forEach((ep) => {
            const epKey = ep.key;
            if (!epKey) return;
            const candidateSummary = ep.summary;
            const candidateText = ep.epicField && ep.epicField.text;
            let resolved = '';
            if (!isBogusEpicTitle(candidateSummary, epKey)) {
              resolved = candidateSummary.trim();
            } else if (!isBogusEpicTitle(candidateText, epKey)) {
              resolved = candidateText.trim();
            }
            if (resolved) {
              epicNameByKey[epKey] = resolved;
              if (String(epKey).startsWith(CONFIG.projectKey + '-')) {
                fcrmEpicNameByKey[epKey] = resolved;
              }
            }
          });
        }
      }
    } catch (e) {}

    // 3. Загружаем эпики СТРОГО проекта FCRM через JQL поиск
    await searchFcrmEpicsInJira('');
  }

  async function loadUmbEpicTasksFromJira(customQuery) {
    try {
      let jql = 'labels = fcrm_umb_epic';
      if (customQuery && String(customQuery).trim()) {
        const qClean = String(customQuery).trim().replace(/"/g, '');
        if (/^[A-Za-z]+-\\d+$/i.test(qClean)) {
          jql = 'labels = fcrm_umb_epic AND (key = "' + qClean.toUpperCase() + '" OR summary ~ "' + qClean + '")';
        } else {
          jql = 'labels = fcrm_umb_epic AND summary ~ "' + qClean + '"';
        }
      }
      const issues = [];
      let startAt = 0;
      do {
      const res = await fetch('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=key,summary,status,issuetype,components,issuelinks&maxResults=200&startAt=' + startAt, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      const page = Array.isArray(data.issues) ? data.issues : [];
      issues.push(...page);
      startAt += page.length;
      if (!page.length || startAt >= Number(data.total || issues.length)) break;
      } while (true);
      if (issues.length > 0) {
        const loaded = issues
          .map((iss, idx) => ({
            id: 'umb-' + idx + '-' + iss.key,
            key: iss.key,
            summary: (iss.fields && iss.fields.summary) || iss.key,
            status: (iss.fields && iss.fields.status && iss.fields.status.name) || 'Открыто',
            issueTypeName: (iss.fields && iss.fields.issuetype && iss.fields.issuetype.name) || 'Задача',
            issueTypeIconUrl: iss.fields?.issuetype?.iconUrl || '',
            component: resolveRealLinkedIssueComponent(iss),
            components: ((iss.fields && iss.fields.components) || []).map((c) => c && c.name).filter(Boolean),
            parents: ((iss.fields && iss.fields.issuelinks) || []).map((link) => {
              const inward = Boolean(link.inwardIssue);
              const direction = inward ? link.type && link.type.inward : link.type && link.type.outward;
              const target = inward ? link.inwardIssue : link.outwardIssue;
              return /задача проекта|project task/i.test(String(direction || '')) && target ? target.key : '';
            }).filter(Boolean)
          }))
          .filter((item) => !isCanceledStatus(item.status));
        if (!customQuery) {
          umbCatalog = loaded;
        } else {
          const map = new Map();
          loaded.forEach((item) => map.set(item.key, item));
          umbCatalog.forEach((item) => {
            if (!map.has(item.key) && !isCanceledStatus(item.status)) map.set(item.key, item);
          });
          umbCatalog = Array.from(map.values());
        }
      }
      if (!customQuery) umbCatalogReady = true;
    } catch (e) {}
  }

  function getBoardFieldsParam() {
    const fieldList = [
      'summary',
      'description',
      'labels',
      'customfield_20100',
      'issuetype',
      'status',
      'priority',
      'components',
      'assignee',
      'reporter',
      'creator',
      'created',
      'issuelinks',
      'parent',
      'sprint',
      'closedSprints',
      'epic'
    ];
    if (discoveredFields.sprint) fieldList.push(discoveredFields.sprint);
    if (discoveredFields.epicLink) fieldList.push(discoveredFields.epicLink);
    if (discoveredFields.epicName) fieldList.push(discoveredFields.epicName);
    if (discoveredFields.customer) fieldList.push(discoveredFields.customer);
    if (Array.isArray(discoveredCustomerFieldIds)) {
      discoveredCustomerFieldIds.forEach((cfId) => {
        if (cfId) fieldList.push(cfId);
      });
    }
    return encodeURIComponent(Array.from(new Set(fieldList)).join(','));
  }

  function extractCustomerOwnerFromIssueFields(f) {
    const candidates = Array.from(new Set([discoveredFields.customer, ...(discoveredCustomerFieldIds || [])].filter(Boolean)));
    for (const fId of candidates) {
      const rawCust = f && f[fId];
      if (!rawCust) continue;
      if (Array.isArray(rawCust) && rawCust.length > 0 && rawCust[0]) {
        const first = rawCust[0];
        const nm = first.displayName || first.value || first.name || first.fullName || (typeof first === 'string' ? first : '');
        const lg = first.name || first.key || '';
        if (nm && String(nm).trim()) {
          discoveredFields.customer = fId;
          return { name: String(nm).trim(), login: String(lg || '').trim() };
        }
      } else if (typeof rawCust === 'object') {
        const nm = rawCust.displayName || rawCust.value || rawCust.name || rawCust.fullName || '';
        const lg = rawCust.name || rawCust.key || '';
        if (nm && String(nm).trim()) {
          discoveredFields.customer = fId;
          return { name: String(nm).trim(), login: String(lg || '').trim() };
        }
      } else if (typeof rawCust === 'string' && rawCust.trim()) {
        discoveredFields.customer = fId;
        return { name: rawCust.trim(), login: '' };
      }
    }
    return { name: 'Не указан', login: '' };
  }

  async function normalizeAndEnrichJiraIssues(rawIssues, includeCanceled = false) {
    const allEpicKeysToResolve = new Set();
    const linkedIssueKeys = new Set();
    const umbKeysSet = new Set(umbCatalog.map((u) => u.key));

    rawIssues.forEach((iss) => {
      const f = iss.fields || {};
      if (f.assignee && (f.assignee.name || f.assignee.key) && f.assignee.displayName && isRealHumanJiraUser(f.assignee)) {
        const uLogin = f.assignee.name || f.assignee.key;
        if (!assignableUsersList.some((u) => u.name === uLogin)) {
          assignableUsersList.push(assignableUser(f.assignee));
        }
      }
      if (f.reporter && (f.reporter.name || f.reporter.key) && f.reporter.displayName && isRealHumanJiraUser(f.reporter)) {
        const rLogin = f.reporter.name || f.reporter.key;
        if (!assignableUsersList.some((u) => u.name === rLogin)) {
          assignableUsersList.push(assignableUser(f.reporter));
        }
      }
      const parsedOwner = extractCustomerOwnerFromIssueFields(f);
      if (parsedOwner.name && parsedOwner.name !== 'Не указан' && parsedOwner.login && !parsedOwner.name.startsWith('$')) {
        if (!assignableUsersList.some((u) => u.name === parsedOwner.login)) {
          assignableUsersList.push({ name: parsedOwner.login, displayName: parsedOwner.name, email: '' });
        }
      }
      const epObj = f.epic;
      if (epObj && epObj.key) {
        if (!isBogusEpicTitle(epObj.summary, epObj.key)) {
          epicNameByKey[epObj.key] = String(epObj.summary).trim();
        } else if (!isBogusEpicTitle(epObj.name, epObj.key) && !epicNameByKey[epObj.key]) {
          epicNameByKey[epObj.key] = String(epObj.name).trim();
        }
        if (String(epObj.key).startsWith(CONFIG.projectKey + '-') && epicNameByKey[epObj.key]) {
          fcrmEpicNameByKey[epObj.key] = epicNameByKey[epObj.key];
        }
      }
      const rawEpicKey =
        (epObj && epObj.key) ||
        (discoveredFields.epicLink && typeof f[discoveredFields.epicLink] === 'string' ? f[discoveredFields.epicLink] : null) ||
        (f.parent && f.parent.key) ||
        null;
      if (rawEpicKey && typeof rawEpicKey === 'string') {
        allEpicKeysToResolve.add(rawEpicKey.trim());
      }
      if (isEpicIssueType(f.issuetype && f.issuetype.name)) {
        allEpicKeysToResolve.add(iss.key);
        cacheEpicMetadata([iss]);
      }
      if (Array.isArray(f.issuelinks)) {
        f.issuelinks.forEach((lnk) => {
          const target = lnk.outwardIssue || lnk.inwardIssue;
          if (target && target.key) {
            linkedIssueKeys.add(target.key);
          }
        });
      }
    });

    // Обогащение всех связанных задач их реальными Эпиками, Компонентами, Спринтами, Исполнителями, Авторами и Приоритетами из Jira
    const linkedDetailsByKey = {};
    if (linkedIssueKeys.size > 0) {
      const lnkKeysAll = Array.from(linkedIssueKeys);
      const lnkFields = [
        'summary',
        'status',
        'issuetype',
        'priority',
        'components',
        'labels',
        'sprint',
        'closedSprints',
        'epic',
        'parent',
        'assignee',
        'reporter',
        'creator',
        'created'
      ];
      if (discoveredFields.sprint) lnkFields.push(discoveredFields.sprint);
      if (discoveredFields.epicLink) lnkFields.push(discoveredFields.epicLink);
      if (discoveredFields.epicName) lnkFields.push(discoveredFields.epicName);
      if (discoveredFields.storyPoints) lnkFields.push(discoveredFields.storyPoints);

      function parseLinkedIssueFields(lIss) {
        const lf = (lIss && lIss.fields) || {};
        const realComp = resolveRealLinkedIssueComponent(lIss);
        const realSprint = resolveRealLinkedIssueSprint(lIss);
        const labelsArr = Array.isArray(lf.labels) ? lf.labels : [];
        const lEpObj = lf.epic;
        if (lEpObj && lEpObj.key) {
          if (!isBogusEpicTitle(lEpObj.summary, lEpObj.key)) {
            epicNameByKey[lEpObj.key] = String(lEpObj.summary).trim();
          } else if (!isBogusEpicTitle(lEpObj.name, lEpObj.key) && !epicNameByKey[lEpObj.key]) {
            epicNameByKey[lEpObj.key] = String(lEpObj.name).trim();
          }
        }
        const lEpicKey = readJiraEpicKey(lf) || lf.parent?.key || '';
        if (lEpicKey) {
          allEpicKeysToResolve.add(lEpicKey);
        }
        return {
          summary: lf.summary || lIss.key,
          status: readStatusName(lf.status, 'Открыто'),
          issueTypeName: (lf.issuetype && lf.issuetype.name) || 'Задача',
          issueTypeIconUrl: lf.issuetype?.iconUrl || '',
          priority: (lf.priority && lf.priority.name) || 'Medium',
          storyPoints: discoveredFields.storyPoints && lf[discoveredFields.storyPoints] != null ? lf[discoveredFields.storyPoints] : null,
          component: realComp,
          sprint: realSprint,
          epicKey: lEpicKey,
          epicName: (lEpicKey && epicNameByKey[lEpicKey]) || '',
          assignee: jiraPeople.fromJira(lf.assignee),
          author: jiraPeople.fromJira(lf.reporter || lf.creator),
          createdAt: lf.created ? formatDate(lf.created) : '—',
          createdTimestamp: lf.created ? new Date(lf.created).getTime() : 0,
          isUmbEpic: labelsArr.includes('fcrm_umb_epic') || umbKeysSet.has(lIss.key)
        };
      }

      const lnkChunks = [];
      for (let i = 0; i < lnkKeysAll.length; i += 50) {
        lnkChunks.push(lnkKeysAll.slice(i, i + 50));
      }
      for (let b = 0; b < lnkChunks.length; b += 4) {
        const batch = lnkChunks.slice(b, b + 4);
        await Promise.all(
          batch.map(async (chunk) => {
            try {
              const lnkRes = await fetch(
                '/rest/api/2/search?jql=' + encodeURIComponent('key in (' + chunk.join(',') + ')') + '&fields=' + lnkFields.join(',') + '&maxResults=100',
                { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } }
              );
              if (lnkRes.ok) {
                const lnkData = await lnkRes.json();
                if (Array.isArray(lnkData.issues)) {
                  lnkData.issues.forEach((lIss) => {
                    linkedDetailsByKey[lIss.key] = parseLinkedIssueFields(lIss);
                  });
                }
              }
            } catch (e) {}
          })
        );
      }

      if (rawIssues.length === 1) {
        const missingKeys = lnkKeysAll.filter((k) => !linkedDetailsByKey[k]);
        await Promise.all(
          missingKeys.slice(0, 15).map(async (mKey) => {
            try {
              const r = await fetch(
                '/rest/api/2/issue/' + encodeURIComponent(mKey) + '?fields=' + lnkFields.join(','),
                { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } }
              );
              if (r.ok) {
                const lIss = await r.json();
                linkedDetailsByKey[mKey] = parseLinkedIssueFields(lIss);
              }
            } catch (e) {}
          })
        );

        const adjProjects = new Set();
        lnkKeysAll.forEach((k) => {
          const p = String(k).split('-')[0];
          if (p && p.toUpperCase() !== String(CONFIG.projectKey).toUpperCase()) {
            adjProjects.add(p.toUpperCase());
          }
        });
        await Promise.all(Array.from(adjProjects).slice(0, 8).map((pk) => ensureProjectComponentsLoaded(pk)));
      }
    }

    // Подтягиваем названия всех эпиков (как основных задач FCRM, так и эпиков связанных задач!)
    if (allEpicKeysToResolve.size > 0) {
      const epKeysAll = Array.from(allEpicKeysToResolve);
      const epChunks = [];
      for (let i = 0; i < epKeysAll.length; i += 50) {
        epChunks.push(epKeysAll.slice(i, i + 50));
      }
      for (let b = 0; b < epChunks.length; b += 4) {
        const batch = epChunks.slice(b, b + 4);
        await Promise.all(
          batch.map(async (chunk) => {
            try {
              const epFields = ['summary', 'status', 'customfield_20100', 'labels'];
              if (discoveredFields.epicName) epFields.push(discoveredFields.epicName);
              const epRes = await fetch(
                '/rest/api/2/search?jql=' + encodeURIComponent('key in (' + chunk.join(',') + ')') + '&fields=' + epFields.join(',') + '&maxResults=100',
                { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } }
              );
              if (epRes.ok) {
                const epData = await epRes.json();
                if (Array.isArray(epData.issues)) {
                  cacheEpicMetadata(epData.issues);
                  epData.issues.forEach((epIss) => {
                    const ef = epIss.fields || {};
                    const summaryTitle = ef.summary ? String(ef.summary).trim() : '';
                    const customEpicName = discoveredFields.epicName && ef[discoveredFields.epicName] ? String(ef[discoveredFields.epicName]).trim() : '';
                    const finalTitle = !isBogusEpicTitle(summaryTitle, epIss.key)
                      ? summaryTitle
                      : !isBogusEpicTitle(customEpicName, epIss.key)
                      ? customEpicName
                      : '';
                    if (finalTitle) {
                      epicNameByKey[epIss.key] = finalTitle;
                      if (String(epIss.key).startsWith(CONFIG.projectKey + '-')) {
                        fcrmEpicNameByKey[epIss.key] = finalTitle;
                      }
                    }
                  });
                }
              }
            } catch (e) {}
          })
        );
      }
    }

    await loadTableObprojectMetadata(allEpicKeysToResolve);
    return rawIssues.map((iss) => {
      const f = iss.fields || {};
      const taskSprint = resolveIssueSprint(iss);
      if (taskSprint && taskSprint !== 'Бэклог FCRM') {
        boardOwnedSprintNames.add(taskSprint);
      }

      const epObj = f.epic;
      const epicKey = readJiraEpicKey(f) || '';

      let resolvedEpicTitle = epicKey && epicNameByKey[epicKey] ? epicNameByKey[epicKey] : '';
      if (!resolvedEpicTitle && epicKey && epObj?.key === epicKey) {
        if (!isBogusEpicTitle(epObj.summary, epicKey)) resolvedEpicTitle = String(epObj.summary).trim();
        else if (!isBogusEpicTitle(epObj.name, epicKey)) resolvedEpicTitle = String(epObj.name).trim();
      }
      if (epicKey && resolvedEpicTitle && String(epicKey).startsWith(CONFIG.projectKey + '-')) {
        fcrmEpicNameByKey[epicKey] = resolvedEpicTitle;
      }
      let epicName = resolvedEpicTitle || 'Без эпика';

      const compName =
        Array.isArray(f.components) && f.components.length
          ? f.components.map((c) => c && c.name).filter(Boolean).join(', ')
          : 'Без компонента';

      const parsedOwner = extractCustomerOwnerFromIssueFields(f);
      const custName = parsedOwner.name || 'Не указан';

      const rawLinks = Array.isArray(f.issuelinks) ? f.issuelinks : [];
      const ptLinks = [];
      const ipLinks = [];
      const otherLinks = [];

      rawLinks.forEach((lnk, idx) => {
        const isInward = Boolean(lnk.inwardIssue);
        const target = lnk.inwardIssue || lnk.outwardIssue;
        if (!target || !target.key) return;

        const enriched = linkedDetailsByKey[target.key];
        const activeDirDesc = String(
          (isInward ? (lnk.type && lnk.type.inward) : (lnk.type && lnk.type.outward)) || ''
        )
          .trim()
          .toLowerCase();

        const realLinkComp = enriched ? enriched.component : resolveRealLinkedIssueComponent(target);
        const realLinkSprint = enriched ? enriched.sprint : resolveRealLinkedIssueSprint(target);
        const lEpKey = (enriched && enriched.epicKey) || '';
        const lEpName = (lEpKey && epicNameByKey[lEpKey]) || (enriched && enriched.epicName) || '';

        const itemStatus = (enriched && enriched.status) || readStatusName(target.fields && target.fields.status, 'Открыто');
        const item = {
          id: lnk.id ? String(lnk.id) : 'lnk-' + iss.key + '-' + idx,
          jiraLinkId: lnk.id ? String(lnk.id) : null,
          key: target.key,
          summary: (enriched && enriched.summary) || (target.fields && target.fields.summary) || target.key,
          status: itemStatus,
          issueTypeName: (enriched && enriched.issueTypeName) || (target.fields && target.fields.issuetype && target.fields.issuetype.name) || 'Задача',
          issueTypeIconUrl: enriched?.issueTypeIconUrl || target.fields?.issuetype?.iconUrl || '',
          priority: (enriched && enriched.priority) || 'Medium',
          storyPoints: enriched?.storyPoints ?? null,
          component: realLinkComp,
          sprint: realLinkSprint,
          epicKey: lEpKey,
          epicName: lEpName,
          assignee: enriched?.assignee || jiraPeople.fromJira(target.fields?.assignee),
          author: enriched?.author || jiraPeople.fromJira(target.fields?.reporter || target.fields?.creator),
          createdAt: (enriched && enriched.createdAt) || '—',
          linkType: String((lnk.type && lnk.type.name) || ''),
          linkDirection: activeDirDesc
        };

        if (/задача проекта|project task/i.test(activeDirDesc)) {
          if (!isCanceledStatus(itemStatus)) ptLinks.push(item);
        } else if (/в проекте|in project/i.test(activeDirDesc)) {
          if (!isCanceledStatus(itemStatus)) ipLinks.push(item);
        } else {
          otherLinks.push(item);
        }
      });

      const rawDesc = typeof f.description === 'string' ? f.description : '';
      const issueTypeName = (f.issuetype && f.issuetype.name) || 'Задача';
      const issueTypeId = (f.issuetype && f.issuetype.id) || '';
      if (issueTypeName && issueTypeId) {
        issueTypeIdByName[issueTypeName] = String(issueTypeId);
      }

      return {
        key: iss.key,
        jiraId: iss.id || '',
        summary: f.summary || iss.key,
        description: rawDesc,
        labels: Array.isArray(f.labels) ? f.labels : [],
        issueTypeName: issueTypeName,
        issueTypeId: issueTypeId,
        issueTypeIconUrl: f.issuetype?.iconUrl || '',
        epicKey: epicKey,
        epicName: epicName,
        component: compName,
        components: Array.isArray(f.components) ? f.components.map((c) => c && c.name).filter(Boolean) : [],
        assignee: {...jiraPeople.fromJira(f.assignee,'Не назначен'),role:f.assignee?.emailAddress || 'Ozon Банк'},
        author: jiraPeople.fromJira(f.reporter || f.creator,'Неизвестен'),
        customer: {
          name: custName,
          login: parsedOwner.login || '',
          department: 'FCRM'
        },
        createdAt: formatDate(f.created),
        createdTimestamp: f.created ? new Date(f.created).getTime() : 0,
        sprint: taskSprint,
        status: readStatusName(f.status, 'Открыто'),
        priority: (f.priority && f.priority.name) || 'Medium',
        projectTaskLinks: ptLinks,
        inProjectLinks: ipLinks,
        otherLinks: otherLinks
      };
    }).filter((t) => includeCanceled || !isCanceledStatus(t.status));
  }

  /**
   * Универсальная пагинация (дозапросы по startAt) для Agile endpoints (/sprint/{id}/issue, /backlog, /board/{id}/issue)
   */
  async function fetchPaginatedIssues(url, limit, onProgress) {
    const issues = [];
    const separator = url.includes('?') ? '&' : '?';
    async function page(offset, size) {
      const response = await fetch(url + separator + 'startAt=' + offset + '&maxResults=' + size, {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Jira HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.issues)) throw new Error('Некорректная страница задач');
      return data;
    }
    try {
      const first = await page(0, Math.min(100, limit));
      const total = Math.min(first.total ?? first.issues.length, limit);
      const step = first.issues.length;
      issues.push(...first.issues.slice(0, total));
      onProgress?.(issues.length, total);
      if (!step && total) return { ok: false, issues, total };
      for (let start = step; start < total; start += 3 * step) {
        const pages = [];
        for (let offset = start; offset < total && pages.length < 3; offset += step) {
          pages.push(page(offset, Math.min(step, total - offset)));
        }
        for (const data of await Promise.all(pages)) issues.push(...data.issues.slice(0, total - issues.length));
        onProgress?.(issues.length, total);
      }
      return { ok: issues.length === total, issues, total };
    } catch {
      return { ok: false, issues, total: issues.length };
    }
  }

  function fetchPaginatedAgileIssues(url, maxTotal, onProgress) {
    return fetchPaginatedIssues(url, maxTotal || 2500, onProgress);
  }

  function fetchPaginatedJqlIssues(jql, fields, maxTotal, onProgress) {
    const url = '/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=' + fields;
    return fetchPaginatedIssues(url, maxTotal || 3000, onProgress);
  }

  /**
   * Последовательная (поблочная) загрузка деталей задачи в правом сайдбаре:
   * 1. Базовые поля и описание задачи (мгновенное обновление блока «Описание задачи» и шапки)
   * 2. Доступные переходы статуса и справочники проекта (обновление блока «Параметры задачи»)
   * 3. Обогащение связанных задач «Задача проекта» и «В проекте» (обновление аккордеонов связей)
   * 4. Компоненты и спринты смежных проектов (OB / OBFRONT / FTD) для выпадающих списков связей
   */
  let sidebarLoadGeneration = 0;
  async function reloadSingleTaskFromJira(taskKey, forceFromJira, showFullSkeleton) {
    const requestRevision = taskEditRevision;
    if (!taskKey) return;
    const generation = ++sidebarLoadGeneration;
    const isCurrentLoad = () => generation === sidebarLoadGeneration && sidebarBlockLoading.taskKey === taskKey;
    const hasExistingTask = tasks.some((t) => t.key === taskKey);
    loadingSidebarTaskKey = showFullSkeleton || !hasExistingTask ? taskKey : null;
    sidebarBlockLoading = {
      taskKey: taskKey,
      desc: true,
      params: true,
      links: true,
      ipMeta: true
    };
    assigneeSearchQuery = '';
    customerSearchQuery = '';
    const taskRequest = discoverJiraIssueFields().then(() => fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '?fields=' + getBoardFieldsParam(), {
      credentials:'same-origin', cache:'no-store',
      headers:{Accept:'application/json', ...(forceFromJira ? {'Cache-Control':'no-cache'} : {})}
    }));
    const transitionsRequest = fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '/transitions', {credentials:'same-origin',headers:{Accept:'application/json'}}).catch(() => null);
    const remoteLinksRequest = loadRemoteIssueLinks(taskKey).catch(() => []);
    const componentsRequest = ensureProjectComponentsLoaded(getIssueProjectKey(taskKey)).catch(() => {});
    renderStructure();
    let refreshErrorText = '';

    try {
      // The detail refresh explicitly requests OBPROJECT from Jira.
      // ЭТАП 1: Загружаем саму задачу (описание + основные поля) и сразу рендерим блок «Описание задачи»
      let rawIssue = null;
      try {
        const issRes = await taskRequest;
        if (issRes.ok) {
          rawIssue = await issRes.json();
          if (rawIssue && rawIssue.key) {
            if (!isCurrentLoad()) return;
            void syncStrategyLinks(rawIssue);
            syncStrategyIssue(rawIssue);
            if (forceFromJira) {
              clearTaskOverride(taskKey, requestRevision);
            }
            const f = rawIssue.fields || {};
            const parsedOwner = extractCustomerOwnerFromIssueFields(f);
            const compName =
              Array.isArray(f.components) && f.components.length
                ? f.components.map((c) => c && c.name).filter(Boolean).join(', ')
                : 'Без компонента';
            const quickSprint = resolveIssueSprint(rawIssue);
            const jiraEpicKey = readJiraEpicKey(f);

            const refreshedTaskList = tasks.map((t) => {
                if (t.key !== taskKey) return t;
                const epicKey = jiraEpicKey ?? t.epicKey ?? '';
                const epicName = epicKey ? epicNameByKey[epicKey] || (t.epicKey === epicKey ? t.epicName : '') || epicKey : '';
                return Object.assign({}, t, {
                  jiraId: rawIssue.id || t.jiraId,
                  summary: Object.prototype.hasOwnProperty.call(f, 'summary') ? String(f.summary || '') : t.summary,
                  description: Object.prototype.hasOwnProperty.call(f, 'description') ? (typeof f.description === 'string' ? f.description : '') : t.description || '',
                  createdAt: Object.hasOwn(f, 'created') ? formatDate(f.created) : t.createdAt,
                  createdTimestamp: Object.hasOwn(f, 'created') ? (f.created ? new Date(f.created).getTime() : 0) : t.createdTimestamp,
                  status: readStatusName(f.status, t.status),
                  issueTypeName: (f.issuetype && f.issuetype.name) || t.issueTypeName || 'Задача',
                  issueTypeId: (f.issuetype && f.issuetype.id) || t.issueTypeId || '',
                  issueTypeIconUrl: f.issuetype ? f.issuetype.iconUrl || '' : t.issueTypeIconUrl,
                  priority: (f.priority && f.priority.name) || t.priority,
                  labels: Array.isArray(f.labels) ? f.labels : [],
                  component: compName,
                  components: Array.isArray(f.components) ? f.components.map((c) => c && c.name).filter(Boolean) : [],
                  sprint: quickSprint || (forceFromJira ? 'Бэклог FCRM' : t.sprint),
                  epicKey,
                  epicName,
                  assignee: Object.hasOwn(f,'assignee') ? jiraPeople.fromJira(f.assignee,'Не назначен') : t.assignee,
                  author: Object.hasOwn(f,'reporter') || Object.hasOwn(f,'creator') ? jiraPeople.fromJira(f.reporter || f.creator,'Неизвестен') : t.author,
                  customer:
                    parsedOwner && parsedOwner.name && parsedOwner.name !== 'Не указан'
                      ? parsedOwner
                      : { name: 'Не указан', login: '', department: 'FCRM' }
                });
              });
            tasks = applyLocalOverridesToTasks(refreshedTaskList, requestRevision, taskKey);
          }
        } else {
          refreshErrorText = 'Не удалось обновить ' + taskKey + ' из Jira (HTTP ' + issRes.status + ')';
        }
      } catch (e) {
        refreshErrorText = 'Не удалось обновить ' + taskKey + ' из Jira';
      }

      if (!isCurrentLoad()) return;
      loadingSidebarTaskKey = null;
      sidebarBlockLoading.desc = false;
      renderStructure();

      // Связи и сведения об эпике не зависят от загрузки переходов статуса.
      const enrichedRequest = rawIssue?.key ? normalizeAndEnrichJiraIssues([rawIssue], true).catch(() => []) : Promise.resolve([]);
      const epicDetailsRequest = rawIssue?.key ? refreshTaskEpicDetails(taskKey, rawIssue).catch(() => {}) : Promise.resolve();

      // ЭТАП 2: Загружаем переходы воркфлоу (transitions) и компоненты проекта для блока «Параметры задачи»
      const paramsRequest = (async () => { try {
        const [trRes] = await Promise.all([
          transitionsRequest,
          componentsRequest
        ]);
        if (trRes && trRes.ok) {
          const trData = await trRes.json();
          if (Array.isArray(trData.transitions)) {
            issueTransitionsByKey[taskKey] = trData.transitions;
          }
        }
      } catch (e) {}
      if (isCurrentLoad()) { sidebarBlockLoading.params = false; renderStructure(); }
      })();

      // ЭТАП 3: Полное обогащение связей «Задача проекта» и «В проекте» (статусы, приоритеты, эпики, спринты связей)
      let enrichedTask = null;
      if (rawIssue && rawIssue.key) {
        try {
          const enrichedArr = applyLocalOverridesToTasks(await enrichedRequest, requestRevision, taskKey);
          if (!isCurrentLoad()) return;
          if (enrichedArr[0]) {
            enrichedTask = enrichedArr[0];
            const hasTask = tasks.some((t) => t.key === taskKey);
            tasks = hasTask ? tasks.map((t) => (t.key === taskKey ? Object.assign({}, t, {projectTaskLinks:enrichedTask.projectTaskLinks,inProjectLinks:enrichedTask.inProjectLinks,otherLinks:enrichedTask.otherLinks}) : t)) : [...tasks, enrichedTask];
          }
        } catch (e) {}
      }

      if (enrichedTask) {
        const [, remoteLinks] = await Promise.all([epicDetailsRequest, remoteLinksRequest]);
        if (!isCurrentLoad()) return;
        tasks = tasks.map((t) => t.key === taskKey ? Object.assign({}, t, {otherLinks:[...(enrichedTask.otherLinks || []), ...remoteLinks]}) : t);
      }

      if (!isCurrentLoad()) return;
      sidebarBlockLoading.links = false;
      renderStructure();

      // ЭТАП 4: Последовательная догрузка справочников компонентов и спринтов для связанных задач «В проекте»
      const ipLinks = (enrichedTask && enrichedTask.inProjectLinks) || [];
      await Promise.all(ipLinks.filter((link) => /^OBFRONT-/i.test(String(link.key || ''))).map((link) => loadFrontDesignRelation(link.key)));
      await paramsRequest;
    } catch (e) {
      if (forceFromJira && !refreshErrorText) refreshErrorText = 'Не удалось полностью обновить ' + taskKey + ' из Jira';
    }

    if (!isCurrentLoad()) return;
    if (sidebarBlockLoading.taskKey === taskKey) {
      sidebarBlockLoading = { taskKey: null, desc: false, params: false, links: false, ipMeta: false };
    }
    if (loadingSidebarTaskKey === taskKey) {
      loadingSidebarTaskKey = null;
    }
    if (forceFromJira) showSaveToast(refreshErrorText || ('✓ Данные ' + taskKey + ' обновлены из Jira'));
    renderStructure();
  }

  let productFiltersPromise = null;
  let productFiltersReady = false;
  async function prepareProductFilters() {
    if (productFiltersReady || productFiltersPromise) return;
    productFiltersPromise = Promise.allSettled([
      fetchProjectComponents(String(CONFIG.projectKey).toUpperCase()),
      fetch('/rest/api/2/project/' + encodeURIComponent(CONFIG.projectKey) + '/statuses', {credentials:'same-origin',headers:{Accept:'application/json'}}).then(response => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
    ]).then(results => {
      if (results[0].status === 'fulfilled') projectComponentsList = results[0].value.map(item => item.name).filter(Boolean);
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
        const types = results[1].value;
        projectIssueTypesList = types.filter(item => item?.name).map(item => ({id:String(item.id || ''),name:item.name,subtask:Boolean(item.subtask),iconUrl:item.iconUrl}));
        projectStatusesList = Array.from(new Set(types.flatMap(item => (item.statuses || []).map(status => readStatusName(status,'')).filter(Boolean))));
      }
      productFiltersReady = results.every(result => result.status === 'fulfilled');
      if (!productFiltersReady && !productDashboardLoaded) statusMessage = 'Не удалось загрузить часть фильтров. Повторите открытие страницы.';
      if (activeDashboardView === 'product') renderStructure();
    }).finally(() => { productFiltersPromise = null; });
    return productFiltersPromise;
  }

  async function loadBoardIssuesFromJira() {
    const requestRevision = taskEditRevision;
    if (isInitialBoardLoading) return;
    isInitialBoardLoading = true;
    const requestedSprintMode = filterSprintState;
    const sprintJqlClauses = { ACTIVE:'sprint in openSprints()', FUTURE:'sprint in futureSprints()', BACKLOG:'sprint is EMPTY', CLOSED:'sprint in closedSprints()', open_future:'(sprint in openSprints() OR sprint in futureSprints())', open_future_backlog:'(sprint in openSprints() OR sprint in futureSprints() OR sprint is EMPTY)', all:'' };
    const sprintJql = sprintJqlClauses[requestedSprintMode] ?? sprintJqlClauses.open_future_backlog;
    const issueJql = 'project = ' + CONFIG.projectKey + (sprintJql ? ' AND ' + sprintJql : '') + ' ORDER BY updated DESC';
    initialLoadProgress = 4;
    initialLoadStage = 'Подключаемся к Jira…';
    renderStructure();

    try {
      await discoverJiraFieldsAndComponents();
      initialLoadProgress = 15;
      initialLoadStage = 'Загружаю список спринтов…';
      renderStructure();
      await Promise.all([loadBoardSprintsAndEpics(), loadUmbEpicTasksFromJira()]);
      initialLoadProgress = 32;
      initialLoadStage = 'Получаю задачи выбранных спринтов…';
      renderStructure();

      const fieldsParam = getBoardFieldsParam();
      let rawIssues = [];
      const issuePositions = new Map();

      const addUniqueIssues = (arr, preferNew) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((iss) => {
          if (!iss || !iss.key || !String(iss.key).startsWith(CONFIG.projectKey + '-')) return;
          if (!issuePositions.has(iss.key)) {
            issuePositions.set(iss.key, rawIssues.length);
            rawIssues.push(iss);
          } else if (preferNew) {
            rawIssues[issuePositions.get(iss.key)] = iss;
          }
        });
      };

      // 1. Запрашиваем задачи для родных активных и будущих спринтов доски 9349 с дозапросами (пагинацией)
      const allowedSprintStates = {ACTIVE:['ACTIVE'],FUTURE:['FUTURE'],BACKLOG:[],CLOSED:['CLOSED'],open_future:['ACTIVE','FUTURE'],open_future_backlog:['ACTIVE','FUTURE'],all:['ACTIVE','FUTURE','CLOSED']};
      const allowedStates = allowedSprintStates[requestedSprintMode] || allowedSprintStates.open_future_backlog;
      const activeAndFutureSprintIds = Array.from(boardOwnedSprintIds).filter((id) => allowedStates.includes(sprintStateByName[sprintNameById[id]]));
      await Promise.all(
        activeAndFutureSprintIds.slice(0, 20).map(async (spId) => {
          const spRes = await fetchPaginatedAgileIssues(
            '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint/' + spId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey) + '&fields=' + fieldsParam,
            1000,
            (loaded, total) => {
              if (total > 0) {
                initialLoadProgress = Math.max(initialLoadProgress, 32 + Math.round((loaded / total) * 20));
                initialLoadStage = 'Получаю задачи спринтов: ' + loaded + ' из ' + total;
                renderStructure();
              }
            }
          );
          if (spRes.ok) {
            addUniqueIssues(spRes.issues, false);
          }
        })
      );

      initialLoadProgress = Math.max(initialLoadProgress, 54);
      initialLoadStage = 'Загружаю задачи FCRM…';
      renderStructure();

      // При первом открытии запрашиваем только актуальные спринты и бэклог;
      // прошедшие спринты загружаются при выборе соответствующего фильтра.
      const jqlAllRes = await fetchPaginatedJqlIssues(
        issueJql,
        fieldsParam,
        3000,
        (loaded, totalCount) => {
          initialLoadProgress = totalCount ? Math.min(90, Math.max(initialLoadProgress, 54 + Math.round((loaded / totalCount) * 36))) : Math.max(initialLoadProgress, 60);
          initialLoadStage = 'Загружаю задачи FCRM: ' + loaded + ' из ' + (totalCount || loaded);
          statusMessage = initialLoadStage;
          renderStructure();
        }
      );

      if (jqlAllRes.ok) {
        addUniqueIssues(jqlAllRes.issues, true);
      } else {
        // Резервный вариант через Agile Board API с пагинацией
        let boardPaginated = await fetchPaginatedAgileIssues(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/issue?jql=' + encodeURIComponent(issueJql) + '&fields=' + fieldsParam,
          2500,
          (loaded, total) => {
            initialLoadProgress = total ? Math.min(90, Math.max(initialLoadProgress, 54 + Math.round((loaded / total) * 36))) : initialLoadProgress;
            initialLoadStage = 'Загружаю задачи FCRM: ' + loaded + ' из ' + (total || loaded);
            renderStructure();
          }
        );
        if ((!boardPaginated.ok || boardPaginated.issues.length === 0) && (requestedSprintMode === 'BACKLOG' || requestedSprintMode === 'open_future_backlog' || requestedSprintMode === 'all')) {
          boardPaginated = await fetchPaginatedAgileIssues(
            '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/backlog?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&fields=' + fieldsParam,
            2500,
            (loaded, total) => {
              initialLoadProgress = total ? Math.min(90, Math.max(initialLoadProgress, 54 + Math.round((loaded / total) * 36))) : initialLoadProgress;
              initialLoadStage = 'Загружаю задачи FCRM: ' + loaded + ' из ' + (total || loaded);
              renderStructure();
            }
          );
        }
        if (boardPaginated.ok) {
          addUniqueIssues(boardPaginated.issues, true);
        }
      }

      if (requestedSprintMode === 'BACKLOG' || requestedSprintMode === 'open_future_backlog') {
        const backlogRes = await fetchPaginatedAgileIssues('/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/backlog?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey) + '&fields=' + fieldsParam, 2500);
        if (backlogRes.ok) addUniqueIssues(backlogRes.issues, false);
      }
      allSprintIssuesLoaded = requestedSprintMode === 'all';
      loadedSprintMode = requestedSprintMode;
      if (rawIssues.length === 0) {
        initialLoadProgress = 100;
        initialLoadStage = 'Загрузка завершена';
        isInitialBoardLoading = false;
        tasks = []; productDashboardLoaded = true;
        statusMessage = 'По выбранным условиям задачи не найдены';
        renderStructure();
        return;
      }

      initialLoadProgress = 94;
      initialLoadStage = 'Обрабатываю данные задач…';
      renderStructure();
      tasks = applyLocalOverridesToTasks(await normalizeAndEnrichJiraIssues(rawIssues), requestRevision);
      productDashboardLoaded = true;
      initialLoadProgress = 100;
      initialLoadStage = 'Загрузка завершена';
      isInitialBoardLoading = false;
      statusMessage = 'Спринт → Компонент (' + tasks.length + ' задач FCRM)';
      renderStructure();
    } catch (e) {
      initialLoadProgress = 100;
      initialLoadStage = 'Не удалось загрузить задачи FCRM';
      isInitialBoardLoading = false;
      statusMessage = 'Не удалось загрузить задачи FCRM. Повторите попытку.';
      renderStructure();
    }
  }

  function getSortedSprintNames(groupsObj) {
    const getTier = (spName) => {
      if (!spName) return 5;
      if (spName.includes('Бэклог') || spName.toLowerCase().includes('backlog')) return 4;
      const st = getSprintStateCode(spName);
      if (st === 'ACTIVE') return 1;
      if (st === 'FUTURE') return 2;
      if (st === 'CLOSED') return 3;
      return 2;
    };

    return Object.keys(groupsObj).sort((a, b) => {
      const ta = getTier(a);
      const tb = getTier(b);
      if (ta !== tb) return ta - tb;

      // Для прошедших (закрытых) спринтов сортируем от самых свежих к более старым по ID спринта или дате/номеру
      if (ta === 3) {
        const idA = Number(sprintIdByName[a]) || 0;
        const idB = Number(sprintIdByName[b]) || 0;
        if (idA !== idB && idA > 0 && idB > 0) return idB - idA;
        return b.localeCompare(a, 'ru', { numeric: true });
      }

      const wa = sprintOrderWeight[a] || 500;
      const wb = sprintOrderWeight[b] || 500;
      if (wa !== wb) return wa - wb;
      return a.localeCompare(b, 'ru', { numeric: true });
    });
  }

  function getAllComponentOptions() {
    if (projectComponentsList.length > 0) {
      return Array.from(new Set([...projectComponentsList, 'Без компонента']));
    }
    if (!productDashboardLoaded) return ['Без компонента'];
    const fcrmOnly = (productDashboardLoaded ? tasks : [])
      .filter((t) => t.key && t.key.startsWith(CONFIG.projectKey + '-'))
      .flatMap((t) => Array.isArray(t.components) && t.components.length ? t.components : [t.component])
      .filter(Boolean);
    return Array.from(
      new Set([
        ...fcrmOnly,
        'CRM: СЭД (Развитие)',
        'CRM: Поддержка (Развитие)',
        'CRM: Поддержка (Продукт)',
        'Роли и доступы',
        'Без компонента'
      ])
    );
  }

  /**
   * Возвращает список спринтов нашей доски FCRM (#9349), ВКЛЮЧАЯ Активные, Будущие И Прошедшие (Закрытые) спринты (для отображения групп на доске).
   */
  function getAllSprintOptions() {
    const ownedSprints = Array.from(boardOwnedSprintNames).filter(Boolean);
    const closedOwned = Array.from(closedSprintNames).filter((name) => name && isNativeFcrmBoardSprintName(name, null));
    const fcrmTaskSprints = tasks
      .filter((t) => t.key && t.key.startsWith(CONFIG.projectKey + '-'))
      .map((t) => t.sprint)
      .filter(Boolean);

    const set = new Set([...ownedSprints, ...closedOwned, ...fcrmTaskSprints, 'Бэклог FCRM']);
    const rawList = Array.from(set).filter((s) => s && s !== '9223372036854775807' && !/^\\d+$/.test(s));
    const dummyGroups = {};
    rawList.forEach((s) => {
      dummyGroups[s] = true;
    });
    return getSortedSprintNames(dummyGroups);
  }

  /**
   * Проверяет, доступен ли спринт для выбора при изменении спринта задачи (ТОЛЬКО Активные, Будущие и Бэклог / Не в спринте).
   */
  function isEditableSprintOption(sprintName) {
    if (!sprintName) return false;
    const clean = String(sprintName).trim();
    if (!clean) return false;
    const code = getSprintStateCode(clean);
    return code === 'ACTIVE' || code === 'FUTURE' || code === 'BACKLOG';
  }

  /**
   * Возвращает ТОЛЬКО Активные и Будущие спринты (+ Бэклог FCRM) для всех селекторов смены спринта.
   */
  function getEditableSprintOptions() {
    return getAllSprintOptions().filter((sp) => isEditableSprintOption(sp));
  }

  function buildSprintSelectOptionsHtml(editableList, currentSprintVal, optionPrefix) {
    const pref = optionPrefix || '';
    const cur = (currentSprintVal && String(currentSprintVal).trim()) || '';
    const filtered = (Array.isArray(editableList) ? editableList : []).filter((sp) => isEditableSprintOption(sp));
    let html = '';
    if (cur && !filtered.includes(cur)) {
      html += \`<option value="\${escapeHtml(cur)}" selected disabled hidden>\${escapeHtml(pref + formatSprintWithStateText(cur))}</option>\`;
    }
    html += filtered
      .map((sp) => \`<option value="\${escapeHtml(sp)}" \${sp === cur ? 'selected' : ''}>\${escapeHtml(pref + formatSprintWithStateText(sp))}</option>\`)
      .join('');
    return html;
  }

  function getStatusOptionsForTask(task) {
    // 1. Если для конкретной задачи уже загружены доступные переходы (transitions) её схемы воркфлоу — показываем ТОЛЬКО текущий статус + переходы из схемы
    const transitions = issueTransitionsByKey[task.key] || [];
    if (transitions.length > 0) {
      const fromTaskTransitions = transitions
        .map((tr) => (tr.to && tr.to.name) || tr.name)
        .filter(Boolean);
      return Array.from(new Set([task.status, ...fromTaskTransitions])).filter(Boolean);
    }

    // 2. Иначе проверяем схему статусов конкретного типа задачи (issuetype) из /rest/api/2/project/FCRM/statuses
    const schemeForType =
      (task.issueTypeName && statusesByIssueTypeMap[task.issueTypeName]) ||
      (task.issueTypeId && statusesByIssueTypeMap[task.issueTypeId]) ||
      null;
    if (Array.isArray(schemeForType) && schemeForType.length > 0) {
      return Array.from(new Set([task.status, ...schemeForType])).filter(Boolean);
    }

    // 3. Базовый фоллбэк схемы FCRM (без отменённых Canceled и без чужих технических статусов)
    const fallbackScheme = ['Backlog', 'Ready for Planning', 'OnAnalysis', 'Waiting', 'OnDev', 'product/design review', 'User Testing', 'Готово'];
    return Array.from(new Set([task.status, ...fallbackScheme])).filter((st) => st && !isCanceledStatus(st));
  }

  function getProjectIssueTypeOptions(task) {
    const fromProjectApi = projectIssueTypesList.map((it) => it && it.name).filter(Boolean);
    const fromBoardTasks = tasks
      .filter((t) => t.key && t.key.startsWith(CONFIG.projectKey + '-'))
      .map((t) => t.issueTypeName)
      .filter(Boolean);
    const set = new Set([
      (task && task.issueTypeName) || 'Задача',
      ...fromProjectApi,
      ...fromBoardTasks,
      'Задача',
      'История',
      'Эпик',
      'Ошибка',
      'Аналитика'
    ]);
    return Array.from(set).filter(Boolean);
  }

  function getPriorityOptionsForTask(task) {
    const fromBoard = tasks.map((t) => t.priority).filter(Boolean);
    const set = new Set([
      task.priority,
      ...projectPrioritiesList,
      ...fromBoard,
      'Blocker',
      'Critical',
      'Major',
      'High',
      'Medium',
      'Minor',
      'Low',
      'Стандартный',
      'Критический',
      'Высокий',
      'Средний',
      'Низкий'
    ]);
    return Array.from(set).filter(Boolean);
  }

  function getAllAssigneeOptions() {
    const fromApi = assignableUsersList.map((u) => u.displayName);
    const fromTasks = tasks.map((t) => t.assignee && t.assignee.name).filter(Boolean);
    const fromAuthors = tasks.map((t) => t.author && t.author.name).filter(Boolean);
    return Array.from(new Set(['Не назначен', ...fromTasks, ...fromAuthors, ...fromApi]));
  }

  /**
   * Возвращает справочник эпиков СТРОГО проекта FCRM для выпадающих списков (Input-Select).
   */
  function getAllEpicOptions() {
    const map = {};
    Object.keys(epicNameByKey).forEach((k) => {
      if (k && k.startsWith(CONFIG.projectKey + '-') && !isBogusEpicTitle(epicNameByKey[k], k)) {
        map[k] = epicNameByKey[k];
      }
    });
    (productDashboardLoaded ? tasks : []).forEach((t) => {
      if (t.epicKey && t.epicKey.startsWith(CONFIG.projectKey + '-') && !isBogusEpicTitle(t.epicName, t.epicKey)) {
        map[t.epicKey] = t.epicName;
      }
    });
    return map;
  }

  function getComponentsForProject(projectKey) {
    const pk = (projectKey || CONFIG.projectKey).toUpperCase();
    const cached = componentsByProjectMap[pk];
    if (Array.isArray(cached) && cached.length > 0) {
      return Array.from(new Set([...cached, 'Без компонента']));
    }
    if (pk === CONFIG.projectKey) {
      return getAllComponentOptions();
    }
    // Собираем известные компоненты из связанных задач данного проекта, пока грузится API
    const fromLinks = [];
    tasks.forEach((t) => {
      [...(t.projectTaskLinks || []), ...(t.inProjectLinks || [])].forEach((l) => {
        if (l.key && l.key.startsWith(pk + '-') && l.component && l.component !== 'Без компонента') {
          fromLinks.push(l.component);
        }
      });
    });
    return Array.from(new Set([...fromLinks, 'Без компонента']));
  }

  const favoriteComponentNames = ['CS', 'CRM_BO', 'CRM_CORE', 'crm support'];
  function prioritizeFavoriteComponents(names) {
    return names.slice().sort((a, b) => {
      const ai = favoriteComponentNames.findIndex(name => name.toLowerCase() === a.toLowerCase());
      const bi = favoriteComponentNames.findIndex(name => name.toLowerCase() === b.toLowerCase());
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
    });
  }

  function buildSkeletonTableRowsHtml(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += \`
        <tr class="ozon-ext-task-row" style="pointer-events:none;">
          \${columnOrder
            .map(
              (colId) =>
                \`<td><div class="ozon-ext-cell-singleline"><span class="ozon-ext-skeleton" style="width:\${colId === 'task' ? '210px' : '110px'};height:13px;"></span></div></td>\`
            )
            .join('')}
        </tr>
      \`;
    }
    return html;
  }

  function renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys, groupPath) {
    const treeDepth = groupPath.length;
    const ptList = (task.projectTaskLinks || []).filter((l) => !isCanceledStatus(l.status));
    const ipList = (task.inProjectLinks || []).filter((l) => !isCanceledStatus(l.status));
    const totalLinks = ptList.length + ipList.length;
    const isSubExpanded = Boolean(expandedSubRows[task.key]);
    const hasNoAssignee = isTaskMissingAssignee(task);

    const taskTransitions = issueTransitionsByKey[task.key] || [];
    const statusList = getStatusOptionsForTask(task);
    const statusCat = getStatusCategoryClass(task.status);

    const sprintOptions = buildSprintSelectOptionsHtml(allSprints, task.sprint, '');

    const cleanEpicTitle =
      (task.epicKey && epicNameByKey[task.epicKey]) ||
      (!isBogusEpicTitle(task.epicName, task.epicKey) ? task.epicName : '');

    const isStatusComboOpen = activeTableCombo && activeTableCombo.type === 'status' && activeTableCombo.taskKey === task.key;
    const isEpicComboOpen = activeTableCombo && activeTableCombo.type === 'epic' && activeTableCombo.taskKey === task.key;
    const isCompComboOpen = activeTableCombo && activeTableCombo.type === 'component' && activeTableCombo.taskKey === task.key;
    const isAssigneeComboOpen = activeTableCombo && activeTableCombo.type === 'assignee' && activeTableCombo.taskKey === task.key;
    const isCustomerComboOpen = activeTableCombo && activeTableCombo.type === 'customer' && activeTableCombo.taskKey === task.key;

    const comboItemStyle = 'padding:5px 8px;margin-bottom:2px;border-radius:6px;line-height:1.35;min-height:24px;display:flex;align-items:center;gap:6px;cursor:pointer;';

    let statusPopoverHtml = '';
    if (isStatusComboOpen) {
      statusPopoverHtml = \`
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" style="min-width:210px;padding:6px;display:flex;flex-direction:column;gap:4px;" onclick="event.stopPropagation();">
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list" style="display:flex;flex-direction:column;gap:2px;">
            \${statusList
              .map((st) => {
                const matchedTr = taskTransitions.find(
                  (tr) => ((tr.to && tr.to.name) || tr.name || '').toLowerCase() === st.toLowerCase()
                );
                const trId = matchedTr && matchedTr.id ? matchedTr.id : '';
                return \`
                  <div class="ozon-ext-combo-item \${st === task.status ? 'active' : ''}" style="\${comboItemStyle}justify-content:space-between;" data-action="pick-table-status" data-key="\${escapeHtml(task.key)}" data-status="\${escapeHtml(st)}" data-tr-id="\${escapeHtml(trId)}">
                    \${getStatusBadgeHtml(st)}
                    \${st === task.status ? '<span style="color:#005BFF;font-weight:700;font-size:11px;">✓</span>' : ''}
                  </div>
                \`;
              })
              .join('')}
          </div>
        </div>
      \`;
    }

    const statusCellHtml = \`
      <div class="ozon-ext-inner-ctrl ozon-ext-status-trigger status-\${statusCat}" data-action="open-table-status-combo" data-key="\${escapeHtml(task.key)}" title="Статус: \${escapeHtml(task.status)} (Нажмите для выбора статуса)">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escapeHtml(task.status)}</span>
        <span style="font-size:9px;opacity:0.75;flex-shrink:0;">▾</span>
        \${statusPopoverHtml}
      </div>
    \`;

    let epicPopoverHtml = '';
    if (isEpicComboOpen) {
      const q = (activeTableCombo.query || '').trim().toLowerCase();
      const filteredEpics = epicKeys.filter((k) => {
        if (!q) return true;
        const name = (epicMap[k] || '').toLowerCase();
        return k.toLowerCase().includes(q) || name.includes(q);
      });
      epicPopoverHtml = \`
        <aside role="dialog" aria-label="Эпик задачи" class="ozon-ext-inner-ctrl ozon-ext-combo-popover ozon-ext-epic-picker-popover" style="min-width:290px;padding:6px;display:flex;flex-direction:column;gap:5px;" onclick="event.stopPropagation();">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;"><strong>Эпик задачи · \${escapeHtml(task.key)}</strong><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="close-table-epic" aria-label="Закрыть">✕</button></div>
          <input type="search" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск эпика FCRM (код или название)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list" style="display:flex;flex-direction:column;gap:2px;">
            <div class="ozon-ext-combo-item \${!task.epicKey ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-epic" data-key="\${escapeHtml(task.key)}" data-epic-key="" data-epic-name="">
              <span style="color:#94A3B8;">✕ Без эпика</span>
            </div>
            \${
              filteredEpics.length > 0
                ? filteredEpics
                    .slice(0, 40)
                    .map(
                      (k) => \`
                        <div class="ozon-ext-combo-item ozon-ext-epic-option \${k === task.epicKey ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-epic" data-key="\${escapeHtml(task.key)}" data-epic-key="\${escapeHtml(k)}" data-epic-name="\${escapeHtml(epicMap[k] || '')}">
                          \${renderEpicOption(k, epicMap[k] || '')}
                        </div>
                      \`
                    )
                    .join('')
                : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Эпики FCRM не найдены (введите запрос для поиска в Jira)</div>'
            }
          </div>
        </aside>
      \`;
    }

    const tableFcrmEpicKey = task.epicKey || '';
    const tableEpicStatus = epicStatusByKey[tableFcrmEpicKey] || '';
    const tableEpicProjectTag = renderEpicProjectTag(tableFcrmEpicKey);
    const tableObprojectSource = isEpicIssueType(task.issueTypeName) ? task.key : task.epicKey;
    const tableObproject = epicObprojectByFcrmEpicKey[tableObprojectSource];
    const epicCellHtml = \`
        <div class="ozon-ext-inner-ctrl ozon-ext-cell-combo-trigger" data-action="open-table-epic-combo" data-key="\${escapeHtml(task.key)}" tabindex="0" role="button" aria-label="Изменить Epic Link" title="Изменить Epic Link">
          <div class="ozon-ext-table-epic-line" style="flex:1;overflow:hidden;">
            \${tableFcrmEpicKey ? '<a class="ozon-mono" href="https://jit.o3.ru/browse/' + encodeURIComponent(tableFcrmEpicKey) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">' + escapeHtml(tableFcrmEpicKey) + '</a>' + (tableEpicStatus ? getStatusBadgeHtml(tableEpicStatus) : '') + tableEpicProjectTag + '<span class="epic-title" title="' + escapeHtml(cleanEpicTitle || task.summary) + '">' + escapeHtml(cleanEpicTitle || task.summary) + '</span>' : '<span style="color:#94A3B8;">Без эпика</span>'}
          </div>
          <span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span>
          \${epicPopoverHtml}
        </div>
    \`;
    const obprojectCellHtml = \`
        <div class="ozon-ext-table-epic-line ozon-ext-inner-ctrl" style="min-height:22px;">
          \${tableObproject && tableObproject.key ? '<a class="ozon-mono" href="https://jit.o3.ru/browse/' + encodeURIComponent(tableObproject.key) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(tableObproject.summary || tableObproject.key) + '" onclick="event.stopPropagation();">' + escapeHtml(tableObproject.key) + '</a>' + (tableObproject.status ? getStatusBadgeHtml(tableObproject.status) : '<span style="color:#94A3B8;">Статус недоступен</span>') + '<span class="epic-title" title="' + escapeHtml(tableObproject.summary || '') + '">' + escapeHtml(tableObproject.summary || '') + '</span>' : '<span style="color:#94A3B8;">OBPROJECT: не указан</span>'}
        </div>
    \`;

    const taskProjKey = getIssueProjectKey(task.key);
    const taskProjComponents = getComponentsForProject(taskProjKey);
    let compPopoverHtml = '';
    if (isCompComboOpen) {
      const cq = (activeTableCombo.query || '').trim().toLowerCase();
      const filteredComps = taskProjComponents.filter((c) => !cq || c.toLowerCase().includes(cq));
      compPopoverHtml = \`
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" style="min-width:260px;padding:6px;display:flex;flex-direction:column;gap:5px;" onclick="event.stopPropagation();">
          <input type="search" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск компонента (\${escapeHtml(taskProjKey)})..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list" style="display:flex;flex-direction:column;gap:2px;">
            \${
              filteredComps.length > 0
                ? filteredComps
                    .map(
                      (c) => \`
                        <div class="ozon-ext-combo-item \${c === task.component ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-comp" data-key="\${escapeHtml(task.key)}" data-comp="\${escapeHtml(c)}">
                          <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;font-weight:\${c === task.component ? '700' : '500'};">\${escapeHtml(c)}</span>
                        </div>
                      \`
                    )
                    .join('')
                : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Компоненты не найдены</div>'
            }
          </div>
        </div>
      \`;
    }

    const compCellHtml = \`
      <div class="ozon-ext-inner-ctrl ozon-ext-cell-combo-trigger" data-action="open-table-comp-combo" data-key="\${escapeHtml(task.key)}" title="\${escapeHtml(task.component)} (Нажмите для поиска компонента \${escapeHtml(taskProjKey)})">
        <span style="color:#071026;font-weight:600;font-size:11px;overflow:hidden;text-overflow:ellipsis;flex:1;">\${escapeHtml(task.component || 'Без компонента')}</span>
        <span style="color:#94A3B8;font-size:9px;flex-shrink:0;">▾</span>
        \${compPopoverHtml}
      </div>
    \`;

    // Поиск и выбор Исполнителя в таблице
    let assigneePopoverHtml = '';
    if (isAssigneeComboOpen) {
      const aq = (activeTableCombo.query || '').trim().toLowerCase();
      const candidateUsers =
        tableUserSearchResults.length > 0
          ? tableUserSearchResults
          : assignableUsersList.filter((u) => isRealHumanJiraUser(u));
      const filteredUsers = candidateUsers.filter((u) => {
        if (!isRealHumanJiraUser(u)) return false;
        if (!aq) return true;
        return (
          String(u.displayName || '').toLowerCase().includes(aq) ||
          String(u.name || '').toLowerCase().includes(aq)
        );
      });

      assigneePopoverHtml = \`
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" style="min-width:270px;padding:6px;display:flex;flex-direction:column;gap:5px;" onclick="event.stopPropagation();">
          <input type="search" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск человека (ФИО или логин)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list" style="display:flex;flex-direction:column;gap:2px;">
            <div class="ozon-ext-combo-item \${task.assignee.name === 'Не назначен' ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-assignee" data-key="\${escapeHtml(task.key)}" data-user-login="" data-user-display="Не назначен">
              <span style="color:#94A3B8;">✕ Не назначен</span>
            </div>
            \${
              filteredUsers.length > 0
                ? filteredUsers
                    .slice(0, 35)
                    .map(
                      (u) => \`
                        <div class="ozon-ext-combo-item \${u.displayName === task.assignee.name ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-assignee" data-key="\${escapeHtml(task.key)}" data-user-login="\${escapeHtml(u.name || '')}" data-user-display="\${escapeHtml(u.displayName)}">
                          \${jiraPeople.badge({...u,name:u.displayName})}
                          \${u.login ? \`<span style="color:#64748B;font-size:10px;flex-shrink:0;">\${escapeHtml(u.login)}</span>\` : ''}
                          \${jiraPeople.copyButton(u)}
                        </div>
                      \`
                    )
                    .join('')
                : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Сотрудники не найдены — введите ФИО или логин</div>'
            }
          </div>
        </div>
      \`;
    }

    const assigneeCellHtml = \`<div class="ozon-person-line">
      <div class="ozon-ext-inner-ctrl ozon-ext-cell-combo-trigger" data-action="open-table-assignee-combo" data-key="\${escapeHtml(task.key)}" title="Исполнитель: \${escapeHtml(task.assignee.name)} (Нажмите для поиска сотрудника)">
        \${jiraPeople.badge(task.assignee,'Не назначен')}
        <span style="color:#94A3B8;font-size:9px;flex-shrink:0;">▾</span>
        \${assigneePopoverHtml}
      </div>
      \${jiraPeople.copyButton(task.assignee)}
      </div>
    \`;

    // Поиск и выбор Заказчик/Owner в таблице
    const isCustEmpty = !task.customer.name || task.customer.name === 'Не указан';
    let customerPopoverHtml = '';
    if (isCustomerComboOpen) {
      const custQ = (activeTableCombo.query || '').trim().toLowerCase();
      const candidateCusts =
        tableUserSearchResults.length > 0
          ? tableUserSearchResults
          : assignableUsersList.filter((u) => isRealHumanJiraUser(u));
      const filteredCusts = candidateCusts.filter((u) => {
        if (!isRealHumanJiraUser(u)) return false;
        if (!custQ) return true;
        return (
          String(u.displayName || '').toLowerCase().includes(custQ) ||
          String(u.name || '').toLowerCase().includes(custQ)
        );
      });

      customerPopoverHtml = \`
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" style="min-width:270px;padding:6px;display:flex;flex-direction:column;gap:5px;" onclick="event.stopPropagation();">
          <input type="search" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск Заказчик/Owner (ФИО или логин)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list" style="display:flex;flex-direction:column;gap:2px;">
            <div class="ozon-ext-combo-item \${isCustEmpty ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-customer" data-key="\${escapeHtml(task.key)}" data-user-login="" data-user-display="Не указан">
              <span style="color:#94A3B8;">✕ Не указан</span>
            </div>
            \${
              filteredCusts.length > 0
                ? filteredCusts
                    .slice(0, 35)
                    .map(
                      (u) => \`
                        <div class="ozon-ext-combo-item \${u.displayName === task.customer.name ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-customer" data-key="\${escapeHtml(task.key)}" data-user-login="\${escapeHtml(u.name || '')}" data-user-display="\${escapeHtml(u.displayName)}">
                          <span style="color:#071026;font-weight:600;overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(u.displayName)}</span>
                          \${u.name ? \`<span style="color:#64748B;font-size:10px;flex-shrink:0;">(\${escapeHtml(u.name)})</span>\` : ''}
                        </div>
                      \`
                    )
                    .join('')
                : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Сотрудники не найдены — нажмите Enter для сохранения текста</div>'
            }
          </div>
        </div>
      \`;
    }

    const customerCellHtml = \`
      <div class="ozon-ext-inner-ctrl ozon-ext-cell-combo-trigger" data-action="open-table-customer-combo" data-key="\${escapeHtml(task.key)}" title="Заказчик/Owner: \${escapeHtml(task.customer.name || 'Не указан')} (Нажмите для поиска сотрудника)">
        <span style="color:\${isCustEmpty ? '#94A3B8' : '#071026'};font-weight:500;font-size:11px;overflow:hidden;text-overflow:ellipsis;flex:1;">\${escapeHtml(task.customer.name || 'Не указан')}</span>
        <span style="color:#94A3B8;font-size:9px;flex-shrink:0;">▾</span>
        \${customerPopoverHtml}
      </div>
    \`;

    // СТРОГО 1 ЛИНИЯ для ячейки «Задача проекта»
    let ptSingleLineHtml = '<span style="color:#CBD5E1;">—</span>';
    if (ptList.length > 0) {
      const firstPt = ptList[0];
      const morePtCount = ptList.length - 1;
      const allPtTooltip = ptList.map((l) => l.key + ': ' + l.summary + ' [' + l.status + ']').join('\\n');
      ptSingleLineHtml = \`
        <div class="ozon-ext-cell-singleline" title="\${escapeHtml(allPtTooltip)}">
          <span class="ozon-mono" style="color:#005BFF;font-weight:600;font-size:10.5px;flex-shrink:0;">\${escapeHtml(firstPt.key)}</span>
          <span style="color:#334155;font-size:11px;overflow:hidden;text-overflow:ellipsis;flex:1;">\${escapeHtml(firstPt.summary)}</span>
          \${
            morePtCount > 0
              ? \`<button type="button" class="ozon-ext-inner-ctrl ozon-ext-more-links-pill" data-action="toggle-subrow" data-key="\${escapeHtml(task.key)}" title="Показать все задачи проекта (\${ptList.length})">+\${morePtCount} ещё \${isSubExpanded ? '▴' : '▾'}</button>\`
              : ''
          }
        </div>
      \`;
    }

    // СТРОГО 1 ЛИНИЯ для ячейки «В проекте»
    let ipSingleLineHtml = '<span style="color:#CBD5E1;">—</span>';
    if (ipList.length > 0) {
      const firstIp = ipList[0];
      const moreIpCount = ipList.length - 1;
      const allIpTooltip = ipList
        .map((l) => l.key + ' — ' + l.summary + ' | Статус: ' + l.status + ' | Комп.: ' + (l.component || '—') + ' | Спринт: ' + (l.sprint || '—'))
        .join('\\n');
      ipSingleLineHtml = \`
        <div class="ozon-ext-cell-singleline" title="\${escapeHtml(allIpTooltip)}">
          <span class="ozon-mono" style="color:#005BFF;font-weight:600;font-size:10.5px;flex-shrink:0;">\${escapeHtml(firstIp.key)}</span>
          <span style="color:#071026;font-weight:500;font-size:11px;overflow:hidden;text-overflow:ellipsis;flex:1;">\${escapeHtml(firstIp.summary)}</span>
          <span style="color:#64748B;font-size:10px;flex-shrink:0;">\${escapeHtml(firstIp.component && firstIp.component !== 'Без компонента' ? firstIp.component : firstIp.status)}</span>
          \${
            moreIpCount > 0
              ? \`<button type="button" class="ozon-ext-inner-ctrl ozon-ext-more-links-pill" data-action="toggle-subrow" data-key="\${escapeHtml(task.key)}" title="Развернуть все задачи «В проекте» (\${ipList.length})">+\${moreIpCount} ещё \${isSubExpanded ? '▴' : '▾'}</button>\`
              : ''
          }
        </div>
      \`;
    }

    const taskIndentPx = 8 + treeDepth * 20;
    const subRowIndentPx = taskIndentPx + 20;

    const cellMap = {
      task: \`
        <td class="ozon-ext-task-cell" style="padding-left:\${taskIndentPx}px !important;border-left:3px solid #E2E8F0 !important;">
          <div class="ozon-ext-cell-singleline">
            \${
              totalLinks > 0
                ? \`<button type="button" class="ozon-ext-inner-ctrl" data-action="toggle-subrow" data-key="\${escapeHtml(task.key)}" title="Развернуть/свернуть связанные задачи (\${totalLinks})" style="border:none;background:transparent;color:#005BFF;font-weight:700;cursor:pointer;padding:0;width:16px;min-width:16px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;line-height:1;flex-shrink:0;">\${isSubExpanded ? '▼' : '▶'}</button>\`
                : '<span style="display:inline-block;width:16px;min-width:16px;flex-shrink:0;"></span>'
            }
            <a href="/browse/\${escapeHtml(task.key)}" target="_blank" class="ozon-ext-inner-ctrl ozon-mono" onclick="event.stopPropagation();" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(task.key)}</a>
            \${getIssueTypeBadgeHtml(task.issueTypeName, task.issueTypeIconUrl)}
            <button type="button" class="ozon-dev-priority-edit ozon-ext-inner-ctrl" data-priority-key="\${escapeHtml(task.key)}" title="Изменить приоритет: \${escapeHtml(task.priority || 'Не указан')}" aria-label="Изменить приоритет \${escapeHtml(task.key)}">\${getJiraPriorityIconSvg(task.priority)}</button>
            \${hasNoAssignee ? getMissingAssigneeWarnSvg() : ''}
            <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;font-weight:500;font-size:11.5px;flex:1;min-width:0;">\${escapeHtml(task.summary)}</span>
            \${renderDeliveryIndicators(task)}
            \${renderMissingCustomerIndicator(task)}
            <button type="button" class="ozon-ext-inner-ctrl ozon-ext-open-sb-btn" data-action="open-sidebar" data-details-trigger aria-expanded="false" data-key="\${escapeHtml(task.key)}" title="Открыть детали задачи \${escapeHtml(task.key)} в боковой панели справа">
              Детали
            </button>
          </div>
        </td>
      \`,
      status: \`<td style="overflow:visible;">\${statusCellHtml}</td>\`,
      epic: \`<td style="overflow:visible;">\${epicCellHtml}</td>\`,
      epicObproject: \`<td>\${obprojectCellHtml}</td>\`,
      component: \`<td style="overflow:visible;">\${compCellHtml}</td>\`,
      assignee: \`<td style="overflow:visible;">\${assigneeCellHtml}</td>\`,
      author: \`
        <td style="color:#475569;font-size:11px;">
          <div class="ozon-person-line">\${jiraPeople.badge(task.author)}\${jiraPeople.copyButton(task.author)}</div>
        </td>
      \`,
      customer: \`<td style="overflow:visible;">\${customerCellHtml}</td>\`,
      created: \`
        <td class="ozon-mono" style="color:#475569;font-size:10.5px;">
          <div class="ozon-ext-cell-singleline">\${escapeHtml(task.createdAt)}</div>
        </td>
      \`,
      createdAt: \`
        <td class="ozon-mono" style="color:#475569;font-size:10.5px;">
          <div class="ozon-ext-cell-singleline">\${escapeHtml(task.createdAt)}</div>
        </td>
      \`,
      sprint: \`
        <td style="overflow:visible;">
          <div class="ozon-ext-cell-singleline">
            \${renderSearchSelect('table-sprint-' + task.key, task.sprint, Array.from(new Set([...allSprints, task.sprint].filter(Boolean))).map(sp => ({ value: sp, label: formatSprintWithStateText(sp) })), 'Поиск спринта...', 'compact')}
          </div>
        </td>
      \`,
      projectTask: \`<td>\${ptSingleLineHtml}</td>\`,
      inProject: \`<td>\${ipSingleLineHtml}</td>\`
    };

    let html = \`
      <tr class="ozon-ext-task-row ozon-tree-depth-\${treeDepth % 2} \${isDoneTask(task) ? 'completed' : ''}\${reviewRowClass(task.key,task.status)}" data-details-row="\${escapeHtml(JSON.stringify([...groupPath, task.key]))}" data-key="\${escapeHtml(task.key)}" title="Нажмите на строку, чтобы развернуть/свернуть связанные задачи (или нажмите «◨ Детали» для открытия боковой панели)">
        \${columnOrder.map((colId) => cellMap[colId] || '<td></td>').join('')}
      </tr>
    \`;

    if (isSubExpanded && totalLinks > 0) {
      const renderLinkedSubrow = (l, isPt) => {
        const lEpicClean =
          (l.epicKey && epicNameByKey[l.epicKey]) ||
          (!isBogusEpicTitle(l.epicName, l.epicKey) ? l.epicName : '');
        const lEpicHtml = l.epicKey
          ? \`<div class="ozon-ext-cell-singleline" title="\${escapeHtml(l.epicKey + (lEpicClean ? ' — ' + lEpicClean : ''))}">
               <span class="ozon-mono" style="color:#005BFF;font-weight:600;font-size:10.5px;flex-shrink:0;">\${escapeHtml(l.epicKey)}</span>
               <span style="color:#334155;font-size:11px;overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(lEpicClean || l.epicKey)}</span>
             </div>\`
          : '<span style="color:#94A3B8;">—</span>';

        const subCellMap = {
          task: \`
            <td class="ozon-ext-task-cell" style="padding-left:\${subRowIndentPx}px !important;border-left:3px solid #CBD5E1 !important;">
              <div class="ozon-ext-cell-singleline">
                <span class="ozon-mono" style="color:#94A3B8;font-weight:700;">↳</span>
                \${getLinkTypeTagHtml(isPt)}
                <a href="/browse/\${escapeHtml(l.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(l.key)}</a>
                \${getIssueTypeBadgeHtml(l.issueTypeName, l.issueTypeIconUrl)}
                <button type="button" class="ozon-dev-priority-edit ozon-ext-inner-ctrl" data-priority-key="\${escapeHtml(l.key)}" title="Изменить приоритет: \${escapeHtml(l.priority || 'Не указан')}" aria-label="Изменить приоритет \${escapeHtml(l.key)}">\${getJiraPriorityIconSvg(l.priority || 'Medium')}</button>
                <span style="color:#071026;font-weight:500;overflow:hidden;text-overflow:ellipsis;" title="\${escapeHtml(l.summary)}">\${escapeHtml(l.summary)}</span>
              </div>
            </td>
          \`,
          status: \`<td><div class="ozon-ext-cell-singleline">\${getStatusBadgeHtml(l.status)}</div></td>\`,
          epic: \`<td>\${lEpicHtml}</td>\`,
          component: \`<td style="color:#071026;font-weight:600;"><div class="ozon-ext-cell-singleline" title="\${escapeHtml(l.component || 'Без компонента')}">\${escapeHtml(l.component || 'Без компонента')}</div></td>\`,
          assignee: \`<td><div class="ozon-person-line">\${jiraPeople.badge(l.assignee,l.assigneeName)}\${jiraPeople.copyButton(l.assignee)}</div></td>\`,
          author: \`<td><div class="ozon-person-line">\${jiraPeople.badge(l.author,l.authorName)}\${jiraPeople.copyButton(l.author)}</div></td>\`,
          customer: \`<td style="color:#94A3B8;">—</td>\`,
          created: \`<td class="ozon-mono" style="color:#64748B;font-size:10.5px;"><div class="ozon-ext-cell-singleline">\${escapeHtml(l.createdAt || '—')}</div></td>\`,
          createdAt: \`<td class="ozon-mono" style="color:#64748B;font-size:10.5px;"><div class="ozon-ext-cell-singleline">\${escapeHtml(l.createdAt || '—')}</div></td>\`,
          sprint: \`<td style="color:#334155;font-weight:500;"><div class="ozon-ext-cell-singleline ozon-ext-sprint-value" title="\${escapeHtml(formatSprintWithStateText(l.sprint || 'Не в спринте'))}"><span style="overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(l.sprint || 'Не в спринте')}</span>\${getSprintStateBadgeHtml(l.sprint)}</div></td>\`,
          projectTask: isPt
            ? \`<td><div class="ozon-ext-cell-singleline">\${getLinkTypeTagHtml(true)}</div></td>\`
            : \`<td style="color:#94A3B8;">—</td>\`,
          inProject: !isPt
            ? \`<td><div class="ozon-ext-cell-singleline">\${getLinkTypeTagHtml(false)}</div></td>\`
            : \`<td style="color:#94A3B8;">—</td>\`
        };

        return \`
          <tr class="ozon-ext-subrow ozon-tree-depth-\${(treeDepth + 1) % 2} \${isDoneTask(l) ? 'completed' : ''}\${reviewRowClass(l.key,l.status)}">
            \${columnOrder.map((colId) => subCellMap[colId] || '<td></td>').join('')}
          </tr>
        \`;
      };

      ptList.forEach((l) => {
        html += renderLinkedSubrow(l, true);
      });
      ipList.forEach((l) => {
        html += renderLinkedSubrow(l, false);
      });
    }

    return html;
  }

  function buildTableRowsHtml(filteredTasks) {
    if (isInitialBoardLoading) {
      return \`
        <tr class="ozon-ext-sprint-row">
          <td colspan="\${columnOrder.length}">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="ozon-ext-spinner"></span>
              <div class="ozon-ext-load-progress">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;color:#334155;font-size:11px;"><span>\${escapeHtml(initialLoadStage || statusMessage || 'Загрузка спринтов и задач FCRM из Jira...')}</span><strong style="color:#005BFF;">\${initialLoadProgress}%</strong></div>
                <div class="ozon-ext-load-progress-track"><div class="ozon-ext-load-progress-fill" style="--load-progress:\${initialLoadProgress}%"></div></div>
              </div>
            </div>
          </td>
        </tr>
        \${buildSkeletonTableRowsHtml(8)}
      \`;
    }

    if (!productDashboardLoaded) return '<tr><td colspan="' + columnOrder.length + '" style="padding:20px;color:#64748B">Выберите спринты и нажмите «Загрузить задачи». После загрузки можно применить дополнительные фильтры.</td></tr>';
    const groups = {};
    const hasActiveTaskFilters = Boolean(searchQuery.trim()) || filterComponent !== 'all' || filterEpic !== 'all' || filterStatus !== 'all' || hideDone || filterIssueType !== 'all';

    // Инициализируем все родные спринты доски (включая Прошедшие/Закрытые), чтобы они всегда отображались в списке
    if (!hasActiveTaskFilters) {
      boardOwnedSprintNames.forEach((spName) => {
        if (spName && !groups[spName]) {
          groups[spName] = [];
        }
      });
    }

    // Группируем задачи FCRM по спринтам (включая Прошедшие спринты!)
    filteredTasks.forEach((t) => {
      const sp = t.sprint || 'Бэклог FCRM';
      if (!groups[sp]) groups[sp] = [];
      groups[sp].push(t);
    });

    const sortedSprints = getSortedSprintNames(groups).filter((spName) => {
      const items = groups[spName] || [];
      const spState = getSprintStateCode(spName);
      if (!matchesSprintState(spState)) return false;
      if (hasActiveTaskFilters) return items.length > 0;
      return items.length > 0 || boardOwnedSprintNames.has(spName);
    });

    const allComponents = getAllComponentOptions();
    const allSprints = getEditableSprintOptions();
    const allAssignees = getAllAssigneeOptions();
    const epicMap = getAllEpicOptions();
    const epicKeys = Object.keys(epicMap);

    let rowsHtml = '';

    if (productGroupingOrder.join(',') !== 'sprint,component') {
      const renderGroups = (items, depth, path) => {
        if (depth >= productGroupingOrder.length) return sortTasksList(items).map((task) => renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys, path)).join('');
        const field = productGroupingOrder[depth]; const buckets = {};
        items.forEach((task) => {
          const values = field === 'sprint' ? [task.sprint || 'Бэклог FCRM'] : (task.components?.length ? task.components : [task.component || 'Без компонента']);
          values.forEach((value) => { if (field === 'component' && filterComponent !== 'all' && value !== filterComponent) return; (buckets[value] ||= []).push(task); });
        });
        if (field === 'sprint' && depth === 0 && !hasActiveTaskFilters) sortedSprints.forEach((name) => { buckets[name] ||= []; });
        const names = field === 'sprint' ? getSortedSprintNames(buckets) : Object.keys(buckets).sort((a,b) => a === 'Без компонента' ? 1 : b === 'Без компонента' ? -1 : a.localeCompare(b,'ru'));
        return names.map((name) => {
          const key = JSON.stringify([...path, [field, name]]); const groupItems = buckets[name];
          const defaultExpanded = treeLevelApplied && (tableTreeLevel === 'tasks' || tableTreeLevel === 'links' || (tableTreeLevel === 'components' && depth === 0));
          const expanded = Object.prototype.hasOwnProperty.call(productExpandedGroups, key) ? productExpandedGroups[key] : (defaultExpanded || (!treeLevelApplied && Boolean(searchQuery.trim())));
          const heading = field === 'sprint' ? escapeHtml(name) + ' ' + (getSprintStateBadgeHtml(name) || renderBadge('Бэклог','todo')) : '<span style="color:#64748B;font-weight:500">Компонент:</span> ' + escapeHtml(name);
          const row = '<tr class="ozon-ext-product-group ozon-tree-depth-' + (depth % 2) + ' ' + (field === 'sprint' ? 'ozon-ext-sprint-row' : 'ozon-ext-comp-group-row') + '" data-group-key="' + escapeHtml(key) + '"><td colspan="' + columnOrder.length + '"><div style="display:flex;align-items:center;gap:8px;padding-left:' + (depth * 20) + 'px"><span style="color:#005BFF">' + (expanded ? '▾' : '▸') + '</span><strong>' + heading + '</strong><span class="ozon-ext-group-total">' + groupItems.length + ' задач</span>' + renderStatusSummary(groupItems) + '</div></td></tr>';
          return row + (expanded ? renderGroups(groupItems, depth + 1, [...path, [field,name]]) : '');
        }).join('');
      };
      return renderGroups(filteredTasks, 0, []);
    }

    sortedSprints.forEach((sprintName) => {
      const groupItems = groups[sprintName] || [];
      // По умолчанию спринты СВЁРНУТЫ (разворачиваются по клику или при активном поиске)
      const isExpanded = Boolean(expandedSprints[sprintName]) || (!treeLevelApplied && Boolean(searchQuery.trim()));
      const collapsed = !isExpanded;
      rowsHtml += \`
        <tr class="ozon-ext-sprint-row" data-sprint="\${escapeHtml(sprintName)}">
          <td colspan="\${columnOrder.length}">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#005BFF;font-size:10px;">\${collapsed ? "▸" : "▾"}</span>
                <span style="color:#071026;font-weight:700;font-size:12px;">\${escapeHtml(sprintName)}</span>
                \${getSprintStateBadgeHtml(sprintName) || renderBadge("Бэклог", "todo")}
                <span class="ozon-ext-group-total">\${groupItems.length} задач</span>
                \${renderStatusSummary(groupItems)}
              </div>
              <span class="ozon-ext-sprint-chevron" style="color:#64748B;font-size:11px;">
                \${collapsed ? 'Развернуть спринт' : 'Свернуть спринт'}
              </span>
            </div>
          </td>
        </tr>
      \`;

      if (!collapsed) {
        if (groupByComponentInsideSprint) {
          const compGroups = {};
          groupItems.forEach((t) => {
            const names = Array.isArray(t.components) && t.components.length ? t.components : [t.component || 'Без компонента'];
            names.forEach((cName) => { if (filterComponent !== 'all' && cName !== filterComponent) return; if (!compGroups[cName]) compGroups[cName] = []; compGroups[cName].push(t); });
          });

          const sortedCompNames = Object.keys(compGroups).sort((a, b) => {
            if (a === 'Без компонента' && b !== 'Без компонента') return 1;
            if (a !== 'Без компонента' && b === 'Без компонента') return -1;
            return a.localeCompare(b, 'ru');
          });

          sortedCompNames.forEach((compName) => {
            const compItems = sortByField !== 'default' ? sortTasksList(compGroups[compName] || []) : (compGroups[compName] || []).slice().sort((a, b) => {
              const priorityDifference = getPrioritySortWeight(b.priority) - getPrioritySortWeight(a.priority);
              if (priorityDifference !== 0) return priorityDifference;
              return parseTaskCreatedTimestamp(b) - parseTaskCreatedTimestamp(a);
            });
            const compKey = sprintName + '::' + compName;
            // По умолчанию компоненты внутри спринта тоже СВЁРНУТЫ (или развёрнуты при активном поиске)
            const isCompExpanded = Boolean(expandedComponents[compKey]) || (!treeLevelApplied && Boolean(searchQuery.trim()));
            const isCompCollapsed = !isCompExpanded;

            rowsHtml += \`
              <tr class="ozon-ext-comp-group-row ozon-tree-depth-1" data-comp-group="\${escapeHtml(compKey)}">
                <td colspan="\${columnOrder.length}">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:7px;">
                      <span style="color:#005BFF;font-size:9.5px;">\${isCompCollapsed ? "▸" : "▾"}</span>
                      <span style="color:#64748B;font-size:11px;font-weight:500;">Компонент:</span>
                      <strong style="color:#071026;font-size:11px;font-weight:700;">\${escapeHtml(compName)}</strong>
                      <span class="ozon-ext-group-total">\${compItems.length} задач</span>
                      \${renderStatusSummary(compItems)}
                    </div>
                    <span style="color:#94A3B8;font-size:10.5px;">\${isCompCollapsed ? 'Показать (' + compItems.length + ')' : 'Свернуть'}</span>
                  </div>
                </td>
              </tr>
            \`;

            if (!isCompCollapsed) {
              compItems.forEach((task) => {
                rowsHtml += renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys, [['sprint', sprintName], ['component', compName]]);
              });
            }
          });
        } else {
          sortTasksList(groupItems).forEach((task) => {
            rowsHtml += renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys, [['sprint', sprintName]]);
          });
        }
      }
    });

    return rowsHtml;
  }

  function renderUserSearchResultsHtml(users) {
    const cleanUsers = (Array.isArray(users) ? users : []).filter((u) => isRealHumanJiraUser(u));
    if (cleanUsers.length === 0) {
      return '';
    }
    return (
      '<div class="ozon-ext-user-dropdown">' +
      cleanUsers
        .map(
          (u) => \`
            <div class="ozon-ext-user-option" data-action="pick-jira-user" data-user-login="\${escapeHtml(u.name)}" data-user-display="\${escapeHtml(u.displayName)}">
              \${jiraPeople.badge({...u,name:u.displayName})}
              \${u.login ? '<small>' + escapeHtml(u.login) + '</small>' : ''}
              \${jiraPeople.copyButton(u)}
              <span style="color:#005BFF;font-weight:700;font-size:10.5px;flex-shrink:0;">Выбрать</span>
            </div>
          \`
        )
        .join('') +
      '</div>'
    );
  }

  function renderCustomerSearchResultsHtml(users) {
    const cleanUsers = (Array.isArray(users) ? users : []).filter((u) => isRealHumanJiraUser(u));
    if (cleanUsers.length === 0) {
      return '';
    }
    return (
      '<div class="ozon-ext-user-dropdown">' +
      cleanUsers
        .map(
          (u) => \`
            <div class="ozon-ext-user-option" data-action="pick-jira-customer" data-user-login="\${escapeHtml(u.name)}" data-user-display="\${escapeHtml(u.displayName)}">
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <strong style="color:#071026;">\${escapeHtml(u.displayName)}</strong>
                <span style="color:#64748B;font-size:10.5px;margin-left:5px;">(\${escapeHtml(u.name)})</span>
              </div>
              <span style="color:#005BFF;font-weight:700;font-size:10.5px;flex-shrink:0;">Выбрать</span>
            </div>
          \`
        )
        .join('') +
      '</div>'
    );
  }

  const COLUMN_META = {
    task: { label: 'Задача (Спринт → Компонент → Задача)', accent: false },
    status: { label: 'Статус ▾', accent: false },
    epic: { label: 'Epic Link ▾', accent: false },
    epicObproject: { label: 'Эпик OBPROJECT', accent: false },
    component: { label: 'Компонент ▾', accent: true },
    assignee: { label: 'Исполнитель ▾', accent: false },
    author: { label: 'Автор', accent: false },
    customer: { label: 'Заказчик/Owner ▾', accent: false },
    created: { label: 'Создана', accent: false },
    createdAt: { label: 'Создана', accent: false },
    sprint: { label: 'Спринт ▾', accent: false },
    projectTask: { label: 'Задача проекта (fcrm_umb_epic)', accent: false },
    inProject: { label: 'В проекте (OB · OBFRONT · FTD)', accent: false }
  };

  function buildSidebarHtml() {
    if (!isSidebarOpen || !selectedTaskKey) return '';
    const task = tasks.find((t) => t.key === selectedTaskKey);
    if (!task) return '';

    const isTaskLoading = loadingSidebarTaskKey === selectedTaskKey;

    if (isTaskLoading) {
      return \`
        <div class="ozon-ext-resizer-bar" id="ozon-ext-sidebar-resizer" title="Потяните для изменения ширины сайдбара"></div>
        <aside class="ozon-ext-sidebar" id="ozon-ext-sidebar-panel" style="width:\${sidebarWidthCss()};">
          <div class="ozon-ext-sidebar-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="ozon-ext-spinner"></span>
              <strong class="ozon-mono" style="color:#005BFF;font-size:13px;">\${escapeHtml(task.key)}</strong>
              <span style="color:#64748B;font-size:11.5px;">Загрузка описания, приоритета и связей из Jira...</span>
            </div>
            <div style="display:flex;align-items:center;gap:5px;">
              \${nativeBoardButton()}
              <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-ext-sidebar-close">✕</button>
            </div>
          </div>
          <div class="ozon-ext-sidebar-body">
            <div>
              <div class="ozon-ext-skeleton" style="width:120px;height:11px;margin-bottom:6px;"></div>
              <div class="ozon-ext-skeleton" style="width:100%;height:30px;border-radius:8px;"></div>
            </div>
            <div class="ozon-ext-section-card" style="padding:12px;display:flex;flex-direction:column;gap:8px;">
              <div class="ozon-ext-skeleton" style="width:140px;height:13px;"></div>
              <div class="ozon-ext-skeleton" style="width:100%;height:64px;border-radius:8px;"></div>
            </div>
            <div class="ozon-ext-section-card" style="padding:12px;display:flex;flex-direction:column;gap:10px;">
              <div class="ozon-ext-skeleton" style="width:180px;height:14px;"></div>
              <div class="ozon-ext-skeleton" style="width:100%;height:26px;"></div>
              <div class="ozon-ext-skeleton" style="width:100%;height:26px;"></div>
              <div class="ozon-ext-skeleton" style="width:100%;height:26px;"></div>
              <div class="ozon-ext-skeleton" style="width:100%;height:26px;"></div>
            </div>
          </div>
        </aside>
      \`;
    }

    const taskProjKey = getIssueProjectKey(task.key);
    const taskProjComponents = getComponentsForProject(taskProjKey);
    const editableSprints = getEditableSprintOptions();
    const statusList = getStatusOptionsForTask(task);
    const priorityList = getPriorityOptionsForTask(task);
    const issueTypeList = getProjectIssueTypeOptions(task);
    const currentIssueType = task.issueTypeName || 'Задача';
    const taskTransitions = issueTransitionsByKey[task.key] || [];
    const epicMap = getAllEpicOptions();
    const statusCat = getStatusCategoryClass(task.status);
    const prioBadgeClass = getPriorityBadgeClass(task.priority);

    const statusOptions = statusList
      .map((st) => {
        const matchedTr = taskTransitions.find(
          (tr) => ((tr.to && tr.to.name) || tr.name || '').toLowerCase() === st.toLowerCase()
        );
        const trAttr = matchedTr && matchedTr.id ? \`data-tr-id="\${escapeHtml(matchedTr.id)}"\` : '';
        return \`<option value="\${escapeHtml(st)}" \${trAttr} \${st === task.status ? 'selected' : ''}>\${escapeHtml(st)}</option>\`;
      })
      .join('');

    const priorityOptions = priorityList
      .map((pr) => \`<option value="\${escapeHtml(pr)}" \${pr === task.priority ? 'selected' : ''}>\${escapeHtml(pr)}</option>\`)
      .join('');

    const issueTypeOptions = issueTypeList
      .map((itName) => \`<option value="\${escapeHtml(itName)}" \${itName === currentIssueType ? 'selected' : ''}>\${escapeHtml(itName)}</option>\`)
      .join('');

    const statusSearchOptions = statusList.map((st) => {
      const matchedTr = taskTransitions.find((tr) => ((tr.to && tr.to.name) || tr.name || '').toLowerCase() === st.toLowerCase());
      return { value: st, label: st, transitionId: matchedTr && matchedTr.id ? String(matchedTr.id) : '' };
    });
    const issueTypeSearchOptions = issueTypeList.map((name) => ({ value: name, label: name, iconUrl: name === currentIssueType ? task.issueTypeIconUrl : undefined }));
    const sidebarSprintSearchOptions = Array.from(new Set([...editableSprints, task.sprint].filter(Boolean))).map((name) => ({ value: name, label: formatSprintWithStateText(name) }));

    const transitionsChipsHtml =
      taskTransitions.length > 0
        ? \`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">
             \${taskTransitions
               .map((tr) => {
                 const targetSt = (tr.to && tr.to.name) || tr.name;
                 const isCurrent = String(targetSt).toLowerCase() === String(task.status).toLowerCase();
                 if (isCurrent) return '';
                 return \`<button type="button" class="ozon-ext-status-chip ozon-ext-badge-\${getStatusCategoryClass(targetSt)}" data-action="quick-transition" data-tr-id="\${escapeHtml(tr.id)}" data-target-status="\${escapeHtml(targetSt)}">\${escapeHtml(targetSt)}</button>\`;
               })
               .join('')}
           </div>\`
        : '';

    const sprintOptions = buildSprintSelectOptionsHtml(editableSprints, task.sprint, '');

    const isInBacklog = !task.sprint || task.sprint.toLowerCase().includes('бэклог') || task.sprint.toLowerCase().includes('backlog');
    const sprintQuickChipsHtml = \`
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">
        \${editableSprints
          .filter((sp) => {
            const code = getSprintStateCode(sp);
            return code === 'ACTIVE' || code === 'FUTURE';
          })
          .map((sp) => {
            const isCurr = sp === task.sprint;
            return \`<button type="button" class="ozon-ext-btn \${isCurr ? '' : 'ozon-ext-btn-surface'}" data-action="quick-sprint-chip" data-sprint="\${escapeHtml(sp)}" style="padding:2px 7px;height:21px;font-size:10px;\${isCurr ? 'border:1px solid #005BFF;' : ''}">\${isCurr ? '✓ ' : ''}\${escapeHtml(formatSprintWithStateText(sp))}</button>\`;
          })
          .join('')}
        \${
          !isInBacklog
            ? \`<button type="button" class="ozon-ext-btn ozon-ext-btn-negative" data-action="quick-sprint-chip" data-sprint="Бэклог FCRM" style="padding:2px 7px;height:21px;font-size:10px;" title="Удалить задачу из спринта в Бэклог FCRM">✕ Удалить из спринта</button>\`
            : ''
        }
      </div>
    \`;

    const epicKeys = Object.keys(epicMap);
    const currentEpicCleanTitle =
      (task.epicKey && epicNameByKey[task.epicKey]) ||
      (!isBogusEpicTitle(task.epicName, task.epicKey) ? task.epicName : '');
    const currentEpicStatus = task.epicKey ? epicStatusByKey[task.epicKey] || ((umbCatalog.find((item) => item.key === task.epicKey) || {}).status || '') : '';
    const obprojectSourceKey = isEpicIssueType(task.issueTypeName) ? task.key : task.epicKey;
    const currentObprojectEpic = obprojectSourceKey ? epicObprojectByFcrmEpicKey[obprojectSourceKey] : null;
    const obprojectEpicHtml = !obprojectSourceKey
      ? '<span style="color:#94A3B8;">—</span>'
      : currentObprojectEpic && currentObprojectEpic.loading && !currentObprojectEpic.key
        ? '<span style="color:#64748B;">Загружаю эпик OBPROJECT…</span>'
        : currentObprojectEpic && currentObprojectEpic.key
          ? '<a href="/browse/' + encodeURIComponent(currentObprojectEpic.key) + '" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;text-decoration:none;">' + escapeHtml(currentObprojectEpic.key) + '</a><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">' + escapeHtml(currentObprojectEpic.summary || currentObprojectEpic.key) + '</span>' + (currentObprojectEpic.status ? getStatusBadgeHtml(currentObprojectEpic.status) : '')
          : '<span style="color:#64748B;">' + (currentObprojectEpic && currentObprojectEpic.error ? 'Не удалось загрузить эпик OBPROJECT' : 'Не указан') + '</span>';

    // Фильтрация для Input-Select эпика (проект FCRM)
    const sbEpicQ = sbEpicSearchQuery.trim().toLowerCase();
    const filteredSbEpics = epicKeys.filter((k) => {
      if (!sbEpicQ) return true;
      const nm = (epicMap[k] || '').toLowerCase();
      return k.toLowerCase().includes(sbEpicQ) || nm.includes(sbEpicQ);
    });

    // Фильтрация для Input-Select компонента задачи
    const sbCompQ = sbCompSearchQuery.trim().toLowerCase();
    const filteredSbComps = taskProjComponents.filter((c) => !sbCompQ || c.toLowerCase().includes(sbCompQ));

    const umbQ = umbSearchQuery.trim().toLowerCase();
    const taskComponents = Array.isArray(task.components) ? task.components.map((c) => typeof c === 'string' ? c : c && c.name).filter(Boolean) : String(task.component || '').split(',').map((c) => c.trim()).filter((c) => c && c !== 'Без компонента');
    const matchingUmb = umbCatalog.filter((u) => !isCanceledStatus(u.status) && u.key !== task.key).filter((u) => {
      const components = Array.isArray(u.components) ? u.components : String(u.component || '').split(',').map((c) => c.trim()).filter((c) => c && c !== 'Без компонента');
      return taskComponents.length ? components.some((c) => taskComponents.includes(c)) : !components.length;
    });
    const umbByKey = new Map(matchingUmb.map((u) => [u.key, u]));
    const visibleUmb = new Set();
    const pendingUmb = matchingUmb.filter((u) => !umbQ || (u.key + ' ' + u.summary).toLowerCase().includes(umbQ)).map((u) => u.key);
    while (pendingUmb.length) { const key = pendingUmb.pop(); if (visibleUmb.has(key)) continue; visibleUmb.add(key); ((umbByKey.get(key) || {}).parents || []).forEach((parent) => { if (umbByKey.has(parent)) pendingUmb.push(parent); }); }
    const umbChildren = new Map();
    const umbRoots = [];
    matchingUmb.forEach((u) => { if (!visibleUmb.has(u.key)) return; const parents = (u.parents || []).filter((key) => key !== u.key && visibleUmb.has(key) && umbByKey.has(key)); if (!parents.length) umbRoots.push(u.key); parents.forEach((key) => { if (!umbChildren.has(key)) umbChildren.set(key, []); umbChildren.get(key).push(u.key); }); });
    const filteredUmb = [];
    const coveredUmb = new Set();
    function appendUmbTree(key, depth, ancestors) { if (ancestors.has(key)) return; const next = new Set(ancestors); next.add(key); coveredUmb.add(key); filteredUmb.push({ item: umbByKey.get(key), depth }); (umbChildren.get(key) || []).forEach((child) => appendUmbTree(child, depth + 1, next)); }
    umbRoots.forEach((key) => appendUmbTree(key, 0, new Set()));
    matchingUmb.forEach((u) => { if (visibleUmb.has(u.key) && !coveredUmb.has(u.key)) appendUmbTree(u.key, 0, new Set()); });

    const isDescCollapsed = Boolean(collapsedSidebarSections['desc']);
    const isParamsCollapsed = Boolean(collapsedSidebarSections['params']);
    const isPtCollapsed = Boolean(collapsedSidebarSections['pt']);
    const isPtQuickCollapsed = collapsedSidebarSections['pt_quick'] !== false;
    const isIpCollapsed = Boolean(collapsedSidebarSections['ip']);
    const isOtherCollapsed = Boolean(collapsedSidebarSections['other']);

    const isBlockLoadingForTask = sidebarBlockLoading && sidebarBlockLoading.taskKey === task.key;
    const isDescBlockLoading = Boolean(isBlockLoadingForTask && sidebarBlockLoading.desc);
    const isParamsBlockLoading = Boolean(isBlockLoadingForTask && sidebarBlockLoading.params);
    const isLinksBlockLoading = Boolean(isBlockLoadingForTask && sidebarBlockLoading.links);
    const isIpMetaBlockLoading = Boolean(isBlockLoadingForTask && sidebarBlockLoading.ipMeta);
    const miniBlockSpinnerHtml = '<span class="ozon-ext-spinner" style="width:11px;height:11px;border-width:1.8px;margin-left:4px;" title="Догрузка актуальных данных блока из Jira..."></span>';

    const descLinesCount = Math.max(4, Math.min(22, (task.description || '').split('\\n').length + 1));
    const sbComboItemStyle = 'padding:5px 8px;margin-bottom:2px;border-radius:6px;line-height:1.35;min-height:24px;display:flex;align-items:center;gap:6px;cursor:pointer;';

    const visiblePtLinks = (task.projectTaskLinks || []).filter((lnk) => !isCanceledStatus(lnk.status));
    const visibleIpLinks = (task.inProjectLinks || []).filter((lnk) => !isCanceledStatus(lnk.status));
    const visibleOtherLinks = task.otherLinks || [];

    const createModalHtml = issueCreateDraft ? (() => {
      const query = String(issueCreateDraft.componentQuery || '').trim().toLowerCase();
      const components = issueCreateDraft.components || [];
      const favorites = ['CS', 'CRM_BO', 'CRM_CORE', 'crm support'];
      const filtered = components.filter((component) => !query || String(component.name).toLowerCase().includes(query));
      const selected = components.find((component) => String(component.id) === String(issueCreateDraft.componentId));
      const renderComponent = (component) => '<button type="button" class="ozon-ext-create-component ' + (selected && String(selected.id) === String(component.id) ? 'active' : '') + '" data-action="pick-create-component" data-component-id="' + escapeHtml(component.id) + '">' + escapeHtml(component.name) + '</button>';
      const favoriteComponents = filtered.filter((component) => favorites.some((name) => name.toLowerCase() === String(component.name).toLowerCase()));
      const otherComponents = filtered.filter((component) => !favorites.some((name) => name.toLowerCase() === String(component.name).toLowerCase()));
      return '<div class="ozon-ext-create-overlay" data-action="close-create-issue">' +
        '<form class="ozon-ext-create-dialog" id="ozon-create-issue-form">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><div><strong>' + (issueCreateDraft.kind === 'epic' ? 'Создать тематику' : 'Создать задачу — ' + (issueCreateDraft.kind === 'front' ? 'Фронт' : 'Бэк')) + '</strong><div style="font-size:11px;color:#64748B;margin-top:3px;">Проект ' + escapeHtml(issueCreateDraft.projectKey) + '</div></div><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="close-create-issue">✕</button></div>' +
          '<label>Название<input id="ozon-create-issue-summary" type="text" value="' + escapeHtml(issueCreateDraft.summary || '') + '" placeholder="Введите название" autocomplete="off" /></label>' +
          (issueCreateDraft.kind === 'epic' ? '' : '<label>Описание<textarea id="ozon-create-issue-description" rows="4" placeholder="Введите описание задачи">' + escapeHtml(issueCreateDraft.description || '') + '</textarea></label>') +
          '<div><label>Компонент <span style="color:#64748B;font-weight:400;">' + (selected ? '· ' + escapeHtml(selected.name) : '') + '</span></label><input id="ozon-create-issue-component-search" type="search" value="' + escapeHtml(issueCreateDraft.componentQuery || '') + '" placeholder="Поиск компонента проекта ' + escapeHtml(issueCreateDraft.projectKey) + '..." autocomplete="off" /><div class="ozon-ext-create-components">' +
            (issueCreateLoading ? '<div style="padding:10px;color:#64748B;font-size:12px;">Загружаю список компонентов…</div>' : '') +
            (favoriteComponents.length ? '<div class="ozon-ext-create-caption">Быстрый доступ</div>' + favoriteComponents.map(renderComponent).join('') : '') +
            (otherComponents.length ? '<div class="ozon-ext-create-caption">Все компоненты</div>' + otherComponents.map(renderComponent).join('') : '') +
            (!filtered.length ? '<div style="padding:10px;color:#64748B;font-size:12px;">Компоненты не найдены</div>' : '') +
          '</div></div>' +
          (issueCreateDraft.kind === 'epic' ? '<div class="ozon-ext-create-note">Тип Epic, метка <code>fcrm_umb_epic</code>; поле названия эпика будет заполнено тем же названием.</div>' : '') +
          (issueCreateDraft.error ? '<div class="ozon-ext-create-error">' + escapeHtml(issueCreateDraft.error) + '</div>' : '') +
          '<div class="ozon-ext-create-actions"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="close-create-issue">Отмена</button><button type="submit" class="ozon-ext-btn" ' + (issueCreateBusy || issueCreateLoading ? 'disabled' : '') + '>' + (issueCreateLoading ? 'Загружаю…' : issueCreateBusy ? 'Создаю…' : 'Создать и связать') + '</button></div>' +
        '</form></div>';
    })() : '';
    const linkTypes = {inProject:'В проекте', projectTask:'Задача проекта', duplicates:'Дублирует', linkedTask:'Связанная задача', web:'Связанная ссылка'};
    const linkModalHtml = linkCreateDraft ? '<div class="ozon-ext-create-overlay" data-action="close-link-create"><form class="ozon-ext-create-dialog" id="ozon-link-create-form" role="dialog" aria-label="Новая связь">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><div><strong>Новая связь</strong><div class="ozon-ext-create-note">' + escapeHtml(linkTypes[linkCreateDraft.kind]) + '</div></div><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="close-link-create" aria-label="Закрыть">✕</button></div>' +
      (linkCreateDraft.kind === 'web' ? '<label>Ссылка<input id="ozon-link-create-url" type="url" placeholder="https://…" required /></label><label>Название ссылки<input id="ozon-link-create-title" type="text" placeholder="Например, обсуждение задачи" required /></label>' : '<label>Ключ задачи<input id="ozon-link-create-key" type="text" placeholder="Например, FCRM-1234" required autocomplete="off" /></label>') +
      '<div id="ozon-link-create-message" class="ozon-ext-create-error" role="alert" hidden></div><div class="ozon-ext-create-actions"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="close-link-create">Отмена</button><button type="submit" class="ozon-ext-btn">Связать</button></div></form></div>' : '';

    // Группируем задачи «В проекте» по OB (Бэкенд), OBFRONT (Фронтенд), FTD (Дизайн), FCRM
    const ipGroupsMap = {};
    (task.inProjectLinks || []).forEach((lnk, originalIdx) => {
      if (isCanceledStatus(lnk.status)) return;
      const meta = getLinkedProjectGroupMeta(lnk.key, false);
      if (!ipGroupsMap[meta.id]) {
        ipGroupsMap[meta.id] = { meta: meta, items: [] };
      }
      ipGroupsMap[meta.id].items.push({ lnk: lnk, idx: originalIdx });
    });
    const sortedIpGroups = Object.values(ipGroupsMap).sort((a, b) => a.meta.order - b.meta.order);

    return \`
      <div class="ozon-ext-resizer-bar" id="ozon-ext-sidebar-resizer" title="Потяните для изменения ширины сайдбара"></div>
      <aside class="ozon-ext-sidebar" id="ozon-ext-sidebar-panel" style="width:\${sidebarWidthCss()};">
        <div class="ozon-ext-sidebar-header">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap;">
            <a href="/browse/\${escapeHtml(task.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:13px;text-decoration:none;flex-shrink:0;">
              \${escapeHtml(task.key)}
            </a>
            <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-copy-task-link" title="Копировать ссылку и название" aria-label="Копировать ссылку и название" style="width:26px;height:26px;padding:4px;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg></button>
            <span style="color:#64748B;font-size:10px;white-space:nowrap;" title="Создана: \${escapeHtml(task.createdAt || '—')}">Создана: \${escapeHtml(task.createdAt || '—')}</span>
            <span class="ozon-person-line ozon-sb-author"><span>Автор</span>\${jiraPeople.badge(task.author)}\${jiraPeople.copyButton(task.author)}</span>
            \${getIssueTypeBadgeHtml(currentIssueType, task.issueTypeIconUrl)}
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
            \${nativeBoardButton()}
            <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-sidebar-expand" title="\${sidebarExpandTitle()}" aria-label="Развёрнутый сайдбар" aria-pressed="\${sidebarExpanded}">\${expandCornersIcon(sidebarExpanded)}</button>
            <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-sidebar-refresh" title="Обновить все" aria-label="Обновить все">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-3L4 10"/><path d="M4 4v6h6"/><path d="M4 13a8 8 0 0 0 14.9 3L20 14"/><path d="M20 20v-6h-6"/></svg>
            </button>
            <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-ext-sidebar-close" title="Закрыть сайдбар">
              ✕
            </button>
          </div>
            <div class="ozon-ext-title-line">
              <input type="text" aria-label="Название задачи" id="ozon-sb-summary" value="\${escapeHtml(sidebarDraft(task.key).summary ?? task.summary)}" style="flex:1;font-weight:600;font-size:12.5px;" />
              <button type="button" class="ozon-ext-btn" id="ozon-sb-save-summary" title="Сохранить название задачи" \${sidebarDraft(task.key).summary === undefined ? 'style="display:none" disabled' : ''}>Сохранить название</button>
            </div>

        </div>

        <div class="ozon-ext-sidebar-body">
<div class="ozon-ext-workflow"><div class="ozon-ext-workflow-current"><span class="ozon-ext-workflow-label">Статус</span>\${getStatusBadgeHtml(task.status)}</div>
\${taskTransitions.length ? '<span class="ozon-ext-workflow-label">Перевести в:</span>' : ''}\${transitionsChipsHtml}</div>
          <!-- АККОРДЕОН 2: ПАРАМЕТРЫ ЗАДАЧИ -->
          <div class="ozon-ext-section-card" id="ozon-sb-params-card">
            <div class="ozon-ext-section-head \${isParamsCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="params">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isParamsCollapsed ? '▾' : '▾'}</span>
                <span>Атрибуты задачи</span>
                \${isParamsBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              \${sidebarRefreshButton(task.key, 'params')}
            </div>
            \${
              !isParamsCollapsed
                ? \`<div style="padding:10px 12px;" class="ozon-ext-field-grid">
                    <!-- Тип задачи (доступный в проекте FCRM) -->
                    <div class="ozon-ext-field-label">Тип задачи</div>
                    <div style="display:flex;align-items:center;gap:7px;">
                      \${renderSearchSelect('sidebar-issuetype', currentIssueType, issueTypeSearchOptions, 'Поиск типа задачи...')}
                    </div>

                    <!-- Приоритет со стандартной SVG-иконкой Jira -->
                    <div class="ozon-ext-field-label">Приоритет</div>
                    <div style="display:flex;align-items:center;gap:7px;">
                      <button type="button" class="ozon-ext-sb-combo-trigger ozon-sb-priority-trigger" data-priority-key="\${escapeHtml(task.key)}" aria-haspopup="dialog" aria-label="Изменить приоритет \${escapeHtml(task.key)}">\${getJiraPriorityIconSvg(task.priority)}<span>\${escapeHtml(task.priority || 'Не указан')}</span><span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></button>
                    </div>

                    <!-- Спринт + быстрые чипсы спринтов доски FCRM и кнопка «Удалить из спринта» -->
                    <div class="ozon-ext-field-label">Спринт</div>
                    <div>
                      \${renderSearchSelect('sidebar-sprint', task.sprint, sidebarSprintSearchOptions, 'Поиск спринта...')}
                    </div>

                    <!-- Компонент (Input-Select с поиском по компонентам проекта задачи) -->
                    <div class="ozon-ext-field-label">Компонент</div>
                    <div class="ozon-ext-sb-combo">
                      <div class="ozon-ext-sb-combo-trigger" id="ozon-sb-comp-trigger" title="Нажмите для поиска компонента проекта \${escapeHtml(taskProjKey)}">
                        <span style="font-weight:600;color:#071026;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escapeHtml(task.component || 'Без компонента')}</span>
                        <span style="color:#64748B;font-size:10px;flex-shrink:0;">⌕ \${escapeHtml(taskProjKey)} ▾</span>
                      </div>
                      \${
                        sbCompComboOpen
                          ? \`<div class="ozon-ext-combo-popover" style="width:100%;padding:6px;display:flex;flex-direction:column;gap:5px;">
                               <input type="search" id="ozon-sb-comp-search" placeholder="Поиск компонента в проекте \${escapeHtml(taskProjKey)}..." value="\${escapeHtml(sbCompSearchQuery)}" autocomplete="off" />
                               <div class="ozon-ext-combo-list" id="ozon-sb-comp-list" style="display:flex;flex-direction:column;gap:2px;">
                                 \${
                                   filteredSbComps.length > 0
                                     ? filteredSbComps
                                         .map(
                                           (c) => \`
                                             <div class="ozon-ext-combo-item \${c === task.component ? 'active' : ''}" style="\${sbComboItemStyle}" data-action="pick-sb-comp" data-comp="\${escapeHtml(c)}">
                                               <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;font-weight:\${c === task.component ? '700' : '500'};">\${escapeHtml(c)}</span>
                                             </div>
                                           \`
                                         )
                                         .join('')
                                     : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Компоненты не найдены</div>'
                                 }
                               </div>
                             </div>\`
                          : ''
                      }
                    </div>

                    <!-- Эпик (Input-Select с поиском СТРОГО по эпикам проекта FCRM + сохранение в Jira) -->
                    <div class="ozon-ext-field-label">Epic Link</div>
                    <div style="display:flex;flex-direction:column;gap:5px;">
                      <div class="ozon-ext-sb-combo">
                        <div class="ozon-ext-sb-combo-trigger" id="ozon-sb-epic-trigger" tabindex="0" role="button" aria-label="Изменить Epic Link" title="Изменить Epic Link">
                          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;min-width:0;">
                            \${
                              task.epicKey
                                ? \`<a href="/browse/\${encodeURIComponent(task.epicKey)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" class="ozon-mono" style="color:#005BFF;font-weight:700;flex-shrink:0;text-decoration:none;">\${escapeHtml(task.epicKey)}</a>
                                   <span style="color:#071026;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escapeHtml(currentEpicCleanTitle || task.epicKey)}</span>\`
                                : '<span style="color:#94A3B8;">Без эпика</span>'
                            }
                          </div>
                          <span style="display:flex;align-items:center;gap:5px;flex-shrink:0;">\${currentEpicStatus ? getStatusBadgeHtml(currentEpicStatus) : ''}<span style="color:#64748B;font-size:10px;">⌕ ▾</span></span>
                        </div>
                        \${
                          sbEpicComboOpen
                            ? \`<div class="ozon-ext-combo-popover" style="width:100%;padding:6px;display:flex;flex-direction:column;gap:5px;">
                                 <input type="search" id="ozon-sb-epic-search" placeholder="Поиск эпика в проекте FCRM (код или название)..." value="\${escapeHtml(sbEpicSearchQuery)}" autocomplete="off" />
                                 <div class="ozon-ext-combo-list" id="ozon-sb-epic-list" style="display:flex;flex-direction:column;gap:2px;">
                                   <div class="ozon-ext-combo-item \${!task.epicKey ? 'active' : ''}" style="\${sbComboItemStyle}" data-action="pick-sb-epic" data-epic-key="" data-epic-name="">
                                     <span style="color:#94A3B8;">✕ Без эпика (отвязать эпик)</span>
                                   </div>
                                   \${
                                     filteredSbEpics.length > 0
                                       ? filteredSbEpics
                                           .slice(0, 50)
                                           .map(
                                             (k) => \`
                                               <div class="ozon-ext-combo-item ozon-ext-epic-option \${k === task.epicKey ? 'active' : ''}" style="\${sbComboItemStyle}" data-action="pick-sb-epic" data-epic-key="\${escapeHtml(k)}" data-epic-name="\${escapeHtml(epicMap[k] || '')}">
                                                 \${renderEpicOption(k, epicMap[k] || '')}
                                               </div>
                                             \`
                                           )
                                           .join('')
                                       : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Эпики FCRM не найдены — продолжайте ввод для поиска в Jira</div>'
                                   }
                                 </div>
                               </div>\`
                            : ''
                        }
                      </div>
                    </div>

                    <div class="ozon-ext-field-label">Эпик OBPROJECT</div>
                    <div class="ozon-ext-obproject-value" style="display:flex;align-items:center;gap:7px;min-width:0;min-height:30px;width:100%;">\${obprojectEpicHtml}</div>

                    <div class="ozon-ext-field-label">Метки</div>
                    <div class="ozon-sb-labels" id="ozon-sb-labels">\${(task.labels || []).length ? task.labels.map(label => '<span class="ozon-ext-badge ozon-ext-badge-todo ozon-sb-label-chip">' + escapeHtml(label) + '<button type="button" class="ozon-sb-label-remove" data-sb-remove-label="' + escapeHtml(label) + '" aria-label="Удалить метку ' + escapeHtml(label) + '">×</button></span>').join('') : '<span style="color:#64748B;">Нет меток</span>'}<form class="ozon-sb-label-form" id="ozon-sb-label-form"><input id="ozon-sb-label-input" type="text" aria-label="Новая метка" placeholder="Новая метка" autocomplete="off" /><button type="submit" class="ozon-ext-btn ozon-ext-btn-surface">Добавить</button></form><span class="ozon-sb-label-error" id="ozon-sb-label-error" role="alert" hidden></span></div>

                    <!-- Исполнитель с живым поиском по пользователям Jira (оформлено аналогично Заказчик/Owner) -->
                    <div class="ozon-ext-field-label">Исполнитель</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                      <div class="ozon-person-line ozon-person-input">
                        \${jiraPeople.avatar(task.assignee)}
                        <input type="search" id="ozon-sb-user-search" value="\${escapeHtml(task.assignee.name)}" placeholder="🔍 Поиск Исполнителя по ФИО или логину..." style="flex:1;" />
                        \${jiraPeople.copyButton(task.assignee)}
                      </div>
                      <div id="ozon-sb-user-results">
                        \${renderUserSearchResultsHtml(searchedUsersResults)}
                      </div>
                    </div>

                    <!-- Заказчик/Owner с живым поиском по пользователям Jira -->
                    <div class="ozon-ext-field-label">Заказчик/Owner</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                      <div style="display:flex;gap:5px;">
                        <input type="search" id="ozon-sb-customer" value="\${escapeHtml(task.customer.name)}" placeholder="🔍 Поиск Заказчик/Owner по ФИО или логину..." style="flex:1;" />
                      </div>
                      <div id="ozon-sb-customer-results">
                        \${renderCustomerSearchResultsHtml(searchedCustomerResults)}
                      </div>
                    </div>

                  </div>\`
                : ''
            }
          <!-- АККОРДЕОН 1: ОПИСАНИЕ ЗАДАЧИ (с поддержкой форматирования Jira Wiki / Markdown и режимом редактирования) -->
          <div class="ozon-ext-section-card" id="ozon-sb-description-card">
            <div class="ozon-ext-section-head \${isDescCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="desc">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isDescCollapsed ? '▾' : '▾'}</span>
                <span>Описание задачи</span>
                \${isDescBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              <div style="display:flex;align-items:center;gap:5px;" onclick="event.stopPropagation();">
                <button type="button" class="ozon-ext-btn \${isEditingDescription ? '' : 'ozon-ext-btn-surface'}" id="ozon-sb-toggle-edit-desc" style="height:21px;padding:1px 8px;font-size:10px;">
                  \${isEditingDescription ? '👁 Просмотр' : '✎ Редактировать'}
                </button>
                \${
                  isEditingDescription
                    ? '<button type="button" class="ozon-ext-btn" id="ozon-sb-save-description" style="height:21px;padding:1px 8px;font-size:10px;">Сохранить описание</button>'
                    : ''
                }
              </div>
            </div>
            \${
              !isDescCollapsed
                ? isEditingDescription
                  ? \`<div style="padding:8px 10px;display:flex;flex-direction:column;gap:6px;">
                       <textarea id="ozon-sb-description" rows="\${descLinesCount}" placeholder="Введите текст описания (поддерживается разметка *Заголовок*, h2., списки, ссылки)..." style="width:100%;resize:vertical;min-height:90px;max-height:680px;overflow-y:auto;font-size:12px;line-height:1.45;">\${escapeHtml(sidebarDraft(task.key).description ?? task.description ?? '')}</textarea>
                       <div style="display:flex;justify-content:flex-end;gap:6px;">
                         <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-sb-cancel-description" style="height:23px;padding:2px 10px;font-size:10.5px;">Отмена</button>
                         <button type="button" class="ozon-ext-btn" id="ozon-sb-save-description-bottom" style="height:23px;padding:2px 10px;font-size:10.5px;">✓ Сохранить в Jira</button>
                       </div>
                     </div>\`
                  : isDescBlockLoading && !task.description
                  ? \`<div style="padding:10px 12px;display:flex;flex-direction:column;gap:6px;">
                       <div class="ozon-ext-skeleton" style="width:45%;height:12px;"></div>
                       <div class="ozon-ext-skeleton" style="width:100%;height:48px;border-radius:6px;"></div>
                     </div>\`
                  : \`<div class="ozon-sb-description-preview \${(task.description || '').length > 500 && !expandedSidebarDescriptions.has(task.key) ? 'is-compact' : ''}" style="padding:10px 12px;" id="ozon-sb-desc-preview" title="Двойной клик — перейти к редактированию описания">
                       \${formatJiraDescriptionHtml(task.description)}
                     </div>\${(task.description || '').length > 500 ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-sb-description-more" data-action="toggle-description-length" aria-expanded="' + expandedSidebarDescriptions.has(task.key) + '">' + (expandedSidebarDescriptions.has(task.key) ? 'Свернуть описание' : 'Показать описание полностью') + '</button>' : ''}\`
                : ''
            }
          </div>

          </div>

          \${taskDetailsSidebar.commentsHtml(task.key)}

          <!-- АККОРДЕОН 3: СВЯЗИ «ЗАДАЧА ПРОЕКТА» -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isPtCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="pt">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isPtCollapsed ? '▾' : '▾'}</span>
                <span>Связи: «Задача проекта» (\${visiblePtLinks.length})</span>
                \${visiblePtLinks.length === 0 ? getMissingProjectTaskWarnSvg() : ''}
                \${isLinksBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-sb-link-add" data-action="start-create-link" data-link-kind="projectTask">+ Связать</button>
            <details class="ozon-sidebar-more" onclick="event.stopPropagation()"><summary aria-label="Другие действия со связями">⋯</summary><div class="ozon-sidebar-more-menu">
            <button type="button" class="ozon-ext-btn ozon-ext-inner-ctrl" data-action="generate-links" data-task-keys="\${escapeHtml(task.key)}" \${generatingLinkKeys.has(task.key) ? 'disabled aria-busy="true"' : ''} aria-label="Сгенерировать связи" title="Сгенерировать связи">\${generatingLinkKeys.has(task.key) ? '<span class="ozon-ext-spinner"></span>' : generationIconHtml()} Сгенерировать связи</button>
              \${sidebarRefreshButton(task.key, 'pt')}
              <a href="/issues/?jql=labels%20%3D%20fcrm_umb_epic" target="_blank" class="ozon-mono" onclick="event.stopPropagation();" style="color:#005BFF;font-size:10.5px;text-decoration:none;">
                JQL: fcrm_umb_epic ↗
              </a></div></details>
              </div>
            </div>
            \${
              !isPtCollapsed
                ? \`<div>
                    \${
                      visiblePtLinks.length > 0
                        ? visiblePtLinks
                            .map((lnk, ptIdx) => {
                              const gMeta = getLinkedProjectGroupMeta(lnk.key, true);
                              return \`
                                <div class="ozon-ext-link-compact-row ozon-ext-pt-level2\${reviewRowClass(lnk.key,lnk.status)}">
                                  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                                    <div style="display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0;">
                                      <span class="ozon-mono" style="color:#94A3B8;font-weight:700;font-size:11px;">↳</span>
                                      <span class="ozon-ext-link-icon-box" style="background:\${gMeta.bg};color:\${gMeta.color};">\${gMeta.iconSvg}</span>
                                      <a href="/browse/\${escapeHtml(lnk.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(lnk.key)}</a>
                                      \${getIssueTypeBadgeHtml(lnk.issueTypeName, lnk.issueTypeIconUrl)}
                                      <button type="button" class="ozon-dev-priority-edit ozon-ext-inner-ctrl" data-priority-key="\${escapeHtml(lnk.key)}" title="Изменить приоритет: \${escapeHtml(lnk.priority || 'Не указан')}" aria-label="Изменить приоритет \${escapeHtml(lnk.key)}">\${getJiraPriorityIconSvg(lnk.priority || 'Medium')}</button>
                                      <span style="font-weight:600;color:#071026;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${escapeHtml(lnk.summary)}">\${escapeHtml(lnk.summary)}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                      \${getStatusBadgeHtml(lnk.status)}
                                      \${renderLinkActions(lnk, 'projectTask')}
                                    </div>
                                  </div>
                                </div>
                              \`;
                            })
                            .join('')
                        : '<div style="padding:8px 12px 8px 26px;border-left:3px solid #F59E0B;color:#D97706;background:#FFFBEB;font-size:11px;font-weight:600;display:flex;align-items:center;gap:6px;">' +
                          getMissingProjectTaskWarnSvg() +
                          '<span>Внимание: у задачи нет привязанной «Задачи проекта» (labels = fcrm_umb_epic)</span></div>'
                    }

                    <!-- Быстрый выбор из фильтра labels = fcrm_umb_epic (по умолчанию свёрнут под аккордеон, Уровень 2 -> Уровень 3) -->
                    <div style="border-top:1px solid #E2E8F0;background:#F8FAFC;">
                      <div class="ozon-ext-link-group-header" data-action="toggle-sb-section" data-sec="pt_quick">
                        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#334155;">
                          <span style="color:#005BFF;font-size:9.5px;">\${isPtQuickCollapsed ? '▾' : '▾'}</span>
                          <span>Быстрый выбор (\${filteredUmb.length})</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex:0 0 auto;">
                          <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="start-create-issue" data-create-kind="epic" style="height:21px;padding:1px 7px;font-size:10px;">+ Создать тематику</button>
                          <span style="font-size:10px;color:#64748B;">\${isPtQuickCollapsed ? 'Развернуть' : 'Свернуть'}</span>
                        </div>
                      </div>
                      \${
                        !isPtQuickCollapsed
                          ? \`<div style="padding:7px 12px 7px 42px;border-top:1px solid #EEF2F6;border-left:3px solid #E2E8F0;background:#FFFFFF;">
                               <input type="search" id="ozon-sb-umb-search" value="\${escapeHtml(umbSearchQuery)}" placeholder="Поиск по ключу или названию в fcrm_umb_epic..." style="width:100%;margin-bottom:5px;background:#F8FAFC !important;height:24px !important;" />
                               <div style="max-height:135px;overflow-y:auto;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:7px;">
                                 \${filteredUmb
                                   .map(({item: u, depth}) => {
                                     const alreadyLinked = visiblePtLinks.some((l) => l.key === u.key);
                                     return \`
                                       <div style="padding:4px 8px 4px \${8 + Math.min(depth, 8) * 18}px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;">
                                         <a href="/browse/\${encodeURIComponent(u.key)}" target="_blank" rel="noopener noreferrer" style="display:block;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none;">
                                           <strong class="ozon-mono" style="color:#005BFF;margin-right:5px;">\${escapeHtml(u.key)}</strong>
                                           <span style="color:#071026;">\${depth ? '↳ ' : ''}\${escapeHtml(u.summary)}</span> <span class="ozon-ext-badge ozon-ext-badge-todo">\${escapeHtml(u.component || 'Без компонента')}</span>
                                         </a>
                                         <button type="button" class="ozon-ext-btn" data-action="toggle-umb-link" data-umb-key="\${escapeHtml(u.key)}" style="padding:1px 7px;height:20px;font-size:10px;flex-shrink:0;">
                                           \${alreadyLinked ? '✓ Привязана' : '+ Выбрать'}
                                         </button>
                                       </div>
                                     \`;
                                   })
                                   .join('') || '<div style="padding:10px;color:#64748B;">Для компонента задачи тематики не найдены</div>'}
                               </div>
                             </div>\`
                          : ''
                      }
                    </div>
                  </div>\`
                : ''
            }
          </div>

          <!-- АККОРДЕОН 4: СВЯЗИ «В ПРОЕКТЕ» (Чёткая лесенка отступов: Аккордеон (12px) → Группа направления (26px) → Задача (42px) → Поля задачи (64px)) -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isIpCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="ip">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isIpCollapsed ? '▾' : '▾'}</span>
                <span>Связи: «В проекте» (\${visibleIpLinks.length})</span>
                \${isLinksBlockLoading || isIpMetaBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex:0 0 auto;">
                <span style="font-size:10px;color:#64748B;">\${isLinksBlockLoading ? 'Обновление связей...' : isIpMetaBlockLoading ? 'Догрузка спринтов/компонентов...' : ''}</span>
                <details class="ozon-sidebar-more" onclick="event.stopPropagation()"><summary aria-label="Другие действия со связями">⋯</summary><div class="ozon-sidebar-more-menu">\${sidebarRefreshButton(task.key, 'ip')}<span style="color:#64748b">OB · OBFRONT · FTD</span></div></details>
                <button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-sb-link-add" data-action="start-create-link" data-link-kind="inProject">+ Связать</button>
                <div style="position:relative;">
                  <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="toggle-create-in-project-menu" style="height:24px;padding:2px 8px;font-size:10px;">+ Создать</button>
                  \${createInProjectMenuOpen ? '<div class="ozon-ext-create-menu"><button type="button" data-action="start-create-issue" data-create-kind="front">Фронт · OBFRONT</button><button type="button" data-action="start-create-issue" data-create-kind="back">Бэк · OB</button><button type="button" data-action="start-create-issue" data-create-kind="design">Дизайн · FTD</button><button type="button" data-action="start-create-link" data-link-kind="inProject">Новая связь</button></div>' : ''}
                </div>
              </div>
            </div>
            \${
              !isIpCollapsed
                ? \`<div>
                    \${
                      sortedIpGroups.length > 0
                        ? sortedIpGroups
                            .map((grp) => {
                              const grpCollapsed = false;
                              return \`
                                <div class="ozon-ext-link-group-header" data-action="toggle-ip-group" data-grp-id="\${escapeHtml(grp.meta.id)}">
                                  <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="color:#005BFF;font-size:9px;">\${grpCollapsed ? '▾' : '▾'}</span>
                                    <span class="ozon-ext-link-icon-box" style="background:\${grp.meta.bg};color:\${grp.meta.color};">\${grp.meta.iconSvg}</span>
                                    <strong style="font-size:11px;color:#071026;">\${escapeHtml(grp.meta.label)}</strong>
                                    <span class="ozon-ext-badge ozon-ext-badge-progress ozon-mono" style="font-size:9.5px;padding:0 5px;">\${grp.items.length}</span>
                                  </div>
                                  <span style="font-size:10px;color:#64748B;">\${grpCollapsed ? 'Развернуть' : 'Свернуть'}</span>
                                </div>
                                \${
                                  !grpCollapsed
                                    ? grp.items
                                        .map(({ lnk, idx: lIdx }) => {
                                          const lnkProjKey = getIssueProjectKey(lnk.key);
                                          const realCompVal = (lnk.component && String(lnk.component).trim()) || 'Без компонента';
                                          const realSprintVal = (lnk.sprint && String(lnk.sprint).trim()) || 'Не в спринте';
                                          const projComps = getComponentsForProject(lnkProjKey);
                                          const linkCompOptionList = Array.from(new Set([realCompVal, ...projComps]));
                                          const linkSprintOptionList = getSprintsForLinkedIssue(lnk).slice().sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'base' }));
                                          const filteredLinkSprints = linkSprintOptionList.filter(sp => !sbIpSprintSearchQuery.trim() || sp.toLowerCase().includes(sbIpSprintSearchQuery.trim().toLowerCase()));
                                          const isThisIpCompOpen = sbIpCompOpenIdx === lIdx;
                                          const ipCompQ = sbIpCompSearchQuery.trim().toLowerCase();
                                          const filteredIpComps = linkCompOptionList.filter((c) => !ipCompQ || c.toLowerCase().includes(ipCompQ));
                                          const lnkEpicClean =
                                            (lnk.epicKey && epicNameByKey[lnk.epicKey]) ||
                                            (!isBogusEpicTitle(lnk.epicName, lnk.epicKey) ? lnk.epicName : '');
                                          const designRelation = frontDesignLinksByKey[lnk.key];
                                          const designCandidates = visibleIpLinks.filter((candidate) => /^FTD-/i.test(String(candidate.key || '')));
                                          const linkedDesigns = designCandidates.filter(candidate => designRelation?.keys?.includes(candidate.key));
                                          const designColor = !designRelation?.keys?.length ? 'absent' : linkedDesigns.length === designRelation.keys.length && linkedDesigns.every(candidate => /^(готово|закрыт[ао]?|done|closed)$/i.test(candidate.status || '')) ? 'done' : 'active';
                                          const designLabel = designRelation?.loading ? 'Проверяю связь с дизайном' : designRelation?.error ? 'Не удалось проверить связь с дизайном' : designRelation?.keys?.length ? 'Дизайн: ' + designRelation.keys.join(', ') : 'Нет связи с дизайном';
                                          const designIcon = /^OBFRONT-/i.test(String(lnk.key || '')) ? '<button type="button" class="ozon-dev-indicator ' + designColor + '" data-action="toggle-front-design" aria-label="' + escapeHtml(designLabel) + '" title="' + escapeHtml(designLabel) + '" aria-expanded="false" style="border:0;cursor:pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20c2 0 2-2 1-3s-1-3 1-3h2a6 6 0 0 0 6-6c0-4-5-8-10-8Z"/><circle cx="7" cy="10" r="1"/><circle cx="10" cy="6" r="1"/><circle cx="16" cy="7" r="1"/></svg></button>' : '';
                                          const designLinkHtml = /^OBFRONT-/i.test(String(lnk.key || ''))
                                            ? '<div data-front-design-details hidden style="padding:2px 0 2px 28px;font-size:10px;color:#64748B;">' +
                                              (designRelation && designRelation.loading ? 'Проверяю связь с дизайном…' :
                                                designRelation && designRelation.keys.length ? 'Дизайн: ' + designRelation.keys.map((key) => '<a href="/browse/' + encodeURIComponent(key) + '" target="_blank" style="color:#005BFF;text-decoration:none;font-weight:650;">' + escapeHtml(key) + '</a>').join(', ') :
                                                  designCandidates.length ? 'Нет связи с дизайном · ' + designCandidates.map((candidate) => '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="link-front-design" data-front-key="' + escapeHtml(lnk.key) + '" data-design-key="' + escapeHtml(candidate.key) + '" style="height:19px;padding:1px 6px;font-size:9.5px;margin-left:3px;">Связать ' + escapeHtml(candidate.key) + '</button>').join('') :
                                                    designRelation && designRelation.error ? 'Не удалось проверить связь с дизайном' : 'Задача дизайна FTD пока не привязана к этой FCRM-задаче') +
                                              '</div>' : '';

                                          return \`
                                            <div class="ozon-ext-link-compact-row\${reviewRowClass(lnk.key,lnk.status)}">
                                              <div style="display:flex;align-items:center;justify-content:space-between;gap:5px;">
                                                <div style="display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0;flex:1;">
                                                  <span class="ozon-mono" style="color:#94A3B8;font-weight:700;font-size:11px;flex-shrink:0;">↳</span>
                                                  <span class="ozon-ext-link-icon-box" style="background:\${grp.meta.bg};color:\${grp.meta.color};">\${grp.meta.iconSvg}</span>
                                                  <a href="/browse/\${escapeHtml(lnk.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(lnk.key)}</a>
                                                  \${getIssueTypeBadgeHtml(lnk.issueTypeName, lnk.issueTypeIconUrl)}
                                                  <button type="button" class="ozon-dev-priority-edit ozon-ext-inner-ctrl" data-priority-key="\${escapeHtml(lnk.key)}" title="Изменить приоритет: \${escapeHtml(lnk.priority || 'Не указан')}" aria-label="Изменить приоритет \${escapeHtml(lnk.key)}">\${getJiraPriorityIconSvg(lnk.priority || 'Medium')}</button>
                                                  \${lnk.storyPoints != null ? '<span class="ozon-ext-badge ozon-ext-badge-todo" title="Story Points">' + escapeHtml(String(lnk.storyPoints)) + ' SP</span>' : ''}
                                                  \${designIcon}
                                                  <span class="ozon-ip-summary" style="font-weight:600;color:#071026;font-size:11px;" title="\${escapeHtml(lnk.summary)}">\${escapeHtml(lnk.summary)}</span>
                                                  \${
                                                    lnk.epicKey
                                                      ? \`<span class="ozon-mono" style="font-size:9.5px;color:#005BFF;background:#E5F0FF;padding:0 4px;border-radius:4px;flex-shrink:0;" title="Эпик: \${escapeHtml(lnk.epicKey + (lnkEpicClean ? ' — ' + lnkEpicClean : ''))}">\${escapeHtml(lnk.epicKey)}</span>\`
                                                      : ''
                                                  }
                                                </div>
                                                <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                                  \${getStatusBadgeHtml(lnk.status)}
                                                  \${renderLinkActions(lnk, 'inProject')}
                                                </div>
                                              </div>
                                              \${designLinkHtml}

                                              <!-- Уровень 4: Компактная строка Компонента и Спринта (с дополнительным отступом вправо под заголовком задачи) -->
                                              <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;align-items:center;padding-left:22px;">
                                                <div class="ozon-ext-sb-combo">
                                                  <button type="button" class="ozon-ext-search-select-trigger" aria-haspopup="dialog" aria-label="Изменить компонент \${escapeHtml(lnk.key)}. Сейчас: \${escapeHtml(realCompVal)}" data-action="open-ip-comp-combo" data-link-idx="\${lIdx}" data-proj="\${escapeHtml(lnkProjKey)}" title="Компонент: \${escapeHtml(realCompVal)}">
                                                    <span class="ozon-ip-field"><span class="ozon-ip-field-value">\${escapeHtml(realCompVal)}</span></span>
                                                    <span class="ozon-ext-search-select-caret" aria-hidden="true"></span>
                                                  </button>
                                                  \${
                                                    isThisIpCompOpen
                                                      ? \`<div class="ozon-ext-combo-popover" style="width:100%;min-width:210px;">
                                                           <input type="search" id="ozon-sb-ip-comp-search" placeholder="Поиск компонента в проекте \${escapeHtml(lnkProjKey)}..." value="\${escapeHtml(sbIpCompSearchQuery)}" autocomplete="off" />
                                                           <div class="ozon-ext-combo-list" id="ozon-sb-ip-comp-list">
                                                             \${
                                                               filteredIpComps.length > 0
                                                                 ? filteredIpComps
                                                                     .map(
                                                                       (c) => \`
                                                                         <div class="ozon-ext-combo-item \${c === realCompVal ? 'active' : ''}" data-action="pick-ip-comp" data-link-idx="\${lIdx}" data-link-key="\${escapeHtml(lnk.key)}" data-comp="\${escapeHtml(c)}">
                                                                           <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;">\${escapeHtml(c)}</span>
                                                                         </div>
                                                                       \`
                                                                     )
                                                                     .join('')
                                                                 : '<div style="padding:5px 8px;color:#64748B;font-size:10.5px;">Компоненты не найдены</div>'
                                                             }
                                                           </div>
                                                         </div>\`
                                                      : ''
                                                  }
                                                </div>
                                                <div class="ozon-ext-sb-combo" style="position:relative;min-width:0;">
                                                  <button type="button" class="ozon-ext-search-select-trigger" aria-haspopup="dialog" aria-label="Изменить спринт \${escapeHtml(lnk.key)}. Сейчас: \${escapeHtml(formatSprintWithStateText(realSprintVal))}" data-action="open-ip-sprint-combo" data-link-idx="\${lIdx}" title="Спринт: \${escapeHtml(realSprintVal)}">
                                                    <span class="ozon-ip-field"><span class="ozon-ip-field-value">\${escapeHtml(realSprintVal.replace(/\\s*\\((Активный|Будущий|Прошедший)\\)$/, ""))}</span>\${getSprintStateBadgeHtml(realSprintVal)}</span>
                                                    <span class="ozon-ext-search-select-caret" aria-hidden="true"></span>
                                                  </button>
                                                  \${sbIpSprintOpenIdx === lIdx ? '<div class="ozon-ext-combo-popover" style="width:100%;min-width:240px;max-height:280px;overflow:auto;"><input type="search" id="ozon-sb-ip-sprint-search" placeholder="Поиск спринта..." value="' + escapeHtml(sbIpSprintSearchQuery) + '" autocomplete="off" />' + (ipSprintLoadProgress[lnk.key] ? '<div class="ozon-ext-sprint-load">Загружаю...<div class="ozon-ext-sprint-load-track"><div class="ozon-ext-sprint-load-fill" style="--sprint-load:' + ipSprintLoadProgress[lnk.key] + '%"></div></div></div>' : '') + (filteredLinkSprints.length ? filteredLinkSprints.map(sp => '<div class="ozon-ext-combo-item ' + (sp === realSprintVal ? 'active' : '') + '" data-action="pick-ip-sprint" data-link-idx="' + lIdx + '" data-link-key="' + escapeHtml(lnk.key) + '" data-sprint="' + escapeHtml(sp) + '"><span>' + escapeHtml(sp.replace(/\\s*\\((Активный|Будущий|Прошедший)\\)$/, '')) + '</span>' + getSprintStateBadgeHtml(sp) + '</div>').join('') : '<div style="padding:6px 8px;color:#64748b;font-size:11px">Спринты не найдены</div>') + '</div>' : ''}
                                                </div>
                                              </div>
                                            </div>
                                          \`;
                                        })
                                        .join('')
                                    : ''
                                }
                              \`;
                            })
                            .join('')
                        : '<div style="padding:10px 12px 10px 26px;color:#64748B;font-size:11.5px;">Нет связанных задач в блоке «В проекте»</div>'
                    }

                  </div>\`
                : ''
            }
          </div>
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isOtherCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="other">
              <div style="display:flex;align-items:center;gap:6px;"><span style="color:#005BFF;font-size:10px;">▾</span><span>Другие связи (\${visibleOtherLinks.length})</span></div>
              <div style="position:relative;"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="toggle-other-link-menu" style="height:24px;padding:2px 8px;font-size:10px;">+ Связать</button>\${otherLinkMenuOpen ? '<div class="ozon-ext-create-menu ozon-ext-other-link-menu">' + Object.entries(linkTypes).map(([kind,label]) => '<button type="button" data-action="start-create-link" data-link-kind="' + kind + '">' + label + '</button>').join('') + '</div>' : ''}</div>
            </div>
            \${!isOtherCollapsed ? (visibleOtherLinks.length
              ? '<div style="padding:6px 12px;">' + visibleOtherLinks.map((link) => {
                  const relation = link.linkDirection || link.linkType || (link.url ? 'Веб-ссылка' : 'Связанная задача');
                  const isIssue = /^[A-Z][A-Z0-9]*-[0-9]+$/i.test(String(link.key || ''));
                  const status = isIssue ? getStatusBadgeHtml(link.status || 'Статус недоступен') : '';
                  const target = link.url || ('/browse/' + encodeURIComponent(link.key));
                  const moveButton = isIssue ? renderLinkActions(link, '') : (link.id && /^remote-\\d+$/.test(String(link.id)) ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-negative" data-action="delete-remote-link" data-remote-id="' + escapeHtml(String(link.id).slice(7)) + '" aria-label="Удалить веб-ссылку">✕</button>' : '');
                  return '<div class="' + reviewRowClass(link.key,link.status) + '" style="display:flex;align-items:center;gap:6px;padding:6px 2px;border-bottom:1px solid #EEF2F6;min-width:0;"><span style="font-size:10px;color:#64748B;flex:0 0 auto;">' + escapeHtml(relation) + '</span>' + (isIssue ? '<a class="ozon-mono" href="' + escapeHtml(target) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(link.key) + '</a><span class="ozon-other-summary" style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(link.summary || link.key) + '</span>' : '<a href="' + escapeHtml(target) + '" target="_blank" rel="noopener noreferrer" style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(link.summary || link.key) + '</a>') + status + moveButton + '</div>';
                }).join('') + '</div>'
              : '<div style="padding:10px 12px;color:#64748B;font-size:11.5px;">Других связей нет</div>') : ''}
          </div>
          \${renderTicketSearchSection(task.key, 'fcrm')}
          \${renderTicketSearchSection(task.key, 'threads')}
          \${createModalHtml}
          \${linkModalHtml}
        </div>
      </aside>
    \`;
  }

  function matchesSprintState(spState) {
      if ((filterSprintState === 'open_future' || filterSprintState === 'open_future_backlog') && spState === 'CLOSED') return false;
      if (filterSprintState === 'open_future' && spState === 'BACKLOG') return false;
      if (filterSprintState === 'ACTIVE' && spState !== 'ACTIVE') return false;
      if (filterSprintState === 'FUTURE' && spState !== 'FUTURE') return false;
      if (filterSprintState === 'CLOSED' && spState !== 'CLOSED') return false;
      if (filterSprintState === 'BACKLOG' && spState !== 'BACKLOG') return false;
    return true;
  }

  function isDoneTask(task) {
    return doneByStatus.get(task.status) ?? /^(done|closed|resolved|готово|выполнено|закрыт|закрыто|закрыта|завершено)$/i.test(task.status);
  }

  function doneToggleLabel(count) {
    return (hideDone ? "Показать выполненные" : "Скрыть выполненные") + " (" + count + ")";
  }

  function renderEpicOption(key, title) {
    const status = epicStatusByKey[key];
    return '<span style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;"><span class="ozon-mono" style="color:#005BFF;font-weight:700;">' + escapeHtml(key) + '</span>' + (status ? getStatusBadgeHtml(status) : '<span style="color:#94A3B8;font-size:10px;">Статус недоступен</span>') + '</span><span class="ozon-ext-epic-option-title">' + escapeHtml(title) + '</span>';
  }

  function renderEpicProjectTag(epicKey) {
    return '';
  }

  function renderToolbarFilter(id, title, value, options, placeholder) {
    const current = options.find(option => option.value === value);
    const open = activeToolbarFilter === id;
    const query = toolbarFilterSearch.trim().toLowerCase();
    const matches = options.filter(option => !query || option.label.toLowerCase().includes(query));
    if (id === 'epic' && /^fcrm-\\d+$/i.test(query) && !matches.some(option => String(option.value).toLowerCase() === query)) matches.push({value:query.toUpperCase(),label:query.toUpperCase()});
    const optionLabel = (option) => {
      if (option.value !== 'all' && id === 'status') return getStatusBadgeHtml(option.label);
      if (option.value !== 'all' && id === 'issue-type') {
        const icon = getJiraIssueTypeIconHtml(option.value, option.iconUrl);
        return '<span class="ozon-ext-select-content"><span class="ozon-ext-filter-icon" aria-hidden="true">' + icon + '</span><span class="ozon-ext-select-text">' + escapeHtml(option.label) + '</span></span>';
      }
      return escapeHtml(option.label);
    };
    return '<div class="ozon-ext-toolbar-combo">' +
      '<button type="button" class="ozon-ext-toolbar-trigger" data-action="toggle-toolbar-filter" data-filter="' + id + '" ' + ((id === 'sprint' && isInitialBoardLoading) || (['component','epic','status','issue-type'].includes(id) && (!productDashboardLoaded || isInitialBoardLoading)) ? 'disabled ' : '') + 'aria-expanded="' + open + '">' +
      '<span class="ozon-ext-toolbar-label">' + (current ? optionLabel(current) : escapeHtml(id === 'epic' && value !== 'all' ? 'Эпик: ' + value : title)) + '</span><span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></button>' +
      (open ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ' + (id === 'epic' ? 'ozon-ext-epic-filter-popover ozon-dev-epic-filter-sidebar' : '') + '">' + (id === 'epic' ? '<div class="ozon-dev-editor-head"><strong>Фильтр по эпику</strong><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="toggle-toolbar-filter" data-filter="epic" aria-label="Закрыть">✕</button></div>' : '') + '<input type="search" id="ozon-toolbar-filter-search" placeholder="' + escapeHtml(placeholder || 'Поиск...') + '" value="' + escapeHtml(toolbarFilterSearch) + '" autocomplete="off" />' +
        '<div class="ozon-dev-filter-list">' + (matches.length ? matches.map(option => '<button type="button" class="ozon-ext-combo-item ' + (option.value === value ? 'active' : '') + '" data-action="pick-toolbar-filter" data-filter="' + id + '" data-value="' + escapeHtml(option.value) + '">' + optionLabel(option) + '</button>').join('') : '<div class="ozon-ext-toolbar-empty">Ничего не найдено</div>') + '</div></div>' : '') +
      '</div>';
  }

  function applyTableTreeLevel(level) {
    tableTreeLevel = level;
    treeLevelApplied = true;
    expandedSprints = {};
    expandedComponents = {};
    expandedSubRows = {};
    productExpandedGroups = {};
    if (level === 'sprints') return;
    getAllSprintOptions().forEach(sprint => { expandedSprints[sprint] = true; });
    tasks.forEach(task => {
      const sprint = task.sprint || 'Бэклог FCRM';
      expandedSprints[sprint] = true;
      if (level === 'tasks' || level === 'links') (task.components?.length ? task.components : [task.component || 'Без компонента']).forEach((name) => { expandedComponents[sprint + '::' + name] = true; });
      if (level === 'links') expandedSubRows[task.key] = true;
    });
  }

  function renderStatusSummary(items) {
    const counts = new Map();
    items.forEach(item => {
      const status = item.status || 'Открыто';
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return '<span class="ozon-ext-status-summary" aria-label="Сводка по статусам">' + Array.from(counts.entries()).sort((a,b) => a[0].localeCompare(b[0], 'ru')).map(([status, count]) => '<span class="ozon-ext-status-count">' + escapeHtml(status) + ' · ' + count + '</span>').join('') + '</span>';
  }

  function renderSearchSelect(id, value, options, placeholder, className, buttonClass) {
    const current = options.find(option => String(option.value) === String(value));
    const open = activeSearchSelectId === id;
    const query = open ? searchSelectQuery.trim().toLowerCase() : '';
    const filtered = options.filter(option => !query || String(option.label).toLowerCase().includes(query));
    const safeId = escapeHtml(id);
    const renderLabel = (option) => {
      const label = escapeHtml(option.label);
      let icon = '';
      let badge = '';
      let text = label;
      if (id === 'sidebar-issuetype') icon = getJiraIssueTypeIconHtml(option.value, option.iconUrl);
      if (id === 'sidebar-sprint' || id.startsWith('table-sprint-')) {
        text = escapeHtml(option.value);
        badge = getSprintStateBadgeHtml(option.value);
      }
      if (!icon && !badge) return label;
      return '<span class="ozon-ext-select-content">' + icon + '<span class="ozon-ext-select-text">' + text + '</span>' + badge + '</span>';
    };
    return '<div class="ozon-ext-search-select ' + ((id === 'sidebar-sprint' || id.startsWith('table-sprint-')) ? 'ozon-ext-sprint-select ' : '') + (className || '') + '">' +
      '<button type="button" class="ozon-ext-search-select-trigger ' + (buttonClass || '') + '" data-action="toggle-search-select" data-select-id="' + safeId + '" aria-expanded="' + open + '">' +
      '<span class="ozon-ext-search-select-value">' + renderLabel(current || { value: value || '', label: value || 'Выберите значение' }) + '</span><span class="ozon-ext-search-select-caret" aria-hidden="true"></span></button>' +
      (open ? '<div class="ozon-ext-combo-popover ozon-ext-search-select-popover"><input type="search" id="ozon-search-select-search" placeholder="' + escapeHtml(placeholder || 'Поиск...') + '" value="' + escapeHtml(searchSelectQuery) + '" autocomplete="off" />' +
        '<div class="ozon-ext-combo-list">' + (filtered.length ? filtered.map(option => '<button type="button" class="ozon-ext-combo-item ozon-ext-search-select-option ' + (String(option.value) === String(value) ? 'active' : '') + '" data-action="pick-search-select" data-select-id="' + safeId + '" data-value="' + escapeHtml(option.value) + '" data-transition-id="' + escapeHtml(option.transitionId || '') + '">' + renderLabel(option) + '</button>').join('') : '<div class="ozon-ext-search-select-empty">Ничего не найдено</div>') + '</div></div>' : '') +
      '</div>';
  }

  function getFilteredTasks() {
    if (!productDashboardLoaded) return {filtered:[],doneCount:0};
    const q = searchQuery.trim().toLowerCase();
    const matching = tasks.filter((t) => {
      if (isCanceledStatus(t.status)) return false;
      if (filterIssueType !== 'all' && (t.issueTypeName || 'Задача') !== filterIssueType) return false;
      if (filterComponent !== 'all' && !(Array.isArray(t.components) && t.components.length ? t.components : [t.component || 'Без компонента']).includes(filterComponent)) return false;
      if (filterEpic !== 'all' && t.epicKey !== filterEpic) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterSprintState !== 'all' && !matchesSprintState(getSprintStateCode(t.sprint || 'Бэклог FCRM'))) return false;
      if (!q) return true;
      return (
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.component.toLowerCase().includes(q) ||
        (t.issueTypeName && t.issueTypeName.toLowerCase().includes(q)) ||
        (t.epicKey && t.epicKey.toLowerCase().includes(q)) ||
        (t.epicName && t.epicName.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.name.toLowerCase().includes(q)) ||
        (t.customer && t.customer.name.toLowerCase().includes(q)) ||
        (t.sprint && t.sprint.toLowerCase().includes(q))
      );
    });
    return { filtered: hideDone ? matching.filter(t => !isDoneTask(t)) : matching, doneCount: matching.filter(isDoneTask).length };
  }

  function captureAllScrollPositions() {
    const root = document.getElementById('ozon-structure-root');
    const workspace = root ? root.querySelector('.ozon-ext-workspace') : null;
    const tablePane = document.getElementById('ozon-ext-table-pane');
    const sidebarPanel = document.getElementById('ozon-ext-sidebar-panel');
    const sidebarBody = sidebarPanel ? sidebarPanel.querySelector('.ozon-ext-sidebar-body') : null;
    return {
      rootTop: root ? root.scrollTop : 0,
      workspaceTop: workspace ? workspace.scrollTop : 0,
      tableTop: tablePane ? tablePane.scrollTop : 0,
      tableLeft: tablePane ? tablePane.scrollLeft : 0,
      sidebarTop: sidebarPanel ? sidebarPanel.scrollTop : 0,
      sidebarBodyTop: sidebarBody ? sidebarBody.scrollTop : 0,
      winY: window.scrollY || document.documentElement.scrollTop || 0,
      winX: window.scrollX || document.documentElement.scrollLeft || 0
    };
  }

  function restoreAllScrollPositions(saved) {
    if (!saved) return;
    const apply = () => {
      const root = document.getElementById('ozon-structure-root');
      if (root && saved.rootTop > 0) root.scrollTop = saved.rootTop;
      const workspace = root ? root.querySelector('.ozon-ext-workspace') : null;
      if (workspace && saved.workspaceTop > 0) workspace.scrollTop = saved.workspaceTop;
      const tablePane = document.getElementById('ozon-ext-table-pane');
      if (tablePane) {
        tablePane.scrollTop = saved.tableTop;
        tablePane.scrollLeft = saved.tableLeft;
      }
      const sidebarPanel = document.getElementById('ozon-ext-sidebar-panel');
      if (sidebarPanel) {
        sidebarPanel.scrollTop = saved.sidebarTop;
      }
      const sidebarBody = sidebarPanel ? sidebarPanel.querySelector('.ozon-ext-sidebar-body') : null;
      if (sidebarBody && saved.sidebarBodyTop > 0) {
        sidebarBody.scrollTop = saved.sidebarBodyTop;
      }
      if ((window.scrollY || 0) !== saved.winY || (window.scrollX || 0) !== saved.winX) {
        window.scrollTo(saved.winX, saved.winY);
      }
    };
    apply();
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(apply);
    }
  }

  function prepareNavigationLink(anchor) {
    const href = (anchor.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || /^(?:javascript|mailto|tel):/i.test(href)) return;
    let url;
    try { url = new URL(href, window.location.href); } catch (_) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    anchor.setAttribute('target', '_blank');
    const rel = new Set((anchor.getAttribute('rel') || '').split(' ').filter(Boolean));
    rel.add('noopener'); rel.add('noreferrer');
    anchor.setAttribute('rel', Array.from(rel).join(' '));
  }

  function decorateIssueCopyButtons(root) {
    root.querySelectorAll('a[href]').forEach(prepareNavigationLink);
    root.querySelectorAll('.ozon-ext-search-select-trigger span,.ozon-ext-cell-combo-trigger span,#ozon-sb-comp-trigger span,#ozon-sb-epic-trigger span').forEach(span => {
      if (!span.children.length && /[⌕▾]/.test(span.textContent)) {
        const label = span.textContent.replace(/[⌕▾]/g,'').trim();
        span.style.display='inline-flex'; span.style.alignItems='center'; span.style.gap='5px'; span.style.fontSize='11px'; span.style.flexShrink='0';
        span.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>' + escapeHtml(label) + '<span class="ozon-ext-search-select-caret" aria-hidden="true"></span>';
      }
    });
    const references = new Map();
    tasks.forEach(task => {
      references.set(task.key,task.summary);
      if (task.epicKey) references.set(task.epicKey,task.epicName || epicNameByKey[task.epicKey]);
      [...(task.projectTaskLinks || []),...(task.inProjectLinks || []),...(task.otherLinks || [])].forEach(link => references.set(link.key,link.summary));
    });
    if (activeDashboardView === 'development') developmentDashboard.copyReferences().forEach((title,key) => references.set(key,title));
    root.querySelectorAll('a[href*="/browse/"]').forEach(anchor => {
      const match = /[/]browse[/]([A-Z][A-Z0-9]*-[0-9]+)/i.exec(anchor.getAttribute('href') || '');
      if (!match || anchor.closest('.ozon-strategy-key') || anchor.nextElementSibling?.classList.contains('ozon-ext-copy-ref') || anchor.parentElement.querySelector('#ozon-copy-task-link')) return;
      const key = match[1].toUpperCase();
      const title = references.get(key) || anchor.getAttribute('title') || anchor.textContent.replace(key,'').trim();
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ozon-ext-copy-ref'; button.title = 'Копировать ссылку и название'; button.setAttribute('aria-label','Копировать ' + key);
      button.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg>';
      button.addEventListener('click',async event => {
        event.preventDefault(); event.stopPropagation(); const url = 'https://jit.o3.ru/browse/' + key;
        const text = '[' + key + '](' + url + ') ' + (title || '');
        try {
          if (window.ClipboardItem && navigator.clipboard.write) {
            try { await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([text],{type:'text/plain'}),'text/html':new Blob(['<a href="' + url + '">' + key + '</a> ' + escapeHtml(title || '')],{type:'text/html'})})]); }
            catch (_) { await navigator.clipboard.writeText(text); }
          } else await navigator.clipboard.writeText(text);
          showSaveToast('✓ Ссылка и название скопированы');
        } catch (_) { showSaveToast('Не удалось скопировать ссылку: проверьте доступ к буферу обмена'); }
      });
      anchor.after(button);
    });
  }

  function closeSidebarPickers() {
    if(!sbEpicComboOpen && !sbCompComboOpen && sbIpCompOpenIdx === null && sbIpSprintOpenIdx === null && !activeSearchSelectId)return;
    sbEpicComboOpen=false;sbCompComboOpen=false;sbIpCompOpenIdx=null;sbIpSprintOpenIdx=null;activeSearchSelectId='';renderStructure();
  }
  function positionSidebarPickers(root) {
    const body=root.querySelector('#ozon-ext-sidebar-panel');
    if(body && body.dataset.pickerPositionBound!=='true') {body.dataset.pickerPositionBound='true';body.addEventListener('scroll',event=>{if(!event.target.closest?.('.ozon-ext-combo-popover'))positionSidebarPickers(root);},true);}
    root.querySelectorAll('#ozon-ext-sidebar-panel .ozon-ext-combo-popover').forEach(popover => {
      const owner=popover.parentElement;
      const trigger=owner.querySelector('.ozon-ext-search-select-trigger,.ozon-ext-sb-combo-trigger');
      if(!trigger)return;
      const anchor=trigger.getBoundingClientRect();
      const width=Math.min(Math.max(anchor.width,320),window.innerWidth-24);
      const height=Math.min(360,window.innerHeight-24);
      const left=Math.max(12,Math.min(anchor.left,window.innerWidth-width-12));
      const below=window.innerHeight-anchor.bottom-12,above=anchor.top-12;
      const useBelow=below>=Math.min(height,240) || below>=above;
      const available=Math.max(100,Math.min(height,useBelow?below:above));
      popover.style.setProperty('position','fixed','important');popover.style.setProperty('left',left+'px','important');popover.style.setProperty('right','auto','important');popover.style.setProperty('width',width+'px','important');popover.style.setProperty('min-width','0','important');popover.style.setProperty('max-height',available+'px','important');popover.style.setProperty('overflow','auto','important');popover.style.setProperty('z-index','2147483000','important');
      popover.style.setProperty('top',(useBelow?anchor.bottom+4:Math.max(12,anchor.top-Math.min(popover.scrollHeight,available)-4))+'px','important');
      if(popover.querySelector('[data-picker-close]'))return;
      const close=document.createElement('button');close.setAttribute('data-picker-close','true');close.type='button';close.className='ozon-ext-btn ozon-ext-btn-surface';close.textContent='✕';close.setAttribute('aria-label','Закрыть список');close.style.cssText='position:sticky;top:0;margin-left:auto;display:block;width:26px;min-height:26px;z-index:2;';close.addEventListener('click',event=>{event.stopPropagation();closeSidebarPickers();});popover.prepend(close);
    });
  }

  function layoutTaskAttributes(root) {
    const grid=root.querySelector('#ozon-sb-params-card > .ozon-ext-field-grid');
    if(!grid || grid.classList.contains('ozon-ext-attributes-columns'))return;
    const children=Array.from(grid.children); if(children.length!==18)return;
    const fields=[];
    for(let index=0;index<children.length;index+=2) {
      const field=document.createElement('div');field.className='ozon-ext-attribute-field';
      field.append(children[index],children[index+1]); fields.push(field);
    }
    grid.replaceChildren(...[0,3,1,4,2,5,7,8,6].map(index=>fields[index]));
    fields[6].classList.add('ozon-ext-attribute-labels');
    grid.classList.add('ozon-ext-attributes-columns');
  }

  function compactInProjectLinkRows(root) {
    const header = root.querySelector('#ozon-ext-sidebar-panel [data-sec="ip"]');
    const section = header && header.closest('.ozon-ext-section-card');
    const body = header && header.nextElementSibling;
    if (!section || !body || body.classList.contains('ozon-ext-ip-table-viewport')) return;
    body.classList.add('ozon-ext-ip-table-viewport');
    const inner = document.createElement('div'); inner.className = 'ozon-ext-ip-table-body';
    while (body.firstChild) inner.appendChild(body.firstChild);
    body.appendChild(inner);
    const headings = document.createElement('div'); headings.className = 'ozon-ext-ip-table-head';
    inner.querySelectorAll('.ozon-ext-link-group-header').forEach(group => group.remove());
    headings.innerHTML = '<span>Задача · Приоритет</span><span>Эпик</span><span>Статус</span><span>Компонент</span><span>Спринт</span><span>Действия</span>';
    inner.prepend(headings);
    const minWidths = [210,120,76,122,206,55];
    let widths = [340,100,92,145,225,58];
    try { const saved = JSON.parse(localStorage.getItem('ozon-ip-column-widths-v3') || 'null'); if (Array.isArray(saved) && saved.length === 6 && saved.every(value => Number.isFinite(value) && value >= 60)) widths = saved; } catch (_) {}
    const applyWidths = () => {
      inner.style.setProperty('--ozon-ip-columns',widths.map((value,index) => 'minmax(' + minWidths[index] + 'px,' + value + 'fr)').join(' '));
      inner.style.setProperty('--ozon-ip-width',minWidths.reduce((sum,value)=>sum+value,0) + 'px');
    };
    applyWidths();
    Array.from(headings.children).forEach((cell,index) => {
      const handle = document.createElement('span'); handle.className = 'ozon-ip-column-resizer'; handle.setAttribute('role','separator'); handle.setAttribute('aria-label','Ширина: ' + cell.textContent); handle.tabIndex = 0;
      const save = () => { try { localStorage.setItem('ozon-ip-column-widths-v3',JSON.stringify(widths)); } catch (_) {} };
      handle.addEventListener('pointerdown',event => { event.preventDefault(); event.stopPropagation(); const start = event.clientX, width = widths[index];
        const move = ev => { widths[index] = Math.max(index === 0 ? 180 : 60,width + ev.clientX-start); applyWidths(); };
        const end = () => { document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',end); save(); };
        document.addEventListener('pointermove',move); document.addEventListener('pointerup',end);
      });
      handle.addEventListener('keydown',event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); widths[index] = Math.max(index === 0 ? 180 : 60,widths[index]+(event.key === 'ArrowRight' ? 10 : -10)); applyWidths(); save(); } });
      cell.appendChild(handle);
    });
    inner.querySelectorAll('.ozon-ext-link-compact-row').forEach(row => {
      const first = row.children[0];
      const detail = Array.from(row.children).find(child => child.querySelector('.ozon-ext-sb-combo'));
      if (!first || !detail) return;
      const left = first.children[0], actions = first.children[1];
      const component = detail.querySelector('.ozon-ext-sb-combo');
      const sprint = detail.querySelector('.ozon-ext-sb-combo:last-child');
      if (!left || !actions || !component || !sprint) return;
      const epic = document.createElement('div'); epic.className='ozon-ext-ip-epic-cell';
      const epicRef = Array.from(left.children).find(child => child.tagName === 'SPAN' && String(child.getAttribute('title') || '').startsWith('Эпик:'));
      if (epicRef) { const key=epicRef.textContent.trim(); const anchor=document.createElement('a'); anchor.href='/browse/'+encodeURIComponent(key); anchor.target='_blank'; anchor.rel='noopener noreferrer'; anchor.className='ozon-mono'; anchor.textContent=key; anchor.title=epicRef.title; epic.appendChild(anchor); epicRef.remove(); }
      else { epic.textContent='—'; epic.classList.add('is-empty'); }
      const secondary = Array.from(row.children).filter(child => child !== first && child !== detail);
      const status = document.createElement('div'); status.className='ozon-ext-ip-status-cell'; const badge = actions.querySelector('.ozon-ext-badge');
      if (badge) {
        const label = document.createElement('span');
        label.className = 'ozon-ip-status-label';
        label.textContent = badge.textContent;
        badge.title = label.textContent;
        badge.replaceChildren(label);
        status.appendChild(badge);
        if (/готово|закрыт|done|closed/i.test(label.textContent)) row.classList.add('completed');
      }
      left.classList.add('ozon-ext-ip-task-cell'); actions.classList.add('ozon-ext-ip-action-cell');
      component.classList.add('ozon-ext-ip-component-cell'); component.dataset.fieldLabel='Компонент';
      sprint.classList.add('ozon-ext-ip-sprint-cell'); sprint.dataset.fieldLabel='Спринт';
      row.classList.add('ozon-ext-ip-table-row'); row.replaceChildren(left,epic,status,component,sprint,actions);
      secondary.forEach(child => { child.classList.add('ozon-ext-ip-table-secondary'); row.appendChild(child); });
    });
  }

  const taskDetailsSidebar = (${createTaskDetailsSidebar.toString()})({
    html: buildSidebarHtml,
    bindEvents: bindSidebarEvents,
    bindSearch: bindTicketSearchEvents,
    afterBind: positionSidebarPickers,
    bindControls: bindSharedTaskControls,
    enhance: root => { layoutTaskAttributes(root); compactInProjectLinkRows(root); },
    escape: escapeHtml,
    commentAuthor: author => {
      const person = jiraPeople.fromJira(author, 'Автор неизвестен');
      return jiraPeople.badge(person) + jiraPeople.copyButton(person);
    },
    commentBody: renderAnswerMarkup,
    formatDate
  });

  const extensionUpdate = (${createExtensionUpdateNotice.toString()})(typeof chrome === 'undefined' ? undefined : chrome.runtime, ${JSON.stringify(EXTENSION_UPDATE_MESSAGES)}, ${JSON.stringify(EXTENSION_UPDATE_ZIP_URL)}, ${EXTENSION_UPDATE_INTERVAL});

  function nativeBoardButton() {
    return '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-ext-board-switch" data-show-native-board title="Вернуться к обычной доске Jira">← Доска Jira</button>';
  }

  let dashboardFullscreen = false;
  let ownsNativeFullscreen = false;
  let nativeFullscreenRequest = null;

  function fullscreenButtonContent(expanded) {
    return expandCornersIcon(expanded) + '<span>' + (expanded ? 'Свернуть' : 'На весь экран') + '</span>';
  }

  function fullscreenButtonLabel(expanded) {
    return expanded ? 'Свернуть полноэкранный режим' : 'Развернуть на весь экран';
  }

  function updateDashboardFullscreen(root, expanded) {
    dashboardFullscreen = expanded;
    root?.classList.toggle('ozon-dashboard-fullscreen', expanded);
    const button = root?.querySelector('[data-toggle-fullscreen]');
    if (!button) return;
    button.setAttribute('aria-label', fullscreenButtonLabel(expanded));
    button.title = fullscreenButtonLabel(expanded) + (expanded ? ' (Esc)' : '');
    button.innerHTML = fullscreenButtonContent(expanded);
  }

  function setDashboardFullscreen(root, expanded) {
    updateDashboardFullscreen(root, expanded);
    const page = document.documentElement;
    if (!expanded) {
      if (ownsNativeFullscreen && document.fullscreenElement === page) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }
    if (nativeFullscreenRequest || document.fullscreenElement || !document.fullscreenEnabled || !page.requestFullscreen) return;
    // Fullscreen the page so Jira editors mounted beside the dashboard remain visible.
    nativeFullscreenRequest = page.requestFullscreen().then(() => {
      ownsNativeFullscreen = document.fullscreenElement === page;
      if (ownsNativeFullscreen && !dashboardFullscreen) return document.exitFullscreen();
    }).catch(() => {
      // The dashboard still occupies the viewport if browser fullscreen is unavailable.
    }).finally(() => { nativeFullscreenRequest = null; });
  }

  function renderDashboardNavigation() {
    const tabs = [['product','Продуктовый бэклог'],['development','Команды разработки'],['strategy','Стратегическое планирование'],['report','Отчёт по спринту'],['prompts','Промпты']];
    return '<div class="ozon-ext-view-tabs">' + nativeBoardButton() + '<nav role="tablist" aria-label="Представление">' + tabs.map(([view,label]) => '<button type="button" role="tab" id="ozon-tab-' + view + '" data-dashboard-view="' + view + '" aria-selected="' + (activeDashboardView === view) + '">' + label + '</button>').join('') + '</nav>' + widgetTheme.control() +
      '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-ext-fullscreen-toggle" data-toggle-fullscreen aria-controls="ozon-structure-root" aria-label="' + fullscreenButtonLabel(dashboardFullscreen) + '" title="' + fullscreenButtonLabel(dashboardFullscreen) + (dashboardFullscreen ? ' (Esc)' : '') + '">' + fullscreenButtonContent(dashboardFullscreen) + '</button></div>';
  }

  function bindDashboardNavigation(root) {
    extensionUpdate.bind(root);
    root.querySelector('[data-toggle-fullscreen]')?.addEventListener('click', () => {
      setDashboardFullscreen(root, !dashboardFullscreen);
    });
    root.querySelectorAll('[data-dashboard-view]').forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      const view = button.getAttribute('data-dashboard-view');
      if (view === activeDashboardView) return;
      const moveTabFocus = (view === 'prompts' || activeDashboardView === 'prompts') && document.activeElement === button;
      const development = developmentDashboard.getState();
      const currentSprints = activeDashboardView === 'development' && view === 'report'
        ? development.sprints.filter(sprint => development.selected.includes(String(sprint.id)) && /^(active|closed)$/i.test(sprint.state)) : [];
      const sprintBoards = new Set(currentSprints.map(sprint => String(sprint.boardId || sprint.originBoardId)));
      if (activeDashboardView === 'report') sprintReport.cancel();
      developmentDashboard.cancel();
      activeDashboardView = view;
      activeToolbarFilter = '';
      activeSearchSelectId = '';
      activeTableCombo = null;
      renderStructure();
      if (moveTabFocus) root.querySelector('[aria-selected="true"]')?.focus({preventScroll:true});
      if (view === 'strategy') strategicDashboard.prepareFilters();
      if (view === 'product') prepareProductFilters();
      if (view === 'report') sprintReport.open(sprintBoards.size===1 ? {board:[...sprintBoards][0],sprints:currentSprints.map(sprint=>String(sprint.id))} : undefined);
    }));
  }

  let visibleMotionSurfaces = new Set();
  let strategyScrollBeforeLoad = null;
  function animateDashboardSurfaces(root) {
    const next = new Set();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.querySelectorAll('#ozon-ext-sidebar-panel,.ozon-ext-product-settings,#ozon-dev-editor-panel,.ozon-ext-toolbar-popover,.ozon-report-options,.ozon-ext-user-dropdown').forEach(panel=>{
      const popover = panel.matches('.ozon-ext-toolbar-popover,.ozon-report-options,.ozon-ext-user-dropdown');
      const control = panel.previousElementSibling;
      const key = activeDashboardView + ':' + (panel.id || panel.className) + ':' + (control?.dataset.filter || control?.dataset.reportPicker || control?.getAttribute('aria-label') || control?.id || '');
      next.add(key);
      if (!reduceMotion && !visibleMotionSurfaces.has(key)) {
        panel.animate([{opacity:.55,translate:popover ? '0 4px' : '12px 0'},{opacity:1,translate:'0 0'}],{duration:150,easing:'ease-out'});
      }
    });
    visibleMotionSurfaces = next;
  }


  const promptCatalog = {loading:false,entries:null,error:false};

  function renderPromptCatalog(root) {
    const hasTabFocus = document.activeElement === root.querySelector('#ozon-tab-prompts');
    root.innerHTML = renderDashboardNavigation() +
      '<section id="ozon-prompt-catalog" role="tabpanel" aria-labelledby="ozon-tab-prompts"><h2>Промпты DeepSeek</h2><p role="status" tabindex="-1"></p><div data-prompt-entries></div></section>';
    bindDashboardNavigation(root);
    const tab = root.querySelector('#ozon-tab-prompts');
    tab.setAttribute('aria-controls', 'ozon-prompt-catalog');
    if (hasTabFocus) tab.focus({preventScroll:true});
    const panel = root.querySelector('#ozon-prompt-catalog');
    const status = panel.querySelector('[role="status"]');
    const entries = panel.querySelector('[data-prompt-entries]');
    if (promptCatalog.loading) { status.textContent = 'Загружаю промпты…'; return; }
    if (promptCatalog.error) {
      status.textContent = 'Промпты расширения недоступны.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'ozon-ext-btn ozon-ext-btn-surface';
      retry.textContent = 'Повторить';
      retry.onclick = () => {
        loadPromptCatalog();
        root.querySelector('#ozon-tab-prompts')?.focus({preventScroll:true});
      };
      panel.appendChild(retry);
      return;
    }
    if (!promptCatalog.entries) { loadPromptCatalog(); return; }
    if (!promptCatalog.entries.length) { status.textContent = 'Доступных промптов пока нет.'; return; }
    for (const entry of promptCatalog.entries) {
      const details = document.createElement('details');
      const title = document.createElement('summary');
      title.textContent = entry.title;
      details.appendChild(title);
      for (const [label,text] of [['Системный промпт',entry.system],['Шаблон запроса',entry.user]]) {
        if (!text) continue;
        const heading = document.createElement('h3');
        const body = document.createElement('pre');
        heading.textContent = label;
        body.textContent = text;
        details.append(heading,body);
      }
      entries.appendChild(details);
    }
  }

  function loadPromptCatalog() {
    if (promptCatalog.loading) return;
    promptCatalog.loading = true;
    promptCatalog.error = false;
    renderStructure();
    const finish = entries => {
      promptCatalog.loading = false;
      promptCatalog.error = !Array.isArray(entries);
      promptCatalog.entries = Array.isArray(entries) ? entries.filter(entry =>
        typeof entry?.title === 'string' && typeof entry.system === 'string' && typeof entry.user === 'string'
      ) : null;
      if (activeDashboardView === 'prompts') renderStructure();
    };
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { finish(null); return; }
    try {
      chrome.runtime.sendMessage({type:'o3ds:prompt-catalog'}, response => {
        const failed = chrome.runtime.lastError;
        finish(!failed && response?.ok ? response.entries : null);
      });
    } catch (_) { finish(null); }
  }

  function renderStructure() {
    let root = document.getElementById('ozon-structure-root');
    if (!isTargetBoardPage() || !isStructureVisible) {
      if (dashboardFullscreen) setDashboardFullscreen(root, false);
      if (root) root.hidden = true;
      structureRenderPending = true;
      return;
    }
    if (!root) {
      root = document.createElement('div');
      root.id = 'ozon-structure-root';
      document.body.appendChild(root);
    }
    root.hidden = false;
    structureRenderPending = false;

    if (activeDashboardView === 'prompts') {
      renderPromptCatalog(root);
      return;
    }

    if (activeDashboardView === 'report') {
      const top = root.querySelector('.ozon-report-scroll')?.scrollTop || 0;
      const tableLeft = root.querySelector('.ozon-report-tree-wrap')?.scrollLeft || 0;
      const rollupLeft = root.querySelector('.ozon-report-rollup-wrap')?.scrollLeft || 0;
      const trendLeft = root.querySelector('.ozon-report-trend-scroll')?.scrollLeft || 0;
      const trendTableLeft = root.querySelector('.ozon-report-trend-table')?.scrollLeft || 0;
      const sprintSearch = root.querySelector('[data-report-sprint-search]');
      const sprintCaret = sprintSearch && document.activeElement === sprintSearch ? [sprintSearch.selectionStart,sprintSearch.selectionEnd] : null;
      const sprintListTop = root.querySelector('[data-report-sprint-list]')?.scrollTop || 0;
      const sprintOption = root.contains(document.activeElement) ? document.activeElement?.dataset.reportSprintChoice : '';
      root.innerHTML = renderDashboardNavigation() + sprintReport.html();
      bindDashboardNavigation(root);
      sprintReport.bind(root);
      const scroll = root.querySelector('.ozon-report-scroll');
      const tree = root.querySelector('.ozon-report-tree-wrap');
      const rollup = root.querySelector('.ozon-report-rollup-wrap');
      const trend = root.querySelector('.ozon-report-trend-scroll');
      const trendTable = root.querySelector('.ozon-report-trend-table');
      const sprintList = root.querySelector('[data-report-sprint-list]');
      if (tree) tree.scrollLeft = tableLeft;
      if (rollup) rollup.scrollLeft = rollupLeft;
      if (trend) trend.scrollLeft = trendLeft;
      if (trendTable) trendTable.scrollLeft = trendTableLeft;
      if (sprintList) sprintList.scrollTop = sprintListTop;
      if (sprintCaret) {
        const nextSearch = root.querySelector('[data-report-sprint-search]');
        nextSearch?.focus({preventScroll:true});
        if (sprintCaret[0] !== null && sprintCaret[1] !== null) nextSearch?.setSelectionRange(...sprintCaret);
      }
      if (sprintOption) [...root.querySelectorAll('[data-report-sprint-choice]')].find(item=>item.dataset.reportSprintChoice===sprintOption)?.focus({preventScroll:true});
      if (scroll) scroll.scrollTop = top;
      animateDashboardSurfaces(root);
      return;
    }

    if (activeDashboardView === 'strategy') {
      const oldSearch=root.querySelector('#ozon-strategy-search');
      const focusedSearch=document.activeElement===oldSearch;
      const caret=focusedSearch ? [oldSearch.selectionStart,oldSearch.selectionEnd] : null;
      const sidebarScroll = captureAllScrollPositions();
      const scroll = root.querySelector('.ozon-strategy-scroll');
      const loading = strategicDashboard.getState().loading;
      const scrollPosition = {top:scroll?.scrollTop || 0,left:scroll?.scrollLeft || 0};
      if (loading && scroll && scroll.getAttribute('aria-busy') !== 'true') strategyScrollBeforeLoad = scrollPosition;
      const targetScroll = strategyScrollBeforeLoad || scrollPosition;
      root.innerHTML = renderDashboardNavigation() + strategicDashboard.html();
      root.querySelector('.ozon-strategy-dashboard')?.insertAdjacentHTML('beforeend',taskDetailsSidebar.html());
      bindDashboardNavigation(root);
      strategicDashboard.bind(root);
      taskDetailsSidebar.bind(root);
      decorateIssueCopyButtons(root);
      restoreAllScrollPositions(sidebarScroll);
      positionSidebarPickers(root);
      const nextScroll = root.querySelector('.ozon-strategy-scroll');
      if (nextScroll) { nextScroll.scrollTop = targetScroll.top; nextScroll.scrollLeft = targetScroll.left; }
      if (!loading) strategyScrollBeforeLoad = null;
      if (focusedSearch) {
        const nextSearch=root.querySelector('#ozon-strategy-search');
        nextSearch?.focus({preventScroll:true});
        if (caret[0]!==null && caret[1]!==null) nextSearch?.setSelectionRange(...caret);
      }
      animateDashboardSurfaces(root);
      return;
    }

    if (activeDashboardView === 'development') {
      const sidebarScroll = captureAllScrollPositions();
      const tableScroll = root.querySelector('.ozon-dev-table-scroll');
      const scrollTop = tableScroll ? tableScroll.scrollTop : 0;
      const scrollLeft = tableScroll ? tableScroll.scrollLeft : 0;
      root.innerHTML = renderDashboardNavigation() + developmentDashboard.html();
      root.querySelector('.ozon-dev-content').insertAdjacentHTML('beforeend',taskDetailsSidebar.html());
      bindDashboardNavigation(root);
      developmentDashboard.bind(root);
      taskDetailsSidebar.bind(root);
      decorateIssueCopyButtons(root);
      const updatedScroll = root.querySelector('.ozon-dev-table-scroll');
      if (updatedScroll) { updatedScroll.scrollTop = scrollTop; updatedScroll.scrollLeft = scrollLeft; }
      restoreAllScrollPositions(sidebarScroll);
      positionSidebarPickers(root);
      animateDashboardSurfaces(root);
      return;
    }

    // Сохраняем позицию скролла ВСЕХ контейнеров до любых изменений DOM
    const savedScroll = captureAllScrollPositions();
    const settingsScroll = root.querySelector('.ozon-ext-product-settings')?.scrollTop || 0;

    const { filtered, doneCount } = getFilteredTasks();
    const rowsHtml = buildTableRowsHtml(filtered);
    const sidebarHtml = taskDetailsSidebar.html();
    const totalTableW = getTotalTableWidth();

    const allComponents = getAllComponentOptions();
    const epicMap = getAllEpicOptions();
    const epicKeys = Object.keys(epicMap);
    const allStatuses = Array.from(new Set([...projectStatusesList, ...(productDashboardLoaded ? tasks.map((t) => t.status).filter(Boolean) : [])])).filter((s) => !isCanceledStatus(s));
    const componentFilterOptions = [{ value: 'all', label: 'Компонент: Все' }, ...allComponents.map(c => ({ value: c, label: c }))];
    const epicFilterOptions = [{ value: 'all', label: 'Эпик: Все' }, ...epicKeys.map(k => ({ value: k, label: k + ' · ' + (epicMap[k] || '') }))];
    const statusFilterOptions = [{ value: 'all', label: 'Статус: Все' }, ...allStatuses.map(status => ({ value: status, label: status }))];
    const typeIcons = new Map(projectIssueTypesList.map(type => [type.name,type.iconUrl]));
    const issueTypeFilterOptions = [{ value: 'all', label: 'Тип запроса: Все' }, ...Array.from(new Set([...typeIcons.keys(), ...(productDashboardLoaded ? tasks.map(task => task.issueTypeName || 'Задача') : [])])).sort((a,b) => a.localeCompare(b, 'ru')).map(name => ({ value: name, label: name, iconUrl:typeIcons.get(name) }))];
    const treeLevelOptions = [
      ...(productGroupingOrder.length ? [{ value: 'sprints', label: (productGroupingOrder[0] === 'sprint' ? 'Спринты' : 'Компоненты') }] : []),
      ...(productGroupingOrder.length > 1 ? [{ value: 'components', label: (productGroupingOrder[1] === 'sprint' ? 'Спринты' : 'Компоненты') }] : []),
      { value: 'tasks', label: 'Задачи' },
      { value: 'links', label: 'Связанные задачи' }
    ];
    const sprintFilterOptions = [
      { value: 'open_future_backlog', label: 'Спринты: Активные, будущие и бэклог' },
      { value: 'open_future', label: 'Спринты: Активные и будущие' },
      { value: 'ACTIVE', label: 'Спринты: Только активные' },
      { value: 'FUTURE', label: 'Спринты: Только будущие' },
      { value: 'BACKLOG', label: 'Спринты: Только бэклог' },
      { value: 'CLOSED', label: 'Спринты: Только прошедшие' },
      { value: 'all', label: 'Спринты: Все, включая прошедшие' },
    ];
    const sortFilterOptions = [
      { value: 'default', label: 'Сортировка: По умолчанию' },
      { value: 'priority_desc', label: 'Приоритет: Сначала высокий' },
      { value: 'priority_asc', label: 'Приоритет: Сначала низкий' },
      { value: 'created_desc', label: 'Дата: Сначала новые' },
      { value: 'created_asc', label: 'Дата: Сначала старые' },
    ];

    const activeElId = document.activeElement ? document.activeElement.id : null;
    const selStart = document.activeElement && 'selectionStart' in document.activeElement ? document.activeElement.selectionStart : null;
    const selEnd = document.activeElement && 'selectionEnd' in document.activeElement ? document.activeElement.selectionEnd : null;

    const colOrderPanelHtml = isColOrderPanelOpen
      ? \`<div style="padding:0;" onclick="event.stopPropagation();">
           <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
             <strong style="font-size:11px;color:#071026;">Настройка порядка столбцов</strong>
             <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-reset-col-order" style="height:20px;padding:1px 6px;font-size:10px;">По умолчанию</button>
           </div>
           \${jiraGroupingUi.html('product-columns',columnOrder,Object.fromEntries(columnOrder.map(id=>[id,(COLUMN_META[id]?.label || id).replace(/ ▾$/,'')])))}
         </div>\`
      : '';

    const topBarsHtml = \`
      \${renderDashboardNavigation()}
      <div class="ozon-ext-header-bar">
        <div style="display:flex;align-items:center;gap:20px;">
          <strong style="font-size:13.5px;font-weight:700;color:#071026;font-family:var(--ozon-font-display);letter-spacing:-0.01em;">Ozon Bank · FCRM Structure <small title="Версия установленного расширения" style="margin-left:4px;font:500 11px sans-serif;color:#475569;">v${EXTENSION_VERSION}</small></strong>
          <a href="#all-sprints" id="ozon-ext-show-all-sprints" style="color:#005BFF;font-size:12px;font-weight:600;text-decoration:none;">Все спринты\${productDashboardLoaded ? ' (' + tasks.filter((t) => !isCanceledStatus(t.status)).length + ')' : ''}</a>
          <span style="font-size:11px;color:#64748B;display:inline-flex;align-items:center;gap:4px;" title="Красная скрепка отмечает задачи без привязанной «Задачи проекта»">
            \${getMissingProjectTaskWarnSvg()} <span>— нет «Задачи проекта»</span>
          </span>
          <span style="font-size:11px;color:#64748B;display:inline-flex;align-items:center;gap:4px;" title="Красный человечек отмечает задачи без назначенного Исполнителя">
            \${getMissingAssigneeWarnSvg()} <span>— нет Исполнителя</span>
          </span>
          <span id="ozon-ext-toast" class="ozon-ext-badge ozon-ext-badge-done" style="display:\${saveToastText ? 'inline-flex' : 'none'};font-size:11px;padding:2px 8px;">\${escapeHtml(saveToastText)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748B;">
          <span>\${escapeHtml(statusMessage.replace(/^Спринт → Компонент/, productGroupingOrder.length ? productGroupingOrder.map((field) => field === 'sprint' ? 'Спринт' : 'Компонент').join(' → ') : 'Без группировки'))}</span>
          <button type="button" class="ozon-ext-btn" id="ozon-thread-create">Создать FCRM из треда</button>

        </div>
      </div>

      <div class="ozon-ext-filter-bar">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
          <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-toggle-col-order"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg> Настройки</button>

          \${renderToolbarFilter("sprint", "Спринты", filterSprintState, sprintFilterOptions, "Поиск режима спринтов...")}
          <button type="button" class="ozon-ext-btn" id="ozon-ext-reload-board" \${isInitialBoardLoading ? 'disabled' : ''}>\${isInitialBoardLoading ? 'Загружаем…' : productDashboardLoaded ? 'Обновить задачи' : 'Загрузить задачи'}</button>
          <span class="ozon-product-filter-hint">\${isInitialBoardLoading ? 'Загружаем задачи…' : productDashboardLoaded ? 'Фильтры по загруженным задачам' : '1. Выберите спринты → 2. Загрузите задачи'}</span>
          <div class="ozon-product-optional-filters" style="display:contents;">
          <div style="position:relative;width:240px;">
            <input \${!productDashboardLoaded || isInitialBoardLoading ? 'disabled' : ''} id="ozon-ext-search" type="search" value="\${escapeHtml(searchQuery)}" placeholder="Поиск по ключу, задаче, типу, Заказчик/Owner..." style="width:100%;height:26px;padding-left:10px;" />
          </div>

          \${renderToolbarFilter("component", "Компонент: Все", filterComponent, componentFilterOptions, "Поиск компонента...")}

          \${renderToolbarFilter("epic", "Эпик: Все", filterEpic, epicFilterOptions, "Поиск эпика по коду или названию...")}

          \${renderToolbarFilter("status", "Статус: Все", filterStatus, statusFilterOptions, "Поиск статуса...")}



          <button type="button" \${!productDashboardLoaded || isInitialBoardLoading ? 'disabled' : ''} id="ozon-ext-toggle-done" aria-pressed="\${hideDone}" class="ozon-ext-btn \${hideDone ? '' : 'ozon-ext-btn-surface'}">\${doneToggleLabel(doneCount)}</button>
          \${renderToolbarFilter('issue-type', 'Тип запроса: Все', filterIssueType, issueTypeFilterOptions, 'Поиск типа запроса...')}
          \${jiraGroupingUi.depthHtml('product',treeLevelOptions,tableTreeLevel === 'sprints' && !productGroupingOrder.length ? 'tasks' : tableTreeLevel,!productDashboardLoaded || isInitialBoardLoading)}



          \${
            searchQuery || filterComponent !== 'all' || filterEpic !== 'all' || filterStatus !== 'all' || filterSprintState !== 'open_future_backlog' || hideDone || filterIssueType !== 'all' || sortByField !== 'default'
              ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-ext-reset-filters">Сбросить</button>'
              : ''
          }
          </div>
        </div>

        \${isColOrderPanelOpen ? \`<aside class="ozon-ext-product-settings" role="dialog" aria-label="Настройки таблицы" style="position:fixed;inset:0 0 0 auto;width:390px;max-width:100vw;z-index:2147483645;display:flex;flex-direction:column;gap:16px;padding:20px;background:#fff;box-shadow:-8px 0 32px #07102620;overflow:auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;"><strong>Настройки таблицы</strong><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-close-settings" aria-label="Закрыть">✕</button></div>
          <div><strong>Сортировка</strong><div style="margin-top:8px;">\${renderToolbarFilter("sort", "Сортировка", sortByField, sortFilterOptions, "Поиск варианта сортировки...")}</div></div>
          <div><strong>Группировка</strong>\${jiraGroupingUi.html('product',productGroupingOrder,{sprint:'Спринт',component:'Компонент'},'data-product-group')}</div>
          <div><strong>Столбцы</strong><p style="font-size:11px;color:#64748B;">Ширину можно менять за границу заголовка таблицы.</p>\${colOrderPanelHtml}</div>
          <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-reset-cols">Сбросить ширину</button>
          <button type="button" class="ozon-ext-btn" id="ozon-ext-done-settings">Готово</button>
        </aside>\` : ''}
      </div>
    \`;

    const colgroupHtml = columnOrder
      .map((colId) => {
        const w = Number(colWidths[colId]) || 130;
        return \`<col data-col="\${escapeHtml(colId)}" style="width:\${w}px" />\`;
      })
      .join('');

    const theadRowHtml = columnOrder
      .map((colId) => {
        const w = Number(colWidths[colId]) || 130;
        const meta = colId === 'task' ? { label: 'Задача (' + [...productGroupingOrder.map((field) => field === 'sprint' ? 'Спринт' : 'Компонент'), 'Задача'].join(' → ') + ')', accent: false } : (COLUMN_META[colId] || { label: colId, accent: false });
        return \`<th data-col="\${escapeHtml(colId)}" draggable="true" title="Перетащите заголовок для изменения порядка столбцов" style="width:\${w}px;min-width:\${w}px;max-width:\${w}px;cursor:grab;\${meta.accent ? 'color:var(--ozon-fcrm-link,#005BFF) !important;' : ''}">\${escapeHtml(meta.label)}<div class="ozon-ext-col-resizer" data-col="\${escapeHtml(colId)}"></div></th>\`;
      })
      .join('');

    const existingTablePane = document.getElementById('ozon-ext-table-pane');
    const existingTopBars = document.getElementById('ozon-ext-top-bars');
    const existingWorkspace = document.getElementById('ozon-ext-workspace');

    // Если каркас уже создан — обновляем ТОЛЬКО внутренние узлы, НЕ уничтожая скролл-контейнеры (#ozon-ext-table-pane и #ozon-ext-sidebar-panel)!
    if (existingTablePane && existingTopBars && existingWorkspace) {
      existingTopBars.innerHTML = topBarsHtml;

      const mainTable = document.getElementById('ozon-ext-main-table');
      if (mainTable) {
        mainTable.style.setProperty('width', 'max(100%, ' + totalTableW + 'px)', 'important');
        mainTable.style.setProperty('min-width', totalTableW + 'px', 'important');
        mainTable.style.setProperty('max-width', 'none', 'important');
      }
      const colgroupEl = document.getElementById('ozon-ext-colgroup');
      if (colgroupEl) colgroupEl.innerHTML = colgroupHtml;
      const theadTrEl = document.getElementById('ozon-ext-thead-tr');
      if (theadTrEl) theadTrEl.innerHTML = theadRowHtml;
      const tbodyEl = document.getElementById('ozon-ext-tbody');
      if (tbodyEl) tbodyEl.innerHTML = rowsHtml;

      const existingSbPanel = document.getElementById('ozon-ext-sidebar-panel');
      const existingSbResizer = document.getElementById('ozon-ext-sidebar-resizer');

      if (!sidebarHtml) {
        if (existingSbResizer) existingSbResizer.remove();
        if (existingSbPanel) existingSbPanel.remove();
      } else if (existingSbPanel) {
        // Обновляем внутренности существующего <aside id="ozon-ext-sidebar-panel"> без пересоздания самого скролл-элемента!
        const currentImproveButton = existingSbPanel.querySelector('.o3ds-btn');
        const keepImproveButton = currentImproveButton && currentImproveButton.getAttribute('data-issue-key') === selectedTaskKey;
        if (keepImproveButton) currentImproveButton.remove();
        const tmp = document.createElement('div');
        tmp.innerHTML = sidebarHtml;
        const parsedAside = tmp.querySelector('#ozon-ext-sidebar-panel');
        if (parsedAside) {
          existingSbPanel.style.width = sidebarWidthCss();
          existingSbPanel.innerHTML = parsedAside.innerHTML;
          const refreshedSummaryInput = existingSbPanel.querySelector('#ozon-sb-summary');
          if (keepImproveButton && refreshedSummaryInput) {
            refreshedSummaryInput.dataset.o3dsMounted = '1';
            refreshedSummaryInput.insertAdjacentElement('afterend', currentImproveButton);
          }
        }
      } else {
        const tmp = document.createElement('div');
        tmp.innerHTML = sidebarHtml;
        while (tmp.firstChild) {
          existingWorkspace.appendChild(tmp.firstChild);
        }
      }
    } else {
      root.innerHTML = \`
        <div id="ozon-ext-top-bars" style="flex-shrink:0;">
          \${topBarsHtml}
        </div>
        <div class="ozon-ext-workspace" id="ozon-ext-workspace">
          <div class="ozon-ext-table-pane" id="ozon-ext-table-pane">
            <table class="ozon-ext-table" id="ozon-ext-main-table" style="width:max(100%, \${totalTableW}px) !important;min-width:\${totalTableW}px !important;max-width:none !important;">
              <colgroup id="ozon-ext-colgroup">
                \${colgroupHtml}
              </colgroup>
              <thead>
                <tr id="ozon-ext-thead-tr">
                  \${theadRowHtml}
                </tr>
              </thead>
              <tbody id="ozon-ext-tbody">
                \${rowsHtml}
              </tbody>
            </table>
          </div>
          \${sidebarHtml}
        </div>
      \`;
    }

    // Восстанавливаем позицию прокрутки левой панели задач и правого сайдбара
    restoreAllScrollPositions(savedScroll);
    const settings = root.querySelector('.ozon-ext-product-settings');
    if (settings) settings.scrollTop = settingsScroll;

    decorateIssueCopyButtons(root);
    animateDashboardSurfaces(root);
    bindStructureEvents(root);
    bindDashboardNavigation(root);

    // Автоматически подстраиваем высоту описания под текст (если открыт режим редактирования)
    const descEl = document.getElementById('ozon-sb-description');
    if (descEl) {
      descEl.style.height = 'auto';
      descEl.style.height = Math.max(90, descEl.scrollHeight) + 'px';
    }

    if (activeElId) {
      const restored = document.getElementById(activeElId);
      if (restored) {
        try {
          restored.focus({ preventScroll: true });
        } catch (e) {
          restored.focus();
        }
        if (selStart !== null && 'setSelectionRange' in restored) {
          try {
            restored.setSelectionRange(selStart, selEnd);
          } catch (e) {}
        }
      }
    }

    restoreAllScrollPositions(savedScroll);
    positionSidebarPickers(root);
  }

  async function refreshLinksWithoutSkeleton(sourceKey) {
    const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(sourceKey) + '?fields=' + getBoardFieldsParam(), { credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'} });
    if (!response.ok) throw new Error('Связь сохранена, но не удалось обновить список.');
    const raw = await response.json();
    await syncStrategyLinks(raw);
    syncStrategyIssue(raw);
    const [enriched, remoteLinks] = await Promise.all([normalizeAndEnrichJiraIssues([raw], true), loadRemoteIssueLinks(sourceKey)]);
    if (!enriched[0]) throw new Error('Связь сохранена, но не удалось обновить список.');
    const updated = enriched[0];
    tasks = tasks.map((item) => item.key === sourceKey ? Object.assign({}, item, {projectTaskLinks:updated.projectTaskLinks, inProjectLinks:updated.inProjectLinks, otherLinks:[...(updated.otherLinks || []), ...remoteLinks]}) : item);
    renderStructure();
  }

  function bindTicketSearchEvents(root) {
    root.querySelectorAll('[data-thread-link-url]').forEach(button => {
      button.addEventListener('click', async () => {
        const source = button.getAttribute('data-issue-key');
        const url = button.getAttribute('data-thread-link-url');
        try {
          if (!source || !url || !['http:', 'https:'].includes(new URL(url).protocol)) throw new Error('Некорректная ссылка на сообщение');
          button.disabled = true;
          const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(source) + '/remotelink', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({object:{url,title:'Сообщение chatZone'}})});
          if (!response.ok) throw new Error('Jira вернула ошибку ' + response.status);
          try { await refreshLinksWithoutSkeleton(source); } catch (error) { showSaveToast(error.message); return; }
          showSaveToast('✓ Ссылка на сообщение добавлена');
        } catch (error) { button.disabled = false; showSaveToast('Не удалось добавить ссылку: ' + (error.message || error)); }
      });
    });
    root.querySelectorAll('[data-similar-link]').forEach(button => {
      button.addEventListener('click', async () => {
        const source = button.getAttribute('data-issue-key');
        const target = button.getAttribute('data-similar-link');
        if (!source || !target || source === target) { showSaveToast('Выберите другую задачу'); return; }
        button.disabled = true;
        try {
          const linked = await createIssueLinkInJira(source, target, 'linkedTask', true, true);
          if (linked) { try { await refreshLinksWithoutSkeleton(source); } catch (error) { showSaveToast(error.message); return; } showSaveToast('Связь создана'); }
          else button.disabled = false;
        } catch (error) { button.disabled = false; showSaveToast('Не удалось создать связь: ' + (error.message || error)); }
      });
    });
    root.querySelectorAll('[data-ticket-search-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.issueKey;
        const kind = button.dataset.ticketSearchToggle;
        const state = getTicketSearchState(key, kind);
        state.open = !state.open;
        renderStructure();
        // The dashboard restores its previous scroll position in the same frame.
        window.requestAnimationFrame(() => {
          if (!isStructureVisible || selectedTaskKey !== key) return;
          const panel = document.getElementById('ozon-ext-sidebar-panel');
          const next = panel?.querySelector('[data-ticket-search-toggle="' + kind + '"]');
          if (!next) return;
          next.focus({preventScroll:true});
          if (state.open) {
            const header = panel.querySelector('.ozon-ext-sidebar-header');
            const top = panel.scrollTop + next.getBoundingClientRect().top - panel.getBoundingClientRect().top - (header?.offsetHeight || 0) - 8;
            panel.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
          }
        });
      });
    });
    root.querySelectorAll('[data-ticket-search-channels]').forEach(input => {
      input.addEventListener('input', () => {
        getTicketSearchState(input.getAttribute('data-ticket-search-channels'), 'threads').channels = input.value;
      });
    });
    root.querySelectorAll('[data-ticket-search-run]').forEach(button => {
      button.addEventListener('click', async () => {
        const key = button.getAttribute('data-issue-key');
        const kind = button.getAttribute('data-ticket-search-run');
        const state = getTicketSearchState(key, kind);
        if (state.loading) return;
        state.error = '';
        if (kind === 'threads') {
          try {
            addThreadChannels(state);
            const queue = state.choices.filter(choice => choice.checked).map(choice => choice.url);
            if (!queue.length) throw new Error('Выберите хотя бы один канал');
            state.queue = queue;
            state.index = 0;
            state.history = [];
            state.reply = '';
            await runThreadChannelStep(key);
          } catch (error) {
            state.error = String(error.message || error);
            renderStructure();
          }
          return;
        }
        state.loading = true;
        state.items = null;
        state.errors = [];
        state.raw = '';
        renderStructure();
        try {
          const text = await new Promise((resolve, reject) => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) { reject(new Error('Поиск доступен в установленном расширении Chrome')); return; }
            chrome.runtime.sendMessage({type:'o3ds:chat', mode:'search_fcrm', issueKey:key, approvedDescription:'{}'}, response => {
              const error = chrome.runtime.lastError;
              if (error || !response?.ok) reject(new Error(error?.message || response?.error || 'Нет ответа DeepSeek'));
              else resolve(response.text || '');
            });
          });
          try {
            const result = parseTicketSearchResponse(String(text), kind, key);
            state.items = result.items;
            state.errors = result.errors;
            state.coverage = result.coverage;
          } catch (error) {
            state.error = String(error.message || error);
            state.raw = String(text);
          }
        } catch (error) {
          state.error = String(error.message || error);
        } finally {
          state.loading = false;
          if (selectedTaskKey === key) renderStructure();
        }
      });
    });
    root.querySelectorAll('[data-thread-channel-check]').forEach(input => {
      input.addEventListener('change', () => {
        const state = getTicketSearchState(input.getAttribute('data-issue-key'), 'threads');
        if (state.loading || state.queue.length) return;
        state.choices[Number(input.getAttribute('data-thread-channel-check'))].checked = input.checked;
      });
    });
    root.querySelectorAll('[data-thread-channel-move]').forEach(button => {
      button.addEventListener('click', () => {
        const state = getTicketSearchState(button.getAttribute('data-issue-key'), 'threads');
        if (state.loading || state.queue.length) return;
        const from = Number(button.getAttribute('data-thread-channel-move'));
        const to = from + Number(button.getAttribute('data-direction'));
        if (to < 0 || to >= state.choices.length) return;
        const [choice] = state.choices.splice(from, 1);
        state.choices.splice(to, 0, choice);
        renderStructure();
      });
    });
    root.querySelectorAll('[data-thread-channel-row]').forEach(row => {
      row.addEventListener('dragstart', event => {
        const key = row.getAttribute('data-issue-key');
        const state = getTicketSearchState(key, 'threads');
        if (state.loading || state.queue.length) { event.preventDefault(); return; }
        draggedThreadChannel = { key, index: Number(row.getAttribute('data-thread-channel-row')) };
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(draggedThreadChannel.index));
      });
      row.addEventListener('dragover', event => {
        if (!draggedThreadChannel || draggedThreadChannel.key !== row.getAttribute('data-issue-key')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      });
      row.addEventListener('drop', event => {
        event.preventDefault();
        const key = row.getAttribute('data-issue-key');
        const state = getTicketSearchState(key, 'threads');
        if (!draggedThreadChannel || draggedThreadChannel.key !== key || state.loading || state.queue.length) return;
        const [choice] = state.choices.splice(draggedThreadChannel.index, 1);
        state.choices.splice(Number(row.getAttribute('data-thread-channel-row')), 0, choice);
        draggedThreadChannel = null;
        renderStructure();
      });
      row.addEventListener('dragend', () => { draggedThreadChannel = null; });
    });
    root.querySelectorAll('[data-thread-channels-add]').forEach(button => {
      button.addEventListener('click', () => {
        const state = getTicketSearchState(button.getAttribute('data-issue-key'), 'threads');
        if (state.loading || state.queue.length) return;
        try { addThreadChannels(state); state.error = ''; }
        catch (error) { state.error = String(error.message || error); }
        renderStructure();
      });
    });
    root.querySelectorAll('[data-thread-search-next]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-issue-key');
        const state = getTicketSearchState(key, 'threads');
        if (state.loading || state.index + 1 >= state.queue.length) return;
        state.index++;
        runThreadChannelStep(key);
      });
    });
    root.querySelectorAll('[data-thread-search-retry]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-issue-key');
        const index = Number(button.getAttribute('data-thread-search-retry'));
        if (!Number.isInteger(index) || index < 0) return;
        runThreadChannelStep(key, '', index);
      });
    });
    root.querySelectorAll('[data-thread-search-reset]').forEach(button => {
      button.addEventListener('click', () => {
        const state = getTicketSearchState(button.getAttribute('data-issue-key'), 'threads');
        if (state.loading) return;
        state.queue = [];
        state.index = -1;
        state.error = '';
        renderStructure();
      });
    });
    root.querySelectorAll('[data-thread-search-reply]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.getAttribute('data-thread-search-reply');
        const state = getTicketSearchState(key, 'threads');
        state.reply = input.value;
        const button = root.querySelector('[data-thread-search-answer][data-issue-key="' + key + '"]');
        if (button) button.disabled = state.loading || !state.reply.trim();
      });
    });
    root.querySelectorAll('[data-thread-search-answer]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-issue-key');
        const state = getTicketSearchState(key, 'threads');
        if (state.loading || !state.reply.trim()) return;
        runThreadChannelStep(key, state.reply.trim());
      });
    });
  }

  function getSidebarSource(button) {
    const row = button?.closest('tr');
    const id = row?.dataset.detailsRow || row?.dataset.strategyPath;
    return id ? { view: activeDashboardView, id } : null;
  }

  function highlightSidebarSource(root) {
    if (!isSidebarOpen || sidebarSource?.view !== activeDashboardView) return;
    const attribute = activeDashboardView === 'strategy' ? 'data-strategy-path' : 'data-details-row';
    const row = root.querySelector('tr[' + attribute + '="' + CSS.escape(sidebarSource.id) + '"]');
    const button = row?.querySelector('[data-details-trigger]');
    if (!button) return;
    row.classList.add('ozon-details-source');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', 'ozon-ext-sidebar-panel');
  }

  function bindSharedTaskControls(root) {
    highlightSidebarSource(root);
    root.querySelectorAll('[data-action="generate-links"]').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const keys = Array.from(new Set((button.getAttribute('data-task-keys') || '').split(',').filter(key => key && !generatingLinkKeys.has(key))));
        if (!keys.length) {
          showLinksSnackbar('Эти задачи уже обрабатываются');
          return;
        }
        keys.forEach(key => generatingLinkKeys.add(key));
        const results = [];
        const updateSnackbar = showLinksSnackbar('Генерирую связи для ' + keys.length + ' задач. Можно продолжать работу.');
        renderStructure();
        try {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            try {
              const text = await new Promise((resolve, reject) => {
                if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                  reject(new Error('Генерация доступна в установленном расширении Chrome'));
                  return;
                }
                chrome.runtime.sendMessage({ type: 'o3ds:chat', mode: 'links', issueKey: key }, response => {
                  const error = chrome.runtime.lastError;
                  if (error || !response?.ok) reject(new Error(error?.message || response?.error || 'Нет ответа DeepSeek'));
                  else resolve(response.text || 'DeepSeek вернул пустой ответ');
                });
              });
              results.push(key + '\\n' + text);
              await refreshGeneratedTaskLinks(key);
            } catch (error) {
              results.push(key + ' · Ошибка: ' + String(error.message || error));
            } finally {
              generatingLinkKeys.delete(key);
              updateSnackbar(results.map(result => renderStructuredAnswer(result, 'links', renderAnswerMarkup)).join(''), true);
              renderStructure();
            }
          }
        } finally {
          keys.forEach(key => generatingLinkKeys.delete(key));
        }
      });
    });

    root.querySelectorAll('[data-action="toggle-search-select"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const id = button.getAttribute('data-select-id') || '';
        activeSearchSelectId = activeSearchSelectId === id ? '' : id;
        searchSelectQuery = '';
        activeToolbarFilter = '';
        sbEpicComboOpen = false;
        sbCompComboOpen = false;
        sbIpCompOpenIdx = null;
        sbIpSprintOpenIdx = null;
        renderStructure();
        if (activeSearchSelectId) document.getElementById('ozon-search-select-search')?.focus();
      });
    });
    const searchSelectInput = document.getElementById('ozon-search-select-search');
    if (searchSelectInput) {
      searchSelectInput.addEventListener('click', (event) => event.stopPropagation());
      searchSelectInput.addEventListener('input', (event) => {
        searchSelectQuery = event.target.value;
        renderStructure();
      });
    }
    root.querySelectorAll('[data-action="pick-search-select"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const id = button.getAttribute('data-select-id') || '';
        const value = button.getAttribute('data-value') || '';
        if (id.startsWith('table-sprint-')) {
          const key = id.slice('table-sprint-'.length);
          tasks = tasks.map(task => task.key === key ? Object.assign({}, task, { sprint: value }) : task);
          saveTaskOverride(key, { sprint: value });
          updateIssueSprintInJira(key, value);
        } else if (selectedTaskKey) {
          const key = selectedTaskKey;
          if (id === 'sidebar-status') {
            tasks = tasks.map(task => task.key === key ? Object.assign({}, task, { status: value }) : task);
            saveTaskOverride(key, { status: value });
            transitionIssueStatusInJira(key, value, button.getAttribute('data-transition-id') || null);
          } else if (id === 'sidebar-issuetype') {
            const typeId = issueTypeIdByName[value] || issueTypeIdByName[String(value).toLowerCase()] || '';
            const issueTypeUpdate = { issueTypeName: value, issueTypeId: typeId, issueTypeIconUrl: '' };
            tasks = tasks.map(task => task.key === key ? Object.assign({}, task, issueTypeUpdate) : task);
            saveTaskOverride(key, issueTypeUpdate);
            updateIssueTypeInJira(key, value);
          } else if (id === 'sidebar-sprint') {
            tasks = tasks.map(task => task.key === key ? Object.assign({}, task, { sprint: value }) : task);
            saveTaskOverride(key, { sprint: value });
            updateIssueSprintInJira(key, value);
          }
        }
        activeSearchSelectId = '';
        searchSelectQuery = '';
        renderStructure();
      });
    });

  }

  function bindStructureEvents(root) {
    root.querySelector('#ozon-thread-create')?.addEventListener('click', openThreadCreationSidebar);
    root.querySelectorAll('[data-action="toggle-toolbar-filter"]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-filter');
        activeToolbarFilter = activeToolbarFilter === id ? '' : id;
        toolbarFilterSearch = '';
        renderStructure();
        if (activeToolbarFilter) document.getElementById('ozon-toolbar-filter-search')?.focus();
      });
    });
    const toolbarFilterSearchEl = document.getElementById('ozon-toolbar-filter-search');
    if (toolbarFilterSearchEl) {
      toolbarFilterSearchEl.addEventListener('input', (event) => {
        const caretStart = event.target.selectionStart, caretEnd = event.target.selectionEnd;
        toolbarFilterSearch = event.target.value;
        renderStructure();
        const nextSearch = document.getElementById('ozon-toolbar-filter-search');
        if (nextSearch) { nextSearch.focus({preventScroll:true}); if (caretStart != null && caretEnd != null) nextSearch.setSelectionRange(caretStart, caretEnd); }
      });
    }
    root.querySelectorAll('[data-action="pick-toolbar-filter"]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-filter');
        const value = button.getAttribute('data-value');
        if (filter === 'component') filterComponent = value;
        if (filter === 'epic') filterEpic = value;
        if (filter === 'status') filterStatus = value;
        if (filter === 'sprint') filterSprintState = value;
        if (filter === 'sort') sortByField = value;
        if (filter === 'issue-type') filterIssueType = value;
        activeToolbarFilter = '';
        toolbarFilterSearch = '';
        if (filter === 'sprint' && productDashboardLoaded) { const covered = {all:['all','CLOSED','ACTIVE','FUTURE','BACKLOG','open_future','open_future_backlog'],open_future_backlog:['open_future_backlog','open_future','ACTIVE','FUTURE','BACKLOG'],open_future:['open_future','ACTIVE','FUTURE'],ACTIVE:['ACTIVE'],FUTURE:['FUTURE'],BACKLOG:['BACKLOG'],CLOSED:['CLOSED']}; statusMessage = (covered[loadedSprintMode] || []).includes(value) ? '' : 'Для выбранных спринтов нажмите «Обновить задачи»'; }
        renderStructure();
      });
    });

    const searchEl = document.getElementById('ozon-ext-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        treeLevelApplied = false;
        tableTreeLevel = 'manual';
        const tbody = document.getElementById('ozon-ext-tbody');
        if (tbody) {
          const saved = captureAllScrollPositions();
          const { filtered, doneCount } = getFilteredTasks();
          tbody.innerHTML = buildTableRowsHtml(filtered);
          document.getElementById("ozon-ext-toggle-done").textContent = doneToggleLabel(doneCount);
          bindTableBodyEvents(tbody);
          restoreAllScrollPositions(saved);
        }
      });
    }

    const showAllSprintsLink = document.getElementById('ozon-ext-show-all-sprints');
    if (showAllSprintsLink) {
      showAllSprintsLink.addEventListener('click', (e) => {
        e.preventDefault();
        activeToolbarFilter = '';
        toolbarFilterSearch = '';
        expandedSprints = {};
        expandedComponents = {};
        searchQuery = '';
        filterComponent = 'all';
        filterEpic = 'all';
        filterStatus = 'all';
        filterSprintState = 'open_future_backlog';
        hideDone = false;
        filterIssueType = 'all';
        sortByField = 'default';
        renderStructure();
      });
    }

    const filterCompEl = document.getElementById('ozon-ext-filter-comp');
    if (filterCompEl) {
      filterCompEl.addEventListener('change', (e) => {
        filterComponent = e.target.value;
        renderStructure();
      });
    }

    const filterEpicEl = document.getElementById('ozon-ext-filter-epic');
    if (filterEpicEl) {
      filterEpicEl.addEventListener('change', (e) => {
        filterEpic = e.target.value;
        renderStructure();
      });
    }

    const filterStatusEl = document.getElementById('ozon-ext-filter-status');
    if (filterStatusEl) {
      filterStatusEl.addEventListener('change', (e) => {
        filterStatus = e.target.value;
        renderStructure();
      });
    }

    const filterSprintStateEl = document.getElementById('ozon-ext-filter-sprint-state');
    if (filterSprintStateEl) {
      filterSprintStateEl.addEventListener('change', (e) => {
        filterSprintState = e.target.value;
        renderStructure();
      });
    }

    document.getElementById("ozon-ext-toggle-done").onclick = () => {
      hideDone = !hideDone;
      renderStructure();
    };
    const sortByEl = document.getElementById('ozon-ext-sort-by');
    if (sortByEl) {
      sortByEl.addEventListener('change', (e) => {
        sortByField = e.target.value;
        renderStructure();
      });
    }

    const resetFiltersBtn = document.getElementById('ozon-ext-reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        searchQuery = '';
        filterComponent = 'all';
        filterEpic = 'all';
        filterStatus = 'all';
        filterSprintState = 'open_future_backlog';
        hideDone = false;
        filterIssueType = 'all';
        sortByField = 'default';
        activeToolbarFilter = '';
        toolbarFilterSearch = '';
        renderStructure();
      });
    }

    ['ozon-ext-close-settings', 'ozon-ext-done-settings'].forEach((id) => {
      document.getElementById(id)?.addEventListener('click', (event) => { event.stopPropagation(); isColOrderPanelOpen = false; activeToolbarFilter = ''; renderStructure(); });
    });

    const saveProductGrouping = () => { localStorage.setItem(productGroupingStorage, JSON.stringify(productGroupingOrder)); groupByComponentInsideSprint = productGroupingOrder.length > 1; productExpandedGroups = {}; expandedSprints = {}; expandedComponents = {}; tableTreeLevel = 'sprints'; treeLevelApplied = false; renderStructure(); };
    root.querySelectorAll('[data-product-group]').forEach((input) => input.addEventListener('change', () => { const field = input.getAttribute('data-product-group'); productGroupingOrder = input.checked ? [...productGroupingOrder, field] : productGroupingOrder.filter((value) => value !== field); saveProductGrouping(); }));
    jiraGroupingUi.bind(root,(order,id)=>{
      if (id === 'product') {productGroupingOrder=order;saveProductGrouping();return;}
      if (id !== 'product-columns') return;
      columnOrder=order;
      try {localStorage.setItem(STORAGE_KEY_COL_ORDER,JSON.stringify(columnOrder));} catch (_) {}
      renderStructure();
    });
    jiraGroupingUi.bindDepth(root,level=>{
      if (level==='manual') return;
      applyTableTreeLevel(level);
      renderStructure();
    });

    const toggleColOrderBtn = document.getElementById('ozon-ext-toggle-col-order');
    if (toggleColOrderBtn) {
      toggleColOrderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isColOrderPanelOpen = !isColOrderPanelOpen;
        renderStructure();
      });
    }

    const resetColOrderBtn = document.getElementById('ozon-ext-reset-col-order');
    if (resetColOrderBtn) {
      resetColOrderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        columnOrder = [...DEFAULT_COLUMN_ORDER];
        localStorage.removeItem(STORAGE_KEY_COL_ORDER);
        renderStructure();
      });
    }

    // Drag & Drop заголовков столбцов <th>
    let draggedColId = null;
    root.querySelectorAll('th[data-col]').forEach((th) => {
      th.addEventListener('dragstart', (e) => {
        draggedColId = th.getAttribute('data-col');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
      });
      th.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      th.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetColId = th.getAttribute('data-col');
        if (!draggedColId || !targetColId || draggedColId === targetColId) return;
        const fromIdx = columnOrder.indexOf(draggedColId);
        const toIdx = columnOrder.indexOf(targetColId);
        if (fromIdx < 0 || toIdx < 0) return;
        const next = [...columnOrder];
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, draggedColId);
        columnOrder = next;
        try {
          localStorage.setItem(STORAGE_KEY_COL_ORDER, JSON.stringify(columnOrder));
        } catch (err) {}
        showSaveToast('✓ Порядок столбцов обновлён');
        renderStructure();
      });
    });

    const reloadBoardBtn = document.getElementById('ozon-ext-reload-board');
    if (reloadBoardBtn) {
      reloadBoardBtn.addEventListener('click', () => {
        loadBoardIssuesFromJira();
      });
    }

    const resetColsBtn = document.getElementById('ozon-ext-reset-cols');
    if (resetColsBtn) {
      resetColsBtn.addEventListener('click', () => {
        colWidths = Object.assign({}, defaultColWidths);
        localStorage.removeItem(STORAGE_KEY_COL_WIDTHS);
        renderStructure();
      });
    }

    root.querySelectorAll('.ozon-ext-col-resizer').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const colKey = handle.getAttribute('data-col');
        const startX = e.clientX;
        const startW = Number(colWidths[colKey]) || 150;
        handle.classList.add('active');

        function onMove(moveEv) {
          const delta = moveEv.clientX - startX;
          const nextW = Math.max(70, Math.min(950, startW + delta));
          colWidths[colKey] = nextW;

          const colEl = root.querySelector('col[data-col="' + colKey + '"]');
          if (colEl) {
            colEl.style.width = nextW + 'px';
          }
          const thEl = root.querySelector('th[data-col="' + colKey + '"]');
          if (thEl) {
            thEl.style.setProperty('width', nextW + 'px', 'important');
            thEl.style.setProperty('min-width', nextW + 'px', 'important');
            thEl.style.setProperty('max-width', nextW + 'px', 'important');
          }
          const totalW = getTotalTableWidth();
          const tableEl = document.getElementById('ozon-ext-main-table');
          if (tableEl) {
            tableEl.style.setProperty('width', 'max(100%, ' + totalW + 'px)', 'important');
            tableEl.style.setProperty('min-width', totalW + 'px', 'important');
            tableEl.style.setProperty('max-width', 'none', 'important');
          }
        }

        function onUp() {
          handle.classList.remove('active');
          try {
            localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(colWidths));
          } catch (err) {}
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    });

    const tbody = document.getElementById('ozon-ext-tbody');
    if (tbody) {
      bindTableBodyEvents(tbody);
    }

    taskDetailsSidebar.bind(root);
  }

  function bindTableBodyEvents(tbody) {
    tbody.querySelectorAll('.ozon-ext-product-group').forEach((row) => row.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); const key = row.getAttribute('data-group-key'); if (!key) return; const depth = JSON.parse(key).length - 1; const defaultExpanded = treeLevelApplied && (tableTreeLevel === 'tasks' || tableTreeLevel === 'links' || (tableTreeLevel === 'components' && depth === 0)); const current = Object.prototype.hasOwnProperty.call(productExpandedGroups, key) ? productExpandedGroups[key] : (defaultExpanded || (!treeLevelApplied && Boolean(searchQuery.trim()))); productExpandedGroups[key] = !current; renderStructure(); }));
    tbody.querySelectorAll('.ozon-ext-sprint-row').forEach((row) => {
      if (row.classList.contains('ozon-ext-product-group')) return;
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const sp = row.getAttribute('data-sprint');
        if (!sp) return;
        tableTreeLevel = 'manual';
        const wasExpanded = Boolean(expandedSprints[sp]);
        expandedSprints[sp] = !wasExpanded;
        renderStructure();
      });
    });

    tbody.querySelectorAll('.ozon-ext-comp-group-row').forEach((row) => {
      if (row.classList.contains('ozon-ext-product-group')) return;
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const cg = row.getAttribute('data-comp-group');
        if (!cg) return;
        tableTreeLevel = 'manual';
        const wasExpanded = Boolean(expandedComponents[cg]);
        expandedComponents[cg] = !wasExpanded;
        renderStructure();
      });
    });

    // По клику на саму строку задачи — разворачиваем/сворачиваем список связей
    tbody.querySelectorAll('.ozon-ext-task-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.ozon-ext-inner-ctrl')) return;
        const key = row.getAttribute('data-key');
        if (!key) return;
        activeTableCombo = null;
        expandedSubRows[key] = !expandedSubRows[key];
        renderStructure();
      });
    });

    // По клику на отдельную кнопку «◨ Детали» — открываем/закрываем боковую панель деталей задачи
    tbody.querySelectorAll('button[data-action="open-sidebar"]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        if (!key) return;
        const source = getSidebarSource(btn);
        const sameTask = isSidebarOpen && selectedTaskKey === key;
        if (sameTask && (sidebarSource?.view !== source?.view || sidebarSource?.id !== source?.id)) {
          sidebarSource = source;
          activeTableCombo = null;
          renderStructure();
          return;
        }
        if (isSidebarOpen && !await confirmSidebarExit()) return;
        activeTableCombo = null;
        if (sameTask) {
          isSidebarOpen = false;
          sidebarSource = null;
          renderStructure();
        } else {
          sidebarSource = source;
          selectedTaskKey = key;
          isSidebarOpen = true;
          isEditingDescription = false;
          collapsedSidebarSections.pt = true;
          reloadSingleTaskFromJira(key);
        }
      });
    });

    tbody.querySelectorAll('button[data-action="toggle-subrow"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        expandedSubRows[key] = !expandedSubRows[key];
        renderStructure();
      });
    });

    // Открытие кастомного поповера Статуса в таблице
    tbody.querySelectorAll('[data-action="open-table-status-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.ozon-ext-combo-popover')) return;
        const key = trigger.getAttribute('data-key');
        if (activeTableCombo && activeTableCombo.type === 'status' && activeTableCombo.taskKey === key) {
          activeTableCombo = null;
          renderStructure();
          return;
        }
        activeTableCombo = { type: 'status', taskKey: key, query: '' };
        renderStructure();
        if (key && !issueTransitionsByKey[key]) {
          fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '/transitions', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d && Array.isArray(d.transitions)) {
                issueTransitionsByKey[key] = d.transitions;
                if (activeTableCombo && activeTableCombo.type === 'status' && activeTableCombo.taskKey === key) {
                  renderStructure();
                }
              }
            })
            .catch(() => {});
        }
      });
    });

    tbody.querySelectorAll('[data-action="pick-table-status"]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = item.getAttribute('data-key');
        const newStatus = item.getAttribute('data-status');
        const explicitTrId = item.getAttribute('data-tr-id') || null;
        if (!key || !newStatus) return;
        activeTableCombo = null;
        tasks = tasks.map((t) => (t.key === key ? Object.assign({}, t, { status: newStatus }) : t));
        saveTaskOverride(key, { status: newStatus });
        transitionIssueStatusInJira(key, newStatus, explicitTrId);
        renderStructure();
      });
    });

    tbody.querySelectorAll('[data-action="close-table-epic"]').forEach(button => {
      button.addEventListener('click', event => { event.stopPropagation(); activeTableCombo = null; renderStructure(); });
    });
    // Открытие выбора эпика FCRM
    tbody.querySelectorAll('[data-action="open-table-epic-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('a, .ozon-ext-combo-popover')) return;
        const key = trigger.getAttribute('data-key');
        if (activeTableCombo && activeTableCombo.type === 'epic' && activeTableCombo.taskKey === key) {
          activeTableCombo = null;
        } else {
          activeTableCombo = { type: 'epic', taskKey: key, query: '' };
        }
        renderStructure();
        const inp = document.getElementById('ozon-table-combo-input');
        if (inp) inp.focus({ preventScroll: true });
      });
    });

    // Открытие Input-Select для Компонента прямо в ячейке таблицы
    tbody.querySelectorAll('[data-action="open-table-comp-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.ozon-ext-combo-popover')) return;
        const key = trigger.getAttribute('data-key');
        const pk = getIssueProjectKey(key);
        loadExternalProjectComponents(pk);
        if (activeTableCombo && activeTableCombo.type === 'component' && activeTableCombo.taskKey === key) {
          activeTableCombo = null;
        } else {
          activeTableCombo = { type: 'component', taskKey: key, query: '' };
        }
        renderStructure();
        const inp = document.getElementById('ozon-table-combo-input');
        if (inp) inp.focus({ preventScroll: true });
      });
    });

    // Открытие Input-Select для Исполнителя в ячейке таблицы (с поиском по людям в Jira)
    tbody.querySelectorAll('[data-action="open-table-assignee-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.ozon-ext-combo-popover')) return;
        const key = trigger.getAttribute('data-key');
        tableUserSearchResults = [];
        if (activeTableCombo && activeTableCombo.type === 'assignee' && activeTableCombo.taskKey === key) {
          activeTableCombo = null;
        } else {
          activeTableCombo = { type: 'assignee', taskKey: key, query: '' };
        }
        renderStructure();
        const inp = document.getElementById('ozon-table-combo-input');
        if (inp) inp.focus({ preventScroll: true });
      });
    });

    // Открытие Input-Select для Заказчик/Owner в ячейке таблицы (с поиском по людям в Jira)
    tbody.querySelectorAll('[data-action="open-table-customer-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.ozon-ext-combo-popover')) return;
        const key = trigger.getAttribute('data-key');
        tableUserSearchResults = [];
        if (activeTableCombo && activeTableCombo.type === 'customer' && activeTableCombo.taskKey === key) {
          activeTableCombo = null;
        } else {
          activeTableCombo = { type: 'customer', taskKey: key, query: '' };
        }
        renderStructure();
        const inp = document.getElementById('ozon-table-combo-input');
        if (inp) inp.focus({ preventScroll: true });
      });
    });

    const tableComboInput = document.getElementById('ozon-table-combo-input');
    if (tableComboInput && activeTableCombo) {
      tableComboInput.addEventListener('click', (e) => e.stopPropagation());
      tableComboInput.addEventListener('input', (e) => {
        const val = e.target.value;
        activeTableCombo.query = val;
        if (activeTableCombo.type === 'epic') {
          if (epicSearchTimer) clearTimeout(epicSearchTimer);
          if (val.trim().length >= 2) {
            epicSearchTimer = setTimeout(async () => {
              await searchFcrmEpicsInJira(val.trim());
              renderStructure();
            }, 220);
          }
        } else if (activeTableCombo.type === 'assignee' || activeTableCombo.type === 'customer') {
          if (tableUserSearchTimer) clearTimeout(tableUserSearchTimer);
          const q = val.trim();
          if (q.length >= 1) {
            const currentTaskKey = activeTableCombo.taskKey;
            tableUserSearchTimer = setTimeout(async () => {
              const found = await searchJiraUsers(q, currentTaskKey);
              tableUserSearchResults = found.filter((u) => isRealHumanJiraUser(u));
              renderStructure();
            }, 180);
          } else {
            tableUserSearchResults = [];
          }
        }
        renderStructure();
      });

      tableComboInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && activeTableCombo) {
          e.preventDefault();
          const val = tableComboInput.value.trim();
          const key = activeTableCombo.taskKey;
          if (activeTableCombo.type === 'customer' && val) {
            const firstMatch = tableUserSearchResults[0];
            const chosenDisplay = firstMatch ? firstMatch.displayName : val;
            const chosenLogin = firstMatch ? firstMatch.name : null;
            activeTableCombo = null;
            tableUserSearchResults = [];
            tasks = tasks.map((t) =>
              t.key === key ? Object.assign({}, t, { customer: Object.assign({}, t.customer, { name: chosenDisplay }) }) : t
            );
            saveTaskOverride(key, { customer: { name: chosenDisplay, department: 'FCRM' } });
            updateIssueCustomerInJira(key, chosenDisplay, chosenLogin);
            renderStructure();
          } else if (activeTableCombo.type === 'assignee' && val) {
            const firstMatch = tableUserSearchResults[0];
            const chosenDisplay = firstMatch ? firstMatch.displayName : val;
            const chosenLogin = firstMatch ? firstMatch.name : null;
            const assignee = pickedAssignee(chosenDisplay,chosenLogin,firstMatch);
            activeTableCombo = null;
            tableUserSearchResults = [];
            tasks = tasks.map((t) =>
              t.key === key ? Object.assign({}, t, {assignee}) : t
            );
            saveTaskOverride(key, {assignee});
            updateIssueAssigneeInJira(key, chosenDisplay, chosenLogin);
            renderStructure();
          }
        }
      });
    }

    tbody.querySelectorAll('[data-action="pick-table-epic"]').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = item.getAttribute('data-key');
        const epKey = item.getAttribute('data-epic-key') || '';
        const epName = item.getAttribute('data-epic-name') || (epKey ? epicNameByKey[epKey] || epKey : 'Без эпика');
        activeTableCombo = null;
        tasks = tasks.map((t) => (t.key === key ? Object.assign({}, t, { epicKey: epKey, epicName: epName }) : t));
        saveTaskOverride(key, { epicKey: epKey, epicName: epName });
        renderStructure();
        await updateIssueEpicInJira(key, epKey);
        renderStructure();
      });
    });

    tbody.querySelectorAll('[data-action="pick-table-comp"]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = item.getAttribute('data-key');
        const newComp = item.getAttribute('data-comp') || 'Без компонента';
        activeTableCombo = null;
        tasks = tasks.map((t) => (t.key === key ? Object.assign({}, t, { component: newComp, components: newComp && newComp !== 'Без компонента' ? [newComp] : [] }) : t));
        saveTaskOverride(key, { component: newComp, components: newComp && newComp !== 'Без компонента' ? [newComp] : [] });

        const compsPayload = newComp && newComp !== 'Без компонента' ? [{ name: newComp }] : [];
        fetch('/rest/api/2/issue/' + encodeURIComponent(key), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { components: compsPayload } })
        }).catch(() => {});
        showSaveToast('✓ Компонент ' + key + ' → ' + newComp);
        renderStructure();
      });
    });

    tbody.querySelectorAll('[data-action="pick-table-assignee"]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = item.getAttribute('data-key');
        const uLogin = item.getAttribute('data-user-login') || '';
        const uDisplay = item.getAttribute('data-user-display') || 'Не назначен';
        const assignee = pickedAssignee(uDisplay,uLogin,tableUserSearchResults.find(user=>user.name===uLogin));
        activeTableCombo = null;
        tableUserSearchResults = [];
        tasks = tasks.map((t) =>
          t.key === key ? Object.assign({}, t, {assignee}) : t
        );
        saveTaskOverride(key, {assignee});
        updateIssueAssigneeInJira(key, uDisplay, uLogin || null);
        renderStructure();
      });
    });

    tbody.querySelectorAll('[data-action="pick-table-customer"]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = item.getAttribute('data-key');
        const uLogin = item.getAttribute('data-user-login') || '';
        const uDisplay = item.getAttribute('data-user-display') || 'Не указан';
        activeTableCombo = null;
        tableUserSearchResults = [];
        tasks = tasks.map((t) =>
          t.key === key ? Object.assign({}, t, { customer: { name: uDisplay, department: 'FCRM' } }) : t
        );
        saveTaskOverride(key, { customer: { name: uDisplay, department: 'FCRM' } });
        updateIssueCustomerInJira(key, uDisplay, uLogin || null);
        renderStructure();
      });
    });

    tbody.querySelectorAll('select[data-action="change-sprint"]').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        const key = sel.getAttribute('data-key');
        const newSp = e.target.value;
        tasks = tasks.map((t) => (t.key === key ? Object.assign({}, t, { sprint: newSp }) : t));
        saveTaskOverride(key, { sprint: newSp });
        updateIssueSprintInJira(key, newSp);
        renderStructure();
      });
    });
  }

  function bindUserPickerClicks(container, task, updateCurrentTask) {
    if (!container) return;
    container.querySelectorAll('[data-action="pick-jira-user"]').forEach((opt) => {
      opt.addEventListener('click', () => {
        const uLogin = opt.getAttribute('data-user-login');
        const uDisplay = opt.getAttribute('data-user-display');
        const assignee = pickedAssignee(uDisplay,uLogin,searchedUsersResults.find(user=>user.name===uLogin));
        assigneeSearchQuery = '';
        searchedUsersResults = [];
        updateCurrentTask({assignee});
        updateIssueAssigneeInJira(selectedTaskKey, uDisplay, uLogin);
        renderStructure();
      });
    });
  }

  function bindCustomerPickerClicks(container, task, updateCurrentTask) {
    if (!container) return;
    container.querySelectorAll('[data-action="pick-jira-customer"]').forEach((opt) => {
      opt.addEventListener('click', () => {
        const uLogin = opt.getAttribute('data-user-login');
        const uDisplay = opt.getAttribute('data-user-display');
        customerSearchQuery = '';
        searchedCustomerResults = [];
        updateCurrentTask({
          customer: { name: uDisplay, department: 'FCRM' }
        });
        updateIssueCustomerInJira(selectedTaskKey, uDisplay, uLogin);
        renderStructure();
      });
    });
  }

  let designTaskEventBound = false;
  function bindSidebarEvents(root) {
    if (!designTaskEventBound) {
      designTaskEventBound = true;
      document.addEventListener('ozon-fcrm-create-design-task-request', async (event) => {
        let detail = event && event.detail || {};
        if (typeof detail === 'string') { try { detail = JSON.parse(detail); } catch { detail = {}; } }
        if (!detail.issueKey || !detail.summary || !detail.description) return;
        try {
          const created = await createDesignIssueFromSidebar(detail.issueKey, detail.summary, detail.description);
          document.dispatchEvent(new CustomEvent('ozon-fcrm-design-task-result', {
            detail: JSON.stringify({ issueKey: detail.issueKey, ok: true, key: created.key, linked: created.linked })
          }));
        } catch (error) {
          document.dispatchEvent(new CustomEvent('ozon-fcrm-design-task-result', {
            detail: JSON.stringify({ issueKey: detail.issueKey, ok: false, error: error && error.message ? error.message : 'Не удалось создать задачу FTD' })
          }));
        }
      });
    }
    if (!isSidebarOpen || !selectedTaskKey) return;
    const task = tasks.find((t) => t.key === selectedTaskKey);
    if (!task) return;

    const sbResizer = document.getElementById('ozon-ext-sidebar-resizer');
    const sbPanel = document.getElementById('ozon-ext-sidebar-panel');
    const expandBtn = sbPanel?.querySelector('#ozon-ext-sidebar-expand');
    function applySidebarWidth() {
      const width = sidebarWidthCss();
      if (sbPanel) sbPanel.style.width = width;
      if (sbResizer) {
        sbResizer.style.right = width;
        sbResizer.hidden = sidebarExpanded;
      }
    }
    applySidebarWidth();
    if (sbResizer && sbPanel) {
      // Product backlog keeps the resize handle when it replaces the sidebar content.
      sbResizer.onpointerdown = (event) => {
        if (event.button !== 0 || !event.isPrimary || sidebarExpanded) return;
        event.preventDefault();
        sbResizer.setPointerCapture(event.pointerId);
        sbResizer.classList.add('active');

        function onMove(move) {
          if (move.pointerId !== event.pointerId) return;
          sidebarWidth = Math.max(340,Math.min(1040,window.innerWidth-move.clientX));
          applySidebarWidth();
        }

        function onRelease(release) {
          if (release.pointerId !== event.pointerId) return;
          sbResizer.removeEventListener('pointermove',onMove);
          sbResizer.removeEventListener('lostpointercapture',onRelease);
          sbResizer.classList.remove('active');
          try {
            localStorage.setItem(STORAGE_KEY_SIDEBAR_W, String(sidebarWidth));
          } catch (err) {}
        }

        sbResizer.addEventListener('pointermove',onMove);
        sbResizer.addEventListener('lostpointercapture',onRelease);
      };
    }
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        sidebarExpanded = !sidebarExpanded;
        applySidebarWidth();
        expandBtn.title = sidebarExpandTitle();
        expandBtn.setAttribute('aria-pressed',String(sidebarExpanded));
        expandBtn.innerHTML = expandCornersIcon(sidebarExpanded);
        positionSidebarPickers(root);
      });
    }

    const closeBtn = document.getElementById('ozon-ext-sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        if (!await confirmSidebarExit()) return;
        isSidebarOpen = false;
        sidebarSource = null;
        isEditingDescription = false;
        renderStructure();
        const resume = resumeThreadFromDetails;
        resumeThreadFromDetails = null;
        resume?.();
      });
    }

    const refreshBtn = document.getElementById('ozon-ext-sidebar-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        taskDetailsSidebar.refreshComments();
        reloadSingleTaskFromJira(selectedTaskKey, true, true);
      });
    }

    root.querySelectorAll('[data-action="refresh-sidebar-section"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        refreshSidebarSection(task.key, button.getAttribute('data-section'));
      });
    });

    document.getElementById('ozon-copy-task-link')?.addEventListener('click', async () => {
      const url = 'https://jit.o3.ru/browse/' + encodeURIComponent(task.key);
      const text = '[' + task.key + '](' + url + ') ' + task.summary;
      try {
        await navigator.clipboard.writeText(text);
        showSaveToast('✓ Ссылка и название скопированы');
      } catch (_) {
        showSaveToast('Не удалось скопировать ссылку: доступ к буферу обмена запрещён');
      }
    });

    root.querySelectorAll('[data-action="move-other-to-ip"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const sourceKey = task.key;
        const targetKey = button.getAttribute('data-link-key');
        const linkId = button.getAttribute('data-jira-link-id');
        button.disabled = true;
        try {
          // Save the new relation before deleting the old one, so a failed POST never loses it.
          if (!await createIssueLinkInJira(sourceKey, targetKey, 'inProject', true)) throw new Error('Не удалось создать связь «В проекте». Исходная связь сохранена.');
          if (!await deleteIssueLinkInJira(sourceKey, targetKey, linkId)) throw new Error('Связь «В проекте» создана, но исходную связь удалить не удалось');
          await reloadSingleTaskFromJira(sourceKey, true);
          showSaveToast('✓ Тип связи с ' + targetKey + ' изменён на «В проекте»');
        } catch (error) {
          showSaveToast(error.message);
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('[data-action="change-link-type"], [data-action="delete-link"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const sourceKey = task.key, targetKey = button.getAttribute('data-link-key');
        const linkId = button.getAttribute('data-jira-link-id');
        const category = button.getAttribute('data-link-type');
        const message = button.closest('.ozon-link-actions-menu')?.querySelector('.ozon-link-action-message');
        if (!/^\\d+$/.test(String(linkId || ''))) { if (message) message.textContent = 'Не удалось определить связь в Jira. Обновите задачу.'; return; }
        button.disabled = true;
        if (message) { message.style.color = '#64748B'; message.textContent = 'Сохраняем…'; }
        try {
          if (category && !await createIssueLinkInJira(sourceKey, targetKey, category, true, true)) throw new Error('Не удалось создать выбранный тип связи. Исходная связь сохранена.');
          if (!await deleteIssueLinkInJira(sourceKey, targetKey, linkId)) throw new Error(category ? 'Новая связь создана, но исходную удалить не удалось.' : 'Не удалось удалить связь.');
          await refreshLinksWithoutSkeleton(sourceKey);
        } catch (error) { if (message) { message.style.color = '#D92D20'; message.textContent = error.message; } showSaveToast(error.message); button.disabled = false; }
      });
    });
    root.querySelectorAll('.ozon-link-actions').forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        root.querySelectorAll('.ozon-link-actions[open]').forEach((other) => { if (other !== details) other.open = false; });
        const menu = details.querySelector('.ozon-link-actions-menu');
        const rect = details.getBoundingClientRect();
        if (menu) {
          const width = menu.offsetWidth, height = menu.offsetHeight;
          menu.style.left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) + 'px';
          menu.style.top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - height - 8)) + 'px';
          menu.style.right = 'auto';
        }
      });
    });
    root.querySelectorAll('[data-action="delete-remote-link"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation(); button.disabled = true;
        try {
          const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(task.key) + '/remotelink/' + encodeURIComponent(button.getAttribute('data-remote-id')), {method:'DELETE',credentials:'same-origin'});
          if (!response.ok) throw new Error('Не удалось удалить веб-ссылку');
          await refreshLinksWithoutSkeleton(task.key);
        } catch (error) { showSaveToast(error.message); button.disabled = false; }
      });
    });

    // Сворачивание / разворачивание секций-аккордеонов в сайдбаре (с сохранением позиции скролла!)
    root.querySelectorAll('[data-action="toggle-description-length"]').forEach((button) => {
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); expandedSidebarDescriptions.has(task.key) ? expandedSidebarDescriptions.delete(task.key) : expandedSidebarDescriptions.add(task.key); renderStructure(); });
    });
    root.querySelectorAll('[data-action="toggle-sb-section"]').forEach(head => {
      const section = head.getAttribute('data-sec');
      const title = head.firstElementChild;
      if (!section || !title) return;
      title.classList.add('ozon-ext-disclosure-trigger');
      title.setAttribute('role','button');
      title.tabIndex = 0;
      title.setAttribute('aria-expanded',String(!collapsedSidebarSections[section]));
      function toggle(restoreFocus) {
        const opening = Boolean(collapsedSidebarSections[section]);
        collapsedSidebarSections[section] = !opening;
        renderStructure();
        const newHead = root.querySelector('[data-action="toggle-sb-section"][data-sec="' + section + '"]');
        if (restoreFocus) newHead?.firstElementChild?.focus({preventScroll:true});
        if (opening) newHead?.nextElementSibling?.classList.add('ozon-ext-disclosure-content');
        if (section === 'pt_quick' && opening && !umbCatalogReady && !umbCatalogRequest) {
          umbCatalogRequest = loadUmbEpicTasksFromJira().finally(() => { umbCatalogRequest = null; if (isSidebarOpen) renderStructure(); });
        }
      }
      head.addEventListener('click', event => {
        if (event.target.closest('button,a')) return;
        event.preventDefault();
        event.stopPropagation();
        toggle(document.activeElement === title);
      });
      title.addEventListener('keydown', event => {
        if (event.target !== title || !['Enter',' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        toggle(true);
      });
    });

    // Сворачивание / разворачивание групп OB / OBFRONT / FTD в связях «В проекте» (с сохранением позиции скролла!)
    root.querySelectorAll('[data-action="toggle-ip-group"]').forEach((grpHead) => {
      grpHead.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const gid = grpHead.getAttribute('data-grp-id');
        if (!gid) return;
        collapsedIpGroups[gid] = !collapsedIpGroups[gid];
        renderStructure();
      });
    });

    function updateCurrentTask(patch) {
      if (Object.prototype.hasOwnProperty.call(patch, 'component')) patch.components = patch.component && patch.component !== 'Без компонента' ? [patch.component] : [];
      tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, patch) : t));
      saveTaskOverride(selectedTaskKey, patch);
    }

    async function saveSummaryNow() {
      const sumInput = document.getElementById('ozon-sb-summary');
      if (!sumInput) return;
      const val = sumInput.value.trim();
      if (!val) return;
      const key = selectedTaskKey;
      const button = document.getElementById('ozon-sb-save-summary');
      if (button) button.disabled = true;
      try {
      await saveSidebarFields(key, {summary: val});
      showSaveToast('✓ Название ' + key + ' сохранено');
      if (selectedTaskKey === key) renderStructure();
      } catch (error) {
        showSaveToast('Не удалось сохранить название: ' + (error.message || 'ошибка запроса'));
        if (button) button.disabled = false;
      }
    }

    const sumInput = document.getElementById('ozon-sb-summary');
    if (sumInput) {
      sumInput.addEventListener('input', () => {
        const draft = sidebarDraft(selectedTaskKey);
        const original = tasks.find((task) => task.key === selectedTaskKey)?.summary || '';
        if (sumInput.value === original) delete draft.summary; else draft.summary = sumInput.value;
        const button = document.getElementById('ozon-sb-save-summary');
        if (button) { button.disabled = !sumInput.value.trim() || sumInput.value.trim() === original.trim(); button.style.display = button.disabled ? 'none' : ''; }
      });
      sumInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveSummaryNow();
        }
      });
    }

    const saveSumBtn = document.getElementById('ozon-sb-save-summary');
    if (saveSumBtn) {
      saveSumBtn.addEventListener('click', saveSummaryNow);
    }

    const labelForm = document.getElementById('ozon-sb-label-form');
    const labelInput = document.getElementById('ozon-sb-label-input');
    bindLabelSuggestions(labelInput,{issueId:task.jiraId,existing:task.labels,known:()=>[
      ...tasks.flatMap(item=>item.labels || []),
      ...strategicDashboard.getState().issues.flatMap(issue=>issue.fields?.labels || [])
    ]});
    async function changeSidebarLabel(label, operation) {
      const key = selectedTaskKey;
      const container = document.getElementById('ozon-sb-labels');
      const errorEl = document.getElementById('ozon-sb-label-error');
      if (!container || container.dataset.busy === '1') return;
      if (!label || /\\s/.test(label)) {
        if (errorEl) { errorEl.hidden = false; errorEl.textContent = 'Метка не должна быть пустой или содержать пробелы.'; }
        return;
      }
      if (errorEl) errorEl.hidden = true;
      container.dataset.busy = '1';
      container.querySelectorAll('button, input').forEach((el) => { el.disabled = true; });
      try {
        const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key), {
          method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ update: { labels: [{ [operation]: label }] } })
        });
        if (!response.ok) throw new Error('Ошибка Jira: ' + response.status);
        const fresh = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=labels', { credentials: 'same-origin', cache: 'no-store' });
        if (!fresh.ok) throw new Error('Не удалось проверить сохранение меток');
        const data = await fresh.json();
        const labels = data.fields && Array.isArray(data.fields.labels) ? data.fields.labels : null;
        if (!labels || labels.includes(label) !== (operation === 'add')) throw new Error('Jira не подтвердила изменение метки');
        tasks = tasks.map((t) => t.key === key ? Object.assign({}, t, { labels }) : t);
        const strategyIssue = strategicDashboard.getState().issues.find((issue) => issue.key === key);
        if (strategyIssue && strategyIssue.fields) { strategyIssue.fields.labels = labels; strategicDashboard.invalidateGraph(); }
        saveTaskOverride(key, { labels });
        if (selectedTaskKey === key) renderStructure();
      } catch (error) {
        if (errorEl && selectedTaskKey === key) { errorEl.hidden = false; errorEl.textContent = error.message || 'Не удалось изменить метку'; }
      } finally {
        container.dataset.busy = '0';
        container.querySelectorAll('button, input').forEach((el) => { el.disabled = false; });
      }
    }
    if (labelForm) labelForm.addEventListener('submit', (event) => {
      event.preventDefault();
      changeSidebarLabel(labelInput ? labelInput.value.trim() : '', 'add');
    });
    root.querySelectorAll('[data-sb-remove-label]').forEach((button) => {
      button.addEventListener('click', () => changeSidebarLabel(button.getAttribute('data-sb-remove-label') || '', 'remove'));
    });

    // Переключение режима Просмотр / Редактирование описания задачи
    const toggleEditDescBtn = document.getElementById('ozon-sb-toggle-edit-desc');
    if (toggleEditDescBtn) {
      toggleEditDescBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isEditingDescription = !isEditingDescription;
        collapsedSidebarSections['desc'] = false;
        renderStructure();
      });
    }

    const descPreviewEl = document.getElementById('ozon-sb-desc-preview');
    if (descPreviewEl) {
      descPreviewEl.addEventListener('dblclick', (e) => {
        if (e.target.closest('a')) return;
        isEditingDescription = true;
        renderStructure();
      });
    }

    const cancelDescBtn = document.getElementById('ozon-sb-cancel-description');
    if (cancelDescBtn) {
      cancelDescBtn.addEventListener('click', (e) => {
        e.preventDefault();
        delete sidebarDraft(selectedTaskKey).description;
        isEditingDescription = false;
        renderStructure();
      });
    }

    // Автоматическое увеличение высоты поля «Описание задачи» при вводе текста
    const descArea = document.getElementById('ozon-sb-description');
    if (descArea) {
      descArea.addEventListener('input', () => {
        const draft = sidebarDraft(selectedTaskKey);
        const original = tasks.find((task) => task.key === selectedTaskKey)?.description || '';
        if (descArea.value === original) delete draft.description; else draft.description = descArea.value;
        descArea.style.height = 'auto';
        descArea.style.height = Math.max(90, descArea.scrollHeight) + 'px';
      });
    }

    async function saveDescriptionNow() {
      const descEl = document.getElementById('ozon-sb-description');
      if (!descEl) return;
      const val = descEl.value;
      const key = selectedTaskKey;
      const buttons = [document.getElementById('ozon-sb-save-description'), document.getElementById('ozon-sb-save-description-bottom')].filter(Boolean);
      buttons.forEach((button) => { button.disabled = true; });
      try {
        await saveSidebarFields(key, {description: val});
        showSaveToast('✓ Описание ' + key + ' сохранено в Jira');
        if (selectedTaskKey === key) { isEditingDescription = false; renderStructure(); }
      } catch (error) {
        showSaveToast('Не удалось сохранить описание: ' + (error.message || 'ошибка запроса'));
        buttons.forEach((button) => { button.disabled = false; });
      }
    }

    const saveDescBtn = document.getElementById('ozon-sb-save-description');
    if (saveDescBtn) {
      saveDescBtn.addEventListener('click', saveDescriptionNow);
    }
    const saveDescBottomBtn = document.getElementById('ozon-sb-save-description-bottom');
    if (saveDescBottomBtn) {
      saveDescBottomBtn.addEventListener('click', saveDescriptionNow);
    }

    function handleStatusSelectChange(selEl) {
      const newStatus = selEl.value;
      const selectedOpt = selEl.options[selEl.selectedIndex];
      const explicitTrId = selectedOpt ? selectedOpt.getAttribute('data-tr-id') : null;
      updateCurrentTask({ status: newStatus });
      transitionIssueStatusInJira(selectedTaskKey, newStatus, explicitTrId);
      renderStructure();
    }

    const headerStatusSelect = document.getElementById('ozon-sb-header-status');
    if (headerStatusSelect) {
      headerStatusSelect.addEventListener('change', () => handleStatusSelectChange(headerStatusSelect));
    }

    const statusSelect = document.getElementById('ozon-sb-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => handleStatusSelectChange(statusSelect));
    }

    const issueTypeSelect = document.getElementById('ozon-sb-issuetype');
    if (issueTypeSelect) {
      issueTypeSelect.addEventListener('change', (e) => {
        const newIssueType = e.target.value;
        const matchedTypeId = issueTypeIdByName[newIssueType] || issueTypeIdByName[String(newIssueType).toLowerCase()] || '';
        updateCurrentTask({
          issueTypeName: newIssueType,
          issueTypeId: matchedTypeId,
          issueTypeIconUrl: ''
        });
        updateIssueTypeInJira(selectedTaskKey, newIssueType);
        renderStructure();
      });
    }

    const prioSelect = document.getElementById('ozon-sb-priority');
    if (prioSelect) {
      prioSelect.addEventListener('change', (e) => {
        const newPriority = e.target.value;
        updateCurrentTask({ priority: newPriority });
        fetch('/rest/api/2/issue/' + encodeURIComponent(selectedTaskKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { priority: { name: newPriority } } })
        }).catch(() => {});
        showSaveToast('✓ Приоритет ' + selectedTaskKey + ' → ' + newPriority);
        renderStructure();
      });
    }

    root.querySelectorAll('button[data-action="quick-transition"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const trId = btn.getAttribute('data-tr-id');
        const targetSt = btn.getAttribute('data-target-status');
        if (!targetSt) return;
        updateCurrentTask({ status: targetSt });
        transitionIssueStatusInJira(selectedTaskKey, targetSt, trId);
        renderStructure();
      });
    });

    const spSelect = document.getElementById('ozon-sb-sprint');
    if (spSelect) {
      spSelect.addEventListener('change', (e) => {
        const newSp = e.target.value;
        updateCurrentTask({ sprint: newSp });
        updateIssueSprintInJira(selectedTaskKey, newSp);
        renderStructure();
      });
    }

    // Быстрые чипсы спринтов и кнопка «✕ Удалить из спринта»
    root.querySelectorAll('button[data-action="quick-sprint-chip"]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const targetSp = chip.getAttribute('data-sprint') || 'Бэклог FCRM';
        updateCurrentTask({ sprint: targetSp });
        updateIssueSprintInJira(selectedTaskKey, targetSp);
        renderStructure();
      });
    });

    // Input-Select Компонента основной задачи в сайдбаре
    const sbCompTrigger = document.getElementById('ozon-sb-comp-trigger');
    if (sbCompTrigger) {
      sbCompTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const pk = getIssueProjectKey(selectedTaskKey);
        loadExternalProjectComponents(pk);
        sbCompComboOpen = !sbCompComboOpen;
        sbEpicComboOpen = false;
        sbIpCompOpenIdx = null;
        if (sbCompComboOpen) sbCompSearchQuery = '';
        renderStructure();
        const sInp = document.getElementById('ozon-sb-comp-search');
        if (sInp) sInp.focus();
      });
    }

    const sbCompSearch = document.getElementById('ozon-sb-comp-search');
    if (sbCompSearch) {
      sbCompSearch.addEventListener('click', (e) => e.stopPropagation());
      sbCompSearch.addEventListener('input', (e) => {
        sbCompSearchQuery = e.target.value;
        renderStructure();
      });
    }

    root.querySelectorAll('[data-action="pick-sb-comp"]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const newComp = item.getAttribute('data-comp') || 'Без компонента';
        sbCompComboOpen = false;
        sbCompSearchQuery = '';
        updateCurrentTask({ component: newComp });
        const compsPayload = newComp && newComp !== 'Без компонента' ? [{ name: newComp }] : [];
        fetch('/rest/api/2/issue/' + encodeURIComponent(selectedTaskKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { components: compsPayload } })
        }).catch(() => {});
        showSaveToast('✓ Компонент ' + selectedTaskKey + ' → ' + newComp);
        renderStructure();
      });
    });

    // Input-Select Эпика (проект FCRM) в сайдбаре
    const sbEpicTrigger = document.getElementById('ozon-sb-epic-trigger');
    if (sbEpicTrigger) {
      sbEpicTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('a')) return;
        sbEpicComboOpen = !sbEpicComboOpen;
        sbCompComboOpen = false;
        sbIpCompOpenIdx = null;
        if (sbEpicComboOpen) sbEpicSearchQuery = '';
        renderStructure();
        const eInp = document.getElementById('ozon-sb-epic-search');
        if (eInp) eInp.focus();
      });
    }

    const sbEpicSearch = document.getElementById('ozon-sb-epic-search');
    if (sbEpicSearch) {
      sbEpicSearch.addEventListener('click', (e) => e.stopPropagation());
      sbEpicSearch.addEventListener('input', (e) => {
        sbEpicSearchQuery = e.target.value;
        renderStructure();
        if (epicSearchTimer) clearTimeout(epicSearchTimer);
        if (sbEpicSearchQuery.trim().length >= 2) {
          epicSearchTimer = setTimeout(async () => {
            await searchFcrmEpicsInJira(sbEpicSearchQuery.trim());
            renderStructure();
          }, 220);
        }
      });
    }

    root.querySelectorAll('[data-action="pick-sb-epic"]').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const epKey = item.getAttribute('data-epic-key') || '';
        const epName = item.getAttribute('data-epic-name') || (epKey ? epicNameByKey[epKey] || epKey : 'Без эпика');
        sbEpicComboOpen = false;
        sbEpicSearchQuery = '';
        updateCurrentTask({ epicKey: epKey, epicName: epName });
        const obprojectSourceKey = isEpicIssueType(task.issueTypeName) ? selectedTaskKey : epKey;
        if (obprojectSourceKey) loadEpicObprojectDetails(obprojectSourceKey);
        renderStructure();
        await updateIssueEpicInJira(selectedTaskKey, epKey);
        renderStructure();
      });
    });

    function saveAssigneeNow() {
      const userSearchInput = document.getElementById('ozon-sb-user-search');
      if (!userSearchInput) return;
      const val = userSearchInput.value.trim() || 'Не назначен';
      if (val === task.assignee.name) return;
      const firstMatch = searchedUsersResults[0];
      const chosenDisplay = val === 'Не назначен' ? 'Не назначен' : firstMatch ? firstMatch.displayName : val;
      const chosenLogin = val === 'Не назначен' ? null : firstMatch ? firstMatch.name : null;
      assigneeSearchQuery = '';
      searchedUsersResults = [];
      updateCurrentTask({assignee:pickedAssignee(chosenDisplay,chosenLogin,chosenLogin ? firstMatch : null)});
      updateIssueAssigneeInJira(selectedTaskKey, chosenDisplay, chosenLogin);
      renderStructure();
    }

    const userSearchInput = document.getElementById('ozon-sb-user-search');
    const userResultsContainer = document.getElementById('ozon-sb-user-results');
    if (userResultsContainer) {
      bindUserPickerClicks(userResultsContainer, task, updateCurrentTask);
    }

    if (userSearchInput) {
      userSearchInput.addEventListener('input', (e) => {
        assigneeSearchQuery = e.target.value;
        if (userSearchTimer) clearTimeout(userSearchTimer);
        const q = assigneeSearchQuery.trim();
        if (!q || q === 'Не назначен') {
          searchedUsersResults = [];
          const resBox = document.getElementById('ozon-sb-user-results');
          if (resBox) resBox.innerHTML = '';
          return;
        }
        userSearchTimer = setTimeout(async () => {
          const found = await searchJiraUsers(q, selectedTaskKey);
          searchedUsersResults = found.slice(0, 10);
          const resBox = document.getElementById('ozon-sb-user-results');
          if (resBox) {
            resBox.innerHTML = renderUserSearchResultsHtml(searchedUsersResults);
            bindUserPickerClicks(resBox, task, updateCurrentTask);
          }
        }, 200);
      });

      userSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveAssigneeNow();
        }
      });
      userSearchInput.addEventListener('blur', () => setTimeout(() => {
        if (document.getElementById('ozon-sb-user-search')) saveAssigneeNow();
      }, 160));
    }

    function saveCustomerNow() {
      const customerInput = document.getElementById('ozon-sb-customer');
      if (!customerInput) return;
      const val = customerInput.value.trim() || 'Не указан';
      if (val === task.customer.name) return;
      searchedCustomerResults = [];
      updateCurrentTask({ customer: Object.assign({}, task.customer, { name: val }) });
      updateIssueCustomerInJira(selectedTaskKey, val, null);
      renderStructure();
    }

    const customerInput = document.getElementById('ozon-sb-customer');
    const customerResultsBox = document.getElementById('ozon-sb-customer-results');
    if (customerResultsBox) {
      bindCustomerPickerClicks(customerResultsBox, task, updateCurrentTask);
    }

    if (customerInput) {
      customerInput.addEventListener('input', (e) => {
        customerSearchQuery = e.target.value;
        if (custSearchTimer) clearTimeout(custSearchTimer);
        const q = customerSearchQuery.trim();
        if (!q || q === 'Не указан') {
          searchedCustomerResults = [];
          const box = document.getElementById('ozon-sb-customer-results');
          if (box) box.innerHTML = '';
          return;
        }
        custSearchTimer = setTimeout(async () => {
          const found = await searchJiraUsers(q, selectedTaskKey);
          searchedCustomerResults = found.slice(0, 10);
          const box = document.getElementById('ozon-sb-customer-results');
          if (box) {
            box.innerHTML = renderCustomerSearchResultsHtml(searchedCustomerResults);
            bindCustomerPickerClicks(box, task, updateCurrentTask);
          }
        }, 200);
      });

      customerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveCustomerNow();
        }
      });
      customerInput.addEventListener('blur', () => setTimeout(() => {
        if (document.getElementById('ozon-sb-customer')) saveCustomerNow();
      }, 160));
    }

    const umbSearch = document.getElementById('ozon-sb-umb-search');
    if (umbSearch) {
      umbSearch.addEventListener('input', (e) => {
        umbSearchQuery = e.target.value;
        renderStructure();
        if (umbSearchTimer) clearTimeout(umbSearchTimer);
        if (umbSearchQuery.trim().length >= 2) {
          umbSearchTimer = setTimeout(async () => {
            await loadUmbEpicTasksFromJira(umbSearchQuery.trim());
            renderStructure();
          }, 250);
        }
      });
    }

    root.querySelectorAll('button[data-action="toggle-umb-link"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uKey = btn.getAttribute('data-umb-key');
        const uItem = umbCatalog.find((u) => u.key === uKey);
        if (!uItem) return;
        const existingLink = task.projectTaskLinks.find((l) => l.key === uKey);

        if (existingLink) {
          const nextLinks = task.projectTaskLinks.filter((l) => l.key !== uKey);
          tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { projectTaskLinks: nextLinks }) : t));
          renderStructure();
          await deleteIssueLinkInJira(selectedTaskKey, uKey, existingLink.jiraLinkId || existingLink.id);
        } else {
          const nextLinks = [
            ...task.projectTaskLinks,
            {
              id: 'pt-' + Date.now(),
              key: uItem.key,
              summary: uItem.summary,
              status: uItem.status || 'Открыто',
              component: uItem.component || 'Без компонента',
              sprint: 'Не в спринте'
            }
          ];
          tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { projectTaskLinks: nextLinks }) : t));
          renderStructure();
          await createIssueLinkInJira(selectedTaskKey, uItem.key, 'projectTask');
        }
      });
    });

    root.querySelectorAll('button[data-action="move-pt-to-ip"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-pt-idx'));
        const item = task.projectTaskLinks[idx];
        if (!item) return;
        const nextPt = task.projectTaskLinks.filter((_, i) => i !== idx);
        const nextIp = [
          ...task.inProjectLinks,
          Object.assign({}, item, {
            component: item.component || 'Без компонента',
            sprint: item.sprint || 'Не в спринте'
          })
        ];
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { projectTaskLinks: nextPt, inProjectLinks: nextIp }) : t));
        showSaveToast('✓ ' + item.key + ' перенесена в «В проекте»');
        renderStructure();
      });
    });

    root.querySelectorAll('button[data-action="move-ip-to-pt"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-link-idx'));
        const item = task.inProjectLinks[idx];
        if (!item) return;
        const nextIp = task.inProjectLinks.filter((_, i) => i !== idx);
        const nextPt = [...task.projectTaskLinks, item];
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { projectTaskLinks: nextPt, inProjectLinks: nextIp }) : t));
        showSaveToast('✓ ' + item.key + ' перенесена в «Задача проекта»');
        renderStructure();
      });
    });

    root.querySelectorAll('button[data-action="remove-pt-link"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const lKey = btn.getAttribute('data-link-key');
        const jiraLinkId = btn.getAttribute('data-jira-link-id');
        const nextLinks = task.projectTaskLinks.filter((l) => l.key !== lKey);
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { projectTaskLinks: nextLinks }) : t));
        renderStructure();
        await deleteIssueLinkInJira(selectedTaskKey, lKey, jiraLinkId);
      });
    });

    // Input-Select Компонента для связанной задачи в «В проекте» (с подгрузкой компонентов соответствующего проекта OB / OBFRONT / FTD)
    root.querySelectorAll('[data-action="open-ip-comp-combo"]').forEach((trig) => {
      trig.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = Number(trig.getAttribute('data-link-idx'));
        const proj = trig.getAttribute('data-proj') || CONFIG.projectKey;
        if (sbIpCompOpenIdx === idx) {
          sbIpCompOpenIdx = null;
          renderStructure();
        } else {
          developmentDashboard.dismissEditor();
        sbIpCompOpenIdx = idx;
          sbIpCompSearchQuery = '';
          sbEpicComboOpen = false;
          sbCompComboOpen = false;
          renderStructure();
          await loadExternalProjectComponents(proj);
          renderStructure();
          const inp = document.getElementById('ozon-sb-ip-comp-search');
          if (inp) inp.focus();
        }
      });
    });

    const sbIpCompSearch = document.getElementById('ozon-sb-ip-comp-search');
    if (sbIpCompSearch) {
      sbIpCompSearch.addEventListener('click', (e) => e.stopPropagation());
      sbIpCompSearch.addEventListener('input', (e) => {
        sbIpCompSearchQuery = e.target.value;
        renderStructure();
      });
    }

    root.querySelectorAll('[data-action="pick-ip-comp"]').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = Number(item.getAttribute('data-link-idx'));
        const lKey = item.getAttribute('data-link-key');
        const newComp = item.getAttribute('data-comp') || 'Без компонента';
        sbIpCompOpenIdx = null;
        sbIpCompSearchQuery = '';
        const nextIp = task.inProjectLinks.map((it, i) => (i === idx ? Object.assign({}, it, { component: newComp }) : it));
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { inProjectLinks: nextIp }) : t));
        if (lKey) {
          const compsPayload = newComp && newComp !== 'Без компонента' ? [{ name: newComp }] : [];
          fetch('/rest/api/2/issue/' + encodeURIComponent(lKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { components: compsPayload } })
          }).catch(() => {});
        }
        showSaveToast('✓ Компонент ' + (lKey || '') + ' → ' + newComp);
        renderStructure();
        // Available sprints are fetched when the sprint selector is opened.
      });
    });

    root.querySelectorAll('[data-action="open-ip-sprint-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', async (event) => {
        event.stopPropagation();
        const idx = Number(trigger.getAttribute('data-link-idx'));
        if (sbIpSprintOpenIdx === idx) { sbIpSprintOpenIdx = null; renderStructure(); return; }
        developmentDashboard.dismissEditor();
        sbIpSprintOpenIdx = idx;
        renderStructure();
        const link = task.inProjectLinks[idx];
        if (link) { await loadSprintsForLinkedIssue(link); renderStructure(); }
      });
    });
    const sprintSearch = document.getElementById('ozon-sb-ip-sprint-search');
    if (sprintSearch) { sprintSearch.addEventListener('click', e => e.stopPropagation()); sprintSearch.addEventListener('input', e => { sbIpSprintSearchQuery = e.target.value; renderStructure(); }); }
    root.querySelectorAll('[data-action="pick-ip-sprint"]').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        const idx = Number(item.getAttribute('data-link-idx'));
        const linkKey = item.getAttribute('data-link-key');
        const sprint = item.getAttribute('data-sprint');
        const nextIp = task.inProjectLinks.map((link, i) => i === idx ? Object.assign({}, link, { sprint }) : link);
        tasks = tasks.map(t => t.key === selectedTaskKey ? Object.assign({}, t, { inProjectLinks: nextIp }) : t);
        sbIpSprintOpenIdx = null;
        sbIpSprintSearchQuery = '';
        updateIssueSprintInJira(linkKey, sprint);
        renderStructure();
      });
    });

    root.querySelectorAll('select[data-action="change-ip-sprint"]').forEach((sel) => {
      sel.addEventListener('focus', async () => {
        const idx = Number(sel.getAttribute('data-link-idx'));
        const lnk = task.inProjectLinks[idx];
        if (!lnk) return;
        await loadSprintsForLinkedIssue(lnk);
        const opts = getSprintsForLinkedIssue(lnk);
        const realSpVal = (lnk.sprint && String(lnk.sprint).trim()) || 'Не в спринте';
        sel.innerHTML = buildSprintSelectOptionsHtml(opts, realSpVal, 'Спринт: ');
      });
      sel.addEventListener('change', (e) => {
        const idx = Number(sel.getAttribute('data-link-idx'));
        const lKey = sel.getAttribute('data-link-key');
        const newSp = e.target.value;
        const nextIp = task.inProjectLinks.map((item, i) => (i === idx ? Object.assign({}, item, { sprint: newSp }) : item));
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { inProjectLinks: nextIp }) : t));
        if (lKey) {
          updateIssueSprintInJira(lKey, newSp);
        }
        renderStructure();
      });
    });

    root.querySelectorAll('button[data-action="remove-ip-link"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.getAttribute('data-link-idx'));
        const lKey = btn.getAttribute('data-link-key');
        const jiraLinkId = btn.getAttribute('data-jira-link-id');
        const nextIp = task.inProjectLinks.filter((_, i) => i !== idx);
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { inProjectLinks: nextIp }) : t));
        renderStructure();
        if (lKey) {
          await deleteIssueLinkInJira(selectedTaskKey, lKey, jiraLinkId);
        }
      });
    });

    root.querySelectorAll('[data-action="toggle-front-design"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const details = button.closest('.ozon-ext-link-compact-row')?.querySelector('[data-front-design-details]');
        if (!details) return;
        details.hidden = !details.hidden;
        button.setAttribute('aria-expanded', String(!details.hidden));
      });
    });
    root.querySelectorAll('[data-action="link-front-design"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const frontKey = button.getAttribute('data-front-key');
        const designKey = button.getAttribute('data-design-key');
        button.disabled = true;
        const linked = await createIssueLinkInJira(frontKey, designKey, 'linkedTask');
        if (linked) {
          delete frontDesignLinksByKey[frontKey];
          await loadFrontDesignRelation(frontKey);
          renderStructure();
        } else {
          button.disabled = false;
          showSaveToast('Не удалось связать фронтовую задачу с дизайном');
        }
      });
    });

    root.querySelectorAll('[data-action="toggle-create-in-project-menu"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        createInProjectMenuOpen = !createInProjectMenuOpen;
        otherLinkMenuOpen = false;
        renderStructure();
      });
    });
    root.querySelectorAll('[data-action="toggle-other-link-menu"]').forEach((button) => {
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); otherLinkMenuOpen = !otherLinkMenuOpen; createInProjectMenuOpen = false; renderStructure(); });
    });
    root.querySelectorAll('[data-action="start-create-link"]').forEach((button) => {
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); linkCreateDraft = {kind:button.getAttribute('data-link-kind'), sourceKey:task.key}; createInProjectMenuOpen = false; otherLinkMenuOpen = false; renderStructure(); });
    });
    root.querySelectorAll('[data-action="close-link-create"]').forEach((button) => {
      button.addEventListener('click', (event) => { if (event.target !== button) return; event.preventDefault(); event.stopPropagation(); linkCreateDraft = null; renderStructure(); });
    });
    const linkCreateForm = root.querySelector('#ozon-link-create-form');
    linkCreateForm?.addEventListener('submit', async (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!linkCreateDraft) return;
      const draft = linkCreateDraft;
      const message = linkCreateForm.querySelector('#ozon-link-create-message');
      const submit = linkCreateForm.querySelector('[type="submit"]');
      const fail = (text) => { message.textContent = text; message.hidden = false; submit.disabled = false; submit.textContent = 'Связать'; };
      const key = String(linkCreateForm.querySelector('#ozon-link-create-key')?.value || '').trim().toUpperCase();
      const url = String(linkCreateForm.querySelector('#ozon-link-create-url')?.value || '').trim();
      const title = String(linkCreateForm.querySelector('#ozon-link-create-title')?.value || '').trim();
      if (draft.kind !== 'web' && !/^[A-Z][A-Z0-9]*-\\d+$/.test(key)) { fail('Введите ключ задачи, например FCRM-1234.'); return; }
      if (draft.kind === 'web') { try { if (!['http:', 'https:'].includes(new URL(url).protocol) || !title) throw new Error(); } catch (_) { fail('Укажите ссылку http или https и её название.'); return; } }
      submit.disabled = true; submit.textContent = 'Сохраняем…'; message.hidden = true;
      try {
        if (draft.kind === 'web') {
          const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(draft.sourceKey) + '/remotelink', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({object:{url,title}})});
          if (!response.ok) throw new Error('Не удалось добавить ссылку в Jira (HTTP ' + response.status + ').');
        } else if (!await createIssueLinkInJira(draft.sourceKey, key, draft.kind, true, true)) throw new Error('Не удалось создать связь в Jira. Проверьте ключ и доступный тип связи.');
        if (linkCreateDraft === draft) linkCreateDraft = null;
        await refreshLinksWithoutSkeleton(draft.sourceKey);
        showSaveToast('✓ Связь добавлена');
      } catch (error) { if (linkCreateDraft === draft) fail(error.message || 'Не удалось добавить связь.'); else showSaveToast(error.message); }
    });

    root.querySelectorAll('[data-action="start-create-issue"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const kind = button.getAttribute('data-create-kind');
        if (kind === 'design') {
          createInProjectMenuOpen = false;
          renderStructure();
          document.dispatchEvent(new CustomEvent('ozon-fcrm-start-design-task', { detail: JSON.stringify({ issueKey: selectedTaskKey }) }));
        } else {
          beginSidebarIssueCreate(kind);
        }
      });
    });

    root.querySelectorAll('[data-action="close-create-issue"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        issueCreateDraft = null;
        issueCreateBusy = false;
        issueCreateLoading = false;
        renderStructure();
      });
    });

    const createSummaryInput = document.getElementById('ozon-create-issue-summary');
    if (createSummaryInput) createSummaryInput.addEventListener('input', (event) => { if (issueCreateDraft) issueCreateDraft.summary = event.target.value; });
    const createDescriptionInput = document.getElementById('ozon-create-issue-description');
    if (createDescriptionInput) createDescriptionInput.addEventListener('input', (event) => { if (issueCreateDraft) issueCreateDraft.description = event.target.value; });
    const createComponentSearch = document.getElementById('ozon-create-issue-component-search');
    if (createComponentSearch) createComponentSearch.addEventListener('input', (event) => {
      if (!issueCreateDraft) return;
      issueCreateDraft.componentQuery = event.target.value;
      renderStructure();
    });
    root.querySelectorAll('[data-action="pick-create-component"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!issueCreateDraft) return;
        issueCreateDraft.componentId = button.getAttribute('data-component-id');
        issueCreateDraft.error = '';
        renderStructure();
      });
    });
    const createIssueForm = document.getElementById('ozon-create-issue-form');
    if (createIssueForm) {
      createIssueForm.addEventListener('click', (event) => event.stopPropagation());
      createIssueForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitSidebarIssueCreate();
      });
    }

    const addIpBtn = document.getElementById('ozon-add-ip-btn');
    if (addIpBtn) {
      addIpBtn.addEventListener('click', async () => {
        const kEl = document.getElementById('ozon-new-ip-key');
        const sEl = document.getElementById('ozon-new-ip-summary');
        const keyVal = kEl && kEl.value.trim().toUpperCase();
        if (!keyVal) {
          showSaveToast('Введите код задачи Jira (например OB-311121 или FCRM-2273)');
          return;
        }
        const sumVal = (sEl && sEl.value.trim()) || keyVal;

        const nextIp = [
          ...task.inProjectLinks,
          {
            id: 'ip-' + Date.now(),
            key: keyVal,
            summary: sumVal,
            status: 'Открыто',
            component: 'Без компонента',
            sprint: 'Не в спринте'
          }
        ];
        tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, { inProjectLinks: nextIp }) : t));
        renderStructure();
        await createIssueLinkInJira(selectedTaskKey, keyVal, 'inProject');
      });
    }
  }

  function setStructureVisible(visible, moveFocus = true) {
    isStructureVisible = visible;
    document.body.classList.toggle('ozon-native-board-visible', !visible);
    const root = document.getElementById('ozon-structure-root');
    if (!visible && dashboardFullscreen) setDashboardFullscreen(root, false);
    const button = document.getElementById('ozon-structure-toggle-btn');
    if (button) button.hidden = visible;
    if (root) root.hidden = !visible;
    if (!moveFocus) return;
    try { sessionStorage.setItem(STORAGE_KEY_NATIVE_BOARD, String(!visible)); } catch (_) {}
    if (visible) {
      if (!root || structureRenderPending) renderStructure();
      document.querySelector('.ozon-ext-view-tabs [aria-selected="true"]')?.focus({preventScroll:true});
    } else {
      button?.focus({preventScroll:true});
    }
  }

  function injectToggleButton() {
    if (!isTargetBoardPage()) return;
    if (document.getElementById('ozon-structure-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ozon-structure-toggle-btn';
    btn.textContent = 'Открыть виджет FCRM';
    btn.setAttribute('aria-controls', 'ozon-structure-root');
    btn.hidden = isStructureVisible;
    btn.addEventListener('click', () => setStructureVisible(true));
    document.body.appendChild(btn);
  }

  function init() {
    if (!isTargetBoardPage()) return;
    document.addEventListener('fullscreenchange', () => {
      if (!ownsNativeFullscreen || document.fullscreenElement === document.documentElement) return;
      ownsNativeFullscreen = false;
      if (dashboardFullscreen) updateDashboardFullscreen(document.getElementById('ozon-structure-root'), false);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || !dashboardFullscreen || (document.fullscreenElement && !ownsNativeFullscreen)) return;
      const target = event.target;
      if (target instanceof Element && target.closest('[role="dialog"], .ozon-ext-toolbar-combo:has([aria-expanded="true"])')) return;
      event.preventDefault();
      setDashboardFullscreen(document.getElementById('ozon-structure-root'), false);
    });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('#ozon-structure-root [data-show-native-board]')) {
        setStructureVisible(false);
        return;
      }
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (anchor && anchor.closest('#ozon-structure-root, .ozon-component-editor, #ozon-thread-sidebar')) prepareNavigationLink(anchor);
    }, true);
    ensureGoogleFontsLoaded();
    injectToggleButton();
    setStructureVisible(isStructureVisible, false);
    renderStructure();
    function addEditorTaskContext(panel, key) {
      const task = tasks.find((item) => item.key === key);
      const issue = strategicDashboard.getState().issues.find((item) => item.key === key);
      const summary = task?.summary || issue?.fields?.summary || '';
      if (summary) panel.querySelector('.component-editor-head')?.insertAdjacentHTML('afterend', '<div class="component-editor-context" title="' + escapeHtml(summary) + '">' + escapeHtml(summary) + '</div>');
    }
    let priorityEditor = null;
    async function openPriorityEditor(key,trigger) {
      if (!key) return;
      if (priorityEditor?.dataset.busy==='true') return;
      priorityEditor?.closePriority(false);
      const panel = document.createElement('aside'); priorityEditor = panel;
      panel.className = 'ozon-component-editor ozon-priority-editor'; panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Приоритет задачи ' + key);
      panel.style.cssText = 'position:fixed;z-index:2147483646;right:0;top:0;bottom:0;height:100vh;width:min(500px,100vw);background:#fff;box-shadow:-8px 0 24px #0f172a22;padding:20px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;font:13px Arial,sans-serif;color:#071026';
      panel.innerHTML = '<div class="component-editor-head"><strong>Приоритет задачи · ' + escapeHtml(key) + '</strong><button type="button" class="component-editor-close" data-close aria-label="Закрыть">✕</button></div><div role="status">Загружаем приоритеты…</div>';
      document.body.appendChild(panel);
      const controller=new AbortController();
      const close = (restore=true) => {
        if (panel.dataset.busy==='true') return;
        controller.abort();
        panel.remove();
        if (priorityEditor===panel) priorityEditor=null;
        if (restore && trigger?.isConnected) trigger.focus({preventScroll:true});
      };
      panel.closePriority=close;
      panel.querySelector('[data-close]').onclick = () => close();
      panel.querySelector('[data-close]').focus({preventScroll:true});
      panel.addEventListener('pointerdown', event => event.stopPropagation());
      panel.addEventListener('click', event => event.stopPropagation());
      try {
        const [response, options] = await Promise.all([fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=priority', {credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal}), jiraPriorityService.options(key)]);
        if (!response.ok) throw new Error('Не удалось загрузить приоритет: HTTP ' + response.status);
        const issue = await response.json(); if (!panel.isConnected) return;
        const current = issue.fields?.priority || {};
        const isCurrent = option => option.value?.id && current.id ? String(option.value.id) === String(current.id) : option.label === current.name;
        panel.innerHTML = '<div class="component-editor-head"><strong>Приоритет задачи · ' + escapeHtml(key) + '</strong><button type="button" class="component-editor-close" data-close aria-label="Закрыть">✕</button></div><div class="ozon-sprint-current"><span>Текущий приоритет</span><strong>' + jiraPriorityService.icon(current.name || '') + ' ' + escapeHtml(current.name || 'Не указан') + '</strong></div><div class="component-editor-caption">Выберите приоритет</div><div class="component-editor-list">' + options.map((option,index) => '<button type="button" class="component-editor-option ' + (isCurrent(option) ? 'is-selected' : '') + '" data-index="' + index + '" aria-pressed="' + Boolean(isCurrent(option)) + '">' + jiraPriorityService.icon(option.label) + '<span>' + escapeHtml(option.label) + '</span></button>').join('') + '</div><div data-error role="alert" style="color:#d92d20"></div><div class="component-editor-footer"><button type="button" data-cancel class="component-editor-button">Отмена</button><button type="button" data-save class="component-editor-button primary" disabled>Сохранить</button></div>';
        addEditorTaskContext(panel, key);
        const closeButton=panel.querySelector('[data-close]');
        const cancelButton=panel.querySelector('[data-cancel]');
        const saveButton=panel.querySelector('[data-save]');
        const choices=Array.from(panel.querySelectorAll('[data-index]'));
        closeButton.onclick=cancelButton.onclick=()=>close();
        (choices.find(button=>button.getAttribute('aria-pressed')==='true') || closeButton).focus({preventScroll:true});
        let selected=null;
        choices.forEach(button=>button.addEventListener('click',()=>{
          selected=options[Number(button.dataset.index)];
          choices.forEach(item=>{item.classList.toggle('is-selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
          saveButton.disabled=!selected || isCurrent(selected);
        }));
        saveButton.addEventListener('click', async () => {
          if (!selected || isCurrent(selected) || panel.dataset.busy==='true') return;
          panel.dataset.busy='true';
          [saveButton,cancelButton,closeButton,...choices].forEach(item=>{item.disabled=true;});
          try {
            const priority = await jiraPriorityService.save(key, selected.value);
            tasks = tasks.map(task => { const updated = task.key === key ? Object.assign({}, task, {priority:priority.name}) : task; const next = Object.assign({}, updated); ['projectTaskLinks','inProjectLinks','otherLinks'].forEach(field => { if (Array.isArray(updated[field])) next[field] = updated[field].map(link => link.key === key ? Object.assign({}, link, {priority:priority.name}) : link); }); return next; });
            if (tasks.some(task => task.key === key)) saveTaskOverride(key, {priority:priority.name});
            const strategicIssue = strategicDashboard.getState().issues.find(item => item.key === key); if (strategicIssue?.fields) { strategicIssue.fields.priority = priority; strategicDashboard.invalidateGraph(); }
            developmentDashboard.getState().groups.forEach(group => group.issues.forEach(item => { if (item.key === key) item.priority = priority.name; if (item.epicKey === key) item.epicPriority = priority.name; (item.links || []).forEach(link => { if (link.key === key) link.priority = priority.name; }); }));
            delete panel.dataset.busy;
            close(false);
            renderStructure(); showSaveToast('Приоритет ' + key + ' сохранён');
          } catch (error) {
            delete panel.dataset.busy;
            if (panel.isConnected) {panel.querySelector('[data-error]').textContent=error.message || 'Не удалось изменить приоритет';[saveButton,cancelButton,closeButton,...choices].forEach(item=>{item.disabled=false;});}
          }
        });
      } catch (error) { if (panel.isConnected) panel.querySelector('[role="status"]').textContent = error.message || 'Не удалось загрузить приоритет'; }
    }
    document.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest('[data-priority-key], [data-dev-action="edit-priority"], [data-strategy-action="priority"]') : null;
      if (!button || !button.closest('#ozon-structure-root')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      openPriorityEditor(button.getAttribute('data-priority-key') || button.getAttribute('data-key'),button);
    }, true);
    document.addEventListener('pointerdown', event => { if (priorityEditor?.isConnected && event.target instanceof Element && !priorityEditor.contains(event.target)) priorityEditor.closePriority(false); }, true);
    document.addEventListener('keydown', event => { if (isStructureVisible && event.key==='Escape' && priorityEditor?.isConnected) {event.stopImmediatePropagation();priorityEditor.closePriority();} },true);
    // Общий редактор компонентов для таблиц и связей во всех представлениях.
    let componentEditor = null;
    async function openComponentEditor(key) {
      if (!key) return;
      componentEditor?.remove();
      const panel = document.createElement('aside');
      componentEditor = panel;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Компоненты задачи ' + key);
      panel.className = 'ozon-component-editor';
      panel.style.cssText = 'position:fixed;z-index:2147483646;right:0;top:0;left:auto;bottom:0;height:100vh;width:min(500px,100vw);background:#fff;box-shadow:-8px 0 24px #0f172a22;padding:20px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box;font:13px Arial,sans-serif;color:#071026;';
      panel.innerHTML = '<div class="component-editor-head"><strong>Компоненты задачи · ' + escapeHtml(key) + '</strong><button type="button" class="component-editor-close" data-close aria-label="Закрыть">✕</button></div><div role="status">Загружаем компоненты…</div>';
      document.body.appendChild(panel);
      panel.addEventListener('pointerdown', (event) => event.stopPropagation());
      panel.addEventListener('click', (event) => event.stopPropagation());
      panel.querySelector('[data-close]').onclick = () => panel.remove();
      try {
        const project = getIssueProjectKey(key);
        const [issueResponse, optionsResponse] = await Promise.all([
          fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=components', {credentials:'same-origin',cache:'no-store'}),
          fetch('/rest/api/2/project/' + encodeURIComponent(project) + '/components', {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}})
        ]);
        if (!issueResponse.ok || !optionsResponse.ok) throw new Error('Не удалось загрузить компоненты из Jira');
        const issue = await issueResponse.json();
        const records = await optionsResponse.json();
        if (!Array.isArray(records)) throw new Error('Jira вернула некорректный список компонентов');
        const options = records.filter((item) => item && item.id && item.name && item.archived !== true && item.deleted !== true && (!item.project || String(item.project).toUpperCase() === project));
        if (window.__ozonPreviewApi) {
          const visible = tasks.find((item) => item.key === key);
          const display = String(visible?.component || '').trim();
          if (display && display !== 'Без компонента') {
            const byName = new Map(options.map((item) => [String(item.name), item]));
            let rest = display;
            const resolved = [];
            const ordered = [...byName.keys()].sort((a,b) => b.length - a.length);
            while (rest) {
              const match = ordered.find((name) => rest === name || rest.startsWith(name + ', '));
              if (!match) { resolved.length = 0; break; }
              resolved.push(byName.get(match));
              rest = rest.slice(match.length).replace(/^, /, '');
            }
            if (resolved.length) issue.fields.components = resolved;
          } else if (visible && display === 'Без компонента') issue.fields.components = [];
        }
        if (!panel.isConnected) return;
        const currentComponents = issue.fields?.components || [];
        const matchOption = (c) => options.find((option) => (c.id && String(option.id) === String(c.id)) || (c.name && option.name === c.name));
        const selected = new Set(currentComponents.map((c) => { const option = matchOption(c); return String(option?.id || option?.name || c.id || c.name); }));
        const unavailable = currentComponents.filter((c) => !matchOption(c)).map((c) => Object.assign({}, c, {unavailable:true}));
        const allOptions = [...unavailable, ...options];
        panel.innerHTML = '<div class="component-editor-head"><strong>Компоненты задачи · ' + escapeHtml(key) + '</strong><button type="button" class="component-editor-close" data-close aria-label="Закрыть">✕</button></div><div class="ozon-sprint-current"><span>Текущие компоненты</span><strong>' + escapeHtml(currentComponents.map(component=>component.name).filter(Boolean).join(', ') || 'Без компонента') + '</strong></div><div class="component-editor-search"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.7"/><path d="m13 13 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><input type="search" data-search placeholder="Поиск компонента…" aria-label="Поиск компонента"></div><div class="component-editor-caption"><span>Выберите компоненты</span><span data-count></span></div><div data-list class="component-editor-list"></div><div data-error role="alert" style="color:#d92d20"></div><div class="component-editor-footer"><button type="button" data-cancel class="component-editor-button">Отмена</button><button type="button" data-save class="component-editor-button primary">Сохранить</button></div>';
        addEditorTaskContext(panel, key);
        const list = panel.querySelector('[data-list]');
        const search = panel.querySelector('[data-search]');
        const favorites = ['CS','CRM_CORE','CRM_BO'];
        const optionId = (component) => String(component.id || component.name);
        const favoriteRank = (component) => favorites.indexOf(String(component.name || '').trim().toUpperCase());
        const row = (component,checked) => '<label class="component-editor-option ' + (checked ? 'is-selected' : '') + '"><input type="checkbox" data-component-id="' + escapeHtml(optionId(component)) + '" ' + (checked ? 'checked' : '') + '><span>' + escapeHtml(component.name || '') + (component.unavailable ? ' <small>· недоступен для добавления</small>' : '') + '</span></label>';
        function renderOptions() {
          const query = search.value.trim().toLowerCase();
          const picked = [], pinned = [], others = [];
          for (const component of allOptions) {
            if (!String(component.name || '').toLowerCase().includes(query)) continue;
            if (selected.has(optionId(component))) picked.push(component);
            else if (component.unavailable) continue;
            else if (favoriteRank(component) >= 0) pinned.push(component);
            else others.push(component);
          }
          panel.querySelector('[data-count]').textContent = 'Выбрано: ' + selected.size;
          list.innerHTML = picked.map(component=>row(component,true)).join('') +
            (pinned.length ? '<div class="component-editor-section">Избранные</div>' + pinned.sort((a,b)=>favoriteRank(a)-favoriteRank(b)).map(component=>row(component,false)).join('') : '') +
            (pinned.length && others.length ? '<div class="component-editor-section">Остальные компоненты</div>' : '') + others.map(component=>row(component,false)).join('') ||
            '<div style="padding:12px 10px;color:#64748b">Компоненты не найдены</div>';
        }
        search.addEventListener('input', renderOptions);
        list.addEventListener('change', (event) => { const id = event.target.getAttribute('data-component-id'); if (!id) return; if (event.target.checked) selected.add(id); else selected.delete(id); const scrollTop = list.scrollTop; renderOptions(); list.scrollTop = scrollTop; [...list.querySelectorAll('[data-component-id]')].find((input) => input.getAttribute('data-component-id') === id)?.focus({preventScroll:true}); });
        panel.querySelector('[data-close]').onclick = panel.querySelector('[data-cancel]').onclick = () => panel.remove();
        panel.querySelector('[data-save]').onclick = async (event) => {
          const save = event.currentTarget; save.disabled = true;
          try {
            const chosen = allOptions.filter((c) => selected.has(String(c.id || c.name)));
            const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key), {method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{components:chosen.map((c) => c.id ? {id:String(c.id)} : {name:c.name})}})});
            if (!response.ok) throw new Error('Не удалось сохранить компоненты: ' + response.status);
            const verify = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=components', {credentials:'same-origin',cache:'no-store'});
            if (!verify.ok) throw new Error('Не удалось проверить сохранение компонентов');
            const fresh = await verify.json(); const actual = fresh.fields?.components || [];
            const actualIds = actual.map((c) => String(c.id || c.name)).sort(); const expectedIds = chosen.map((c) => String(c.id || c.name)).sort();
            if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) throw new Error('Jira не подтвердила выбранные компоненты');
            const names = actual.map((c) => c.name).filter(Boolean); const component = names.join(', ') || 'Без компонента';
            umbCatalog = umbCatalog.map((item) => item.key === key ? Object.assign({}, item, {component, components:names}) : item);
            tasks = tasks.map((task) => { const updated = task.key === key ? Object.assign({}, task, {component,components:names}) : task; return Object.assign({}, updated, {inProjectLinks:(updated.inProjectLinks || []).map((link) => link.key === key ? Object.assign({}, link, {component,components:names}) : link)}); });
            if (tasks.some((task) => task.key === key)) saveTaskOverride(key, {component,components:names});
            const strategyIssue = strategicDashboard.getState().issues.find((item) => item.key === key); if (strategyIssue?.fields) { strategyIssue.fields.components = actual; strategicDashboard.invalidateGraph(); }
            developmentDashboard.getState().groups.forEach((group) => group.issues.forEach((item) => { if (item.key === key) { item.component = component; item.componentNames = names; item.componentId = actual[0]?.id || ''; } if (item.epicKey === key) item.epicComponent = component; (item.links || []).forEach((link) => { if (link.key === key) link.component = component; }); }));
            panel.remove(); renderStructure(); showSaveToast('Компоненты ' + key + ' сохранены');
          } catch (error) { panel.querySelector('[data-error]').textContent = error.message || 'Ошибка сохранения'; save.disabled = false; }
        };
        renderOptions();
      } catch (error) { if (panel.isConnected) panel.querySelector('[role="status"]').textContent = error.message || 'Не удалось загрузить компоненты'; }
    }
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('#ozon-sb-comp-trigger, [data-action="open-table-comp-combo"], [data-action="open-ip-comp-combo"], [data-dev-action="edit-component"], [data-strategy-action="edit-component"]') : null;
      if (!target || !target.closest('#ozon-structure-root')) return;
      event.preventDefault(); event.stopImmediatePropagation();
      let key = target.getAttribute('data-key') || '';
      if (target.id === 'ozon-sb-comp-trigger') key = selectedTaskKey;
      if (target.getAttribute('data-action') === 'open-ip-comp-combo') { const task = tasks.find((item) => item.key === selectedTaskKey); key = task?.inProjectLinks?.[Number(target.getAttribute('data-link-idx'))]?.key || ''; }
      openComponentEditor(key);
    }, true);
    document.addEventListener('pointerdown', (event) => { if (componentEditor?.isConnected && event.target instanceof Element && !componentEditor.contains(event.target)) { componentEditor.remove(); componentEditor = null; event.stopImmediatePropagation(); } }, true);
    let planningEditor = null;
    const planningTriggers = [
      '#ozon-sb-epic-trigger', '[data-action="open-table-epic-combo"]',
      '[data-action="toggle-search-select"][data-select-id="sidebar-sprint"]',
      '[data-action="toggle-search-select"][data-select-id^="table-sprint-"]', '[data-action="open-ip-sprint-combo"]',
      '[data-strategy-action="edit-sprint"]', '[data-strategy-action="edit-epic"]',
      '[data-dev-action="edit-sprint"]', '[data-dev-action="edit-epic"]', '[data-report-action="edit-epic"]', '[data-report-action="edit-assignee"]'
    ].join(',');

    function planningFields() {
      const strategy = strategicDashboard.planningFields();
      const development = developmentDashboard.planningFields();
      return {
        sprint: discoveredFields.sprint || strategy.sprint || development.sprint || CONFIG.sprintFieldId,
        epic: discoveredFields.epicLink || (activeDashboardView === 'report' && sprintReport.getState().epicField) || strategy.epic || development.epic || CONFIG.epicFieldId,
        epicName: discoveredFields.epicName || strategy.epicName || development.epicName
      };
    }

    function planningSprint(fields, sprintField) {
      const newestFirst = value => Array.isArray(value) ? [...value].reverse() : [value];
      const candidates = [fields.sprint,...newestFirst(fields[sprintField]),...newestFirst(fields.closedSprints)].flat().filter(Boolean);
      const sprints = candidates.map(value => {
        const name = extractAnyRealSprintName(value) || '';
        const rawId = typeof value === 'object' ? value.id : /^(\\d+)$|id=(\\d+)/.exec(String(value))?.slice(1).find(Boolean);
        const id = String(rawId || sprintIdByName[name] || '');
        const known = developmentDashboard.getState().sprints.find(sprint => String(sprint.id) === id);
        const rawState = typeof value === 'object' && value.state ? value.state : sprintStateByName[name] || known?.state || '';
        return {id, name:name || known?.name || '', state:String(rawState).trim().toLowerCase()};
      }).filter(sprint => sprint.id);
      return sprints.find(sprint => sprint.state === 'active' || sprint.state === 'future') || sprints[0] || null;
    }

    function planningEpicKey(fields, epicField) {
      if (epicField && Object.prototype.hasOwnProperty.call(fields,epicField)) {
        const value = fields[epicField];
        return String(typeof value === 'string' ? value : value?.key || value?.value || '');
      }
      return String(fields.epic?.key || '');
    }

    async function readPlanningIssue(key, fields, signal) {
      const query = [...new Set(fields.filter(Boolean))].join(',');
      const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=' + encodeURIComponent(query), {
        cache:'no-store', credentials:'same-origin', headers:{Accept:'application/json'}, signal
      });
      if (!response.ok) throw new Error('Не удалось загрузить ' + key + ' из Jira (HTTP ' + response.status + ')');
      return response.json();
    }

    async function planningSprintOptions(key, issue, current) {
      const project = getIssueProjectKey(key);
      let options;
      if (project === CONFIG.projectKey) {
        options = await strategicDashboard.loadEditableSprints().catch(error => {
          const cached = getEditableSprintOptions().filter(name => sprintIdByName[name]);
          if (!cached.length) throw error;
          return cached.map(name => ({id:sprintIdByName[name],name,state:getSprintStateCode(name)}));
        });
      } else {
        const development = developmentDashboard.getState();
        if (development.groups.some(group => group.issues.some(task => task.key === key))) options = development.sprints;
        else {
          const names = await loadSprintsForLinkedIssue({key,sprint:current?.name,component:resolveRealLinkedIssueComponent(issue)});
          options = names.map(name => ({id:sprintIdByName[name],name,state:getSprintStateCode(name)}));
        }
      }
      return [...new Map(options.filter(sprint => sprint.id && /^(active|future)$/i.test(sprint.state)).map(sprint => {
        const option = {id:String(sprint.id),name:sprint.name,state:String(sprint.state).toLowerCase()};
        sprintNameById[option.id] = option.name;
        sprintIdByName[option.name] = option.id;
        sprintStateByName[option.name] = option.state.toUpperCase();
        return [option.id,option];
      })).values()];
    }

    async function searchPlanningEpics(key, search, epicName, signal, fromReport) {
      const query = search.trim().replace(/["\\\\*?~]/g,' ').trim();
      const projects = new Set(['FCRM','OBPROJECT']);
      const ownProject = getIssueProjectKey(key);
      if (fromReport && /^[A-Z][A-Z0-9_]*$/.test(ownProject)) projects.add(ownProject);
      const requested = /(?:^|\\/browse\\/)([A-Z][A-Z0-9_]*-\\d+)(?:[/?#].*)?$/i.exec(query)?.[1].toUpperCase();
      const exact = requested && (fromReport || projects.has(getIssueProjectKey(requested))) ? requested : '';
      let jql = exact && fromReport ? 'issuetype = Epic' : 'project in (' + [...projects].join(', ') + ') AND issuetype = Epic';
      if (exact) jql += ' AND key = ' + JSON.stringify(exact);
      else if (query) {
        const text = JSON.stringify(query + '*');
        const conditions = ['summary ~ ' + text];
        const epicNameId = /^customfield_(\\d+)$/.exec(epicName || '')?.[1];
        if (epicNameId) conditions.push('cf[' + epicNameId + '] ~ ' + text);
        if (/^[\\w.-]+$/.test(query)) conditions.push('labels = ' + JSON.stringify(query));
        jql += ' AND (' + conditions.join(' OR ') + ')';
      }
      const params = new URLSearchParams({jql:jql + ' ORDER BY updated DESC',fields:'summary,status,components,issuetype,labels',maxResults:'60'});
      const response = await fetch('/rest/api/2/search?' + params.toString(), {cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},signal});
      if (!response.ok) throw new Error('Не удалось найти эпики в Jira (HTTP ' + response.status + ')');
      const data = await response.json();
      if (!Array.isArray(data.issues)) throw new Error('Jira не вернула список эпиков');
      return data.issues.filter(issue => issue.key !== key && /^[A-Z][A-Z0-9_]*-\\d+$/.test(issue.key) && (fromReport && exact ? issue.key === exact : projects.has(getIssueProjectKey(issue.key))) && isEpicIssueType(issue.fields?.issuetype?.name))
        .map(issue => ({id:issue.key,name:issue.fields.summary || issue.key,fields:issue.fields}));
    }

    async function savePlanningAssignee(key, option) {
      const response = await putIssueAssignee(key,option.id || null);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errors = [...(Array.isArray(body?.errorMessages) ? body.errorMessages : []),...Object.values(body?.errors || {})];
        throw new Error(errors.filter(Boolean).join(' · ') || 'Jira не сохранила исполнителя (HTTP ' + response.status + ')');
      }

      let fresh;
      try {
        fresh = await readPlanningIssue(key,['assignee']);
        if (!fresh.fields || !Object.hasOwn(fresh.fields,'assignee')) throw new Error();
        const actual = fresh.fields.assignee;
        const confirmed = option.id ? [actual?.name,actual?.key].includes(option.id) : actual === null;
        if (!confirmed) throw new Error();
      } catch (_) {
        throw new Error('Jira приняла изменение, но пока не подтвердила исполнителя. Обновите задачу перед повторной попыткой.');
      }
      const actual = fresh.fields.assignee;
      const name = actual?.displayName || actual?.name || actual?.key || '';
      const assignee = {...jiraPeople.fromJira(actual,'Не назначен'),role:actual?.emailAddress || 'Ozon Банк'};
      tasks = tasks.map(task => {
        let updated = task.key === key ? Object.assign({},task,{assignee}) : task;
        for (const type of ['inProjectLinks','projectTaskLinks','otherLinks']) {
          if (task[type]?.some(link => link.key === key)) updated = Object.assign({},updated,{[type]:task[type].map(link => link.key === key ? Object.assign({},link,{assignee}) : link)});
        }
        return updated;
      });
      if (tasks.some(task => task.key === key)) saveTaskOverride(key,{assignee});
      syncStrategyIssue({key,fields:fresh.fields});
      sprintReport.updateTask(key,{assigneeName:name,assignee:actual ? assignee : null});
      return key + ' → ' + assignee.name + '. Сохранено в Jira.';
    }

    async function savePlanningField(key, kind, option, fields) {
      if (kind === 'assignee') return savePlanningAssignee(key,option);
      const isSprint = kind === 'sprint';
      const url = isSprint
        ? (option.id ? '/rest/agile/1.0/sprint/' + encodeURIComponent(option.id) + '/issue' : '/rest/agile/1.0/backlog/issue')
        : '/rest/api/2/issue/' + encodeURIComponent(key);
      if (!isSprint && !fields.epic) throw new Error('Не найдено поле Epic Link в Jira.');
      const response = await fetch(url, {
        method:isSprint ? 'POST' : 'PUT', credentials:'same-origin',
        headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(isSprint ? {issues:[key]} : {fields:{[fields.epic]:option.id || null}})
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const errors = [...(Array.isArray(body?.errorMessages) ? body.errorMessages : []),...Object.values(body?.errors || {})];
        throw new Error(errors.filter(Boolean).join(' · ') || 'Jira не сохранила изменение (HTTP ' + response.status + ')');
      }

      const fieldList = isSprint ? ['sprint','closedSprints',fields.sprint] : ['epic',fields.epic];
      let fresh;
      try {
        fresh = await readPlanningIssue(key,fieldList);
        if (!fresh.fields || !fieldList.some(field => field && Object.prototype.hasOwnProperty.call(fresh.fields,field))) throw new Error();
        if (isSprint) {
          const verified = planningSprint(fresh.fields,fields.sprint);
          const scheduled = verified && /^(active|future)$/.test(verified.state);
          if (option.id ? verified?.id !== option.id : scheduled) throw new Error();
        } else if (planningEpicKey(fresh.fields,fields.epic) !== option.id) throw new Error();
      } catch (_) {
        throw new Error('Jira приняла изменение, но пока не подтвердила новое значение. Обновите задачу перед повторной попыткой.');
      }

      if (!isSprint && option.id) {
        try { option.fields = (await readPlanningIssue(option.id,['summary','status','components','issuetype','priority','labels','customfield_20100','customfield_24000'])).fields || option.fields; }
        catch (_) { /* The Epic Link write was already verified. */ }
        cacheEpicMetadata([{key:option.id,fields:option.fields || {}}]);
        strategicDashboard.rememberEpic(option.id,option.fields || {});
      }
      const backlog = getIssueProjectKey(key) === CONFIG.projectKey ? 'Бэклог FCRM' : 'Не в спринте';
      const patch = isSprint ? {sprint:option.id ? option.name : backlog} : {epicKey:option.id,epicName:option.id ? option.fields?.summary || option.name : 'Без эпика'};
      tasks = tasks.map(task => {
        let updated = task.key === key ? Object.assign({},task,patch) : task;
        for (const type of ['inProjectLinks','projectTaskLinks','otherLinks']) {
          if (task[type]?.some(link => link.key === key)) updated = Object.assign({},updated,{[type]:task[type].map(link => link.key === key ? Object.assign({},link,patch) : link)});
        }
        return updated;
      });
      if (tasks.some(task => task.key === key)) saveTaskOverride(key,patch);
      if (!isSprint) fresh.fields.epic = option.id ? {key:option.id,summary:option.fields?.summary || option.name} : null;
      syncStrategyIssue({key,fields:fresh.fields});
      const outsideDevelopment = developmentDashboard.applyPlanningField(key,kind,option);
      if (!isSprint) sprintReport.updateTask(key,{epic:option});
      if (!isSprint && option.id) void loadTableObprojectMetadata(new Set([option.id])).then(() => renderStructure());

      const outsideProduct = isSprint && activeDashboardView === 'product' && !matchesSprintState(option.id ? option.state.toUpperCase() : 'BACKLOG');
      const movedOutside = isSprint && (outsideProduct || (activeDashboardView === 'development' && outsideDevelopment));
      const destination = !isSprint && option.id ? option.id + ' · ' + option.name : option.name;
      return key + ' → ' + destination + (movedOutside ? '. Теперь задача вне выбранных спринтов.' : '. Сохранено в Jira.');
    }

    function openPlanningEditor(key, kind, trigger) {
      if (!key || planningEditor?.dataset.busy === 'true') return;
      planningEditor?.closePlanningEditor(false);
      const panel = document.createElement('aside');
      planningEditor = panel;
      const isSprint = kind === 'sprint';
      const isAssignee = kind === 'assignee';
      const reportAction = trigger?.getAttribute('data-report-action');
      const title = isSprint ? 'Спринт задачи' : isAssignee ? 'Исполнитель' : 'Epic Link';
      const currentLabel = isSprint ? 'Текущий спринт' : isAssignee ? 'Текущий исполнитель' : 'Текущий Epic Link';
      const searchLabel = isSprint ? 'Поиск спринта' : isAssignee ? 'Поиск исполнителя' : 'Поиск эпика';
      const placeholder = isSprint ? 'Поиск спринта…' : isAssignee ? 'Имя или логин…' : 'Ключ, название или метка эпика…';
      panel.className = 'ozon-component-editor ozon-planning-editor';
      panel.setAttribute('role','dialog');
      panel.setAttribute('aria-label',title + ' · ' + key);
      panel.style.cssText = 'position:fixed;z-index:2147483646;right:0;top:0;bottom:0;width:min(500px,100vw);background:#fff;box-shadow:-8px 0 24px #0f172a22;padding:20px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box';
      panel.innerHTML = '<div class="component-editor-head"><strong>' + title + ' · ' + escapeHtml(key) + '</strong><button type="button" class="component-editor-close" data-close aria-label="Закрыть">✕</button></div><div data-context class="component-editor-context" hidden></div><div class="ozon-sprint-current"><span>' + currentLabel + '</span><strong data-current>Загрузка…</strong></div><div class="component-editor-search"><input type="search" data-search placeholder="' + placeholder + '" aria-label="' + searchLabel + '" style="padding-left:10px" disabled></div><div data-message role="status"></div><div data-list class="component-editor-list"></div><div class="component-editor-footer"><button type="button" data-cancel class="component-editor-button">Отмена</button></div>';
      document.body.appendChild(panel);
      const closeButton = panel.querySelector('[data-close]');
      const search = panel.querySelector('[data-search]');
      const list = panel.querySelector('[data-list]');
      const message = panel.querySelector('[data-message]');
      const currentCell = panel.querySelector('[data-current]');
      const fields = planningFields();
      const empty = {id:'', name:isSprint ? 'Бэклог' : isAssignee ? 'Не назначен' : 'Без эпика'};
      let options = [], displayed = [], current = null, timer, searchController, busy = false;
      const lifetime = new AbortController();
      const setMessage = (text,error=false) => { message.setAttribute('role',error ? 'alert' : 'status'); message.textContent = text; };
      const close = (restoreFocus = true) => {
        if (busy) return;
        clearTimeout(timer);
        searchController?.abort();
        lifetime.abort();
        panel.remove();
        if (planningEditor === panel) planningEditor = null;
        if (restoreFocus && trigger?.isConnected) trigger.focus({preventScroll:true});
      };
      panel.closePlanningEditor = close;
      closeButton.onclick = () => close();
      panel.querySelector('[data-cancel]').onclick=()=>close();
      closeButton.focus({preventScroll:true});

      function renderOptions() {
        const query = search.value.trim().toLowerCase();
        displayed = isSprint ? options.filter(option => !query || option.name.toLowerCase().includes(query)) : options;
        list.innerHTML = displayed.length ? displayed.map((option,index) => {
          const selected = option.id === current?.id;
          const details = isSprint ? getSprintStateBadgeHtml(option.name, (option.state || '').toUpperCase()) : (option.fields?.status?.name ? getStatusBadgeHtml(option.fields.status.name) : '');
          const secondaryText = !isSprint && option.id && (!isAssignee || option.id !== option.name) ? '<small class="ozon-planning-option-key">' + escapeHtml([option.id,...(option.fields?.components || []).map(component => component.name)].filter(Boolean).join(' · ')) + '</small>' : '';
          const row = '<button type="button" class="component-editor-option' + (selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '" data-option="' + index + '"' + (busy ? ' disabled' : '') + '>' + (isAssignee ? jiraPeople.avatar(option.person) : '') + '<span class="ozon-planning-option-text">' + secondaryText + '<span>' + escapeHtml(option.name) + '</span></span>' + details + '</button>';
          return isAssignee && option.person?.login ? '<div class="ozon-person-line">' + row + jiraPeople.copyButton(option.person) + '</div>' : row;
        }).join('') : '<p>Ничего не найдено</p>';
      }

      const searchStatus = isAssignee ? 'Ищем исполнителей…' : 'Ищем эпики…';
      const baseOptions = () => [...(current?.id ? [current] : []),empty];
      async function loadSearchOptions() {
        searchController?.abort();
        const controller = new AbortController();
        searchController = controller;
        list.replaceChildren();
        setMessage(searchStatus);
        try {
          const query = search.value.trim();
          const found = isAssignee
            ? (await requestAssignableJiraUsers(query,key,controller.signal)).filter(user=>user.active!==false && (user.name || user.key) && isRealHumanJiraUser(user))
              .map(user=>{const person=jiraPeople.fromJira(user);return {id:user.name || user.key,name:person.name,person};})
            : await searchPlanningEpics(key,query,fields.epicName,controller.signal,Boolean(reportAction));
          if (controller.signal.aborted || !panel.isConnected) return;
          options = query ? found : [...baseOptions(),...found.filter(option => option.id !== current?.id)];
          setMessage('');
          renderOptions();
        } catch (error) {
          if (controller.signal.aborted || !panel.isConnected) return;
          if (isAssignee && !search.value.trim()) { options = baseOptions(); renderOptions(); }
          setMessage(error.message,true);
        }
      }

      search.addEventListener('input', () => {
        if (isSprint) { renderOptions(); return; }
        clearTimeout(timer);
        searchController?.abort();
        list.replaceChildren();
        setMessage(searchStatus);
        timer = setTimeout(loadSearchOptions,220);
      });
      search.addEventListener('keydown', event => {
        if (event.key === 'Enter' && displayed.length === 1) {
          event.preventDefault();
          list.querySelector('[data-option]')?.click();
        }
      });
      list.addEventListener('click',async event => {
        const button = event.target.closest('[data-option]');
        const option = button && displayed[Number(button.dataset.option)];
        if (!option || busy) return;
        if (option.id === current?.id) { close(); return; }
        busy = true;
        panel.dataset.busy = 'true';
        search.disabled = closeButton.disabled = true;
        setMessage('Сохраняем в Jira…');
        renderOptions();
        try {
          const notice = await savePlanningField(key,kind,option,fields);
          busy = false;
          close(false);
          renderStructure();
          showSaveToast(notice);
          if (reportAction && activeDashboardView === 'report') document.querySelector('[data-report-action="' + CSS.escape(reportAction) + '"][data-key="' + CSS.escape(key) + '"]')?.focus({preventScroll:true});
        } catch (error) {
          busy = false;
          panel.dataset.busy = 'false';
          search.disabled = closeButton.disabled = false;
          setMessage(error.message || 'Не удалось сохранить изменение',true);
          renderOptions();
          search.focus({preventScroll:true});
        }
      });

      void (async () => {
        const fieldList = isSprint ? ['summary','issuetype','components','sprint','closedSprints',fields.sprint] : isAssignee ? ['summary','assignee'] : ['summary','epic',fields.epic];
        try {
          const issue = await readPlanningIssue(key,fieldList,lifetime.signal);
          if (!panel.isConnected) return;
          const context = panel.querySelector('[data-context]');
          context.textContent = issue.fields?.summary || '';
          context.hidden = !context.textContent;
          if (isSprint && isEpicIssueType(issue.fields?.issuetype?.name)) {
            currentCell.textContent = '—';
            setMessage('У эпиков нельзя изменить спринт.');
            return;
          }
          if (isSprint) {
            const sprint = planningSprint(issue.fields || {},fields.sprint);
            current = sprint ? {...sprint,name:sprint.name || 'Спринт #' + sprint.id} : empty;
            const stateBadge = getSprintStateBadgeHtml(current.name, (current.state || '').toUpperCase());
            currentCell.innerHTML = escapeHtml(current.name) + (stateBadge ? ' ' + stateBadge : '');
            setMessage('Загружаем спринты…');
            const found = await planningSprintOptions(key,issue,sprint);
            if (!panel.isConnected) return;
            const editableCurrent = current.id && /^(active|future)$/.test(current.state);
            options = [...(editableCurrent ? [current] : []),empty,...found.filter(option => option.id !== current.id)];
            setMessage('');
            renderOptions();
          } else if (isAssignee) {
            if (!Object.hasOwn(issue.fields || {},'assignee')) throw new Error('Не удалось прочитать исполнителя из Jira.');
            const user = issue.fields.assignee;
            const person = user ? jiraPeople.fromJira(user) : null;
            current = person ? {id:user.name || user.key,name:person.name,person} : empty;
            currentCell.innerHTML = '<span class="ozon-person-line">' + jiraPeople.badge(person,current.name) + jiraPeople.copyButton(person) + '</span>';
            void loadSearchOptions();
          } else {
            const id = planningEpicKey(issue.fields || {},fields.epic);
            current = id ? {id,name:issue.fields?.epic?.summary || epicNameByKey[id] || id} : empty;
            currentCell.textContent = current.id && current.name !== current.id ? current.id + ' · ' + current.name : current.name;
            void loadSearchOptions();
            if (id && current.name === id) {
              void readPlanningIssue(id,['summary','status','components'],lifetime.signal).then(epic => {
                if (!panel.isConnected) return;
                current.name = epic.fields?.summary || id;
                current.fields = epic.fields || {};
                currentCell.textContent = current.name === id ? id : id + ' · ' + current.name;
                if (options.length && !busy) renderOptions();
              }).catch(() => {});
            }
          }
          search.disabled = false;
          if (document.activeElement === closeButton) search.focus({preventScroll:true});
        } catch (error) { if (panel.isConnected) setMessage(error.message,true); }
      })();
    }

    document.addEventListener('click', event => {
      const element = event.target instanceof Element ? event.target : null;
      const trigger = element?.closest(planningTriggers);
      if (!trigger?.closest('#ozon-structure-root') || element.closest('a, .ozon-copy-key-btn, [data-copy-issue-key]')) return;
      const id = trigger.getAttribute('data-select-id') || '';
      const action = trigger.getAttribute('data-action') || trigger.getAttribute('data-strategy-action') || trigger.getAttribute('data-dev-action') || trigger.getAttribute('data-report-action') || '';
      let key = trigger.getAttribute('data-key') || '';
      if (trigger.id === 'ozon-sb-epic-trigger' || id === 'sidebar-sprint') key = selectedTaskKey;
      if (id.startsWith('table-sprint-')) key = id.slice('table-sprint-'.length);
      if (action === 'open-ip-sprint-combo') key = tasks.find(task => task.key === selectedTaskKey)?.inProjectLinks?.[Number(trigger.getAttribute('data-link-idx'))]?.key || '';
      event.preventDefault();
      event.stopImmediatePropagation();
      const kind = action === 'edit-assignee' ? 'assignee' : trigger.id === 'ozon-sb-epic-trigger' || action.includes('epic') ? 'epic' : 'sprint';
      openPlanningEditor(key,kind,trigger);
    },true);
    document.addEventListener('pointerdown', event => {
      if (planningEditor?.isConnected && event.target instanceof Element && !planningEditor.contains(event.target)) planningEditor.closePlanningEditor(false);
    },true);
    document.addEventListener('keydown', event => {
      if (isStructureVisible && event.key === 'Escape' && planningEditor?.isConnected) {
        event.stopImmediatePropagation();
        planningEditor.closePlanningEditor();
        return;
      }
      const trigger = event.target instanceof Element && event.target.matches(planningTriggers) ? event.target : null;
      if ((event.key === 'Enter' || event.key === ' ') && trigger?.getAttribute('role') === 'button') {
        event.preventDefault();
        event.stopImmediatePropagation();
        trigger.click();
      }
    },true);
    const issueTooltipCache = new Map();
    let issueTooltipTarget = null;
    let issueTooltip = null;
    let issueTooltipTitles = [];
    const renderIssueTooltip = (title, detail) => {
      if (!issueTooltip) return;
      const heading = document.createElement('strong');
      heading.style.cssText = 'display:block;font-size:14px;line-height:1.4;font-weight:700;color:#fff;margin-bottom:8px;';
      heading.textContent = title;
      const body = document.createElement('div');
      body.style.cssText = 'font-size:12px;line-height:1.5;color:#dce6f5;font-weight:400;';
      body.textContent = detail;
      issueTooltip.replaceChildren(heading, body);
    };
    document.addEventListener('mouseover', (event) => {
      const target = event.target instanceof Element ? event.target.closest('.ozon-ip-summary, .ozon-other-summary, #ozon-structure-root a[href*="/browse/"], #o3ds-layer a[href*="/browse/"], #ozon-thread-sidebar a[href*="/browse/"]') : null;
      if (!target || target === issueTooltipTarget) return;
      const row = target.closest('.ozon-ext-link-compact-row, .ozon-ext-section-card, tr, div');
      const anchor = target.matches('a[href*="/browse/"]') ? target : row?.querySelector('a[href*="/browse/"]');
      const match = anchor && /\\/browse\\/([A-Z][A-Z0-9]*-\\d+)/i.exec(anchor.getAttribute('href') || '');
      if (!match) return;
      const key = match[1].toUpperCase();
      const text = target.matches('.ozon-ip-summary, .ozon-other-summary') ? target.textContent.trim() : (anchor.getAttribute('title') || anchor.textContent.trim());
      issueTooltipTitles = [];
      for (let node = target; node && node !== document.body; node = node.parentElement) {
        if (node.hasAttribute('title')) { issueTooltipTitles.push([node,node.getAttribute('title')]); node.removeAttribute('title'); }
      }
      issueTooltipTarget = target;
      if (!issueTooltip) { issueTooltip = document.createElement('div'); issueTooltip.className = 'ozon-issue-tooltip'; issueTooltip.setAttribute('role','tooltip'); issueTooltip.style.cssText = 'position:fixed;z-index:2147483647;max-width:min(420px,90vw);padding:10px 12px;background:#071026;color:white;border-radius:8px;font:12px/1.45 sans-serif;box-shadow:0 4px 16px #07102633;white-space:pre-wrap;overflow-wrap:anywhere;pointer-events:none;'; document.body.appendChild(issueTooltip); }
      const rect = target.getBoundingClientRect();
      issueTooltip.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(420, window.innerWidth - 16))) + 'px';
      issueTooltip.style.top = Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 140)) + 'px';
      renderIssueTooltip(key + ' · ' + text, 'Загрузка описания…');
      if (!issueTooltipCache.has(key)) issueTooltipCache.set(key, fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=summary,description', {credentials:'same-origin',headers:{Accept:'application/json'}}).then(response => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).catch(() => null));
      issueTooltipCache.get(key).then(issue => {
        if (issueTooltipTarget !== target || !issueTooltip) return;
        const description = typeof issue?.fields?.description === 'string' ? issue.fields.description.replace(/\\r/g,'').trim() : '';
        const excerpt = description.split('\\n').filter(Boolean).slice(0,4).join('\\n').slice(0,400);
        renderIssueTooltip(key + ' · ' + (issue?.fields?.summary || text), excerpt || 'Описание отсутствует или недоступно');
      });
    });
    document.addEventListener('mouseout', (event) => {
      if (issueTooltipTarget && !issueTooltipTarget.contains(event.relatedTarget)) { issueTooltipTitles.forEach(([node,title]) => { if (node.isConnected && !node.hasAttribute('title')) node.setAttribute('title',title); }); issueTooltipTitles = []; issueTooltipTarget = null; issueTooltip?.remove(); issueTooltip = null; }
    });
    document.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (!isStructureVisible || target instanceof Element && target.closest('[data-show-native-board]')) return;
      if (createInProjectMenuOpen && target instanceof Element && !target.closest('.ozon-ext-create-menu, [data-action="toggle-create-in-project-menu"]')) {
        createInProjectMenuOpen = false;
        document.querySelector('.ozon-ext-create-menu')?.remove();
      }
      if (otherLinkMenuOpen && target instanceof Element && !target.closest('.ozon-ext-other-link-menu, [data-action="toggle-other-link-menu"]')) { otherLinkMenuOpen = false; document.querySelector('.ozon-ext-other-link-menu')?.remove(); }
      if (!(target instanceof Element) || target.closest('.ozon-ext-combo-popover, [role="dialog"]:not(#ozon-dev-editor-panel):not(#o3ds-layer), #ozon-ext-sidebar-resizer')) return;
      const panels = ['#o3ds-layer', '.ozon-dev-settings', '#ozon-dev-editor-panel', '#ozon-ext-sidebar-panel'];
      const panel = panels.map(selector => document.querySelector(selector)).find(Boolean);
      if (panel?.id === 'o3ds-layer' && target.closest('#ozon-ext-sidebar-panel, #ozon-ext-sidebar-resizer')) return;
      if (!panel || panel.contains(target)) return;
      const selectedKey = selectedTaskKey;
      setTimeout(() => {
        if (!panel.isConnected) return;
        if (panel.id === 'o3ds-layer') { document.dispatchEvent(new CustomEvent('ozon-close-assistant')); return; }
        if (panel.matches('.ozon-dev-settings')) { panel.querySelector('[data-dev-action="settings-cancel"]')?.click(); return; }
        if (panel.id === 'ozon-dev-editor-panel') { panel.querySelector('[data-dev-action="close-editor"]')?.click(); return; }
        if (selectedTaskKey === selectedKey) document.getElementById('ozon-ext-sidebar-close')?.click();
      }, 0);
    }, true);
    if (activeDashboardView === 'product') prepareProductFilters();
    if (activeDashboardView === 'strategy') strategicDashboard.prepareFilters();

    document.addEventListener('ozon-fcrm-issue-applied', (event) => {
      const issueKey = event && event.detail && event.detail.issueKey;
      if (issueKey && tasks.some((task) => task.key === issueKey)) {
        reloadSingleTaskFromJira(issueKey, true);
      }
    });

    // Закрытие открытых поповеров по клику вне них
    document.addEventListener('click', (e) => {
      if (!isStructureVisible || e.target.closest('#ozon-structure-toggle-btn')) return;
      if (
        !e.target.closest('.ozon-ext-combo-popover') &&
        !e.target.closest('.ozon-ext-toolbar-trigger') &&
        !e.target.closest('.ozon-ext-search-select-trigger') &&
        !e.target.closest('.ozon-ext-cell-combo-trigger') &&
        !e.target.closest('.ozon-ext-status-trigger') &&
        !e.target.closest('.ozon-ext-sb-combo-trigger') &&
        !e.target.closest('#ozon-ext-toggle-col-order') &&
        !e.target.closest('.ozon-ext-product-settings')
      ) {
        if (activeTableCombo || sbEpicComboOpen || sbCompComboOpen || sbIpCompOpenIdx !== null || sbIpSprintOpenIdx !== null || isColOrderPanelOpen || activeToolbarFilter || activeSearchSelectId) {
          activeTableCombo = null;
          tableUserSearchResults = [];
          sbEpicComboOpen = false;
          sbCompComboOpen = false;
          sbIpCompOpenIdx = null;
          sbIpSprintOpenIdx = null;
          isColOrderPanelOpen = false;
          activeToolbarFilter = '';
          toolbarFilterSearch = '';
          activeSearchSelectId = '';
          searchSelectQuery = '';
          renderStructure();
        }
      }
    });

    document.addEventListener('keydown',event=>{if(isStructureVisible && event.key==='Escape')closeSidebarPickers();});
    window.addEventListener('popstate', () => {
      renderStructure();
    });
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
  <title>Ozon Bank В· FCRM Structure</title>
  <style>
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    .btn + .btn {
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="title">Ozon Bank В· FCRM Structure (#${config.rapidViewId})</div>
  <div class="desc">
    Реестр активен на доске <strong>${config.projectKey}</strong>. Кнопка «Улучшить» появляется у заголовка задачи на jit.o3.ru и ходит в DeepSeek через service worker.
  </div>
  <a class="btn" href="${config.boardUrl}" target="_blank" rel="noopener noreferrer">
    Открыть доску FCRM на jit.o3.ru
  </a>
  <button type="button" class="btn" id="o3ds-open-options">Настройки DeepSeek (токен и промпт)</button>
  <script src="popup.js"></script>
</body>
</html>`;
}

export function generatePopupJs(_config: ExtensionConfig): string {
  return `document.getElementById('o3ds-open-options').addEventListener('click', (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});
`;
}
