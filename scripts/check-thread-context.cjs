const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('jszip');

const id = 'fcrm-fixture';
const jira = 'https://jit.o3.ru';
const confluence = 'https://confluence.o3.ru';
const missing = 'https://confluence.o3t.ru';
const board = jira + '/secure/RapidBoard.jspa?rapidView=93';
const jiraPath = key => '/rest/api/2/issue/' + key + '?fields=summary,description,comment,issuelinks,labels';
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
  const requests = [], searches = [];
  const failedLimits = new Set();
  const searchFields='summary,description,components,labels,issuetype,status,issuelinks';
  const candidate={key:'FCRM-80',fields:{summary:'Изменить карточку операции CASE-7429',
    description:'Совпадает сценарий обработки реквизитов CASE-7429',labels:[],components:[{name:'Поддержка'}],
    issuetype:{name:'Задача'},status:{name:'В работе',statusCategory:{key:'indeterminate'}},issuelinks:[]}};
  const other={key:'FCRM-82',fields:{...candidate.fields,summary:'Другая карточка',description:'Другая операция CASE-6000'}};
  const theme={key:'FCRM-81',fields:{...candidate.fields,summary:'Работа с реквизитами',
    labels:['fcrm_umb_epic'],issuetype:{name:'Epic'},description:'Поддержка сценариев реквизитов CASE-7429'}};
  const linkedKey='FCRM-83';
  const directKey='FCRM-86';
  let directLabels=['fcrm_umb_epic'];
  const jiraReceiver = tabReceiver(receiver,jira,path => {
    const request=new URL(path,jira);
    if (request.pathname === '/rest/api/2/search') {
      assert.deepEqual(Array.from(request.searchParams.keys()).sort(),['fields','jql','maxResults']);
      assert.equal(request.searchParams.get('fields'),searchFields);
      const jql=request.searchParams.get('jql');
      const limit=Number(request.searchParams.get('maxResults'));
      assert.match(jql,/ORDER BY updated DESC$/);
      assert.match(jql,/text ~ "case-7429"/i);
      assert.match(jql,/key in \(FCRM-83,FCRM-81\)/);
      searches.push({jql,limit});
      if (failedLimits.has(limit)) return json({},503);
      if (limit === 16) {
        assert.match(jql,/^project = FCRM AND labels = fcrm_umb_epic AND statusCategory != Done AND \(/);
        const milestone={key:'FCRM-84',fields:{...theme.fields,summary:'Веха: карточки реквизитов'}};
        const outdated={key:'FCRM-85',fields:{...theme.fields,status:{name:'Архив'}}};
        return json({issues:[theme,milestone,outdated],total:3});
      }
      assert.equal(limit,24);
      assert.match(jql,/^project in \(FCRM,OB,OBFRONT,FTD,FACS\) AND \(/);
      return json({issues:[candidate,other,theme],total:3});
    }
    if (path === jiraPath('FCRM-43')) return json({},403);
    if (path===jiraPath(linkedKey)) return json({key:linkedKey,fields:{summary:'Подтверждённая дубль-связь',description:'Связанный кейс CASE-7429'}});
    if (path === jiraPath(directKey)) return json({key:directKey,fields:{summary:'Тематика с прямой ссылкой CASE-7429',labels:directLabels}});
    assert.equal(path,jiraPath('FCRM-42'));
    return json({key:'FCRM-42',fields:{summary:'Копирование реквизитов',description:'Факт из Jira',
      comment:{comments:[{body:'Комментарий из Jira'}]},issuelinks:[
        {id:'22',outwardIssue:{key:linkedKey},type:{name:'Dupes',outward:'Дубликат'}},
        {id:'23',outwardIssue:{key:'FCRM-81'},type:{name:'Project',outward:'Задача проекта'}},
      ]}});
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
    [jira+'/rest/api/2/search?'+new URLSearchParams({jql:'project = PRIVATE ORDER BY updated DESC',fields:searchFields,maxResults:'24'}),{id}],
    [jira+'/rest/api/2/search?'+new URLSearchParams({jql:'project in (FCRM,OB,OBFRONT,FTD,FACS) AND (text ~ "карточка") ORDER BY updated DESC',fields:searchFields,maxResults:'100'}),{id}],
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
        id:root,root_id:'',create_at:1,message:['Реквизиты операции CASE-7429 в карточке.','FCRM-42','FCRM-43',urlForPage(confluence,101),urlForPage(missing,102),...(failedLimits.size===2 ? [directKey] : [])].join(' ')
      }}});
      if (target.pathname === '/api/v1/auths/') return json({token:'fixture-token'});
      if (target.pathname === '/api/models') return json([]);
      if (target.pathname === '/api/v1/chats/new') return json({id:'fixture'});
      if (target.pathname === '/api/chat/completions') {
        payload = JSON.parse(options.body);
        const content = JSON.stringify({status:'draft',summary:'Уточнить порядок копирования',
          goal:'Сократить время работы.',changes:['Учесть подтверждённый порядок действий.'],
          themeKey:theme.key,themeReason:'Поддержка сценария CASE-7429',
          duplicates:[{key:candidate.key,reason:'Один идентификатор CASE-7429'},
            {key:linkedKey,reason:'Подтверждённая связь Duplicate по сценарию CASE-7429'},
            {key:'FCRM-9999',reason:'Модель выдумала ключ'},
            {key:theme.key,reason:'Тематика не должна стать дублем'},
            {key:directKey,reason:'Модель ошибочно выбрала прочитанную тематику'}],
          links:[{key:'FCRM-42',kind:'related',reason:'В задаче описаны исходные операции'},
            {key:'FCRM-43',kind:'related',reason:'Недоступная задача'},
            {key:candidate.key,kind:'related',reason:'Уже предложена как дубль'}]});
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
  const contextCalls=calls.filter(([,endpoint])=>new URL(endpoint).pathname !== '/rest/api/2/search');
  assert.deepEqual(contextCalls,[[17,jira+jiraPath('FCRM-42')],[17,jira+jiraPath('FCRM-43')],[22,confluence+contentPath],[17,jira+jiraPath(linkedKey)]]);
  assert.deepEqual(searches.map(item=>item.limit).sort((a,b)=>a-b),[16,24]);
  assert.ok(calls.filter(([,endpoint])=>new URL(endpoint).pathname === '/rest/api/2/search').every(([tab])=>tab === 17));
  const modelContext=JSON.parse(payload.messages[1].content);
  const refs=modelContext.references;
  assert.ok(modelContext.candidates.some(item=>item.key===candidate.key));
  assert.ok(modelContext.candidates.some(item=>item.key===other.key));
  assert.deepEqual(modelContext.context.themes.map(item=>item.key),[theme.key]);
  assert.deepEqual(draft.themes.map(item=>item.key),[theme.key]);
  assert.equal(draft.duplicateSearch,'checked');
  assert.equal(draft.themeSearch,'checked');
  assert.deepEqual(draft.duplicates.map(item=>item.key),[candidate.key,linkedKey]);
  assert.match(draft.duplicates[0].reason,/CASE-7429/);
  assert.equal(draft.duplicates[0].title,candidate.fields.summary);
  assert.deepEqual(draft.links.map(item=>item.key),['FCRM-42']);
  assert.equal(draft.themeKey,theme.key);
  assert.match(refs[0].content,/Факт из Jira[\s\S]+Комментарий из Jira/);
  assert.match(refs[2].content,/Факт из Confluence/);
  assert.match(refs.find(item=>item.key===linkedKey).content,/Связанный кейс CASE-7429/);
  assert.deepEqual(payload.tool_ids,[]);
  assert.deepEqual(draft.sources.map(source=>source.status),['read','unavailable','read','unavailable','read']);
  assert.match(draft.sources[1].reason,/Доступ запрещён/);
  assert.match(draft.sources[3].reason,/Откройте или обновите вкладку Confluence/);
  assert.equal(requests.length,7);
  assert.equal(requests.filter(entry=>entry.path.startsWith('/rest/api/2/search?')).length,2);
  failedLimits.add(16);
  const themeFailureResponse=await dispatch(listeners,message,sender);
  assert.equal(themeFailureResponse.ok,true,themeFailureResponse.error);
  const themeFailure=JSON.parse(themeFailureResponse.text);
  assert.equal(themeFailure.duplicateSearch,'checked');
  assert.equal(themeFailure.themeSearch,'unavailable');
  assert.deepEqual(themeFailure.duplicates.map(item=>item.key),[candidate.key,linkedKey]);
  assert.equal(themeFailure.themeKey,'');
  failedLimits.add(24);
  const responseAfterFailure = await dispatch(listeners,message,sender);
  assert.equal(responseAfterFailure.ok,true,responseAfterFailure.error);
  const afterFailure = JSON.parse(responseAfterFailure.text);
  assert.equal(afterFailure.duplicateSearch,'unavailable');
  assert.equal(afterFailure.themeSearch,'unavailable');
  assert.deepEqual(afterFailure.duplicates.map(item=>item.key),[linkedKey]);
  assert.equal(afterFailure.themeKey,'');
  const fallbackContext=JSON.parse(payload.messages[1].content);
  assert.ok(fallbackContext.references.some(ref=>ref.key===directKey && ref.status==='read' && ref.thematic===true));
  assert.deepEqual(fallbackContext.candidates,[]);
  assert.deepEqual(fallbackContext.context.themes,[]);
  assert.ok(requests.some(entry=>entry.path===jiraPath(directKey)));

  directLabels=[];
  const withoutThemeLabel=await dispatch(listeners,message,sender);
  assert.equal(withoutThemeLabel.ok,true,withoutThemeLabel.error);
  assert.deepEqual(JSON.parse(withoutThemeLabel.text).duplicates.map(item=>item.key),[linkedKey,directKey]);
  console.log('Thread context checks passed: sender, tab routing, same-origin GET, Jira denial, Confluence missing tab, scoped search and grounded model output.');
}

checkThreadContext().catch(error=>{console.error(error);process.exitCode=1;});
