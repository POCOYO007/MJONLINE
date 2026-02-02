
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Lock, User, ArrowRight, Wallet, ChevronLeft, AlertCircle } from 'lucide-react';

const CobradorLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // FIX: Passando a senha para a função de login
      const user = await StorageService.login(username, password);
      
      if (user.role === 'cobrador') {
        navigate('/cobrador');
      } else {
        setError('Esta área é exclusiva para cobradores.');
        StorageService.logout();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
          setError('Usuário ou senha incorretos.');
      } else {
          setError(err.message || 'Erro ao acessar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-slide-up relative z-10">
        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-400 hover:text-brand-black mb-6 transition-colors">
            <ChevronLeft size={16} /> Voltar para Admin
        </Link>

        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-black rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-gray-400/20">
                <Wallet className="text-brand-orange" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-brand-black mb-1">Área do Parceiro</h1>
            <p className="text-gray-400">Acesso exclusivo para cobradores</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-3 border border-red-100">
                <AlertCircle size={20} className="shrink-0" />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 tracking-wide">Usuário</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-orange transition-colors" size={20} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all font-medium"
                placeholder="Ex: joaosilva"
                autoCapitalize="none"
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
            className="w-full bg-brand-orange text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? 'Validando...' : (
                <>
                    Acessar Painel
                    <ArrowRight size={20} />
                </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Esqueceu sua senha? Contate o administrador.</p>
        </div>
      </div>
    </div>
  );
};

export default CobradorLogin;
