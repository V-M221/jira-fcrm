/**
 * Jira owns creation. DeepSeek supplies a draft, never a Jira result or create payload.
 * This factory is embedded in the Jira content script via Function#toString.
 */
export function createFcrmThreadWriter(applyTheme?: (key: string, themeKey: string) => Promise<unknown>) {
  type Input = {
    urls: string[];
    issueTypeId: string;
    componentId: string;
    summary: string;
    description: string;
    themeKey?: string;
    allowPossibleDuplicate?: boolean;
    mentionedIssueKeys?: string[];
  };
  type Source = {id: string; url: string; marker: string};
  type Fields = {
    summary?: string;
    description?: string;
    labels?: string[];
    project?: {key: string};
    issuetype?: {id: string};
    components?: {id: string}[];
    issuelinks?: {
      id: string;
      type?: {inward?: string; outward?: string};
      inwardIssue?: {key: string};
      outwardIssue?: {key: string};
    }[];
  };
  type Issue = {key: string; fields: Fields};
  type MetaField = {
    fieldId?: string;
    key?: string;
    name?: string;
    required?: boolean;
    operations?: string[];
    schema?: {custom?: string};
    allowedValues?: {id: string}[];
    hasDefaultValue?: boolean;
    defaultValue?: unknown;
  };
  type MetaFields = Record<string, MetaField>;
  type JournalRecord = {key?: string; verified?: boolean};
  type Journal = Record<string, JournalRecord>;
  type RemoteLink = {object?: {url?: string}};

  const api = '/rest/api/2/';
  const journalKey = 'ozon-fcrm-thread-creation-v1';
  const project = 'FCRM';
  const isIssueKey = (key: unknown): key is string => typeof key === 'string' && /^FCRM-\d+$/.test(key);
  const issuePath = (key: string) => 'issue/' + encodeURIComponent(key);

  function failure(message: string, code: string, status?: number) {
    return Object.assign(new Error(message), {code, status});
  }

  function unknown() {
    return failure('Jira пока не подтвердила исход запроса. Проверьте Jira перед любыми изменениями.', 'THREAD_CREATE_UNKNOWN');
  }

  function sourceFromUrl(input: string) {
    const url = new URL(input);
    const match = /^\/(?:[^/]+\/)*pl\/([a-z0-9]{26})\/?$/.exec(url.pathname);
    if (!match || url.protocol !== 'https:' || url.port || url.username || url.password ||
        !['chatzone.o3t.ru', 'chatzone.o3.ru'].includes(url.hostname)) {
      throw failure('Укажите действительную ссылку на сообщение chatZone.', 'THREAD_SOURCE_INVALID');
    }
    return {id: match[1], url: url.origin + url.pathname.replace(/\/$/, '')};
  }

  async function normalizeSources(urls: string[]): Promise<Source[]> {
    if (!Array.isArray(urls) || !urls.length) {
      throw failure('Укажите хотя бы один тред chatZone.', 'THREAD_SOURCE_INVALID');
    }
    if (urls.length > 10) {
      throw failure('За один раз можно обработать до 10 тредов chatZone.', 'THREAD_SOURCE_INVALID');
    }
    const sources = new Map<string, {id: string; url: string}>();
    try {
      for (const url of urls) {
        const source = sourceFromUrl(url.trim());
        if (!sources.has(source.id)) sources.set(source.id, source);
      }
    } catch {
      throw failure('Проверьте ссылки на исходные треды chatZone.', 'THREAD_SOURCE_INVALID');
    }
    return Promise.all([...sources.values()].map(async source => {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source.id));
      const hex = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      return {...source, marker: 'fcrm_thread_' + hex};
    }));
  }

  async function request<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown, expectJson = true): Promise<T> {
    let response: Response;
    try {
      response = await fetch(api + path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {Accept: 'application/json', ...(body ? {'Content-Type': 'application/json'} : {})},
        signal: AbortSignal.timeout(20000),
        ...(body ? {body: JSON.stringify(body)} : {})
      });
    } catch {
      throw failure('Jira не ответила. Проверьте сеть и VPN.', 'THREAD_JIRA_NETWORK');
    }
    if (!response.ok) {
      const message = response.status === 401 ? 'Войдите в Jira и повторите проверку.' :
        response.status === 403 ? 'Jira не разрешила эту операцию для вашей учётной записи.' :
        'Jira вернула HTTP ' + response.status + '.';
      throw failure(message, 'THREAD_JIRA_HTTP', response.status);
    }
    if (!expectJson) return undefined as T;
    try {
      return await response.json() as T;
    } catch {
      const message = response.headers.get('Content-Type')?.includes('text/html') ?
        'Jira вернула страницу входа. Войдите в Jira и повторите проверку.' :
        'Jira вернула ответ неизвестного формата.';
      throw failure(message, 'THREAD_JIRA_FORMAT');
    }
  }

  function readJournal(): Journal {
    try {
      const data = JSON.parse(localStorage.getItem(journalKey) || '{}');
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      return data;
    } catch {
      throw failure('Не удалось прочитать журнал создания в браузере.', 'THREAD_JOURNAL_UNAVAILABLE');
    }
  }

  function writeJournal(journal: Journal, sources: Source[], record: JournalRecord | null) {
    for (const {marker} of sources) {
      if (record) journal[marker] = record;
      else delete journal[marker];
    }
    try {
      localStorage.setItem(journalKey, JSON.stringify(journal));
    } catch {
      throw failure('Не удалось сохранить состояние создания в браузере.', 'THREAD_JOURNAL_UNAVAILABLE');
    }
  }

  const quoteJql = (value: string) => '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

  async function search(clauses: string, fields: string): Promise<Issue[]> {
    const jql = 'project = FCRM AND (' + clauses + ')';
    const issues: Issue[] = [];
    for (;;) {
      const query = new URLSearchParams({jql, fields, startAt: String(issues.length), maxResults: '50'});
      const page = await request<{issues?: Issue[]; total?: number}>('search?' + query);
      if (!Array.isArray(page?.issues) || !Number.isInteger(page.total) || page.total! < 0) {
        throw failure('Jira не подтвердила результат поиска дублей.', 'THREAD_SEARCH_INVALID');
      }
      issues.push(...page.issues);
      if (issues.length >= page.total!) return issues;
      if (!page.issues.length) throw failure('Поиск дублей Jira вернул неполный результат.', 'THREAD_SEARCH_INVALID');
    }
  }

  function isMatchingUrl(url: string, source: Source) {
    try {
      return sourceFromUrl(url).id === source.id;
    } catch {
      return false;
    }
  }

  function matchesSource(fields: Fields, source: Source) {
    if (fields.labels?.includes(source.marker)) return true;
    const urls = String(fields.description || '').match(/https:\/\/chatzone\.o3t?\.ru\/[^\s|\]<>"']+/gi) || [];
    return urls.some(url => isMatchingUrl(url.replace(/[.,:;!?]+$/, ''), source));
  }

  async function readIssue(key: string, fields: string): Promise<Fields> {
    const data = await request<Issue>(issuePath(key) + '?fields=' + encodeURIComponent(fields));
    if (data?.key !== key || !data.fields) {
      throw failure('Jira не подтвердила задачу ' + key + '.', 'THREAD_ISSUE_UNCONFIRMED');
    }
    return data.fields;
  }

  async function locateIssue(journal: Journal, sources: Source[]) {
    const keys = [...new Set(sources.map(source => journal[source.marker]?.key).filter(isIssueKey))];
    if (keys.length === 1) {
      const fields = await readIssue(keys[0], 'project,labels,description');
      if (fields.project?.key !== project || !sources.some(source => matchesSource(fields, source))) throw unknown();
      return keys[0];
    }
    if (keys.length > 1) {
      throw failure('Треды уже связаны с разными задачами FCRM. Проверьте их в Jira.', 'THREAD_DUPLICATE');
    }

    const found = new Set<string>();
    for (let start = 0; start < sources.length; start += 8) {
      const batch = sources.slice(start, start + 8);
      const labels = 'labels in (' + batch.map(source => quoteJql(source.marker)).join(',') + ')';
      const legacyDescriptions = batch.map(source => 'description ~ ' + quoteJql(source.id));
      const issues = await search([labels, ...legacyDescriptions].join(' OR '), 'labels,description');
      for (const issue of issues) {
        if (isIssueKey(issue?.key) && issue.fields && batch.some(source => matchesSource(issue.fields, source))) {
          found.add(issue.key);
        }
      }
    }
    if (found.size > 1) {
      throw failure('Найдено несколько задач с исходными тредами. Выберите существующую задачу в Jira.', 'THREAD_DUPLICATE');
    }
    return [...found][0];
  }

  async function checkMentionedIssues(inputKeys: string[] | undefined) {
    const keys = [...new Set((inputKeys || []).filter(isIssueKey))].slice(0, 12);
    if (!keys.length) return;
    const confirmed = (await search('key in (' + keys.join(',') + ')', 'summary,project,issuetype'))
      .filter(issue => keys.includes(issue.key) && issue.fields?.project?.key === project);
    if (confirmed.length) {
      const issueKeys = confirmed.map(issue => issue.key);
      throw Object.assign(failure('В обсуждении упоминаются задачи FCRM. Проверьте их перед созданием отдельной задачи.', 'THREAD_POSSIBLE_DUPLICATE'), {issueKeys});
    }
  }

  async function checkSummaryDuplicate(summary: string) {
    const words = summary.match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) || [];
    if (!words.length) return;
    const query = 'summary ~ ' + quoteJql('"' + words.join(' ') + '"');
    const candidates = await search(query, 'summary');
    const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru');
    const match = candidates.find(issue => isIssueKey(issue?.key) &&
      typeof issue.fields?.summary === 'string' && normalize(issue.fields.summary) === normalize(summary));
    if (match) {
      throw Object.assign(failure('Найдена задача с таким же названием. Проверьте её перед созданием отдельной задачи.', 'THREAD_POSSIBLE_DUPLICATE'), {issueKeys:[match.key]});
    }
  }

  async function readCreateFields(typeId: string): Promise<MetaFields> {
    const suffix = encodeURIComponent(typeId);
    try {
      const data = await request<{values?: MetaField[]; fields?: MetaFields | MetaField[]; total?: number}>(
        'issue/createmeta/FCRM/issuetypes/' + suffix + '?startAt=0&maxResults=1000'
      );
      const fields = data?.values ?? data?.fields;
      if (Array.isArray(fields)) {
        if (typeof data.total === 'number' && data.total > fields.length) {
          throw failure('Jira вернула неполный список полей создания.', 'THREAD_METADATA_INVALID');
        }
        return Object.fromEntries(fields.flatMap(field => {
          const key = field.fieldId || field.key;
          return key ? [[key, field]] : [];
        }));
      }
      if (fields && typeof fields === 'object') return fields;
    } catch (error) {
      if (![404, 405].includes((error as {status?: number}).status ?? 0)) throw error;
      const query = new URLSearchParams({projectKeys: project, issuetypeIds: typeId, expand: 'projects.issuetypes.fields'});
      const data = await request<{projects?: {key: string; issuetypes?: {id: string; fields?: MetaFields}[]}[]}>(
        'issue/createmeta?' + query
      );
      const fields = data?.projects?.find(candidate => candidate.key === project)?.issuetypes?.find(type => type.id === typeId)?.fields;
      if (fields && typeof fields === 'object') return fields;
    }
    throw failure('Jira не подтвердила поля создания для выбранного типа.', 'THREAD_METADATA_INVALID');
  }

  function descriptionWithSources(description: string, sources: Source[]) {
    const links = sources.map((source, index) => '* [Тред chatZone ' + (index + 1) + '|' + source.url + ']');
    return description.trim() + '\n\nh2. Источники\n' + links.join('\n');
  }

  async function buildFields(input: Input, sources: Source[]) {
    const {issueTypeId, componentId} = input;
    const summary = input.summary.trim();
    const description = input.description.trim();
    if (!/^\d+$/.test(issueTypeId) || !/^\d+$/.test(componentId) || !summary || summary.length > 255 || /\r|\n/.test(summary) || !description) {
      throw failure('Проверьте название, описание, тип и компонент задачи.', 'THREAD_DRAFT_INVALID');
    }

    const [metadata, components] = await Promise.all([
      readCreateFields(issueTypeId),
      request<{id: string}[]>('project/FCRM/components')
    ]);
    const canSet = (field: string) => !!metadata[field] &&
      (!Array.isArray(metadata[field].operations) || metadata[field].operations!.includes('set'));
    if (!canSet('summary') || !canSet('description') || !canSet('components')) {
      throw failure('Jira не разрешает задать название, описание или компонент для этого типа.', 'THREAD_METADATA_INVALID');
    }
    const allowedComponents = metadata.components.allowedValues;
    if (!Array.isArray(components) || !components.some(item => String(item.id) === componentId) ||
        (Array.isArray(allowedComponents) && !allowedComponents.some(item => String(item.id) === componentId))) {
      throw failure('Выбранный компонент недоступен для этого типа задачи в FCRM.', 'THREAD_METADATA_INVALID');
    }

    const fields: Record<string, unknown> = {
      project: {key: project},
      issuetype: {id: issueTypeId},
      components: [{id: componentId}],
      summary,
      description: descriptionWithSources(description, sources)
    };
    if (canSet('labels')) fields.labels = sources.map(source => source.marker);
    const hasDefault = (meta: MetaField) => meta.hasDefaultValue === true || meta.defaultValue != null;
    for (const [field, meta] of Object.entries(metadata)) {
      if (!meta.required || hasDefault(meta) || Object.prototype.hasOwnProperty.call(fields, field)) continue;
      if (canSet(field) && /:gh-epic-label$/i.test(meta.schema?.custom || '')) fields[field] = summary;
    }
    if (metadata.reporter?.required && !hasDefault(metadata.reporter) && canSet('reporter')) {
      const myself = await request<{name?: string}>('myself');
      if (myself?.name) fields.reporter = {name: myself.name};
    }
    const missing = Object.entries(metadata).find(([field, meta]) =>
      meta.required && !hasDefault(meta) && !Object.prototype.hasOwnProperty.call(fields, field));
    if (missing) {
      throw failure('Заполните обязательное поле в Jira: ' + (missing[1].name || missing[0]) + '.', 'THREAD_REQUIRED_FIELD');
    }
    return fields;
  }

  async function readRemoteLinks(key: string) {
    const links = await request<RemoteLink[]>(issuePath(key) + '/remotelink');
    if (!Array.isArray(links)) throw failure('Jira не подтвердила ссылки на источники.', 'THREAD_LINKS_INVALID');
    return links;
  }

  async function linkSources(key: string, sources: Source[], write: boolean) {
    const failures: string[] = [];
    const path = issuePath(key) + '/remotelink';
    let current: RemoteLink[];
    try {
      current = await readRemoteLinks(key);
    } catch {
      return sources.map(source => source.url);
    }
    for (const source of sources) {
      const hasSource = () => current.some(link => isMatchingUrl(link.object?.url || '', source));
      if (hasSource()) continue;
      if (write) {
        try {
          await request(path, 'POST', {
            globalId: 'ozon-fcrm-chatzone:' + source.marker,
            object: {url: source.url, title: 'Обсуждение в chatZone'}
          }, false);
        } catch {
          // A lost response can still mean the write reached Jira.
        }
        try {
          current = await readRemoteLinks(key);
        } catch {
          failures.push(source.url);
          continue;
        }
      }
      if (!hasSource()) failures.push(source.url);
    }
    return failures;
  }

  async function checkTheme(key: string, themeKey: string) {
    const [source, target] = await Promise.all([readIssue(key, 'issuelinks'), readIssue(themeKey, 'issuelinks')]);
    const linkFrom = (fields: Fields, targetKey: string, caption: RegExp) => (fields.issuelinks || []).find(link =>
      link.inwardIssue?.key === targetKey && caption.test(link.type?.inward?.trim() || '') ||
      link.outwardIssue?.key === targetKey && caption.test(link.type?.outward?.trim() || ''));
    const link = linkFrom(source, themeKey, /^(задача проекта|project task)$/i);
    return !!link?.id && linkFrom(target, key, /^(в проекте|in project)$/i)?.id === link.id;
  }

  async function finish(key: string, sources: Source[], themeKey: string | undefined, write: boolean) {
    const linkFailures = await linkSources(key, sources, write);
    if (themeKey) {
      let confirmed = await checkTheme(key, themeKey).catch(() => false);
      if (!confirmed && write && applyTheme) {
        try {
          await applyTheme(key, themeKey);
        } catch {
          // Verify the relation after the attempt, including a lost response.
        }
        confirmed = await checkTheme(key, themeKey).catch(() => false);
      }
      if (!confirmed) linkFailures.push(themeKey);
    }
    return {key, linkFailures, existing: !write};
  }

  async function reconcile(journal: Journal, sources: Source[]) {
    try {
      const key = await locateIssue(journal, sources);
      if (key) return key;
    } catch {
      // A failed or empty search does not prove there was no creation.
    }
    throw unknown();
  }

  async function verifyCreatedIssue(key: string, input: Input, sources: Source[]) {
    const saved = await readIssue(key, 'project,issuetype,components,summary,labels,description').catch(() => { throw unknown(); });
    const normalize = (value: string) => value.replace(/\r\n/g, '\n').trim();
    if (saved.project?.key !== project || String(saved.issuetype?.id) !== input.issueTypeId ||
        !saved.components?.some(component => String(component.id) === input.componentId) ||
        saved.summary !== input.summary.trim() ||
        normalize(saved.description || '') !== normalize(descriptionWithSources(input.description, sources))) {
      throw failure('В Jira найдена ' + key + ', но её поля отличаются от черновика. Откройте задачу и проверьте результат.', 'THREAD_CREATED_DIFFERENT');
    }
  }

  async function recoverCreation(journal: Journal, input: Input, sources: Source[], themeKey?: string) {
    const key = await reconcile(journal, sources);
    await verifyCreatedIssue(key, input, sources);
    return finish(key, sources, themeKey, false);
  }

  function normalizeThemeKey(value?: string) {
    const themeKey = value?.trim().toUpperCase();
    if (themeKey && !isIssueKey(themeKey)) {
      throw failure('Выберите корректный ключ тематики FCRM.', 'THREAD_THEME_INVALID');
    }
    return themeKey || undefined;
  }

  function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    if (!navigator.locks?.request) {
      throw failure('Браузер не поддерживает защиту от параллельного создания.', 'THREAD_LOCK_UNAVAILABLE');
    }
    return navigator.locks.request(journalKey, operation);
  }

  async function create(input: Input) {
    const sources = await normalizeSources(input.urls);
    const themeKey = normalizeThemeKey(input.themeKey);
    return withWriteLock(async () => {
      const journal = readJournal();
      if (sources.some(({marker}) => marker in journal && !journal[marker].verified)) {
        return recoverCreation(journal, input, sources, themeKey);
      }
      const existing = await locateIssue(journal, sources);
      if (existing) return finish(existing, sources, themeKey, false);

      const fields = await buildFields(input, sources);
      if (!input.allowPossibleDuplicate) {
        await checkMentionedIssues(input.mentionedIssueKeys);
        await checkSummaryDuplicate(input.summary);
      }
      writeJournal(journal, sources, {});
      let receipt: {key?: string};
      try {
        receipt = await request('issue', 'POST', {fields});
      } catch (error) {
        if ([400, 401, 403, 404, 405, 415, 422].includes((error as {status?: number}).status ?? 0)) {
          writeJournal(journal, sources, null);
          throw error;
        }
        return recoverCreation(journal, input, sources, themeKey);
      }
      const key = receipt?.key;
      if (!isIssueKey(key)) return recoverCreation(journal, input, sources, themeKey);
      try {
        writeJournal(journal, sources, {key});
      } catch {
        throw unknown();
      }
      await verifyCreatedIssue(key, input, sources);
      writeJournal(journal, sources, {key, verified: true});
      return finish(key, sources, themeKey, true);
    });
  }

  async function recover(input: Input) {
    const sources = await normalizeSources(input.urls);
    const themeKey = input.themeKey?.trim().toUpperCase();
    return recoverCreation(readJournal(), input, sources, isIssueKey(themeKey) ? themeKey : undefined);
  }

  async function retryLinks(input: Input) {
    const sources = await normalizeSources(input.urls);
    const themeKey = normalizeThemeKey(input.themeKey);
    return withWriteLock(async () => {
      const key = await reconcile(readJournal(), sources);
      await verifyCreatedIssue(key, input, sources);
      const result = await finish(key, sources, themeKey, true);
      return {...result, existing: true};
    });
  }

  return {create, recover, retryLinks};
}
