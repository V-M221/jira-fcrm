const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(name, globals = {}) {
  const exports = {};
  const source = fs.readFileSync('src/services/' + name + '.ts', 'utf8');
  vm.runInNewContext(ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText,{exports,...globals});
  return exports;
}

const model = load('sprintReportModel').createSprintReportModel();
const sprint = {id:7,name:'Test 7',state:'closed',startDate:'2026-10-19T09:00:00+03:00',completeDate:'2026-10-23T18:00:00+03:00'};
const done = {id:'4',name:'Delivered',statusCategory:{key:'done'}};
const progress = {id:'3',name:'In Progress',statusCategory:{key:'indeterminate'}};
const day = (date,items) => ({created:date,items});
const status = (from,to) => ({field:'Status',from:from.id,fromString:from.name,to:to.id,toString:to.name});
const sprintChange = (from,to) => ({field:'Sprint',from,to});
const issue = (key,points,member,current,histories) => ({key,fields:{
  summary:'Issue ' + key,created:'2026-10-13T10:00:00+03:00',status:current,customfield_1:points,customfield_2:member ? [sprint] : []
},changelog:{histories,total:histories.length}});
const issues = [
  // Closed within the sprint, then reopened later. Post-sprint status/estimate must not leak into this report.
  issue('TEST-1',8,true,progress,[
    day('2026-10-20T19:00:00+03:00',[status(progress,done)]),
    day('2026-10-26T12:00:00+03:00',[status(done,progress),{field:'Story Points',from:'5',to:'8'}])
  ]),
  // Added after start, then finished, then reopened. The return offsets the earlier burn.
  issue('TEST-2',3,true,progress,[
    day('2026-10-19T20:00:00+03:00',[sprintChange(null,'7')]),
    day('2026-10-20T21:20:00Z',[status(progress,done)]),
    day('2026-10-22T08:00:00+03:00',[status(done,progress)])
  ]),
  issue('TEST-3',2,false,progress,[day('2026-10-22T10:00:00+03:00',[sprintChange('7',null)])]),
  // Jira moved the issue during completion. It must be reported as carryover, not as a mid-sprint removal.
  issue('TEST-4',5,false,progress,[
    day('2026-10-20T13:00:00+03:00',[{fieldId:'customfield_1',from:'2',to:'5'}]),
    day('2026-10-23T17:59:52+03:00',[sprintChange('7','8')])
  ])
];
issues[0].fields.project = {key:'OB'};
issues[0].fields.customfield_3 = 'OBPROJECT-1';
issues[0].fields.customfield_24000 = {value:'Стрим 2'};
issues[1].fields.project = {key:'OBFRONT'};
issues[1].fields.customfield_24000 = {value:'Стрим 1'};
issues[2].fields.project = {key:'OB'};
issues[3].fields.project = {key:'OBFRONT'};
issues[3].fields.epic = {key:'OBPROJECT-2',name:'Имя эпика из задачи'};
const ref = key => ({key});
const scope = model.nativeScope({contents:{
  completedIssues:[ref('TEST-1')],issuesNotCompletedInCurrentSprint:[ref('TEST-2'),ref('TEST-4')],
  issuesCompletedInAnotherSprint:[],puntedIssues:[ref('TEST-3')],issueKeysAddedDuringSprint:{'TEST-2':true}
}});
const epics = new Map([['OBPROJECT-1',{summary:'Название эпика',customfield_24000:{value:'Стрим 3'}}]]);
const input = {sprint,scope,issues,pointsField:'customfield_1',sprintField:'customfield_2',pointsName:'Story Points',doneIds:['4'],epicField:'customfield_3',epics};
const report = model.build(input);
assert.equal(report.warnings.length,0);
assert.equal(report.metrics.planned,9);
assert.equal(report.metrics.added,3);
assert.equal(report.metrics.removed,2);
assert.equal(report.metrics.estimateDelta,3);
assert.equal(report.metrics.estimatedTasks,1);
assert.equal(report.metrics.burned,5);
assert.equal(report.metrics.remaining,8);
assert.equal(report.metrics.carry,2);
assert.equal(report.metrics.completed,1);
assert.equal(report.metrics.completedPoints,5);
assert.equal(report.metrics.plannedCompleted,1);
assert.equal(report.rows.find(row=>row.key==='TEST-1').endPoints,5);
assert.equal(report.rows.find(row=>row.key==='TEST-4').removed,false);
assert.equal(report.days.find(row=>row.date==='2026-10-20').burned,5);
assert.equal(report.days.find(row=>row.date==='2026-10-21').burned,3,'After 21:00 UTC the transition belongs to the next day in Moscow');
assert.equal(report.days.find(row=>row.date==='2026-10-22').burned,-3);
assert.equal(report.days.at(-1).remaining,report.metrics.remaining);
assert.equal(report.days.at(-1).scope,13);
assert.equal(report.metrics.planned + report.metrics.added - report.metrics.removed + report.metrics.estimateDelta,report.metrics.completedPoints+report.metrics.remaining);

assert.deepEqual([...report.byProject.keys()],['OB','OBFRONT']);
const ob = report.byProject.get('OB');
const front = report.byProject.get('OBFRONT');
assert.equal(ob.metrics.planned,7);
assert.equal(ob.metrics.plannedTasks,2);
assert.equal(ob.metrics.removedTasks,1);
assert.equal(ob.metrics.removed,2);
assert.equal(ob.metrics.burned,5);
assert.equal(ob.metrics.remaining,0);
assert.equal(front.metrics.planned,2);
assert.equal(front.metrics.added,3);
assert.equal(front.metrics.estimateDelta,3);
assert.equal(front.metrics.completedPoints,0);
assert.equal(front.metrics.remaining,8);
assert.equal(front.metrics.remainingTasks,2);
assert.equal(front.days.find(row=>row.date==='2026-10-21').burned,3);
assert.equal(ob.days.find(row=>row.date==='2026-10-21').changes.length,0);
assert.equal(ob.rows[0].epicKey,'OBPROJECT-1');
assert.equal(ob.rows[0].epicTitle,'Название эпика');
assert.equal(ob.rows[0].stream,'Стрим 3');
assert.equal(front.rows[0].stream,'Стрим 1');
assert.equal(front.rows[1].epicTitle,'Имя эпика из задачи');
assert.equal(ob.rows[1].epicKey,'');

const missing = model.build({...input,issues:issues.slice(0,3)});
assert.equal(missing.rows.find(row=>row.key==='TEST-4').completeHistory,false);
assert.equal(missing.rows.find(row=>row.key==='TEST-4').project,'TEST');
assert.ok(missing.warnings.some(warning=>warning.includes('частично')));
assert.ok(model.build({...input,scope:null}).warnings.some(warning=>warning.includes('удалённые')));
assert.equal(model.build({...input,sprint:{...sprint,state:'active'},now:Date.parse('2026-10-21T11:00:00+03:00')}).closed,false);
assert.equal(model.build({...input,pointsField:''}).pointsField,'');
assert.equal(model.nativeScope({contents:{completedIssues:[]}}),null);

const rerated = issue('TEST-5',8,true,done,[
  day('2026-10-20T12:00:00+03:00',[status(progress,done)]),
  day('2026-10-21T12:00:00+03:00',[{fieldId:'customfield_1',from:'5',to:'8'}])
]);
const moved = issue('TEST-6',3,true,progress,[
  day('2026-10-20T13:00:00+03:00',[sprintChange(null,'7')]),
  day('2026-10-21T13:00:00+03:00',[sprintChange('7',null)]),
  day('2026-10-22T13:00:00+03:00',[sprintChange(null,'7')])
]);
const noEstimate = issue('TEST-7',null,true,done,[day('2026-10-22T14:00:00+03:00',[status(progress,done)])]);
const edgeScope = model.nativeScope({contents:{completedIssues:[rerated,noEstimate],issuesNotCompletedInCurrentSprint:[moved],puntedIssues:[],issueKeysAddedDuringSprint:{[moved.key]:true}}});
const edge = model.build({...input,issues:[rerated,moved,noEstimate],scope:edgeScope});
assert.equal(edge.warnings.length,0);
assert.equal(edge.metrics.burned,5);
assert.equal(edge.metrics.completedPoints,8,'Final completed estimates differ from the estimates at transition time');
assert.equal(edge.metrics.completed,2);
assert.equal(edge.metrics.plannedCompleted,2);
assert.equal(edge.metrics.completedUnestimated,1);
assert.equal(edge.metrics.addedTasks,1);
assert.equal(edge.metrics.added,6,'Both additions affect the scope, but the task is counted once');
assert.equal(edge.metrics.removed,3);
assert.equal(edge.metrics.removedTasks,1);
assert.equal(edge.days.at(-1).scope,11);

class ChartElement {
  children = new Map();
  childLists = new Map();
  listeners = new Map();
  attributes = new Map();
  style = {};
  hidden = true;
  querySelector(selector) { return this.children.get(selector); }
  querySelectorAll(selector) { return this.childLists.get(selector) || []; }
  addEventListener(event,listener) { this.listeners.set(event,listener); }
  setAttribute(name,value) { this.attributes.set(name,value); }
  append(selector) { const node = new ChartElement(); this.children.set(selector,node); return node; }
}
const root = new ChartElement();
const section = root.append('.ozon-report');
const chart = new ChartElement();
section.childLists.set('[data-report-chart]',[chart]);
chart.getBoundingClientRect = () => ({left:0,width:960});
chart.scrollLeft = 0;
const graphSvg = chart.append('svg');
graphSvg.getScreenCTM = () => ({inverse:()=>({})});
const hit = graphSvg.append('.ozon-report-graph-hit');
const hover = graphSvg.append('[data-report-hover]');
for (const selector of ['line','[data-report-dot="remaining"]','[data-report-dot="scope"]']) hover.append(selector);
const tip = chart.append('.ozon-report-tooltip');
tip.offsetWidth = 190;
for (const field of ['date','remaining','scope','burned','reopened']) tip.append('[data-tip-' + field + ']');
const {createSprintReportDashboard} = load('sprintReportDashboard',{
  document:new ChartElement(),DOMPoint:class { constructor(x,y) { this.x=x; this.y=y; } matrixTransform() { return this; } }
});
const dashboard = createSprintReportDashboard(()=>{},model,[{id:'1',name:'Test'}],'','',()=> '');
Object.assign(dashboard.getState(),{report,project:'OBFRONT'});
const html = dashboard.html();
assert.match(html,/class="ozon-report-axis"/);
assert.match(html,/class="ozon-report-axis-title"[^>]*>Story Points</);
assert.match(html,/class="ozon-report-axis-title"[^>]*>День спринта · МСК</);
assert.match(html,/class="ozon-report-plot-label remaining"[^>]*>5</);
assert.match(html,/class="ozon-report-plot-label shared"[^>]*>8</);
assert.equal([...html.matchAll(/class="ozon-report-grid-day/g)].length,report.days.length+1);
assert.doesNotMatch(html,/data-report-chart-mode=/);
assert.match(html,/data-report-section="scope" data-report-target-filter="estimate"[^>]*><span>Переоценка<\/span><strong>\+3 SP</);
const hitBounds = html.match(/class="ozon-report-graph-hit" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
dashboard.bind(root);
const move = index => hit.listeners.get('pointermove')({clientX:hitBounds[0] + hitBounds[2] * index / report.days.length,clientY:hitBounds[1] + hitBounds[3]/2});
move(3);
assert.equal(tip.hidden,false);
assert.equal(tip.querySelector('[data-tip-burned]').textContent,'Перешло в «Готово»: 3 SP');
assert.equal(tip.querySelector('[data-tip-reopened]').textContent,'');
move(4);
assert.equal(tip.querySelector('[data-tip-remaining]').textContent,'Незавершённые задачи: 8 SP');
assert.equal(tip.querySelector('[data-tip-burned]').textContent,'Перешло в «Готово»: 0 SP');
assert.equal(tip.querySelector('[data-tip-reopened]').textContent,'Вернули при переоткрытии: 3 SP');
hit.listeners.get('pointerleave')();
assert.equal(tip.hidden,true);

Object.assign(dashboard.getState(),{chartMode:'projects',project:''});
const split = dashboard.html();
assert.match(split,/data-report-chart-mode="projects" aria-pressed="true"/);
assert.match(split,/<h3>OB<\/h3>/);
assert.match(split,/<h3>OBFRONT<\/h3>/);
const axes = [...split.matchAll(/<g class="ozon-report-grid">(.+?)<\/g>/g)].map(match=>match[1]);
assert.equal(axes.length,2);
assert.equal(axes[0],axes[1],'Both projects use an identical date and Story Point scale');
Object.assign(dashboard.getState(),{chartMode:'total'});
assert.equal([...dashboard.html().matchAll(/class="ozon-report-graph"/g)].length,1);

Object.assign(dashboard.getState(),{report:edge,section:'finish',scopeFilter:'done'});
const completedHtml = dashboard.html();
assert.match(completedHtml,/data-report-target-filter="done"><span>Завершили к закрытию<\/span><strong>8 SP<\/strong><small>2 задачи/);
assert.match(completedHtml,/5 \+ 6 − 3 \+ 3 = 11 SP/);
assert.match(completedHtml,/TEST-7/);
assert.doesNotMatch(completedHtml,/TEST-6/);
Object.assign(dashboard.getState(),{section:'scope',scopeFilter:'estimate'});
assert.match(dashboard.html(),/Переоценили 21 окт<\/td><td>\+3/);
assert.doesNotMatch(dashboard.html(),/TEST-6/);
Object.assign(dashboard.getState(),{report:model.build({...input,pointsField:''}),section:'days',scopeFilter:'all'});
assert.doesNotMatch(dashboard.html(),/data-report-chart/);
assert.match(dashboard.html(),/План на старте<\/span><strong>3 задачи/);

console.log('Sprint report checks passed: scope reconciliation, closing transfer, repeated moves, re-estimates, unestimated work, chart hover and project breakdown.');
