import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, Loader2, Upload, FileText, Save, User } from 'lucide-react';
import adminService, {
  Company,
  AdminConsultancyHistoryRow,
  ConsultancyMeetingDetailAdmin,
} from '../../services/adminService';
import { getErrorMessage } from '../../services/utils/errorHelper';

const AdminConsultancy: React.FC = () => {
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
  const [profile, setProfile] = useState({ displayName: '', role: '', avatarUrl: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const loadMeetings = async (cid: string) => {
    if (!cid) {
      setMeetings([]);
      return;
    }
    setLoadingList(true);
    try {
      const list = await adminService.listConsultancyMeetings(cid);
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
      await adminService.uploadConsultancyRecording(companyId, meetingId, file);
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
      const detail = await adminService.saveConsultancyTranscription(companyId, meetingId, transcription.trim());
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

  const handleSaveProfile = async () => {
    if (!companyId) return;
    setSavingProfile(true);
    setMessage(null);
    try {
      await adminService.patchConsultantProfile(companyId, {
        displayName: profile.displayName || undefined,
        role: profile.role || undefined,
        avatarUrl: profile.avatarUrl || undefined,
      });
      setMessage('Perfil do consultor atualizado.');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
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
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Consultoria estratégica</h1>
        <p className="text-sm text-gray-500 mt-1">
          Envio de gravações (Supabase), transcrição e geração de resumo GPT por empresa.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">{message}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Building2 size={18} /> Empresa
        </h2>
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

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <User size={18} /> Perfil do consultor (exibido ao cliente)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
            placeholder="Nome"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
          <input
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
            placeholder="Cargo"
            value={profile.role}
            onChange={(e) => setProfile({ ...profile, role: e.target.value })}
          />
          <input
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
            placeholder="URL da foto"
            value={profile.avatarUrl}
            onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
          />
        </div>
        <button
          type="button"
          disabled={!companyId || savingProfile}
          onClick={() => void handleSaveProfile()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
        >
          {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Salvar perfil
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
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
          Cadastre reuniões com tipo <strong>CONSULTANCY</strong> pelo calendário/API de meetings, ou migre dados
          existentes.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <Upload size={18} /> Gravação (vídeo/áudio)
        </h2>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 text-sm font-bold text-gray-700">
          {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          {uploading ? 'Enviando…' : 'Escolher arquivo'}
          <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleUpload} disabled={!meetingId || uploading} />
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
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

export default AdminConsultancy;
