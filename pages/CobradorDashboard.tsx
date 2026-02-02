import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { StorageService } from '../services/storage';
import { Loan, User, CobradorTransaction } from '../types';
import { Search, Calendar, CheckCircle, AlertCircle, DollarSign, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

const CobradorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<CobradorTransaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'atrasado'>('all');

  useEffect(() => {
    const currentUser = StorageService.getUser();
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    const dataLoans = await StorageService.getLoans();
    const dataTx = await StorageService.getCobradorTransactions();
    setLoans(dataLoans);
    setTransactions(dataTx);
  };

  const filteredLoans = loans.filter(l => {
    const matchesSearch = l.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ? true : l.status === 'atrasado';
    return matchesSearch && matchesFilter;
  });

  // Calculate Real Financials
  const myStats = {
      totalCommission: 0,
      totalCollected: 0,
      totalPayouts: 0,
      totalBonus: 0,
      balance: 0
  };

  if (user) {
      // 1. Calculate Commissions from Payments
      loans.forEach(loan => {
          if (loan.payments) {
              loan.payments.forEach(payment => {
                  // Check by name or ID (Assuming collectedBy stores Name based on registerPayment logic)
                  if (payment.collectedBy === user.name) {
                      myStats.totalCollected += payment.amount;
                      myStats.totalCommission += payment.commissionAmount || 0;
                  }
              });
          }
      });

      // 2. Calculate Manual Transactions (Payouts/Bonuses)
      transactions.forEach(tx => {
          if (tx.cobradorId === user.uid) {
              if (tx.type === 'PAYOUT') {
                  myStats.totalPayouts += tx.amount;
              } else if (tx.type === 'BONUS') {
                  myStats.totalBonus += tx.amount;
              }
          }
      });

      // 3. Final Balance
      myStats.balance = (myStats.totalCommission + myStats.totalBonus) - myStats.totalPayouts;
  }

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold text-brand-black">Painel de Cobrança</h2>
        <p className="text-gray-400">Bem-vindo, {user?.name}</p>
      </div>

      {/* Financial Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="!bg-brand-black !text-white !border-none relative overflow-hidden md:col-span-2">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <p className="text-gray-400 text-sm mb-1 font-medium flex items-center gap-2 uppercase tracking-wider">
                        <Wallet size={16} className="text-brand-orange"/> Saldo Disponível (Comissão)
                    </p>
                    <h3 className="text-4xl font-bold text-white">R$ {myStats.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                    
                    <div className="flex gap-4 mt-4 text-xs">
                        <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                             <TrendingUp size={14} className="text-green-400"/>
                             <span>Gerado: R$ {(myStats.totalCommission + myStats.totalBonus).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                             <TrendingDown size={14} className="text-red-400"/>
                             <span>Recebido: R$ {myStats.totalPayouts.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 w-full md:w-auto min-w-[200px]">
                     <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/20 rounded-full text-green-500">
                             <DollarSign size={20} />
                        </div>
                        <span className="text-sm text-gray-400">Arrecadado Total</span>
                     </div>
                     <p className="text-2xl font-bold">R$ {myStats.totalCollected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
            </div>
          </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
            />
        </div>
        <button 
            onClick={() => setFilter(filter === 'all' ? 'atrasado' : 'all')}
            className={`px-4 rounded-xl font-medium transition-colors ${filter === 'atrasado' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
            <AlertCircle size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Nenhum empréstimo encontrado</div>
        ) : (
            filteredLoans.map(loan => (
                <Card 
                    key={loan.id} 
                    onClick={() => navigate(`/emprestimos/${loan.id}`)}
                    className="flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
                >
                    <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            loan.status === 'atrasado' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-brand-black'
                        }`}>
                            <span className="font-bold text-lg">{loan.clientName.charAt(0)}</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-brand-black">{loan.clientName}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar size={12} />
                                <span>{new Date(loan.dateDue).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-brand-black">R$ {loan.totalAmount.toLocaleString('pt-BR')}</p>
                         <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            loan.status === 'ativo' ? 'bg-orange-100 text-brand-orange' :
                            loan.status === 'pago' ? 'bg-green-100 text-green-600' :
                            'bg-red-100 text-red-600'
                        }`}>
                            {loan.status.toUpperCase()}
                        </span>
                    </div>
                </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default CobradorDashboard;