const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('src/utils/extensionGenerator.ts', 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert(from >= 0 && to > from, 'missing source section: ' + start);
  return source.slice(from, to);
}
const edits = section('  let taskEditRevision = 0;', '  function escapeHtml(s) {');
const sprint = section('  function extractCleanSprintName(', '  function extractAnyRealSprintName(');
const linkedSprint = section('  function extractAnyRealSprintName(', '  function resolveRealLinkedIssueComponent(');
const context = vm.createContext({assert, console, closedSprintNames: new Set(), closedSprintIds: new Set(), sprintStateByName: {}, sprintNameById: {}, sprintIdByName: {}, discoveredFields: {sprint: 'customfield_sprint'}, issueSprintOverrideMap: {'FCRM-1':'Old Sprint'}, isFcrmSprintCandidate: () => true});
vm.runInContext(edits + sprint + linkedSprint + `
  saveTaskOverride('FCRM-1', {status:'Old', sprint:'Old Sprint', priority:'Low'});
  const started = taskEditRevision;
  saveTaskOverride('FCRM-1', {priority:'High'});
  const result = applyLocalOverridesToTasks([{key:'FCRM-1',status:'New',sprint:'New Sprint',priority:'Medium'}], started)[0];
  assert.equal(result.status,'New'); assert.equal(result.sprint,'New Sprint'); assert.equal(result.priority,'High');
  clearTaskOverride('FCRM-1', started);
  assert.equal(applyLocalOverridesToTasks([{key:'FCRM-1',priority:'Medium'}], started)[0].priority,'High');
  assert.equal(applyLocalOverridesToTasks([{key:'FCRM-1',priority:'Medium'}], taskEditRevision)[0].priority,'Medium');
  const issue = {key:'FCRM-1', fields:{sprint:{id:1,name:'Old Sprint',state:'CLOSED'},customfield_sprint:[{id:1,name:'Old Sprint',state:'CLOSED'},{id:2,name:'New Sprint',state:'ACTIVE'}]}};
  assert.equal(resolveIssueSprint(issue),'New Sprint');
  assert.equal(resolveRealLinkedIssueSprint(issue),'New Sprint');
  assert.equal(resolveIssueSprint({key:'FCRM-1',fields:{}}),'Бэклог FCRM');
`, context);
console.log('Fresh Jira values, concurrent edits, and historical sprint selection: OK');
