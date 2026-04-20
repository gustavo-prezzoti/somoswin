import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Save, Link2, RefreshCw, ExternalLink } from 'lucide-react';
import { followUpService, ConsultancyCallRequestAdminRow } from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

const AdminConsultancyOperations: React.FC = () => {
  const [auth, setAuth] = useState<boolean | null>(null);
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
      void loadAllRequests();
    } catch {
      setAuth(false);
    }
  }, []);

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
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="rounded-xl border border-black/5 bg-gray-50 px-4 py-3 text-sm text-gray-200">{message}</div>
      )}

      <section className="glass-card rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-black text-[#141414] uppercase tracking-widest flex items-center gap-2">
            <Link2 size={18} className="text-emerald-600" /> Pedidos de call (todas as empresas)
          </h2>
          <button
            type="button"
            onClick={() => void loadAllRequests()}
            disabled={loadingRequests}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-black/5 text-xs font-bold text-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingRequests ? 'animate-spin text-emerald-600' : ''} />
            Atualizar lista
          </button>
        </div>
        <div className="overflow-x-auto">
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm p-8">
              <Loader2 className="animate-spin" size={18} /> Carregando pedidos…
            </div>
          ) : requests.length === 0 ? (
            <p className="p-8 text-sm text-gray-500">Nenhum pedido registrado ainda.</p>
          ) : (
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500">
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
                  <tr key={r.id} className="hover:bg-gray-50 align-top text-gray-300">
                    <td className="px-4 py-3 font-bold text-[#141414]">{r.companyName}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-200">{r.requestedByName ?? '—'}</div>
                      <div className="text-xs text-gray-500 break-all">{r.requestedByEmail ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#141414]">{r.subject}</div>
                      <div className="text-xs text-gray-500 line-clamp-2 mt-1">{r.topics}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-400">{r.urgency}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/25">
                        {r.statusLabel}
                      </span>
                      <div className="text-[10px] text-gray-600 mt-1">{r.createdAtLabel}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="url"
                        className="w-full rounded-lg border border-black/5 bg-gray-50 px-3 py-2 text-xs font-mono text-[#141414] placeholder:text-gray-600"
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
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
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
    </div>
  );
};

export default AdminConsultancyOperations;
