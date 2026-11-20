const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(name) {
  const exports = {};
  const source = fs.readFileSync('src/services/' + name + '.ts', 'utf8');
  vm.runInNewContext(ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText,{exports});
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
    day(sprint.completeDate,[sprintChange('7','8')])
  ])
];
const ref = key => ({key});
const scope = model.nativeScope({contents:{
  completedIssues:[ref('TEST-1')],issuesNotCompletedInCurrentSprint:[ref('TEST-2'),ref('TEST-4')],
  issuesCompletedInAnotherSprint:[],puntedIssues:[ref('TEST-3')],issueKeysAddedDuringSprint:{'TEST-2':true}
}});
const input = {sprint,scope,issues,pointsField:'customfield_1',sprintField:'customfield_2',pointsName:'Story Points',doneIds:['4']};
const report = model.build(input);
assert.equal(report.warnings.length,0);
assert.equal(report.metrics.planned,9);
assert.equal(report.metrics.added,3);
assert.equal(report.metrics.removed,2);
assert.equal(report.metrics.burned,5);
assert.equal(report.metrics.remaining,8);
assert.equal(report.metrics.carry,2);
assert.equal(report.metrics.completed,1);
assert.equal(report.rows.find(row=>row.key==='TEST-1').endPoints,5);
assert.equal(report.rows.find(row=>row.key==='TEST-4').removed,false);
assert.equal(report.days.find(row=>row.date==='2026-10-20').burned,5);
assert.equal(report.days.find(row=>row.date==='2026-10-21').burned,3,'After 21:00 UTC the transition belongs to the next day in Moscow');
assert.equal(report.days.find(row=>row.date==='2026-10-22').burned,-3);
assert.equal(report.days.at(-1).remaining,report.metrics.remaining);
assert.equal(report.days.at(-1).scope,13);

const missing = model.build({...input,issues:issues.slice(0,3)});
assert.equal(missing.rows.find(row=>row.key==='TEST-4').completeHistory,false);
assert.ok(missing.warnings.some(warning=>warning.includes('частично')));
assert.ok(model.build({...input,scope:null}).warnings.some(warning=>warning.includes('удалённые')));
assert.equal(model.build({...input,sprint:{...sprint,state:'active'},now:Date.parse('2026-10-21T11:00:00+03:00')}).closed,false);
assert.equal(model.build({...input,pointsField:''}).pointsField,'');
assert.equal(model.nativeScope({contents:{completedIssues:[]}}),null);
console.log('Sprint report checks passed: historical estimates, scope changes, reopening, Moscow day, closing cutoff and partial history.');
