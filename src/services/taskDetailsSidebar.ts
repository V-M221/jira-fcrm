// One lifecycle for FCRM details in both dashboards; serialized into content.js.
export function createTaskDetailsSidebar(parts: {html:()=>string;bindEvents:(root:any)=>void;bindSearch:(root:any)=>void;bindControls:(root:any)=>void;enhance:(root:any)=>void;afterBind?:(root:any)=>void}) {
  return {
    html: () => parts.html(),
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
      parts.afterBind?.(root);
    }
  };
}
