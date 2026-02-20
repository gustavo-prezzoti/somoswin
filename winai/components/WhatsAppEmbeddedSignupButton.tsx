import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { marketingService } from '../services/api/marketing.service';

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }) => void;
      login: (callback: (r: { status?: string }) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface WhatsAppEmbeddedSignupButtonProps {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  variant?: 'primary' | 'secondary';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Botão que abre o fluxo WhatsApp Embedded Signup (Tech Provider).
 * O usuário cria/vincula WABA e número diretamente no site.
 */
const WhatsAppEmbeddedSignupButton: React.FC<WhatsAppEmbeddedSignupButtonProps> = ({
  onSuccess,
  onError,
  variant = 'primary',
  className = '',
  children
}) => {
  const [config, setConfig] = useState<{ appId: string; configId: string; enabled: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const listenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => {
    marketingService.getWhatsAppEmbeddedSignupConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  const loadFbSdkAndInit = useCallback((appId: string): Promise<void> => {
    if (window.FB) return Promise.resolve();
    return new Promise((resolve) => {
      window.fbAsyncInit = () => {
        window.FB!.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0'
        });
        setSdkReady(true);
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.FB) { setSdkReady(true); resolve(); }
      };
      document.head.appendChild(script);
    });
  }, []);

  const launchEmbeddedSignup = useCallback(async () => {
    if (!config?.appId || !config?.configId || config.enabled !== 'true') {
      onError?.('Embedded Signup não configurado. Configure META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID.');
      return;
    }
    setLoading(true);
    try {
      await loadFbSdkAndInit(config.appId);

      // Aguardar SDK estar pronto
      const waitSdk = (): Promise<void> => new Promise((res) => {
        if (window.FB) return res();
        const t = setInterval(() => {
          if (window.FB) { clearInterval(t); res(); }
        }, 100);
      });
      await waitSdk();

      // Listener para evento de conclusão (postMessage do popup)
      const handler = (event: MessageEvent) => {
        if (!event.origin?.endsWith('facebook.com')) return;
        try {
          const data = JSON.parse(event.data || '{}');
          if (data.type !== 'WA_EMBEDDED_SIGNUP') return;
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
            const { waba_id, phone_number_id } = data.data || {};
            console.log('[WhatsApp Embedded Signup] Concluído:', { waba_id, phone_number_id });
            window.removeEventListener('message', handler);
            listenerRef.current = null;
            setLoading(false);
            onSuccess?.();
          } else if (data.event === 'CANCEL') {
            window.removeEventListener('message', handler);
            listenerRef.current = null;
            setLoading(false);
          } else if (data.event === 'ERROR') {
            const msg = data.data?.error_message || 'Erro no fluxo';
            window.removeEventListener('message', handler);
            listenerRef.current = null;
            setLoading(false);
            onError?.(msg);
          }
        } catch {
          // ignore non-JSON
        }
      };
      listenerRef.current = handler;
      window.addEventListener('message', handler);

      window.FB!.login(
        () => { /* resposta tratada via postMessage */ },
        {
          config_id: config.configId,
          auth_type: 'rerequest',
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            sessionInfoVersion: 3,
            setup: {}
          }
        }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao abrir Embedded Signup';
      onError?.(msg);
      setLoading(false);
    }
    // loading permanece true até postMessage (FINISH/CANCEL/ERROR)
  }, [config, loadFbSdkAndInit, onSuccess, onError]);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
      }
    };
  }, []);

  if (!config || config.enabled !== 'true') return null;

  const isPrimary = variant === 'primary';
  const btnClass = isPrimary
    ? 'inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60'
    : 'inline-flex items-center gap-2 px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium text-xs rounded-lg transition-colors disabled:opacity-60';

  return (
    <button
      type="button"
      onClick={launchEmbeddedSignup}
      disabled={loading}
      className={`${btnClass} ${className}`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <MessageCircle size={16} />
      )}
      {children ?? 'Conectar WhatsApp Business'}
    </button>
  );
};

export default WhatsAppEmbeddedSignupButton;
