import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Página exibida no popup após OAuth (ex: WhatsApp "Adicionar número").
 * Fecha o popup automaticamente para que o parent chame loadWhatsAppNumbers.
 */
const OAuthComplete: React.FC = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const whatsapp = searchParams.get('whatsapp');

  useEffect(() => {
    if (window.opener) {
      const t = setTimeout(() => window.close(), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="text-red-600 font-bold">Autorização não concluída</p>
            <p className="text-sm text-gray-600 mt-2">Esta janela fechará em breve.</p>
          </>
        ) : whatsapp ? (
          <>
            <p className="text-emerald-600 font-bold">Números WhatsApp vinculados!</p>
            <p className="text-sm text-gray-600 mt-2">Esta janela fechará automaticamente.</p>
          </>
        ) : (
          <>
            <p className="text-gray-700 font-bold">Concluído</p>
            <p className="text-sm text-gray-600 mt-2">Esta janela fechará em breve.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthComplete;
