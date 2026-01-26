import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { CreditCard, Lock, Calendar as CalendarIcon, User, ShieldCheck, Loader2, Check } from 'lucide-react';

const Logo: React.FC = () => (
    <div className="text-3xl font-bold text-emerald-900">
      <span>WIN</span><span className="text-emerald-500">.AI</span>
    </div>
);

const plans = {
    master: {
        id: 'master',
        name: 'Agente Master',
        price: 599.90,
        leadLimit: 'Até 500 leads/mês',
        features: [
            'Agente de Tráfego IA',
            'Agente SDR IA',
            'Agente Social Media IA',
            'Dashboard e CRM Completo',
        ]
    },
    ultra: {
        id: 'ultra',
        name: 'Agente Ultra',
        price: 997.00,
        leadLimit: 'Até 1000 leads/mês',
        features: [
            'Agente de Tráfego IA',
            'Agente SDR IA',
            'Agente Social Media IA',
            'Dashboard e CRM Completo',
        ]
    }
};

type PlanKey = keyof typeof plans;

const Payment: React.FC = () => {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<PlanKey>('ultra');

    const selectedPlan = plans[selectedPlanId];

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Simulate payment API call
        await new Promise(resolve => setTimeout(resolve, 2500));
        setIsProcessing(false);
        // On success, navigate to dashboard
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
            <div className="w-full max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <Logo />
                    <h1 className="text-3xl font-extrabold text-emerald-900 mt-4">Finalize sua Assinatura</h1>
                    <p className="text-gray-600 mt-2">Você está a um passo de automatizar suas vendas.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Plan Selection & Order Summary */}
                    <Card className="p-8 bg-emerald-50/50 border-emerald-200">
                        <h2 className="text-2xl font-bold text-emerald-900">1. Escolha seu Plano</h2>
                        <div className="mt-6 space-y-4">
                            {Object.values(plans).map((plan) => (
                                <div 
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id as PlanKey)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-emerald-500 bg-white shadow-md' : 'border-gray-200 hover:border-emerald-300 bg-white/50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-lg text-emerald-800">{plan.name}</h3>
                                            <p className="text-sm text-gray-500">{plan.leadLimit}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                             <p className="text-lg font-bold text-emerald-800">
                                                R$ {plan.price.toFixed(2).replace('.', ',')}
                                                <span className="text-sm font-normal text-gray-500">/mês</span>
                                             </p>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlanId === plan.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                                                {selectedPlanId === plan.id && <Check className="w-3 h-3 text-white"/>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <h3 className="text-xl font-bold text-emerald-900 mt-8">Resumo do Pedido</h3>
                        <ul className="mt-4 space-y-3">
                            {selectedPlan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-3 text-gray-700">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                             <li className="flex items-center gap-3 text-gray-700 font-semibold">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span>{selectedPlan.leadLimit}</span>
                            </li>
                        </ul>
                        <div className="mt-8 pt-6 border-t border-emerald-200">
                            <div className="flex justify-between items-center text-lg">
                                <span className="font-semibold text-gray-800">Total a pagar hoje</span>
                                <span className="font-extrabold text-2xl text-emerald-900">R$ {selectedPlan.price.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Payment Form */}
                    <Card className="p-8">
                        <h2 className="text-2xl font-bold text-emerald-900 mb-6">2. Informações de Pagamento</h2>
                        <form onSubmit={handlePayment} className="space-y-5">
                             <div>
                                <label className="text-sm font-medium text-gray-700">Nome no Cartão</label>
                                <div className="relative mt-1">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                    <Input placeholder="Seu nome completo" className="pl-9" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Número do Cartão</label>
                                <div className="relative mt-1">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                    <Input placeholder="0000 0000 0000 0000" className="pl-9" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Validade</label>
                                     <div className="relative mt-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                        <Input placeholder="MM / AA" className="pl-9" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">CVC</label>
                                     <div className="relative mt-1">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                        <Input placeholder="123" className="pl-9" required />
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" size="lg" className="w-full mt-6" disabled={isProcessing}>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5 mr-2"/>
                                        Processando...
                                    </>
                                ) : (
                                    'Finalizar Pagamento e Ativar Conta'
                                )}
                            </Button>
                        </form>
                        <div className="mt-6 flex items-center justify-center gap-2 text-gray-500">
                            <Lock className="w-4 h-4" />
                            <p className="text-sm font-medium">Pagamento seguro com criptografia SSL.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Payment;