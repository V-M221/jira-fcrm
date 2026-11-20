import type { createSprintReportModel } from './sprintReportModel';

// Serialized into content.js. Receives its model and the local board list from the host.
export function createSprintReportDashboard(onRender:()=>void, model:ReturnType<typeof createSprintReportModel>, boards:{id:string;name:string}[], configuredSprintField:string) {
  type Report = ReturnType<typeof model.build>;
  const state = {board:boards[0].id,sprint:'',sprints:[] as any[],report:null as Report | null, section:'days',day:'',query:'',limit:60,
    scopeFilter:'all',loading:'',error:'',sprintFailed:false};
  try {
    const saved = JSON.parse(localStorage.getItem('ozon-sprint-report-v1') || 'null');
    if (saved && boards.some(board => board.id === saved.board)) {
      state.board = saved.board;
      state.sprint = String(saved.sprint || '');
    }
  } catch (_) { /* Selection remains available for this visit. */ }
  let controller:AbortController | null = null;
  let generation = 0;
  let hasOpened = false;
  let updatedAt = 0;
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
  const remember = () => { try { localStorage.setItem('ozon-sprint-report-v1',JSON.stringify({board:state.board,sprint:state.sprint})); } catch (_) {} };

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
  }

  async function chooseBoard(board:string, preferred = '', force = false) {
    if (!boards.some(option => option.id === board)) return;
    cancel();
    const request = generation;
    controller = new AbortController();
    const signal = controller.signal;
    state.board = board; state.sprint = preferred; state.sprints = []; state.report = null;
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
      const estimate = configuration?.estimation?.field;
      const pointsField = /^customfield_\d+$/.test(estimate?.fieldId || '') ? estimate.fieldId : '';
      const pointsName = estimate?.displayName || (Array.isArray(fields) ? fields : []).find(field => field.id === pointsField)?.name || 'Story Points';
      const lastColumn = (configuration?.columnConfig?.columns || []).filter((column:any) => column.statuses?.length).at(-1);
      const doneIds = (lastColumn?.statuses || []).map((status:any) => String(status.id));
      const fieldList = [...new Set(['summary','created','status','issuetype','sprint','closedSprints',currentField,pointsField].filter(Boolean))].join(',');
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
      state.report = model.build({sprint,scope,issues:[...issues.values()],sprintField:currentField,pointsField,pointsName,doneIds});
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

  const count = (report:Report, predicate:(row:any)=>boolean) => report.rows.filter(predicate).length;
  const positive = (n:number) => n > 0 ? '+' + amount(n) : amount(n);
  const spinner = () => '<span class="ozon-ext-spinner" aria-hidden="true"></span>';
  const linkToJira = () => '/secure/RapidBoard.jspa?rapidView=' + encodeURIComponent(state.board) + '&view=reporting&chart=sprintRetrospective&sprint=' + encodeURIComponent(state.sprint);
  function overview(report:Report) {
    const m = report.metrics;
    const unit = report.pointsName === 'Story Points' || /^(story points?|стори[ -]поинты)$/i.test(report.pointsName) ? ' SP' : '';
    const metric = (value:number) => report.pointsField ? amount(value) + unit : '—';
    const cards = [
      ['План на старте',metric(m.planned),taskCount(count(report,row=>row.started)) + ' · ' + m.unestimated + ' без оценки','start'],
      ['Добавили',metric(m.added),taskCount(count(report,row=>row.added)),'scope'],
      ['Убрали',metric(m.removed),taskCount(count(report,row=>row.removed)),'scope'],
      ['Сожгли за спринт',metric(m.burned),m.completed + ' завершено к концу периода','days'],
      [report.closed ? 'Осталось к закрытию' : 'Осталось сейчас',metric(m.remaining),taskCount(count(report,row=>row.memberAtEnd && !row.doneAtEnd)),'finish']
    ];
    return '<div class="ozon-report-cards">' + cards.map(([label,value,detail,target]) => '<button type="button" class="ozon-report-card" data-report-section="' + target + '"><span>' + escape(label) + '</span><strong>' + escape(value) + '</strong><small>' + escape(detail) + '</small></button>').join('') + '</div>';
  }

  function chart(report:Report) {
    if (!report.pointsField || !report.days.length) return '';
    const width=960, height=182, left=48, right=18, top=12, bottom=34;
    const max = Math.max(1,report.metrics.planned,...report.days.map(day=>Math.max(day.scope,day.remaining)));
    const x = (index:number) => left + (width-left-right)*index/Math.max(report.days.length,1);
    const y = (value:number) => top + (height-top-bottom)*(1-value/max);
    const path = (baseline:number,key:'scope'|'remaining') => [x(0) + ',' + y(baseline),...report.days.map((day,index)=>x(index+1) + ',' + y(day[key]))].join(' ');
    const grid = Array.from({length:5},(_,index)=> {
      const value=max*index/4, row=y(value);
      return '<line x1="' + left + '" y1="' + row + '" x2="' + (width-right) + '" y2="' + row + '"/><text x="' + (left-10) + '" y="' + (row+4) + '" text-anchor="end">' + escape(amount(value)) + '</text>';
    }).join('');
    const labels = report.days.map((day,index) => ({day,index})).filter(({index}) => index === 0 || index === report.days.length-1 || index % Math.ceil(report.days.length/6) === 0);
    const selected = report.days.findIndex(day=>day.date===state.day);
    return '<div class="ozon-report-graph"><svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="График общего объёма и оставшейся работы по дням"><g class="ozon-report-grid">' + grid + labels.map(({day,index}) => '<text x="' + x(index+1) + '" y="' + (height-14) + '" text-anchor="' + (index === report.days.length-1 ? 'end' : 'middle') + '">' + escape(dayLabel(day.date)) + '</text>').join('') + '</g>' +
      '<polyline class="ozon-report-line-scope" points="' + path(report.metrics.planned,'scope') + '"/><polyline class="ozon-report-line-remaining" points="' + path(report.metrics.initialRemaining,'remaining') + '"/>' +
      (selected < 0 ? '' : '<line class="ozon-report-line-selected" x1="' + x(selected+1) + '" x2="' + x(selected+1) + '" y1="' + top + '" y2="' + (height-bottom) + '"/><circle cx="' + x(selected+1) + '" cy="' + y(report.days[selected].remaining) + '" r="5" fill="#005bff"/>') + '</svg></div><div class="ozon-report-legend"><span>Осталось работы</span><span>Объём спринта</span><small>' + escape(report.pointsName) + ' · конец дня, МСК</small></div>';
  }

  const choices = [{id:'days',title:'По дням'},{id:'start',title:'На старте'},{id:'scope',title:'Изменения состава'},{id:'finish',title:'Итоги'}];
  const pointsCell = (value:number | null) => value == null ? '—' : escape(amount(value));
  function daily(report:Report) {
    const selected = report.days.find(day => day.date === state.day) || report.days[0];
    const dayIndex = report.days.indexOf(selected);
    const titles = new Map(report.rows.map(row => [row.key,row.summary]));
    const changes = selected?.changes || [];
    const row = (change:Report['events'][number]) => {
      const facts = [
        change.added ? 'Добавлена' : change.removed ? 'Убрана' : '',
        change.statusChanged ? (change.before.status.name || '—') + ' → ' + (change.after.status.name || '—') : '',
        change.estimateChanged ? 'Оценка: ' + pointsCell(change.before.points) + ' → ' + pointsCell(change.after.points) : ''
      ].filter(Boolean);
      return '<tr><td>' + timeFormat.format(change.at) + '</td><td>' + issueLink(change.key) + '</td><td>' + escape(titles.get(change.key) || '') + '</td><td>' + facts.map(escape).join('<br>') + '</td>' +
        (report.pointsField ? '<td>' + (change.burned === 0 ? '—' : escape(positive(change.burned))) + '</td>' : '') + '</tr>';
    };
    const completed = changes.reduce((sum,change) => sum + Math.max(change.burned,0),0);
    const reopened = changes.reduce((sum,change) => sum + Math.max(-change.burned,0),0);
    const step = (delta:number,label:string,icon:string) => '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-report-day-step="' + delta + '" aria-label="' + label + '"' + (!report.days[dayIndex+delta] ? ' disabled' : '') + '>' + icon + '</button>';
    return '<section class="ozon-report-panel"><h2>Ход спринта</h2><div class="ozon-report-daybar"><label for="ozon-report-day">Дата</label>' + step(-1,'Предыдущий день','‹') + '<select id="ozon-report-day">' + report.days.map(day=>'<option value="' + day.date + '"' + (day === selected ? ' selected' : '') + '>' + escape(dayLabel(day.date)) + ' · ' + eventCount(day.changes.length) + '</option>').join('') + '</select>' + step(1,'Следующий день','›') +
      (selected && report.pointsField ? '<span>Сожгли за день: <strong>' + escape(amount(completed)) + '</strong>' + (reopened ? ' · Вернули при переоткрытии: <strong>' + escape(amount(reopened)) + '</strong>' : '') + ' · Остаток: <strong>' + escape(amount(selected.remaining)) + '</strong></span>' : '') + '</div>' + chart(report) +
      (changes.length ? '<div class="ozon-report-table-wrap"><table><thead><tr><th>МСК</th><th>Ключ</th><th>Задача</th><th>Что изменилось</th>' + (report.pointsField ? '<th>Сожгли</th>' : '') + '</tr></thead><tbody>' + changes.slice(0,state.limit).map(row).join('') + '</tbody></table></div>' + more(changes.length) : '<p class="ozon-report-empty">В этот день изменений не было.</p>') +
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
    return '<section class="ozon-report-panel"><h2>' + title + '</h2>' + note + '<div class="ozon-report-tools"><input id="ozon-report-search" type="search" placeholder="Ключ или название задачи" aria-label="Поиск задачи в списке" value="' + escape(state.query) + '">' +
      (filters.length ? '<label class="ozon-report-filter">Показать <select id="ozon-report-scope-filter">' + filters.map(filter=>'<option value="' + filter.id + '"' + (state.scopeFilter === filter.id ? ' selected' : '') + '>' + filter.name + '</option>').join('') + '</select></label>' : '') + '<span>' + taskCount(filtered.length) + '</span></div>' +
      (filtered.length ? '<div class="ozon-report-table-wrap"><table><thead><tr><th>Ключ</th><th>Задача</th><th>' + (isScope ? 'Изменение' : 'Статус') + '</th>' +
        (report.pointsField ? '<th>' + escape(report.pointsName || 'Оценка') + '</th>' : '') + '</tr></thead><tbody>' + filtered.slice(0,state.limit).map(row).join('') + '</tbody></table></div>' + more(filtered.length) : '<p class="ozon-report-empty">Задач нет.</p>') + '</section>';
  }

  function html() {
    const report = state.report;
    const selected = state.sprints.find(sprint=>String(sprint.id)===state.sprint);
    const active = state.sprints.filter(sprint=>sprint.state==='active');
    const closed = state.sprints.filter(sprint=>sprint.state==='closed');
    const optGroup = (name:string,list:any[]) => list.length ? '<optgroup label="' + name + '">' + list.map(sprint=>'<option value="' + escape(sprint.id) + '"' + (sprint === selected ? ' selected' : '') + '>' + escape(sprint.name) + '</option>').join('') + '</optgroup>' : '';
    return '<section class="ozon-report" aria-label="Отчёт по спринту"><header class="ozon-ext-header-bar"><strong>Отчёт по спринту</strong></header><div class="ozon-report-scroll"><div class="ozon-report-inner">' +
      '<div class="ozon-report-toolbar"><label for="ozon-report-board">Доска<select id="ozon-report-board">' + boards.map(board=>'<option value="' + escape(board.id) + '"' + (state.board === board.id ? ' selected' : '') + '>' + escape(board.name) + '</option>').join('') + '</select></label>' +
      '<label for="ozon-report-sprint">Спринт<select id="ozon-report-sprint"' + (!state.sprints.length ? ' disabled' : '') + '>' + (state.sprints.length ? optGroup('Активные',active) + optGroup('Закрытые',closed) : '<option>Нет спринтов</option>') + '</select></label>' +
      '<button type="button" class="ozon-ext-btn" data-report-refresh' + (state.loading ? ' disabled' : '') + '>' + (state.error ? 'Повторить' : 'Обновить отчёт') + '</button>' +
      (selected ? '<a class="ozon-ext-btn ozon-ext-btn-surface" href="' + escape(linkToJira()) + '" target="_blank" rel="noopener noreferrer">Отчёт в Jira ↗</a>' : '') + '</div>' +
      (state.loading ? '<div class="ozon-report-banner" role="status">' + spinner() + escape(state.loading) + '</div>' : '') +
      (state.error ? '<div class="ozon-report-banner ozon-report-warning" role="alert">' + escape(state.error) + '</div>' : '') +
      (report ? '<div class="ozon-report-period"><strong>' + escape(selected?.name || '') + '</strong><span>' + (report.closed ? 'Закрыт' : 'Активный') + ' · ' + shortDate(report.start) + ' — ' + shortDate(report.end) + ' · МСК</span></div>' +
        (report.warnings.length ? '<ul class="ozon-report-warning">' + report.warnings.map(warning=>'<li>' + escape(warning) + '</li>').join('') + '</ul>' : '') +
        overview(report) + '<div class="ozon-report-sections" role="group" aria-label="Разделы отчёта">' + choices.map(choice=>'<button type="button" class="ozon-ext-btn ' + (state.section === choice.id ? '' : 'ozon-ext-btn-surface') + '" data-report-section="' + choice.id + '" aria-pressed="' + (state.section === choice.id) + '">' + choice.title + '</button>').join('') + '</div>' +
        (state.section==='days' ? daily(report) : taskList(report)) : state.loading || state.error ? '' : '<p class="ozon-report-empty">На доске нет активных или закрытых спринтов.</p>') + '</div></div></section>';
  }

  function bind(root:HTMLElement) {
    const section = root.querySelector('.ozon-report');
    if (!section) return;
    section.querySelector<HTMLSelectElement>('#ozon-report-board')?.addEventListener('change',event => { state.day=''; state.limit=60; state.query=''; state.scopeFilter='all'; void chooseBoard((event.target as HTMLSelectElement).value); });
    section.querySelector<HTMLSelectElement>('#ozon-report-sprint')?.addEventListener('change',event => {
      state.sprint=(event.target as HTMLSelectElement).value; state.report=null; state.day=''; state.limit=60; state.query=''; state.scopeFilter='all';
      void loadReport();
    });
    section.querySelector('[data-report-refresh]')?.addEventListener('click',() => { if (state.sprintFailed || !state.sprint) void chooseBoard(state.board,state.sprint,true); else void loadReport(); });
    section.querySelectorAll<HTMLButtonElement>('[data-report-section]').forEach(button => button.addEventListener('click',() => {
      const target=button.dataset.reportSection!;
      if (state.section===target && !button.classList.contains('ozon-report-card')) return;
      state.section=target; state.query=''; state.limit=60; state.scopeFilter='all';
      if (button.classList.contains('ozon-report-card') && target === 'scope') state.scopeFilter=button.textContent?.startsWith('Добавили') ? 'added' : 'removed';
      onRender();
      root.querySelector<HTMLButtonElement>('.ozon-report-sections [data-report-section="' + target + '"]')?.focus({preventScroll:true});
    }));
    section.querySelector<HTMLSelectElement>('#ozon-report-day')?.addEventListener('change',event => { state.day=(event.target as HTMLSelectElement).value; state.limit=60; onRender(); root.querySelector<HTMLElement>('#ozon-report-day')?.focus({preventScroll:true}); });
    section.querySelectorAll<HTMLButtonElement>('[data-report-day-step]').forEach(button => button.addEventListener('click', () => {
      const days = state.report?.days || [];
      const day = days[days.findIndex(day => day.date === state.day) + Number(button.dataset.reportDayStep)];
      if (!day) return;
      state.day=day.date; state.limit=60;
      onRender();
      const next = root.querySelector<HTMLButtonElement>('[data-report-day-step="' + button.dataset.reportDayStep + '"]');
      (next?.disabled ? root.querySelector<HTMLElement>('#ozon-report-day') : next)?.focus({preventScroll:true});
    }));
    section.querySelector<HTMLSelectElement>('#ozon-report-scope-filter')?.addEventListener('change',event => { state.scopeFilter=(event.target as HTMLSelectElement).value; state.limit=60; onRender(); root.querySelector<HTMLElement>('#ozon-report-scope-filter')?.focus({preventScroll:true}); });
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
