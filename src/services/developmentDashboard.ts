import type {createJiraGroupingUi} from './jiraGroupingUi';

// Serialized into content.js. Keep this factory independent of module-level values.
export function renderJiraBadge(escapedLabel: string, category: string) {
  const colors: Record<string, string> = { active: 'done', done: 'done', future: 'progress', indeterminate: 'progress', progress: 'progress', review: 'review' };
  const color = Object.hasOwn(colors, category) ? colors[category] : 'todo';
  return '<span class="ozon-ext-badge ozon-ext-badge-' + color + '" title="' + escapedLabel + '">' + escapedLabel + '</span>';
}

export function createDevelopmentPointColumns() {
  const definitions = [
    ['Продукты', 'Story Points задач, у эпика которых customfield_24000 = «Стрим 1».'],
    ['Внепроектное', 'Story Points задач со «Стрим 2» у эпика, кроме эпика OBPROJECT-5201.'],
    ['Внепроектные баги', 'Story Points задач с Epic Link = OBPROJECT-5201, независимо от типа задачи.'],
    ['Проектное', 'Story Points задач, у эпика которых customfield_24000 = «Стрим 3».'],
    ['Технострим', 'Story Points задач, у эпика которых customfield_24000 = «Стрим 4».'],
    ['Роузи', 'Story Points задач, у эпика которых customfield_24000 = «Стрим 5».'],
  ];
  const matches = (stream:string,epicKey:string) => [stream==='Стрим 1',stream==='Стрим 2' && epicKey!=='OBPROJECT-5201',epicKey==='OBPROJECT-5201',stream==='Стрим 3',stream==='Стрим 4',stream==='Стрим 5'];
  return {definitions,matches};
}

export function createDevelopmentDashboard(onRender: () => void, onOpenTask?: (task:any, trigger:HTMLElement) => void, onBeforeEditor?:()=>void, renderBadge = renderJiraBadge, inferCategory?: (name: string) => string, widgetVersion = '', priorityService?: any, groupingUi?:ReturnType<typeof createJiraGroupingUi>, pointColumns = createDevelopmentPointColumns(), renderIssueType?: (name:string, iconUrl?:string) => string, reviewRowClass:(key:string,status:string)=>string=()=> '') {
  const teams = [{ id:'cs', name:'CS', boardId:6197,pointsField:'' },{id:'crm_core',name:'CRM_CORE',boardId:7180,pointsField:''},{id:'crm_bo',name:'CRM_BO',boardId:12696,pointsField:''}];
  const groupNames: Record<string, string> = { sprint:'Спринт', project:'Проект', epic:'Epic', stream:'Стрим', component:'Компонент' };
  const groupingStorage = 'ozon-dev-grouping-v1';
  const state = {
    teamId: '', teamIds:[] as string[], sprints: [] as any[], selected: [] as string[], groups: [] as any[],
    loadingSprints: false, loadingTasks: false, closedLoaded: false,
    error: '', progress: '', sprintQuery: '', teamOpen: false, sprintsOpen: false,
    collapsed: new Set<string>(), loadedSelection: [] as string[],
    grouping: ['sprint', 'project', 'epic'], depth: 0,
    expandedGroups: new Set<string>(), expandedLinks: new Set<string>(),
    menu: '', epicFilter: '', streamFilter: '', projectFilter: '', filterQuery: '',
    editor: null as null | {kind:string;key:string;query:string;options:any[];loading:boolean;busy:boolean;error:string;meta:any},
  };
  let settingsDraft: null | {grouping:string[];depth:number;layout:typeof layout;presented?:boolean} = null;
  let settingsScroll=0;
  let serial = 0;
  let controller: AbortController | null = null;
  let pointsField = '';
  let sprintField = '';
  let epicField = '';
  let epicNameField = '';
  let editorRequest = 0;
  const componentOptionsCache = new Map<string, any[]>();
  let issueLinkTypesPromise: Promise<any[]> | null = null;
  let jiraFieldsPromise: Promise<any[]> | null = null;
  let epicCatalogPromise: Promise<any[]> | null = null;
  let epicCatalogItems: any[] = [];
  let epicCatalogUpdate: ((issues:any[]) => void) | null = null;
  async function getJiraFields() {
    if (!jiraFieldsPromise) jiraFieldsPromise = json('/rest/api/2/field', new AbortController().signal)
      .catch((error:any) => { jiraFieldsPromise = null; throw error; });
    return jiraFieldsPromise;
  }
  async function getIssueLinkTypes() {
    if (!issueLinkTypesPromise) issueLinkTypesPromise = json('/rest/api/2/issueLinkType', new AbortController().signal)
      .then((data:any) => Array.isArray(data.issueLinkTypes) ? data.issueLinkTypes : [])
      .catch((error:any) => { issueLinkTypesPromise = null; throw error; });
    return issueLinkTypesPromise;
  }
  const baseColumns = { key:['Ключ',285], title:['Название',430], epic:['Epic Link',170], status:['Статус',175], sprint:['Спринт',235], component:['Компонент',180], points:['Story Points',120] } as Record<string, [string, number]>;
  const defaultColumnOrder = ['key','title','epic','status','sprint','component','points'];
  const columns = pointColumns.definitions;
  const defaultMetricOrder = columns.map((_,index)=>index);
  const columnTitles = {...Object.fromEntries(Object.entries(baseColumns).map(([id,[title]])=>[id,title])),points:'Всего SP'};
  const metricTitles = Object.fromEntries(columns.map(([title],index)=>['metric-'+index,title]));
  const canHideColumn = (id:string) => id!=='key' && (Object.hasOwn(baseColumns,id) || Object.hasOwn(metricTitles,id));
  const layout = { detailsOpen:true, epicDisplay:'full', order:[...defaultColumnOrder], children:[...defaultMetricOrder], hidden:[] as string[], widths:{} as Record<string,number> };
  try {
    const grouping = JSON.parse(localStorage.getItem(groupingStorage) || 'null');
    if (Array.isArray(grouping?.order) && grouping.order.every((key:string)=>Object.hasOwn(groupNames,key))) {
      state.grouping=[...new Set<string>(grouping.order)];
      if (Number.isInteger(grouping.depth)) state.depth=Math.max(0,Math.min(grouping.depth,state.grouping.length+1));
    }
    const saved = JSON.parse(localStorage.getItem('ozon-dev-columns') || 'null');
    if (saved) {
      if (typeof saved.detailsOpen === 'boolean') layout.detailsOpen = saved.detailsOpen;
      if (['key','status','full'].includes(saved.epicDisplay)) layout.epicDisplay = saved.epicDisplay;
      if (Array.isArray(saved.order)) {
        const savedOrder = saved.order as string[];
        layout.order = ['key', ...new Set(savedOrder.filter(id => id !== 'key' && Object.hasOwn(baseColumns,id))), ...defaultColumnOrder.filter(id => id !== 'key' && !savedOrder.includes(id))];
      }
      if (Array.isArray(saved.children) && saved.children.length === defaultMetricOrder.length && new Set(saved.children).size === defaultMetricOrder.length && saved.children.every((id: number) => defaultMetricOrder.includes(id))) layout.children = saved.children;
      if (Array.isArray(saved.hidden)) layout.hidden = [...new Set<string>(saved.hidden.filter((id:unknown)=>typeof id==='string' && canHideColumn(id)))];
      Object.entries(saved.widths || {}).forEach(([id, width]) => { if (Number.isFinite(width)) layout.widths[id] = Math.max(70, Math.min(1000, Number(width))); });
    }
  } catch (_) { /* Storage may be unavailable in a preview or restricted Jira page. */ }
  const saveLayout = () => { try { localStorage.setItem('ozon-dev-columns', JSON.stringify(layout)); } catch (_) { /* Layout still works in memory. */ } };
  const saveGrouping = () => { try { localStorage.setItem(groupingStorage,JSON.stringify({order:state.grouping,depth:state.depth})); } catch (_) {} };
  function moveColumn(id: string, direction: number, child = false) {
    const order = child ? layout.children.map(String) : [...layout.order];
    const from = order.indexOf(id); const to = from + direction;
    if (from < (child ? 0 : 1) || to < (child ? 0 : 1) || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    if (child) layout.children = order.map(Number); else layout.order = order;
    saveLayout(); onRender();
  }
  const escape = (value: any) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const selectedTeams = () => teams.filter(item => state.teamIds.includes(item.id));
  const team = () => teams.find(item => item.id === state.teamId);
  function cancel() {
    ++serial;
    controller?.abort();
    controller = null;
    state.loadingTasks = false;
    state.loadingSprints = false;
    state.editor = null; ++editorRequest;
  }
  async function json(url: string, signal: AbortSignal) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal });
    if (!response.ok) throw new Error('Не удалось получить данные Jira (HTTP ' + response.status + ')');
    return response.json();
  }
  async function pages(url: string, property: string, signal: AbortSignal) {
    const result: any[] = [];
    const seen = new Set<string>();
    let startAt = 0;
    while (true) {
      const data = await json(url + (url.includes('?') ? '&' : '?') + 'startAt=' + startAt + '&maxResults=100', signal);
      const items = data[property];
      if (!Array.isArray(items)) throw new Error('Jira вернула данные в неизвестном формате');
      if (!items.length) {
        if (Number(data.total) > startAt) throw new Error('Jira вернула неполную страницу результатов. Повторите загрузку.');
        break;
      }
      const fingerprint = items.map((item: any) => item.id || item.key).join(',');
      if (seen.has(fingerprint)) throw new Error('Jira повторяет страницу результатов. Повторите загрузку.');
      seen.add(fingerprint);
      result.push(...items);
      startAt += items.length;
      if (data.isLast === true || (typeof data.total === 'number' && startAt >= data.total)) break;
      if (data.isLast !== false && typeof data.total !== 'number' && items.length < Number(data.maxResults || 100)) break;
    }
    return result;
  }
  const sprintSort = (a: any, b: any) => {
    const order: Record<string, number> = { active: 0, future: 1, backlog: 2, closed: 3 };
    const rank = (order[a.state] ?? 3) - (order[b.state] ?? 3);
    if (rank) return rank;
    const dates = (Date.parse(a.startDate || '') || 0) - (Date.parse(b.startDate || '') || 0);
    return (a.state === 'closed' ? -dates : dates) || a.name.localeCompare(b.name, 'ru', { numeric: true });
  };
  async function selectTeam(id: string | string[], keepOpen=false) {
    cancel();
    state.teamIds = (Array.isArray(id) ? id : [id]).filter(value => teams.some(item => item.id === value));
    state.teamId = state.teamIds[0] || '';
    state.selected = [];
    state.groups = [];
    state.loadedSelection = [];
    state.sprints = [];
    state.closedLoaded = false;
    state.epicFilter = ''; state.streamFilter = ''; state.menu = '';
    state.expandedLinks.clear(); state.collapsed.clear(); state.expandedGroups.clear();
    state.error = '';
    state.teamOpen = keepOpen;
    state.sprintsOpen = false;
    pointsField = '';
    if (!team()) { onRender(); return; }
    state.loadingSprints = true;
    onRender();
    controller = new AbortController();
    const current = serial;
    try {
      const fields = await getJiraFields();
      if(current!==serial)return;
      const selected = selectedTeams();
      const result = (await Promise.all(selected.map(async selectedTeam => {
        if(!selectedTeam.boardId) {
          const matches=await pages('/rest/agile/1.0/board?type=scrum&name='+encodeURIComponent(selectedTeam.name),'values',controller.signal);
          if(current!==serial)return;
          const normalized=(name:string)=>name.toUpperCase().replace(/[^A-Z0-9]/g,'');
          const exact=matches.filter(board=>normalized(board.name || '')===normalized(selectedTeam.name));
          if(exact.length!==1) throw new Error('Не удалось однозначно определить доску команды '+selectedTeam.name+'. В Jira должна быть одна Scrum-доска с этим названием.');
          selectedTeam.boardId=Number(exact[0].id);
        }
        const boardId=selectedTeam.boardId;
        const [configuration,sprints]=await Promise.all([json('/rest/agile/1.0/board/'+boardId+'/configuration',controller.signal),pages('/rest/agile/1.0/board/'+boardId+'/sprint?state=active,future','values',controller.signal)]);
        if(current!==serial)return;
        const field=configuration.estimation?.field?.fieldId;
        if(!field) throw new Error('Для доски '+selectedTeam.name+' не настроена оценка Story Points.');
        selectedTeam.pointsField=field;
        return sprints.filter(item=>Number(item.originBoardId)===boardId).map(item=>({...item,boardId,pointsField:field,teamName:selectedTeam.name}));
      }))).flat();
      if(current!==serial)return;
      // Keep the fallback deterministic; the per-team requests above finish in arbitrary order.
      pointsField = selected[0]?.pointsField || '';
      sprintField = fields.find((field:any)=>field.schema?.custom==='com.pyxis.greenhopper.jira:gh-sprint')?.id || '';
      epicField = fields.find((field:any)=>field.schema?.custom==='com.pyxis.greenhopper.jira:gh-epic-link')?.id || fields.find((field:any)=>/^(epic link|ссылка на эпик)$/i.test(String(field.name || field.untranslatedName || '').trim()))?.id || '';
      epicNameField=fields.find((field:any)=>field.schema?.custom==='com.pyxis.greenhopper.jira:gh-epic-label')?.id || fields.find((field:any)=>/^epic name$/i.test(String(field.name || field.untranslatedName || '').trim()))?.id || '';
      const backlogOptions = selected.map(item => ({id:'backlog-' + item.id, name:'Бэклог · ' + item.name, state:'backlog', boardId:item.boardId, pointsField:item.pointsField, teamName:item.name, isBacklog:true}));
      state.sprints=Array.from(new Map([...result,...backlogOptions].map(item=>[String(item.id),item])).values()).sort(sprintSort);
    } catch (error: any) {
      if (current === serial && error.name !== 'AbortError') state.error = error.message;
    } finally {
      if (current === serial) { state.loadingSprints = false; onRender(); }
    }
  }
  async function loadClosedSprints() {
    if (!team() || state.loadingSprints || state.loadingTasks || state.closedLoaded) return;
    cancel();
    const current = serial;
    controller = new AbortController();
    state.loadingSprints = true;
    state.error = '';
    onRender();
    try {
      const unique = new Map(state.sprints.map(sprint => [String(sprint.id), sprint]));
      const closedByTeam = await Promise.all(selectedTeams().map(async selectedTeam => {
        const boardId=selectedTeam.boardId;
        const closed=await pages('/rest/agile/1.0/board/'+boardId+'/sprint?state=closed','values',controller.signal);
        return closed.filter(item=>Number(item.originBoardId)===boardId).map(item=>({...item,boardId,pointsField:selectedTeam.pointsField,teamName:selectedTeam.name}));
      }));
      if(current!==serial)return;
      closedByTeam.flat().forEach(item=>unique.set(String(item.id),item));
      state.sprints = Array.from(unique.values()).sort(sprintSort);
      state.closedLoaded = true;
    } catch (error: any) {
      if (current === serial && error.name !== 'AbortError') state.error = error.message;
    } finally {
      if (current === serial) { state.loadingSprints = false; onRender(); }
    }
  }
  function setSelection(ids: string[]) {
    // Selection never loads issues. Discard results for the previous selection.
    const scrollTop = document.querySelector('.ozon-dev-sprints .ozon-dev-sprint-list')?.scrollTop || 0;
    cancel();
    const allowed = new Set(state.sprints.map(sprint => String(sprint.id)));
    state.selected = [...new Set(ids.filter(id => allowed.has(String(id))).map(String))];
    state.epicFilter = ''; state.streamFilter = ''; state.menu = '';
    state.groups = [];
    state.loadedSelection = [];
    state.error = '';
    onRender();
    const list = document.querySelector('.ozon-dev-sprints .ozon-dev-sprint-list');
    if (list) list.scrollTop = scrollTop;
  }
  function normalizeIssue(issue: any, estimateField=pointsField) {
    const fields = issue.fields || {};
    const epic = fields.epic && typeof fields.epic === 'object' ? fields.epic : null;
    const rawPoints = fields[estimateField];
    const numeric = typeof rawPoints === 'number' || (typeof rawPoints === 'string' && rawPoints.trim() !== '') ? Number(rawPoints) : NaN;
    return {
      key: String(issue.key), summary: String(fields.summary || issue.key),
      epicKey: epic?.key || fields.parent?.key || (typeof fields[epicField] === 'string' ? fields[epicField] : fields[epicField]?.key || fields[epicField]?.value) || '', epicTitle: epic?.summary || epic?.name || fields.parent?.fields?.summary || '',
      epicStatus: '', epicCategory: '',
      project: fields.project?.key || String(issue.key).split('-')[0],
      componentId: fields.components?.[0]?.id ? String(fields.components[0].id) : '',
      componentNames: Array.isArray(fields.components) ? fields.components.map((item:any) => item.name).filter(Boolean) : [],
      component: fields.components?.map((item:any) => item.name).filter(Boolean).join(', ') || 'Без компонента',
      labels: Array.isArray(fields.labels) ? fields.labels : [],
      priority: String(fields.priority?.name || 'Не указан'), issueType: String(fields.issuetype?.name || 'Задача'),
      issueTypeIconUrl: fields.issuetype?.iconUrl || '',
      links: (fields.issuelinks || []).flatMap((link: any) => {
        const target = link.outwardIssue || link.inwardIssue;
        if (!target?.key) return [];
        const type = link.type || {};
        return [{ key:target.key, summary:target.fields?.summary || target.key, status:target.fields?.status?.name || 'Статус недоступен', category:target.fields?.status?.statusCategory?.key || '', projectTask:/задача проекта|project task/i.test([type.name, type.inward, type.outward].join(' ')) }];
      }),
      points: Number.isFinite(numeric) ? numeric : null,
      status: fields.status?.name || 'Статус недоступен', category: fields.status?.statusCategory?.key || '',
      history: [fields[sprintField], fields.closedSprints, fields.sprint].flat().filter(Boolean),
      stream: '', allocations: [] as (number | null)[],
    };
  }
  function parseSprint(value: any): any {
    if (value && typeof value === 'object') return { ...value, state:String(value.state || '').toLowerCase() };
    if (typeof value !== 'string') return null;
    // Older Jira versions serialize the Sprint field as GreenHopper strings.
    const get = (name: string) => new RegExp('(?:\\[|,)' + name + '=([^,\\]]*)').exec(value)?.[1];
    const id = get('id');
    return id ? { id, startDate: get('startDate'), name: get('name'), state:String(get('state') || '').toLowerCase() } : null;
  }
  const isCurrentSprint = (sprint: any) => ['active','future'].includes(sprint?.state);
  const isEpic = (name: string) => /^(epic|эпик)$/i.test(name.trim());
  function lastSprint(history: any[]) {
    return history.map(parseSprint).filter(item => item?.id).map(item => {
      const known = state.sprints.find(sprint => String(sprint.id) === String(item.id));
      return known ? {...known, ...item, state:item.state || known.state} : item;
    }).sort((a, b) => {
      const current = Number(isCurrentSprint(a)) - Number(isCurrentSprint(b));
      if (current) return current;
      const aDate = Date.parse(a.startDate || '');
      const bDate = Date.parse(b.startDate || '');
      // Jira does not order closedSprints chronologically. Never take its last array item.
      return Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate ? aDate - bDate : Number(a.id) - Number(b.id);
    }).at(-1);
  }
  function allocate(issue: any) {
    issue.allocations = pointColumns.matches(issue.stream,issue.epicKey).map(match => match ? issue.points : null);
  }
  async function loadTasks() {
    if (!team() || !pointsField || !state.selected.length || state.loadingSprints || state.loadingTasks) return;
    cancel();
    const current = serial;
    controller = new AbortController();
    const signal = controller.signal;
    const selected = [...state.selected];
    const groups: any[] = [];
    state.groups = [];
    state.loadedSelection = [];
    state.error = '';
    state.loadingTasks = true;
    state.menu = '';
    state.sprintsOpen = false;
    onRender();
    try {
      for (let index = 0; index < selected.length; index++) {
        const sprint = state.sprints.find(item => String(item.id) === selected[index]);
        if (!sprint) throw new Error('Выбранный спринт больше недоступен. Обновите список.');
        state.progress = 'Загружаем спринт ' + (index + 1) + ' из ' + selected.length + ': ' + sprint.name;
        onRender();
        const fields = encodeURIComponent(['summary', 'status', 'issuetype', 'epic', 'parent', epicField, epicNameField, 'project', 'priority', 'issuelinks', 'sprint', 'closedSprints', 'components', 'labels', sprintField, sprint.pointsField || pointsField].filter(Boolean).join(','));
        const endpoint = sprint.isBacklog ? '/rest/agile/1.0/board/' + sprint.boardId + '/backlog' : '/rest/agile/1.0/board/' + (sprint.boardId || sprint.originBoardId) + '/sprint/' + encodeURIComponent(sprint.id) + '/issue';
        const raw = await pages(endpoint + '?fields=' + fields, 'issues', signal);
        if (current !== serial) return;
        const issues = Array.from(new Map(raw.filter(item => item.key).map(item => [item.key, normalizeIssue(item,sprint.pointsField || pointsField)])).values());
        groups.push({ sprint, issues });
      }
      if (current !== serial) return;
      const unique = new Map<string, any>();
      groups.forEach(group => group.issues.forEach((issue: any) => {
        const previous = unique.get(issue.key);
        if (previous) { previous.history.push(...issue.history, ...(group.sprint.isBacklog ? [] : [group.sprint])); if (group.sprint.isBacklog) previous.backlogIds.push(String(group.sprint.id)); }
        else unique.set(issue.key, { ...issue, history: [...issue.history, ...(group.sprint.isBacklog ? [] : [group.sprint])], backlogIds: group.sprint.isBacklog ? [String(group.sprint.id)] : [] });
      }));
      const epicKeys = [...new Set([...unique.values()].flatMap(issue => [issue.epicKey, ...issue.links.map((link: any) => link.key)]).filter(Boolean))];
      const epics = new Map<string, any>();
      for (let index = 0; index < epicKeys.length; index += 50) {
        state.progress = 'Получаем эпики и связи: ' + Math.min(index + 50, epicKeys.length) + ' из ' + epicKeys.length;
        onRender();
        const jql = 'key in (' + epicKeys.slice(index, index + 50).map(key => '"' + String(key).replace(/[^A-Za-z0-9-]/g, '') + '"').join(',') + ')';
        const result = await pages('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=' + encodeURIComponent(['summary','status','issuetype','priority','customfield_24000','sprint','closedSprints','components','labels','epic','parent',epicField,epicNameField,sprintField].filter(Boolean).join(',')), 'issues', signal);
        if (current !== serial) return;
        result.forEach(epic => epics.set(epic.key, epic.fields || {}));
      }
      const relatedEpicKeys = [...new Set([...epics.values()].map(fields => normalizeIssue({key:'RELATED-0',fields}).epicKey).filter(key => key && !epics.has(key)))];
      for (let index = 0; index < relatedEpicKeys.length; index += 50) {
        const jql = 'key in (' + relatedEpicKeys.slice(index,index+50).map(key => '"' + String(key).replace(/[^A-Za-z0-9-]/g,'') + '"').join(',') + ')';
        const found = await pages('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&fields=summary,status', 'issues', signal);
        if (current !== serial) return;
        found.forEach(item => epics.set(item.key,item.fields || {}));
      }
      const groupsById = new Map(groups.map(group => [String(group.sprint.id), group]));
      groups.forEach(group => { group.issues = []; });
      unique.forEach(issue => {
        const epic = epics.get(issue.epicKey);
        const stream = epic?.customfield_24000;
        issue.stream = typeof stream === 'string' ? stream : stream?.value || '';
        if (epic?.summary) issue.epicTitle = epic.summary;
        issue.epicType = epic?.issuetype?.name || '';
        issue.epicTypeIconUrl = epic?.issuetype?.iconUrl || '';
        issue.epicPriority = epic?.priority?.name || '';
        issue.epicStatus = epic?.status?.name || 'Статус недоступен';
        issue.epicCategory = epic?.status?.statusCategory?.key || '';
        issue.epicComponent = (epic?.components || []).map((component:any) => component.name).filter(Boolean).join(', ');
        issue.links.forEach((link: any) => {
          const target = epics.get(link.key);
          if (target?.summary) link.summary = target.summary;
          if (target?.status) { link.status = target.status.name; link.category = target.status.statusCategory?.key || ''; }
          link.priority = target?.priority?.name || 'Не указан';
          link.issueType = target?.issuetype?.name || 'Задача';
          link.issueTypeIconUrl = target?.issuetype?.iconUrl || '';
          link.component = Array.isArray(target?.components) ? target.components.map((component:any) => component.name).filter(Boolean).join(', ') || 'Без компонента' : 'Без компонента';
          const related = normalizeIssue({key:link.key,fields:target || {}});
          link.epicKey = related.epicKey;
          const relatedEpic = epics.get(link.epicKey);
          link.epicTitle = relatedEpic?.summary || related.epicTitle || '';
          link.epicStatus = relatedEpic?.status?.name || '';
          link.epicCategory = relatedEpic?.status?.statusCategory?.key || '';
          link.sprint = lastSprint(related.history);
        });
        allocate(issue);
        const latest = lastSprint(issue.history);
        const groupId = !isCurrentSprint(latest) && issue.backlogIds.length ? issue.backlogIds[0] : String(latest?.id || '');
        const group = groupsById.get(groupId);
        if (group) {
          issue.sprint = group.sprint;
          issue.lastSprintId = groupId;
          group.issues.push(issue);
        }
      });
      state.groups = groups;
      state.loadedSelection = selected;
    } catch (error: any) {
      if (current === serial && error.name !== 'AbortError') state.error = error.message;
    } finally {
      if (current === serial) { state.loadingTasks = false; state.progress = ''; onRender(); }
    }
  }
  function badge(name: string, category: string) {
    return renderBadge(escape(name), category || inferCategory?.(name) || 'todo');
  }
  const stateName = (value: string) => ({ active: 'Активный', future: 'Будущий', closed: 'Прошедший', backlog: 'Бэклог' }[value] || value);
  const issueLink = (key: string) => '<a class="ozon-mono" href="https://jit.o3.ru/browse/' + encodeURIComponent(key) + '" target="_blank" rel="noopener noreferrer">' + escape(key) + '</a>';
  const pointColumnsShown = () => [
    ...(!layout.hidden.includes('points') ? ['points'] : []),
    ...(layout.detailsOpen ? layout.children.map(index=>'metric-'+index).filter(id=>!layout.hidden.includes(id)) : [])
  ];
  const flatColumns = () => layout.order.flatMap(id => id === 'points' ? pointColumnsShown() : layout.hidden.includes(id) ? [] : [id]);
  const columnWidth = (id: string) => layout.widths[id] || baseColumns[id]?.[1] || 145;
  function rowCells(values: Record<string,string>) {
    return flatColumns().map(id => '<td data-column="' + id + '"' + (id === 'points' || id.startsWith('metric-') ? ' class="ozon-dev-points"' : '') + '>' + (values[id] || '') + '</td>').join('');
  }
  function groupCells(keyHtml: string, label: string, items: any[], epicStatusHtml = '', componentHtml = '') {
    const ids = flatColumns();
    // Merge the longest run outside the SP family, whatever column order the user chose.
    let bestStart = 0, bestLength = 0, start = 0, length = 0;
    ids.forEach((id, index) => {
      if (id === 'key' || id === 'points' || id.startsWith('metric-') || (epicStatusHtml && id === 'status') || (componentHtml && id === 'component')) { length = 0; return; }
      if (!length) start = index;
      length++;
      if (length > bestLength) { bestStart = start; bestLength = length; }
    });
    return ids.map((id, index) => {
      if (id === 'key') return '<td data-column="key">' + keyHtml + '</td>';
      if (bestLength && index === bestStart) return '<td colspan="' + bestLength + '">' + label + '</td>';
      if (index > bestStart && index < bestStart + bestLength) return '';
      return '<td data-column="' + id + '"' + (id === 'component' ? '' : ' class="ozon-dev-points"') + '>' + (id === 'status' ? epicStatusHtml : id === 'component' ? componentHtml : id === 'points' ? pointPair(items) : id.startsWith('metric-') ? pointPair(items,Number(id.slice(7))) : '') + '</td>';
    }).join('');
  }
  function sprintHtml(sprint: any, key = '') {
    const content = sprint?.name ? '<div class="ozon-dev-epic-inline ozon-dev-sprint-value" title="' + escape(sprint.name) + '"><span class="ozon-dev-ellipsis">' + escape(sprint.name) + '</span>' + (sprint.state ? badge(stateName(sprint.state), sprint.state) : '') + '</div>' : '<span class="ozon-ext-group-total">Не в спринте</span>';
    return key ? '<button class="ozon-dev-cell-edit" data-dev-action="edit-sprint" data-key="' + escape(key) + '" aria-label="Изменить спринт ' + escape(key) + '">' + content + '<span class="ozon-ext-toolbar-chevron"></span></button>' : content;
  }
  function pointPair(items: any[], index = -1) {
    const value = (issue: any) => index < 0 ? issue.points : issue.allocations[index] ?? null;
    const assessed = items.filter(issue => value(issue) !== null);
    if (!assessed.length) return '<span title="Нет оценки">—</span>';
    const total = assessed.reduce((sum, issue) => sum + value(issue), 0);
    const burned = assessed.filter(issue => issue.category === 'done').reduce((sum, issue) => sum + value(issue), 0);
    const allPoints = index < 0 ? 0 : items.reduce((sum, issue) => sum + (Number.isFinite(issue.points) ? issue.points : 0), 0);
    const percent = index < 0 ? (total > 0 ? Math.round(burned / total * 1000) / 10 : null) : (allPoints > 0 ? Math.round(total / allPoints * 1000) / 10 : null);
    const percentLabel = percent === null ? '' : String(percent).replace('.', ',') + '%';
    const percentDescription = index < 0 ? 'доля сожжённых SP' : 'доля от всех SP в этой строке';
    return '<span class="ozon-dev-point-pair" aria-label="Всего ' + total + ', сожжено ' + burned + (percentLabel ? ', ' + percentDescription + ' ' + percentLabel : '') + '" title="Всего / Сожжено. Сожжено — SP задач в категории Jira «Готово».' + (percentLabel ? ' ' + percentDescription + ': ' + percentLabel + '.' : '') + '"><span>' + total + '</span><span class="ozon-dev-points-divider"> / </span><span class="ozon-dev-burned">' + burned + '</span>' + (percentLabel ? ' <span class="ozon-dev-point-percent">' + percentLabel + '</span>' : '') + '</span>';
  }
  function visibleIssues() {
    return state.groups.flatMap(group => group.issues.map((issue: any) => ({ ...issue, sprint:group.sprint }))).filter(issue =>
      (!state.projectFilter || issue.project === state.projectFilter) && (!state.epicFilter || (state.epicFilter === '__none' ? !issue.epicKey : issue.epicKey === state.epicFilter)) &&
      (!state.streamFilter || (state.streamFilter === '__none' ? !issue.stream : issue.stream === state.streamFilter)));
  }
  function setGrouping(order: string[]) {
    state.grouping = [...new Set(order.filter(value => ['sprint', 'project', 'epic', 'stream', 'component'].includes(value)))];
    state.depth = state.grouping.length;
    state.collapsed.clear(); state.expandedGroups.clear();
    saveGrouping();
    onRender();
  }
  function setDepth(depth: number) {
    state.depth = Math.max(0, Math.min(state.grouping.length+1, depth));
    state.collapsed.clear(); state.expandedGroups.clear(); state.expandedLinks.clear();
    saveGrouping();
    onRender();
  }
  function statusSummary(items: any[]) {
    const statuses = new Map<string, number>();
    items.forEach(issue => statuses.set(issue.status, (statuses.get(issue.status) || 0) + 1));
    return '<span class="ozon-ext-status-summary" aria-label="Сводка по статусам">' + [...statuses].map(([name, count]) => '<span class="ozon-ext-status-count">' + escape(name) + ' · ' + count + '</span>').join('') + '</span>';
  }
  function epicHtml(issue: any) {
    const content = issue.epicKey ? issueLink(issue.epicKey) + (layout.epicDisplay !== 'key' && issue.epicStatus ? badge(issue.epicStatus,issue.epicCategory) : '') + (layout.epicDisplay === 'full' ? '<span class="ozon-dev-ellipsis">' + escape(issue.epicTitle) + '</span>' : '') : '<span class="ozon-dev-ellipsis" style="color:#D92D20;">Без эпика</span>';
    return '<div class="ozon-dev-epic-inline ozon-dev-cell-edit" role="button" tabindex="0" data-dev-action="edit-epic" data-key="' + escape(issue.key) + '" aria-label="Изменить эпик ' + escape(issue.key) + '" title="' + escape([issue.epicKey,issue.epicStatus,issue.epicTitle].filter(Boolean).join(' · ')) + '">' + content + '<span class="ozon-ext-toolbar-chevron"></span></div>';
  }
  function indicators(issue: any) {
    const projectLinks = issue.links.filter((link: any) => link.projectTask);
    const missing = !projectLinks.length;
    const chain = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
    const linkTitle = missing ? 'Нет связи «Задача проекта»' : 'Задача проекта: ' + projectLinks.map((link: any) => link.key).join(', ');
    let html = '<span class="ozon-dev-indicator ' + (missing ? 'missing' : 'done') + '" role="img" aria-label="' + escape(linkTitle) + '" title="' + escape(linkTitle) + '">' + chain + '</span>';
    if (issue.project === 'OBFRONT') {
      const designs = issue.links.filter((link: any) => /^FTD-\d+$/i.test(link.key) && !/отмен|cancel/i.test(link.status));
      const color = !designs.length ? 'absent' : designs.every((link: any) => link.category === 'done' || /^(готово|закрыт[ао]?|done|closed)$/i.test(link.status)) ? 'done' : 'active';
      const title = 'Дизайн: ' + (!designs.length ? 'нет задач' : color === 'done' ? 'все задачи закрыты' : 'есть незакрытые задачи') + (designs.length ? ' · ' + designs.map((link: any) => link.key + ' — ' + link.status).join('; ') : '');
      html += '<span class="ozon-dev-indicator ' + color + '" role="img" aria-label="' + escape(title) + '" title="' + escape(title) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20c2 0 2-2 1-3s-1-3 1-3h2a6 6 0 0 0 6-6c0-4-5-8-10-8Z"/><circle cx="7" cy="10" r="1"/><circle cx="10" cy="6" r="1"/><circle cx="16" cy="7" r="1"/></svg></span>';
    }
    return html;
  }
  function priorityHtml(name: string) {
    const high = /highest|blocker|critical|крит|блок|наивыс/i.test(name);
    const raised = high || /high|высок/i.test(name);
    const low = /low|низк/i.test(name);
    const path = raised ? '<path d="m6 14 6-6 6 6"/>' + (high ? '<path d="m6 19 6-6 6 6"/>' : '') : low ? '<path d="m6 8 6 6 6-6"/>' : '<path d="M5 10h14M5 15h14"/>';
    return '<span class="ozon-dev-priority" role="img" aria-label="Приоритет: ' + escape(name) + '" title="Приоритет: ' + escape(name) + '" style="color:' + (raised ? '#E5484D' : low ? '#005BFF' : '#D97706') + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + path + '</svg></span>';
  }
  function priorityRank(name:string) {
    if (/highest|blocker|critical|крит|блок|наивыс/i.test(name)) return 0;
    if (/high|высок/i.test(name)) return 1;
    if (/medium|normal|standard|средн|стандарт|обычн/i.test(name)) return 2;
    if (/low|низк/i.test(name)) return 3;
    return 4;
  }
  const taskTypeBadge = (name = 'Задача', iconUrl?:string) => renderIssueType?.(name,iconUrl) || '<span class="ozon-ext-type-pill">' + escape(name) + '</span>';

  function taskRows(items: any[], level: number, groupPath: string) {
    return [...items].sort((a,b) => priorityRank(a.priority || '') - priorityRank(b.priority || '') || a.key.localeCompare(b.key,'ru',{numeric:true})).map(issue => {
      const expanded = state.expandedLinks.has(issue.key) !== (state.depth > state.grouping.length);
      const key = escape(issue.key);
      const values: Record<string,string> = {
        key:'<div class="ozon-dev-task-key" style="padding-left:' + level*18 + 'px;"><button class="ozon-dev-link-toggle" data-dev-action="links" data-key="' + key + '" aria-label="Связи «Задача проекта» для ' + key + '" aria-expanded="' + expanded + '">' + (expanded ? '▾' : '▸') + '</button>' + issueLink(issue.key) + taskTypeBadge(issue.issueType,issue.issueTypeIconUrl) + '<button type="button" class="ozon-dev-priority-edit" data-dev-action="edit-priority" data-key="' + key + '" aria-label="Изменить приоритет ' + key + '">' + priorityHtml(issue.priority) + '</button></div>',
        title:'<div class="ozon-dev-task-title"><span class="ozon-dev-ellipsis" title="' + escape(issue.summary) + '">' + escape(issue.summary) + '</span><span class="ozon-dev-indicators">' + indicators(issue) + '</span></div>',
        epic:epicHtml(issue), status:badge(issue.status,issue.category), sprint:sprintHtml(issue.sprint,isEpic(issue.issueType || '') ? '' : issue.key), component:'<button class="ozon-dev-cell-edit" data-dev-action="edit-component" data-key="' + key + '" aria-label="Изменить компонент ' + key + '" title="' + escape(issue.component || 'Без компонента') + '"><span class="ozon-dev-ellipsis">' + escape(issue.component || 'Без компонента') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>', points:pointPair([issue]),
      };
      columns.forEach((_,index) => { values['metric-'+index] = pointPair([issue],index); });
      let html = '<tr data-dev-row="links" class="ozon-dev-task ozon-tree-depth-' + (level % 2) + ' ' + (!issue.epicKey ? 'ozon-dev-no-epic' : issue.category === 'done' ? 'ozon-dev-completed' : '') + reviewRowClass(issue.key,issue.status) + '">' + rowCells(values) + '</tr>';
      if (expanded) {
        const links = issue.links.filter((link:any) => link.projectTask);
        html += links.length ? links.map((link:any) => '<tr class="ozon-dev-related ozon-tree-depth-' + ((level + 1) % 2) + ' ' + (link.category === 'done' ? 'ozon-dev-completed' : '') + reviewRowClass(link.key,link.status) + '" data-details-row="' + escape(JSON.stringify([groupPath, issue.key, link.key])) + '">' + rowCells({
          key:'<div class="ozon-dev-task-key" style="padding-left:' + (level+1)*18 + 'px;"><span style="color:#94A3B8;">↳</span><span class="ozon-ext-link-type-tag" role="img" aria-label="Задача проекта" title="Тип связи: Задача проекта"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg></span>' + issueLink(link.key) + taskTypeBadge(link.issueType,link.issueTypeIconUrl) + '<button type="button" class="ozon-dev-priority-edit" data-priority-key="' + escape(link.key) + '" title="Изменить приоритет: ' + escape(link.priority || 'Не указан') + '" aria-label="Изменить приоритет ' + escape(link.key) + '">' + priorityHtml(link.priority || 'Не указан') + '</button></div>',
          title:'<div class="ozon-dev-task-title"><span class="ozon-dev-ellipsis" title="' + escape(link.summary) + '">' + escape(link.summary) + '</span>' + (/^FCRM-/i.test(link.key) ? '<button type="button" class="ozon-ext-inner-ctrl ozon-ext-open-sb-btn" data-dev-action="open-fcrm" data-details-trigger aria-expanded="false" data-key="' + escape(link.key) + '">Детали</button>' : '') + '</div>',
          epic:link.epicKey ? '<div class="ozon-dev-epic-inline" title="' + escape([link.epicKey,link.epicStatus,link.epicTitle].filter(Boolean).join(' · ')) + '">' + issueLink(link.epicKey) + (layout.epicDisplay !== 'key' && link.epicStatus ? badge(link.epicStatus,link.epicCategory) : '') + (layout.epicDisplay === 'full' ? '<span class="ozon-dev-ellipsis">' + escape(link.epicTitle) + '</span>' : '') + '</div>' : '', status:badge(link.status,link.category), sprint:sprintHtml(link.sprint), component:'<span class="ozon-dev-ellipsis" title="' + escape(link.component || 'Без компонента') + '">' + escape(link.component || 'Без компонента') + '</span>',
        }) + '</tr>').join('') : '<tr class="ozon-dev-related"><td colspan="' + flatColumns().length + '" style="padding-left:' + ((level+1)*18+12) + 'px;color:#D92D20;">Нет связей «Задача проекта» <button class="ozon-ext-btn" data-dev-action="edit-link" data-key="' + key + '">Связать с FCRM</button></td></tr>';
      }
      return html;
    }).join('');
  }
  function renderGroups(items: any[], level = 0, path = ''): string {
    if (level >= state.grouping.length) return taskRows(items, level, path);
    const dimension = state.grouping[level];
    const groups = new Map<string, any[]>();
    items.forEach(issue => {
      const keys = dimension === 'component' ? (issue.componentNames?.length ? issue.componentNames : ['Без компонента']) : [String(dimension === 'sprint' ? issue.sprint.id : dimension === 'project' ? issue.project : dimension === 'stream' ? issue.stream : issue.epicKey || '')];
      keys.forEach((key:string) => { if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(issue); });
    });
    return [...groups].sort(([a], [b]) => !a ? 1 : !b ? -1 : dimension === 'sprint' ? sprintSort(groups.get(a)![0].sprint, groups.get(b)![0].sprint) : a.localeCompare(b, 'ru', { numeric:true })).map(([key, children]) => {
      const groupId = path + '/' + dimension + ':' + key;
      const closed = state.collapsed.has(groupId) || (level >= state.depth && !state.expandedGroups.has(groupId));
      const first = children[0];
      const priorityControl = dimension === 'epic' && key ? '<button type="button" class="ozon-dev-priority-edit" data-priority-key="' + escape(key) + '" title="Изменить приоритет: ' + escape(first.epicPriority || 'Не указан') + '" aria-label="Изменить приоритет ' + escape(key) + '">' + (first.epicPriority ? priorityHtml(first.epicPriority) : '·') + '</button>' : '';
      const toggle = '<button class="ozon-dev-link-toggle" data-dev-action="collapse" data-group="' + escape(groupId) + '" aria-expanded="' + !closed + '" aria-label="' + (closed ? 'Развернуть ' : 'Свернуть ') + escape(groupNames[dimension] + ' ' + (key || 'Без эпика')) + '">' + (closed ? '▸' : '▾') + '</button>';
      const groupLine = '<div class="ozon-dev-group-line" style="padding-left:' + level*18 + 'px;">';
      const isEpicGroup = dimension === 'epic' && Boolean(key);
      const groupName = dimension === 'sprint' ? first.sprint.name : key || (dimension === 'stream' ? 'Без стрима' : 'Без эпика');
      const ellipsis = (title:string) => '<span class="ozon-dev-ellipsis" title="' + escape(title) + '">' + escape(title) + '</span>';
      const heading = isEpicGroup ? issueLink(key) + (first.epicType ? taskTypeBadge(first.epicType,first.epicTypeIconUrl) : '') + priorityControl : ellipsis(groupName) + (dimension === 'sprint' ? badge(stateName(first.sprint.state), first.sprint.state) : '');
      const epicSummary = isEpicGroup ? ellipsis(first.epicTitle) + '<button class="ozon-dev-stream-edit' + (!first.stream ? ' is-empty' : '') + '" data-dev-action="edit-stream" data-key="' + escape(key) + '" aria-label="Изменить стрим ' + escape(key) + '">' + escape(first.stream || 'Без стрима') + '<span class="ozon-ext-toolbar-chevron"></span></button>' : '';
      const label = '<div class="ozon-dev-group-line">' + epicSummary + '<span class="ozon-ext-group-total">' + children.length + ' задач</span> ' + statusSummary(children) + '</div>';
      const epicStatusHtml = dimension === 'epic' && key ? badge(first.epicStatus,first.epicCategory) : '';
      const componentHtml = dimension === 'epic' && key ? '<button class="ozon-dev-cell-edit" data-dev-action="edit-component" data-key="' + escape(key) + '" aria-label="Изменить компонент эпика ' + escape(key) + '" title="' + escape(first.epicComponent || 'Без компонента') + '"><span class="ozon-dev-ellipsis">' + escape(first.epicComponent || 'Без компонента') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' : '';
      return '<tr data-dev-row="collapse" class="ozon-dev-group ozon-tree-depth-' + (level % 2) + ' ozon-dev-' + dimension + (isEpicGroup ? reviewRowClass(key,first.epicStatus) : '') + '">' + groupCells(groupLine + toggle + heading + '</div>',label,children,epicStatusHtml,componentHtml) + '</tr>' + (!closed ? renderGroups(children,level+1,groupId) : '');
    }).join('');
  }
  function tableHtml() {
    if (state.loadingTasks) return '<div class="ozon-dev-empty"><p role="status">' + escape(state.progress || 'Загружаем задачи…') + '</p>' + Array.from({ length: 7 }, () => '<div class="ozon-ext-skeleton" style="height:27px;margin:9px 0;width:100%;"></div>').join('') + '</div>';
    if (!state.loadedSelection.length) return '<div class="ozon-dev-empty"><strong>' + (!team() ? 'Выберите команду' : !state.selected.length ? 'Выберите один или несколько спринтов' : 'Спринты выбраны') + '</strong><p>' + (!team() ? 'Начните с выбора команды разработки.' : 'Нажмите «Загрузить задачи», чтобы открыть таблицу.') + '</p></div>';
    const items = visibleIssues();
    const ids = flatColumns();
    const resizer = (id:string) => '<span role="separator" aria-orientation="vertical" aria-label="Изменить ширину: ' + escape(baseColumns[id]?.[0] || columns[Number(id.slice(7))]?.[0] || id) + '" tabindex="0" class="ozon-dev-col-resizer" data-resize-column="' + id + '"></span>';
    const pointIds=pointColumnsShown();
    const top = layout.order.map(id => {
      if (id==='points') return pointIds.length ? '<th colspan="' + pointIds.length + '" scope="colgroup" class="ozon-dev-sp-parent"><button data-dev-action="toggle-sp" aria-expanded="' + layout.detailsOpen + '" aria-label="Детализация Story Points">' + (layout.detailsOpen ? '▾' : '▸') + ' Story Points</button> <span class="ozon-ext-group-total">Всего / Сожжено</span></th>' : '';
      if (layout.hidden.includes(id)) return '';
      return '<th' + (pointIds.length ? ' rowspan="2"' : '') + ' scope="col"' + (id === 'key' ? ' data-column="key"' : '') + '>' + escape(baseColumns[id][0]) + (id === 'epic' ? ' <button type="button" class="ozon-dev-header-settings" data-dev-action="settings-open" aria-label="Настроить отображение Epic Link" title="Настроить отображение Epic Link"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6m8 4v6"/></svg></button>' : '') + resizer(id) + '</th>';
    }).join('');
    const second=pointIds.map(id=>{
      if (id==='points') return '<th scope="col">Всего SP' + resizer(id) + '</th>';
      const [label,hint]=columns[Number(id.slice(7))];
      return '<th scope="col"><span tabindex="0" title="' + escape(hint) + '">' + escape(label) + ' ⓘ</span>' + resizer(id) + '</th>';
    }).join('');
    const tableWidth=ids.reduce((sum,id)=>sum+columnWidth(id),0);
    return '<div class="ozon-dev-table-scroll"><table class="ozon-dev-table" style="width:max(100%, ' + tableWidth + 'px);max-width:none!important;min-width:max(100%, ' + tableWidth + 'px);"><colgroup>' + ids.map(id => '<col data-dev-col="' + id + '" style="width:' + columnWidth(id) + 'px;">').join('') + '</colgroup><thead><tr>' + top + '</tr>' + (second ? '<tr>' + second + '</tr>' : '') + '</thead><tbody>' + (items.length ? renderGroups(items) : '<tr><td colspan="' + ids.length + '" class="ozon-dev-empty">Нет задач для выбранных спринтов и фильтров.</td></tr>') + '<tr class="ozon-dev-filler" aria-hidden="true"><td colspan="' + ids.length + '"></td></tr></tbody><tfoot><tr class="ozon-dev-total">' + groupCells('Итого · ' + items.length + ' задач',statusSummary(items),items) + '</tr></tfoot></table></div>';
  }
  function filterControl(kind: string, title: string, values: {value:string;label:string;status?:string;category?:string;summary?:string;component?:string;searchText?:string}[], selected: string) {
    const disabled = (kind === 'epic' || kind === 'stream' || kind === 'project') && (!state.loadedSelection.length || state.loadingTasks || state.loadingSprints);
    const opened = state.menu === kind && !disabled;
    const chosen = values.find(item => item.value === selected)?.label || 'Все';
    const query = state.filterQuery.toLowerCase().trim();
    const matches = values.filter(item => !query || (item.label + ' ' + (item.searchText || '')).toLowerCase().includes(query));
    const optionContent = (item: typeof values[number]) => kind === 'epic' && item.summary ? '<span class="ozon-mono">' + escape(item.value) + '</span>' + badge(item.status || '', item.category || '') + '<span class="ozon-dev-option-components">' + escape(item.component || 'Без компонента') + '</span><span class="ozon-dev-option-title">' + escape(item.summary) + '</span>' : escape(item.label);
    return '<div class="ozon-ext-toolbar-combo"><button class="ozon-ext-toolbar-trigger" data-dev-action="menu" data-menu="' + kind + '" ' + (disabled ? 'disabled ' : '') + 'aria-expanded="' + opened + '" title="' + escape(chosen) + '"><span class="ozon-ext-toolbar-label">' + title + ': ' + escape(chosen) + '</span><span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></button>' + (opened ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ozon-dev-popover ' + (kind === 'epic' ? 'ozon-dev-epic-filter-sidebar' : '') + '">' + (kind === 'epic' ? '<div class="ozon-dev-editor-head"><strong>Фильтр по эпику</strong><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="menu" data-menu="epic" aria-label="Закрыть">✕</button></div>' : '') + '<input type="search" id="ozon-dev-filter-search" dir="ltr" aria-label="Поиск: ' + title + '" placeholder="Поиск…" value="' + escape(state.filterQuery) + '"><div class="ozon-dev-filter-list">' + (matches.length ? matches.map(item => '<button class="ozon-ext-combo-item ' + (selected === item.value ? 'active' : '') + '" data-dev-action="filter" data-filter="' + kind + '" data-value="' + escape(item.value) + '">' + optionContent(item) + '</button>').join('') : '<div class="ozon-ext-toolbar-empty">Ничего не найдено</div>') + '</div></div>' : '') + '</div>';
  }
  function viewControls(part: 'filters' | 'grouping') {
    const all = state.groups.flatMap(group => group.issues);
    const epics = new Map<string, any>();
    epicCatalogItems.forEach(raw => { const fields = raw.fields || {}; epics.set(raw.key, {epicKey:raw.key, epicTitle:fields.summary || raw.key, epicStatus:fields.status?.name || 'Статус недоступен', epicCategory:fields.status?.statusCategory?.key || '', epicComponent:(fields.components || []).map((item:any) => item.name).filter(Boolean).join(', '), epicSearch:epicNameField ? fields[epicNameField] || '' : ''}); });
    const epicOptions = [{value:'',label:'Все'}, {value:'__none',label:'Без эпика'}, ...[...epics.values()].sort((a, b) => a.epicKey.localeCompare(b.epicKey, 'ru', {numeric:true})).map(issue => ({value:issue.epicKey,label:issue.epicKey + ' · ' + issue.epicStatus + ' · ' + issue.epicTitle, status:issue.epicStatus, category:issue.epicCategory, summary:issue.epicTitle, component:issue.epicComponent, searchText:issue.epicSearch}))];
    const streams = [...new Set<string>(all.map(issue => issue.stream).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru', {numeric:true}));
    const streamOptions = [{value:'',label:'Все'}, {value:'__none',label:'Без стрима'}, ...streams.map(stream => ({value:stream,label:stream}))];
    const projectOptions = [{value:'',label:'Все'}, ...[...new Set<string>(all.map(issue => issue.project).filter(Boolean))].sort().map(project => ({value:project,label:project}))];
    if (part === 'filters') return filterControl('project', 'Проект', projectOptions, state.projectFilter) + filterControl('epic', 'Эпик', epicOptions, state.epicFilter) + filterControl('stream', 'Стрим', streamOptions, state.streamFilter);
    return '<div class="ozon-ext-toolbar-combo ozon-dev-grouping-control"><button class="ozon-ext-toolbar-trigger" data-dev-action="menu" data-menu="grouping" aria-expanded="' + (state.menu === 'grouping') + '" title="' + escape(state.grouping.map(key => groupNames[key]).concat('Задача').join(' → ')) + '"><span class="ozon-ext-toolbar-label">Группировка</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.menu === 'grouping' ? '<div class="ozon-ext-combo-popover ozon-dev-popover">' + (groupingUi?.html('development',state.grouping,groupNames,'data-dev-group') || '') + '<button class="ozon-ext-btn" data-dev-action="menu" data-menu="grouping">Готово</button></div>' : '') + '</div>' +
      (state.epicFilter || state.streamFilter || state.projectFilter ? '<button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="clear-filters">Сбросить фильтры</button>' : '');
  }
  function depthControls() {
    return groupingUi?.depthHtml('development',[...state.grouping.map((key,index)=>({value:String(index),label:groupNames[key]})),{value:String(state.grouping.length),label:'Задачи'},{value:String(state.grouping.length+1),label:'Связанные задачи'}],String(state.depth),!state.loadedSelection.length || state.loadingTasks) || '';
  }
  const allIssues = () => state.groups.flatMap(group => group.issues);
  const normalizedIssueFields = () => ['summary','status','issuetype','epic','parent','priority','project','issuelinks','sprint','closedSprints','components','labels',sprintField,epicField,pointsField,'customfield_24000'].filter(Boolean);
  async function readIssue(key:string, fields=normalizedIssueFields()) {
    return json('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=' + encodeURIComponent([...new Set(fields)].join(',')), new AbortController().signal);
  }
  async function write(url:string, method:string, body:any) {
    const response = await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
    if (!response.ok) {
      let detail = ''; try { const data = await response.json(); detail = [...(data.errorMessages || []), ...Object.values(data.errors || {})].join('; '); } catch (_) { /* Use HTTP status. */ }
      throw new Error(detail || 'Jira не сохранила изменение (HTTP ' + response.status + ')');
    }
  }
  function editorHtml() {
    const editor = state.editor;
    if (!editor) return '';
    const name = editor.kind === 'link' ? 'Связать с FCRM' : editor.kind === 'stream' ? 'Стрим эпика' : editor.kind === 'epic' ? 'Эпик задачи' : editor.kind === 'component' ? 'Компонент задачи' : editor.kind === 'priority' ? 'Приоритет задачи' : 'Спринт задачи';
    const query = editor.query.toLowerCase().trim();
    const options = editor.kind === 'epic' || editor.kind === 'link' ? editor.options : editor.options.filter(item => item.label.toLowerCase().includes(query));
    const currentSprint = editor.kind === 'sprint' ? allIssues().find(issue => issue.key === editor.key)?.sprint : null;
    return '<aside id="ozon-dev-editor-panel" class="ozon-dev-editor ozon-ext-combo-popover" role="dialog" aria-modal="true" aria-label="' + name + '"><div class="ozon-dev-editor-head"><strong>' + name + ' · ' + escape(editor.key) + '</strong><button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="close-editor" ' + (editor.busy ? 'disabled' : '') + ' aria-label="Закрыть редактирование">✕</button></div>' + (editor.kind === 'sprint' ? '<div class="ozon-sprint-current"><span>Текущий спринт</span><strong>' + escape(currentSprint?.name || 'Бэклог') + '</strong></div>' : '') + '<input id="ozon-dev-editor-search" type="search" dir="ltr" placeholder="Поиск…" aria-label="Поиск: ' + name + '" value="' + escape(editor.query) + '" ' + (editor.busy ? 'disabled' : '') + '>' + '<div id="ozon-dev-editor-message">' + (editor.error ? '<p role="alert" class="ozon-dev-error">' + escape(editor.error) + '</p>' : '') + '</div>' + (editor.kind === 'link' ? '<div class="ozon-dev-link-sprint-picker"><button class="ozon-ext-toolbar-trigger" data-dev-action="link-sprint-menu" aria-expanded="' + Boolean(editor.meta?.sprintOpen) + '"><span class="ozon-ext-toolbar-label">Спринт: ' + escape(!editor.meta ? 'Загрузка…' : editor.meta.sprintIds?.length ? 'Выбрано: ' + editor.meta.sprintIds.length : 'Все') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (editor.meta?.sprintOpen ? '<input id="ozon-dev-link-sprint-search" type="search" dir="ltr" placeholder="Поиск спринта FCRM…" value="' + escape(editor.meta.sprintQuery || '') + '"><div class="ozon-dev-editor-options"><button class="ozon-ext-combo-item" data-dev-action="link-sprint-pick" data-sprint="">Все спринты</button>' + (editor.meta.sprints || []).filter((sp:any) => sp.name.toLowerCase().includes((editor.meta.sprintQuery || '').toLowerCase())).map((sp:any) => '<button class="ozon-ext-combo-item ' + ((editor.meta.sprintIds || []).includes(String(sp.id)) ? 'active' : '') + '" data-dev-action="link-sprint-pick" data-sprint="' + sp.id + '">' + ((editor.meta.sprintIds || []).includes(String(sp.id)) ? '✓ ' : '') + escape(sp.name) + badge(stateName(sp.state),sp.state) + '</button>').join('') + '</div>' : '') + '</div><p class="ozon-dev-menu-hint">Поиск по ключу, названию и описанию. Выбор задачи создаст связь «Задача проекта».</p>' : '') + '<div id="ozon-dev-editor-results" class="ozon-dev-editor-options ' + (editor.kind === 'epic' ? 'ozon-dev-epic-options' : '') + '">' + (editor.loading ? '<div role="status" aria-label="Загрузка задач">' + [90,75,85,70,80].map(width => '<div class="ozon-ext-skeleton" style="display:block;height:22px;margin:12px 0;width:' + width + '%;"></div>').join('') + '</div>' : options.map((item,index) => '<button class="ozon-ext-combo-item" data-dev-action="save-editor" data-option="' + editor.options.indexOf(item) + '" ' + (editor.busy ? 'disabled' : '') + '>' + (item.raw ? '<span class="ozon-mono">' + escape(item.raw.key) + '</span>' + badge(item.raw.fields?.status?.name,item.raw.fields?.status?.statusCategory?.key || '') + '<span class="ozon-dev-option-title" title="' + escape(item.raw.fields?.summary || '') + '">' + escape(item.raw.fields?.summary) + '</span>' + (editor.kind === 'epic' ? '<span class="ozon-dev-option-components">' + escape((item.raw.fields?.components || []).map((component:any) => component.name).filter(Boolean).join(', ') || 'Без компонента') + '</span>' : '') : (editor.kind === 'priority' ? priorityHtml(item.label) : '') + escape(item.label) + (item.state ? badge(stateName(item.state),item.state) : '')) + '</button>').join('') || '<p class="ozon-dev-menu-hint">Ничего не найдено</p>') + '</div>' + '<div id="ozon-dev-editor-busy">' + (editor.busy ? '<p role="status">Сохраняем в Jira…</p>' : '') + '</div></aside>';
  }
  function renderEditorPreservingInput() {
    const panel=document.getElementById('ozon-dev-editor-panel');
    if(panel && state.editor) {
      // Keep the live input node and IME/caret intact; replace results only.
      const template=document.createElement('div');template.innerHTML=editorHtml();
      for(const id of ['ozon-dev-editor-results','ozon-dev-editor-message','ozon-dev-editor-busy']) {
        const current=panel.querySelector('#'+id),next=template.querySelector('#'+id);
        if(current && next) {current.replaceWith(next);bind(next as HTMLElement);}
      }
      return;
    }
    const active=document.activeElement as HTMLInputElement | null;
    const preserve=Boolean(active?.id && active.closest?.('.ozon-dev-editor'));
    const id=preserve?active!.id:'';
    const start=preserve?active!.selectionStart:null,end=preserve?active!.selectionEnd:null;
    onRender();
    if(id) {const next=document.getElementById(id) as HTMLInputElement | null;if(next){next.focus({preventScroll:true});if(start!==null&&end!==null)next.setSelectionRange(start,end);}}
  }
  function dismissEditor() {state.editor=null;++editorRequest;}
  async function getEpicCatalog() {
    if (!epicCatalogPromise) {
      epicCatalogPromise = (async () => {
        const found:any[] = [];
        const fields = ['summary','status','issuetype','labels','components',epicNameField].filter(Boolean).join(',');
        const jql = 'project in (OBPROJECT, FCRM) AND issuetype = Epic ORDER BY updated DESC';
        const loadPage = async (startAt:number) => {
          const data = await json('/rest/api/2/search?jql=' + encodeURIComponent(jql) + '&startAt=' + startAt + '&maxResults=100&fields=' + encodeURIComponent(fields), new AbortController().signal);
          found.push(...(Array.isArray(data.issues) ? data.issues.filter((issue:any) => /^(epic|эпик)$/i.test(String(issue.fields?.issuetype?.name || ''))) : []));
          epicCatalogItems = found.slice();
          epicCatalogUpdate?.(epicCatalogItems);
          return data;
        };
        const first = await loadPage(0);
        const total = Number(first.total || 0);
        for (let startAt = 100; startAt < total; startAt += 500) {
          const offsets = Array.from({length:5}, (_,index) => startAt + index * 100).filter(offset => offset < total);
          await Promise.all(offsets.map(loadPage));
        }
        return found;
      })().catch((error:any) => { epicCatalogPromise = null; throw error; });
    }
    return epicCatalogPromise;
  }
  async function searchEditor() {
    const editor = state.editor; if (!editor || !['epic','link'].includes(editor.kind)) return;
    const request = ++editorRequest; editor.loading = true; editor.error=''; renderEditorPreservingInput();
    try {
      const input = editor.query.trim();
      const query = /\/browse\//i.test(input) ? (input.match(/(?:FCRM|OBPROJECT)-[0-9]+/i)?.[0] || input) : input;
       const safe = query.replace(/[\\"*?~]/g,' ').trim();
      if (editor.kind === 'epic') {
        const normalized = query.toLocaleLowerCase();
        const updateOptions = (catalog:any[]) => {
        const options = catalog.filter((issue:any) => {
          if (!normalized) return true;
          const fields = issue.fields || {};
          const epicName = epicNameField ? fields[epicNameField] : '';
          const values = [issue.key, fields.summary, epicName, ...(Array.isArray(fields.labels) ? fields.labels : [])];
          return values.some(value => String(value || '').toLocaleLowerCase().includes(normalized));
        }).slice(0,100).map((issue:any) => ({value:issue.key,raw:issue,label:issue.key + ' · ' + (issue.fields?.status?.name || '') + ' · ' + (issue.fields?.summary || '')}));
        if (request !== editorRequest || state.editor !== editor) return;
        editor.options = [{value:null,label:'Без эпика'},...options];
        editor.loading = false;
        renderEditorPreservingInput();
        };
        epicCatalogUpdate = updateOptions;
        if (epicCatalogItems.length) updateOptions(epicCatalogItems);
        const catalog = await getEpicCatalog();
        updateOptions(catalog);
        if (epicCatalogUpdate === updateOptions) epicCatalogUpdate = null;
        return;
      }
      const searchClauses = ['summary ~ "' + safe + '*"', 'description ~ "' + safe + '*"'];
      const condition = !query ? '' : /^[A-Z][A-Z0-9]*-\d+$/i.test(query)
        ? ' AND key = "' + query.toUpperCase() + '"'
        : ' AND (' + searchClauses.join(' OR ') + ')';
       const fields = ['summary','description','status','issuetype','priority','customfield_24000','labels','components',epicField,epicNameField,sprintField].filter(Boolean).join(',');
      const data = await json('/rest/api/2/search?jql=' + encodeURIComponent('project = FCRM' + condition + (editor.meta?.sprintIds?.length ? ' AND Sprint in (' + editor.meta.sprintIds.map((id:string) => Number(id)).filter(Number.isFinite).join(',') + ')' : '') + ' ORDER BY updated DESC') + '&maxResults=50&fields=' + encodeURIComponent(fields),new AbortController().signal);
      if (request !== editorRequest || state.editor !== editor) return;
      editor.options = [...(editor.kind === 'epic' ? [{value:null,label:'Без эпика'}] : []),...(data.issues || []).map((issue:any) => ({value:issue.key,raw:issue,label:issue.key + ' · ' + (issue.fields?.status?.name || '') + ' · ' + (issue.fields?.summary || '') + (editor.kind === 'link' ? ' · ' + (lastSprint(issue.fields?.[sprintField] || [])?.name || 'Не в спринте') : '')}))];
    } catch (error:any) { if (state.editor === editor && request === editorRequest) editor.error = error.message; }
    finally { if (state.editor === editor && request === editorRequest) { editor.loading = false; renderEditorPreservingInput(); } }
  }
  async function openEditor(kind:string,key:string) {
    if (kind === 'sprint' && isEpic(allIssues().find(issue => issue.key === key)?.issueType || '')) return;
    onBeforeEditor?.();
    state.menu = ''; state.sprintsOpen = false; state.teamOpen = false;
    const editor = {kind,key,query:'',options:[] as any[],loading:true,busy:false,error:'',meta:null as any};
    state.editor = editor; ++editorRequest; onRender(); document.getElementById('ozon-dev-editor-search')?.focus({preventScroll:true});
    if (kind === 'link') {
      try { const sprints = await pages('/rest/agile/1.0/board/9349/sprint?state=active,future,closed','values',new AbortController().signal); const available=sprints.filter(sp => Number(sp.originBoardId) === 9349).sort((a:any,b:any)=>{const rank=(sp:any)=>String(sp.state).toLowerCase()==='active'?0:String(sp.state).toLowerCase()==='future'?1:2;return rank(a)-rank(b)||sprintSort(a,b);}); const active=available.filter(sp => String(sp.state).toLowerCase()==='active'); editor.meta = {sprints:available,sprintIds:active.map(sp => String(sp.id)),sprintQuery:'',sprintOpen:true}; } catch (error:any) { editor.error = 'Не удалось загрузить спринты FCRM: ' + error.message; editor.meta = {sprints:[],sprintIds:[],sprintOpen:true}; }
      if (state.editor === editor) { onRender(); await searchEditor(); } return;
    }
    if (kind === 'epic') { await searchEditor(); return; }
    try {
       if (kind === 'priority') {
         editor.options = await priorityService.options(key);
       } else if (kind === 'component') {
         const issue = await readIssue(key,['project','components']);
         const projectKey = issue.fields?.project?.key || key.split('-')[0];
         if (!componentOptionsCache.has(projectKey)) {
           const components = await json('/rest/api/2/project/' + encodeURIComponent(projectKey) + '/components', new AbortController().signal);
           componentOptionsCache.set(projectKey, [{value:null,label:'Без компонента'}, ...components.map((item:any) => ({value:String(item.id),label:item.name}))]);
         }
         editor.meta = {projectKey};
         editor.options = componentOptionsCache.get(projectKey)!;
       } else if (kind === 'stream') {
        const meta = await json('/rest/api/2/issue/' + encodeURIComponent(key) + '/editmeta',new AbortController().signal);
        const field = meta.fields?.customfield_24000;
        if (!field || !Array.isArray(field.allowedValues)) throw new Error('Jira не вернула доступные значения поля «Стрим» для этого эпика.');
        editor.meta = field;
        editor.options = [...(!field.required ? [{value:null,label:'Без стрима'}] : []),...field.allowedValues.map((item:any) => ({value:item.id ? {id:String(item.id)} : item.value || item,label:item.value || item.name || String(item)}))];
      } else {
        editor.options = [{value:null,label:'Бэклог — убрать из текущего спринта'},...state.sprints.filter(sprint => ['active','future'].includes(sprint.state)).map(sprint => ({value:sprint.id,label:sprint.name,state:sprint.state}))];
      }
    } catch (error:any) { editor.error = error.message; }
    finally { if (state.editor === editor) { editor.loading = false; onRender(); } }
  }
  async function saveEditor(index:number) {
    const editor = state.editor; const option = editor?.options[index];
    if (!editor || !option || editor.busy) return;
    const current = serial; editor.busy = true; editor.error = ''; onRender();
    try {
      if (editor.kind === 'link') {
        const source = allIssues().find(issue => issue.key === editor.key);
        if (!source) throw new Error('Исходная задача больше не входит в выборку.');
        const before = normalizeIssue(await readIssue(editor.key));
        if (before.links.some((link:any) => link.key === option.value && link.projectTask)) throw new Error('Такая связь уже существует в Jira.');
        const types = await getIssueLinkTypes();
        const type = types.find((item:any) => /задача проекта|project task/i.test([item.name,item.inward,item.outward].join(' ')));
        if (!type) throw new Error('В Jira не найден тип связи «Задача проекта».');
        const outward = /задача проекта|project task/i.test(type.outward || '');
        await write('/rest/api/2/issueLink','POST',{type:{id:type.id},inwardIssue:{key:outward ? editor.key : option.value},outwardIssue:{key:outward ? option.value : editor.key}});
        const fresh = normalizeIssue(await readIssue(editor.key)); if (current !== serial) return;
        if (!fresh.links.some((link:any) => link.key === option.value && link.projectTask)) throw new Error('Jira ещё не вернула созданную связь. Обновите задачу перед повторной попыткой.');
        source.links = fresh.links.map((link:any) => {
          const known = source.links.find((old:any) => old.key === link.key);
          if (link.key !== option.value) return {...link,...known};
          const fields = option.raw?.fields || {};
          return {...link,summary:fields.summary || link.summary,status:fields.status?.name || link.status,category:fields.status?.statusCategory?.key || link.category,priority:fields.priority?.name || 'Не указан',issueType:fields.issuetype?.name || 'Задача',issueTypeIconUrl:fields.issuetype?.iconUrl || '',sprint:lastSprint(fields[sprintField] || [])};
        });
      } else if (editor.kind === 'stream') {
        await write('/rest/api/2/issue/' + encodeURIComponent(editor.key),'PUT',{fields:{customfield_24000:option.value}});
        const fresh = await readIssue(editor.key,['customfield_24000']); if (current !== serial) return;
        const raw = fresh.fields?.customfield_24000; const stream = typeof raw === 'string' ? raw : raw?.value || '';
        if ((option.value === null && stream) || (option.value !== null && stream !== option.label)) throw new Error('Jira вернула другое значение стрима. Обновите данные.');
        allIssues().filter(issue => issue.epicKey === editor.key).forEach(issue => { issue.stream = stream; allocate(issue); });
      } else if (editor.kind === 'priority') {
        const priority = await priorityService.save(editor.key,option.value);
        if (current !== serial) return;
        state.groups.forEach(group => group.issues.forEach(issue => { if (issue.key === editor.key) issue.priority = priority.name; issue.links.forEach((link:any) => { if (link.key === editor.key) link.priority = priority.name; }); }));
      } else if (editor.kind === 'component') {
        await write('/rest/api/2/issue/' + encodeURIComponent(editor.key),'PUT',{fields:{components:option.value ? [{id:String(option.value)}] : []}});
        const raw = await readIssue(editor.key,['components']); if (current !== serial) return;
        const previous = allIssues().find(issue => issue.key === editor.key);
        if (!previous) throw new Error('Задача больше не входит в выборку. Обновите задачи.');
        const components=raw.fields?.components || [];
        const componentId=components[0]?.id ? String(components[0].id) : '';
        if (componentId !== (option.value ? String(option.value) : '')) throw new Error('Компонент не изменился в Jira. Повторите попытку.');
        const updated = {...previous,componentId,component:components.map((item:any) => item.name).filter(Boolean).join(', ') || 'Без компонента'};
        state.groups.forEach(group => { group.issues = group.issues.map(issue => issue.key === editor.key ? updated : issue); });
      } else {
        if (editor.kind === 'epic') {
          if (!epicField) throw new Error('Не найдено поле Epic Link в Jira. Обновите список команды.');
          await write('/rest/api/2/issue/' + encodeURIComponent(editor.key),'PUT',{fields:{[epicField]:option.value}});
        } else await write(option.value === null ? '/rest/agile/1.0/backlog/issue' : '/rest/agile/1.0/sprint/' + option.value + '/issue','POST',{issues:[editor.key]});
        const sourceGroup = state.groups.find(group => group.issues.some(issue => issue.key === editor.key));
        const previous = sourceGroup?.issues.find((issue:any) => issue.key === editor.key);
        if (!previous) throw new Error('Задача больше не входит в выборку. Обновите задачи.');
        const estimateField = sourceGroup.sprint.pointsField || pointsField;
        const raw = await readIssue(editor.key,[...normalizedIssueFields(), estimateField].filter(Boolean)); if (current !== serial) return;
        const updated = {...previous,...normalizeIssue(raw, estimateField),links:previous.links};
        if (editor.kind === 'epic' && updated.epicKey !== (option.value || '')) throw new Error('Epic Link не изменился в Jira. Повторите попытку.');
        if (updated.epicKey) {
          const epic = await readIssue(updated.epicKey,['summary','status','issuetype','priority','components','customfield_24000']); if (current !== serial) return;
          updated.epicTitle = epic.fields?.summary || updated.epicKey;
          updated.epicStatus = epic.fields?.status?.name || 'Статус недоступен'; updated.epicCategory = epic.fields?.status?.statusCategory?.key || '';
          updated.epicType = epic.fields?.issuetype?.name || '';
          updated.epicTypeIconUrl = epic.fields?.issuetype?.iconUrl || '';
          updated.epicPriority = epic.fields?.priority?.name || '';
          updated.epicComponent = (epic.fields?.components || []).map((component:any) => component.name).filter(Boolean).join(', ');
          const stream = epic.fields?.customfield_24000; updated.stream = typeof stream === 'string' ? stream : stream?.value || '';
        }
        allocate(updated);
        if (editor.kind === 'epic') {
          sourceGroup.issues = sourceGroup.issues.map((issue:any) => issue.key === editor.key ? updated : issue);
        } else {
          const latest = lastSprint(updated.history);
          if (option.value === null ? isCurrentSprint(latest) : String(latest?.id) !== String(option.value)) throw new Error('Новый спринт пока не подтверждён Jira. Обновите задачи.');
          const destination = state.groups.find(group => option.value === null
            ? group.sprint.isBacklog && group.sprint.boardId === sourceGroup.sprint.boardId
            : String(group.sprint.id) === String(option.value));
          sourceGroup.issues = sourceGroup.issues.filter((issue:any) => issue.key !== editor.key);
          if (destination) {
            destination.issues.push({...updated, sprint:destination.sprint, lastSprintId:String(destination.sprint.id), backlogIds:destination.sprint.isBacklog ? [String(destination.sprint.id)] : []});
          }
        }
      }
      if (state.editor === editor) state.editor = null;
    } catch (error:any) { if (state.editor === editor) editor.error = error.message; }
    finally { if (current === serial) { editor.busy = false; onRender(); } }
  }
  function columnControls() {
    const option = (id:string,index:number,child=false) => {
      const order = child ? layout.children : layout.order;
      const title = child ? columns[Number(id)][0] : baseColumns[id][0];
      return '<div class="ozon-dev-group-option ' + (child ? 'ozon-dev-column-child' : '') + '"><span class="ozon-dev-column-label">' + escape(title) + '</span><button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="column-move" data-column="' + id + '" data-child="' + child + '" data-direction="-1" aria-label="Поднять столбец ' + escape(title) + '" ' + (!index ? 'disabled' : '') + '>↑</button><button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="column-move" data-column="' + id + '" data-child="' + child + '" data-direction="1" aria-label="Опустить столбец ' + escape(title) + '" ' + (index === order.length-1 ? 'disabled' : '') + '>↓</button></div>';
    };
    return '<div class="ozon-ext-toolbar-combo"><button class="ozon-ext-toolbar-trigger" data-dev-action="menu" data-menu="columns" aria-expanded="' + (state.menu === 'columns') + '"><span class="ozon-ext-toolbar-label">Столбцы</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.menu === 'columns' ? '<div class="ozon-ext-combo-popover ozon-dev-popover ozon-dev-column-menu"><p class="ozon-dev-menu-hint">Порядок — стрелками. Ширина — за край заголовка. Story Points перемещается вместе с детализацией.</p>' + layout.order.map((id,index) => option(id,index) + (id === 'points' ? '<button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="toggle-sp" aria-expanded="' + layout.detailsOpen + '">' + (layout.detailsOpen ? 'Свернуть детализацию SP' : 'Развернуть детализацию SP') + '</button>' + (layout.detailsOpen ? layout.children : []).map((child,i) => option(String(child),i,true)).join('') : '')).join('') + '<button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="reset-columns">Сбросить столбцы</button></div>' : '') + '</div>';
  }
  function helpHtml() {
    return '<div class="ozon-dev-help"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" aria-label="Как считаются спринты и столбцы" aria-describedby="ozon-dev-help-tooltip"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></button><div id="ozon-dev-help-tooltip" role="tooltip"><strong>Как считаются спринты и столбцы</strong><p>Задача учитывается один раз — в последнем спринте её истории. Последний определяется по дате начала, без дат — по номеру Jira. Если он не выбран, задача не входит в таблицу.</p><p>В столбцах — Story Points. Стрим берётся у эпика. Пустая оценка или неподходящий стрим — «—». Формулы независимы: их сумма может отличаться от общего SP.</p>' + columns.map(([name, hint]) => '<p><b>' + escape(name) + ':</b> ' + escape(hint) + '</p>').join('') + '</div></div>';
  }
  function settingsHtml() {
    const draft = settingsDraft; if (!draft) return '';
    const stable = draft.presented; draft.presented=true;
    return '<aside class="ozon-dev-settings' + (stable ? ' ozon-dev-settings-stable' : '') + '" role="dialog" aria-label="Настройки таблицы"><header class="ozon-dev-editor-head"><strong>Настройки таблицы</strong><button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="settings-cancel" aria-label="Закрыть настройки">✕</button></header><strong>Уровень раскрытия</strong><div class="ozon-ext-toolbar-combo"><button class="ozon-ext-toolbar-trigger" data-dev-action="menu" data-menu="settings-depth"><span class="ozon-ext-toolbar-label">' + escape(groupNames[draft.grouping[draft.depth]] || 'Задачи') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.menu === 'settings-depth' ? '<div class="ozon-ext-combo-popover">' + [...draft.grouping,'task'].map((id,index) => '<button class="ozon-ext-combo-item ' + (index === draft.depth ? 'active' : '') + '" data-dev-action="settings-depth" data-depth="' + index + '">' + escape(groupNames[id] || 'Задачи') + '</button>').join('') + '</div>' : '') + '</div><strong>Отображение Epic Link</strong><div class="ozon-ext-toolbar-combo"><button class="ozon-ext-toolbar-trigger" data-dev-action="menu" data-menu="settings-epic" aria-expanded="' + (state.menu === 'settings-epic') + '"><span class="ozon-ext-toolbar-label">' + escape(({key:'Только ключ',status:'Ключ + статус',full:'Ключ + статус + название'} as Record<string,string>)[draft.layout.epicDisplay]) + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.menu === 'settings-epic' ? '<div class="ozon-ext-combo-popover">' + [['key','Только ключ'],['status','Ключ + статус'],['full','Ключ + статус + название']].map(([value,label]) => '<button class="ozon-ext-combo-item ' + (draft.layout.epicDisplay === value ? 'active' : '') + '" data-dev-action="settings-epic-display" data-value="' + value + '">' + label + '</button>').join('') + '</div>' : '') + '</div><strong>Группировка</strong>' + (groupingUi?.html('development-settings',draft.grouping,groupNames,'data-settings-group') || '') + '<strong>Столбцы</strong><p class="ozon-dev-menu-hint">Ключ закреплён слева. Ширину столбцов можно менять за границу заголовка.</p>' + (groupingUi?.html('development-columns',draft.layout.order,columnTitles,'data-settings-column',{hidden:draft.layout.hidden,locked:['key']}) || '') + '<label class="ozon-dev-column-child"><input type="checkbox" data-settings-sp ' + (draft.layout.detailsOpen ? 'checked' : '') + '> Детализация Story Points</label>' + (draft.layout.detailsOpen ? groupingUi?.html('development-sp',draft.layout.children.map(index=>'metric-'+index),metricTitles,'data-settings-column',{hidden:draft.layout.hidden}) || '' : '') + '<footer><button class="ozon-ext-btn" data-dev-action="settings-apply">Применить</button><button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="settings-cancel">Отмена</button></footer></aside>';
  }
  function html() {
    const busy = state.loadingSprints || state.loadingTasks;
    const matches = state.sprints.filter(sprint => sprint.name.toLowerCase().includes(state.sprintQuery.trim().toLowerCase()));
    const active = team();
    return '<section class="ozon-dev-dashboard"><header class="ozon-ext-header-bar"><strong>Команды разработки</strong><div class="ozon-dev-header-actions">' + teams.map(item => '<a href="https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=' + item.boardId + '&view=planning" target="_blank" rel="noopener noreferrer">Доска ' + escape(item.name) + ' ↗</a>').join('') + (widgetVersion ? '<span class="ozon-dev-version" title="Версия виджета">v' + escape(widgetVersion) + '</span>' : '') + helpHtml() + '</div></header><div class="ozon-dev-controls ozon-ext-filter-bar">' + '<button class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="settings-open"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg> Настройки</button>' +
      '<div class="ozon-ext-toolbar-combo"><button type="button" class="ozon-ext-toolbar-trigger" data-dev-action="team-menu" aria-expanded="' + state.teamOpen + '"><span class="ozon-ext-toolbar-label">Команда: ' + escape(selectedTeams().map(item=>item.name).join(', ') || 'Выберите команду') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' + (state.teamOpen ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ozon-dev-popover ozon-dev-team-popover">' + teams.map(item => '<label class="ozon-dev-team-option"><input type="checkbox" data-dev-team="'+item.id+'" '+(state.teamIds.includes(item.id)?'checked':'')+'><span class="ozon-dev-team-name">'+escape(item.name)+'</span></label>').join('') + '<button class="ozon-ext-btn" data-dev-action="team-menu">Готово</button>' + '</div>' : '') + '</div>' +
      '<div class="ozon-ext-toolbar-combo"><button type="button" class="ozon-ext-toolbar-trigger" data-dev-action="sprints-menu" aria-expanded="' + state.sprintsOpen + '" ' + (!active || state.loadingSprints ? 'disabled' : '') + ' title="' + escape(state.selected.map(id => state.sprints.find(sprint => String(sprint.id) === id)?.name || '').join('; ')) + '"><span class="ozon-ext-toolbar-label">' + (state.loadingSprints ? 'Загружаем спринты…' : state.selected.length ? 'Спринтов выбрано: ' + state.selected.length : 'Выберите спринты') + '</span><span class="ozon-ext-toolbar-chevron"></span></button>' +
      (state.sprintsOpen ? '<div class="ozon-ext-combo-popover ozon-dev-popover ozon-dev-sprints" role="dialog" aria-label="Выбор спринтов"><div class="ozon-dev-editor-head"><strong>Выбор спринтов</strong><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="sprints-menu" aria-label="Закрыть">✕</button></div><input type="search" id="ozon-dev-sprint-search" aria-label="Поиск спринта" placeholder="Поиск спринта…" value="' + escape(state.sprintQuery) + '"><div class="ozon-dev-sprint-list">' + (matches.length ? matches.map(sprint => '<label class="ozon-dev-sprint-option"><input type="checkbox" data-dev-sprint="' + sprint.id + '" ' + (state.selected.includes(String(sprint.id)) ? 'checked' : '') + '><span>' + escape(sprint.name) + '</span>' + badge(stateName(sprint.state), sprint.state) + '</label>').join('') : (!state.loadingSprints ? '<p style="color:#64748B;">Спринты не найдены</p>' : '')) + (state.loadingSprints ? '<div role="status" aria-label="Загрузка прошедших спринтов" style="padding:8px 4px;">' + [85,70,90,75].map(width => '<div class="ozon-ext-skeleton" style="height:22px;margin:8px 0;width:' + width + '%;"></div>').join('') + '</div>' : '') + '</div><div class="ozon-dev-popover-footer">' + (!state.closedLoaded ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="closed" ' + (busy ? 'disabled' : '') + '>Показать прошедшие</button>' : '') + '<button type="button" class="ozon-ext-btn" data-dev-action="sprints-done" ' + (!state.selected.length || busy ? 'disabled' : '') + '>Готово</button></div></div>' : '') + '</div>' +
      '<button type="button" class="ozon-ext-btn" data-dev-action="load" ' + (!pointsField || !state.selected.length || busy ? 'disabled' : '') + '>' + (state.loadingTasks ? 'Загружаем задачи…' : 'Загрузить задачи') + '</button>' +
      (active ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-dev-action="refresh-sprints" ' + (busy ? 'disabled' : '') + '>Обновить спринты</button>' : '') + viewControls('filters') + depthControls() + '</div>' +
       (state.error ? '<div class="ozon-dev-error" role="alert">' + escape(state.error) + '</div>' : '') +
      (state.loadingSprints ? '<div style="padding:12px 16px;"><div class="ozon-ext-skeleton" style="height:25px;width:40%;"></div></div>' : '') +
      '<div class="ozon-dev-content">' + tableHtml() + '</div>' + editorHtml() + settingsHtml() + '</section>';
  }
  function bind(root: HTMLElement) {
    const scroll = root.querySelector<HTMLElement>('.ozon-dev-table-scroll');
    const table = scroll?.querySelector<HTMLElement>('.ozon-dev-table');
    const filler = table?.querySelector<HTMLElement>('.ozon-dev-filler td');
    if (scroll && table && filler) {
      filler.style.height = Math.max(0, scroll.clientHeight - table.offsetHeight) + 'px';
    }
    const settings=root.querySelector<HTMLElement>('.ozon-dev-settings');
    if(settings) { settings.scrollTop=settingsScroll; settings.addEventListener('scroll',()=>{settingsScroll=settings.scrollTop;}); }
    groupingUi?.bind(root,(order,id)=>{
      if (id==='development') {setGrouping(order);return;}
      if (!settingsDraft) return;
      if (id==='development-settings') settingsDraft.grouping=order;
      if (id==='development-columns') settingsDraft.layout.order=['key',...order];
      if (id==='development-sp') settingsDraft.layout.children=order.map(id=>Number(id.slice(7)));
      onRender();
    });
    groupingUi?.bindDepth(root,value=>setDepth(Number(value)));
    root.querySelectorAll<HTMLElement>('.ozon-dev-controls .ozon-dev-popover').forEach(popover => {
      const rect = popover.getBoundingClientRect();
      const overshoot = Math.max(0,rect.right - window.innerWidth + 12);
      if (overshoot) popover.style.transform = 'translateX(-' + overshoot + 'px)';
    });
    root.querySelectorAll<HTMLElement>('[data-resize-column]').forEach(handle => {
      const resize = (width:number) => {
        const id = handle.dataset.resizeColumn!;
        layout.widths[id] = Math.max(70,Math.min(1000,width));
        const col = root.querySelector<HTMLElement>('col[data-dev-col="' + id + '"]');
        if (col) col.style.width = layout.widths[id] + 'px';
        const table = root.querySelector<HTMLElement>('.ozon-dev-table');
        if (table) {
          const totalWidth = flatColumns().reduce((sum,key) => sum+columnWidth(key),0) + 'px';
          table.style.setProperty('width', 'max(100%, ' + totalWidth + ')', 'important');
          table.style.setProperty('min-width', 'max(100%, ' + totalWidth + ')', 'important');
        }
      };
      handle.addEventListener('pointerdown',event => {
        event.preventDefault(); event.stopPropagation();
        const startX = event.clientX, startWidth = columnWidth(handle.dataset.resizeColumn!);
        const move = (next:PointerEvent) => resize(startWidth + next.clientX-startX);
        const stop = () => { document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',stop); document.removeEventListener('pointercancel',stop); saveLayout(); };
        document.addEventListener('pointermove',move); document.addEventListener('pointerup',stop); document.addEventListener('pointercancel',stop);
      });
      handle.addEventListener('keydown',event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); resize(columnWidth(handle.dataset.resizeColumn!) + (event.key === 'ArrowLeft' ? -10 : 10)); saveLayout(); } });
    });
    root.querySelectorAll<HTMLElement>('[data-dev-action]').forEach(button => button.addEventListener('click', event => {
      if (button.dataset.devAction === 'edit-epic' && (event.target as Element).closest('a')) return;
      event.stopPropagation();
      const action = button.dataset.devAction;
      if (action === 'settings-open') { settingsScroll=0; settingsDraft = {grouping:[...state.grouping],depth:state.depth,layout:JSON.parse(JSON.stringify(layout))}; state.menu=''; onRender(); return; }
      if (action === 'settings-cancel') { settingsDraft=null; state.menu=''; onRender(); return; }
      if (action === 'settings-apply' && settingsDraft) {
        const draft=settingsDraft;
        settingsDraft=null; state.menu=''; Object.assign(layout,draft.layout); saveLayout();
        const treeChanged=draft.depth!==state.depth || draft.grouping.join()!==state.grouping.join();
        state.grouping=[...draft.grouping];
        if (treeChanged) setDepth(draft.depth); else onRender();
        return;
      }
      if (action === 'settings-epic-display' && settingsDraft) { settingsDraft.layout.epicDisplay=button.dataset.value || 'full'; state.menu=''; onRender(); return; }
      if (action === 'settings-depth' && settingsDraft) { settingsDraft.depth=Number(button.dataset.depth); state.menu=''; onRender(); return; }

      if (action?.startsWith('edit-')) { openEditor(action.slice(5),button.dataset.key!); return; }
      if (action === 'close-editor') { if (!state.editor?.busy) { state.editor = null; ++editorRequest; } onRender(); return; }
      if (action === 'save-editor') { saveEditor(Number(button.dataset.option)); return; }
      if (action === 'link-sprint-menu' && state.editor?.kind === 'link') { state.editor.meta.sprintOpen = !state.editor.meta.sprintOpen; onRender(); return; }
      if (action === 'link-sprint-pick' && state.editor?.kind === 'link') {
        const meta = state.editor.meta; const id = button.dataset.sprint || ''; meta.sprintIds = !id ? [] : meta.sprintIds.includes(id) ? meta.sprintIds.filter((value:string) => value !== id) : [...meta.sprintIds,id]; onRender(); searchEditor(); return;
      }
      if (action === 'toggle-sp') { layout.detailsOpen = button.getAttribute('aria-expanded') !== 'true'; saveLayout(); onRender(); return; }
      if (action === 'column-move') { moveColumn(button.dataset.column!,Number(button.dataset.direction),button.dataset.child === 'true'); return; }
      if (action === 'reset-columns') { layout.order=[...defaultColumnOrder]; layout.children=[...defaultMetricOrder]; layout.hidden=[]; layout.widths={}; layout.detailsOpen=true; saveLayout(); onRender(); return; }
      if (action === 'open-fcrm') { const link = state.groups.flatMap(group => group.issues).flatMap(issue => issue.links).find(link => link.key === button.dataset.key); if (link) onOpenTask?.(link, button); return; }
      if (action === 'team') { selectTeam(button.dataset.team || ''); return; }
      if (action === 'load') { loadTasks(); return; }
      if (action === 'closed') { loadClosedSprints(); return; }
      if (action === 'refresh-sprints') { selectTeam(state.teamIds); return; }
      if (action === 'menu') {
        state.menu = state.menu === button.dataset.menu ? '' : button.dataset.menu!; state.filterQuery = ''; state.teamOpen = false; state.sprintsOpen = false;
        if (state.menu === 'epic') getEpicCatalog().then(() => { if (state.menu === 'epic') { const input = document.getElementById('ozon-dev-filter-search') as HTMLInputElement | null; const start = input?.selectionStart, end = input?.selectionEnd; const focused = document.activeElement === input; onRender(); const next = document.getElementById('ozon-dev-filter-search') as HTMLInputElement | null; if (focused && next) { next.focus({preventScroll:true}); if (start != null && end != null) next.setSelectionRange(start,end); } } }).catch((error:any) => { state.error = 'Не удалось загрузить эпики: ' + error.message; onRender(); });
      }
      if (action === 'filter') { if (button.dataset.filter === 'depth') { state.menu = ''; setDepth(Number(button.dataset.value)); return; } if (button.dataset.filter === 'epic') state.epicFilter = button.dataset.value!; else if (button.dataset.filter === 'project') state.projectFilter = button.dataset.value!; else state.streamFilter = button.dataset.value!; state.menu = ''; }
      if (action === 'clear-filters') { state.epicFilter = ''; state.streamFilter = ''; state.projectFilter = ''; }
      if (action === 'depth') { setDepth(Number(button.dataset.depth)); return; }
      if (action === 'group-up' || action === 'group-down') {
        const order = [...state.grouping]; const from = order.indexOf(button.dataset.dimension!); const to = from + (action === 'group-up' ? -1 : 1);
        if (from >= 0 && to >= 0 && to < order.length) { [order[from], order[to]] = [order[to], order[from]]; setGrouping(order); }
        return;
      }
      if (action === 'links') { const key = button.dataset.key!; state.expandedLinks.has(key) ? state.expandedLinks.delete(key) : state.expandedLinks.add(key); }
      if (action === 'team-menu') { state.teamOpen = !state.teamOpen; state.sprintsOpen = false; state.menu = ''; }
      if (action === 'sprints-done') { if (!state.selected.length || state.loadingTasks || state.loadingSprints) return; state.sprintsOpen=false; loadTasks(); return; }
      if (action === 'sprints-menu') { state.sprintsOpen = !state.sprintsOpen; state.teamOpen = false; state.menu = ''; }
      if (action === 'collapse') {
        const id = button.dataset.group!;
        if (button.getAttribute('aria-expanded') === 'true') { state.collapsed.add(id); state.expandedGroups.delete(id); }
        else { state.collapsed.delete(id); state.expandedGroups.add(id); }
      }
      onRender();
    }));
    root.querySelectorAll<HTMLElement>('[role="button"][data-dev-action]').forEach(control => control.addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); control.click(); } }));
    root.querySelectorAll<HTMLInputElement>('[data-settings-group]').forEach(input => input.addEventListener('change',() => { if(!settingsDraft)return; const id=input.dataset.settingsGroup!; settingsDraft.grouping=input.checked?[...settingsDraft.grouping,id]:settingsDraft.grouping.filter(item=>item!==id); settingsDraft.depth=Math.min(settingsDraft.depth,settingsDraft.grouping.length); onRender(); }));
    root.querySelectorAll<HTMLInputElement>('[data-settings-column]').forEach(input=>input.addEventListener('change',()=>{
      const id=input.dataset.settingsColumn!;
      if (!settingsDraft || !canHideColumn(id)) return;
      const hidden=settingsDraft.layout.hidden.filter(column=>column!==id);
      settingsDraft.layout.hidden=input.checked ? hidden : [...hidden,id];
    }));
    root.querySelector<HTMLInputElement>('[data-settings-sp]')?.addEventListener('change',event => { if(settingsDraft)settingsDraft.layout.detailsOpen=(event.target as HTMLInputElement).checked; onRender(); });
    const editorSearch = root.querySelector<HTMLInputElement>('#ozon-dev-editor-search');
    const linkSprintSearch = root.querySelector<HTMLInputElement>('#ozon-dev-link-sprint-search');
    linkSprintSearch?.addEventListener('input',() => { if (state.editor?.kind === 'link') { state.editor.meta.sprintQuery = linkSprintSearch.value; onRender(); document.getElementById('ozon-dev-link-sprint-search')?.focus({preventScroll:true}); } });
    editorSearch?.addEventListener('input',() => {
      if (!state.editor) return;
      state.editor.query = editorSearch.value;
      if (state.editor.kind === 'epic' || state.editor.kind === 'link') searchEditor(); else renderEditorPreservingInput();
    });
    root.querySelectorAll<HTMLElement>('[data-dev-row]').forEach(row => row.addEventListener('click', event => {
      const target = event.target as Element;
      // Match the product backlog: the row toggles; links and controls keep their own action.
      if (target.closest('a,button,input,label,[role="button"]')) return;
      row.querySelector<HTMLButtonElement>('[data-dev-action]')?.click();
    }));
    const section = root.querySelector('.ozon-dev-dashboard');
    section?.addEventListener('click', event => {
      if ((event.target as Element).closest('.ozon-ext-toolbar-combo,.ozon-dev-editor,.ozon-dev-settings')) return;
      if (state.editor && !state.editor.busy) { state.editor=null;++editorRequest;onRender();return; }
      if (state.menu || state.teamOpen || state.sprintsOpen) {
        state.menu = ''; state.teamOpen = false; state.sprintsOpen = false; onRender();
      }
    });
    section?.addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Escape' && state.editor && !state.editor.busy) {state.editor=null;++editorRequest;onRender();return;}
      if ((event as KeyboardEvent).key === 'Escape' && (state.menu || state.teamOpen || state.sprintsOpen)) {
        state.menu = ''; state.teamOpen = false; state.sprintsOpen = false; onRender();
      }
    });
    root.querySelectorAll<HTMLInputElement>('[data-dev-team]').forEach(input=>input.addEventListener('change',()=>{const id=input.dataset.devTeam!;selectTeam(input.checked?[...state.teamIds,id]:state.teamIds.filter(value=>value!==id),true);}));
    root.querySelectorAll<HTMLInputElement>('[data-dev-sprint]').forEach(input => input.addEventListener('change', () => {
      const id = input.dataset.devSprint!;
      setSelection(input.checked ? [...state.selected, id] : state.selected.filter(item => item !== id));
    }));
    root.querySelectorAll<HTMLInputElement>('[data-dev-group]').forEach(input => input.addEventListener('change', () => {
      const dimension = input.dataset.devGroup!;
      setGrouping(input.checked ? [...state.grouping, dimension] : state.grouping.filter(item => item !== dimension));
    }));
    const filterSearch = root.querySelector<HTMLInputElement>('#ozon-dev-filter-search');
    filterSearch?.addEventListener('input', () => {
      const start = filterSearch.selectionStart;
      const end = filterSearch.selectionEnd;
      state.filterQuery = filterSearch.value; onRender();
      const replacement = document.getElementById('ozon-dev-filter-search') as HTMLInputElement | null;
      replacement?.focus({preventScroll:true});
      try { if (start !== null && end !== null) replacement?.setSelectionRange(start, end); } catch (_) { /* Selection is not supported by every browser. */ }
    });
    const search = root.querySelector<HTMLInputElement>('#ozon-dev-sprint-search');
    search?.addEventListener('input', () => {
      state.sprintQuery = search.value;
      const caret = search.selectionStart;
      onRender();
      const replacement = document.getElementById('ozon-dev-sprint-search') as HTMLInputElement | null;
      replacement?.focus({ preventScroll: true });
      try { if (caret !== null) replacement?.setSelectionRange(caret, caret); } catch (_) { /* Search inputs do not expose selection everywhere. */ }
    });
  }
  const copyReferences = () => {
    const references = new Map<string,string>();
    allIssues().forEach(issue => { references.set(issue.key,issue.summary); if (issue.epicKey) references.set(issue.epicKey,issue.epicTitle); issue.links.forEach((link:any) => references.set(link.key,link.summary)); });
    return references;
  };
  function applyPlanningField(key:string, kind:string, value:any) {
    const source = state.groups.find(group => group.issues.some(issue => issue.key === key));
    const task = source?.issues.find((issue:any) => issue.key === key);
    const epicPatch = () => {
      const fields = value.fields || {};
      const stream = fields.customfield_24000;
      return {
        epicKey:value.id, epicTitle:fields.summary || value.id, epicStatus:fields.status?.name || '',
        epicCategory:fields.status?.statusCategory?.key || '', epicType:fields.issuetype?.name || '', epicTypeIconUrl:fields.issuetype?.iconUrl || '',
        epicPriority:fields.priority?.name || '', epicComponent:(fields.components || []).map((item:any) => item.name).filter(Boolean).join(', '),
        stream:typeof stream === 'string' ? stream : stream?.value || ''
      };
    };
    const patch = kind === 'epic' ? epicPatch() : {sprint:value.id ? value : null};
    allIssues().forEach(issue => issue.links.forEach((link:any) => { if (link.key === key) Object.assign(link,patch); }));
    if (!task) return false;
    if (kind === 'epic') {
      Object.assign(task,patch);
      allocate(task);
      return false;
    }
    const target = state.groups.find(group => value.id
      ? String(group.sprint.id) === String(value.id)
      : group.sprint.isBacklog && group.sprint.boardId === source.sprint.boardId);
    source.issues = source.issues.filter((issue:any) => issue.key !== key);
    if (!target) return true;
    task.sprint = target.sprint;
    task.lastSprintId = String(target.sprint.id);
    task.backlogIds = target.sprint.isBacklog ? [task.lastSprintId] : [];
    target.issues.push(task);
    return false;
  }
  return { html, bind, selectTeam, setSelection, loadTasks, loadClosedSprints, setGrouping, setDepth, moveColumn, getLayout: () => layout, openEditor, saveEditor, copyReferences, cancel, dismissEditor, getState: () => state, planningFields: () => ({sprint:sprintField,epic:epicField,epicName:epicNameField}), applyPlanningField };
}
