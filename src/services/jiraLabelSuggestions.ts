// Serialized into the extension and shared by both label editors.
export function bindJiraLabelSuggestions(input: HTMLInputElement | null, options: {issueId?:string;known?:()=>string[];existing?:string[];progress?:(label:string)=>string} = {}) {
  if (!input || input.dataset.labelSuggestionsBound) return;
  input.dataset.labelSuggestionsBound = '1';
  const popup = document.createElement('div');
  const status = document.createElement('div');
  const list = document.createElement('div');
  popup.className = 'ozon-label-suggestions';
  popup.hidden = true;
  status.setAttribute('role','status');
  list.id = 'ozon-label-suggestions-' + Math.random().toString(36).slice(2);
  list.setAttribute('role','listbox');
  list.setAttribute('aria-label','Подсказки меток Jira');
  popup.append(status,list);
  input.after(popup);
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-controls',list.id);
  input.setAttribute('aria-expanded','false');
  const existing = new Set((options.existing || []).map(value=>value.toLowerCase()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let suggestions:string[]=[];
  let active=-1;

  function activate(index:number) {
    active=index;
    Array.from(list.children).forEach((item,i)=>item.setAttribute('aria-selected',String(i===index)));
    const selected=list.children[index];
    if (selected) {
      input!.setAttribute('aria-activedescendant',selected.id);
      selected.scrollIntoView({block:'nearest'});
    } else input!.removeAttribute('aria-activedescendant');
  }

  function close() {
    clearTimeout(timer);
    controller?.abort();
    popup.hidden=true;
    input!.setAttribute('aria-expanded','false');
    activate(-1);
  }

  function choose(index:number) {
    if (!suggestions[index]) return;
    input!.value=suggestions[index];
    close();
  }

  function show(labels:string[],message:string,pending=false) {
    const selected=suggestions[active];
    suggestions=labels;
    if (pending && options.progress) status.innerHTML=options.progress(message);
    else status.textContent=message;
    list.replaceChildren(...labels.map((label,index)=>{
      const option=document.createElement('div');
      option.id=list.id + '-' + index;
      option.setAttribute('role','option');
      option.setAttribute('aria-selected','false');
      option.textContent=label;
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(index));
      return option;
    }));
    activate(labels.indexOf(selected));
    popup.hidden=false;
    input!.setAttribute('aria-expanded','true');
  }

  function matches(labels:string[],query:string) {
    const key=query.toLowerCase();
    return [...new Map(labels.map(label=>[label.toLowerCase(),label])).values()]
      .filter(label=>label.toLowerCase().includes(key) && !existing.has(label.toLowerCase()))
      .sort((a,b)=>Number(!a.toLowerCase().startsWith(key))-Number(!b.toLowerCase().startsWith(key)) || a.localeCompare(b))
      .slice(0,12);
  }

  function readLabels(raw:string):string[] {
    try {
      const data=JSON.parse(raw);
      const values=data?.results ?? data?.suggestions ?? data?.suggestionListStruct?.suggestions;
      if (values == null) throw new Error('Unexpected label response');
      return (Array.isArray(values) ? values : [values]).map(item=>typeof item==='string' ? item : item?.label ?? item?.value)
        .filter((item):item is string=>typeof item==='string' && Boolean(item.trim())).map(item=>item.trim().replace(/^"(.*)"$/,'$1'));
    } catch (error) {
      if (!/^\s*</.test(raw)) throw error;
      const xml=new DOMParser().parseFromString(raw,'application/xml');
      if (xml.querySelector('parsererror') || !xml.querySelector('suggestionListStruct,suggestions,suggestion-list-struct')) throw error;
      return Array.from(xml.querySelectorAll('suggestions > label')).map(node=>node.textContent?.trim() || '').filter(Boolean);
    }
  }

  input.addEventListener('input',()=>{
    close();
    const query=input.value.trim();
    if (!query) return;
    const local=matches(options.known?.() || [],query);
    show(local,'Ищем метки в Jira…',true);
    const pending=new AbortController();
    controller=pending;
    timer=setTimeout(async ()=>{
      const issueId=String(options.issueId || '');
      const jql='/rest/api/2/jql/autocompletedata/suggestions?' + new URLSearchParams({fieldName:'labels',fieldValue:query});
      const native='/rest/api/1.0/labels/' + (/^\d+$/.test(issueId) ? issueId + '/' : '') + 'suggest?' + new URLSearchParams({query});
      let answered=false;
      let remote:string[]=[];
      for (const path of (/^\d+$/.test(issueId) ? [native,jql] : [jql,native])) {
        if (pending.signal.aborted || !input.isConnected) return;
        try {
          const signal=AbortSignal.any([pending.signal,AbortSignal.timeout(1300)]);
          const response=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'},signal});
          if (!response.ok) continue;
          remote=response.status===204 ? [] : readLabels(await response.text());
          answered=true;
          if (matches(remote,query).length) break;
        } catch (_) { /* Try the other Jira autocomplete endpoint. */ }
      }
      if (pending.signal.aborted || !input.isConnected || input.value.trim()!==query) return;
      const labels=matches([...remote,...local],query);
      show(labels,labels.length ? (answered ? '' : 'Показаны метки из загруженных задач.') : answered ? 'Совпадений нет. Можно добавить новую метку.' : 'Подсказки Jira недоступны. Метку можно ввести вручную.');
    },150);
  });
  input.addEventListener('blur',close);
  input.addEventListener('keydown',event=>{
    if (popup.hidden) return;
    const {key}=event;
    if (key==='Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if ((key==='ArrowDown' || key==='ArrowUp') && suggestions.length) {
      event.preventDefault();
      activate(Math.min(suggestions.length-1,Math.max(0,active+(key==='ArrowDown' ? 1 : -1))));
    } else if (key==='Enter' && active>=0) {
      event.preventDefault();
      event.stopPropagation();
      choose(active);
    }
  });
}
