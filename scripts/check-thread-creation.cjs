const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const root = 'a'.repeat(26);
const reply = 'b'.repeat(26);
const threadUrl = 'https://chatzone.o3t.ru/example/pl/' + root;
const replyUrl = 'https://chatzone.o3t.ru/example/pl/' + reply;
const mockedAuthValue = 'fixture';
const json = (body, status) => Response.json(body, {status});
const immediate = callback => queueMicrotask(callback);
const answer = {
  status: 'draft',
  summary: 'Копирование номера карты',
  goal: 'Сократить время работы оператора.',
  changes: ['Сделать копирование доступным в карточке.'],
  themeKey: 'FCRM-123',
  themeReason: 'Тематика охватывает действия с картой.',
  links: [
    {key:'FCRM-42',kind:'related',reason:'Описывает операции с карточкой.'},
    {key:'OB-45',kind:'development',reason:'Согласована реализация копирования.'},
    {key:'FCRM-77',kind:'related',reason:'Нет доступа к содержимому.'},
    {key:'FCRM-99',kind:'related',reason:'Ключ придуман моделью.'},
    {key:'B2BPROJECT-50',kind:'related',reason:'Проект доступен только для чтения.'},
  ],
  question: 'Где разместить кнопку?',
  questionReason: 'Это уточнит расположение кнопки в описании.',
};

function load(file, globals = {}) {
  const exports = {};
  const script = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(script, {exports, URL, URLSearchParams, crypto, AbortSignal, TextEncoder, setTimeout: immediate, ...globals});
  return exports;
}

async function checkDrafts() {
  let calls = [];
  let answerForRun = answer;
  let getMode = 'sse';
  let access = true;
  let sourceFailures = 0;
  let taskPolls = 0;
  let outputReads = 0;
  let assistantId;
  let payload;
  const {completeDeepseekChat} = load('src/services/deepseek.ts', {fetch: async (input, options) => {
    const url = new URL(input);
    const path = url.pathname;
    calls.push({host:url.hostname,path, method: options.method || 'GET'});
    if (url.hostname.startsWith('chatzone.')) {
      if (!access) return json({},403);
      if (sourceFailures++ === 0) return json({},503);
      return json({posts:{
        [root]:{id:root,root_id:'',create_at:1,message:'Добавить копирование номера карты. См. FCRM-42, OB-45, FCRM-77, FCRM-78 и https://confluence.o3.ru/pages/viewpage.action?pageId=101. Доступ к https://confluence.o3t.ru/display/TEST/Private+page и https://logs.o3t.ru/logs?filter=fixture-query#fixture-fragment.',user_id:'must-not-send'},
        [reply]:{id:reply,root_id:root,create_at:2,message:'Место кнопки согласуем.'},
      }});
    }
    if (['jit.o3.ru','confluence.o3.ru','confluence.o3t.ru'].includes(url.hostname)) {
      assert.equal(options.method,'GET');
      assert.equal(options.credentials,'include');
      assert.equal(options.redirect,'manual');
    }
    if (url.hostname === 'jit.o3.ru') {
      assert.equal(url.searchParams.get('fields'),'summary,description,comment,issuelinks,labels');
      const key = path.split('/').at(-1);
      if (key === 'FCRM-77') return json({},403);
      if (key === 'FCRM-78') return json({},401);
      assert.ok(['FCRM-42','OB-45','B2BPROJECT-50','FTD-84'].includes(key));
      return json({key,fields:{summary:'Задача ' + key,description:'Факт из описания ' + key + ' https://example.invalid/related?filter=fixture-jira',
        comment:{comments:[{body:'Уточнение из комментария'}]},
        issuelinks:[{outwardIssue:{key:'OB-45'},type:{outward:'В проекте'}}]}});
    }
    if (url.hostname === 'confluence.o3.ru') {
      assert.equal(path,'/rest/api/content/101');
      assert.equal(url.searchParams.get('expand'),'body.view');
      return json({id:'101',title:'Описание функций',body:{view:{value:'<p>Факт из документа &amp; условия</p><script>hidden-script</script>'}}});
    }
    if (url.hostname === 'confluence.o3t.ru') {
      assert.equal(path,'/rest/api/content');
      assert.equal(url.searchParams.get('spaceKey'),'TEST');
      assert.equal(url.searchParams.get('title'),'Private page');
      return new Response(null,{status:302,headers:{location:'https://example.invalid/login'}});
    }
    if (path === '/api/v1/auths/') {
      assert.equal(options.credentials,'include');
      return json({token:mockedAuthValue,email:'must-not-send'});
    }
    if (path === '/api/models') return json([]);
    if (path === '/api/v1/chats/new') {
      assistantId = JSON.parse(options.body).chat.history.currentId;
      return json({id:'mock'});
    }
    if (path === '/api/chat/completions') {
      assert.equal(options.headers.Authorization,'Bearer ' + mockedAuthValue);
      payload = JSON.parse(options.body);
      if (getMode === 'poll') return json({status:true});
      const output = '<think>internal analysis</think>\n' + JSON.stringify(answerForRun);
      return new Response('data: ' + JSON.stringify({choices:[{delta:{content:output}}]}) + '\n\ndata: [DONE]\n\n',
        {headers:{'Content-Type':'text/event-stream'}});
    }
    if (path === '/api/tasks/chat/mock') {
      if (taskPolls++ === 0) return json({},503);
      return json({task_ids:[]});
    }
    if (path === '/api/v1/chats/mock' && options.method === 'DELETE') return json({});
    if (path === '/api/v1/chats/mock') {
      const done = ++outputReads === 2;
      return json({chat:{history:{messages:{[assistantId]:{done,content:JSON.stringify(done ? answerForRun : answer)}}}}});
    }
    throw new Error('Unexpected request: ' + path);
  }});
  const input = JSON.stringify({
    urls:[replyUrl],issueTypeName:'Задача',componentName:'Демо',
    additionalInfo:'Контекст B2BPROJECT-50 https://fixture-user@example.invalid/context',
    clarification:'Уточнение FTD-84 https://example.invalid/clarification?filter=fixture-clarification',themes:[{key:'FCRM-123',title:'Тема',description:'Действия с картой'}],
  });
  const run = (preview = false) => completeDeepseekChat('FCRM','thread',null,input,'ignored',undefined,'',preview);
  const prompt = JSON.parse(await run(true));
  assert.match(prompt.system,/fcrm-thread\/4/);
  assert.equal(calls.length,0);
  const result = JSON.parse(await run());
  assert.equal(result.status,'draft');
  assert.deepEqual(result.urls,[threadUrl]);
  assert.deepEqual(result.mentionedIssueKeys,['FCRM-42','FCRM-77','FCRM-78']);
  assert.equal(result.themeReason,answer.themeReason);
  assert.equal(result.duplicateSearch,'unavailable');
  assert.equal(result.themeSearch,'unavailable');
  assert.deepEqual(result.duplicates,[]);
  assert.deepEqual(result.links,[
    {key:'FCRM-42',title:'Задача FCRM-42',kind:'related',reason:answer.links[0].reason},
    {key:'OB-45',title:'Задача OB-45',kind:'development',reason:answer.links[1].reason},
  ]);
  assert.deepEqual(result.sources.map(source => [source.kind,source.key || source.title,source.status]),[
    ['jira','FCRM-42','read'],['jira','OB-45','read'],['jira','FCRM-77','unavailable'],['jira','FCRM-78','unavailable'],
    ['jira','B2BPROJECT-50','read'],['jira','FTD-84','read'],
    ['confluence','Описание функций','read'],['confluence','Документ Confluence','unavailable'],['logs','Логи','unavailable'],
  ]);
  assert.match(result.sources[2].reason,/запрещён/);
  assert.match(result.sources[3].reason,/войти/);
  assert.match(result.sources[7].reason,/войти/);
  assert.equal(result.sources.at(-1).url,'https://logs.o3t.ru/logs');
  assert.ok(result.sources.every(source => !Object.hasOwn(source,'content') && !Object.hasOwn(source,'relations')));
  assert.equal(calls.filter(call => call.host === 'jit.o3.ru').length,6);
  assert.equal(calls.filter(call => call.host.startsWith('confluence.')).length,2);
  assert.ok(calls.every(call => !call.host.startsWith('logs.')));
  const context = JSON.parse(payload.messages[1].content);
  assert.equal(context.context.project,'FCRM');
  assert.equal(context.context.themes[0].description,'Действия с картой');
  assert.match(context.references[0].content,/Факт из описания FCRM-42[\s\S]+Уточнение из комментария/);
  assert.deepEqual(context.references[0].relations,[{key:'OB-45',type:'В проекте'}]);
  assert.match(context.references[6].content,/Факт из документа & условия/);
  assert.doesNotMatch(context.references[6].content,/hidden-script/);
  assert.equal(result.themeKey,'FCRM-123');
  assert.equal(result.questionReason,'Это уточнит расположение кнопки в описании.');
  assert.deepEqual(payload.tool_ids,[]);
  assert.deepEqual(payload.skill_ids,[]);
  assert.equal(payload.features.memory,false);
  assert.match(result.description,/^h2\. Цель[\s\S]+h2\. Что меняется/);
  assert.match(context.sources[0].posts[0].message,/https:\/\/logs\.o3t\.ru\/logs\./);
  assert.match(context.additionalInfo,/https:\/\/example\.invalid\/context/);
  assert.match(context.clarification,/https:\/\/example\.invalid\/clarification/);
  assert.doesNotMatch(JSON.stringify(payload), /must-not-send|hidden-script|email|fixture-(query|fragment|user|jira|clarification)/);
  assert.doesNotMatch(JSON.stringify(result), /internal analysis/);
  assert.equal(calls.filter(call => call.path.includes('/posts/')).length,2);

  getMode = 'poll';
  answerForRun = {status:'clarification',question:'Где разместить кнопку?',questionReason:'Без этого нельзя описать карту действий.'};
  assert.deepEqual(JSON.parse(await run()),{status:'clarification',message:'Где разместить кнопку?',questionReason:'Без этого нельзя описать карту действий.',sources:result.sources,urls:result.urls,mentionedIssueKeys:result.mentionedIssueKeys,
    duplicates:[],duplicateSearch:'unavailable',themeSearch:'unavailable',themes:[]});
  assert.equal(taskPolls,3);
  assert.equal(outputReads,2);

  getMode = 'sse';
  answerForRun = {...answer,themeKey:'FCRM-999',question:'Скрытое рассуждение. Второе предложение.'};
  const filtered = JSON.parse(await run());
  assert.equal(filtered.themeKey,'');
  assert.equal(filtered.themeReason,'');
  assert.equal(filtered.message,'');
  assert.equal(filtered.questionReason,'');

  answerForRun = {...answer,themeReason:''};
  assert.equal(JSON.parse(await run()).themeKey,'');
  answerForRun = {...answer,questionReason:'<markup>Недопустимая разметка</markup>'};
  assert.equal(JSON.parse(await run()).questionReason,'');

  access = false;
  calls = [];
  await assert.rejects(run(),/тредов не найден или недоступен/);
  assert.ok(calls.every(call => call.path.includes('/posts/')));
}

async function checkWrites() {
  let current;
  let links = [];
  let receipt = 'key';
  let verifyUnavailable = false;
  let locked = false;
  let successfulVerification = false;
  let searchReady = true;
  let linkUnavailable = false;
  let issuePosts = 0;
  let mentioned = [];
  let sameTitle = [];
  const requests = [];
  const journal = new Map();
  const createMeta = [{fieldId:'summary'},{fieldId:'description'},{fieldId:'components'},{fieldId:'labels'}];
  const {createFcrmThreadWriter} = load('src/services/fcrmThreadWriter.ts', {
    localStorage:{getItem:key=>journal.get(key),setItem:(key,value)=>{
      assert.equal(locked,true,'Journal changes require the write lock');
      const record = Object.values(JSON.parse(value))[0];
      if (record?.verified) assert.equal(successfulVerification,true,'Verification must precede journal promotion');
      journal.set(key,value);
    }},
    navigator:{locks:{request:async (_name,callback)=>{
      assert.equal(locked,false,'Operations must not reacquire the same write lock');
      locked = true;
      try { return await callback(); } finally { locked = false; }
    }}},
    fetch:async (input, options) => {
      const url = new URL(input,'https://jira.example');
      const path = url.pathname;
      requests.push({path, method: options.method || 'GET'});
      const jql = url.searchParams.get('jql') || '';
      if (path.endsWith('/search') && jql.includes('key in (')) {
        assert.equal(url.searchParams.get('fields'),'summary,project,labels');
        return json({total:mentioned.length,issues:mentioned});
      }
      if (path.endsWith('/search') && jql.includes('summary ~')) {
        assert.equal(url.searchParams.get('fields'),'summary,labels');
        return json({total:sameTitle.length,issues:sameTitle});
      }
      if (path.endsWith('/search')) return json({total:current && searchReady ? 1 : 0,issues:current && searchReady ? [current] : []});
      if (path.includes('/createmeta/')) return json({total:createMeta.length,values:createMeta});
      if (path.endsWith('/FCRM/components')) return json([{id:'20'}]);
      if (path.endsWith('/issue') && options.method === 'POST') {
        issuePosts++;
        const {fields} = JSON.parse(options.body);
        assert.deepEqual(Object.keys(fields).sort(),['components','description','issuetype','project','summary']);
        assert.equal(fields.project.key,'FCRM');
        assert.equal(fields.issuetype.id,'10');
        assert.equal(fields.components[0].id,'20');
        assert.match(fields.description,/h2\. Источники/);
        assert.ok(fields.description.includes(threadUrl));
        current = {key:'FCRM-1',fields};
        assert.equal(locked,true);
        if (receipt === 'lost') throw new Error('lost receipt');
        return json(receipt === 'missing-key' ? {} : {key:'FCRM-1'},201);
      }
      if (path.endsWith('/remotelink')) {
        if (options.method === 'POST') {
          assert.equal(locked,true);
          assert.equal(receiptRecord()?.verified,true,'Link writes must follow verified readback');
          assert.notEqual(receiptRecord()?.receipt,false,'A duplicate checkpoint cannot authorize link writes');
          if (linkUnavailable) return json({},503);
          const body = JSON.parse(options.body);
          assert.match(body.globalId,/^ozon-fcrm-chatzone:/);
          links.push({object:body.object});
          return json({},201);
        }
        return json(links);
      }
      if (path.endsWith('/issue/FCRM-1')) {
        if (url.searchParams.get('fields')?.split(',').includes('issuetype')) {
          if (verifyUnavailable) return json({},503);
          if (locked) successfulVerification = true;
        }
        return json(current);
      }
      throw new Error('Unexpected request: ' + path);
    },
  });
  const writer = createFcrmThreadWriter();
  const input = {urls:[threadUrl],issueTypeId:'10',componentId:'20',summary:'Тест задачи',description:'Черновик'};
  function receiptRecord() {
    return Object.values(JSON.parse([...journal.values()][0] || '{}'))[0];
  }
  function assertExistingWithoutLinks(result, expectedKey = 'FCRM-1') {
    assert.equal(result.key,expectedKey);
    assert.equal(result.existing,true);
    assert.equal(result.canRetryLinks,false);
    assert.equal(result.linkOutcomes?.length ?? 0,0);
    assert.equal(result.linkFailures?.length ?? 0,0);
  }
  function assertOnlyReadOperationsSince(before) {
    assert.ok(requests.slice(before).every(request=>request.method === 'GET' && !request.path.endsWith('/remotelink')));
  }
  function issue(key, summary, labels = []) {
    return {key,fields:{project:{key:'FCRM'},summary,labels}};
  }
  async function inspect(expectedState, inspectInput = input) {
    const before = requests.length;
    const savedJournal = [...journal];
    const result = await writer.inspect(inspectInput);
    assert.equal(result.state,expectedState);
    assert.ok(requests.length > before);
    assert.ok(requests.slice(before).every(request => request.method === 'GET'));
    assert.deepEqual([...journal],savedJournal);
    return result.issues;
  }
  assert.equal((await inspect('ready')).length,0);
  const mentions = {...input,mentionedIssueKeys:['FCRM-42','FCRM-55']};
  const themeLabel = 'fcrm_umb_epic';
  mentioned = [issue('FCRM-42','Reported by the source thread'),issue('FCRM-55','Упомянутая тематика',[themeLabel])];
  sameTitle = [issue('FCRM-43',input.summary.toUpperCase()),issue('FCRM-44',input.summary + ' sibling'),
    issue('FCRM-56',input.summary,[themeLabel])];
  const duplicates = await inspect('possible-duplicate',mentions);
  assert.deepEqual(Array.from(duplicates, item => item.key),['FCRM-42','FCRM-43']);
  assert.equal(duplicates[0].title,mentioned[0].fields.summary);
  assert.match(duplicates[0].reason,/chatZone/);
  assert.equal(duplicates[1].title,sameTitle[0].fields.summary);
  assert.match(duplicates[1].reason,/название/);
  await assert.rejects(writer.create(mentions),{code:'THREAD_POSSIBLE_DUPLICATE'});
  sameTitle = [issue('FCRM-45',input.summary)];
  await assert.rejects(writer.create({...mentions,confirmedDuplicateKeys:['FCRM-42','FCRM-43']}), error =>
    error.code === 'THREAD_POSSIBLE_DUPLICATE' && Array.from(error.issueKeys).join(',') === 'FCRM-42,FCRM-45');
  sameTitle = [];
  await assert.rejects(writer.create({...mentions,confirmedDuplicateKeys:['FCRM-42','FCRM-45']}), error =>
    error.code === 'THREAD_POSSIBLE_DUPLICATE' && Array.from(error.issueKeys).join(',') === 'FCRM-42');
  assert.equal(issuePosts,0);
  assert.equal(journal.size,0);
  linkUnavailable = true;
  const partial = await writer.create({...mentions,confirmedDuplicateKeys:['FCRM-42']});
  assert.equal(partial.key,'FCRM-1');
  assert.equal(partial.title,input.summary);
  assert.equal(partial.canRetryLinks,true);
  assert.deepEqual(receiptRecord(),{key:'FCRM-1',verified:true});
  assert.deepEqual(Array.from(partial.linkOutcomes, item => [item.key,item.kind,item.confirmed]),[[threadUrl,'source',false]]);
  assert.equal(partial.linkFailures.length,1);
  const exact = await inspect('existing');
  assert.equal(exact[0].key,'FCRM-1');
  assert.equal(exact[0].title,input.summary);
  assert.match(exact[0].reason,/chatZone/);
  linkUnavailable = false;
  const repaired = await writer.retryLinks(input);
  assert.equal(repaired.linkFailures.length,0);
  assert.deepEqual(Array.from(repaired.linkOutcomes, item => [item.key,item.kind,item.confirmed]),[[threadUrl,'source',true]]);
  const beforeVerifiedExisting = requests.length;
  assertExistingWithoutLinks(await writer.create(input));
  assertOnlyReadOperationsSince(beforeVerifiedExisting);
  assert.equal(issuePosts,1);
  assert.equal(links.length,1);

  journal.clear();
  current = undefined;
  links = [];
  receipt = 'lost';
  successfulVerification = false;
  searchReady = false;
  await assert.rejects(writer.create(input),{code:'THREAD_CREATE_UNKNOWN'});
  assert.equal((await inspect('uncertain')).length,0);
  await assert.rejects(writer.create(input),{code:'THREAD_CREATE_UNKNOWN'});
  assert.equal(issuePosts,2);
  searchReady = true;
  assert.equal((await inspect('uncertain'))[0].key,'FCRM-1');
  const beforeRecover = requests.length;
  assertExistingWithoutLinks(await writer.recover(input));
  assertOnlyReadOperationsSince(beforeRecover);
  assert.deepEqual(receiptRecord(),{key:'FCRM-1',verified:true,receipt:false});
  assert.equal((await inspect('existing'))[0].key,'FCRM-1');
  assert.equal(issuePosts,2);
  const beforeNoReceiptRetry = requests.length;
  await assert.rejects(writer.retryLinks(input),{code:'THREAD_LINKS_UNOWNED'});
  assertOnlyReadOperationsSince(beforeNoReceiptRetry);

  journal.clear();
  searchReady = false;
  assert.equal((await inspect('ready')).length,0);
  searchReady = true;
  current.fields.labels=[themeLabel];
  const beforeLateExact = requests.length;
  assertExistingWithoutLinks(await writer.create({...input,summary:'Редактированный черновик'}));
  assertOnlyReadOperationsSince(beforeLateExact);
  assert.equal(issuePosts,2);
  assert.equal(journal.size,0);

  current = undefined;
  receipt = 'missing-key';
  const beforeMissingKey = requests.length;
  assertExistingWithoutLinks(await writer.create(input));
  assert.equal(issuePosts,3);
  assert.deepEqual(receiptRecord(),{key:'FCRM-1',verified:true,receipt:false});
  assert.ok(requests.slice(beforeMissingKey).every(request=>!request.path.endsWith('/remotelink')));

  journal.clear();
  current = undefined;
  receipt = 'key';
  verifyUnavailable = true;
  successfulVerification = false;
  await assert.rejects(writer.create(input),{code:'THREAD_CREATE_UNKNOWN'});
  assert.deepEqual(receiptRecord(),{key:'FCRM-1'});
  assert.equal(issuePosts,4);
  const beforeUnverifiedRetry = requests.length;
  await assert.rejects(writer.retryLinks(input),{code:'THREAD_CREATE_UNKNOWN'});
  assertOnlyReadOperationsSince(beforeUnverifiedRetry);
  assert.deepEqual(receiptRecord(),{key:'FCRM-1'});
  verifyUnavailable = false;
  const beforeKnownRecover = requests.length;
  const recovered = await writer.recover(input);
  assert.equal(recovered.key,'FCRM-1');
  assert.equal(recovered.existing,false);
  assert.equal(recovered.canRetryLinks,true);
  assert.ok(requests.slice(beforeKnownRecover).every(request=>request.method === 'GET'));
  assert.deepEqual(receiptRecord(),{key:'FCRM-1',verified:true});
  assert.deepEqual(Array.from(recovered.linkOutcomes,({key,kind,confirmed})=>[key,kind,confirmed]),[[threadUrl,'source',false]]);
  const finalRetry = await writer.retryLinks(input);
  assert.equal(finalRetry.linkFailures.length,0);
  assert.equal(finalRetry.canRetryLinks,false);
  assert.equal(issuePosts,4);
}

async function checkSelectedLinks() {
  const issueKey = 'FCRM-1';
  const themeKey = 'FCRM-123';
  const developmentKey = 'OB-45';
  const relatedKey = 'FCRM-42';
  const duplicateKey = 'FCRM-44';
  const blockedKey = 'FCRM-56';
  const blockerKey = 'FCRM-57';
  const uncheckedKey = 'FCRM-53';
  const descriptions = new Map();
  const themeType = {id:'3',name:'Project',inward:'Задача проекта',outward:'В проекте'};
  const relatedType = {name:'Relates',inward:'Relates to',outward:'Relates to'};
  const duplicateType = {id:'4',name:'Dupes',inward:'Дублировано с',outward:'Дубликат'};
  const blockingType = {id:'123',name:'Blocks',inward:'Заблокировано',outward:'Блокирует'};
  const relationships = new Map();
  const operations = [];
  const journal = new Map();
  const sourceLinks = [];
  let missingMetadata = false;
  let allowedBlockingType = true;
  let hasRelatedAccess = false;
  let acceptRelatedWrite = false;
  let linkId = 0;
  let posts = 0;
  const savePair = (inwardKey, outwardKey, type) => {
    const id = String(++linkId);
    relationships.set(inwardKey,[...(relationships.get(inwardKey) || []),{id,type,outwardIssue:{key:outwardKey}}]);
    relationships.set(outwardKey,[...(relationships.get(outwardKey) || []),{id,type,inwardIssue:{key:inwardKey}}]);
  };
  const {createFcrmThreadWriter} = load('src/services/fcrmThreadWriter.ts', {
    localStorage:{getItem:key=>journal.get(key),setItem:(key,value)=>journal.set(key,value)},
    navigator:{locks:{request:(_name,callback)=>callback()}},
    fetch:async (input, options) => {
      const url = new URL(input,'https://jira.example');
      const path = url.pathname.replace('/rest/api/2/','');
      operations.push([options.method,path]);
      if (path === 'search') return json({total:0,issues:[]});
      if (path.startsWith('issue/createmeta/')) {
        const values = ['summary','description','components'].map(fieldId => ({fieldId}));
        if (missingMetadata) values.push({fieldId:'customfield_999',name:'Обязательное поле',required:true});
        return json({total:values.length,values});
      }
      if (path === 'project/FCRM/components') return json([{id:'20'}]);
      if (path === 'issue' && options.method === 'POST') {
        posts++;
        const {fields} = JSON.parse(options.body);
        assert.equal(Object.hasOwn(fields,'labels'),false);
        assert.equal(Object.hasOwn(fields,'issuelinks'),false);
        descriptions.set(issueKey,fields);
        return json({key:issueKey},201);
      }
      if (path === 'issueLinkType') return json({issueLinkTypes:[relatedType,themeType,duplicateType,...(allowedBlockingType ? [blockingType] : [])]});
      if (path === 'issueLink') {
        const payload = JSON.parse(options.body);
        if (payload.type.name === 'Blocks') {
          const inwardKey=payload.inwardIssue.key, outwardKey=payload.outwardIssue.key;
          assert.ok(inwardKey === issueKey && outwardKey === blockedKey || inwardKey === blockerKey && outwardKey === issueKey);
          savePair(inwardKey,outwardKey,blockingType);
          throw new Error('Jira saved the dynamic link before the response was lost');
        }
        if (payload.type.name === 'Dupes') {
          assert.deepEqual(payload,{type:{name:'Dupes'},inwardIssue:{key:issueKey},outwardIssue:{key:duplicateKey}});
          savePair(issueKey,duplicateKey,duplicateType);
          return json({},201);
        }
        assert.deepEqual(payload,{type:{name:'Relates'},inwardIssue:{key:relatedKey},outwardIssue:{key:issueKey}});
        if (!acceptRelatedWrite) return json({},503);
        savePair(relatedKey,issueKey,relatedType);
        throw new Error('Jira saved the link before the response was lost');
      }
      if (path === 'issue/' + issueKey + '/remotelink') {
        if (options.method === 'POST') {
          sourceLinks.push({object:JSON.parse(options.body).object});
          return json({},201);
        }
        return json(sourceLinks);
      }
      const key = path.slice('issue/'.length);
      if (key === relatedKey && !hasRelatedAccess) return json({},403);
      assert.ok([issueKey,themeKey,developmentKey,relatedKey,duplicateKey,blockedKey,blockerKey].includes(key),'Unexpected Jira request: ' + path);
      const fields = descriptions.get(key) || {project:{key:key.split('-')[0]},summary:'Задача ' + key};
      return json({key,fields:{...fields,issuelinks:relationships.get(key) || []}});
    }
  });
  const writer = createFcrmThreadWriter((source, key) => {
    assert.deepEqual([source,key],[issueKey,themeKey]);
    operations.push(['POST','theme']);
    savePair(key,source,themeType);
  },(source, proposal) => {
    assert.deepEqual([source,proposal.key,proposal.kind],[issueKey,developmentKey,'development']);
    operations.push(['POST','development']);
    savePair(source,proposal.key,themeType);
  });
  const input = {urls:[threadUrl],issueTypeId:'10',componentId:'20',summary:'Копирование номера карты',description:'Черновик',
    themeKey,issueLinks:[{key:developmentKey,kind:'development'},{key:relatedKey,kind:'related'},{key:duplicateKey,kind:'duplicate'},
      {key:blockedKey,kind:'jira:123:outward'},{key:blockerKey,kind:'jira:123:inward'}]};
  await assert.rejects(writer.create({...input,issueLinks:[{key:developmentKey,kind:'duplicate'}]}),{code:'THREAD_LINK_INVALID'});
  assert.equal(operations.length,0);
  const dynamicOptions=Array.from(await writer.listLinkKinds(blockedKey),({kind,label})=>[kind,label]);
  assert.ok(dynamicOptions.some(([kind,label])=>kind === 'jira:123:outward' && label === blockingType.outward));
  assert.ok(dynamicOptions.some(([kind,label])=>kind === 'jira:123:inward' && label === blockingType.inward));
  assert.ok(!dynamicOptions.some(([kind])=>kind.startsWith('jira:3:')));
  missingMetadata = true;
  await assert.rejects(writer.create(input),{code:'THREAD_REQUIRED_FIELD'});
  missingMetadata = false;
  await assert.rejects(writer.create(input),{code:'THREAD_JIRA_HTTP',status:403});
  assert.ok(operations.every(([method]) => method === 'GET'));
  assert.equal(posts,0);
  hasRelatedAccess = true;
  allowedBlockingType = false;
  await assert.rejects(writer.create(input),{code:'THREAD_LINKS_INVALID'});
  assert.equal(posts,0);
  assert.ok(operations.every(([method])=>method === 'GET'));
  allowedBlockingType = true;
  const result = await writer.create(input);
  assert.equal(result.title,input.summary);
  assert.deepEqual(Array.from(result.linkOutcomes,({key,kind,confirmed}) => [key,kind,confirmed]),[
    [threadUrl,'source',true],[themeKey,'theme',true],[developmentKey,'development',true],[relatedKey,'related',false],[duplicateKey,'duplicate',true],
    [blockedKey,'jira:123:outward',true],[blockerKey,'jira:123:inward',true]
  ]);
  assert.equal(posts,1);
  const sourceDuplicate=relationships.get(issueKey).find(link=>link.outwardIssue?.key === duplicateKey);
  const targetDuplicate=relationships.get(duplicateKey).find(link=>link.inwardIssue?.key === issueKey);
  assert.equal(sourceDuplicate.type.outward,'Дубликат');
  assert.equal(targetDuplicate.type.inward,'Дублировано с');
  assert.equal(sourceDuplicate.id,targetDuplicate.id);
  const blocking=relationships.get(issueKey).filter(link=>link.type.name === blockingType.name);
  assert.equal(blocking.find(link=>link.outwardIssue?.key===blockedKey).id,relationships.get(blockedKey).find(link=>link.inwardIssue?.key===issueKey).id);
  assert.equal(blocking.find(link=>link.inwardIssue?.key===blockerKey).id,relationships.get(blockerKey).find(link=>link.outwardIssue?.key===issueKey).id);
  const beforeRetry = operations.length;
  acceptRelatedWrite = true;
  const updated = await writer.retryLinks(input);
  assert.equal(updated.linkFailures.length,0);
  assert.deepEqual(operations.slice(beforeRetry).filter(([method]) => method === 'POST'),[['POST','issueLink']]);
  assert.ok(operations.every(([,path]) => !path.endsWith(uncheckedKey)));
  assert.equal(posts,1);
  allowedBlockingType = false;
  const afterTypeRemoved = operations.length;
  const changedCatalog = await writer.retryLinks(input);
  assert.deepEqual(Array.from(changedCatalog.linkFailures),[blockedKey,blockerKey]);
  assert.ok(operations.slice(afterTypeRemoved).every(([method])=>method === 'GET'));
}

async function checkThreadControls() {
  const script = fs.readFileSync('FCRM-Chrome-3.3/content.js','utf8');
  new vm.Script(script);
  assert.match(script, /<textarea name="draftSummary" rows="2" maxlength="255">/);
  const extract = (name, next) => {
    const location = identifier => script.search(new RegExp('^    (?:async )?function ' + identifier + '\\(', 'm'));
    const from = location(name), to = location(next);
    assert.ok(from >= 0 && to > from, name);
    return script.slice(from,to);
  };
  assert.deepEqual(Array.from(script.matchAll(/stepStart\(([123]),'([^']+)'\)/g), match => match.slice(1)),[
    ['1','Исходные данные'],['2','Черновик'],['3','Проверка и создание'],
  ]);
  const elements = () => ({textContent:'',hidden:false,style:{},setAttribute(){},removeAttribute(){}});
  const steps = Array.from({length:3}, () => {
    const body = {...elements(),prepend(node){node.parent=this;}}, caption = elements(), heading = {focused:false,focus(){this.focused=true;}};
    const children = {'[data-thread-step-body]':body,'[data-thread-step-summary]':caption,h3:heading};
    return {body, caption, heading, dataset:{}, current:null,
      querySelector(selector){return children[selector];},
      setAttribute(name, value){if (name === 'aria-current') this.current=value;},
      removeAttribute(name){if (name === 'aria-current') this.current=null;},
    };
  });
  const summary = {...elements(),value:'  Длинное название\n задачи\tFCRM  ',scrollHeight:92};
  const question = elements(), questionHeading = elements(), questionReason = elements(), questionPolicy = elements();
  const themeResults = {items:[],replaceChildren(){this.items=[];},appendChild(item){this.items.push(item);}};
  const group = {key:'FCRM-7',fields:{summary:'Веха платежей'}};
  const issues = [{key:'FCRM-12',fields:{summary:'Поиск в карточке',
    issuelinks:[{outwardIssue:group,type:{outward:'Задача проекта'}}]}},
    {key:'FCRM-120',fields:{summary:'Поиск по номеру'}},
  ];
  const themeQueries = [];
  const themeNode = tag => ({...elements(),tag,dataset:{},children:[],handlers:{},
    appendChild(child){this.children.push(child);},append(...children){this.children.push(...children);},
    addEventListener(event,fn){this.handlers[event]=fn;},
  });
  let runSearch;
  const themeInput = {value:'fcrm-12'};
  const status = elements();
  const target = vm.createContext({
    status,steps,step:1,focus:target=>target.focus(),requestSnapshot:{urls:[threadUrl],issueTypeName:'Task',componentName:'FCRM'},
    CSS:{supports:()=>false},summary,description:{value:'Описание'},selectedTheme:{key:'FCRM-12'},
    question,questionHeading,questionReason,questionPolicy,questionText:elements(),reply:elements(),replyLabel:elements(),created:false,
    themeResults,themeInput,themeStatus:elements(),themeSearchSerial:0,themeSearchTimer:0,themeMenu:{hidden:false},panel:{isConnected:true},
    themeLabel:item=>item.title+' · '+item.key,loadThemeTree:null,URLSearchParams,AbortSignal,
    fetch:async (path,options)=>{
      assert.equal(options.credentials,'same-origin');
      const url=new URL(path,'https://jira.example');
      assert.equal(url.pathname,'/rest/api/2/search');
      const jql=url.searchParams.get('jql');
      assert.match(jql,/project = FCRM AND labels = fcrm_umb_epic/);
      themeQueries.push(jql);
      if (jql.includes('summary ~ "карточка"')) {
        assert.match(jql,/summary ~ "карточка" OR summary ~ "карточка\*"/);
        return json({issues:[issues[0]]});
      }
      if (jql.includes('summary ~ "карточке"')) return json({issues:[issues[0]]});
      return json({issues:jql.includes('summary ~') ? [] : issues});
    },
    window:{clearTimeout(){},setTimeout(fn){runSearch=fn;return 1;}},
    setTheme(item){target.selectedTheme=item;},closeThemeMenu(){themeInput.closed=true;},
    document:{createElement:themeNode},
  });
  vm.runInContext(extract('themeTerms','sourceThemes') + extract('normalizedSummary','readResult') +
    extract('renderThemeTree','normalizedSummary').split('    themeToggle.addEventListener')[0],target);
  vm.runInContext(extract('setStep','draftReady'),target);
  for (const step of [1,2,3,2]) {
    steps.forEach(item => {item.heading.focused=false;});
    vm.runInContext('setStep(' + step + ')',target);
    assert.deepEqual(steps.map((item,index) => [item.body.hidden,item.current,item.heading.focused]),
      steps.map((_,index) => index + 1 === step ? [false,'step',true] : [true,null,false]));
    assert.equal(status.parent,steps[step - 1].body);
  }
  assert.equal(vm.runInContext('readDraft().summary',target),'Длинное название задачи FCRM');
  vm.runInContext('fitSummary()',target);
  assert.equal(summary.style.height,'94px');
  vm.runInContext('showQuestion("Где разместить кнопку?", "Уточнит расположение.", false)',target);
  assert.equal(questionHeading.textContent,'Вопрос к черновику');
  assert.match(questionPolicy.textContent,/Ответ необязателен/);
  assert.equal(questionReason.textContent,'Уточнит расположение.');
  vm.runInContext('showQuestion("Где разместить кнопку?", "", true)',target);
  assert.match(questionPolicy.textContent,/Ответьте, чтобы подготовить/);
  assert.equal(questionReason.hidden,true);
  vm.runInContext('queueThemeSearch()',target);
  await runSearch();
  assert.equal(themeResults.items.length,1);
  const branch=themeResults.items[0];
  assert.equal(branch.tag,'details');
  assert.equal(branch.open,true);
  assert.equal(branch.children[0].textContent,'Веха платежей · FCRM-7');
  const choice=branch.children[1].children[0].children[0];
  assert.equal(choice.dataset.threadThemeOption,'FCRM-12');
  assert.equal(choice.textContent,'Поиск в карточке · FCRM-12');
  choice.handlers.click();
  assert.equal(target.selectedTheme.key,'FCRM-12');
  assert.equal(themeInput.closed,true);
  themeInput.value='карточке';
  vm.runInContext('queueThemeSearch()',target);
  await runSearch();
  assert.equal(themeResults.items.length,1);
  assert.equal(themeResults.items[0].children[1].children[0].children[0].dataset.threadThemeOption,'FCRM-12');
  themeInput.value='карточка';
  assert.equal(issues[0].fields.summary.toLowerCase().includes(themeInput.value),false);
  vm.runInContext('queueThemeSearch()',target);
  await runSearch();
  assert.equal(themeResults.items.length,1);
  assert.equal(themeResults.items[0].children[1].children[0].children[0].dataset.threadThemeOption,'FCRM-12');
  assert.equal(themeQueries.filter(jql=>jql.includes('summary ~ "карточка"')).length,1);
  themeInput.value='веха платежей';
  vm.runInContext('queueThemeSearch()',target);
  await runSearch();
  assert.equal(themeResults.items.length,1);
  assert.equal(themeResults.items[0].children[1].children[0].children[0].dataset.threadThemeOption,'FCRM-12');
  assert.match(extract('checkTask','showResultCard'),/threadWriter\.inspect\(checkedInput\)/);
  assert.doesNotMatch(extract('checkTask','showResultCard'),/threadWriter\.create/);
  assert.match(script,/create\.onclick = \(\) => writeTask\('create'\)/);
  assert.match(script,/confirmDuplicate\.onclick = \(\) => writeTask\('create', true\)/);
  assert.match(script,/confirmedDuplicateKeys:reviewResult\.jiraDuplicateKeys \|\| reviewResult\.issues\.map\(issue => issue\.key\)/);
}

(async () => {
  await checkDrafts();
  await checkWrites();
  await checkSelectedLinks();
  await checkThreadControls();
  console.log('FCRM thread checks passed: source context and permissions, scope, SSE, retry, parsing, read-only inspection, duplicate confirmation, writes, selected links, reconciliation and stepper.');
})().catch(error => { console.error(error); process.exitCode = 1; });
