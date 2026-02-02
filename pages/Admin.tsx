import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { StorageService } from '../services/storage';
import { Cobrador, Loan, CobradorTransaction } from '../types';
import { Plus, Copy, Trash2, Power, User, DollarSign, Briefcase, FileText, X, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';

type DateFilter = '7days' | '30days' | 'thisMonth' | 'all';

interface StatementItem {
    id: string;
    date: Date;
    type: 'COMMISSION' | 'PAYOUT' | 'BONUS';
    amount: number;
    description: string;
}

const Admin: React.FC = () => {
  const [cobradores, setCobradores] = useState<Cobrador[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<CobradorTransaction[]>([]);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [newCobrador, setNewCobrador] = useState({ name: '', username: '', password: '', commissionRate: '' });
  
  // Statement Modal
  const [selectedCobrador, setSelectedCobrador] = useState<Cobrador | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ type: 'PAYOUT' as 'PAYOUT' | 'BONUS', amount: '', description: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const dataCobradores = await StorageService.getCobradores();
    const dataLoans = await StorageService.getLoans();
    const dataTx = await StorageService.getCobradorTransactions();
    setCobradores(dataCobradores);
    setLoans(dataLoans);
    setTransactions(dataTx);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await StorageService.addCobrador({
            name: newCobrador.name,
            username: newCobrador.username,
            password: newCobrador.password,
            isActive: true,
            commissionRate: parseFloat(newCobrador.commissionRate) || 0
        });
        setShowModal(false);
        setNewCobrador({ name: '', username: '', password: '', commissionRate: '' });
        loadData();
    } catch (error: any) {
        alert(error.message);
    }
  };

  const toggleStatus = async (cobrador: Cobrador) => {
    await StorageService.updateCobrador({
        ...cobrador,
        isActive: !cobrador.isActive
    });
    loadData();
  };

  const deleteCobrador = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este cobrador?')) {
        await StorageService.deleteCobrador(id);
        loadData();
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/#/login?token=${token}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado: ' + link);
  };

  // --- STATEMENT LOGIC ---

  const getDateRange = (filter: DateFilter): Date => {
      const now = new Date();
      if (filter === '7days') return new Date(now.setDate(now.getDate() - 7));
      if (filter === '30days') return new Date(now.setDate(now.getDate() - 30));
      if (filter === 'thisMonth') return new Date(now.getFullYear(), now.getMonth(), 1);
      return new Date(0); // All time
  };

  const getCobradorStatement = (cobrador: Cobrador) => {
      const startDate = getDateRange(dateFilter);
      const items: StatementItem[] = [];

      // 1. Get Automatic Commissions (from Loans)
      loans.forEach(loan => {
          if (loan.payments) {
              loan.payments.forEach(payment => {
                  if (payment.collectedBy === cobrador.name && (payment.commissionAmount || 0) > 0) {
                      const pDate = new Date(payment.date);
                      if (pDate >= startDate) {
                          items.push({
                              id: payment.id,
                              date: pDate,
                              type: 'COMMISSION',
                              amount: payment.commissionAmount || 0,
                              description: `Comissão - ${loan.clientName}`
                          });
                      }
                  }
              });
          }
      });

      // 2. Get Manual Transactions (Payouts/Bonus)
      transactions.forEach(tx => {
          if (tx.cobradorId === cobrador.id) {
               const tDate = new Date(tx.date);
               if (tDate >= startDate) {
                   items.push({
                       id: tx.id,
                       date: tDate,
                       type: tx.type,
                       amount: tx.amount,
                       description: tx.description
                   });
               }
          }
      });

      // Sort Descending
      return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const getCobradorTotals = (cobrador: Cobrador) => {
      // Calculate Global Totals (All Time)
      let totalCommission = 0;
      let totalPaid = 0; // Payouts
      let totalBonus = 0;

      loans.forEach(loan => {
          loan.payments?.forEach(p => {
              if (p.collectedBy === cobrador.name) {
                  totalCommission += p.commissionAmount || 0;
              }
          });
      });

      transactions.forEach(tx => {
          if (tx.cobradorId === cobrador.id) {
              if (tx.type === 'PAYOUT') totalPaid += tx.amount;
              if (tx.type === 'BONUS') totalBonus += tx.amount;
          }
      });

      // Current Balance = (Commission + Bonus) - Paid
      const balance = (totalCommission + totalBonus) - totalPaid;

      return { totalCommission, totalPaid, totalBonus, balance };
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCobrador) return;
      
      const amount = parseFloat(newTransaction.amount.replace(/\./g, '').replace(',', '.'));
      if (!amount || amount <= 0) return;

      await StorageService.addCobradorTransaction({
          cobradorId: selectedCobrador.id,
          type: newTransaction.type,
          amount,
          date: new Date().toISOString(),
          description: newTransaction.description || (newTransaction.type === 'PAYOUT' ? 'Pagamento de Comissão' : 'Ajuste/Bônus')
      });

      setNewTransaction({ type: 'PAYOUT', amount: '', description: '' });
      setShowTransactionForm(false);
      loadData();
  };

  // Helper for masking money input
  const handleMoneyInput = (val: string) => {
      const v = val.replace(/\D/g, "");
      const floatVal = parseInt(v) / 100;
      setNewTransaction({...newTransaction, amount: floatVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})});
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-brand-black">Painel Administrativo</h2>
            <p className="text-gray-400">Gerencie seus cobradores, comissões e acessos</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-brand-black text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
            <Plus size={20} />
            Novo Cobrador
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cobradores.map(c => {
            const totals = getCobradorTotals(c);
            return (
            <Card key={c.id} className="relative group">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${c.isActive ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-500'}`}>
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-black text-lg">{c.name}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-400">@{c.username}</p>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                                    {c.commissionRate}% Com.
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-bold ${c.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {c.isActive ? 'ATIVO' : 'INATIVO'}
                    </div>
                </div>

                {/* Financial Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-center">
                         <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Total Gerado (Comissão)</p>
                         <p className="font-bold text-brand-black">R$ {totals.totalCommission.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="text-center border-l border-gray-200">
                         <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Saldo Atual (A Pagar)</p>
                         <p className={`font-bold ${totals.balance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                             R$ {totals.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                         </p>
                    </div>
                     <div className="text-center border-l border-gray-200 hidden md:block">
                         <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Total Já Pago</p>
                         <p className="font-bold text-brand-orange">R$ {totals.totalPaid.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button 
                        onClick={() => setSelectedCobrador(c)}
                        className="flex-1 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-orange-600 flex items-center justify-center gap-2 transition-colors"
                    >
                        <FileText size={16} /> Extrato / Saldo
                    </button>
                    <button 
                        onClick={() => copyLink(c.token)}
                        className="py-2 px-3 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"
                        title="Copiar Link"
                    >
                        <Copy size={16} />
                    </button>
                    <button 
                        onClick={() => toggleStatus(c)}
                        className="py-2 px-3 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100"
                        title={c.isActive ? 'Desativar' : 'Ativar'}
                    >
                        <Power size={18} />
                    </button>
                    <button 
                        onClick={() => deleteCobrador(c.id)}
                        className="py-2 px-3 bg-red-50 rounded-lg text-red-500 hover:bg-red-100"
                        title="Excluir"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </Card>
        )})}
      </div>

      {/* NEW COBRADOR MODAL */}
       {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg animate-slide-up">
                <h3 className="text-xl font-bold mb-6">Novo Cobrador</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Nome Completo</label>
                        <input 
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                            value={newCobrador.name}
                            onChange={e => setNewCobrador({...newCobrador, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 ml-1">Usuário</label>
                            <input 
                                required
                                placeholder="ex: cobrador01"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                value={newCobrador.username}
                                onChange={e => setNewCobrador({...newCobrador, username: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 ml-1 flex items-center gap-1">
                                <Briefcase size={14}/> Comissão (%)
                            </label>
                            <input 
                                type="number"
                                required
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="Ex: 5"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                value={newCobrador.commissionRate}
                                onChange={e => setNewCobrador({...newCobrador, commissionRate: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Senha Provisória</label>
                        <input 
                            required
                            type="password"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                            value={newCobrador.password}
                            onChange={e => setNewCobrador({...newCobrador, password: e.target.value})}
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
                            Criar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* STATEMENT / BALANCE MODAL */}
      {selectedCobrador && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-brand-black flex items-center gap-2">
                             Extrato: {selectedCobrador.name}
                        </h3>
                        <p className="text-sm text-gray-400">Gerenciamento de comissões e pagamentos</p>
                    </div>
                    <button onClick={() => {setSelectedCobrador(null); setShowTransactionForm(false);}} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Big Balance Card */}
                    <div className="bg-brand-black text-white rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wide relative z-10">Saldo Disponível (Comissão)</p>
                        <h2 className="text-4xl font-bold mt-2 relative z-10">
                            R$ {getCobradorTotals(selectedCobrador).balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </h2>
                        
                        {!showTransactionForm && (
                            <div className="flex gap-3 mt-6 relative z-10 w-full max-w-xs">
                                <button 
                                    onClick={() => { setShowTransactionForm(true); setNewTransaction({...newTransaction, type: 'PAYOUT'}); }}
                                    className="flex-1 bg-white text-brand-black py-2 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                                >
                                    <TrendingDown size={16} className="text-red-500"/> Retirar
                                </button>
                                <button 
                                    onClick={() => { setShowTransactionForm(true); setNewTransaction({...newTransaction, type: 'BONUS'}); }}
                                    className="flex-1 bg-gray-800 text-white py-2 rounded-xl font-bold text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-1 border border-gray-700"
                                >
                                    <Plus size={16} className="text-green-500"/> Adicionar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Transaction Form (Add/Remove Balance) */}
                    {showTransactionForm && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 animate-fade-in">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    {newTransaction.type === 'PAYOUT' ? <TrendingDown size={16} className="text-red-500"/> : <Plus size={16} className="text-green-500"/>}
                                    {newTransaction.type === 'PAYOUT' ? 'Registrar Pagamento (Saída)' : 'Adicionar Saldo (Bônus)'}
                                </h4>
                                <button onClick={() => setShowTransactionForm(false)} className="text-xs text-gray-500 hover:text-brand-black underline">Cancelar</button>
                             </div>
                             
                             <form onSubmit={handleTransactionSubmit} className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Valor</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                        <input 
                                            type="tel"
                                            required
                                            autoFocus
                                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 pl-10 outline-none focus:border-brand-orange font-bold"
                                            value={newTransaction.amount}
                                            onChange={e => handleMoneyInput(e.target.value)}
                                            placeholder="0,00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Descrição / Motivo</label>
                                    <input 
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-orange text-sm"
                                        value={newTransaction.description}
                                        onChange={e => setNewTransaction({...newTransaction, description: e.target.value})}
                                        placeholder={newTransaction.type === 'PAYOUT' ? "Ex: Pagamento Semanal" : "Ex: Bônus por meta"}
                                    />
                                </div>
                                <button className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${newTransaction.type === 'PAYOUT' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                    Confirmar Lançamento
                                </button>
                             </form>
                        </div>
                    )}

                    {/* Filter & List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                <Calendar size={18} /> Histórico
                            </h4>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {[
                                    {id: '7days', label: '7D'},
                                    {id: '30days', label: '30D'},
                                    {id: 'thisMonth', label: 'Mês'},
                                    {id: 'all', label: 'Tudo'},
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setDateFilter(opt.id as DateFilter)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${dateFilter === opt.id ? 'bg-white shadow text-brand-black' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {getCobradorStatement(selectedCobrador).length === 0 ? (
                                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    Nenhuma movimentação neste período.
                                </div>
                            ) : (
                                getCobradorStatement(selectedCobrador).map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${
                                                item.type === 'COMMISSION' || item.type === 'BONUS'
                                                ? 'bg-green-50 text-green-600'
                                                : 'bg-red-50 text-red-500'
                                            }`}>
                                                {item.type === 'PAYOUT' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-brand-black">{item.description}</p>
                                                <p className="text-xs text-gray-400">{item.date.toLocaleDateString('pt-BR')} às {item.date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold ${
                                            item.type === 'PAYOUT' ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                            {item.type === 'PAYOUT' ? '-' : '+'} R$ {item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Admin;