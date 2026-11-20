// Serialized into content.js. Keep the factory independent of module-level values.
export function createSprintReportModel() {
  type Status = { id:string; name:string; category?:string };
  type Snapshot = { member:boolean; status:Status; points:number | null };
  type Change = {key:string; at:number; before:Snapshot; after:Snapshot; added:boolean; removed:boolean; statusChanged:boolean; estimateChanged:boolean; burned:number};
  const emptyMetrics = () => ({planned:0,initialRemaining:0,added:0,removed:0,burned:0,remaining:0,unestimated:0,completed:0,carry:0,plannedTasks:0,addedTasks:0,removedTasks:0,remainingTasks:0});
  const dateFormat = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'});
  const dayOf = (timestamp:number) => dateFormat.format(timestamp);
  const asArray = (value:any) => value == null ? [] : Array.isArray(value) ? value : [value];
  const pointValue = (value:any) => {
    if (value == null || String(value).trim() === '') return null;
    const numeric = Number(String(value).replace(',', '.'));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  };
  const score = (value:number | null) => value ?? 0;
  const emptyStatus:Status = {id:'',name:''};
  const closed = (sprint:any) => String(sprint.state).toLowerCase() === 'closed';
  const time = (value:any) => typeof value === 'number' ? value : Date.parse(value || '');
  const nameKey = (value:any) => String(value || '').trim().toLowerCase();
  const validKey = (value:any) => /^[A-Z][A-Z0-9_]*-\d+$/.test(String(value || ''));
  const epicKeyFor = (fields:any, field?:string) => {
    const custom = field ? fields[field] : null;
    const key = fields.epic?.key || (typeof custom === 'string' ? custom : custom?.key || custom?.value);
    return validKey(key) ? String(key) : '';
  };

  function nativeScope(report:any) {
    const contents = report?.contents;
    if (!contents) return null;
    const lists = ['completedIssues','issuesNotCompletedInCurrentSprint','issuesCompletedInAnotherSprint','puntedIssues'];
    if (!['completedIssues','issuesNotCompletedInCurrentSprint','puntedIssues'].every(list => Array.isArray(contents[list]))) return null;
    const issues = new Map<string, any>();
    const final = new Map<string, string>();
    lists.forEach((list,index) => asArray(contents[list]).forEach((issue:any) => {
      if (!validKey(issue?.key)) return;
      issues.set(issue.key,issue);
      final.set(issue.key,index === 0 ? 'done' : index === 3 ? 'removed' : 'remaining');
    }));
    const added = new Set<string>(Object.entries(contents.issueKeysAddedDuringSprint || {}).filter(([key,value]) => validKey(key) && value).map(([key]) => key));
    return {issues,final,added};
  }

  function build(input:{sprint:any;scope:ReturnType<typeof nativeScope>;issues:any[];sprintField:string;pointsField:string;pointsName:string;doneIds:string[];now?:number;epicField?:string;epics?:Map<string,any>}) {
    const {sprint,scope,issues,sprintField,pointsField,pointsName,doneIds} = input;
    const warnings = new Set<string>();
    const start = time(sprint.startDate);
    const completed = time(sprint.completeDate);
    const now = input.now ?? Date.now();
    const end = closed(sprint) ? (Number.isFinite(completed) ? completed : time(sprint.endDate)) : now;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('Jira не вернула корректные даты спринта.');
    if (closed(sprint) && !Number.isFinite(completed)) warnings.add('Нет фактической даты закрытия. Использована плановая дата окончания.');
    if (!scope) warnings.add('Штатный отчёт Jira недоступен. Задачи, удалённые из спринта, могут отсутствовать.');
    if (!pointsField) warnings.add('На доске не настроено поле оценки в Story Points. Доступен отчёт по задачам.');
    if (!doneIds.length && issues.length) warnings.add('Последняя колонка доски недоступна. Выполнение определено по статусам Jira.');

    const isDone = (status:Status) => {
      if (doneIds.length && status.id) return doneIds.includes(status.id);
      return status.category === 'done' || /^(done|closed|resolved|готово|закрыт[ао]?|выполнен[ао]?)$/i.test(status.name);
    };
    const sprintId = String(sprint.id);
    const hasSprint = (value:any):boolean => asArray(value).some(item => {
      if (typeof item === 'object') return String(item.id ?? '') === sprintId || (!item.id && item.name === sprint.name);
      const text = String(item).trim();
      const serialized = [...text.matchAll(/\bid=(\d+)/g)].map(match => match[1]);
      if (serialized.length) return serialized.includes(sprintId);
      if (/^\d+(?:[\s,]+\d+)*$/.test(text)) return text.split(/[\s,]+/).includes(sprintId);
      return text === sprint.name || text.split(/,\s*/).includes(sprint.name);
    });
    const numericIds = (value:any) => /^\d+(?:[\s,]+\d+)*$/.test(String(value || '').trim());
    const membersInChange = (id:any, label:any) => hasSprint(numericIds(id) ? id : label || id);
    const historyField = (item:any) => {
      const id = String(item.fieldId || item.field || '');
      const name = nameKey(item.field);
      if ((sprintField && id === sprintField) || /^(sprint|спринт)$/.test(name)) return 'sprint';
      if (id === 'status' || /^(status|статус)$/.test(name)) return 'status';
      if (pointsField && (id === pointsField || name === nameKey(pointsName) || /^(story points|стори поинты|story point estimate)$/.test(name))) return 'points';
      return '';
    };

    const events:Change[] = [];
    const rows:any[] = [];
    const metrics = emptyMetrics();
    const projects = new Map<string,{metrics:ReturnType<typeof emptyMetrics>;rows:any[];events:Change[]}>();
    let incomplete = 0;
    const available = new Map(issues.filter(issue => validKey(issue?.key)).map(issue => [issue.key,issue]));
    const keys = new Set<string>([...available.keys(),...scope?.issues.keys() || [],...scope?.added || []]);
    for (const key of keys) {
      const raw = available.get(key);
      const fallback = scope?.issues.get(key);
      const nativeFinal = scope?.final.get(key);
      const fields = raw?.fields || {};
      if (fields.issuetype?.subtask) continue;
      const histories = asArray(raw?.changelog?.histories);
      const groups = histories.flatMap(group => {
        const at = time(group.created);
        const items = asArray(group.items).map(item => ({item,kind:historyField(item)})).filter(entry => entry.kind);
        return Number.isFinite(at) && items.length ? [{at,items}] : [];
      }).sort((a,b) => a.at - b.at);
      const created = time(fields.created);
      if (Number.isFinite(created) && created > end) continue;
      const hasHistory = Array.isArray(raw?.changelog?.histories) &&
        (!Number.isFinite(raw.changelog.total) || raw.changelog.total <= histories.length) && Number(raw.changelog.startAt || 0) === 0;
      const knownMembership = [sprintField,'sprint','closedSprints'].some(field => field && Object.hasOwn(fields,field));
      const status = (value:any):Status => ({id:String(value?.id || ''),name:String(value?.name || ''),category:value?.statusCategory?.key});
      const current:Snapshot = {
        member: knownMembership ? hasSprint([fields[sprintField],fields.sprint,fields.closedSprints].flat().filter(Boolean)) : nativeFinal !== 'removed' && (!!nativeFinal || !!raw),
        status:status(fields.status),
        points:pointsField && Object.hasOwn(fields,pointsField) ? pointValue(fields[pointsField]) : null
      };
      if (!current.status.name && fallback?.statusName) current.status = {id:String(fallback.statusId || ''),name:String(fallback.statusName)};
      const currentStatus = current.status;
      const stateFrom = (item:any, side:'from'|'to'):Status => {
        const id=String(item[side] || ''), name=String(item[side + 'String'] || '');
        if ((!id || id === currentStatus.id) && (!name || name === currentStatus.name)) return currentStatus;
        return {id,name};
      };
      const apply = (snapshot:Snapshot, group:typeof groups[number], side:'from'|'to') => {
        const next = {...snapshot};
        group.items.forEach(({item,kind}:any) => {
          if (kind === 'sprint') next.member = membersInChange(item[side],item[side + 'String']);
          if (kind === 'status') next.status = stateFrom(item,side);
          if (kind === 'points') next.points = pointValue(item[side] ?? item[side + 'String']);
        });
        return next;
      };
      const startSnapshot = groups.reduceRight((snapshot,group) => group.at > start ? apply(snapshot,group,'from') : snapshot,current);
      const movement = groups.filter(group => group.items.some(entry => entry.kind === 'sprint') && group.at > start && group.at <= end);
      const detectedEntry = movement.some(group => !apply(current,group,'from').member && apply(current,group,'to').member);
      let completeHistory = hasHistory && (!pointsField || Object.hasOwn(fields,pointsField));
      if (!detectedEntry && scope?.added.has(key)) {
        if (!(created > start && created <= end && startSnapshot.member)) {
          startSnapshot.member = false;
          completeHistory = false;
        }
      }
      if (nativeFinal === 'removed' && !movement.length) completeHistory = false;
      if (!completeHistory) incomplete++;

      const started = startSnapshot.member && !(created > start);
      let snapshot:Snapshot = {...startSnapshot,member:started};
      const issueEvents:Change[] = [];
      const pushChange = (at:number, after:Snapshot) => {
        const before = snapshot;
        snapshot = after;
        const added = !before.member && after.member;
        const removed = before.member && !after.member;
        const statusChanged = (before.member || after.member) && (before.status.id !== after.status.id || before.status.name !== after.status.name);
        const estimateChanged = (before.member || after.member) && before.points !== after.points;
        if (!added && !removed && !statusChanged && !estimateChanged) return;
        const burned = before.member && after.member && statusChanged ? (Number(isDone(after.status)) - Number(isDone(before.status))) * score(after.points) : 0;
        issueEvents.push({key,at,before,after,added,removed,statusChanged,estimateChanged,burned});
      };
      if (created > start && created <= end && startSnapshot.member) pushChange(created,startSnapshot);
      for (const group of groups) {
        if (group.at <= start || group.at > end) continue;
        const after = apply(snapshot,group,'to');
        // A move generated by sprint completion isn't a user removal. Jira's own report
        // still lists these issues as unfinished or completed at the closing boundary.
        if (closed(sprint) && nativeFinal && nativeFinal !== 'removed' && group.at === end) after.member = snapshot.member;
        pushChange(group.at,after);
      }
      // Prefer Jira's closing classification if it is available. The issue may already
      // have been moved to another sprint or completed after the selected sprint ended.
      const memberAtEnd = nativeFinal ? nativeFinal !== 'removed' : snapshot.member;
      const doneAtEnd = memberAtEnd && (nativeFinal ? nativeFinal === 'done' : isDone(snapshot.status));
      const added = issueEvents.some(change => change.added) || Boolean(scope?.added.has(key));
      const removed = issueEvents.some(change => change.removed) || nativeFinal === 'removed';
      if (!memberAtEnd && !started && !added && !removed) continue;
      const addedPoints = issueEvents.filter(change => change.added).reduce((sum,change) => sum + score(change.after.points),0);
      const removedPoints = issueEvents.filter(change => change.removed).reduce((sum,change) => sum + score(change.before.points),0);
      const project = String(fields.project?.key || key.split('-')[0]);
      const epicKey = epicKeyFor(fields,input.epicField);
      const epic = input.epics?.get(epicKey);
      const streamValue = epic?.customfield_24000 ?? fields.customfield_24000;
      const stream = String(typeof streamValue === 'string' ? streamValue : streamValue?.value || streamValue?.name || '');
      const burned = issueEvents.reduce((sum,change) => sum + change.burned,0);
      const unfinished = memberAtEnd && !doneAtEnd;
      const carry = closed(sprint) && unfinished;
      const row = {key,project,stream,epicKey,epicTitle:String(epic?.summary || fields.epic?.summary || fields.epic?.name || ''),
        summary:fields.summary || fallback?.summary || key, started, startPoints:startSnapshot.points, startStatus:startSnapshot.status.name,
        endPoints:snapshot.points, endStatus:snapshot.status.name, memberAtEnd, doneAtEnd, added, removed, addedPoints, removedPoints, completeHistory,
        addedDates:issueEvents.filter(change=>change.added).map(change=>dayOf(change.at)),
        removedDates:issueEvents.filter(change=>change.removed).map(change=>dayOf(change.at)),
        carry};
      if (!projects.has(project)) projects.set(project,{metrics:emptyMetrics(),rows:[],events:[]});
      const detail = projects.get(project)!;
      for (const total of [metrics,detail.metrics]) {
        if (started) {
          total.plannedTasks++;
          total.planned += score(startSnapshot.points);
          if (!isDone(startSnapshot.status)) total.initialRemaining += score(startSnapshot.points);
          if (startSnapshot.points == null) total.unestimated++;
        }
        total.added += addedPoints;
        total.addedTasks += Number(added);
        total.removed += removedPoints;
        total.removedTasks += Number(removed);
        total.burned += burned;
        if (unfinished) { total.remaining += score(snapshot.points); total.remainingTasks++; }
        total.completed += Number(doneAtEnd);
        total.carry += Number(carry);
      }
      rows.push(row);
      events.push(...issueEvents);
      detail.rows.push(row);
      detail.events.push(...issueEvents);
    }
    if (incomplete) warnings.add('Для ' + incomplete + ' задач история доступна частично. Значения по дням и изменения SP могут отличаться от итогов Jira.');
    const dates = [];
    for (let tick = Date.parse(dayOf(start) + 'T00:00:00Z'), last = Date.parse(dayOf(end) + 'T00:00:00Z'); tick <= last; tick += 86400000) {
      dates.push(new Date(tick).toISOString().slice(0,10));
    }
    const series = (items:Change[], totals:ReturnType<typeof emptyMetrics>) => {
      items.sort((a,b) => a.at - b.at || a.key.localeCompare(b.key));
      const byDay = new Map<string,Change[]>();
      for (const event of items) {
        const date = dayOf(event.at);
        if (!byDay.has(date)) byDay.set(date,[]);
        byDay.get(date)!.push(event);
      }
      let scopePoints = totals.planned, remaining = totals.initialRemaining;
      return dates.map(date => {
        const changes = byDay.get(date) || [];
        let burned = 0;
        changes.forEach(change => {
          const {before,after} = change;
          scopePoints += (after.member ? score(after.points) : 0) - (before.member ? score(before.points) : 0);
          remaining += (after.member && !isDone(after.status) ? score(after.points) : 0) - (before.member && !isDone(before.status) ? score(before.points) : 0);
          burned += change.burned;
        });
        return {date,changes,remaining:Math.max(0,remaining),scope:Math.max(0,scopePoints),burned};
      });
    };
    rows.sort((a,b) => a.key.localeCompare(b.key,'en',{numeric:true}));
    const projectOrder = [...projects.keys()].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    const byProject = new Map(projectOrder.map(key => {
      const detail = projects.get(key)!;
      detail.rows.sort((a,b) => a.key.localeCompare(b.key,'en',{numeric:true}));
      return [key,{...detail,days:series(detail.events,detail.metrics)}];
    }));
    return {start,end,closed:closed(sprint),rows,events,days:series(events,metrics),metrics,byProject,pointsField,pointsName, warnings:[...warnings]};
  }
  return {nativeScope,build,epicKeyFor};
}
