type ThemeSetting = 'light' | 'dark' | 'system';

export function installWidgetTheme(win: Window, doc: Document) {
  const storageKey = 'ozon-fcrm-widget-theme';
  const stateKey = Symbol.for(storageKey);
  const widgetWindow = win as Window & { [key: symbol]: { control(): string } | undefined };
  const installed = widgetWindow[stateKey];
  if (installed) return installed;

  const selector = 'select[data-ozon-theme-setting]';
  const media = win.matchMedia?.('(prefers-color-scheme: dark)');
  function normalize(value: unknown): ThemeSetting {
    return value === 'light' || value === 'dark' ? value : 'system';
  }
  let setting: ThemeSetting = 'system';
  try {
    setting = normalize(win.localStorage.getItem(storageKey));
  } catch {
    // Theme selection still works in this tab if storage is unavailable.
  }

  function applyTheme() {
    const effective = setting === 'system' ? (media?.matches ? 'dark' : 'light') : setting;
    if (doc.documentElement?.dataset) doc.documentElement.dataset.ozonFcrmTheme = effective;
    doc.querySelectorAll<HTMLSelectElement>(selector).forEach(select => { select.value = setting; });
  }

  doc.addEventListener('change', event => {
    const select = event.target as HTMLSelectElement | null;
    if (!select?.matches?.(selector) || !select.closest('#ozon-structure-root,#ozon-thread-sidebar,#o3ds-layer')) return;
    setting = normalize(select.value);
    try {
      win.localStorage.setItem(storageKey, setting);
    } catch {
      // Apply the selected theme even when storage is blocked.
    }
    applyTheme();
  });
  media?.addEventListener?.('change', applyTheme);
  win.addEventListener?.('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    try {
      if (event.storageArea && event.storageArea !== win.localStorage) return;
    } catch {
      return;
    }
    setting = normalize(event.newValue);
    applyTheme();
  });

  const controller = {
    control() {
      const choices: [ThemeSetting, string][] = [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как в системе']];
      return '<label class="ozon-theme-control"><span>Тема</span><select data-ozon-theme-setting aria-label="Тема виджета">' +
        choices.map(([value, label]) => '<option value="' + value + '"' + (value === setting ? ' selected' : '') + '>' + label + '</option>').join('') +
        '</select></label>';
    },
  };
  widgetWindow[stateKey] = controller;
  applyTheme();
  return controller;
}

/** Keep the authored light colors as fallbacks and resolve alternate colors in widget containers. */
export function themeWidgetColors(css: string): string {
  const colorProperties = /([\s{;])((?:background(?:-color|-image)?|color|border(?:-[a-z]+){0,3}|outline(?:-color)?|fill|stroke|caret-color|accent-color|scrollbar-color))(\s*:\s*)([^;{}]+)/gi;
  const colors = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\b(?:white|black)\b/gi;
  return css.replace(colorProperties, (declaration, prefix: string, property: string, separator: string, value: string) => {
    if (/url\s*\(/i.test(value)) return declaration;
    const name = property.toLowerCase();
    return prefix + property + separator + value.replace(colors, original => {
      let hex = original.toLowerCase().replace('#', '');
      if (hex === 'white') hex = 'ffffff';
      if (hex === 'black') hex = '000000';
      if (hex.length === 3) hex = [...hex].map(channel => channel.repeat(2)).join('');
      const red = parseInt(hex.slice(0, 2), 16);
      const green = parseInt(hex.slice(2, 4), 16);
      const blue = parseInt(hex.slice(4, 6), 16);
      const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2;
      const tint = red > green + 12 && red > blue + 10 ? (green > blue + 24 ? 'warning' : 'danger')
        : green > red + 10 && green > blue + 4 ? 'success'
        : red > green + 12 && blue > green + 16 ? 'violet'
        : blue >= 175 && blue > red + 20 && blue > green + 10 ? 'accent' : '';
      let role = 'text';
      if (name.startsWith('background')) {
        role = tint ? tint + '-surface' : lightness >= 253 ? 'surface' : lightness >= 237 ? 'raised' : lightness >= 222 ? 'hover' : 'canvas';
        if (tint === 'accent' && red >= 120 && red <= 216) role = 'accent-hover';
      } else if (name.startsWith('outline')) {
        role = 'focus';
      } else if (name === 'accent-color') {
        role = 'link';
      } else if (name === 'scrollbar-color') {
        role = 'muted-border';
      } else if (name.startsWith('border')) {
        role = tint && lightness < 185 ? (tint === 'accent' ? 'link' : tint + '-text') : 'border';
      } else {
        role = tint ? (tint === 'accent' ? 'link' : tint + '-text') : lightness >= 75 && lightness < 200 ? 'muted' : 'text';
      }
      return 'var(--ozon-fcrm-' + role + ', ' + original + ')';
    });
  });
}

const widgetSurfaces = ':is(#ozon-structure-root,#ozon-thread-sidebar,#o3ds-layer,#ozon-structure-toggle-btn,#ozon-links-snackbars,.ozon-component-editor,.ozon-sidebar-draft-overlay,.ozon-issue-tooltip,.o3ds-btn)';
const dark = 'html[data-ozon-fcrm-theme="dark"] ' + widgetSurfaces;

export const WIDGET_THEME_STYLES = `
.ozon-theme-control {
  display:inline-flex;align-items:center;gap:6px;flex:none;color:var(--ozon-fcrm-muted,#475569);
  font:600 11px var(--ozon-font-sans,system-ui,sans-serif);white-space:nowrap;
}
.ozon-theme-control select[data-ozon-theme-setting] {
  box-sizing:border-box;height:28px;max-width:100%;margin:0;padding:2px 5px;border:1px solid var(--ozon-fcrm-muted-border,#d7e0ec);
  border-radius:8px;background:var(--ozon-fcrm-input,#fff);color:var(--ozon-fcrm-text,#071026);font:inherit;cursor:pointer;
}
.ozon-theme-control select[data-ozon-theme-setting]:focus-visible {outline:2px solid var(--ozon-fcrm-focus,#005bff);outline-offset:2px}
.ozon-theme-tools {display:flex;align-items:center;gap:8px;flex:none}
#ozon-structure-root .ozon-ext-view-tabs > .ozon-theme-control {margin-left:auto}
#ozon-structure-root .ozon-ext-view-tabs > .ozon-theme-control + [data-toggle-fullscreen] {margin-left:0}
@media(max-width:540px) {
  .ozon-theme-control > span {display:none}
  #ozon-thread-sidebar .ozon-thread-head {gap:8px}
}
` + dark + ` {
  color-scheme:dark;
  --ozon-fcrm-canvas:#10161f;
  --ozon-fcrm-surface:#151d28;
  --ozon-fcrm-raised:#1b2736;
  --ozon-fcrm-hover:#263649;
  --ozon-fcrm-input:#111923;
  --ozon-fcrm-border:#33445b;
  --ozon-fcrm-muted-border:#607491;
  --ozon-fcrm-text:#edf4ff;
  --ozon-fcrm-muted:#b5c4d8;
  --ozon-fcrm-link:#8bb4ff;
  --ozon-fcrm-accent-surface:#243d61;
  --ozon-fcrm-accent-hover:#2a4165;
  --ozon-fcrm-success-surface:#1a372f;
  --ozon-fcrm-success-text:#8cdfbb;
  --ozon-fcrm-warning-surface:#3b2e20;
  --ozon-fcrm-warning-text:#ffd19a;
  --ozon-fcrm-danger-surface:#3a232c;
  --ozon-fcrm-danger-text:#ffa79e;
  --ozon-fcrm-violet-surface:#322843;
  --ozon-fcrm-violet-text:#d6beff;
  --ozon-fcrm-focus:#ff81bd;
  --ozon-label-action:var(--ozon-fcrm-link);
  --ozon-label-action-hover-veil:#1d2c43;
  --ozon-label-action-active-veil:var(--ozon-fcrm-accent-surface);
  --ozon-layer-surface:var(--ozon-fcrm-raised);
  --ozon-graphic-accent-primary:var(--ozon-fcrm-focus);
  --ozon-graphic-secondary:var(--ozon-fcrm-muted);
  --ozon-negative-bg:var(--ozon-fcrm-danger-surface);
  --ozon-negative-text:var(--ozon-fcrm-danger-text);
  --ozon-navy:var(--ozon-fcrm-text);
  --ozon-border:var(--ozon-fcrm-border);
  color:var(--ozon-fcrm-text);
}
` + dark + ` :is(input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),textarea,select):not(:disabled) {
  border-color:var(--ozon-fcrm-muted-border)!important;
  background-color:var(--ozon-fcrm-input)!important;
  color:var(--ozon-fcrm-text)!important;
}
` + dark + ` :is(input,textarea)::placeholder {color:var(--ozon-fcrm-muted);opacity:1}
` + dark + ` :is(button,a,input,textarea,select,summary,[role="separator"]):focus-visible {
  outline:2px solid var(--ozon-fcrm-focus)!important;
  outline-offset:2px;
}
` + dark + ` :is(.o3ds-answer,input,textarea,select) {color-scheme:dark}
html[data-ozon-fcrm-theme="dark"] #ozon-structure-root {background:var(--ozon-fcrm-canvas)!important}
` + dark + ` :is([style*="background:#fff;" i],[style*="background: #fff;" i],[style*="background:#ffffff;" i]) {
  background-color:var(--ozon-fcrm-surface)!important;
}
` + dark + ` :is([style*="background:#f8fafc" i],[style*="background:#f2f4f8" i],[style*="background:#f4f7fb" i]) {
  background-color:var(--ozon-fcrm-raised)!important;
}
` + dark + ` :is([style*="color:#071026" i],[style*="color:#0f172a" i],[style*="color:#334155" i]) {color:var(--ozon-fcrm-text)!important}
` + dark + ` :is([style*="color:#475569" i],[style*="color:#64748b" i],[style*="color:#94a3b8" i]) {color:var(--ozon-fcrm-muted)!important}
` + dark + ` [style*="color:#005bff" i] {color:var(--ozon-fcrm-link)!important}
` + dark + ` :is([style*="color:#d92d20" i],[style*="color:#dc2626" i],[style*="color:#b42318" i]) {color:var(--ozon-fcrm-danger-text)!important}
` + dark + ` :is([style*="background:#fff0ee" i],[style*="background:#fee2e2" i]) {background-color:var(--ozon-fcrm-danger-surface)!important}
` + dark + `.ozon-component-editor {background:var(--ozon-fcrm-surface)!important;color:var(--ozon-fcrm-text)!important}
` + dark + ` :is([style*="border:" i],[style*="border-bottom:" i],[style*="border-top:" i]):is([style*="#d7e0ec" i],[style*="#e2e8f0" i]) {
  border-color:var(--ozon-fcrm-border)!important;
}
` + dark + `.ozon-issue-tooltip {background:var(--ozon-fcrm-raised)!important;border:1px solid var(--ozon-fcrm-border)}
`;

