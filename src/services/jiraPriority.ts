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
    const text=String(name || 'Не указан');
    const title='Приоритет: ' + text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] || char));
    const twiceUp='<path d="m6 14 6-6 6 6m-12 5 6-6 6 6"/>';
    const onceUp='<path d="m6 14 6-6 6 6"/>';
    const onceDown='<path d="m6 8 6 6 6-6"/>';
    const [tone,path,color]=/block|блок/i.test(text) ? ['critical','<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>','#D92D20']
      : /highest|critical|крит|наивыс/i.test(text) ? ['critical',twiceUp,'#D92D20']
      : /high|major|высок|важн/i.test(text) ? ['high',onceUp,'#D55310']
      : /lowest|triv|миним/i.test(text) ? ['lowest','<path d="m6 6 6 6 6-6m-12 5 6 6 6-6"/>','#596B82']
      : /low|minor|низк|незнач/i.test(text) ? ['low',onceDown,'#2452B4']
      : /medium|normal|standard|сред|стандарт|обыч/i.test(text) ? ['normal','<path d="M5 10h14M5 15h14"/>','#A04C08']
      : ['unknown','<path d="M6 12h12"/>','#596B82'];
    return '<span class="ozon-dev-priority ozon-priority-icon ozon-priority-' + tone + '" role="img" aria-label="' + title + '" title="' + title + '" style="color:var(--ozon-priority-' + tone + ',' + color + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg></span>';
  }
  return {options,save,icon};
}
