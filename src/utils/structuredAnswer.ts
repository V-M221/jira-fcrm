// Embedded into both extension scripts. Keep this function self-contained.
export function structuredAnswer(source: string, kind = 'result', markup?: (content: string, numberedList?: boolean) => string): string {
  const text = String(source || '');
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const read = (tag: string) => Array.from(text.matchAll(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'gi'))).map(match => match[1].trim()).filter(Boolean).join('\n\n');
  const headingStyle = 'display:block;padding:9px 12px;border-left:3px solid #005bff;border-radius:5px;background:rgba(0,150,255,.1);font-size:15px;font-weight:700;line-height:1.4;';
  const body = (content: string, numberedList = false) => markup ? markup(content, numberedList) : escape(content);
  const section = (title: string, content: string, collapsed = false, numberedList = false) => !content ? '' : collapsed
    ? '<details style="margin:18px 0;"><summary style="' + headingStyle + 'cursor:pointer;">' + title + '</summary><div style="white-space:pre-wrap;margin-top:10px;">' + body(content) + '</div></details>'
    : '<section style="margin:18px 0;"><strong style="' + headingStyle + '">' + title + '</strong><div style="white-space:pre-wrap;margin-top:10px;">' + body(content, numberedList) + '</div></section>';
  const created = /^FCRM-[0-9]+$/i.exec(read('created_issue'))?.[0];
  if (kind === 'thread') {
    const issueTitle = read('created_issue_title');
    const issue = created ? '<a target="_blank" rel="noopener noreferrer" style="color:#005bff;font-weight:700;" href="/browse/' + encodeURIComponent(created) + '">' + escape(created) + '</a>' + (issueTitle ? ' — ' + escape(issueTitle) : '') : '';
    const issueSection = issue ? '<section style="margin:16px 0;"><strong style="' + headingStyle + '">Созданная задача</strong><div style="margin-top:8px;">' + issue + '</div></section>' : '';
    return issueSection + section('Описание', read('result_description') || read('result_summary')) + section('Связи', read('result_links')) + section('Ошибки', read('result_errors')) || section('Итог', text);
  }
  let html = created ? '<section style="margin:18px 0;"><strong style="' + headingStyle + '">Созданная задача</strong><div style="margin-top:10px;"><a target="_blank" rel="noopener noreferrer" style="color:#459bff;font-weight:700;font-size:15px;" href="/browse/' + encodeURIComponent(created) + '">' + escape(created) + '</a></div></section>' : '';
  html += section('Предложенное название', read('jira_summary'));
  html += section(kind === 'description' ? 'Черновик описания' : 'Описание', read('jira_description'));
  if (kind === 'description') return html + section('Что требует уточнения', read('jira_notes'), false, true) || section('Итог', 'DeepSeek не вернул черновик');
  const summary = read('result_summary');
  const details = read('result_details');
  html += section(kind === 'links' ? 'Краткий итог' : 'Итог', summary);
  html += section('Детальный итог', details);
  html += section('Ошибки', read('result_errors'));
  html += section('Предложения и вопросы', read('jira_notes'));
  html += section('Рассуждения', read('result_reasoning'), true);
  const remainder = text.replace(/<(created_issue|jira_summary|jira_description|jira_notes|result_summary|result_details|result_errors|result_reasoning)>[\s\S]*?<\/\1>/gi, '').trim();
  if (remainder) html += section(html ? 'Дополнительный ответ' : 'Итог', remainder);
  return html || section('Итог', 'DeepSeek не вернул содержательный ответ');
}
