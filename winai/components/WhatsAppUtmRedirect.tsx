import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildAttributionQueryLineFromSearch } from '../utils/attribution';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** Fallback só para ambiente local sem empresa; produção multi-tenant: use ?c=UUID da empresa. */
const FALLBACK_WHATSAPP_DIGITS = String(import.meta.env.VITE_LANDING_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

function extractCompanyId(search: string): string | null {
  if (!search || search === '?') return null;
  const qs = search.startsWith('?') ? search : `?${search}`;
  const params = new URLSearchParams(qs);
  return params.get('c') || params.get('companyId');
}

/** Query sem parâmetros internos de tenant e sem prefill (só atribuição). */
function searchForAttribution(search: string): string {
  if (!search || search === '?') return '';
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const p = new URLSearchParams(raw);
  p.delete('c');
  p.delete('companyId');
  p.delete('m');
  const s = p.toString();
  return s ? `?${s}` : '';
}

/**
 * Rota /w — ex.: https://dominio.com/w?c={companyId}&utm_...&m={mensagem}
 * Com `m=`, o texto enviado ao WhatsApp é só a mensagem legível (sem linha ?utm_ no chat).
 * UTMs na query do /w/ servem para o link gerado no app; a gravação no lead usa âncora semântica + primeira mensagem.
 * Sem `m=`, mantém o comportamento antigo: só a linha ?utm_... no texto (links legados).
 */
const WhatsAppUtmRedirect: React.FC = () => {
  const { search } = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const companyId = extractCompanyId(search || '');
      const rawQs =
        search && search !== '?' ? (search.startsWith('?') ? search.slice(1) : search) : '';
      const bootstrapParams = new URLSearchParams(rawQs);
      const prefillRaw = bootstrapParams.get('m');
      const prefillMessage = prefillRaw != null ? prefillRaw.trim() : '';

      const attrSearch = searchForAttribution(search || '');
      const message =
        prefillMessage.length > 0
          ? prefillMessage
          : buildAttributionQueryLineFromSearch(attrSearch);

      let digits = '';
      let apiUnreachable = false;
      if (companyId) {
        try {
          const res = await fetch(
            `${API_BASE}/public/landing-whatsapp?companyId=${encodeURIComponent(companyId)}`
          );
          if (res.ok) {
            const data = (await res.json()) as { whatsappNumber?: string };
            digits = (data.whatsappNumber || '').replace(/\D/g, '');
          } else {
            apiUnreachable = true;
          }
        } catch {
          apiUnreachable = true;
        }
      }
      if (!digits && FALLBACK_WHATSAPP_DIGITS.length >= 10) {
        digits = FALLBACK_WHATSAPP_DIGITS;
      }
      if (cancelled) return;
      if (!digits) {
        if (companyId && apiUnreachable) {
          setError(
            'Não foi possível obter o WhatsApp no servidor. Confirme o deploy do backend (rota GET /api/v1/public/landing-whatsapp) e o valor de VITE_API_URL no front.'
          );
        } else if (companyId) {
          setError(
            'WhatsApp não configurado para esta empresa. Preencha o WhatsApp no cadastro da empresa ou conecte uma instância UAZAP com número visível na API.'
          );
        } else {
          setError(
            'Falta o identificador da empresa na URL (?c=...). Use o link gerado no app em Campanhas.'
          );
        }
        return;
      }
      window.location.replace(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [search]);

  if (!error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 font-['Inter'] bg-white text-gray-500 text-sm font-medium">
        <div
          className="h-10 w-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
        <p>Abrindo WhatsApp…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center font-['Inter'] bg-gray-50">
      <p className="text-gray-700 font-medium max-w-md">{error}</p>
      <Link
        to="/"
        className="text-emerald-600 font-black text-sm uppercase tracking-wider hover:underline"
      >
        Ir ao início
      </Link>
    </div>
  );
};

export default WhatsAppUtmRedirect;
