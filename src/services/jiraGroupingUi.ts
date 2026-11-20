// Serialized into the extension runtime.
export function createJiraGroupingUi() {
  const escape = (value:string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function html(id:string, order:string[], labels:Record<string,string>, checkboxAttribute='', options?:{hidden?:string[];locked?:string[]}) {
    const fields = [...order,...Object.keys(labels).filter(key=>!order.includes(key))];
    const movable=order.filter(key=>!options?.locked?.includes(key));
    const grouping=Boolean(checkboxAttribute && !options);
    return '<div class="ozon-grouping-order" data-jira-grouping="' + id + '"><p>' + (grouping ? 'Перетащите выбранные уровни' : 'Перетащите столбцы') + ' или используйте стрелки.</p>' + fields.map(key=>{
      const title = escape(labels[key]);
      const index=movable.indexOf(key);
      const enabled=index>=0;
      const locked=options?.locked?.includes(key);
      const field=checkboxAttribute ? '<label><input type="checkbox" ' + checkboxAttribute + '="' + escape(key) + '"' + ((grouping ? order.includes(key) : !options?.hidden?.includes(key)) ? ' checked' : '') + (locked ? ' disabled' : '') + '><span>' + title + '</span></label>' : '<span class="ozon-grouping-title">' + title + '</span>';
      const step = (delta:number,description:string,disabled:boolean) => '<button type="button" class="ozon-grouping-step" data-group-step="' + delta + '" aria-label="' + description + ' ' + title + '"' + (disabled ? ' disabled' : '') + '>' + (delta<0 ? '↑' : '↓') + '</button>';
      return '<div class="ozon-grouping-level" data-group-level="' + escape(key) + '"' + (enabled ? ' data-group-enabled' : '') + '>' +
        (enabled ? '<button type="button" class="ozon-grouping-grip" data-group-grip aria-label="Переместить ' + title + '" title="Перетащите или нажмите ↑ / ↓">' : '<span class="ozon-grouping-grip" aria-hidden="true">') +
        '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M5 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2m6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2m-6 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2m6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2m-6 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2m6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/></svg>' + (enabled ? '</button>' : '</span>') +
        field + (enabled ? step(-1,'Поднять',index===0) + step(1,'Опустить',index===movable.length-1) : '') + '</div>';
    }).join('') + '</div>';
  }

  function bind(root:HTMLElement,onChange:(order:string[],listId:string)=>void) {
    root.querySelectorAll<HTMLElement>('[data-jira-grouping]').forEach(list=>{
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-group-enabled]'));
      const listId = list.dataset.jiraGrouping!;
      const reorder = (from:number,to:number) => {
        if (from===to || to<0 || to>=rows.length) return;
        const order = rows.map(row=>row.dataset.groupLevel!);
        const [key] = order.splice(from,1);
        order.splice(to,0,key);
        onChange(order,listId);
        const updated = Array.from(root.querySelectorAll<HTMLElement>('[data-jira-grouping]')).find(item=>item.dataset.jiraGrouping===listId);
        Array.from(updated?.querySelectorAll<HTMLElement>('[data-group-level]') || []).find(row=>row.dataset.groupLevel===key)?.querySelector<HTMLElement>('[data-group-grip]')?.focus({preventScroll:true});
      };

      rows.forEach((row,from)=>{
        const grip = row.querySelector<HTMLButtonElement>('[data-group-grip]')!;
        row.querySelectorAll<HTMLElement>('[data-group-step]').forEach(button=>button.addEventListener('click',()=>reorder(from,from+Number(button.dataset.groupStep))));
        grip.addEventListener('keydown',event=>{
          if (event.key!=='ArrowUp' && event.key!=='ArrowDown') return;
          event.preventDefault();
          reorder(from,from+(event.key==='ArrowUp' ? -1 : 1));
        });
        let drag: {id:number;start:number;listTop:number;tops:number[];mids:number[];to:number} | null = null;
        grip.addEventListener('pointerdown',event=>{
          if (event.button!==0 || rows.length<2 || drag) return;
          const rects = rows.map(level=>level.getBoundingClientRect());
          drag = {id:event.pointerId,start:event.clientY,listTop:list.getBoundingClientRect().top,tops:rects.map(rect=>rect.top),mids:rects.map(rect=>rect.top+rect.height/2),to:from};
          grip.setPointerCapture(event.pointerId);
        });
        grip.addEventListener('pointermove',event=>{
          if (!drag || drag.id!==event.pointerId) return;
          const scroller=list.closest('aside');
          const area=scroller?.getBoundingClientRect();
          if (area && scroller && scroller.scrollHeight>scroller.clientHeight) {
            if (event.clientY<area.top+30) scroller.scrollTop-=14;
            else if (event.clientY>area.bottom-30) scroller.scrollTop+=14;
          }
          const delta = event.clientY-drag.start+drag.listTop-list.getBoundingClientRect().top;
          if (!row.classList.contains('is-dragging') && Math.abs(delta)<4) return;
          row.classList.add('is-dragging');
          const center = drag.mids[from]+delta;
          const closest = drag.mids.findIndex(mid=>mid>center);
          drag.to = delta>0 ? (closest<0 ? rows.length-1 : closest-1) : Math.min(from,closest<0 ? rows.length-1 : closest);
          rows.forEach((level,index)=>{
            const next = index===from ? index : index>from && index<=drag!.to ? index-1 : index<from && index>=drag!.to ? index+1 : index;
            level.style.setProperty('--group-shift',(index===from ? delta : drag!.tops[next]-drag!.tops[index]) + 'px');
          });
        });
        const end = (event:PointerEvent,apply=false) => {
          if (!drag || drag.id!==event.pointerId) return;
          const {to} = drag;
          drag = null;
          row.classList.remove('is-dragging');
          rows.forEach(level=>level.style.removeProperty('--group-shift'));
          if (apply) reorder(from,to);
        };
        grip.addEventListener('pointerup',event=>end(event,true));
        grip.addEventListener('pointercancel',end);
        grip.addEventListener('lostpointercapture',end);
      });
    });
  }

  function depthHtml(id:string,levels:{value:string;label:string}[],selected:string,disabled=false) {
    const options=levels.some(level=>level.value===selected) ? levels : [{value:selected,label:'Вручную'},...levels];
    return '<label class="ozon-depth-control"><span>Раскрыть до</span><select data-table-depth="' + id + '" aria-label="Раскрыть до уровня"' + (disabled ? ' disabled' : '') + '>' + options.map(level=>'<option value="' + escape(level.value) + '"' + (level.value===selected ? ' selected' : '') + '>' + escape(level.label) + '</option>').join('') + '</select></label>';
  }

  function bindDepth(root:HTMLElement,change:(value:string)=>void) {
    root.querySelectorAll<HTMLSelectElement>('[data-table-depth]').forEach(select=>select.addEventListener('change',()=>{
      const id=select.dataset.tableDepth;
      change(select.value);
      root.querySelector<HTMLElement>('[data-table-depth="' + id + '"]')?.focus({preventScroll:true});
    }));
  }

  return {html,bind,depthHtml,bindDepth};
}
