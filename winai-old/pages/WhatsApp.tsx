import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from '../hooks/useWhatsApp';
import { useLeads } from '../hooks/useLeads';
import { Lead, LeadStatus, User } from '../types/database.types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Send, Paperclip, MoreVertical, Bot, User as UserIcon, Phone, Video, Check, CheckCheck, ChevronsLeft, ChevronsRight, ArrowLeft, Info, Calendar, BellOff, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-sky-100 text-sky-800' },
  contacted: { label: 'Contactado', color: 'bg-amber-100 text-amber-800' },
  qualified: { label: 'Qualificado', color: 'bg-purple-100 text-purple-800' },
  meeting_scheduled: { label: 'Reunião Agendada', color: 'bg-emerald-100 text-emerald-800' },
  won: { label: 'Ganho', color: 'bg-green-100 text-green-800' },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-800' },
};

const ConversationListItem: React.FC<{ conversation: WhatsAppConversation; isActive: boolean; onClick: () => void; }> = ({ conversation, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-start p-3 gap-3 cursor-pointer border-l-4 ${isActive ? 'bg-emerald-50 border-emerald-500' : 'border-transparent hover:bg-gray-50'}`}
    >
      <img src={conversation.contactAvatar} alt={conversation.contactName} className="w-12 h-12 rounded-full" />
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <p className="font-bold text-emerald-900 truncate">{conversation.contactName}</p>
          <p className="text-xs text-gray-500 flex-shrink-0">{formatDistanceToNow(new Date(conversation.timestamp), { locale: ptBR, addSuffix: true })}</p>
        </div>
        <div className="flex justify-between items-start mt-1">
          <p className="text-sm text-gray-600 truncate">{conversation.isBotTyping ? <span className="text-emerald-600 italic">digitando...</span> : conversation.lastMessage}</p>
          {conversation.unreadCount > 0 && (
            <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: WhatsAppMessage }> = ({ message }) => {
  const isFromContact = message.sender === 'user';
  
  const MessageStatusIcon = () => {
    if (message.status === 'read') return <CheckCheck className="w-4 h-4 text-sky-500" />;
    if (message.status === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" />;
    if (message.status === 'sent') return <Check className="w-4 h-4 text-gray-400" />;
    return null;
  }

  // The contact's message should be on the left, our message (bot/agent) on the right.
  return (
    <div className={`flex items-end gap-2 my-2 ${isFromContact ? 'justify-start' : 'justify-end'}`}>
      {isFromContact && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-5 h-5 text-gray-600" />
        </div>
      )}
      <div 
        className={`max-w-md p-3 rounded-2xl ${isFromContact ? 'bg-white border border-gray-200 rounded-bl-md' : 'bg-emerald-100 rounded-br-md'}`}
      >
        <p className="text-sm text-gray-800">{message.text}</p>
        <div className="flex items-center justify-end gap-1.5 mt-1">
          <p className="text-xs text-gray-400">{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          {!isFromContact && <MessageStatusIcon />}
        </div>
      </div>
    </div>
  );
};

const LeadDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    conversation: WhatsAppConversation | undefined;
    leadsData: { leads: Lead[], users: User[] } | undefined;
    leadStatus: LeadStatus;
    setLeadStatus: (status: LeadStatus) => void;
    assignedTo: string;
    setAssignedTo: (id: string) => void;
    notes: string;
    setNotes: (notes: string) => void;
    saveState: 'idle' | 'saving' | 'success';
    handleSaveChanges: (onSuccessCallback?: () => void) => Promise<void>;
}> = ({ isOpen, onClose, conversation, leadsData, leadStatus, setLeadStatus, assignedTo, setAssignedTo, notes, setNotes, saveState, handleSaveChanges }) => {
    if (!isOpen || !conversation) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
          <div className="flex flex-col max-h-[80vh]">
              <div className="p-4 text-center border-b">
                <img src={conversation.contactAvatar} alt={conversation.contactName} className="w-24 h-24 rounded-full mx-auto" />
                <h2 className="font-bold text-xl text-emerald-900 mt-4">{conversation.contactName}</h2>
                <p className="text-sm text-gray-500">Lead do CRM</p>
              </div>
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Status do Lead</label>
                  <Select value={leadStatus} className="w-full mt-1" onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}>
                    {Object.entries(statusConfig).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Responsável</label>
                  <Select className="w-full mt-1" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Ninguém</option>
                    {leadsData?.users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Anotações</label>
                  <Textarea 
                    className="w-full h-32 mt-1" 
                    placeholder="Adicione uma anotação..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-200">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSaveChanges(onClose)}
                  disabled={saveState !== 'idle'}
                >
                  {saveState === 'saving' && 'Salvando...'}
                  {saveState === 'success' && <><Check className="w-5 h-5 mr-2"/> Salvo!</>}
                  {saveState === 'idle' && 'Salvar Alterações'}
                </Button>
              </div>
          </div>
        </Modal>
    );
}

const WhatsApp: React.FC = () => {
  const { data: conversations, isLoading, isError } = useWhatsApp();
  const { data: leadsData } = useLeads();
  const queryClient = useQueryClient();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('new');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');
  
  const [isLeadPanelVisible, setIsLeadPanelVisible] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isLeadDetailsModalOpen, setIsLeadDetailsModalOpen] = useState(false);
  
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversationId) {
      if (window.innerWidth >= 768) { // md breakpoint
        setSelectedConversationId(conversations[0].id);
      }
    }
  }, [conversations, selectedConversationId]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversationId, conversations, mobileView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setIsChatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  useEffect(() => {
    if (selectedConversation && leadsData?.leads) {
      const currentLead = leadsData.leads.find(l => l.id === selectedConversation.leadId);
      if (currentLead) {
        setLeadStatus(currentLead.status);
        setAssignedTo(currentLead.assigned_to || '');
        setNotes(currentLead.notes || '');
        setSaveState('idle');
      }
    }
  }, [selectedConversation, leadsData]);

  const handleConversationSelect = (id: string) => {
    setSelectedConversationId(id);
    if (window.innerWidth < 768) {
      setMobileView('chat');
    }
  };

  const handleSaveChanges = async (onSuccessCallback?: () => void) => {
    if (!selectedConversation || !leadsData) return;
    
    setSaveState('saving');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const leadIdToUpdate = selectedConversation.leadId;

    queryClient.setQueryData(['whatsappData'], (oldData: WhatsAppConversation[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(convo => 
        convo.id === selectedConversation.id 
          ? { ...convo, leadStatus: leadStatus } 
          : convo
      );
    });

    queryClient.setQueryData(['leads'], (oldData: { leads: Lead[], users: User[] } | undefined) => {
      if (!oldData) return oldData;
      const newLeads = oldData.leads.map(lead =>
        lead.id === leadIdToUpdate
          ? { ...lead, status: leadStatus, assigned_to: assignedTo, notes: notes, updated_at: new Date().toISOString() }
          : lead
      );
      return { ...oldData, leads: newLeads };
    });

    setSaveState('success');
    setTimeout(() => {
      setSaveState('idle');
      if (onSuccessCallback) {
        onSuccessCallback();
      }
    }, 2000);
  };


  const filteredConversations = conversations?.filter(c => 
    c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="p-6">Carregando conversas...</div>;
  if (isError) return <div className="p-6 text-red-600">Erro ao carregar os dados do WhatsApp.</div>;

  const showChat = selectedConversationId && (window.innerWidth >= 768 || mobileView === 'chat');
  const showList = window.innerWidth >= 768 || mobileView === 'list';


  return (
    <div className="flex h-full bg-white font-sans relative overflow-hidden">
      <LeadDetailsModal
        isOpen={isLeadDetailsModalOpen}
        onClose={() => setIsLeadDetailsModalOpen(false)}
        conversation={selectedConversation}
        leadsData={leadsData}
        leadStatus={leadStatus}
        setLeadStatus={setLeadStatus}
        assignedTo={assignedTo}
        setAssignedTo={setAssignedTo}
        notes={notes}
        setNotes={setNotes}
        saveState={saveState}
        handleSaveChanges={handleSaveChanges}
      />
      {/* Conversation List */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white ${showList ? 'flex' : 'hidden'}`}>
        <div className="p-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-emerald-900">Conversas</h1>
        </div>
        <div className="p-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                <Input 
                    placeholder="Buscar conversas..." 
                    className="pl-9 bg-gray-50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
        {filteredConversations?.map(convo => (
            <ConversationListItem
            key={convo.id}
            conversation={convo}
            isActive={convo.id === selectedConversationId}
            onClick={() => handleConversationSelect(convo.id)}
            />
        ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col ${showChat ? 'flex' : 'hidden'}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 h-20 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileView('list')}><ArrowLeft className="w-5 h-5 text-gray-500" /></Button>
                <img src={selectedConversation.contactAvatar} alt={selectedConversation.contactName} className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-bold text-lg text-emerald-900">{selectedConversation.contactName}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex"><Phone className="w-5 h-5 text-gray-500" /></Button>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex"><Video className="w-5 h-5 text-gray-500" /></Button>
                <div className="relative" ref={chatMenuRef}>
                    <Button variant="ghost" size="sm" onClick={() => setIsChatMenuOpen(prev => !prev)}>
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                    </Button>
                    {isChatMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                            <button
                                onClick={() => { setIsLeadDetailsModalOpen(true); setIsChatMenuOpen(false); }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Info className="mr-3 h-4 w-4" />
                                Ver Detalhes do Lead
                            </button>
                            <button
                                onClick={() => { alert('Funcionalidade "Agendar Reunião" em desenvolvimento.'); setIsChatMenuOpen(false); }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Calendar className="mr-3 h-4 w-4" />
                                Agendar Reunião
                            </button>
                            <div className="my-1 h-px bg-gray-200"></div>
                            <button
                                onClick={() => { alert('Funcionalidade "Silenciar" em desenvolvimento.'); setIsChatMenuOpen(false); }}
                                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <BellOff className="mr-3 h-4 w-4" />
                                Silenciar
                            </button>
                            <button
                                onClick={() => { alert('Funcionalidade "Limpar Conversa" em desenvolvimento.'); setIsChatMenuOpen(false); }}
                                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="mr-3 h-4 w-4" />
                                Limpar Conversa
                            </button>
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 p-4 sm:p-6 overflow-y-auto">
              {selectedConversation.messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-2">
                <Button variant="ghost" size="sm"><Paperclip className="w-5 h-5 text-gray-500" /></Button>
                <Input 
                  placeholder="Digite uma mensagem..." 
                  className="bg-transparent border-none focus:ring-0 flex-1"
                />
                <Button size="md" className="rounded-lg"><Send className="w-5 h-5" /></Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 items-center justify-center text-gray-500 hidden md:flex">
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      {/* Contact Info Panel */}
      <div className={`flex-shrink-0 flex-col border-l border-gray-200 transition-all duration-300 ease-in-out hidden xl:flex ${isLeadPanelVisible ? 'w-80 lg:w-96' : 'w-0'}`}>
        <div className="flex flex-col min-w-[20rem] lg:min-w-[24rem] h-full overflow-hidden bg-white">
         {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-emerald-900">Detalhes do Lead</h2>
                 <Button variant="ghost" size="sm" onClick={() => setIsLeadPanelVisible(false)} aria-label="Esconder detalhes do lead">
                    <ChevronsRight className="w-5 h-5 text-gray-500" />
                </Button>
            </div>
            <div className="p-4 text-center">
                <img src={selectedConversation.contactAvatar} alt={selectedConversation.contactName} className="w-24 h-24 rounded-full mx-auto" />
                <h2 className="font-bold text-xl text-emerald-900 mt-4">{selectedConversation.contactName}</h2>
                <p className="text-sm text-gray-500">Lead do CRM</p>
            </div>
             <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Status do Lead</label>
                    <Select value={leadStatus} className="w-full mt-1" onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}>
                        {Object.entries(statusConfig).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Responsável</label>
                     <Select className="w-full mt-1" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                        <option value="">Ninguém</option>
                        {leadsData?.users.map(user => <option key={user.id} value={user.id}>{user.full_name}</option>)}
                    </Select>
                </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Anotações</label>
                    <Textarea 
                        className="w-full h-32 mt-1" 
                        placeholder="Adicione uma anotação..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>
             <div className="p-4 border-t border-gray-200">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleSaveChanges()}
                    disabled={saveState !== 'idle'}
                >
                    {saveState === 'saving' && 'Salvando...'}
                    {saveState === 'success' && <><Check className="w-5 h-5 mr-2"/> Salvo!</>}
                    {saveState === 'idle' && 'Salvar Alterações'}
                </Button>
            </div>
          </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-6 text-center">
                <p>Informações do lead aparecerão aqui.</p>
            </div>
        )}
        </div>
      </div>

       {/* Collapsed Lead Panel Toggle */}
      {!isLeadPanelVisible && selectedConversation && (
        <div className="absolute top-0 right-0 h-full items-center z-20 hidden xl:flex">
          <button 
            onClick={() => setIsLeadPanelVisible(true)} 
            className="bg-white p-2 rounded-l-lg border-y border-l border-gray-200 shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Mostrar detalhes do lead"
          >
            <ChevronsLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WhatsApp;