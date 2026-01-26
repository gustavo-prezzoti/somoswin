import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types/database.types';
import { Mail, Lock, CheckCircle, Search, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const PasswordStrengthMeter: React.FC<{ strength: number }> = ({ strength }) => {
    const levels = [
        { width: '25%', color: 'bg-red-500', label: 'Fraca' },
        { width: '50%', color: 'bg-orange-500', label: 'Média' },
        { width: '75%', color: 'bg-yellow-500', label: 'Boa' },
        { width: '100%', color: 'bg-emerald-500', label: 'Forte' },
    ];

    const currentLevel = levels[strength - 1];

    if (!currentLevel) return null;

    return (
        <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`h-2 rounded-full transition-all ${currentLevel.color}`}
                    style={{ width: currentLevel.width }}
                />
            </div>
            <p className="text-xs text-right mt-1 font-semibold" style={{ color: currentLevel.color.replace('bg-', '').replace('-500', '') }}>
                {currentLevel.label}
            </p>
        </div>
    );
};


const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    companyName: '', fullName: '', email: '', document: '', phone: '',
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
    password: '', confirmPassword: '',
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const onlyNums = value.replace(/\D/g, '');
      let formatted = '';
      if (onlyNums.length > 0) formatted = `(${onlyNums.substring(0,2)}`;
      if (onlyNums.length > 2) formatted += `) ${onlyNums.substring(2,7)}`;
      if (onlyNums.length > 7) formatted += `-${onlyNums.substring(7,11)}`;
      setFormData(prev => ({ ...prev, phone: formatted }));
    } else if (name === 'cep') {
      const onlyNums = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, cep: onlyNums.substring(0,8) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length > 7) score++;
    if (/\d/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password));
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        setPasswordMismatch(true);
    } else {
        setPasswordMismatch(false);
    }
  }, [formData.password, formData.confirmPassword]);
  
  const handleCepLookup = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
        setCepError('CEP inválido. Deve conter 8 dígitos.');
        return;
    }
    setIsFetchingCep(true);
    setCepError('');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response for a valid CEP
    setFormData(prev => ({
        ...prev,
        street: 'Avenida Faria Lima',
        neighborhood: 'Jardim Paulistano',
        city: 'São Paulo',
        state: 'SP',
    }));
    setIsFetchingCep(false);
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    setSubmissionStatus('submitting');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newUser: User = {
        id: `usr_${new Date().getTime()}`,
        email: formData.email,
        full_name: formData.fullName,
        role: 'client',
        avatar_url: `https://avatar.iran.liara.run/public/boy?username=${formData.fullName.split(' ')[0]}`
    };
    login(newUser);

    setSubmissionStatus('success');
  };
  
  if (submissionStatus === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="p-8 bg-white rounded-xl shadow-lg w-full max-w-lg text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-500 bg-emerald-100 rounded-full p-2" />
            <h1 className="text-3xl font-bold text-emerald-900 mt-4">Cadastro Realizado!</h1>
            <p className="text-gray-600 mt-2">
                Sua conta foi criada com sucesso. O próximo passo é configurar sua assinatura.
            </p>
            <Button onClick={() => navigate('/payment')} className="mt-8 w-full" size="lg">
                Continuar para Pagamento
            </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="p-8 bg-white rounded-xl shadow-lg w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-900">Crie sua Conta</h1>
          <p className="text-gray-500">Preencha os dados para começar a automatizar suas vendas.</p>
        </div>
        <form className="space-y-6" onSubmit={handleRegister}>
          <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <legend className="sr-only">Dados Pessoais e da Empresa</legend>
            <Input name="companyName" placeholder="Nome da Empresa" onChange={handleChange} required />
            <Input name="fullName" placeholder="Seu Nome Completo" onChange={handleChange} required />
            <Input name="email" type="email" placeholder="E-mail de Contato" onChange={handleChange} required />
            <Input name="document" placeholder="CPF / CNPJ" onChange={handleChange} />
            <Input name="phone" placeholder="(XX) XXXXX-XXXX" value={formData.phone} onChange={handleChange} required maxLength={15} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-emerald-800 mb-2">Endereço</legend>
            <div className="flex items-start gap-3">
                <div className="flex-grow">
                  <Input name="cep" placeholder="CEP" value={formData.cep} onChange={handleChange} />
                  {cepError && <p className="text-xs text-red-600 mt-1">{cepError}</p>}
                </div>
                <Button type="button" variant="secondary" onClick={handleCepLookup} disabled={isFetchingCep}>
                  {isFetchingCep ? <Loader2 className="animate-spin h-4 w-4"/> : <Search className="h-4 w-4"/>}
                  <span className="ml-2">Buscar</span>
                </Button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Input name="street" placeholder="Rua / Avenida" value={formData.street} onChange={handleChange} required className="md:col-span-2"/>
                 <Input name="number" placeholder="Número" value={formData.number} onChange={handleChange} required/>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Input name="complement" placeholder="Complemento (Opcional)" value={formData.complement} onChange={handleChange}/>
                 <Input name="neighborhood" placeholder="Bairro" value={formData.neighborhood} onChange={handleChange} required/>
                 <div className="flex gap-2">
                    <Input name="city" placeholder="Cidade" value={formData.city} onChange={handleChange} required className="flex-grow"/>
                    <Input name="state" placeholder="UF" value={formData.state} onChange={handleChange} required maxLength={2} className="w-16"/>
                 </div>
             </div>
          </fieldset>

           <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-emerald-800 mb-2">Senha de Acesso</legend>
             <div>
                <Input name="password" type="password" placeholder="Crie uma Senha" value={formData.password} onChange={handleChange} required/>
                {formData.password && <PasswordStrengthMeter strength={passwordStrength}/>}
             </div>
             <div>
                <Input name="confirmPassword" type="password" placeholder="Confirme a Senha" value={formData.confirmPassword} onChange={handleChange} required/>
                {passwordMismatch && <p className="text-xs text-red-600 mt-1">As senhas não coincidem.</p>}
             </div>
          </fieldset>

          <Button type="submit" className="w-full" size="lg" disabled={submissionStatus === 'submitting'}>
            {submissionStatus === 'submitting' ? <><Loader2 className="animate-spin h-5 w-5 mr-2"/> Criando conta...</> : 'Criar Conta'}
          </Button>
        </form>
         <p className="text-center text-sm text-gray-500 mt-6">
          Já tem uma conta? <Link to="/login" className="font-semibold text-emerald-600 hover:underline">Faça o login aqui</Link>
        </p>
      </div>
    </div>
  )
}

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    alert(`Se um usuário com o e-mail ${email} existir, um link de recuperação foi enviado.`);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="text-3xl font-extrabold text-emerald-900">Recuperar Senha</h2>
          <p className="mt-2 text-gray-600">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="E-mail"
                />
              </div>
            </div>
          </div>
          <div>
            <Button type="submit" className="w-full" size="lg">
              Enviar link de recuperação
            </Button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Lembrou da senha? <Link to="/login" className="font-semibold text-emerald-600 hover:underline">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
};


const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const mockUser: User = {
            id: '123',
            email: 'cliente@exemplo.com',
            full_name: 'Cliente Exemplo',
            role: 'client',
            client_id: 'abc-123',
            avatar_url: 'https://picsum.photos/100'
        };
        login(mockUser);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex font-sans">
            {/* Left Branding Panel */}
            <div className="hidden lg:flex w-1/2 bg-emerald-800 text-white p-12 flex-col justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        WIN<span className="text-emerald-400">.AI</span>
                    </h1>
                </div>
                <div>
                    <h2 className="text-4xl font-bold leading-tight">O futuro do seu comercial começa agora.</h2>
                    <p className="mt-4 text-emerald-200 text-lg">Com IA operando 24/7, sua empresa ganha eficiência, previsibilidade e escala nas vendas.</p>
                </div>
                <div className="text-sm text-emerald-300">
                    &copy; {new Date().getFullYear()} WIN.AI. Todos os direitos reservados.
                </div>
            </div>

            {/* Right Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-emerald-900">Acesse sua Conta</h2>
                        <p className="mt-2 text-gray-600">
                            Não tem uma conta?{' '}
                            <Link to="/login?mode=register" className="font-medium text-emerald-600 hover:text-emerald-500">
                                Cadastre-se
                            </Link>
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="email-address" className="sr-only">Email</label>
                                <div className="relative">
                                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                                     <Input
                                        id="email-address"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="pl-10"
                                        placeholder="E-mail"
                                        defaultValue="cliente@exemplo.com"
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <label htmlFor="password" className="sr-only">Senha</label>
                                 <div className="relative">
                                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
                                     <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        className="pl-10"
                                        placeholder="Senha"
                                        defaultValue="senha-de-teste"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                    Lembrar-me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link to="/login?mode=forgot-password" className="font-medium text-emerald-600 hover:text-emerald-500">
                                    Esqueceu sua senha?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <Button type="submit" className="w-full" size="lg">
                                Entrar
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}


const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  
  if (mode === 'register') {
    return <RegisterPage />;
  }
  
  if (mode === 'forgot-password') {
    return <ForgotPasswordPage />;
  }

  return <LoginPage />;
};

export default Login;