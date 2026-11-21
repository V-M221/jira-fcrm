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
let temporaryChatInput;
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
      const {history} = JSON.parse(options.body).chat;
      assistantId = history.currentId;
      temporaryChatInput = Object.values(history.messages).find(message=>message.role==='user').content;
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
const call = (mode,approved='',clarification,context='') => completeDeepseekChat('FCRM-2970',mode,null,approved,DEFAULT_DEEPSEEK_SYSTEM_PROMPT,clarification,context);

function loadFormatter(name) {
  const module = {exports:{}};
  const source = fs.readFileSync(`src/utils/${name}.ts`, 'utf8');
  const {outputText} = ts.transpileModule(source, {
    compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  });
  vm.runInNewContext(outputText,module);
  return module.exports[name];
}

async function checkDraftLinkWrites() {
  const source = 'FCRM-100';
  const theme = 'FCRM-200';
  const development = 'OB-300';
  const epic = 'FCRM-400';
  const epicField = 'customfield_12345';
  const issue = (name, links = []) => ({
    summary:name, labels:[], components:[{name:'Демо'}], status:{name:'В работе'},
    issuetype:{name:'Задача'}, [epicField]:null, issuelinks:links,
  });
  const issues = {[source]:issue('Исходная задача'), [development]:issue('Разработка'), [theme]:{
    ...issue('Тематика: Демо'), labels:['fcrm_umb_epic'], issuetype:{name:'Epic'},
  }};
  let type = {name:'Проект',inward:'Задача проекта',outward:'В проекте'};
  const writes = [];
  const webLinks = [];
  let nextId = 1;
  let hideNewReverseLink = false;
  const fixture = {exports:{},fetch:async (path,options={}) => {
    const method = options.method || 'GET';
    if (method !== 'GET') writes.push({method,path,body:options.body && JSON.parse(options.body)});
    if (path === '/rest/api/2/field') return respond([{id:epicField,schema:{custom:'com.pyxis.greenhopper.jira:gh-epic-link'}}]);
    if (path === '/rest/api/2/issueLinkType') return respond({issueLinkTypes:[type]});
    if (path.endsWith('/remotelink')) {
      if (method === 'POST') webLinks.push(JSON.parse(options.body));
      return respond(webLinks);
    }
    if (path === '/rest/api/2/issueLink' && method === 'POST') {
      const {inwardIssue, outwardIssue} = JSON.parse(options.body);
      const id = String(nextId++);
      issues[outwardIssue.key].issuelinks.push({id,type,inwardIssue});
      if (!hideNewReverseLink) issues[inwardIssue.key].issuelinks.push({id,type,outwardIssue});
      return respond(null);
    }
    if (method === 'DELETE') {
      const id = path.split('/').at(-1);
      Object.values(issues).forEach(fields => { fields.issuelinks = fields.issuelinks.filter(link => link.id !== id); });
      return respond(null);
    }
    const key = path.split('?')[0].split('/').at(-1);
    assert.ok(issues[key], 'Unexpected Jira request: ' + path);
    return respond({key,fields:issues[key]});
  }};
  vm.runInNewContext(compiled,fixture);
  const client = fixture.exports.createJiraDraftLinkClient();
  const proposal = {kind:'theme',key:theme};
  issues[source][epicField] = epic;
  assert.match(await client.themeWarning(source,proposal),new RegExp(epic));
  await assert.rejects(client.apply(source,proposal),/Epic Link/);
  assert.equal(writes.length,0);
  delete issues[source][epicField];
  assert.match(await client.themeWarning(source,proposal),/не вернула значение Epic Link/);
  issues[source][epicField] = null;
  assert.equal(await client.themeWarning(source,proposal),'');
  issues[theme].labels = [];
  assert.match(await client.themeWarning(source,proposal),/не подтверждена актуальная тематика/);
  issues[theme].labels = ['fcrm_umb_epic'];
  assert.equal(await client.apply(source,proposal),'Добавлена');
  assert.deepEqual(writes[0].body,{type:{name:'Проект'},inwardIssue:{key:theme},outwardIssue:{key:source}});
  assert.equal(await client.apply(source,proposal),'Уже есть в Jira');
  assert.equal(writes.length,1);
  const replacement = 'FCRM-201';
  issues[replacement] = {...issues[theme], summary:'Тематика: Новая',issuelinks:[]};
  const changeTheme = {kind:'theme',key:replacement,action:'repair',replaceKey:theme};
  assert.match(await client.themeWarning(source,changeTheme),/не подтверждает, что текущая тематика/);
  await assert.rejects(client.apply(source,changeTheme),/Проверьте замену вручную/);
  assert.equal(writes.length,1);

  const engineering = {kind:'development',key:development,action:'repair'};
  issues[source].issuelinks.push({id:'900',type,inwardIssue:{key:development}});
  issues[development].issuelinks.push({id:'900',type,outwardIssue:{key:source}});
  hideNewReverseLink = true;
  await assert.rejects(client.apply(source,engineering),/не подтвердила новую связь с обеих сторон/);
  assert.deepEqual(writes.slice(1).map(write => write.method),['POST']);
  issues[source].issuelinks = issues[source].issuelinks.filter(link => link.id !== '2');
  hideNewReverseLink = false;
  assert.equal(await client.apply(source,engineering),'Исправлена');
  assert.deepEqual(writes[2].body,{type:{name:'Проект'},inwardIssue:{key:source},outwardIssue:{key:development}});
  assert.equal(writes[3].path,'/rest/api/2/issueLink/900');

  const web = {kind:'source',key:'https://chatzone.o3t.ru/ozon/pl/test'};
  assert.equal(await client.apply(source,web),'Добавлена');
  assert.equal(await client.apply(source,web),'Уже есть в Jira');
  assert.equal(webLinks.length,1);

  type = {...type,inward:'В проекте',outward:'Задача проекта'};
  issues[source].issuelinks = [];
  issues[theme].issuelinks = [];
  assert.equal(await client.apply(source,proposal),'Добавлена');
  assert.deepEqual(writes.at(-1).body,{type:{name:'Проект'},inwardIssue:{key:source},outwardIssue:{key:theme}});
}

(async()=>{
  const answerMarkup = loadFormatter('answerMarkup');
  const structuredAnswer = loadFormatter('structuredAnswer');
  const notes = '1. Какую роль указать?\n\n- Какой срок подтвердить?\nЕсть ли *согласованный* макет?';
  const numberedNotes = '<ol><li>Какую роль указать?</li><li>Какой срок подтвердить?</li><li>Есть ли <strong>согласованный</strong> макет?</li></ol>';
  assert.equal(answerMarkup(notes, true),numberedNotes);
  assert.equal(answerMarkup('1) Что значит <поле>?', true),'<ol><li>Что значит &lt;поле&gt;?</li></ol>');
  const visibleNotes = structuredAnswer('<jira_notes>'+notes+'</jira_notes>', 'description', answerMarkup);
  assert.match(visibleNotes,/^<section[^>]*>/);
  assert.ok(visibleNotes.includes(numberedNotes));
  assert.doesNotMatch(visibleNotes,/<details/);
  assert.doesNotMatch(structuredAnswer('<jira_description>Черновик</jira_description>', 'description', answerMarkup),/Что требует уточнения/);

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
  assert.equal(completionRequest.messages[1].content,'Задача Jira FCRM-2970.');
  assert.equal(completionRequest.messages[1].content,completionRequest.user_message.content);
  assert.equal(completionRequest.messages[1].content,temporaryChatInput);
  const prompt = completionRequest.messages[0].content;
  assert.match(prompt,/Просмотри все прямые связи/);
  assert.match(prompt,/Сделай это и при заполненном описании/);
  assert.match(prompt,/не читай один источник дважды/i);
  assert.match(prompt,/дублирующую «Связанная задача»/);
  assert.match(prompt,/не запускай интерактивный запрос контекста/i);
  assert.match(prompt,/обычный FCRM-эпик без fcrm_umb_epic/);
  assert.match(prompt,/Поле, которого нет в ответе Jira, считается неизвестным/);
  assert.match(prompt,/Недоступность Epic Link, Owner, компонента, статуса или меток не блокирует описание/);
  assert.match(prompt,/проверь существующих родителей в Jira по точным ключам/i);
  assert.match(prompt,/Завершённый статус сам по себе не означает, что связь устарела/);
  assert.match(prompt,/свежим запросом project = FCRM AND labels = fcrm_umb_epic/);
  assert.match(prompt,/используй только «Цель» и «Что меняется»/);
  assert.match(prompt,/условия приёмки указывай в «Что меняется»/);
  assert.match(prompt,/«Как проверить» в отдельный раздел только по явной просьбе пользователя/);
  assert.match(prompt,/Каждый пункт начинай с новой строки и номера/);
  assert.match(prompt,/до 1000 символов.*существенные подтверждённые требования/);
  assert.match(prompt,/Переноси ограничения, права доступа и решения.*только при явном подтверждении/);
  assert.match(prompt,/Используй поле «Компонент» для поиска тематики, не выводи из него требования/);
  assert.match(prompt,/Если значения в источниках расходятся, не объединяй их.*оба значения и источники в <jira_notes>/);
  assert.match(prompt,/Персональные настройки промпта задают стиль\. При расхождении следуй правилам формата/);
  assert.match(prompt,/список источников.*не входят в черновик/);
  assert.match(prompt,/Epic Link явно пуст, текущей тематической связи нет.*обязательно проверь актуальный каталог тематик/);
  assert.match(prompt,/действует и для задач в статусе «Готово»/);
  assert.match(prompt,/в <jira_notes> укажи конкретную причину, почему подбор не дал однозначной связи/);
  assert.match(prompt,/совпал со снятой связью.*только в <jira_notes>\. Не включай этот ключ в <jira_links>/);
  assert.match(prompt,/В её Jira issuelinks для ключа в inwardIssue используй type\.inward, для ключа в outwardIssue — type\.outward/);
  assert.match(prompt,/Если на исходной задаче уже стоит «В проекте» к задаче разработки, направление верное/);

  modelReplies.push(preview);
  await call('analyze','',undefined,'  Для оператора, коротко.  ');
  assert.equal(completionRequest.messages[1].content,'Задача Jira FCRM-2970.\n\nДля оператора, коротко.');
  assert.equal(completionRequest.messages[0].content,prompt);

  const draft = parseJiraDraft(analysis,'FCRM-2970');
  assert.deepEqual(Array.from(draft.links,link=>link.key),['FCRM-123','FTD-456','https://chatzone.o3t.ru/ozon/pl/test']);
  assert.match(draft.notes,/не подтверждена/);
  assert.equal(parseJiraDraft('<jira_links>{invalid}</jira_links>','FCRM-2970').links.length,0);

  modelReplies.push(preview);
  await call('analyze','',{preview:analysis,reply:'Уточняем только роль'});
  assert.equal(completionRequest.messages[1].content,'Задача Jira FCRM-2970.\n\nПредыдущий черновик:\n'+analysis+'\n\nУточнение пользователя:\nУточняем только роль');
  assert.match(completionRequest.messages[0].content,/не повторяй сбор источников/i);
  assert.match(completionRequest.messages[0].content,/используй только «Цель» и «Что меняется»/);
  assert.doesNotMatch(completionRequest.messages[0].content,/project = FCRM AND labels/);
  assert.doesNotMatch(completionRequest.messages[0].content,/существующих родителей в Jira по точным ключам/);
  assert.deepEqual(completionRequest.tool_ids,[]);

  modelReplies.push(preview);
  await call('analyze','',{preview:analysis,reply:'Сократи. И проверь данные в приложенном источнике.'});
  assert.match(completionRequest.messages[0].content,/Открой только тот источник/);
  assert.deepEqual(completionRequest.tool_ids,['server:mcp:jit','server:mcp:chatzone','server:mcp:confluence']);

  modelReplies.push(preview);
  await call('analyze','',{preview:analysis,reply:'Проверь, актуальна ли тематика.'});
  assert.match(completionRequest.messages[0].content,/существующих родителей в Jira по точным ключам/);
  assert.doesNotMatch(completionRequest.messages[0].content,/project = FCRM AND labels/);

  modelReplies.push('<result_errors>Карточка недоступна.</result_errors>');
  await assert.rejects(call('analyze'),/Карточка недоступна/);
  await assert.rejects(call('apply_links',JSON.stringify(draft.links)),/Неизвестный режим запроса/);

  const corrections = [
    {kind:'development',key:'OB-42',action:'repair'},
    {kind:'theme',key:'FCRM-124',action:'repair',replaceKey:'fcrm-125'},
    {kind:'development',key:'OB-43',action:'repair',replaceKey:'FCRM-125'},
    {kind:'theme',key:'FCRM-126',action:'repair',replaceKey:''},
    {kind:'source',key:'https://chatzone.o3t.ru/ozon/pl/test',action:'repair'},
  ];
  const repairs = parseJiraDraft('<jira_links>'+JSON.stringify(corrections)+'</jira_links>','FCRM-2970').links;
  assert.equal(repairs.length,2);
  assert.equal(repairs[0].action,'repair');
  assert.equal(repairs[1].replaceKey,'FCRM-125');
  await checkDraftLinkWrites();

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
