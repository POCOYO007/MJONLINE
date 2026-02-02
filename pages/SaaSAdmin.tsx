
import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { StorageService } from '../services/storage';
import { User } from '../types';
import { Plus, UserCheck, UserX, Snowflake, Trash2, Calendar, RefreshCw, AlertOctagon } from 'lucide-react';

const SaaSAdmin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // New User Form
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const accounts = await StorageService.getAccounts();
    setUsers(accounts);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await StorageService.createAccount(newUser);
          setShowModal(false);
          setNewUser({ name: '', email: '', password: '' });
          loadUsers();
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleRenew = async (uid: string) => {
      if (confirm("Adicionar 30 dias à assinatura?")) {
          await StorageService.renewSubscription(uid, 30);
          loadUsers();
      }
  };

  const handleToggleFreeze = async (uid: string) => {
      await StorageService.toggleAccountStatus(uid);
      loadUsers();
  };

  const handleDelete = async (uid: string) => {
      if (confirm("Tem certeza? Isso apagará o login do usuário, mas não seus dados de empréstimos (nesta versão demo).")) {
          await StorageService.deleteAccount(uid);
          loadUsers();
      }
  };

  const getStatusColor = (status?: string) => {
      switch (status) {
          case 'active': return 'bg-green-100 text-green-700';
          case 'frozen': return 'bg-blue-100 text-blue-700';
          case 'expired': return 'bg-red-100 text-red-700';
          default: return 'bg-gray-100 text-gray-500';
      }
  };

  const getStatusLabel = (status?: string) => {
      switch (status) {
          case 'active': return 'Ativa';
          case 'frozen': return 'Congelada';
          case 'expired': return 'Expirada';
          default: return 'Desconhecido';
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-brand-black">Gestão de Assinaturas</h2>
                <p className="text-gray-400">Administre os usuários do sistema SaaS</p>
            </div>
            <button 
                onClick={() => setShowModal(true)}
                className="bg-brand-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
                <Plus size={20} /> Novo Usuário
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.length === 0 ? (
                <div className="col-span-full py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400">Nenhum usuário cadastrado.</p>
                </div>
            ) : (
                users.map(user => {
                    const daysLeft = user.subscription 
                        ? Math.ceil((new Date(user.subscription.expiresAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                        : 0;

                    return (
                        <Card key={user.uid} className="relative overflow-hidden">
                             <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{user.name}</h3>
                                    <p className="text-sm text-gray-400">{user.email}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(user.subscription?.status)}`}>
                                    {getStatusLabel(user.subscription?.status)}
                                </span>
                             </div>

                             <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500 flex items-center gap-2"><Calendar size={14}/> Vencimento</span>
                                    <span className="font-medium">
                                        {user.subscription ? new Date(user.subscription.expiresAt).toLocaleDateString('pt-BR') : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm bg-gray-50 p-2 rounded-lg">
                                    <span className="text-gray-500 flex items-center gap-2"><RefreshCw size={14}/> Dias Restantes</span>
                                    <span className={`font-bold ${daysLeft < 5 ? 'text-red-500' : 'text-brand-black'}`}>
                                        {daysLeft} dias
                                    </span>
                                </div>
                             </div>

                             <div className="flex gap-2 border-t border-gray-100 pt-4">
                                <button 
                                    onClick={() => handleRenew(user.uid)}
                                    className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                                >
                                    <RefreshCw size={14} /> Renovar
                                </button>
                                <button 
                                    onClick={() => handleToggleFreeze(user.uid)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                                        user.subscription?.status === 'frozen' 
                                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <Snowflake size={14} /> {user.subscription?.status === 'frozen' ? 'Ativar' : 'Congelar'}
                                </button>
                                <button 
                                    onClick={() => handleDelete(user.uid)}
                                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                             </div>
                        </Card>
                    );
                })
            )}
        </div>

        {showModal && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl p-6 w-full max-w-md animate-slide-up">
                    <h3 className="text-xl font-bold mb-6">Criar Acesso (Cliente SaaS)</h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 ml-1">Nome da Empresa/Cliente</label>
                            <input 
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                value={newUser.name}
                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 ml-1">Email (Login)</label>
                            <input 
                                required
                                type="email"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 ml-1">Senha</label>
                            <input 
                                required
                                type="password"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 bg-brand-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                Criar Usuário
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default SaaSAdmin;
