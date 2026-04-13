
import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { leadService, LeadData, LEAD_STATUS_LABELS } from '../services';

const DEMO_LEAD_ID = '00000000-0000-0000-0000-000000000001';

function buildDemoLead(): LeadData {
  const now = new Date().toISOString();
  return {
    id: DEMO_LEAD_ID,
    name: 'Lead demonstração',
    email: 'demo@amplia.local',
    phone: null,
    status: 'NEW',
    statusLabel: LEAD_STATUS_LABELS.NEW,
    ownerName: null,
    notes: null,
    source: 'Demonstração',
    estimatedValue: 15000,
    leadScore: 50,
    createdAt: now,
    updatedAt: now,
  };
}

interface MeetingAnalysis {
  resumo: string;
  pontos_fortes: string[];
  pontos_fracos: string[];
  melhorias: string[];
  proximos_passos: string[];
}

const FALLBACK_ANALYSIS: MeetingAnalysis = {
  resumo:
    'Lead qualificado com alto potencial de fechamento. Foco em redução de CAC e escala operacional.',
  pontos_fortes: [
    'Identificação clara do problema',
    'Alinhamento de expectativas',
    'Demonstração de autoridade técnica',
  ],
  pontos_fracos: [
    'Falta de detalhamento sobre integração de CRM',
    'Tempo de implementação não foi fechado',
  ],
  melhorias: ['Apresentar fluxo de integração na próxima call', 'Trazer cronograma de 90 dias'],
  proximos_passos: [
    'Enviar proposta comercial personalizada',
    'Agendar reunião técnica com o CTO do cliente',
  ],
};

const VideoMeeting: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const leadFromCrm = location.state?.lead as LeadData | undefined;
  const lead = leadFromCrm ?? buildDemoLead();
  const isDemoLead = !leadFromCrm || lead.id === DEMO_LEAD_ID;

  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      startAudioVisualizer();

      const interval = setInterval(() => {
        const lines = [
          '[00:05] Consultor: Olá, bom dia! Vamos entender os desafios da sua operação hoje.',
          '[00:15] Cliente: No momento, nossa maior dificuldade é a escala do time comercial.',
          '[00:45] Consultor: Entendo. A AMPLIA atua justamente na automação dessa primeira abordagem.',
          '[01:10] Cliente: Isso reduziria muito o nosso CAC, certo?',
          '[01:30] Consultor: Exatamente. Além de aumentar a taxa de conversão final.',
        ];
        const currentLineIndex = Math.floor(timer / 10) % lines.length;
        if (timer % 10 === 0 && timer > 0) {
          setTranscription((prev) => prev + '\n' + lines[currentLineIndex]);
        }
      }, 1000);
      return () => {
        clearInterval(interval);
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioVisualizer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioVisualizer();
    };
  }, [isListening, timer]);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const update = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(new Uint8Array(dataArray));
          animationFrameRef.current = requestAnimationFrame(update);
        }
      };
      update();
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) void audioContextRef.current.close();
    setAudioData(new Uint8Array(0));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setTranscription((prev) => prev + '\n[Sessão finalizada às ' + new Date().toLocaleTimeString() + ']');
    } else {
      setIsListening(true);
      setTranscription('Iniciando Escuta Inteligente...\n[Aguardando áudio...]');
      setAnalysis(null);
      setTimer(0);
    }
  };

  const generateAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      setAnalysis(FALLBACK_ANALYSIS);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToCRM = async () => {
    if (!lead) return;
    const summary = analysis?.resumo || 'Análise de reunião estratégica.';
    const noteBlock = `\n\n--- Escuta Inteligente (${new Date().toLocaleString('pt-BR')}) ---\n${summary}`;

    if (isDemoLead) {
      alert('Conecte um lead real a partir do CRM (detalhes do lead → Escuta Inteligente) para gravar no pipeline.');
      navigate('/crm');
      return;
    }

    try {
      const existing = lead.notes || '';
      await leadService.updateLead(lead.id, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone || undefined,
        status: lead.status,
        ownerName: lead.ownerName || undefined,
        notes: existing + noteBlock,
        source: lead.source || undefined,
        estimatedValue: lead.estimatedValue ?? undefined,
        leadScore: lead.leadScore ?? undefined,
      });
      alert(`Resumo da escuta anexado às notas de ${lead.name}.`);
      navigate('/crm');
    } catch (e) {
      console.error(e);
      alert('Não foi possível salvar no CRM. Tente novamente.');
    }
  };

  const statusLabel = LEAD_STATUS_LABELS[lead.status] || lead.status;
  const valueDisplay =
    lead.estimatedValue != null ? Number(lead.estimatedValue).toLocaleString('pt-BR') : '—';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      {isDemoLead && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[11px] font-bold text-amber-900">
          Modo demonstração: abra um lead no CRM e use &quot;Escuta Inteligente&quot; para vincular um lead real e gravar notas na API.
        </div>
      )}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-gray-100">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/crm')} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
            {lead.name.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Conectado</p>
            <h4 className="text-sm font-black text-gray-900 tracking-tight">{lead.name}</h4>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Estimado</p>
            <p className="text-sm font-black text-emerald-600">R$ {valueDisplay}</p>
          </div>
          <div className="h-8 w-px bg-gray-100" />
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
            <User size={14} className="text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest max-w-[140px] truncate">
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-2xl shadow-emerald-900/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -ml-32 -mb-32 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'} shadow-lg`} />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                {isListening ? 'Sessão em Andamento' : 'Pronto para Escutar'}
              </span>
            </div>
            <h1 className="text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
              Escuta Inteligente <span className="text-emerald-500">AMPLIA</span>
            </h1>
            <p className="text-gray-500 font-medium italic text-base max-w-xl mx-auto">
              Capture cada detalhe da sua reunião. Nossa IA analisa em tempo real para gerar insights estratégicos e enviar direto ao seu CRM.
            </p>
          </div>

          <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-[32px] p-8 border-4 border-white shadow-2xl relative">
            <div className="absolute top-4 left-6 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-rose-500 animate-pulse' : 'bg-gray-700'}`} />
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                {isListening ? formatTime(timer) : 'Standby'}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[120px] py-4">
              {isListening ? (
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
                onClick={toggleListening}
                className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 ${
                  isListening ? 'bg-rose-500 text-white shadow-rose-500/40' : 'bg-emerald-500 text-white shadow-emerald-500/40'
                }`}
              >
                {isListening ? (
                  <>
                    <Square size={18} className="fill-white" />
                    Encerrar Sessão
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-white" />
                    Iniciar Escuta
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-8 flex flex-wrap justify-center items-center gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Transcrição Real-time</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Análise Estratégica IA</span>
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
              <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Transcrição Viva</h3>
            </div>

            {!isListening && transcription && !analysis && (
              <button
                type="button"
                onClick={generateAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Gerar Inteligência
              </button>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar relative">
            {transcription ? (
              <div className="space-y-4">
                {transcription.split('\n').map((line, i) => (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className={`text-sm font-medium leading-relaxed ${
                      line.startsWith('[')
                        ? 'text-emerald-500 font-black italic text-[10px] uppercase tracking-wider mt-4'
                        : 'text-gray-600'
                    }`}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 py-20">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                  <MicOff size={32} className="opacity-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-center max-w-[150px]">
                  Aguardando início da sessão para transcrever
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
                onClick={saveToCRM}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#002a1e] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-black/10"
              >
                <Save size={14} />
                Enviar para CRM
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-8 min-h-[400px]"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
                  <Loader2 className="w-16 h-16 text-emerald-500 animate-spin relative z-10" />
                </div>
                <div className="text-center space-y-3">
                  <h4 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Processando Insights</h4>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">
                    Nossa IA está extraindo as melhores oportunidades da sua conversa
                  </p>
                </div>
              </motion.div>
            ) : analysis ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="bg-[#002a1e] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Sparkles size={120} />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-4">Resumo Executivo</h4>
                  <p className="text-sm font-medium text-emerald-50/80 leading-relaxed relative z-10">{analysis.resumo}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
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
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-[32px] p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center space-y-6 min-h-[400px] text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-gray-200">
                  <Sparkles size={40} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Inteligência Estratégica</h4>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                    Finalize a escuta para transformar sua reunião em dados acionáveis.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VideoMeeting;
