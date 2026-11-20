// The serialized function runs only inside the local preview iframe.
// It supplies demo Jira responses to the unmodified packaged UI.
export function installPreviewApi(fixture: { tasks: any[]; catalog: any[]; config: any }) {
  const { tasks, catalog, config } = fixture;
  (window as any).__ozonPreviewApi = true;
  const issues = new Map<string, any>();
  const sprintMap = new Map<string, any>();
  const componentMap = new Map<string, string>();
  let nextLinkId = 100000;
  const remoteLinks = new Map<string, any[]>();
  remoteLinks.set('FCRM-2993', [{id:91001,object:{url:'https://chatzone.o3t.ru/ozon/channels/bank-crm-dev',title:'[Демо] Обсуждение оформления диспута'}},{id:91002,object:{url:'https://confluence.o3.ru/',title:'[Демо] Продуктовые требования'}}]);
  const types = ['Задача', 'История', 'Эпик', 'Ошибка', 'Аналитика'].map((name, index) => ({ id: String(index + 1), name, subtask: false }));
  const statusNames: Record<string, string> = { todo: 'К выполнению', in_progress: 'В работе', review: 'Код-ревью', testing: 'Тестирование', done: 'Готово', canceled: 'Отменено' };
  const statuses = [...new Set([...Object.values(statusNames), 'Backlog'])].map((name, index) => ({ id: String(index + 1), name }));
  const firstSprint = tasks.find(task => task.sprint && !/бэклог/i.test(task.sprint))?.sprint;
  const firstNumber = Number(/Sprint\s+(\d+)/i.exec(firstSprint || '')?.[1] || 0);
  const user = { name: 'preview-user', displayName: 'Пользователь предпросмотра', active: true };
  const person = (value: any) => value ? { name: value.login || value.name || 'demo-user', displayName: value.name, active: true } : null;
  const componentId = (name: string) => {
    if (!componentMap.has(name)) componentMap.set(name, String(100 + componentMap.size));
    return componentMap.get(name)!;
  };
  const sprint = (name: string) => {
    if (!name || /бэклог|не в спринте/i.test(name)) return null;
    if (!sprintMap.has(name)) {
      const number = Number(/Sprint\s+(\d+)/i.exec(name)?.[1] || firstNumber);
      const state = name === firstSprint ? 'active' : number > firstNumber ? 'future' : 'closed';
      sprintMap.set(name, { id: 1000 + sprintMap.size, name, state, originBoardId: Number(config.rapidViewId) });
    }
    return sprintMap.get(name);
  };
  const toIssue = (task: any, epic = false) => {
    if (issues.has(task.key)) return issues.get(task.key);
    const typeName = task.issueTypeName || task.issueType || (epic ? 'Эпик' : 'Задача');
    const type = types.find(item => item.name === typeName) || types[0];
    let override: any = {};
    try { override = JSON.parse(localStorage.getItem('ozon_fcrm_task_overrides_v31') || '{}')[task.key] || {}; } catch {}
    // Older preview state stored only the visible comma-separated value; prefer it
    // when it disagrees with a stale components array, without splitting real names.
    const savedName = typeof override.component === 'string' ? override.component.trim() : '';
    const savedComponents = Array.isArray(override.components) ? override.components.map((item: any) => typeof item === 'string' ? item : item?.name).filter(Boolean) : [];
    const knownNames = new Set([...tasks, ...catalog].flatMap((item: any) => [item.component, ...(Array.isArray(item.components) ? item.components : [])]).map((item: any) => typeof item === 'string' ? item : item?.name).filter(Boolean));
    let rawComponents = Array.isArray(override.components) ? savedComponents : Array.isArray(task.components) ? task.components : [task.component];
    if (savedName && savedName !== savedComponents.join(', ')) {
      if (savedName === 'Без компонента') rawComponents = [];
      else if (knownNames.has(savedName)) rawComponents = [savedName];
      else {
        const remaining = savedName.split(', ');
        const parsed: string[] = [];
        while (remaining.length) {
          let count = remaining.length;
          while (count > 1 && !knownNames.has(remaining.slice(0, count).join(', '))) count--;
          parsed.push(remaining.splice(0, count).join(', '));
        }
        rawComponents = parsed;
      }
    }
    const components = rawComponents.map((item: any) => typeof item === 'string' ? item : item?.name).filter((name: string) => name && name !== 'Без компонента');
    const rawSprint = sprint(task.sprint);
    const issue = {
      id: String(10000 + issues.size), key: task.key,
      fields: {
        summary: task.summary || task.key, description: task.description || '',
        issuetype: type, status: { name: statusNames[task.status] || task.status || 'К выполнению' },
        priority: { name: task.priority || 'Средний' },
        components: [...new Set<string>(components)].map(name => ({ id: componentId(name), name })),
        assignee: person(task.assignee), reporter: person(task.author) || user, creator: person(task.author) || user,
        created: '2026-11-01T10:00:00+03:00', labels: epic ? ['fcrm_umb_epic'] : [], issuelinks: [],
        sprint: rawSprint?.state !== 'closed' ? rawSprint : null,
        closedSprints: rawSprint?.state === 'closed' ? [rawSprint] : [],
        [config.sprintFieldId]: rawSprint ? [rawSprint] : [],
        [config.epicFieldId]: task.epicKey || null,
        [config.customerFieldId]: person(task.customer),
        customfield_11502: epic ? task.summary : null,
        customfield_20100: null,
      },
    };
    issues.set(task.key, issue);
    return issue;
  };
  catalog.forEach(task => toIssue(task, true));
  tasks.forEach(task => toIssue(task));
  tasks.forEach(task => {
    if (task.epicKey) toIssue({ key: task.epicKey, summary: task.epicName }, true);
    const source = issues.get(task.key);
    for (const [property, name] of [['projectTaskLinks', 'Задача проекта'], ['inProjectLinks', 'В проекте'], ['otherLinks', 'Связанная задача']]) {
      (task[property] || []).forEach((link: any, index: number) => {
        const target = toIssue(link, property === 'projectTaskLinks');
        source.fields.issuelinks.push({
          id: String(nextLinkId++), type: { name, outward: name, inward: 'Связанная задача' },
          outwardIssue: { key: target.key, fields: { summary: target.fields.summary, status: target.fields.status, issuetype: target.fields.issuetype } },
        });
      });
    }
  });
  // Keep one Epic Link and its OBPROJECT counterpart visible in preview.
  const sampleEpic = [...issues.values()].find(issue => /^FCRM-/.test(issue.key) && /^(эпик|epic)$/i.test(issue.fields?.issuetype?.name || ''));
  if (sampleEpic) { sampleEpic.fields.customfield_20100 = 'OBPROJECT-5143'; toIssue({key:'OBPROJECT-5143',summary:'[Демо] Улучшение интерфейса CRM',status:'in_progress'},true); }
  // Rich FCRM example is shared by the product and development details sidebar.
  const sample = toIssue({key:'FCRM-2993',summary:'[Демо] Оформление диспута в CRM',description:'Упростить оформление диспута для оператора поддержки.',component:'CRM: Поддержка (Продукты и Карточка клиента)',sprint:firstSprint,epicKey:tasks.find(task => task.epicKey)?.epicKey,status:'in_progress',assignee:{name:'Алексей Смирнов'},customer:{name:'Дмитрий Волков'}});
  const examples = [
    {key:'OB-319965',summary:'[Демо] Поддержать новые типы диспутов',component:'CS',sprint:firstSprint,status:'done'},
    {key:'OBFRONT-106100',summary:'[Демо] Экран оформления диспута',component:'CS',sprint:firstSprint,status:'in_progress'},
    {key:'FTD-15857',summary:'[Демо] Дизайн интерфейса диспутов',component:'bank crm',status:'done'},
    {key:'FCRM-4821',summary:'[Демо] Связанное продуктовое требование',status:'in_progress'}
  ];
  sample.fields.issuelinks=examples.map((example,index) => { const target=toIssue(example); const name=index<3?'В проекте':'Связанная задача'; return {id:String(nextLinkId++),type:{name,outward:name,inward:'Задача проекта'},outwardIssue:{key:target.key,fields:target.fields}}; });
  const mainKeys = new Set(tasks.map(task => task.key));
  const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const page = (values: any[], url: URL, property = 'issues') => {
    const startAt = Number(url.searchParams.get('startAt') || 0);
    const maxResults = Number(url.searchParams.get('maxResults') || 100);
    return json({ [property]: values.slice(startAt, startAt + maxResults), total: values.length, startAt, maxResults, isLast: startAt + maxResults >= values.length });
  };
  const reportHistory = new Map<string,any>();
  const reportSprints = new Map<string,any>();
  const reportClock = Date.now();
  const reportStatus = {
    todo:{id:'1001',name:'К выполнению',statusCategory:{key:'new'}},
    progress:{id:'1002',name:'В работе',statusCategory:{key:'indeterminate'}},
    review:{id:'1003',name:'Ревью',statusCategory:{key:'indeterminate'}},
    done:{id:'1004',name:'Готово',statusCategory:{key:'done'}}
  };
  const reportConfiguration = {
    estimation:{type:'field',field:{fieldId:'customfield_10002',displayName:'Story Points'}},
    columnConfig:{columns:[{statuses:[{id:'1001'}]},{statuses:[{id:'1002'},{id:'1003'}]},{statuses:[{id:'1004'}]}]}
  };
  const reportSprint = (id:number, board:number, name:string, state:string) => {
    const closed=state==='closed', day=86400000;
    const start=new Date(reportClock-(closed?22:8)*day).toISOString();
    const end=new Date(reportClock+(closed?-9:6)*day).toISOString();
    const data={id,originBoardId:board,name,state,startDate:start,endDate:end,...(closed ? {completeDate:end} : {})};
    reportSprints.set(String(id),data);
    return data;
  };
  const fcrmActive = sprint(firstSprint);
  if (fcrmActive) Object.assign(fcrmActive,reportSprint(fcrmActive.id,Number(config.rapidViewId),fcrmActive.name,'active'));
  const fcrmClosed = reportSprint(99100,Number(config.rapidViewId),'FCRM · предыдущий спринт','closed');
  const csActive = reportSprint(86053,6197,'CS #74 (03.11 – 16.11)','active');
  const csClosed = reportSprint(85000,6197,'CS #73 (20.10 – 02.11)','closed');
  reportSprint(99011,7180,'CRM_CORE #12 (03.11 – 16.11)','active');
  reportSprint(99021,12696,'CRM_BO #12 (03.11 – 16.11)','active');

  function previewSprintReport(selected:any) {
    const status = (from:keyof typeof reportStatus,to:keyof typeof reportStatus) => ({
      field:'status',from:reportStatus[from].id,fromString:reportStatus[from].name,to:reportStatus[to].id,toString:reportStatus[to].name
    });
    const membership = (adding:boolean) => ({field:'Sprint',from:adding ? null : String(selected.id),to:adding ? String(selected.id) : null,fromString:adding ? '' : selected.name,toString:adding ? selected.name : ''});
    const change = (day:number,...items:any[]) => ({created:new Date(Date.parse(selected.startDate)+day*86400000+7200000).toISOString(),items});
    const base = 200000 + Number(selected.id)*10;
    const project = selected.originBoardId === Number(config.rapidViewId) ? 'FCRM' : 'OB';
    const make = (number:number, summary:string, points:number | null, finalStatus:keyof typeof reportStatus, member:boolean, histories:any[]) => {
      const key = project + '-' + (base+number);
      const history={key,fields:{summary:'[Демо] ' + summary,created:new Date(Date.parse(selected.startDate)-86400000).toISOString(),issuetype:{name:'Задача',subtask:false},
        status:reportStatus[finalStatus],customfield_10002:points,[config.sprintFieldId]:member ? [selected] : [],sprint:member && selected.state === 'active' ? selected : null,
        closedSprints:member && selected.state === 'closed' ? [selected] : []},changelog:{histories,startAt:0,total:histories.length}};
      reportHistory.set(key,history);
      return {key,summary:history.fields.summary,statusId:history.fields.status.id,statusName:history.fields.status.name};
    };
    const a=make(1,'Автозаполнение реквизитов клиента',5,'done',true,[change(0,status('todo','progress')),change(2,status('progress','review')),change(3,status('review','done'))]);
    const b=make(2,'Уведомление об истечении срока договора',13,'progress',true,[change(0,status('todo','progress')),change(2,{field:'Story Points',fieldId:'customfield_10002',from:'8',to:'13'}),change(4,status('progress','done')),change(5,status('done','progress'))]);
    const c=make(3,'Фильтр по сегменту в карточке клиента',3,'progress',false,[change(1,status('todo','progress')),change(3,membership(false))]);
    const d=make(4,'Проверка лимита при оформлении заявки',2,'done',true,[change(1,membership(true)),change(2,status('todo','progress')),change(5,status('progress','done'))]);
    const e=make(5,'Уточнение требований к журналу операций',null,'todo',true,[]);
    const f=make(6,'Текст ошибки для недоступного сервиса',1,'todo',false,[change(1,membership(true)),change(4,membership(false))]);
    return {contents:{completedIssues:[a,d],issuesNotCompletedInCurrentSprint:[b,e],issuesCompletedInAnotherSprint:[],puntedIssues:[c,f],issueKeysAddedDuringSprint:{[d.key]:true,[f.key]:true}}};
  }
  window.fetch = async (input: RequestInfo | URL, options: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input), 'https://jit.o3.ru');
    const path = url.pathname;
    const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url.hostname !== 'jit.o3.ru') return json({ errorMessages: ['Внешние запросы доступны в установленном расширении'] }, 403);
    if (method === 'GET' && path === '/rest/api/1.0/labels/suggest') {
      const query = (url.searchParams.get('query') || '').toLowerCase();
      const labels = new Set<string>(['fcrm_umb_epic', 'fcrm_accounts', 'fcrm_card1', 'crm_support']);
      issues.forEach(issue => (issue.fields.labels || []).forEach((label: string) => labels.add(label)));
      return json({ suggestions: [...labels].filter(label => label.toLowerCase().includes(query)).map(label => ({ label })) });
    }
    const match = /^\/rest\/api\/2\/issue\/([A-Z][A-Z0-9]+-\d+)(?:\/(.*))?$/.exec(path);
    if (method !== 'GET') {
      if (match && match[2] === 'transitions' && method === 'POST' && issues.has(match[1])) {
        const data = JSON.parse(String(options.body || '{}'));
        const status = statuses.find(item => String(item.id) === String(data.transition?.id));
        if (!status) return json({errorMessages:['Переход не найден']},400);
        issues.get(match[1]).fields.status = status;
        return new Response(null,{status:204});
      }
      if (match && match[2] === 'remotelink' && method === 'POST' && issues.has(match[1])) {
        const data = JSON.parse(String(options.body || '{}'));
        if (!data.object?.url || !data.object?.title) return json({errorMessages:['Укажите ссылку и название']},400);
        const entry = {id:nextLinkId++,object:{url:data.object.url,title:data.object.title}};
        remoteLinks.set(match[1],[...(remoteLinks.get(match[1]) || []),entry]);
        return json(entry,201);
      }
      if (method === 'POST' && path === '/rest/api/2/issue') {
        const data = JSON.parse(String(options.body || '{}')); const fields=data.fields || {};
        if (!fields.summary || !fields.components?.length) return json({errorMessages:['Укажите название и компонент']},400);
        const type=types.find(item => item.id === String(fields.issuetype?.id));
        const componentName=[...componentMap].find(([,id]) => id === String(fields.components[0].id))?.[0] || 'Без компонента';
        let number=99900; while (issues.has('FCRM-'+number)) number++;
        const issue=toIssue({key:'FCRM-'+number,summary:fields.summary,component:componentName,issueTypeName:type?.name || 'Задача'}, Boolean(fields.labels?.includes('fcrm_umb_epic')));
        issue.fields.labels=fields.labels || []; issue.fields.description=fields.description || '';
        return json({id:issue.id,key:issue.key},201);
      }
      if (method === 'POST' && path === '/rest/api/2/issueLink') {
        const data = JSON.parse(String(options.body || '{}'));
        const inward = issues.get(data.inwardIssue?.key), outward = issues.get(data.outwardIssue?.key);
        if (!inward || !outward) return json({errorMessages:['Задача не найдена в демо']},404);
        const name = data.type?.name || (data.type?.id === '0' ? 'Задача проекта' : 'В проекте');
        const type = name === 'Задача проекта' ? {name,inward:'Задача проекта',outward:'В проекте'} : name === 'Дубликат' ? {name,inward:'Дублировано с',outward:'Дубликат'} : {name,inward:name,outward:name};
        const id = String(nextLinkId++);
        inward.fields.issuelinks ||= []; outward.fields.issuelinks ||= [];
        inward.fields.issuelinks.push({id,type,outwardIssue:{key:outward.key,fields:{summary:outward.fields.summary,status:outward.fields.status,issuetype:outward.fields.issuetype}}});
        outward.fields.issuelinks.push({id,type,inwardIssue:{key:inward.key,fields:{summary:inward.fields.summary,status:inward.fields.status,issuetype:inward.fields.issuetype}}});
        return new Response(null,{status:201});
      }
      const issueLinkId = /^\/rest\/api\/2\/issueLink\/(\d+)$/.exec(path)?.[1];
      if (method === 'DELETE' && issueLinkId) {
        let removed = false;
        issues.forEach(issue => { if (!Array.isArray(issue.fields?.issuelinks)) return; const before = issue.fields.issuelinks.length; issue.fields.issuelinks = issue.fields.issuelinks.filter((link:any) => String(link.id) !== issueLinkId); removed ||= before !== issue.fields.issuelinks.length; });
        return removed ? new Response(null,{status:204}) : json({errorMessages:['Связь не найдена']},404);
      }
      if (match && method === 'PUT' && issues.has(match[1])) {
        const data = JSON.parse(String(options.body || '{}'));
        const target = issues.get(match[1]);
        const priorities = ['Критический','Высокий','Средний','Низкий'].map((name,index) => ({id:String(index+1),name}));
        if (data.fields?.priority?.id) data.fields.priority = priorities.find(item => item.id === String(data.fields.priority.id)) || data.fields.priority;
        if (Array.isArray(data.fields?.components)) data.fields.components = data.fields.components.map((component:any) => { const name = component.name || [...componentMap].find(([,id]) => String(id) === String(component.id))?.[0]; return name ? {id:componentId(name),name} : component; });
        Object.assign(target.fields, data.fields || {});
        if (data.update?.labels) { const labels = [...(target.fields.labels || [])]; data.update.labels.forEach((change:any) => { if (change.add && !labels.includes(change.add)) labels.push(change.add); if (change.remove) { const index=labels.indexOf(change.remove); if (index >= 0) labels.splice(index,1); } }); target.fields.labels=labels; }
        if (data.fields && config.epicFieldId in data.fields) {
          const epicKey = data.fields[config.epicFieldId];
          issues.get(match[1]).fields.epic = epicKey ? {key:epicKey,summary:issues.get(epicKey)?.fields.summary || epicKey} : null;
        }
        if (data.fields?.customfield_24000?.id) issues.get(match[1]).fields.customfield_24000 = {id:data.fields.customfield_24000.id,value:'Стрим ' + data.fields.customfield_24000.id};
        return new Response(null, { status: 204 });
      }
      const targetSprint = /^\/rest\/agile\/1\.0\/sprint\/(\d+)\/issue$/.exec(path)?.[1];
      if (method === 'POST' && (targetSprint || path === '/rest/agile/1.0/backlog/issue')) {
        const body = JSON.parse(String(options.body || '{}'));
        (body.issues || []).forEach((key:string) => {
          const issue = issues.get(key); if (!issue) return;
          const sprint = targetSprint ? ([...sprintMap.values()].find((item:any) => String(item.id) === targetSprint) || {id:Number(targetSprint),name:targetSprint === '86053' ? 'CS #74 (03.11 – 16.11)' : 'CS #75 (17.11 – 30.11)',startDate:targetSprint === '86053' ? '2026-11-03' : '2026-11-17',state:targetSprint === '86053' ? 'active' : 'future'}) : null;
          issue.fields.sprint = sprint; issue.fields[config.sprintFieldId] = [...(issue.fields.closedSprints || []),...(sprint ? [sprint] : [])];
        });
        return new Response(null,{status:204});
      }
      return json({ errorMessages: ['Предпросмотр работает на демонстрационных данных. Создание и связи доступны в расширении Jira.'] }, 501);
    }
    if (path.endsWith('/myself')) return json(user);
    if (path === '/rest/greenhopper/1.0/rapid/charts/sprintreport') {
      const selected=reportSprints.get(url.searchParams.get('sprintId') || '');
      return selected ? json(previewSprintReport(selected)) : json({},404);
    }
    const reportId=/^\/rest\/agile\/1\.0\/sprint\/(\d+)$/.exec(path)?.[1];
    if (reportId && reportSprints.has(reportId)) return json(reportSprints.get(reportId));
    if (path === '/rest/api/2/search' && url.searchParams.get('expand') === 'changelog') {
      const keys = url.searchParams.get('jql')?.match(/[A-Z][A-Z0-9_]*-\d+/g) || [];
      return page(keys.map(key=>reportHistory.get(key) || issues.get(key)).filter(Boolean),url);
    }
    if (match && url.searchParams.get('expand') === 'changelog' && reportHistory.has(match[1])) return json(reportHistory.get(match[1]));
    if (path === '/rest/api/2/search' && url.searchParams.get('fields')?.includes('customfield_24000')) {
      const jql = url.searchParams.get('jql') || '';
      if (/project\s*=\s*FCRM/i.test(jql)) {
        const key = /key\s*=\s*"([A-Z]+-\d+)"/i.exec(jql)?.[1];
        const text = /summary\s*~\s*"([^"]*)"/i.exec(jql)?.[1]?.replace(/\*/g,'').toLowerCase();
        const selectedSprint = /Sprint\s*=\s*(\d+)/i.exec(jql)?.[1];
        return page([...issues.values()].filter(issue => /^FCRM-/.test(issue.key) && (!key || issue.key === key) && (!text || (issue.fields.summary + ' ' + (issue.fields.description || '')).toLowerCase().includes(text)) && (!selectedSprint || (issue.fields[config.sprintFieldId] || []).some((sprint:any) => String(sprint.id) === selectedSprint))),url);
      }
      const streams: Record<string, string> = { 'OBPROJECT-13060':'Стрим 3', 'OBPROJECT-5143':'Стрим 2' };
      const keys = url.searchParams.get('jql')?.match(/[A-Z]+-\d+/g) || ['OBPROJECT-13060','OBPROJECT-5143'];
      const result = keys.map(key => ({ key, fields:{ summary:key === 'OBPROJECT-13060' ? 'Интеграция с Диспут+' : key.startsWith('FTD') ? '[Демо] Дизайн интерфейса диспутов' : key.startsWith('FCRM') ? '[Демо] Оформление диспута в CRM' : 'Улучшение интерфейса CRM', issuetype:{name:'Задача'},priority:{name:'Высокий'},sprint:{id:90001,name:'FCRM Sprint 43 (11.11 – 25.11)',state:'active'}, status:{name:key.startsWith('FTD') ? 'Готово' : 'В работе',statusCategory:{key:key.startsWith('FTD') ? 'done' : 'indeterminate'}}, customfield_24000:{ value:streams[key] || '' } } }));
      result.forEach(issue => { if (!issues.has(issue.key)) issues.set(issue.key,issue); });
      return page(result.map(issue => issues.get(issue.key)), url);
    }
    const backlogBoard = /^\/rest\/agile\/1\.0\/board\/(6197|7180|12696)\/backlog$/.exec(path)?.[1];
    if (backlogBoard) {
      const boardNames:Record<string,string> = {'6197':'CS','7180':'CRM_CORE','12696':'CRM_BO'};
      const issue = toIssue({key:'OB-' + (Number(backlogBoard) + 200000),summary:'[Демо] Задача бэклога ' + boardNames[backlogBoard],component:boardNames[backlogBoard],status:'К выполнению',epicKey:'OBPROJECT-5143'});
      Object.assign(issue.fields,{customfield_10002:3,project:{key:'OB'},status:{name:'Backlog',statusCategory:{key:'new'}}});
      return page([issue],url);
    }
    const extraTeams=[{id:7180,name:'CRM_CORE',sprintId:99011},{id:12696,name:'CRM_BO',sprintId:99021}];
    if(path==='/rest/agile/1.0/board') return page(extraTeams.filter(item=>!url.searchParams.get('name') || item.name===url.searchParams.get('name')),url,'values');
    const extra=extraTeams.find(item=>path.startsWith('/rest/agile/1.0/board/'+item.id+'/'));
    if(extra) {
      if(path.endsWith('/configuration')) return json({id:extra.id,name:extra.name,...reportConfiguration});
      if(path.endsWith('/sprint')) { const requested=(url.searchParams.get('state') || '').split(','); return page([{id:extra.sprintId,originBoardId:extra.id,name:extra.name+' #12 (03.11 – 16.11)',state:'active',startDate:'2026-11-03T09:00:00+03:00'},{id:extra.sprintId+1,originBoardId:extra.id,name:extra.name+' #13 (17.11 – 30.11)',state:'future',startDate:'2026-11-17T09:00:00+03:00'}].filter(item=>requested.includes(item.state)),url,'values'); }
      if(path.endsWith('/issue')) { const id=Number(path.split('/').at(-2)); const rawSprint={id,originBoardId:extra.id,name:extra.name+' #12 (03.11 – 16.11)',state:'active',startDate:'2026-11-03T09:00:00+03:00'}; const issue=toIssue({key:'OB-'+(extra.id+100000),summary:'[Демо] Задача команды '+extra.name,component:extra.name,status:'in_progress',epicKey:'OBPROJECT-5143'}); Object.assign(issue.fields,{customfield_10002:3,sprint:rawSprint,[config.sprintFieldId]:[rawSprint]}); return page([issue],url); }
    }
    // CS is a separate demo dataset: no FCRM issue is used as a development issue.
    if (path === '/rest/agile/1.0/board/6197/configuration') return json({ id:6197, name:'CS', ...reportConfiguration });
    if (path === '/rest/agile/1.0/board/' + config.rapidViewId + '/configuration') return json({ id:config.rapidViewId, name:'FCRM', ...reportConfiguration });
    if (path === '/rest/agile/1.0/board/6197/sprint') {
      const allowed = String(url.searchParams.get('state') || 'active,future').split(',');
      return page([
        csActive,
        { id:86170, originBoardId:6197, name:'CS #75 (17.11 – 30.11)', state:'future', startDate:'2026-11-17T09:00:00+03:00' },
        { id:88763, originBoardId:6197, name:'CS #76 (01.12 – 14.12)', state:'future', startDate:'2026-12-01T09:00:00+03:00' },
        csClosed,
        { id:87313, originBoardId:12696, name:'CRM_BO #16 (03.11 – 17.11)', state:'active' },
      ].filter(sprint => allowed.includes(sprint.state)), url, 'values');
    }
    const csSprintId = /^\/rest\/agile\/1\.0\/board\/6197\/sprint\/([0-9]+)\/issue$/.exec(path)?.[1];
    if (csSprintId) {
      const demoIssue = (key: string, summary: string, points: number | null, status: string, category: string, epicKey?: string, epicTitle?: string) => ({ key, id:key, fields:{ summary, customfield_10002:points, status:{ name:status, statusCategory:{ key:category } }, ...(epicKey ? { epic:{ key:epicKey, summary:epicTitle } } : {}) } });
      const demo = csSprintId === '86053' ? [
        demoIssue('OBFRONT-100567','[Демо] Выбор операции и заполнение заявки на диспут',0,'Ready To Deploy','indeterminate','OBPROJECT-13060','Интеграция с Диспут+'),
        demoIssue('OB-319965','[Демо] Поддержать новые типы диспутов',2,'Готово','done','OBPROJECT-13060','Интеграция с Диспут+'),
        demoIssue('OBFRONT-103514','[Демо] Настроить раскатку на сегмент',3,'В работе','indeterminate','OBPROJECT-13060','Интеграция с Диспут+'),
        demoIssue('OBFRONT-101393','[Демо] Перенос строк в списках',2,'Сделать','new','OBPROJECT-5143','Улучшение интерфейса CRM'),
        demoIssue('OB-147307','[Демо] Командная задача без эпика',null,'Сделать','new'),
      ] : csSprintId === '86170' ? [
        demoIssue('OBFRONT-106100','[Демо] Проверка доступа к странице клиента',2,'Сделать','new','OBPROJECT-5143','Улучшение интерфейса CRM'),
        demoIssue('OB-332220','[Демо] Обновить зависимости',3,'Backlog','new'),
      ] : csSprintId === '85000' ? [demoIssue('OB-294659','[Демо] Передать логин оператора в событии',3,'Готово','done','OBPROJECT-5143','Улучшение интерфейса CRM')] : [];
      demo.forEach((issue, index) => Object.assign(issue.fields, { project:{ key:issue.key.split('-')[0] }, priority:{ name:index === 0 ? 'Высокий' : 'Средний' }, issuelinks:index < 2 ? [{ type:{name:'Задача проекта'}, inwardIssue:{key:'FCRM-2993',fields:{summary:'[Демо] Оформление диспута в CRM'}} }, ...(issue.key.startsWith('OBFRONT') ? [{type:{name:'Связанная задача'},outwardIssue:{key:'FTD-15857',fields:{summary:'[Демо] Дизайн интерфейса диспутов'}}}] : [])] : [], sprint:{ id:Number(csSprintId), originBoardId:6197, startDate:csSprintId === '86170' ? '2026-11-17' : csSprintId === '85000' ? '2026-10-20' : '2026-11-03' }, closedSprints:[] }));
      // A carried issue is returned by both sprint endpoints, but belongs only to its last sprint.
      if (csSprintId === '85000') demo.push({ ...demoIssue('OB-319965','[Демо] Поддержать новые типы диспутов',2,'Готово','done','OBPROJECT-13060','Интеграция с Диспут+'), fields:{ ...demoIssue('OB-319965','[Демо] Поддержать новые типы диспутов',2,'Готово','done','OBPROJECT-13060','Интеграция с Диспут+').fields, sprint:{ id:86053, startDate:'2026-11-03' }, closedSprints:[{ id:85000, startDate:'2026-10-20' }] } } as any);
      demo.forEach(issue => issues.set(issue.key,issue));
      return page(demo, url);
    }
    if (path === '/rest/api/2/field') return json([
      { id: config.sprintFieldId, name: 'Sprint', schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' } },
      { id: config.epicFieldId, name: 'Epic Link', schema: { custom: 'com.pyxis.greenhopper.jira:gh-epic-link' } },
      { id: 'customfield_11502', name: 'Epic Метка', schema: { type: 'string', custom: 'com.pyxis.greenhopper.jira:gh-epic-label' } },
      { id: config.customerFieldId, name: 'Заказчик/Owner', schema: { type: 'user' } },
    ]);
    if (path.endsWith('/components')) {
      const project = /\/project\/([^/]+)\/components$/.exec(path)?.[1]?.toUpperCase();
      const names = new Set<string>();
      issues.forEach(issue => { if (!project || issue.key?.split('-')[0]?.toUpperCase() === project) (issue.fields?.components || []).forEach((item:any) => { if (item?.name) names.add(item.name); }); });
      return json([...names].map(name => ({ id:componentId(name), name, project, archived:false, deleted:false })).concat([{id:'preview-archived',name:'[Демо] Архивный компонент',project,archived:true,deleted:false}]));
    }
    if (path.endsWith('/statuses')) return json(types.map(type => ({ ...type, statuses })));
    if (path.includes('/createmeta/')) {
      if (/\/issuetypes\/\d+$/.test(path)) return page([
        { fieldId: 'summary', name: 'Название', required: true, schema: { type: 'string' } },
        { fieldId: 'description', name: 'Описание', required: true, schema: { type: 'string' } },
      ], url, 'values');
      return page(types, url, 'values');
    }
    if (path.includes('/user/')) return json([user, ...tasks.map(task => person(task.assignee)).filter(Boolean)]);
    if (path === '/rest/api/2/issueLinkType') return json({ issueLinkTypes: [{id:'0',name:'Задача проекта',inward:'Задача проекта',outward:'В проекте'},{id:'1',name:'Связанная задача',inward:'Связанная задача',outward:'Связанная задача'},{id:'2',name:'Дубликат',inward:'Дублировано с',outward:'Дубликат'}] });
    if (match) {
      if (match[2] === 'editmeta') return json({fields:{priority:{allowedValues:['Критический','Высокий','Средний','Низкий'].map((name,index) => ({id:String(index+1),name}))},customfield_24000:{required:false,schema:{type:'option'},allowedValues:[1,2,3,4,5].map(id => ({id:String(id),value:'Стрим ' + id}))}}});
      const issue = issues.get(match[1]);
      if (!issue) return json({ errorMessages: ['В демонстрационных данных этой задачи нет'] }, 404);
      if (match[2] === 'transitions') return json({ transitions: statuses.map(status => ({ id: status.id, name: status.name, to: status })) });
      if (match[2] === 'remotelink') return json(remoteLinks.get(match[1]) || []);
      return json(issue);
    }
    if (/\/board\/\d+\/sprint$/.test(path)) {
      const allowed = String(url.searchParams.get('state') || 'active,future,closed').split(',');
      return page([...sprintMap.values(),fcrmClosed].filter(item => allowed.includes(item.state)), url, 'values');
    }
    if (path === '/rest/api/2/search') {
      const query = url.searchParams.get('jql') || '';
      if (/^project\s*=\s*FCRM\s+ORDER\s+BY\s+key\s+ASC$/i.test(query.trim())) {
        const theme = (key:string, summary:string) => ({key,fields:{summary,issuetype:{name:'Эпик'},status:{name:'В работе',statusCategory:{key:'indeterminate'}},components:[{name:'CRM: Поддержка'}],labels:['fcrm_umb_epic'],issuelinks:[] as any[]}});
        const projectLink = (key:string) => ({type:{name:'Проект',outward:'Задача проекта',inward:'В проекте'},outwardIssue:{key}});
        const parent = theme('FCRM-99001','[Демо] Развитие клиентской поддержки');
        const child = theme('FCRM-99002','[Демо] Обращения клиентов');
        const other = theme('FCRM-99003','[Демо] Улучшение пользовательского опыта');
        child.fields.issuelinks.push(projectLink(parent.key));
        [parent,child,other].forEach(item => { if (!issues.has(item.key)) issues.set(item.key,item); });
        const values = [...issues.values()].filter(issue => /^FCRM-\d+$/i.test(issue.key) && !/^FCRM-9900[123]$/.test(issue.key)).map((issue,index) => ({...issue,fields:{...issue.fields,issuelinks:[...(issue.fields.issuelinks || []),...(index === 0 ? [projectLink(child.key),projectLink(other.key)] : index === 1 ? [projectLink(parent.key)] : [])]}}));
        return page([...values,issues.get(parent.key),issues.get(child.key),issues.get(other.key)],url);
      }
      const keys = query.match(/[A-Z][A-Z0-9]+-\d+/g);
      let values = [...issues.values()].filter(issue => mainKeys.has(issue.key));
      if (/key\s*(?:in|=)/i.test(query) && keys) values = [...new Set(keys)].map(key => issues.get(key)).filter(Boolean);
      else if (/fcrm_umb_epic/i.test(query)) values = [...issues.values()].filter(issue => issue.fields.labels.includes('fcrm_umb_epic'));
      else if (/issuetype/i.test(query)) values = [...issues.values()].filter(issue => issue.fields.issuetype.name === 'Эпик');
      const requestedSprint = /\bSprint\s*=\s*(\d+)/i.exec(query)?.[1];
      if (requestedSprint) values = values.filter(issue => (issue.fields[config.sprintFieldId] || []).some((item: any) => String(item.id) === requestedSprint));
      if (/Sprint\s+is\s+EMPTY/i.test(query)) values = values.filter(issue => !issue.fields.sprint && !issue.fields.closedSprints.length);
      const requestedComponent = /component\s*=\s*"([^"]+)"/i.exec(query)?.[1];
      if (requestedComponent) values = values.filter(issue => issue.fields.components.some((item: any) => item.name === requestedComponent));
      return page(values, url);
    }
    if (/\/board\/\d+\/(?:sprint\/\d+\/issue|backlog|issue)$/.test(path)) {
      let values = [...issues.values()].filter(issue => mainKeys.has(issue.key));
      const sprintId = /\/sprint\/(\d+)\/issue$/.exec(path)?.[1];
      if (sprintId) values = values.filter(issue => issue.fields.sprint && String(issue.fields.sprint.id) === sprintId);
      if (path.endsWith('/backlog')) values = values.filter(issue => !issue.fields.sprint && !issue.fields.closedSprints.length);
      return page(values, url);
    }
    if (path.includes('/greenhopper/')) return json({ sprints: [...sprintMap.values()], issues: [] });
    if (/\/project\/[^/]+$/.test(path)) return json({ key: config.projectKey, issueTypes: types });
    return json({ errorMessages: ['Этот запрос не используется в локальном предпросмотре'] }, 404);
  };
  Object.defineProperty(window, 'chrome', { configurable: true, value: {
    runtime: { lastError: null, sendMessage(_message: any, callback: (response: any) => void) {
      window.setTimeout(() => callback({ ok: false, error: 'DeepSeek доступен в установленном расширении на jit.o3.ru. Здесь показан интерфейс на демонстрационных данных.' }), 300);
    } },
  } });
  const storage = window.localStorage;
  Object.defineProperty(window, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.getItem('extension-preview:' + key),
    setItem: (key: string, value: string) => storage.setItem('extension-preview:' + key, value),
    removeItem: (key: string) => storage.removeItem('extension-preview:' + key),
  } });
  document.addEventListener('click', event => {
    const link = (event.target as Element)?.closest('a[href]');
    const href = link?.getAttribute('href');
    if (href?.startsWith('/browse/') || href?.startsWith('/issues/')) {
      event.preventDefault();
      window.open('https://jit.o3.ru' + href, '_blank', 'noopener,noreferrer');
    }
  });
}
