const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('FCRM-Chrome-3.3/content.js', 'utf8');
const tree = ts.createSourceFile('content.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = new Map();
function visit(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) declarations.set(node.name.text, node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree);
function bind(name, context) {
  return vm.runInNewContext('(' + declarations.get(name) + ')', context);
}
const reviewRowClass = bind('fcrmReviewRowClass', {});
for (const status of ['product/design review', ' Product / Design Review ', 'User Testing', 'Продуктовое дизайн-ревью', 'Пользовательское тестирование']) {
  assert.equal(reviewRowClass('FCRM-123', status), ' ozon-fcrm-review');
  assert.equal(reviewRowClass('OB-123', status), '');
}
for (const status of ['Testing', 'Тестирование', 'Код-ревью', 'Готово', '']) {
  assert.equal(reviewRowClass('FCRM-123', status), '');
}

(async () => {
  let componentRequests = 0;
  let available = true;
  const components = {
    CONFIG: { projectKey: 'FCRM' },
    externalProjectComponentsMap: {},
    projectComponentRecords: new Map(),
    projectComponentRequests: new Map(),
    prioritizeFavoriteComponents: names => names,
    fetch: async () => {
      componentRequests++;
      return { ok: available, json: async () => [{ id: '12', name: 'CS' }] };
    }
  };
  components.fetchProjectComponents = bind('fetchProjectComponents', components);
  const choices = bind('ensureProjectComponentsLoaded', components);
  const creation = bind('loadIssueCreateComponents', components);
  const [names, records] = await Promise.all([choices('OB'), creation('ob')]);
  assert.ok(names.includes('CS'));
  assert.equal(records[0].id, '12');
  await creation('OB');
  assert.equal(componentRequests, 1, 'Opening two component selectors must share one request');
  available = false;
  await assert.rejects(creation('FTD'));
  available = true;
  assert.equal((await creation('FTD'))[0].id, '12');
  assert.equal(componentRequests, 3);

  const offsets = [];
  let failedOffset = -1;
  const pages = bind('fetchPaginatedIssues', {
    fetch: async url => {
      const params = new URL(url, 'https://jira.example').searchParams;
      const offset = Number(params.get('startAt'));
      const count = Math.min(40, Number(params.get('maxResults')), 200 - offset);
      offsets.push([offset, count]);
      return { ok: offset !== failedOffset, json: async () => ({
        total: 200, issues: Array.from({ length: count }, (_, index) => offset + index)
      }) };
    }
  });
  const progress = [];
  const result = await pages('/issues?fields=status', 95, count => progress.push(count));
  assert.ok(result.ok);
  assert.deepEqual(Array.from(result.issues), Array.from({ length: 95 }, (_, i) => i));
  assert.deepEqual(offsets, [[0, 40], [40, 40], [80, 15]]);
  assert.deepEqual(progress, [40, 95]);
  failedOffset = 40;
  assert.equal((await pages('/issues', 95)).ok, false);
  // Opening a toolbar dropdown must not depend on the sidebar select's local renderer.
  const filterContext = { productDashboardLoaded: true, isInitialBoardLoading: false, activeToolbarFilter: '', toolbarFilterSearch: '', escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') };
  filterContext.getStatusCategoryClass = bind('getStatusCategoryClass',{categoryByStatus:new Map([['CRM <Core>','done']])});
  filterContext.renderBadge = (label,category)=>'<span class="ozon-ext-badge-' + category + '">' + label + '</span>';
  filterContext.getStatusBadgeHtml = bind('getStatusBadgeHtml',filterContext);
  filterContext.getJiraIssueTypeIconSvg = bind('getJiraIssueTypeIconSvg',filterContext);
  filterContext.projectIssueTypesList = [{name:'История',iconUrl:'/jira/types/story.svg'}];
  filterContext.location = new URL('https://jit.o3.ru/secure/RapidBoard.jspa');
  filterContext.URL = URL;
  filterContext.getJiraIssueTypeIconHtml = bind('getJiraIssueTypeIconHtml',filterContext);
  const typeBadge = bind('getIssueTypeBadgeHtml',filterContext);
  assert.match(typeBadge('История'), /src="https:\/\/jit\.o3\.ru\/jira\/types\/story\.svg"/);
  assert.match(typeBadge('История','/jira/types/custom.svg'), /src="https:\/\/jit\.o3\.ru\/jira\/types\/custom\.svg"/);
  assert.doesNotMatch(typeBadge('История','https://example.com/icon.svg'), /example\.com/);
  const renderFilter = bind('renderToolbarFilter', filterContext);
  for (const id of ['component', 'epic', 'status', 'issue-type', 'sprint-state', 'sort']) {
    filterContext.activeToolbarFilter = id;
    filterContext.toolbarFilterSearch = '';
    const options = [{ value: 'all', label: 'Все' }, { value: 'one', label: 'CRM <Core>' }];
    const html = renderFilter(id, 'Фильтр', 'all', options, 'Поиск');
    assert.ok(html.includes('aria-expanded="true"'));
    assert.ok(html.includes('CRM &lt;Core&gt;'));
    if (id === 'status') assert.ok(html.includes('ozon-ext-badge-done'));
    if (id === 'issue-type') assert.match(html,/ozon-ext-filter-icon[^>]*><svg/);
    filterContext.toolbarFilterSearch = 'core';
    assert.ok(renderFilter(id, 'Фильтр', 'all', options).includes('data-value="one"'));
    filterContext.toolbarFilterSearch = 'no matching value';
    assert.ok(renderFilter(id, 'Фильтр', 'all', options).includes('Ничего не найдено'));
  }
  const statusContext = { doneByStatus: new Map(), categoryByStatus: new Map() };
  const selectContext = {
    activeSearchSelectId: 'table-sprint-FCRM-1', searchSelectQuery: '',
    escapeHtml: filterContext.escapeHtml,
    getSprintStateBadgeHtml: () => '<span class="ozon-ext-badge ozon-ext-badge-done">Активный</span>'
  };
  const sprintSelect = bind('renderSearchSelect', selectContext)('table-sprint-FCRM-1', 'Sprint 43', [{ value: 'Sprint 43', label: 'Sprint 43 (Активный)' }], 'Поиск');
  assert.ok(sprintSelect.includes('ozon-ext-badge-done'));
  assert.ok(!sprintSelect.includes('(Активный)'));
  const columns = source.slice(source.indexOf('const DEFAULT_COLUMNS_META = ['), source.indexOf('const DEFAULT_COLUMN_ORDER'));
  assert.ok(!columns.includes("key: 'projectTask'"));
  assert.ok(!columns.includes("key: 'inProject'"));
  const read = bind('readStatusName', statusContext);
  const category = bind('getStatusCategoryClass', statusContext);
  read({ name: 'Custom workflow state', statusCategory: { key: 'indeterminate' } });
  assert.equal(category('Custom workflow state'), 'progress');
  read({ name: 'Custom workflow state', statusCategory: { key: 'done' } });
  assert.equal(category('Custom workflow state'), 'done');
  assert.equal(category('К выполнению'), 'todo');

  const indicatorsContext = {
    escapeHtml: filterContext.escapeHtml,
    isCanceledStatus: name => name === 'Отменено',
    isDoneTask: bind('isDoneTask', statusContext),
    getLinkedProjectGroupMeta: () => ({ iconSvg: '<svg></svg>' })
  };
  const indicators = bind('renderDeliveryIndicators', indicatorsContext);
  const mixed = indicators({ inProjectLinks: [
    { key: 'OBFRONT-1', status: 'Готово' }, { key: 'OBFRONT-2', status: 'В работе' },
    { key: 'OB-1', status: 'Закрыто' }, { key: 'FTD-1', status: 'Отменено' }
  ] });
  assert.ok(mixed.includes('Фронтенд: есть незакрытые задачи'));
  assert.ok(mixed.includes('Бэкенд: все задачи закрыты'));
  assert.ok(mixed.includes('Дизайн: нет задач'));
  assert.equal((indicators({}).match(/indicator absent/g) || []).length, 3);
  const missingCustomer = bind('renderMissingCustomerIndicator', {});
  assert.equal(missingCustomer({ issueTypeName:'Ошибка' }), '');
  assert.equal(missingCustomer({ issueTypeName:'Bug', customer:{ name:'Не указан' } }), '');
  assert.ok(missingCustomer({ issueTypeName:'Задача', customer:{ name:'Не указан' } }).includes('Нет заказчика'));
  assert.equal(missingCustomer({ issueTypeName:'Задача', customer:{ name:'Анна' } }), '');
  assert.ok(!declarations.has('renderTaskProjectGeneration'));
  assert.ok(!declarations.get('renderSingleTaskRowAndSubrows').includes('data-action="generate-links"'));
  assert.ok(declarations.get('buildSidebarHtml').includes('data-action="generate-links"'));
  const treeContext = { tasks: [{ key: 'FCRM-1', sprint: 'Sprint 1', component: 'CS' }, { key: 'FCRM-2', component: 'Core' }], getAllSprintOptions: () => ['Sprint 1'], groupByComponentInsideSprint: true };
  const applyLevel = bind('applyTableTreeLevel', treeContext);
  applyLevel('links');
  assert.equal(treeContext.expandedSubRows['FCRM-1'], true);
  assert.equal(treeContext.expandedComponents['Бэклог FCRM::Core'], true);
  applyLevel('components');
  assert.equal(treeContext.expandedSprints['Sprint 1'], true);
  assert.equal(Object.keys(treeContext.expandedComponents).length, 0);
  applyLevel('tasks');
  assert.equal(treeContext.expandedComponents['Sprint 1::CS'], true);
  assert.equal(Object.keys(treeContext.expandedSubRows).length, 0);
  applyLevel('sprints');
  assert.equal(Object.keys(treeContext.expandedSprints).length, 0);
  const summary = bind('renderStatusSummary', { escapeHtml: filterContext.escapeHtml, getStatusCategoryClass: category })([{ status: 'Готово' }, { status: 'Готово' }, { status: 'В работе' }]);
  assert.ok(summary.includes('Готово · 2'));
  assert.ok(summary.includes('В работе · 1'));
  const typeContext = { productDashboardLoaded: true, tasks: [{ issueTypeName: 'Ошибка', status: 'Готово' }, { issueTypeName: 'Эпик', status: 'В работе' }], searchQuery: '', filterIssueType: 'Ошибка', filterComponent: 'all', filterEpic: 'all', filterStatus: 'all', filterSprintState: 'all', hideDone: false, isDoneTask: indicatorsContext.isDoneTask, isCanceledStatus: indicatorsContext.isCanceledStatus };
  assert.equal(bind('getFilteredTasks', typeContext)().filtered.length, 1);
  typeContext.filterIssueType = 'all';
  assert.equal(bind('getFilteredTasks', typeContext)().filtered.length, 2);

  const requests = [];
  const obprojectLoads = [];
  const context = {
    tasks: [{ key: 'FCRM-1', epicKey: 'FCRM-225', issueTypeName: 'История', epicName: 'Old title' }],
    epicNameByKey: {}, epicStatusByKey: {}, cacheEpicMetadata: () => {},
    isEpicIssueType: name => name === 'Эпик', readStatusName: read,
    loadEpicObprojectDetails: async (...args) => obprojectLoads.push(args),
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ fields: { summary: 'Updated epic', status: { name: 'Готово' }, customfield_20100: 'OBPROJECT-5143' } }) };
    }
  };
  const refresh = bind('refreshTaskEpicDetails', context);
  await refresh('FCRM-1', { fields: {} });
  assert.match(requests[0].url, /fields=summary,status,customfield_20100/);
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(context.tasks[0].epicName, 'Updated epic');
  assert.equal(context.epicStatusByKey['FCRM-225'], 'Готово');
  assert.deepEqual(obprojectLoads[0], ['FCRM-225', 'OBPROJECT-5143']);
  context.tasks = [{ key: 'FCRM-225', issueTypeName: 'Эпик' }];
  await refresh('FCRM-225', { fields: { customfield_20100: 'OBPROJECT-999' } });
  assert.deepEqual(obprojectLoads[1], ['FCRM-225', 'OBPROJECT-999']);
  assert.equal(requests.length, 1);

  const batchRequests = [];
  const batchContext = {
    epicNameByKey: {}, epicStatusByKey: {}, epicLabelsByKey: {}, epicObprojectByFcrmEpicKey: {}, readStatusName: read,
    fetch: async url => {
      batchRequests.push(url);
      return { ok:true, json:async () => ({ issues:[{ key:'OBPROJECT-5143', fields:{ summary:'Shared product epic', status:{ name:'В работе' } } }] }) };
    }
  };
  bind('cacheEpicMetadata', batchContext)([
    { key:'FCRM-225', fields:{ summary:'First epic', labels:['fcrm_umb_epic'], status:{ name:'Готово' }, customfield_20100:'OBPROJECT-5143' } },
    { key:'FCRM-226', fields:{ summary:'Second epic', labels:[], status:{ name:'В работе' }, customfield_20100:{ key:'OBPROJECT-5143' } } },
    { key:'FCRM-227', fields:{ customfield_20100:'OBPROJECT-5999' } }
  ]);
  const renderTag = bind('renderEpicProjectTag', batchContext);
  assert.equal(renderTag('FCRM-225'), '');
  assert.equal(renderTag('FCRM-226'), '');
  assert.equal(renderTag('FCRM-unknown'), '');
  const loadBatch = bind('loadTableObprojectMetadata', batchContext);
  await loadBatch(new Set(['FCRM-225','FCRM-226']));
  assert.equal(batchRequests.length, 1);
  assert.equal(batchContext.epicObprojectByFcrmEpicKey['FCRM-225'].status, 'В работе');
  assert.equal(batchContext.epicObprojectByFcrmEpicKey['FCRM-226'].summary, 'Shared product epic');
  assert.ok(!decodeURIComponent(batchRequests[0]).includes('OBPROJECT-5999'));

  const strictContext = {
    discoveredIssueLinkTypes: [{ name: 'Relates', inward: 'relates to', outward: 'relates to' }],
    loadIssueLinkTypes: async () => {},
    fetch: async () => { throw Error('A wrong relation must never be posted'); }
  };
  await assert.rejects(bind('createIssueLinkInJira', strictContext)('FCRM-1', 'OB-1', 'inProject', true), /не найден тип связи/);
  const fields = bind('getBoardFieldsParam', { discoveredFields: {}, discoveredCustomerFieldIds: [] })();
  assert.ok(decodeURIComponent(fields).split(',').includes('labels'));
  // A picker near the lower/right screen edge must stay reachable.
  const style={values:{},setProperty(name,value){this.values[name]=value;}};
  let closed=false,closeButton;
  const popover={querySelector:()=>null,parentElement:{querySelector:()=>({getBoundingClientRect:()=>({left:1240,top:790,bottom:820,width:140})})},style,scrollHeight:310,prepend(button){closeButton=button;}};
  const position=bind('positionSidebarPickers',{window:{innerWidth:1363,innerHeight:884},document:{createElement:()=>({setAttribute(){},style:{},addEventListener(name,handler){this.click=handler;}})},closeSidebarPickers:()=>{closed=true;}});
  position({querySelector:()=>null,querySelectorAll:()=>[popover]});
  assert.ok(parseFloat(style.values.left)>=12 && parseFloat(style.values.left)+parseFloat(style.values.width)<=1351);
  assert.ok(parseFloat(style.values.top)>=12 && parseFloat(style.values.top)+Math.min(310,parseFloat(style.values['max-height']))<=872);
  closeButton.click({stopPropagation(){}});assert.ok(closed,'Visible close action must dismiss the picker');
  console.log('Sidebar refresh checks passed: fresh epic title/OBPROJECT, Jira status categories, strict relation type, labels.');
})().catch(error => { console.error(error); process.exitCode = 1; });
