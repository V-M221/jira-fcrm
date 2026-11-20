const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync('FCRM-Chrome-3.3/content.js', 'utf8');
const tree = ts.createSourceFile('content.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
let declaration;
function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'reloadSingleTaskFromJira') declaration = node.getText(tree); ts.forEachChild(node, visit); }
visit(tree);
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const main = deferred(), transitions = deferred(), remote = deferred(), links = deferred();
  const requests = [], renders = [];
  const ctx = { sidebarLoadGeneration:0, sidebarBlockLoading:{}, loadingSidebarTaskKey:null, tasks:[{key:'FCRM-1',summary:'Старое',status:'Backlog'}],
    assigneeSearchQuery:'', customerSearchQuery:'', taskEditRevision:0, issueTransitionsByKey:{},
    fetch:url => { requests.push(url); return url.includes('/transitions') ? transitions.promise : main.promise; },
    getBoardFieldsParam:()=>'summary', getIssueProjectKey:()=> 'FCRM', loadRemoteIssueLinks:()=>remote.promise,
    ensureProjectComponentsLoaded:async()=>[], renderStructure:()=>renders.push({loading:ctx.loadingSidebarTaskKey, ...ctx.sidebarBlockLoading, summary:ctx.tasks[0].summary}),
    syncStrategyLinks:async()=>{}, syncStrategyIssue:()=>{}, clearTaskOverride:()=>{}, extractCustomerOwnerFromIssueFields:()=>({}),
    resolveIssueSprint:()=>'', readStatusName:(v,f)=>v?.name || f, applyLocalOverridesToTasks:x=>x, isCanceledStatus:()=>false,
    normalizeAndEnrichJiraIssues:()=>links.promise, refreshTaskEpicDetails:async()=>{}, loadFrontDesignRelation:async()=>{}, showSaveToast:()=>{} };
  const load = vm.runInNewContext('(' + declaration + ')',ctx);
  const running = load('FCRM-1',true,true);
  assert.equal(requests.length,2,'Основная задача и переходы запрашиваются параллельно');
  main.resolve({ok:true,json:async()=>({key:'FCRM-1',fields:{summary:'Новое',status:{name:'В работе'},components:[]}})});
  await tick(); await tick();
  assert.ok(renders.some(r => !r.loading && !r.desc && r.params && r.links && r.summary === 'Новое'),'Основные данные видны до загрузки переходов и связей');
  links.resolve([{key:'FCRM-1',projectTaskLinks:[],inProjectLinks:[],otherLinks:[]}]); remote.resolve([]);
  await tick(); await tick();
  assert.ok(renders.some(r => !r.loading && r.params && !r.links),'Связи могут отобразиться до переходов');
  transitions.resolve({ok:true,json:async()=>({transitions:[]})});
  await running;
  assert.equal(ctx.loadingSidebarTaskKey,null);
  console.log('Проверка поэтапной загрузки карточки пройдена');
})().catch(error=>{ console.error(error); process.exitCode=1; });
