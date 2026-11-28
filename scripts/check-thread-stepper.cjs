const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHash, webcrypto } = require('node:crypto');
const ts = require('typescript');

const moduleExports = {};
const writer = ts.transpileModule(fs.readFileSync('src/services/fcrmThreadWriter.ts', 'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022},
}).outputText;
const globals = {exports:moduleExports,URL,URLSearchParams,TextEncoder,AbortSignal,crypto:webcrypto};
vm.runInNewContext(writer, globals);
const {createFcrmThreadWriter} = moduleExports;

async function checkPreflight(section, element) {
  const ready = {state:'ready',issues:[]};
  const modelDraft = {status:'draft',summary:'Новое название',description:'Черновик',
    urls:['https://chatzone.o3t.ru/o3/pl/'+'a'.repeat(26)],mentionedIssueKeys:['FCRM-42']};
  const issue = {key:'FCRM-42',title:'Найденная задача',reason:'Упоминается в треде'};
  const exact = {state:'existing',issues:[issue]};
  const possible = {state:'possible-duplicate',issues:[issue]};
  function fixture(answers, results = [modelDraft]) {
    const inspections = [], modelRequests = [], rendered = [];
    const context = vm.createContext({
      crypto:webcrypto,window:{setInterval:()=>1,clearInterval(){}},
      requestSnapshot:{urls:['https://chatzone.o3t.ru/o3/pl/'+'b'.repeat(26)]},
      form:element('form'),preflight:{...element('section'),hidden:true},preflightDraft:null,preflightMatches:element('ul'),
      preflightTitle:element('h3'),preflightMessage:element('p'),preflightContinue:element('button'),preflightRetry:element('button'),
      preflightBack:element('button'),confirmDuplicate:element('button'),duplicateLinks:element('ul'),status:element('p'),
      pendingWrite:null,created:false,draft:null,step:1,busy:false,initialClarification:false,themeOverridden:false,
      question:{hidden:true},questionText:element('p'),reply:element('textarea'),followup:{hidden:true},
      summary:{value:''},description:{value:'',hidden:true},descriptionView:element('div'),review:{hidden:true},
      selectedIssueLinks:new Map(),steps:[null,{querySelector:()=>element('h3')}],
      clearEarlyDuplicates(){},updateControls(){},fitSummary(){},renderContextSources(){},renderDescription(){},setTheme(){},
      showQuestion(text,_reason){context.question.hidden=!text;context.questionText.textContent=text || '';},
      sourceThemes:async()=>[],
      requestFromExtension:async message=>{
        modelRequests.push(message);
        return {ok:true,text:JSON.stringify(results.shift())};
      },
      setStep(number){context.step=number;},say(message){context.status.textContent=message;},
      focus(node){context.focused=node;},
      renderDraftLinks(){rendered.push(context.draft);},
      queueEarlyDuplicates(_result,_wait,check){context.earlyCheck=check;},
      normalizedSummary:text=>text.trim(),parseProposals:()=>new Map(),
      readDraft:()=>({summary:context.summary.value,description:context.description.value}),
      document:{createElement:element},
      linkFor:(key,text)=>({href:'/browse/'+key,textContent:text}),
      threadWriter:{
        inspect:async input=>{
          inspections.push(JSON.parse(JSON.stringify(input)));
          const answer=answers.shift();
          if (answer instanceof Error) throw answer;
          return answer;
        }
      }
    });
    vm.runInContext(section('    function readResult(', '    function writeInput(') +
      section('    if (preflight) {\n      preflightContinue.onclick', '    followup.onsubmit'),context);
    return {context,inspections,modelRequests,rendered,run:clarification=>vm.runInContext(
      'requestDraft('+JSON.stringify(clarification || '')+')',context)};
  }

  let resolveJira, startJira;
  const waiting = new Promise(resolve=>{resolveJira=resolve;});
  const inspectStarted = new Promise(resolve=>{startJira=resolve;});
  const pending = fixture([waiting]);
  const inspect = pending.context.threadWriter.inspect;
  pending.context.threadWriter.inspect = input=>{
    startJira();
    return inspect(input);
  };
  const inFlight = pending.run();
  await inspectStarted;
  assert.equal(pending.context.busy,true);
  assert.equal(pending.context.step,1);
  assert.equal(pending.context.review.hidden,true);
  assert.deepEqual(pending.rendered,[]);
  assert.deepEqual(pending.inspections,[{urls:modelDraft.urls,mentionedIssueKeys:modelDraft.mentionedIssueKeys,summary:modelDraft.summary}]);
  assert.equal(pending.modelRequests[0].type,'o3ds:chat');
  resolveJira(ready);
  await inFlight;
  assert.equal(pending.context.step,2);
  assert.equal(pending.context.preflight.hidden,true);
  assert.equal(pending.context.review.hidden,false);

  const found = fixture([exact]);
  await found.run();
  assert.equal(found.context.review.hidden,true);
  assert.equal(found.context.preflightContinue.hidden,true);
  assert.equal(found.context.preflightRetry.hidden,true);
  assert.equal(found.context.preflightMatches.children[0].children[0].href,'/browse/FCRM-42');
  assert.equal(found.context.focused,found.context.preflightTitle);
  found.context.preflightContinue.onclick();
  assert.deepEqual(found.rendered,[]);

  const warning = fixture([possible]);
  await warning.run();
  assert.equal(warning.context.preflight.hidden,false);
  assert.equal(warning.context.review.hidden,true);
  assert.match(warning.context.preflightContinue.textContent,/Продолжить к черновику/);
  assert.equal(warning.context.preflightMatches.children.length,1);
  warning.context.preflightContinue.onclick();
  assert.equal(warning.context.review.hidden,false);
  assert.equal(warning.context.selectedIssueLinks.size,0);
  assert.equal(warning.context.earlyCheck,possible);

  const retry = fixture([new Error('Jira timeout'),ready]);
  await retry.run();
  assert.equal(retry.context.review.hidden,true);
  assert.equal(retry.context.preflightRetry.hidden,false);
  assert.equal(retry.context.preflightContinue.hidden,false);
  assert.match(retry.context.preflightMessage.textContent,/проверка обязательна/);
  await retry.context.preflightRetry.onclick();
  assert.equal(retry.context.review.hidden,false);
  assert.equal(retry.inspections.length,2);
  assert.equal(retry.modelRequests.length,1);

  const outage = fixture([new Error('Forbidden')]);
  await outage.run();
  outage.context.preflightContinue.onclick();
  assert.equal(outage.context.review.hidden,false);

  const uncertain = fixture([{state:'uncertain',issues:[issue]},exact]);
  await uncertain.run();
  assert.equal(uncertain.context.review.hidden,true);
  assert.match(uncertain.context.preflightMessage.textContent,/не подтверждён/);
  assert.equal(uncertain.context.preflightRetry.hidden,false);
  await uncertain.context.preflightRetry.onclick();
  assert.equal(uncertain.context.preflightContinue.hidden,true);
  assert.deepEqual(uncertain.rendered,[]);

  const ask = {status:'clarification',message:'Уточните действие',urls:modelDraft.urls};
  const revised = fixture([ready,ready],[ask,modelDraft,{...modelDraft,summary:'Изменение модели'}]);
  await revised.run();
  assert.equal(revised.context.initialClarification,true);
  assert.equal(revised.context.review.hidden,true);
  assert.equal(revised.context.focused,revised.context.reply);
  await revised.run('Подтверждение');
  assert.equal(revised.context.review.hidden,false);
  assert.equal(revised.inspections.length,2);
  assert.equal(revised.inspections[0].summary,'');
  assert.equal(revised.inspections[1].summary,modelDraft.summary);
  revised.context.summary.value='Ручная правка';
  await revised.run('Дополнение');
  assert.equal(revised.context.summary.value,'Ручная правка');
  assert.equal(revised.inspections.length,2);
}

async function checkDraftPanel() {
  const compiled = fs.readFileSync('FCRM-Chrome-3.3/content.js','utf8');
  function section(start, end) {
    const from = compiled.indexOf(start);
    const to = compiled.indexOf(end,from + start.length);
    assert.ok(from >= 0 && to > from,start);
    return compiled.slice(from,to);
  }
  const element = tag => ({
    tag,children:[],attributes:{},events:{},hidden:false,textContent:'',
    append(...items){this.children.push(...items);},
    appendChild(item){this.append(item);},
    replaceChildren(...items){this.children=items;},
    setAttribute(key,value){this.attributes[key]=value;},
    addEventListener(key,fn){this.events[key]=fn;},
    focus(){this.focused=true;},
    get childElementCount(){return this.children.length;},
  });
  const draft = {urls:['https://chatzone.o3t.ru/o3/pl/'+'a'.repeat(26)],summary:'Название черновика',mentionedIssueKeys:['FCRM-42'],
    links:new Map([['OB-45',{key:'OB-45',title:'Реализация',kind:'development'}]])};
  let checked = {state:'ready',issues:[]};
  const inspections = [], lookups = [], timer = [];
  const context = vm.createContext({
    URL,document:{createElement:element,createTextNode:text=>({textContent:text})},
    draft,requestSnapshot:{issueTypeId:'10',componentId:'20'},step:2,summary:{value:draft.summary},normalizedSummary:text=>text.trim(),
    selectedTheme:null,loadingLink:false,busy:false,pendingWrite:null,created:false,
    selectedIssueLinks:new Map(),linkEdits:new Map(),hiddenIssueLinks:new Set(),issueProposals:element('div'),
    linkedSources:element('div'),linkStatus:element('small'),linkField:element('input'),earlyDuplicates:element('section'),
    earlyStatus:element('p'),earlyMatches:element('ul'),earlySerial:0,earlyTimer:0,
    description:{...element('textarea'),hidden:true,value:'h2. Цель\n* <img src=x onerror=alert(1)>\n# Уточнить [условие|https://example.invalid/a]'},
    descriptionView:element('div'),descriptionEdit:element('button'),descriptionRead:element('button'),
    readDraft:()=>({summary:draft.summary,description:'Черновик'}),
    focus:node=>node.focus(),updateControls(){},window:{innerWidth:1000,clearTimeout(){},setTimeout(fn){timer.push(fn);return timer.length;}},
    localStorage:{getItem:()=>null,setItem(_key,value){context.savedWidth=value;}},
    widthControl:element('div'),width:700,panel:{style:{setProperty(_key,value){context.width=parseInt(value,10);}},
      getBoundingClientRect(){return {width:context.width};}},
    threadWriter:{
      inspect:input=>{inspections.push(input);return Promise.resolve(checked);},
      resolveLinkTarget:async key=>{
        lookups.push(key);
        if (key === 'FCRM-43') throw Object.assign(new Error('forbidden'),{status:403});
        return {key,title:'Подтверждённая задача'};
      },
    }
  });
  vm.runInContext(
    section('  const renderAnswerMarkup =','  function isTargetBoardPage()') +
    section('    function renderDescription(', '    function say(') +
    section('    function safeSourceUrl(', '    function renderContextSources(') +
    section('    function writeInput(', '    function showFinalFields('),
    context
  );
  assert.match(compiled,/data-thread-description-read aria-pressed="true"/);
  assert.match(compiled,/<textarea name="draftDescription"[^>]* hidden>/);
  context.descriptionEdit.onclick();
  assert.equal(context.description.hidden,false);
  assert.equal(context.description.focused,true);
  context.descriptionRead.onclick();
  assert.equal(context.description.hidden,true);
  assert.equal(context.descriptionRead.attributes['aria-pressed'],'true');
  assert.match(context.descriptionView.innerHTML,/<h3>Цель<\/h3><ul><li>&lt;img/);
  assert.match(context.descriptionView.innerHTML,/<ol><li>Уточнить <a [^>]*href="https:\/\/example\.invalid\/a"/);
  assert.doesNotMatch(context.descriptionView.innerHTML,/<img/);

  vm.runInContext('bindPanelWidth()',context);
  const key = value => context.widthControl.events.keydown({key:value,preventDefault(){}});
  context.widthControl.events.focus();
  assert.equal(context.widthControl.attributes['aria-valuenow'],'700');
  key('ArrowLeft');
  assert.equal(context.width,732);
  assert.equal(context.savedWidth,'732');
  key('Home');
  assert.equal(context.width,560);
  key('End');
  assert.equal(context.width,1000);
  context.window.innerWidth=420;
  key('Home');
  assert.equal(context.width,420);
  assert.equal(context.widthControl.attributes['aria-valuemax'],'420');
  assert.match(compiled,/@media \(max-width:760px\).*100vw.*data-thread-width.*display:none/);

  const selected = () => JSON.parse(vm.runInContext('JSON.stringify(writeInput().issueLinks)',context));
  vm.runInContext('renderDraftLinks()',context);
  const proposed = context.issueProposals.children[0];
  assert.equal(proposed.children[0].checked,false);
  const flatten = nodes => nodes.flatMap(node=>[node,...flatten(node.children || [])]);
  const sourceNodes=flatten(context.linkedSources.children);
  assert.ok(sourceNodes.some(node=>/треды chatZone/i.test(node.textContent)));
  assert.ok(sourceNodes.some(node=>node.tag === 'ul'));
  assert.deepEqual(sourceNodes.filter(node=>node.tag === 'a').map(node=>node.href),draft.urls);
  assert.ok(sourceNodes.every(node=>node.tag !== 'details' && node.tag !== 'summary' && !node.hidden));
  assert.deepEqual(selected(),[]);
  proposed.children[0].checked=true;
  proposed.children[0].events.change();
  proposed.children[2].value='related';
  proposed.children[2].events.change();
  assert.deepEqual(selected(),[{key:'OB-45',kind:'related'}]);
  proposed.children[3].onclick();
  assert.deepEqual(selected(),[]);
  assert.equal(context.linkField.focused,true);

  context.linkField.value='https://jit.o3.ru/browse/FTD-99';
  await vm.runInContext('addIssueLink()',context);
  assert.deepEqual(lookups,['FTD-99']);
  assert.deepEqual(selected(),[{key:'FTD-99',kind:'related'}]);
  context.linkField.value='FCRM-43';
  await vm.runInContext('addIssueLink()',context);
  assert.match(context.linkStatus.textContent,/недоступна/);
  assert.deepEqual(selected(),[{key:'FTD-99',kind:'related'}]);

  vm.runInContext('queueEarlyDuplicates()',context);
  checked={state:'existing',issues:[{key:'FCRM-40',title:'Тот же источник'}]};
  await timer.shift()();
  assert.equal(context.earlyMatches.children[0].children.length,1);
  assert.equal(context.earlyMatches.children[0].children[0].href,'/browse/FCRM-40');
  assert.equal(inspections.length,1);
  assert.deepEqual(selected(),[{key:'FTD-99',kind:'related'}]);

  let finishOld;
  checked=new Promise(resolve=>{finishOld=resolve;});
  vm.runInContext('queueEarlyDuplicates()',context);
  const old=timer.shift()();
  context.summary.value='Исправленное название';
  vm.runInContext('queueEarlyDuplicates(undefined, true)',context);
  checked={state:'possible-duplicate',issues:[{key:'FCRM-42',title:'Похожая задача'}]};
  await timer.shift()();
  finishOld({state:'possible-duplicate',issues:[{key:'FCRM-8',title:'Устаревший результат'}]});
  await old;
  assert.equal(inspections.at(-1).summary,context.summary.value);
  const matches=context.earlyMatches.children;
  assert.equal(matches.length,1);
  assert.equal(matches[0].children[0].href,'/browse/FCRM-42');
  assert.deepEqual(selected(),[{key:'FTD-99',kind:'related'}]);
  matches[0].children[1].onclick();
  assert.deepEqual(selected(),[{key:'FTD-99',kind:'related'},{key:'FCRM-42',kind:'related'}]);
  assert.match(matches[0].children[1].textContent,/В списке связей/);
  const candidate=context.issueProposals.children.find(row=>row.children[0]?.attributes['aria-label'] === 'Добавить связь с FCRM-42');
  const kindPicker=candidate.children[2];
  assert.deepEqual(kindPicker.children.map(option=>option.textContent),['Связанная задача','Дубликат']);
  kindPicker.value='duplicate';
  kindPicker.events.change();
  const selectedAfterEdit=[{key:'FTD-99',kind:'related'},{key:'FCRM-42',kind:'duplicate'}];
  assert.deepEqual(selected(),selectedAfterEdit);
  draft.links.set('FCRM-42',{key:'FCRM-42',title:'Похожая задача после уточнения',kind:'related'});
  vm.runInContext('renderDraftLinks()',context);
  assert.deepEqual(selected(),selectedAfterEdit);
  const controls=flatten(context.issueProposals.children);
  assert.ok(!controls.some(node=>node.attributes?.['aria-label'] === 'Добавить связь с OB-45'));
  assert.ok(controls.some(node=>node.attributes?.['aria-label'] === 'Добавить связь с FCRM-42' && node.checked));
  assert.ok(flatten(context.linkedSources.children).some(node=>node.tag === 'a' && !node.hidden));
  await checkPreflight(section,element);
}

function checkPanelDismissal(content) {
  const label = content.indexOf('      const panels = [');
  const start = content.lastIndexOf("    document.addEventListener('pointerdown'", label);
  const end = content.indexOf("    if (activeDashboardView === 'product')", label);
  assert.ok(start >= 0 && end > label,'Outside panel pointerdown handler');

  class Element {
    constructor(id, owner = null) {this.id=id;this.owner=owner;this.isConnected=true;this.hidden=false;}
    closest() {return null;}
    contains(target) {return target.owner === this;}
    matches(selector) {return selector === '.ozon-dev-settings' && this.id === 'settings';}
    querySelector() {return {click:()=>{this.hidden=true;this.closed=(this.closed || 0)+1;}};}
  }
  const panels = new Map();
  const opened = (selector,id) => {
    const panel = new Element(id);
    panels.set(selector,panel);
    return panel;
  };
  let pointerdown;
  let assistantCloses = 0, cardCloses = 0;
  const context = vm.createContext({
    Element,CustomEvent:class {constructor(type){this.type=type;}},
    isStructureVisible:true,createInProjectMenuOpen:false,otherLinkMenuOpen:false,selectedTaskKey:'FCRM-91',
    document:{
      addEventListener(type,handler,capture){assert.equal(type,'pointerdown');assert.equal(capture,true);pointerdown=handler;},
      querySelector:selector=>panels.get(selector) || (selector.startsWith('#ozon-thread-sidebar') ? panels.get('#ozon-thread-sidebar') : undefined),
      dispatchEvent(event){assert.equal(event.type,'ozon-close-assistant');assistantCloses++;},
      getElementById(key){assert.equal(key,'ozon-ext-sidebar-close');return {click(){cardCloses++;}};},
    },
    setTimeout:fn=>fn(),
  });
  vm.runInContext(content.slice(start,end),context);
  const outside = new Element('board');
  const wizard = opened('#ozon-thread-sidebar','ozon-thread-sidebar');
  pointerdown({target:outside});
  assert.equal(wizard.hidden,false,'Outside clicks must leave the creation panel open');
  assert.equal(wizard.closed,undefined);
  panels.clear();

  const assistant=opened('#o3ds-layer','o3ds-layer');
  pointerdown({target:new Element('assistant-control',assistant)});
  assert.equal(assistantCloses,0);
  pointerdown({target:outside});
  assert.equal(assistantCloses,1);
  panels.clear();

  for (const [selector,id] of [['.ozon-dev-settings','settings'],['#ozon-dev-editor-panel','ozon-dev-editor-panel']]) {
    const editor=opened(selector,id);
    pointerdown({target:outside});
    assert.equal(editor.closed,1);
    panels.clear();
  }
  const card=opened('#ozon-ext-sidebar-panel','ozon-ext-sidebar-panel');
  pointerdown({target:new Element('card-control',card)});
  assert.equal(cardCloses,0);
  pointerdown({target:outside});
  assert.equal(cardCloses,1);

  const closeStart=content.indexOf('    function closePanel()');
  const closeEnd=content.indexOf('    function clearInspection()',closeStart);
  assert.ok(closeStart>=0&&closeEnd>closeStart,'Explicit close and Escape handlers');
  let keydown;
  let focusCount=0;
  const explicit=vm.createContext({
    panel:{hidden:false,addEventListener(type,handler){assert.equal(type,'keydown');keydown=handler;}},
    close:{},returnToBoard:{},busy:false,pendingWrite:null,created:null,requestSnapshot:{urls:['fixture']},
    launcher:{isConnected:true,focus(){focusCount++;}},
  });
  vm.runInContext(content.slice(closeStart,closeEnd),explicit);
  explicit.close.onclick();
  assert.equal(explicit.panel.hidden,true);
  assert.equal(focusCount,1);
  explicit.panel.hidden=false;
  keydown({key:'Escape',defaultPrevented:true});
  assert.equal(explicit.panel.hidden,false);
  keydown({key:'Escape',defaultPrevented:false,preventDefault(){}});
  assert.equal(explicit.panel.hidden,true);
  assert.equal(focusCount,2);
  assert.deepEqual(explicit.requestSnapshot,{urls:['fixture']});
}

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
      const {fields} = JSON.parse(opts.body);
      assert.equal(Object.hasOwn(fields,'labels'),false);
      controls.lastReceipt={key:'FCRM-814',fields};
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
  const legacyMarker = 'fcrm_thread_' + createHash('sha256').update(url.split('/').at(-1)).digest('hex');
  const legacy = issue('FCRM-801','Задача со старой меткой');
  legacy.fields.labels = [legacyMarker];
  controls.exact = [legacy];
  const legacyExact = await subject.inspect(draft);
  assert.equal(legacyExact.state,'existing');
  assert.equal(legacyExact.issues[0].key,'FCRM-801');
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
  const controlsForStep=Array.from({length:3},()=>({focus(){},pane:{hidden:true,prepend(node){node.parent=this;}},caption:{},dataset:{},
    attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},
    querySelector(q){return q==='[data-thread-step-body]'?this.pane:q==='[data-thread-step-summary]'?this.caption:this;}
  }));
  const status={};
  const context=vm.createContext({steps:controlsForStep,step:1,panel:{hidden:false},status,focus:target=>target.focus(),
    requestSnapshot:{urls:[url],issueTypeName:'Задача',componentName:'Компонент'},
    summary:{value:'Ручное название'},normalizedSummary:s=>s.trim()});
  vm.runInContext(content.slice(start,end),context);
  for(const number of [1,2,3,2,1]){
    vm.runInContext('setStep('+number+')',context);
    assert.deepEqual(controlsForStep.map(x=>x.pane.hidden),Array.from({length:3},(_,i)=>i!==number-1));
    assert.equal(controlsForStep.filter(x=>x.attrs.get('aria-current')==='step').length,1);
    assert.equal(context.summary.value,'Ручное название');
    assert.equal(status.parent,controlsForStep[number-1].pane);
  }
  checkPanelDismissal(content);
  await checkDraftPanel();
  console.log('Stepper regression PASS: single open step, read-only inspection, exact match, updated duplicate set, uncertain response, preview, resize, manual links, initial duplicate gate, early duplicate actions and panel dismissal.');
}

checkStepper().catch(error => { console.error(error); process.exitCode = 1; });
