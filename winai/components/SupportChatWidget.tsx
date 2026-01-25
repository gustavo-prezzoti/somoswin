
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minus, RefreshCcw, User, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

interface SupportConfig {
    id: number;
    systemPrompt: string;
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    isActive: boolean;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isLoading?: boolean;
}

const SupportChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<SupportConfig | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Don't show on admin pages or login
    const shouldHide = location.pathname.startsWith('/admin') || location.pathname === '/login' || location.pathname === '/';

    useEffect(() => {
        if (!shouldHide) {
            fetchConfig();
        }

        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('OPEN_SUPPORT_CHAT', handleOpenChat);

        return () => window.removeEventListener('OPEN_SUPPORT_CHAT', handleOpenChat);
    }, [shouldHide]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isMinimized]);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('win_access_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Remove /api/v1 from endpoint if API_URL already has it, or just ensure cleanliness
            // Assuming API_URL might be base, so we construct carefully
            const response = await fetch(`${API_URL}/support/config`, { headers });

            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            } else if (response.status === 401) {
                console.error('Unauthorized access to support config');
                // Optional: setConfig(null) or handle logout if critical
            }
        } catch (error) {
            console.error('Error fetching support config:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        // Add user message immediately
        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('win_access_token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/support/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message: text }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.' }]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Verifique sua internet.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOptionClick = (option: string) => {
        handleSendMessage(option);
    };

    if (shouldHide || !config?.isActive) return null;

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-emerald-700 hover:scale-110 transition-all z-[9999] group animate-in slide-in-from-bottom-10 fade-in duration-700"
            >
                <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 w-[380px] bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden transition-all duration-300 border border-gray-100 ${isMinimized ? 'h-16' : 'h-[600px] max-h-[80vh]'}`}>

            {/* Header */}
            <div className="bg-[#002a1e] p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 p-2 rounded-lg relative">
                        <Bot size={20} className="text-emerald-400" />
                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#002a1e] rounded-full"></div>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                            WinAI Assistant <Sparkles size={12} className="text-emerald-400" />
                        </h3>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {isMinimized ? <MessageCircle size={16} /> : <Minus size={16} />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-8 space-y-2 animate-in fade-in zoom-in duration-500">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bot size={32} className="text-emerald-600" />
                                </div>
                                <h4 className="font-bold text-gray-800">Olá! Como posso ajudar?</h4>
                                <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
                                    Sou o suporte da WinAI. Selecione uma opção abaixo ou digite sua dúvida.
                                </p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-emerald-600 text-white rounded-tr-sm'
                                        : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm prose prose-sm prose-emerald'
                                        }`}
                                >
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Options & Input */}
                    <div className="p-4 bg-white border-t border-gray-100 space-y-4">

                        {/* Quick Options */}
                        {messages.length === 0 && config && (
                            <div className="grid grid-cols-2 gap-2">
                                {[config.option1, config.option2, config.option3, config.option4].filter(Boolean).map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleOptionClick(opt)}
                                        className="text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-gray-100 p-2.5 rounded-xl transition-all text-left truncate"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Form */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage(inputValue);
                            }}
                            className="relative flex items-center"
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Digite sua dúvida..."
                                className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400 font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="absolute right-2 p-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors"
                            >
                                {isLoading ? <RefreshCcw size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </form>


                    </div>
                </>
            )}
        </div>
    );
};

export default SupportChatWidget;
