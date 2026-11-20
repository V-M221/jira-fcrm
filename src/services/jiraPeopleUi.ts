export type JiraPerson = {name:string;login:string;avatarUrl?:string};

// Serialized into the extension runtime.
export function createJiraPeopleUi() {
  const escape = (value:string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const avatarUrl = (user:any) => String(user?.avatarUrls?.['48x48'] || user?.avatarUrls?.['32x32'] || user?.avatarUrls?.['24x24'] || '');

  function fromJira(user:any,empty='—'):JiraPerson {
    return {name:String(user?.displayName || user?.name || user?.key || empty),login:String(user?.name || ''),avatarUrl:avatarUrl(user)};
  }

  function safeAvatarUrl(value?:string) {
    if (!value) return '';
    if (/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(value) && value.length<8000) return value;
    try {
      const url=new URL(value,location.href);
      return /^https?:$/.test(url.protocol) && url.origin===location.origin ? url.href : '';
    } catch (_) { return ''; }
  }

  function avatar(person?:JiraPerson | null) {
    if (!person || !person.name || /^(—|Не назначен|Неизвестен|Не указан)$/.test(person.name)) return '';
    const initials=person.name.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0] || '').join('').toUpperCase();
    const src=safeAvatarUrl(person.avatarUrl);
    return '<span class="ozon-person-avatar" aria-hidden="true">' + escape(initials) +
      (src ? '<img data-ozon-person-avatar alt="" src="' + escape(src) + '" loading="lazy" decoding="async">' : '') + '</span>';
  }

  function badge(person?:JiraPerson | null,empty='—') {
    const name=person?.name || empty;
    const title=person?.login ? name + ' · ' + person.login : name;
    return '<span class="ozon-person" title="' + escape(title) + '">' + avatar(person) + '<span class="ozon-person-name">' + escape(name) + '</span></span>';
  }

  function copyButton(person?:JiraPerson | null) {
    const login=person?.login?.trim();
    if (!login) return '';
    const title='Копировать логин ' + login;
    return '<button type="button" class="ozon-person-copy" data-ozon-copy-login="' + escape(login) + '" title="' + escape(title) + '" aria-label="' + escape(title) + '">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></svg></button>';
  }

  function bind(root:Document,notify:(message:string)=>void) {
    root.addEventListener('error',event=>{
      const target=event.target;
      if (target instanceof HTMLImageElement && target.hasAttribute('data-ozon-person-avatar')) target.hidden=true;
    },true);
    root.addEventListener('click',async event=>{
      const button=(event.target as Element)?.closest<HTMLButtonElement>('[data-ozon-copy-login]');
      const login=button?.dataset.ozonCopyLogin;
      if (!login) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(login);
        notify('✓ Логин скопирован');
      } catch (_) { notify('Не удалось скопировать логин'); }
    },true);
  }

  return {fromJira,avatarUrl,safeAvatarUrl,avatar,badge,copyButton,bind};
}
