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
issues[0].fields.issuetype = {name:'Задача'};
issues[0].fields.assignee = {name:'old-user',displayName:'Первый исполнитель',avatarUrls:{'48x48':'data:image/png;base64,AA=='}};
issues[0].fields.components = [{name:'Карточки'},{name:'Платформа'}];
issues[0].fields.customfield_3 = 'OBPROJECT-1';
issues[0].fields.customfield_24000 = {value:'Стрим 2'};
issues[1].fields.project = {key:'OBFRONT'};
issues[1].fields.customfield_24000 = {value:'Стрим 1'};
issues[2].fields.project = {key:'OB'};
issues[2].fields.issuetype = {name:'Эпик'};
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
assert.equal(report.metrics.plannedCompletedPoints,5);
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
assert.equal(ob.metrics.plannedCompletedPoints,5);
assert.equal(ob.metrics.removedTasks,1);
assert.equal(ob.metrics.removed,2);
assert.equal(ob.metrics.burned,5);
assert.equal(ob.metrics.remaining,0);
assert.equal(ob.leaders.length,1);
assert.equal(ob.leaders[0].id,'old-user');
assert.equal(ob.leaders[0].avatarUrl,'data:image/png;base64,AA==');
assert.equal(ob.leaders[0].points,5);
assert.equal(front.leaders.length,0,'Reopened or unfinished issues are not credited');
assert.equal(front.metrics.planned,2);
assert.equal(front.metrics.added,3);
assert.equal(front.metrics.estimateDelta,3);
assert.equal(front.metrics.completedPoints,0);
assert.equal(front.metrics.plannedCompletedPoints,0);
assert.equal(front.metrics.remaining,8);
assert.equal(front.metrics.remainingTasks,2);
assert.equal(front.days.find(row=>row.date==='2026-10-21').burned,3);
assert.equal(ob.days.find(row=>row.date==='2026-10-21').changes.length,0);
assert.equal(ob.rows[0].epicKey,'OBPROJECT-1');
assert.equal(ob.rows[0].epicTitle,'Название эпика');
assert.equal(ob.rows[0].stream,'Стрим 3');
assert.equal(front.rows[0].stream,'','The development view assigns streams through epics');
assert.equal(front.rows[1].epicTitle,'Имя эпика из задачи');
assert.equal(ob.rows[1].epicKey,'');
assert.equal(model.epicKeyFor({customfield_3:null,epic:{key:'OBPROJECT-1'}},'customfield_3'),'');

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
  day('2026-10-21T12:00:00+03:00',[{fieldId:'customfield_1',from:'5',to:'8'}]),
  day('2026-10-22T10:00:00+03:00',[{field:'assignee',from:'original-user',fromString:'Исполнитель при завершении',to:'JIRAUSER-22',toString:'Новый исполнитель'}])
]);
rerated.fields.assignee = {name:'new-user',key:'JIRAUSER-22',displayName:'Новый исполнитель'};
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
assert.equal(edge.metrics.plannedCompletedPoints,5,'Original commitment uses the estimates at sprint launch');
const [leader] = edge.byProject.get('TEST').leaders;
assert.equal(leader.id,'original-user','Completion is credited to the assignee at the transition');
assert.equal(leader.points,8);
assert.equal(leader.tasks,1);
assert.equal(edge.metrics.completedUnestimated,1);
assert.equal(edge.metrics.addedTasks,1);
assert.equal(edge.metrics.added,6,'Both additions affect the scope, but the task is counted once');
assert.equal(edge.metrics.removed,3);
assert.equal(edge.metrics.removedTasks,1);
assert.equal(edge.days.at(-1).scope,11);

const tied = issue('TEST-70',8,true,done,[day('2026-10-22T14:00:00+03:00',[status(progress,done)])]);
tied.fields.assignee = {key:'other-user',displayName:'Исполнитель при завершении'};
const ties = model.build({...input,issues:[rerated,tied],scope:model.nativeScope({contents:{completedIssues:[rerated,tied],puntedIssues:[]}})});
assert.equal(ties.byProject.get('TEST').leaders.length,2,'Different people with identical names and scores are both shown');

const lateLaunch = {...sprint,startDate:'2026-10-18T22:00:00+03:00',activatedDate:'2026-10-19T13:51:12.006+03:00'};
const plannedBeforeLaunch = issue('TEST-8',5,true,progress,[
  day('2026-10-19T09:57:00+03:00',[sprintChange(null,'7')]),
  day('2026-10-19T13:35:00+03:00',[{fieldId:'customfield_1',from:'3',to:'5'}])
]);
const addedAfterLaunch = issue('TEST-9',2,true,progress,[day('2026-10-19T14:11:00+03:00',[sprintChange(null,'7')])]);
const launchScope = model.nativeScope({contents:{completedIssues:[],issuesNotCompletedInCurrentSprint:[plannedBeforeLaunch,addedAfterLaunch],puntedIssues:[],issueKeysAddedDuringSprint:{[addedAfterLaunch.key]:true}}});
const launched = model.build({...input,sprint:lateLaunch,issues:[plannedBeforeLaunch,addedAfterLaunch],scope:launchScope});
assert.equal(launched.start,Date.parse(lateLaunch.activatedDate));
assert.equal(launched.days[0].date,'2026-10-19','Use the actual launch even if it is on a later day than the planned start');
assert.equal(launched.metrics.planned,5);
assert.equal(launched.metrics.plannedTasks,1);
assert.equal(launched.metrics.added,2);
assert.equal(launched.metrics.addedTasks,1);
assert.equal(launched.metrics.estimateDelta,0);
assert.equal(launched.events.length,1);
assert.equal(launched.days[0].remaining,7);

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
  getAttribute(name) { return this.attributes.get(name) || null; }
  setAttribute(name,value) { this.attributes.set(name,value); }
  focus() { this.focused = true; }
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
const storage = new Map();
const {createSprintReportDashboard} = load('sprintReportDashboard',{
  document:new ChartElement(),localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},DOMPoint:class { constructor(x,y) { this.x=x; this.y=y; } matrixTransform() { return this; } }
});
const people = load('jiraPeopleUi').createJiraPeopleUi();
const grouping = load('jiraGroupingUi').createJiraGroupingUi();
const columns = load('developmentDashboard').createDevelopmentPointColumns();
const category = (stream,key) => Array.from(columns.matches(stream,key),Boolean).map((matches,index)=>matches ? columns.definitions[index][0] : '').filter(Boolean);
assert.deepEqual(category('Стрим 1','OBPROJECT-1'),['Продукты']);
assert.deepEqual(category('Стрим 2','OBPROJECT-1'),['Внепроектное']);
assert.deepEqual(category('Стрим 2','OBPROJECT-5201'),['Внепроектные баги']);
assert.deepEqual(category('Стрим 3','OBPROJECT-1'),['Проектное']);
assert.deepEqual(category('Стрим 4','OBPROJECT-1'),['Технострим']);
assert.deepEqual(category('Стрим 5','OBPROJECT-1'),['Роузи']);
assert.deepEqual(category('',''),[]);
let developmentGroups=['sprint','project','epic'];
const dashboard = createSprintReportDashboard(()=>{},model,[{id:'1',name:'Test'}],'','',()=> '',type=>type==='Эпик',people,columns,()=>developmentGroups,grouping);
Object.assign(dashboard.getState(),{report,project:'OBFRONT'});
const html = dashboard.html();
const groupTable = html => html.match(/<table aria-label="План и факт по группам">.*?<\/table>/)?.[0];
const groupRows = (table,label) => {
  const rows = [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map(([,row])=>row);
  const index = rows.findIndex(row=>row.split('</th>',1)[0].includes(label));
  assert.notEqual(index,-1,'Missing rollup row ' + label);
  return rows.slice(index,index+2);
};
const cellsIn = rows => rows.map(row=>[...row.matchAll(/<div class="ozon-report-rollup-value"><strong>(.*?)<\/strong><small>(.*?)<\/small>/g)].map(([,points,share])=>({points:Number(points),share:share.replace(/\s/g,'')})));
const pointsIn = rows => {
  const [plan,fact] = cellsIn(rows);
  return plan.flatMap((cell,index)=>[cell.points,fact[index].points]);
};
assert.match(groupTable(html),/<th scope="col" class="ozon-report-rollup-group">Проект → Эпик<\/th>/);
assert.match(groupTable(html),/<th scope="col" class="ozon-report-rollup-measure">Показатель<\/th>/);
assert.match(groupTable(html),/Всего SP<\/th>.*Продукты<\/th>.*Внепроектное<\/th>.*Внепроектные баги<\/th>.*Проектное<\/th>.*Технострим<\/th>.*Роузи<\/th>/);
const filteredProject = groupRows(groupTable(html),'<strong>OBFRONT</strong>');
assert.match(filteredProject[0],/rowspan="2".*<th scope="row" class="ozon-report-rollup-measure">План<\/th>/);
assert.match(filteredProject[1],/^<th scope="row" class="ozon-report-rollup-measure">Факт<\/th>/);
assert.doesNotMatch(filteredProject.join(''),/<td[^>]*>[^<]*(?:План|Факт)|<span>(?:План|Факт)<\/span>/);
assert.deepEqual(cellsIn(filteredProject).map(row=>row[0]),[{points:2,share:'100%'},{points:0,share:'—'}]);
assert.deepEqual(cellsIn(groupRows(groupTable(html),'Всего по OBFRONT')).map(row=>row[0]),[{points:2,share:'100%'},{points:0,share:'—'}]);
assert.doesNotMatch(groupTable(html),/<strong>OB<\/strong>/);
assert.match(html,/viewBox="0 0 960 180"/);
assert.match(html,/class="ozon-report-axis"/);
assert.match(html,/class="ozon-report-axis-title"[^>]*>Story Points</);
assert.match(html,/class="ozon-report-axis-title"[^>]*>День спринта · МСК</);
assert.match(html,/class="ozon-report-plot-label remaining"[^>]*>5</);
assert.match(html,/class="ozon-report-plot-label shared"[^>]*>8</);
assert.equal([...html.matchAll(/class="ozon-report-grid-day/g)].length,report.days.length+1);
const burnBars = markup => [...markup.matchAll(/data-report-burn-day="([^"]+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
  .map(([,date,x,y,width,height])=>({date,x:Number(x),y:Number(y),width:Number(width),height:Number(height)}));
const reportDates=Array.from(report.days,day=>day.date);
assert.match(html,/ozon-report-burn-legend">В «Готово» с начала спринта/);
const frontBars = burnBars(html);
assert.deepEqual(frontBars.map(bar=>bar.date),reportDates.filter(date=>date>='2026-10-21'));
assert.ok(frontBars.every(bar=>bar.height===frontBars[0].height),'The total holds on days with no completions, including reopenings');
assert.doesNotMatch(html,/data-report-chart-mode=/);
assert.match(html,/data-report-section="scope" data-report-target-filter="estimate"[^>]*><span>Переоценка<\/span><strong>\+3 SP</);
const hitBounds = html.match(/class="ozon-report-graph-hit" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
dashboard.bind(root);
const move = index => hit.listeners.get('pointermove')({clientX:hitBounds[0] + hitBounds[2] * index / (report.days.length+.5),clientY:hitBounds[1] + hitBounds[3]/2});
move(3);
assert.equal(tip.hidden,false);
assert.equal(tip.querySelector('[data-tip-burned]').textContent,'В «Готово» с начала: 3 SP (за день: +3 SP)');
assert.equal(tip.querySelector('[data-tip-reopened]').textContent,'');
move(4);
assert.equal(tip.querySelector('[data-tip-remaining]').textContent,'Незавершённые задачи: 8 SP');
assert.equal(tip.querySelector('[data-tip-burned]').textContent,'В «Готово» с начала: 3 SP (за день: 0 SP)');
assert.equal(tip.querySelector('[data-tip-reopened]').textContent,'Вернули при переоткрытии: 3 SP');
hit.listeners.get('pointerleave')();
assert.equal(tip.hidden,true);

Object.assign(dashboard.getState(),{chartMode:'projects',project:''});
const split = dashboard.html();
assert.match(split,/data-report-chart-mode="projects" aria-pressed="true"/);
assert.match(split,/class="ozon-report-project-charts"/);
assert.match(split,/<h3>OB<\/h3>/);
assert.match(split,/<h3>OBFRONT<\/h3>/);
const splitBars = [...split.matchAll(/<svg viewBox="0 0 480 268"[^>]*>.*?<\/svg>/g)].map(([svg])=>burnBars(svg));
assert.deepEqual(splitBars.map(bars=>bars.map(bar=>bar.date)),['2026-10-20','2026-10-21'].map(first=>reportDates.filter(date=>date>=first)));
assert.ok(Math.abs(splitBars[0][0].height / splitBars[1][0].height - 5/3) < 1e-9,'Project bars share the Story Point scale');
const projectHit = split.match(/class="ozon-report-graph-hit" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
dashboard.bind(root);
hit.listeners.get('pointermove')({clientX:splitBars[0][0].x+splitBars[0][0].width/2,clientY:projectHit[1]+projectHit[3]-2});
assert.equal(tip.hidden,false,'The lower part of the tall chart supports hover');
assert.equal(tip.querySelector('[data-tip-burned]').textContent,'В «Готово» с начала: 5 SP (за день: +5 SP)');
assert.match(split,/<th>Лидер проекта<\/th>/);
assert.match(split,/data-report-avatar="old-user" src="data:image\/png;base64,AA==".*Первый исполнитель<\/strong><small>5 SP · 1 задача/);
const obRows = groupRows(groupTable(split),'<strong>OB</strong>');
const sprintRows = groupRows(groupTable(split),'Весь спринт');
assert.deepEqual(pointsIn(obRows),[7,5,0,0,0,0,0,0,5,5,0,0,0,0]);
assert.deepEqual(pointsIn(sprintRows),[9,5,0,0,0,0,0,0,5,5,0,0,0,0]);
assert.deepEqual(cellsIn(obRows).map(row=>[row[0].share,row[4].share]),[['100%','71,4%'],['100%','100%']]);
assert.deepEqual(cellsIn(sprintRows).map(row=>[row[0].share,row[4].share]),[['100%','55,6%'],['100%','100%']]);
const obGroup = Object.assign(new ChartElement(),{dataset:{reportGroup:'["rollup","project:OB"]',reportTree:'rollup'}});
section.childLists.set('[data-report-group]',[obGroup]);
dashboard.bind(root);
obGroup.listeners.get('click')();
const nestedEpic = groupRows(groupTable(dashboard.html()),'/browse/OBPROJECT-1');
assert.deepEqual(cellsIn(nestedEpic).map(row=>row[0].share),['71,4%','100%']);
developmentGroups=['sprint','component','project','epic'];
const componentGroups=groupTable(dashboard.html());
assert.match(componentGroups,/<th scope="col" class="ozon-report-rollup-group">Компонент → Проект → Эпик<\/th>/);
assert.deepEqual(pointsIn(groupRows(componentGroups,'Карточки')).slice(0,2),[5,5]);
assert.deepEqual(pointsIn(groupRows(componentGroups,'Платформа')).slice(0,2),[5,5]);
assert.deepEqual(pointsIn(groupRows(componentGroups,'Весь спринт')).slice(0,2),[9,5]);
developmentGroups=['sprint','project','epic'];
const axes = [...split.matchAll(/<g class="ozon-report-grid">(.+?)<\/g>/g)].map(match=>match[1]);
assert.equal(axes.length,2);
assert.equal(axes[0],axes[1],'Both projects use an identical date and Story Point scale');
const extraProjects = model.build({...input,issues:[...issues,issue('AUX-1',1,true,progress,[]),issue('OBSPRINTGO-1',100,true,progress,[])]});
dashboard.getState().report = extraProjects;
const mixedProjects = dashboard.html();
assert.deepEqual([...mixedProjects.matchAll(/<h3>([^<]+)<\/h3>/g)].map(([,title])=>title),['OB','OBFRONT','AUX']);
assert.equal(mixedProjects.match(/<g class="ozon-report-grid">(.+?)<\/g>/)[1],axes[0],'Hidden project does not stretch the comparison scale');
assert.match(mixedProjects,/data-report-project="OBSPRINTGO"/);
assert.equal(extraProjects.metrics.planned,110,'The overall report still counts the hidden project');
dashboard.getState().project='OBSPRINTGO';
assert.doesNotMatch(dashboard.html(),/data-report-chart|Как читать график/);
assert.match(dashboard.html(),/<span>План на старте<\/span><strong>100 SP<\/strong>/);
Object.assign(dashboard.getState(),{report,project:''});
Object.assign(dashboard.getState(),{chartMode:'total'});
assert.equal([...dashboard.html().matchAll(/class="ozon-report-graph"/g)].length,1);
const totalBars = burnBars(dashboard.html());
assert.deepEqual(totalBars.map(bar=>bar.date),reportDates.filter(date=>date>='2026-10-20'));
assert.ok(Math.abs(totalBars[1].height / totalBars[0].height - 8/5) < 1e-9,'The overall total increases from 5 to 8 SP');
assert.ok(totalBars.slice(1).every(bar=>bar.height===totalBars[1].height));

const lastDay = report.days.at(-1);
const sameDayTransitions = [{...report.events[0],burned:22},{...report.events[0],burned:-22}];
dashboard.getState().report = {...report,days:[...report.days.slice(0,-1),{...lastDay,changes:sameDayTransitions,burned:0}]};
const lastBar = burnBars(dashboard.html()).at(-1);
assert.equal(lastBar.date,lastDay.date);
assert.equal(lastBar.y,hitBounds[1],'The axis includes cumulative completed SP even when they exceed both lines');
assert.ok(lastBar.x + lastBar.width <= hitBounds[0]+hitBounds[2],'The last bar fits inside the plot');
dashboard.bind(root);
move(report.days.length);
assert.equal(tip.querySelector('[data-tip-burned]').textContent,'В «Готово» с начала: 30 SP (за день: +22 SP)');
assert.equal(tip.querySelector('[data-tip-reopened]').textContent,'Вернули при переоткрытии: 22 SP');

Object.assign(dashboard.getState(),{report:edge,section:'finish',scopeFilter:'done'});
const completedHtml = dashboard.html();
assert.match(completedHtml,/data-report-target-filter="done"><span>Завершили к закрытию<\/span><strong>8 SP<\/strong><small>2 задачи/);
assert.match(completedHtml,/5 \+ 6 − 3 \+ 3 = 11 SP/);
assert.match(completedHtml,/Из первоначального плана завершили <strong>2 из 2 задач · 5 из 5 SP/);
assert.match(completedHtml,/Лидер проекта.*Исполнитель при завершении<\/strong><small>8 SP · 1 задача/);
assert.match(completedHtml,/TEST-7/);
assert.doesNotMatch(completedHtml,/TEST-6/);
Object.assign(dashboard.getState(),{section:'scope',scopeFilter:'estimate'});
assert.match(dashboard.html(),/Переоценили 21 окт<\/td><td>\+3/);
assert.doesNotMatch(dashboard.html(),/TEST-6/);
Object.assign(dashboard.getState(),{report:model.build({...input,pointsField:''}),section:'days',scopeFilter:'all'});
assert.doesNotMatch(dashboard.html(),/data-report-chart/);
assert.equal(groupTable(dashboard.html()),undefined);
assert.match(dashboard.html(),/План на старте<\/span><strong>3 задачи/);
assert.match(dashboard.html(),/Из первоначального плана завершили <strong>1 из 3 задач<\/strong>/);

Object.assign(dashboard.getState(),{report,section:'start',project:'OB'});
developmentGroups=['sprint','project','stream','epic'];
const group = new ChartElement();
group.dataset = {reportGroup:'["project:OB","stream:Стрим 3"]'};
section.childLists.set('[data-report-group]',[group]);
dashboard.bind(root);
group.setAttribute('aria-expanded','true');
group.listeners.get('click')();
assert.match(dashboard.html(),/class="ozon-report-tree"><colgroup>/);
assert.match(dashboard.html(),/data-report-group="\[&quot;project:OB&quot;,&quot;stream:Стрим 3&quot;\]" aria-expanded="false"/);
assert.doesNotMatch(dashboard.html(),/data-key="TEST-1"/);
group.setAttribute('aria-expanded','false');
group.listeners.get('click')();
assert.match(dashboard.html(),/data-report-action="edit-epic" data-key="TEST-1"/);
assert.doesNotMatch(dashboard.html(),/data-report-action="edit-epic" data-key="TEST-3"/);
dashboard.updateTask('TEST-1',{epic:{id:'OBPROJECT-3',name:'Эпик назначения',fields:{customfield_24000:{value:'Стрим 5'}}}});
assert.match(dashboard.html(),/Стрим 5/);
assert.deepEqual(pointsIn(groupRows(groupTable(dashboard.html()),'<strong>OB</strong>')),[7,5,0,0,0,0,0,0,0,0,0,0,5,5]);
assert.match(dashboard.html(),/Эпик назначения/);
assert.equal(ob.rows[0].epicKey,'OBPROJECT-3');
assert.equal(report.metrics.planned,9);
dashboard.updateTask('TEST-1',{epic:{id:'',name:'Без эпика'}});
assert.equal(ob.rows[0].epicKey,'');
assert.equal(ob.rows[0].stream,'');
assert.match(dashboard.html(),/<th>Исполнитель<\/th>/);
assert.match(dashboard.html(),/class="ozon-person-name">Первый исполнитель/);
assert.match(dashboard.html(),/data-ozon-copy-login="old-user"/);
dashboard.updateTask('TEST-1',{assigneeName:'Новый исполнитель',assignee:{name:'Новый исполнитель',login:'new-user'}});
assert.match(dashboard.html(),/class="ozon-person-name">Новый исполнитель/);
assert.match(dashboard.html(),/data-ozon-copy-login="new-user"/);
assert.equal(ob.rows[0].epicKey,'');
dashboard.updateTask('TEST-1',{assigneeName:'',assignee:null});
assert.match(dashboard.html(),/title="Не назначен"><span>Не назначен/);

const depthTrigger = (id,values) => {
  const trigger = Object.assign(new ChartElement(),{dataset:{tableDepth:id}});
  trigger.nextElementSibling = new ChartElement();
  trigger.options = values.map(depthValue=>Object.assign(new ChartElement(),{dataset:{depthValue}}));
  trigger.nextElementSibling.childLists.set('[data-depth-value]',trigger.options);
  return trigger;
};
const detailsDepth = depthTrigger('report-details',['0','all']);
const rollupDepth = depthTrigger('report-rollup',['2']);
root.childLists.set('[data-table-depth]',[detailsDepth,rollupDepth]);
dashboard.bind(root);
detailsDepth.listeners.get('keydown')({key:'ArrowDown',preventDefault(){}});
assert.equal(detailsDepth.getAttribute('aria-expanded'),'true');
assert.equal(detailsDepth.options[0].focused,true);
detailsDepth.options[0].listeners.get('click')();
assert.doesNotMatch(dashboard.html(),/data-key="TEST-1"/);
rollupDepth.options[0].listeners.get('click')();
assert.match(groupTable(dashboard.html()),/<strong>Без стрима<\/strong>/);
assert.doesNotMatch(dashboard.html(),/data-key="TEST-1"/,'Rollup depth does not change the task list');
detailsDepth.options[1].listeners.get('click')();
assert.match(dashboard.html(),/data-key="TEST-1"/);
const settingButton = action => Object.assign(new ChartElement(),{dataset:{reportSettings:action}});
const [openSettings,applySettings,inheritSettings] = ['open','apply','inherit'].map(settingButton);
const component = Object.assign(new ChartElement(),{dataset:{reportGroupField:'component'},checked:true});
section.childLists.set('[data-report-settings]',[openSettings,applySettings,inheritSettings]);
section.childLists.set('[data-report-group-field]',[component]);
dashboard.bind(root);
openSettings.listeners.get('click')();
dashboard.bind(root);
component.listeners.get('change')();
applySettings.listeners.get('click')();
assert.match(groupTable(dashboard.html()),/Проект → Стрим → Эпик → Компонент/);
assert.deepEqual(JSON.parse(storage.get('ozon-sprint-report-v1')).grouping,['project','stream','epic','component']);
openSettings.listeners.get('click')();
inheritSettings.listeners.get('click')();
applySettings.listeners.get('click')();
assert.deepEqual(JSON.parse(storage.get('ozon-sprint-report-v1')).grouping,null);
assert.doesNotMatch(groupTable(dashboard.html()),/→ Компонент/);

console.log('Sprint report checks passed: history, cumulative completion bars, chart interaction, point categories and tree controls.');
