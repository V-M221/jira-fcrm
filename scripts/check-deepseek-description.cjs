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
  modelReplies.push('<result_summary>Связь с FTD-456 проверена.</result_summary>');
  assert.match(await call('apply_links',JSON.stringify([draft.links[1]])),/FTD-456 проверена/);
  assert.deepEqual(completionRequest.tool_ids,['server:mcp:jit']);
  assert.equal(completionRequest.messages[1].content,'Задача Jira FCRM-2970.\n\nСогласованные связи:\n[{"kind":"development","key":"FTD-456"}]');
  const linkPrompt = completionRequest.messages[0].content;
  assert.doesNotMatch(linkPrompt,/FTD-456|FCRM-123|\/ozon\/pl\/test/);
  assert.match(linkPrompt,/на FCRM — «В проекте: задача разработки»/i);
  assert.doesNotMatch(linkPrompt,/существующих родителей в Jira по точным ключам/);

  modelReplies.push('<result_errors>Метка тематики больше не действует.</result_errors>');
  await call('apply_links',JSON.stringify([draft.links[0]]));
  const themePrompt = completionRequest.messages[0].content;
  assert.match(themePrompt,/перечитай согласованную тематику по ключу/);
  assert.match(themePrompt,/Если Epic Link неизвестен, пропусти установку/);
  assert.match(themePrompt,/пропусти запись и укажи причину/);
  assert.doesNotMatch(themePrompt,/project = FCRM AND labels/);
  await assert.rejects(call('apply_links',JSON.stringify([suggestions[0]])),/неподдерживаемая связь/);

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
  modelReplies.push('<result_summary>Исправления проверены.</result_summary>');
  await call('apply_links',JSON.stringify(repairs));
  const [repairSystem,repairUser] = completionRequest.messages;
  assert.match(repairSystem.content,/Сначала установи правильную связь.*Проверь обе стороны\. Только после этого убери неверную связь/);
  assert.match(repairSystem.content,/старая прямая связь с указанным ключом всё ещё существует и устарела/);
  assert.match(repairUser.content,/"action":"repair","replaceKey":"FCRM-125"/);
  assert.doesNotMatch(repairSystem.content,/FCRM-125/);
  await assert.rejects(call('apply_links',JSON.stringify([corrections[2]])),/некорректно указана прежняя тематика/);

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
