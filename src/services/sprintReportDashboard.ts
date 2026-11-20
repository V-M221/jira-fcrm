import type { createSprintReportModel } from './sprintReportModel';

// Serialized into content.js. Receives its model and the local board list from the host.
export function createSprintReportDashboard(onRender:()=>void, model:ReturnType<typeof createSprintReportModel>, boards:{id:string;name:string}[], configuredSprintField:string, configuredEpicField:string, renderBadge:(label:string, state:string)=>string) {
  type Report = ReturnType<typeof model.build>;
  const state = {board:boards[0].id,sprint:'',sprints:[] as any[],report:null as Report | null, section:'days',day:'',query:'',limit:60,
    scopeFilter:'all',project:'',picker:'',chartMode:'total' as 'total'|'projects',chartDay:'',chartProject:'',loading:'',error:'',sprintFailed:false};
  const collapsed = new Set<string>();
  try {
    const saved = JSON.parse(localStorage.getItem('ozon-sprint-report-v1') || 'null');
    if (saved && boards.some(board => board.id === saved.board)) {
      state.board = saved.board;
      state.sprint = String(saved.sprint || '');
      if (saved.chartMode === 'projects') state.chartMode = 'projects';
    }
  } catch (_) { /* Selection remains available for this visit. */ }
  let controller:AbortController | null = null;
  let generation = 0;
  let hasOpened = false;
  let updatedAt = 0;
  let outsideBound = false;
  const catalog = new Map<string,any[]>();
  const escape = (value:any) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const amount = new Intl.NumberFormat('ru',{maximumFractionDigits:2}).format;
  const plurals = new Intl.PluralRules('ru');
  const taskCount = (count:number) => amount(count) + ' ' + ({one:'задача',few:'задачи'}[plurals.select(count)] || 'задач');
  const eventCount = (count:number) => amount(count) + ' ' + ({one:'событие',few:'события'}[plurals.select(count)] || 'событий');
  const dateFormat = new Intl.DateTimeFormat('ru',{timeZone:'Europe/Moscow',day:'numeric',month:'short'});
  const timeFormat = new Intl.DateTimeFormat('ru',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'});
  const shortDate = (time:number) => dateFormat.format(time).replace(/\.$/,'');
  const dayLabel = (day:string) => shortDate(Date.parse(day + 'T12:00:00Z'));
  const issueLink = (key:string) => '<a class="ozon-mono" href="/browse/' + encodeURIComponent(key) + '" target="_blank" rel="noopener noreferrer">' + escape(key) + '</a>';
  const remember = () => { try { localStorage.setItem('ozon-sprint-report-v1',JSON.stringify({board:state.board,sprint:state.sprint,chartMode:state.chartMode})); } catch (_) {} };

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
    state.loading = '';
    state.picker = '';
    state.chartDay = '';
  }

  async function chooseBoard(board:string, preferred = '', force = false) {
    if (!boards.some(option => option.id === board)) return;
    cancel();
    const request = generation;
    controller = new AbortController();
    const signal = controller.signal;
    state.board = board; state.sprint = preferred; state.sprints = []; state.report = null; state.project = '';
    collapsed.clear();
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
      state.sprint = String(sp.find(item => String(item.id) === preferred)?.id || sp[0]?.id || '');
      state.loading = '';
      remember();
      if (state.sprint) void loadReport();
      else onRender();
    } catch (error:any) {
      if (request !== generation) return;
      state.loading = ''; state.error = error.message; state.sprintFailed = true;
      onRender();
    }
  }

  async function loadReport() {
    const selected = state.sprints.find(item => String(item.id) === state.sprint);
    if (!selected) return;
    cancel();
    const request = generation;
    controller = new AbortController();
    const signal = controller.signal;
    const board = state.board, sprintId = state.sprint;
    state.loading = 'Читаем состав спринта…'; state.error = '';
    remember();
    onRender();
    const recover = (promise:Promise<any>) => promise.catch(error => { if (signal.aborted) throw error; return null; });
    try {
      const [sprintDetails, configuration, native, fields] = await Promise.all([
        recover(json('/rest/agile/1.0/sprint/' + encodeURIComponent(sprintId),signal)),
        recover(json('/rest/agile/1.0/board/' + encodeURIComponent(board) + '/configuration',signal)),
        recover(json('/rest/greenhopper/1.0/rapid/charts/sprintreport?' + new URLSearchParams({rapidViewId:board,sprintId}),signal)),
        recover(json('/rest/api/2/field',signal))
      ]);
      if (request !== generation) return;
      const sprint = {...selected,...sprintDetails};
      const scope = model.nativeScope(native);
      const currentField = (Array.isArray(fields) ? fields : []).find(field => String(field.schema?.custom || '').includes('gh-sprint'))?.id || configuredSprintField;
      const epicField = (Array.isArray(fields) ? fields : []).find(field => String(field.schema?.custom || '').endsWith('gh-epic-link') || /^(epic link|ссылка на эпик)$/i.test(String(field.name || '')))?.id || configuredEpicField;
      const estimate = configuration?.estimation?.field;
      const pointsField = /^customfield_\d+$/.test(estimate?.fieldId || '') ? estimate.fieldId : '';
      const pointsName = estimate?.displayName || (Array.isArray(fields) ? fields : []).find(field => field.id === pointsField)?.name || 'Story Points';
      const lastColumn = (configuration?.columnConfig?.columns || []).filter((column:any) => column.statuses?.length).at(-1);
      const doneIds = (lastColumn?.statuses || []).map((status:any) => String(status.id));
      const fieldList = [...new Set(['summary','created','status','issuetype','project','sprint','closedSprints','epic',currentField,pointsField,epicField,'customfield_24000'].filter(Boolean))].join(',');
      const baseline = scope ? [] : await pages('/rest/agile/1.0/board/' + encodeURIComponent(board) + '/sprint/' + encodeURIComponent(sprintId) + '/issue?fields=' + encodeURIComponent(fieldList),'issues',signal);
      const keys = [...new Set<string>([...baseline.map(issue => issue.key),...scope?.issues.keys() || [],...scope?.added || []])].filter(key => /^[A-Z][A-Z0-9_]*-\d+$/.test(key));
      let done = 0;
      const issues = new Map<string,any>(baseline.map(issue => [issue.key,issue]));
      // Request histories in bounded batches. Jira may limit changelog expansion on
      // search results, in which case only those issues get a dedicated request.
      const loadChunk = async (chunk:string[]) => {
        const search = new URLSearchParams({jql:'key in (' + chunk.join(',') + ') ORDER BY key ASC',fields:fieldList,expand:'changelog'});
        const searched = await recover(pages('/rest/api/2/search?' + search,'issues',signal));
        const byKey = new Map((searched || []).map((issue:any) => [issue.key,issue]));
        for (let index=0; index<chunk.length; index+=3) {
          await Promise.all(chunk.slice(index,index+3).map(async key => {
            const partial:any = byKey.get(key);
            const log = partial?.changelog;
            const complete = Array.isArray(log?.histories) && Number(log.startAt || 0) === 0 && (!Number.isFinite(log.total) || log.total <= log.histories.length);
            const result = complete ? partial : (await recover(json('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=' + encodeURIComponent(fieldList) + '&expand=changelog',signal))) || partial;
            if (result) issues.set(key,result);
          }));
        }
        done += chunk.length;
      };
      for (let index=0; index<keys.length; index+=40) {
        if (request !== generation) return;
        state.loading = 'Восстанавливаем историю задач: ' + done + ' из ' + keys.length + '…';
        onRender();
        const chunks = [keys.slice(index,index+20),keys.slice(index+20,index+40)].filter(chunk => chunk.length);
        await Promise.all(chunks.map(loadChunk));
      }
      if (request !== generation) return;
      const epicKeys = [...new Set([...issues.values()].map(issue => model.epicKeyFor(issue.fields || {},epicField)).filter(Boolean))];
      const epics = new Map<string,any>();
      epicKeys.forEach(key => { if (issues.has(key)) epics.set(key,issues.get(key).fields); });
      const needMetadata = epicKeys.filter(key => !epics.has(key));
      if (needMetadata.length) {
        state.loading = 'Загружаем стримы и эпики…';
        onRender();
      }
      for (let index=0; index<needMetadata.length; index+=50) {
        if (request !== generation) return;
        const jql = 'key in (' + needMetadata.slice(index,index+50).join(',') + ')';
        const data = await recover(pages('/rest/api/2/search?' + new URLSearchParams({jql,fields:'summary,customfield_24000'}),'issues',signal));
        data?.forEach((issue:any) => epics.set(issue.key,issue.fields || {}));
      }
      if (request !== generation) return;
      state.report = model.build({sprint,scope,issues:[...issues.values()],sprintField:currentField,pointsField,pointsName,doneIds,epicField,epics});
      if (state.project && !state.report.byProject.has(state.project)) state.project = '';
      if (sprint.state !== selected.state) selected.state = sprint.state;
      updatedAt = Date.now();
      state.day ||= ([...state.report.days].reverse().find(day => day.changes.length)?.date || state.report.days.at(-1)?.date || '');
    } catch (error:any) {
      if (request === generation) state.error = error.message || 'Не удалось подготовить отчёт.';
    } finally {
      if (request === generation) { state.loading = ''; onRender(); }
    }
  }

  function open(context?:{board:string;sprint:string}) {
    if (context && boards.some(board => board.id === context.board) && (state.board !== context.board || state.sprint !== context.sprint)) {
      hasOpened = true;
      state.day=''; state.limit=60; state.query=''; state.scopeFilter='all';
      void chooseBoard(context.board,context.sprint);
      return;
    }
    if (hasOpened && (state.report || state.loading || state.error)) {
      if (state.report && !state.report.closed && !state.loading && Date.now()-updatedAt > 15000) void loadReport();
      return;
    }
    const preferred = state;
    hasOpened = true;
    void chooseBoard(preferred.board,preferred.sprint);
  }

  const visibleReport = (report:Report) => {
    const detail = report.byProject.get(state.project);
    return detail ? {...report,...detail} : report;
  };
  const positive = (n:number) => n > 0 ? '+' + amount(n) : amount(n);
  const spinner = () => '<span class="ozon-ext-spinner" aria-hidden="true"></span>';
  const linkToJira = () => '/secure/RapidBoard.jspa?rapidView=' + encodeURIComponent(state.board) + '&view=reporting&chart=sprintRetrospective&sprint=' + encodeURIComponent(state.sprint);
  const sprintBadge = (status:string) => status === 'active' ? renderBadge('Активный','active') : status === 'closed' ? renderBadge('Закрытый','closed') : '';
  const metric = (report:Report,value:number) => report.pointsField ? amount(value) + (/^(story points?|стори[ -]поинты)$/i.test(report.pointsName) ? ' SP' : '') : '—';

  type PickerOption = {id:string;name:string;badge?:string};
  function picker(id:string,label:string,selected:string,options:PickerOption[],empty='Нет вариантов') {
    const current=options.find(option=>option.id===selected);
    const open=state.picker===id;
    return '<div class="ozon-ext-toolbar-combo" data-report-picker-widget="' + id + '">' +
      '<button type="button" class="ozon-ext-toolbar-trigger" data-report-picker="' + id + '" aria-label="' + escape(label) + '" aria-expanded="' + open + '" aria-haspopup="listbox"' + (!options.length ? ' disabled' : '') + '><span class="ozon-ext-toolbar-label">' + escape(current?.name || empty) + '</span>' + (current?.badge || '') + '<span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></button>' +
      (open ? '<div class="ozon-ext-combo-popover ozon-ext-toolbar-popover ozon-report-options" role="listbox" aria-label="' + escape(label) + '">' +
        options.map(option=>'<button type="button" role="option" class="ozon-ext-combo-item ' + (option.id === selected ? 'active' : '') + '" data-report-choice="' + escape(option.id) + '" aria-selected="' + (option.id === selected) + '"><span>' + escape(option.name) + '</span>' + (option.badge || '') + '</button>').join('') + '</div>' : '') + '</div>';
  }

  function overview(report:Report) {
    const m = report.metrics;
    const cards = [
      ['План на старте',metric(report,m.planned),taskCount(m.plannedTasks) + ' · ' + m.unestimated + ' без оценки','start'],
      ['Добавили',metric(report,m.added),taskCount(m.addedTasks),'scope'],
      ['Убрали',metric(report,m.removed),taskCount(m.removedTasks),'scope'],
      ['Сожгли за спринт',metric(report,m.burned),m.completed + ' завершено к концу периода','days'],
      [report.closed ? 'Осталось к закрытию' : 'Осталось сейчас',metric(report,m.remaining),taskCount(m.remainingTasks),'finish']
    ];
    return '<div class="ozon-report-cards">' + cards.map(([label,value,detail,target]) => '<button type="button" class="ozon-report-card" data-report-section="' + target + '"><span>' + escape(label) + '</span><strong>' + escape(value) + '</strong><small>' + escape(detail) + '</small></button>').join('') + '</div>';
  }

  function projectFilter(report:Report) {
    const keys=[...report.byProject.keys()];
    if (keys.length === 1) return '<div class="ozon-report-projectbar">Проект <b>' + escape(keys[0]) + '</b></div>';
    if (!keys.length) return '';
    const options=[{id:'',name:'Все проекты'},...keys.map(key=>({id:key,name:key}))];
    return '<div class="ozon-report-projectbar"><span>Проект</span>' + picker('project','Проект',state.project,options) + '</div>';
  }

  function projectBreakdown(report:Report) {
    if (report.byProject.size < 2) return '';
    const cell=(points:number,tasks:string)=>'<td>' + (report.pointsField ? '<strong>' + escape(metric(report,points)) + '</strong><br>' : '') + '<small>' + escape(tasks) + '</small></td>';
    return '<div class="ozon-report-table-wrap ozon-report-projects"><table aria-label="Показатели по проектам"><thead><tr><th>Проект</th><th>На старте</th><th>Добавили</th><th>Убрали</th><th>Сожгли</th><th>Осталось</th></tr></thead><tbody>' +
      [...report.byProject].map(([key,{metrics:m}])=>'<tr class="' + (key===state.project ? 'ozon-report-project-selected' : '') + '"><th scope="row"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-project="' + escape(key) + '" aria-pressed="' + (key===state.project) + '">' + escape(key) + '</button></th>' +
        cell(m.planned,taskCount(m.plannedTasks) + (m.unestimated ? ' · ' + m.unestimated + ' без оценки' : '')) + cell(m.added,taskCount(m.addedTasks)) +
        cell(m.removed,taskCount(m.removedTasks)) + cell(m.burned,taskCount(m.completed) + ' завершено') + cell(m.remaining,taskCount(m.remainingTasks)) + '</tr>').join('') + '</tbody></table></div>';
  }

  const plot={width:960,height:232,left:58,right:40,top:35,bottom:57};
  function chartViews(report:Report) {
    const canSplit=!state.project && report.byProject.size>1;
    const split=canSplit && state.chartMode==='projects';
    const views=split ? [...report.byProject].map(([key,detail])=>({key,report:{...report,...detail}})) : [{key:state.project,report}];
    let peak=1;
    for (const {report:series} of views) {
      peak=Math.max(peak,series.metrics.planned,series.metrics.initialRemaining);
      for (const day of series.days) peak=Math.max(peak,day.scope,day.remaining);
    }
    const roughStep=peak/5;
    const magnitude=10 ** Math.floor(Math.log10(roughStep));
    const step=[1,2,2.5,5,10].find(value=>value>=roughStep/magnitude)! * magnitude;
    const ticks=Math.ceil(peak/step);
    return {views,canSplit,split,step,ticks,max:ticks*step};
  }
  function chartGeometry(report:Report,max:number) {
    const {width,height,left,right,top,bottom}=plot;
    return {
      x:(index:number) => left + (width-left-right)*index/Math.max(report.days.length,1),
      y:(value:number) => top + (height-top-bottom)*(1-value/max)
    };
  }
  function chart(report:Report,key:string,scale:ReturnType<typeof chartViews>) {
    const {width,height,left,right,top,bottom}=plot;
    const {x,y}=chartGeometry(report,scale.max);
    const axisY=height-bottom;
    const points=[{scope:report.metrics.planned,remaining:report.metrics.initialRemaining},...report.days];
    const end=points.length-1;
    const path=(series:'scope'|'remaining')=>points.map((point,index)=>x(index) + ',' + y(point[series])).join(' ');
    const gridY=Array.from({length:scale.ticks+1},(_,index)=> {
      const value=scale.step*index, row=y(value);
      return '<line x1="' + left + '" y1="' + row + '" x2="' + (width-right) + '" y2="' + row + '"/><text x="' + (left-9) + '" y="' + row + '" dominant-baseline="middle" text-anchor="end">' + escape(amount(value)) + '</text>';
    }).join('');
    const axisTicks=Math.min(end,6);
    const dates=new Set(Array.from({length:axisTicks+1},(_,index)=>Math.round(end*index/axisTicks)));
    const gridX=points.map((_,index)=>{
      const major=dates.has(index);
      if (!major && index%Math.ceil(end/90) !== 0) return '';
      const column=x(index);
      return '<line class="ozon-report-grid-day' + (major ? ' is-major' : '') + '" x1="' + column + '" x2="' + column + '" y1="' + top + '" y2="' + (axisY+(major ? 5 : 0)) + '"/>' +
        (major ? '<text x="' + column + '" y="' + (axisY+33) + '" text-anchor="middle">' + escape(index ? dayLabel(report.days[index-1].date) : 'Старт') + '</text>' : '');
    }).join('');
    const selected = report.days.findIndex(day=>day.date===state.day)+1;
    const labels=new Set([0,end]);
    const addLabel=(index:number)=>{
      if ([...labels].every(existing=>Math.abs(x(index)-x(existing))>=45)) labels.add(index);
    };
    addLabel(selected);
    for (let index=1; index<end; index++) addLabel(index);
    const number=(series:string,value:number,index:number,offset:number)=>'<text class="ozon-report-plot-label ' + series + '" x="' + x(index) + '" y="' + (y(value)+offset) + '" text-anchor="middle">' + escape(amount(value)) + '</text>';
    const pointLabels=[...labels].map(index=>{
      const {scope,remaining}=points[index];
      if (scope===remaining) return number('shared',scope,index,-9);
      return number('scope',scope,index,-9) + number('remaining',remaining,index,17);
    }).join('');
    const dots=points.map(({scope,remaining},index)=>{
      if (end>35 && !labels.has(index)) return '';
      const radius=index===selected && selected ? 4 : 2.5;
      return '<circle class="ozon-report-scope-dot" cx="' + x(index) + '" cy="' + y(scope) + '" r="' + radius + '"/>' +
        '<circle class="ozon-report-remaining-dot" cx="' + x(index) + '" cy="' + y(remaining) + '" r="' + radius + '"/>';
    }).join('');
    return '<div class="ozon-report-graph" data-report-chart><svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + escape((key ? key + '. ' : '') + 'Объём и остаток по дням. Наведите курсор для просмотра значений или выберите дату над графиком.') + '"><g class="ozon-report-grid">' + gridY + gridX + '</g>' +
      '<path class="ozon-report-axis" d="M' + left + ',' + top + ' V' + axisY + ' H' + (width-right) + '"/><text class="ozon-report-axis-title" x="' + left + '" y="16">' + escape(report.pointsName) + '</text><text class="ozon-report-axis-title" x="' + ((left+width-right)/2) + '" y="' + (height-4) + '" text-anchor="middle">День спринта · МСК</text>' +
      (selected ? '<line class="ozon-report-line-selected" x1="' + x(selected) + '" x2="' + x(selected) + '" y1="' + top + '" y2="' + axisY + '"/>' : '') +
      '<polyline class="ozon-report-line-scope" points="' + path('scope') + '"/><polyline class="ozon-report-line-remaining" points="' + path('remaining') + '"/>' + dots + pointLabels +
      '<g data-report-hover visibility="hidden"><line class="ozon-report-line-selected" y1="' + top + '" y2="' + axisY + '"/><circle data-report-dot="remaining" class="ozon-report-remaining-dot" r="5"/><circle data-report-dot="scope" class="ozon-report-scope-dot" r="4"/></g>' +
      '<rect class="ozon-report-graph-hit" x="' + left + '" y="' + top + '" width="' + (width-left-right) + '" height="' + (axisY-top) + '" fill="transparent"/></svg><div class="ozon-report-tooltip" hidden><strong data-tip-date></strong><span data-tip-remaining></span><span data-tip-scope></span><span data-tip-burned></span><span data-tip-reopened></span></div></div>';
  }

  function charts(report:Report) {
    if (!report.pointsField || !report.days.length) return '';
    const scale=chartViews(report);
    const mode=scale.canSplit ? '<div class="ozon-report-chart-modes" role="group" aria-label="Графики">' +
      [['total','Общий график'],['projects','По проектам']].map(([id,label])=>'<button type="button" class="ozon-ext-btn ' + (id===state.chartMode ? '' : 'ozon-ext-btn-surface') + '" data-report-chart-mode="' + id + '" aria-pressed="' + (id===state.chartMode) + '">' + label + '</button>').join('') + '</div>' : '';
    return '<div class="ozon-report-chart-toolbar">' + mode + '<div class="ozon-report-legend"><span>Осталось работы</span><span>Объём спринта</span>' +
      (scale.split ? '<small>Одинаковая шкала для всех проектов</small>' : '') + '</div></div>' +
      scale.views.map(view=>'<div class="ozon-report-chart">' + (scale.split ? '<h3>' + escape(view.key) + '</h3>' : '') + chart(view.report,view.key,scale) + '</div>').join('');
  }

  const dayBurn = (changes:{burned:number}[]) => changes.reduce((totals,change) => {
    totals.completed += Math.max(change.burned,0);
    totals.reopened += Math.max(-change.burned,0);
    return totals;
  },{completed:0,reopened:0});

  function bindChart(graph:HTMLElement, {key,report}:ReturnType<typeof chartViews>['views'][number], max:number, changeDay:(day:string)=>void) {
    const svg=graph.querySelector('svg');
    const hit=svg?.querySelector('.ozon-report-graph-hit');
    const hover=svg?.querySelector('[data-report-hover]');
    const tip=graph.querySelector<HTMLElement>('.ozon-report-tooltip');
    if (!svg || !hit || !hover || !tip) return;
    const line=hover.querySelector('line')!, remaining=hover.querySelector('[data-report-dot="remaining"]')!, scope=hover.querySelector('[data-report-dot="scope"]')!;
    const values=['date','remaining','scope','burned','reopened'].map(key=>tip.querySelector('[data-tip-' + key + ']')!);
    const {x,y}=chartGeometry(report,max);
    const nearest = (event:MouseEvent) => {
      const matrix=svg.getScreenCTM();
      if (!matrix) return -1;
      const point = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      if (point.x < plot.left || point.x > plot.width-plot.right || point.y < plot.top || point.y > plot.height-plot.bottom) return -1;
      return Math.min(report.days.length,Math.max(0,Math.round((point.x-plot.left)*report.days.length/(plot.width-plot.left-plot.right))));
    };
    const hide = () => { tip.hidden=true; hover.setAttribute('visibility','hidden'); };
    let lastIndex = -1;
    const show = (index:number, clientX:number) => {
      if (index < 0) { hide(); return; }
      if (index !== lastIndex) {
        lastIndex=index;
        const day=report.days[index-1], m=report.metrics;
        const burn=dayBurn(day?.changes || []);
        const left=x(index), leftText=String(left);
        const rest=day?.remaining ?? m.initialRemaining, volume=day?.scope ?? m.planned;
        line.setAttribute('x1',leftText); line.setAttribute('x2',leftText);
        [remaining,scope].forEach((dot,at)=>{dot.setAttribute('cx',leftText); dot.setAttribute('cy',String(y(at ? volume : rest)));});
        values[0].textContent=day ? dayLabel(day.date) : 'Старт · ' + shortDate(report.start);
        values[1].textContent='Осталось: ' + metric(report,rest);
        values[2].textContent='В спринте: ' + metric(report,volume);
        values[3].textContent=day ? 'Сожгли за день: ' + metric(report,burn.completed) : '';
        values[4].textContent=burn.reopened ? 'Вернули при переоткрытии: ' + metric(report,burn.reopened) : '';
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
      show(index+1,new DOMPoint(x(index+1),plot.top).matrixTransform(matrix).x);
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

  type TaskGroup = {key:string;project:string;stream:string;epicKey:string;epicTitle:string};
  function groupedRows<T>(items:T[], taskFor:(item:T)=>TaskGroup, renderRow:(item:T)=>string, columns:number) {
    let visibleCount=0, renderedCount=0;
    const renderLevel = (entries:T[],depth:number,path:string[]):string => {
      if (depth===3) {
        visibleCount+=entries.length;
        const count=Math.min(entries.length,Math.max(0,state.limit-renderedCount));
        renderedCount+=count;
        return entries.slice(0,count).map(renderRow).join('');
      }
      const groups=new Map<string,T[]>();
      for (const entry of entries) {
        const task=taskFor(entry);
        const key=depth===0 ? task.project || 'Без проекта' : depth===1 ? task.stream || 'Без стрима' : task.epicKey || '';
        if (!groups.has(key)) groups.set(key,[]);
        groups.get(key)!.push(entry);
      }
      let html='';
      [...groups].sort(([a],[b])=>a.localeCompare(b,'ru',{numeric:true})).forEach(([key,entries])=>{
        const nextPath=[...path,key], id=JSON.stringify(nextPath);
        const expanded=Boolean(state.query.trim()) || !collapsed.has(id);
        const epicTitle=depth===2 && key ? taskFor(entries[0]).epicTitle : '';
        const label=depth===2 ? key || 'Без эпика' : key;
        const count=taskCount(new Set(entries.map(entry=>taskFor(entry).key)).size);
        if (renderedCount < state.limit) {
          html+='<tr class="ozon-report-group ozon-report-group-' + depth + '"><th colspan="' + columns + '"><div><button type="button" data-report-group="' + escape(id) + '" aria-expanded="' + expanded + '" aria-label="' + (expanded ? 'Свернуть ' : 'Развернуть ') + escape(label) + '">' + (expanded ? '▾' : '▸') + '</button>' +
            (depth===2 && key ? issueLink(key) : '<strong>' + escape(label) + '</strong>') + (epicTitle ? '<span>' + escape(epicTitle) + '</span>' : '') + '<small>' + escape(count) + '</small></div></th></tr>';
        }
        if (expanded) html+=renderLevel(entries,depth+1,nextPath);
      });
      return html;
    };
    const html=renderLevel(items,0,[]);
    return {html,visibleCount};
  }

  const choices = [{id:'days',title:'По дням'},{id:'start',title:'На старте'},{id:'scope',title:'Изменения состава'},{id:'finish',title:'Итоги'}];
  const pointsCell = (value:number | null) => value == null ? '—' : escape(amount(value));
  function dayBreakdown(report:Report, index:number) {
    if (state.project || report.byProject.size < 2 || index < 0) return '';
    return '<details class="ozon-report-method ozon-report-day-breakdown"><summary>Показатели дня по проектам</summary><div class="ozon-report-table-wrap"><table><thead><tr><th>Проект</th><th>События</th><th>Добавили</th><th>Убрали</th>' + (report.pointsField ? '<th>Сожгли</th><th>Осталось</th>' : '') + '</tr></thead><tbody>' +
      [...report.byProject].map(([key,project])=>{
        const day=project.days[index];
        const tasks=(kind:'added'|'removed') => taskCount(new Set(day.changes.filter(change=>change[kind]).map(change=>change.key)).size);
        return '<tr><th scope="row">' + escape(key) + '</th><td>' + escape(eventCount(day.changes.length)) + '</td><td>' + escape(tasks('added')) + '</td><td>' + escape(tasks('removed')) + '</td>' +
          (report.pointsField ? '<td>' + escape(metric(report,day.burned)) + '</td><td>' + escape(metric(report,day.remaining)) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div></details>';
  }
  function daily(report:Report) {
    const selected = report.days.find(day => day.date === state.day) || report.days[0];
    const dayIndex = report.days.indexOf(selected);
    const tasks = new Map(report.rows.map(row => [row.key,row]));
    const changes = selected?.changes || [];
    const row = (change:Report['events'][number]) => {
      const facts = [
        change.added ? 'Добавлена' : change.removed ? 'Убрана' : '',
        change.statusChanged ? (change.before.status.name || '—') + ' → ' + (change.after.status.name || '—') : '',
        change.estimateChanged ? 'Оценка: ' + pointsCell(change.before.points) + ' → ' + pointsCell(change.after.points) : ''
      ].filter(Boolean);
      return '<tr><td>' + timeFormat.format(change.at) + '</td><td>' + issueLink(change.key) + '</td><td>' + escape(tasks.get(change.key)?.summary || '') + '</td><td>' + facts.map(escape).join('<br>') + '</td>' +
        (report.pointsField ? '<td>' + (change.burned === 0 ? '—' : escape(positive(change.burned))) + '</td>' : '') + '</tr>';
    };
    const {completed,reopened} = dayBurn(changes);
    const grouped = groupedRows(changes,change=>tasks.get(change.key),row,report.pointsField ? 5 : 4);
    const step = (delta:number,label:string,icon:string) => '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-day-step="' + delta + '" aria-label="' + label + '"' + (!report.days[dayIndex+delta] ? ' disabled' : '') + '>' + icon + '</button>';
    const dayOptions=report.days.map(day=>({id:day.date,name:dayLabel(day.date) + ' · ' + eventCount(day.changes.length)}));
    return '<section class="ozon-report-panel"><h2>Ход спринта</h2><div class="ozon-report-daybar"><span>Дата</span>' + step(-1,'Предыдущий день','‹') + picker('day','Дата',selected?.date || '',dayOptions) + step(1,'Следующий день','›') +
      (selected && report.pointsField ? '<span>Сожгли за день: <strong>' + escape(amount(completed)) + '</strong>' + (reopened ? ' · Вернули при переоткрытии: <strong>' + escape(amount(reopened)) + '</strong>' : '') + ' · Остаток: <strong>' + escape(amount(selected.remaining)) + '</strong></span>' : '') + '</div>' + charts(report) +
      dayBreakdown(report,dayIndex) +
      (changes.length ? '<div class="ozon-report-table-wrap"><table><thead><tr><th>МСК</th><th>Ключ</th><th>Задача</th><th>Что изменилось</th>' + (report.pointsField ? '<th>Сожгли</th>' : '') + '</tr></thead><tbody>' + grouped.html + '</tbody></table></div>' + more(grouped.visibleCount) : '<p class="ozon-report-empty">В этот день изменений не было.</p>') +
      '<details class="ozon-report-method"><summary>Как читать цифры</summary><p>«Сожгли» — изменение при переходе в последнюю колонку доски. При переоткрытии баллы возвращаются в остаток. Добавление, исключение и переоценка задач влияют на объём. Задачи без оценки участвуют в списках.</p></details></section>';
  }

  const more = (total:number) => total > state.limit ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-more>Показать ещё ' + Math.min(60,total-state.limit) + '</button>' : '';
  function taskList(report:Report) {
    const isStart=state.section === 'start', isScope=state.section === 'scope', isFinish=state.section === 'finish';
    const filters = isScope ? [{id:'all',name:'Все изменения'},{id:'added',name:'Добавили'},{id:'removed',name:'Убрали'}]
      : isFinish ? [{id:'all',name:'Остались'},{id:'done',name:'Завершены'}] : [];
    const matches = report.rows.filter(row => isStart ? row.started : isScope ? (state.scopeFilter === 'added' ? row.added : state.scopeFilter === 'removed' ? row.removed : row.added || row.removed) : row.memberAtEnd && (state.scopeFilter === 'done' ? row.doneAtEnd : !row.doneAtEnd));
    const query = state.query.trim().toLowerCase();
    const filtered = matches.filter(row => !query || (row.key + ' ' + row.summary).toLowerCase().includes(query));
    const title = isStart ? 'Задачи на старте' : isScope ? 'Добавления и исключения' : report.closed ? 'Задачи к закрытию спринта' : 'Состояние на сейчас';
    const note = isFinish && report.closed ? '<p class="ozon-report-hint">В «Остались» входят задачи, которые были в спринте при закрытии и не были завершены к этому моменту.</p>' : '';
    const row = (task:any) => {
      const scopeLabel = (title:string, days:string[]) => title + (days.length ? ' ' + [...new Set(days)].map(dayLabel).join(', ') : ' · дата неизвестна');
      const status = isScope ? [task.added ? scopeLabel('Добавили',task.addedDates) : '',task.removed ? scopeLabel('Убрали',task.removedDates) : ''].filter(Boolean).join(' · ') : isStart ? task.startStatus : task.endStatus;
      const points = isScope ? [task.added ? '+' + pointsCell(task.addedPoints) : '',task.removed ? '−' + pointsCell(task.removedPoints) : ''].filter(Boolean).join(' / ') : pointsCell(isStart ? task.startPoints : task.endPoints);
      return '<tr><td>' + issueLink(task.key) + '</td><td>' + escape(task.summary) + (!task.completeHistory ? ' <small class="ozon-report-history-warning">История неполная</small>' : '') + '</td><td>' + escape(status || '—') + '</td>' +
        (report.pointsField ? '<td>' + points + '</td>' : '') + '</tr>';
    };
    const grouped=groupedRows(filtered,task=>task,row,report.pointsField ? 4 : 3);
    return '<section class="ozon-report-panel"><h2>' + title + '</h2>' + note + '<div class="ozon-report-tools"><input id="ozon-report-search" type="search" placeholder="Ключ или название задачи" aria-label="Поиск задачи в списке" value="' + escape(state.query) + '">' +
      (filters.length ? picker('scope','Какие задачи показать',state.scopeFilter,filters) : '') + '<span>' + taskCount(filtered.length) + '</span></div>' +
      (filtered.length ? '<div class="ozon-report-table-wrap"><table><thead><tr><th>Ключ</th><th>Задача</th><th>' + (isScope ? 'Изменение' : 'Статус') + '</th>' +
        (report.pointsField ? '<th>' + escape(report.pointsName || 'Оценка') + '</th>' : '') + '</tr></thead><tbody>' + grouped.html + '</tbody></table></div>' + more(grouped.visibleCount) : '<p class="ozon-report-empty">Задач нет.</p>') + '</section>';
  }

  function html() {
    const report = state.report;
    const visible = report && visibleReport(report);
    const selected = state.sprints.find(sprint=>String(sprint.id)===state.sprint);
    const sprintOptions=state.sprints.map(sprint=>({id:String(sprint.id),name:sprint.name,badge:sprintBadge(sprint.state)}));
    return '<section class="ozon-report" aria-label="Отчёт по спринту"><header class="ozon-ext-header-bar"><strong>Отчёт по спринту</strong></header><div class="ozon-report-scroll"><div class="ozon-report-inner">' +
      '<div class="ozon-report-toolbar"><div class="ozon-report-field"><span>Доска</span>' + picker('board','Доска',state.board,boards) + '</div>' +
      '<div class="ozon-report-field"><span>Спринт</span>' + picker('sprint','Спринт',state.sprint,sprintOptions,'Нет спринтов') + '</div>' +
      '<button type="button" class="ozon-ext-btn" data-report-refresh' + (state.loading ? ' disabled' : '') + '>' + (state.error ? 'Повторить' : 'Обновить отчёт') + '</button>' +
      (selected ? '<a class="ozon-ext-btn ozon-ext-btn-surface" href="' + escape(linkToJira()) + '" target="_blank" rel="noopener noreferrer">Отчёт в Jira ↗</a>' : '') + '</div>' +
      (state.loading ? '<div class="ozon-report-banner" role="status">' + spinner() + escape(state.loading) + '</div>' : '') +
      (state.error ? '<div class="ozon-report-banner ozon-report-warning" role="alert">' + escape(state.error) + '</div>' : '') +
      (report && visible ? '<div class="ozon-report-period"><strong>' + escape(selected?.name || '') + '</strong>' + sprintBadge(report.closed ? 'closed' : 'active') + '<span>' + shortDate(report.start) + ' — ' + shortDate(report.end) + ' · МСК</span></div>' +
        (report.warnings.length ? '<ul class="ozon-report-warning">' + report.warnings.map(warning=>'<li>' + escape(warning) + '</li>').join('') + '</ul>' : '') +
        projectFilter(report) + overview(visible) + projectBreakdown(report) + '<div class="ozon-report-sections" role="group" aria-label="Разделы отчёта">' + choices.map(choice=>'<button type="button" class="ozon-ext-btn ' + (state.section === choice.id ? '' : 'ozon-ext-btn-surface') + '" data-report-section="' + choice.id + '" aria-pressed="' + (state.section === choice.id) + '">' + choice.title + '</button>').join('') + '</div>' +
        (state.section==='days' ? daily(visible) : taskList(visible)) : state.loading || state.error ? '' : '<p class="ozon-report-empty">На доске нет активных или закрытых спринтов.</p>') + '</div></div></section>';
  }

  function bind(root:HTMLElement) {
    const section = root.querySelector('.ozon-report');
    if (!section) return;
    const focusPicker = (name:string) => root.querySelector<HTMLButtonElement>('[data-report-picker="' + name + '"]')?.focus({preventScroll:true});
    const changeDay = (day:string) => { state.day=day; state.limit=60; onRender(); };
    const selectProject = (project:string) => {
      if (project && !state.report?.byProject.has(project)) return;
      state.project=project; state.limit=60; state.chartDay=''; onRender(); focusPicker('project');
    };
    const togglePicker = (name:string) => {
      state.picker=state.picker===name ? '' : name;
      onRender();
      if (state.picker) {
        const widget=root.querySelector('[data-report-picker-widget="' + name + '"]');
        (widget?.querySelector<HTMLElement>('[aria-selected="true"]') || widget?.querySelector<HTMLElement>('[data-report-choice]'))?.focus();
      } else focusPicker(name);
    };
    section.querySelectorAll<HTMLButtonElement>('[data-report-picker]').forEach(button => {
      const name=button.dataset.reportPicker!;
      button.addEventListener('click',()=>togglePicker(name));
      button.addEventListener('keydown',event=>{if (event.key==='ArrowDown') { event.preventDefault(); if (state.picker!==name) togglePicker(name); }});
    });
    section.querySelectorAll<HTMLButtonElement>('[data-report-choice]').forEach(button => {
      const name=button.closest<HTMLElement>('[data-report-picker-widget]')?.dataset.reportPickerWidget || '';
      button.addEventListener('click',()=>{
        const value=button.dataset.reportChoice || '';
        state.picker='';
        if (name==='board' || name==='sprint') {
          if (value === state[name]) { onRender(); focusPicker(name); return; }
          state.day=''; state.limit=60; state.query=''; state.scopeFilter='all'; state.project=''; collapsed.clear();
          if (name==='board') void chooseBoard(value);
          else { state.sprint=value; state.report=null; void loadReport(); }
          focusPicker(name);
          return;
        }
        if (name==='project') { selectProject(value); return; }
        if (name==='day') { state.chartDay=''; changeDay(value); }
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
    if (!outsideBound) {
      outsideBound=true;
      document.addEventListener('pointerdown',event=>{
        if (!state.picker || (event.target as Element)?.closest?.('[data-report-picker-widget]')) return;
        state.picker='';
        const opened=root.querySelector('.ozon-report [data-report-picker][aria-expanded="true"]');
        opened?.setAttribute('aria-expanded','false');
        opened?.parentElement?.querySelector('[role="listbox"]')?.remove();
      },true);
    }
    section.querySelectorAll<HTMLButtonElement>('[data-report-project]').forEach(button=>button.addEventListener('click',()=>selectProject(button.dataset.reportProject || '')));
    section.querySelectorAll<HTMLButtonElement>('[data-report-group]').forEach(button => button.addEventListener('click',()=>{
      if (state.query.trim()) return;
      const key=button.dataset.reportGroup!;
      collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
      onRender();
      Array.from(root.querySelectorAll<HTMLButtonElement>('[data-report-group]')).find(item=>item.dataset.reportGroup===key)?.focus({preventScroll:true});
    }));
    section.querySelector('[data-report-refresh]')?.addEventListener('click',() => { if (state.sprintFailed || !state.sprint) void chooseBoard(state.board,state.sprint,true); else void loadReport(); });
    section.querySelectorAll<HTMLButtonElement>('[data-report-section]').forEach(button => button.addEventListener('click',() => {
      const target=button.dataset.reportSection!;
      if (state.section===target && !button.classList.contains('ozon-report-card')) return;
      state.section=target; state.query=''; state.limit=60; state.scopeFilter='all'; state.chartDay='';
      if (button.classList.contains('ozon-report-card') && target === 'scope') state.scopeFilter=button.textContent?.startsWith('Добавили') ? 'added' : 'removed';
      onRender();
      root.querySelector<HTMLButtonElement>('.ozon-report-sections [data-report-section="' + target + '"]')?.focus({preventScroll:true});
    }));
    const graphs=section.querySelectorAll<HTMLElement>('[data-report-chart]');
    if (state.report && graphs.length) {
      const scale=chartViews(visibleReport(state.report));
      graphs.forEach((graph,index)=>bindChart(graph,scale.views[index],scale.max,changeDay));
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
  return {html,bind,open,cancel,getState:()=>state};
}
