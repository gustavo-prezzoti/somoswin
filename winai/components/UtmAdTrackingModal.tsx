import React, { useEffect, useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { marketingService } from '../services';

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
  const [anchorDraft, setAnchorDraft] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const [registerOk, setRegisterOk] = useState(false);
  /** Texto gravado no último registro — usado no link /w/ (parâmetro `m`). */
  const [registeredPrefillForLinks, setRegisteredPrefillForLinks] = useState<string | null>(null);

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      setBaseUrl((u) => u || window.location.origin);
    }
  }, [open]);

  useEffect(() => {
    setAnchorDraft('');
    setAnchorError(null);
    setRegisterOk(false);
    setRegisteredPrefillForLinks(null);
  }, [open, ctx?.platform, ctx?.adId]);

  if (!ctx) return null;

  const base = baseUrl.replace(/\/$/, '');
  const camp = compactId(ctx.campaignId);
  const adg = compactId(ctx.adSetId);
  const ad = compactId(ctx.adId);

  const metaQueryFilled =
    camp && adg && ad
      ? `utm_source=facebook&utm_medium=paid_social&utm_campaign=${encodeURIComponent(camp)}&utm_content=${encodeURIComponent(ad)}&utm_term=${encodeURIComponent(adg)}`
      : '';

  const cPrefix = companyId ? `c=${encodeURIComponent(companyId)}&` : '';

  const googleQueryFilled =
    camp && adg && ad
      ? `utm_source=google&utm_medium=cpc&utm_campaign=${encodeURIComponent(camp)}&utm_content=${encodeURIComponent(ad)}&utm_term=${encodeURIComponent(adg)}`
      : '';

  const utmQueryFilled = ctx.platform === 'META' ? metaQueryFilled : googleQueryFilled;

  const waHopWithAnchoredMessage =
    registerOk && registeredPrefillForLinks && utmQueryFilled && companyId
      ? `${base}/w/?${cPrefix}${utmQueryFilled}&m=${encodeURIComponent(registeredPrefillForLinks)}`
      : '';

  const incomplete = !ctx.campaignId || !ctx.adSetId || !ctx.adId;

  const platformLabel = ctx.platform === 'META' ? 'Meta Ads' : 'Google Ads';

  const suggestContextLines = [
    `Plataforma: ${platformLabel}`,
    ctx.campaignName ? `Campanha: ${ctx.campaignName}` : '',
    ctx.adSetName ? `Conjunto: ${ctx.adSetName}` : '',
    ctx.adName ? `Anúncio: ${ctx.adName}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const suggestAnchorMessage = async () => {
    if (!camp || !adg || !ad) return;
    setSuggestLoading(true);
    setAnchorError(null);
    setRegisterOk(false);
    setRegisteredPrefillForLinks(null);
    try {
      const baseBody = {
        context: suggestContextLines,
        utmCampaign: camp,
        utmContent: ad,
        utmTerm: adg,
      };
      const body =
        ctx.platform === 'META'
          ? { ...baseBody, utmSource: 'facebook', utmMedium: 'paid_social' }
          : { ...baseBody, utmSource: 'google', utmMedium: 'cpc' };
      const r = await marketingService.suggestLeadAttributionMessage(body);
      if (r.suggestedText) {
        setAnchorDraft(r.suggestedText);
      } else {
        setAnchorError('A IA não retornou texto. Tente de novo ou escreva manualmente.');
      }
    } catch {
      setAnchorError('Não foi possível sugerir o texto. Verifique a sessão e tente de novo.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const registerAnchor = async () => {
    if (!camp || !adg || !ad) return;
    const text = anchorDraft.trim();
    if (!text) {
      setAnchorError('Digite ou sugira a mensagem que irá no anúncio antes de registrar.');
      return;
    }
    setRegisterLoading(true);
    setAnchorError(null);
    setRegisterOk(false);
    setRegisteredPrefillForLinks(null);
    try {
      const baseBody = {
        anchorText: text,
        utmCampaign: camp,
        utmContent: ad,
        utmTerm: adg,
      };
      const body =
        ctx.platform === 'META'
          ? { ...baseBody, utmSource: 'facebook', utmMedium: 'paid_social' }
          : { ...baseBody, utmSource: 'google', utmMedium: 'cpc' };
      await marketingService.createLeadAttributionAnchor(body);
      setRegisterOk(true);
      setRegisteredPrefillForLinks(text);
      onCopied();
    } catch {
      setAnchorError('Não foi possível registrar a âncora. Verifique a sessão e tente de novo.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const SemanticAnchorBlock = (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 space-y-3">
      <p className="text-xs font-bold text-violet-900 uppercase tracking-wide">
        Mensagem para anúncio Click-to-WhatsApp
      </p>
      <p className="text-xs text-violet-800/90">
        <strong>Registre</strong> a mensagem abaixo; em seguida você copia o <strong>link do WhatsApp</strong> para usar no anúncio.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={incomplete || suggestLoading}
          onClick={() => void suggestAnchorMessage()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-50 hover:bg-violet-700 transition-colors"
        >
          {suggestLoading ? <Loader2 className="animate-spin" size={16} /> : null}
          Sugerir mensagem (IA)
        </button>
      </div>
      <label className="text-[10px] font-bold text-gray-500 block">Texto que vai no anúncio (editável)</label>
      <textarea
        value={anchorDraft}
        onChange={(e) => setAnchorDraft(e.target.value)}
        rows={4}
        placeholder="Ex.: Vi o anúncio da promoção no Instagram e quero saber mais."
        className="w-full px-3 py-2 rounded-xl border border-violet-100 text-sm text-gray-900 focus:ring-2 focus:ring-violet-500/20 outline-none resize-y min-h-[5rem]"
      />
      <button
        type="button"
        disabled={incomplete || registerLoading}
        onClick={() => void registerAnchor()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-50 hover:bg-slate-900 transition-colors"
      >
        {registerLoading ? <Loader2 className="animate-spin" size={16} /> : null}
        Registrar mensagem e UTM
      </button>
      {anchorError ? <p className="text-xs text-red-600 font-medium">{anchorError}</p> : null}
    </div>
  );

  const showTrackingSection = Boolean(utmQueryFilled);

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
          Defina o <strong className="text-gray-800">texto da primeira mensagem</strong>, registre e copie o <strong className="text-gray-800">link do WhatsApp</strong>.
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

        {showTrackingSection && (
          <div className="space-y-3">
            {SemanticAnchorBlock}

            {!registerOk && !incomplete && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                O link aparece <strong>depois</strong> de <strong>Registrar mensagem e UTM</strong>.
              </div>
            )}

            {registerOk && registeredPrefillForLinks && (
              <>
                {waHopWithAnchoredMessage ? (
                  <CopyRow label="Link do WhatsApp" value={waHopWithAnchoredMessage} onCopied={onCopied} emphasis />
                ) : (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
                    É preciso estar com empresa vinculada para gerar o link.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UtmAdTrackingModal;
