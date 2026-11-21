const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/services/deepseek.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;

let completionRequest;
let assistantId;
const modelReplies = [];
const jiraWrites = [];
let jira = {description:'h2. Предыдущее содержание\n\n  Сохранить пробелы.\n',summary:'Исходное название',assignee:'owner'};
let omitSavedFields = false;
const respond = value => ({ok:true,json:async()=>value,text:async()=>JSON.stringify(value)});
const context = {
  exports:{},
  setTimeout:resolve=>resolve(),
  fetch:async (url,options={}) => {
    if (url.startsWith('/rest/api/2/issue/FCRM-2970')) {
      if (options.method === 'PUT') {
        const {fields} = JSON.parse(options.body);
        jiraWrites.push(fields);
        if (!omitSavedFields) jira = {...jira,...fields};
      }
      return respond({fields:jira});
    }
    if (url.endsWith('/auths/')) return respond({});
    if (url.endsWith('/api/models')) return respond([]);
    if (url.endsWith('/chats/new')) {
      assistantId = JSON.parse(options.body).chat.history.currentId;
      return respond({id:'test-chat'});
    }
    if (url.endsWith('/chat/completions')) {
      completionRequest = JSON.parse(options.body);
      return respond({status:true});
    }
    if (url.includes('/tasks/chat/')) return respond({task_ids:[]});
    if (options.method === 'DELETE') return respond({});
    if (url.endsWith('/chats/test-chat')) {
      const content = modelReplies.shift();
      return respond({chat:{history:{messages:{[assistantId]:{content,done:!modelReplies.length}}}}});
    }
    throw new Error('Unexpected request: ' + url);
  }
};
vm.runInNewContext(compiled,context);
const {parseJiraDraft,saveJiraDraft,completeDeepseekChat,DEFAULT_DEEPSEEK_SYSTEM_PROMPT} = context.exports;
const call = (mode,approved='',clarification) => completeDeepseekChat('FCRM-2970',mode,null,approved,DEFAULT_DEEPSEEK_SYSTEM_PROMPT,clarification);

(async()=>{
  const suggestions = [
    {kind:'theme',key:'FCRM-2970'},
    {kind:'theme',key:'fcrm-123',reason:'Подтверждённая тематика'},
    {kind:'theme',key:'FCRM-124'},
    {kind:'development',key:'FTD-456'},
    {kind:'development',key:'OBPROJECT-567'},
    {kind:'source',key:'https://chatzone.o3t.ru/ozon/pl/test'},
    {kind:'source',key:'javascript:alert(1)'},
  ];
  const preview = '<jira_description>h2. Что делаем\n\nПроверяем результат.</jira_description>' +
    '<jira_links>' + JSON.stringify(suggestions) + '</jira_links>' +
    '<jira_notes>Пока не подтверждена роль для приёмки.</jira_notes>';
  modelReplies.push('Читаю задачу…',preview + '<result_details>Этот повтор не нужен.</result_details>');
  const analysis = await call('analyze');
  assert.equal(analysis,[...preview.matchAll(/<(jira_\w+)>[\s\S]*?<\/\1>/g)].map(match=>match[0]).join('\n'));
  assert.deepEqual(completionRequest.tool_ids,['server:mcp:jit','server:mcp:chatzone','server:mcp:confluence']);
  assert.deepEqual(completionRequest.skill_ids,[]);
  assert.equal(completionRequest.features.memory,false);
  const prompt = completionRequest.messages[1].content;
  assert.match(prompt,/как только данные достаточны.*остановись/i);
  assert.match(prompt,/не запускай интерактивный запрос контекста/i);
  assert.match(prompt,/обычный FCRM-эпик без fcrm_umb_epic/);

  const draft = parseJiraDraft(analysis,'FCRM-2970');
  assert.deepEqual(Array.from(draft.links,link=>link.key),['FCRM-123','FTD-456','https://chatzone.o3t.ru/ozon/pl/test']);
  assert.match(draft.notes,/не подтверждена/);
  assert.equal(parseJiraDraft('<jira_links>{invalid}</jira_links>','FCRM-2970').links.length,0);

  modelReplies.push(preview);
  await call('analyze','',{preview:analysis,reply:'Уточняем только роль'});
  assert.match(completionRequest.messages[1].content,/не повторяй сбор источников/i);

  modelReplies.push('<result_errors>Карточка недоступна.</result_errors>');
  await assert.rejects(call('analyze'),/Карточка недоступна/);
  modelReplies.push('<result_summary>Связь с FTD-456 проверена.</result_summary>');
  assert.match(await call('apply_links',JSON.stringify([draft.links[1]])),/FTD-456 проверена/);
  assert.deepEqual(completionRequest.tool_ids,['server:mcp:jit']);
  const linkPrompt = completionRequest.messages[1].content;
  assert.match(linkPrompt,/development.*FTD-456/);
  assert.doesNotMatch(linkPrompt,/FCRM-123|\/ozon\/pl\/test/);
  assert.match(linkPrompt,/на FCRM — «В проекте: задача разработки»/i);
  await assert.rejects(call('apply_links',JSON.stringify([suggestions[0]])),/неподдерживаемая связь/);

  const original = jira.description;
  assert.equal((await saveJiraDraft('FCRM-2970',draft)).changed,true);
  assert.deepEqual(jiraWrites,[{description:draft.description+'\n\nh2. Прежнее описание\n\n'+original}]);
  assert.equal(jira.summary,'Исходное название');
  assert.equal(jira.assignee,'owner');
  assert.equal((await saveJiraDraft('FCRM-2970',draft)).changed,false);
  assert.equal(jiraWrites.length,1);
  await saveJiraDraft('FCRM-2970',{description:'Уточнённое описание',summary:'Новое название'});
  assert.equal(jira.description.split('h2. Прежнее описание').length,2);
  assert.ok(jira.description.endsWith(original));
  omitSavedFields = true;
  await assert.rejects(saveJiraDraft('FCRM-2970',{description:'Проверка сбоя'}),/не подтвердила результат/);
  console.log('DeepSeek checks passed: scoped tools, nonblocking draft, chosen links, exact save, original text and retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
