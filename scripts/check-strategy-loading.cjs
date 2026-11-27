const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObj = {};
const requests = [];
const renders = [];
const measures = [];
const issues = Array.from({length:8}, (_,i)=>({key:'FCRM-' + (i+1),fields:{summary:'Задача ' + (i+1)}}));
issues[0].fields.components = [{name:'Платформа'}];
issues[0].fields.labels = ['fcrm_umb_epic'];
issues[0].fields.issuetype = {name:'Epic'};
issues[0].fields.customfield_20100 = 'OBPROJECT-1';
issues[6].fields.components = [{name:'Группа A'},{name:'Группа B'}];
issues[6].fields.issuelinks = [{type:{inward:'Задача проекта'},inwardIssue:{key:'FCRM-1'}}];
const preferences = new Map();
const gate = () => {
  let release;
  const pending = new Promise(resolve => { release=resolve; });
  return {pending,release};
};
let pages = gate();
const metadata = gate();
let directReads=0;
let failedOffset=-1;
const response = value => ({ok:true,json:async()=>value});
const fetch = async path => {
  const url=new URL(path,'https://jira.example');
  if (url.pathname.endsWith('/field')) return response([]);
  if (url.pathname.endsWith('/issue/FCRM-7')) { directReads++; return response(issues[6]); }
  if (url.searchParams.get('jql')?.startsWith('key in (OBPROJECT-1)')) {
    await metadata.pending;
    return response({issues:[{key:'OBPROJECT-1',fields:{summary:'Эпик разработки',status:{name:'В работе'}}}]});
  }
  const offset=Number(url.searchParams.get('startAt'));
  requests.push(offset);
  if (offset) await pages.pending;
  if (offset===failedOffset) return {ok:false,status:503};
  return response({startAt:offset,total:issues.length,issues:issues.slice(offset,offset+2)});
};
const source = fs.readFileSync('src/services/strategicDashboard.ts','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:exportsObj,fetch,URLSearchParams,AbortController,
  document:{getElementById:()=>null,addEventListener(){}},
  localStorage:{getItem:key=>preferences.get(key),setItem:(key,value)=>preferences.set(key,value)},
  performance:{now:()=>Date.now(),measure:name=>measures.push(name)}
});

(async()=>{
  const dashboard=exportsObj.createStrategicDashboard(()=>renders.push(dashboard.html()),()=>'', 'test');
  dashboard.getState().search='FCRM-7';
  const loading=dashboard.load();
  const assertSkeleton=html=>{
    assert.match(html,/ozon-strategy-scroll" aria-busy="true"/);
    assert.match(html,/ozon-ext-skeleton/);
    assert.doesNotMatch(html,/data-strategy-path=|\/browse\/FCRM-7|Продолжаем поиск/);
  };
  assertSkeleton(dashboard.html());
  await new Promise(setImmediate);
  assert.deepEqual(requests,[0,2,4,6]);
  assert.equal(renders.length,1);
  assertSkeleton(dashboard.html());
  assert.match(dashboard.getState().progress,/2 из 8/);
  assert.equal(dashboard.getState().loaded,false);
  assert.equal(directReads,0);
  pages.release();
  await new Promise(setImmediate);
  assertSkeleton(dashboard.html());
  assert.match(dashboard.getState().progress,/эпиках OBPROJECT/);
  metadata.release();
  await loading;
  assert.equal(dashboard.getState().issues.length,8);
  assert.equal(dashboard.getState().loaded,true);
  assert.doesNotMatch(dashboard.html(),/aria-busy="true"|ozon-ext-skeleton/);
  assert.match(dashboard.html(),/FCRM-7/);
  assert.match(dashboard.html(),/Эпик разработки/);
  assert.match(dashboard.html(),/1 задача по фильтрам/);
  assert.equal(measures.length,3);
  assert.equal(renders.length,2);

  pages=gate();
  failedOffset=4;
  const refresh=dashboard.load();
  await new Promise(setImmediate);
  assertSkeleton(dashboard.html());
  pages.release();
  await refresh;
  assert.match(dashboard.html(),/Показан последний загруженный список/);
  assert.match(dashboard.html(),/FCRM-7/);
  assert.doesNotMatch(dashboard.html(),/ozon-ext-skeleton/);
  assert.equal(dashboard.getState().issues.length,8);
  failedOffset=-1;

  const groupPath = name => 'component:' + encodeURIComponent(name);
  const firstGroup = groupPath('Группа A');
  const secondGroup = groupPath('Группа B');
  const events = {};
  const grouping = {checked:true, focus(){}, addEventListener:(event,handler)=>{events[event]=handler;}};
  const groupToggle = {
    dataset:{strategyAction:'toggle',path:firstGroup},
    getAttribute:()=>String(dashboard.html().includes('data-path="'+firstGroup+'" aria-expanded="true"')),
    addEventListener:(event,handler)=>{events[event]=handler;}
  };
  dashboard.bind({
    querySelector:selector=>selector==='[data-strategy-group-components]' ? grouping : null,
    querySelectorAll:selector=>selector==='[data-strategy-action]' ? [groupToggle] : []
  });
  const clickGroup = () => events.click({stopPropagation(){}});
  const state = dashboard.getState();
  state.search = '';
  events.change();
  assert.equal(JSON.parse(preferences.get('ozon-strategy-columns-v1')).byComponent,true);
  assert.equal(dashboard.html().match(/class="ozon-strategy-group ozon-strategy-component-group"/g).length,4);
  assert.match(dashboard.html(),/Без компонента <span class="ozon-ext-group-total">6<\/span>/);
  assert.doesNotMatch(dashboard.html(),/data-strategy-path="[^"]+\|FCRM-/);
  await clickGroup();
  assert.match(dashboard.html(),new RegExp('ozon-strategy-context" data-strategy-path="'+firstGroup+'\\|FCRM-1"'));
  assert.ok(dashboard.html().includes('data-strategy-path="'+firstGroup+'|FCRM-1|FCRM-7"'));
  assert.ok(!dashboard.html().includes('data-strategy-path="'+secondGroup+'|FCRM-1|FCRM-7"'));
  await clickGroup();
  assert.doesNotMatch(dashboard.html(),/data-strategy-path="[^"]+\|FCRM-/);

  state.search = 'FCRM-7';
  state.filterCollapsed.clear();
  assert.ok(dashboard.html().includes('data-strategy-path="'+firstGroup+'|FCRM-1|FCRM-7"'));
  assert.ok(dashboard.html().includes('data-strategy-path="'+secondGroup+'|FCRM-1|FCRM-7"'));
  assert.match(dashboard.html(),/1 задача по фильтрам/);
  state.componentFilter.add('Группа B');
  assert.equal(dashboard.html().match(/class="ozon-strategy-group ozon-strategy-component-group"/g).length,1);
  assert.ok(dashboard.html().includes('data-strategy-path="'+secondGroup+'|FCRM-1|FCRM-7"'));
  state.componentFilter.add('Группа A');
  assert.equal(dashboard.html().match(/class="ozon-strategy-group ozon-strategy-component-group"/g).length,2);
  assert.match(dashboard.html(),/1 задача по фильтрам/);
  state.componentFilter.delete('Группа A');
  state.componentFilter.add('__none__');
  state.search = '';
  assert.match(dashboard.html(),/7 задач по фильтрам/);
  assert.match(dashboard.html(),/Без компонента <span class="ozon-ext-group-total">6<\/span>/);
  assert.ok(!dashboard.html().includes('data-strategy-path="'+firstGroup+'"'));
  state.search = 'FCRM-7';
  grouping.checked = false;
  events.change();
  assert.doesNotMatch(dashboard.html(),/ozon-strategy-component-group/);
  assert.match(dashboard.html(),/data-strategy-path="FCRM-1\|FCRM-7"/);
  console.log('Strategy checks passed: skeleton, retry, exact search, component multi-select and grouping.');
})().catch(error=>{console.error(error);process.exitCode=1;});
