/**
 * Jira owns creation. DeepSeek supplies a draft, never a Jira result or create payload.
 * This factory is embedded in the Jira content script via Function#toString.
 */
export function createFcrmThreadWriter(
  applyTheme?: (key: string, themeKey: string) => Promise<unknown>,
  applyDevelopmentLink?: (sourceKey: string, proposal: {key: string; kind: 'development'}) => Promise<unknown>
) {
  type Input = {
    urls: string[];
    issueTypeId: string;
    componentId: string;
    summary: string;
    description: string;
    themeKey?: string;
    confirmedDuplicateKeys?: string[];
    mentionedIssueKeys?: string[];
    issueLinks?: IssueLinkProposal[];
  };
  type Source = {id: string; url: string; marker: string};
  type Direction = 'inward' | 'outward';
  type DynamicLinkKind = `jira:${string}:${Direction}`;
  type IssueLinkProposal = {key: string; kind: 'development' | 'related' | 'duplicate' | DynamicLinkKind};
  type LinkProposal = IssueLinkProposal | {key: string; kind: 'theme'};
  type IssueLinkType = {id?: string; name: string; inward: string; outward: string};
  type LinkSelection = {type: IssueLinkType; direction: Direction};
  type LinkOutcome = {key: string; kind: LinkProposal['kind'] | 'source'; confirmed: boolean};
  type Candidate = {key: string; title: string; reason: string};
  type Inspection = {state: 'ready' | 'existing' | 'possible-duplicate' | 'uncertain'; issues: Candidate[]};
  type Fields = {
    summary?: string;
    description?: string;
    labels?: string[];
    project?: {key: string};
    issuetype?: {id: string};
    components?: {id: string}[];
    issuelinks?: {
      id: string;
      type?: Partial<IssueLinkType>;
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
  type JournalRecord = {key?: string; verified?: boolean; receipt?: false};
  type Journal = Record<string, JournalRecord>;
  type RemoteLink = {object?: {url?: string}};

  const api = '/rest/api/2/';
  const journalKey = 'ozon-fcrm-thread-creation-v1';
  const project = 'FCRM';
  const isTheme = (issue: Issue) => issue?.fields?.labels?.includes('fcrm_umb_epic') === true;
  const isIssueKey = (key: unknown): key is string => typeof key === 'string' && /^FCRM-\d+$/.test(key);
  const issuePath = (key: string) => 'issue/' + encodeURIComponent(key);
  const projectTask = /^(задача проекта|project task)$/i;
  const inProject = /^(в проекте|in project)$/i;
  const related = /^(связанная задача|relates(?: to)?)$/i;
  const duplicates = /^(дубликат|duplicates)$/i;
  const duplicatedBy = /^(дублировано с|is duplicated by)$/i;
  const allowedTarget = /^(FCRM|OB|OBFRONT|FTD|FACS)-\d+$/;
  const dynamicLinkKind = /^jira:([1-9]\d*):(inward|outward)$/;
  const caption = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const equalCaption = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  function isReservedLinkType(type: IssueLinkType) {
    const inward = caption(type.inward);
    const outward = caption(type.outward);
    return projectTask.test(inward) || projectTask.test(outward) || inProject.test(inward) || inProject.test(outward) ||
      (related.test(inward) && related.test(outward)) ||
      (duplicatedBy.test(inward) && duplicates.test(outward)) ||
      (duplicates.test(inward) && duplicatedBy.test(outward));
  }

  async function loadLinkTypes() {
    const catalog = await request<{issueLinkTypes?: IssueLinkType[]}>('issueLinkType');
    if (!Array.isArray(catalog?.issueLinkTypes)) {
      throw failure('Jira не подтвердила список типов связей.', 'THREAD_LINKS_INVALID');
    }
    return catalog.issueLinkTypes.filter(type => caption(type?.name) && caption(type?.inward) && caption(type?.outward));
  }

  function isSelectableLinkType(type: IssueLinkType, types: IssueLinkType[]) {
    return /^[1-9]\d*$/.test(String(type.id)) && !isReservedLinkType(type) &&
      types.filter(item => String(item.id) === String(type.id)).length === 1 &&
      types.filter(item => equalCaption(caption(item.name), caption(type.name))).length === 1;
  }

  async function listLinkKinds(key: string): Promise<{kind: IssueLinkProposal['kind']; label: string}[]> {
    if (!allowedTarget.test(key)) throw failure('Проверьте ключ задачи Jira.', 'THREAD_LINK_INVALID');
    const types = await loadLinkTypes();
    const options: {kind: IssueLinkProposal['kind']; label: string}[] = [];
    if (!isIssueKey(key)) options.push({kind: 'development', label: 'В проекте'});
    options.push({kind: 'related', label: 'Связанная задача'});
    if (isIssueKey(key)) options.push({kind: 'duplicate', label: 'Дубликат'});
    for (const type of types) {
      if (!isSelectableLinkType(type, types)) continue;
      options.push({kind: ('jira:' + type.id + ':outward') as DynamicLinkKind, label: caption(type.outward)});
      if (!equalCaption(caption(type.inward), caption(type.outward))) {
        options.push({kind: ('jira:' + type.id + ':inward') as DynamicLinkKind, label: caption(type.inward)});
      }
    }
    return options.map(option => {
      const id = dynamicLinkKind.exec(option.kind)?.[1];
      if (!id || options.filter(other => equalCaption(option.label, other.label)).length === 1) return option;
      const name = types.find(type => String(type.id) === id)?.name;
      return name ? {...option, label: option.label + ' (' + name + ')'} : option;
    });
  }

  function resolveSelectedLinkType(types: IssueLinkType[], kind: string): LinkSelection {
    const match = dynamicLinkKind.exec(kind);
    const type = match && types.find(item => String(item.id) === match[1]);
    if (!match || !type || !isSelectableLinkType(type, types)) {
      throw failure('Выбранный тип связи больше недоступен в Jira.', 'THREAD_LINKS_INVALID');
    }
    const direction = match[2] as Direction;
    if (direction === 'inward' && equalCaption(caption(type.inward), caption(type.outward))) {
      throw failure('Обновите список и выберите доступное направление связи.', 'THREAD_LINKS_INVALID');
    }
    return {type, direction};
  }

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

  function candidate(issue: Issue, reason: string): Candidate {
    const title = issue.fields?.summary;
    if (typeof title !== 'string' || !title.trim()) {
      throw failure('Jira не подтвердила название задачи ' + issue.key + '.', 'THREAD_ISSUE_UNCONFIRMED');
    }
    return {key: issue.key, title: title.trim(), reason};
  }

  function hasPendingCreation(journal: Journal, sources: Source[]) {
    return sources.some(({marker}) => marker in journal && !journal[marker].verified);
  }

  async function findExistingIssues(journal: Journal, sources: Source[]) {
    const reason = 'Совпадает исходный тред chatZone';
    const keys = [...new Set(sources.map(source => journal[source.marker]?.key).filter(isIssueKey))];
    const found = new Map<string, Candidate>();
    const confirmed = await Promise.all(keys.map(async key => {
      const fields = await readIssue(key, 'project,labels,description,summary');
      if (fields.project?.key !== project || !sources.some(source => matchesSource(fields, source))) throw unknown();
      return candidate({key, fields}, reason);
    }));
    for (const issue of confirmed) found.set(issue.key, issue);

    const untracked = sources.filter(source => !isIssueKey(journal[source.marker]?.key));
    for (let start = 0; start < untracked.length; start += 8) {
      const batch = untracked.slice(start, start + 8);
      const labels = 'labels in (' + batch.map(source => quoteJql(source.marker)).join(',') + ')';
      const legacyDescriptions = batch.map(source => 'description ~ ' + quoteJql(source.id));
      const issues = await search([labels, ...legacyDescriptions].join(' OR '), 'labels,description,summary');
      for (const issue of issues) {
        if (isIssueKey(issue?.key) && issue.fields && batch.some(source => matchesSource(issue.fields, source))) {
          found.set(issue.key, candidate(issue, reason));
        }
      }
    }
    return [...found.values()];
  }

  async function locateIssue(journal: Journal, sources: Source[]) {
    const found = await findExistingIssues(journal, sources);
    if (found.length > 1) {
      throw failure('Найдено несколько задач с исходными тредами. Выберите существующую задачу в Jira.', 'THREAD_DUPLICATE');
    }
    return found[0];
  }

  async function findMentionedIssues(inputKeys: string[] | undefined) {
    const keys = [...new Set((inputKeys || []).filter(isIssueKey))].slice(0, 12);
    if (!keys.length) return [];
    const confirmed = await search('key in (' + keys.join(',') + ')', 'summary,project,labels');
    return confirmed.filter(issue => keys.includes(issue?.key) && issue.fields?.project?.key === project && !isTheme(issue));
  }

  async function findIssuesWithSameSummary(summary: string) {
    const words = summary.match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) || [];
    if (!words.length) return [];
    const query = 'summary ~ ' + quoteJql('"' + words.join(' ') + '"');
    const candidates = await search(query, 'summary,labels');
    const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru');
    return candidates.filter(issue => isIssueKey(issue?.key) &&
      !isTheme(issue) && typeof issue.fields?.summary === 'string' && normalize(issue.fields.summary) === normalize(summary));
  }

  async function findPossibleDuplicates(input: Input): Promise<Candidate[]> {
    const [mentions, sameSummary] = await Promise.all([
      findMentionedIssues(input.mentionedIssueKeys),
      findIssuesWithSameSummary(input.summary)
    ]);
    const found = new Map<string, Candidate>();
    for (const issue of mentions) found.set(issue.key, candidate(issue, 'Упоминается в треде chatZone'));
    for (const issue of sameSummary) {
      const previous = found.get(issue.key);
      const reason = previous ? previous.reason + ', совпадает название' : 'Совпадает название задачи';
      found.set(issue.key, candidate(issue, reason));
    }
    return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  async function inspect(input: Input): Promise<Inspection> {
    const sources = await normalizeSources(input.urls);
    const journal = readJournal();
    if (hasPendingCreation(journal, sources)) {
      const issues = await findExistingIssues(journal, sources).catch(() => []);
      return {state: 'uncertain', issues};
    }
    const existing = await findExistingIssues(journal, sources);
    if (existing.length) return {state: 'existing', issues: existing};
    const possible = await findPossibleDuplicates(input);
    return {state: possible.length ? 'possible-duplicate' : 'ready', issues: possible};
  }

  async function verifyDuplicateConfirmation(input: Input) {
    const issues = await findPossibleDuplicates(input);
    const confirmed = new Set(input.confirmedDuplicateKeys || []);
    if (confirmed.size !== issues.length || issues.some(issue => !confirmed.has(issue.key))) {
      throw Object.assign(
        failure('Проверьте текущий список возможных дублей перед созданием отдельной задачи.', 'THREAD_POSSIBLE_DUPLICATE'),
        {issueKeys: issues.map(issue => issue.key), issues}
      );
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

  function normalizeIssueLinks(proposals: IssueLinkProposal[] = [], themeKey?: string) {
    if (!Array.isArray(proposals) || proposals.length > 10) {
      throw failure('Выберите до 10 связей с задачами Jira.', 'THREAD_LINK_INVALID');
    }
    const selected = new Map<string, IssueLinkProposal>();
    for (const proposal of proposals) {
      const key = typeof proposal?.key === 'string' ? proposal.key.trim().toUpperCase() : '';
      const kind = proposal?.kind;
      const validDevelopment = kind === 'development' && /^(OB|OBFRONT|FTD|FACS)-\d+$/.test(key);
      const validRelated = kind === 'related' && allowedTarget.test(key);
      const validDuplicate = kind === 'duplicate' && isIssueKey(key);
      const validDynamic = typeof kind === 'string' && dynamicLinkKind.test(kind) && allowedTarget.test(key);
      if ((!validDevelopment && !validRelated && !validDuplicate && !validDynamic) || key === themeKey ||
          (selected.has(key) && selected.get(key)?.kind !== kind)) {
        throw failure('Проверьте выбранные ключи и типы связей Jira.', 'THREAD_LINK_INVALID');
      }
      selected.set(key, {key, kind});
    }
    return [...selected.values()];
  }

  async function verifyLinkTarget(key: string) {
    const target = await readIssue(key, 'project,summary');
    if (target.project?.key !== key.split('-')[0] || typeof target.summary !== 'string' || !target.summary.trim()) {
      throw failure('Jira не подтвердила выбранную задачу ' + key + '.', 'THREAD_LINK_INVALID');
    }
    return target.summary.trim();
  }

  async function resolveLinkTarget(key: string) {
    if (!allowedTarget.test(key)) {
      throw failure('Проверьте ключ задачи Jira.', 'THREAD_LINK_INVALID');
    }
    return {key, title:await verifyLinkTarget(key)};
  }

  function linkFrom(fields: Fields, targetKey: string, caption: RegExp, typeName?: string) {
    return (fields.issuelinks || []).filter(link =>
      (!typeName || link.type?.name === typeName) &&
      (link.inwardIssue?.key === targetKey && caption.test(link.type?.inward?.trim() || '') ||
       link.outwardIssue?.key === targetKey && caption.test(link.type?.outward?.trim() || ''))
    );
  }

  async function checkIssueLink(sourceKey: string, proposal: LinkProposal, typeName?: string, selection?: LinkSelection) {
    const [source, target] = await Promise.all([
      readIssue(sourceKey, 'issuelinks'),
      readIssue(proposal.key, 'issuelinks')
    ]);
    if (!Array.isArray(source.issuelinks) || !Array.isArray(target.issuelinks)) {
      throw failure('Jira не подтвердила текущие связи.', 'THREAD_LINKS_INVALID');
    }
    if (selection) {
      const {type, direction} = selection;
      const reverse: Direction = direction === 'inward' ? 'outward' : 'inward';
      const symmetric = equalCaption(caption(type.inward), caption(type.outward));
      const from = (fields: Fields, peer: string, side: Direction) => fields.issuelinks!.filter(link => {
        const sameType = link.type?.id != null
          ? String(link.type.id) === String(type.id)
          : link.type?.name === type.name;
        return sameType && link[side === 'inward' ? 'inwardIssue' : 'outwardIssue']?.key === peer &&
          equalCaption(caption(link.type?.[side]), caption(type[side]));
      });
      const sourceLinks = from(source, proposal.key, direction);
      const targetLinks = from(target, sourceKey, reverse);
      const inverseSource = from(source, proposal.key, reverse);
      const inverseTarget = from(target, sourceKey, direction);
      const sameLink = (a: typeof sourceLinks, b: typeof targetLinks) =>
        a.some(link => !!link.id && b.some(other => String(other.id) === String(link.id)));
      return {
        confirmed: sameLink(sourceLinks, targetLinks) || (symmetric && sameLink(inverseSource, inverseTarget)),
        present: !!(sourceLinks.length || targetLinks.length || inverseSource.length || inverseTarget.length)
      };
    }
    const sourceCaption = proposal.kind === 'theme' ? projectTask : proposal.kind === 'development' ? inProject : proposal.kind === 'duplicate' ? duplicates : related;
    const targetCaption = proposal.kind === 'theme' ? inProject : proposal.kind === 'development' ? projectTask : proposal.kind === 'duplicate' ? duplicatedBy : related;
    const sourceLinks = linkFrom(source, proposal.key, sourceCaption, typeName);
    const targetLinks = linkFrom(target, sourceKey, targetCaption, typeName);
    return {
      confirmed: sourceLinks.some(link => !!link.id && targetLinks.some(other => other.id === link.id)),
      present: sourceLinks.length > 0 || targetLinks.length > 0
    };
  }

  function resolveLinkType(types: IssueLinkType[], kind: 'related' | 'duplicate') {
    const [inward, outward] = kind === 'duplicate' ? [duplicatedBy, duplicates] : [related, related];
    const matches = types.filter(type => !!type?.name && inward.test(type.inward?.trim() || '') && outward.test(type.outward?.trim() || ''));
    if (matches.length !== 1) {
      throw failure('Jira не подтвердила выбранный тип связи.', 'THREAD_LINKS_INVALID');
    }
    return matches[0].name;
  }

  async function verifyOrApplyIssueLink(
    sourceKey: string,
    proposal: LinkProposal,
    write: boolean,
    getLinkTypes: () => Promise<IssueLinkType[]>
  ) {
    if (sourceKey === proposal.key) return false;
    const selection = dynamicLinkKind.test(proposal.kind)
      ? resolveSelectedLinkType(await getLinkTypes(), proposal.kind)
      : undefined;
    const typeName = proposal.kind === 'related' || proposal.kind === 'duplicate'
      ? resolveLinkType(await getLinkTypes(), proposal.kind)
      : selection?.type.name;
    const before = await checkIssueLink(sourceKey, proposal, typeName, selection);
    if (before.confirmed || !write || before.present) return before.confirmed;
    try {
      await verifyLinkTarget(proposal.key);
      if (proposal.kind === 'theme') {
        await applyTheme?.(sourceKey, proposal.key);
      } else if (proposal.kind === 'development') {
        await applyDevelopmentLink?.(sourceKey, {key: proposal.key, kind: 'development'});
      } else {
        const sourceIsInward = selection ? selection.direction === 'outward' : proposal.kind === 'duplicate';
        await request('issueLink', 'POST', {
          type: {name: typeName},
          inwardIssue: {key: sourceIsInward ? sourceKey : proposal.key},
          outwardIssue: {key: sourceIsInward ? proposal.key : sourceKey}
        }, false);
      }
    } catch {
      // A failure to receive the response can still mean Jira saved the link.
    }
    return (await checkIssueLink(sourceKey, proposal, typeName, selection)).confirmed;
  }

  async function finish(
    issue: {key: string; title: string},
    sources: Source[],
    proposals: LinkProposal[],
    write: boolean
  ) {
    const missingSources = await linkSources(issue.key, sources, write);
    const linkOutcomes: LinkOutcome[] = sources.map(({url}) =>
      ({key: url, kind: 'source', confirmed: !missingSources.includes(url)}));
    let typesRequest: Promise<IssueLinkType[]> | undefined;
    const getLinkTypes = () => typesRequest ||= loadLinkTypes();
    for (const proposal of proposals) {
      const confirmed = await verifyOrApplyIssueLink(issue.key, proposal, write, getLinkTypes).catch(() => false);
      linkOutcomes.push({...proposal, confirmed});
    }
    const linkFailures = linkOutcomes.filter(link => !link.confirmed).map(link => link.key);
    return {key: issue.key, title: issue.title, linkFailures, linkOutcomes, existing: false, canRetryLinks: linkFailures.length > 0};
  }

  async function reconcile(journal: Journal, sources: Source[]) {
    try {
      const candidate = await locateIssue(journal, sources);
      if (candidate) return candidate;
    } catch {
      // A failed or empty index search does not prove there was no creation.
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
    return {key, title: saved.summary};
  }

  function existingResult(issue: {key: string; title: string}) {
    return {key: issue.key, title: issue.title, existing: true, canRetryLinks: false, linkFailures: [], linkOutcomes: []};
  }

  function hasOwnReceipt(journal: Journal, sources: Source[], key: string) {
    return sources.every(({marker}) => journal[marker]?.key === key && journal[marker].receipt !== false);
  }

  async function recoverCreation(journal: Journal, input: Input, sources: Source[], proposals: LinkProposal[]) {
    const found = await reconcile(journal, sources);
    if (!hasOwnReceipt(journal, sources, found.key)) {
      if (hasPendingCreation(journal, sources)) {
        // The exact source identifies an existing task, but only a Jira receipt authorizes repairing its links.
        const verified = await verifyCreatedIssue(found.key, input, sources).catch(() => null);
        if (verified) writeJournal(journal, sources, {key: found.key, verified: true, receipt: false});
      }
      return existingResult(found);
    }
    const issue = await verifyCreatedIssue(found.key, input, sources);
    writeJournal(journal, sources, {key: issue.key, verified: true});
    return finish(issue, sources, proposals, false);
  }

  function normalizeThemeKey(value?: string) {
    const themeKey = value?.trim().toUpperCase();
    if (themeKey && !isIssueKey(themeKey)) {
      throw failure('Выберите корректный ключ тематики FCRM.', 'THREAD_THEME_INVALID');
    }
    return themeKey || undefined;
  }

  function getLinkProposals(input: Input): LinkProposal[] {
    const themeKey = normalizeThemeKey(input.themeKey);
    const proposals: LinkProposal[] = normalizeIssueLinks(input.issueLinks, themeKey);
    if (themeKey) proposals.unshift({kind: 'theme', key: themeKey});
    return proposals;
  }

  function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    if (!navigator.locks?.request) {
      throw failure('Браузер не поддерживает защиту от параллельного создания.', 'THREAD_LOCK_UNAVAILABLE');
    }
    return navigator.locks.request(journalKey, operation);
  }

  async function create(input: Input) {
    const sources = await normalizeSources(input.urls);
    const proposals = getLinkProposals(input);
    return withWriteLock(async () => {
      const journal = readJournal();
      if (hasPendingCreation(journal, sources)) {
        return recoverCreation(journal, input, sources, proposals);
      }
      const existing = await locateIssue(journal, sources);
      if (existing) return existingResult(existing);

      const fields = await buildFields(input, sources);
      await Promise.all(proposals.map(proposal => verifyLinkTarget(proposal.key)));
      const customLinks = proposals.filter(proposal => dynamicLinkKind.test(proposal.kind));
      if (customLinks.length) {
        const types = await loadLinkTypes();
        for (const proposal of customLinks) resolveSelectedLinkType(types, proposal.kind);
      }
      await verifyDuplicateConfirmation(input);
      writeJournal(journal, sources, {});
      let receipt: {key?: string};
      try {
        receipt = await request('issue', 'POST', {fields});
      } catch (error) {
        if ([400, 401, 403, 404, 405, 415, 422].includes((error as {status?: number}).status ?? 0)) {
          writeJournal(journal, sources, null);
          throw error;
        }
        return recoverCreation(journal, input, sources, proposals);
      }
      const key = receipt?.key;
      if (!isIssueKey(key)) return recoverCreation(journal, input, sources, proposals);
      try {
        writeJournal(journal, sources, {key});
      } catch {
        throw unknown();
      }
      const issue = await verifyCreatedIssue(key, input, sources);
      writeJournal(journal, sources, {key, verified: true});
      return finish(issue, sources, proposals, true);
    });
  }

  async function recover(input: Input) {
    const sources = await normalizeSources(input.urls);
    return withWriteLock(() => recoverCreation(readJournal(), input, sources, getLinkProposals(input)));
  }

  async function retryLinks(input: Input) {
    const sources = await normalizeSources(input.urls);
    const proposals = getLinkProposals(input);
    return withWriteLock(async () => {
      const journal = readJournal();
      const key = journal[sources[0].marker]?.key;
      if (!isIssueKey(key) || !hasOwnReceipt(journal, sources, key)) {
        throw failure('Добавить связи можно только к задаче, созданной этим запросом.', 'THREAD_LINKS_UNOWNED');
      }
      const issue = await verifyCreatedIssue(key, input, sources);
      writeJournal(journal, sources, {key, verified: true});
      return finish(issue, sources, proposals, true);
    });
  }

  return {inspect, create, recover, retryLinks, resolveLinkTarget, listLinkKinds};
}
