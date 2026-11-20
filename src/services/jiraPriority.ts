export function createJiraPriorityService() {
  async function get(url:string) {
    const response = await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
    if (!response.ok) throw new Error('Jira вернула HTTP ' + response.status);
    return response.json();
  }
  async function options(key:string) {
    const meta = await get('/rest/api/2/issue/' + encodeURIComponent(key) + '/editmeta');
    const field = meta.fields?.priority;
    if (!field) throw new Error('Приоритет недоступен для изменения в Jira');
    const values = Array.isArray(field.allowedValues) ? field.allowedValues : await get('/rest/api/2/priority');
    return values.filter((item:any) => item?.name).map((item:any) => ({label:item.name,value:item.id ? {id:String(item.id)} : {name:item.name}}));
  }
  async function save(key:string, value:any) {
    const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(key),{method:'PUT',credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({fields:{priority:value}})});
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(Object.values(data.errors || {}).join(', ') || data.errorMessages?.join(', ') || 'Не удалось изменить приоритет (HTTP ' + response.status + ')'); }
    const fresh = await get('/rest/api/2/issue/' + encodeURIComponent(key) + '?fields=priority');
    const priority = fresh.fields?.priority;
    if (!priority || (value.id ? String(priority.id) !== String(value.id) : priority.name !== value.name)) throw new Error('Jira не подтвердила изменение приоритета');
    return priority;
  }
  function icon(name:string) {
    const text = String(name || 'Не указан');
    const high = /highest|blocker|critical|крит|блок|наивыс/i.test(text), raised = high || /high|высок/i.test(text), low = /low|низк/i.test(text);
    const path = raised ? '<path d="m6 14 6-6 6 6"/>' + (high ? '<path d="m6 19 6-6 6 6"/>' : '') : low ? '<path d="m6 8 6 6 6-6"/>' : '<path d="M5 10h14M5 15h14"/>';
    return '<span class="ozon-dev-priority" aria-hidden="true" style="color:' + (raised ? '#E5484D' : low ? '#005BFF' : '#D97706') + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + path + '</svg></span>';
  }
  return {options,save,icon};
}
