// Serialized into the extension and shared by both label editors.
export function bindJiraLabelSuggestions(input: HTMLInputElement | null) {
  if (!input || input.dataset.labelSuggestionsBound) return;
  input.dataset.labelSuggestionsBound = '1';
  const list = document.createElement('datalist');
  list.id = 'ozon-label-suggestions-' + Math.random().toString(36).slice(2);
  input.setAttribute('list', list.id);
  input.after(list);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sequence = 0;
  let controller: AbortController | undefined;
  input.addEventListener('input', () => {
    const query = input.value.trim();
    const current = ++sequence;
    clearTimeout(timer);
    controller?.abort();
    list.replaceChildren();
    if (!query) return;
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        const response = await fetch('/rest/api/1.0/labels/suggest?query=' + encodeURIComponent(query), {
          credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal
        });
        if (!response.ok) return;
        const raw = await response.text();
        let labels: string[] = [];
        try {
          const data = JSON.parse(raw);
          const suggestions = data?.suggestions || data?.suggestionListStruct?.suggestions || [];
          labels = (Array.isArray(suggestions) ? suggestions : [suggestions]).map((item: any) => typeof item === 'string' ? item : item?.label).filter(Boolean);
        } catch (_) {
          const xml = new DOMParser().parseFromString(raw, 'application/xml');
          labels = Array.from(xml.querySelectorAll('suggestions > label')).map(node => node.textContent || '').filter(Boolean);
        }
        if (current !== sequence || !input.isConnected || input.value.trim() !== query) return;
        [...new Set(labels)].forEach(label => { const option = document.createElement('option'); option.value = label; list.appendChild(option); });
      } catch (_) { /* A new label can still be entered if suggestions are unavailable. */ }
    }, 200);
  });
}
