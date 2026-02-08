import React, { useState, useRef, useEffect, JSX } from 'react';
import { FileText, CheckCircle2, AlertTriangle, ScrollText, Check } from 'lucide-react';
import { termsService, TermsOfService } from '../services/api/terms.service';

interface TermsAcceptanceModalProps {
    onAccepted: () => void;
}

const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({ onAccepted }) => {
    const [terms, setTerms] = useState<TermsOfService | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadTerms();
    }, []);

    const loadTerms = async () => {
        try {
            const data = await termsService.getPersonalizedTerms();
            setTerms(data);
        } catch (err) {
            setError('Erro ao carregar os termos de serviço');
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const threshold = 50;

        if (scrollHeight - scrollTop - clientHeight <= threshold) {
            setHasScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (!isChecked || !hasScrolledToBottom) return;

        setAccepting(true);
        try {
            await termsService.acceptTerms();
            onAccepted();
        } catch (err) {
            setError('Erro ao aceitar os termos. Tente novamente.');
            setAccepting(false);
        }
    };

    const renderMarkdown = (content: string) => {
        if (!content) return null;

        const lines = content.split('\n');
        const elements: JSX.Element[] = [];
        let listItems: string[] = [];
        let listType: 'ul' | 'ol' | null = null;

        const flushList = () => {
            if (listItems.length > 0 && listType) {
                const ListTag = listType === 'ul' ? 'ul' : 'ol';
                elements.push(
                    <ListTag key={elements.length} className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} list-inside mb-4 space-y-1 text-gray-700`}>
                        {listItems.map((item, i) => (
                            <li key={i} className="leading-relaxed">{formatInlineElements(item)}</li>
                        ))}
                    </ListTag>
                );
                listItems = [];
                listType = null;
            }
        };

        const formatInlineElements = (text: string): React.ReactNode => {
            const parts: React.ReactNode[] = [];
            let remaining = text;
            let key = 0;

            while (remaining.length > 0) {
                const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
                const checkMatch = remaining.match(/[✅❌⚠️📹]/);

                if (boldMatch && boldMatch.index !== undefined) {
                    if (boldMatch.index > 0) {
                        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
                    }
                    parts.push(<strong key={key++} className="font-bold text-gray-900">{boldMatch[1]}</strong>);
                    remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
                } else if (checkMatch && checkMatch.index !== undefined) {
                    if (checkMatch.index > 0) {
                        parts.push(<span key={key++}>{remaining.slice(0, checkMatch.index)}</span>);
                    }
                    const emoji = checkMatch[0];
                    parts.push(<span key={key++} className="mr-1">{emoji}</span>);
                    remaining = remaining.slice(checkMatch.index + emoji.length);
                } else {
                    parts.push(<span key={key++}>{remaining}</span>);
                    break;
                }
            }

            return parts.length === 1 ? parts[0] : <>{parts}</>;
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            if (trimmedLine.match(/^#+\s/)) {
                flushList();
                const level = trimmedLine.match(/^(#+)/)?.[1].length || 1;
                const text = trimmedLine.replace(/^#+\s/, '');

                if (level === 1) {
                    elements.push(
                        <h1 key={index} className="text-2xl font-black text-gray-900 mb-4 mt-6 border-b border-gray-200 pb-2">
                            {text}
                        </h1>
                    );
                } else if (level === 2) {
                    elements.push(
                        <h2 key={index} className="text-xl font-bold text-gray-800 mb-3 mt-5">
                            {text}
                        </h2>
                    );
                } else {
                    elements.push(
                        <h3 key={index} className="text-lg font-semibold text-gray-700 mb-2 mt-4">
                            {text}
                        </h3>
                    );
                }
            }
            else if (trimmedLine.match(/^\d+\.\s+[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕ]/)) {
                flushList();
                const text = trimmedLine.replace(/^\d+\.\s+/, '');
                elements.push(
                    <h2 key={index} className="text-lg font-bold text-emerald-700 mb-3 mt-6 flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-sm text-emerald-700 font-bold">
                            {trimmedLine.match(/^(\d+)/)?.[1]}
                        </span>
                        {text}
                    </h2>
                );
            }
            else if (trimmedLine.match(/^[•\-\*]\s/)) {
                if (listType !== 'ul') {
                    flushList();
                    listType = 'ul';
                }
                listItems.push(trimmedLine.replace(/^[•\-\*]\s/, ''));
            }
            else if (trimmedLine === '') {
                flushList();
            }
            else if (trimmedLine.startsWith('PARTES') || trimmedLine.startsWith('CONTRATADA:') ||
                trimmedLine.startsWith('CONTRATANTE:') || trimmedLine.startsWith('CNPJ') ||
                trimmedLine.startsWith('Endereço:') || trimmedLine.startsWith('E-mail:')) {
                flushList();
                elements.push(
                    <p key={index} className="text-gray-600 mb-1 font-medium">
                        {formatInlineElements(trimmedLine)}
                    </p>
                );
            }
            else if (trimmedLine.startsWith('DECLARAÇÃO') || trimmedLine.startsWith('ACEITE')) {
                flushList();
                elements.push(
                    <div key={index} className="bg-emerald-50 border-l-4 border-emerald-500 p-4 my-4 rounded-r-lg">
                        <h3 className="text-lg font-bold text-emerald-800">{trimmedLine}</h3>
                    </div>
                );
            }
            else {
                flushList();
                if (trimmedLine.length > 0) {
                    elements.push(
                        <p key={index} className="text-gray-700 mb-3 leading-relaxed">
                            {formatInlineElements(trimmedLine)}
                        </p>
                    );
                }
            }
        });

        flushList();
        return elements;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!terms) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <FileText className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Termo de Aceite</h1>
                        <p className="text-emerald-100 text-sm">Versão {terms.version} • Leia atentamente antes de continuar</p>
                    </div>
                </div>

                {!hasScrolledToBottom && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                        <p className="text-amber-800 text-sm font-medium">
                            <ScrollText className="inline mr-1" size={16} />
                            Role até o final do documento para habilitar o aceite
                        </p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-3">
                        <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                        <p className="text-red-800 text-sm font-medium">{error}</p>
                    </div>
                )}

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50"
                >
                    <div className="prose prose-emerald max-w-none">
                        {renderMarkdown(terms.content)}
                    </div>

                    {hasScrolledToBottom && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-emerald-500 transition-colors">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="relative mt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => setIsChecked(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isChecked
                                            ? 'bg-emerald-500 border-emerald-500'
                                            : 'bg-white border-gray-300 hover:border-emerald-400'
                                            }`}>
                                            {isChecked && <Check size={16} className="text-white" strokeWidth={3} />}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">
                                            Declaro que li e concordo com todos os termos acima
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Ao marcar esta opção, você confirma que leu, compreendeu e aceita integralmente
                                            os termos de serviço apresentados.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-500 hidden sm:block">
                        WIN GESTÃO DE MÍDIAS SOCIAIS LTDA • CNPJ: 53.269.771/0001-45
                    </p>
                    <button
                        onClick={handleAccept}
                        disabled={!hasScrolledToBottom || !isChecked || accepting}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all ${hasScrolledToBottom && isChecked && !accepting
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                            : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        {accepting ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Processando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={20} />
                                Aceitar e Continuar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsAcceptanceModal;
