import { ExtensionConfig, FcrmTask, LinkedIssueItem } from '../types/jira';

export function generateManifestJson(config: ExtensionConfig): string {
  const manifest = {
    manifest_version: 3,
    name: `Ozon Bank · Jira FCRM Structure (#${config.rapidViewId})`,
    short_name: 'Ozon Structure',
    version: '3.1.0',
    description: `Компактный реестр Jira Structure (v3.1): свернутые по умолчанию спринты и компоненты, Input-Select поиск для Эпиков (FCRM) и Компонентов (по проекту задачи), группировка связей OB/OBFRONT/FTD с иконками, SVG-иконки приоритетов Jira, сворачиваемые аккордеоны и чипсы спринтов.`,
    permissions: ['storage', 'activeTab'],
    host_permissions: ['https://jit.o3.ru/*'],
    action: {
      default_title: 'Ozon Bank · FCRM Structure',
      default_popup: 'popup.html',
    },
    content_scripts: [
      {
        matches: ['https://jit.o3.ru/secure/RapidBoard.jspa*'],
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
  margin-left: 10px !important;
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
}

#ozon-structure-toggle-btn:hover {
  background-color: #D0E3FF !important;
}

#ozon-structure-toggle-btn.active {
  background-color: #005BFF !important;
  color: #FFFFFF !important;
}

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

#ozon-structure-root *,
#ozon-structure-root *::before,
#ozon-structure-root *::after {
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
}

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

.ozon-ext-task-row:hover:not(:has(.ozon-ext-inner-ctrl:hover)) {
  background: #F2F4F8 !important;
}

.ozon-ext-task-row.selected {
  background: #EBF3FF !important;
}

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

.ozon-ext-open-sb-btn.active {
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

.ozon-ext-combo-popover input[type="text"] {
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

.ozon-ext-combo-popover input[type="text"]:focus {
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
`;
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

  function isTargetBoardPage() {
    const path = window.location.pathname || '';
    if (!path.includes('/secure/RapidBoard.jspa')) {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    const rv = params.get('rapidView');
    const pk = params.get('projectKey');
    if (rv && String(rv) !== String(CONFIG.rapidViewId)) {
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
  ensureGoogleFontsLoaded();

  const STORAGE_KEY_OVERRIDES = 'ozon_fcrm_task_overrides_v31';
  const STORAGE_KEY_COL_WIDTHS = 'ozon_fcrm_col_widths_v31';
  const STORAGE_KEY_COL_ORDER = 'ozon_fcrm_col_order_v31';
  const STORAGE_KEY_SIDEBAR_W = 'ozon_fcrm_sidebar_width_v31';

  let tasks = ${JSON.stringify(initialTasks, null, 2)};
  let umbCatalog = ${JSON.stringify(umbEpicCatalog, null, 2)};
  let isStructureVisible = true;
  let isInitialBoardLoading = true;
  let groupByComponentInsideSprint = true;
  let selectedTaskKey = null;
  let isSidebarOpen = false;
  let isEditingDescription = false;
  let loadingSidebarTaskKey = null;
  let sidebarBlockLoading = { taskKey: null, desc: false, params: false, links: false, ipMeta: false };
  let loadingSprintsMap = {};
  let loadingComponentsMap = {};
  let sidebarWidth = Number(localStorage.getItem(STORAGE_KEY_SIDEBAR_W)) || 540;

  // ПО УМОЛЧАНИЮ ВСЕ СПРИНТЫ И ВСЕ КОМПОНЕНТЫ СВЕРНУТЫ!
  // Храним явно развернутые пользователем спринты и компоненты:
  let expandedSprints = {}; // { [sprintName]: true }
  let expandedComponents = {}; // { [sprintName + '::' + compName]: true }
  let expandedSubRows = {};

  // Сворачиваемые аккордеоны в сайдбаре и группы связей OB / OBFRONT / FTD
  let collapsedSidebarSections = {
    desc: false,
    params: false,
    pt: false,
    pt_quick: true, // Быстрый фильтр в аккордеоне «Задачи проекта» по умолчанию закрыт
    ip: false
  };
  let collapsedIpGroups = {}; // { [groupKey]: true }

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
  let filterEpicComboOpen = false;
  let filterEpicSearchQuery = '';
  let filterCompComboOpen = false;
  let filterCompSearchQuery = '';
  let isColOrderPanelOpen = false;
  let draggedColKey = null;

  // Фильтры и сортировка верхней панели
  let searchQuery = '';
  let filterComponent = 'all';
  let filterEpic = 'all';
  let filterStatus = 'all';
  let filterSprintState = 'all'; // 'all' | 'open_future' | 'ACTIVE' | 'FUTURE' | 'CLOSED' | 'BACKLOG'
  let hideEpicTasks = false; // Фильтр «Скрыть задачи с типом Эпик»
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
  let statusMessage = 'Загрузка спринтов и задач FCRM...';
  let saveToastText = '';
  let saveToastTimer = null;

  // Динамически обнаруженные метаданные Jira
  let discoveredFields = {
    sprint: null,
    epicLink: null,
    epicName: null,
    customer: null
  };
  let discoveredCustomerFieldIds = [];
  let discoveredIssueLinkTypes = [];
  let sprintNameById = {};
  let sprintIdByName = {};
  let sprintStateByName = {};
  let sprintOrderWeight = {};
  let boardOwnedSprintIds = new Set();
  let boardOwnedSprintNames = new Set();
  let closedSprintIds = new Set();
  let closedSprintNames = new Set();
  let issueSprintOverrideMap = {};
  let epicNameByKey = {}; // Все эпики (для отображения названий)
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

  function getSprintStateLabelRu(sprintName) {
    const code = getSprintStateCode(sprintName);
    if (code === 'CLOSED') return 'Прошедший';
    if (code === 'ACTIVE') return 'Активный';
    if (code === 'FUTURE') return 'Будущий';
    return '';
  }

  function formatSprintWithStateText(sprintName) {
    if (!sprintName) return 'Не в спринте';
    const clean = String(sprintName).trim();
    const label = getSprintStateLabelRu(clean);
    if (!label) return clean;
    if (clean.includes('(' + label + ')')) return clean;
    return clean + ' (' + label + ')';
  }

  function getSprintStateBadgeHtml(sprintName) {
    const code = getSprintStateCode(sprintName);
    if (code === 'ACTIVE') {
      return '<span class="ozon-ext-badge ozon-ext-badge-done" style="font-size:9.5px;padding:0 5px;flex-shrink:0;">Активный</span>';
    }
    if (code === 'FUTURE') {
      return '<span class="ozon-ext-badge ozon-ext-badge-progress" style="font-size:9.5px;padding:0 5px;flex-shrink:0;">Будущий</span>';
    }
    if (code === 'CLOSED') {
      return '<span class="ozon-ext-badge ozon-ext-badge-todo" style="font-size:9.5px;padding:0 5px;flex-shrink:0;">Прошедший</span>';
    }
    return '';
  }

  const DEFAULT_COLUMNS_META = [
    { key: 'task', label: 'Задача (Спринт → Компонент → Задача)', width: 370 },
    { key: 'status', label: 'Статус ▾', width: 130 },
    { key: 'epic', label: 'Эпик (FCRM) ▾', width: 240 },
    { key: 'component', label: 'Компонент ▾', width: 180 },
    { key: 'assignee', label: 'Исполнитель ▾', width: 165 },
    { key: 'author', label: 'Автор', width: 140 },
    { key: 'customer', label: 'Заказчик/Owner ▾', width: 170 },
    { key: 'created', label: 'Создана', width: 115 },
    { key: 'sprint', label: 'Спринт ▾', width: 175 },
    { key: 'projectTask', label: 'Задача проекта (fcrm_umb_epic)', width: 230 },
    { key: 'inProject', label: 'В проекте (OB · OBFRONT · FTD)', width: 275 }
  ];

  const DEFAULT_COLUMN_ORDER = DEFAULT_COLUMNS_META.map((c) => c.key);
  let epicSearchTimer = null;
  let componentsByProjectMap = externalProjectComponentsMap;

  function getIssueProjectKey(issueKey) {
    if (!issueKey || typeof issueKey !== 'string') return CONFIG.projectKey;
    const parts = issueKey.trim().split('-');
    return (parts[0] || CONFIG.projectKey).toUpperCase();
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
        if (!validKeys.includes(c.key)) validKeys.push(c.key);
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
    saveToastText = msg;
    if (saveToastTimer) clearTimeout(saveToastTimer);
    const toastEl = document.getElementById('ozon-ext-toast');
    if (toastEl) {
      toastEl.textContent = msg;
      toastEl.style.display = 'inline-flex';
    }
    saveToastTimer = setTimeout(() => {
      saveToastText = '';
      const el = document.getElementById('ozon-ext-toast');
      if (el) el.style.display = 'none';
    }, 3200);
  }

  function loadLocalOverrides() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_OVERRIDES) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveTaskOverride(taskKey, patch) {
    try {
      const all = loadLocalOverrides();
      const safePatch = Object.assign({}, patch);
      delete safePatch.inProjectLinks;
      delete safePatch.projectTaskLinks;
      all[taskKey] = Object.assign({}, all[taskKey] || {}, safePatch);
      localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(all));
    } catch (e) {}
  }

  function applyLocalOverridesToTasks(list) {
    const all = loadLocalOverrides();
    return list.map((t) => {
      if (!all[t.key]) return t;
      const ov = Object.assign({}, all[t.key]);
      delete ov.inProjectLinks;
      delete ov.projectTaskLinks;
      return Object.assign({}, t, ov);
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

  function getStatusCategoryClass(statusName) {
    const low = String(statusName || '').toLowerCase();
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
    return '<span class="ozon-ext-badge ozon-ext-badge-' + cat + '">' + escapeHtml(s) + '</span>';
  }

  /**
   * Нейтральный тег типа связи («Задача проекта» / «В проекте») с иконкой связи,
   * чтобы визуально НЕ путать с цветными бейджами статусов («Закрыт», «В работе»).
   */
  function getLinkTypeTagHtml(isProjectTask) {
    if (isProjectTask) {
      return '<span class="ozon-ext-link-type-tag" title="Тип связи: Задача проекта (fcrm_umb_epic)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg><span>Задача проекта</span></span>';
    }
    return '<span class="ozon-ext-link-type-tag" title="Тип связи: В проекте (смежная задача реализации)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>В проекте</span></span>';
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
    s = s.replace(/(^|[\\s(«"'])\\*([^\\s*][^*]*?[^\\s*]|[^\\s*])\\*(?=[\\s)»"',.:;!?]|$)/g, '$1<strong style="color:#071026;font-weight:700;">$2</strong>');
    // Курсив _текст_
    s = s.replace(/(^|[\\s(«"'])_([^\\s_][^_]*?[^\\s_]|[^\\s_])_(?=[\\s)»"',.:;!?]|$)/g, '$1<em>$2</em>');

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
      const numMatch = trimmed.match(/^(?:(#+)|(\\d+)[.)]|(\\d+)\\s+(?=[А-Яа-яЁёA-Za-z]))\\s*(.+)$/);
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

  function getIssueTypeBadgeHtml(issueTypeName, showLabel) {
    const t = String(issueTypeName || 'Задача').trim() || 'Задача';
    const isEp = isEpicIssueType(t);
    const bg = isEp ? '#F3E8FF' : '#F1F5F9';
    const fg = isEp ? '#7E22CE' : '#334155';
    const border = isEp ? '#D8B4FE' : '#CBD5E1';
    if (!showLabel) {
      return '<span style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;" title="Тип задачи: ' + escapeHtml(t) + '">' + getJiraIssueTypeIconSvg(t) + '</span>';
    }
    return (
      '<span style="display:inline-flex;align-items:center;gap:4px;padding:0 5px;height:17px;border-radius:4px;font-size:10px;font-weight:600;background:' +
      bg +
      ';color:' +
      fg +
      ';border:1px solid ' +
      border +
      ';flex-shrink:0;white-space:nowrap;" title="Тип задачи: ' +
      escapeHtml(t) +
      '">' +
      getJiraIssueTypeIconSvg(t) +
      '<span>' +
      escapeHtml(t) +
      '</span></span>'
    );
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

  function extractCleanSprintName(rawVal, issueId, issueKey, allowClosed) {
    if (issueKey && issueSprintOverrideMap[issueKey]) {
      const ov = issueSprintOverrideMap[issueKey];
      if (allowClosed || !closedSprintNames.has(ov)) return ov;
    }
    if (issueId && issueSprintOverrideMap[String(issueId)]) {
      const ov = issueSprintOverrideMap[String(issueId)];
      if (allowClosed || !closedSprintNames.has(ov)) return ov;
    }

    if (!rawVal) return null;

    if (Array.isArray(rawVal)) {
      for (let i = rawVal.length - 1; i >= 0; i--) {
        const parsed = extractCleanSprintName(rawVal[i], null, null, allowClosed);
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

    // 1. Приоритет №1: Активный или Будущий спринт
    if (iss.key && issueSprintOverrideMap[iss.key] && !closedSprintNames.has(issueSprintOverrideMap[iss.key])) {
      return issueSprintOverrideMap[iss.key];
    }
    if (iss.id && issueSprintOverrideMap[String(iss.id)] && !closedSprintNames.has(issueSprintOverrideMap[String(iss.id)])) {
      return issueSprintOverrideMap[String(iss.id)];
    }

    const fromAgileActive = extractCleanSprintName(f.sprint, iss.id, iss.key, false);
    if (fromAgileActive) return fromAgileActive;

    if (discoveredFields.sprint && f[discoveredFields.sprint]) {
      const fromCustomActive = extractCleanSprintName(f[discoveredFields.sprint], iss.id, iss.key, false);
      if (fromCustomActive) return fromCustomActive;
    }

    for (const k of Object.keys(f)) {
      const val = f[k];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].includes('greenhopper.service.sprint.Sprint')) {
        const parsedActive = extractCleanSprintName(val, iss.id, iss.key, false);
        if (parsedActive) return parsedActive;
      }
    }

    // 2. Приоритет №2: Прошедший (закрытый) спринт, чтобы закрытые спринты тоже отображались в списке и на доске
    if (iss.key && issueSprintOverrideMap[iss.key]) {
      return issueSprintOverrideMap[iss.key];
    }
    if (iss.id && issueSprintOverrideMap[String(iss.id)]) {
      return issueSprintOverrideMap[String(iss.id)];
    }

    const fromAgileClosed = extractCleanSprintName(f.sprint, iss.id, iss.key, true);
    if (fromAgileClosed) return fromAgileClosed;

    if (discoveredFields.sprint && f[discoveredFields.sprint]) {
      const fromCustomClosed = extractCleanSprintName(f[discoveredFields.sprint], iss.id, iss.key, true);
      if (fromCustomClosed) return fromCustomClosed;
    }

    if (Array.isArray(f.closedSprints) && f.closedSprints.length > 0) {
      const fromClosedArr = extractCleanSprintName(f.closedSprints, iss.id, iss.key, true);
      if (fromClosedArr) return fromClosedArr;
    }

    for (const k of Object.keys(f)) {
      const val = f[k];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].includes('greenhopper.service.sprint.Sprint')) {
        const parsedClosed = extractCleanSprintName(val, iss.id, iss.key, true);
        if (parsedClosed) return parsedClosed;
      }
    }

    return 'Бэклог FCRM';
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
    const lf = lIss.fields || {};

    const fromSprint = extractAnyRealSprintName(lf.sprint);
    if (fromSprint) return fromSprint;

    if (discoveredFields.sprint && lf[discoveredFields.sprint]) {
      const fromCustom = extractAnyRealSprintName(lf[discoveredFields.sprint]);
      if (fromCustom) return fromCustom;
    }

    for (const k of Object.keys(lf)) {
      const val = lf[k];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].includes('greenhopper.service.sprint.Sprint')) {
        const parsed = extractAnyRealSprintName(val);
        if (parsed) return parsed;
      }
    }

    if (Array.isArray(lf.closedSprints) && lf.closedSprints.length > 0) {
      const fromClosed = extractAnyRealSprintName(lf.closedSprints);
      if (fromClosed) {
        if (!sprintStateByName[fromClosed]) {
          sprintStateByName[fromClosed] = 'CLOSED';
        }
        return fromClosed;
      }
    }

    return 'Не в спринте';
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

  async function ensureProjectComponentsLoaded(projKey) {
    if (!projKey) return [];
    const cleanKey = String(projKey).trim().toUpperCase();
    if (cleanKey === String(CONFIG.projectKey).toUpperCase()) {
      return getAllComponentOptions();
    }
    if (externalProjectComponentsMap[cleanKey]) {
      return externalProjectComponentsMap[cleanKey];
    }
    try {
      const res = await fetch('/rest/api/2/project/' + encodeURIComponent(cleanKey) + '/components', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const arr = await res.json();
        if (Array.isArray(arr)) {
          const names = arr.map((c) => c && c.name).filter(Boolean);
          externalProjectComponentsMap[cleanKey] = Array.from(new Set(['Без компонента', ...names]));
          return externalProjectComponentsMap[cleanKey];
        }
      }
    } catch (e) {}
    externalProjectComponentsMap[cleanKey] = ['Без компонента'];
    return externalProjectComponentsMap[cleanKey];
  }

  /**
   * Извлекает командный префикс серии спринта (например из "CS #73 (20.10 - 02.11)" -> "CS")
   */
  function extractSprintSeriesPrefix(sprintName) {
    if (!sprintName || sprintName === 'Не в спринте' || sprintName.includes('Бэклог')) return '';
    const m = String(sprintName).trim().match(/^([A-Za-zА-Яа-яЁё0-9_&\\-\\s]+?)(?:\\s*#\\d+|\\s+\\d+|\\s*\\()/);
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

    externalProjectSprintsMap[cacheKey] = Array.from(foundSprints).filter((sp) => isEditableSprintOption(sp));
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
    const cached = (externalProjectSprintsMap[cacheKey] || externalProjectSprintsMap[projKey + '::*'] || []).filter((sp) =>
      isEditableSprintOption(sp)
    );

    // Также собираем активные и будущие спринты других связанных задач того же проекта и компонента
    const fromSameProjectCompLinks = [];
    const seriesPrefix = extractSprintSeriesPrefix(realSprintVal) || compName;
    const prefixLow = seriesPrefix ? seriesPrefix.toLowerCase() : '';

    tasks.forEach((t) => {
      (t.inProjectLinks || []).forEach((otherLnk) => {
        if (!otherLnk || !otherLnk.key) return;
        const otherProj = getIssueProjectKey(otherLnk.key);
        if (otherProj !== projKey) return;
        const otherComp = otherLnk.component && otherLnk.component !== 'Без компонента' ? String(otherLnk.component).split(',')[0].trim() : '';
        const otherSp = otherLnk.sprint && otherLnk.sprint !== 'Не в спринте' ? String(otherLnk.sprint).trim() : '';
        if (!otherSp || !isEditableSprintOption(otherSp)) return;
        if (!compName || otherComp.toLowerCase() === compName.toLowerCase()) {
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

    const combined = Array.from(
      new Set([
        ...(isEditableSprintOption(realSprintVal) ? [realSprintVal] : []),
        ...cached,
        ...fromKnownPrefix,
        ...fromSameProjectCompLinks,
        'Не в спринте'
      ])
    ).filter((sp) => isEditableSprintOption(sp));

    const dummyGroups = {};
    combined.forEach((s) => {
      dummyGroups[s] = true;
    });
    return getSortedSprintNames(dummyGroups);
  }

  // ============================================================================
  // РЕАЛЬНОЕ СОЗДАНИЕ И УДАЛЕНИЕ СВЯЗЕЙ (ISSUE LINKS) В JIRA REST API
  // ============================================================================
  async function createIssueLinkInJira(sourceTaskKey, targetTaskKey, category /* 'projectTask' | 'inProject' */) {
    if (!sourceTaskKey || !targetTaskKey) return false;
    try {
      // Подгружаем типы связей, если они ещё не загружены
      if (!Array.isArray(discoveredIssueLinkTypes) || discoveredIssueLinkTypes.length === 0) {
        const ltRes = await fetch('/rest/api/2/issueLinkType', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (ltRes.ok) {
          const ltData = await ltRes.json();
          if (ltData && Array.isArray(ltData.issueLinkTypes)) {
            discoveredIssueLinkTypes = ltData.issueLinkTypes;
          }
        }
      }

      // Ищем тип связи "Задача проекта" / "В проекте" в вашей Jira
      let chosenType = discoveredIssueLinkTypes.find((lt) => {
        const n = String(lt.name || '').toLowerCase();
        const inw = String(lt.inward || '').toLowerCase();
        const outw = String(lt.outward || '').toLowerCase();
        return (
          n.includes('задача проекта') ||
          n.includes('в проекте') ||
          inw.includes('задача проекта') ||
          outw.includes('задача проекта') ||
          inw.includes('в проекте') ||
          outw.includes('в проекте')
        );
      });

      if (!chosenType) {
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
      } else {
        // category === 'inProject'
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
        await reloadSingleTaskFromJira(sourceTaskKey);
        return true;
      } else {
        // Резервная попытка с Relates, если кастомное имя типа связи отличается
        const fallbackType = discoveredIssueLinkTypes.find((lt) => /relates|связ/i.test(String(lt.name || ''))) || discoveredIssueLinkTypes[0];
        if (fallbackType && fallbackType.name !== chosenType.name) {
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
            await reloadSingleTaskFromJira(sourceTaskKey);
            return true;
          }
        }
        showSaveToast('⚠ Не удалось создать связь с ' + targetTaskKey + ' (проверьте ключ задачи)');
        return false;
      }
    } catch (e) {
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
      const issueParam = issueKey ? 'issueKey=' + encodeURIComponent(issueKey) + '&' : 'project=' + encodeURIComponent(CONFIG.projectKey) + '&';
      const res1 = await fetch(
        '/rest/api/2/user/assignable/search?' + issueParam + 'username=' + encodeURIComponent(q) + '&query=' + encodeURIComponent(q) + '&maxResults=25',
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      if (res1.ok) {
        const arr1 = await res1.json();
        if (Array.isArray(arr1)) {
          arr1.forEach((u) => {
            if (!isRealHumanJiraUser(u)) return;
            const login = u.name || u.key || u.displayName;
            if (login && u.displayName) {
              const item = { name: login, displayName: u.displayName, email: u.emailAddress || '' };
              mergedMap.set(login, item);
              if (!assignableUsersList.some((ex) => ex.name === login)) {
                assignableUsersList.push(item);
              }
            }
          });
        }
      }
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
                const item = { name: login, displayName: u.displayName, email: u.emailAddress || '' };
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
      } else {
        showSaveToast('⚠ Проверьте код эпика ' + (cleanEpKey || ''));
      }
    } catch (e) {}
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

      const res = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey) + '/assignee', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loginName })
      });

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
    const epFields = ['summary'];
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

  // Шаг 1. Авто-обнаружение ID кастомных полей, типов связей, компонентов, статусов из схемы, приоритетов и исполнителей FCRM
  async function discoverJiraFieldsAndComponents() {
    try {
      const res = await fetch('/rest/api/2/field', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const fields = await res.json();
        if (Array.isArray(fields)) {
          const exactOwnerIds = [];
          const secondaryOwnerIds = [];
          fields.forEach((fld) => {
            const customType = (fld.schema && fld.schema.custom) || '';
            const nameLow = String(fld.name || '').toLowerCase().trim();
            const nameCompact = nameLow.replace(/\\s+/g, '');

            if (customType.includes('gh-sprint') || nameLow === 'sprint' || nameLow === 'спринт') {
              discoveredFields.sprint = fld.id;
            }
            if (customType.includes('gh-epic-link') || nameLow === 'epic link' || nameLow === 'ссылка на эпик') {
              discoveredFields.epicLink = fld.id;
            }
            if (customType.includes('gh-epic-label') || nameLow === 'epic name' || nameLow === 'название эпика' || nameLow === 'имя эпика') {
              discoveredFields.epicName = fld.id;
            }
            // Везде где отображаем заказчика, ищем поле "Заказчик/Owner" с наивысшим приоритетом
            if (nameCompact === 'заказчик/owner' || nameLow.includes('заказчик/owner') || (nameLow.includes('заказчик') && nameLow.includes('owner'))) {
              exactOwnerIds.push(fld.id);
            } else if (nameLow === 'заказчик' || nameLow === 'owner' || nameLow === 'бизнес-заказчик' || nameLow === 'customer' || nameLow.includes('заказчик')) {
              secondaryOwnerIds.push(fld.id);
            }
          });
          discoveredCustomerFieldIds = Array.from(new Set([...exactOwnerIds, ...secondaryOwnerIds]));
          if (discoveredCustomerFieldIds.length > 0) {
            discoveredFields.customer = discoveredCustomerFieldIds[0];
          }
        }
      }
    } catch (e) {}

    try {
      const ltRes = await fetch('/rest/api/2/issueLinkType', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (ltRes.ok) {
        const ltData = await ltRes.json();
        if (ltData && Array.isArray(ltData.issueLinkTypes)) {
          discoveredIssueLinkTypes = ltData.issueLinkTypes;
        }
      }
    } catch (e) {}

    // Компоненты СТРОГО проекта FCRM
    try {
      const compRes = await fetch('/rest/api/2/project/' + encodeURIComponent(CONFIG.projectKey) + '/components', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (compRes.ok) {
        const comps = await compRes.json();
        if (Array.isArray(comps) && comps.length > 0) {
          projectComponentsList = comps
            .filter((c) => !c.project || String(c.project).toUpperCase() === String(CONFIG.projectKey).toUpperCase())
            .map((c) => c.name)
            .filter(Boolean);
        }
      }
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
                typesList.push({ id: typeId, name: typeName, subtask: Boolean(issueTypeObj.subtask) });
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
                  projectIssueTypesList.push({ id: tId, name: tName, subtask: Boolean(it.subtask) });
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
        if (spData.isLast === true || vals.length < (spData.maxResults || 50)) {
          spIsLast = true;
        }
      }
    } catch (e) {}

    try {
      const ghRes = await fetch('/rest/greenhopper/1.0/xboard/plan/backlog/data.json?rapidViewId=' + CONFIG.rapidViewId, {
        credentials: 'same-origin',
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
            spIssuesIds.forEach((issId) => {
              if (st !== 'CLOSED' || !issueSprintOverrideMap[issId]) {
                issueSprintOverrideMap[issId] = sp.name;
              }
            });
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
      const res = await fetch('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=key,summary,status,issuetype,components&maxResults=200', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.issues) && data.issues.length > 0) {
        const loaded = data.issues
          .map((iss, idx) => ({
            id: 'umb-' + idx + '-' + iss.key,
            key: iss.key,
            summary: (iss.fields && iss.fields.summary) || iss.key,
            status: (iss.fields && iss.fields.status && iss.fields.status.name) || 'Открыто',
            issueTypeName: (iss.fields && iss.fields.issuetype && iss.fields.issuetype.name) || 'Задача',
            component: resolveRealLinkedIssueComponent(iss)
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
    } catch (e) {}
  }

  function getBoardFieldsParam() {
    const fieldList = [
      'summary',
      'description',
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

  async function normalizeAndEnrichJiraIssues(rawIssues) {
    const allEpicKeysToResolve = new Set();
    const linkedIssueKeys = new Set();
    const umbKeysSet = new Set(umbCatalog.map((u) => u.key));

    rawIssues.forEach((iss) => {
      const f = iss.fields || {};
      if (f.assignee && (f.assignee.name || f.assignee.key) && f.assignee.displayName && isRealHumanJiraUser(f.assignee)) {
        const uLogin = f.assignee.name || f.assignee.key;
        if (!assignableUsersList.some((u) => u.name === uLogin)) {
          assignableUsersList.push({ name: uLogin, displayName: f.assignee.displayName, email: f.assignee.emailAddress || '' });
        }
      }
      if (f.reporter && (f.reporter.name || f.reporter.key) && f.reporter.displayName && isRealHumanJiraUser(f.reporter)) {
        const rLogin = f.reporter.name || f.reporter.key;
        if (!assignableUsersList.some((u) => u.name === rLogin)) {
          assignableUsersList.push({ name: rLogin, displayName: f.reporter.displayName, email: f.reporter.emailAddress || '' });
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
        const lEpicKey =
          (lEpObj && lEpObj.key) ||
          (discoveredFields.epicLink && typeof lf[discoveredFields.epicLink] === 'string' ? lf[discoveredFields.epicLink].trim() : '') ||
          (lf.parent && lf.parent.key) ||
          '';
        if (lEpicKey) {
          allEpicKeysToResolve.add(lEpicKey);
        }
        return {
          summary: lf.summary || lIss.key,
          status: (lf.status && lf.status.name) || 'Открыто',
          issueTypeName: (lf.issuetype && lf.issuetype.name) || 'Задача',
          priority: (lf.priority && lf.priority.name) || 'Medium',
          component: realComp,
          sprint: realSprint,
          epicKey: lEpicKey,
          epicName: (lEpicKey && epicNameByKey[lEpicKey]) || '',
          assigneeName: (lf.assignee && lf.assignee.displayName) || '—',
          authorName: (lf.reporter && lf.reporter.displayName) || (lf.creator && lf.creator.displayName) || '—',
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
                { credentials: 'same-origin', headers: { Accept: 'application/json' } }
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
                { credentials: 'same-origin', headers: { Accept: 'application/json' } }
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
      const epKeysAll = Array.from(allEpicKeysToResolve).filter((k) => !epicNameByKey[k]);
      const epChunks = [];
      for (let i = 0; i < epKeysAll.length; i += 50) {
        epChunks.push(epKeysAll.slice(i, i + 50));
      }
      for (let b = 0; b < epChunks.length; b += 4) {
        const batch = epChunks.slice(b, b + 4);
        await Promise.all(
          batch.map(async (chunk) => {
            try {
              const epFields = ['summary'];
              if (discoveredFields.epicName) epFields.push(discoveredFields.epicName);
              const epRes = await fetch(
                '/rest/api/2/search?jql=' + encodeURIComponent('key in (' + chunk.join(',') + ')') + '&fields=' + epFields.join(',') + '&maxResults=100',
                { credentials: 'same-origin', headers: { Accept: 'application/json' } }
              );
              if (epRes.ok) {
                const epData = await epRes.json();
                if (Array.isArray(epData.issues)) {
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

    return rawIssues.map((iss) => {
      const f = iss.fields || {};
      const taskSprint = resolveIssueSprint(iss);
      if (taskSprint && taskSprint !== 'Бэклог FCRM') {
        boardOwnedSprintNames.add(taskSprint);
      }

      const epObj = f.epic;
      let epicKey =
        (epObj && epObj.key) ||
        (discoveredFields.epicLink && typeof f[discoveredFields.epicLink] === 'string' ? f[discoveredFields.epicLink].trim() : '') ||
        '';

      let resolvedEpicTitle = epicKey && epicNameByKey[epicKey] ? epicNameByKey[epicKey] : '';
      if (!resolvedEpicTitle && epObj) {
        if (!isBogusEpicTitle(epObj.summary, epicKey)) resolvedEpicTitle = String(epObj.summary).trim();
        else if (!isBogusEpicTitle(epObj.name, epicKey)) resolvedEpicTitle = String(epObj.name).trim();
      }
      if (epicKey && resolvedEpicTitle && String(epicKey).startsWith(CONFIG.projectKey + '-')) {
        fcrmEpicNameByKey[epicKey] = resolvedEpicTitle;
      }
      let epicName = resolvedEpicTitle || 'Без эпика';

      const compName =
        Array.isArray(f.components) && f.components[0] && f.components[0].name
          ? f.components[0].name
          : 'Без компонента';

      const parsedOwner = extractCustomerOwnerFromIssueFields(f);
      const custName = parsedOwner.name || 'Не указан';

      const rawLinks = Array.isArray(f.issuelinks) ? f.issuelinks : [];
      const ptLinks = [];
      const ipLinks = [];

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

        const itemStatus = (enriched && enriched.status) || (target.fields && target.fields.status && target.fields.status.name) || 'Открыто';
        // Исключаем отменённые (Canceled) задачи из всех списков связей
        if (isCanceledStatus(itemStatus)) return;

        const item = {
          id: lnk.id ? String(lnk.id) : 'lnk-' + iss.key + '-' + idx,
          jiraLinkId: lnk.id ? String(lnk.id) : null,
          key: target.key,
          summary: (enriched && enriched.summary) || (target.fields && target.fields.summary) || target.key,
          status: itemStatus,
          issueTypeName: (enriched && enriched.issueTypeName) || (target.fields && target.fields.issuetype && target.fields.issuetype.name) || 'Задача',
          priority: (enriched && enriched.priority) || 'Medium',
          component: realLinkComp,
          sprint: realLinkSprint,
          epicKey: lEpKey,
          epicName: lEpName,
          assigneeName: (enriched && enriched.assigneeName) || '—',
          authorName: (enriched && enriched.authorName) || '—',
          createdAt: (enriched && enriched.createdAt) || '—'
        };

        if ((enriched && enriched.isUmbEpic) || umbKeysSet.has(target.key)) {
          ptLinks.push(item);
        } else if (activeDirDesc.includes('в проекте')) {
          ipLinks.push(item);
        } else if (activeDirDesc === 'задача проекта' && target.key.startsWith(CONFIG.projectKey + '-')) {
          ptLinks.push(item);
        } else {
          ipLinks.push(item);
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
        summary: f.summary || iss.key,
        description: rawDesc,
        issueTypeName: issueTypeName,
        issueTypeId: issueTypeId,
        epicKey: epicKey,
        epicName: epicName,
        component: compName,
        assignee: {
          name: (f.assignee && f.assignee.displayName) || 'Не назначен',
          login: (f.assignee && (f.assignee.name || f.assignee.key)) || '',
          role: (f.assignee && f.assignee.emailAddress) || 'Ozon Банк'
        },
        author: {
          name: (f.reporter && f.reporter.displayName) || (f.creator && f.creator.displayName) || 'Неизвестен',
          login: (f.reporter && (f.reporter.name || f.reporter.key)) || ''
        },
        customer: {
          name: custName,
          login: parsedOwner.login || '',
          department: 'FCRM'
        },
        createdAt: formatDate(f.created),
        createdTimestamp: f.created ? new Date(f.created).getTime() : 0,
        sprint: taskSprint,
        status: (f.status && f.status.name) || 'Открыто',
        priority: (f.priority && f.priority.name) || 'Medium',
        projectTaskLinks: ptLinks,
        inProjectLinks: ipLinks
      };
    }).filter((t) => !isCanceledStatus(t.status));
  }

  /**
   * Универсальная пагинация (дозапросы по startAt) для Agile endpoints (/sprint/{id}/issue, /backlog, /board/{id}/issue)
   */
  async function fetchPaginatedAgileIssues(baseUrlWithQuery, maxTotal) {
    const limit = maxTotal || 2500;
    const allIssues = [];
    let startAt = 0;
    const pageSize = 100;
    const sep = baseUrlWithQuery.includes('?') ? '&' : '?';

    try {
      const firstRes = await fetch(baseUrlWithQuery + sep + 'startAt=0&maxResults=' + pageSize, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!firstRes.ok) return { ok: false, issues: [] };
      const firstData = await firstRes.json();
      const firstBatch = Array.isArray(firstData.issues) ? firstData.issues : [];
      allIssues.push(...firstBatch);

      const total = typeof firstData.total === 'number' ? Math.min(firstData.total, limit) : firstBatch.length;
      const effectiveStep = firstBatch.length > 0 ? firstBatch.length : pageSize;

      if (allIssues.length < total && firstBatch.length > 0) {
        const offsets = [];
        for (let nextStart = allIssues.length; nextStart < total; nextStart += effectiveStep) {
          offsets.push(nextStart);
        }
        for (let i = 0; i < offsets.length; i += 3) {
          const batchOffsets = offsets.slice(i, i + 3);
          const batchResponses = await Promise.all(
            batchOffsets.map((st) =>
              fetch(baseUrlWithQuery + sep + 'startAt=' + st + '&maxResults=' + effectiveStep, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
              })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            )
          );
          let anyAdded = false;
          batchResponses.forEach((d) => {
            if (d && Array.isArray(d.issues) && d.issues.length > 0) {
              allIssues.push(...d.issues);
              anyAdded = true;
            }
          });
          if (!anyAdded) break;
        }
      }
      return { ok: true, issues: allIssues };
    } catch (e) {
      return { ok: false, issues: allIssues };
    }
  }

  /**
   * Универсальная пагинация (дозапросы по startAt) для JQL /rest/api/2/search, чтобы ВСЕ задачи FCRM попадали на доску без обрезания maxResults
   */
  async function fetchPaginatedJqlIssues(jql, fieldsParam, maxTotal, onProgress) {
    const limit = maxTotal || 3000;
    const allIssues = [];
    const pageSize = 100;
    const baseSearchUrl = '/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=' + fieldsParam;

    try {
      const firstRes = await fetch(baseSearchUrl + '&startAt=0&maxResults=' + pageSize, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!firstRes.ok) return { ok: false, issues: [] };
      const firstData = await firstRes.json();
      const firstBatch = Array.isArray(firstData.issues) ? firstData.issues : [];
      allIssues.push(...firstBatch);

      const total = typeof firstData.total === 'number' ? Math.min(firstData.total, limit) : firstBatch.length;
      const effectiveStep = firstBatch.length > 0 ? firstBatch.length : pageSize;

      if (typeof onProgress === 'function') {
        onProgress(allIssues.slice(), total, false);
      }

      if (allIssues.length < total && firstBatch.length > 0) {
        const offsets = [];
        for (let nextStart = allIssues.length; nextStart < total; nextStart += effectiveStep) {
          offsets.push(nextStart);
        }
        for (let i = 0; i < offsets.length; i += 3) {
          const batchOffsets = offsets.slice(i, i + 3);
          const batchResponses = await Promise.all(
            batchOffsets.map((st) =>
              fetch(baseSearchUrl + '&startAt=' + st + '&maxResults=' + effectiveStep, {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' }
              })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
            )
          );
          let anyAdded = false;
          batchResponses.forEach((d) => {
            if (d && Array.isArray(d.issues) && d.issues.length > 0) {
              allIssues.push(...d.issues);
              anyAdded = true;
            }
          });
          if (typeof onProgress === 'function') {
            onProgress(allIssues.slice(), total, false);
          }
          if (!anyAdded) break;
        }
      }
      return { ok: true, issues: allIssues, total: total };
    } catch (e) {
      return { ok: false, issues: allIssues, total: allIssues.length };
    }
  }

  async function reloadSingleSprintFromJira(sprintName) {
    loadingSprintsMap[sprintName] = true;
    renderStructure();

    try {
      const fieldsParam = getBoardFieldsParam();
      const spId = sprintIdByName[sprintName];
      let sprintRawIssues = [];

      if (spId) {
        const agRes = await fetchPaginatedAgileIssues(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint/' + encodeURIComponent(spId) + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey) + '&fields=' + fieldsParam,
          1000
        );
        if (agRes.ok && agRes.issues.length > 0) {
          sprintRawIssues = agRes.issues.filter((iss) => iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-'));
        } else {
          // Фоллбэк через JQL по ID спринта (особенно полезно для закрытых спринтов)
          const jqlRes = await fetchPaginatedJqlIssues(
            'project = ' + CONFIG.projectKey + ' AND Sprint = ' + spId + ' ORDER BY updated DESC',
            fieldsParam,
            1000
          );
          if (jqlRes.ok && jqlRes.issues.length > 0) {
            sprintRawIssues = jqlRes.issues.filter((iss) => iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-'));
          }
        }
        sprintRawIssues.forEach((iss) => {
          issueSprintOverrideMap[iss.key] = sprintName;
        });
      } else if (sprintName.includes('Бэклог')) {
        let agBacklog = await fetchPaginatedAgileIssues(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/backlog?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&fields=' + fieldsParam,
          1500
        );
        if (!agBacklog.ok || agBacklog.issues.length === 0) {
          agBacklog = await fetchPaginatedJqlIssues(
            'project = ' + CONFIG.projectKey + ' AND (Sprint is EMPTY OR Sprint not in (openSprints(), futureSprints(), closedSprints())) ORDER BY updated DESC',
            fieldsParam,
            1500
          );
        }
        if (agBacklog.ok) {
          sprintRawIssues = agBacklog.issues.filter((iss) => iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-'));
        }
      }

      if (sprintRawIssues.length > 0) {
        const refreshedTasks = applyLocalOverridesToTasks(await normalizeAndEnrichJiraIssues(sprintRawIssues));
        const refreshedMap = {};
        refreshedTasks.forEach((t) => {
          refreshedMap[t.key] = t;
        });
        tasks = tasks.map((t) => refreshedMap[t.key] || t);
        refreshedTasks.forEach((rt) => {
          if (!tasks.some((t) => t.key === rt.key)) {
            tasks.push(rt);
          }
        });
      }
    } catch (e) {}

    loadingSprintsMap[sprintName] = false;
    renderStructure();
  }

  /**
   * Перезапрос задач конкретного компонента внутри спринта при его раскрытии в списке
   */
  async function reloadSingleComponentFromJira(sprintName, compName) {
    if (!sprintName || !compName) return;
    const compKey = sprintName + '::' + compName;
    loadingComponentsMap[compKey] = true;
    renderStructure();

    try {
      const fieldsParam = getBoardFieldsParam();
      const spId = sprintIdByName[sprintName];
      const safeComp = String(compName).replace(/"/g, '\\"');
      const compClause =
        compName === 'Без компонента'
          ? 'component is EMPTY'
          : 'component = "' + safeComp + '"';

      let sprintClause = '';
      if (spId) {
        sprintClause = 'Sprint = ' + spId;
      } else if (sprintName.toLowerCase().includes('бэклог') || sprintName.toLowerCase().includes('backlog')) {
        sprintClause = '(Sprint is EMPTY OR Sprint not in (openSprints(), futureSprints(), closedSprints()))';
      } else {
        sprintClause = 'Sprint = "' + String(sprintName).replace(/"/g, '\\"') + '"';
      }

      const jql = 'project = ' + CONFIG.projectKey + ' AND ' + sprintClause + ' AND ' + compClause + ' ORDER BY updated DESC';
      const jqlRes = await fetchPaginatedJqlIssues(jql, fieldsParam, 600);

      if (jqlRes.ok && jqlRes.issues.length > 0) {
        const compRawIssues = jqlRes.issues.filter((iss) => iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-'));
        if (spId) {
          compRawIssues.forEach((iss) => {
            issueSprintOverrideMap[iss.key] = sprintName;
          });
        }
        if (compRawIssues.length > 0) {
          const refreshedTasks = applyLocalOverridesToTasks(await normalizeAndEnrichJiraIssues(compRawIssues));
          const refreshedMap = {};
          refreshedTasks.forEach((t) => {
            refreshedMap[t.key] = t;
          });
          tasks = tasks.map((t) => refreshedMap[t.key] || t);
          refreshedTasks.forEach((rt) => {
            if (!tasks.some((t) => t.key === rt.key)) {
              tasks.push(rt);
            }
          });
        }
      }
    } catch (e) {}

    loadingComponentsMap[compKey] = false;
    renderStructure();
  }

  /**
   * Последовательная (поблочная) загрузка деталей задачи в правом сайдбаре:
   * 1. Базовые поля и описание задачи (мгновенное обновление блока «Описание задачи» и шапки)
   * 2. Доступные переходы статуса и справочники проекта (обновление блока «Параметры задачи»)
   * 3. Обогащение связанных задач «Задача проекта» и «В проекте» (обновление аккордеонов связей)
   * 4. Компоненты и спринты смежных проектов (OB / OBFRONT / FTD) для выпадающих списков связей
   */
  async function reloadSingleTaskFromJira(taskKey) {
    if (!taskKey) return;
    const hasExistingTask = tasks.some((t) => t.key === taskKey);
    loadingSidebarTaskKey = hasExistingTask ? null : taskKey;
    sidebarBlockLoading = {
      taskKey: taskKey,
      desc: true,
      params: true,
      links: true,
      ipMeta: true
    };
    assigneeSearchQuery = '';
    customerSearchQuery = '';
    renderStructure();

    try {
      const fieldsParam = getBoardFieldsParam();

      // ЭТАП 1: Загружаем саму задачу (описание + основные поля) и сразу рендерим блок «Описание задачи»
      let rawIssue = null;
      try {
        const issRes = await fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '?fields=' + fieldsParam, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (issRes.ok) {
          rawIssue = await issRes.json();
          if (rawIssue && rawIssue.key) {
            const f = rawIssue.fields || {};
            const parsedOwner = extractCustomerOwnerFromIssueFields(f);
            const compName =
              Array.isArray(f.components) && f.components[0] && f.components[0].name
                ? f.components[0].name
                : 'Без компонента';
            const quickSprint = resolveIssueSprint(rawIssue);

            tasks = applyLocalOverridesToTasks(
              tasks.map((t) => {
                if (t.key !== taskKey) return t;
                return Object.assign({}, t, {
                  summary: f.summary ? String(f.summary) : t.summary,
                  description: typeof f.description === 'string' ? f.description : t.description || '',
                  status: (f.status && f.status.name) || t.status,
                  issueTypeName: (f.issuetype && f.issuetype.name) || t.issueTypeName || 'Задача',
                  issueTypeId: (f.issuetype && f.issuetype.id) || t.issueTypeId || '',
                  priority: (f.priority && f.priority.name) || t.priority,
                  component: compName,
                  sprint: quickSprint || t.sprint,
                  assignee: f.assignee
                    ? {
                        name: f.assignee.displayName || f.assignee.name || 'Не назначен',
                        login: f.assignee.name || f.assignee.key || ''
                      }
                    : { name: 'Не назначен', login: '' },
                  customer:
                    parsedOwner && parsedOwner.name && parsedOwner.name !== 'Не указан'
                      ? parsedOwner
                      : t.customer
                });
              })
            ).filter((t) => !isCanceledStatus(t.status));
          }
        }
      } catch (e) {}

      if (sidebarBlockLoading.taskKey !== taskKey) return;
      loadingSidebarTaskKey = null;
      sidebarBlockLoading.desc = false;
      renderStructure();

      // ЭТАП 2: Загружаем переходы воркфлоу (transitions) и компоненты проекта для блока «Параметры задачи»
      try {
        const taskProjKey = getIssueProjectKey(taskKey);
        const [trRes] = await Promise.all([
          fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '/transitions', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          }),
          ensureProjectComponentsLoaded(taskProjKey)
        ]);
        if (trRes && trRes.ok) {
          const trData = await trRes.json();
          if (Array.isArray(trData.transitions)) {
            issueTransitionsByKey[taskKey] = trData.transitions;
          }
        }
      } catch (e) {}

      if (sidebarBlockLoading.taskKey !== taskKey) return;
      sidebarBlockLoading.params = false;
      renderStructure();

      // ЭТАП 3: Полное обогащение связей «Задача проекта» и «В проекте» (статусы, приоритеты, эпики, спринты связей)
      let enrichedTask = null;
      if (rawIssue && rawIssue.key) {
        try {
          const enrichedArr = applyLocalOverridesToTasks(await normalizeAndEnrichJiraIssues([rawIssue]));
          if (enrichedArr[0]) {
            enrichedTask = enrichedArr[0];
            tasks = tasks.map((t) => (t.key === taskKey ? enrichedTask : t));
          }
        } catch (e) {}
      }

      if (sidebarBlockLoading.taskKey !== taskKey) return;
      sidebarBlockLoading.links = false;
      renderStructure();

      // ЭТАП 4: Последовательная догрузка справочников компонентов и спринтов для связанных задач «В проекте»
      const ipLinks = (enrichedTask && enrichedTask.inProjectLinks) || [];
      if (ipLinks.length > 0) {
        for (let i = 0; i < ipLinks.length; i += 3) {
          if (sidebarBlockLoading.taskKey !== taskKey) return;
          const batch = ipLinks.slice(i, i + 3);
          await Promise.all(
            batch.map((lnk) =>
              Promise.all([
                ensureProjectComponentsLoaded(getIssueProjectKey(lnk.key)),
                loadSprintsForLinkedIssue(lnk)
              ])
            )
          );
        }
      }
    } catch (e) {}

    if (sidebarBlockLoading.taskKey === taskKey) {
      sidebarBlockLoading = { taskKey: null, desc: false, params: false, links: false, ipMeta: false };
    }
    if (loadingSidebarTaskKey === taskKey) {
      loadingSidebarTaskKey = null;
    }
    renderStructure();
  }

  async function loadBoardIssuesFromJira() {
    isInitialBoardLoading = true;
    renderStructure();

    try {
      await discoverJiraFieldsAndComponents();
      await Promise.all([loadBoardSprintsAndEpics(), loadUmbEpicTasksFromJira()]);

      const fieldsParam = getBoardFieldsParam();
      let rawIssues = [];
      const seenKeys = new Set();

      const addUniqueIssues = (arr, explicitSprintName) => {
        if (!Array.isArray(arr)) return;
        arr.forEach((iss) => {
          if (!iss || !iss.key || !String(iss.key).startsWith(CONFIG.projectKey + '-')) return;
          if (explicitSprintName) {
            issueSprintOverrideMap[iss.key] = explicitSprintName;
          }
          if (!seenKeys.has(iss.key)) {
            seenKeys.add(iss.key);
            rawIssues.push(iss);
          }
        });
      };

      // 1. Запрашиваем задачи для родных активных и будущих спринтов доски 9349 с дозапросами (пагинацией)
      const activeAndFutureSprintIds = Array.from(boardOwnedSprintIds).filter((id) => !closedSprintIds.has(id));
      await Promise.all(
        activeAndFutureSprintIds.slice(0, 20).map(async (spId) => {
          const spRes = await fetchPaginatedAgileIssues(
            '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint/' + spId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey) + '&fields=' + fieldsParam,
            1000
          );
          if (spRes.ok) {
            addUniqueIssues(spRes.issues, sprintNameById[spId]);
          }
        })
      );

      // 2. Комплексная выгрузка ВСЕХ задач проекта FCRM с автоматическими дозапросами по startAt (активные, будущие, закрытые спринты и бэклог)
      const jqlAllRes = await fetchPaginatedJqlIssues(
        'project = ' + CONFIG.projectKey + ' ORDER BY updated DESC',
        fieldsParam,
        3000,
        (partialIssues, totalCount) => {
          statusMessage = 'Дозагрузка задач FCRM: ' + Math.min(seenKeys.size + partialIssues.length, totalCount) + ' из ' + totalCount + '...';
        }
      );

      if (jqlAllRes.ok && jqlAllRes.issues.length > 0) {
        addUniqueIssues(jqlAllRes.issues, null);
      } else {
        // Резервный вариант через Agile Board API с пагинацией
        let boardPaginated = await fetchPaginatedAgileIssues(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&fields=' + fieldsParam,
          2500
        );
        if (!boardPaginated.ok || boardPaginated.issues.length === 0) {
          boardPaginated = await fetchPaginatedAgileIssues(
            '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/backlog?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&fields=' + fieldsParam,
            2500
          );
        }
        if (boardPaginated.ok) {
          addUniqueIssues(boardPaginated.issues, null);
        }
      }

      if (rawIssues.length === 0) {
        isInitialBoardLoading = false;
        statusMessage = 'Показаны демо-данные FCRM';
        renderStructure();
        return;
      }

      tasks = applyLocalOverridesToTasks(await normalizeAndEnrichJiraIssues(rawIssues));
      isInitialBoardLoading = false;
      statusMessage = 'Спринт → Компонент (' + tasks.length + ' задач FCRM)';
      renderStructure();
    } catch (e) {
      isInitialBoardLoading = false;
      statusMessage = 'Режим предпросмотра FCRM';
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
    const fcrmOnly = tasks
      .filter((t) => t.key && t.key.startsWith(CONFIG.projectKey + '-'))
      .map((t) => t.component)
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
    tasks.forEach((t) => {
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

  function renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys) {
    const isSelected = isSidebarOpen && task.key === selectedTaskKey;
    const ptList = (task.projectTaskLinks || []).filter((l) => !isCanceledStatus(l.status));
    const ipList = (task.inProjectLinks || []).filter((l) => !isCanceledStatus(l.status));
    const totalLinks = ptList.length + ipList.length;
    const isSubExpanded = Boolean(expandedSubRows[task.key]);
    const hasNoProjectTask = ptList.length === 0;
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
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" style="min-width:290px;padding:6px;display:flex;flex-direction:column;gap:5px;" onclick="event.stopPropagation();">
          <input type="text" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск эпика FCRM (код или название)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
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
                        <div class="ozon-ext-combo-item \${k === task.epicKey ? 'active' : ''}" style="\${comboItemStyle}" data-action="pick-table-epic" data-key="\${escapeHtml(task.key)}" data-epic-key="\${escapeHtml(k)}" data-epic-name="\${escapeHtml(epicMap[k] || '')}">
                          <span class="ozon-mono" style="color:#005BFF;font-weight:700;flex-shrink:0;">\${escapeHtml(k)}</span>
                          <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;">\${escapeHtml(epicMap[k] || '')}</span>
                        </div>
                      \`
                    )
                    .join('')
                : '<div style="padding:6px 8px;color:#64748B;font-size:11px;">Эпики FCRM не найдены (введите запрос для поиска в Jira)</div>'
            }
          </div>
        </div>
      \`;
    }

    const epicCellHtml = \`
      <div class="ozon-ext-inner-ctrl ozon-ext-cell-combo-trigger" data-action="open-table-epic-combo" data-key="\${escapeHtml(task.key)}" title="\${escapeHtml((task.epicKey ? task.epicKey + ' — ' : '') + (cleanEpicTitle || 'Без эпика'))} (Нажмите для поиска эпика FCRM)">
        <div style="display:flex;align-items:center;gap:4px;min-width:0;flex:1;overflow:hidden;">
          \${
            task.epicKey
              ? \`<span class="ozon-mono" style="color:#005BFF;font-weight:600;font-size:11px;flex-shrink:0;">\${escapeHtml(task.epicKey)}</span>
                 <span style="color:#334155;font-size:11px;overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(cleanEpicTitle || task.epicKey)}</span>\`
              : \`<span style="color:#94A3B8;font-size:11px;">Без эпика</span>\`
          }
        </div>
        <span style="color:#94A3B8;font-size:9px;flex-shrink:0;">▾</span>
        \${epicPopoverHtml}
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
          <input type="text" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск компонента (\${escapeHtml(taskProjKey)})..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
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
          <input type="text" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск человека (ФИО или логин)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
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
                          <span style="color:#071026;font-weight:600;overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(u.displayName)}</span>
                          \${u.name ? \`<span style="color:#64748B;font-size:10px;flex-shrink:0;">(\${escapeHtml(u.name)})</span>\` : ''}
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

    const assigneeCellHtml = \`
      <div class="ozon-ext-inner-ctrl ozon-ext-cell-combo-trigger" data-action="open-table-assignee-combo" data-key="\${escapeHtml(task.key)}" title="Исполнитель: \${escapeHtml(task.assignee.name)} (Нажмите для поиска сотрудника)">
        <span style="color:\${task.assignee.name === 'Не назначен' ? '#94A3B8' : '#071026'};font-weight:500;font-size:11px;overflow:hidden;text-overflow:ellipsis;flex:1;">\${escapeHtml(task.assignee.name || 'Не назначен')}</span>
        <span style="color:#94A3B8;font-size:9px;flex-shrink:0;">▾</span>
        \${assigneePopoverHtml}
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
          <input type="text" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск Заказчик/Owner (ФИО или логин)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
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

    const taskIndentPx = groupByComponentInsideSprint ? 46 : 28;
    const subRowIndentPx = groupByComponentInsideSprint ? 68 : 48;

    const cellMap = {
      task: \`
        <td style="padding-left:\${taskIndentPx}px !important;border-left:3px solid #E2E8F0 !important;">
          <div class="ozon-ext-cell-singleline">
            \${
              totalLinks > 0
                ? \`<button type="button" class="ozon-ext-inner-ctrl" data-action="toggle-subrow" data-key="\${escapeHtml(task.key)}" title="Развернуть/свернуть связанные задачи (\${totalLinks})" style="border:none;background:transparent;color:#005BFF;font-weight:700;cursor:pointer;padding:0;width:16px;min-width:16px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;line-height:1;flex-shrink:0;">\${isSubExpanded ? '▼' : '▶'}</button>\`
                : '<span style="display:inline-block;width:16px;min-width:16px;flex-shrink:0;"></span>'
            }
            <span title="Приоритет: \${escapeHtml(task.priority || 'Medium')}" style="display:inline-flex;align-items:center;justify-content:center;width:15px;min-width:15px;flex-shrink:0;">\${getJiraPriorityIconSvg(task.priority)}</span>
            \${getIssueTypeBadgeHtml(task.issueTypeName || 'Задача', true)}
            <a href="/browse/\${escapeHtml(task.key)}" target="_blank" class="ozon-ext-inner-ctrl ozon-mono" onclick="event.stopPropagation();" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(task.key)}</a>
            \${hasNoProjectTask ? getMissingProjectTaskWarnSvg() : ''}
            \${hasNoAssignee ? getMissingAssigneeWarnSvg() : ''}
            <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;font-weight:500;font-size:11.5px;flex:1;min-width:0;">\${escapeHtml(task.summary)}</span>
            <button type="button" class="ozon-ext-inner-ctrl ozon-ext-open-sb-btn \${isSelected ? 'active' : ''}" data-action="open-sidebar" data-key="\${escapeHtml(task.key)}" title="Открыть детали задачи \${escapeHtml(task.key)} в боковой панели справа">
              ◨ Детали
            </button>
          </div>
        </td>
      \`,
      status: \`<td style="overflow:visible;">\${statusCellHtml}</td>\`,
      epic: \`<td style="overflow:visible;">\${epicCellHtml}</td>\`,
      component: \`<td style="overflow:visible;">\${compCellHtml}</td>\`,
      assignee: \`<td style="overflow:visible;">\${assigneeCellHtml}</td>\`,
      author: \`
        <td title="\${escapeHtml(task.author.name)}" style="color:#475569;font-size:11px;">
          <div class="ozon-ext-cell-singleline">\${escapeHtml(task.author.name)}</div>
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
        <td>
          <div class="ozon-ext-cell-singleline">
            <select class="ozon-ext-inner-ctrl ozon-ext-inline-select sprint-muted" data-action="change-sprint" data-key="\${escapeHtml(task.key)}" title="\${escapeHtml(formatSprintWithStateText(task.sprint))}">
              \${sprintOptions}
            </select>
          </div>
        </td>
      \`,
      projectTask: \`<td>\${ptSingleLineHtml}</td>\`,
      inProject: \`<td>\${ipSingleLineHtml}</td>\`
    };

    let html = \`
      <tr class="ozon-ext-task-row \${isSelected ? 'selected' : ''}" data-key="\${escapeHtml(task.key)}" title="Нажмите на строку, чтобы развернуть/свернуть связанные задачи (или нажмите «◨ Детали» для открытия боковой панели)">
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
            <td style="padding-left:\${subRowIndentPx}px !important;border-left:3px solid #CBD5E1 !important;">
              <div class="ozon-ext-cell-singleline">
                <span class="ozon-mono" style="color:#94A3B8;font-weight:700;">↳</span>
                \${getLinkTypeTagHtml(isPt)}
                <span title="Приоритет: \${escapeHtml(l.priority || 'Medium')}" style="display:inline-flex;align-items:center;flex-shrink:0;">\${getJiraPriorityIconSvg(l.priority || 'Medium')}</span>
                \${getIssueTypeBadgeHtml(l.issueTypeName || 'Задача', true)}
                <a href="/browse/\${escapeHtml(l.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(l.key)}</a>
                <span style="color:#071026;font-weight:500;overflow:hidden;text-overflow:ellipsis;" title="\${escapeHtml(l.summary)}">\${escapeHtml(l.summary)}</span>
              </div>
            </td>
          \`,
          status: \`<td><div class="ozon-ext-cell-singleline">\${getStatusBadgeHtml(l.status)}</div></td>\`,
          epic: \`<td>\${lEpicHtml}</td>\`,
          component: \`<td style="color:#071026;font-weight:600;"><div class="ozon-ext-cell-singleline" title="\${escapeHtml(l.component || 'Без компонента')}">\${escapeHtml(l.component || 'Без компонента')}</div></td>\`,
          assignee: \`<td style="color:#475569;font-size:11px;"><div class="ozon-ext-cell-singleline" title="\${escapeHtml(l.assigneeName || '—')}">\${escapeHtml(l.assigneeName || '—')}</div></td>\`,
          author: \`<td style="color:#64748B;font-size:11px;"><div class="ozon-ext-cell-singleline" title="\${escapeHtml(l.authorName || '—')}">\${escapeHtml(l.authorName || '—')}</div></td>\`,
          customer: \`<td style="color:#94A3B8;">—</td>\`,
          created: \`<td class="ozon-mono" style="color:#64748B;font-size:10.5px;"><div class="ozon-ext-cell-singleline">\${escapeHtml(l.createdAt || '—')}</div></td>\`,
          createdAt: \`<td class="ozon-mono" style="color:#64748B;font-size:10.5px;"><div class="ozon-ext-cell-singleline">\${escapeHtml(l.createdAt || '—')}</div></td>\`,
          sprint: \`<td style="color:#334155;font-weight:500;"><div class="ozon-ext-cell-singleline" title="\${escapeHtml(formatSprintWithStateText(l.sprint || 'Не в спринте'))}"><span style="overflow:hidden;text-overflow:ellipsis;">\${escapeHtml(l.sprint || 'Не в спринте')}</span>\${getSprintStateBadgeHtml(l.sprint)}</div></td>\`,
          projectTask: isPt
            ? \`<td><div class="ozon-ext-cell-singleline">\${getLinkTypeTagHtml(true)}</div></td>\`
            : \`<td style="color:#94A3B8;">—</td>\`,
          inProject: !isPt
            ? \`<td><div class="ozon-ext-cell-singleline">\${getLinkTypeTagHtml(false)}</div></td>\`
            : \`<td style="color:#94A3B8;">—</td>\`
        };

        return \`
          <tr class="ozon-ext-subrow">
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
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="ozon-ext-spinner"></span>
              <span>\${escapeHtml(statusMessage || 'Загрузка спринтов и задач FCRM из Jira (с дозапросами)...')}</span>
            </div>
          </td>
        </tr>
        \${buildSkeletonTableRowsHtml(8)}
      \`;
    }

    const groups = {};
    const hasActiveTaskFilters = Boolean(searchQuery.trim()) || filterComponent !== 'all' || filterEpic !== 'all' || filterStatus !== 'all' || hideEpicTasks;

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
      if (filterSprintState === 'open_future' && (spState === 'CLOSED' || spState === 'BACKLOG')) return false;
      if (filterSprintState === 'ACTIVE' && spState !== 'ACTIVE') return false;
      if (filterSprintState === 'FUTURE' && spState !== 'FUTURE') return false;
      if (filterSprintState === 'CLOSED' && spState !== 'CLOSED') return false;
      if (filterSprintState === 'BACKLOG' && spState !== 'BACKLOG') return false;
      if (hasActiveTaskFilters) return items.length > 0;
      return items.length > 0 || boardOwnedSprintNames.has(spName);
    });

    const allComponents = getAllComponentOptions();
    const allSprints = getEditableSprintOptions();
    const allAssignees = getAllAssigneeOptions();
    const epicMap = getAllEpicOptions();
    const epicKeys = Object.keys(epicMap);

    let rowsHtml = '';

    sortedSprints.forEach((sprintName) => {
      const groupItems = sortTasksList(groups[sprintName] || []);
      // По умолчанию спринты СВЁРНУТЫ (разворачиваются по клику или при активном поиске)
      const isExpanded = Boolean(expandedSprints[sprintName]) || Boolean(searchQuery.trim());
      const collapsed = !isExpanded;
      const isSprintLoading = Boolean(loadingSprintsMap[sprintName]);
      const isBacklog = sprintName.toLowerCase().includes('бэклог') || sprintName.toLowerCase().includes('backlog');
      const spState = getSprintStateCode(sprintName);
      const stateLabel =
        spState === 'ACTIVE'
          ? 'Активный'
          : spState === 'FUTURE'
          ? 'Будущий'
          : spState === 'CLOSED'
          ? 'Прошедший'
          : 'Бэклог';

      rowsHtml += \`
        <tr class="ozon-ext-sprint-row" data-sprint="\${escapeHtml(sprintName)}">
          <td colspan="\${columnOrder.length}">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                \${isSprintLoading ? '<span class="ozon-ext-spinner"></span>' : \`<span style="color:#005BFF;font-size:10px;">\${collapsed ? '▶' : '▼'}</span>\`}
                <span style="color:#071026;font-weight:700;font-size:12px;">\${escapeHtml(sprintName)}</span>
                <span class="ozon-ext-badge \${spState === 'ACTIVE' ? 'ozon-ext-badge-done' : isBacklog || spState === 'CLOSED' ? 'ozon-ext-badge-todo' : 'ozon-ext-badge-progress'}">\${escapeHtml(stateLabel)}</span>
                <span class="ozon-ext-badge ozon-ext-badge-progress ozon-mono">\${groupItems.length} задач</span>
              </div>
              <span class="ozon-ext-sprint-chevron" style="color:#64748B;font-size:11px;">
                \${isSprintLoading ? 'Обновление из Jira...' : collapsed ? 'Развернуть спринт' : 'Свернуть спринт'}
              </span>
            </div>
          </td>
        </tr>
      \`;

      if (!collapsed) {
        if (isSprintLoading) {
          rowsHtml += buildSkeletonTableRowsHtml(Math.max(3, Math.min(6, groupItems.length || 4)));
          return;
        }

        if (groupByComponentInsideSprint) {
          const compGroups = {};
          groupItems.forEach((t) => {
            const cName = t.component || 'Без компонента';
            if (!compGroups[cName]) compGroups[cName] = [];
            compGroups[cName].push(t);
          });

          const sortedCompNames = Object.keys(compGroups).sort((a, b) => {
            if (a === 'Без компонента' && b !== 'Без компонента') return 1;
            if (a !== 'Без компонента' && b === 'Без компонента') return -1;
            return a.localeCompare(b, 'ru');
          });

          sortedCompNames.forEach((compName) => {
            const compItems = sortTasksList(compGroups[compName]);
            const compKey = sprintName + '::' + compName;
            // По умолчанию компоненты внутри спринта тоже СВЁРНУТЫ (или развёрнуты при активном поиске)
            const isCompExpanded = Boolean(expandedComponents[compKey]) || Boolean(searchQuery.trim());
            const isCompCollapsed = !isCompExpanded;
            const isCompLoading = Boolean(loadingComponentsMap[compKey]);

            rowsHtml += \`
              <tr class="ozon-ext-comp-group-row" data-comp-group="\${escapeHtml(compKey)}">
                <td colspan="\${columnOrder.length}">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:7px;">
                      \${isCompLoading ? '<span class="ozon-ext-spinner" style="width:11px;height:11px;border-width:1.8px;"></span>' : \`<span style="color:#005BFF;font-size:9.5px;">\${isCompCollapsed ? '▶' : '▼'}</span>\`}
                      <span style="color:#64748B;font-size:11px;font-weight:500;">Компонент:</span>
                      <strong style="color:#071026;font-size:11px;font-weight:700;">\${escapeHtml(compName)}</strong>
                      <span class="ozon-ext-badge ozon-ext-badge-progress ozon-mono" style="font-size:10px;padding:0 5px;">\${compItems.length} задач</span>
                    </div>
                    <span style="color:#94A3B8;font-size:10.5px;">\${isCompLoading ? 'Обновление задач компонента из Jira...' : isCompCollapsed ? 'Показать (' + compItems.length + ')' : 'Свернуть'}</span>
                  </div>
                </td>
              </tr>
            \`;

            if (!isCompCollapsed) {
              compItems.forEach((task) => {
                rowsHtml += renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys);
              });
            }
          });
        } else {
          groupItems.forEach((task) => {
            rowsHtml += renderSingleTaskRowAndSubrows(task, allComponents, allSprints, allAssignees, epicMap, epicKeys);
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
    epic: { label: 'Эпик (FCRM) ▾', accent: false },
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
        <aside class="ozon-ext-sidebar" id="ozon-ext-sidebar-panel" style="width:\${sidebarWidth}px;">
          <div class="ozon-ext-sidebar-header">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="ozon-ext-spinner"></span>
              <strong class="ozon-mono" style="color:#005BFF;font-size:13px;">\${escapeHtml(task.key)}</strong>
              <span style="color:#64748B;font-size:11.5px;">Загрузка описания, приоритета и связей из Jira...</span>
            </div>
            <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-ext-sidebar-close">✕</button>
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

    const transitionsChipsHtml =
      taskTransitions.length > 0
        ? \`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">
             \${taskTransitions
               .map((tr) => {
                 const targetSt = (tr.to && tr.to.name) || tr.name;
                 const isCurrent = String(targetSt).toLowerCase() === String(task.status).toLowerCase();
                 if (isCurrent) return '';
                 return \`<button type="button" class="ozon-ext-btn" data-action="quick-transition" data-tr-id="\${escapeHtml(tr.id)}" data-target-status="\${escapeHtml(targetSt)}" style="padding:2px 7px;height:21px;font-size:10px;">→ \${escapeHtml(targetSt)}</button>\`;
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
    const filteredUmb = umbCatalog
      .filter((u) => !isCanceledStatus(u.status))
      .filter((u) => {
        if (!umbQ) return true;
        return u.key.toLowerCase().includes(umbQ) || u.summary.toLowerCase().includes(umbQ);
      });

    const isDescCollapsed = Boolean(collapsedSidebarSections['desc']);
    const isParamsCollapsed = Boolean(collapsedSidebarSections['params']);
    const isPtCollapsed = Boolean(collapsedSidebarSections['pt']);
    const isPtQuickCollapsed = collapsedSidebarSections['pt_quick'] !== false;
    const isIpCollapsed = Boolean(collapsedSidebarSections['ip']);

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
      <aside class="ozon-ext-sidebar" id="ozon-ext-sidebar-panel" style="width:\${sidebarWidth}px;">
        <div class="ozon-ext-sidebar-header">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap;">
            <a href="/browse/\${escapeHtml(task.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:13px;text-decoration:none;flex-shrink:0;">
              \${escapeHtml(task.key)} ↗
            </a>
            \${getIssueTypeBadgeHtml(currentIssueType, true)}
            <select id="ozon-sb-header-status" class="ozon-ext-status-select status-\${statusCat}" style="width:auto !important;max-width:170px !important;padding:0 16px 0 8px !important;height:22px !important;">
              \${statusOptions}
            </select>
            <span class="ozon-ext-badge \${prioBadgeClass}" title="Приоритет задачи" style="display:inline-flex;align-items:center;gap:4px;">
              \${getJiraPriorityIconSvg(task.priority)}
              <span>\${escapeHtml(task.priority || 'Medium')}</span>
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
            <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-sidebar-refresh" title="Перезагрузить задачу из Jira">
              ↻
            </button>
            <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-sidebar-expand" title="Расширить/сузить сайдбар">
              \${sidebarWidth < 620 ? '⇔ Шире' : '⇒⇐ Уже'}
            </button>
            <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-ext-sidebar-close" title="Закрыть сайдбар">
              ✕
            </button>
          </div>
        </div>

        <div class="ozon-ext-sidebar-body">
          <!-- Название задачи -->
          <div>
            <div style="font-size:10.5px;font-weight:700;color:#64748B;margin-bottom:4px;letter-spacing:0.02em;">НАЗВАНИЕ ЗАДАЧИ</div>
            <div style="display:flex;gap:6px;">
              <input type="text" id="ozon-sb-summary" value="\${escapeHtml(task.summary)}" style="flex:1;font-weight:600;font-size:12.5px;" />
              <button type="button" class="ozon-ext-btn" id="ozon-sb-save-summary">Сохранить</button>
            </div>
          </div>

          <!-- АККОРДЕОН 1: ОПИСАНИЕ ЗАДАЧИ (с поддержкой форматирования Jira Wiki / Markdown и режимом редактирования) -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isDescCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="desc">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isDescCollapsed ? '▶' : '▼'}</span>
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
                       <textarea id="ozon-sb-description" rows="\${descLinesCount}" placeholder="Введите текст описания (поддерживается разметка *Заголовок*, h2., списки, ссылки)..." style="width:100%;resize:vertical;min-height:90px;max-height:680px;overflow-y:auto;font-size:12px;line-height:1.45;">\${escapeHtml(task.description || '')}</textarea>
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
                  : \`<div style="padding:10px 12px;" id="ozon-sb-desc-preview" title="Двойной клик — перейти к редактированию описания">
                       \${formatJiraDescriptionHtml(task.description)}
                     </div>\`
                : ''
            }
          </div>

          <!-- АККОРДЕОН 2: ПАРАМЕТРЫ ЗАДАЧИ -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isParamsCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="params">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isParamsCollapsed ? '▶' : '▼'}</span>
                <span>Параметры задачи (редактируемые)</span>
                \${isParamsBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              <span style="color:#005BFF;font-weight:600;font-size:10.5px;">Ozon Bank \${escapeHtml(taskProjKey)}</span>
            </div>
            \${
              !isParamsCollapsed
                ? \`<div style="padding:10px 12px;" class="ozon-ext-field-grid">
                    <!-- Тип задачи (доступный в проекте FCRM) -->
                    <div class="ozon-ext-field-label">Тип задачи</div>
                    <div style="display:flex;align-items:center;gap:7px;">
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#F8FAFC;border:1px solid #E2E8F0;flex-shrink:0;">
                        \${getJiraIssueTypeIconSvg(currentIssueType)}
                      </span>
                      <select id="ozon-sb-issuetype" style="flex:1;">\${issueTypeOptions}</select>
                    </div>

                    <!-- Статус (только статусы из схемы воркфлоу задачи) -->
                    <div class="ozon-ext-field-label">Статус</div>
                    <div>
                      <select id="ozon-sb-status">\${statusOptions}</select>
                      \${transitionsChipsHtml}
                    </div>

                    <!-- Приоритет со стандартной SVG-иконкой Jira -->
                    <div class="ozon-ext-field-label">Приоритет</div>
                    <div style="display:flex;align-items:center;gap:7px;">
                      <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#F8FAFC;border:1px solid #E2E8F0;flex-shrink:0;">
                        \${getJiraPriorityIconSvg(task.priority)}
                      </span>
                      <select id="ozon-sb-priority" style="flex:1;">\${priorityOptions}</select>
                    </div>

                    <!-- Спринт + быстрые чипсы спринтов доски FCRM и кнопка «Удалить из спринта» -->
                    <div class="ozon-ext-field-label">Спринт</div>
                    <div>
                      <select id="ozon-sb-sprint">\${sprintOptions}</select>
                      \${sprintQuickChipsHtml}
                    </div>

                    <!-- Компонент (Input-Select с поиском по компонентам проекта задачи) -->
                    <div class="ozon-ext-field-label">Компонент</div>
                    <div class="ozon-ext-sb-combo">
                      <div class="ozon-ext-sb-combo-trigger" id="ozon-sb-comp-trigger" title="Нажмите для поиска компонента проекта \${escapeHtml(taskProjKey)}">
                        <span style="font-weight:600;color:#071026;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escapeHtml(task.component || 'Без компонента')}</span>
                        <span style="color:#64748B;font-size:10px;flex-shrink:0;">🔍 \${escapeHtml(taskProjKey)} ▾</span>
                      </div>
                      \${
                        sbCompComboOpen
                          ? \`<div class="ozon-ext-combo-popover" style="width:100%;padding:6px;display:flex;flex-direction:column;gap:5px;">
                               <input type="text" id="ozon-sb-comp-search" placeholder="Поиск компонента в проекте \${escapeHtml(taskProjKey)}..." value="\${escapeHtml(sbCompSearchQuery)}" autocomplete="off" />
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
                    <div class="ozon-ext-field-label">Эпик (FCRM)</div>
                    <div style="display:flex;flex-direction:column;gap:5px;">
                      <div class="ozon-ext-sb-combo">
                        <div class="ozon-ext-sb-combo-trigger" id="ozon-sb-epic-trigger" title="Нажмите для поиска эпика в проекте FCRM">
                          <div style="display:flex;align-items:center;gap:6px;overflow:hidden;min-width:0;">
                            \${
                              task.epicKey
                                ? \`<span class="ozon-mono" style="color:#005BFF;font-weight:700;flex-shrink:0;">\${escapeHtml(task.epicKey)}</span>
                                   <span style="color:#071026;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${escapeHtml(currentEpicCleanTitle || task.epicKey)}</span>\`
                                : '<span style="color:#94A3B8;">Без эпика (нажмите для поиска в FCRM)</span>'
                            }
                          </div>
                          <span style="color:#64748B;font-size:10px;flex-shrink:0;">🔍 FCRM ▾</span>
                        </div>
                        \${
                          sbEpicComboOpen
                            ? \`<div class="ozon-ext-combo-popover" style="width:100%;padding:6px;display:flex;flex-direction:column;gap:5px;">
                                 <input type="text" id="ozon-sb-epic-search" placeholder="Поиск эпика в проекте FCRM (код или название)..." value="\${escapeHtml(sbEpicSearchQuery)}" autocomplete="off" />
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
                                               <div class="ozon-ext-combo-item \${k === task.epicKey ? 'active' : ''}" style="\${sbComboItemStyle}" data-action="pick-sb-epic" data-epic-key="\${escapeHtml(k)}" data-epic-name="\${escapeHtml(epicMap[k] || '')}">
                                                 <span class="ozon-mono" style="color:#005BFF;font-weight:700;flex-shrink:0;">\${escapeHtml(k)}</span>
                                                 <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;">\${escapeHtml(epicMap[k] || '')}</span>
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
                      <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="ozon-sb-epic-key-input" class="ozon-mono" value="\${escapeHtml(task.epicKey)}" placeholder="Код (FCRM-...)" style="width:110px;" />
                        <input type="text" id="ozon-sb-epic-name" value="\${escapeHtml(currentEpicCleanTitle)}" placeholder="Название эпика..." style="flex:1;" />
                        <button type="button" class="ozon-ext-btn" id="ozon-sb-save-epic-btn" style="padding:2px 8px;height:26px;" title="Применить и сохранить эпик в Jira">ОК</button>
                      </div>
                    </div>

                    <!-- Исполнитель с живым поиском по пользователям Jira (оформлено аналогично Заказчик/Owner) -->
                    <div class="ozon-ext-field-label">Исполнитель</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                      <div style="display:flex;gap:5px;">
                        <input type="text" id="ozon-sb-user-search" value="\${escapeHtml(task.assignee.name)}" placeholder="🔍 Поиск Исполнителя по ФИО или логину..." style="flex:1;" />
                        <button type="button" class="ozon-ext-btn" id="ozon-sb-save-assignee" style="padding:3px 8px;">ОК</button>
                      </div>
                      <div id="ozon-sb-user-results">
                        \${renderUserSearchResultsHtml(searchedUsersResults)}
                      </div>
                    </div>

                    <!-- Заказчик/Owner с живым поиском по пользователям Jira -->
                    <div class="ozon-ext-field-label">Заказчик/Owner</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                      <div style="display:flex;gap:5px;">
                        <input type="text" id="ozon-sb-customer" value="\${escapeHtml(task.customer.name)}" placeholder="🔍 Поиск Заказчик/Owner по ФИО или логину..." style="flex:1;" />
                        <button type="button" class="ozon-ext-btn" id="ozon-sb-save-customer" style="padding:3px 8px;">ОК</button>
                      </div>
                      <div id="ozon-sb-customer-results">
                        \${renderCustomerSearchResultsHtml(searchedCustomerResults)}
                      </div>
                    </div>

                    <div class="ozon-ext-field-label">Автор</div>
                    <div style="color:#334155;font-weight:500;padding-top:4px;">\${escapeHtml(task.author.name)}</div>

                    <div class="ozon-ext-field-label">Дата создания</div>
                    <div class="ozon-mono" style="color:#334155;padding-top:4px;">\${escapeHtml(task.createdAt)}</div>
                  </div>\`
                : ''
            }
          </div>

          <!-- АККОРДЕОН 3: СВЯЗИ «ЗАДАЧА ПРОЕКТА» -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isPtCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="pt">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isPtCollapsed ? '▶' : '▼'}</span>
                <span>Связи: «Задача проекта» (\${visiblePtLinks.length})</span>
                \${visiblePtLinks.length === 0 ? getMissingProjectTaskWarnSvg() : ''}
                \${isLinksBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              <a href="/issues/?jql=labels%20%3D%20fcrm_umb_epic" target="_blank" class="ozon-mono" onclick="event.stopPropagation();" style="color:#005BFF;font-size:10.5px;text-decoration:none;">
                JQL: fcrm_umb_epic ↗
              </a>
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
                                <div class="ozon-ext-link-compact-row ozon-ext-pt-level2">
                                  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                                    <div style="display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0;">
                                      <span class="ozon-mono" style="color:#94A3B8;font-weight:700;font-size:11px;">↳</span>
                                      <span class="ozon-ext-link-icon-box" style="background:\${gMeta.bg};color:\${gMeta.color};">\${gMeta.iconSvg}</span>
                                      <span style="display:inline-flex;align-items:center;flex-shrink:0;">\${getJiraPriorityIconSvg(lnk.priority || 'Medium')}</span>
                                      \${getIssueTypeBadgeHtml(lnk.issueTypeName || 'Задача', true)}
                                      <a href="/browse/\${escapeHtml(lnk.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(lnk.key)}</a>
                                      <span style="font-weight:600;color:#071026;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${escapeHtml(lnk.summary)}">\${escapeHtml(lnk.summary)}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                      \${getStatusBadgeHtml(lnk.status)}
                                      <button type="button" class="ozon-ext-btn" data-action="move-pt-to-ip" data-pt-idx="\${ptIdx}" title="Перенести в блок «В проекте»" style="padding:1px 5px;height:19px;font-size:9.5px;">⇄ В проекте</button>
                                      <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" data-action="remove-pt-link" data-link-key="\${escapeHtml(lnk.key)}" data-jira-link-id="\${escapeHtml(lnk.jiraLinkId || lnk.id || '')}" style="padding:1px 5px;height:19px;font-size:9.5px;">✕</button>
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
                          <span style="color:#005BFF;font-size:9.5px;">\${isPtQuickCollapsed ? '▶' : '▼'}</span>
                          <span>Быстрый фильтр из <code class="ozon-mono">labels = fcrm_umb_epic</code> (\${filteredUmb.length})</span>
                        </div>
                        <span style="font-size:10px;color:#64748B;">\${isPtQuickCollapsed ? 'Развернуть' : 'Свернуть'}</span>
                      </div>
                      \${
                        !isPtQuickCollapsed
                          ? \`<div style="padding:7px 12px 7px 42px;border-top:1px solid #EEF2F6;border-left:3px solid #E2E8F0;background:#FFFFFF;">
                               <input type="text" id="ozon-sb-umb-search" value="\${escapeHtml(umbSearchQuery)}" placeholder="Поиск по ключу или названию в fcrm_umb_epic..." style="width:100%;margin-bottom:5px;background:#F8FAFC !important;height:24px !important;" />
                               <div style="max-height:135px;overflow-y:auto;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:7px;">
                                 \${filteredUmb
                                   .map((u) => {
                                     const alreadyLinked = visiblePtLinks.some((l) => l.key === u.key);
                                     return \`
                                       <div style="padding:4px 8px;border-bottom:1px solid #EEF2F6;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;">
                                         <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                           <strong class="ozon-mono" style="color:#005BFF;margin-right:5px;">\${escapeHtml(u.key)}</strong>
                                           <span style="color:#071026;">\${escapeHtml(u.summary)}</span>
                                         </div>
                                         <button type="button" class="ozon-ext-btn" data-action="toggle-umb-link" data-umb-key="\${escapeHtml(u.key)}" style="padding:1px 7px;height:20px;font-size:10px;flex-shrink:0;">
                                           \${alreadyLinked ? '✓ Привязана' : '+ Выбрать'}
                                         </button>
                                       </div>
                                     \`;
                                   })
                                   .join('')}
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
                <span style="color:#005BFF;font-size:10px;">\${isIpCollapsed ? '▶' : '▼'}</span>
                <span>Связи: «В проекте» (\${visibleIpLinks.length})</span>
                \${isLinksBlockLoading || isIpMetaBlockLoading ? miniBlockSpinnerHtml : ''}
              </div>
              <span style="font-size:10px;color:#64748B;">\${isLinksBlockLoading ? 'Обновление связей...' : isIpMetaBlockLoading ? 'Догрузка спринтов/компонентов...' : 'OB (Бэкенд) · OBFRONT (Фронтенд) · FTD (Дизайн)'}</span>
            </div>
            \${
              !isIpCollapsed
                ? \`<div>
                    \${
                      sortedIpGroups.length > 0
                        ? sortedIpGroups
                            .map((grp) => {
                              const grpCollapsed = Boolean(collapsedIpGroups[grp.meta.id]);
                              return \`
                                <div class="ozon-ext-link-group-header" data-action="toggle-ip-group" data-grp-id="\${escapeHtml(grp.meta.id)}">
                                  <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="color:#005BFF;font-size:9px;">\${grpCollapsed ? '▶' : '▼'}</span>
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
                                          const linkSprintOptionList = getSprintsForLinkedIssue(lnk);
                                          const isThisIpCompOpen = sbIpCompOpenIdx === lIdx;
                                          const ipCompQ = sbIpCompSearchQuery.trim().toLowerCase();
                                          const filteredIpComps = linkCompOptionList.filter((c) => !ipCompQ || c.toLowerCase().includes(ipCompQ));
                                          const lnkEpicClean =
                                            (lnk.epicKey && epicNameByKey[lnk.epicKey]) ||
                                            (!isBogusEpicTitle(lnk.epicName, lnk.epicKey) ? lnk.epicName : '');

                                          return \`
                                            <div class="ozon-ext-link-compact-row">
                                              <div style="display:flex;align-items:center;justify-content:space-between;gap:5px;">
                                                <div style="display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0;flex:1;">
                                                  <span class="ozon-mono" style="color:#94A3B8;font-weight:700;font-size:11px;flex-shrink:0;">↳</span>
                                                  <span class="ozon-ext-link-icon-box" style="background:\${grp.meta.bg};color:\${grp.meta.color};">\${grp.meta.iconSvg}</span>
                                                  <span style="display:inline-flex;align-items:center;flex-shrink:0;" title="Приоритет: \${escapeHtml(lnk.priority || 'Medium')}">\${getJiraPriorityIconSvg(lnk.priority || 'Medium')}</span>
                                                  \${getIssueTypeBadgeHtml(lnk.issueTypeName || 'Задача', true)}
                                                  <a href="/browse/\${escapeHtml(lnk.key)}" target="_blank" class="ozon-mono" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(lnk.key)}</a>
                                                  <span style="font-weight:600;color:#071026;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${escapeHtml(lnk.summary)}">\${escapeHtml(lnk.summary)}</span>
                                                  \${
                                                    lnk.epicKey
                                                      ? \`<span class="ozon-mono" style="font-size:9.5px;color:#005BFF;background:#E5F0FF;padding:0 4px;border-radius:4px;flex-shrink:0;" title="Эпик: \${escapeHtml(lnk.epicKey + (lnkEpicClean ? ' — ' + lnkEpicClean : ''))}">\${escapeHtml(lnk.epicKey)}</span>\`
                                                      : ''
                                                  }
                                                </div>
                                                <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                                  \${getStatusBadgeHtml(lnk.status)}
                                                  <button type="button" class="ozon-ext-btn" data-action="move-ip-to-pt" data-link-idx="\${lIdx}" title="Перенести в «Задача проекта»" style="padding:1px 5px;height:19px;font-size:9.5px;">⇄</button>
                                                  <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" data-action="remove-ip-link" data-link-idx="\${lIdx}" data-link-key="\${escapeHtml(lnk.key)}" data-jira-link-id="\${escapeHtml(lnk.jiraLinkId || lnk.id || '')}" style="padding:1px 5px;height:19px;font-size:9.5px;">✕</button>
                                                </div>
                                              </div>

                                              <!-- Уровень 4: Компактная строка Компонента и Спринта (с дополнительным отступом вправо под заголовком задачи) -->
                                              <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;align-items:center;padding-left:22px;">
                                                <div class="ozon-ext-sb-combo">
                                                  <div class="ozon-ext-sb-combo-trigger" data-action="open-ip-comp-combo" data-link-idx="\${lIdx}" data-proj="\${escapeHtml(lnkProjKey)}" style="min-height:22px;padding:1px 7px;font-size:10.5px;" title="Компонент проекта \${escapeHtml(lnkProjKey)}">
                                                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#071026;font-weight:600;">Комп. (\${escapeHtml(lnkProjKey)}): \${escapeHtml(realCompVal)}</span>
                                                    <span style="color:#64748B;font-size:9px;flex-shrink:0;">🔍▾</span>
                                                  </div>
                                                  \${
                                                    isThisIpCompOpen
                                                      ? \`<div class="ozon-ext-combo-popover" style="width:100%;min-width:210px;">
                                                           <input type="text" id="ozon-sb-ip-comp-search" placeholder="Поиск компонента в проекте \${escapeHtml(lnkProjKey)}..." value="\${escapeHtml(sbIpCompSearchQuery)}" autocomplete="off" />
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
                                                <select data-action="change-ip-sprint" data-link-idx="\${lIdx}" data-link-key="\${escapeHtml(lnk.key)}" style="height:22px !important;padding:1px 18px 1px 6px !important;font-size:10.5px !important;">
                                                  \${buildSprintSelectOptionsHtml(linkSprintOptionList, realSprintVal, 'Спринт: ')}
                                                </select>
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

                    <!-- Добавление новой связи «В проекте» -->
                    <div style="padding:7px 12px 7px 26px;background:#F8FAFC;border-top:1px solid #E2E8F0;border-left:3px solid #CBD5E1;display:flex;flex-direction:column;gap:5px;">
                      <div style="font-size:10.5px;font-weight:700;color:#334155;">Привязать задачу в блок «В проекте» (сохраняется в Jira):</div>
                      <div style="display:grid;grid-template-columns:125px 1fr auto;gap:5px;">
                        <input type="text" id="ozon-new-ip-key" class="ozon-mono" placeholder="Код (OB-..., FTD-...)" style="background:#FFFFFF !important;height:24px !important;" />
                        <input type="text" id="ozon-new-ip-summary" placeholder="Комментарий / название (необязательно)..." style="background:#FFFFFF !important;height:24px !important;" />
                        <button type="button" class="ozon-ext-btn" id="ozon-add-ip-btn" style="height:24px;padding:2px 8px;">+ Привязать</button>
                      </div>
                    </div>
                  </div>\`
                : ''
            }
          </div>
        </div>
      </aside>
    \`;
  }

  function getFilteredTasks() {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (isCanceledStatus(t.status)) return false;
      if (hideEpicTasks && isEpicIssueType(t.issueTypeName)) return false;
      if (filterComponent !== 'all' && t.component !== filterComponent) return false;
      if (filterEpic !== 'all' && t.epicKey !== filterEpic) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
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

  function renderStructure() {
    let root = document.getElementById('ozon-structure-root');
    if (!isTargetBoardPage() || !isStructureVisible) {
      if (root) root.style.display = 'none';
      return;
    }
    if (!root) {
      root = document.createElement('div');
      root.id = 'ozon-structure-root';
      document.body.appendChild(root);
    }
    root.style.display = 'flex';

    // Сохраняем позицию скролла ВСЕХ контейнеров до любых изменений DOM
    const savedScroll = captureAllScrollPositions();

    const filtered = getFilteredTasks();
    const rowsHtml = buildTableRowsHtml(filtered);
    const sidebarHtml = buildSidebarHtml();
    const totalTableW = getTotalTableWidth();

    const allComponents = getAllComponentOptions();
    const epicMap = getAllEpicOptions();
    const epicKeys = Object.keys(epicMap);
    const allStatuses = Array.from(new Set([...projectStatusesList, ...tasks.map((t) => t.status).filter(Boolean)])).filter((s) => !isCanceledStatus(s));

    const activeElId = document.activeElement ? document.activeElement.id : null;
    const selStart = document.activeElement && 'selectionStart' in document.activeElement ? document.activeElement.selectionStart : null;
    const selEnd = document.activeElement && 'selectionEnd' in document.activeElement ? document.activeElement.selectionEnd : null;

    const colOrderPanelHtml = isColOrderPanelOpen
      ? \`<div class="ozon-ext-combo-popover" style="right:0;left:auto;min-width:300px;padding:8px;" onclick="event.stopPropagation();">
           <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
             <strong style="font-size:11px;color:#071026;">Настройка порядка столбцов</strong>
             <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-reset-col-order" style="height:20px;padding:1px 6px;font-size:10px;">По умолчанию</button>
           </div>
           <div style="display:flex;flex-direction:column;gap:3px;max-height:280px;overflow-y:auto;">
             \${columnOrder
               .map((colId, idx) => {
                 const meta = COLUMN_META[colId] || { label: colId };
                 return \`
                   <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:3px 6px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;font-size:11px;">
                     <span style="color:#071026;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${idx + 1}. \${escapeHtml(meta.label)}</span>
                     <div style="display:flex;gap:3px;flex-shrink:0;">
                       <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="move-col-left" data-col-idx="\${idx}" \${idx === 0 ? 'disabled style="opacity:0.35;padding:1px 6px;height:20px;"' : 'style="padding:1px 6px;height:20px;"'} title="Сдвинуть левее">◀</button>
                       <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-action="move-col-right" data-col-idx="\${idx}" \${idx === columnOrder.length - 1 ? 'disabled style="opacity:0.35;padding:1px 6px;height:20px;"' : 'style="padding:1px 6px;height:20px;"'} title="Сдвинуть правее">▶</button>
                     </div>
                   </div>
                 \`;
               })
               .join('')}
           </div>
         </div>\`
      : '';

    const topBarsHtml = \`
      <div class="ozon-ext-header-bar">
        <div style="display:flex;align-items:center;gap:20px;">
          <strong style="font-size:13.5px;font-weight:700;color:#071026;font-family:var(--ozon-font-display);letter-spacing:-0.01em;">Ozon Bank · FCRM Structure</strong>
          <a href="#all-sprints" id="ozon-ext-show-all-sprints" style="color:#005BFF;font-size:12px;font-weight:600;text-decoration:none;">Все спринты (\${tasks.filter((t) => !isCanceledStatus(t.status)).length})</a>
          <span style="font-size:11px;color:#64748B;display:inline-flex;align-items:center;gap:4px;" title="Красная скрепка отмечает задачи без привязанной «Задачи проекта»">
            \${getMissingProjectTaskWarnSvg()} <span>— нет «Задачи проекта»</span>
          </span>
          <span style="font-size:11px;color:#64748B;display:inline-flex;align-items:center;gap:4px;" title="Красный человечек отмечает задачи без назначенного Исполнителя">
            \${getMissingAssigneeWarnSvg()} <span>— нет Исполнителя</span>
          </span>
          <span id="ozon-ext-toast" class="ozon-ext-badge ozon-ext-badge-done" style="display:\${saveToastText ? 'inline-flex' : 'none'};font-size:11px;padding:2px 8px;">\${escapeHtml(saveToastText)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:#64748B;">
          <span>\${escapeHtml(statusMessage)}</span>
          <button type="button" class="ozon-ext-btn" id="ozon-ext-reload-board">↻ Обновить доску</button>
        </div>
      </div>

      <div class="ozon-ext-filter-bar">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
          <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-toggle-all-sprints" title="Развернуть или свернуть все спринты и компоненты">
            <span style="color:#005BFF;">⇅</span> Развернуть / Свернуть все
          </button>

          <div style="position:relative;width:240px;">
            <input id="ozon-ext-search" type="text" value="\${escapeHtml(searchQuery)}" placeholder="Поиск по ключу, задаче, типу, Заказчик/Owner..." style="width:100%;height:26px;padding-left:10px;" />
          </div>

          <select id="ozon-ext-filter-comp" class="ozon-ext-filter-select">
            <option value="all" \${filterComponent === 'all' ? 'selected' : ''}>Компонент: Все</option>
            \${allComponents.map((c) => \`<option value="\${escapeHtml(c)}" \${filterComponent === c ? 'selected' : ''}>\${escapeHtml(c)}</option>\`).join('')}
          </select>

          <select id="ozon-ext-filter-epic" class="ozon-ext-filter-select">
            <option value="all" \${filterEpic === 'all' ? 'selected' : ''}>Эпик (FCRM): Все</option>
            \${epicKeys.map((k) => \`<option value="\${escapeHtml(k)}" \${filterEpic === k ? 'selected' : ''}>\${escapeHtml(k)} · \${escapeHtml(epicMap[k])}</option>\`).join('')}
          </select>

          <select id="ozon-ext-filter-status" class="ozon-ext-filter-select">
            <option value="all" \${filterStatus === 'all' ? 'selected' : ''}>Статус: Все</option>
            \${allStatuses.map((s) => \`<option value="\${escapeHtml(s)}" \${filterStatus === s ? 'selected' : ''}>\${escapeHtml(s)}</option>\`).join('')}
          </select>

          <select id="ozon-ext-filter-sprint-state" class="ozon-ext-filter-select" title="Фильтр по статусу спринтов (включая закрытые/прошедшие)">
            <option value="all" \${filterSprintState === 'all' ? 'selected' : ''}>Спринты: Все (вкл. Прошедшие)</option>
            <option value="open_future" \${filterSprintState === 'open_future' ? 'selected' : ''}>Спринты: Активные и Будущие</option>
            <option value="ACTIVE" \${filterSprintState === 'ACTIVE' ? 'selected' : ''}>Спринты: Только Активные</option>
            <option value="FUTURE" \${filterSprintState === 'FUTURE' ? 'selected' : ''}>Спринты: Только Будущие</option>
            <option value="CLOSED" \${filterSprintState === 'CLOSED' ? 'selected' : ''}>Спринты: Только Прошедшие (Закрытые)</option>
            <option value="BACKLOG" \${filterSprintState === 'BACKLOG' ? 'selected' : ''}>Спринты: Только Бэклог</option>
          </select>

          <button type="button" class="ozon-ext-btn \${hideEpicTasks ? '' : 'ozon-ext-btn-surface'}" id="ozon-ext-toggle-hide-epics" title="Скрыть или показать задачи с типом Эпик (Epic)">
            \${hideEpicTasks ? '✓ Скрыты задачи с типом Эпик' : 'Скрыть задачи с типом Эпик'}
          </button>

          <select id="ozon-ext-sort-by" class="ozon-ext-filter-select" title="Сортировка задач в списке по приоритету или дате создания">
            <option value="default" \${sortByField === 'default' ? 'selected' : ''}>Сортировка: По умолчанию</option>
            <option value="priority_desc" \${sortByField === 'priority_desc' ? 'selected' : ''}>Сортировка: Приоритет (сначала высокий)</option>
            <option value="priority_asc" \${sortByField === 'priority_asc' ? 'selected' : ''}>Сортировка: Приоритет (сначала низкий)</option>
            <option value="created_desc" \${sortByField === 'created_desc' ? 'selected' : ''}>Сортировка: Дата создания (сначала новые)</option>
            <option value="created_asc" \${sortByField === 'created_asc' ? 'selected' : ''}>Сортировка: Дата создания (сначала старые)</option>
          </select>

          \${
            searchQuery || filterComponent !== 'all' || filterEpic !== 'all' || filterStatus !== 'all' || filterSprintState !== 'all' || hideEpicTasks || sortByField !== 'default'
              ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-ext-reset-filters">Сбросить</button>'
              : ''
          }
        </div>

        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" class="ozon-ext-btn \${groupByComponentInsideSprint ? '' : 'ozon-ext-btn-surface'}" id="ozon-ext-toggle-comp-group">
            \${groupByComponentInsideSprint ? '✓ Группировка: Спринт → Компонент' : 'Группировка: Только Спринт'}
          </button>
          <div style="position:relative;">
            <button type="button" class="ozon-ext-btn \${isColOrderPanelOpen ? '' : 'ozon-ext-btn-surface'}" id="ozon-ext-toggle-col-order" title="Настроить последовательность столбцов таблицы">
              ⇄ Столбцы
            </button>
            \${colOrderPanelHtml}
          </div>
          <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" id="ozon-ext-reset-cols">Сбросить ширину</button>
        </div>
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
        const meta = COLUMN_META[colId] || { label: colId, accent: false };
        return \`<th data-col="\${escapeHtml(colId)}" draggable="true" title="Перетащите заголовок для изменения порядка столбцов" style="width:\${w}px;min-width:\${w}px;max-width:\${w}px;cursor:grab;\${meta.accent ? 'color:#005BFF !important;' : ''}">\${escapeHtml(meta.label)}<div class="ozon-ext-col-resizer" data-col="\${escapeHtml(colId)}"></div></th>\`;
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
        mainTable.style.setProperty('width', totalTableW + 'px', 'important');
        mainTable.style.setProperty('min-width', totalTableW + 'px', 'important');
        mainTable.style.setProperty('max-width', totalTableW + 'px', 'important');
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
        const tmp = document.createElement('div');
        tmp.innerHTML = sidebarHtml;
        const parsedAside = tmp.querySelector('#ozon-ext-sidebar-panel');
        if (parsedAside) {
          existingSbPanel.style.width = sidebarWidth + 'px';
          existingSbPanel.innerHTML = parsedAside.innerHTML;
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
            <table class="ozon-ext-table" id="ozon-ext-main-table" style="width:\${totalTableW}px !important;min-width:\${totalTableW}px !important;max-width:\${totalTableW}px !important;">
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

    bindStructureEvents(root);

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
  }

  function bindStructureEvents(root) {
    const searchEl = document.getElementById('ozon-ext-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const tbody = document.getElementById('ozon-ext-tbody');
        if (tbody) {
          const saved = captureAllScrollPositions();
          tbody.innerHTML = buildTableRowsHtml(getFilteredTasks());
          bindTableBodyEvents(tbody);
          restoreAllScrollPositions(saved);
        }
      });
    }

    const showAllSprintsLink = document.getElementById('ozon-ext-show-all-sprints');
    if (showAllSprintsLink) {
      showAllSprintsLink.addEventListener('click', (e) => {
        e.preventDefault();
        expandedSprints = {};
        expandedComponents = {};
        searchQuery = '';
        filterComponent = 'all';
        filterEpic = 'all';
        filterStatus = 'all';
        filterSprintState = 'all';
        hideEpicTasks = false;
        sortByField = 'default';
        renderStructure();
      });
    }

    const toggleAllSprintsBtn = document.getElementById('ozon-ext-toggle-all-sprints');
    if (toggleAllSprintsBtn) {
      toggleAllSprintsBtn.addEventListener('click', () => {
        const allSp = getAllSprintOptions();
        const anyExpanded = Object.keys(expandedSprints).some((k) => expandedSprints[k]);
        if (anyExpanded) {
          expandedSprints = {};
          expandedComponents = {};
        } else {
          allSp.forEach((sp) => {
            expandedSprints[sp] = true;
          });
          tasks.forEach((t) => {
            const sp = t.sprint || 'Бэклог FCRM';
            const cName = t.component || 'Без компонента';
            expandedComponents[sp + '::' + cName] = true;
          });
        }
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

    const toggleHideEpicsBtn = document.getElementById('ozon-ext-toggle-hide-epics');
    if (toggleHideEpicsBtn) {
      toggleHideEpicsBtn.addEventListener('click', () => {
        hideEpicTasks = !hideEpicTasks;
        renderStructure();
      });
    }

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
        filterSprintState = 'all';
        hideEpicTasks = false;
        sortByField = 'default';
        renderStructure();
      });
    }

    const toggleCompGroupBtn = document.getElementById('ozon-ext-toggle-comp-group');
    if (toggleCompGroupBtn) {
      toggleCompGroupBtn.addEventListener('click', () => {
        groupByComponentInsideSprint = !groupByComponentInsideSprint;
        renderStructure();
      });
    }

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

    root.querySelectorAll('button[data-action="move-col-left"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-col-idx'));
        if (idx > 0) {
          const next = [...columnOrder];
          const tmp = next[idx - 1];
          next[idx - 1] = next[idx];
          next[idx] = tmp;
          columnOrder = next;
          try {
            localStorage.setItem(STORAGE_KEY_COL_ORDER, JSON.stringify(columnOrder));
          } catch (err) {}
          renderStructure();
        }
      });
    });

    root.querySelectorAll('button[data-action="move-col-right"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-col-idx'));
        if (idx < columnOrder.length - 1) {
          const next = [...columnOrder];
          const tmp = next[idx + 1];
          next[idx + 1] = next[idx];
          next[idx] = tmp;
          columnOrder = next;
          try {
            localStorage.setItem(STORAGE_KEY_COL_ORDER, JSON.stringify(columnOrder));
          } catch (err) {}
          renderStructure();
        }
      });
    });

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
            tableEl.style.setProperty('width', totalW + 'px', 'important');
            tableEl.style.setProperty('min-width', totalW + 'px', 'important');
            tableEl.style.setProperty('max-width', totalW + 'px', 'important');
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

    bindSidebarEvents(root);
  }

  function bindTableBodyEvents(tbody) {
    tbody.querySelectorAll('.ozon-ext-sprint-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const sp = row.getAttribute('data-sprint');
        if (!sp) return;
        const wasExpanded = Boolean(expandedSprints[sp]);
        expandedSprints[sp] = !wasExpanded;
        if (!wasExpanded) {
          reloadSingleSprintFromJira(sp);
        } else {
          renderStructure();
        }
      });
    });

    tbody.querySelectorAll('.ozon-ext-comp-group-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.preventDefault();
        const cg = row.getAttribute('data-comp-group');
        if (!cg) return;
        const wasExpanded = Boolean(expandedComponents[cg]);
        expandedComponents[cg] = !wasExpanded;
        if (!wasExpanded) {
          const parts = cg.split('::');
          const spName = parts[0] || '';
          const cName = parts.slice(1).join('::') || '';
          reloadSingleComponentFromJira(spName, cName);
        } else {
          renderStructure();
        }
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
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        if (!key) return;
        activeTableCombo = null;
        if (selectedTaskKey === key && isSidebarOpen) {
          isSidebarOpen = false;
          renderStructure();
        } else {
          selectedTaskKey = key;
          isSidebarOpen = true;
          isEditingDescription = false;
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

    // Открытие Input-Select для Эпика (FCRM) прямо в ячейке таблицы
    tbody.querySelectorAll('[data-action="open-table-epic-combo"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('.ozon-ext-combo-popover')) return;
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
            activeTableCombo = null;
            tableUserSearchResults = [];
            tasks = tasks.map((t) =>
              t.key === key ? Object.assign({}, t, { assignee: Object.assign({}, t.assignee, { name: chosenDisplay }) }) : t
            );
            saveTaskOverride(key, { assignee: { name: chosenDisplay, login: chosenLogin || '', role: 'Ozon Банк' } });
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
        tasks = tasks.map((t) => (t.key === key ? Object.assign({}, t, { component: newComp }) : t));
        saveTaskOverride(key, { component: newComp });

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
        activeTableCombo = null;
        tableUserSearchResults = [];
        tasks = tasks.map((t) =>
          t.key === key ? Object.assign({}, t, { assignee: { name: uDisplay, login: uLogin, role: 'Ozon Банк' } }) : t
        );
        saveTaskOverride(key, { assignee: { name: uDisplay, login: uLogin, role: 'Ozon Банк' } });
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
        issueSprintOverrideMap[key] = newSp;
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
        assigneeSearchQuery = '';
        searchedUsersResults = [];
        updateCurrentTask({
          assignee: { name: uDisplay, login: uLogin || '', role: 'Ozon Банк' }
        });
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

  function bindSidebarEvents(root) {
    if (!isSidebarOpen || !selectedTaskKey) return;
    const task = tasks.find((t) => t.key === selectedTaskKey);
    if (!task) return;

    const sbResizer = document.getElementById('ozon-ext-sidebar-resizer');
    const sbPanel = document.getElementById('ozon-ext-sidebar-panel');
    if (sbResizer && sbPanel) {
      sbResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        sbResizer.classList.add('active');

        function onMove(moveEv) {
          const nextW = Math.max(340, Math.min(860, window.innerWidth - moveEv.clientX));
          sidebarWidth = nextW;
          sbPanel.style.width = nextW + 'px';
        }

        function onUp() {
          sbResizer.classList.remove('active');
          try {
            localStorage.setItem(STORAGE_KEY_SIDEBAR_W, String(sidebarWidth));
          } catch (err) {}
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }

    const closeBtn = document.getElementById('ozon-ext-sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        isSidebarOpen = false;
        renderStructure();
      });
    }

    const refreshBtn = document.getElementById('ozon-ext-sidebar-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        reloadSingleTaskFromJira(selectedTaskKey);
      });
    }

    const expandBtn = document.getElementById('ozon-ext-sidebar-expand');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        sidebarWidth = sidebarWidth < 620 ? 740 : 480;
        localStorage.setItem(STORAGE_KEY_SIDEBAR_W, String(sidebarWidth));
        renderStructure();
      });
    }

    // Сворачивание / разворачивание секций-аккордеонов в сайдбаре (с сохранением позиции скролла!)
    root.querySelectorAll('[data-action="toggle-sb-section"]').forEach((head) => {
      head.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        e.preventDefault();
        e.stopPropagation();
        const sec = head.getAttribute('data-sec');
        if (!sec) return;
        collapsedSidebarSections[sec] = !collapsedSidebarSections[sec];
        renderStructure();
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
      tasks = tasks.map((t) => (t.key === selectedTaskKey ? Object.assign({}, t, patch) : t));
      saveTaskOverride(selectedTaskKey, patch);
    }

    function saveSummaryNow() {
      const sumInput = document.getElementById('ozon-sb-summary');
      if (!sumInput) return;
      const val = sumInput.value.trim();
      if (!val) return;
      updateCurrentTask({ summary: val });
      fetch('/rest/api/2/issue/' + encodeURIComponent(selectedTaskKey), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { summary: val } })
      }).catch(() => {});
      showSaveToast('✓ Название ' + selectedTaskKey + ' сохранено');
      renderStructure();
    }

    const sumInput = document.getElementById('ozon-sb-summary');
    if (sumInput) {
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
        isEditingDescription = false;
        renderStructure();
      });
    }

    // Автоматическое увеличение высоты поля «Описание задачи» при вводе текста
    const descArea = document.getElementById('ozon-sb-description');
    if (descArea) {
      descArea.addEventListener('input', () => {
        descArea.style.height = 'auto';
        descArea.style.height = Math.max(90, descArea.scrollHeight) + 'px';
      });
    }

    function saveDescriptionNow() {
      const descEl = document.getElementById('ozon-sb-description');
      if (!descEl) return;
      const val = descEl.value;
      isEditingDescription = false;
      updateCurrentTask({ description: val });
      fetch('/rest/api/2/issue/' + encodeURIComponent(selectedTaskKey), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { description: val } })
      }).catch(() => {});
      showSaveToast('✓ Описание ' + selectedTaskKey + ' сохранено в Jira');
      renderStructure();
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
          issueTypeId: matchedTypeId
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
        issueSprintOverrideMap[selectedTaskKey] = newSp;
        updateCurrentTask({ sprint: newSp });
        updateIssueSprintInJira(selectedTaskKey, newSp);
        renderStructure();
      });
    }

    // Быстрые чипсы спринтов и кнопка «✕ Удалить из спринта»
    root.querySelectorAll('button[data-action="quick-sprint-chip"]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const targetSp = chip.getAttribute('data-sprint') || 'Бэклог FCRM';
        issueSprintOverrideMap[selectedTaskKey] = targetSp;
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
        renderStructure();
        await updateIssueEpicInJira(selectedTaskKey, epKey);
        renderStructure();
      });
    });

    async function applyManualEpicFromInputs() {
      const kInp = document.getElementById('ozon-sb-epic-key-input');
      const nInp = document.getElementById('ozon-sb-epic-name');
      const epKey = kInp ? kInp.value.trim().toUpperCase() : '';
      const epicMap = getAllEpicOptions();
      const customName = nInp ? nInp.value.trim() : '';
      const epName = epKey ? customName || epicMap[epKey] || epicNameByKey[epKey] || epKey : 'Без эпика';
      if (epKey && epName && epName !== 'Без эпика') {
        epicNameByKey[epKey] = epName;
      }
      updateCurrentTask({ epicKey: epKey, epicName: epName });
      renderStructure();
      await updateIssueEpicInJira(selectedTaskKey, epKey);
      renderStructure();
    }

    const saveEpicBtn = document.getElementById('ozon-sb-save-epic-btn');
    if (saveEpicBtn) {
      saveEpicBtn.addEventListener('click', applyManualEpicFromInputs);
    }

    const epicKeyInput = document.getElementById('ozon-sb-epic-key-input');
    if (epicKeyInput) {
      epicKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyManualEpicFromInputs();
        }
      });
      epicKeyInput.addEventListener('change', applyManualEpicFromInputs);
    }

    const epicNameInput = document.getElementById('ozon-sb-epic-name');
    if (epicNameInput) {
      epicNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyManualEpicFromInputs();
        }
      });
    }

    function saveAssigneeNow() {
      const userSearchInput = document.getElementById('ozon-sb-user-search');
      if (!userSearchInput) return;
      const val = userSearchInput.value.trim() || 'Не назначен';
      const firstMatch = searchedUsersResults[0];
      const chosenDisplay = val === 'Не назначен' ? 'Не назначен' : firstMatch ? firstMatch.displayName : val;
      const chosenLogin = val === 'Не назначен' ? null : firstMatch ? firstMatch.name : null;
      assigneeSearchQuery = '';
      searchedUsersResults = [];
      updateCurrentTask({ assignee: { name: chosenDisplay, login: chosenLogin || '', role: 'Ozon Банк' } });
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
    }

    const saveAssigneeBtn = document.getElementById('ozon-sb-save-assignee');
    if (saveAssigneeBtn) {
      saveAssigneeBtn.addEventListener('click', saveAssigneeNow);
    }

    function saveCustomerNow() {
      const customerInput = document.getElementById('ozon-sb-customer');
      if (!customerInput) return;
      const val = customerInput.value.trim() || 'Не указан';
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
    }

    const saveCustBtn = document.getElementById('ozon-sb-save-customer');
    if (saveCustBtn) {
      saveCustBtn.addEventListener('click', saveCustomerNow);
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
        const updatedLnk = nextIp[idx];
        if (updatedLnk) {
          await loadSprintsForLinkedIssue(updatedLnk);
          renderStructure();
        }
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

  function injectToggleButton() {
    if (!isTargetBoardPage()) return;
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
    if (!isTargetBoardPage()) return;
    ensureGoogleFontsLoaded();
    injectToggleButton();
    renderStructure();
    loadBoardIssuesFromJira();

    // Закрытие открытых поповеров по клику вне них
    document.addEventListener('click', (e) => {
      if (
        !e.target.closest('.ozon-ext-combo-popover') &&
        !e.target.closest('.ozon-ext-cell-combo-trigger') &&
        !e.target.closest('.ozon-ext-status-trigger') &&
        !e.target.closest('.ozon-ext-sb-combo-trigger') &&
        !e.target.closest('#ozon-ext-toggle-col-order')
      ) {
        if (activeTableCombo || sbEpicComboOpen || sbCompComboOpen || sbIpCompOpenIdx !== null || isColOrderPanelOpen) {
          activeTableCombo = null;
          tableUserSearchResults = [];
          sbEpicComboOpen = false;
          sbCompComboOpen = false;
          sbIpCompOpenIdx = null;
          isColOrderPanelOpen = false;
          renderStructure();
        }
      }
    });

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
  <title>Ozon Bank · FCRM Structure</title>
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
  </style>
</head>
<body>
  <div class="title">Ozon Bank · FCRM Structure (#${config.rapidViewId})</div>
  <div class="desc">
    Расширение v3.1 активно только на представлении доски <strong>${config.projectKey}</strong> (<code>RapidBoard.jspa?rapidView=${config.rapidViewId}</code>).
  </div>
  <a class="btn" href="${config.boardUrl}" target="_blank" rel="noopener noreferrer">
    Открыть доску FCRM на jit.o3.ru
  </a>
  <script src="popup.js"></script>
</body>
</html>`;
}

export function generatePopupJs(_config: ExtensionConfig): string {
  return `// Ozon Bank FCRM Structure Popup Controller v3.1`;
}

