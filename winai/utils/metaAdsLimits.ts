/**
 * Limites conforme documentação Meta Ads API.
 * Primary text: até 2200 chars (125 visíveis sem "Ver mais").
 * Headline: 40 chars. Link description: 30 chars.
 */
export const META_LIMITS = {
  campaignName: { min: 1, max: 256 },
  adSetName: { min: 0, max: 256 },
  adName: { min: 0, max: 256 },
  primaryText: { min: 1, max: 2200 }, // message - 125 recomendado para mobile
  headline: { min: 0, max: 40 },
  linkDescription: { min: 0, max: 30 },
  destinationUrl: { min: 0, max: 2048 },
  whatsappPhone: { min: 10, max: 15 }, // dígitos (código país + número)
} as const;

/** Extrai apenas dígitos do telefone (para envio à API) */
export function parsePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Aplica máscara de telefone no input.
 * Brasil: (11) 99999-9999 | Com país: +55 (11) 99999-9999
 * Máx 15 dígitos (E.164).
 */
export function maskPhoneInput(value: string, maxDigits = 15): string {
  const digits = value.replace(/\D/g, '').slice(0, maxDigits);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  // Com código país (ex: 55) - 12 a 15 dígitos
  const cc = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  const num = digits.slice(4, 9);
  const suf = digits.slice(9);
  return `+${cc} (${ddd}) ${num}-${suf}`;
}

/**
 * Extrai mensagem amigável de erros da API (evita mostrar JSON bruto da Meta).
 * Prioridade: error_user_msg > error_user_title > message.
 */
export function parseApiErrorMessage(raw: unknown): string {
  if (raw == null) return 'Erro desconhecido';
  if (typeof raw === 'object' && raw !== null && 'message' in raw) {
    const m = (raw as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return parseApiErrorMessage(m);
  }
  const str = typeof raw === 'string' ? raw : String(raw);
  if (!str || str === '[object Object]') return 'Erro desconhecido';
  if (str.length > 500) return str.slice(0, 200) + '...';
  try {
    if (str.trim().startsWith('{')) {
      const obj = JSON.parse(str);
      const err = obj?.error;
      if (err && typeof err === 'object') {
        const msg = err.error_user_msg || err.error_user_title || err.message;
        if (typeof msg === 'string' && msg.trim()) return msg;
      }
    }
  } catch {
    /* não é JSON válido */
  }
  return str;
}
