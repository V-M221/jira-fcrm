const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/services/fcrmThreadWriter.ts', 'utf8');
const compiledWriter = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;

const threadUrl = 'https://chatzone.o3t.ru/example/pl/' + 'a'.repeat(26);
const input = {
  urls: [threadUrl],
  issueTypeId: '10',
  componentId: '20',
  summary: 'Новая задача',
  description: 'Черновик',
};
const approval = (id, confirmedExistingKeys) => ({
  ...input,
  separateIntentId: '00000000-0000-4000-8000-00000000000' + id,
  confirmedExistingKeys,
});
const json = (body, status = 200) => Response.json(body, {status});
const issueKeys = result => Array.from(result.issues, issue => issue.key);

function createFixture() {
  const issues = new Map();
  const index = new Map();
  const journal = new Map();
  const remoteLinks = new Map();
  const exactSearchLocks = [];
  let nextIssue = 30;
  let issuePosts = 0;
  let linkPosts = 0;
  let receipt = 'key';
  let verificationUnavailable = false;
  let locked = false;

  function seedExactIssue(key) {
    const issue = {
      key,
      fields: {project: {key: 'FCRM'}, summary: 'Исходная задача ' + key, description: threadUrl},
    };
    issues.set(key, issue);
    index.set(key, issue);
  }

  async function fetchFromJira(path, options) {
    const url = new URL(path, 'https://jira.example');
    const endpoint = url.pathname.replace('/rest/api/2/', '');
    if (endpoint === 'search') {
      const jql = url.searchParams.get('jql');
      const exactSearch = jql.includes('description ~');
      if (exactSearch) exactSearchLocks.push(locked);
      const keys = jql.includes('key in (') ? jql.match(/FCRM-\d+/g) || [] : [];
      const matches = exactSearch ? [...index.values()] : keys.flatMap(key => issues.has(key) ? [issues.get(key)] : []);
      return json({total: matches.length, issues: matches});
    }
    if (endpoint.startsWith('issue/createmeta/')) {
      const values = ['summary', 'description', 'components', 'labels'].map(fieldId => ({fieldId}));
      return json({total: values.length, values});
    }
    if (endpoint === 'project/FCRM/components') return json([{id: '20'}]);
    if (endpoint === 'issue' && options.method === 'POST') {
      assert.equal(locked, true);
      issuePosts++;
      const {fields} = JSON.parse(options.body);
      assert.deepEqual(Object.keys(fields).sort(), ['components', 'description', 'issuetype', 'project', 'summary']);
      assert.ok(fields.description.includes(threadUrl));
      const key = 'FCRM-' + nextIssue++;
      issues.set(key, {key, fields});
      if (receipt === 'lost') throw new Error('Lost POST response');
      return json(receipt === 'missing' ? {} : {key}, 201);
    }
    const match = /^issue\/(FCRM-\d+)(\/remotelink)?$/.exec(endpoint);
    if (match) {
      const [, key, linkEndpoint] = match;
      if (linkEndpoint) {
        const savedLinks = remoteLinks.get(key) || [];
        if (options.method === 'POST') {
          assert.equal(locked, true);
          linkPosts++;
          savedLinks.push(JSON.parse(options.body));
          remoteLinks.set(key, savedLinks);
          return json({}, 201);
        }
        return json(savedLinks);
      }
      if (verificationUnavailable && url.searchParams.get('fields').includes('issuetype')) return json({}, 503);
      return issues.has(key) ? json(issues.get(key)) : json({}, 404);
    }
    throw new Error('Unexpected Jira request: ' + endpoint);
  }

  function loadWriter() {
    const exports = {};
    vm.runInNewContext(compiledWriter, {
      exports, URL, URLSearchParams, crypto, AbortSignal, TextEncoder,
      fetch: fetchFromJira,
      localStorage: {
        getItem: key => journal.get(key),
        setItem(key, value) {
          assert.equal(locked, true);
          journal.set(key, value);
        },
      },
      navigator: {locks: {
        async request(_name, callback) {
          assert.equal(locked, false);
          locked = true;
          try {
            return await callback();
          } finally {
            locked = false;
          }
        },
      }},
    });
    return exports.createFcrmThreadWriter();
  }

  return {
    loadWriter, seedExactIssue, issues, index, exactSearchLocks,
    setReceipt(value) { receipt = value; },
    setVerificationUnavailable(value) { verificationUnavailable = value; },
    get issuePosts() { return issuePosts; },
    get linkPosts() { return linkPosts; },
    get keysWithLinks() { return [...remoteLinks.keys()]; },
  };
}

async function checkExactSetAndReplay() {
  const fixture = createFixture();
  const original = await fixture.loadWriter().create(input);
  assert.equal(original.key, 'FCRM-30');
  fixture.seedExactIssue('FCRM-42');
  assert.deepEqual(issueKeys(await fixture.loadWriter().inspect(input)), ['FCRM-30', 'FCRM-42']);

  await assert.rejects(fixture.loadWriter().create(approval(1, [original.key])), error => {
    assert.equal(error.code, 'THREAD_EXACT_REVIEW');
    assert.deepEqual(issueKeys(error), ['FCRM-30', 'FCRM-42']);
    return true;
  });
  assert.equal(fixture.exactSearchLocks.at(-1), true);
  assert.equal(fixture.issuePosts, 1);

  const separateInput = approval(1, ['FCRM-42', 'FCRM-30']);
  const created = await fixture.loadWriter().create(separateInput);
  assert.equal(created.key, 'FCRM-31');
  assert.equal(created.existing, false);
  assert.equal((await fixture.loadWriter().create(separateInput)).key, created.key);
  assert.equal(fixture.issuePosts, 2);
  assert.deepEqual(fixture.keysWithLinks, ['FCRM-30', 'FCRM-31']);
  await assert.rejects(fixture.loadWriter().create({...separateInput, description: 'Изменённый черновик'}), {
    code: 'THREAD_EXACT_APPROVAL_INVALID',
  });

  fixture.index.set(original.key, fixture.issues.get(original.key));
  fixture.issues.delete(original.key);
  await assert.rejects(fixture.loadWriter().create(approval(2, ['FCRM-30', 'FCRM-31', 'FCRM-42'])), error => {
    assert.equal(error.code, 'THREAD_EXACT_REVIEW');
    assert.deepEqual(issueKeys(error), ['FCRM-31', 'FCRM-42']);
    return true;
  });
  assert.equal(fixture.issuePosts, 2);
}

async function checkUncertainReceipt(receipt) {
  const fixture = createFixture();
  fixture.seedExactIssue('FCRM-42');
  fixture.setReceipt(receipt);
  const separateInput = approval(1, ['FCRM-42']);
  const unknown = {code: 'THREAD_CREATE_UNKNOWN'};

  await assert.rejects(fixture.loadWriter().create(separateInput), unknown);
  // An indexed exact match, including one that may have come from the POST, cannot serve as its receipt.
  fixture.index.set('FCRM-30', fixture.issues.get('FCRM-30'));
  const reloadedWriter = fixture.loadWriter();
  await assert.rejects(reloadedWriter.recover(separateInput), unknown);
  await assert.rejects(reloadedWriter.recover(input), unknown);
  await assert.rejects(reloadedWriter.create(separateInput), unknown);
  await assert.rejects(reloadedWriter.create(approval(2, ['FCRM-30', 'FCRM-42'])), unknown);
  await assert.rejects(reloadedWriter.create(input), unknown);
  await assert.rejects(reloadedWriter.retryLinks(separateInput), unknown);
  assert.equal((await reloadedWriter.inspect(input)).state, 'uncertain');
  assert.equal(fixture.issuePosts, 1);
  assert.equal(fixture.linkPosts, 0);
}

async function checkEarlierPendingBlocksSeparateCreate() {
  const fixture = createFixture();
  fixture.setReceipt('lost');
  await assert.rejects(fixture.loadWriter().create(input), {code: 'THREAD_CREATE_UNKNOWN'});
  fixture.seedExactIssue('FCRM-42');
  await assert.rejects(fixture.loadWriter().create(approval(1, ['FCRM-42'])), {code: 'THREAD_CREATE_UNKNOWN'});
  assert.equal(fixture.issuePosts, 1);
}

async function checkSavedReceiptRecovery() {
  const fixture = createFixture();
  fixture.seedExactIssue('FCRM-42');
  fixture.issues.set('FCRM-17', {key: 'FCRM-17', fields: {project: {key: 'FCRM'}, summary: 'Возможный дубль'}});
  fixture.setVerificationUnavailable(true);
  const reloadInput = {...input, mentionedIssueKeys: ['FCRM-17']};
  const separateInput = {...approval(1, ['FCRM-42']), ...reloadInput, confirmedDuplicateKeys: ['FCRM-17']};
  const unknown = {code: 'THREAD_CREATE_UNKNOWN'};
  await assert.rejects(fixture.loadWriter().create(separateInput), unknown);

  fixture.setVerificationUnavailable(false);
  const writer = fixture.loadWriter();
  await assert.rejects(writer.recover({...reloadInput, description: 'Изменилось описание'}), unknown);
  await assert.rejects(writer.recover({...reloadInput, issueLinks: [{key: 'FCRM-17', kind: 'related'}]}), unknown);
  const otherUrl = 'https://chatzone.o3t.ru/example/pl/' + 'b'.repeat(26);
  await assert.rejects(writer.recover({...reloadInput, urls: [threadUrl, otherUrl]}), unknown);
  const issue = fixture.issues.get('FCRM-30');
  issue.fields.summary = 'Другое текущее название';
  await assert.rejects(writer.recover(reloadInput), unknown);
  issue.fields.summary = input.summary;

  const recovered = await writer.recover(reloadInput);
  assert.equal(recovered.key, 'FCRM-30');
  assert.equal(recovered.existing, false);
  assert.equal(recovered.canRetryLinks, true);
  assert.equal(fixture.linkPosts, 0);

  assert.equal(recovered.separateApproval.separateIntentId, separateInput.separateIntentId);
  assert.deepEqual(Array.from(recovered.separateApproval.confirmedExistingKeys), ['FCRM-42']);
  assert.deepEqual(Array.from(recovered.separateApproval.confirmedDuplicateKeys), ['FCRM-17']);
  await assert.rejects(writer.retryLinks(reloadInput), {code: 'THREAD_LINKS_UNOWNED'});
  assert.equal((await writer.retryLinks({...reloadInput, ...recovered.separateApproval})).key, recovered.key);
  assert.equal(fixture.issuePosts, 1);
  assert.deepEqual(fixture.keysWithLinks, [recovered.key]);
}

(async () => {
  await checkExactSetAndReplay();
  await checkUncertainReceipt('lost');
  await checkUncertainReceipt('missing');
  await checkEarlierPendingBlocksSeparateCreate();
  await checkSavedReceiptRecovery();
  console.log('FCRM exact override checks passed: refreshed exact set, replay, lost or missing receipt, receipt recovery and link scope.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
