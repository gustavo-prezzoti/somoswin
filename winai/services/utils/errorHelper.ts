/**
 * Extrai mensagem amigável de erros da API para exibição em toasts/alerts no admin.
 * Suporta: ApiError, Error, respostas com message/errors, e JSON embutido (Asaas, Meta).
 */

import { ApiError } from '../api/http-client';

function isApiErrorLike(e: unknown): e is { message: string; data?: unknown } {
  return e != null && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string';
}

function extractFromJsonInMessage(msg: string): string | null {
  if (!msg || typeof msg !== 'string') return null;
  const start = msg.indexOf('{"errors"');
  if (start < 0) return null;
  try {
    let depth = 0;
    let end = -1;
    for (let i = start; i < msg.length; i++) {
      const c = msg[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) return null;
    const json = msg.substring(start, end + 1);
    const parsed = JSON.parse(json);
    const errors = parsed?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const desc = errors[0]?.description;
      if (desc && typeof desc === 'string') return desc;
    }
    const desc = parsed?.error?.description;
    if (desc && typeof desc === 'string') return desc;
  } catch {
    const m = msg.match(/"description"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Retorna a melhor mensagem para exibir ao usuário a partir de qualquer erro.
 * Usar em todos os catch do admin para mostrar o erro real retornado pela API.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro. Tente novamente.'
): string {
  if (error == null) return fallback;

  let raw = '';
  let data: unknown = null;

  if (error instanceof ApiError) {
    raw = error.message;
    data = error.data;
  } else if (isApiErrorLike(error)) {
    raw = error.message;
    data = 'data' in error ? (error as { data: unknown }).data : null;
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    raw = (error as { message: string }).message;
    data = 'data' in error ? (error as { data: unknown }).data : null;
  }

  // 0) Qualquer objeto com data.message (ex: ApiError após serialização entre módulos)
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }

  // 1) raw já pode conter a mensagem extraída pelo http-client
  if (raw && typeof raw === 'string' && raw.trim() && raw.length <= 300 && !raw.startsWith('{')) {
    return raw;
  }

  // 2) Prioridade: data.message (resposta padronizada do backend) - redundante com 0
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }

  // 2) data.errors como objeto { campo: mensagem }
  if (data && typeof data === 'object' && 'errors' in data) {
    const errs = (data as { errors: unknown }).errors;
    if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
      const firstVal = Object.values(errs)[0];
      if (typeof firstVal === 'string' && firstVal) return firstVal;
    }
    if (Array.isArray(errs) && errs.length > 0) {
      const first = errs[0];
      if (first && typeof first === 'object' && 'description' in first) {
        const d = (first as { description: unknown }).description;
        if (typeof d === 'string' && d) return d;
      }
      if (first && typeof first === 'object' && 'defaultMessage' in first) {
        const d = (first as { defaultMessage: unknown }).defaultMessage;
        if (typeof d === 'string' && d) return d;
      }
    }
  }

  // 3) raw (message do ApiError/Error) - já vem extraído pelo http-client
  if (raw && typeof raw === 'string' && raw.trim()) {
    const extracted = extractFromJsonInMessage(raw);
    if (extracted) return extracted;
    // Mensagem direta da API (ex: "Esta empresa já possui uma conexão com esta instância")
    if (raw.length <= 300 && !raw.startsWith('{')) return raw;
  }

  return fallback;
}
