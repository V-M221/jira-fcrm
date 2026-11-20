// Also embedded in the extension content script. Keep all helpers local.
export function answerMarkup(source: string): string {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (value: string) => value.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\[[^\]\n]+\|https?:\/\/[^\s\]]+\]|https?:\/\/[^\s<>]+|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/gi).map(part => {
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i.exec(part) || /^\[([^\]|\n]+)\|(https?:\/\/[^\s\]]+)\]$/i.exec(part);
    if (link || /^https?:\/\//i.test(part)) {
      return '<a target="_blank" rel="noopener noreferrer" href="' + escape(link ? link[2] : part) + '">' + escape(link ? link[1] : part) + '</a>';
    }
    if (part.startsWith('**') && part.endsWith('**')) return '<strong>' + escape(part.slice(2, -2)) + '</strong>';
    if (part.startsWith('*') && part.endsWith('*')) return '<strong>' + escape(part.slice(1, -1)) + '</strong>';
    if (part.startsWith('`') && part.endsWith('`')) return '<code>' + escape(part.slice(1, -1)) + '</code>';
    return escape(part);
  }).join('');
  const blocks: string[] = [];
  const jiraWiki = /^h[1-6]\.\s/m.test(source);
  let list = '';
  for (const line of source.split(/\r?\n/)) {
    const candidate = /^\s*(?:([-*#])|\d+[.)])\s+(.+)/.exec(line);
    const item = candidate && (candidate[1] !== '#' || jiraWiki) ? candidate : null;
    const next = item ? (item[1] && item[1] !== '#' ? 'ul' : 'ol') : '';
    if (next !== list) {
      if (list) blocks.push('</' + list + '>');
      if (next) blocks.push('<' + next + '>');
      list = next;
    }
    if (item) blocks.push('<li>' + inline(item[2]) + '</li>');
    else if (line.trim()) {
      const heading = /^(?:#{1,6}\s+(.+)|\*\*(.+)\*\*|h[1-6]\.\s+(.+))$/.exec(line.trim());
      blocks.push(heading ? '<h3>' + inline(heading[1] || heading[2] || heading[3]) + '</h3>' : '<p>' + inline(line) + '</p>');
    }
  }
  if (list) blocks.push('</' + list + '>');
  return blocks.join('');
}
