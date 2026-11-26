// Serialized into content.js. Comment requests belong to the current sidebar.
export function createTaskDetailsSidebar(parts: {
  html:()=>string;
  bindEvents:(root:any)=>void;
  bindSearch:(root:any)=>void;
  bindControls:(root:any)=>void;
  enhance:(root:any)=>void;
  afterBind?:(root:any)=>void;
  escape:(value:string)=>string;
  commentAuthor:(author:unknown)=>string;
  commentBody:(body:string)=>string;
  formatDate:(iso:string)=>string;
}) {
  type Comment = {id:string; author?:unknown; body:string; created:string};
  type CommentState = {
    key:string;
    open:boolean;
    total:number | null;
    offset:number;
    items:Map<string,Comment>;
    error:boolean;
    request?:AbortController;
    element?:HTMLDetailsElement;
  };
  let comments:CommentState | undefined;

  function resetComments(key?:string, open = false) {
    comments?.request?.abort();
    comments = key ? {key,open,total:null,offset:0,items:new Map(),error:false} : undefined;
  }

  function commentsHtml(key:string) {
    if (comments?.key !== key) resetComments(key);
    const open = comments?.element?.open ?? comments?.open;
    return '<details class="ozon-ext-section-card ozon-sb-comments"' + (open ? ' open' : '') + '>' +
      '<summary class="ozon-ext-section-head"><span class="ozon-sb-comments-heading">' +
      '<span class="ozon-ext-toolbar-chevron" aria-hidden="true"></span>Комментарии<span data-comments-count></span></span></summary>' +
      '<div class="ozon-sb-comments-content" data-comments-content></div></details>';
  }

  function renderComments(state:CommentState) {
    const element = state.element;
    if (!element?.isConnected || comments !== state) return;
    const count = element.querySelector('[data-comments-count]')!;
    count.textContent = state.total === null ? '' : ' (' + state.total + ')';
    const content = element.querySelector('[data-comments-content]')!;
    const focused = content.querySelector('[data-comments-next]') === element.ownerDocument.activeElement;
    const rows = Array.from(state.items.values(), comment =>
      '<li><div class="ozon-sb-comment-meta"><span class="ozon-person-line">' + parts.commentAuthor(comment.author) +
      '</span><time datetime="' + parts.escape(comment.created) + '">' + parts.escape(parts.formatDate(comment.created)) + '</time></div>' +
      '<div class="ozon-sb-comment-body">' + parts.commentBody(comment.body || '') + '</div></li>'
    ).join('');
    const message = state.error ? '<p role="alert">Не удалось загрузить комментарии из Jira.</p>' :
      state.total === 0 ? '<p>Комментариев пока нет.</p>' : '';
    const loading = state.request ? '<span role="status" class="ozon-sb-comments-loading"><span class="ozon-ext-spinner" aria-hidden="true"></span>Загрузка комментариев…</span>' : '';
    const showAction = state.error || (state.total !== null && state.offset < state.total);
    const action = showAction ? '<button type="button" class="ozon-ext-btn ozon-ext-btn-surface" data-comments-next' +
      (state.request ? ' aria-disabled="true"' : '') + '>' + (state.error ? 'Повторить' : 'Показать ещё') + '</button>' : '';
    content.innerHTML = (rows ? '<ul class="ozon-sb-comment-list">' + rows + '</ul>' : '') + message + loading + action;
    if (focused) (content.querySelector<HTMLElement>('[data-comments-next]') || element.querySelector('summary'))?.focus({preventScroll:true});
  }

  async function loadComments(state:CommentState) {
    if (state.request) return;
    const controller = new AbortController();
    state.request = controller;
    renderComments(state);
    try {
      const params = new URLSearchParams({startAt:String(state.offset),maxResults:'20',orderBy:'-created'});
      const response = await fetch('/rest/api/2/issue/' + encodeURIComponent(state.key) + '/comment?' + params, {
        credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json'}, signal:controller.signal,
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.comments) || !Number.isInteger(data.total) || data.total < 0 ||
          (data.startAt != null && data.startAt !== state.offset) || (!data.comments.length && state.offset < data.total)) {
        throw new Error('Unexpected Jira comment page');
      }
      for (const comment of data.comments) state.items.set(String(comment.id),comment);
      state.offset += data.comments.length;
      state.total = data.total;
      state.error = false;
    } catch {
      if (!controller.signal.aborted) state.error = true;
    } finally {
      state.request = undefined;
      renderComments(state);
    }
  }

  function bindComments(panel:HTMLElement) {
    const state = comments;
    const section = panel.querySelector<HTMLDetailsElement>('.ozon-sb-comments');
    if (!state || !section) return;
    state.element = section;
    function onToggle() {
      if (state.element !== section || comments !== state || !section?.isConnected) return;
      state.open = section.open;
      if (state.open && state.total === null && !state.error) void loadComments(state);
    }
    section.addEventListener('toggle',onToggle);
    section.addEventListener('click',event => {
      if (state.element === section && comments === state && (event.target as Element)?.closest('[data-comments-next]')) {
        void loadComments(state);
      }
    });
    renderComments(state);
    onToggle();
  }

  return {
    html() {
      const html = parts.html();
      if (!html) resetComments();
      return html;
    },
    commentsHtml,
    refreshComments() {
      if (comments) resetComments(comments.key,comments.element?.open ?? comments.open);
    },
    bind(root:any) {
      // The table and sidebar controls are replaced on each render, even when
      // the surrounding dashboard remains mounted.
      parts.bindControls(root);
      const panel = root.querySelector('#ozon-ext-sidebar-panel');
      if (!panel) return;
      // Product view keeps the aside but replaces its contents. Bind the new DOM generation.
      const content=panel.firstElementChild;
      if(!content || content.dataset.detailsBound === 'true')return;
      content.dataset.detailsBound='true';
      parts.enhance(root);
      parts.bindEvents(root);
      parts.bindSearch(root);
      bindComments(panel);
      parts.afterBind?.(root);
    }
  };
}
