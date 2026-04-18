import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Save,
  Play,
  Square,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Loader2,
  ArrowLeft,
  User,
  Users,
  Headphones,
  Calendar,
  ChevronRight,
  RefreshCw,
  Check,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  leadService,
  LeadData,
  LEAD_STATUS_LABELS,
  intelligentListeningService,
  IntelligentListeningSession,
} from '../services';

interface MeetingAnalysis {
  resumo: string;
  pontos_fortes: string[];
  pontos_fracos: string[];
  melhorias: string[];
  proximos_passos: string[];
}

function parseAiSummary(json: string | null | undefined): MeetingAnalysis | null {
  if (!json?.trim()) return null;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    return {
      resumo: typeof o.resumo === 'string' ? o.resumo : '',
      pontos_fortes: Array.isArray(o.pontos_fortes) ? (o.pontos_fortes as string[]) : [],
      pontos_fracos: Array.isArray(o.pontos_fracos) ? (o.pontos_fracos as string[]) : [],
      melhorias: Array.isArray(o.melhorias) ? (o.melhorias as string[]) : [],
      proximos_passos: Array.isArray(o.proximos_passos) ? (o.proximos_passos as string[]) : [],
    };
  } catch {
    return null;
  }
}

const VideoMeeting: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const leadFromCrm = location.state?.lead as LeadData | undefined;

  const [leads, setLeads] = useState<LeadData[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadFromCrm?.id ?? null);

  const [sessions, setSessions] = useState<IntelligentListeningSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<IntelligentListeningSession | null>(null);

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(() => (leadFromCrm?.id ? 2 : 1));
  const [creatingSession, setCreatingSession] = useState(false);
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [localTranscript, setLocalTranscript] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const localTranscriptRef = useRef('');
  const recordingSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    localTranscriptRef.current = localTranscript;
  }, [localTranscript]);

  const selectedLead = useMemo(
    () => (selectedLeadId ? leads.find((l) => l.id === selectedLeadId) ?? null : null),
    [leads, selectedLeadId]
  );

  const analysis = useMemo(() => parseAiSummary(activeSession?.aiSummary), [activeSession?.aiSummary]);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setErrorMsg(null);
    try {
      const data = await leadService.getAllLeads();
      setLeads(data);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao carregar leads');
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async (leadId: string) => {
    setSessionsLoading(true);
    setErrorMsg(null);
    try {
      const list = await intelligentListeningService.listByLead(leadId);
      setSessions(list);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao listar escutas');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (leadFromCrm?.id) {
      setSelectedLeadId(leadFromCrm.id);
      setWizardStep(2);
    }
  }, [leadFromCrm?.id]);

  useEffect(() => {
    if (!selectedLeadId) {
      setSessions([]);
      return;
    }
    if (wizardStep >= 2) {
      void loadSessions(selectedLeadId);
      if (wizardStep === 2) {
        setActiveSession(null);
      }
    }
  }, [selectedLeadId, wizardStep, loadSessions]);

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone && l.phone.includes(q))
    );
  }, [leads, leadSearch]);

  const proceedToEscutas = () => {
    if (!selectedLeadId || leadsLoading) return;
    setErrorMsg(null);
    setWizardStep(2);
  };

  const backToLeadStep = () => {
    if (isRecording) {
      setErrorMsg('Encerre a gravação antes de voltar.');
      return;
    }
    if (uploading) {
      setErrorMsg('Aguarde o envio do áudio terminar.');
      return;
    }
    setWizardStep(1);
    setActiveSession(null);
  };

  const backToSessionsList = () => {
    if (isRecording) {
      setErrorMsg('Encerre a gravação antes de voltar à lista.');
      return;
    }
    if (uploading) {
      setErrorMsg('Aguarde o envio do áudio terminar.');
      return;
    }
    setWizardStep(2);
    setActiveSession(null);
  };

  const startNewSession = async () => {
    if (!selectedLeadId || creatingSession) return;
    setCreatingSession(true);
    setErrorMsg(null);
    try {
      const s = await intelligentListeningService.startSession(selectedLeadId);
      setActiveSession(s);
      setLocalTranscript('');
      await loadSessions(selectedLeadId);
      setWizardStep(3);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Falha ao criar sessão');
    } finally {
      setCreatingSession(false);
    }
  };

  const openSession = async (id: string) => {
    if (openingSessionId) return;
    setOpeningSessionId(id);
    setErrorMsg(null);
    try {
      const s = await intelligentListeningService.getSession(id);
      setActiveSession(s);
      setLocalTranscript('');
      setWizardStep(3);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Falha ao abrir sessão');
    } finally {
      setOpeningSessionId(null);
    }
  };

  const stopStreams = () => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setAudioData(new Uint8Array(0));
  };

  const runVisualizer = (stream: MediaStream, ctx: AudioContext) => {
    try {
      const source = ctx.createMediaStreamSource(stream);
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const tick = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(new Uint8Array(dataArray));
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };
      tick();
    } catch {
      /* ignore */
    }
  };

  const startSpeechRecognition = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: { resultIndex: number; results: Array<{ 0: { transcript: string } }> }) => {
      let text = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      if (text.trim()) {
        setLocalTranscript((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()));
      }
    };
    rec.onerror = () => {};
    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      /* */
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* */
    }
    recognitionRef.current = null;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      stopStreams();
      mediaRecorderRef.current = null;
      recordingSessionIdRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!activeSession) {
      setErrorMsg('Selecione ou crie uma sessão de escuta primeiro.');
      return;
    }
    if (activeSession.status === 'COMPLETED') {
      setErrorMsg('Esta sessão já foi concluída. Crie uma nova escuta.');
      return;
    }

    setErrorMsg(null);
    chunksRef.current = [];
    setRecordSeconds(0);
    setLocalTranscript('');
    recordingSessionIdRef.current = activeSession.id;

    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;

      let display: MediaStream | null = null;
      try {
        display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        displayStreamRef.current = display;
      } catch {
        setErrorMsg(
          'Compartilhamento de tela cancelado. Para capturar o áudio do Meet, escolha a aba do navegador e marque "Compartilhar áudio da guia".'
        );
      }

      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(mic).connect(dest);

      if (display) {
        const aTracks = display.getAudioTracks();
        if (aTracks.length > 0) {
          ctx.createMediaStreamSource(new MediaStream(aTracks)).connect(dest);
        }
      }

      const mixed = dest.stream;
      runVisualizer(mixed, ctx);
      startSpeechRecognition();

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRec = new MediaRecorder(mixed, { mimeType: mime });
      mediaRecorderRef.current = mediaRec;
      mediaRec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRec.onerror = () => setErrorMsg('Erro na gravação.');
      mediaRec.onstop = () => {
        const mimeType = mediaRec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stopStreams();
        mediaRecorderRef.current = null;
        const sessionId = recordingSessionIdRef.current;
        recordingSessionIdRef.current = null;
        if (!sessionId) return;
        if (blob.size < 2000) {
          setErrorMsg('Gravação muito curta. Tente novamente.');
          return;
        }
        void (async () => {
          setUploading(true);
          setErrorMsg(null);
          try {
            const updated = await intelligentListeningService.uploadAudio(sessionId, blob, 'escuta.webm');
            setActiveSession(updated);
            const live = localTranscriptRef.current.trim();
            if (live) {
              const merged = `${updated.transcriptionFull || ''}\n\n[Notas por voz do microfone — tempo real]\n${live}`;
              const patched = await intelligentListeningService.patchTranscription(sessionId, merged);
              setActiveSession(patched);
            }
          } catch (e: unknown) {
            setErrorMsg(e instanceof Error ? e.message : 'Falha ao enviar áudio para transcrição');
          } finally {
            setUploading(false);
          }
        })();
      };

      mediaRec.start(2000);
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e: unknown) {
      recordingSessionIdRef.current = null;
      stopStreams();
      setErrorMsg(e instanceof Error ? e.message : 'Microfone ou tela não autorizados.');
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStreams();
    };
  }, []);

  const removeSession = async (id: string) => {
    if (isRecording && activeSession?.id === id) {
      setErrorMsg('Encerre a gravação antes de remover esta escuta.');
      setConfirmDeleteId(null);
      return;
    }
    setDeletingId(id);
    setErrorMsg(null);
    try {
      await intelligentListeningService.deleteSession(id);
      if (activeSession?.id === id) {
        setActiveSession(null);
        setWizardStep(2);
      }
      if (selectedLeadId) await loadSessions(selectedLeadId);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Falha ao remover escuta');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const runAnalyze = async () => {
    if (!activeSession) return;
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const s = await intelligentListeningService.analyze(activeSession.id);
      setActiveSession(s);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Falha na análise IA');
    } finally {
      setAnalyzing(false);
    }
  };

  const runComplete = async () => {
    if (!activeSession) return;
    setCompleting(true);
    setErrorMsg(null);
    try {
      const s = await intelligentListeningService.completeToCrm(activeSession.id);
      setActiveSession(s);
      if (selectedLeadId) await loadSessions(selectedLeadId);
      alert('Resumo anexado às notas do lead no CRM.');
      navigate('/crm');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Falha ao salvar no CRM');
    } finally {
      setCompleting(false);
    }
  };

  const statusLabel = selectedLead ? LEAD_STATUS_LABELS[selectedLead.status] || selectedLead.status : '';
  const valueDisplay = selectedLead?.estimatedValue != null
    ? Number(selectedLead.estimatedValue).toLocaleString('pt-BR')
    : '—';

  const displayTranscript =
    activeSession?.transcriptionFull ||
    (localTranscript && !activeSession?.transcriptionFull ? localTranscript : '') ||
    '';

  const stepMeta = [
    { n: 1 as const, label: 'Lead', hint: 'Cliente' },
    { n: 2 as const, label: 'Escutas', hint: 'Sessões' },
    { n: 3 as const, label: 'Gravação', hint: 'IA & CRM' },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-emerald-50/35 via-white to-slate-50/90 px-3 sm:px-5 py-6 sm:py-10 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-7">
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-bold text-rose-900 shadow-sm">
            {errorMsg}
          </div>
        )}

        <nav
          className="rounded-2xl sm:rounded-[28px] border border-emerald-100/90 bg-white/90 backdrop-blur-md px-3 py-4 sm:px-6 sm:py-5 shadow-sm shadow-emerald-900/5"
          aria-label="Etapas da escuta inteligente"
        >
          <div className="flex items-center justify-between gap-2 max-w-md mx-auto sm:max-w-none sm:justify-center sm:gap-4">
            {stepMeta.map((s, idx) => {
              const done = wizardStep > s.n;
              const current = wizardStep === s.n;
              return (
                <React.Fragment key={s.n}>
                  <div className="flex flex-col items-center min-w-0 flex-1 sm:flex-none sm:min-w-[88px]">
                    <div
                      className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border-2 text-[11px] sm:text-sm font-black transition-all ${
                        current
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 scale-105'
                          : done
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={3} /> : s.n}
                    </div>
                    <span
                      className={`mt-1.5 text-[8px] sm:text-[10px] font-black uppercase tracking-tight text-center leading-tight ${
                        current ? 'text-emerald-800' : done ? 'text-emerald-600/90' : 'text-slate-400'
                      }`}
                    >
                      <span className="hidden sm:inline">{s.label}</span>
                      <span className="sm:hidden">{s.hint}</span>
                    </span>
                  </div>
                  {idx < 2 && (
                    <div
                      className={`h-0.5 flex-1 max-w-[40px] sm:max-w-[72px] min-w-[12px] rounded-full transition-colors ${done ? 'bg-emerald-400' : 'bg-slate-200'}`}
                      aria-hidden
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl sm:rounded-3xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/crm')}
              className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Voltar ao CRM"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-600/20 shrink-0">
              {selectedLead ? selectedLead.name.charAt(0) : '?'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escuta inteligente</p>
              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                {selectedLead ? selectedLead.name : 'Escolha um lead'}
              </h4>
            </div>
          </div>
          {selectedLead && wizardStep >= 2 && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 pl-1 sm:pl-0">
              <div className="text-left sm:text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor est.</p>
                <p className="text-sm font-black text-emerald-600">R$ {valueDisplay}</p>
              </div>
              <div className="h-8 w-px bg-slate-100 hidden sm:block" />
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100/80">
                <User size={14} className="text-emerald-600 shrink-0" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest max-w-[120px] sm:max-w-[160px] truncate">
                  {statusLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {wizardStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-lg shadow-slate-900/5 space-y-5"
            >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <h2 className="text-lg font-black text-gray-900 uppercase italic tracking-tight">1. Selecionar lead</h2>
          </div>
          <button
            type="button"
            disabled={leadsLoading}
            onClick={() => void loadLeads()}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 disabled:opacity-45"
          >
            {leadsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar lista
          </button>
        </div>
        <input
          type="search"
          placeholder="Buscar nome, e-mail ou telefone..."
          className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-medium"
          value={leadSearch}
          onChange={(e) => setLeadSearch(e.target.value)}
        />
        {leadsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar">
            {filteredLeads.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelectedLeadId(l.id)}
                className={`text-left p-4 rounded-2xl border transition-all ${
                  selectedLeadId === l.id
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-md'
                    : 'border-gray-100 hover:border-emerald-200 bg-gray-50/50'
                }`}
              >
                <p className="font-black text-gray-900 text-sm truncate">{l.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{l.email}</p>
              </button>
            ))}
          </div>
        )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  disabled={!selectedLeadId || leadsLoading}
                  onClick={() => proceedToEscutas()}
                  className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
                >
                  Continuar para escutas
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {wizardStep === 2 && selectedLeadId && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-lg shadow-slate-900/5 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => backToLeadStep()}
                  className="flex items-center gap-2 self-start text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-700"
                >
                  <ArrowLeft size={14} /> Trocar lead
                </button>
                <button
                  type="button"
                  onClick={() => void startNewSession()}
                  disabled={creatingSession || sessionsLoading || !!openingSessionId}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-55 disabled:cursor-wait min-h-[44px]"
                >
                  {creatingSession ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Criando escuta…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Nova escuta
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Headphones size={18} className="text-emerald-600 shrink-0" />
                <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase italic tracking-tight leading-tight">
                  Escutas deste lead
                </h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cada escuta é uma sessão no CRM. Aguarde a criação terminar antes de abrir outra — assim nada se perde no servidor.
              </p>
              {sessionsLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando escutas…</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center">
                  <p className="text-sm text-slate-600 font-medium">Nenhuma escuta ainda.</p>
                  <p className="text-xs text-slate-400 mt-2">Use &quot;Nova escuta&quot; para criar — você verá o progresso no botão.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-[min(52vh,420px)] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-100">
                  {sessions.map((s) => (
                    <li key={s.id} className="py-3.5 px-3 sm:px-4 flex items-stretch justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">{s.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                          <Calendar size={12} className="shrink-0" />
                          {s.createdAt?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                          <span className="text-emerald-600">{s.statusLabel}</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void openSession(s.id)}
                          disabled={openingSessionId !== null || creatingSession || (isRecording && activeSession?.id === s.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 disabled:opacity-45 min-h-[40px]"
                        >
                          {openingSessionId === s.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              Abrir <ChevronRight size={14} />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(s.id)}
                          disabled={deletingId !== null || creatingSession || (isRecording && activeSession?.id === s.id)}
                          className="flex items-center justify-center p-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 disabled:opacity-40"
                          aria-label="Remover escuta"
                        >
                          {deletingId === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {wizardStep === 3 && activeSession && selectedLead && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/95 to-white px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm shadow-emerald-900/5">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => backToSessionsList()}
                    className="shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-900 bg-white/80 border border-emerald-100 hover:bg-emerald-50 transition-colors"
                  >
                    <ArrowLeft size={14} /> Voltar às escutas
                  </button>
                  <p className="text-[11px] font-bold text-emerald-950 min-w-0">
                    <span className="font-black truncate block sm:inline">{activeSession.title}</span>
                    <span className="text-emerald-600/90"> · {activeSession.statusLabel}</span>
                  </p>
                </div>
                {uploading && (
                  <span className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-2 shrink-0">
                    <Loader2 size={14} className="animate-spin" /> Enviando e transcrevendo (Whisper)…
                  </span>
                )}
              </div>

          <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-2xl shadow-emerald-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center text-center space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'} shadow-lg`} />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                    {isRecording ? 'Gravando microfone + áudio do sistema' : 'Pronto para gravar'}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                  Escuta Inteligente <span className="text-emerald-500">AMPLIA</span>
                </h1>
                <p className="text-gray-500 font-medium italic text-sm max-w-2xl mx-auto">
                  Inicie a gravação: autorize o microfone e, na janela seguinte, escolha a aba do Google Meet (ou outra call) e marque{' '}
                  <strong>compartilhar áudio da guia</strong> para capturar voz e som do computador. O arquivo é enviado ao servidor para
                  transcrição (OpenAI Whisper) e análise.
                </p>
              </div>

              <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-[32px] p-8 border-4 border-white shadow-2xl relative">
                <div className="absolute top-4 left-6 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-gray-700'}`} />
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                    {isRecording ? formatTime(recordSeconds) : 'Standby'}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center min-h-[120px] py-4">
                  {isRecording ? (
                    <div className="flex items-center gap-1.5 h-16">
                      {Array.from(audioData)
                        .filter((_, i) => i % 8 === 0)
                        .map((val, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: Math.max(4, (val / 255) * 60) }}
                            className="w-1.5 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="text-emerald-500/20">
                      <Mic size={48} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) stopRecording();
                      else void startRecording();
                    }}
                    disabled={activeSession.status === 'COMPLETED' || uploading}
                    className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 ${
                      isRecording ? 'bg-rose-500 text-white shadow-rose-500/40' : 'bg-emerald-500 text-white shadow-emerald-500/40'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square size={18} className="fill-white" />
                        Encerrar e enviar
                      </>
                    ) : (
                      <>
                        <Play size={18} className="fill-white" />
                        Iniciar escuta
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-8 flex flex-wrap justify-center items-center gap-8 text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Transcrição Whisper</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Análise IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Integração CRM</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                    <MessageSquare size={20} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Transcrição</h3>
                </div>
                {!isRecording && displayTranscript && activeSession.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => void runAnalyze()}
                    disabled={analyzing || uploading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Gerar inteligência
                  </button>
                )}
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm min-h-[320px] max-h-[520px] overflow-y-auto custom-scrollbar relative">
                {displayTranscript ? (
                  <div className="space-y-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{displayTranscript}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 py-16">
                    <MicOff size={32} className="opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center max-w-[200px]">
                      Grave a reunião para gerar a transcrição no servidor
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                    <Sparkles size={20} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Análise Estratégica</h3>
                </div>
                {analysis && (
                  <button
                    type="button"
                    onClick={() => void runComplete()}
                    disabled={completing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#002a1e] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                  >
                    {completing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Enviar para CRM
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {analyzing ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[32px] p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-8 min-h-[320px]"
                  >
                    <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Gerando análise…</p>
                  </motion.div>
                ) : analysis ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="bg-[#002a1e] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-4">Resumo Executivo</h4>
                      <p className="text-sm font-medium text-emerald-50/80 leading-relaxed relative z-10">{analysis.resumo}</p>
                    </div>
                    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-emerald-500 mb-6">
                        <TrendingUp size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pontos Fortes</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.pontos_fortes.map((p, i) => (
                          <span
                            key={i}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-100"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-rose-500 mb-6">
                        <TrendingDown size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pontos Fracos</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.pontos_fracos.map((p, i) => (
                          <span
                            key={i}
                            className="px-4 py-2 bg-rose-50 text-rose-700 rounded-full text-[11px] font-bold border border-rose-100"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-500 mb-6">
                        <Lightbulb size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Próximos Passos</span>
                      </div>
                      <ul className="space-y-3">
                        {analysis.proximos_passos.map((p, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs font-bold text-gray-600">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-[32px] p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-6 min-h-[320px] text-center">
                    <Sparkles size={40} className="text-gray-200" />
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest max-w-[220px] mx-auto">
                      Após a transcrição, clique em Gerar inteligência
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
            </motion.div>
      )}
        </AnimatePresence>

        <AnimatePresence>
          {confirmDeleteId && (
            <motion.div
              key="del"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-delete-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
              onClick={() => {
                if (!deletingId) setConfirmDeleteId(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl"
              >
                <h2 id="confirm-delete-title" className="text-lg font-black text-slate-900">
                  Remover escuta inteligente?
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  A sessão será excluída permanentemente. Esta ação não pode ser desfeita.
                </p>
                {confirmDeleteId && (
                  <p className="mt-3 text-xs font-bold text-slate-400 truncate">
                    {sessions.find((x) => x.id === confirmDeleteId)?.title ?? ''}
                  </p>
                )}
                <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deletingId !== null}
                    onClick={() => confirmDeleteId && void removeSession(confirmDeleteId)}
                    className="px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20 disabled:opacity-50 inline-flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {deletingId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Remover
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedLeadId && !leadsLoading && wizardStep === 1 && (
          <p className="text-center text-sm text-slate-500 px-2">Selecione um lead na lista acima para continuar.</p>
        )}
      </div>
    </div>
  );
};

export default VideoMeeting;
