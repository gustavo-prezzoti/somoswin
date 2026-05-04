/**
 * TAG [ref=…] para rastreio de campanha — alinhado ao padrão UTM gerado em UtmAdTrackingModal:
 * utm_source → canal, utm_campaign → campanha, utm_term → conjunto, utm_content → anúncio.
 */

export type LeadTrackingFields = {
  trackSource?: string | null;
  trackId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
};

function trimOrEmpty(v: string | null | undefined): string {
  if (v == null) return '';
  const t = v.trim();
  return t.length > 0 ? t : '';
}

/** Legenda curta do canal a partir de utm_source (ex.: instagram → IG). */
export function shortCanalFromUtmSource(utmSource: string | null | undefined): string {
  const s = trimOrEmpty(utmSource).toLowerCase();
  if (!s) return '';
  if (s.includes('google')) return 'GG';
  if (s.includes('instagram')) return 'IG';
  if (s.includes('facebook') || s === 'fb' || s.includes('fb_') || s.includes('meta')) return 'FB';
  if (utmSource!.trim().length <= 4) return utmSource!.trim().toUpperCase();
  return utmSource!.trim().slice(0, 3).toUpperCase();
}

/** Remove envoltório [ref=…] se já existir; retorna só o corpo. */
export function stripRefBrackets(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^\[ref=([^\]]+)]$/i);
  if (m) return m[1].trim();
  if (t.toLowerCase().startsWith('ref=')) return t.slice(4).replace(/\]$/, '').trim();
  return t;
}

/**
 * Corpo do código (sem colchetes), ex.: IG-P1-04-04.
 * Prioriza track_source / track_id gravados no lead; senão monta a partir dos UTMs.
 */
export function buildLeadRefBody(lead: LeadTrackingFields): string | null {
  const ts = trimOrEmpty(lead.trackSource);
  if (ts) return stripRefBrackets(ts);

  const tid = trimOrEmpty(lead.trackId);
  if (tid) return stripRefBrackets(tid);

  const canal = shortCanalFromUtmSource(lead.utmSource);
  const camp = trimOrEmpty(lead.utmCampaign);
  const conjunto = trimOrEmpty(lead.utmTerm);
  const anuncio = trimOrEmpty(lead.utmContent);

  const parts = [canal, camp, conjunto, anuncio].filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  return parts.join('-');
}

/** Ex.: [ref=IG-P1-04-04] ou null se não houver dados. */
export function formatLeadRefBracketTag(lead: LeadTrackingFields): string | null {
  const body = buildLeadRefBody(lead);
  if (!body) return null;
  return `[ref=${body}]`;
}

/** Texto para title / aria: decodifica UTMs quando existem. */
export function leadTrackingRefDetailTitle(lead: LeadTrackingFields): string {
  const showSrc = trimOrEmpty(lead.utmSource) || '—';
  const showCamp = trimOrEmpty(lead.utmCampaign) || '—';
  const showConj = trimOrEmpty(lead.utmTerm) || '—';
  const showAd = trimOrEmpty(lead.utmContent) || '—';
  return `Código de rastreio — Canal: ${showSrc} · Campanha: ${showCamp} · Conjunto de anúncio: ${showConj} · Anúncio: ${showAd}`;
}
