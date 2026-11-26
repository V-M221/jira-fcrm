const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.createSourceFile('content.js', fs.readFileSync('FCRM-Chrome-3.3/content.js', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functions = new Map();
function visit(node) {
  if (ts.isFunctionExpression(node) && node.name) functions.set(node.name.text, node.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
const requests = [];
const runtime = vm.createContext({
  AbortController, URLSearchParams,
  fetch(path, options) {
    return new Promise(reply => requests.push({url:new URL(path,'https://jira.example'), options, reply}));
  },
});
const createSidebar = vm.runInContext('(' + functions.get('createTaskDetailsSidebar') + ')',runtime);
const renderBody = vm.runInContext('(' + functions.get('answerMarkup') + ')',runtime);
const noop = () => {};
let key = 'FCRM-1';
const sidebar = createSidebar({
  html:() => key ? sidebar.commentsHtml(key) : '',
  bindEvents:noop, bindSearch:noop, bindControls:noop, enhance:noop,
  escape:String, commentAuthor:author => author.name, commentBody:renderBody, formatDate:String,
});

function mount() {
  const html = sidebar.html();
  const count = {}, content = {querySelector:() => null}, events = {};
  const section = {
    isConnected:true, open:html.startsWith('<details class="ozon-ext-section-card ozon-sb-comments" open>'),
    ownerDocument:{activeElement:{}}, addEventListener:(type,listener) => { events[type] = listener; },
    querySelector:selector => selector === '[data-comments-count]' ? count : content,
  };
  const panel = {firstElementChild:{dataset:{}},querySelector:() => section};
  sidebar.bind({querySelector:() => panel});
  return {
    count, content, section,
    toggle(open) { section.open = open; events.toggle(); },
    next() { events.click({target:{closest:() => true}}); },
  };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const comment = (id,body) => ({id,body,author:{name:'Автор ' + id},created:'2026-11-19T13:30:00+0300'});
const page = (request,startAt,total,comments) => request.reply({ok:true,json:async () => ({startAt,total,comments})});

(async () => {
  const first = mount();
  assert.equal(first.section.open,false);
  assert.equal(requests.length,1);
  assert.equal(requests[0].url.pathname,'/rest/api/2/issue/FCRM-1/comment');
  assert.equal(requests[0].url.searchParams.get('orderBy'),'-created');
  assert.equal(requests[0].url.searchParams.get('maxResults'),'1','Collapsed section requests only a count preview');
  first.section.isConnected = false;
  const rerendered = mount();
  assert.equal(rerendered.section.open,false);
  assert.equal(requests.length,1,'Rerendering with a pending count does not repeat it');
  page(requests[0],0,2,[comment('2','*В работе* <img src=x>')]);
  await tick();
  assert.equal(rerendered.count.textContent,' (2)');
  assert.equal(rerendered.content.innerHTML,'','Count is visible before rendering comment content');

  rerendered.toggle(true);
  assert.equal(requests[1].url.searchParams.get('maxResults'),'20');
  assert.match(rerendered.content.innerHTML,/Загрузка комментариев/);
  page(requests[1],0,2,[comment('2','*В работе* <img src=x>')]);
  await tick();
  assert.match(rerendered.content.innerHTML,/Автор 2.*<strong>В работе<\/strong> &lt;img src=x&gt;/);
  assert.match(rerendered.content.innerHTML,/Показать ещё/);

  rerendered.next();
  assert.equal(requests[2].url.searchParams.get('startAt'),'1');
  requests[2].reply({ok:false,status:503});
  await tick();
  assert.match(rerendered.content.innerHTML,/Автор 2.*Не удалось загрузить.*Повторить/);
  rerendered.next();
  assert.equal(requests[3].url.searchParams.get('startAt'),'1');
  page(requests[3],1,2,[comment('1','[Описание|https://jira.example/browse/FCRM-1]')]);
  await tick();
  assert.match(rerendered.content.innerHTML,/Автор 2.*Автор 1.*href="https:\/\/jira\.example\/browse\/FCRM-1"/);
  assert.doesNotMatch(rerendered.content.innerHTML,/Показать ещё|Повторить/);

  rerendered.toggle(false);
  rerendered.toggle(true);
  assert.equal(requests.length,4,'Collapsing and reopening retains the loaded comments');

  sidebar.refreshComments();
  rerendered.section.isConnected = false;
  const refreshed = mount();
  assert.equal(refreshed.section.open,true);
  assert.equal(requests[4].url.searchParams.get('startAt'),'0');
  key = 'FCRM-2';
  refreshed.section.isConnected = false;
  const another = mount();
  assert.equal(requests[4].options.signal.aborted,true);
  assert.equal(another.section.open,false);
  assert.equal(another.count.textContent,'');
  another.toggle(true);
  assert.equal(requests[5].options.signal.aborted,true,'Opening replaces a pending count with the full page');
  assert.equal(requests[6].url.searchParams.get('maxResults'),'20');
  page(requests[4],0,1,[comment('2','Старый ответ')]);
  page(requests[5],0,1,[comment('1','Отменённый запрос счётчика')]);
  page(requests[6],0,0,[]);
  await tick();
  assert.equal(another.count.textContent,' (0)');
  assert.match(another.content.innerHTML,/Комментариев пока нет/);
  assert.doesNotMatch(another.content.innerHTML,/Старый ответ/);
  assert.doesNotMatch(another.content.innerHTML,/Отменённый запрос счётчика/);
  console.log('Sidebar comments checked: collapsed count, lazy page, pagination, retry, refresh and task switching.');
})().catch(error => { console.error(error); process.exitCode = 1; });
