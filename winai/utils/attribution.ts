/**
 * Atribuição UTM + click ids a partir da query da URL (sem persistência no cliente).
 * Envio ao backend via API; persistência apenas no banco.
 */

import type { RegisterAttribution } from '../services/types';

function trimOrUndef(v: string | null): string | undefined {
  if (v == null) return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function hasAnyTracking(s: Partial<RegisterAttribution>): boolean {
  return !!(
    s.utmSource ||
    s.utmMedium ||
    s.utmCampaign ||
    s.utmContent ||
    s.utmTerm ||
    s.gclid ||
    s.fbclid ||
    s.msclkid
  );
}

/** Indica se a query string pode conter dados de campanha. */
export function searchHasTrackingParams(search: string): boolean {
  if (!search || search === '?') return false;
  const q = search.startsWith('?') ? search.slice(1) : search;
  const lower = q.toLowerCase();
  return (
    lower.includes('utm_') ||
    lower.includes('gclid=') ||
    lower.includes('fbclid=') ||
    lower.includes('msclkid=')
  );
}

/** Extrai campos a partir de ?a=b (search tipicamente location.search). */
export function parseSearchToAttributionFields(search: string): Partial<RegisterAttribution> | null {
  if (!search) return null;
  const qs = search.startsWith('?') ? search : `?${search}`;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(qs);
  } catch {
    return null;
  }
  const snap: Partial<RegisterAttribution> = {
    utmSource: trimOrUndef(params.get('utm_source')),
    utmMedium: trimOrUndef(params.get('utm_medium')),
    utmCampaign: trimOrUndef(params.get('utm_campaign')),
    utmContent: trimOrUndef(params.get('utm_content')),
    utmTerm: trimOrUndef(params.get('utm_term')),
    gclid: trimOrUndef(params.get('gclid')),
    fbclid: trimOrUndef(params.get('fbclid')),
    msclkid: trimOrUndef(params.get('msclkid')),
  };
  return hasAnyTracking(snap) ? snap : null;
}

/** Payload para POST /auth/register (null se não houver params na URL). */
export function attributionPayloadFromSearch(search: string): RegisterAttribution | null {
  const fields = parseSearchToAttributionFields(search);
  if (!fields) return null;
  return {
    ...fields,
    capturedAt: new Date().toISOString(),
  };
}

/** Campos opcionais para criar lead (mesma origem que a URL atual). */
export function leadAttributionFieldsFromSearch(search: string): Partial<{
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  gclid: string;
  fbclid: string;
}> {
  const fields = parseSearchToAttributionFields(search);
  if (!fields) return {};
  return {
    utmSource: fields.utmSource,
    utmMedium: fields.utmMedium,
    utmCampaign: fields.utmCampaign,
    utmContent: fields.utmContent,
    utmTerm: fields.utmTerm,
    gclid: fields.gclid,
    fbclid: fields.fbclid,
  };
}

/** Linha única ?utm_...&gclid=... para o backend parsear (ex.: wa.me sem texto extra). */
export function buildAttributionQueryLineFromSearch(search: string): string {
  const fields = parseSearchToAttributionFields(search);
  if (!fields) return '';

  const pairs: string[] = [];
  const add = (k: string, v?: string) => {
    if (v) pairs.push(`${k}=${encodeURIComponent(v)}`);
  };
  add('utm_source', fields.utmSource);
  add('utm_medium', fields.utmMedium);
  add('utm_campaign', fields.utmCampaign);
  add('utm_content', fields.utmContent);
  add('utm_term', fields.utmTerm);
  add('gclid', fields.gclid);
  add('fbclid', fields.fbclid);
  add('msclkid', fields.msclkid);

  if (pairs.length === 0) return '';
  return `?${pairs.join('&')}`;
}

/**
 * Anexa query ao texto (ex.: WhatsApp) para o backend parsear com UtmParseUtil.
 * @param search ex.: location.search na página onde o usuário clica
 */
export function appendAttributionQueryToText(text: string, search: string): string {
  const line = buildAttributionQueryLineFromSearch(search);
  if (!line) return text;
  const prefix = text.trim();
  if (!prefix) return line;
  return `${prefix}\n\n${line}`;
}
