import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertOctagon, User } from 'lucide-react';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for registration
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validation
    if (!identifier.includes('@')) {
        setError('Por favor, use um email válido.');
        setLoading(false);
        return;
    }
    
    if (isRegistering && !name) {
        setError('Por favor, informe seu nome.');
        setLoading(false);
        return;
    }

    try {
      if (isRegistering) {
          // Register Mode
          await StorageService.createAccount({
              name,
              email: identifier,
              password
          });
          // Auto login redirect after creation
          navigate('/');
      } else {
          // Login Mode
          const user = await StorageService.login(identifier, password);
          if (user.role === 'master') {
              navigate('/saas-admin');
          } else if (user.role === 'admin' || user.role === 'user') {
              navigate('/');
          } else {
             navigate('/cobrador');
          }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
          setError('Este email já está cadastrado.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.message.includes('senha')) {
          setError('Email ou senha incorretos. Se é seu primeiro acesso, clique em "Criar Conta".');
      } else {
          setError(err.message || 'Erro ao processar solicitação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl animate-slide-up">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-orange rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
                <ShieldCheck className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-brand-black mb-1">
                {isRegistering ? 'Criar Conta' : 'GestPay Admin'}
            </h1>
            <p className="text-gray-400">
                {isRegistering ? 'Comece a gerenciar seus empréstimos' : 'Gerenciamento Administrativo'}
            </p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-start gap-3 border border-red-100">
                <AlertOctagon size={20} className="shrink-0" />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegistering && (
             <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1 tracking-wide">Nome da Empresa / Seu Nome</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-orange transition-colors" size={20} />
                  <input
                    type="text"
                    required={isRegistering}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                    placeholder="Ex: GestPay Financeira"
                  />
                </div>
              </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 tracking-wide">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-orange transition-colors" size={20} />
              <input
                type="email"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                placeholder="admin@gestpay.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 tracking-wide">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-orange transition-colors" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-black text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Processando...' : (
                <>
                    {isRegistering ? 'Criar Conta' : 'Acessar Sistema'}
                    <ArrowRight size={20} />
                </>
            )}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-4">
            <button 
                onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                }}
                className="text-sm text-brand-orange font-bold hover:underline"
            >
                {isRegistering ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Crie uma agora'}
            </button>

            {!isRegistering && (
                <div>
                    <Link 
                        to="/login-cobrador"
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Acessar Área do Cobrador <ArrowRight size={14} />
                    </Link>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;