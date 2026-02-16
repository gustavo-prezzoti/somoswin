/**
 * Extrai mensagem amigável de erros da API para exibição em toasts/alerts.
 * Suporta: ApiError, Error, respostas com errors[], e mensagens com JSON embutido (Asaas, etc).
 */

import { ApiError } from '../api/http-client';

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
    // fallback: regex para "description":"..."
    const m = msg.match(/"description"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Retorna a melhor mensagem para exibir ao usuário a partir de qualquer erro.
 * @param error - Erro capturado (ApiError, Error, unknown)
 * @param fallback - Mensagem padrão se não conseguir extrair
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
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    raw = (error as { message: string }).message;
    data = 'data' in error ? (error as { data: unknown }).data : null;
  }

  if (!raw || typeof raw !== 'string') return fallback;

  // 1) Se data tem errors[] (ex: validação do backend)
  if (data && typeof data === 'object' && 'errors' in data) {
    const errs = (data as { errors: unknown }).errors;
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

  // 2) Se data tem message
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }

  // 3) Se raw contém JSON embutido (ex: "Erro ao criar: {"errors":[...]}")
  const extracted = extractFromJsonInMessage(raw);
  if (extracted) return extracted;

  // 4) Usar raw se for curta e legível
  if (raw.length <= 200 && !raw.includes('{')) return raw;

  return fallback;
}
