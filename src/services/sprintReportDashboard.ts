import type { createSprintReportModel } from './sprintReportModel';
import type { createJiraPeopleUi, JiraPerson } from './jiraPeopleUi';
import type {createJiraGroupingUi} from './jiraGroupingUi';
import type {createDevelopmentPointColumns} from './developmentDashboard';

// Serialized into content.js. Receives its model and the local board list from the host.
export function createSprintReportDashboard(onRender:()=>void, model:ReturnType<typeof createSprintReportModel>, boards:{id:string;name:string}[], configuredSprintField:string, configuredEpicField:string, renderBadge:(label:string, state:string)=>string, isEpicIssueType:(type:string)=>boolean, people:ReturnType<typeof createJiraPeopleUi>, pointColumns:ReturnType<typeof createDevelopmentPointColumns>, developmentGrouping:()=>string[] = ()=>['project','epic'], groupingUi?:ReturnType<typeof createJiraGroupingUi>, reviewRowClass:(key:string,status:string)=>string=()=> '') {
  type Report = ReturnType<typeof model.build>;
  type Leader = NonNullable<ReturnType<Report['byProject']['get']>>['leaders'][number];
  const state = {board:boards[0].id,sprint:'',sprints:[] as any[],report:null as Report | null, section:'days',day:'',query:'',limit:60,rollupOpen:false,
    scopeFilter:'all',eventFilter:'all',project:'',picker:'',sprintQuery:'',chartMode:'total' as 'total'|'projects',chartDay:'',chartProject:'',loading:'',loadingProgress:null as number | null,error:'',sprintFailed:false,epicField:configuredEpicField,
    selectedSprints:[] as string[], comparisonProject:'', comparisonUnit:'points', sprintResults:new Map<string,{report:Report;loadedAt:number}>(), sprintErrors:new Map<string,string>()};
  type Tree = 'details' | 'rollup';
  const groupOverrides = {details:new Map<string,boolean>(),rollup:new Map<string,boolean>()};
  const groupDepth = {details:0,rollup:0};
  const groupNames:Record<string,string> = {project:'Проект',epic:'Эпик',stream:'Стрим',component:'Компонент'};
  const validGroups = (keys:string[])=>[...new Set(keys.filter(key=>Object.hasOwn(groupNames,key)))];
  let customGrouping:string[] | null=null;
  let groupingDraft:{order:string[];inherit:boolean} | null=null;
  type EpicUpdate = {id:string;name:string;fields?:{summary?:string;customfield_24000?:unknown}};
  type TaskUpdate = {epic?:EpicUpdate;assigneeName?:string;assignee?:JiraPerson | null};
  const pendingTaskUpdates = new Map<string,TaskUpdate>();
  try {
    const saved = JSON.parse(localStorage.getItem('ozon-sprint-report-v1') || 'null');
    if (saved && boards.some(board => board.id === saved.board)) {
      state.board = saved.board;
      state.sprint = String(saved.sprint || '');
      state.selectedSprints = Array.isArray(saved.sprints) ? [...new Set<string>(saved.sprints.filter((id:unknown)=>typeof id==='string' && /^\d+$/.test(id)))] : state.sprint ? [state.sprint] : [];
      if (saved.chartMode === 'projects') state.chartMode = 'projects';
    }
    if (Array.isArray(saved?.grouping)) customGrouping=validGroups(saved.grouping);
  } catch (_) { /* Selection remains available for this visit. */ }
  let controller:AbortController | null = null;
  let generation = 0;
  let hasOpened = false;
  let sprintDraft: Set<string> | null = null;
  let activeSprint = '';
  let comparisonScroll = {top:0,chart:0,table:0};
  let outsideBound = false;
  const catalog = new Map<string,any[]>();
  const escape = (value:any) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const amount = new Intl.NumberFormat('ru',{maximumFractionDigits:2}).format;
  const percent = new Intl.NumberFormat('ru',{style:'percent',maximumFractionDigits:1}).format;
  const compareGroup = new Intl.Collator('ru',{numeric:true}).compare;
  const groupOrder = (a:string,b:string) => Number(!a)-Number(!b) || compareGroup(a,b);
  const emptyGroups:Record<string,string> = {project:'Без проекта',epic:'Без эпика',stream:'Без стрима',component:'Без компонента'};
  const dimensions=()=>customGrouping ?? validGroups(developmentGrouping());
  const groupExpanded=(tree:Tree,id:string,depth:number)=>groupOverrides[tree].get(id) ?? depth<groupDepth[tree];
  const resetGroupOverrides=()=>Object.values(groupOverrides).forEach(groups=>groups.clear());
  const searchingTasks=()=>state.section!=='days' && Boolean(state.query.trim());
  function depthControl(tree:Tree) {
    const levels=dimensions();
    if (!levels.length) return '';
    const options=levels.map((value,index)=>({value:String(index),label:groupNames[value]}));
    if (tree==='details') options.push({value:'all',label:'Задачи'});
    const disabled=tree==='details' && searchingTasks();
    const depth=tree==='rollup' ? String(Math.min(groupDepth.rollup,levels.length-1)) : disabled || groupDepth.details>=levels.length ? 'all' : String(groupDepth.details);
    const selected=groupOverrides[tree].size && !disabled ? 'manual' : depth;
    return groupingUi?.depthHtml('report-' + tree,options,selected,disabled,tree==='rollup' ? 'Раскрыть план и факт до уровня' : 'Раскрыть список задач до уровня') || '';
  }
  function groupingSettings() {
    if (!groupingDraft || !groupingUi) return '';
    return '<aside class="ozon-dev-settings ozon-dev-settings-stable ozon-report-settings" role="dialog" aria-labelledby="ozon-report-settings-title"><header class="ozon-dev-editor-head"><strong id="ozon-report-settings-title">Группировка отчёта</strong><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-settings="cancel" aria-label="Закрыть настройки">✕</button></header>' +
      '<p>Применяется к спискам задач и таблице плана и факта.</p>' + groupingUi.html('report-grouping',groupingDraft.order,groupNames,'data-report-group-field') +
      '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-settings="inherit" aria-pressed="' + groupingDraft.inherit + '">Как в «Командах разработки»</button>' +
      '<footer><button type="button" class="ozon-ext-btn" data-report-settings="apply">Применить</button><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-settings="cancel">Отмена</button></footer></aside>';
  }
  const plurals = new Intl.PluralRules('ru');
  const taskCount = (count:number) => amount(count) + ' ' + ({one:'задача',few:'задачи'}[plurals.select(count)] || 'задач');
  const eventCount = (count:number) => amount(count) + ' ' + ({one:'событие',few:'события'}[plurals.select(count)] || 'событий');
  const dateFormat = new Intl.DateTimeFormat('ru',{timeZone:'Europe/Moscow',day:'numeric',month:'short'});
  const sprintDateFormat = new Intl.DateTimeFormat('ru',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric'});
  const timeFormat = new Intl.DateTimeFormat('ru',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'});
  const shortDate = (time:number) => dateFormat.format(time).replace(/\.$/,'');
  const dayLabel = (day:string) => shortDate(Date.parse(day + 'T12:00:00Z'));
  const issueLink = (key:string,title='') => '<a class="ozon-mono" href="/browse/' + encodeURIComponent(key) + '" target="_blank" rel="noopener noreferrer"' + (title ? ' data-issue-copy-title="' + escape(title) + '"' : '') + '>' + escape(key) + '</a>';
  const remember = () => { try { localStorage.setItem('ozon-sprint-report-v1',JSON.stringify({board:state.board,sprint:state.sprint,sprints:state.selectedSprints,chartMode:state.chartMode,grouping:customGrouping})); } catch (_) {} };

  async function json(path:string, signal:AbortSignal) {
    const response = await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal});
    if (!response.ok) throw new Error('Запрос к Jira не выполнен (HTTP ' + response.status + ').');
    return response.json();
  }

  async function pages(path:string, property:string, signal:AbortSignal) {
    const items:any[] = [];
    const seen = new Set<string>();
    for (let start = 0; ; ) {
      const response = await json(path + (path.includes('?') ? '&' : '?') + 'startAt=' + start + '&maxResults=50',signal);
      const page = response[property];
      if (!Array.isArray(page)) throw new Error('Jira вернула список в неизвестном формате.');
      if (!page.length) {
        if (Number(response.total) > start) throw new Error('Jira вернула неполный список.');
        return items;
      }
      const fingerprint = page.map(item => item.id || item.key).join(',');
      if (seen.has(fingerprint)) throw new Error('Jira повторила страницу результатов.');
      seen.add(fingerprint);
      items.push(...page);
      start += page.length;
      if (response.isLast === true || (Number.isFinite(response.total) && start >= response.total) ||
        (response.isLast !== false && !Number.isFinite(response.total) && page.length < Number(response.maxResults || 50))) return items;
    }
  }

  function cancel() {
    controller?.abort();
    controller = null;
    generation++;
    pendingTaskUpdates.clear();
    state.loading = '';
    state.loadingProgress = null;
    state.picker = '';
    sprintDraft = null;
    activeSprint = '';
    state.chartDay = '';
  }

  const sprintId = (sprint:any) => String(sprint.id);
  const selectedSprints = () => state.sprints.filter(sprint=>state.selectedSprints.includes(sprintId(sprint))).sort((a,b)=>
    (Date.parse(a.startDate || a.endDate) || 0) - (Date.parse(b.startDate || b.endDate) || 0) || Number(a.id) - Number(b.id));

  function resetDetail(sprint:string) {
    state.sprint=sprint; state.report=state.sprintResults.get(sprint)?.report || null;
    state.day=''; state.query=''; state.limit=60; state.section='days'; state.scopeFilter=state.eventFilter='all';
    state.project=state.report?.byProject.has(state.comparisonProject) ? state.comparisonProject : '';
    state.chartDay=''; state.chartProject=''; resetGroupOverrides();
    groupDepth.details=groupDepth.rollup=0;
    selectInitialDay();
  }

  function selectInitialDay() {
    const days=state.report?.days || [];
    if (!days.some(day=>day.date===state.day)) state.day=[...days].reverse().find(day=>day.changes.length)?.date || days.at(-1)?.date || '';
  }

  async function chooseBoard(board:string, preferred:string[] = [], force = false, detail = '') {
    if (!boards.some(option => option.id === board)) return;
    cancel();
    const request = generation;
    controller = new AbortController();
    const signal = controller.signal;
    state.board = board; state.sprints = []; state.selectedSprints = preferred; state.comparisonProject = '';
    state.sprintResults.clear(); state.sprintErrors.clear(); resetDetail('');
    state.loading = 'Загружаем спринты…'; state.error = ''; state.sprintFailed = false;
    onRender();
    try {
      let sp = force ? undefined : catalog.get(board);
      if (!sp) {
        sp = (await pages('/rest/agile/1.0/board/' + encodeURIComponent(board) + '/sprint?state=active,closed','values',signal))
          .filter(item => item?.id && item.name && (!item.originBoardId || String(item.originBoardId) === board) && /^(active|closed)$/i.test(item.state))
          .sort((a,b) => Number(b.state === 'active') - Number(a.state === 'active') ||
            (Date.parse(b.startDate) || 0) - (Date.parse(a.startDate) || 0) || Number(b.id) - Number(a.id));
      }
      if (request !== generation) return;
      catalog.set(board,sp);
      state.sprints = sp;
      state.selectedSprints = preferred.filter(id=>sp.some(item=>sprintId(item)===id));
      if (!state.selectedSprints.length && sp.length) state.selectedSprints=[sprintId(sp[0])];
      resetDetail(state.selectedSprints.length===1 ? state.selectedSprints[0] : state.selectedSprints.includes(detail) ? detail : '');
      state.loading = '';
      remember();
      if (state.selectedSprints.length) void loadReports();
      else onRender();
    } catch (error:any) {
      if (request !== generation) return;
      state.loading = ''; state.error = error.message; state.sprintFailed = true;
      onRender();
    }
  }

  const recover = (promise:Promise<any>,signal:AbortSignal) => promise.catch(error => { if (signal.aborted) throw error; return null; });

  async function reportFields(board:string,signal:AbortSignal) {
    const [configuration, fields] = await Promise.all([
      recover(json('/rest/agile/1.0/board/' + encodeURIComponent(board) + '/configuration',signal),signal),
      recover(json('/rest/api/2/field',signal),signal)
    ]);
    const currentField = (Array.isArray(fields) ? fields : []).find(field => String(field.schema?.custom || '').includes('gh-sprint'))?.id || configuredSprintField;
    const epicField = (Array.isArray(fields) ? fields : []).find(field => String(field.schema?.custom || '').endsWith('gh-epic-link') || /^(epic link|ссылка на эпик)$/i.test(String(field.name || '')))?.id || configuredEpicField;
    const estimate = configuration?.estimation?.field;
    const pointsField = /^customfield_\d+$/.test(estimate?.fieldId || '') ? estimate.fieldId : '';
    const pointsName = estimate?.displayName || (Array.isArray(fields) ? fields : []).find(field => field.id === pointsField)?.name || 'Story Points';
    const lastColumn = (configuration?.columnConfig?.columns || []).filter((column:any) => column.statuses?.length).at(-1);
    const doneIds = (lastColumn?.statuses || []).map((status:any) => String(status.id));
    const fieldList = [...new Set(['summary','created','status','issuetype','assignee','project','components','sprint','closedSprints','epic','parent',currentField,pointsField,epicField,'customfield_24000'].filter(Boolean))].join(',');
    return {currentField,epicField,pointsField,pointsName,doneIds,fieldList};
  }

  async function fetchReport(selected:any,board:string,fields:Awaited<ReturnType<typeof reportFields>>,signal:AbortSignal,historyCache:Map<string,any>,epicCache:Map<string,any>,progress:(message:string,percent?:number)=>void) {
    const id = sprintId(selected);
    const [sprintDetails, native] = await Promise.all([
      recover(json('/rest/agile/1.0/sprint/' + encodeURIComponent(id),signal),signal),
      recover(json('/rest/greenhopper/1.0/rapid/charts/sprintreport?' + new URLSearchParams({rapidViewId:board,sprintId:id}),signal),signal)
    ]);
    const sprint = {...selected,...sprintDetails};
    const scope = model.nativeScope(native);
    const {currentField,epicField,pointsField,pointsName,doneIds,fieldList} = fields;
    const baseline = scope ? [] : await pages('/rest/agile/1.0/board/' + encodeURIComponent(board) + '/sprint/' + encodeURIComponent(id) + '/issue?fields=' + encodeURIComponent(fieldList),'issues',signal);
    const keys = [...new Set<string>([...baseline.map(issue => issue.key),...scope?.issues.keys() || [],...scope?.added || []])].filter(key => /^[A-Z][A-Z0-9_]*-\d+$/.test(key));
    const issues = new Map<string,any>(baseline.map(issue => [issue.key,issue]));
    for (const key of keys) if (historyCache.has(key)) issues.set(key,historyCache.get(key));
    const needHistory=keys.filter(key=>!historyCache.has(key));
    const complete = (issue:any) => {
      const log = issue?.changelog;
      return Array.isArray(log?.histories) && Number(log.startAt || 0) === 0 && (!Number.isFinite(log.total) || log.total <= log.histories.length);
    };
    // Request histories in bounded batches. Jira may limit changelog expansion on
    // search results, in which case only those issues get a dedicated request.
    const loadChunk = async (chunk:string[]) => {
      const search = new URLSearchParams({jql:'key in (' + chunk.join(',') + ') ORDER BY key ASC',fields:fieldList,expand:'changelog'});
      const searched = await recover(pages('/rest/api/2/search?' + search,'issues',signal),signal);
      const byKey = new Map((searched || []).map((issue:any) => [issue.key,issue]));
      for (let index=0; index<chunk.length; index+=3) {
        await Promise.all(chunk.slice(index,index+3).map(async key => {
          const partial:any = byKey.get(key);
          const result = complete(partial) ? partial : (await recover(json('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=' + encodeURIComponent(fieldList) + '&expand=changelog',signal),signal)) || partial;
          if (result) issues.set(key,result);
          if (complete(result)) historyCache.set(key,result);
        }));
      }
    };
    for (let index=0; index<needHistory.length; index+=40) {
      signal.throwIfAborted();
      const checked=keys.length-needHistory.length+index;
      progress('Проверяем историю задач: ' + checked + ' из ' + keys.length + '…', Math.floor(checked/keys.length*100));
      const chunks = [needHistory.slice(index,index+20),needHistory.slice(index+20,index+40)].filter(chunk => chunk.length);
      await Promise.all(chunks.map(loadChunk));
    }
    signal.throwIfAborted();
    const epicKeys = [...new Set([...issues.values()].map(issue => model.epicKeyFor(issue.fields || {},epicField)).filter(Boolean))];
    const epics = new Map<string,any>();
    epicKeys.forEach(key => {
      if (issues.has(key)) epics.set(key,issues.get(key).fields);
      else if (epicCache.has(key)) epics.set(key,epicCache.get(key));
    });
    const needMetadata = epicKeys.filter(key => !epics.has(key));
    if (needMetadata.length) {
      progress('Загружаем стримы и эпики…');
    }
    for (let index=0; index<needMetadata.length; index+=50) {
      signal.throwIfAborted();
      const jql = 'key in (' + needMetadata.slice(index,index+50).join(',') + ')';
      const data = await recover(pages('/rest/api/2/search?' + new URLSearchParams({jql,fields:'summary,customfield_24000'}),'issues',signal),signal);
      data?.forEach((issue:any) => {epics.set(issue.key,issue.fields || {}); epicCache.set(issue.key,issue.fields || {});});
    }
    signal.throwIfAborted();
    return model.build({sprint,scope,issues:[...issues.values()],sprintField:currentField,pointsField,pointsName,doneIds,epicField,epics});
  }

  async function loadReports(force=false, focusedOnly=false) {
    cancel();
    const candidates=selectedSprints().filter(sprint=>!focusedOnly || sprintId(sprint)===state.sprint);
    const queue=candidates.filter(sprint=>{
      const cached=state.sprintResults.get(sprintId(sprint));
      return force || !cached || (!cached.report.closed && Date.now()-cached.loadedAt>15000);
    });
    if (!queue.length) { onRender(); return; }
    const request=generation, board=state.board;
    controller=new AbortController();
    const signal=controller.signal;
    const historyCache=new Map<string,any>(), epicCache=new Map<string,any>();
    state.error=''; state.loading='Читаем состав спринтов…';
    queue.forEach(sprint=>state.sprintErrors.delete(sprintId(sprint)));
    onRender();
    try {
      const fields=await reportFields(board,signal);
      if (request!==generation) return;
      state.epicField=fields.epicField;
      for (const [index, sprint] of queue.entries()) {
        if (request!==generation) return;
        const id=sprintId(sprint);
        activeSprint=id;
        const lead=queue.length>1 ? 'Спринт ' + (index+1) + ' из ' + queue.length + ' · ' + sprint.name + '. ' : '';
        const progress=(message:string,percent?:number)=>{
          if (request!==generation) return;
          state.loading=lead+message;
          state.loadingProgress=percent ?? null;
          onRender();
        };
        progress('Читаем состав спринта…');
        try {
          const report=await fetchReport(sprint,board,fields,signal,historyCache,epicCache,comparing() ? ()=>{} : progress);
          if (request!==generation) return;
          sprint.state=report.closed ? 'closed' : 'active';
          state.sprintResults.set(id,{report,loadedAt:Date.now()});
          pendingTaskUpdates.forEach((update,key)=>applyTaskUpdate(report,key,update));
          if (state.sprint===id) {
            state.report=report;
            if (state.project && !report.byProject.has(state.project)) state.project='';
            selectInitialDay();
            void loadLeaderAvatars(report,signal);
          }
        } catch (error:any) {
          if (request!==generation) return;
          state.sprintErrors.set(id,error.message || 'Не удалось подготовить отчёт.');
        }
      }
    } catch (error:any) {
      if (request===generation) state.error=error.message || 'Не удалось подготовить отчёт.';
    } finally {
      if (request===generation) {
        if (state.comparisonProject && ![...state.sprintResults.values()].some(({report})=>report.byProject.has(state.comparisonProject))) state.comparisonProject='';
        state.loading=''; state.loadingProgress=null; activeSprint=''; pendingTaskUpdates.clear(); onRender();
      }
    }
  }

  function open(context?:{board:string;sprints:string[]}) {
    const fromDevelopment=context?.sprints || [];
    if (context && fromDevelopment.length && boards.some(board => board.id === context.board) &&
        (state.board !== context.board || fromDevelopment.some(id=>!state.selectedSprints.includes(id)) ||
         (fromDevelopment.length>1 && fromDevelopment.length!==state.selectedSprints.length))) {
      hasOpened = true;
      void chooseBoard(context.board,fromDevelopment);
      return;
    }
    if (hasOpened && (state.sprints.length || state.loading || state.error)) {
      if (!state.loading && state.sprints.length) void loadReports(false,Boolean(state.sprint));
      return;
    }
    hasOpened = true;
    void chooseBoard(state.board,state.selectedSprints,false,state.sprint);
  }

  const visibleReport = (report:Report) => {
    const detail = report.byProject.get(state.project);
    return detail ? {...report,...detail} : report;
  };
  const positive = (n:number) => n > 0 ? '+' + amount(n) : amount(n);
  function loadingBanner() {
    const progress=state.loadingProgress;
    const indicator=groupingUi?.progressHtml(state.loading,progress,'ozon-report-progress') ??
      '<label>' + escape(state.loading) + ' <progress max="100"' + (progress===null ? '' : ' value="' + progress + '"') + '></progress></label>';
    return '<div class="ozon-report-banner">' + indicator + '</div>';
  }
  const linkToJira = () => '/secure/RapidBoard.jspa?rapidView=' + encodeURIComponent(state.board) + '&view=reporting&chart=sprintRetrospective&sprint=' + encodeURIComponent(state.sprint);
  const sprintBadge = (status:string) => status === 'active' ? renderBadge('Активный','active') : status === 'closed' ? renderBadge('Закрытый','closed') : '';
  const metric = (report:Report,value:number,signed=false) => report.pointsField ? (signed ? positive(value) : amount(value)) + (/^(story points?|стори[ -]поинты)$/i.test(report.pointsName) ? ' SP' : '') : '—';

  type PickerOption = {id:string;name:string;badge?:string};
  function sprintSearchTerms(text:string) {
    return (text.normalize('NFKC').toLowerCase().match(/\d{4}-\d{1,2}-\d{1,2}|\d+(?:[./]\d*)*|\p{L}+/gu) || []).map(term => {
      if (/^\d{4}-/.test(term)) return term.split('-').reverse().map(Number).join('.');
      return /^\d/.test(term) ? term.split(/[./]/).map(part=>part ? String(Number(part)) : '').join('.') : term;
    });
  }
  function sprintOptions(query = '') {
    const terms = sprintSearchTerms(query);
    const matches = terms.length ? state.sprints.filter(sprint => {
      const dates = [sprint.startDate,sprint.endDate].map(value=>Date.parse(value || '')).filter(Number.isFinite);
      const words = sprintSearchTerms([sprint.name,...dates.map(time=>sprintDateFormat.format(time))].join(' '));
      return terms.every(term=>words.some(word=>{
        if (/^\d+$/.test(term)) return word === term;
        if (!term.includes('.')) return word.startsWith(term);
        const parts=term.split('.'), date=word.split('.');
        return date.length>1 && parts.length<=date.length && parts.every((part,index)=>
          !part || (index===2 ? date[index].startsWith(part) : date[index]===part));
      }));
    }) : state.sprints;
    return matches.map(sprint=>({id:String(sprint.id),name:sprint.name,badge:sprintBadge(sprint.state)}));
  }
  function pickerChoices(options:PickerOption[],selected:string,empty:string) {
    return options.map(option=>'<button type="button" role="option" class="ozon-ext-combo-item ' + (option.id === selected ? 'active' : '') + '" data-report-choice="' + escape(option.id) + '" aria-selected="' + (option.id === selected) + '"><span>' + escape(option.name) + '</span>' + (option.badge || '') + '</button>').join('') ||
      '<p class="ozon-report-picker-empty" role="status">' + escape(empty) + '</p>';
  }
  function picker(id:string,label:string,selected:string,options:PickerOption[],empty='Нет вариантов') {
    const current=options.find(option=>option.id===selected);
    const open=state.picker===id;
    const list = open ? '<div class="ozon-report-option-list" role="listbox" aria-label="' + escape(label) + '">' +
      pickerChoices(options,selected,empty) + '</div>' : '';
    return '<div class="ozon-ext-toolbar-combo" data-report-picker-widget="' + id + '">' +
      '<button type="button" class="ozon-ext-toolbar-trigger" data-report-picker="' + id + '" aria-label="' + escape(label) + '" aria-expanded="' + open + '" aria-haspopup="listbox"' + (!options.length ? ' disabled' : '') + '><span class="ozon-ext-toolbar-label">' + escape(current?.name || empty) + '</span>' + (current?.badge || '') + '<span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></button>' +
      (open ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ozon-report-options" data-report-options>' + list + '</div>' : '') + '</div>';
  }

  const sprintSelection=()=>state.selectedSprints.length ? state.selectedSprints : state.sprint ? [state.sprint] : [];
  const sprintSelectionCount=(count:number)=>'Выбрано: ' + amount(count);
  const sprintApplyLabel=(count:number)=>count>1 ? 'Сравнить' : 'Показать отчёт';

  function sprintChoices(query:string) {
    const chosen=sprintDraft || new Set(sprintSelection());
    return sprintOptions(query).map(option=>'<label class="ozon-dev-sprint-option"><input type="checkbox" data-report-sprint-choice="' + escape(option.id) + '"' + (chosen.has(option.id) ? ' checked' : '') + '><span>' + escape(option.name) + '</span>' + (option.badge || '') + '</label>').join('') ||
      '<p class="ozon-report-picker-empty" role="status">Спринты не найдены</p>';
  }

  function sprintPicker() {
    const selection=sprintSelection();
    const chosen=sprintOptions().find(option=>selection.length===1 && option.id===selection[0]);
    const caption=chosen?.name || (selection.length>1 ? sprintSelectionCount(selection.length) : state.loading ? 'Загружаем спринты…' : 'Нет спринтов');
    const open=state.picker==='sprint';
    const count=sprintDraft?.size ?? selection.length;
    return '<div class="ozon-ext-toolbar-combo" data-report-picker-widget="sprint"><button type="button" class="ozon-ext-toolbar-trigger" data-report-picker="sprint" aria-label="Спринты. ' + escape(caption) + '" aria-expanded="' + open + '" aria-haspopup="dialog"' + (!state.sprints.length ? ' disabled' : '') + '><span class="ozon-ext-toolbar-label" title="' + escape(caption) + '">' + escape(caption) + '</span>' + (chosen?.badge || '') + '<span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></button>' +
      (open ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ozon-report-options ozon-report-sprint-options" data-report-options role="dialog" aria-label="Выбор спринтов">' +
        '<input type="search" class="ozon-report-sprint-search" data-report-sprint-search aria-label="Поиск спринта" placeholder="Поиск по номеру или дате…" autocomplete="off" value="' + escape(state.sprintQuery) + '"><div class="ozon-report-option-list" data-report-sprint-list>' + sprintChoices(state.sprintQuery) + '</div>' +
        '<div class="ozon-report-sprint-footer"><span data-report-sprint-count aria-live="polite">' + sprintSelectionCount(count) + '</span><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-sprint-clear' + (count ? '' : ' disabled') + '>Снять выбор</button><button type="button" class="ozon-ext-btn" data-report-sprint-apply' + (count ? '' : ' disabled') + '>' + sprintApplyLabel(count) + '</button></div></div>' : '') + '</div>';
  }

  function summaryFields(report:Report,m:Report['metrics']) {
    return [
      {label:'План на старте',points:m.planned,count:m.plannedTasks,unestimated:m.unestimated,section:'start',filter:'all'},
      {label:'Добавили в спринт',points:m.added,count:m.addedTasks,section:'scope',filter:'added'},
      {label:'Исключили из спринта',points:m.removed,count:m.removedTasks,section:'scope',filter:'removed'},
      ...(report.pointsField ? [{label:'Переоценка',points:m.estimateDelta,count:m.estimatedTasks,section:'scope',filter:'estimate'}] : []),
      {label:report.closed ? 'Завершили к закрытию' : 'Завершено сейчас',points:m.completedPoints,count:m.completed,unestimated:m.completedUnestimated,section:'finish',filter:'done'},
      {label:report.closed ? 'Не завершили к закрытию' : 'Не завершено сейчас',points:m.remaining,count:m.remainingTasks,unestimated:m.remainingUnestimated,section:'finish',filter:'remaining'}
    ];
  }

  const countedTasks=(report:Report,count:number,unestimated=0)=>taskCount(count) + (report.pointsField && unestimated ? ' · ' + amount(unestimated) + ' без оценки' : '');
  const finalTaskCount=(report:Report,m:Report['metrics'])=>countedTasks(report,m.completed+m.remainingTasks,m.completedUnestimated+m.remainingUnestimated);
  const planCompletionTasks=(m:Report['metrics'])=>amount(m.plannedCompleted) + ' из ' + amount(m.plannedTasks) +
    (m.plannedTasks % 10 === 1 && m.plannedTasks % 100 !== 11 ? ' задачи' : ' задач');
  const planCompletionPoints=(report:Report,m:Report['metrics'])=>amount(m.plannedCompletedPoints) + ' из ' + metric(report,m.planned);

  function overview(report:Report) {
    const m=report.metrics;
    const cards=summaryFields(report,m).map(item=>{
      const count=countedTasks(report,item.count,item.unestimated);
      const main=report.pointsField ? metric(report,item.points,item.filter==='estimate') : count;
      return '<button type="button" class="ozon-report-card" data-report-section="' + item.section + '" data-report-target-filter="' + item.filter + '"><span>' + escape(item.label) + '</span><strong>' + escape(main) + '</strong>' +
        (report.pointsField ? '<small>' + escape(count) + '</small>' : '') + '</button>';
    }).join('');
    const total=(report.pointsField ? metric(report,m.completedPoints+m.remaining) + ' · ' : '') + finalTaskCount(report,m);
    return '<div class="ozon-report-cards">' + cards + '</div><div class="ozon-report-totals"><span>' + (report.closed ? 'В спринте к закрытию' : 'В спринте сейчас') + ' <strong>' + escape(total) + '</strong></span>' +
      (m.plannedTasks ? '<span>Из первоначального плана завершили <strong>' + escape(planCompletionTasks(m) + (report.pointsField ? ' · ' + planCompletionPoints(report,m) : '')) + '</strong></span>' : '') + '</div>';
  }

  function definitions(report:Report) {
    const cutoff=report.closed ? 'при закрытии спринта' : 'на момент обновления';
    const plan=report.pointsField ? '<p>План использует оценки на момент запуска спринта. В «Из плана завершили» суммируются стартовые оценки задач из этого плана, которые завершены ' + cutoff + '. Добавления и исключения используют оценки на момент изменения. Переоценка показывает разницу оценок, пока задача была в спринте. Задачи без оценки учитываются в количестве.</p>' : '';
    const m=report.metrics;
    const scope=report.pointsField && Math.abs(m.planned+m.added-m.removed+m.estimateDelta-m.completedPoints-m.remaining)<0.001
      ? '<p>Итоговый объём: план + добавили − исключили ± переоценка. Для этого отчёта <strong>' + escape([amount(m.planned),' + ',amount(m.added),' − ',amount(m.removed),m.estimateDelta<0 ? ' − ' : ' + ',amount(Math.abs(m.estimateDelta)),' = ',metric(report,m.completedPoints+m.remaining)].join('')) + '</strong>.</p>' : '';
    return '<details class="ozon-report-method ozon-report-definitions"><summary>Как считаются показатели</summary>' + plan + scope +
      '<p>В списках изменений каждая задача учитывается один раз в каждом показателе.' + (report.pointsField ? ' Если задачу добавили, исключили и снова добавили, баллы учитываются при каждом движении.' : '') + '</p>' +
      '<p>В итогах «Завершили» и «Не завершили» используются состав, статусы' + (report.pointsField ? ' и оценки' : '') + ' ' + cutoff + '. ' + (report.closed ? 'Незавершённые задачи остались в спринте на момент закрытия. Исключённые раньше задачи видны в «Составе и оценках».' : '') + '</p>' +
      '<p>В рейтинг проекта входят задачи, которые завершили в этом спринте и остались завершёнными ' + cutoff + '. Они засчитываются исполнителю на момент перехода в «Готово».' +
      (report.pointsField ? ' Лидирует тот, кто набрал больше баллов по оценкам в итогах. При равенстве баллов сравнивается число задач.' : ' Лидирует тот, кто завершил больше задач.') + ' При полном равенстве показаны все лидеры.</p></details>';
  }

  function projectFilter(report:Report) {
    const keys=[...report.byProject.keys()];
    if (keys.length === 1) return '<div class="ozon-report-projectbar">Проект <b>' + escape(keys[0]) + '</b></div>';
    if (!keys.length) return '';
    const options=[{id:'',name:'Все проекты'},...keys.map(key=>({id:key,name:key}))];
    return '<div class="ozon-report-projectbar"><span>Проект</span>' + picker('project','Проект',state.project,options) + '</div>';
  }

  async function loadLeaderAvatars(report:Report,signal:AbortSignal) {
    const missing = new Map<string,Leader[]>();
    for (const {leaders} of report.byProject.values()) {
      for (const leader of leaders) {
        if (leader.avatarUrl && leader.login) continue;
        if (!missing.has(leader.id)) missing.set(leader.id,[]);
        missing.get(leader.id)!.push(leader);
      }
    }
    if (!missing.size) return;
    const avatarSignal=AbortSignal.any([signal,AbortSignal.timeout(1800)]);
    const userFor=(kind:string,id:string)=>json('/rest/api/2/user?' + new URLSearchParams({[kind]:id}),avatarSignal).catch(()=>null);
    await Promise.all([...missing].map(async ([id,leaders])=>{
      const user=await userFor('key',id) || (!avatarSignal.aborted && await userFor('username',id));
      if (signal.aborted || !user) return;
      const avatar=people.safeAvatarUrl(model.avatarFor(user));
      leaders.forEach(leader=>{leader.avatarUrl=avatar || leader.avatarUrl;leader.login=String(user.name || leader.login);});
      document.querySelectorAll<HTMLElement>('.ozon-report [data-report-leader]').forEach(card=>{
        if (card.dataset.reportLeader!==id) return;
        const leader=leaders[0];
        const image=card.querySelector<HTMLImageElement>('[data-report-avatar]');
        if (avatar && image) {image.src=avatar;image.hidden=false;}
        if (leader.login && !card.querySelector('[data-ozon-copy-login]')) card.insertAdjacentHTML('beforeend',people.copyButton(leader));
      });
    }));
  }

  function leaderList(report:Report,leaders:Leader[]) {
    if (!leaders.length) return '<small>—</small>';
    return '<div class="ozon-report-leaders">' + leaders.map(leader=>{
      const initials=leader.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
      const avatar=people.safeAvatarUrl(leader.avatarUrl);
      const total=(report.pointsField ? metric(report,leader.points) + ' · ' : '') + taskCount(leader.tasks);
      return '<div class="ozon-report-leader" data-report-leader="' + escape(leader.id) + '"><span class="ozon-report-leader-avatar" aria-hidden="true">' + escape(initials) +
        '<img data-report-avatar="' + escape(leader.id) + '"' + (avatar ? ' src="' + escape(avatar) + '"' : ' hidden') + ' width="26" height="26" alt="">' +
        '</span><span class="ozon-report-leader-name"><strong>' + escape(leader.name) + '</strong><small>' + escape(total) + '</small></span>' + people.copyButton(leader) + '</div>';
    }).join('') + '</div>';
  }

  function projectBreakdown(report:Report) {
    if (!report.byProject.size) return '';
    if (report.byProject.size === 1) {
      const leaders=[...report.byProject.values()][0].leaders;
      return '<div class="ozon-report-single-leader"><span>Лидер проекта</span>' + leaderList(report,leaders) + '</div>';
    }
    const headings=summaryFields(report,report.metrics).map(item=>'<th>' + escape(item.label) + '</th>').join('');
    const cells=(m:Report['metrics'])=>summaryFields(report,m).map(item=>'<td>' + (report.pointsField ? '<strong>' + escape(metric(report,item.points,item.filter==='estimate')) + '</strong><br>' : '') + '<small>' + escape(countedTasks(report,item.count,item.unestimated)) + '</small></td>').join('');
    return '<div class="ozon-report-table-wrap ozon-report-projects"><table aria-label="Показатели по проектам"><thead><tr><th>Проект</th>' + headings + '<th>' + (report.closed ? 'Всего к закрытию' : 'Всего сейчас') + '</th><th>Из плана завершили</th><th>Лидер проекта</th></tr></thead><tbody>' +
      [...report.byProject].map(([key,{metrics:m,leaders}])=>'<tr class="' + (key===state.project ? 'ozon-report-project-selected' : '') + '"><th scope="row"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-project="' + escape(key) + '" aria-pressed="' + (key===state.project) + '">' + escape(key) + '</button></th>' +
        cells(m) + '<td>' + (report.pointsField ? '<strong>' + escape(metric(report,m.completedPoints+m.remaining)) + '</strong><br>' : '') + '<small>' + escape(finalTaskCount(report,m)) + '</small></td><td>' +
        (m.plannedTasks && report.pointsField ? '<strong>' + escape(planCompletionPoints(report,m)) + '</strong><br>' : '') +
        '<small>' + (m.plannedTasks ? escape(planCompletionTasks(m)) : '—') + '</small></td><td>' + leaderList(report,leaders) + '</td></tr>').join('') + '</tbody></table></div>';
  }

  function groupBreakdown(report:Report) {
    if (!report.pointsField || !report.byProject.size) return '';
    const scope=visibleReport(report);
    const levels=dimensions();
    type PercentageBase = Pick<Report['metrics'],'planned'|'completedPoints'>;
    const rollupRow=(label:string,tasks:Report['rows'],base:PercentageBase,highlight:boolean)=>{
      const totals=Array.from({length:pointColumns.definitions.length+1},()=>({plan:0,fact:0}));
      for (const task of tasks) {
        const plan=task.started ? task.startPoints ?? 0 : 0;
        const fact=task.doneAtEnd ? task.endPoints ?? 0 : 0;
        totals[0].plan+=plan;
        totals[0].fact+=fact;
        if (!plan && !fact) continue;
        pointColumns.matches(task.stream,task.epicKey).forEach((matches,index)=>{
          if (!matches) return;
          totals[index+1].plan+=plan;
          totals[index+1].fact+=fact;
        });
      }
      const value=(kind:'plan'|'fact',points:number,total:number)=>{
        const share=total ? percent(points/total) : '—';
        const measure=kind==='plan' ? 'План' : 'Факт';
        return '<div class="ozon-report-rollup-value is-' + kind + '" title="' + escape(measure + ' ' + amount(points) + ' SP · ' + share) + '"><strong>' + escape(amount(points)) + '</strong><small>' + escape(share) + '</small></div>';
      };
      const cells=totals.map(({plan,fact},index)=>{
        return '<td' + (index ? '' : ' class="ozon-report-rollup-total"') + '><div class="ozon-report-rollup-pair">' +
          value('plan',plan,base.planned) + '<span aria-hidden="true">/</span>' + value('fact',fact,base.completedPoints) + '</div></td>';
      }).join('');
      const style=highlight ? ' ozon-report-rollup-highlight' : '';
      return '<tr class="ozon-report-rollup-row' + style + '"><th scope="row" class="ozon-report-rollup-group">' + label + '</th>' + cells + '</tr>';
    };
    const rows=(tasks:Report['rows'],depth:number,path:string[],base:PercentageBase):string=>{
      const dimension=levels[depth];
      if (!dimension) return '';
      return buckets(tasks,dimension,task=>task).map(([key,children])=>{
        const rowBase=dimension==='project' ? report.byProject.get(key)?.metrics ?? base : base;
        const nextPath=[...path,dimension + ':' + key];
        const id=JSON.stringify(nextPath);
        const expanded=groupExpanded('rollup',id,depth);
        const toggle=depth+1<levels.length ? groupToggle(id,key || emptyGroups[dimension],expanded,false,'rollup') : '';
        const label='<div class="ozon-report-tree-line" style="--report-depth:' + depth + '">' + toggle + groupLabel(dimension,key,children[0],levels,true) + '</div>';
        return rollupRow(label,children,rowBase,depth===0) + (expanded ? rows(children,depth+1,nextPath,rowBase) : '');
      }).join('');
    };
    const route=levels.map(key=>groupNames[key]).join(' → ');
    const tasks=scope.rows.filter(task=>task.started || task.doneAtEnd);
    const headings=pointColumns.definitions.map(([title,hint])=>'<th scope="col" title="' + escape(hint) + '">' + escape(title) + '</th>').join('');
    return '<details class="ozon-report-streams" data-report-rollup' + (state.rollupOpen ? ' open' : '') + '><summary>План и факт по группам</summary><p><strong>План / факт.</strong> Слева SP на старте, справа завершённые SP ' + (report.closed ? 'к закрытию' : 'к текущему моменту') + '. Доли в пределах проекта считаются от его плана и факта. Баллы без категории входят в «Всего SP».' +
      (levels.includes('component') ? ' Задача с несколькими компонентами видна в каждом из них. В итоге она учитывается один раз.' : '') + '</p>' +
      (levels.length>1 ? '<div class="ozon-report-rollup-tools">' + depthControl('rollup') + '</div>' : '') +
      '<div class="ozon-report-table-wrap ozon-report-rollup-wrap"><table aria-label="План и факт по группам"><thead><tr><th scope="col" class="ozon-report-rollup-group">' + escape(route || 'Группы') + '</th><th scope="col">Всего SP</th>' + headings + '</tr></thead><tbody>' +
      rows(tasks,0,['rollup'],scope.metrics) + '</tbody><tfoot>' + rollupRow(escape(state.project ? 'Всего по ' + state.project : 'Весь спринт'),tasks,scope.metrics,true) + '</tfoot></table></div></details>';
  }

  const plot={width:960,height:180,left:58,right:40,top:27,bottom:44};
  const projectPlot={...plot,width:480,height:268,left:48,right:24};
  const preferredChartProjects=['OB','OBFRONT'];
  const showProjectChart=(key:string)=>key.toUpperCase()!=='OBSPRINTGO';
  const dayBurn = (changes:{burned:number}[]) => changes.reduce((totals,change) => {
    totals.completed += Math.max(change.burned,0);
    totals.reopened += Math.max(-change.burned,0);
    return totals;
  },{completed:0,reopened:0});

  function chartViews(report:Report) {
    const projectKeys=[...report.byProject.keys()].filter(showProjectChart);
    const canSplit=!state.project && report.byProject.size>1 && projectKeys.length>0;
    const split=canSplit && state.chartMode==='projects';
    const keys=[...preferredChartProjects.filter(key=>projectKeys.includes(key)),...projectKeys.filter(key=>!preferredChartProjects.includes(key))];
    const series=split ? keys.map(key=>({key,report:{...report,...report.byProject.get(key)!}})) : [{key:state.project,report}];
    const views=series.map(view=>{
      let cumulativeCompleted=0;
      const burnByDay=view.report.days.map(day=>{
        const burn=dayBurn(day.changes);
        cumulativeCompleted+=burn.completed;
        return {...burn,cumulativeCompleted};
      });
      return {...view,burnByDay};
    });
    let peak=1;
    for (const view of views) {
      peak=Math.max(peak,view.report.metrics.planned,view.report.metrics.initialRemaining,view.burnByDay.at(-1)?.cumulativeCompleted ?? 0);
      for (const day of view.report.days) peak=Math.max(peak,day.scope,day.remaining);
    }
    const roughStep=peak/5;
    const magnitude=10 ** Math.floor(Math.log10(roughStep));
    const step=[1,2,2.5,5,10].find(value=>value>=roughStep/magnitude)! * magnitude;
    const ticks=Math.ceil(peak/step);
    return {views,canSplit,split,plot:split ? projectPlot : plot,step,ticks,max:ticks*step};
  }
  function chartGeometry(report:Report,max:number,bounds:typeof plot) {
    const {width,height,left,right,top,bottom}=bounds;
    const daySpacing=(width-left-right)/(report.days.length+.5);
    return {
      daySpacing,
      x:(index:number) => left + daySpacing*index,
      y:(value:number) => top + (height-top-bottom)*(1-value/max)
    };
  }
  type ChartView = ReturnType<typeof chartViews>['views'][number];
  function chart({key,report,burnByDay}:ChartView,scale:ReturnType<typeof chartViews>) {
    const {width,height,left,right,top,bottom}=scale.plot;
    const {x,y,daySpacing}=chartGeometry(report,scale.max,scale.plot);
    const axisY=height-bottom;
    const points=[{scope:report.metrics.planned,remaining:report.metrics.initialRemaining},...report.days];
    const end=points.length-1;
    const path=(series:'scope'|'remaining')=>points.map((point,index)=>x(index) + ',' + y(point[series])).join(' ');
    const gridY=Array.from({length:scale.ticks+1},(_,index)=> {
      const value=scale.step*index, row=y(value);
      return '<line x1="' + left + '" y1="' + row + '" x2="' + (width-right) + '" y2="' + row + '"/><text x="' + (left-9) + '" y="' + row + '" dominant-baseline="middle" text-anchor="end">' + escape(amount(value)) + '</text>';
    }).join('');
    const axisTicks=Math.min(end,scale.split ? 4 : 6);
    const dates=new Set(Array.from({length:axisTicks+1},(_,index)=>Math.round(end*index/axisTicks)));
    const gridX=points.map((_,index)=>{
      const major=dates.has(index);
      if (!major && index%Math.ceil(end/90) !== 0) return '';
      const column=x(index);
      return '<line class="ozon-report-grid-day' + (major ? ' is-major' : '') + '" x1="' + column + '" x2="' + column + '" y1="' + top + '" y2="' + (axisY+(major ? 5 : 0)) + '"/>' +
        (major ? '<text x="' + column + '" y="' + (axisY+26) + '" text-anchor="middle">' + escape(index ? dayLabel(report.days[index-1].date) : 'Старт') + '</text>' : '');
    }).join('');
    const selected = report.days.findIndex(day=>day.date===state.day)+1;
    const barWidth=Math.min(22,daySpacing*.65);
    const bars=burnByDay.map(({cumulativeCompleted},index)=>{
      if (!cumulativeCompleted) return '';
      const day=index+1;
      const barTop=y(cumulativeCompleted);
      return '<rect class="ozon-report-burn-bar' + (day===selected ? ' is-selected' : '') + '" data-report-burn-day="' + escape(report.days[index].date) + '" x="' + (x(day)-barWidth/2) + '" y="' + barTop + '" width="' + barWidth + '" height="' + (axisY-barTop) + '" rx="1"/>';
    }).join('');
    let previousDeltaRight=-Infinity;
    const deltas=burnByDay.map(({completed,cumulativeCompleted},index)=>{
      if (!completed) return '';
      const label=positive(completed);
      const column=x(index+1);
      const halfWidth=label.length*3.5+2;
      if (column-halfWidth<previousDeltaRight) return '';
      previousDeltaRight=column+halfWidth;
      const barTop=y(cumulativeCompleted);
      const inside=axisY-barTop>=18;
      const baseline=inside ? Math.max(barTop+13,axisY-12) : barTop-4;
      return '<text class="ozon-report-burn-delta' + (inside ? ' is-inside' : '') + '" data-report-burn-delta="' + escape(report.days[index].date) + '" x="' + column + '" y="' + baseline + '" text-anchor="middle">' + escape(label) + '</text>';
    }).join('');
    const labels=new Set([0,end]);
    const addLabel=(index:number)=>{
      if ([...labels].every(existing=>Math.abs(x(index)-x(existing))>=45)) labels.add(index);
    };
    addLabel(selected);
    for (const index of dates) addLabel(index);
    const number=(series:string,value:number,index:number,offset:number)=>{
      const text=amount(value), column=x(index), baseline=y(value)+(value===0 && offset>0 ? 11 : offset);
      const completed=burnByDay[index-1]?.cumulativeCompleted || 0;
      const intersectsBar=completed>0 && baseline+2>y(completed) && baseline-11<axisY;
      const labelWidth=text.length*7+6;
      const background=intersectsBar ? '<rect class="ozon-report-plot-label-background" aria-hidden="true" x="' + (column-labelWidth/2) +
        '" y="' + (baseline-12) + '" width="' + labelWidth + '" height="16" rx="3" fill="var(--ozon-fcrm-surface,#fff)"/>' : '';
      return background + '<text class="ozon-report-plot-label ' + series + '" x="' + column + '" y="' + baseline + '" text-anchor="middle">' + escape(text) + '</text>';
    };
    const pointLabels=[...labels].map(index=>{
      const {scope,remaining}=points[index];
      if (scope===remaining) return number('shared',scope,index,-9);
      return number('scope',scope,index,-8) + number('remaining',remaining,index,14);
    }).join('');
    const dots=points.map(({scope,remaining},index)=>{
      if (end>35 && !labels.has(index)) return '';
      const radius=index===selected && selected ? 3 : 1.8;
      return '<circle class="ozon-report-scope-dot" cx="' + x(index) + '" cy="' + y(scope) + '" r="' + radius + '"/>' +
        '<circle class="ozon-report-remaining-dot" cx="' + x(index) + '" cy="' + y(remaining) + '" r="' + radius + '"/>';
    }).join('');
    return '<div class="ozon-report-graph" data-report-chart><svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escape((key ? key + '. ' : '') + 'Объём, остаток и накопительный итог переходов в «Готово». Наведите курсор для просмотра значений или выберите дату над графиком.') + '"><g class="ozon-report-grid">' + gridY + gridX + '</g>' + bars +
      '<path class="ozon-report-axis" d="M' + left + ',' + top + ' V' + axisY + ' H' + (width-right) + '"/><text class="ozon-report-axis-title" x="' + left + '" y="16">' + escape(report.pointsName) + '</text><text class="ozon-report-axis-title" x="' + ((left+width-right)/2) + '" y="' + (height-4) + '" text-anchor="middle">День спринта · МСК</text>' +
      (selected ? '<line class="ozon-report-line-selected" x1="' + x(selected) + '" x2="' + x(selected) + '" y1="' + top + '" y2="' + axisY + '"/>' : '') +
      '<polyline class="ozon-report-line-scope" points="' + path('scope') + '"/><polyline class="ozon-report-line-remaining" points="' + path('remaining') + '"/>' + dots + pointLabels + deltas +
      '<g data-report-hover visibility="hidden"><line class="ozon-report-line-selected" y1="' + top + '" y2="' + axisY + '"/><circle data-report-dot="remaining" class="ozon-report-remaining-dot" r="5"/><circle data-report-dot="scope" class="ozon-report-scope-dot" r="4"/></g>' +
      '<rect class="ozon-report-graph-hit" x="' + left + '" y="' + top + '" width="' + (width-left-right) + '" height="' + (axisY-top) + '" fill="transparent"/></svg><div class="ozon-report-tooltip" hidden><strong data-tip-date></strong><span data-tip-remaining></span><span data-tip-scope></span><span data-tip-burned></span><span data-tip-reopened></span></div></div>';
  }

  function charts(report:Report) {
    if (!report.pointsField || !report.days.length || !showProjectChart(state.project)) return '';
    const scale=chartViews(report);
    const mode=scale.canSplit ? '<div class="ozon-report-chart-modes" role="group" aria-label="Графики">' +
      [['total','Общий график'],['projects','По проектам']].map(([id,label])=>'<button type="button" class="ozon-ext-btn ' + (id===state.chartMode ? '' : 'ozon-ext-btn-surface') + '" data-report-chart-mode="' + id + '" aria-pressed="' + (id===state.chartMode) + '">' + label + '</button>').join('') + '</div>' : '';
    const plots=scale.views.map(view=>'<div class="ozon-report-chart' + (scale.split ? ' is-project' : '') + '">' + (scale.split ? '<h3>' + escape(view.key) + '</h3>' : '') + chart(view,scale) + '</div>').join('');
    return '<div class="ozon-report-chart-toolbar">' + mode + '<div class="ozon-report-legend"><span>Незавершённые задачи</span><span>Все задачи в спринте</span><span class="ozon-report-burn-legend">В «Готово» с начала спринта</span>' +
      (scale.split && scale.views.length>1 ? '<small>Общая шкала SP</small>' : '') + '</div></div>' +
      (scale.split && scale.views.length>1 ? '<div class="ozon-report-project-charts">' + plots + '</div>' : plots);
  }

  const dayCutoff = (report:Report,day:string) => day === report.days.at(-1)?.date
    ? report.closed ? 'на момент закрытия' : 'на момент обновления'
    : 'на конец дня';

  function bindChart(graph:HTMLElement, {key,report,burnByDay}:ChartView, scale:ReturnType<typeof chartViews>, changeDay:(day:string)=>void) {
    const svg=graph.querySelector('svg');
    const hit=svg?.querySelector('.ozon-report-graph-hit');
    const hover=svg?.querySelector('[data-report-hover]');
    const tip=graph.querySelector<HTMLElement>('.ozon-report-tooltip');
    if (!svg || !hit || !hover || !tip) return;
    const line=hover.querySelector('line')!, remaining=hover.querySelector('[data-report-dot="remaining"]')!, scope=hover.querySelector('[data-report-dot="scope"]')!;
    const values=['date','remaining','scope','burned','reopened'].map(key=>tip.querySelector('[data-tip-' + key + ']')!);
    const {width,height,left,right,top,bottom}=scale.plot;
    const {x,y,daySpacing}=chartGeometry(report,scale.max,scale.plot);
    const nearest = (event:MouseEvent) => {
      const matrix=svg.getScreenCTM();
      if (!matrix) return -1;
      const point = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      if (point.x < left || point.x > width-right || point.y < top || point.y > height-bottom) return -1;
      return Math.min(report.days.length,Math.max(0,Math.round((point.x-left)/daySpacing)));
    };
    const hide = () => { tip.hidden=true; hover.setAttribute('visibility','hidden'); };
    let lastIndex = -1;
    const show = (index:number, clientX:number) => {
      if (index < 0) { hide(); return; }
      if (index !== lastIndex) {
        lastIndex=index;
        const day=report.days[index-1], m=report.metrics;
        const burn=burnByDay[index-1];
        const left=x(index), leftText=String(left);
        const rest=day?.remaining ?? m.initialRemaining, volume=day?.scope ?? m.planned;
        line.setAttribute('x1',leftText); line.setAttribute('x2',leftText);
        [remaining,scope].forEach((dot,at)=>{dot.setAttribute('cx',leftText); dot.setAttribute('cy',String(y(at ? volume : rest)));});
        values[0].textContent=day ? dayLabel(day.date) + ' · ' + dayCutoff(report,day.date) : 'Старт · ' + shortDate(report.start) + ' ' + timeFormat.format(report.start) + ' МСК';
        values[1].textContent='Незавершённые задачи: ' + metric(report,rest);
        values[2].textContent='Все задачи в спринте: ' + metric(report,volume);
        values[3].textContent=burn ? 'В «Готово» с начала: ' + metric(report,burn.cumulativeCompleted) + ' (за день: ' + metric(report,burn.completed,true) + ')' : '';
        values[4].textContent=burn?.reopened ? 'Вернули при переоткрытии: ' + metric(report,burn.reopened) : '';
      }
      tip.hidden=false; hover.setAttribute('visibility','visible');
      const bounds=graph.getBoundingClientRect(), localX=clientX-bounds.left;
      const offset=localX+tip.offsetWidth+24 > bounds.width ? localX-tip.offsetWidth-12 : localX+12;
      tip.style.left=(graph.scrollLeft+Math.max(4,offset))+'px';
    };
    const showSelected = () => {
      const index=key===state.chartProject ? report.days.findIndex(day=>day.date===state.chartDay) : -1;
      const matrix=svg.getScreenCTM();
      if (index<0 || !matrix) { hide(); return; }
      show(index+1,new DOMPoint(x(index+1),top).matrixTransform(matrix).x);
    };
    if (state.chartDay) showSelected();
    hit.addEventListener('pointermove', event => {
      const pointer = event as PointerEvent;
      show(nearest(pointer),pointer.clientX);
    });
    hit.addEventListener('pointerleave',showSelected);
    hit.addEventListener('click',event=>{
      const index=nearest(event as MouseEvent);
      const day=report.days[Math.max(0,index-1)];
      if (index>=0 && day) { state.chartDay=day.date; state.chartProject=key; changeDay(day.date); }
    });
  }

  type TaskGroup = {key:string;project:string;stream:string;epicKey:string;epicTitle:string;components?:string[]};
  function buckets<T>(items:T[],dimension:string,taskFor:(item:T)=>TaskGroup) {
    const groups=new Map<string,T[]>();
    for (const item of items) {
      const task=taskFor(item);
      const keys=dimension==='component' ? (task.components?.length ? new Set(task.components) : ['']) :
        [dimension==='epic' ? task.epicKey : dimension==='stream' ? task.stream : task.project];
      for (const key of keys) {
        if (!groups.has(key)) groups.set(key,[]);
        groups.get(key)!.push(item);
      }
    }
    return [...groups].sort(([a],[b])=>groupOrder(a,b));
  }

  function groupLabel(dimension:string,key:string,task:TaskGroup,levels:string[],stacked=false) {
    if (dimension!=='epic' || !key) return '<strong>' + escape(key || emptyGroups[dimension]) + '</strong>';
    const title=task.epicTitle ? '<span class="ozon-report-epic-title" title="' + escape(task.epicTitle) + '">' + escape(task.epicTitle) + '</span>' : '';
    const stream=levels.includes('stream') ? '' : '<span class="ozon-report-stream-chip">' + escape(task.stream || 'Без стрима') + '</span>';
    if (stacked) return '<div class="ozon-report-rollup-epic"><div class="ozon-report-rollup-epic-meta">' + issueLink(key,task.epicTitle) + stream + '</div>' + title + '</div>';
    return issueLink(key,task.epicTitle) + title + stream;
  }

  function groupToggle(id:string,label:string,expanded:boolean,disabled=false,tree:Tree='details') {
    const shared=groupingUi?.treeToggle(expanded,label,{'data-report-group':id,'data-report-tree':tree,...(disabled ? {disabled:''} : {})});
    if (shared) return shared;
    return '<button type="button" data-report-group="' + escape(id) + '" aria-expanded="' + expanded + '" data-report-tree="' + tree + '" aria-label="' + (expanded ? 'Свернуть ' : 'Развернуть ') + escape(label) + '"' + (disabled ? ' disabled' : '') + '>' + (expanded ? '▾' : '▸') + '</button>';
  }
  function applyTaskUpdate(report:Report,key:string,update:TaskUpdate) {
    const task=report.rows.find(row=>row.key===key);
    if (!task) return;
    // Project rows share the same task objects, so both scopes show the verified Jira update.
    if (update.assigneeName!==undefined) task.assigneeName=update.assigneeName;
    if (update.assignee!==undefined) task.assignee=update.assignee;
    const option=update.epic;
    if (!option) return;
    task.epicKey=option.id;
    task.epicTitle=option.id ? option.fields?.summary || option.name : '';
    const value=option.id ? option.fields?.customfield_24000 : null;
    task.stream=model.streamName(value);
  }

  function updateTask(key:string,update:TaskUpdate) {
    if (state.loading) pendingTaskUpdates.set(key,{...pendingTaskUpdates.get(key),...update});
    const reports=new Set([...state.sprintResults.values()].map(entry=>entry.report));
    if (state.report) reports.add(state.report);
    reports.forEach(report=>applyTaskUpdate(report,key,update));
  }

  function taskKeyCell(key:string,issueType?:string,summary?:string) {
    const editor=issueType && !isEpicIssueType(issueType) ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-report-epic-edit" data-report-action="edit-epic" data-key="' + escape(key) + '" aria-label="Изменить эпик ' + escape(key) + '" title="Изменить Epic Link">Эпик <span aria-hidden="true">▾</span></button>' : '';
    return '<td><div class="ozon-report-task-key ozon-report-tree-line">' + issueLink(key,summary) + (groupingUi?.themeButton(key) || '') + editor + '</div></td>';
  }

  function assigneeCell(key:string,assigneeName?:string,person?:JiraPerson | null) {
    const name=assigneeName===undefined ? '—' : assigneeName || 'Не назначен';
    const display=person ? people.badge(person) : '<span>' + escape(name) + '</span>';
    return '<td><div class="ozon-person-line ozon-report-assignee-line"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-report-assignee' + (assigneeName ? '' : ' is-empty') + '" data-report-action="edit-assignee" data-key="' + escape(key) + '" aria-label="Изменить исполнителя ' + escape(key) + '" title="' + escape(name) + '">' + display + '<span aria-hidden="true">▾</span></button>' + people.copyButton(person) + '</div></td>';
  }

  function groupedRows<T>(items:T[], taskFor:(item:T)=>TaskGroup, renderRow:(item:T)=>string, columns:number) {
    let visibleCount=0, renderedCount=0;
    const levels=dimensions();
    const renderLevel = (entries:T[],depth:number,path:string[]):string => {
      const dimension=levels[depth];
      if (!dimension) {
        visibleCount+=entries.length;
        const count=Math.min(entries.length,Math.max(0,state.limit-renderedCount));
        renderedCount+=count;
        const ordered=[...entries].sort((a,b)=>compareGroup(taskFor(a).key,taskFor(b).key));
        return ordered.slice(0,count).map(renderRow).join('');
      }
      let html='';
      buckets(entries,dimension,taskFor).forEach(([key,entries])=>{
        const nextPath=[...path,dimension + ':' + key], id=JSON.stringify(nextPath);
        const expanded=searchingTasks() || groupExpanded('details',id,depth);
        const label=key || emptyGroups[dimension];
        const count=taskCount(new Set(entries.map(entry=>taskFor(entry).key)).size);
        if (renderedCount < state.limit) {
          html+='<tr class="ozon-report-group ozon-report-group-' + depth + '"><th colspan="' + columns + '"><div class="ozon-report-tree-line" style="--report-depth:' + depth + '">' + groupToggle(id,label,expanded,searchingTasks()) +
            groupLabel(dimension,key,taskFor(entries[0]),levels) + '<small>' + escape(count) + '</small></div></th></tr>';
        }
        if (expanded) html+=renderLevel(entries,depth+1,nextPath);
      });
      return html;
    };
    const html=renderLevel(items,0,[]);
    return {html,visibleCount};
  }

  function treeTable(rows:string,changeTitle:string,pointsTitle:string,byDay=false) {
    return '<div class="ozon-report-table-wrap ozon-report-tree-wrap" style="--report-depth:' + dimensions().length + '"><table class="ozon-report-tree"><colgroup><col class="ozon-report-tree-key"><col><col class="ozon-report-tree-assignee">' +
      (byDay ? '<col class="ozon-report-tree-time">' : '') + '<col class="ozon-report-tree-status">' + (pointsTitle ? '<col class="ozon-report-tree-points">' : '') + '</colgroup><thead><tr><th>Ключ</th><th>Задача</th><th>Исполнитель</th>' +
      (byDay ? '<th>МСК</th>' : '') + '<th>' + escape(changeTitle) + '</th>' + (pointsTitle ? '<th>' + escape(pointsTitle) + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  const choices = [{id:'days',title:'По дням'},{id:'start',title:'На старте'},{id:'scope',title:'Состав и оценки'},{id:'finish',title:'Итоги'}];
  const pointsCell = (value:number | null) => value == null ? '—' : escape(amount(value));
  function dayBreakdown(report:Report, index:number) {
    if (state.project || report.byProject.size < 2 || index < 0) return '';
    return '<details class="ozon-report-method ozon-report-day-breakdown"><summary>Показатели дня по проектам</summary><div class="ozon-report-table-wrap"><table><thead><tr><th>Проект</th><th>События</th><th>Добавили</th><th>Исключили</th>' + (report.pointsField ? '<th>Переоценка</th><th>В «Готово»</th><th>Вернули при переоткрытии</th><th>Не завершено ' + dayCutoff(report,report.days[index].date) + '</th>' : '') + '</tr></thead><tbody>' +
      [...report.byProject].map(([key,project])=>{
        const day=project.days[index];
        const moving=(kind:'added'|'removed')=>{
          const movements=day.changes.filter(change=>change[kind]);
          const points=movements.reduce((sum,change)=>sum + ((kind==='added' ? change.after.points : change.before.points) ?? 0),0);
          return (report.pointsField ? metric(report,points) + ' · ' : '') + taskCount(new Set(movements.map(change=>change.key)).size);
        };
        const estimate=day.changes.reduce((sum,change)=>sum + (change.before.member && change.after.member ? (change.after.points ?? 0)-(change.before.points ?? 0) : 0),0);
        const {completed,reopened}=dayBurn(day.changes);
        const points=report.pointsField ? [metric(report,estimate,true),...[completed,reopened,day.remaining].map(value=>metric(report,value))].map(value=>'<td>' + escape(value) + '</td>').join('') : '';
        return '<tr><th scope="row">' + escape(key) + '</th><td>' + escape(eventCount(day.changes.length)) + '</td><td>' + escape(moving('added')) + '</td><td>' + escape(moving('removed')) + '</td>' + points + '</tr>';
      }).join('') + '</tbody></table></div></details>';
  }
  type DayEvent = Report['events'][number];
  const journalEvents = [
    {id:'all',name:'Все события',matches:() => true},
    {id:'added',name:'Добавлен в спринт',matches:(event:DayEvent) => event.added},
    {id:'removed',name:'Исключён из спринта',matches:(event:DayEvent) => event.removed},
    {id:'estimate-up',name:'Переоценён вверх',requiresPoints:true,matches:(event:DayEvent) =>
      event.estimateChanged && event.before.member && event.after.member && (event.after.points ?? 0) > (event.before.points ?? 0)},
    {id:'estimate-down',name:'Переоценён вниз',requiresPoints:true,matches:(event:DayEvent) =>
      event.estimateChanged && event.before.member && event.after.member && (event.after.points ?? 0) < (event.before.points ?? 0)},
    {id:'status',name:'Изменён статус',matches:(event:DayEvent) => event.statusChanged},
  ];

  function daily(report:Report) {
    const selected = report.days.find(day => day.date === state.day) || report.days[0];
    const dayIndex = report.days.indexOf(selected);
    const tasks = new Map(report.rows.map(row => [row.key,row]));
    const eventOptions = journalEvents.filter(option => !option.requiresPoints || report.pointsField);
    const filter = eventOptions.find(option => option.id === state.eventFilter) || journalEvents[0];
    const allChanges = selected?.changes || [];
    const changes = allChanges.filter(filter.matches);
    const row = (change:DayEvent) => {
      const facts = [
        change.added ? 'Добавили в спринт' : change.removed ? 'Исключили из спринта' : '',
        change.statusChanged ? (change.before.status.name || '—') + ' → ' + (change.after.status.name || '—') : '',
        change.estimateChanged ? 'Оценка: ' + pointsCell(change.before.points) + ' → ' + pointsCell(change.after.points) : ''
      ].filter(Boolean);
      const result=change.burned > 0 ? 'В «Готово» ' + metric(report,change.burned) : change.burned < 0 ? 'Вернули ' + metric(report,-change.burned) : '—';
      const task=tasks.get(change.key);
      return '<tr class="' + reviewRowClass(change.key,change.after.status.name) + '">' + taskKeyCell(change.key,task?.issueType,task?.summary) + '<td>' + escape(task?.summary || '') + '</td>' + assigneeCell(change.key,task?.assigneeName,task?.assignee) + '<td>' + timeFormat.format(change.at) + '</td><td>' + facts.map(escape).join('<br>') + '</td>' +
        (report.pointsField ? '<td>' + escape(result) + '</td>' : '') + '</tr>';
    };
    const {completed,reopened} = dayBurn(allChanges);
    const grouped = groupedRows(changes,change=>tasks.get(change.key),row,report.pointsField ? 6 : 5);
    const step = (delta:number,label:string,icon:string) => '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-day-step="' + delta + '" aria-label="' + label + '"' + (!report.days[dayIndex+delta] ? ' disabled' : '') + '>' + icon + '</button>';
    const dayOptions=report.days.map(day=>({id:day.date,name:dayLabel(day.date) + ' · ' + eventCount(day.changes.filter(filter.matches).length)}));
    const plots=charts(report);
    const summary = selected && report.pointsField ? '<p class="ozon-report-hint">За день · Перешло в «Готово» <strong>' + escape(metric(report,completed)) + '</strong>' + (reopened ? ' · Вернули при переоткрытии <strong>' + escape(metric(report,reopened)) + '</strong>' : '') + ' · Не завершено ' + dayCutoff(report,selected.date) + ' <strong>' + escape(metric(report,selected.remaining)) + '</strong></p>' : '';
    const journal = '<section class="ozon-report-journal" aria-labelledby="ozon-report-journal-title"><h3 id="ozon-report-journal-title">Журнал событий</h3>' +
      '<div class="ozon-report-daybar" role="group" aria-label="Фильтры журнала событий"><div class="ozon-report-field"><span>Дата</span><div class="ozon-report-date-controls">' + step(-1,'Предыдущий день','‹') + picker('day','Дата',selected?.date || '',dayOptions) + step(1,'Следующий день','›') +
      '</div></div><div class="ozon-report-field"><span>Событие</span>' + picker('event','Событие',filter.id,eventOptions) + '</div>' +
      (changes.length ? depthControl('details') : '') + '</div>' + summary + dayBreakdown(report,dayIndex) +
      (changes.length ? treeTable(grouped.html,'Что изменилось',report.pointsField ? 'Работа по статусам' : '',true) + more(grouped.visibleCount) :
        '<p class="ozon-report-empty">' + (filter.id === 'all' ? 'В этот день изменений не было.' : 'В этот день нет событий выбранного типа.') + '</p>') + '</section>';
    return '<section class="ozon-report-panel"><h2>Ход спринта</h2>' + plots + journal +
      (plots ? '<details class="ozon-report-method"><summary>Как читать график</summary><p>Точки показывают состояние на конец дня по МСК. Последняя точка показывает состояние ' + (report.closed ? 'на момент закрытия' : 'на момент обновления') + '. Столбцы показывают накопительную сумму баллов, перешедших в «Готово» с начала спринта. Подпись на столбце показывает прирост к предыдущему столбцу. «Готово» означает последнюю колонку доски. Возвраты при переоткрытии показаны отдельно в подсказке.</p></details>' : '') + '</section>';
  }

  const more = (total:number) => total > state.limit ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-more>Показать ещё ' + Math.min(60,total-state.limit) + '</button>' : '';
  function taskList(report:Report) {
    const isStart=state.section === 'start', isScope=state.section === 'scope', isFinish=state.section === 'finish';
    const filters = isScope ? [{id:'all',name:'Все изменения'},{id:'added',name:'Добавили'},{id:'removed',name:'Исключили'},...(report.pointsField ? [{id:'estimate',name:'Переоценили'}] : [])]
      : isFinish ? [{id:'all',name:'Все задачи'},{id:'remaining',name:'Не завершены'},{id:'done',name:'Завершены'}] : [];
    const matches = report.rows.filter(row => {
      if (isStart) return row.started;
      if (isFinish) return row.memberAtEnd && (state.scopeFilter==='all' || row.doneAtEnd === (state.scopeFilter==='done'));
      const scopeChanges={added:row.added,removed:row.removed,estimate:row.estimateDates.length>0};
      return state.scopeFilter==='all' ? Object.values(scopeChanges).some(Boolean) : scopeChanges[state.scopeFilter];
    });
    const query = state.query.trim().toLowerCase();
    const filtered = matches.filter(row => !query || (row.key + ' ' + row.summary).toLowerCase().includes(query));
    const title = isStart ? 'Задачи на старте' : isScope ? 'Изменения состава и оценок' : report.closed ? 'Задачи к закрытию спринта' : 'Задачи в спринте сейчас';
    const note = isFinish && report.closed ? '<p class="ozon-report-hint">Статусы и оценки на момент закрытия. Исключённые раньше задачи видны в разделе «Состав и оценки».</p>' : '';
    const row = (task:any) => {
      const scopeLabel = (title:string, days:string[]) => title + (days.length ? ' ' + [...new Set(days)].map(dayLabel).join(', ') : ' · дата неизвестна');
      const movements=[
        {id:'added',visible:task.added,label:'Добавили',dates:task.addedDates,points:task.addedPoints},
        {id:'removed',visible:task.removed,label:'Исключили',dates:task.removedDates,points:-task.removedPoints},
        {id:'estimate',visible:task.estimateDates.length,label:'Переоценили',dates:task.estimateDates,points:task.estimateDelta}
      ].filter(change=>change.visible && (state.scopeFilter==='all' || state.scopeFilter===change.id));
      const status = isScope ? movements.map(change=>scopeLabel(change.label,change.dates)).join(' · ') : isStart ? task.startStatus : task.endStatus;
      const points = isScope ? escape(movements.map(change=>positive(change.points)).join(' / ')) : pointsCell(isStart ? task.startPoints : task.endPoints);
      return '<tr class="' + reviewRowClass(task.key,isStart ? task.startStatus : task.endStatus) + '">' + taskKeyCell(task.key,task.issueType,task.summary) + '<td>' + escape(task.summary) + (!task.completeHistory ? ' <small class="ozon-report-history-warning">История неполная</small>' : '') + '</td>' + assigneeCell(task.key,task.assigneeName,task.assignee) + '<td>' + escape(status || '—') + '</td>' +
        (report.pointsField ? '<td>' + points + '</td>' : '') + '</tr>';
    };
    const grouped=groupedRows(filtered,task=>task,row,report.pointsField ? 5 : 4);
    return '<section class="ozon-report-panel"><h2>' + title + '</h2>' + note + '<div class="ozon-report-tools"><input id="ozon-report-search" type="search" placeholder="Ключ или название задачи" aria-label="Поиск задачи в списке" value="' + escape(state.query) + '">' +
      (filters.length ? picker('scope','Какие задачи показать',state.scopeFilter,filters) : '') + depthControl('details') + '<span>' + taskCount(filtered.length) + '</span></div>' +
      (filtered.length ? treeTable(grouped.html,isScope ? 'Изменение' : 'Статус',report.pointsField ? (isScope ? 'Изменение · ' : '') + (report.pointsName || 'Оценка') : '') + more(grouped.visibleCount) : '<p class="ozon-report-empty">Задач нет.</p>') + '</section>';
  }

  const comparing = () => !state.sprint && state.selectedSprints.length>1;

  function sprintComparison() {
    const entries=selectedSprints().map(sprint=>({sprint,id:sprintId(sprint),report:state.sprintResults.get(sprintId(sprint))?.report}));
    const projects=[...new Set(entries.flatMap(({report})=>report ? [...report.byProject.keys()] : []))].sort(compareGroup);
    const projectOptions=[{id:'',name:'Все проекты'},...projects.map(key=>({id:key,name:key}))];
    const loaded=entries.flatMap(entry=>entry.report ? [entry.report] : []);
    const first=loaded[0];
    const pointsReport=first?.pointsField && loaded.every(report=>report.pointsField===first.pointsField && report.pointsName===first.pointsName) ? first : undefined;
    const inPoints=Boolean(pointsReport && state.comparisonUnit==='points');
    const unit=inPoints ? pointsReport!.pointsName : 'Задачи';
    const data=entries.map(entry=>{
      const m=entry.report ? (state.comparisonProject ? entry.report.byProject.get(state.comparisonProject)?.metrics || model.emptyMetrics() : entry.report.metrics) : null;
      const values=m ? {
        planned:inPoints ? m.planned : m.plannedTasks, added:inPoints ? m.added : m.addedTasks, removed:inPoints ? m.removed : m.removedTasks,
        completed:inPoints ? m.completedPoints : m.completed, remaining:inPoints ? m.remaining : m.remainingTasks,
        fromPlan:inPoints ? m.plannedCompletedPoints : m.plannedCompleted, estimate:m.estimateDelta
      } : null;
      const start=entry.report?.start ?? Date.parse(entry.sprint.startDate || '');
      const end=entry.report?.end ?? Date.parse((entry.sprint.completeDate || entry.sprint.endDate) || '');
      const dates=Number.isFinite(start) ? shortDate(start) + (Number.isFinite(end) ? ' — ' + shortDate(end) : '') : '';
      return {...entry,values,dates,error:state.sprintErrors.get(entry.id)};
    });
    const series=[['planned','План на старте'],['completed','Завершили'],['remaining','Не завершили']] as const;
    const peak=Math.max(1,...data.flatMap(entry=>entry.values ? series.map(([key])=>entry.values![key]) : []));
    const gridMax=Math.ceil(peak / 4) * 4;
    const format=(value:number,signed=false)=>inPoints ? metric(pointsReport!,value,signed) : amount(value);
    const sprintLabel=(entry:typeof data[number])=>'<strong>' + escape(entry.sprint.name) + '</strong>' + (entry.dates ? '<small>' + escape(entry.dates) + '</small>' : '');
    const openButton=(entry:typeof data[number])=>' data-report-open-sprint="' + escape(entry.id) + '" aria-label="Открыть отчёт: ' + escape(entry.sprint.name) + '"';
    const chart=data.some(entry=>entry.values) ? '<div class="ozon-report-trend-chart" role="group" aria-label="План, завершённые и незавершённые задачи по спринтам"><div class="ozon-report-trend-axis" aria-hidden="true">' +
      [1,.75,.5,.25,0].map(ratio=>'<span>' + escape(amount(gridMax*ratio)) + '</span>').join('') + '</div><div class="ozon-report-trend-scroll"><div class="ozon-report-trend-plot" style="--trend-sprints:' + data.length + '">' +
      data.map(entry=>{
        const bars=entry.values ? series.map(([key,label])=>{
          const value=entry.values![key];
          return '<span class="ozon-report-trend-bar ' + key + '" style="--bar-height:' + (100*value/gridMax) + '%" title="' + escape(label + ': ' + format(value)) + '"><span>' + escape(amount(value)) + '</span></span>';
        }).join('') : '<span class="ozon-report-trend-pending">' + (entry.error ? 'Нет данных' : entry.id===activeSprint ? 'Загрузка…' : 'В очереди') + '</span>';
        return '<div class="ozon-report-trend-sprint">' +
          (entry.values ? '<button type="button" class="ozon-report-trend-bars"' + openButton(entry) + '>' : '<div class="ozon-report-trend-bars">') +
          bars + (entry.values ? '</button>' : '</div>') + '<span class="ozon-report-trend-name">' + sprintLabel(entry) + '</span></div>';
      }).join('') + '</div></div></div>' : '';
    const headings=['План на старте','Добавили','Исключили',...(inPoints ? ['Переоценка'] : []),'Завершили','Не завершили','Из плана завершили'];
    const rows=data.map(entry=>{
      const v=entry.values;
      const details=entry.report?.warnings.length ? '<details class="ozon-report-trend-warning"><summary>Есть замечания к данным</summary><ul>' + entry.report.warnings.map(message=>'<li>' + escape(message) + '</li>').join('') + '</ul></details>' : '';
      const note=entry.error && v ? '<small class="ozon-report-history-warning">Обновить не удалось. Показаны предыдущие данные.</small>' : '';
      const name=(v ? '<button type="button" class="ozon-report-trend-link"' + openButton(entry) + '>' + sprintLabel(entry) + '</button>' : sprintLabel(entry)) + sprintBadge(entry.sprint.state) + note + details;
      if (!v) return '<tr><th scope="row">' + name + '</th><td colspan="' + headings.length + '">' + (entry.error ? escape(entry.error) : entry.id===activeSprint ? (groupingUi?.progressHtml('Загружаем отчёт…') || 'Загружаем отчёт…') : 'Ожидает загрузки') + '</td></tr>';
      const cells=[format(v.planned),format(v.added),format(v.removed),...(inPoints ? [format(v.estimate,true)] : []),format(v.completed),format(v.remaining),v.planned ? amount(v.fromPlan) + ' из ' + format(v.planned) + ' · ' + percent(v.fromPlan/v.planned) : '—'];
      return '<tr><th scope="row">' + name + '</th>' + cells.map(value=>'<td>' + escape(value) + '</td>').join('') + '</tr>';
    }).join('');
    return '<section class="ozon-report-panel ozon-report-comparison" aria-label="Динамика по спринтам"><div class="ozon-report-trend-top"><h2>Динамика по спринтам</h2><div class="ozon-report-trend-controls">' +
      (projects.length>1 ? picker('comparison-project','Проект',state.comparisonProject,projectOptions) : '') +
      (pointsReport ? '<div class="ozon-report-trend-unit" role="group" aria-label="Единица измерения">' +
        ['points','tasks'].map(value=>'<button type="button" class="ozon-ext-btn ' + (state.comparisonUnit===value ? '' : 'ozon-ext-btn-surface') + '" data-report-comparison-unit="' + value + '" aria-pressed="' + (state.comparisonUnit===value) + '">' + escape(value==='points' ? pointsReport.pointsName : 'Задачи') + '</button>').join('') + '</div>' : '') + '</div></div>' +
      '<p class="ozon-report-hint">Закрытые спринты показаны на момент закрытия, активные — на момент обновления.</p>' +
      (chart ? '<div class="ozon-report-trend-legend"><strong>' + escape(unit) + '</strong>' + series.map(([key,name])=>'<span class="' + key + '">' + name + '</span>').join('') + '</div>' + chart : '') +
      '<div class="ozon-report-table-wrap ozon-report-trend-table"><table aria-label="Показатели по спринтам"><thead><tr><th scope="col">Спринт</th>' + headings.map(name=>'<th scope="col">' + name + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<details class="ozon-report-method"><summary>Как считаются показатели</summary><p>«Из плана завершили» показывает, какая часть первоначального плана завершена. В баллах для этой доли используются оценки на старте. «Завершили» также включает задачи, добавленные в ходе спринта.</p><p>Незавершённая задача может присутствовать в нескольких спринтах. В каждой строке таблицы показатели рассчитаны для одного спринта.</p></details></section>';
  }

  function html() {
    const report = state.report;
    const visible = report && visibleReport(report);
    const selected = state.sprints.find(sprint=>String(sprint.id)===state.sprint);
    const comparison = comparing();
    const error=state.error || state.sprintErrors.get(state.sprint);
    const heading=report && visible ? '<div class="ozon-report-period"><strong>' + escape(selected?.name || '') + '</strong>' + sprintBadge(report.closed ? 'closed' : 'active') + '<span>Отчёт за ' + shortDate(report.start) + ' — ' + shortDate(report.end) + ' · МСК</span></div>' : '<strong>' + (comparison ? 'Сравнение спринтов' : 'Отчёт по спринту') + '</strong>';
    return '<section class="ozon-report" aria-label="Отчёт по спринту"><header class="ozon-ext-header-bar">' + heading + '</header><div class="ozon-report-scroll"><div class="ozon-report-inner">' +
      '<div class="ozon-report-toolbar"><div class="ozon-report-field"><span>Доска</span>' + picker('board','Доска',state.board,boards) + '</div>' +
      '<div class="ozon-report-field ozon-report-sprint-field"><span>Спринты</span>' + sprintPicker() + '</div>' +
      '<button type="button" class="ozon-ext-btn" data-report-refresh' + (state.loading ? ' disabled' : '') + '>' + (error ? 'Повторить' : comparison ? 'Обновить сравнение' : 'Обновить отчёт') + '</button>' +
      (selected && state.selectedSprints.length>1 ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-back-comparison>← К сравнению</button>' : '') +
      (selected ? '<a class="ozon-ext-btn ozon-ext-btn-surface" href="' + escape(linkToJira()) + '" target="_blank" rel="noopener noreferrer">Отчёт в Jira ↗</a>' : '') + '</div>' +
      (state.loading ? loadingBanner() : '') +
      (error ? '<div class="ozon-report-banner ozon-report-warning" role="alert">' + escape(error) + '</div>' : '') +
      (comparison ? sprintComparison() : report && visible ?
        (report.warnings.length ? '<ul class="ozon-report-warning">' + report.warnings.map(warning=>'<li>' + escape(warning) + '</li>').join('') + '</ul>' : '') +
        '<div class="ozon-report-view-options">' + projectFilter(report) + '</div>' + overview(visible) + '<div class="ozon-report-sections" role="group" aria-label="Разделы отчёта">' + choices.map(choice=>'<button type="button" class="ozon-ext-btn ' + (state.section === choice.id ? '' : 'ozon-ext-btn-surface') + '" data-report-section="' + choice.id + '" aria-pressed="' + (state.section === choice.id) + '">' + choice.title + '</button>').join('') +
        (groupingUi ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface ozon-report-settings-button" data-report-settings="open" aria-haspopup="dialog" aria-expanded="' + Boolean(groupingDraft) + '">Группировка</button>' : '') + '</div>' + projectBreakdown(report) + groupBreakdown(report) + definitions(visible) +
        (state.section==='days' ? daily(visible) : taskList(visible)) : state.loading || error ? '' : '<p class="ozon-report-empty">На доске нет активных или закрытых спринтов.</p>') + '</div></div>' + groupingSettings() + '</section>';
  }

  function bind(root:HTMLElement) {
    const section = root.querySelector('.ozon-report');
    if (!section) return;
    const rollup=section.querySelector<HTMLDetailsElement>('[data-report-rollup]');
    rollup?.addEventListener('toggle',()=>{if (rollup.isConnected) state.rollupOpen=rollup.open;});
    groupingUi?.bindDepth(root,(value,id)=>{
      const tree:Tree=id==='report-rollup' ? 'rollup' : 'details';
      groupDepth[tree]=value==='all' ? Infinity : Number(value);
      groupOverrides[tree].clear();
      if (tree==='details') state.limit=60;
      onRender();
    });
    const focusSettings = (action:string) => root.querySelector<HTMLElement>('[data-report-settings="' + action + '"]')?.focus({preventScroll:true});
    const closeSettings = () => { groupingDraft=null; onRender(); focusSettings('open'); };
    const changeGrouping = (order:string[]) => { groupingDraft={order,inherit:false}; onRender(); };
    section.querySelectorAll<HTMLButtonElement>('[data-report-settings]').forEach(button=>button.addEventListener('click',()=>{
      switch (button.dataset.reportSettings) {
        case 'open':
          groupingDraft={order:[...dimensions()],inherit:customGrouping===null}; onRender(); focusSettings('cancel'); break;
        case 'cancel': closeSettings(); break;
        case 'inherit':
          groupingDraft={order:validGroups(developmentGrouping()),inherit:true}; onRender(); focusSettings('inherit'); break;
        case 'apply':
          if (!groupingDraft) return;
          customGrouping=groupingDraft.inherit ? null : groupingDraft.order;
          resetGroupOverrides(); groupDepth.details=groupDepth.rollup=0; state.limit=60;
          remember(); closeSettings(); break;
      }
    }));
    section.querySelector('.ozon-report-settings')?.addEventListener('keydown',event=>{
      if ((event as KeyboardEvent).key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSettings(); }
    });
    if (groupingDraft) {
      groupingUi?.bind(root,changeGrouping);
      section.querySelectorAll<HTMLInputElement>('[data-report-group-field]').forEach(input=>input.addEventListener('change',()=>{
        const field=input.dataset.reportGroupField!;
        const order=groupingDraft!.order;
        changeGrouping(input.checked ? [...order,field] : order.filter(key=>key!==field));
        root.querySelector<HTMLElement>('[data-report-group-field="' + field + '"]')?.focus({preventScroll:true});
      }));
    }
    section.querySelectorAll<HTMLImageElement>('[data-report-avatar]').forEach(image=>{
      if (image.complete && !image.naturalWidth) image.hidden=true;
      image.addEventListener('error',()=>{image.hidden=true;},{once:true});
    });
    const focusPicker = (name:string) => root.querySelector<HTMLButtonElement>('[data-report-picker="' + name + '"]')?.focus({preventScroll:true});
    const changeDay = (day:string) => { state.day=day; state.limit=60; onRender(); };
    const selectProject = (project:string) => {
      if (project && !state.report?.byProject.has(project)) return;
      state.project=project; state.limit=60; state.chartDay=''; onRender(); focusPicker('project');
    };
    const togglePicker = (name:string) => {
      state.picker=state.picker===name ? '' : name;
      sprintDraft=state.picker==='sprint' ? new Set(sprintSelection()) : null;
      state.sprintQuery='';
      onRender();
      if (state.picker) {
        const widget=root.querySelector('[data-report-picker-widget="' + name + '"]');
        (widget?.querySelector<HTMLElement>('[data-report-sprint-search]') ||
          widget?.querySelector<HTMLElement>('[aria-selected="true"]') || widget?.querySelector<HTMLElement>('[data-report-choice]'))?.focus();
      } else focusPicker(name);
    };
    section.querySelectorAll<HTMLButtonElement>('[data-report-picker]').forEach(button => {
      const name=button.dataset.reportPicker!;
      button.addEventListener('click',()=>togglePicker(name));
      button.addEventListener('keydown',event=>{if (event.key==='ArrowDown') { event.preventDefault(); if (state.picker!==name) togglePicker(name); }});
    });
    const sprintSearch=section.querySelector<HTMLInputElement>('[data-report-sprint-search]');
    const sprintList=section.querySelector<HTMLElement>('[data-report-sprint-list]');
    function bindPickerChoices(container:ParentNode) {
      container.querySelectorAll<HTMLButtonElement>('[data-report-choice]').forEach(button => {
        const name=button.closest<HTMLElement>('[data-report-picker-widget]')?.dataset.reportPickerWidget || '';
        button.addEventListener('click',()=>{
          const value=button.dataset.reportChoice || '';
          state.picker=''; state.sprintQuery='';
          if (name==='board') {
            if (value === state.board) { onRender(); focusPicker(name); return; }
            void chooseBoard(value);
            focusPicker(name);
            return;
          }
          if (name==='project') { selectProject(value); return; }
          if (name==='comparison-project') { state.comparisonProject=value; onRender(); focusPicker(name); return; }
          if (name==='day') { state.chartDay=''; changeDay(value); }
          if (name==='event') { state.eventFilter=value; state.limit=60; onRender(); }
          if (name==='scope') { state.scopeFilter=value; state.limit=60; onRender(); }
          focusPicker(name);
        });
        button.addEventListener('keydown',event=>{
          if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); togglePicker(name); return; }
          if (!['ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
          event.preventDefault();
          const peers=Array.from(button.parentElement?.querySelectorAll<HTMLButtonElement>('[data-report-choice]') || []);
          const at=peers.indexOf(button);
          const next=event.key==='Home' ? 0 : event.key==='End' ? peers.length-1 : Math.min(peers.length-1,Math.max(0,at+(event.key==='ArrowUp'?-1:1)));
          peers[next]?.focus();
        });
      });
    }
    bindPickerChoices(section);
    if (sprintSearch && sprintList) {
      sprintDraft ||= new Set(sprintSelection());
      const dialog=sprintList.closest<HTMLElement>('[data-report-options]')!;
      const count=dialog.querySelector<HTMLElement>('[data-report-sprint-count]')!;
      const clear=dialog.querySelector<HTMLButtonElement>('[data-report-sprint-clear]')!;
      const apply=dialog.querySelector<HTMLButtonElement>('[data-report-sprint-apply]')!;
      const updateFooter=()=>{
        const size=sprintDraft?.size || 0;
        count.textContent=sprintSelectionCount(size);
        clear.disabled=apply.disabled=!size;
        apply.textContent=sprintApplyLabel(size);
      };
      sprintList.addEventListener('change',event=>{
        const input=event.target as HTMLInputElement;
        const id=input.dataset.reportSprintChoice;
        if (!id || !sprintDraft) return;
        if (input.checked) sprintDraft.add(id); else sprintDraft.delete(id);
        updateFooter();
      });
      sprintSearch.addEventListener('input',()=>{
        state.sprintQuery=sprintSearch.value;
        sprintList.innerHTML=sprintChoices(state.sprintQuery);
        sprintList.scrollTop=0;
      });
      sprintSearch.addEventListener('keydown',event=>{
        if (event.key!=='ArrowDown' && event.key!=='Enter') return;
        event.preventDefault();
        const first=sprintList.querySelector<HTMLInputElement>('[data-report-sprint-choice]');
        if (event.key==='Enter') first?.click();
        else first?.focus();
      });
      dialog.addEventListener('keydown',event=>{
        if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); togglePicker('sprint'); }
      });
      clear.addEventListener('click',()=>{
        sprintDraft?.clear();
        sprintList.querySelectorAll<HTMLInputElement>('[data-report-sprint-choice]:checked').forEach(input=>{input.checked=false;});
        updateFooter(); sprintSearch.focus({preventScroll:true});
      });
      apply.addEventListener('click',()=>{
        if (!sprintDraft?.size) return;
        const ids=[...sprintDraft];
        state.selectedSprints=ids; state.picker=''; state.sprintQuery=''; sprintDraft=null;
        for (const id of state.sprintResults.keys()) if (!ids.includes(id)) state.sprintResults.delete(id);
        for (const id of state.sprintErrors.keys()) if (!ids.includes(id)) state.sprintErrors.delete(id);
        comparisonScroll={top:0,chart:0,table:0};
        resetDetail(ids.length===1 ? ids[0] : '');
        remember(); void loadReports(); focusPicker('sprint');
      });
    }
    if (!outsideBound) {
      outsideBound=true;
      document.addEventListener('pointerdown',event=>{
        if (!state.picker || (event.target as Element)?.closest?.('[data-report-picker-widget]')) return;
        state.picker=''; state.sprintQuery=''; sprintDraft=null;
        const opened=root.querySelector('.ozon-report [data-report-picker][aria-expanded="true"]');
        opened?.setAttribute('aria-expanded','false');
        opened?.parentElement?.querySelector('[data-report-options]')?.remove();
      },true);
    }
    const comparisonContainer=()=>root.querySelector<HTMLElement>('.ozon-report-scroll');
    section.querySelectorAll<HTMLButtonElement>('[data-report-open-sprint]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.reportOpenSprint!;
      const entry=state.sprintResults.get(id);
      if (!entry) return;
      comparisonScroll={
        top:comparisonContainer()?.scrollTop || 0,
        chart:root.querySelector('.ozon-report-trend-scroll')?.scrollLeft || 0,
        table:root.querySelector('.ozon-report-trend-table')?.scrollLeft || 0
      };
      resetDetail(id); remember(); onRender();
      comparisonContainer()?.scrollTo({top:0});
      root.querySelector<HTMLButtonElement>('[data-report-back-comparison]')?.focus({preventScroll:true});
      void loadLeaderAvatars(entry.report,controller?.signal || new AbortController().signal);
    }));
    section.querySelector('[data-report-back-comparison]')?.addEventListener('click',()=>{
      const id=state.sprint;
      resetDetail(''); remember(); onRender();
      comparisonContainer()?.scrollTo({top:comparisonScroll.top});
      root.querySelector('.ozon-report-trend-scroll')?.scrollTo({left:comparisonScroll.chart});
      root.querySelector('.ozon-report-trend-table')?.scrollTo({left:comparisonScroll.table});
      root.querySelector<HTMLButtonElement>('.ozon-report-trend-link[data-report-open-sprint="' + id + '"]')?.focus({preventScroll:true});
    });
    section.querySelectorAll<HTMLButtonElement>('[data-report-comparison-unit]').forEach(button=>button.addEventListener('click',()=>{
      state.comparisonUnit=button.dataset.reportComparisonUnit || 'points'; onRender();
      root.querySelector<HTMLButtonElement>('[data-report-comparison-unit="' + state.comparisonUnit + '"]')?.focus({preventScroll:true});
    }));
    section.querySelectorAll<HTMLButtonElement>('[data-report-project]').forEach(button=>button.addEventListener('click',()=>selectProject(button.dataset.reportProject || '')));
    section.querySelectorAll<HTMLButtonElement>('[data-report-group]').forEach(button => button.addEventListener('click',()=>{
      const key=button.dataset.reportGroup!;
      groupOverrides[button.dataset.reportTree==='rollup' ? 'rollup' : 'details'].set(key,button.getAttribute('aria-expanded')!=='true');
      onRender();
      Array.from(root.querySelectorAll<HTMLButtonElement>('[data-report-group]')).find(item=>item.dataset.reportGroup===key)?.focus({preventScroll:true});
    }));
    section.querySelector('[data-report-refresh]')?.addEventListener('click',() => {
      if (state.sprintFailed || !state.sprints.length) void chooseBoard(state.board,state.selectedSprints,true,state.sprint);
      else void loadReports(true,Boolean(state.sprint));
    });
    section.querySelectorAll<HTMLButtonElement>('[data-report-section]').forEach(button => button.addEventListener('click',() => {
      const target=button.dataset.reportSection!;
      if (state.section!==target || button.classList.contains('ozon-report-card')) {
        state.section=target; state.query=''; state.limit=60; state.scopeFilter=button.dataset.reportTargetFilter || 'all'; state.chartDay='';
        onRender();
      }
      root.querySelector<HTMLButtonElement>('.ozon-report-sections [data-report-section="' + target + '"]')?.focus({preventScroll:true});
      root.querySelector('.ozon-report-panel')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }));
    const graphs=section.querySelectorAll<HTMLElement>('[data-report-chart]');
    if (state.report && graphs.length) {
      const scale=chartViews(visibleReport(state.report));
      graphs.forEach((graph,index)=>bindChart(graph,scale.views[index],scale,changeDay));
    }
    section.querySelectorAll<HTMLButtonElement>('[data-report-chart-mode]').forEach(button=>button.addEventListener('click',()=>{
      const mode=button.dataset.reportChartMode==='projects' ? 'projects' : 'total';
      if (state.chartMode===mode) return;
      state.chartMode=mode; state.chartDay='';
      remember(); onRender();
      root.querySelector<HTMLButtonElement>('[data-report-chart-mode="' + mode + '"]')?.focus({preventScroll:true});
    }));
    section.querySelectorAll<HTMLButtonElement>('[data-report-day-step]').forEach(button => button.addEventListener('click', () => {
      const days = state.report?.days || [];
      const index = Math.max(0,days.findIndex(day => day.date === state.day));
      const day = days[index + Number(button.dataset.reportDayStep)];
      if (!day) return;
      state.chartDay=''; changeDay(day.date);
      const next = root.querySelector<HTMLButtonElement>('[data-report-day-step="' + button.dataset.reportDayStep + '"]');
      if (next?.disabled) focusPicker('day');
      else next?.focus({preventScroll:true});
    }));
    section.querySelector('[data-report-more]')?.addEventListener('click',()=>{state.limit+=60; onRender();});
    const search = section.querySelector<HTMLInputElement>('#ozon-report-search');
    search?.addEventListener('input',() => {
      const caret = search.selectionStart;
      state.query=search.value; state.limit=60; onRender();
      const next=root.querySelector<HTMLInputElement>('#ozon-report-search');
      if (next) { next.focus({preventScroll:true}); if (caret!==null) next.setSelectionRange(caret,caret); }
    });
  }
  return {html,bind,open,cancel,updateTask,getState:()=>state};
}
