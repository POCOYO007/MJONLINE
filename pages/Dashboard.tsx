
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { StorageService } from '../services/storage';
import { Loan } from '../types';
import { Wallet, AlertCircle, CheckCircle, TrendingUp, Banknote, PieChart as PieIcon, ArrowUpRight, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ativo' | 'atrasado' | 'pago'>('all');

  useEffect(() => {
    const loadData = async () => {
      const data = await StorageService.getLoans();
      setLoans(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const activeAndOverdue = loans.filter(l => ['ativo', 'atrasado'].includes(l.status));
  
  // Cálculo de Juros Recebidos (Lucro Realizado)
  const totalInterestCollected = loans.reduce((acc, loan) => {
      if (!loan.payments) return acc;
      const interestRatio = (loan.totalAmount - loan.amount) / loan.totalAmount;
      return acc + loan.payments.reduce((pAcc, p) => {
          if (p.type === 'interest_only') return pAcc + p.amount;
          return pAcc + (p.amount * interestRatio);
      }, 0);
  }, 0);

  // Cálculo de Juros a Receber (Lucro Projetado Pendente)
  const totalInterestPending = activeAndOverdue.reduce((acc, loan) => {
      const totalInterest = loan.totalAmount - loan.amount;
      const interestPaid = (loan.payments || []).filter(p => p.type === 'interest_only').reduce((s, p) => s + p.amount, 0);
      return acc + Math.max(0, totalInterest - interestPaid);
  }, 0);

  const stats = {
    active: loans.filter(l => l.status === 'ativo').length,
    overdue: loans.filter(l => l.status === 'atrasado').length,
    paid: loans.filter(l => l.status === 'pago').length,
    receivable: activeAndOverdue.reduce((acc, curr) => acc + (curr.totalAmount - (curr.paidAmount || 0)), 0),
    investedCapital: activeAndOverdue.reduce((acc, curr) => acc + (curr.amount - (curr.payments?.filter(p => p.type !== 'interest_only').reduce((s, p) => s + p.amount, 0) || 0)), 0),
  };

  const chartData = [
    { name: 'Em Dia', value: stats.active, color: '#FF7A00' },
    { name: 'Atrasados', value: stats.overdue, color: '#DC2626' },
    { name: 'Pagos', value: stats.paid, color: '#16A34A' },
  ].filter(d => d.value > 0);

  const filteredLoans = loans.filter(l => filter === 'all' || l.status === filter);

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando painel...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-brand-black">Visão Geral</h2>
            <p className="text-gray-400">Desempenho financeiro e status de carteira.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="!bg-brand-black !text-white border-none relative overflow-hidden lg:col-span-2">
            <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total a Receber (Principal + Juros)</p>
                <h3 className="text-4xl font-bold">R$ {stats.receivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
                    <div>
                        <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Capital no Mercado</p>
                        <p className="text-lg font-bold flex items-center gap-2"><Banknote size={16} className="text-brand-orange"/> R$ {stats.investedCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Lucro Recebido (Juros)</p>
                        <p className="text-lg font-bold text-green-400 flex items-center gap-2"><TrendingUp size={16}/> R$ {totalInterestCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>
        </Card>
        <div className="space-y-4">
            <Card className="flex items-center justify-between p-4 border-l-4 border-l-red-500">
                <div><p className="text-gray-400 text-[10px] uppercase font-bold">Inadimplência</p><h4 className="text-2xl font-bold text-red-600">{stats.overdue}</h4></div>
                <div className="p-3 bg-red-50 rounded-xl text-red-500"><AlertCircle size={24}/></div>
            </Card>
            <Card className="flex items-center justify-between p-4 border-l-4 border-l-blue-500">
                <div><p className="text-gray-400 text-[10px] uppercase font-bold">Lucro Projetado (Pendente)</p><h4 className="text-xl font-bold text-blue-600">R$ {totalInterestPending.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h4></div>
                <div className="p-3 bg-blue-50 rounded-xl text-blue-500"><DollarSign size={24}/></div>
            </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-brand-black">Últimos Empréstimos</h3>
                <div className="flex gap-1">
                    {['all', 'ativo', 'atrasado'].map((f) => (
                        <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${filter === f ? 'bg-brand-black text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>
                            {f === 'all' ? 'TUDO' : f.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                {filteredLoans.slice(0, 10).map(loan => (
                    <Card key={loan.id} onClick={() => navigate(`/emprestimos/${loan.id}`)} className="flex items-center justify-between p-4 hover:border-brand-orange/30 group">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${loan.status === 'atrasado' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-700 group-hover:bg-brand-orange/10 group-hover:text-brand-orange'}`}>{loan.clientName.charAt(0)}</div>
                            <div><p className="font-bold text-sm text-brand-black">{loan.clientName}</p><p className="text-[10px] text-gray-400">Vencimento: {new Date(loan.dateDue).toLocaleDateString('pt-BR')}</p></div>
                        </div>
                        <div className="text-right"><p className="font-bold text-sm">R$ {loan.totalAmount.toLocaleString('pt-BR')}</p><span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${loan.status === 'atrasado' ? 'bg-red-100 text-red-600' : loan.status === 'pago' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-brand-orange'}`}>{loan.status}</span></div>
                    </Card>
                ))}
            </div>
        </div>
        <Card title="Status da Carteira" className="flex flex-col h-full min-h-[400px]">
            <div className="flex-1 w-full min-h-[250px] relative">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 italic text-sm">Sem dados ativos.</div>
                )}
            </div>
            <div className="space-y-2 mt-4">
                {chartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: d.color}}></div><span className="text-gray-500 font-medium">{d.name}</span></div>
                        <span className="font-bold text-brand-black">{d.value}</span>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
