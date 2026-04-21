import React, { useEffect, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import { Modal } from './ui/Modal';

export type UtmAdTrackingPlatform = 'META' | 'GOOGLE';

export interface UtmAdTrackingContext {
  platform: UtmAdTrackingPlatform;
  campaignId: string;
  campaignName: string;
  adSetId: string;
  adSetName: string;
  adId: string;
  adName: string;
}

/** Último segmento de resource name Google (ex.: customers/1/campaigns/2 → 2). Meta costuma ser o próprio id. */
function compactId(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const i = s.lastIndexOf('/');
  return i >= 0 ? s.slice(i + 1) : s;
}

interface UtmAdTrackingModalProps {
  open: boolean;
  onClose: () => void;
  ctx: UtmAdTrackingContext | null;
  onCopied: () => void;
}

const META_MACRO_PARAMS =
  'utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}';

const GOOGLE_SUFFIX =
  'utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={adgroupid}';

function CopyBlock({
  label,
  value,
  onCopied,
}: {
  label: string;
  value: string;
  onCopied: () => void;
}) {
  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => onCopied());
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
        >
          <Copy size={14} />
          Copiar
        </button>
      </div>
      <pre className="text-[11px] leading-relaxed bg-slate-50 p-3 rounded-xl break-all whitespace-pre-wrap border border-slate-100 text-slate-800 font-mono">
        {value}
      </pre>
    </div>
  );
}

const UtmAdTrackingModal: React.FC<UtmAdTrackingModalProps> = ({ open, onClose, ctx, onCopied }) => {
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setBaseUrl((u) => u || window.location.origin);
    }
  }, [open]);

  if (!ctx) return null;

  const base = baseUrl.replace(/\/$/, '');
  const camp = compactId(ctx.campaignId);
  const adg = compactId(ctx.adSetId);
  const ad = compactId(ctx.adId);

  const metaFullLanding = camp && adg && ad
    ? `${base}/?utm_source=facebook&utm_medium=paid_social&utm_campaign=${encodeURIComponent(camp)}&utm_content=${encodeURIComponent(ad)}&utm_term=${encodeURIComponent(adg)}`
    : '';

  const googleQuery =
    camp && adg && ad
      ? `utm_source=google&utm_medium=cpc&utm_campaign=${encodeURIComponent(camp)}&utm_content=${encodeURIComponent(ad)}&utm_term=${encodeURIComponent(adg)}`
    : '';

  const googleFullLanding = googleQuery ? `${base}/?${googleQuery}` : '';

  const incomplete = !ctx.campaignId || !ctx.adSetId || !ctx.adId;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="UTM para este anúncio"
      subtitle="Campanha + conjunto + anúncio"
      size="lg"
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-600 font-medium leading-relaxed">
          Nos anúncios com <strong>link para o site</strong>, o rastreio costuma ser configurado no <strong>nível do
          anúncio</strong> (ou herdado até ele). Abaixo: o que colar no Gerenciador da Meta ou no Google Ads, e uma URL
          de exemplo com os <strong>IDs desta linha</strong> (após navegar Campanhas → Conjuntos → Anúncios).
        </p>

        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
            Base do seu site (landing / checkout)
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://seusite.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-indigo-800">
            <Link2 size={18} className="shrink-0" />
            <span className="text-xs font-black uppercase tracking-tight">Contexto deste anúncio</span>
          </div>
          <ul className="text-xs text-gray-700 font-medium space-y-1">
            <li>
              <span className="text-gray-400 font-bold">Campanha:</span> {ctx.campaignName || '—'}{' '}
              {camp ? <code className="text-[10px] bg-white/80 px-1 rounded">{camp}</code> : null}
            </li>
            <li>
              <span className="text-gray-400 font-bold">Conjunto:</span> {ctx.adSetName || '—'}{' '}
              {adg ? <code className="text-[10px] bg-white/80 px-1 rounded">{adg}</code> : null}
            </li>
            <li>
              <span className="text-gray-400 font-bold">Anúncio:</span> {ctx.adName || '—'}{' '}
              {ad ? <code className="text-[10px] bg-white/80 px-1 rounded">{ad}</code> : null}
            </li>
          </ul>
        </div>

        {incomplete && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-xs font-medium px-4 py-3">
            Abra este assistente a partir de uma linha na lista <strong>Anúncios</strong>, depois de entrar na campanha e
            no conjunto — assim os três IDs ficam preenchidos.
          </div>
        )}

        {ctx.platform === 'META' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900">Meta Ads</h4>
            <p className="text-xs text-gray-500 font-medium">
              No anúncio com URL do site: <strong>Parâmetros da URL</strong> (ou URL completa com query). Macros
              preenchem campanha, conjunto e anúncio sozinhos em cada clique.
            </p>
            <CopyBlock label="Parâmetros (cole no campo da Meta)" value={META_MACRO_PARAMS} onCopied={onCopied} />
            {metaFullLanding && (
              <CopyBlock
                label="URL exemplo com IDs desta linha (teste / campanhas sem macros)"
                value={metaFullLanding}
                onCopied={onCopied}
              />
            )}
          </div>
        )}

        {ctx.platform === 'GOOGLE' && (
          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900">Google Ads (busca, Display, YouTube)</h4>
            <p className="text-xs text-gray-500 font-medium">
              <strong>URL final</strong> do anúncio: só o caminho do site (sem <code className="text-[10px]">utm_</code>
              ). Em <strong>Sufixo de URL final</strong> (conta ou campanha), cole o ValueTrack abaixo —{' '}
              <code className="text-[10px]">{'{campaignid}'}</code>, <code className="text-[10px]">{'{adgroupid}'}</code> e{' '}
              <code className="text-[10px]">{'{creative}'}</code> são preenchidos pelo Google por anúncio.
            </p>
            <CopyBlock label="Sufixo de URL final (sem ? no início)" value={GOOGLE_SUFFIX} onCopied={onCopied} />
            {googleFullLanding && (
              <CopyBlock
                label="URL exemplo com IDs desta linha (só para teste no navegador)"
                value={googleFullLanding}
                onCopied={onCopied}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UtmAdTrackingModal;
