import type {createJiraGroupingUi} from './jiraGroupingUi';

// Serialized into the extension. This view owns its data and does not modify the other dashboards.
export function createStrategicDashboard(onRender: () => void, renderBadge: (label: string, category: string) => string, version: string, priorityService?: any, configuredSprintField?: string, actions?: any, groupingUi?:ReturnType<typeof createJiraGroupingUi>) {
  const state = { issues: [] as any[], loading: false, loaded: false, error: '', notice:'', progress: '', expanded: new Set<string>(), search:'', component:'', issueType:'', issueTypeOpen:false, sort:'priority', sortOpen:false, hideCanceled:false, hideDone:false, onlyThemes:false, filterCollapsed:new Set<string>(), filterComponents:[] as string[], filtersLoading:false, filtersReady:false, filtersError:'', componentOpen:false, componentQuery:'', labelOpen:false, labelQuery:'', labelFilter:new Set<string>(), settings:false, editor:null as any };
  const escape = (value: any) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const collator = new Intl.Collator('ru', { numeric:true, sensitivity:'base' });
  const plurals = new Intl.PluralRules('ru');
  const columnTitles:Record<string,string> = {task:'Задача',status:'Статус',component:'Компонент',priority:'Приоритет',sprint:'Спринт',labels:'Метки',epic:'Epic Link',obproject:'Эпик OBPROJECT'};
  const legacyOrder=['type','key','summary','status','component','priority','sprint','labels','epic','obproject'];
  const defaultOrder = Object.keys(columnTitles);
  const defaultWidths:Record<string,number> = {task:540,status:115,component:160,priority:90,sprint:180,labels:150,epic:200,obproject:200};
  const defaultHidden = ['labels'];
  const layout = {order:[...defaultOrder],widths:{...defaultWidths},hidden:[...defaultHidden]};
  try { const saved=JSON.parse(localStorage.getItem('ozon-strategy-columns-v1') || 'null'); if (Array.isArray(saved?.order)) { const order=[...new Set<string>(saved.order.filter((id:any) => typeof id === 'string' && id in columnTitles && id !== 'task'))]; layout.order=['task',...order,...defaultOrder.filter(id => id !== 'task' && !order.includes(id))]; } if (Array.isArray(saved?.hidden)) { const hidden=saved.hidden.filter((id:any) => typeof id === 'string' && id in columnTitles && id !== 'task'); layout.hidden=[...new Set<string>(hidden)]; } if (saved?.widths) defaultOrder.forEach(id => { const n=Number(saved.widths[id]); if (Number.isFinite(n) && n>=60 && n<=1000) layout.widths[id]=n; }); } catch (_) { /* Settings remain in memory. */ }
  const saveLayout=() => { try { localStorage.setItem('ozon-strategy-columns-v1',JSON.stringify(layout)); } catch (_) { /* Storage can be unavailable. */ } };
  let settingsScroll=0;
  let treeDepth:number | null=null;
  const graphCache = new Map<string,any>();
  const invalidateGraph = () => { graphCache.clear(); };
  let searchTimer:any = null;
  const exactIssueKey = () => /^(?:https?:\/\/[^/]+\/browse\/)?(FCRM-\d+)(?:[/?#].*)?$/i.exec(state.search.trim())?.[1].toUpperCase() || '';
  let outsideBound=false;
  let request = 0;
  let firstPage:any[]=[];
  let previewLookup:AbortController | undefined;
  let sprintField = configuredSprintField || '';
  let epicField = '';
  let epicNameField = '';
  let sprintOptionsCache:any[] | null = null;
  let epicCatalogPromise:Promise<any[]> | null = null;
  const epicMetadata = new Map<string,any>();
  const obprojectMetadata = new Map<string,any>();
  const obprojectKeyOf = (value:any) => { const field=Array.isArray(value) ? value[0] : value; const raw=field && typeof field === 'object' ? field.key || field.value || field.name || field.url || '' : field || ''; return String(raw).toUpperCase().match(/OBPROJECT-\d+/)?.[0] || ''; };
  async function loadObprojectMetadata(issues:any[],generation:number) {
    const keys=[...new Set<string>(issues.map(issue => obprojectKeyOf(issue.fields?.customfield_20100)).filter(Boolean))];
    let updated=false;
    for (let i=0;i<keys.length;i+=100) {
      if (generation !== request) return;
      try {
        const batch = keys.slice(i,i+100);
        const params = new URLSearchParams({jql:'key in (' + batch.join(',') + ')',fields:'summary,status',maxResults:'100'});
        const response = await fetch('/rest/api/2/search?' + params.toString(),{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
        if (!response.ok) continue;
        const data = await response.json();
        if (generation !== request || !Array.isArray(data.issues)) return;
        batch.forEach(key => obprojectMetadata.delete(key));
        data.issues.forEach((issue:any) => {
          if (issue?.key) obprojectMetadata.set(issue.key,{summary:issue.fields?.summary || '',status:issue.fields?.status?.name || '',category:issue.fields?.status?.statusCategory?.key || ''});
        });
        updated=true;
      } catch (_) { /* Ключ доступен и без деталей эпика. */ }
    }
    if (updated && generation===request) onRender();
  }
  let fieldsDiscovered = false;
  const priorityIcon = (name:string) => priorityService?.icon ? priorityService.icon(name) : '';
  function parseSprint(value:any) {
    if (value && typeof value === 'object') return {...value,state:String(value.state || '').toLowerCase()};
    if (typeof value !== 'string') return null;
    const get = (name:string) => new RegExp('(?:\\[|,)' + name + '=([^,\\]]*)').exec(value)?.[1];
    return get('id') ? {id:get('id'),name:get('name'),state:String(get('state') || '').toLowerCase(),startDate:get('startDate')} : null;
  }
  function sprintValue(fields:any) {
    const asArray = (value:any) => value == null ? [] : Array.isArray(value) ? value : [value];
    const history = [...asArray(fields[sprintField]),...asArray(fields.sprint),...asArray(fields.closedSprints)].map(parseSprint).filter((item:any) => item?.name);
    return history.sort((a:any,b:any) => {
      const current = Number(/^(active|future)$/.test(a.state)) - Number(/^(active|future)$/.test(b.state));
      if (current) return current;
      const x=Date.parse(a.startDate || ''), y=Date.parse(b.startDate || '');
      return Number.isFinite(x) && Number.isFinite(y) && x !== y ? x-y : Number(a.id)-Number(b.id);
    }).at(-1);
  }
  async function loadEditableSprints() {
    if (sprintOptionsCache) return sprintOptionsCache;
    const all:any[]=[]; let start=0;
    while (true) {
      const board=String(actions?.boardId || '9349');
      const params=new URLSearchParams({state:'active,future',startAt:String(start),maxResults:'50'});
      const response=await fetch('/rest/agile/1.0/board/' + encodeURIComponent(board) + '/sprint?' + params.toString(),{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Не удалось загрузить спринты: HTTP ' + response.status);
      const data=await response.json(); if (!Array.isArray(data.values)) throw new Error('Jira вернула некорректный список спринтов');
      all.push(...data.values.filter((sprint:any) => sprint?.id && sprint.name && (!sprint.originBoardId || String(sprint.originBoardId) === board) && /^(active|future)$/i.test(sprint.state || '')));
      start+=data.values.length; if (!data.values.length || data.isLast === true || (Number.isFinite(Number(data.total)) && start >= Number(data.total))) break;
    }
    sprintOptionsCache=all.sort((a,b) => (String(a.state).toLowerCase() === 'active' ? 0 : 1) - (String(b.state).toLowerCase() === 'active' ? 0 : 1) || collator.compare(a.name,b.name)); return sprintOptionsCache;
  }
  async function saveSprint(key:string,sprint:any) {
    const issue=state.issues.find(item => item.key === key);
    if (!issue) throw new Error('Задача больше не найдена в таблице');
    if (/^(epic|эпик)$/i.test(issue.fields?.issuetype?.name || '')) throw new Error('Для эпиков нельзя изменить спринт');
    const url=sprint ? '/rest/agile/1.0/sprint/' + encodeURIComponent(sprint.id) + '/issue' : '/rest/agile/1.0/backlog/issue';
    const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({issues:[key]})});
    if (!response.ok) throw new Error('Не удалось изменить спринт: HTTP ' + response.status);
    try {
      const params=new URLSearchParams({fields:['sprint','closedSprints',sprintField].filter(Boolean).join(',')});
      const fresh=await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?' + params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
      if (!fresh.ok) throw new Error('Ошибка чтения'); const data=await fresh.json();
      if (!data.fields || (data.key && data.key !== key)) throw new Error('Некорректный ответ');
      const updated={...issue.fields,...data.fields};
      const raw=[...(Array.isArray(updated[sprintField]) ? updated[sprintField] : updated[sprintField] ? [updated[sprintField]] : []),...(Array.isArray(updated.sprint) ? updated.sprint : updated.sprint ? [updated.sprint] : [])].map(parseSprint).filter(Boolean);
      if (sprint && !raw.some((item:any) => String(item.id) === String(sprint.id))) throw new Error('Спринт ещё не появился');
      if (!sprint && raw.some((item:any) => /^(active|future)$/i.test(item.state || ''))) throw new Error('Задача ещё в спринте');
      issue.fields=updated; invalidateGraph();
      actions?.notify?.('Спринт задачи ' + key + ' обновлён.');
    } catch (_) { actions?.notify?.('Jira приняла изменение спринта задачи ' + key + ', но проверить его не удалось. Обновите задачи.'); }
  }
  function typeHtml(node:any) {
    const url = String(node.typeIcon || '');
    const icon = /^(?:https?:\/\/|\/)/i.test(url) ? '<img src="' + escape(url) + '" alt="">' : '<span style="color:#005BFF">●</span>';
    return '<span class="ozon-ext-type-pill">' + icon + ' ' + escape(node.type) + '</span>';
  }
  async function prepareFilters() {
    if (state.filtersLoading || state.filtersReady) return;
    state.filtersLoading = true; state.filtersError = ''; onRender();
    try { const response=await fetch('/rest/api/2/project/FCRM/components',{credentials:'same-origin',headers:{Accept:'application/json'}}); if (!response.ok) throw new Error('HTTP ' + response.status); const data=await response.json(); if (!Array.isArray(data)) throw new Error('Некорректный ответ Jira'); state.filterComponents=data.map((item:any) => item.name).filter(Boolean); state.filtersReady=true; }
    catch(error:any) { state.filtersError='Не удалось загрузить компоненты: ' + (error?.message || 'ошибка Jira'); }
    finally { state.filtersLoading=false; onRender(); }
  }
  async function load() {
    if (state.loading) return;
    const current = ++request;
    sprintOptionsCache = null;
    state.loading = true; state.error = ''; state.notice = ''; state.progress = 'Загружаем задачи проекта FCRM…';
    firstPage=[]; previewLookup?.abort();
    const began=performance.now();
    onRender();
    try {
      if (!fieldsDiscovered) { try { const response=await fetch('/rest/api/2/field',{credentials:'same-origin',headers:{Accept:'application/json'}}); if (response.ok) { const fields=await response.json(); sprintField=fields.find((field:any) => String(field.schema?.custom || '').includes('gh-sprint'))?.id || fields.find((field:any) => /^(sprint|спринт)$/i.test(String(field.name || '').trim()))?.id || sprintField; epicField=fields.find((field:any) => field.schema?.custom === 'com.pyxis.greenhopper.jira:gh-epic-link')?.id || fields.find((field:any) => /^(epic link|ссылка на эпик)$/i.test(String(field.name || field.untranslatedName || '').trim()))?.id || ''; epicNameField=fields.find((field:any) => field.schema?.custom === 'com.pyxis.greenhopper.jira:gh-epic-label')?.id || ''; fieldsDiscovered=true; } } catch (_) { /* Other data is still available. */ } }
      const issues: any[] = [];
      const seen = new Set<string>();
      async function page(startAt:number) {
        const query = new URLSearchParams({jql:'project = FCRM ORDER BY key ASC', fields:['summary','issuetype','status','components','labels','issuelinks','priority','created','sprint','closedSprints','epic','customfield_20100',epicField,sprintField].filter(Boolean).join(','), startAt:String(startAt), maxResults:'100'});
        const response = await fetch('/rest/api/2/search?' + query.toString(), {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
        if (!response.ok) throw new Error('Jira вернула HTTP ' + response.status);
        const data = await response.json();
        if (!Array.isArray(data.issues) || !Number.isFinite(Number(data.total)) || (data.startAt != null && Number(data.startAt)!==startAt)) throw new Error('Jira вернула неполный список задач');
        return data as {issues:any[];total:number};
      }
      let start=0, total=0;
      function append(data:Awaited<ReturnType<typeof page>>) {
        total=Number(data.total);
        if (!data.issues.length && start<total) throw new Error('Jira вернула неполную страницу задач');
        for (const issue of data.issues) {
          if (!/^FCRM-\d+$/i.test(String(issue?.key || '')) || seen.has(issue.key)) continue;
          seen.add(issue.key);
          issues.push(issue);
        }
        start+=data.issues.length;
        state.progress = 'Загружено ' + Math.min(start, total) + ' из ' + total + ' задач…';
        const progress=document.getElementById('ozon-strategy-progress');
        if (progress) progress.textContent=state.progress;
      }
      const first=await page(0);
      if (current!==request) return;
      append(first);
      performance.measure('FCRM стратегия · первая страница',{start:began,end:performance.now()});
      if (!state.loaded && start<total) {
        firstPage=issues.slice();
        onRender();
        void lookupPreviewIssue();
      }
      let step=start || 100;
      while (start<total) {
        const offsets=[start,start+step,start+step*2].filter(offset=>offset<total);
        const pages=await Promise.all(offsets.map(page));
        if (current!==request) return;
        for (let i=0;i<pages.length && start<total && start===offsets[i];i++) {
          append(pages[i]);
          if (pages[i].issues.length && pages[i].issues.length!==step) step=pages[i].issues.length;
        }
      }
      performance.measure('FCRM стратегия · загрузка задач',{start:began,end:performance.now()});
      state.issues = issues; invalidateGraph(); state.loaded = true; void loadObprojectMetadata(issues,current);
    } catch (error:any) { if (current === request) state.error = error?.message || 'Не удалось загрузить задачи'; }
    finally {
      if (current===request) {
        previewLookup?.abort();
        firstPage=[];
        state.loading=false; state.progress='';
        const renderStart=performance.now();
        onRender();
        if (!state.error) performance.measure('FCRM стратегия · построение таблицы',{start:renderStart,end:performance.now()});
      }
    }
  }

  async function lookupPreviewIssue() {
    previewLookup?.abort();
    const key=exactIssueKey();
    if (state.loaded || !state.loading || !firstPage.length || !key || firstPage.some(issue=>issue.key===key)) return;
    const controller=new AbortController();
    previewLookup=controller;
    try {
      const response=await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=summary,issuetype,status,components,labels,priority,created',{credentials:'same-origin',signal:controller.signal});
      if (!response.ok) return;
      const issue=await response.json();
      if (!controller.signal.aborted && state.loading && key===exactIssueKey() && issue?.key===key) {
        firstPage=[...firstPage,issue];
        onRender();
      }
    } catch (_) { /* The full search is available when the pages finish loading. */ }
  }
  function buildGraph(onlyThemes = false, includeEpic = false) {
    const cacheKey = [onlyThemes, includeEpic, state.hideCanceled, state.hideDone, state.sort].join('|');
    if (graphCache.has(cacheKey)) return graphCache.get(cacheKey);
    const nodes = new Map<string, any>();
    const allIssuesByKey = new Map(state.issues.map(issue => [issue.key,issue]));
    state.issues.forEach(raw => {
      const f = raw.fields || {};
      if (onlyThemes && !(f.labels || []).some((label:any) => String(label).toLowerCase() === 'fcrm_umb_epic')) return;
      const isCanceled=/cancel|отмен|отклон|rejected/i.test(String(f.status?.name || ''));
      if ((state.hideCanceled && isCanceled) || (state.hideDone && !isCanceled && (f.status?.statusCategory?.key === 'done' || /^(готово|закрыт[ао]?|done|closed)$/i.test(String(f.status?.name || '').trim())))) return;
      nodes.set(raw.key, { key:raw.key, summary:f.summary || raw.key, type:f.issuetype?.name || 'Задача', typeIcon:f.issuetype?.iconUrl || '', sprint:sprintValue(f), status:f.status?.name || 'Не указан', category:f.status?.statusCategory?.key || '', componentNames:(f.components || []).map((component:any) => component.name).filter(Boolean), components:(f.components || []).map((component:any) => component.name).filter(Boolean).join(', ') || 'Без компонента', priority:f.priority?.name || 'Не указан', created:f.created || '', obproject:'', epicKey:String((typeof f[epicField] === 'string' ? f[epicField] : f[epicField]?.key || f[epicField]?.value) || f.epic?.key || ''), labels:Array.isArray(f.labels) ? f.labels : [], thematic:(f.labels || []).some((label:any) => String(label).toLowerCase() === 'fcrm_umb_epic'), parents:new Set<string>(), missingParents:new Set<string>(), children:new Set<string>(), links:f.issuelinks || [] });
    });
    nodes.forEach(node => { const raw=allIssuesByKey.get(node.key); const source=/^(epic|эпик)$/i.test(node.type) ? raw : allIssuesByKey.get(node.epicKey); node.obproject=obprojectKeyOf(source?.fields?.customfield_20100); });
    nodes.forEach(node => node.links.forEach((link:any) => {
      const inward = Boolean(link.inwardIssue);
      const target = inward ? link.inwardIssue : link.outwardIssue;
      const direction = inward ? link.type?.inward : link.type?.outward;
      if (!target?.key || !/^FCRM-\d+$/i.test(target.key) || !/задача проекта|project task/i.test(String(direction || ''))) return;
      if (!nodes.has(target.key)) { if (!allIssuesByKey.has(target.key)) node.missingParents.add(target.key); return; }
      node.parents.add(target.key); nodes.get(target.key).children.add(node.key);
    }));
    if (includeEpic) nodes.forEach(node => {
      const epic = nodes.get(node.epicKey);
      if (!epic || epic.key === node.key || !/^(epic|эпик)$/i.test(epic.type)) return;
      node.parents.add(epic.key); epic.children.add(node.key);
    });
    const rank = (name:string) => /highest|blocker|critical|крит|блок|наивыс/i.test(name) ? 0 : /high|высок/i.test(name) ? 1 : /medium|normal|standard|средн|стандарт|обычн/i.test(name) ? 2 : /low|низк/i.test(name) ? 3 : 4;
    const compare = (a:string,b:string) => { const x=nodes.get(a),y=nodes.get(b); const dateX=Date.parse(x.created),dateY=Date.parse(y.created); const order=state.sort === 'created' ? (Number.isFinite(dateY) ? dateY : 0) - (Number.isFinite(dateX) ? dateX : 0) : rank(x.priority)-rank(y.priority); return order || collator.compare(x.summary,y.summary) || collator.compare(a,b); };
    const roots = [...nodes.values()].filter(node => !node.parents.size).map(node => node.key).sort(compare);
    const visited = new Set<string>();
    const mark = (start:string) => { const pending = [start]; while (pending.length) { const key = pending.pop()!; if (visited.has(key)) continue; visited.add(key); nodes.get(key).children.forEach((child:string) => pending.push(child)); } };
    roots.forEach(mark);
    const cycles: string[] = [];
    [...nodes.keys()].filter(key => !visited.has(key)).sort(compare).forEach(key => { if (!visited.has(key)) { cycles.push(key); mark(key); } });
    const parentsLeft=new Map([...nodes].map(([key,node])=>[key,node.parents.size]));
    const depths=new Map<string,number>();
    const pending=[...roots];
    let maxDepth=0;
    for (let index=0;index<pending.length;index++) {
      const key=pending[index], depth=depths.get(key) || 0;
      maxDepth=Math.max(maxDepth,depth);
      for (const child of nodes.get(key).children) {
        depths.set(child,Math.max(depths.get(child) || 0,depth+1));
        const left=parentsLeft.get(child)!-1;
        parentsLeft.set(child,left);
        if (!left) pending.push(child);
      }
    }
    const graph={nodes, roots, cycles, compare, maxDepth}; graphCache.set(cacheKey,graph); return graph;
  }
  function depthControl() {
    const maxDepth=state.loaded ? Math.min(40,buildGraph(state.onlyThemes,true).maxDepth) : 0;
    const options=[{value:'0',label:'Верхний уровень'},...Array.from({length:Math.max(0,maxDepth-1)},(_,index)=>({value:String(index+1),label:'Уровень ' + (index+2)})),{value:'all',label:'Все уровни'}];
    return groupingUi?.depthHtml('strategy',options,treeDepth === null ? 'manual' : treeDepth >= maxDepth && treeDepth>0 ? 'all' : String(treeDepth),!state.loaded || state.loading) || '';
  }
  function html() {
    const header = '<header class="ozon-ext-header-bar"><strong>Стратегическое планирование FCRM</strong><div class="ozon-strategy-actions"><span class="ozon-dev-version">v' + escape(version) + '</span></div></header>';
    const availableComponents = [...new Set([...state.filterComponents,...state.issues.flatMap((issue:any) => (issue.fields?.components || []).map((component:any) => component.name).filter(Boolean))])].sort((a:any,b:any) => collator.compare(a,b));
    const componentOptions = [{value:'',label:'Все компоненты'},{value:'__none__',label:'Без компонента'},...availableComponents.map((name:any) => ({value:name,label:name}))];
    const chosen = componentOptions.find(option => option.value === state.component)?.label || 'Все компоненты';
    const componentCombo = '<div class="ozon-ext-toolbar-combo"><button type="button" class="ozon-ext-toolbar-trigger" data-strategy-action="component-menu" aria-expanded="' + state.componentOpen + '" aria-label="Фильтр по компоненту"><span class="ozon-ext-toolbar-label">Компонент: ' + escape(chosen) + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.componentOpen ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover"><input id="ozon-strategy-component-search" type="search" placeholder="Поиск компонента…" value="' + escape(state.componentQuery) + '"><div class="ozon-dev-filter-list">' + componentOptions.filter(option => option.label.toLowerCase().includes(state.componentQuery.trim().toLowerCase())).map(option => '<button type="button" class="ozon-ext-combo-item ' + (state.component === option.value ? 'active' : '') + '" data-strategy-action="component-pick" data-value="' + escape(option.value) + '">' + escape(option.label) + '</button>').join('') + '</div></div>' : '') + '</div>';
    const issueTypes = [...new Set<string>(state.issues.map((issue:any) => String(issue.fields?.issuetype?.name || 'Задача'))) ].sort((a,b) => collator.compare(a,b));
    const typeCombo = '<div class="ozon-ext-toolbar-combo"><button type="button" class="ozon-ext-toolbar-trigger" data-strategy-action="type-menu" aria-expanded="' + state.issueTypeOpen + '" aria-label="Фильтр по типу задачи"><span class="ozon-ext-toolbar-label">Тип задачи: ' + escape(state.issueType || 'Все') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.issueTypeOpen ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover"><div class="ozon-dev-filter-list">' + [{value:'',label:'Все'},...issueTypes.map(value => ({value,label:value}))].map(option => '<button type="button" class="ozon-ext-combo-item ' + (state.issueType === option.value ? 'active' : '') + '" data-strategy-action="type-pick" data-value="' + escape(option.value) + '">' + escape(option.label) + '</button>').join('') + '</div></div>' : '') + '</div>';
    const labels = [...new Set<string>(state.issues.flatMap(issue => Array.isArray(issue.fields?.labels) ? issue.fields.labels : []))].sort(collator.compare);
    const labelOptions = [{value:'',name:'Без меток'}, ...labels.map(label => ({value:label,name:label}))];
    const labelMatches = labelOptions.filter(option => option.name.toLowerCase().includes(state.labelQuery.trim().toLowerCase()));
    const selectedLabels = [...state.labelFilter];
    const labelCaption = selectedLabels.length > 1 ? 'Выбрано: ' + selectedLabels.length : selectedLabels.length ? selectedLabels[0] || 'Без меток' : 'Все';
    const labelCombo = '<div class="ozon-ext-toolbar-combo"><button type="button" class="ozon-ext-toolbar-trigger" aria-expanded="' + state.labelOpen + '" data-strategy-action="label-menu" aria-label="Фильтр по меткам"><span class="ozon-ext-toolbar-label">Метки: ' + escape(labelCaption) + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' +
      (state.labelOpen ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ozon-strategy-label-popover" role="group" aria-label="Выбор меток"><input id="ozon-strategy-label-search" type="search" aria-label="Поиск метки" placeholder="Поиск метки…" value="' + escape(state.labelQuery) + '"><div class="ozon-dev-filter-list"><button type="button" class="ozon-ext-combo-item" data-strategy-action="labels-clear" ' + (selectedLabels.length ? '' : 'disabled') + '>Все задачи</button>' +
        (labelMatches.length ? labelMatches.map(option => '<label class="ozon-strategy-label-option"><input type="checkbox" data-strategy-label-filter="' + escape(option.value) + '"' + (state.labelFilter.has(option.value) ? ' checked' : '') + '><span>' + escape(option.name) + '</span></label>').join('') : '<p class="ozon-ext-toolbar-empty">Метки не найдены</p>') + '</div>' +
        (selectedLabels.length > 1 ? '<p class="ozon-dev-menu-hint">Подходит хотя бы один выбранный вариант</p>' : '') + '</div>' : '') + '</div>';
    const filters = '<div class="ozon-strategy-filters"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="settings-open"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg> Настройки</button><button type="button" class="ozon-ext-btn" data-strategy-action="reload" ' + (state.loading ? 'disabled' : '') + '>' + (state.loaded ? 'Обновить задачи' : 'Загрузить задачи') + '</button><input id="ozon-strategy-search" type="search" placeholder="Поиск по ключу или названию" aria-label="Поиск по ключу или названию" value="' + escape(state.search) + '">' + componentCombo + typeCombo + labelCombo + depthControl() + '<div class="ozon-ext-toolbar-combo"><button type="button" class="ozon-ext-toolbar-trigger" data-strategy-action="sort-menu" aria-expanded="' + state.sortOpen + '"><span class="ozon-ext-toolbar-label">Сортировка: ' + (state.sort === 'created' ? 'Сначала новые' : 'Приоритет') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.sortOpen ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover"><button class="ozon-ext-combo-item" data-strategy-action="sort-pick" data-value="priority">Приоритет</button><button class="ozon-ext-combo-item" data-strategy-action="sort-pick" data-value="created">Дата: сначала новые</button></div>' : '') + '</div><button type="button" class="ozon-ext-btn ' + (state.hideCanceled ? '' : 'ozon-ext-btn-surface') + '" data-strategy-action="hide-canceled" aria-pressed="' + state.hideCanceled + '">Скрыть отменённые</button><button type="button" class="ozon-ext-btn ' + (state.hideDone ? '' : 'ozon-ext-btn-surface') + '" data-strategy-action="hide-done" aria-pressed="' + state.hideDone + '">Скрыть выполненные</button><button type="button" class="ozon-ext-btn ' + (state.onlyThemes ? '' : 'ozon-ext-btn-surface') + '" data-strategy-action="only-themes" aria-pressed="' + state.onlyThemes + '">Только тематики</button>' + ((state.search || state.component || state.issueType || state.labelFilter.size || state.onlyThemes || state.hideCanceled || state.hideDone) ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="reset-filters">Сбросить фильтры</button>' : '') + (state.loaded ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="create">+ Создать тематику</button>' : '') + '</div>' + (state.notice && !actions?.notify ? '<div class="ozon-strategy-notice" role="status">' + escape(state.notice) + ' <button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="dismiss-notice" aria-label="Закрыть уведомление">✕</button></div>' : '') + (state.filtersError ? '<div class="ozon-strategy-message" role="alert">' + escape(state.filtersError) + ' <button type="button" class="ozon-ext-btn" data-strategy-action="retry-filters">Повторить</button></div>' : '');
    const visibleColumns = layout.order.filter(id => !layout.hidden.includes(id));
    const settings = state.settings ? '<aside class="ozon-dev-settings ozon-dev-settings-stable ozon-strategy-settings" role="dialog" aria-label="Настройки таблицы"><header class="ozon-dev-editor-head"><strong>Настройки таблицы</strong><button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="settings-cancel" data-strategy-action="settings-close" aria-label="Закрыть">✕</button></header><strong>Порядок столбцов</strong><p class="ozon-dev-menu-hint">Ширину можно менять за границу заголовка таблицы.</p>' + (groupingUi?.html('strategy-columns',layout.order,columnTitles,'data-strategy-column-visible',{hidden:layout.hidden,locked:['task']}) || '') + '<footer><button class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="columns-reset">По умолчанию</button><button class="ozon-ext-btn" data-strategy-action="settings-close">Готово</button></footer></aside>' : '';
    const progress = state.loading ? '<div class="ozon-strategy-message" role="status"><span id="ozon-strategy-progress">' + escape(state.progress) + '</span>' + (state.loaded ? '<span> Показана предыдущая загрузка.</span>' : '') + '</div>' : '';
    const error = state.error ? '<div class="ozon-strategy-message" role="alert">Не удалось загрузить все задачи FCRM: ' + escape(state.error) + '. <button type="button" class="ozon-ext-btn" data-strategy-action="reload">Повторить</button></div>' : '';
    if (state.loading && !state.loaded) {
      const query=state.search.trim().toLowerCase();
      const exact=exactIssueKey();
      const initial=firstPage.filter(issue=>{
        const f=issue.fields || {};
        const components=(f.components || []).map((component:any)=>component.name);
        const labels=f.labels || [];
        const canceled=/cancel|отмен|отклон|rejected/i.test(f.status?.name || '');
        const done=f.status?.statusCategory?.key==='done' || /^(готово|закрыт[ао]?|done|closed)$/i.test(f.status?.name || '');
        return (exact ? issue.key===exact : !query || (issue.key + ' ' + (f.summary || '')).toLowerCase().includes(query)) &&
          (!state.component || (state.component==='__none__' ? !components.length : components.includes(state.component))) &&
          (!state.issueType || state.issueType===f.issuetype?.name) && (!state.onlyThemes || labels.includes('fcrm_umb_epic')) &&
          (!state.labelFilter.size || (!labels.length && state.labelFilter.has('')) || labels.some((label:string)=>state.labelFilter.has(label))) &&
          !(state.hideCanceled && canceled) && !(state.hideDone && done && !canceled);
      });
      const previewRows=initial.map(issue=>'<tr><td><a class="ozon-mono" href="/browse/' + encodeURIComponent(issue.key) + '" target="_blank" rel="noopener noreferrer">' + escape(issue.key) + '</a> ' + escape(issue.fields?.summary || '') + '</td><td>' + renderBadge(escape(issue.fields?.status?.name || '—'),issue.fields?.status?.statusCategory?.key || '') + '</td></tr>').join('');
      const preview=firstPage.length ? '<div class="ozon-strategy-description">Доступна часть задач. Связи появятся после загрузки.</div><div class="ozon-strategy-scroll"><table class="ozon-strategy-table ozon-strategy-preview"><thead><tr><th>Задача</th><th>Статус</th></tr></thead><tbody>' + (previewRows || '<tr><td colspan="2">Продолжаем поиск в остальных задачах…</td></tr>') + '</tbody></table></div>' : '<div class="ozon-strategy-message">' + Array.from({length:5},()=>'<div class="ozon-ext-skeleton" style="height:25px;margin:10px 0"></div>').join('') + '</div>';
      return '<section class="ozon-strategy-dashboard">' + header + filters + progress + preview + settings + '</section>';
    }
    if (state.error && !state.loaded) return '<section class="ozon-strategy-dashboard">' + header + filters + error + settings + '</section>';
    if (!state.loaded) return '<section class="ozon-strategy-dashboard">' + header + filters + '<div class="ozon-strategy-message">Выберите фильтры и нажмите «Загрузить задачи». Для сохранения иерархии загружаются все задачи FCRM.</div>' + settings + '</section>';
    const {nodes, roots, cycles, compare} = buildGraph(state.onlyThemes, true);
    const filter = state.search.trim().toLowerCase();
    const exact = exactIssueKey();
    const filtering = Boolean(filter || state.component || state.issueType || state.labelFilter.size);
    const relevant = new Set<string>();
    const matches = new Set<string>();
    if (filtering) {
      const pending:string[] = [];
      nodes.forEach((node:any) => { if ((exact ? node.key === exact : !filter || (node.key + ' ' + node.summary).toLowerCase().includes(filter)) && (!state.component || (state.component === '__none__' ? !node.componentNames.length : node.componentNames.includes(state.component))) && (!state.issueType || node.type === state.issueType) && (!state.labelFilter.size || (state.labelFilter.has('') && !node.labels.length) || node.labels.some((label:string) => state.labelFilter.has(label)))) { pending.push(node.key); matches.add(node.key); } });
      while (pending.length) { const key = pending.pop()!; if (relevant.has(key)) continue; relevant.add(key); nodes.get(key).parents.forEach((parent:string) => pending.push(parent)); }
    }
    const visible = (key:string) => !filtering || relevant.has(key);
    const descendantCounts = new Map<string,number>();
    const countDescendants = (key:string) => {
      if (descendantCounts.has(key)) return descendantCounts.get(key)!;
      const seen = new Set<string>([key]);
      const pending = [...nodes.get(key).children] as string[];
      while (pending.length) {
        const child = pending.pop()!;
        if (seen.has(child) || !visible(child)) continue;
        seen.add(child);
        nodes.get(child).children.forEach((next:string) => pending.push(next));
      }
      const count = seen.size - 1;
      descendantCounts.set(key,count);
      return count;
    };
    const rootThemes = roots.filter(key => visible(key) && (nodes.get(key).thematic || nodes.get(key).children.size));
    const unlinked = roots.filter(key => visible(key) && !nodes.get(key).thematic && !nodes.get(key).children.size);
    const renderGroup = (title:string, keys:string[]) => {
      if (!keys.length) return '';
      let result = '<tr class="ozon-strategy-group"><td colspan="' + visibleColumns.length + '">' + escape(title) + ' <span class="ozon-ext-group-total">' + keys.length + '</span></td></tr>';
      const pending = keys.slice().reverse().map(key => ({key, path:key, ancestors:new Set<string>(), depth:0}));
      while (pending.length) {
        const item = pending.pop()!; const node = nodes.get(item.key); const cycle = item.ancestors.has(item.key); const parentKey = item.path.split('|').at(-2) || ''; const epicRelation = Boolean(parentKey && node.epicKey === parentKey); const projectRelation=Boolean(parentKey && node.links.some((link:any) => { const inward=Boolean(link.inwardIssue); const target=inward ? link.inwardIssue : link.outwardIssue; const direction=inward ? link.type?.inward : link.type?.outward; return target?.key === parentKey && /задача проекта|project task/i.test(String(direction || '')); })); const contextOnly=filtering && !matches.has(item.key);
        const children = [...node.children].filter((key:any) => visible(key)).sort(compare);
        const exactMatch = !cycle && node.key === exact && matches.has(node.key);
        const expanded = !cycle && !state.filterCollapsed.has(item.path) && (state.expanded.has(item.path) || (treeDepth===null ? Boolean(exact && contextOnly) : item.depth < treeDepth));
        const toggle = children.length && !cycle ? '<button type="button" class="ozon-strategy-toggle" data-strategy-action="toggle" data-path="' + escape(item.path) + '" aria-expanded="' + expanded + '" aria-label="' + (expanded ? 'Свернуть ' : 'Развернуть ') + escape(node.key) + '">' + (expanded ? '▾' : '▸') + '</button>' : '<span class="ozon-strategy-toggle-spacer"></span>';
        const category = node.category === 'done' ? 'done' : node.category === 'indeterminate' ? 'progress' : 'todo';
        const epic = node.epicKey ? (nodes.get(node.epicKey) || epicMetadata.get(node.epicKey)) : null;
        const epicValue = node.epicKey ? '<div class="ozon-dev-epic-inline"><a class="ozon-mono" href="https://jit.o3.ru/browse/' + encodeURIComponent(node.epicKey) + '" target="_blank" rel="noopener noreferrer">' + escape(node.epicKey) + '</a>' + (epic ? ' ' + renderBadge(escape(epic.status),epic.category === 'done' ? 'done' : epic.category === 'indeterminate' ? 'progress' : 'todo') + ' <span title="' + escape(epic.summary) + '">' + escape(epic.summary) + '</span>' : '') + '</div>' : '—';
        const ob=obprojectMetadata.get(node.obproject);
        const obCell = node.obproject ? '<div class="ozon-dev-epic-inline"><a class="ozon-mono" href="https://jit.o3.ru/browse/' + encodeURIComponent(node.obproject) + '" target="_blank" rel="noopener noreferrer">' + escape(node.obproject) + '</a>' + (ob?.status ? renderBadge(escape(ob.status),ob.category === 'done' ? 'done' : ob.category === 'indeterminate' ? 'progress' : 'todo') : '') + (ob?.summary ? '<span title="' + escape(ob.summary) + '">' + escape(ob.summary) + '</span>' : '') + '</div>' : '—';
        const epicCell = '<div class="ozon-dev-cell-edit ozon-dev-epic-inline"><span class="ozon-strategy-epic-value">' + epicValue + '</span><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="edit-epic" data-key="' + escape(node.key) + '" aria-label="Изменить эпик ' + escape(node.key) + '">▾</button></div>';
        const rowHtml = '<tr class="ozon-strategy-depth-' + (item.depth % 2) + '" data-strategy-path="' + escape(item.path) + '" data-strategy-expandable="' + Boolean(children.length && !cycle) + '"><td><div class="ozon-strategy-type" style="padding-left:' + (Math.min(item.depth,40) * 18 + 8) + 'px">' + toggle + typeHtml(node) + '</div></td><td><div class="ozon-strategy-key"><a href="https://jit.o3.ru/browse/' + encodeURIComponent(node.key) + '" target="_blank" rel="noopener noreferrer" class="ozon-mono">' + escape(node.key) + '</a><details class="ozon-strategy-copy-menu"><summary aria-label="Копировать ' + escape(node.key) + '" title="Копировать"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h4"/></svg></summary><div class="ozon-strategy-copy-options"><button type="button" data-strategy-action="copy" data-key="' + escape(node.key) + '">Ссылка и название</button><button type="button" data-strategy-action="copy-key" data-key="' + escape(node.key) + '">Только ключ</button></div></details><button type="button" class="ozon-strategy-link-button" data-strategy-action="link" data-key="' + escape(node.key) + '" title="Связать с тематикой" aria-label="Связать ' + escape(node.key) + ' с тематикой">⛓</button></div></td><td><span class="ozon-strategy-indent" style="width:' + (Math.min(item.depth, 8) * 12) + 'px" aria-hidden="true">' + (item.depth ? '↳' : '') + '</span>' + (epicRelation ? '<span class="ozon-strategy-epic-relation" title="Задача входит в эпик по Epic Link">Epic Link</span> ' : '') + (node.thematic ? '<span class="ozon-ext-badge ozon-ext-badge-progress">Тематика</span> ' : '') + '<span title="' + escape(node.summary) + '">' + escape(node.summary) + '</span> <button type="button" class="ozon-ext-inner-ctrl ozon-ext-open-sb-btn" data-strategy-action="details" data-key="' + escape(node.key) + '">Детали</button>' + (cycle ? ' <span class="ozon-strategy-warning">Циклическая связь</span>' : '') + (node.missingParents.size ? ' <span class="ozon-strategy-warning" title="' + escape([...node.missingParents].join(', ')) + '">Тематика недоступна</span>' : '') + '</td><td>' + renderBadge(escape(node.status),category) + '</td><td><button type="button" class="ozon-strategy-component-edit" data-strategy-action="edit-component" data-key="' + escape(node.key) + '" aria-label="Изменить компонент ' + escape(node.key) + '" title="' + escape(node.components) + '"><span>' + escape(node.components) + '</span><span aria-hidden="true">▾</span></button></td><td><button type="button" class="ozon-dev-priority-edit" data-strategy-action="priority" data-key="' + escape(node.key) + '" title="Приоритет: ' + escape(node.priority) + '" aria-label="Изменить приоритет ' + escape(node.key) + '">' + priorityIcon(node.priority) + '</button></td><td><div class="ozon-strategy-sprint ' + (/^(epic|эпик)$/i.test(node.type) ? 'ozon-strategy-sprint-locked' : 'ozon-strategy-sprint-edit') + '" ' + (/^(epic|эпик)$/i.test(node.type) ? 'title="У эпиков нельзя изменить спринт"' : 'role="button" tabindex="0" data-strategy-action="edit-sprint" data-key="' + escape(node.key) + '" aria-label="Изменить спринт ' + escape(node.key) + '"') + '>' + (node.sprint?.name ? '<span title="' + escape(node.sprint.name) + '">' + escape(node.sprint.name) + '</span>' + renderBadge(node.sprint.state === 'active' ? 'Активный' : node.sprint.state === 'future' ? 'Будущий' : 'Прошедший', node.sprint.state === 'active' ? 'done' : node.sprint.state === 'future' ? 'progress' : 'todo') : '—') + '</div></td><td><div class="ozon-strategy-labels">' + node.labels.map((label:string) => '<span class="ozon-strategy-label">' + escape(label) + '<button type="button" data-strategy-action="remove-label" data-key="' + escape(node.key) + '" data-label="' + escape(label) + '" aria-label="Удалить метку ' + escape(label) + '">×</button></span>').join('') + '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-strategy-action="labels" data-key="' + escape(node.key) + '" aria-label="Добавить метку">+</button></div></td><td>' + epicCell + '</td><td>' + obCell + '</td></tr>';
        const cells = rowHtml.match(/<td>[\s\S]*?<\/td>/g) || [];
        const inner=(index:number) => (cells[index] || '').replace(/^<td>|<\/td>$/g,'');
        const descendantCount = children.length && !cycle ? countDescendants(node.key) : 0;
        const countHtml = descendantCount ? '<span class="ozon-strategy-descendant-count" title="Уникальные вложенные задачи с учётом фильтров" aria-label="Вложенных задач: ' + descendantCount + '">' + descendantCount + '</span>' : '';
        const taskCell='<td class="ozon-strategy-task-cell"><div class="ozon-strategy-task-line">' + '<span style="padding-left:' + (Math.min(item.depth,40) * 18 + 8) + 'px">' + toggle + '</span>' + inner(1) + typeHtml(node) + inner(5) + '<div class="ozon-strategy-task-summary">' + inner(2).replace(/<span class="ozon-strategy-indent"[^>]*>[^<]*<\/span>/,'') + (projectRelation ? ' <span class="ozon-strategy-relation" title="Связь «Задача проекта»">Задача проекта</span>' : '') + (contextOnly ? ' <span class="ozon-strategy-context-label">Родитель для контекста</span>' : '') + '</div>' + countHtml + '</div></td>';
        result += rowHtml.slice(0,rowHtml.indexOf('<td>')).replace('" data-strategy-path=', (contextOnly ? ' ozon-strategy-context' : '') + (exactMatch ? ' ozon-strategy-exact-match' : '') + '" data-strategy-path=') + visibleColumns.map(id => id === 'task' ? taskCell : cells[legacyOrder.indexOf(id)] || '').join('') + '</tr>';
        if (expanded) { const ancestors = new Set(item.ancestors); ancestors.add(item.key); children.reverse().forEach((key:string) => pending.push({key,path:item.path + '|' + key,ancestors,depth:item.depth + 1})); }
      }
      return result;
    };
    const taskCount = filtering ? matches.size : nodes.size;
    const taskNoun = ({one:'задача',few:'задачи',many:'задач'} as Record<string,string>)[plurals.select(taskCount)] || 'задач';
    const rows = renderGroup('Тематики и их задачи', rootThemes) + renderGroup('Без тематики', unlinked) + renderGroup('Циклические связи', cycles.filter(visible));
    const editor = state.editor;
    const currentComponents:any[] = state.issues.find(issue => issue.key === editor?.key)?.fields?.components || [];
    const componentSelected = (option:any) => currentComponents.some(item => (item.id && option.id && String(item.id) === String(option.id)) || (item.name && item.name === option.name));
    const linkedThemesHtml = () => {
      const current = editor && nodes.get(editor.key);
      const linked = new Map<string,any>();
      (current?.links || []).forEach((link:any) => {
        const inward=Boolean(link.inwardIssue), target=inward ? link.inwardIssue : link.outwardIssue;
        const direction=inward ? link.type?.inward : link.type?.outward;
        if (!target?.key || !/задача проекта|project task/i.test(String(direction || ''))) return;
        const existing=nodes.get(target.key), fields=target.fields || {};
        linked.set(target.key, {...(existing || {key:target.key,summary:fields.summary || '',status:fields.status?.name || '',category:fields.status?.statusCategory?.key || ''}), linkId:link.id || ''});
      });
      const entries=[...linked.values()].sort((a:any,b:any) => collator.compare(a.summary || a.key,b.summary || b.key));
      return '<div class="ozon-strategy-linked-themes"><strong>Установленные связи «Задача проекта»</strong>' + (entries.length ? '<div class="ozon-strategy-linked-list">' + entries.map((item:any) => '<div class="ozon-strategy-linked-item"><div><a class="ozon-mono" href="https://jit.o3.ru/browse/' + encodeURIComponent(item.key) + '" target="_blank" rel="noopener noreferrer">' + escape(item.key) + '</a>' + (item.status ? ' ' + renderBadge(escape(item.status),item.category === 'done' ? 'done' : item.category === 'indeterminate' ? 'progress' : 'todo') : '') + '<button type="button" class="ozon-strategy-unlink" data-strategy-action="unlink-theme" data-key="' + escape(item.key) + '" data-id="' + escape(item.linkId) + '" aria-label="Удалить связь с ' + escape(item.key) + '" title="Удалить связь" ' + (editor.busy ? 'disabled' : '') + '>✕</button></div><div class="ozon-strategy-linked-title">' + escape(item.summary || 'Название недоступно') + '</div></div>').join('') + '</div>' : '<p>Связей пока нет</p>') + '</div>';
    };
    const themeOptionsHtml = () => {
      const options:any[] = editor?.options || [];
      const byKey=new Map<string,any>(options.map((item:any) => [item.key,item]));
      const query=String(editor?.query || '').trim().toLowerCase();
      const visible=new Set<string>();
      const pending=options.filter(item => !query || (item.key + ' ' + item.summary).toLowerCase().includes(query)).map(item => item.key);
      while (pending.length) { const key=pending.pop()!; if (visible.has(key)) continue; visible.add(key); (byKey.get(key)?.parents || []).forEach((parent:string) => { if (byKey.has(parent)) pending.push(parent); }); }
      const children=new Map<string,string[]>();
      const roots:string[]=[];
      options.forEach(item => { if (!visible.has(item.key)) return; const parents=[...(item.parents || [])].filter((key:any) => key !== item.key && visible.has(key) && byKey.has(key)); if (!parents.length) roots.push(item.key); parents.forEach((parent:any) => { if (!children.has(parent)) children.set(parent,[]); children.get(parent)!.push(item.key); }); });
      const covered=new Set<string>();
      const cover=(key:string) => { const stack=[key]; while(stack.length) { const current=stack.pop()!; if(covered.has(current)) continue; covered.add(current); stack.push(...(children.get(current) || [])); } };
      roots.forEach(cover); options.forEach(item => { if(visible.has(item.key) && !covered.has(item.key)) { roots.push(item.key); cover(item.key); } });
      let result='';
      const renderTree=(root:string) => { const stack=[{key:root,depth:0,ancestors:new Set<string>()}]; while(stack.length) { const entry=stack.pop()!; if(entry.ancestors.has(entry.key)) continue; const item=byKey.get(entry.key); if (!item) continue; const descendants=(children.get(entry.key) || []).filter(key => !entry.ancestors.has(key)); const open=Boolean(query) || !editor.collapsed?.has(entry.key); const indent=Math.min(entry.depth,8)*14; result += '<div class="ozon-strategy-theme-row" style="margin-left:' + indent + 'px;width:calc(100% - ' + indent + 'px)">' + (descendants.length ? '<button type="button" class="ozon-strategy-theme-toggle" data-strategy-action="theme-toggle" data-key="' + escape(item.key) + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Свернуть ' : 'Развернуть ') + escape(item.key) + '">' + (open ? '▾' : '▸') + '</button>' : '<span class="ozon-strategy-theme-toggle-space"></span>') + '<button type="button" class="ozon-ext-combo-item ozon-strategy-theme-option" data-strategy-action="save-link" data-strategy-match="' + (!query || (item.key + ' ' + item.summary).toLowerCase().includes(query)) + '" data-key="' + escape(item.key) + '" ' + (editor.busy ? 'disabled' : '') + '><span class="ozon-mono">' + escape(item.key) + '</span>' + renderBadge(escape(item.status),item.category === 'done' ? 'done' : item.category === 'indeterminate' ? 'progress' : 'todo') + '<span class="ozon-dev-option-components">' + escape(item.components) + '</span><span class="ozon-dev-option-title">' + escape(item.summary) + '</span></button></div>'; if(open) { const ancestors=new Set(entry.ancestors); ancestors.add(entry.key); descendants.slice().reverse().forEach(key => stack.push({key,depth:entry.depth+1,ancestors})); } } };
      roots.forEach(renderTree);
      return result || '<div class="ozon-ext-toolbar-empty">Тематики не найдены</div>';
    };
    const currentPriority = editor?.kind === 'priority' ? state.issues.find(item => item.key === editor.key)?.fields?.priority : null;
    const currentSprint = editor?.kind === 'sprint' ? sprintValue(state.issues.find(item => item.key === editor.key)?.fields || {}) : null;
    const panel = !editor ? '' : '<aside class="ozon-dev-editor ozon-ext-combo-popover" role="dialog" aria-label="Редактирование задачи"><div class="ozon-dev-editor-head"><strong>' + (editor.kind === 'priority' ? 'Приоритет' : editor.kind === 'component' ? 'Компонент задачи' : editor.kind === 'sprint' ? 'Спринт задачи' : editor.kind === 'epic' ? 'Эпик задачи' : editor.kind === 'link' ? 'Связать с тематикой' : editor.kind === 'create' ? 'Создать тематику' : 'Добавить метку') + (editor.key ? ' · ' + escape(editor.key) : '') + '</strong><button type="button" class="ozon-ext-btn" data-strategy-action="close-editor">✕</button></div>' + (editor.kind === 'sprint' ? '<div class="ozon-sprint-current"><span>Текущий спринт</span><strong>' + escape(currentSprint?.name || 'Бэклог') + '</strong></div>' : editor.kind === 'priority' ? '<div class="ozon-sprint-current"><span>Текущий приоритет</span><strong>' + priorityIcon(currentPriority?.name || '') + ' ' + escape(currentPriority?.name || 'Не указан') + '</strong></div>' : '') + (editor.error ? '<p role="alert" class="ozon-dev-error">' + escape(editor.error) + '</p>' : '') + (editor.loading ? '<p role="status">Загрузка…</p>' : editor.kind === 'sprint' ? '<input id="ozon-strategy-sprint-search" type="search" dir="ltr" placeholder="Поиск спринта…" aria-label="Поиск спринта" value="' + escape(editor.query || '') + '"><div class="ozon-dev-editor-options ozon-strategy-editor-options"><button type="button" class="ozon-ext-combo-item" data-strategy-action="save-sprint" data-id="" ' + (editor.busy ? 'disabled' : '') + '>Бэклог</button>' + editor.options.filter((sp) => !editor.query || sp.name.toLowerCase().includes(editor.query.toLowerCase())).map((sp) => '<button type="button" class="ozon-ext-combo-item" data-strategy-action="save-sprint" data-id="' + escape(sp.id) + '" ' + (editor.busy ? 'disabled' : '') + '><span>' + escape(sp.name) + '</span>' + renderBadge(String(sp.state).toLowerCase() === 'active' ? 'Активный' : 'Будущий', String(sp.state).toLowerCase() === 'active' ? 'done' : 'progress') + '</button>').join('') + '</div>' : editor.kind === 'component' ? '<input id="ozon-strategy-component-editor-search" type="search" dir="ltr" placeholder="Поиск компонента…" aria-label="Поиск компонента задачи" value="' + escape(editor.query || '') + '"><div class="ozon-dev-editor-options ozon-strategy-editor-options"><button type="button" class="ozon-ext-combo-item ' + (!currentComponents.length ? 'active' : '') + '" aria-pressed="' + !currentComponents.length + '" data-strategy-action="save-component" data-id="" ' + (editor.busy ? 'disabled' : '') + '>Без компонента</button>' + editor.options.filter((option) => !editor.query || String(option.name).toLowerCase().includes(editor.query.toLowerCase())).map((option) => '<button type="button" class="ozon-ext-combo-item ' + (componentSelected(option) ? 'active' : '') + '" aria-pressed="' + componentSelected(option) + '" data-strategy-action="save-component" data-id="' + escape(option.id) + '" ' + (editor.busy ? 'disabled' : '') + '>' + escape(option.name) + '</button>').join('') + '</div>' : editor.kind === 'epic' ? '<input id="ozon-strategy-epic-search" type="search" dir="ltr" placeholder="Поиск по ключу или названию…" value="' + escape(editor.query || '') + '"><div class="ozon-dev-editor-options ozon-dev-epic-options ozon-strategy-editor-options"><button type="button" class="ozon-ext-combo-item" data-strategy-action="save-epic" data-key="" ' + (editor.busy ? 'disabled' : '') + '>Без эпика</button>' + editor.options.map((item) => '<button type="button" class="ozon-ext-combo-item" data-strategy-action="save-epic" data-key="' + escape(item.key) + '" ' + (editor.busy ? 'disabled' : '') + '><span class="ozon-mono">' + escape(item.key) + '</span>' + renderBadge(escape(item.status), item.category === 'done' ? 'done' : item.category === 'indeterminate' ? 'progress' : 'todo') + '<span class="ozon-dev-option-title">' + escape(item.summary) + '</span><span class="ozon-dev-option-components">' + escape(item.components) + '</span></button>').join('') + (editor.searching ? '<p role="status">Загрузка…</p>' : '') + '</div>' : editor.kind === 'priority' ? '<div class="ozon-dev-editor-options ozon-strategy-editor-options">' + editor.options.map((option, index) => '<button type="button" class="ozon-ext-combo-item ' + ((String(option.value) === String(currentPriority?.id) || option.label === currentPriority?.name) ? 'active' : '') + '" aria-pressed="' + (String(option.value) === String(currentPriority?.id) || option.label === currentPriority?.name) + '" data-strategy-action="save-priority" data-index="' + index + '" ' + (editor.busy ? 'disabled' : '') + '>' + priorityIcon(option.label) + escape(option.label) + '</button>').join('') + '</div>' : editor.kind === 'link' ? linkedThemesHtml() + '<div class="ozon-strategy-theme-scope"><span>' + (currentComponents.length ? 'Компоненты задачи: ' + escape(currentComponents.map((item) => item.name).filter(Boolean).join(', ')) : 'У задачи не указан компонент') + '</span><button type="button" class="ozon-ext-btn ' + (editor.allComponents ? '' : 'ozon-ext-btn-surface') + '" data-strategy-action="theme-scope" aria-pressed="' + Boolean(editor.allComponents) + '">Все компоненты</button></div><input id="ozon-strategy-link-search" type="search" dir="ltr" aria-label="Поиск тематики" placeholder="Поиск по ключу или названию…" value="' + escape(editor.query || '') + '"><div class="ozon-dev-editor-options ozon-dev-epic-options ozon-strategy-editor-options">' + themeOptionsHtml() + '</div>' : editor.kind === 'create' ? '<form id="ozon-strategy-create-form"><label>Название<input id="ozon-strategy-create-name" required value="' + escape(editor.summary || '') + '"></label><label>Компонент<select id="ozon-strategy-create-component" required><option value="">Выберите компонент</option>' + editor.options.map((item) => '<option value="' + escape(item.id) + '" ' + (String(item.id) === String(editor.componentId || '') ? 'selected' : '') + '>' + escape(item.name) + '</option>').join('') + '</select></label><button type="submit" class="ozon-ext-btn" ' + (editor.busy ? 'disabled' : '') + '>Создать</button></form>' : '<form id="ozon-strategy-label-form"><input id="ozon-strategy-label-input" placeholder="Название метки" aria-label="Название метки" required><button type="submit" class="ozon-ext-btn" ' + (editor.busy ? 'disabled' : '') + '>Добавить</button></form>') + '</aside>';
    return '<section class="ozon-strategy-dashboard">' + header + filters + progress + error + '<div class="ozon-strategy-description">Все задачи FCRM · ' + taskCount + ' ' + taskNoun + (filtering ? ' по фильтрам · Родительские строки показаны для контекста' : '') + '. Задача может отображаться в нескольких тематиках. <span class="ozon-strategy-legend">Связи: <span class="ozon-strategy-relation">Задача проекта</span> <span class="ozon-strategy-epic-relation">Epic Link</span></span></div><div class="ozon-strategy-scroll"><table class="ozon-strategy-table" style="width:max(100%,' + visibleColumns.reduce((sum,id) => sum + layout.widths[id],0) + 'px)"><colgroup>' + visibleColumns.map(id => '<col data-strategy-col="' + id + '" style="width:' + layout.widths[id] + 'px">').join('') + '</colgroup><thead><tr>' + visibleColumns.map(id => '<th' + (id === 'task' ? ' class="ozon-strategy-task-header"' : '') + '>' + escape(columnTitles[id]) + '<span class="ozon-dev-col-resizer" role="separator" aria-orientation="vertical" aria-label="Изменить ширину: ' + escape(columnTitles[id]) + '" tabindex="0" data-strategy-resize="' + id + '"></span></th>').join('') + '</tr></thead><tbody>' + (rows || '<tr><td colspan="' + visibleColumns.length + '">Задачи FCRM не найдены</td></tr>') + '</tbody></table></div>' + panel + settings + '</section>';
  }
  async function linkTheme(sourceKey:string,targetKey:string) {
    const theme=state.issues.find(item => item.key === targetKey);
    const themeName=theme?.fields?.summary ? targetKey + ' «' + theme.fields.summary + '»' : targetKey;
    const linked=await actions.link(sourceKey,targetKey);
    if (!linked) throw new Error('Не удалось установить связь в Jira');
    // Once Jira accepted the link, do not offer to repeat the write if the refresh fails.
    try {
      const response=await fetch('/rest/api/2/issue/' + encodeURIComponent(sourceKey) + '?fields=issuelinks', {credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data=await response.json();
      if (data.key && data.key !== sourceKey) throw new Error('Jira вернула другую задачу');
      const links=data.fields?.issuelinks;
      if (!Array.isArray(links)) throw new Error('Jira не вернула связи');
      const hasLink=links.some((link:any) => { const inward=Boolean(link.inwardIssue); const target=inward ? link.inwardIssue : link.outwardIssue; const direction=inward ? link.type?.inward : link.type?.outward; return target?.key === targetKey && /задача проекта|project task/i.test(String(direction || '')); });
      if (!hasLink) throw new Error('Jira ещё не вернула новую связь');
      const issue=state.issues.find(item => item.key === sourceKey);
      if (!issue) throw new Error('Задача больше не найдена в таблице');
      issue.fields.issuelinks=links; invalidateGraph();
      state.notice='Связь ' + sourceKey + ' с тематикой ' + themeName + ' сохранена.';
    } catch (_) {
      state.notice='Связь ' + sourceKey + ' с тематикой ' + themeName + ' создана, но не удалось обновить её в таблице. Нажмите «Обновить задачи», чтобы проверить данные Jira.';
    }
    actions?.notify?.(state.notice);
  }
  async function unlinkTheme(sourceKey:string,targetKey:string,linkId:string) {
    const issue=state.issues.find(item => item.key === sourceKey);
    if (!issue) throw new Error('Задача больше не найдена в таблице');
    const matches=(link:any) => { const inward=Boolean(link.inwardIssue); const target=inward ? link.inwardIssue : link.outwardIssue; const direction=inward ? link.type?.inward : link.type?.outward; return target?.key === targetKey && /задача проекта|project task/i.test(String(direction || '')); };
    if (!linkId) {
      const response=await fetch('/rest/api/2/issue/' + encodeURIComponent(sourceKey) + '?fields=issuelinks',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
      if (!response.ok) throw new Error('Не удалось получить связь из Jira');
      const data=await response.json(); const found=(data.fields?.issuelinks || []).filter(matches);
      if (found.length !== 1 || !found[0].id) throw new Error('Не удалось однозначно определить связь для удаления');
      linkId=String(found[0].id);
    }
    const response=await fetch('/rest/api/2/issueLink/' + encodeURIComponent(linkId),{method:'DELETE',credentials:'same-origin',headers:{Accept:'application/json'}});
    if (!response.ok) throw new Error('Не удалось удалить связь: Jira вернула HTTP ' + response.status);
    issue.fields.issuelinks=(issue.fields.issuelinks || []).filter((link:any) => !(String(link.id || '') === linkId || (!link.id && matches(link))));
    try { const updated=await fetch('/rest/api/2/issue/' + encodeURIComponent(sourceKey) + '?fields=issuelinks',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'}); if (updated.ok) { const data=await updated.json(); if (Array.isArray(data.fields?.issuelinks) && !data.fields.issuelinks.some((link:any) => String(link.id || "") === linkId)) issue.fields.issuelinks=data.fields.issuelinks; } } catch (_) { /* Удаление уже подтверждено Jira. */ }
    invalidateGraph(); actions?.notify?.('Связь ' + sourceKey + ' с тематикой ' + targetKey + ' удалена.');
  }
  function themeCandidates(key:string,allComponents:boolean) {
    const graph=buildGraph(); const current=graph.nodes.get(key); const descendants=new Set<string>(), pending=[key];
    while(pending.length) { const next=pending.pop()!; if (descendants.has(next)) continue; descendants.add(next); graph.nodes.get(next)?.children.forEach((child:string)=>pending.push(child)); }
    return [...graph.nodes.values()].filter((item:any) => item.thematic && !descendants.has(item.key) && !current?.parents.has(item.key) && (allComponents || (current?.componentNames.length ? item.componentNames.some((name:string) => current.componentNames.includes(name)) : !item.componentNames.length))).sort((a:any,b:any)=>collator.compare(a.summary,b.summary));
  }
  let epicSearchSerial=0, epicSearchTimer:any=null;
  async function searchEpic(editor:any) {
    const serial=++epicSearchSerial; editor.searching=true; editor.error='';
    try {
      if (!epicCatalogPromise) {
        epicCatalogPromise=(async () => {
          const jql='project in (OBPROJECT, FCRM) AND issuetype = Epic ORDER BY updated DESC';
          const fields=['summary','status','components','issuetype','labels',epicNameField].filter(Boolean).join(',');
          const page=async (startAt:number) => { const params=new URLSearchParams({jql,fields,maxResults:'100',startAt:String(startAt)}); const response=await fetch('/rest/api/2/search?' + params.toString(),{credentials:'same-origin',headers:{Accept:'application/json'}}); if (!response.ok) throw new Error('Не удалось загрузить эпики (HTTP ' + response.status + ')'); const data=await response.json(); if (!Array.isArray(data.issues)) throw new Error('Некорректный ответ Jira'); return data; };
          const first=await page(0), result=[...first.issues], total=Number(first.total || 0);
          for (let start=100;start<total;start+=500) { const offsets=Array.from({length:5},(_,i)=>start+i*100).filter(offset=>offset<total); const pages=await Promise.all(offsets.map(page)); pages.forEach(data=>result.push(...data.issues)); }
          return result;
        })().catch(error => { epicCatalogPromise=null; throw error; });
      }
      const data=await epicCatalogPromise, query=String(editor.query || '').trim().toLocaleLowerCase();
      if (serial !== epicSearchSerial || state.editor !== editor) return;
      data.forEach((item:any) => { if (item.key) epicMetadata.set(item.key,{summary:item.fields?.summary || item.key,status:item.fields?.status?.name || 'Не указан',category:item.fields?.status?.statusCategory?.key || ''}); });
      editor.options=data.filter((item:any) => item.key !== editor.key && /^(epic|эпик)$/i.test(item.fields?.issuetype?.name || '') && (!query || [item.key,item.fields?.summary,epicNameField ? item.fields?.[epicNameField] : '',...(item.fields?.labels || [])].some(value=>String(value || '').toLocaleLowerCase().includes(query)))).slice(0,100).map((item:any) => ({key:item.key,summary:item.fields?.summary || item.key,status:item.fields?.status?.name || 'Не указан',category:item.fields?.status?.statusCategory?.key || '',components:(item.fields?.components || []).map((c:any)=>c.name).join(', ') || 'Без компонента'}));
    } catch(error:any) { if (serial === epicSearchSerial && state.editor === editor) editor.error=error.message; }
    finally { if (serial === epicSearchSerial && state.editor === editor) { editor.searching=false; const input=document.getElementById('ozon-strategy-epic-search') as HTMLInputElement | null; const focused=document.activeElement===input, pos=input?.selectionStart; onRender(); const next=document.getElementById('ozon-strategy-epic-search') as HTMLInputElement | null; if (focused && next) { next.focus({preventScroll:true}); if (pos != null) next.setSelectionRange(pos,pos); } } }
  }
  async function saveEpic(key:string,value:string) {
    if (!epicField) throw new Error('Не найдено поле Epic Link в Jira. Обновите задачи.');
    const response=await fetch('/rest/api/2/issue/' + encodeURIComponent(key),{method:'PUT',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({fields:{[epicField]:value || null}})});
    if (!response.ok) throw new Error('Не удалось изменить Epic Link (HTTP ' + response.status + ')');
    const check=await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=' + encodeURIComponent(epicField),{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
    if (!check.ok) throw new Error('Не удалось проверить Epic Link в Jira');
    const data=await check.json(); if (!data.fields || !Object.prototype.hasOwnProperty.call(data.fields,epicField)) throw new Error('Jira не вернула Epic Link');
    const raw=data.fields[epicField], actual=typeof raw === 'string' ? raw : raw?.key || raw?.value || '';
    if (actual !== value) throw new Error('Jira не подтвердила изменение Epic Link');
    const issue=state.issues.find(item => item.key === key); if (issue) { issue.fields[epicField]=raw; delete issue.fields.epic; invalidateGraph(); }
  }
  async function saveComponent(key:string,id:string) {
    const response=await fetch('/rest/api/2/issue/' + encodeURIComponent(key),{method:'PUT',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({fields:{components:id ? [{id}] : []}})});
    if (!response.ok) throw new Error('Не удалось изменить компонент (HTTP ' + response.status + ')');
    const check=await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=components',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
    if (!check.ok) throw new Error('Не удалось проверить компонент в Jira');
    const data=await check.json(), components=data.fields?.components;
    if (!Array.isArray(components) || (id ? components.length !== 1 || String(components[0].id) !== id : components.length !== 0)) throw new Error('Jira не подтвердила изменение компонента');
    const issue=state.issues.find(item => item.key === key); if (issue) { issue.fields.components=components; invalidateGraph(); }
  }
  async function changeLabel(key:string,label:string,operation:'add'|'remove') {
    if (!label || /\s/.test(label)) throw new Error('Введите метку без пробелов');
    const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key), {method:'PUT',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({update:{labels:[{[operation]:label}]}})});
    if (!response.ok) throw new Error('Не удалось изменить метку (HTTP ' + response.status + ')');
    const fresh = await fetch('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=labels',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
    if (!fresh.ok) throw new Error('Не удалось проверить метки в Jira');
    const data = await fresh.json(); const labels = data.fields?.labels;
    if (!Array.isArray(labels) || labels.includes(label) !== (operation === 'add')) throw new Error('Jira не подтвердила изменение метки');
    const issue = state.issues.find(item => item.key === key); if (issue) { issue.fields.labels = labels; invalidateGraph(); }
  }
  function bind(root: HTMLElement) {
    const settings=root.querySelector<HTMLElement>('.ozon-strategy-settings');
    if (settings) {settings.scrollTop=settingsScroll;settings.addEventListener('scroll',()=>{settingsScroll=settings.scrollTop;});}
    groupingUi?.bind(root,order=>{layout.order=['task',...order];saveLayout();onRender();});
    groupingUi?.bindDepth(root,value=>{
      treeDepth=value==='manual' ? null : value==='all' ? Infinity : Number(value);
      state.expanded.clear();state.filterCollapsed.clear();onRender();
    });
    root.querySelectorAll<HTMLDetailsElement>('.ozon-strategy-copy-menu').forEach(menu => {
      menu.addEventListener('toggle', () => {
        if (!menu.open) return;
        root.querySelectorAll<HTMLDetailsElement>('.ozon-strategy-copy-menu[open]').forEach(other => { if (other !== menu) other.open=false; });
        const trigger=menu.querySelector<HTMLElement>('summary'), options=menu.querySelector<HTMLElement>('.ozon-strategy-copy-options');
        if (!trigger || !options) return;
        const rect=trigger.getBoundingClientRect(), width=options.offsetWidth, height=options.offsetHeight;
        options.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+'px';
        options.style.top=Math.max(8,rect.bottom+height+4 <= window.innerHeight ? rect.bottom+4 : rect.top-height-4)+'px';
      });
    });
    root.querySelector('.ozon-strategy-scroll')?.addEventListener('scroll', () => root.querySelectorAll<HTMLDetailsElement>('.ozon-strategy-copy-menu[open]').forEach(menu => { menu.open=false; }), {passive:true});
    const search = root.querySelector<HTMLInputElement>('#ozon-strategy-search');
    search?.addEventListener('input', () => { state.search=search.value; state.filterCollapsed.clear(); clearTimeout(searchTimer); searchTimer=setTimeout(() => { const current=document.getElementById('ozon-strategy-search') as HTMLInputElement | null; if (!current || current.value !== state.search) return; const focused=document.activeElement === current, start=current.selectionStart, end=current.selectionEnd; onRender(); const next=document.getElementById('ozon-strategy-search') as HTMLInputElement | null; if (focused && next) { next.focus({preventScroll:true}); if (start !== null && end !== null) next.setSelectionRange(start,end); } if (exactIssueKey()) document.querySelector('.ozon-strategy-exact-match')?.scrollIntoView({block:'nearest',inline:'nearest'}); void lookupPreviewIssue(); }, 180); });
    root.querySelector<HTMLInputElement>('#ozon-strategy-component-search')?.addEventListener('input', event => { const input=event.target as HTMLInputElement; const position=input.selectionStart; state.componentQuery=input.value; onRender(); const next=document.getElementById('ozon-strategy-component-search') as HTMLInputElement | null; next?.focus({preventScroll:true}); if (next && position !== null) next.setSelectionRange(position,position); });
    const labelSearch = root.querySelector<HTMLInputElement>('#ozon-strategy-label-search');
    const labelPopover=root.querySelector<HTMLElement>('.ozon-strategy-label-popover');
    if (labelPopover) {
      const overshoot=Math.max(0,labelPopover.getBoundingClientRect().right-window.innerWidth+12);
      if (overshoot) labelPopover.style.transform='translateX(-' + overshoot + 'px)';
      labelPopover.addEventListener('keydown',event=>{
        if (event.key!=='Escape') return;
        event.preventDefault(); event.stopPropagation(); state.labelOpen=false; onRender();
        root.querySelector<HTMLElement>('[data-strategy-action="label-menu"]')?.focus({preventScroll:true});
      });
    }
    labelSearch?.addEventListener('input', () => {
      state.labelQuery = labelSearch.value;
      const position = labelSearch.selectionStart;
      onRender();
      const next = root.querySelector<HTMLInputElement>('#ozon-strategy-label-search');
      next?.focus({preventScroll:true});
      if (next && position !== null) next.setSelectionRange(position,position);
    });
    root.querySelectorAll<HTMLInputElement>('[data-strategy-label-filter]').forEach(input => input.addEventListener('change', () => {
      const label = input.dataset.strategyLabelFilter ?? '';
      if (input.checked) state.labelFilter.add(label);
      else state.labelFilter.delete(label);
      state.filterCollapsed.clear();
      const scrollTop=labelPopover?.querySelector('.ozon-dev-filter-list')?.scrollTop || 0;
      onRender();
      const list=root.querySelector('.ozon-strategy-label-popover .ozon-dev-filter-list');
      if (list) list.scrollTop=scrollTop;
      [...root.querySelectorAll<HTMLInputElement>('[data-strategy-label-filter]')].find(option => option.dataset.strategyLabelFilter === label)?.focus({preventScroll:true});
    }));
    if (!outsideBound && typeof document !== 'undefined') {
      outsideBound=true;
      document.addEventListener('pointerdown', event => {
        const target = event.target as Element;
        if (!target?.closest('.ozon-strategy-copy-menu')) document.querySelectorAll<HTMLDetailsElement>('.ozon-strategy-copy-menu[open]').forEach(menu => { menu.open=false; });
        if ((!state.componentOpen && !state.issueTypeOpen && !state.labelOpen && !state.sortOpen) || target?.closest('.ozon-ext-toolbar-combo')) return;
        state.componentOpen=state.issueTypeOpen=state.labelOpen=state.sortOpen=false;
        document.querySelectorAll('.ozon-strategy-filters .ozon-ext-toolbar-popover:not(.ozon-depth-options)').forEach(popover => popover.remove());
        document.querySelectorAll('.ozon-strategy-filters .ozon-ext-toolbar-trigger[aria-expanded="true"]:not([data-table-depth])').forEach(trigger => trigger.setAttribute('aria-expanded','false'));
      },true);
    }
    root.querySelectorAll<HTMLInputElement>('[data-strategy-column-visible]').forEach(input => input.addEventListener('change', () => { const id=input.dataset.strategyColumnVisible || ''; if (!(id in columnTitles) || id === 'task') return; layout.hidden=input.checked ? layout.hidden.filter(item => item !== id) : [...layout.hidden,id]; saveLayout(); onRender(); }));
    root.querySelectorAll<HTMLElement>('[data-strategy-resize]').forEach(handle => {
      const id=handle.dataset.strategyResize!;
      const apply=(width:number) => { layout.widths[id]=Math.max(60,Math.min(1000,Math.round(width))); const table=root.querySelector<HTMLElement>('.ozon-strategy-table'); const col=root.querySelector<HTMLElement>('col[data-strategy-col="' + id + '"]'); if (col) col.style.width=layout.widths[id]+'px'; if (table) table.style.width='max(100%, '+layout.order.filter(key => !layout.hidden.includes(key)).reduce((sum,key)=>sum+layout.widths[key],0)+'px)'; };
      handle.addEventListener('pointerdown',event => { event.preventDefault();event.stopPropagation(); const start=event.clientX, width=handle.parentElement?.getBoundingClientRect().width || layout.widths[id]; const move=(next:PointerEvent)=>apply(width+next.clientX-start); const stop=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',stop);document.removeEventListener('pointercancel',stop);saveLayout();}; document.addEventListener('pointermove',move);document.addEventListener('pointerup',stop);document.addEventListener('pointercancel',stop); });
      handle.addEventListener('keydown',event=>{if(event.key === 'ArrowLeft' || event.key === 'ArrowRight'){event.preventDefault();apply((handle.parentElement?.getBoundingClientRect().width || layout.widths[id])+(event.key === 'ArrowLeft' ? -10 : 10));saveLayout();}});
    });
    const toggle = (path:string) => {
      if (treeDepth!==null || exactIssueKey()) {
        const level=path.split('|').length-1;
        if (treeDepth!==null && level>=treeDepth) {
          state.expanded.has(path) ? state.expanded.delete(path) : state.expanded.add(path);
        } else {
          state.filterCollapsed.has(path) ? state.filterCollapsed.delete(path) : state.filterCollapsed.add(path);
        }
      } else {
        state.expanded.has(path) ? state.expanded.delete(path) : state.expanded.add(path);
      }
      onRender();
    };
    root.querySelectorAll<HTMLElement>('[data-strategy-path][data-strategy-expandable="true"]').forEach(row => row.addEventListener('click', event => { if ((event.target as Element).closest('button,a,input,select,details,summary')) return; toggle(row.dataset.strategyPath || ''); }));
    root.querySelectorAll<HTMLElement>('[data-strategy-action="edit-sprint"]').forEach(cell => cell.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cell.click(); } }));
    const labelInput=root.querySelector<HTMLInputElement>('#ozon-strategy-label-input');
    if (labelInput) {
      const issue=state.issues.find(item=>item.key===state.editor?.key);
      actions?.bindLabelSuggestions?.(labelInput,{issueId:issue?.id,existing:issue?.fields?.labels,known:()=>state.issues.flatMap(item=>item.fields?.labels || [])});
    }
    root.querySelector<HTMLFormElement>('#ozon-strategy-label-form')?.addEventListener('submit', async event => { event.preventDefault(); const editor=state.editor; if (!editor || editor.busy) return; const input=root.querySelector<HTMLInputElement>('#ozon-strategy-label-input'); const label=input?.value.trim() || ''; editor.busy=true; try { await changeLabel(editor.key,label,'add'); state.editor=null; } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } });
    root.querySelector<HTMLInputElement>('#ozon-strategy-sprint-search')?.addEventListener('input', event => { const input=event.target as HTMLInputElement; const pos=input.selectionStart; if (!state.editor || state.editor.kind !== 'sprint') return; state.editor.query=input.value; onRender(); const next=document.getElementById('ozon-strategy-sprint-search') as HTMLInputElement | null; next?.focus({preventScroll:true}); if (next && pos !== null) next.setSelectionRange(pos,pos); });
    root.querySelector<HTMLInputElement>('#ozon-strategy-component-editor-search')?.addEventListener('input', event => { const input=event.target as HTMLInputElement; const pos=input.selectionStart; if (!state.editor || state.editor.kind !== 'component') return; state.editor.query=input.value; onRender(); const next=document.getElementById('ozon-strategy-component-editor-search') as HTMLInputElement | null; next?.focus({preventScroll:true}); if (next && pos !== null) next.setSelectionRange(pos,pos); });
    root.querySelector<HTMLInputElement>('#ozon-strategy-epic-search')?.addEventListener('input', event => { const input=event.target as HTMLInputElement, editor=state.editor; if (!editor || editor.kind !== 'epic') return; editor.query=input.value; ++epicSearchSerial; clearTimeout(epicSearchTimer); epicSearchTimer=setTimeout(() => searchEpic(editor),300); });
    root.querySelector<HTMLInputElement>('#ozon-strategy-link-search')?.addEventListener('keydown', event => { if (event.key !== 'Enter') return; const options=[...root.querySelectorAll<HTMLButtonElement>('[data-strategy-action="save-link"][data-strategy-match="true"]')]; const keys=new Set(options.map(option => option.dataset.key)); if (keys.size === 1 && options[0] && !options[0].disabled) { event.preventDefault(); options[0].click(); } });
    root.querySelector<HTMLInputElement>('#ozon-strategy-link-search')?.addEventListener('input', event => { const input=event.target as HTMLInputElement; const pos=input.selectionStart; state.editor.query=input.value; onRender(); const next=document.getElementById('ozon-strategy-link-search') as HTMLInputElement | null; next?.focus({preventScroll:true}); if (next && pos !== null) next.setSelectionRange(pos,pos); });
    root.querySelector<HTMLFormElement>('#ozon-strategy-create-form')?.addEventListener('submit', async event => { event.preventDefault(); const editor=state.editor; if (!editor || editor.busy) return; editor.summary=(root.querySelector<HTMLInputElement>('#ozon-strategy-create-name')?.value || '').trim(); editor.componentId=root.querySelector<HTMLSelectElement>('#ozon-strategy-create-component')?.value || ''; if (!editor.summary || !editor.componentId) { editor.error='Укажите название и компонент'; onRender(); return; } editor.busy=true; editor.error=''; onRender(); try { const result=await actions.create(editor.summary,editor.componentId); if (!result?.key) throw new Error('Jira не вернула ключ созданной тематики'); state.editor=null; await load(); } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } });
    root.querySelectorAll<HTMLElement>('[data-strategy-action]').forEach(button => button.addEventListener('click', async event => {
      event.stopPropagation();
      if (button.dataset.strategyAction === 'component-menu') { state.componentOpen=!state.componentOpen; state.issueTypeOpen=false; state.labelOpen=false; state.sortOpen=false; state.componentQuery=''; onRender(); if (state.componentOpen) document.getElementById('ozon-strategy-component-search')?.focus({preventScroll:true}); return; }
      if (button.dataset.strategyAction === 'type-menu') { state.issueTypeOpen=!state.issueTypeOpen; state.componentOpen=false; state.labelOpen=false; state.sortOpen=false; onRender(); return; }
      if (button.dataset.strategyAction === 'label-menu') {
        state.labelOpen=!state.labelOpen; state.labelQuery=''; state.componentOpen=false; state.issueTypeOpen=false; state.sortOpen=false;
        onRender();
        if (state.labelOpen) document.getElementById('ozon-strategy-label-search')?.focus({preventScroll:true});
        return;
      }
      if (button.dataset.strategyAction === 'labels-clear') { state.labelFilter.clear(); state.labelQuery=''; onRender(); return; }
      if (button.dataset.strategyAction === 'type-pick') { state.issueType=button.dataset.value || ''; state.issueTypeOpen=false; state.expanded.clear(); onRender(); return; }
      if (button.dataset.strategyAction === 'component-pick') { state.component=button.dataset.value || ''; state.componentOpen=false; state.componentQuery=''; state.expanded.clear(); onRender(); return; }
      if (button.dataset.strategyAction === 'details') { const node=buildGraph().nodes.get(button.dataset.key || ''); if (node) actions?.details?.(node); return; }
      if (button.dataset.strategyAction === 'sort-menu') { state.sortOpen=!state.sortOpen; state.issueTypeOpen=false; state.componentOpen=false; state.labelOpen=false; onRender(); return; }
      if (button.dataset.strategyAction === 'sort-pick') { state.sort=button.dataset.value === 'created' ? 'created' : 'priority'; state.sortOpen=false; onRender(); return; }
      if (button.dataset.strategyAction === 'hide-canceled') { state.hideCanceled=!state.hideCanceled; onRender(); return; }
      if (button.dataset.strategyAction === 'hide-done') { state.hideDone=!state.hideDone; onRender(); return; }
      if (button.dataset.strategyAction === 'reset-filters') { state.search=''; state.filterCollapsed.clear(); state.component=''; state.issueType=''; state.labelFilter.clear(); state.labelOpen=false; state.labelQuery=''; state.onlyThemes=false; state.hideCanceled=false; state.hideDone=false; state.expanded.clear(); onRender(); return; }
      if (button.dataset.strategyAction === 'only-themes') { state.onlyThemes=!state.onlyThemes; onRender(); return; }
      if (button.dataset.strategyAction === 'settings-open' || button.dataset.strategyAction === 'settings-close') { state.settings=button.dataset.strategyAction === 'settings-open'; if (state.settings) settingsScroll=0; onRender(); return; }
      if (button.dataset.strategyAction === 'columns-reset') { layout.order=[...defaultOrder]; layout.widths={...defaultWidths}; layout.hidden=[...defaultHidden]; saveLayout(); onRender(); return; }
      if (button.dataset.strategyAction === 'dismiss-notice') { state.notice=''; onRender(); return; }
      if (button.dataset.strategyAction === 'reload') { await load(); return; }
      if (button.dataset.strategyAction === 'retry-filters') { await prepareFilters(); return; }
      if (button.dataset.strategyAction === 'toggle') { toggle(button.dataset.path || ''); return; }
      if (button.dataset.strategyAction === 'close-editor') { if (!state.editor?.busy) state.editor=null; onRender(); return; }
      if (button.dataset.strategyAction === 'create') { const editor={kind:'create',key:'',loading:true,busy:false,error:'',options:[] as any[],summary:'',componentId:''}; state.editor=editor; onRender(); try { editor.options=await actions.components(); } catch(error:any) { editor.error=error.message; } finally { editor.loading=false; if (state.editor===editor) onRender(); } return; }
      if (button.dataset.strategyAction === 'link') { const key=button.dataset.key || ''; state.editor={kind:'link',key,loading:false,busy:false,error:'',query:'',allComponents:false,collapsed:new Set<string>(),options:themeCandidates(key,false)}; onRender(); return; }
      if (button.dataset.strategyAction === 'theme-scope') { const editor=state.editor; if (!editor || editor.kind !== 'link') return; editor.allComponents=!editor.allComponents; editor.options=themeCandidates(editor.key,editor.allComponents); editor.collapsed=new Set<string>(); onRender(); return; }
      if (button.dataset.strategyAction === 'theme-toggle') { const editor=state.editor; if (!editor || editor.kind !== 'link') return; const key=button.dataset.key || ''; editor.collapsed ||= new Set<string>(); editor.collapsed.has(key) ? editor.collapsed.delete(key) : editor.collapsed.add(key); onRender(); return; }
      if (button.dataset.strategyAction === 'save-link') { const editor=state.editor; if (!editor || editor.busy) return; editor.busy=true; editor.error=''; onRender(); try { await linkTheme(editor.key,button.dataset.key || ''); if (state.editor===editor) state.editor=null; } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } return; }
      if (button.dataset.strategyAction === 'unlink-theme') { const editor=state.editor; if (!editor || editor.busy) return; editor.busy=true; editor.error=''; onRender(); try { await unlinkTheme(editor.key,button.dataset.key || '',button.dataset.id || ''); if (state.editor===editor) editor.options=themeCandidates(editor.key,Boolean(editor.allComponents)); } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } return; }
      if (button.dataset.strategyAction === 'edit-sprint') { const issue=state.issues.find(item => item.key === button.dataset.key); if (!issue || /^(epic|эпик)$/i.test(issue.fields?.issuetype?.name || '')) return; const editor={kind:'sprint',key:button.dataset.key || '',loading:true,busy:false,error:'',query:'',options:[] as any[]}; state.editor=editor; onRender(); try { editor.options=await loadEditableSprints(); } catch(error:any) { editor.error=error.message; } finally { editor.loading=false; if (state.editor===editor) onRender(); } return; }
      if (button.dataset.strategyAction === 'save-sprint') { const editor=state.editor; if (!editor || editor.busy) return; const id=button.dataset.id || ''; const sprint=id ? editor.options.find((sp:any) => String(sp.id) === id) : null; if (id && !sprint) return; editor.busy=true; editor.error=''; onRender(); try { await saveSprint(editor.key,sprint); if (state.editor===editor) state.editor=null; } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } return; }
      if (button.dataset.strategyAction === 'edit-component') { const editor={kind:'component',key:button.dataset.key || '',loading:true,busy:false,error:'',query:'',options:[] as any[]}; state.editor=editor; onRender(); try { editor.options=await actions.components(); } catch(error:any) { editor.error=error.message; } finally { editor.loading=false; if (state.editor===editor) onRender(); } return; }
      if (button.dataset.strategyAction === 'save-component') { const editor=state.editor; if (!editor || editor.busy) return; editor.busy=true; editor.error=''; onRender(); try { await saveComponent(editor.key,button.dataset.id || ''); if (state.editor===editor) state.editor=null; actions?.notify?.('Компонент задачи ' + editor.key + ' обновлён.'); } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } return; }
      if (button.dataset.strategyAction === 'edit-epic') { const editor={kind:'epic',key:button.dataset.key || '',loading:false,searching:true,busy:false,error:'',query:'',options:[] as any[]}; state.editor=editor; onRender(); await searchEpic(editor); return; }
      if (button.dataset.strategyAction === 'save-epic') { const editor=state.editor; if (!editor || editor.busy) return; editor.busy=true; editor.error=''; onRender(); try { await saveEpic(editor.key,button.dataset.key || ''); if (state.editor===editor) state.editor=null; actions?.notify?.('Epic Link задачи ' + editor.key + ' обновлён.'); } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } return; }
      if (button.dataset.strategyAction === 'priority' || button.dataset.strategyAction === 'labels') {
        const editor={kind:button.dataset.strategyAction,key:button.dataset.key || '',loading:button.dataset.strategyAction === 'priority',busy:false,error:'',options:[] as any[]}; state.editor=editor; onRender();
        if (editor.kind === 'priority') { try { editor.options=await priorityService.options(editor.key); } catch(error:any) { editor.error=error.message; } finally { editor.loading=false; if (state.editor===editor) onRender(); } } return;
      }
      if (button.dataset.strategyAction === 'save-priority') { const editor=state.editor; if (!editor || editor.busy) return; const option=editor.options[Number(button.dataset.index)]; if (!option) return; editor.busy=true; onRender(); try { const priority=await priorityService.save(editor.key,option.value); const issue=state.issues.find(item => item.key===editor.key); if (issue) { issue.fields.priority=priority; invalidateGraph(); } state.editor=null; } catch(error:any) { editor.error=error.message; } finally { editor.busy=false; onRender(); } return; }
      if (button.dataset.strategyAction === 'remove-label') { button.setAttribute('disabled',''); try { await changeLabel(button.dataset.key || '',button.dataset.label || '','remove'); } catch(error:any) { state.editor={kind:'labels',key:button.dataset.key || '',error:error.message,busy:false,loading:false,options:[]}; } onRender(); return; }
      if (button.dataset.strategyAction === 'copy' || button.dataset.strategyAction === 'copy-key') {
        const key = button.dataset.key || ''; const issue = state.issues.find(item => item.key === key); const url = 'https://jit.o3.ru/browse/' + key;
        try { const title=issue?.fields?.summary || ''; const text=button.dataset.strategyAction === 'copy-key' ? key : '[' + key + '](' + url + ') ' + title; if (button.dataset.strategyAction === 'copy' && window.ClipboardItem && navigator.clipboard.write) { try { await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([text],{type:'text/plain'}),'text/html':new Blob(['<a href="' + url + '">' + escape(key) + '</a> ' + escape(title)],{type:'text/html'})})]); } catch (_) { await navigator.clipboard.writeText(text); } } else await navigator.clipboard.writeText(text); button.title = 'Скопировано'; button.closest('details')?.removeAttribute('open'); actions?.notify?.('Скопировано'); }
        catch (_) { button.title = 'Не удалось скопировать'; }
      }
    }));
  }
  return {html, bind, load, planningFields:() => ({sprint:sprintField,epic:epicField,epicName:epicNameField}), rememberEpic:(key:string, fields:any) => { if (key) epicMetadata.set(key,{summary:fields.summary || key,status:fields.status?.name || '',category:fields.status?.statusCategory?.key || ''}); }, prepareFilters, getState:() => state, buildGraph, invalidateGraph, linkTheme, unlinkTheme, saveEpic, saveComponent, loadEditableSprints, saveSprint};
}
