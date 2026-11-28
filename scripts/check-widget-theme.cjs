const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('jszip');

const key = 'ozon-fcrm-widget-theme';
const controlSelector = 'select[data-ozon-theme-setting]';

function bootstrap(source) {
  const start = source.indexOf('const widgetTheme = (function installWidgetTheme(');
  const end = source.indexOf(')(window, document);', start);
  assert.ok(start >= 0 && end > start, 'The packaged script installs the theme controller');
  return new vm.Script('(' + source.slice(start + 'const widgetTheme = ('.length, end) + ')(window, document)');
}

function makeTab(shared, prefersDark = false, blocked = false) {
  const documentEvents = new Map(), windowEvents = new Map(), mediaEvents = new Map();
  const saveCount = [];
  const activeInput = {value:'Ручное название черновика',selectionStart:6,selectionEnd:6};
  const draft = {step:2,summary:activeInput,issueLinks:[{key:'FCRM-42',kind:'related'}]};
  const native = {color:'rgb(23, 43, 77)',backgroundColor:'rgb(255, 255, 255)',value:'Значение Jira'};
  const storage = {
    getItem(name) {
      assert.equal(name,key);
      if (blocked) throw new Error('Storage blocked');
      return shared.get(name) ?? null;
    },
    setItem(name,value) {
      assert.equal(name,key);
      if (blocked) throw new Error('Storage blocked');
      saveCount.push(value);
      shared.set(name,value);
    },
  };
  const listen = listeners => (name,fn) => {
    if (!listeners.has(name)) listeners.set(name,[]);
    listeners.get(name).push(fn);
  };
  const emit = (listeners,name,event) => (listeners.get(name) || []).forEach(fn=>fn(event));
  const selector = root => ({
    value:'',matches:query=>query === controlSelector,
    closest:scope=>root && scope.includes(root) ? {id:root.slice(1)} : null,
  });
  const settings = ['#ozon-structure-root','#ozon-thread-sidebar','#o3ds-layer'].map(selector);
  const media = {matches:prefersDark,addEventListener:listen(mediaEvents)};
  const document = {
    documentElement:{dataset:{}},activeElement:activeInput,
    querySelectorAll(selector){assert.equal(selector,controlSelector);return settings;},
    addEventListener:listen(documentEvents),
  };
  const window = {
    localStorage:storage,addEventListener:listen(windowEvents),
    matchMedia(query){assert.equal(query,'(prefers-color-scheme: dark)');return media;},
  };
  const context = vm.createContext({document,window,
    fetch(){assert.fail('A theme change must not use the network');}});
  return {
    storage,saveCount,settings,context,activeInput,draft,native,
    effective:()=>document.documentElement.dataset.ozonFcrmTheme,
    controlValues:()=>settings.map(control=>control.value),
    listeners:()=>[documentEvents.get('change')?.length,windowEvents.get('storage')?.length,mediaEvents.get('change')?.length],
    choose(value,index=0) {
      settings[index].value=value;
      emit(documentEvents,'change',{target:settings[index]});
    },
    foreignChoice(value) {
      emit(documentEvents,'change',{target:{...selector(null),value}});
    },
    setOS(dark) {media.matches=dark;emit(mediaEvents,'change',{matches:dark});},
    receiveStorage(newValue,name=key,area=storage) {
      emit(windowEvents,'storage',{key:name,newValue,storageArea:area});
    },
  };
}

function checkPalette(css) {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const scoped = rules.filter(rule=>rule[1].includes('html[data-ozon-fcrm-theme="dark"]'));
  assert.ok(scoped.length > 0);
  const ids = ['#ozon-structure-root','#ozon-thread-sidebar','#o3ds-layer','.ozon-component-editor','.ozon-sidebar-draft-overlay'];
  for (const id of ids) assert.ok(scoped.some(rule=>rule[1].includes(id)),'Dark palette includes ' + id);
  for (const rule of scoped) {
    assert.ok(ids.some(id=>rule[1].includes(id)), 'A dark rule must target a widget surface');
    assert.doesNotMatch(rule[1],/(?:^|[\s>+~,(])body\b/);
  }
  const palette = scoped.find(rule=>rule[2].includes('color-scheme:dark'))?.[2];
  assert.ok(palette,'Widget surfaces have dark browser controls');
  const shortHex = value => value.match(/[a-f0-9]{2}/gi).map(pair=>parseInt(pair,16)/255);
  const luminance = value => shortHex(value).map(number=>number<=0.04045 ? number/12.92 : ((number+0.055)/1.055)**2.4)
    .reduce((total,number,index)=>total+number*[0.2126,0.7152,0.0722][index],0);
  const color = name => {
    const hex = palette.match(new RegExp('--ozon-fcrm-' + name + ':\\s*(#[a-f0-9]{6})','i'))?.[1];
    assert.ok(hex,'Dark palette includes '+name);
    return luminance(hex);
  };
  for (const foreground of ['text','muted','link']) {
    for (const background of ['canvas','surface','raised','input']) {
      const ratio = (color(foreground)+0.05)/(color(background)+0.05);
      assert.ok(ratio>=4.5,foreground + '/' + background + ' text contrast ' + ratio.toFixed(2));
    }
  }
  assert.match(css,/select\[data-ozon-theme-setting\]:focus-visible\s*\{\s*outline:/);
  assert.match(css,/@media\s*\(max-width:540px\)\s*\{\s*\.ozon-theme-control\s*>\s*span\s*\{\s*display:none/);
}

async function checkWidgetTheme() {
  const zip = await JSZip.loadAsync(fs.readFileSync('FCRM-Chrome-3.3.zip'));
  const [content,issueEnhance,styles] = await Promise.all(['content.js','issue-enhance.js','styles.css'].map(name=>zip.file(name).async('string')));
  const board = bootstrap(content);
  const issue = bootstrap(issueEnhance);
  const shared = new Map();
  const first = makeTab(shared);
  const controller = board.runInContext(first.context);
  assert.equal(issue.runInContext(first.context),controller);
  assert.deepEqual(first.listeners(),[1,1,1]);
  assert.match(controller.control(),/<select data-ozon-theme-setting aria-label="Тема виджета">/);
  assert.match(controller.control(),/<option value="light">Светлая<\/option><option value="dark">Тёмная<\/option><option value="system" selected>Как в системе<\/option>/);
  assert.equal(first.effective(),'light');
  assert.deepEqual(first.controlValues(),['system','system','system']);
  const second=makeTab(shared,true);
  issue.runInContext(second.context);
  assert.equal(second.effective(),'dark');

  first.choose('dark',1);
  assert.equal(first.effective(),'dark');
  assert.deepEqual(first.saveCount,['dark']);
  second.receiveStorage('dark');
  assert.deepEqual(second.controlValues(),['dark','dark','dark']);
  second.setOS(false);
  assert.equal(second.effective(),'dark');
  const refreshed=makeTab(shared);
  board.runInContext(refreshed.context);
  assert.equal(refreshed.effective(),'dark');
  assert.deepEqual(refreshed.controlValues(),['dark','dark','dark']);

  second.choose('light');
  first.receiveStorage('light');
  first.setOS(true);
  assert.equal(first.effective(),'light');
  first.receiveStorage('dark','unrelated-storage-key');
  first.receiveStorage('dark',key,{});
  first.foreignChoice('dark');
  assert.equal(first.effective(),'light');
  assert.equal(shared.get(key),'light');

  first.choose('system',2);
  assert.equal(shared.get(key),'system');
  assert.equal(first.effective(),'dark');
  assert.deepEqual(first.controlValues(),['system','system','system']);
  first.setOS(false);
  assert.equal(first.effective(),'light');
  first.setOS(true);
  assert.equal(first.effective(),'dark');
  assert.deepEqual(first.saveCount,['dark','system']);
  assert.deepEqual(first.draft.issueLinks,[{key:'FCRM-42',kind:'related'}]);
  assert.equal(first.draft.step,2);
  assert.equal(first.context.document.activeElement,first.activeInput);
  assert.deepEqual(first.activeInput,{value:'Ручное название черновика',selectionStart:6,selectionEnd:6});
  assert.deepEqual(first.native,{color:'rgb(23, 43, 77)',backgroundColor:'rgb(255, 255, 255)',value:'Значение Jira'});

  const unknown=makeTab(new Map([[key,'invalid']]),true);
  board.runInContext(unknown.context);
  assert.equal(unknown.effective(),'dark');
  assert.deepEqual(unknown.controlValues(),['system','system','system']);
  const privateTab=makeTab(new Map(),true,true);
  issue.runInContext(privateTab.context);
  privateTab.choose('light');
  assert.equal(privateTab.effective(),'light');

  checkPalette(styles);
  console.log('Widget theme checks passed: system, persistence, singleton, cross-tab, keyboard CSS, palette and draft continuity.');
}

checkWidgetTheme().catch(error=>{console.error(error);process.exitCode=1;});
