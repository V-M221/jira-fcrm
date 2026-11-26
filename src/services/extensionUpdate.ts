const releaseBaseUrl = 'https://raw.githubusercontent.com/V-M221/jira-fcrm/main/';
export const EXTENSION_UPDATE_METADATA_URL = releaseBaseUrl + 'extension-version.json';
export const EXTENSION_UPDATE_ZIP_URL = releaseBaseUrl + 'FCRM-Chrome-3.3.zip';
export const EXTENSION_UPDATE_MESSAGES = {check:'ozon:extension-version', openManager:'ozon:extension-manager'};
export const EXTENSION_UPDATE_INTERVAL = 10 * 60 * 1000;
export const EXTENSION_UPDATE_CACHE_TTL = 60 * 1000;

type UpdateMessages = typeof EXTENSION_UPDATE_MESSAGES;
type Update = {installed:string; latest:string};
type CheckResult = {ok:true; update:Update | null} | {ok:false};
type RuntimeMessage = {type:string};
type RuntimeSender = {id?:string; url?:string};
type Storage = {
  get:(key:string) => Promise<Record<string, unknown>>;
  set:(items:Record<string, unknown>) => Promise<void>;
};

// The factories are embedded in the extension scripts, so their runtime dependencies are passed in.
export function bindExtensionUpdateMessages(api:{
  runtime:{
    id:string;
    getManifest:()=>{version:string};
    onMessage:{addListener:(listener:(message:RuntimeMessage, sender:RuntimeSender, respond:(result:CheckResult | {ok:boolean})=>void) => boolean | undefined)=>void};
  };
  storage:{local:Storage};
  tabs:{create:(properties:{url:string})=>Promise<unknown>};
}, messages:UpdateMessages, metadataUrl:string, cacheTtl:number) {
  const cacheKey = 'ozonExtensionVersion';
  let pending:Promise<string> | undefined;

  function parseVersion(value:unknown) {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,4})(?:\.(?:0|[1-9]\d{0,4})){0,3}$/.test(value)) return null;
    const parts = value.split('.').map(Number);
    if (!parts.some(Boolean) || parts.some(part => part > 65535)) return null;
    return [0, 1, 2, 3].map(index => parts[index] ?? 0);
  }

  async function readReleaseVersion() {
    const stored = await api.storage.local.get(cacheKey).catch(() => ({}));
    const cached = (stored as Record<string, unknown>)[cacheKey] as {version:string; checkedAt:number} | undefined;
    const now = Date.now();
    if (cached && cached.checkedAt <= now && now - cached.checkedAt < cacheTtl && parseVersion(cached.version)) return cached.version;
    const response = await fetch(metadataUrl, {
      mode:'cors', credentials:'omit', referrerPolicy:'no-referrer',
      cache:'no-cache', redirect:'error', signal:AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error('Версия GitHub недоступна');
    const release = await response.json();
    if (!parseVersion(release?.version)) throw new Error('Неизвестный формат версии GitHub');
    const version = release.version as string;
    await api.storage.local.set({[cacheKey]:{version, checkedAt:Date.now()}}).catch(() => {});
    return version;
  }

  async function checkVersion():Promise<CheckResult> {
    const installed = api.runtime.getManifest().version;
    const installedParts = parseVersion(installed);
    if (!installedParts) return {ok:false};
    pending ??= readReleaseVersion().finally(() => { pending = undefined; });
    const latest = await pending;
    const latestParts = parseVersion(latest)!;
    const changed = latestParts.findIndex((part,index) => part !== installedParts[index]);
    const newer = changed >= 0 && latestParts[changed] > installedParts[changed];
    return {ok:true, update:newer ? {installed, latest} : null};
  }

  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== api.runtime.id || !/^https:\/\/jit\.o3\.ru\/secure\/RapidBoard\.jspa(?:[?#]|$)/.test(sender.url || '')) return;
    if (message?.type === messages.check) {
      checkVersion().then(respond, () => respond({ok:false}));
      return true;
    }
    if (message?.type === messages.openManager) {
      api.tabs.create({url:'chrome://extensions/'}).then(() => respond({ok:true}), () => respond({ok:false}));
      return true;
    }
  });
}

export function createExtensionUpdateNotice(runtime:{
  id?:string;
  sendMessage?:(message:RuntimeMessage)=>Promise<CheckResult | undefined>;
} | undefined, messages:UpdateMessages, zipUrl:string, interval:number) {
  let navigation:HTMLElement | null = null;
  let notice:HTMLDetailsElement | null = null;
  let started = false;
  let checkedAt = -Infinity;

  function attachNotice() {
    if (notice && navigation?.isConnected && navigation.nextElementSibling !== notice) navigation.after(notice);
  }

  function renderNotice(update:Update | null) {
    if (update && notice?.dataset.latest === update.latest && notice.dataset.installed === update.installed) return;
    notice?.remove();
    notice = null;
    if (!update) return;

    notice = document.createElement('details');
    notice.className = 'ozon-extension-update';
    notice.dataset.latest = update.latest;
    notice.dataset.installed = update.installed;
    notice.innerHTML =
      '<summary><span class="ozon-extension-update-versions"><strong></strong><span></span></span>' +
      '<span class="ozon-extension-update-guide">Как обновить<span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span></span></summary>' +
      '<div class="ozon-extension-update-content">' +
      '<ol><li>В папке установленного расширения запустите <code>update.bat</code> и дождитесь завершения.</li>' +
      '<li>На странице <code>chrome://extensions</code> нажмите значок перезагрузки на карточке «Ozon Structure».</li>' +
      '<li>Обновите вкладку Jira.</li></ol>' +
      '<div class="ozon-extension-update-actions"><button type="button" class="ozon-ext-btn ozon-ext-btn-surface">Открыть расширения Chrome</button>' +
      '<a target="_blank" rel="noopener noreferrer">Скачать ZIP</a><span role="status"></span></div>' +
      '<p>Если <code>update.bat</code> отсутствует, распакуйте ZIP в ту же папку с заменой файлов, затем выполните шаги 2 и 3.</p></div>';
    notice.querySelector('strong')!.textContent = 'Доступно обновление до ' + update.latest;
    notice.querySelector('.ozon-extension-update-versions > span')!.textContent = 'Установлена ' + update.installed;
    notice.querySelector('a')!.href = zipUrl;
    const status = notice.querySelector('[role="status"]')!;
    notice.querySelector('button')!.addEventListener('click', async () => {
      try {
        const result = await runtime?.sendMessage?.({type:messages.openManager});
        if (result?.ok) return;
      } catch { /* The address remains available in the instructions. */ }
      status.textContent = 'Откройте chrome://extensions/ через адресную строку.';
    });
    attachNotice();
  }

  async function check() {
    if (document.visibilityState !== 'visible' || Date.now() - checkedAt < interval) return;
    checkedAt = Date.now();
    try {
      const result = await runtime?.sendMessage?.({type:messages.check});
      if (result?.ok) renderNotice(result.update);
    } catch { /* The dashboard remains usable when GitHub is unavailable. */ }
  }

  return {
    bind(root:HTMLElement) {
      navigation = root.querySelector('.ozon-ext-view-tabs');
      attachNotice();
      if (started || !runtime?.id || !runtime.sendMessage) return;
      started = true;
      void check();
      document.addEventListener('visibilitychange', check);
      window.setInterval(check, interval);
    },
  };
}
