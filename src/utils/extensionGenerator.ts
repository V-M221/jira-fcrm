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
   Ozon Bank Design System — Jira Structure Extension for jit.o3.ru (v3.1)
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
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
  border: 1px solid #E2E8F0 !important;
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
#ozon-structure-root textarea:focus {
  background-color: #FFFFFF !important;
  border-color: #005BFF !important;
  outline: 2px solid #E11D68 !important;
  outline-offset: 1px !important;
}

.ozon-ext-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #FFFFFF;
  position: relative;
}

.ozon-ext-table-pane {
  flex: 1;
  overflow: auto;
  height: 100%;
  background: #FFFFFF;
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
  padding: 4px 12px !important;
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
  padding: 2px 12px 2px 22px !important;
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

/* Ячейка Эпика и Компонента с кликабельным Input-Select Popover в таблице */
.ozon-ext-cell-combo-trigger {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  width: 100% !important;
  height: 22px !important;
  padding: 0 4px !important;
  border-radius: 5px !important;
  border: 1px solid transparent !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  text-overflow: ellipsis !important;
  cursor: pointer !important;
}

.ozon-ext-cell-combo-trigger:hover {
  background-color: rgba(0, 91, 255, 0.08) !important;
  border-color: rgba(0, 91, 255, 0.25) !important;
}

/* Всплывающий Input-Select Popover для ячеек таблицы и полей сайдбара */
.ozon-ext-combo-popover {
  position: fixed !important;
  z-index: 99999 !important;
  width: 310px !important;
  background: #FFFFFF !important;
  border: 1px solid #CBD5E1 !important;
  border-radius: 10px !important;
  box-shadow: 0 10px 28px rgba(7, 16, 38, 0.16) !important;
  padding: 6px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 5px !important;
}

.ozon-ext-combo-list {
  max-height: 210px !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
}

.ozon-ext-combo-item {
  padding: 5px 8px !important;
  border-radius: 6px !important;
  font-size: 11.5px !important;
  color: #071026 !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
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
  background: #FFFFFF;
  border-left: 1px solid #E2E8F0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
  box-shadow: -4px 0 16px rgba(7, 16, 38, 0.05);
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
  grid-template-columns: 108px 1fr;
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
  overflow: hidden;
}

.ozon-ext-section-head {
  padding: 8px 12px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
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
}

/* Компактная строка связанной задачи с иконкой и группировкой OB / OBFRONT / FTD */
.ozon-ext-link-group-header {
  padding: 4px 10px;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
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
  padding: 5px 10px;
  border-bottom: 1px solid #EEF2F6;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  max-height: 165px;
  overflow-y: auto;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 8px;
  margin-top: 4px;
  box-shadow: 0 4px 12px rgba(7, 16, 38, 0.08);
}

.ozon-ext-user-option {
  padding: 5px 10px;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  cursor: pointer;
  transition: background-color 100ms ease;
}

.ozon-ext-user-option:last-child {
  border-bottom: none;
}

.ozon-ext-user-option:hover {
  background: #E5F0FF;
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
    if (document.getElementById('ozon-ext-google-fonts')) return;
    const link = document.createElement('link');
    link.id = 'ozon-ext-google-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@600;700&display=swap';
    document.head.appendChild(link);
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
  let loadingSidebarTaskKey = null;
  let loadingSprintsMap = {};
  let sidebarWidth = Number(localStorage.getItem(STORAGE_KEY_SIDEBAR_W)) || 540;

  // ПО УМОЛЧАНИЮ ВСЕ СПРИНТЫ И ВСЕ КОМПОНЕНТЫ СВЕРНУТЫ!
  // Храним явно развернутые пользователем спринты и компоненты:
  let expandedSprints = {}; // { [sprintName]: true }
  let expandedComponents = {}; // { [sprintName + '::' + compName]: true }
  let expandedSubRows = {};

  // Сворачиваемые аккордеоны в сайдбаре и группы связей OB / OBFRONT / FTD
  let collapsedSidebarSections = {
    description: false,
    params: false,
    projectTasks: false,
    inProject: false
  };
  let collapsedIpGroups = {}; // { [groupKey]: true }

  // Состояние открытых Input-Select комбобоксов (Эпики и Компоненты)
  let activeTableCombo = null; // { type: 'epic' | 'component', taskKey, projKey, query, top, left, width }
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

  // Фильтры верхней панели
  let searchQuery = '';
  let filterComponent = 'all';
  let filterEpic = 'all';
  let filterStatus = 'all';

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
  let projectStatusesList = [];
  let statusesByIssueTypeMap = {}; // { [issueTypeName]: string[] } — статусы строго из схемы типа задачи
  let projectPrioritiesList = [];
  let priorityIconUrlMap = {}; // { [priorityName]: iconUrl }
  let assignableUsersList = [];
  let issueTransitionsByKey = {};

  const DEFAULT_COLUMNS_META = [
    { key: 'task', label: 'Задача (Спринт → Компонент → Задача)', width: 370 },
    { key: 'status', label: 'Статус ▾', width: 130 },
    { key: 'epic', label: 'Эпик (FCRM) ✎', width: 240 },
    { key: 'component', label: 'Компонент ▾', width: 180 },
    { key: 'assignee', label: 'Исполнитель ✎', width: 165 },
    { key: 'author', label: 'Автор', width: 140 },
    { key: 'customer', label: 'Заказчик ✎', width: 160 },
    { key: 'created', label: 'Создана', width: 115 },
    { key: 'sprint', label: 'Спринт ▾', width: 175 },
    { key: 'projectTask', label: 'Задача проекта (fcrm_umb_epic)', width: 230 },
    { key: 'inProject', label: 'В проекте (Статус · Комп. · Спринт)', width: 275 }
  ];

  let defaultColWidths = {};
  DEFAULT_COLUMNS_META.forEach((c) => {
    defaultColWidths[c.key] = c.width;
  });

  let columnOrder = DEFAULT_COLUMNS_META.map((c) => c.key);
  try {
    const savedOrder = JSON.parse(localStorage.getItem(STORAGE_KEY_COL_ORDER) || 'null');
    if (Array.isArray(savedOrder) && savedOrder.length > 0) {
      const validKeys = savedOrder.filter((k) => defaultColWidths[k]);
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
   * Иконка восклицательного знака для задач, у которых НЕТ привязанной «Задачи проекта»
   */
  function getMissingProjectTaskWarnSvg() {
    return '<span class="ozon-ext-inner-ctrl" title="Внимание: у задачи нет связи «Задача проекта» (fcrm_umb_epic)" style="display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:4px;background:#FEE2E2;color:#DC2626;flex-shrink:0;cursor:help;"><svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 3.5V9" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round"/><circle cx="8" cy="12.2" r="1.2" fill="#DC2626"/></svg></span>';
  }

  /**
   * Иконки и метаданные групп связанных задач (OB — Бэкенд, OBFRONT — Фронтенд, FTD — Дизайн, FCRM — Задача проекта / CRM)
   */
  function getLinkedProjectGroupMeta(issueKey, isProjectTaskBlock) {
    const prefix = String(issueKey || '').split('-')[0].toUpperCase();
    if (isProjectTaskBlock) {
      return {
        groupKey: 'UMB',
        title: 'Задачи проекта (fcrm_umb_epic)',
        shortTag: 'Проект',
        bg: '#E5F0FF',
        color: '#005BFF',
        svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><circle cx="12" cy="13" r="2"/></svg>'
      };
    }
    if (prefix === 'OB') {
      return {
        groupKey: 'OB',
        title: 'OB · Бэкенд',
        shortTag: 'Бэкенд',
        bg: '#EDE9FE',
        color: '#6D28D9',
        svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>'
      };
    }
    if (prefix === 'OBFRONT') {
      return {
        groupKey: 'OBFRONT',
        title: 'OBFRONT · Фронтенд',
        shortTag: 'Фронтенд',
        bg: '#E0F2FE',
        color: '#0284C7',
        svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>'
      };
    }
    if (prefix === 'FTD') {
      return {
        groupKey: 'FTD',
        title: 'FTD · Дизайн',
        shortTag: 'Дизайн',
        bg: '#FCE7F3',
        color: '#DB2777',
        svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>'
      };
    }
    return {
      groupKey: prefix || 'OTHER',
      title: (prefix || 'CRM') + ' · Смежные задачи',
      shortTag: prefix || 'CRM',
      bg: '#E5F0FF',
      color: '#005BFF',
      svg: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
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

  function isActiveOrFutureFcrmSprint(sprintId, sprintName, originBoardId, stateStr, rawStr) {
    if (!sprintName || sprintName === '9223372036854775807' || /^\\d+$/.test(String(sprintName).trim())) {
      return false;
    }
    const nameClean = String(sprintName).trim();
    if (nameClean === 'Бэклог FCRM') return true;

    if (sprintId && closedSprintIds.has(String(sprintId))) return false;
    if (closedSprintNames.has(nameClean)) return false;
    if (stateStr && String(stateStr).toUpperCase() === 'CLOSED') {
      if (sprintId) closedSprintIds.add(String(sprintId));
      closedSprintNames.add(nameClean);
      return false;
    }
    if (rawStr && typeof rawStr === 'string' && /state=CLOSED/i.test(rawStr)) {
      if (sprintId) closedSprintIds.add(String(sprintId));
      closedSprintNames.add(nameClean);
      return false;
    }
    if (originBoardId != null && String(originBoardId) !== String(CONFIG.rapidViewId)) {
      return false;
    }

    return true;
  }

  function extractCleanSprintName(rawVal, issueId, issueKey) {
    if (issueKey && issueSprintOverrideMap[issueKey]) {
      const ov = issueSprintOverrideMap[issueKey];
      if (!closedSprintNames.has(ov)) return ov;
    }
    if (issueId && issueSprintOverrideMap[String(issueId)]) {
      const ov = issueSprintOverrideMap[String(issueId)];
      if (!closedSprintNames.has(ov)) return ov;
    }

    if (!rawVal) return null;

    if (Array.isArray(rawVal)) {
      for (let i = rawVal.length - 1; i >= 0; i--) {
        const parsed = extractCleanSprintName(rawVal[i], null, null);
        if (parsed) return parsed;
      }
      return null;
    }

    if (typeof rawVal === 'object') {
      const sId = rawVal.id ? String(rawVal.id) : null;
      const sName = rawVal.name ? String(rawVal.name).trim() : null;
      const originId = rawVal.originBoardId || rawVal.rapidViewId || null;
      const st = rawVal.state ? String(rawVal.state).toUpperCase() : null;

      if (st === 'CLOSED') {
        if (sId) closedSprintIds.add(sId);
        if (sName) closedSprintNames.add(sName);
        return null;
      }

      if (sName && isActiveOrFutureFcrmSprint(sId, sName, originId, st, null)) {
        if (sId) {
          sprintNameById[sId] = sName;
          sprintIdByName[sName] = sId;
        }
        return sName;
      }
      if (sId && sprintNameById[sId] && !closedSprintIds.has(sId)) {
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

    if (st === 'CLOSED') {
      if (sId) closedSprintIds.add(sId);
      if (nameMatch && nameMatch[1]) closedSprintNames.add(nameMatch[1].trim());
      return null;
    }

    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      if (isActiveOrFutureFcrmSprint(sId, candidate, originId, st, str)) {
        if (sId) {
          sprintNameById[sId] = candidate;
          sprintIdByName[candidate] = sId;
        }
        return candidate;
      }
      return null;
    }

    if (sId && sprintNameById[sId] && !closedSprintIds.has(sId)) {
      return sprintNameById[sId];
    }

    if (/^\\d+$/.test(str)) {
      return sprintNameById[str] && !closedSprintIds.has(str) ? sprintNameById[str] : null;
    }

    return isActiveOrFutureFcrmSprint(null, str, originId, st, str) ? str : null;
  }

  function resolveIssueSprint(iss) {
    if (!iss) return 'Бэклог FCRM';
    const f = iss.fields || {};

    if (Array.isArray(f.closedSprints)) {
      f.closedSprints.forEach((cs) => {
        if (cs && cs.id) closedSprintIds.add(String(cs.id));
        if (cs && cs.name) closedSprintNames.add(String(cs.name).trim());
      });
    }

    if (iss.key && issueSprintOverrideMap[iss.key] && !closedSprintNames.has(issueSprintOverrideMap[iss.key])) {
      return issueSprintOverrideMap[iss.key];
    }
    if (iss.id && issueSprintOverrideMap[String(iss.id)] && !closedSprintNames.has(issueSprintOverrideMap[String(iss.id)])) {
      return issueSprintOverrideMap[String(iss.id)];
    }

    const fromAgileSprint = extractCleanSprintName(f.sprint, iss.id, iss.key);
    if (fromAgileSprint) return fromAgileSprint;

    if (discoveredFields.sprint && f[discoveredFields.sprint]) {
      const fromCustom = extractCleanSprintName(f[discoveredFields.sprint], iss.id, iss.key);
      if (fromCustom) return fromCustom;
    }

    for (const k of Object.keys(f)) {
      const val = f[k];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].includes('greenhopper.service.sprint.Sprint')) {
        const parsed = extractCleanSprintName(val, iss.id, iss.key);
        if (parsed) return parsed;
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
        return String(rawVal.name).trim();
      }
      if (rawVal.id && sprintNameById[String(rawVal.id)]) {
        return sprintNameById[String(rawVal.id)];
      }
      return null;
    }
    const str = String(rawVal).trim();
    if (!str || str === '9223372036854775807' || str === 'null' || str === 'undefined') return null;
    const nameMatch = str.match(/name=([^,\\]]+)/);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim();
    }
    const idMatch = str.match(/id=(\\d+)/);
    if (idMatch && idMatch[1] && sprintNameById[idMatch[1]]) {
      return sprintNameById[idMatch[1]];
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
      if (fromClosed) return fromClosed;
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

  // Живой поиск пользователей в Jira по ФИО или логину
  async function searchJiraUsers(query, issueKey) {
    const q = String(query || '').trim();
    const qLow = q.toLowerCase();

    const localMatches = assignableUsersList.filter(
      (u) =>
        !qLow ||
        (u.displayName && u.displayName.toLowerCase().includes(qLow)) ||
        (u.name && u.name.toLowerCase().includes(qLow))
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
      if (discoveredFields.customer) {
        const payload = { fields: {} };
        payload.fields[discoveredFields.customer] =
          customerValue === 'Не указан'
            ? null
            : explicitLogin
            ? { name: explicitLogin }
            : customerValue;
        const r = await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!r.ok && explicitLogin) {
          payload.fields[discoveredFields.customer] = customerValue;
          await fetch('/rest/api/2/issue/' + encodeURIComponent(issueKey), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});
        }
      }
      showSaveToast('✓ Заказчик ' + issueKey + ' → ' + customerValue);
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
   * Живой поиск эпиков СТРОГО внутри проекта FCRM (project = FCRM AND issuetype in (Epic, Эпик))
   */
  async function searchFcrmEpicsInJira(query) {
    try {
      const qClean = String(query || '').trim().replace(/"/g, '');
      let jql = 'project = ' + CONFIG.projectKey + ' AND issuetype in (Epic, "Эпик")';
      if (qClean) {
        if (/^[A-Za-z]+-\\d+$/i.test(qClean)) {
          jql = 'project = ' + CONFIG.projectKey + ' AND (key = "' + qClean.toUpperCase() + '" OR summary ~ "' + qClean + '")';
        } else {
          jql += ' AND summary ~ "' + qClean + '"';
        }
      }
      const epFields = ['summary'];
      if (discoveredFields.epicName) epFields.push(discoveredFields.epicName);
      const res = await fetch(
        '/rest/api/2/search?jql=' + encodeURIComponent(jql + ' ORDER BY updated DESC') + '&fields=' + epFields.join(',') + '&maxResults=100',
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
      }
    } catch (e) {}
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
          fields.forEach((fld) => {
            const customType = (fld.schema && fld.schema.custom) || '';
            const nameLow = String(fld.name || '').toLowerCase().trim();

            if (customType.includes('gh-sprint') || nameLow === 'sprint' || nameLow === 'спринт') {
              discoveredFields.sprint = fld.id;
            }
            if (customType.includes('gh-epic-link') || nameLow === 'epic link' || nameLow === 'ссылка на эпик') {
              discoveredFields.epicLink = fld.id;
            }
            if (customType.includes('gh-epic-label') || nameLow === 'epic name' || nameLow === 'название эпика' || nameLow === 'имя эпика') {
              discoveredFields.epicName = fld.id;
            }
            if (nameLow === 'заказчик' || nameLow === 'бизнес-заказчик' || nameLow === 'customer' || nameLow.includes('заказчик')) {
              if (!discoveredFields.customer || nameLow === 'заказчик') {
                discoveredFields.customer = fld.id;
              }
            }
          });
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

    // Статусы проекта FCRM строго в разрезе каждого типа задачи (Workflow Scheme!)
    try {
      const stRes = await fetch('/rest/api/2/project/' + encodeURIComponent(CONFIG.projectKey) + '/statuses', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (stRes.ok) {
        const stData = await stRes.json();
        const stSet = new Set();
        if (Array.isArray(stData)) {
          stData.forEach((issueTypeObj) => {
            const typeName = issueTypeObj && issueTypeObj.name ? String(issueTypeObj.name).trim() : '';
            const typeId = issueTypeObj && issueTypeObj.id ? String(issueTypeObj.id) : '';
            const typeStatuses = [];
            if (Array.isArray(issueTypeObj.statuses)) {
              issueTypeObj.statuses.forEach((s) => {
                if (s && s.name) {
                  stSet.add(s.name);
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
        if (stSet.size > 0) {
          projectStatusesList = Array.from(stSet);
        }
      }
    } catch (e) {}

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

    // Исполнители проекта FCRM
    try {
      const usrRes = await fetch('/rest/api/2/user/assignable/search?project=' + encodeURIComponent(CONFIG.projectKey) + '&maxResults=100', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (usrRes.ok) {
        const usrs = await usrRes.json();
        if (Array.isArray(usrs)) {
          assignableUsersList = usrs
            .filter((u) => u && (u.name || u.key) && u.displayName)
            .map((u) => ({ name: u.name || u.key, displayName: u.displayName, email: u.emailAddress || '' }));
        }
      }
    } catch (e) {}
  }

  /**
   * Шаг 2. Подгрузка ТОЛЬКО родных Активных и Будущих спринтов доски FCRM (#9349) и эпиков СТРОГО проекта FCRM.
   */
  async function loadBoardSprintsAndEpics() {
    try {
      const spRes = await fetch('/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint?state=active,future&maxResults=100', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (spRes.ok) {
        const spData = await spRes.json();
        if (Array.isArray(spData.values)) {
          spData.values.forEach((sp, idx) => {
            if (!sp || !sp.id || !sp.name) return;
            const stateLow = String(sp.state || '').toLowerCase();
            if (stateLow === 'closed') {
              closedSprintIds.add(String(sp.id));
              closedSprintNames.add(String(sp.name).trim());
              return;
            }
            const isOwnedByBoard =
              (sp.originBoardId && String(sp.originBoardId) === String(CONFIG.rapidViewId)) ||
              isNativeFcrmBoardSprintName(sp.name, sp.originBoardId);

            if (!isOwnedByBoard) {
              return;
            }

            const spIdStr = String(sp.id);
            boardOwnedSprintIds.add(spIdStr);
            boardOwnedSprintNames.add(sp.name.trim());
            sprintNameById[spIdStr] = sp.name;
            sprintIdByName[sp.name] = spIdStr;
            sprintStateByName[sp.name] = stateLow.toUpperCase();
            if (stateLow === 'active') sprintOrderWeight[sp.name] = 1 + idx;
            else sprintOrderWeight[sp.name] = 50 + idx;
          });
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
            if (st === 'CLOSED') {
              closedSprintIds.add(String(sp.id));
              closedSprintNames.add(String(sp.name).trim());
              return;
            }

            const spIdStr = String(sp.id);
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
            boardOwnedSprintNames.add(sp.name.trim());
            sprintNameById[spIdStr] = sp.name;
            sprintIdByName[sp.name] = spIdStr;
            sprintStateByName[sp.name] = st;
            if (!sprintOrderWeight[sp.name]) {
              sprintOrderWeight[sp.name] = st === 'ACTIVE' ? 10 + idx : 60 + idx;
            }
            spIssuesIds.forEach((issId) => {
              issueSprintOverrideMap[issId] = sp.name;
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
      const res = await fetch('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=key,summary,status,components&maxResults=200', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.issues) && data.issues.length > 0) {
        const loaded = data.issues.map((iss, idx) => ({
          id: 'umb-' + idx + '-' + iss.key,
          key: iss.key,
          summary: (iss.fields && iss.fields.summary) || iss.key,
          status: (iss.fields && iss.fields.status && iss.fields.status.name) || 'Открыто',
          component: resolveRealLinkedIssueComponent(iss)
        }));
        if (!customQuery) {
          umbCatalog = loaded;
        } else {
          const map = new Map();
          loaded.forEach((item) => map.set(item.key, item));
          umbCatalog.forEach((item) => {
            if (!map.has(item.key)) map.set(item.key, item);
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
    return encodeURIComponent(Array.from(new Set(fieldList)).join(','));
  }

  async function normalizeAndEnrichJiraIssues(rawIssues) {
    const allEpicKeysToResolve = new Set();
    const linkedIssueKeys = new Set();
    const umbKeysSet = new Set(umbCatalog.map((u) => u.key));

    rawIssues.forEach((iss) => {
      const f = iss.fields || {};
      if (f.assignee && (f.assignee.name || f.assignee.key) && f.assignee.displayName) {
        const uLogin = f.assignee.name || f.assignee.key;
        if (!assignableUsersList.some((u) => u.name === uLogin)) {
          assignableUsersList.push({ name: uLogin, displayName: f.assignee.displayName, email: f.assignee.emailAddress || '' });
        }
      }
      if (f.reporter && (f.reporter.name || f.reporter.key) && f.reporter.displayName) {
        const rLogin = f.reporter.name || f.reporter.key;
        if (!assignableUsersList.some((u) => u.name === rLogin)) {
          assignableUsersList.push({ name: rLogin, displayName: f.reporter.displayName, email: f.reporter.emailAddress || '' });
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
          priority: (lf.priority && lf.priority.name) || 'Medium',
          component: realComp,
          sprint: realSprint,
          epicKey: lEpicKey,
          epicName: (lEpicKey && epicNameByKey[lEpicKey]) || '',
          assigneeName: (lf.assignee && lf.assignee.displayName) || '—',
          authorName: (lf.reporter && lf.reporter.displayName) || (lf.creator && lf.creator.displayName) || '—',
          createdAt: lf.created ? formatDate(lf.created) : '—',
          isUmbEpic: labelsArr.includes('fcrm_umb_epic') || umbKeysSet.has(lIss.key)
        };
      }

      for (let i = 0; i < lnkKeysAll.length; i += 50) {
        const chunk = lnkKeysAll.slice(i, i + 50);
        try {
          const lnkRes = await fetch(
            '/rest/api/2/search?jql=' + encodeURIComponent('key in (' + chunk.join(',') + ')') + '&fields=' + lnkFields.join(',') + '&maxResults=50',
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
      for (let i = 0; i < epKeysAll.length; i += 50) {
        const chunk = epKeysAll.slice(i, i + 50);
        try {
          const epFields = ['summary'];
          if (discoveredFields.epicName) epFields.push(discoveredFields.epicName);
          const epRes = await fetch(
            '/rest/api/2/search?jql=' + encodeURIComponent('key in (' + chunk.join(',') + ')') + '&fields=' + epFields.join(',') + '&maxResults=50',
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

      let custName = 'Не указан';
      if (discoveredFields.customer && f[discoveredFields.customer]) {
        const rawCust = f[discoveredFields.customer];
        if (Array.isArray(rawCust) && rawCust[0]) {
          custName = rawCust[0].displayName || rawCust[0].value || rawCust[0].name || String(rawCust[0]);
        } else if (typeof rawCust === 'object') {
          custName = rawCust.displayName || rawCust.value || rawCust.name || 'Не указан';
        } else {
          custName = String(rawCust);
        }
      }

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

        const item = {
          id: lnk.id ? String(lnk.id) : 'lnk-' + iss.key + '-' + idx,
          jiraLinkId: lnk.id ? String(lnk.id) : null,
          key: target.key,
          summary: (enriched && enriched.summary) || (target.fields && target.fields.summary) || target.key,
          status: (enriched && enriched.status) || (target.fields && target.fields.status && target.fields.status.name) || 'Открыто',
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
      const issueTypeName = (f.issuetype && f.issuetype.name) || '';
      const issueTypeId = (f.issuetype && f.issuetype.id) || '';

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
          department: 'FCRM'
        },
        createdAt: formatDate(f.created),
        sprint: taskSprint,
        status: (f.status && f.status.name) || 'Открыто',
        priority: (f.priority && f.priority.name) || 'Medium',
        projectTaskLinks: ptLinks,
        inProjectLinks: ipLinks
      };
    });
  }

  async function reloadSingleSprintFromJira(sprintName) {
    loadingSprintsMap[sprintName] = true;
    renderStructure();

    try {
      const fieldsParam = getBoardFieldsParam();
      const spId = sprintIdByName[sprintName];
      let sprintRawIssues = [];

      if (spId) {
        const res = await fetch(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint/' + encodeURIComponent(spId) + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey) + '&maxResults=150&fields=' + fieldsParam,
          { credentials: 'same-origin', headers: { Accept: 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.issues)) {
            sprintRawIssues = data.issues.filter((iss) => iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-'));
            sprintRawIssues.forEach((iss) => {
              issueSprintOverrideMap[iss.key] = sprintName;
            });
          }
        }
      } else if (sprintName.includes('Бэклог')) {
        let res = await fetch(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/backlog?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&maxResults=120&fields=' + fieldsParam,
          { credentials: 'same-origin', headers: { Accept: 'application/json' } }
        );
        if (!res.ok) {
          res = await fetch(
            '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' AND (sprint is EMPTY OR sprint not in openSprints()) AND sprint not in closedSprints() ORDER BY updated DESC') + '&maxResults=120&fields=' + fieldsParam,
            { credentials: 'same-origin', headers: { Accept: 'application/json' } }
          );
        }
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.issues)) {
            sprintRawIssues = data.issues.filter((iss) => iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-'));
          }
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

  async function reloadSingleTaskFromJira(taskKey) {
    if (!taskKey) return;
    loadingSidebarTaskKey = taskKey;
    assigneeSearchQuery = '';
    customerSearchQuery = '';
    renderStructure();

    try {
      const fieldsParam = getBoardFieldsParam();
      const [issRes, trRes] = await Promise.all([
        fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '?fields=' + fieldsParam, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        }),
        fetch('/rest/api/2/issue/' + encodeURIComponent(taskKey) + '/transitions', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        })
      ]);

      if (trRes.ok) {
        const trData = await trRes.json();
        if (Array.isArray(trData.transitions)) {
          issueTransitionsByKey[taskKey] = trData.transitions;
        }
      }

      if (issRes.ok) {
        const rawIssue = await issRes.json();
        if (rawIssue && rawIssue.key) {
          const enrichedArr = applyLocalOverridesToTasks(await normalizeAndEnrichJiraIssues([rawIssue]));
          if (enrichedArr[0]) {
            tasks = tasks.map((t) => (t.key === taskKey ? enrichedArr[0] : t));
          }
        }
      }
    } catch (e) {}

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

      // Запрашиваем задачи ТОЛЬКО для родных активных и будущих спринтов доски 9349
      const activeAndFutureSprintIds = Array.from(boardOwnedSprintIds).filter((id) => !closedSprintIds.has(id));

      for (const spId of activeAndFutureSprintIds.slice(0, 15)) {
        try {
          const spIssRes = await fetch(
            '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/sprint/' + spId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey) + '&maxResults=150&fields=' + fieldsParam,
            { credentials: 'same-origin', headers: { Accept: 'application/json' } }
          );
          if (spIssRes.ok) {
            const spIssData = await spIssRes.json();
            if (Array.isArray(spIssData.issues)) {
              spIssData.issues.forEach((iss) => {
                if (iss && iss.key && iss.key.startsWith(CONFIG.projectKey + '-')) {
                  issueSprintOverrideMap[iss.key] = sprintNameById[spId];
                  if (!seenKeys.has(iss.key)) {
                    seenKeys.add(iss.key);
                    rawIssues.push(iss);
                  }
                }
              });
            }
          }
        } catch (e) {}
      }

      let backlogRes = await fetch(
        '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/backlog?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&maxResults=150&fields=' + fieldsParam,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      if (!backlogRes.ok) {
        backlogRes = await fetch(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' AND (sprint in openSprints() OR sprint in futureSprints() OR sprint is EMPTY) ORDER BY updated DESC') + '&maxResults=150&fields=' + fieldsParam,
          { credentials: 'same-origin', headers: { Accept: 'application/json' } }
        );
      }
      if (!backlogRes.ok) {
        backlogRes = await fetch(
          '/rest/agile/1.0/board/' + CONFIG.rapidViewId + '/issue?jql=' + encodeURIComponent('project = ' + CONFIG.projectKey + ' ORDER BY updated DESC') + '&maxResults=150&fields=' + fieldsParam,
          { credentials: 'same-origin', headers: { Accept: 'application/json' } }
        );
      }

      if (backlogRes.ok) {
        const boardData = await backlogRes.json();
        if (Array.isArray(boardData.issues)) {
          boardData.issues.forEach((iss) => {
            if (!iss || !iss.key || !iss.key.startsWith(CONFIG.projectKey + '-') || seenKeys.has(iss.key)) {
              return;
            }
            const f = iss.fields || {};
            const hasClosedOnly =
              !f.sprint &&
              !issueSprintOverrideMap[iss.key] &&
              !issueSprintOverrideMap[String(iss.id)] &&
              Array.isArray(f.closedSprints) &&
              f.closedSprints.length > 0;
            if (hasClosedOnly) {
              return;
            }
            seenKeys.add(iss.key);
            rawIssues.push(iss);
          });
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
    return Object.keys(groupsObj).sort((a, b) => {
      if (a.includes('Бэклог') && !b.includes('Бэклог')) return 1;
      if (!a.includes('Бэклог') && b.includes('Бэклог')) return -1;
      const wa = sprintOrderWeight[a] || 500;
      const wb = sprintOrderWeight[b] || 500;
      if (wa !== wb) return wa - wb;
      return b.localeCompare(a, 'ru', { numeric: true });
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
   * Возвращает список спринтов СТРОГО нашей доски FCRM (#9349).
   */
  function getAllSprintOptions() {
    const ownedSprints = Array.from(boardOwnedSprintNames).filter((name) => name && !closedSprintNames.has(name));
    const fcrmTaskSprints = tasks
      .filter((t) => t.key && t.key.startsWith(CONFIG.projectKey + '-'))
      .map((t) => t.sprint)
      .filter((name) => name && !closedSprintNames.has(name));

    const set = new Set([...ownedSprints, ...fcrmTaskSprints, 'Бэклог FCRM']);
    return Array.from(set).filter((s) => s && s !== '9223372036854775807' && !/^\\d+$/.test(s) && !closedSprintNames.has(s));
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

    // 3. Базовый фоллбэк схемы FCRM (без чужих технических статусов других типов задач)
    const fallbackScheme = ['Backlog', 'Ready for Planning', 'OnAnalysis', 'Waiting', 'OnDev', 'product/design review', 'User Testing', 'Готово', 'Canceled'];
    return Array.from(new Set([task.status, ...fallbackScheme])).filter(Boolean);
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
    const ptList = task.projectTaskLinks || [];
    const ipList = task.inProjectLinks || [];
    const totalLinks = ptList.length + ipList.length;
    const isSubExpanded = Boolean(expandedSubRows[task.key]);
    const hasNoProjectTask = ptList.length === 0;

    const taskTransitions = issueTransitionsByKey[task.key] || [];
    const statusOptions = getStatusOptionsForTask(task)
      .map((st) => {
        const matchedTr = taskTransitions.find(
          (tr) => ((tr.to && tr.to.name) || tr.name || '').toLowerCase() === st.toLowerCase()
        );
        const trAttr = matchedTr && matchedTr.id ? \`data-tr-id="\${escapeHtml(matchedTr.id)}"\` : '';
        return \`<option value="\${escapeHtml(st)}" \${trAttr} \${st === task.status ? 'selected' : ''}>\${escapeHtml(st)}</option>\`;
      })
      .join('');
    const statusCat = getStatusCategoryClass(task.status);

    const sprintOptions = allSprints
      .map((sp) => \`<option value="\${escapeHtml(sp)}" \${sp === task.sprint ? 'selected' : ''}>\${escapeHtml(sp)}</option>\`)
      .join('');

    const assigneeOptions = allAssignees
      .map((a) => \`<option value="\${escapeHtml(a)}" \${a === task.assignee.name ? 'selected' : ''}>\${escapeHtml(a)}</option>\`)
      .join('');

    const cleanEpicTitle =
      (task.epicKey && epicNameByKey[task.epicKey]) ||
      (!isBogusEpicTitle(task.epicName, task.epicKey) ? task.epicName : '');

    const isEpicComboOpen = activeTableCombo && activeTableCombo.type === 'epic' && activeTableCombo.taskKey === task.key;
    const isCompComboOpen = activeTableCombo && activeTableCombo.type === 'component' && activeTableCombo.taskKey === task.key;

    let epicPopoverHtml = '';
    if (isEpicComboOpen) {
      const q = (activeTableCombo.query || '').trim().toLowerCase();
      const filteredEpics = epicKeys.filter((k) => {
        if (!q) return true;
        const name = (epicMap[k] || '').toLowerCase();
        return k.toLowerCase().includes(q) || name.includes(q);
      });
      epicPopoverHtml = \`
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" onclick="event.stopPropagation();">
          <input type="text" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск эпика FCRM (код или название)..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list">
            <div class="ozon-ext-combo-item \${!task.epicKey ? 'active' : ''}" data-action="pick-table-epic" data-key="\${escapeHtml(task.key)}" data-epic-key="" data-epic-name="">
              <span style="color:#94A3B8;">✕ Без эпика</span>
            </div>
            \${
              filteredEpics.length > 0
                ? filteredEpics
                    .slice(0, 40)
                    .map(
                      (k) => \`
                        <div class="ozon-ext-combo-item \${k === task.epicKey ? 'active' : ''}" data-action="pick-table-epic" data-key="\${escapeHtml(task.key)}" data-epic-key="\${escapeHtml(k)}" data-epic-name="\${escapeHtml(epicMap[k] || '')}">
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
        <div class="ozon-ext-inner-ctrl ozon-ext-combo-popover" style="min-width:250px;" onclick="event.stopPropagation();">
          <input type="text" class="ozon-ext-input" id="ozon-table-combo-input" data-action="table-combo-search" placeholder="Поиск компонента (\${escapeHtml(taskProjKey)})..." value="\${escapeHtml(activeTableCombo.query || '')}" autocomplete="off" />
          <div class="ozon-ext-combo-list" id="ozon-table-combo-list">
            \${
              filteredComps.length > 0
                ? filteredComps
                    .map(
                      (c) => \`
                        <div class="ozon-ext-combo-item \${c === task.component ? 'active' : ''}" data-action="pick-table-comp" data-key="\${escapeHtml(task.key)}" data-comp="\${escapeHtml(c)}">
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

    const isCustEmpty = !task.customer.name || task.customer.name === 'Не указан';

    const cellMap = {
      task: \`
        <td>
          <div class="ozon-ext-cell-singleline">
            \${
              totalLinks > 0
                ? \`<button type="button" class="ozon-ext-inner-ctrl" data-action="toggle-subrow" data-key="\${escapeHtml(task.key)}" title="Развернуть связанные задачи (\${totalLinks})" style="border:none;background:transparent;color:#005BFF;font-weight:700;cursor:pointer;padding:0 3px;font-size:10px;line-height:1;flex-shrink:0;">\${isSubExpanded ? '▼' : '▶'}</button>\`
                : '<span style="display:inline-block;width:14px;flex-shrink:0;"></span>'
            }
            \${hasNoProjectTask ? getMissingProjectTaskWarnSvg() : ''}
            <span title="Приоритет: \${escapeHtml(task.priority || 'Medium')}" style="display:inline-flex;align-items:center;flex-shrink:0;">\${getJiraPriorityIconSvg(task.priority)}</span>
            <a href="/browse/\${escapeHtml(task.key)}" target="_blank" class="ozon-ext-inner-ctrl ozon-mono" onclick="event.stopPropagation();" style="color:#005BFF;font-weight:700;font-size:11px;text-decoration:none;flex-shrink:0;">\${escapeHtml(task.key)}</a>
            <span style="overflow:hidden;text-overflow:ellipsis;color:#071026;font-weight:500;font-size:11.5px;">\${escapeHtml(task.summary)}</span>
          </div>
        </td>
      \`,
      status: \`
        <td>
          <div class="ozon-ext-cell-singleline">
            <select class="ozon-ext-inner-ctrl ozon-ext-status-select status-\${statusCat}" data-action="change-status" data-key="\${escapeHtml(task.key)}" title="Статусы из схемы задачи">
              \${statusOptions}
            </select>
          </div>
        </td>
      \`,
      epic: \`<td style="overflow:visible;">\${epicCellHtml}</td>\`,
      component: \`<td style="overflow:visible;">\${compCellHtml}</td>\`,
      assignee: \`
        <td>
          <div class="ozon-ext-cell-singleline">
            <select class="ozon-ext-inner-ctrl ozon-ext-inline-select" data-action="change-assignee" data-key="\${escapeHtml(task.key)}" title="\${escapeHtml(task.assignee.name)}">
              \${assigneeOptions}
            </select>
          </div>
        </td>
      \`,
      author: \`
        <td title="\${escapeHtml(task.author.name)}" style="color:#475569;font-size:11px;">
          <div class="ozon-ext-cell-singleline">\${escapeHtml(task.author.name)}</div>
        </td>
      \`,
      customer: \`
        <td>
          <div class="ozon-ext-cell-singleline">
            <input type="text" class="ozon-ext-inner-ctrl ozon-ext-inline-input \${isCustEmpty ? 'is-empty' : ''}" data-action="change-customer" data-key="\${escapeHtml(task.key)}" value="\${escapeHtml(task.customer.name)}" title="Нажмите для изменения заказчика (Enter для сохранения)" />
          </div>
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
            <select class="ozon-ext-inner-ctrl ozon-ext-inline-select sprint-muted" data-action="change-sprint" data-key="\${escapeHtml(task.key)}" title="\${escapeHtml(task.sprint)}">
              \${sprintOptions}
            </select>
          </div>
        </td>
      \`,
      projectTask: \`<td>\${ptSingleLineHtml}</td>\`,
      inProject: \`<td>\${ipSingleLineHtml}</td>\`
    };

    let html = \`
      <tr class="ozon-ext-task-row \${isSelected ? 'selected' : ''}" data-key="\${escapeHtml(task.key)}" title="Нажмите, чтобы открыть детали задачи в сайдбаре">
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
            <td style="padding-left:24px !important;">
              <div class="ozon-ext-cell-singleline">
                <span class="ozon-mono" style="color:#94A3B8;">↳</span>
                <span class="ozon-ext-badge \${isPt ? 'ozon-ext-badge-progress' : 'ozon-ext-badge-done'}" style="font-size:9.5px;padding:0 5px;flex-shrink:0;">\${isPt ? 'Задача проекта' : 'В проекте'}</span>
                <span title="Приоритет: \${escapeHtml(l.priority || 'Medium')}" style="display:inline-flex;align-items:center;flex-shrink:0;">\${getJiraPriorityIconSvg(l.priority || 'Medium')}</span>
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
          createdAt: \`<td class="ozon-mono" style="color:#64748B;font-size:10.5px;"><div class="ozon-ext-cell-singleline">\${escapeHtml(l.createdAt || '—')}</div></td>\`,
          sprint: \`<td style="color:#334155;font-weight:500;"><div class="ozon-ext-cell-singleline" title="\${escapeHtml(l.sprint || 'Не в спринте')}">\${escapeHtml(l.sprint || 'Не в спринте')}</div></td>\`,
          projectTask: isPt
            ? \`<td><div class="ozon-ext-cell-singleline"><span class="ozon-ext-badge ozon-ext-badge-progress">Задача проекта</span></div></td>\`
            : \`<td style="color:#94A3B8;">—</td>\`,
          inProject: !isPt
            ? \`<td><div class="ozon-ext-cell-singleline"><span class="ozon-ext-badge ozon-ext-badge-done">В проекте</span></div></td>\`
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
              <span>Загрузка активных и будущих спринтов FCRM из Jira...</span>
            </div>
          </td>
        </tr>
        \${buildSkeletonTableRowsHtml(8)}
      \`;
    }

    const groups = {};

    // Группируем задачи FCRM по спринтам
    filteredTasks.forEach((t) => {
      const sp = t.sprint && !closedSprintNames.has(t.sprint) ? t.sprint : 'Бэклог FCRM';
      if (!groups[sp]) groups[sp] = [];
      groups[sp].push(t);
    });

    const sortedSprints = getSortedSprintNames(groups).filter((spName) => {
      const items = groups[spName] || [];
      return items.length > 0;
    });

    const allComponents = getAllComponentOptions();
    const allSprints = getAllSprintOptions();
    const allAssignees = getAllAssigneeOptions();
    const epicMap = getAllEpicOptions();
    const epicKeys = Object.keys(epicMap);

    let rowsHtml = '';

    sortedSprints.forEach((sprintName) => {
      const groupItems = groups[sprintName] || [];
      // По умолчанию спринты СВЁРНУТЫ (разворачиваются по клику или при активном поиске)
      const isExpanded = Boolean(expandedSprints[sprintName]) || Boolean(searchQuery.trim());
      const collapsed = !isExpanded;
      const isSprintLoading = Boolean(loadingSprintsMap[sprintName]);
      const isBacklog = sprintName.toLowerCase().includes('бэклог') || sprintName.toLowerCase().includes('backlog');
      const spState = sprintStateByName[sprintName] || (isBacklog ? 'BACKLOG' : 'ACTIVE');
      const stateLabel = spState === 'ACTIVE' ? 'Активный спринт' : spState === 'FUTURE' ? 'Будущий спринт' : 'Бэклог';

      rowsHtml += \`
        <tr class="ozon-ext-sprint-row" data-sprint="\${escapeHtml(sprintName)}">
          <td colspan="\${columnOrder.length}">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                \${isSprintLoading ? '<span class="ozon-ext-spinner"></span>' : \`<span style="color:#005BFF;font-size:10px;">\${collapsed ? '▶' : '▼'}</span>\`}
                <span style="color:#071026;font-weight:700;font-size:12px;">\${escapeHtml(sprintName)}</span>
                <span class="ozon-ext-badge \${spState === 'ACTIVE' ? 'ozon-ext-badge-done' : isBacklog ? 'ozon-ext-badge-todo' : 'ozon-ext-badge-progress'}">\${escapeHtml(stateLabel)}</span>
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
            const compItems = compGroups[compName];
            const compKey = sprintName + '::' + compName;
            // По умолчанию компоненты внутри спринта тоже СВЁРНУТЫ (или развёрнуты при активном поиске)
            const isCompExpanded = Boolean(expandedComponents[compKey]) || Boolean(searchQuery.trim());
            const isCompCollapsed = !isCompExpanded;

            rowsHtml += \`
              <tr class="ozon-ext-comp-group-row" data-comp-group="\${escapeHtml(compKey)}">
                <td colspan="\${columnOrder.length}">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:7px;">
                      <span style="color:#005BFF;font-size:9.5px;">\${isCompCollapsed ? '▶' : '▼'}</span>
                      <span style="color:#64748B;font-size:11px;font-weight:500;">Компонент:</span>
                      <strong style="color:#071026;font-size:11px;font-weight:700;">\${escapeHtml(compName)}</strong>
                      <span class="ozon-ext-badge ozon-ext-badge-progress ozon-mono" style="font-size:10px;padding:0 5px;">\${compItems.length} задач</span>
                    </div>
                    <span style="color:#94A3B8;font-size:10.5px;">\${isCompCollapsed ? 'Показать (' + compItems.length + ')' : 'Свернуть'}</span>
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
    if (!Array.isArray(users) || users.length === 0) {
      return '<div style="padding:8px 10px;color:#64748B;font-size:11px;">Пользователи не найдены. Нажмите Enter, чтобы сохранить введённое имя.</div>';
    }
    return users
      .map(
        (u) => \`
          <div class="ozon-ext-user-option" data-action="pick-jira-user" data-user-login="\${escapeHtml(u.name)}" data-user-display="\${escapeHtml(u.displayName)}">
            <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <strong style="color:#071026;">\${escapeHtml(u.displayName)}</strong>
              <span style="color:#64748B;font-size:10.5px;margin-left:5px;">(\${escapeHtml(u.name)})</span>
            </div>
            <span style="color:#005BFF;font-weight:700;font-size:10.5px;flex-shrink:0;">Назначить</span>
          </div>
        \`
      )
      .join('');
  }

  function renderCustomerSearchResultsHtml(users) {
    if (!Array.isArray(users) || users.length === 0) {
      return '';
    }
    return (
      '<div class="ozon-ext-user-dropdown">' +
      users
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
    assignee: { label: 'Исполнитель ✎', accent: false },
    author: { label: 'Автор', accent: false },
    customer: { label: 'Заказчик ✎', accent: false },
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
    const allSprints = getAllSprintOptions();
    const statusList = getStatusOptionsForTask(task);
    const priorityList = getPriorityOptionsForTask(task);
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

    const sprintOptions = allSprints
      .map((sp) => \`<option value="\${escapeHtml(sp)}" \${sp === task.sprint ? 'selected' : ''}>\${escapeHtml(sp)}</option>\`)
      .join('');

    const isInBacklog = !task.sprint || task.sprint.toLowerCase().includes('бэклог') || task.sprint.toLowerCase().includes('backlog');
    const sprintQuickChipsHtml = \`
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;">
        \${allSprints
          .filter((sp) => !sp.toLowerCase().includes('бэклог') && !sp.toLowerCase().includes('backlog'))
          .map((sp) => {
            const isCurr = sp === task.sprint;
            return \`<button type="button" class="ozon-ext-btn \${isCurr ? '' : 'ozon-ext-btn-surface'}" data-action="quick-sprint-chip" data-sprint="\${escapeHtml(sp)}" style="padding:2px 7px;height:21px;font-size:10px;\${isCurr ? 'border:1px solid #005BFF;' : ''}">\${isCurr ? '✓ ' : ''}\${escapeHtml(sp)}</button>\`;
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
    const filteredUmb = umbCatalog.filter((u) => {
      if (!umbQ) return true;
      return u.key.toLowerCase().includes(umbQ) || u.summary.toLowerCase().includes(umbQ);
    });

    const initialUsersToShow = searchedUsersResults.length > 0 ? searchedUsersResults : assignableUsersList.slice(0, 15);

    const isDescCollapsed = Boolean(collapsedSidebarSections['desc']);
    const isParamsCollapsed = Boolean(collapsedSidebarSections['params']);
    const isPtCollapsed = Boolean(collapsedSidebarSections['pt']);
    const isIpCollapsed = Boolean(collapsedSidebarSections['ip']);

    const descLinesCount = Math.max(3, Math.min(20, (task.description || '').split('\\n').length + 1));

    // Группируем задачи «В проекте» по OB (Бэкенд), OBFRONT (Фронтенд), FTD (Дизайн), FCRM
    const ipGroupsMap = {};
    (task.inProjectLinks || []).forEach((lnk, originalIdx) => {
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

          <!-- АККОРДЕОН 1: ОПИСАНИЕ ЗАДАЧИ (динамическая высота по тексту) -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isDescCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="desc">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isDescCollapsed ? '▶' : '▼'}</span>
                <span>Описание задачи</span>
              </div>
              <button type="button" class="ozon-ext-btn" id="ozon-sb-save-description" onclick="event.stopPropagation();" style="height:21px;padding:1px 8px;font-size:10px;">Сохранить описание</button>
            </div>
            \${
              !isDescCollapsed
                ? \`<div style="padding:8px 10px;">
                     <textarea id="ozon-sb-description" rows="\${descLinesCount}" placeholder="Описание задачи отсутствует. Введите текст описания и нажмите «Сохранить описание»..." style="width:100%;resize:vertical;min-height:66px;max-height:680px;overflow-y:hidden;font-size:12px;line-height:1.45;">\${escapeHtml(task.description || '')}</textarea>
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
              </div>
              <span style="color:#005BFF;font-weight:600;font-size:10.5px;">Ozon Bank \${escapeHtml(taskProjKey)}</span>
            </div>
            \${
              !isParamsCollapsed
                ? \`<div style="padding:10px 12px;" class="ozon-ext-field-grid">
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
                          ? \`<div class="ozon-ext-combo-popover" style="width:100%;">
                               <input type="text" id="ozon-sb-comp-search" placeholder="Поиск компонента в проекте \${escapeHtml(taskProjKey)}..." value="\${escapeHtml(sbCompSearchQuery)}" autocomplete="off" />
                               <div class="ozon-ext-combo-list" id="ozon-sb-comp-list">
                                 \${
                                   filteredSbComps.length > 0
                                     ? filteredSbComps
                                         .map(
                                           (c) => \`
                                             <div class="ozon-ext-combo-item \${c === task.component ? 'active' : ''}" data-action="pick-sb-comp" data-comp="\${escapeHtml(c)}">
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
                            ? \`<div class="ozon-ext-combo-popover" style="width:100%;">
                                 <input type="text" id="ozon-sb-epic-search" placeholder="Поиск эпика в проекте FCRM (код или название)..." value="\${escapeHtml(sbEpicSearchQuery)}" autocomplete="off" />
                                 <div class="ozon-ext-combo-list" id="ozon-sb-epic-list">
                                   <div class="ozon-ext-combo-item \${!task.epicKey ? 'active' : ''}" data-action="pick-sb-epic" data-epic-key="" data-epic-name="">
                                     <span style="color:#94A3B8;">✕ Без эпика (отвязать эпик)</span>
                                   </div>
                                   \${
                                     filteredSbEpics.length > 0
                                       ? filteredSbEpics
                                           .slice(0, 50)
                                           .map(
                                             (k) => \`
                                               <div class="ozon-ext-combo-item \${k === task.epicKey ? 'active' : ''}" data-action="pick-sb-epic" data-epic-key="\${escapeHtml(k)}" data-epic-name="\${escapeHtml(epicMap[k] || '')}">
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

                    <!-- Исполнитель с живым поиском по пользователям Jira -->
                    <div class="ozon-ext-field-label">Исполнитель</div>
                    <div style="display:flex;flex-direction:column;gap:5px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;background:#E5F0FF;padding:4px 8px;border-radius:7px;">
                        <span style="font-weight:700;color:#071026;font-size:11.5px;">👤 \${escapeHtml(task.assignee.name)}</span>
                        <button type="button" class="ozon-ext-btn ozon-ext-btn-negative" id="ozon-sb-unassign-btn" style="padding:1px 6px;height:20px;font-size:10px;">Снять</button>
                      </div>
                      <input type="text" id="ozon-sb-user-search" value="\${escapeHtml(assigneeSearchQuery)}" placeholder="🔍 Поиск пользователя по ФИО или логину..." style="width:100%;" />
                      <div class="ozon-ext-user-dropdown" id="ozon-sb-user-results">
                        \${renderUserSearchResultsHtml(initialUsersToShow)}
                      </div>
                    </div>

                    <!-- Заказчик с живым поиском по пользователям Jira -->
                    <div class="ozon-ext-field-label">Заказчик</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                      <div style="display:flex;gap:5px;">
                        <input type="text" id="ozon-sb-customer" value="\${escapeHtml(task.customer.name)}" placeholder="🔍 Введите заказчика или начните поиск..." style="flex:1;" />
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
                <span>Связи: «Задача проекта» (\${task.projectTaskLinks.length})</span>
                \${task.projectTaskLinks.length === 0 ? getMissingProjectTaskWarnSvg() : ''}
              </div>
              <a href="/issues/?jql=labels%20%3D%20fcrm_umb_epic" target="_blank" class="ozon-mono" onclick="event.stopPropagation();" style="color:#005BFF;font-size:10.5px;text-decoration:none;">
                JQL: fcrm_umb_epic ↗
              </a>
            </div>
            \${
              !isPtCollapsed
                ? \`<div>
                    \${
                      task.projectTaskLinks.length > 0
                        ? task.projectTaskLinks
                            .map((lnk, ptIdx) => {
                              const gMeta = getLinkedProjectGroupMeta(lnk.key, true);
                              return \`
                                <div class="ozon-ext-link-compact-row">
                                  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
                                    <div style="display:flex;align-items:center;gap:5px;overflow:hidden;min-width:0;">
                                      <span class="ozon-ext-link-icon-box" style="background:\${gMeta.bg};color:\${gMeta.color};">\${gMeta.iconSvg}</span>
                                      <span style="display:inline-flex;align-items:center;flex-shrink:0;">\${getJiraPriorityIconSvg(lnk.priority || 'Medium')}</span>
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
                        : '<div style="padding:8px 12px;color:#D97706;background:#FFFBEB;font-size:11px;font-weight:600;display:flex;align-items:center;gap:6px;">' +
                          getMissingProjectTaskWarnSvg() +
                          '<span>Внимание: у задачи нет привязанной «Задачи проекта» (labels = fcrm_umb_epic)</span></div>'
                    }

                    <!-- Быстрый выбор из фильтра labels = fcrm_umb_epic -->
                    <div style="padding:7px 10px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
                      <div style="font-size:10.5px;font-weight:700;color:#334155;margin-bottom:5px;">
                        Быстрый выбор из фильтра <code class="ozon-mono">labels = fcrm_umb_epic</code> (\${umbCatalog.length}):
                      </div>
                      <input type="text" id="ozon-sb-umb-search" value="\${escapeHtml(umbSearchQuery)}" placeholder="Поиск по ключу или названию в fcrm_umb_epic..." style="width:100%;margin-bottom:5px;background:#FFFFFF !important;height:24px !important;" />
                      <div style="max-height:135px;overflow-y:auto;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:7px;">
                        \${filteredUmb
                          .map((u) => {
                            const alreadyLinked = task.projectTaskLinks.some((l) => l.key === u.key);
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
                    </div>
                  </div>\`
                : ''
            }
          </div>

          <!-- АККОРДЕОН 4: СВЯЗИ «В ПРОЕКТЕ» (Компактная группировка OB Бэкенд / OBFRONT Фронтенд / FTD Дизайн + иконки + Input-Select компонентов проекта) -->
          <div class="ozon-ext-section-card">
            <div class="ozon-ext-section-head \${isIpCollapsed ? 'collapsed' : ''}" data-action="toggle-sb-section" data-sec="ip">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="color:#005BFF;font-size:10px;">\${isIpCollapsed ? '▶' : '▼'}</span>
                <span>Связи: «В проекте» (\${task.inProjectLinks.length})</span>
              </div>
              <span style="font-size:10px;color:#64748B;">OB (Бэкенд) · OBFRONT (Фронтенд) · FTD (Дизайн)</span>
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
                                          const linkSprintOptionList = Array.from(new Set([realSprintVal, 'Не в спринте', ...allSprints]));
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
                                                  <span class="ozon-ext-link-icon-box" style="background:\${grp.meta.bg};color:\${grp.meta.color};">\${grp.meta.iconSvg}</span>
                                                  <span style="display:inline-flex;align-items:center;flex-shrink:0;" title="Приоритет: \${escapeHtml(lnk.priority || 'Medium')}">\${getJiraPriorityIconSvg(lnk.priority || 'Medium')}</span>
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

                                              <!-- Компактная строка Компонента (Input-Select проекта \${escapeHtml(lnkProjKey)}) и Спринта -->
                                              <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;align-items:center;">
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
                                                  \${linkSprintOptionList.map((sp) => \`<option value="\${escapeHtml(sp)}" \${sp === realSprintVal ? 'selected' : ''}>Спринт: \${escapeHtml(sp)}</option>\`).join('')}
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
                        : '<div style="padding:10px 12px;color:#64748B;font-size:11.5px;">Нет связанных задач в блоке «В проекте»</div>'
                    }

                    <!-- Добавление новой связи «В проекте» -->
                    <div style="padding:7px 10px;background:#F8FAFC;border-top:1px solid #E2E8F0;display:flex;flex-direction:column;gap:5px;">
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
      if (filterComponent !== 'all' && t.component !== filterComponent) return false;
      if (filterEpic !== 'all' && t.epicKey !== filterEpic) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (!q) return true;
      return (
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.component.toLowerCase().includes(q) ||
        (t.epicKey && t.epicKey.toLowerCase().includes(q)) ||
        (t.epicName && t.epicName.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.name.toLowerCase().includes(q)) ||
        (t.customer && t.customer.name.toLowerCase().includes(q)) ||
        (t.sprint && t.sprint.toLowerCase().includes(q))
      );
    });
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

    const filtered = getFilteredTasks();
    const rowsHtml = buildTableRowsHtml(filtered);
    const sidebarHtml = buildSidebarHtml();
    const totalTableW = getTotalTableWidth();

    const allComponents = getAllComponentOptions();
    const epicMap = getAllEpicOptions();
    const epicKeys = Object.keys(epicMap);
    const allStatuses = Array.from(new Set([...projectStatusesList, ...tasks.map((t) => t.status).filter(Boolean)]));

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

    root.innerHTML = \`
      <div class="ozon-ext-header-bar">
        <div style="display:flex;align-items:center;gap:20px;">
          <strong style="font-size:13.5px;font-weight:700;color:#071026;font-family:var(--ozon-font-display);letter-spacing:-0.01em;">Ozon Bank · FCRM Structure</strong>
          <a href="#all-sprints" id="ozon-ext-show-all-sprints" style="color:#005BFF;font-size:12px;font-weight:600;text-decoration:none;">Все спринты (\${tasks.length})</a>
          <span style="font-size:11px;color:#64748B;display:inline-flex;align-items:center;gap:4px;" title="Восклицательный знак отмечает задачи без привязанной «Задачи проекта»">
            \${getMissingProjectTaskWarnSvg()} <span>— нет «Задачи проекта»</span>
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

          <div style="position:relative;width:255px;">
            <input id="ozon-ext-search" type="text" value="\${escapeHtml(searchQuery)}" placeholder="Поиск по ключу, задаче, заказчику, связям..." style="width:100%;height:26px;padding-left:10px;" />
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

          \${
            searchQuery || filterComponent !== 'all' || filterEpic !== 'all' || filterStatus !== 'all'
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

      <div class="ozon-ext-workspace">
        <div class="ozon-ext-table-pane" id="ozon-ext-table-pane">
          <table class="ozon-ext-table" id="ozon-ext-main-table" style="width:\${totalTableW}px !important;min-width:\${totalTableW}px !important;max-width:\${totalTableW}px !important;">
            <colgroup id="ozon-ext-colgroup">
              \${columnOrder
                .map((colId) => {
                  const w = Number(colWidths[colId]) || 130;
                  return \`<col data-col="\${escapeHtml(colId)}" style="width:\${w}px" />\`;
                })
                .join('')}
            </colgroup>
            <thead>
              <tr>
                \${columnOrder
                  .map((colId) => {
                    const w = Number(colWidths[colId]) || 130;
                    const meta = COLUMN_META[colId] || { label: colId, accent: false };
                    return \`<th data-col="\${escapeHtml(colId)}" draggable="true" title="Перетащите заголовок для изменения порядка столбцов" style="width:\${w}px;min-width:\${w}px;max-width:\${w}px;cursor:grab;\${meta.accent ? 'color:#005BFF !important;' : ''}">\${escapeHtml(meta.label)}<div class="ozon-ext-col-resizer" data-col="\${escapeHtml(colId)}"></div></th>\`;
                  })
                  .join('')}
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

    bindStructureEvents(root);

    // Автоматически подстраиваем высоту описания под текст
    const descEl = document.getElementById('ozon-sb-description');
    if (descEl) {
      descEl.style.height = 'auto';
      descEl.style.height = Math.max(66, descEl.scrollHeight) + 'px';
    }

    if (activeElId) {
      const restored = document.getElementById(activeElId);
      if (restored) {
        restored.focus();
        if (selStart !== null && 'setSelectionRange' in restored) {
          try {
            restored.setSelectionRange(selStart, selEnd);
          } catch (e) {}
        }
      }
    }
  }

  function bindStructureEvents(root) {
    const searchEl = document.getElementById('ozon-ext-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        const tbody = document.getElementById('ozon-ext-tbody');
        if (tbody) {
          tbody.innerHTML = buildTableRowsHtml(getFilteredTasks());
          bindTableBodyEvents(tbody);
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

    const resetFiltersBtn = document.getElementById('ozon-ext-reset-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        searchQuery = '';
        filterComponent = 'all';
        filterEpic = 'all';
        filterStatus = 'all';
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
      row.addEventListener('click', () => {
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
      row.addEventListener('click', () => {
        const cg = row.getAttribute('data-comp-group');
        if (!cg) return;
        expandedComponents[cg] = !expandedComponents[cg];
        renderStructure();
      });
    });

    tbody.querySelectorAll('.ozon-ext-task-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.ozon-ext-inner-ctrl')) return;
        const key = row.getAttribute('data-key');
        if (!key) return;
        activeTableCombo = null;
        if (selectedTaskKey === key && isSidebarOpen) {
          isSidebarOpen = false;
          renderStructure();
        } else {
          selectedTaskKey = key;
          isSidebarOpen = true;
          reloadSingleTaskFromJira(key);
        }
      });
    });

    tbody.querySelectorAll('button[data-action="toggle-subrow"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        expandedSubRows[key] = !expandedSubRows[key];
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
        if (inp) inp.focus();
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
        if (inp) inp.focus();
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
        }
        renderStructure();
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

    tbody.querySelectorAll('select[data-action="change-status"]').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('focus', () => {
        const key = sel.getAttribute('data-key');
        if (key && !issueTransitionsByKey[key]) {
          fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '/transitions', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d && Array.isArray(d.transitions)) {
                issueTransitionsByKey[key] = d.transitions;
                const taskObj = tasks.find((t) => t.key === key);
                if (taskObj) {
                  const opts = getStatusOptionsForTask(taskObj);
                  sel.innerHTML = opts
                    .map((st) => {
                      const matchedTr = d.transitions.find(
                        (tr) => ((tr.to && tr.to.name) || tr.name || '').toLowerCase() === st.toLowerCase()
                      );
                      const trAttr = matchedTr && matchedTr.id ? \`data-tr-id="\${escapeHtml(matchedTr.id)}"\` : '';
                      return \`<option value="\${escapeHtml(st)}" \${trAttr} \${st === taskObj.status ? 'selected' : ''}>\${escapeHtml(st)}</option>\`;
                    })
                    .join('');
                }
              }
            })
            .catch(() => {});
        }
      });
      sel.addEventListener('change', (e) => {
        const key = sel.getAttribute('data-key');
        const newStatus = e.target.value;
        const selectedOpt = sel.options[sel.selectedIndex];
        const explicitTrId = selectedOpt ? selectedOpt.getAttribute('data-tr-id') : null;
        tasks = tasks.map((t) => (t.key === key ? Object.assign({}, t, { status: newStatus }) : t));
        saveTaskOverride(key, { status: newStatus });
        transitionIssueStatusInJira(key, newStatus, explicitTrId);
        renderStructure();
      });
    });

    tbody.querySelectorAll('select[data-action="change-assignee"]').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        const key = sel.getAttribute('data-key');
        const newAssigneeName = e.target.value;
        tasks = tasks.map((t) =>
          t.key === key ? Object.assign({}, t, { assignee: Object.assign({}, t.assignee, { name: newAssigneeName }) }) : t
        );
        saveTaskOverride(key, { assignee: { name: newAssigneeName, login: '', role: 'Ozon Банк' } });
        updateIssueAssigneeInJira(key, newAssigneeName, null);
        renderStructure();
      });
    });

    tbody.querySelectorAll('input[data-action="change-customer"]').forEach((inp) => {
      inp.addEventListener('click', (e) => e.stopPropagation());
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          inp.blur();
        }
      });
      inp.addEventListener('change', (e) => {
        const key = inp.getAttribute('data-key');
        const newCust = e.target.value.trim() || 'Не указан';
        tasks = tasks.map((t) =>
          t.key === key ? Object.assign({}, t, { customer: Object.assign({}, t.customer, { name: newCust }) }) : t
        );
        saveTaskOverride(key, { customer: { name: newCust, department: 'FCRM' } });
        updateIssueCustomerInJira(key, newCust, null);
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

    // Сворачивание / разворачивание секций-аккордеонов в сайдбаре
    root.querySelectorAll('[data-action="toggle-sb-section"]').forEach((head) => {
      head.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        const sec = head.getAttribute('data-sec');
        if (!sec) return;
        collapsedSidebarSections[sec] = !collapsedSidebarSections[sec];
        renderStructure();
      });
    });

    // Сворачивание / разворачивание групп OB / OBFRONT / FTD в связях «В проекте»
    root.querySelectorAll('[data-action="toggle-ip-group"]').forEach((grpHead) => {
      grpHead.addEventListener('click', () => {
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

    // Автоматическое увеличение высоты поля «Описание задачи» при вводе текста
    const descArea = document.getElementById('ozon-sb-description');
    if (descArea) {
      descArea.addEventListener('input', () => {
        descArea.style.height = 'auto';
        descArea.style.height = Math.max(66, descArea.scrollHeight) + 'px';
      });
    }

    function saveDescriptionNow() {
      const descEl = document.getElementById('ozon-sb-description');
      if (!descEl) return;
      const val = descEl.value;
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

    const unassignBtn = document.getElementById('ozon-sb-unassign-btn');
    if (unassignBtn) {
      unassignBtn.addEventListener('click', () => {
        updateCurrentTask({ assignee: { name: 'Не назначен', login: '', role: 'Ozon Банк' } });
        updateIssueAssigneeInJira(selectedTaskKey, 'Не назначен', null);
        renderStructure();
      });
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
        userSearchTimer = setTimeout(async () => {
          const found = await searchJiraUsers(assigneeSearchQuery, selectedTaskKey);
          searchedUsersResults = found;
          const resBox = document.getElementById('ozon-sb-user-results');
          if (resBox) {
            resBox.innerHTML = renderUserSearchResultsHtml(found);
            bindUserPickerClicks(resBox, task, updateCurrentTask);
          }
        }, 180);
      });

      userSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = userSearchInput.value.trim();
          if (!val) return;
          const firstMatch = searchedUsersResults[0];
          const chosenDisplay = firstMatch ? firstMatch.displayName : val;
          const chosenLogin = firstMatch ? firstMatch.name : val;
          assigneeSearchQuery = '';
          updateCurrentTask({ assignee: { name: chosenDisplay, login: chosenLogin, role: 'Ozon Банк' } });
          updateIssueAssigneeInJira(selectedTaskKey, chosenDisplay, chosenLogin);
          renderStructure();
        }
      });
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
      item.addEventListener('click', (e) => {
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
      });
    });

    root.querySelectorAll('select[data-action="change-ip-sprint"]').forEach((sel) => {
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
        !e.target.closest('.ozon-ext-sb-combo-trigger') &&
        !e.target.closest('#ozon-ext-toggle-col-order')
      ) {
        if (activeTableCombo || sbEpicComboOpen || sbCompComboOpen || sbIpCompOpenIdx !== null || isColOrderPanelOpen) {
          activeTableCombo = null;
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

