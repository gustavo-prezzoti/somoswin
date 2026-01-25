import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, Phone, Video, Paperclip, Smile, CheckCheck, ChevronRight, ChevronLeft, Bot, UserCheck, Zap, Info, MoreHorizontal, Loader2, Mic, Image, FileText, X, Trash2, StopCircle } from 'lucide-react';
import { whatsappService, WhatsAppConversation, WhatsAppMessage } from '../services/api/whatsapp.service';
import { useWebSocket } from '../hooks/useWebSocket';
import { userService } from '../services/api/user.service';
import { useSearchParams } from 'react-router-dom';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import AudioPlayer from './ui/AudioPlayer';

const WhatsApp: React.FC = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalContacts, setTotalContacts] = useState(0);
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get('chatId');

  // Novos estados para Emoji e Áudio
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modo de suporte vem da conversa ativa
  const supportMode = activeConversation?.supportMode || 'IA';

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Recarregar conversas quando o usuário for carregado
    if (user) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeConversation?.id) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    // Só rola para o final se shouldScrollToBottom for true
    if (shouldScrollToBottom && messagesEndRef.current && messages.length > 0) {
      const behavior = isInitialLoad ? 'auto' : 'smooth';

      // Se for carga inicial, usamos um pequeno delay para garantir renderização de imagens/layout
      // Se for nova mensagem, scrollamos imediatamente
      if (isInitialLoad) {
        // Tenta scroll imediato
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });

        // Reforça após renderização completa
        const timeoutId = setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
            setIsInitialLoad(false);
          }
        }, 300);
        return () => clearTimeout(timeoutId);
      } else {
        // Scroll imediato para novas mensagens
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    }
  }, [messages, shouldScrollToBottom, isInitialLoad]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      let data: WhatsAppConversation[] = [];

      // Se o usuário está logado e tem company, buscar conversas filtradas
      if (user?.id && user?.company?.id) {
        data = await whatsappService.getConversationsByUser(user.id, user.company.id);
      } else {
        // Fallback para buscar todas
        data = await whatsappService.getConversations();
      }

      // Ordenar por timestamp da última mensagem (mais recente primeiro)
      data.sort((a, b) => {
        const timeA = a.lastMessageTimestamp || 0;
        const timeB = b.lastMessageTimestamp || 0;
        return timeB - timeA;
      });

      setConversations(data);
      setTotalContacts(data.length);

      let selectedConv: WhatsAppConversation | null = null;

      // Se houver um chatId na URL, prioridade para ele
      if (chatId) {
        selectedConv = data.find(c => c.id === chatId) || null;
      }

      // Se não encontrou pelo chatId ou não tinha chatId, pega a primeira se não tiver ativa
      if (!selectedConv && data.length > 0 && !activeConversation && !silent) {
        selectedConv = data[0];
      }

      if (selectedConv) {
        setActiveConversation(selectedConv);
        // Limpar o chatId da URL se quiser (opcional)
      }
    } catch (error) {
      console.error('Erro ao carregar conversas', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeConversation, user]);

  const loadNewMessages = async (conversationId: string) => {
    try {
      // Carrega apenas mensagens novas (primeira página)
      const data = await whatsappService.getMessages(conversationId, 0, 10);

      setMessages(prev => {
        const newMessages = [...prev];
        let hasChanges = false;

        data.forEach(newMsg => {
          if (!prev.some(m => m.id === newMsg.id)) {
            newMessages.push(newMsg);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          if (messagesEndRef.current) {
            setShouldScrollToBottom(true);
          }
          return newMessages.sort((a, b) => a.messageTimestamp - b.messageTimestamp);
        }

        return prev;
      });

    } catch (error) {
      // Silently ignore polling errors
    }
  };

  useEffect(() => {
    // Polling de conversas como fallback (a cada 60 segundos)
    const intervalId = setInterval(() => {
      if (user?.id && user?.company?.id) {
        loadConversations(true); // silent load
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [user, loadConversations]);

  useEffect(() => {
    // Polling de mensagens da conversa ativa como fallback (a cada 30 segundos)
    let msgIntervalId: NodeJS.Timeout;

    if (activeConversation?.id) {
      msgIntervalId = setInterval(() => {
        loadNewMessages(activeConversation.id);
      }, 30000);
    }

    return () => {
      if (msgIntervalId) clearInterval(msgIntervalId);
    };
  }, [activeConversation?.id]);

  // Callback memoizado para WebSocket
  const handleWebSocketMessage = useCallback((data: any) => {
    console.log('WebSocket message received:', data.type);

    // ===============================================
    // 1. NOVA MENSAGEM RECEBIDA
    // ===============================================
    if (data.type === 'NEW_MESSAGE' && data.message) {
      const msg = data.message;
      console.log('WebSocket NEW_MESSAGE:', {
        messageId: msg.id,
        conversationId: msg.conversationId,
        fromMe: msg.fromMe,
        contentPreview: msg.content?.substring(0, 50) || '[MEDIA]'
      });

      // Adicionar mensagem à conversa ativa se for dela
      if (activeConversation && msg.conversationId === activeConversation.id) {
        setMessages(prev => {
          // Evitar duplicatas
          if (prev.some(m => m.id === msg.id)) {
            console.log('Message duplicate, skipping');
            return prev;
          }
          console.log('Adding new message to chat');
          setShouldScrollToBottom(true);
          return [...prev, msg].sort((a, b) => a.messageTimestamp - b.messageTimestamp);
        });

        // Atualizar preview da conversa ativa
        setActiveConversation(prev => prev ? {
          ...prev,
          lastMessageText: msg.content || '[Mídia]',
          lastMessageTimestamp: msg.messageTimestamp,
          unreadCount: 0 // Já está aberta, então não conta como não lida
        } : null);
      }

      // Atualizar lista de conversas - mover para o topo e atualizar preview
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c.id === msg.conversationId);

        if (existingIndex >= 0) {
          const updated = [...prev];
          const conversation = { ...updated[existingIndex] };

          // Atualizar dados da conversa
          conversation.lastMessageText = msg.content || '[Mídia]';
          conversation.lastMessageTimestamp = msg.messageTimestamp;

          // Incrementar unread se não for a conversa ativa
          if (!activeConversation || msg.conversationId !== activeConversation.id) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }

          // Remover da posição atual
          updated.splice(existingIndex, 1);
          // Adicionar no topo (mais recente primeiro)
          updated.unshift(conversation);

          setTotalContacts(updated.length);
          return updated;
        }

        // Se a conversa não existe, fazer reload para buscar o novo contato
        console.log('Conversation not found, fetching new contact...');
        loadConversations(true);
        return prev;
      });
    }

    // ===============================================
    // 2. NOVO CONTATO/CONVERSA CRIADA
    // ===============================================
    else if (data.type === 'NEW_CONTACT' && (data.conversation || data.contact)) {
      const newConversation = data.conversation || data.contact;
      console.log('WebSocket NEW_CONTACT:', newConversation);

      setConversations(prev => {
        // Verificar se já existe
        if (prev.some(c => c.id === newConversation.id)) {
          console.log('Contact already exists');
          return prev;
        }

        // Adicionar no topo da lista
        console.log('Adding new contact to list');
        const updated = [newConversation, ...prev];
        setTotalContacts(updated.length);
        return updated;
      });
    }

    // ===============================================
    // 3. CONVERSA ATUALIZADA (status, nome, etc)
    // ===============================================
    else if (data.type === 'CONVERSATION_UPDATED' && data.conversation) {
      const conv = data.conversation;
      console.log('WebSocket CONVERSATION_UPDATED:', conv.id);

      setConversations(prev => {
        const index = prev.findIndex(c => c.id === conv.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...conv };

          // Se tem nova mensagem, mover para o topo
          if (conv.lastMessageTimestamp && conv.lastMessageTimestamp > (prev[index].lastMessageTimestamp || 0)) {
            const [movedConv] = updated.splice(index, 1);
            updated.unshift(movedConv);
          }

          return updated;
        } else {
          // Nova conversa, adicionar no topo
          return [conv, ...prev];
        }
      });

      // Atualizar conversa ativa se for a mesma
      if (activeConversation?.id === conv.id) {
        setActiveConversation(prev => prev ? { ...prev, ...conv } : null);
      }
    }

    // ===============================================
    // 4. MODO DE SUPORTE ALTERADO
    // ===============================================
    else if (data.type === 'SUPPORT_MODE_CHANGED') {
      console.log('WebSocket SUPPORT_MODE_CHANGED:', data.conversationId, data.mode);

      setConversations(prev => prev.map(c =>
        c.id === data.conversationId ? { ...c, supportMode: data.mode } : c
      ));

      if (activeConversation?.id === data.conversationId) {
        setActiveConversation(prev => prev ? { ...prev, supportMode: data.mode } : null);
      }
    }

    // ===============================================
    // 5. MENSAGEM ENVIADA (confirmação)
    // ===============================================
    else if (data.type === 'MESSAGE_SENT' && data.message) {
      const msg = data.message;
      console.log('WebSocket MESSAGE_SENT confirmation:', msg.id);

      // Atualizar mensagem otimista com dados confirmados
      setMessages(prev => {
        const index = prev.findIndex(m => m.id === msg.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...msg, status: 'sent' };
          return updated;
        }
        return prev;
      });
    }

  }, [activeConversation, loadConversations]);

  // WebSocket para atualização em tempo real
  useWebSocket(
    user?.company?.id || null,
    handleWebSocketMessage,
    !!user?.company?.id
  );

  const loadUser = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Erro ao carregar usuário', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsInitialLoad(true);
      setShouldScrollToBottom(true);
      setPage(0);
      setHasMore(true);
      setMessages([]); // Limpa mensagens anteriores

      // Carrega apenas as 10 últimas mensagens inicialmente
      const data = await whatsappService.getMessages(conversationId, 0, 10);
      setMessages(data);

      if (data.length < 10) {
        setHasMore(false);
      }

      // Marcar como lida
      if (activeConversation && activeConversation.unreadCount > 0) {
        await whatsappService.markAsRead(conversationId);
        // Atualizar conversa localmente
        setActiveConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
        setConversations(prev => prev.map(c =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens', error);
      setMessages([]);
    }
  };

  const handleLoadMore = async () => {
    if (!activeConversation || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      setShouldScrollToBottom(false); // Não rola para baixo ao carregar antigas

      const nextPage = page + 1;
      // Carrega mais 20 mensagens
      const data = await whatsappService.getMessages(activeConversation.id, nextPage, 20);

      if (data.length > 0) {
        setMessages(prev => [...data, ...prev]); // Adiciona no início (topo)
        setPage(nextPage);
        if (data.length < 20) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Erro ao carregar mais mensagens', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeConversation || isSending) return;

    const messageText = message.trim();
    setMessage('');
    setIsSending(true);
    setShouldScrollToBottom(true); // Garante scroll para a nova mensagem

    try {
      const sentMessage = await whatsappService.sendMessage({
        phoneNumber: activeConversation.phoneNumber,
        message: messageText,
        leadId: activeConversation.leadId || undefined
      });

      // Adicionar mensagem enviada à lista (evitando duplicata se o WebSocket já entregou)
      setMessages(prev => {
        if (prev.some(m => m.id === sentMessage.id)) return prev;
        return [...prev, sentMessage];
      });

      // Atualizar última mensagem da conversa
      setActiveConversation(prev => prev ? {
        ...prev,
        lastMessageText: messageText,
        lastMessageTimestamp: sentMessage.messageTimestamp
      } : null);

      // Atualizar lista de conversas
      loadConversations();
    } catch (error) {
      console.error('Erro ao enviar mensagem', error);
      setMessage(messageText); // Restaurar mensagem em caso de erro
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleSupportMode = async (mode: 'IA' | 'HUMAN') => {
    if (!activeConversation) return;

    try {
      const updated = await whatsappService.toggleSupportMode(activeConversation.id, mode);

      // Atualizar conversa ativa
      setActiveConversation(updated);

      // Atualizar na lista
      setConversations(prev => prev.map(c =>
        c.id === updated.id ? updated : c
      ));
    } catch (error) {
      console.error('Erro ao alternar modo:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSendFile(file);
    }
  };

  const handleSendFile = async (file: File) => {
    if (!activeConversation || !user) return;

    try {
      setIsSending(true);

      // Determinar tipo de mídia
      let mediaType = 'document';
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('phoneNumber', activeConversation.phoneNumber);
      formData.append('mediaType', mediaType);
      if (activeConversation.leadId) {
        formData.append('leadId', activeConversation.leadId);
      }

      const sentMessage = await whatsappService.sendMedia(formData, user.company.id);
      setMessages(prev => [...prev, sentMessage]);

      // Limpar input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      loadConversations();
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      alert('Erro ao enviar arquivo');
    } finally {
      setIsSending(false);
    }
  };


  // Funções de Emojis
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Funções de Gravação de Áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Permissão de microfone negada ou não disponível.');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Parar tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Pequeno delay para garantir que o evento onstop processe os chunks
      setTimeout(async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // WebM é suportado pela maioria dos browsers recentes

          // Criar nome de arquivo único
          const fileName = `audio-${Date.now()}.webm`;
          const audioFile = new File([audioBlob], fileName, { type: "audio/webm" });

          await handleSendFile(audioFile);
        }
      }, 200);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    audioChunksRef.current = [];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAudio = (messageId: string, audioUrl: string) => {
    const audioElement = audioRefs.current[messageId];

    if (playingAudio === messageId && audioElement) {
      audioElement.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio]?.pause();
      }

      if (!audioElement) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudio(null);
        audio.onerror = () => setPlayingAudio(null);
        audioRefs.current[messageId] = audio;
        audio.play().catch(() => setPlayingAudio(null));
      } else {
        audioElement.play().catch(() => setPlayingAudio(null));
      }
      setPlayingAudio(messageId);
    }
  };

  const isMediaMessage = (msg: WhatsAppMessage) => {
    const mediaTypes = ['audio', 'ptt', 'image', 'video', 'document', 'sticker'];
    return msg.mediaUrl || mediaTypes.some(t =>
      msg.messageType?.toLowerCase().includes(t) ||
      msg.mediaType?.toLowerCase().includes(t)
    );
  };

  const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    if (!text) return null;

    const parseMarkdown = (content: string) => {
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;

      // Regex patterns para markdown
      const patterns = [
        { regex: /^### (.*?)$/gm, tag: 'h3', className: 'text-sm font-bold mt-2 mb-1' },
        { regex: /^## (.*?)$/gm, tag: 'h2', className: 'text-base font-bold mt-3 mb-2' },
        { regex: /^# (.*?)$/gm, tag: 'h1', className: 'text-lg font-bold mt-4 mb-2' },
        { regex: /\*\*(.*?)\*\*/g, tag: 'strong', className: 'font-bold' },
        { regex: /\*(.*?)\*/g, tag: 'em', className: 'italic' },
        { regex: /`(.*?)`/g, tag: 'code', className: 'bg-gray-100 px-1 rounded text-xs' },
      ];

      // Dividir por linhas e processar
      const lines = content.split('\n');

      return lines.map((line, idx) => {
        // Títulos
        if (line.match(/^# [^#]/)) {
          return <h1 key={idx} className="text-lg font-bold mt-4 mb-2">{line.replace(/^# /, '')}</h1>;
        }
        if (line.match(/^## [^#]/)) {
          return <h2 key={idx} className="text-base font-bold mt-3 mb-2">{line.replace(/^## /, '')}</h2>;
        }
        if (line.match(/^### /)) {
          return <h3 key={idx} className="text-sm font-bold mt-2 mb-1">{line.replace(/^### /, '')}</h3>;
        }

        // Blocos de código (com backticks triplos)
        if (line.trim().startsWith('```')) {
          return null; // Pula marcadores
        }

        // Linhas horizontais
        if (line.match(/^---+$/)) {
          return <hr key={idx} className="my-3 border-gray-200" />;
        }

        // Listas com "-"
        if (line.match(/^- /)) {
          return (
            <div key={idx} className="ml-4 mb-1">
              • {line.replace(/^- /, '')}
            </div>
          );
        }

        // Listas numeradas
        if (line.match(/^\d+\. /)) {
          const match = line.match(/^(\d+\.)\s+(.*)$/);
          if (match) {
            return (
              <div key={idx} className="ml-4 mb-1 flex items-start gap-2">
                <span className="font-semibold whitespace-nowrap">{match[1]}</span>
                <span>{match[2]}</span>
              </div>
            );
          }
          return (
            <div key={idx} className="ml-4 mb-1">
              {line}
            </div>
          );
        }

        // Citações (>)
        if (line.match(/^> /)) {
          return (
            <blockquote key={idx} className="border-l-4 border-gray-300 pl-3 italic text-gray-600 my-2">
              {line.replace(/^> /, '')}
            </blockquote>
          );
        }

        // Linhas vazias
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }

        // Parágrafo normal com formatação inline
        return (
          <div key={idx} className="mb-2">
            {formatInlineMarkdown(line)}
          </div>
        );
      });
    };

    const formatInlineMarkdown = (text: string) => {
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;

      // Padrões: **bold**, *italic*, `code`
      const regex = /\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`/g;
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Adicionar texto antes do match
        if (match.index > lastIndex) {
          elements.push(text.slice(lastIndex, match.index));
        }

        if (match[1]) {
          // **bold**
          elements.push(
            <strong key={`bold-${match.index}`} className="font-bold">
              {match[1]}
            </strong>
          );
        } else if (match[2]) {
          // *italic*
          elements.push(
            <em key={`italic-${match.index}`} className="italic">
              {match[2]}
            </em>
          );
        } else if (match[3]) {
          // `code`
          elements.push(
            <code key={`code-${match.index}`} className="bg-gray-100 px-1 rounded text-xs">
              {match[3]}
            </code>
          );
        }

        lastIndex = regex.lastIndex;
      }

      // Adicionar texto restante
      if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
      }

      return elements.length > 0 ? elements : text;
    };

    return (
      <div className={`${className || ''} space-y-1`}>
        {parseMarkdown(text)}
      </div>
    );
  };

  const renderMessageContent = (msg: WhatsAppMessage) => {
    const messageTypeLower = (msg.messageType || '').toLowerCase();
    const mediaTypeLower = (msg.mediaType || '').toLowerCase();

    const isAudio = messageTypeLower.includes('audio') || messageTypeLower.includes('ptt') ||
      mediaTypeLower.includes('audio') || mediaTypeLower.includes('ogg') ||
      mediaTypeLower.includes('mp3') || mediaTypeLower.includes('mpeg');

    if (isAudio) {
      return (
        <AudioPlayer
          src={msg.mediaUrl || ''}
          duration={msg.mediaDuration}
          transcription={msg.transcription}
          fromMe={msg.fromMe}
          messageId={msg.id}
        />
      );
    }

    if (messageTypeLower.includes('image') || mediaTypeLower.includes('image')) {
      return (
        <div className="space-y-2">
          {msg.mediaUrl && <img src={msg.mediaUrl} alt="Imagem" className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.mediaUrl!, '_blank')} />}
          {msg.content && <FormattedText text={msg.content} />}
        </div>
      );
    }

    if (messageTypeLower.includes('video') || mediaTypeLower.includes('video')) {
      return (
        <div className="space-y-2">
          {msg.mediaUrl && <video src={msg.mediaUrl} controls className="max-w-[280px] rounded-lg" />}
          {msg.content && <FormattedText text={msg.content} />}
        </div>
      );
    }

    if (messageTypeLower.includes('document') || mediaTypeLower.includes('application')) {
      return (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${msg.fromMe ? 'bg-white/20' : 'bg-gray-100'}`}>
            <FileText size={20} className={msg.fromMe ? 'text-white' : 'text-gray-600'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[12px] font-bold truncate ${msg.fromMe ? 'text-white' : 'text-gray-800'}`}>{msg.content || 'Documento'}</p>
            {msg.mediaUrl && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={`text-[10px] ${msg.fromMe ? 'text-white/70 hover:text-white' : 'text-emerald-600 hover:text-emerald-700'}`}>Baixar arquivo</a>}
          </div>
        </div>
      );
    }

    if (messageTypeLower.includes('sticker')) {
      return msg.mediaUrl ? <img src={msg.mediaUrl} alt="Sticker" className="w-24 h-24" /> : <p>{msg.content || '🎭 Sticker'}</p>;
    }

    // Fallback para mensagens vazias
    if (!msg.content || msg.content.trim() === '') {
      console.warn('Mensagem vazia recebida:', msg);
      return <FormattedText text="[Mensagem vazia]" />;
    }

    return <FormattedText text={msg.content} />;
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center bg-white rounded-[32px] border border-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
          <p className="text-gray-500 font-medium">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">

      {/* Sidebar - Lista de Contatos */}
      <div className="w-72 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase italic">
              Mensagens <span className="text-xs text-gray-400 font-medium not-italic ml-1">({totalContacts})</span>
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl border-none focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-xs font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">Nenhuma conversa ainda</p>
            </div>
          ) : (
            conversations
              .filter(chat =>
                !searchTerm ||
                (chat.contactName && chat.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                chat.phoneNumber.includes(searchTerm)
              )
              .map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveConversation(chat)}
                  className={`px-6 py-4 flex items-center gap-3 cursor-pointer transition-all border-r-2 ${activeConversation?.id === chat.id
                    ? 'bg-emerald-50/50 border-emerald-500'
                    : 'border-transparent hover:bg-gray-50'
                    }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-600 font-black text-sm">
                        {chat.contactName ? chat.contactName.charAt(0).toUpperCase() : chat.phoneNumber.slice(-2)}
                      </span>
                    </div>
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{chat.unreadCount > 9 ? '9+' : chat.unreadCount}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-[13px] font-bold text-gray-800 truncate">
                        {chat.contactName || chat.phoneNumber}
                      </h3>
                      {chat.lastMessageTimestamp && (
                        <span className="text-[9px] font-bold text-gray-300 uppercase">
                          {formatDate(chat.lastMessageTimestamp)}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate ${chat.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                      {chat.lastMessageText || 'Sem mensagens'}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Chat Central */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col bg-gray-50/30">
          {/* Header */}
          <div className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 font-black text-sm">
                  {activeConversation.contactName ? activeConversation.contactName.charAt(0).toUpperCase() : activeConversation.phoneNumber.slice(-2)}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800 tracking-tight flex items-center gap-2">
                  {activeConversation.contactName || activeConversation.phoneNumber}
                </h3>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                  Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => handleToggleSupportMode('IA')}
                  disabled={supportMode === 'IA'}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${supportMode === 'IA'
                    ? 'bg-white text-emerald-600 shadow-sm cursor-not-allowed'
                    : 'text-gray-400 hover:bg-white/50'
                    }`}
                >
                  <Bot size={12} /> IA
                </button>
                <button
                  onClick={() => handleToggleSupportMode('HUMAN')}
                  disabled={supportMode === 'HUMAN'}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${supportMode === 'HUMAN'
                    ? 'bg-white text-rose-500 shadow-sm cursor-not-allowed'
                    : 'text-gray-400 hover:bg-white/50'
                    }`}
                >
                  <UserCheck size={12} /> Humano
                </button>
              </div>
              <div className="h-8 w-px bg-gray-100"></div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className={`p-2.5 rounded-lg transition-all ${isDetailsOpen ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                >
                  <Info size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-10 py-8 flex flex-col gap-4 custom-scrollbar" ref={messagesContainerRef}>
            {/* Botão Ver Mais */}
            {hasMore && (
              <div className="flex justify-center py-2 shrink-0">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-gray-100 text-gray-500 text-[10px] font-bold px-4 py-2 rounded-full hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2 transition-all uppercase tracking-wider"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    'Ver mensagens anteriores'
                  )}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                  Nenhuma mensagem ainda
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <span className="bg-gray-100 text-gray-400 text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                    Início da conversa
                  </span>
                </div>

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[60%] px-5 py-3 rounded-2xl text-[13px] leading-relaxed relative ${msg.fromMe
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm'
                      }`}>
                      {renderMessageContent(msg)}
                      <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-50">
                        <span className="text-[8px] font-bold">{formatTime(msg.messageTimestamp)}</span>
                        {msg.fromMe && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {supportMode === 'IA' && isSending && (
              <div className="flex justify-start items-center gap-2 mt-4 text-emerald-500/50">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">Enviando...</span>
              </div>
            )}
          </div>

          {/* Aviso de IA Ativa */}
          {supportMode === 'IA' && (
            <div className="px-6 py-2 bg-emerald-50/50 border-t border-emerald-100/50">
              <div className="max-w-4xl mx-auto flex items-center gap-2 text-emerald-600">
                <Bot size={14} className="animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  IA está respondendo automaticamente. Alterne para modo Humano para intervir.
                </p>
              </div>
            </div>
          )}

          {/* Área de Entrada */}
          <div className="p-6 bg-white border-t border-gray-100 relative">

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-24 left-6 z-[60] shadow-2xl rounded-2xl">
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  width={300}
                  height={400}
                  searchDisabled={false}
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}

            <div className="max-w-4xl mx-auto flex items-center gap-3">
              {isRecording ? (
                // Interface de Gravação
                <div className="flex-1 flex items-center gap-4 bg-gray-50 p-2 rounded-2xl animate-in fade-in duration-200 border border-rose-100">
                  <div className="flex items-center gap-2 text-rose-500 animate-pulse px-2">
                    <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                    <span className="text-xs font-black uppercase tracking-widest">Gravando {formatDuration(recordingTime)}</span>
                  </div>
                  <div className="flex-1"></div>
                  <button
                    onClick={cancelRecording}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                    title="Cancelar"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    title="Enviar Áudio"
                  >
                    <Send size={20} />
                  </button>
                </div>
              ) : (
                // Interface de Input Normal
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={supportMode === 'IA' || isSending}
                    className={`p-3 transition-colors ${supportMode === 'IA' || isSending
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    title="Emojis"
                  >
                    <Smile size={24} />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={supportMode === 'IA' || isSending}
                    className={`p-3 transition-colors ${supportMode === 'IA' || isSending
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-emerald-600'
                      }`}
                    title={supportMode === 'IA' ? 'Desative a IA para enviar arquivos' : 'Anexar arquivo'}
                  >
                    <Paperclip size={20} />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={
                        supportMode === 'IA'
                          ? "IA está respondendo automaticamente..."
                          : "Digite sua mensagem..."
                      }
                      className={`w-full px-6 py-3.5 border-none rounded-2xl focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-medium ${supportMode === 'IA'
                        ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                        : 'bg-gray-50'
                        }`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && supportMode === 'HUMAN') {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isSending || supportMode === 'IA'}
                      readOnly={supportMode === 'IA'}
                    />
                  </div>

                  {message.trim() ? (
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isSending || supportMode === 'IA'}
                      className={`p-3.5 rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${supportMode === 'IA'
                        ? 'bg-gray-300 text-gray-500'
                        : supportMode === 'HUMAN'
                          ? 'bg-rose-500 text-white shadow-rose-500/20'
                          : 'bg-emerald-600 text-white shadow-emerald-600/20'
                        }`}
                    >
                      {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={supportMode === 'IA' || isSending}
                      className={`p-3.5 rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${supportMode === 'IA'
                        ? 'bg-gray-300 text-gray-500'
                        : supportMode === 'HUMAN'
                          ? 'bg-rose-500 text-white shadow-rose-500/20'
                          : 'bg-emerald-600 text-white shadow-emerald-600/20'
                        }`}
                      title="Gravar áudio"
                    >
                      <Mic size={20} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/30">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-medium">Selecione uma conversa para começar</p>
          </div>
        </div>
      )}

      {/* Painel de Contexto */}
      {activeConversation && (
        <div className={`bg-white border-l border-gray-100 transition-all duration-300 overflow-hidden ${isDetailsOpen ? 'w-80' : 'w-0'}`}>
          <div className="w-80 p-8 flex flex-col h-full space-y-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-emerald-100 flex items-center justify-center mb-4 border-4 border-gray-50">
                <span className="text-emerald-600 font-black text-2xl">
                  {activeConversation.contactName ? activeConversation.contactName.charAt(0).toUpperCase() : activeConversation.phoneNumber.slice(-2)}
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">
                {activeConversation.contactName || activeConversation.phoneNumber}
              </h3>
              {activeConversation.leadId && (
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lead Qualificado</p>
              )}
            </div>

            <div className="space-y-6">
              {activeConversation.leadId && (
                <>
                  <div className="bg-gray-50 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Status</span>
                      <span className="text-sm font-black text-emerald-600">Ativo</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest px-1">Informações</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-[11px] text-gray-400">Telefone</span>
                        <span className="text-[11px] font-bold text-gray-800">{activeConversation.phoneNumber}</span>
                      </div>
                      {activeConversation.leadId && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-50">
                          <span className="text-[11px] text-gray-400">Lead ID</span>
                          <span className="text-[11px] font-bold text-gray-800 truncate">{activeConversation.leadId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <button className="w-full mt-auto py-4 border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all">
                Ver Histórico CRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;
