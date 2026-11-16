// A tiny, safe Markdown renderer for the API's description and rules text.
//
// The input is escaped first, in full; the transforms below then run on the escaped
// text and only ever emit tags of their own, so no markup from the API can reach the
// page. Links are honoured only to https://make.fun itself; anything else is left as
// plain text. Headings, paragraphs, bullet and numbered lists, bold, italics and
// inline code are covered — the shapes the API's texts actually use.

import { esc } from './format.js';

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https:\/\/make\.fun[^)\s]*)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

/** Render Markdown text to an HTML string. */
export function md(source) {
  const lines = esc(source).split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol' | null
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        list = kind;
        out.push(`<${kind}>`);
      }
      out.push(`<li>${inline((bullet ?? numbered)[1])}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}
