import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Save, User, LayoutTemplate, Upload, ImageIcon } from 'lucide-react';
import { followUpService, ConsultancyClientAppearanceAdmin } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

const AdminConsultancyGlobalAppearance: React.FC = () => {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [appearance, setAppearance] = useState<ConsultancyClientAppearanceAdmin | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    role: '',
    kicker: '',
    headlinePrefix: '',
    headlineAccent: '',
    nextSectionCaption: '',
    requestCardTitle: '',
    requestCardDescription: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('win_access_token');
    const userStr = localStorage.getItem('win_user');
    if (!token || !userStr) {
      setAuth(false);
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setAuth(false);
        return;
      }
      setAuth(true);
    } catch {
      setAuth(false);
    }
  }, []);

  const applyDto = useCallback((data: ConsultancyClientAppearanceAdmin) => {
    setAppearance(data);
    setForm({
      displayName: data.consultant.displayName ?? '',
      role: data.consultant.role ?? '',
      kicker: data.pageCopy.kicker ?? '',
      headlinePrefix: data.pageCopy.headlinePrefix ?? '',
      headlineAccent: data.pageCopy.headlineAccent ?? '',
      nextSectionCaption: data.pageCopy.nextSectionCaption ?? '',
      requestCardTitle: data.pageCopy.requestCardTitle ?? '',
      requestCardDescription: data.pageCopy.requestCardDescription ?? '',
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await followUpService.getConsultancyGlobalAppearance();
      applyDto(data);
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [applyDto]);

  useEffect(() => {
    if (auth === true) {
      void load();
    }
  }, [auth, load]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await followUpService.patchConsultancyGlobalAppearance({
        displayName: form.displayName || undefined,
        role: form.role || undefined,
        kicker: form.kicker || undefined,
        headlinePrefix: form.headlinePrefix || undefined,
        headlineAccent: form.headlineAccent || undefined,
        nextSectionCaption: form.nextSectionCaption || undefined,
        requestCardTitle: form.requestCardTitle || undefined,
        requestCardDescription: form.requestCardDescription || undefined,
      });
      applyDto(updated);
      setMessage('Aparência global salva.');
    } catch (e) {
      setMessage(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage(null);
    try {
      const updated = await followUpService.uploadConsultancyConsultantAvatar(file);
      applyDto(updated);
      setMessage('Foto do consultor atualizada.');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  if (auth === false) {
    return <Navigate to="/admin/login" replace />;
  }

  if (auth === null) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">{message}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <LayoutTemplate size={18} /> Aparência no app do cliente (global)
        </h2>
        <p className="text-xs text-gray-500">
          Textos da tela &quot;Consultoria Estratégica&quot; e dados do consultor para <strong>todas</strong> as empresas.
          Valores vazios usam o padrão da plataforma no app. A foto do consultor é enviada como arquivo (não é possível
          colar URL).
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
            <Loader2 className="animate-spin" size={18} /> Carregando…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-widest">
                <User size={14} /> Consultor
              </div>
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Nome exibido"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Cargo / especialidade"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />

              <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 pt-2 pb-2 border-t border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  {appearance?.consultant.avatarUrl ? (
                    <img
                      src={appearance.consultant.avatarUrl}
                      alt=""
                      className="h-16 w-16 rounded-2xl object-cover border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700">Foto do consultor</p>
                    <p className="text-[10px] text-gray-500 break-all">
                      {appearance?.consultant.avatarUrl ? 'Imagem atual (URL pública após upload).' : 'Nenhuma imagem.'}
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-700 shrink-0">
                  {uploadingAvatar ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {uploadingAvatar ? 'Enviando…' : 'Enviar imagem'}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(ev) => void handleAvatar(ev)}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 text-xs font-black uppercase text-gray-400 tracking-widest pt-2">
                <LayoutTemplate size={14} /> Textos da página
              </div>
              <input
                className="md:col-span-2 rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Selo superior (ex.: Consultoria Estratégica)"
                value={form.kicker}
                onChange={(e) => setForm((f) => ({ ...f, kicker: e.target.value }))}
              />
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Título — parte antes do destaque"
                value={form.headlinePrefix}
                onChange={(e) => setForm((f) => ({ ...f, headlinePrefix: e.target.value }))}
              />
              <input
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Título — palavra em destaque (verde)"
                value={form.headlineAccent}
                onChange={(e) => setForm((f) => ({ ...f, headlineAccent: e.target.value }))}
              />
              <input
                className="md:col-span-2 rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Legenda abaixo de &quot;Próximo encontro&quot;"
                value={form.nextSectionCaption}
                onChange={(e) => setForm((f) => ({ ...f, nextSectionCaption: e.target.value }))}
              />
              <input
                className="md:col-span-2 rounded-xl border border-gray-200 px-4 py-2 text-sm"
                placeholder="Título do card &quot;Solicitar novo encontro&quot;"
                value={form.requestCardTitle}
                onChange={(e) => setForm((f) => ({ ...f, requestCardTitle: e.target.value }))}
              />
              <textarea
                className="md:col-span-2 min-h-[80px] rounded-xl border border-gray-200 px-4 py-3 text-sm"
                placeholder="Descrição do card de solicitação"
                value={form.requestCardDescription}
                onChange={(e) => setForm((f) => ({ ...f, requestCardDescription: e.target.value }))}
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Salvar aparência
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminConsultancyGlobalAppearance;
