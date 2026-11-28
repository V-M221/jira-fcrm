const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const root = 'a'.repeat(26);
const reply = 'b'.repeat(26);
const threadUrl = 'https://chatzone.o3t.ru/example/pl/' + root;
const replyUrl = 'https://chatzone.o3t.ru/example/pl/' + reply;
const json = (body, status) => Response.json(body, {status});
const immediate = callback => queueMicrotask(callback);
const answer = {
  status: 'draft',
  summary: 'Копирование номера карты',
  goal: 'Сократить время работы оператора.',
  changes: ['Сделать копирование доступным в карточке.'],
  themeKey: 'FCRM-123',
  question: 'Где разместить кнопку?',
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
    calls.push({path, method: options.method || 'GET'});
    if (url.hostname.startsWith('chatzone.')) {
      if (!access) return json({},403);
      if (sourceFailures++ === 0) return json({},503);
      return json({posts:{
        [root]:{id:root,root_id:'',create_at:1,message:'Добавить копирование номера карты. См. FCRM-42.',user_id:'must-not-send'},
        [reply]:{id:reply,root_id:root,create_at:2,message:'Место кнопки согласуем.'},
      }});
    }
    if (path === '/api/v1/auths/') return json({token:'test-secret',email:'must-not-send'});
    if (path === '/api/models') return json([]);
    if (path === '/api/v1/chats/new') {
      assistantId = JSON.parse(options.body).chat.history.currentId;
      return json({id:'mock'});
    }
    if (path === '/api/chat/completions') {
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
    urls:[replyUrl],issueTypeName:'Задача',componentName:'Демо',themes:[{key:'FCRM-123',title:'Тема'}],
  });
  const run = (preview = false) => completeDeepseekChat('FCRM','thread',null,input,'ignored',undefined,'',preview);
  const prompt = JSON.parse(await run(true));
  assert.match(prompt.system,/fcrm-thread\/1/);
  assert.equal(calls.length,0);
  const result = JSON.parse(await run());
  assert.equal(result.status,'draft');
  assert.deepEqual(result.urls,[threadUrl]);
  assert.deepEqual(result.mentionedIssueKeys,['FCRM-42']);
  assert.equal(result.themeKey,'FCRM-123');
  assert.deepEqual(payload.tool_ids,[]);
  assert.deepEqual(payload.skill_ids,[]);
  assert.equal(payload.features.memory,false);
  assert.match(result.description,/^h2\. Цель[\s\S]+h2\. Что меняется/);
  assert.doesNotMatch(JSON.stringify(payload), /must-not-send|test-secret/);
  assert.doesNotMatch(JSON.stringify(result), /internal analysis/);
  assert.equal(calls.filter(call => call.path.includes('/posts/')).length,2);

  getMode = 'poll';
  answerForRun = {status:'clarification',question:'Где разместить кнопку?'};
  assert.deepEqual(JSON.parse(await run()),{status:'clarification',message:'Где разместить кнопку?'});
  assert.equal(taskPolls,3);
  assert.equal(outputReads,2);

  getMode = 'sse';
  answerForRun = {...answer,themeKey:'FCRM-999',question:'Скрытое рассуждение. Второе предложение.'};
  const filtered = JSON.parse(await run());
  assert.equal(filtered.themeKey,'');
  assert.equal(filtered.message,'');

  access = false;
  calls = [];
  await assert.rejects(run(),/тредов не найден или недоступен/);
  assert.ok(calls.every(call => call.path.includes('/posts/')));
}

async function checkWrites() {
  let current;
  let links = [];
  let loseReceipt = false;
  let searchReady = true;
  let linkUnavailable = false;
  let issuePosts = 0;
  const journal = new Map();
  const createMeta = [{fieldId:'summary'},{fieldId:'description'},{fieldId:'components'},{fieldId:'labels'}];
  const {createFcrmThreadWriter} = load('src/services/fcrmThreadWriter.ts', {
    localStorage:{getItem:key=>journal.get(key),setItem:(key,value)=>journal.set(key,value)},
    navigator:{locks:{request:(_name,callback)=>callback()}},
    fetch:async (input, options) => {
      const url = new URL(input,'https://jira.example');
      const path = url.pathname;
      if (path.endsWith('/search') && url.searchParams.get('jql').includes('key in (FCRM-42)')) {
        return json({total:1,issues:[{key:'FCRM-42',fields:{project:{key:'FCRM'},summary:'Известный сбой'}}]});
      }
      if (path.endsWith('/search')) return json({total:current && searchReady ? 1 : 0,issues:current && searchReady ? [current] : []});
      if (path.includes('/createmeta/')) return json({total:createMeta.length,values:createMeta});
      if (path.endsWith('/FCRM/components')) return json([{id:'20'}]);
      if (path.endsWith('/issue') && options.method === 'POST') {
        issuePosts++;
        const {fields} = JSON.parse(options.body);
        assert.deepEqual(Object.keys(fields).sort(),['components','description','issuetype','labels','project','summary']);
        assert.equal(fields.project.key,'FCRM');
        assert.equal(fields.issuetype.id,'10');
        assert.equal(fields.components[0].id,'20');
        assert.match(fields.description,/h2\. Источники/);
        current = {key:'FCRM-1',fields};
        if (loseReceipt) throw new Error('lost receipt');
        return json({key:'FCRM-1'},201);
      }
      if (path.endsWith('/remotelink')) {
        if (options.method === 'POST') {
          if (linkUnavailable) return json({},503);
          const body = JSON.parse(options.body);
          assert.match(body.globalId,/^ozon-fcrm-chatzone:/);
          links.push({object:body.object});
          return json({},201);
        }
        return json(links);
      }
      if (path.endsWith('/issue/FCRM-1')) return json(current);
      throw new Error('Unexpected request: ' + path);
    },
  });
  const writer = createFcrmThreadWriter();
  const input = {urls:[threadUrl],issueTypeId:'10',componentId:'20',summary:'Тест задачи',description:'Черновик'};
  await assert.rejects(writer.create({...input,mentionedIssueKeys:['FCRM-42']}), error =>
    error.code === 'THREAD_POSSIBLE_DUPLICATE' && error.issueKeys[0] === 'FCRM-42');
  assert.equal(issuePosts,0);
  linkUnavailable = true;
  const partial = await writer.create(input);
  assert.equal(partial.key,'FCRM-1');
  assert.equal(partial.linkFailures.length,1);
  linkUnavailable = false;
  const repaired = await writer.retryLinks(input);
  assert.equal(repaired.linkFailures.length,0);
  assert.equal((await writer.create(input)).existing,true);
  assert.equal(issuePosts,1);
  assert.equal(links.length,1);

  journal.clear();
  current = undefined;
  links = [];
  loseReceipt = true;
  searchReady = false;
  await assert.rejects(writer.create(input),{code:'THREAD_CREATE_UNKNOWN'});
  await assert.rejects(writer.create(input),{code:'THREAD_CREATE_UNKNOWN'});
  assert.equal(issuePosts,2);
  searchReady = true;
  assert.equal((await writer.recover(input)).key,'FCRM-1');
  assert.equal(issuePosts,2);
}

(async () => {
  await checkDrafts();
  await checkWrites();
  console.log('FCRM thread checks passed: source permissions, scope, SSE, retry, parsing, write, reconciliation and links.');
})().catch(error => { console.error(error); process.exitCode = 1; });
