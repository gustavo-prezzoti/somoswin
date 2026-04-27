import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, FileText, Pencil, Trash2, Upload, X } from 'lucide-react';
import adminService, { Company, CompanyAgentDocumentRow } from '../../services/adminService';
import type { UserDTO } from '../../services/types';
import { getErrorMessage } from '../../services/utils/errorHelper';
import { useModal } from './ModalContext';
import { hasAmpliaPermission } from './adminPermissions';

const MAX_AGENT_DOC_INSTRUCTIONS = 6000;

function formatBytes(n: number | null | undefined): string {
    if (n == null || n <= 0) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const AdminDocumentos: React.FC = () => {
    const { showConfirm, showToast } = useModal();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [docs, setDocs] = useState<CompanyAgentDocumentRow[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadSendWhen, setUploadSendWhen] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [editForId, setEditForId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editSendWhen, setEditSendWhen] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const me = useMemo((): UserDTO | null => {
        try {
            const s = localStorage.getItem('win_user');
            return s ? (JSON.parse(s) as UserDTO) : null;
        } catch {
            return null;
        }
    }, []);

    const canList = hasAmpliaPermission(me, 'documentos', 'list');
    const canCreate = hasAmpliaPermission(me, 'documentos', 'create');
    const canDelete = hasAmpliaPermission(me, 'documentos', 'delete');
    const canUpdate = hasAmpliaPermission(me, 'documentos', 'update');

    useEffect(() => {
        (async () => {
            try {
                const data = await adminService.getAllCompanies();
                setCompanies(data || []);
            } catch (e) {
                console.error(e);
                showToast(getErrorMessage(e, 'Não foi possível carregar empresas.'), 'error');
            } finally {
                setLoadingCompanies(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- carregar empresas só na montagem
    }, []);

    useEffect(() => {
        if (!selectedCompanyId || !canList) {
            setDocs([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingDocs(true);
            try {
                const list = await adminService.listAgentDocuments(selectedCompanyId);
                if (!cancelled) setDocs(list || []);
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                    showToast(getErrorMessage(e, 'Erro ao listar documentos.'), 'error');
                    setDocs([]);
                }
            } finally {
                if (!cancelled) setLoadingDocs(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedCompanyId, canList]);

    const refreshDocs = async () => {
        if (!selectedCompanyId || !canList) return;
        setLoadingDocs(true);
        try {
            const list = await adminService.listAgentDocuments(selectedCompanyId);
            setDocs(list || []);
        } catch (e) {
            console.error(e);
            showToast(getErrorMessage(e, 'Erro ao atualizar lista.'), 'error');
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompanyId || !uploadFile || !uploadTitle.trim()) {
            showToast('Preencha o título e escolha um arquivo.', 'warning');
            return;
        }
        setUploading(true);
        try {
            await adminService.uploadAgentDocument(
                selectedCompanyId,
                uploadTitle.trim(),
                uploadFile,
                uploadSendWhen.trim() || undefined
            );
            setUploadTitle('');
            setUploadSendWhen('');
            setUploadFile(null);
            await refreshDocs();
            showToast('Documento enviado com sucesso.');
        } catch (err) {
            showToast(getErrorMessage(err, 'Falha no upload.'), 'error');
        } finally {
            setUploading(false);
        }
    };

    const startEdit = (row: CompanyAgentDocumentRow) => {
        setEditForId(row.id);
        setEditTitle(row.title);
        setEditSendWhen(row.sendWhenInstructions ?? '');
    };

    const cancelEdit = () => {
        setEditForId(null);
        setEditTitle('');
        setEditSendWhen('');
    };

    const saveEdit = async () => {
        if (!editForId || !editTitle.trim()) {
            showToast('Título é obrigatório.', 'warning');
            return;
        }
        if (editSendWhen.length > MAX_AGENT_DOC_INSTRUCTIONS) {
            showToast(`Instruções: máximo ${MAX_AGENT_DOC_INSTRUCTIONS} caracteres.`, 'warning');
            return;
        }
        setSavingEdit(true);
        try {
            await adminService.patchAgentDocument(editForId, {
                title: editTitle.trim(),
                sendWhenInstructions: editSendWhen.trim(),
            });
            cancelEdit();
            await refreshDocs();
            showToast('Documento atualizado.');
        } catch (err) {
            showToast(getErrorMessage(err, 'Não foi possível salvar.'), 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = (row: CompanyAgentDocumentRow) => {
        showConfirm({
            title: 'Excluir documento',
            message: `Remover "${row.title}"? O arquivo será apagado do armazenamento.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await adminService.deleteAgentDocument(row.id);
                    await refreshDocs();
                    showToast('Documento removido.');
                } catch (err) {
                    showToast(getErrorMessage(err, 'Não foi possível excluir.'), 'error');
                }
            },
        });
    };

    if (loadingCompanies) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-12 h-12 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Carregando…</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-[#141414] tracking-tighter uppercase italic leading-none">Documentos do agente</h1>
                    <p className="text-gray-600 font-medium text-sm tracking-tight mt-2">
                        Arquivos por empresa para a IA anexar no WhatsApp. Defina em cada arquivo <span className="font-black">quando enviar</span> — isso entra no catálogo automático do agente.
                    </p>
                </div>

                <div className="flex items-center gap-3 px-6 py-4 bg-white border border-black/5 rounded-2xl shadow-sm w-full lg:w-auto">
                    <Building2 size={16} className="text-emerald-600 shrink-0" />
                    <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="bg-transparent border-none font-black text-gray-800 uppercase italic text-[10px] tracking-widest py-0 focus:ring-0 cursor-pointer flex-1 min-w-0"
                    >
                        <option value="">SELECIONE UMA EMPRESA…</option>
                        {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedCompanyId && canCreate && (
                <form
                    onSubmit={handleUpload}
                    className="mb-10 p-6 bg-white rounded-[2rem] border border-black/5 shadow-sm space-y-4"
                >
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <Upload size={14} className="text-emerald-600" />
                        Novo upload
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título</label>
                            <input
                                type="text"
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 text-sm"
                                placeholder="Ex.: Tabela de preços"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Arquivo</label>
                            <input
                                type="file"
                                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-black file:text-[10px] file:uppercase"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Quando enviar (catálogo da IA) — opcional
                            </label>
                            <textarea
                                value={uploadSendWhen}
                                onChange={(e) =>
                                    setUploadSendWhen(e.target.value.slice(0, MAX_AGENT_DOC_INSTRUCTIONS))
                                }
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 text-sm leading-relaxed"
                                placeholder="Ex.: Quando o cliente pedir orçamento, proposta ou valores. Ex.: Quando perguntar sobre garantia ou contrato."
                            />
                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wide">
                                {uploadSendWhen.length}/{MAX_AGENT_DOC_INSTRUCTIONS} · Aparece no prompt do agente junto ao ID do arquivo (ATTACH_DOC).
                            </p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:brightness-110 disabled:opacity-40"
                    >
                        {uploading ? 'Enviando…' : 'Enviar'}
                    </button>
                </form>
            )}

            {!selectedCompanyId && (
                <div className="flex flex-col items-center justify-center py-40 bg-gray-50/80 rounded-[2rem] border border-black/5">
                    <div className="w-16 h-16 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-black/5 shadow-sm">
                        <Building2 size={32} />
                    </div>
                    <h3 className="text-xl font-black text-[#141414] uppercase tracking-tight">Selecione uma empresa</h3>
                    <p className="text-gray-600 text-sm mt-2 max-w-md text-center">Escolha a empresa para ver e gerenciar documentos.</p>
                </div>
            )}

            {selectedCompanyId && !canList && (
                <div className="p-8 text-center text-gray-600 text-sm font-bold">Sem permissão para listar documentos.</div>
            )}

            {selectedCompanyId && canList && loadingDocs && (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-black/10 border-t-[#00FF00] rounded-full animate-spin" />
                </div>
            )}

            {selectedCompanyId && canList && !loadingDocs && (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {docs.map((d) => (
                        <div
                            key={d.id}
                            className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm flex flex-col gap-4"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                    <FileText size={24} />
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {canUpdate && editForId !== d.id && (
                                        <button
                                            type="button"
                                            onClick={() => startEdit(d)}
                                            className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                                            aria-label="Editar"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(d)}
                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            aria-label="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {editForId === d.id ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Título</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                            Quando enviar
                                        </label>
                                        <textarea
                                            value={editSendWhen}
                                            onChange={(e) =>
                                                setEditSendWhen(e.target.value.slice(0, MAX_AGENT_DOC_INSTRUCTIONS))
                                            }
                                            rows={4}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-800 text-xs leading-relaxed"
                                        />
                                        <p className="text-[9px] font-bold text-gray-400 mt-1">
                                            {editSendWhen.length}/{MAX_AGENT_DOC_INSTRUCTIONS}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            disabled={savingEdit}
                                            onClick={saveEdit}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-40"
                                        >
                                            {savingEdit ? 'Salvando…' : 'Salvar'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={savingEdit}
                                            onClick={cancelEdit}
                                            className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase"
                                        >
                                            <X size={12} />
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="font-black text-gray-900 uppercase italic text-sm leading-tight">{d.title}</h3>
                                        <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wide">
                                            {d.mimeType} · {formatBytes(d.fileSize ?? undefined)}
                                        </p>
                                        {d.originalFilename && (
                                            <p className="text-[10px] text-gray-400 mt-1 truncate" title={d.originalFilename}>
                                                {d.originalFilename}
                                            </p>
                                        )}
                                        <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-black/5">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                Quando enviar
                                            </p>
                                            <p className="text-xs font-bold text-gray-700 leading-snug whitespace-pre-wrap">
                                                {d.sendWhenInstructions?.trim()
                                                    ? d.sendWhenInstructions
                                                    : '— Não definido. Edite para orientar a IA (ex.: pedido de orçamento → este PDF).'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-2 flex gap-2">
                                        <a
                                            href={d.publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase hover:bg-black"
                                        >
                                            <ExternalLink size={12} />
                                            Abrir
                                        </a>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedCompanyId && canList && !loadingDocs && docs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50/80 rounded-[2rem] border border-black/5">
                    <FileText size={40} className="text-emerald-600 mb-4" />
                    <h3 className="text-lg font-black text-[#141414] uppercase">Nenhum documento</h3>
                    <p className="text-gray-600 text-sm mt-2 text-center max-w-md">
                        Envie PDFs ou imagens para usar no catálogo do agente e no envio pelo WhatsApp.
                    </p>
                </div>
            )}
        </div>
    );
};

export default AdminDocumentos;
