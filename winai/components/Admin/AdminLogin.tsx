import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '../../services/api/auth.service';
import logoBlack from '../../logo_black.png';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.login({ email, password });

            if (response.user.role !== 'ADMIN') {
                setError('Acesso negado. Apenas administradores podem acessar este painel.');
                localStorage.removeItem('win_user');
                localStorage.removeItem('win_access_token');
                localStorage.removeItem('win_refresh_token');
                setLoading(false);
                return;
            }

            localStorage.setItem('win_user', JSON.stringify(response.user));
            localStorage.setItem('win_access_token', response.accessToken);
            if (response.refreshToken) {
                localStorage.setItem('win_refresh_token', response.refreshToken);
            }

            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Email ou senha inválidos');
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-box">
                <div className="admin-login-header">
                    <div className="admin-login-logo">
                        <img src={logoBlack} alt="Win AI" className="admin-logo-img" />
                    </div>
                    <h1 className="admin-login-title">Admin Panel</h1>
                </div>

                <form onSubmit={handleSubmit} className="admin-login-form">
                    {error && (
                        <div className="admin-login-error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="admin-login-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@winai.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="admin-login-field">
                        <label htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="admin-login-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                Verificando...
                            </>
                        ) : (
                            'Acessar'
                        )}
                    </button>
                </form>

                <div className="admin-login-footer">
                    <Link to="/" className="admin-login-link">
                        <ArrowLeft size={16} />
                        Voltar ao site
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
