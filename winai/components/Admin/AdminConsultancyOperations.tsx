import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Building2,
  Loader2,
  Upload,
  FileText,
  Save,
  Link2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import adminService, {
  followUpService,
  Company,
  AdminConsultancyHistoryRow,
  ConsultancyMeetingDetailAdmin,
  ConsultancyCallRequestAdminRow,
} from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

const AdminConsultancyOperations: React.FC = () => {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [meetings, setMeetings] = useState<AdminConsultancyHistoryRow[]>([]);
  const [meetingId, setMeetingId] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [lastDetail, setLastDetail] = useState<ConsultancyMeetingDetailAdmin | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [requests, setRequests] = useState<ConsultancyCallRequestAdminRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [savingRequestId, setSavingRequestId] = useState<string | null>(null);
  const [editMeetById, setEditMeetById] = useState<Record<string, string>>({});

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
      void loadCompanies();
      void loadAllRequests();
    } catch {
      setAuth(false);
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await adminService.getAllCompanies();
      setCompanies(data || []);
    } catch (e) {
      setMessage(getErrorMessage(e));
    }
  };

  const loadAllRequests = async () => {
    setLoadingRequests(true);
    try {
      const list = await followUpService.listConsultancyCallRequests();
      setRequests(list || []);
      const next: Record<string, string> = {};
      (list || []).forEach((r) => {
        next[r.id] = r.meetLink ?? '';
      });
      setEditMeetById(next);
    } catch (e) {
      setMessage(getErrorMessage(e));
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadMeetings = async (cid: string) => {
    if (!cid) {
      setMeetings([]);
      return;
    }
    setLoadingList(true);
    try {
      const list = await followUpService.listConsultancyMeetings(cid);
      setMeetings(list);
      setMeetingId(list[0]?.id ?? '');
    } catch (e) {
      setMessage(getErrorMessage(e));
      setMeetings([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      void loadMeetings(companyId);
    }
  }, [companyId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId || !meetingId) return;
    setUploading(true);
    setMessage(null);
    try {
      await followUpService.uploadConsultancyRecording(companyId, meetingId, file);
      setMessage('Gravação enviada com sucesso.');
      await loadMeetings(companyId);
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveTranscription = async () => {
    if (!companyId || !meetingId || !transcription.trim()) {
      setMessage('Selecione empresa, reunião e cole a transcrição.');
      return;
    }
    setSavingTx(true);
    setMessage(null);
    try {
      const detail = await followUpService.saveConsultancyTranscription(companyId, meetingId, transcription.trim());
      setLastDetail(detail);
      setMessage('Transcrição salva e resumo GPT gerado (se a API estiver ativa).');
      setTranscription('');
      await loadMeetings(companyId);
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSavingTx(false);
    }
  };

  const handleSaveMeetLink = async (row: ConsultancyCallRequestAdminRow) => {
    const link = (editMeetById[row.id] ?? '').trim();
    setSavingRequestId(row.id);
    setMessage(null);
    try {
      const updated = await followUpService.patchConsultancyCallRequest(row.id, { meetLink: link });
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setMessage('Link atualizado.');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSavingRequestId(null);
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
    <div className="space-y-8">
      {message && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">{message}</div>
      )}

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Link2 size={18} /> Pedidos de call (todas as empresas)
          </h2>
          <button
            type="button"
            onClick={() => void loadAllRequests()}
            disabled={loadingRequests}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingRequests ? 'animate-spin' : ''} />
            Atualizar lista
          </button>
        </div>
        <div className="overflow-x-auto">
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm p-8">
              <Loader2 className="animate-spin" size={18} /> Carregando pedidos…
            </div>
          ) : requests.length === 0 ? (
            <p className="p-8 text-sm text-gray-500">Nenhum pedido registrado ainda.</p>
          ) : (
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Urgência</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 min-w-[200px]">Link Meet</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 align-top">
                    <td className="px-4 py-3 font-bold text-gray-900">{r.companyName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="font-medium text-gray-800">{r.requestedByName ?? '—'}</div>
                      <div className="text-xs text-gray-400 break-all">{r.requestedByEmail ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{r.subject}</div>
                      <div className="text-xs text-gray-500 line-clamp-2 mt-1">{r.topics}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{r.urgency}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold">
                        {r.statusLabel}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-1">{r.createdAtLabel}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="url"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono"
                        placeholder="https://meet.google.com/..."
                        value={editMeetById[r.id] ?? ''}
                        onChange={(e) => setEditMeetById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      {(r.meetLink || editMeetById[r.id]) && (r.meetLink || editMeetById[r.id])?.startsWith('http') && (
                        <a
                          href={(editMeetById[r.id] || r.meetLink) as string}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-600 hover:underline"
                        >
                          <ExternalLink size={12} /> Abrir link
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={savingRequestId === r.id}
                        onClick={() => void handleSaveMeetLink(r)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                      >
                        {savingRequestId === r.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Salvar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Building2 size={18} /> Empresa (gravações e transcrições)
        </h2>
        <p className="text-xs text-gray-500">
          Textos e foto do consultor no app são globais — configure em <strong>Aparência global</strong>.
        </p>
        <select
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setMeetingId('');
            setLastDetail(null);
          }}
        >
          <option value="">Selecione a empresa</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Reuniões de consultoria</h2>
        {loadingList ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="animate-spin" size={18} /> Carregando…
          </div>
        ) : (
          <select
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium"
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            disabled={!companyId}
          >
            <option value="">Selecione uma reunião</option>
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.dateLabel} — {m.typeLabel}
              </option>
            ))}
          </select>
        )}
        <p className="text-xs text-gray-500">
          Cadastre reuniões com tipo <strong>CONSULTANCY</strong> no calendário. O link principal da videoconferência
          continua no agendamento; os pedidos de call usam o campo Meet na tabela acima.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Upload size={18} /> Gravação (vídeo/áudio)
        </h2>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 text-sm font-bold text-gray-700">
          {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          {uploading ? 'Enviando…' : 'Escolher arquivo'}
          <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleUpload} disabled={!meetingId || uploading} />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <FileText size={18} /> Transcrição + resumo GPT
        </h2>
        <textarea
          className="w-full min-h-[200px] rounded-xl border border-gray-200 px-4 py-3 text-sm"
          placeholder="Cole aqui a transcrição completa da call..."
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          disabled={!meetingId}
        />
        <button
          type="button"
          disabled={!meetingId || savingTx}
          onClick={() => void handleSaveTranscription()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
        >
          {savingTx ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Salvar e gerar resumo
        </button>
        {lastDetail?.aiSummary && (
          <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-900 whitespace-pre-wrap">
            <strong>Último resumo:</strong>
            {'\n\n'}
            {lastDetail.aiSummary}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsultancyOperations;
