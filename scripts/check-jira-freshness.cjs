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

async function renderSprintEditor(fields) {
  const controls = new Map();
  const panel = {
    dataset:{}, style:{}, isConnected:true, setAttribute(){},
    querySelector(selector) {
      if (!controls.has(selector)) controls.set(selector,{
        textContent:'',innerHTML:'',value:'',disabled:true,focus(){},setAttribute(){},addEventListener(){},
      });
      return controls.get(selector);
    },
  };
  const globals = {
    AbortController, planningEditor:null, document:{body:{appendChild(){}},createElement:()=>panel},
    jiraGroupingUi:{progressHtml:label=>label},
    planningFields:()=>({sprint:'customfield_sprint'}), escapeHtml:String, isEpicIssueType:()=>false,
    readPlanningIssue:async()=>({fields}), extractAnyRealSprintName:value=>value.name,
    sprintIdByName:{}, sprintStateByName:{}, developmentDashboard:{getState:()=>({sprints:[]})},
    planningSprintOptions:async()=>[{id:'75',name:'CS #75',state:'active'}],
    renderBadge:(label, state)=>'<span class="' + state + '">' + label + '</span>',
  };
  vm.runInNewContext(
    section('  function getSprintStateCode(', '  const DEFAULT_COLUMNS_META') +
    section('    function planningSprint(', '    function planningEpicKey(') +
    section('    function openPlanningEditor(', "    document.addEventListener('click', event => {") +
    "openPlanningEditor('OB-1','sprint');", globals
  );
  await new Promise(setImmediate);
  return {current:controls.get('[data-current]').innerHTML, options:controls.get('[data-list]').innerHTML};
}

async function pageProgress(total) {
  const progress = [];
  const fixture = {issues:[{key:'FCRM-1'},{key:'FCRM-2'}]};
  if (total !== undefined) fixture.total = total;
  const result = await vm.runInNewContext(
    section('  async function fetchPaginatedIssues(', '  function fetchPaginatedAgileIssues(') +
    "fetchPaginatedIssues('/fixture', 100, (loaded, count) => record(loaded, count));",
    {fetch:async()=>({ok:true,json:async()=>fixture}),record:(loaded,count)=>progress.push([loaded,count])}
  );
  assert.equal(result.issues.length,2);
  return progress;
}

(async()=>{
  assert.deepStrictEqual(await pageProgress(undefined),[[2,null]]);
  assert.deepStrictEqual(await pageProgress(2),[[2,2]]);
  const closed = {id:71,name:'CS #71',state:'closed'};
  const past = await renderSprintEditor({customfield_sprint:[closed]});
  assert.match(past.current,/^CS #71 .*Прошедший/);
  assert.doesNotMatch(past.current,/Бэклог/);
  assert.doesNotMatch(past.options,/aria-pressed="true"|CS #71/);
  assert.match(past.options,/Бэклог/);

  const active = await renderSprintEditor({sprint:{id:75,name:'CS #75',state:'active'},closedSprints:[closed]});
  assert.match(active.current,/^CS #75 .*Активный/);
  assert.match(active.options,/aria-pressed="true"[^>]*>(?:.|\n)*CS #75/);
  assert.doesNotMatch(active.options,/CS #71/);

  const backlog = await renderSprintEditor({});
  assert.equal(backlog.current,'Бэклог');
  assert.match(backlog.options,/aria-pressed="true"[^>]*>.*Бэклог/);
  console.log('Fresh Jira values checked: sprint editor states and measured vs unknown pagination.');
})().catch(error=>{console.error(error);process.exitCode=1;});
