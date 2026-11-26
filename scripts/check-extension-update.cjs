const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('jszip');

async function main() {
  const archive = await JSZip.loadAsync(fs.readFileSync('FCRM-Chrome-3.3.zip'));
  const manifest = JSON.parse(await archive.file('manifest.json').async('string'));
  assert.equal(JSON.parse(fs.readFileSync('extension-version.json', 'utf8')).version, manifest.version);

  const listeners = [];
  const storage = {};
  let now = 1000000;
  let installed = '3.5.9';
  let released = '3.5.10';
  let offline = false;
  let requests = 0;
  let opened;
  const id = 'test-extension';
  const sender = {id, url:'https://jit.o3.ru/secure/RapidBoard.jspa?rapidView=9349'};
  const chrome = {
    runtime:{
      id,
      getManifest:() => ({version:installed}),
      onMessage:{addListener:listener => listeners.push(listener)},
    },
    storage:{local:{
      get:async key => ({[key]:storage[key]}),
      set:async items => { Object.assign(storage, items); },
    }},
    tabs:{create:async ({url}) => { opened = url; }},
  };
  const fetch = async (url, options) => {
    assert.equal(url, 'https://raw.githubusercontent.com/V-M221/jira-fcrm/main/extension-version.json');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    requests++;
    if (offline) throw new Error('Offline');
    return {ok:true, json:async () => ({version:released})};
  };
  vm.runInNewContext(await archive.file('background.js').async('string'), {
    chrome, AbortSignal, fetch, Date:{now:() => now},
  });
  const send = (type, source = sender) => new Promise(resolve => {
    if (!listeners.some(listener => listener({type}, source, value => resolve(structuredClone(value))) === true)) resolve(undefined);
  });
  const check = () => send('ozon:extension-version');
  const [first, second] = await Promise.all([check(), check()]);
  assert.deepEqual(first, {ok:true, update:{installed:'3.5.9', latest:'3.5.10'}});
  assert.deepEqual(second, first);
  assert.equal(requests, 1);
  assert.deepEqual(await check(), first);
  assert.equal(requests, 1, 'Reuse a fresh cached version across tabs');

  installed = '3.5.10.0';
  assert.deepEqual(await check(), {ok:true, update:null});
  installed = '3.5.11';
  assert.deepEqual(await check(), {ok:true, update:null});
  now += 60001;
  released = '3.6.0';
  assert.deepEqual(await check(), {ok:true, update:{installed:'3.5.11', latest:'3.6.0'}});
  assert.equal(requests, 2);

  now += 60001;
  released = '<invalid>';
  assert.deepEqual(await check(), {ok:false});
  offline = true;
  assert.deepEqual(await check(), {ok:false});
  assert.equal(await send('ozon:extension-unknown', sender), undefined);
  assert.equal(await send('ozon:extension-manager', {...sender, url:'https://example.com/'}), undefined);
  assert.equal(opened, undefined);
  assert.deepEqual(await send('ozon:extension-manager'), {ok:true});
  assert.equal(opened, 'chrome://extensions/');
  console.log('Проверены сравнение версий, кэш, отказ GitHub, ограничения сообщений и совпадение номера с ZIP.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
