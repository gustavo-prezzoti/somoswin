import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Award,
  Video,
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  History,
  Play,
  FileText,
  Loader2,
  Target,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  consultancyService,
  ConsultancyDashboard,
  ConsultancyHistoryRow,
  ConsultancyMeetingDetail,
} from '../services/api/consultancy.service';
import { ApiError } from '../services/api/http-client';
import { useToast } from '../hooks/useToast';
import ToastComponent from './ui/Toast';

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].substring(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const Consultancy: React.FC = () => {
  const [dashboard, setDashboard] = useState<ConsultancyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestData, setRequestData] = useState({
    subject: '',
    urgency: 'normal',
    topics: '',
  });
  const [isRequestSubmitted, setIsRequestSubmitted] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [docMeetingId, setDocMeetingId] = useState<string | null>(null);
  const [docDetail, setDocDetail] = useState<ConsultancyMeetingDetail | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const { toasts, showToast, removeToast } = useToast();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const d = await consultancyService.getDashboard();
      setDashboard(d);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Erro ao carregar consultoria.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      await consultancyService.createRequest({
        subject: requestData.subject,
        urgency: requestData.urgency,
        topics: requestData.topics,
      });
      setIsRequestSubmitted(true);
      showToast('Solicitação registrada. Seu consultor será notificado.', 'success');
      setTimeout(() => {
        setIsRequestSubmitted(false);
        setShowRequestForm(false);
        setRequestData({ subject: '', urgency: 'normal', topics: '' });
      }, 2500);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Falha ao enviar.', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openDocumentModal = async (row: ConsultancyHistoryRow) => {
    setDocMeetingId(row.id);
    setDocLoading(true);
    setDocDetail(null);
    try {
      const d = await consultancyService.getMeetingDetail(row.id);
      setDocDetail(d);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Erro ao carregar detalhes.', 'error');
      setDocMeetingId(null);
    } finally {
      setDocLoading(false);
    }
  };

  const consultantName = dashboard?.consultant?.displayName?.trim() || 'Equipe de consultoria';
  const consultantRole = dashboard?.consultant?.role?.trim() || '';
  const avatarSrc = dashboard?.consultant?.avatarUrl?.trim() || '';
  const pageCopy = dashboard?.pageCopy;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 sm:px-6 animate-in fade-in duration-700">
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      {showRequestForm && (
        <div className="fixed -inset-10 bg-black/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 my-auto flex flex-col max-h-[90vh]">
            <div className="p-8 bg-[#002a1e] text-white relative shrink-0">
              <button
                onClick={() => setShowRequestForm(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <Plus className="rotate-45" size={24} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                  <Calendar size={20} />
                </div>
                <h3 className="text-2xl font-black italic tracking-tight">
                {pageCopy?.requestCardTitle?.trim() || 'Solicitar call estratégica'}
              </h3>
              </div>
              <p className="text-emerald-50/60 text-xs font-medium uppercase tracking-widest">
                Preencha os detalhes — a equipe retornará em breve
              </p>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              {isRequestSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-xl font-black text-gray-900">Solicitação enviada!</h4>
                  <p className="text-gray-500 text-sm font-medium">Registramos seu pedido.</p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                      Assunto principal
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm"
                      placeholder="Ex: Revisão de Metas Q2"
                      value={requestData.subject}
                      onChange={(e) => setRequestData({ ...requestData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                      Urgência
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['baixa', 'normal', 'alta'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setRequestData({ ...requestData, urgency: u })}
                          className={`py-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${
                            requestData.urgency === u
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                      Tópicos a abordar
                    </label>
                    <textarea
                      required
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm h-32 resize-none"
                      placeholder="Descreva o que deseja discutir..."
                      value={requestData.topics}
                      onChange={(e) => setRequestData({ ...requestData, topics: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingRequest ? <Loader2 className="animate-spin" size={18} /> : null}
                    Confirmar solicitação
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {recordingUrl && (
        <div className="fixed inset-0 z-[1001] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl max-w-4xl w-full overflow-hidden relative">
            <button
              type="button"
              className="absolute top-3 right-3 z-10 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
              onClick={() => setRecordingUrl(null)}
            >
              <X size={22} />
            </button>
            <video src={recordingUrl} controls className="w-full max-h-[80vh]" playsInline>
              Seu navegador não suporta reprodução de vídeo.
            </video>
          </div>
        </div>
      )}

      {docMeetingId && (
        <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-black text-gray-900">Material da reunião</h3>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={() => {
                  setDocMeetingId(null);
                  setDocDetail(null);
                }}
              >
                <X size={22} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {docLoading && (
                <div className="flex items-center gap-2 text-gray-500 py-8">
                  <Loader2 className="animate-spin" size={22} />
                  Carregando…
                </div>
              )}
              {!docLoading && docDetail && (
                <>
                  <div>
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                      Resumo (GPT)
                    </h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {docDetail.aiSummary?.trim() || '—'}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Transcrição completa
                    </h4>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar leading-relaxed border border-gray-100 rounded-2xl p-4 bg-gray-50">
                      {docDetail.transcriptionFull?.trim() || '—'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]">
            <Target size={14} className="shrink-0" />
            <span className="truncate">{pageCopy?.kicker ?? 'Consultoria Estratégica'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter italic leading-tight">
            {pageCopy?.headlinePrefix ?? 'Seu Painel de '}
            <span className="text-emerald-500">{pageCopy?.headlineAccent ?? 'Performance'}</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shrink-0">
          <div className="flex items-center gap-4 sm:pr-6 sm:border-r border-gray-100">
            <div className="text-left sm:text-right min-w-0 flex-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Seu Consultor</p>
              <p className="text-sm font-bold text-gray-900 truncate">{consultantName}</p>
              {consultantRole ? (
                <p className="text-[10px] font-medium text-emerald-600 truncate">{consultantRole}</p>
              ) : null}
            </div>
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 bg-emerald-50 shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-700 font-black text-sm">
                  {initialsFromName(consultantName)}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-center px-6 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center">
              Plano atual
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Award size={14} className="text-emerald-600 shrink-0" />
              <span className="text-sm font-black text-gray-900 tracking-tight text-center">
                {loading ? '…' : dashboard?.planDisplayName ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />

          <div className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight italic">Próximo encontro</h2>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
                    {pageCopy?.nextSectionCaption ?? 'Sua próxima análise estratégica'}
                  </p>
                </div>
              </div>
              {dashboard?.nextMeeting && (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-emerald-500/20">
                  <Clock size={12} /> {dashboard.nextMeeting.statusLabel}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-bold text-sm">Carregando…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 h-full flex flex-col justify-center">
                    {dashboard?.nextMeeting ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Data</p>
                            <p className="text-lg font-black text-gray-900">{dashboard.nextMeeting.dateLabel}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Horário</p>
                            <p className="text-lg font-black text-gray-900">{dashboard.nextMeeting.timeLabel}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                            <Video size={16} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Tipo de encontro
                            </p>
                            <p className="text-sm font-bold text-gray-700">{dashboard.nextMeeting.typeLabel}</p>
                          </div>
                        </div>
                        {dashboard.nextMeeting.meetingLink && (
                          <a
                            href={dashboard.nextMeeting.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700"
                          >
                            <ExternalLink size={14} /> Entrar na call
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-gray-500 text-center py-8">
                        Nenhum encontro de consultoria agendado.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-900/5 p-6 rounded-3xl border border-emerald-500/10 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                    <Calendar size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight italic">
                      {pageCopy?.requestCardTitle ?? 'Solicitar novo encontro'}
                    </h3>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                      {pageCopy?.requestCardDescription ??
                        'Envie uma solicitação para a equipe de consultoria.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(true)}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Solicitar call
                  </button>
                </div>
              </div>
            )}

            {!loading && dashboard?.recentCallRequests && dashboard.recentCallRequests.length > 0 && (
              <div className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 sm:p-6">
                <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4">
                  Seus pedidos de call
                </h3>
                <ul className="space-y-3">
                  {dashboard.recentCallRequests.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white/90 border border-emerald-100/80 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{r.subject}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {r.statusLabel}
                          {r.createdAtLabel ? ` · ${r.createdAtLabel}` : ''}
                        </p>
                      </div>
                      {r.meetLink ? (
                        <a
                          href={r.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700"
                        >
                          <ExternalLink size={14} /> Abrir videoconferência
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center sm:text-right">
                          Link em breve
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                <History size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight italic">Histórico de encontros</h2>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-bottom border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Data / Tipo
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Duração / Tópicos
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!loading &&
                    (dashboard?.history?.length ? (
                      dashboard.history.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-5">
                            <p className="text-sm font-black text-gray-900">{item.dateLabel}</p>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                              {item.typeLabel}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-bold text-gray-700 mb-1">{item.durationLabel}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{item.topicsLine}</p>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={!item.hasRecording}
                                onClick={() => {
                                  if (!item.hasRecording) {
                                    showToast('Gravação ainda não disponível.', 'info');
                                    return;
                                  }
                                  void (async () => {
                                    try {
                                      const d = await consultancyService.getMeetingDetail(item.id);
                                      if (d.recordingUrl) setRecordingUrl(d.recordingUrl);
                                      else showToast('Gravação ainda não disponível.', 'info');
                                    } catch (e) {
                                      showToast(e instanceof ApiError ? e.message : 'Erro.', 'error');
                                    }
                                  })();
                                }}
                                className={`p-2 rounded-lg transition-all ${
                                  item.hasRecording
                                    ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    : 'text-gray-200 cursor-not-allowed'
                                }`}
                                title="Ver gravação"
                              >
                                <Play size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={!item.hasSummary && !item.hasTranscription}
                                onClick={() => {
                                  if (!item.hasSummary && !item.hasTranscription) {
                                    showToast('Material ainda não disponível.', 'info');
                                    return;
                                  }
                                  void openDocumentModal(item);
                                }}
                                className={`p-2 rounded-lg transition-all ${
                                  item.hasSummary || item.hasTranscription
                                    ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    : 'text-gray-200 cursor-not-allowed'
                                }`}
                                title="Resumo e transcrição"
                              >
                                <FileText size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500 font-medium">
                          Nenhum encontro anterior registrado.
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Consultancy;
