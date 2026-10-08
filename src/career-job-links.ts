/** Public links only; email content cannot become executable URLs. */
export function safeCareerLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (/^(localhost|127\.|\[?::1\]?)/i.test(url.hostname)) return undefined;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|trackingId$|trk$|refId$|lipi$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString();
  } catch { return undefined; }
}
export function careerLinkFromText(text: string): string | undefined {
  const urls = text.match(/https:\/\/[^\s<>"']+/gi) ?? [];
  for (const raw of urls) {
    const link = safeCareerLink(raw.replace(/[.,;)]+$/, '').replace(/&amp;/g, '&'));
    if (link && /\/(jobs?|careers?|apply|vagas?|positions?|oportunidades?)(\/|\?|$)/i.test(new URL(link).pathname)) return link;
  }
  return undefined;
}
