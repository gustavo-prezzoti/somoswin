import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { appendAttributionQueryToText } from '../utils/attribution';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/** Fallback só para ambiente local sem empresa; produção multi-tenant: use ?c=UUID da empresa. */
const FALLBACK_WHATSAPP_DIGITS = String(import.meta.env.VITE_LANDING_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

function extractCompanyId(search: string): string | null {
  if (!search || search === '?') return null;
  const qs = search.startsWith('?') ? search : `?${search}`;
  const params = new URLSearchParams(qs);
  return params.get('c') || params.get('companyId');
}

/** Query sem parâmetros internos de tenant (só atribuição). */
function searchForAttribution(search: string): string {
  if (!search || search === '?') return '';
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const p = new URLSearchParams(raw);
  p.delete('c');
  p.delete('companyId');
  const s = p.toString();
  return s ? `?${s}` : '';
}

/**
 * Rota /w — ex.: https://dominio.com/w?c={companyId}&utm_source=...
 * Busca o WhatsApp da empresa na API pública e redireciona para wa.me com UTMs no texto.
 */
const WhatsAppUtmRedirect: React.FC = () => {
  const { search } = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const companyId = extractCompanyId(search || '');
      const attrSearch = searchForAttribution(search || '');

      let digits = '';
      if (companyId) {
        try {
          const res = await fetch(
            `${API_BASE}/public/landing-whatsapp?companyId=${encodeURIComponent(companyId)}`
          );
          if (res.ok) {
            const data = (await res.json()) as { whatsappNumber?: string };
            digits = (data.whatsappNumber || '').replace(/\D/g, '');
          }
        } catch {
          /* rede / CORS — segue sem dígitos */
        }
      }
      if (!digits && FALLBACK_WHATSAPP_DIGITS.length >= 10) {
        digits = FALLBACK_WHATSAPP_DIGITS;
      }
      if (cancelled) return;
      if (!digits) {
        setError(
          companyId
            ? 'WhatsApp não configurado para esta empresa (perfil ou instância UAZAP).'
            : 'Falta o identificador da empresa na URL (?c=...). Use o link gerado no app em Campanhas.'
        );
        return;
      }
      const base = 'Olá! Vim pelo anúncio.';
      const message = attrSearch.length > 1 ? appendAttributionQueryToText(base, attrSearch) : base;
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
