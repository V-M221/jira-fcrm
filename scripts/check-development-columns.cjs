const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const stored = new Map();
function load(name) {
  const exports = {};
  const source = fs.readFileSync('src/services/' + name + '.ts','utf8');
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(js,{exports,localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)}});
  return exports;
}

const grouping = load('jiraGroupingUi').createJiraGroupingUi();
const {createDevelopmentDashboard} = load('developmentDashboard');
// A depth selected in an old session does not reopen groups in a newly created view.
stored.set('ozon-dev-grouping-v1',JSON.stringify({order:['project','sprint'],depth:2}));
const fresh=()=>createDevelopmentDashboard(()=>{},undefined,undefined,undefined,undefined,'test',undefined,grouping);
const first=fresh();
assert.deepEqual(Array.from(first.getState().grouping),['project','sprint']);
assert.equal(first.getState().depth,0);
first.setDepth(2);
assert.equal(first.getState().depth,2);
assert.equal(fresh().getState().depth,0);
assert.match(grouping.treeToggle(false,'Проект',{'data-group':'work','disabled':''}),/data-group="work" disabled="" aria-expanded="false"/);
assert.match(grouping.progressHtml('Уточняем данные'),/data-progress-indeterminate/);
assert.doesNotMatch(grouping.progressHtml('Уточняем данные'),/aria-valuenow=/);
assert.match(grouping.progressHtml('Страницы',25),/aria-valuenow="25"/);
stored.delete('ozon-dev-grouping-v1');
const setup = () => {
  const dashboard = createDevelopmentDashboard(()=>{},undefined,undefined,undefined,undefined,'test',undefined,grouping);
  const sprint={id:1,name:'Sprint',state:'active'};
  const issue={key:'OB-1',summary:'Issue',project:'OB',status:'Готово',category:'done',points:3,allocations:[3,null,null,null,null,null],links:[]};
  Object.assign(dashboard.getState(),{grouping:['project'],depth:1,loadedSelection:['1'],groups:[{sprint,issues:[issue]}]});
  return dashboard;
};

const actions = ['settings-open','settings-apply','settings-cancel'].map(devAction=>({dataset:{devAction},addEventListener(name,handler){this[name]=handler;}}));
const checkboxes = ['key','status','points',...[0,1,2,3,4,5].map(index=>'metric-'+index)].map(settingsColumn=>({dataset:{settingsColumn},addEventListener(name,handler){this[name]=handler;}}));
const root = {querySelector:()=>null,querySelectorAll:selector=>selector==='[data-dev-action]' ? actions : selector==='[data-settings-column]' ? checkboxes : []};
const click = action => actions.find(button=>button.dataset.devAction===action).click({stopPropagation(){}});
const choose = (id,checked) => {
  const box=checkboxes.find(item=>item.dataset.settingsColumn===id);
  box.checked=checked;
  box.change();
};
const shown = (html,id) => html.includes('data-dev-col="' + id + '"');

stored.set('ozon-dev-columns',JSON.stringify({order:['status','points','key','title']}));
const dashboard=setup();
assert.match(dashboard.html(),/<colgroup><col data-dev-col="key"[^>]*><col data-dev-col="status"/);
assert.match(dashboard.html(),/<th rowspan="2" scope="col" data-column="key">Ключ/);
dashboard.bind(root);
click('settings-open');
assert.match(dashboard.html(),/data-settings-column="key" checked disabled/);
assert.match(dashboard.html(),/data-group-level="key"><span class="ozon-grouping-grip"/);
assert.match(dashboard.html(),/data-settings-column="metric-0" checked/);
choose('key',false);
choose('status',false);
choose('metric-0',false);
assert.ok(shown(dashboard.html(),'status'),'Draft edits do not change the table');
click('settings-cancel');
assert.ok(shown(dashboard.html(),'metric-0'));

const state=dashboard.getState();
state.expandedGroups.add('/project:OB');
click('settings-open');
choose('status',false);
choose('points',false);
choose('metric-0',false);
click('settings-apply');
const partial=dashboard.html();
assert.match(partial,/colspan="5" scope="colgroup"/);
assert.ok(shown(partial,'key') && shown(partial,'metric-1'));
assert.ok(!shown(partial,'status') && !shown(partial,'points') && !shown(partial,'metric-0'));
assert.doesNotMatch(partial,/data-column="(?:status|points|metric-0)"/);
assert.ok(state.expandedGroups.has('/project:OB'),'A column-only edit preserves open groups');
assert.ok(!shown(setup().html(),'status'),'Visibility survives reloading the dashboard');

click('settings-open');
checkboxes.filter(box=>box.dataset.settingsColumn.startsWith('metric-')).forEach(box=>choose(box.dataset.settingsColumn,false));
click('settings-apply');
const noPoints = dashboard.html();
assert.doesNotMatch(noPoints.match(/<thead>.*?<\/thead>/)[0],/rowspan|scope="colgroup"|<\/tr><tr>/);
assert.match(noPoints,/data-column="key"/);
click('settings-open');
choose('points',true);
click('settings-apply');
assert.match(dashboard.html(),/colspan="1" scope="colgroup"/);
console.log('Development column checks passed: draft, cancellation, persistence, SP header spans and tree state.');
