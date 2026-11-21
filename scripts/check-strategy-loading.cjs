const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsObj = {};
const requests = [];
const renders = [];
const measures = [];
const issues = Array.from({length:8}, (_,i)=>({key:'FCRM-' + (i+1),fields:{summary:'Задача ' + (i+1)}}));
let releasePages;
const pagesMayFinish = new Promise(resolve=>{releasePages=resolve;});
const response = value => ({ok:true,json:async()=>value});
const fetch = async path => {
  const url=new URL(path,'https://jira.example');
  if (url.pathname.endsWith('/field')) return response([]);
  if (url.pathname.endsWith('/issue/FCRM-7')) return response(issues[6]);
  const offset=Number(url.searchParams.get('startAt'));
  requests.push(offset);
  if (offset) await pagesMayFinish;
  return response({startAt:offset,total:issues.length,issues:issues.slice(offset,offset+2)});
};
const source = fs.readFileSync('src/services/strategicDashboard.ts','utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports:exportsObj,fetch,URLSearchParams,AbortController,document:{getElementById:()=>null},
  performance:{now:()=>Date.now(),measure:name=>measures.push(name)}
});

(async()=>{
  const dashboard=exportsObj.createStrategicDashboard(()=>renders.push(dashboard.html()),()=>'', 'test');
  dashboard.getState().search='FCRM-7';
  const loading=dashboard.load();
  await new Promise(setImmediate);
  assert.deepEqual(requests,[0,2,4,6]);
  assert.ok(renders.some(html=>html.includes('ozon-strategy-preview') && html.includes('Продолжаем поиск')));
  assert.ok(renders.some(html=>html.includes('ozon-strategy-preview') && html.includes('/browse/FCRM-7')));
  assert.equal(dashboard.getState().loaded,false);
  releasePages();
  await loading;
  assert.equal(dashboard.getState().issues.length,8);
  assert.equal(dashboard.getState().loaded,true);
  assert.doesNotMatch(dashboard.html(),/ozon-strategy-preview/);
  assert.match(dashboard.html(),/FCRM-7/);
  assert.match(dashboard.html(),/1 задача по фильтрам/);
  assert.equal(measures.length,3);
  console.log('Strategy load checks passed: partial results, exact search during loading, concurrent pages and final hierarchy.');
})().catch(error=>{console.error(error);process.exitCode=1;});
