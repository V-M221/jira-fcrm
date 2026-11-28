const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('jszip');

const id = 'fcrm-fixture';
const jira = 'https://jit.o3.ru';
const confluence = 'https://confluence.o3.ru';
const missing = 'https://confluence.o3t.ru';
const board = jira + '/secure/RapidBoard.jspa?rapidView=93';
const jiraPath = key => '/rest/api/2/issue/' + key + '?fields=summary,description,comment,issuelinks';
const contentPath = '/rest/api/content/101?expand=body.view';
const urlForPage = (origin, pageId) => origin + '/pages/viewpage.action?pageId=' + pageId;
const json = (body, status) => Response.json(body, {status});
const runtime = listeners => ({id,onMessage:{addListener:listener=>listeners.push(listener)}});
const copy = value => JSON.parse(JSON.stringify(value));
const dispatch = (listeners, message, sender) => new Promise(resolve => {
  if (!listeners.some(listener=>listener(message,sender,value=>resolve(copy(value))) === true)) resolve(undefined);
});

function tabReceiver(script, origin, get, requests) {
  const listeners = [];
  vm.runInNewContext(script,{
    chrome:{runtime:runtime(listeners)},location:new URL(origin),URL,AbortSignal,
    document:{getElementById:key=>key==='o3ds-styles' ? {} : null,querySelectorAll:()=>[],addEventListener(){}},
    MutationObserver:class {observe(){}},
    fetch:async (input, options) => {
      requests.push({origin,path:input});
      assert.equal(options.method,'GET');
      assert.equal(options.credentials,'same-origin');
      assert.equal(options.redirect,'manual');
      assert.equal(options.cache,'no-store');
      assert.equal(options.headers.Accept,'application/json');
      assert.equal(input.startsWith('/rest/api/'),true);
      return get(input);
    }
  });
  return (message, sender = {id}) => dispatch(listeners,message,sender);
}

async function checkThreadContext() {
  const archive = await JSZip.loadAsync(fs.readFileSync('FCRM-Chrome-3.3.zip'));
  const manifest = JSON.parse(await archive.file('manifest.json').async('string'));
  const receiver = await archive.file('issue-enhance.js').async('string');
  const worker = await archive.file(manifest.background.service_worker).async('string');
  const matchingScript = manifest.content_scripts.find(entry=>entry.js.includes('issue-enhance.js'));
  for (const origin of [jira,confluence,missing]) assert.ok(matchingScript.matches.includes(origin + '/*'));
  const requests = [];
  const jiraReceiver = tabReceiver(receiver,jira,path => {
    if (path === jiraPath('FCRM-43')) return json({},403);
    assert.equal(path,jiraPath('FCRM-42'));
    return json({key:'FCRM-42',fields:{summary:'Копирование реквизитов',description:'Факт из Jira',
      comment:{comments:[{body:'Комментарий из Jira'}]}}});
  },requests);
  const confluenceReceiver = tabReceiver(receiver,confluence,path=>{
    assert.equal(path,contentPath);
    return json({id:'101',title:'Порядок действий',body:{view:{value:'<p>Факт из Confluence</p>'}}});
  },requests);
  const reference = endpoint => ({type:'o3ds:thread-reference',endpoint,method:'POST'});
  for (const [endpoint,sender] of [
    [jira+jiraPath('FCRM-42'),{id:'foreign'}],
    [jira+jiraPath('FCRM-42'),{id,tab:{id:17}}],
    [confluence+contentPath,{id}],
    [jira+'/rest/api/2/issueLink',{id}],
    [jira+jiraPath('FCRM-42')+'&fields=summary',{id}],
  ]) assert.equal(await jiraReceiver(reference(endpoint),sender),undefined);
  assert.equal(requests.length,0);
  assert.equal((await jiraReceiver(reference(jira+jiraPath('FCRM-43')))).reason,'Доступ запрещён');

  let storageReads = 0;
  let payload;
  const sender = {id,frameId:0,url:board,tab:{id:17}};
  const listeners = [];
  const calls = [];
  const seenQueries = [];
  const root = 'a'.repeat(26);
  vm.runInNewContext(worker,{
    URL,URLSearchParams,crypto,AbortSignal,TextEncoder,setTimeout,
    chrome:{
      runtime:runtime(listeners),storage:{local:{get:async()=>{storageReads++;return {};}}},
      tabs:{
        query:async ({url})=>{seenQueries.push(url);return url===confluence+'/*' ? [{id:22}] : [];},
        sendMessage:async (tabId,message,options)=>{
          assert.equal(options.frameId,0);
          assert.equal(message.type,'o3ds:thread-reference');
          calls.push([tabId,message.endpoint]);
          assert.ok([17,22].includes(tabId));
          return (tabId === 17 ? jiraReceiver : confluenceReceiver)(message);
        }
      }
    },
    fetch:async (input,options) => {
      const target = new URL(input);
      assert.ok(['chatzone.o3t.ru','deepseek.o3t.ru'].includes(target.hostname),'External reads must use the matching tab');
      if (target.hostname === 'chatzone.o3t.ru') return json({posts:{[root]:{
        id:root,root_id:'',create_at:1,message:['FCRM-42','FCRM-43',urlForPage(confluence,101),urlForPage(missing,102)].join(' ')
      }}});
      if (target.pathname === '/api/v1/auths/') return json({token:'fixture-token'});
      if (target.pathname === '/api/models') return json([]);
      if (target.pathname === '/api/v1/chats/new') return json({id:'fixture'});
      if (target.pathname === '/api/chat/completions') {
        payload = JSON.parse(options.body);
        const content = JSON.stringify({status:'draft',summary:'Уточнить порядок копирования',
          goal:'Сократить время работы.',changes:['Учесть подтверждённый порядок действий.']});
        return new Response('data: ' + JSON.stringify({choices:[{delta:{content}}]}) + '\n\ndata: [DONE]\n\n',
          {headers:{'Content-Type':'text/event-stream'}});
      }
      if (target.pathname === '/api/v1/chats/fixture' && options.method === 'DELETE') return json({});
      throw new Error('Unexpected worker request: ' + target.pathname);
    }
  });
  const message = {type:'o3ds:chat',mode:'thread',issueKey:'FCRM',
    approvedDescription:JSON.stringify({urls:['https://chatzone.o3t.ru/o3/pl/'+root],issueTypeName:'Задача',componentName:'Поддержка'})};
  for (const bad of [{id:'foreign'},{frameId:1},{url:confluence},{url:jira+'/browse/FCRM-42'},{tab:undefined}]) {
    assert.equal(await dispatch(listeners,message,{...sender,...bad}),undefined);
  }
  assert.equal(storageReads,0);
  assert.equal(calls.length,0);

  const output = await dispatch(listeners,message,sender);
  assert.equal(output.ok,true,output.error);
  const draft = JSON.parse(output.text);
  assert.deepEqual(seenQueries,[confluence+'/*',missing+'/*']);
  assert.deepEqual(calls,[[17,jira+jiraPath('FCRM-42')],[17,jira+jiraPath('FCRM-43')],[22,confluence+contentPath]]);
  const refs = JSON.parse(payload.messages[1].content).references;
  assert.match(refs[0].content,/Факт из Jira[\s\S]+Комментарий из Jira/);
  assert.match(refs[2].content,/Факт из Confluence/);
  assert.deepEqual(payload.tool_ids,[]);
  assert.deepEqual(draft.sources.map(source=>source.status),['read','unavailable','read','unavailable']);
  assert.match(draft.sources[1].reason,/Доступ запрещён/);
  assert.match(draft.sources[3].reason,/Откройте или обновите вкладку Confluence/);
  assert.equal(requests.length,4);
  console.log('Thread context checks passed: sender, tab routing, same-origin GET, Jira denial, Confluence missing tab, no model tools.');
}

checkThreadContext().catch(error=>{console.error(error);process.exitCode=1;});
