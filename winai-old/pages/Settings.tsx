import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useAuth } from '../hooks/useAuth';
import { User, CreditCard, DollarSign, Download, Check, Save, Phone } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const mockBillingData = {
    plan: {
        name: 'Agente Ultra',
        price: '997,00',
        details: 'Até 1000 leads/mês.',
        nextBillingDate: '15 de Outubro de 2024',
    },
    paymentMethod: {
        brand: 'Visa',
        last4: '4242',
        expires: '06/2026',
    },
    history: [
        { id: 'inv_003', date: '15 de Setembro, 2024', description: 'Fatura Mensal - Plano Agente Ultra', amount: '997,00', status: 'Pago' },
        { id: 'inv_002', date: '15 de Agosto, 2024', description: 'Fatura Mensal - Plano Agente Ultra', amount: '997,00', status: 'Pago' },
        { id: 'inv_001', date: '15 de Julho, 2024', description: 'Fatura Mensal - Plano Agente Ultra', amount: '997,00', status: 'Pago' },
    ]
}

const ProfileSection: React.FC = () => {
    const { user, login } = useAuth();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');

    useEffect(() => {
        setFullName(user?.full_name || '');
    }, [user]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (user) {
            setSaveState('saving');
            setTimeout(() => {
                const updatedUser = { ...user, full_name: fullName };
                login(updatedUser); // This updates the context
                setSaveState('success');
                setTimeout(() => setSaveState('idle'), 2000);
            }, 1000);
        }
    };
    
    return (
        <Card>
            <form onSubmit={handleSave}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-emerald-900">Informações do Perfil</h3>
                    <p className="text-sm text-gray-500 mt-1">Atualize seu nome e e-mail.</p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                            <Input 
                                className="mt-1"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">E-mail</label>
                            <Input 
                                className="mt-1 bg-gray-100 cursor-not-allowed"
                                value={user?.email || ''}
                                disabled
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
                    <Button type="submit" disabled={saveState !== 'idle'}>
                         {saveState === 'saving' && 'Salvando...'}
                         {saveState === 'success' && <><Check className="w-4 h-4 mr-2"/> Salvo com Sucesso!</>}
                         {saveState === 'idle' && 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

const ManageSubscriptionModal: React.FC<{ isOpen: boolean; onClose: () => void; currentPlan: string; }> = ({ isOpen, onClose, currentPlan }) => {
    const [selectedPlan, setSelectedPlan] = useState(currentPlan);
    
    const plans = [
        { id: 'master', name: 'Agente Master', price: '599,90', details: 'Até 500 leads/mês' },
        { id: 'ultra', name: 'Agente Ultra', price: '997,00', details: 'Até 1000 leads/mês' },
    ];

    const handleSave = () => {
        alert(`Plano alterado para ${selectedPlan}! (Demo)`);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Assinatura">
            <div className="space-y-6">
                <p className="text-sm text-gray-600">Selecione seu novo plano abaixo. A alteração será efetivada na sua próxima data de faturamento.</p>
                <div className="space-y-4">
                    {plans.map(plan => (
                        <div 
                            key={plan.id} 
                            onClick={() => setSelectedPlan(plan.name)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlan === plan.name ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-lg text-emerald-900">{plan.name}</h4>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.name ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                                    {selectedPlan === plan.name && <Check className="w-3 h-3 text-white"/>}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{plan.details}</p>
                            <p className="text-xl font-bold text-gray-800 mt-2">
                                R$ {plan.price}/mês
                            </p>
                        </div>
                    ))}
                     <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center">
                        <h4 className="font-bold text-lg text-emerald-900">Enterprise</h4>
                        <p className="text-sm text-gray-500 mt-1">Leads ilimitados, suporte dedicado e recursos avançados.</p>
                        <Button variant="secondary" className="mt-4" onClick={() => alert('Nossa equipe de vendas entrará em contato em breve! (Demo)')}>
                            <Phone className="w-4 h-4 mr-2"/>
                            Falar com Vendas
                        </Button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Confirmar Alteração</Button>
                </div>
            </div>
        </Modal>
    );
};

const UpdatePaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Método de pagamento atualizado com sucesso! (Demo)');
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Atualizar Método de Pagamento">
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700">Nome no Cartão</label>
                    <Input className="mt-1" placeholder="Ex: João da Silva" required />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Número do Cartão</label>
                    <Input className="mt-1" placeholder="**** **** **** 4242" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Validade (MM/AA)</label>
                        <Input className="mt-1" placeholder="06/26" required />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">CVC</label>
                        <Input className="mt-1" placeholder="123" required />
                    </div>
                </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">
                        <Save className="w-4 h-4 mr-2"/>
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const BillingSection: React.FC = () => {
    const [isManageSubscriptionModalOpen, setIsManageSubscriptionModalOpen] = useState(false);
    const [isUpdatePaymentModalOpen, setIsUpdatePaymentModalOpen] = useState(false);
    
    return (
        <>
            <ManageSubscriptionModal 
                isOpen={isManageSubscriptionModalOpen} 
                onClose={() => setIsManageSubscriptionModalOpen(false)}
                currentPlan={mockBillingData.plan.name}
            />
            <UpdatePaymentModal 
                isOpen={isUpdatePaymentModalOpen}
                onClose={() => setIsUpdatePaymentModalOpen(false)}
            />
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-emerald-900">Plano Atual</h3>
                         <div className="mt-4">
                            <p className="text-3xl font-extrabold text-emerald-800">{mockBillingData.plan.name}</p>
                            <p className="text-gray-600 mt-1">
                                <span className="font-bold text-gray-800">R$ {mockBillingData.plan.price}</span> por mês
                            </p>
                            <p className="text-sm text-gray-500 mt-2">{mockBillingData.plan.details}</p>
                            <div className="mt-4 border-t pt-4">
                                <p className="text-sm text-gray-600">
                                    Próxima cobrança em <span className="font-semibold text-emerald-700">{mockBillingData.plan.nextBillingDate}</span>.
                                </p>
                            </div>
                        </div>
                        <Button variant="secondary" className="w-full mt-6" onClick={() => setIsManageSubscriptionModalOpen(true)}>Gerenciar Assinatura</Button>
                    </Card>
                     <Card className="p-6">
                        <h3 className="text-lg font-bold text-emerald-900">Método de Pagamento</h3>
                         <div className="mt-4 flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                            <CreditCard className="w-8 h-8 text-emerald-700" />
                            <div>
                                <p className="font-semibold text-gray-800">{mockBillingData.paymentMethod.brand} terminando em {mockBillingData.paymentMethod.last4}</p>
                                <p className="text-sm text-gray-500">Expira em {mockBillingData.paymentMethod.expires}</p>
                            </div>
                         </div>
                         <Button variant="secondary" className="w-full mt-6" onClick={() => setIsUpdatePaymentModalOpen(true)}>Atualizar Pagamento</Button>
                    </Card>
                </div>
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-emerald-900">Histórico de Faturamento</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase font-semibold">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Valor</th>
                                    <th className="p-4 text-center">Fatura</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200">
                                {mockBillingData.history.map(item => (
                                    <tr key={item.id}>
                                        <td className="p-4 text-gray-700">{item.date}</td>
                                        <td className="p-4 text-gray-700">{item.description}</td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-800">R$ {item.amount}</td>
                                        <td className="p-4 text-center">
                                            <Button variant="ghost" size="sm">
                                                <Download className="w-4 h-4"/>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </>
    )
}

const Settings: React.FC = () => {
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto space-y-8">
                 <div>
                    <h1 className="text-3xl font-bold text-emerald-900">Configurações</h1>
                    <p className="text-gray-600 mt-1">Gerencie seu perfil, assinatura e faturamento.</p>
                </div>

                <Tabs defaultValue="profile">
                    <TabsList className="bg-white border p-1 rounded-xl">
                        <TabsTrigger value="profile"><User className="w-4 h-4 mr-2"/> Perfil</TabsTrigger>
                        <TabsTrigger value="billing"><DollarSign className="w-4 h-4 mr-2"/> Cobrança</TabsTrigger>
                    </TabsList>
                    <div className="mt-6">
                        <TabsContent value="profile">
                            <ProfileSection />
                        </TabsContent>
                        <TabsContent value="billing">
                            <BillingSection />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
};

export default Settings;