const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

// Only our formatting creates HTML; message text and link attributes stay escaped.
export function formatMessageWithLinks(text) {
  if (!text) return '';
  const tokens = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let html = '';
  let end = 0;
  for (const match of text.matchAll(tokens)) {
    html += escapeHtml(text.slice(end, match.index));
    if (match[3] !== undefined) {
      html += `<strong class="font-bold">${escapeHtml(match[3])}</strong>`;
    } else {
      let url;
      try { url = new URL(match[2]); } catch { /* Invalid links remain text. */ }
      html += url && ['https:', 'http:', 'mailto:'].includes(url.protocol)
        ? `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer" class="font-bold underline decoration-[3px] decoration-primary underline-offset-2">${escapeHtml(match[1])}</a>`
        : escapeHtml(match[0]);
    }
    end = match.index + match[0].length;
  }
  html += escapeHtml(text.slice(end));
  return html.replace(/\n/g, '<br>').replace(
    /(^|<br>)[-•][ \t]+(.+?)(?=<br>|$)/g,
    '$1<div class="flex gap-2 my-1"><span class="font-bold">•</span><span>$2</span></div>',
  );
}
