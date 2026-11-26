const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync('FCRM-Chrome-3.3/content.js', 'utf8');
const tree = ts.createSourceFile('content.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = new Map();
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree);
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const metadata = deferred(), main = deferred(), transitions = deferred(), remote = deferred(), links = deferred();
  const requests = [], renders = [];
  const enriched = [];
  const sprint = '#Разработка 17.11-30.11';
  const created = '2026-10-19T18:53:00+0300';
  let status = 'В работе';
  const ctx = { sidebarLoadGeneration:0, sidebarBlockLoading:{}, loadingSidebarTaskKey:null, tasks:[{key:'FCRM-1',summary:'Старое',status:'Backlog'}],
    assigneeSearchQuery:'', customerSearchQuery:'', taskEditRevision:0, issueTransitionsByKey:{},
    CONFIG:{rapidViewId:'9349'}, issueFieldDiscoveryPromise:null, discoveredFields:{}, discoveredCustomerFieldIds:[],
    sprintStateByName:{}, sprintNameById:{}, sprintIdByName:{}, boardOwnedSprintNames:new Set(), closedSprintNames:new Set(), closedSprintIds:new Set(),
    epicNameByKey:{}, formatDate:value=>value,
    fetch:url => { requests.push(url); return url.endsWith('/field') ? metadata.promise : url.includes('/transitions') ? transitions.promise : main.promise; },
    getIssueProjectKey:()=> 'FCRM', loadRemoteIssueLinks:()=>remote.promise,
    ensureProjectComponentsLoaded:async()=>[], renderStructure:()=>renders.push({loading:ctx.loadingSidebarTaskKey, ...ctx.sidebarBlockLoading, summary:ctx.tasks[0].summary}),
    syncStrategyLinks:async()=>{}, syncStrategyIssue:()=>{}, clearTaskOverride:()=>{},
    extractCustomerOwnerFromIssueFields:fields=>({name:fields[ctx.discoveredFields.customer]?.displayName}),
    readStatusName:(v,f)=>v?.name || f, applyLocalOverridesToTasks:x=>x, isCanceledStatus:name=>name === 'Canceled',
    normalizeAndEnrichJiraIssues:([raw],includeCanceled)=>{ enriched.push({status:raw.fields.status.name,includeCanceled}); return links.promise; },
    refreshTaskEpicDetails:async()=>{}, loadFrontDesignRelation:async()=>{}, showSaveToast:()=>{} };
  for (const name of ['discoverJiraIssueFields','getBoardFieldsParam','readJiraEpicKey','resolveIssueSprint','extractCleanSprintName',
    'isFcrmSprintCandidate','isNativeFcrmBoardSprintName','reloadSingleTaskFromJira','resolveRealLinkedIssueSprint','extractAnyRealSprintName']) {
    ctx[name] = vm.runInNewContext('(' + declarations.get(name) + ')',ctx);
  }
  const running = ctx.reloadSingleTaskFromJira('FCRM-1',true,true);
  assert.deepEqual(requests,['/rest/api/2/field','/rest/api/2/issue/FCRM-1/transitions'],'Запрос переходов не ждёт справочника полей');
  const concurrent = ctx.discoverJiraIssueFields();
  metadata.resolve({ok:true,json:async()=>[
    {id:'customfield_821',name:'Sprint',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}},
    {id:'customfield_410',name:'Sprint'},
    {id:'customfield_822',name:'Epic Связь'},
    {id:'customfield_823',name:'Заказчик/Owner'},
  ]});
  await concurrent;
  await tick();
  assert.equal(requests.filter(path => path.endsWith('/field')).length,1);
  const requestedFields = new URL(requests[2], 'https://jira.example').searchParams.get('fields').split(',');
  assert.ok(['customfield_821','customfield_822','customfield_823'].every(id => requestedFields.includes(id)));
  assert.ok(!requestedFields.includes('customfield_410'));
  main.resolve({ok:true,json:async()=>({key:'FCRM-1',fields:{
    summary:'Новое',status:{name:status},components:[],created,
    customfield_821:[{id:117,name:sprint,state:'active',originBoardId:9349}],
    customfield_822:'FCRM-2',customfield_823:{displayName:'Тестовый заказчик'},
  }})});
  await tick(); await tick();
  assert.ok(renders.some(r => !r.loading && !r.desc && r.params && r.links && r.summary === 'Новое'),'Основные данные видны до загрузки переходов и связей');
  assert.equal(ctx.tasks[0].sprint,sprint);
  assert.equal(ctx.tasks[0].epicKey,'FCRM-2');
  assert.equal(ctx.tasks[0].createdAt,created);
  assert.equal(ctx.tasks[0].customer.name,'Тестовый заказчик');
  assert.equal(ctx.resolveRealLinkedIssueSprint({fields:{customfield_821:[{name:'CRM_CORE #96',state:'ACTIVE'}]}}),'CRM_CORE #96');
  links.resolve([{key:'FCRM-1',projectTaskLinks:[],inProjectLinks:[],otherLinks:[]}]); remote.resolve([]);
  await tick(); await tick();
  assert.ok(renders.some(r => !r.loading && r.params && !r.links),'Связи могут отобразиться до переходов');
  transitions.resolve({ok:true,json:async()=>({transitions:[]})});
  await running;
  assert.equal(ctx.loadingSidebarTaskKey,null);
  status = 'Canceled';
  await ctx.reloadSingleTaskFromJira('FCRM-1',true,true);
  assert.equal(ctx.tasks[0].status,'Canceled','Отменённая карточка остаётся доступна в деталях');
  assert.deepEqual(enriched.at(-1),{status:'Canceled',includeCanceled:true});
  assert.equal(requests.filter(path => path.endsWith('/field')).length,1,'Повторное открытие не запрашивает метаданные');
  console.log('Проверка поэтапной загрузки карточки пройдена');
})().catch(error=>{ console.error(error); process.exitCode=1; });
