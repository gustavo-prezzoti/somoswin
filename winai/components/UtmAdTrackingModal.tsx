import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
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
  /** UUID da empresa — obrigatório para o link /w/ (WhatsApp vem do backend por cliente). */
  companyId?: string | null;
}

function CopyRow({
  label,
  value,
  onCopied,
  emphasis,
}: {
  label: string;
  value: string;
  onCopied: () => void;
  emphasis?: boolean;
}) {
  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => onCopied());
  };
  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        emphasis ? 'border-indigo-200 bg-indigo-50/60 shadow-sm' : 'border-gray-100 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`font-bold text-gray-800 ${emphasis ? 'text-sm' : 'text-xs text-gray-600'}`}>{label}</span>
        <button
          type="button"
          onClick={copy}
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors ${
            emphasis ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Copy size={14} />
          Copiar
        </button>
      </div>
      <p className="text-[12px] leading-relaxed break-all font-mono text-slate-800">{value}</p>
    </div>
  );
}

const UtmAdTrackingModal: React.FC<UtmAdTrackingModalProps> = ({ open, onClose, ctx, onCopied, companyId }) => {
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

  const metaQueryFilled =
    camp && adg && ad
      ? `utm_source=facebook&utm_medium=paid_social&utm_campaign=${encodeURIComponent(camp)}&utm_content=${encodeURIComponent(ad)}&utm_term=${encodeURIComponent(adg)}`
      : '';

  const metaFullLanding = metaQueryFilled ? `${base}/?${metaQueryFilled}` : '';
  const cPrefix = companyId ? `c=${encodeURIComponent(companyId)}&` : '';
  const metaWaHop = metaQueryFilled && companyId ? `${base}/w/?${cPrefix}${metaQueryFilled}` : '';

  const googleQueryFilled =
    camp && adg && ad
      ? `utm_source=google&utm_medium=cpc&utm_campaign=${encodeURIComponent(camp)}&utm_content=${encodeURIComponent(ad)}&utm_term=${encodeURIComponent(adg)}`
      : '';

  const googleFullLanding = googleQueryFilled ? `${base}/?${googleQueryFilled}` : '';
  const googleWaHop = googleQueryFilled && companyId ? `${base}/w/?${cPrefix}${googleQueryFilled}` : '';

  const incomplete = !ctx.campaignId || !ctx.adSetId || !ctx.adId;

  const platformLabel = ctx.platform === 'META' ? 'Meta Ads' : 'Google Ads';

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Copiar UTM deste anúncio"
      subtitle={platformLabel}
      size="lg"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Use <strong className="text-gray-800">/w/</strong> com <strong className="text-gray-800">?c=</strong> (empresa) para abrir o WhatsApp certo por cliente; use <strong className="text-gray-800">/</strong> só para a landing.
        </p>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1.5">Seu site</label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://seusite.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>

        {!incomplete && (
          <div className="text-xs text-gray-500 space-y-1 border-l-4 border-indigo-200 pl-3">
            <p>
              <span className="font-bold text-gray-700">Campanha:</span> {ctx.campaignName || camp}
            </p>
            <p>
              <span className="font-bold text-gray-700">Conjunto:</span> {ctx.adSetName || adg}
            </p>
            <p>
              <span className="font-bold text-gray-700">Anúncio:</span> {ctx.adName || ad}
            </p>
          </div>
        )}

        {incomplete && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-sm px-4 py-3">
            Abra por <strong>Campanhas → Conjuntos → Anúncios</strong>.
          </div>
        )}

        {ctx.platform === 'META' && metaFullLanding && metaQueryFilled && (
          <div className="space-y-3">
            {companyId && metaWaHop ? (
              <CopyRow label="Link → WhatsApp (/w/)" value={metaWaHop} onCopied={onCopied} emphasis />
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
                Link direto ao WhatsApp (/w/) aparece quando o usuário tem empresa vinculada (UUID em <code className="font-mono">?c=</code>).
              </div>
            )}
            <CopyRow label="Link da landing (/)" value={metaFullLanding} onCopied={onCopied} />
            <CopyRow label="Só os parâmetros UTM" value={metaQueryFilled} onCopied={onCopied} />
          </div>
        )}

        {ctx.platform === 'GOOGLE' && googleFullLanding && googleQueryFilled && (
          <div className="space-y-3">
            {companyId && googleWaHop ? (
              <CopyRow label="Link → WhatsApp (/w/)" value={googleWaHop} onCopied={onCopied} emphasis />
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
                Link direto ao WhatsApp (/w/) aparece quando o usuário tem empresa vinculada (UUID em <code className="font-mono">?c=</code>).
              </div>
            )}
            <CopyRow label="Link da landing (/)" value={metaFullLanding} onCopied={onCopied} />
            <CopyRow label="Só os parâmetros UTM" value={googleQueryFilled} onCopied={onCopied} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UtmAdTrackingModal;
