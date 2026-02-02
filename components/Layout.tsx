
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, PlusCircle, Settings, LogOut, ShieldCheck, Wallet, Database } from 'lucide-react';
import { StorageService } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = StorageService.getUser();

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair?')) {
        const currentUser = StorageService.getUser();
        await StorageService.logout();
        
        if (currentUser?.role === 'cobrador') {
            navigate('/login-cobrador');
        } else {
            navigate('/login');
        }
    }
  };

  // Define nav items based on role
  let navItems = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: PlusCircle, label: 'Novo', path: '/emprestimos/novo', isPrimary: true },
    { icon: Settings, label: 'Config', path: '/configuracoes' },
  ];

  if (user?.role === 'cobrador') {
    navItems = [
        { icon: Wallet, label: 'Cobrança', path: '/cobrador' },
        { icon: Settings, label: 'Config', path: '/configuracoes' },
    ];
  } else if (user?.role === 'admin') {
      navItems = [
        { icon: Home, label: 'Início', path: '/' },
        { icon: Users, label: 'Clientes', path: '/clientes' },
        { icon: PlusCircle, label: 'Novo', path: '/emprestimos/novo', isPrimary: true },
        { icon: ShieldCheck, label: 'Admin', path: '/admin' },
        { icon: Settings, label: 'Config', path: '/configuracoes' },
      ];
  } else if (user?.role === 'master') {
      navItems = [
          { icon: Database, label: 'SaaS', path: '/saas-admin' }
      ];
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans pb-24 md:pb-0">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
            </div>
            <h1 className="text-xl font-bold text-brand-black">GestPay <span className="text-xs font-normal text-gray-500 ml-2">{user?.role === 'cobrador' ? 'Cobrador' : user?.role === 'master' ? 'Super Admin' : 'Admin'}</span></h1>
        </div>
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
             !item.isPrimary && (
                <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        location.pathname === item.path ? 'text-brand-orange' : 'text-gray-500 hover:text-brand-black'
                    }`}
                >
                    <item.icon size={18} />
                    {item.label}
                </button>
             )
          ))}
          {user?.role !== 'cobrador' && user?.role !== 'master' && (
            <button 
                onClick={() => navigate('/emprestimos/novo')}
                className="bg-brand-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
                Novo Empréstimo
            </button>
          )}
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                item.isPrimary ? '-mt-8' : ''
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  item.isPrimary
                    ? 'w-14 h-14 bg-brand-orange shadow-lg shadow-orange-500/30'
                    : 'w-10 h-10'
                } ${
                    !item.isPrimary && location.pathname === item.path 
                    ? 'text-brand-orange bg-orange-50' 
                    : !item.isPrimary 
                        ? 'text-gray-400 hover:text-gray-600'
                        : 'text-white'
                }`}
              >
                <item.icon size={item.isPrimary ? 28 : 22} strokeWidth={item.isPrimary ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium ${
                 location.pathname === item.path ? 'text-brand-orange' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Layout;
