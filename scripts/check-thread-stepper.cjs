const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const moduleExports = {};
const writer = ts.transpileModule(fs.readFileSync('src/services/fcrmThreadWriter.ts', 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
}).outputText;
const globals = {exports:moduleExports,URL,URLSearchParams,TextEncoder,AbortSignal,crypto:webcrypto};
vm.runInNewContext(writer, globals);
const {createFcrmThreadWriter} = moduleExports;

async function checkStepper() {
  const url = 'https://chatzone.o3t.ru/example/pl/' + 'r'.repeat(26);
  const draft = {urls:[url], issueTypeId:'10',componentId:'20',summary:'Проверить отображение карточки',description:'Описание',mentionedIssueKeys:['FCRM-812','FCRM-813']};
  const journal = new Map(), operations=[];
  const controls = {journalWrites:0,currentMatches:[],exact:[],lastReceipt:undefined};
  globals.localStorage={getItem:key=>journal.get(key),setItem:(key,value)=>{controls.journalWrites++;journal.set(key,value);}};
  globals.navigator={locks:{request:(_key, callback)=>callback()}};
  const reply = (data,status=200)=>Response.json(data,{status});
  globals.fetch = async (path,opts={})=>{
    const u = new URL(path,'https://fixture.example');
    const method=opts.method||'GET';
    operations.push([method,u.pathname,u.search]);
    if(u.pathname.endsWith('/search')) {
      const jql=u.searchParams.get('jql');
      const issues=jql.includes('key in')?controls.currentMatches:jql.includes('labels in')?controls.exact:[];
      return reply({issues,total:issues.length});
    }
    if(u.pathname.includes('/createmeta/')) return reply({total:4,values:['summary','description','components','labels'].map(fieldId=>({fieldId}))});
    if(u.pathname.endsWith('/components')) return reply([{id:'20'}]);
    if(u.pathname.endsWith('/issue')&&method==='POST') {
      controls.lastReceipt={key:'FCRM-814',fields:JSON.parse(opts.body).fields};
      throw new Error('connection lost after request');
    }
    if(u.pathname.endsWith('/issue/FCRM-814')) return reply(controls.lastReceipt);
    if(u.pathname.endsWith('/remotelink')) return reply([]);
    throw new Error('Unexpected fixture request '+u.pathname);
  };
  const issue=(key,summary,description='')=>({key,fields:{summary,description,project:{key:'FCRM'}}});
  const subject=createFcrmThreadWriter();
  const ready = await subject.inspect(draft);
  assert.equal(ready.state,'ready');
  assert.equal(ready.issues.length,0);
  controls.currentMatches=[issue('FCRM-812','Похожая задача')];
  const warned=await subject.inspect(draft);
  assert.equal(warned.state,'possible-duplicate');
  assert.deepEqual(Array.from(warned.issues, x=>[x.key,x.title]),[['FCRM-812','Похожая задача']]);
  controls.exact=[issue('FCRM-800','Задача из того же треда','[Источник|'+url+']')];
  const exact=await subject.inspect(draft);
  assert.equal(exact.state,'existing');
  assert.equal(exact.issues[0].title,'Задача из того же треда');
  assert.equal(controls.journalWrites,0);
  assert.ok(operations.every(([method])=>method==='GET'));
  controls.exact=[];
  controls.currentMatches.push(issue('FCRM-813','Новая совпавшая задача'));
  await assert.rejects(subject.create({...draft,confirmedDuplicateKeys:['FCRM-812']}),error=>error.code==='THREAD_POSSIBLE_DUPLICATE');
  assert.equal(controls.journalWrites,0);
  assert.ok(operations.every(([method])=>method==='GET'));
  await assert.rejects(subject.create({...draft,confirmedDuplicateKeys:['FCRM-812','FCRM-813']}),error=>error.code==='THREAD_CREATE_UNKNOWN');
  assert.equal((await subject.inspect(draft)).state,'uncertain');
  await assert.rejects(subject.create({...draft,confirmedDuplicateKeys:['FCRM-812','FCRM-813']}),error=>error.code==='THREAD_CREATE_UNKNOWN');
  assert.equal(operations.filter(([method,path])=>method==='POST'&&path.endsWith('/issue')).length,1);
  controls.exact=[controls.lastReceipt];
  const pending=await subject.inspect(draft);
  assert.equal(pending.state,'uncertain');
  assert.equal(pending.issues[0].key,'FCRM-814');
  assert.equal((await subject.recover(draft)).key,'FCRM-814');

  const content=fs.readFileSync('FCRM-Chrome-3.3/content.js','utf8');
  new vm.Script(content);
  const start=content.indexOf('    function setStep(number');
  const end=content.indexOf('    function draftReady()',start);
  assert.ok(start>=0&&end>start);
  const controlsForStep=Array.from({length:3},()=>({focus(){},pane:{hidden:true},caption:{},dataset:{},
    attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},
    querySelector(q){return q==='[data-thread-step-body]'?this.pane:q==='[data-thread-step-summary]'?this.caption:this;}
  }));
  const context=vm.createContext({steps:controlsForStep,step:1,panel:{hidden:false},
    requestSnapshot:{urls:[url],issueTypeName:'Задача',componentName:'Компонент'},
    summary:{value:'Ручное название'},normalizedSummary:s=>s.trim()});
  vm.runInContext(content.slice(start,end),context);
  for(const number of [1,2,3,2,1]){
    vm.runInContext('setStep('+number+')',context);
    assert.deepEqual(controlsForStep.map(x=>x.pane.hidden),Array.from({length:3},(_,i)=>i!==number-1));
    assert.equal(controlsForStep.filter(x=>x.attrs.get('aria-current')==='step').length,1);
    assert.equal(context.summary.value,'Ручное название');
  }
  console.log('Stepper regression PASS: single open step, read-only inspection, exact match, updated duplicate set, and uncertain response.');
}

checkStepper().catch(error => { console.error(error); process.exitCode = 1; });
