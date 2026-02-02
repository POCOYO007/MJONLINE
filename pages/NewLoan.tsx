
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Client, InterestType, Frequency, PenaltyConfig } from '../types';
import { Calculator, ArrowLeft, AlertTriangle, Clock, UserPlus, Calendar, RefreshCw } from 'lucide-react';
import { Card } from '../components/Card';

export default function NewLoan() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  
  // Form State
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [interestType, setInterestType] = useState<InterestType>('simples');
  const [rate, setRate] = useState<string>('20,00'); 
  const [frequency, setFrequency] = useState<Frequency>('mensal');
  const [installments, setInstallments] = useState<string>('1');
  const [dateLoan, setDateLoan] = useState(new Date().toISOString().split('T')[0]);
  
  // Penalty Config
  const [showPenalty, setShowPenalty] = useState(false);
  const [fixedPenaltyString, setFixedPenaltyString] = useState('');
  
  const [penaltyConfig, setPenaltyConfig] = useState<PenaltyConfig>({
      active: false,
      graceDays: 3,
      interestRate: 10,
      fixedPenalty: 0,
      fixedPenaltyType: 'fixed'
  });
  
  const [fixedPenaltyType, setFixedPenaltyType] = useState<'fixed' | 'daily'>('fixed');
  const [penaltyRateType, setPenaltyRateType] = useState<'monthly' | 'daily'>('monthly');
  const [penaltyRateInput, setPenaltyRateInput] = useState<string>('10,00'); 
  
  // Simulation State
  const [simulationDays, setSimulationDays] = useState<number>(5);

  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '', observations: '' });

  // Helper to parse currency/percentage string "1.234,56" back to float 1234.56
  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Check for pre-selected client from navigation
  useEffect(() => {
      const state = location.state as { preSelectedClientId?: string } | null;
      if (state && state.preSelectedClientId) {
          setClientId(state.preSelectedClientId);
      }
  }, [location, clients]);

  // Update internal penalty config when UI inputs change
  useEffect(() => {
      const numericRate = parseCurrency(penaltyRateInput); 
      const monthlyEquivalent = penaltyRateType === 'daily' ? numericRate * 30 : numericRate;
      
      setPenaltyConfig(prev => ({
          ...prev,
          interestRate: monthlyEquivalent,
          fixedPenaltyType: fixedPenaltyType
      }));
  }, [penaltyRateInput, penaltyRateType, fixedPenaltyType]);

  const loadClients = async () => {
    const data = await StorageService.getClients();
    setClients(data);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const created = await StorageService.addClient(newClient);
          const updatedList = await StorageService.getClients();
          setClients(updatedList);
          setClientId(created.id); 
          
          setShowClientModal(false);
          setNewClient({ name: '', phone: '', address: '', observations: '' });
      } catch (error) {
          alert('Erro ao salvar cliente');
      }
  };

  // Generic handler for Masking Inputs (Currency or Percentage)
  const handleMaskChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");

    if (value === "") {
        setter("");
        return;
    }

    const floatValue = parseInt(value) / 100;
    setter(floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleFixedPenaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleMaskChange(e, (val) => {
        setFixedPenaltyString(val);
        setPenaltyConfig(prev => ({ ...prev, fixedPenalty: parseCurrency(val) }));
    });
  };

  const handleNewClientPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.slice(0, 11);

    if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
        value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }

    setNewClient({...newClient, phone: value});
  };

  const calculateTotal = () => {
      const principal = parseCurrency(amount);
      const r = parseCurrency(rate); 
      const n = parseInt(installments) || 1;
      
      if (principal === 0) return 0;

      let total = 0;
      if (interestType === 'simples' || interestType === 'saldo_devedor') {
          // Para Saldo Devedor, a projeção inicial é igual ao simples (assumindo que não amortize)
          total = principal * (1 + (r / 100) * n);
      } else if (interestType === 'composto') {
          total = principal * Math.pow((1 + r / 100), n);
      } else {
          total = principal + (principal * (r/100) * n); 
      }
      
      return total;
  };

  const calculateSimulation = () => {
      const contractTotal = calculateTotal();
      
      const graceDays = isNaN(penaltyConfig.graceDays) ? 0 : penaltyConfig.graceDays;
      const fixedPenaltyVal = isNaN(penaltyConfig.fixedPenalty) ? 0 : penaltyConfig.fixedPenalty;
      const interestRate = isNaN(penaltyConfig.interestRate) ? 0 : penaltyConfig.interestRate;

      if (simulationDays <= graceDays) {
          return {
              fixed: 0,
              interest: 0,
              total: contractTotal,
              isGracePeriod: true
          };
      }

      let fixed = 0;
      if (fixedPenaltyType === 'daily') {
          fixed = fixedPenaltyVal * simulationDays;
      } else {
          fixed = fixedPenaltyVal;
      }

      const dailyRate = (interestRate / 100) / 30;
      const interest = contractTotal * dailyRate * simulationDays;

      return {
          fixed,
          interest,
          total: contractTotal + fixed + interest,
          isGracePeriod: false
      };
  };

  const handleSave = async () => {
      const parsedAmount = parseCurrency(amount);

      if (!clientId || !parsedAmount) {
          alert("Preencha os campos obrigatórios (Cliente e Valor)");
          return;
      }

      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const date = new Date(dateLoan);
      const daysMap: Record<string, number> = { 'semanal': 7, 'quinzenal': 15, 'mensal': 30, 'unica': 30 };
      const daysPerPeriod = daysMap[frequency] || 30;
      const totalDays = daysPerPeriod * (parseInt(installments) || 1);
      
      date.setDate(date.getDate() + totalDays);
      
      const loanData = {
          clientId,
          clientName: client.name,
          clientPhone: client.phone, // SAVING CLIENT PHONE HERE
          amount: parsedAmount,
          interestType,
          rate: parseCurrency(rate),
          frequency,
          installments: parseInt(installments),
          days: totalDays,
          dateLoan,
          dateDue: date.toISOString().split('T')[0],
          totalAmount: calculateTotal(),
          // Use conditional spread to avoid passing 'undefined' as a field value
          ...(showPenalty ? {
              penaltyConfig: { 
                  ...penaltyConfig, 
                  graceDays: isNaN(penaltyConfig.graceDays) ? 0 : penaltyConfig.graceDays,
                  fixedPenalty: isNaN(penaltyConfig.fixedPenalty) ? 0 : penaltyConfig.fixedPenalty,
                  fixedPenaltyType,
                  active: true 
              }
          } : {})
      };

      await StorageService.addLoan(loanData);
      navigate('/emprestimos');
  };

  const total = calculateTotal();
  const principal = parseCurrency(amount);
  const profit = total - principal;
  
  const sim = calculateSimulation();

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full hover:shadow-md transition-all">
            <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-brand-black">Novo Empréstimo</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card title="1. Selecionar Cliente">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange appearance-none"
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                        >
                            <option value="">Selecione um cliente...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                    </div>
                    <button 
                        onClick={() => setShowClientModal(true)}
                        className="bg-brand-black text-white p-3 rounded-xl hover:bg-gray-800 transition-colors"
                        title="Novo Cliente Rápido"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </Card>

            <Card title="2. Dados do Empréstimo">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Valor do Empréstimo</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                            <input 
                                type="tel" 
                                inputMode="numeric"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 outline-none focus:border-brand-orange text-lg font-bold"
                                placeholder="0,00"
                                value={amount}
                                onChange={(e) => handleMaskChange(e, setAmount)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Data do Empréstimo</label>
                        <input 
                            type="date" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange mt-1"
                            value={dateLoan}
                            onChange={e => setDateLoan(e.target.value)}
                        />
                    </div>

                    <div>
                         <label className="text-sm font-medium text-gray-700 ml-1">Taxa de Juros (%)</label>
                         <div className="flex items-center gap-2 mt-1">
                            <div className="relative w-28">
                                <input 
                                    type="tel"
                                    inputMode="numeric"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-8 outline-none focus:border-brand-orange font-bold text-center appearance-none"
                                    value={rate}
                                    onChange={(e) => handleMaskChange(e, setRate)}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                            </div>
                            <select 
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange text-sm"
                                value={interestType}
                                onChange={e => setInterestType(e.target.value as InterestType)}
                            >
                                <option value="simples">Simples (Flat)</option>
                                <option value="saldo_devedor">Juros s/ Saldo</option>
                                <option value="composto">Composto</option>
                            </select>
                         </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Frequência e Prazo</label>
                        <div className="flex items-center gap-2 mt-1">
                             <input 
                                type="number" 
                                className="w-20 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange font-bold text-center"
                                value={installments}
                                onChange={e => setInstallments(e.target.value)}
                            />
                             <select 
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                value={frequency}
                                onChange={e => setFrequency(e.target.value as Frequency)}
                            >
                                <option value="mensal">Mensal</option>
                                <option value="quinzenal">Quinzenal</option>
                                <option value="semanal">Semanal</option>
                                <option value="unica">Cota Única</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowPenalty(!showPenalty)}
                >
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg transition-colors ${showPenalty ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-black">Multa e Atraso</h3>
                            <p className="text-xs text-gray-400">Configure juros moratórios e multas</p>
                        </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${showPenalty ? 'bg-brand-orange' : 'bg-gray-200'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${showPenalty ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>

                {showPenalty && (
                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Carência (Dias sem multa)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                                    <input 
                                        type="number" 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 font-medium"
                                        value={isNaN(penaltyConfig.graceDays) ? '' : penaltyConfig.graceDays}
                                        onChange={e => setPenaltyConfig({...penaltyConfig, graceDays: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Multa Fixa (R$)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">R$</span>
                                        <input 
                                            type="tel"
                                            inputMode="numeric" 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 font-medium"
                                            placeholder="0,00"
                                            value={fixedPenaltyString}
                                            onChange={handleFixedPenaltyChange}
                                        />
                                    </div>
                                    <div className="w-32 bg-gray-50 border border-gray-200 rounded-xl p-1 flex">
                                        <button 
                                            type="button"
                                            onClick={() => setFixedPenaltyType('fixed')}
                                            className={`flex-1 rounded-lg text-xs font-bold transition-all ${fixedPenaltyType === 'fixed' ? 'bg-white shadow text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Única
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setFixedPenaltyType('daily')}
                                            className={`flex-1 rounded-lg text-xs font-bold transition-all ${fixedPenaltyType === 'daily' ? 'bg-white shadow text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Diária
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Taxa de Mora (Juros)</label>
                                <div className="flex gap-2">
                                    <div className="relative w-28">
                                        <input 
                                            type="tel" 
                                            inputMode="numeric"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-8 font-medium text-center"
                                            value={penaltyRateInput}
                                            onChange={(e) => handleMaskChange(e, setPenaltyRateInput)}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">%</span>
                                    </div>
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-1 flex">
                                        <button 
                                            type="button"
                                            onClick={() => setPenaltyRateType('monthly')}
                                            className={`flex-1 rounded-lg text-xs font-bold transition-all ${penaltyRateType === 'monthly' ? 'bg-white shadow text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            a.m.
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setPenaltyRateType('daily')}
                                            className={`flex-1 rounded-lg text-xs font-bold transition-all ${penaltyRateType === 'daily' ? 'bg-white shadow text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Dia
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">
                                    Equivalente: <strong className="text-gray-600">{penaltyConfig.interestRate.toFixed(2)}% ao mês</strong>
                                </p>
                            </div>
                        </div>

                        <div className="bg-brand-black text-white rounded-xl p-4 flex flex-col justify-between shadow-xl shadow-gray-200/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <div className="relative z-10">
                                <h4 className="font-bold flex items-center gap-2 text-sm mb-4">
                                    <RefreshCw size={14} className="text-brand-orange" /> Simulador de Atraso
                                </h4>
                                
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Atraso Simulado:</span>
                                        <span className="text-white font-bold">{simulationDays} dias</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="60" 
                                        value={simulationDays}
                                        onChange={(e) => setSimulationDays(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                                    />
                                </div>

                                {sim.isGracePeriod ? (
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                                        <p className="text-green-400 font-bold text-sm">Dentro da Carência</p>
                                        <p className="text-[10px] text-gray-400">Nenhuma multa aplicada</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">
                                                Multa {fixedPenaltyType === 'daily' ? 'Diária' : 'Fixa'}
                                                {fixedPenaltyType === 'daily' && <span className="text-[10px]"> ({simulationDays}x)</span>}
                                            </span>
                                            <span>+ R$ {sim.fixed.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Mora ({penaltyConfig.interestRate.toFixed(1)}% am)</span>
                                            <span>+ R$ {sim.interest.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-2 mt-2 border-t border-white/10 flex justify-between font-bold text-brand-orange">
                                            <span>Novo Total</span>
                                            <span>R$ {sim.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>

        <div className="lg:col-span-1">
            <Card className="!bg-brand-black !text-white !border-none sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                    <Calculator className="text-brand-orange" />
                    <h3 className="text-xl font-bold">Resumo</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-gray-400 text-sm">Valor Total a Receber</p>
                        <p className="text-4xl font-bold text-brand-orange">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-800">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Valor Principal</span>
                            <span className="font-bold">R$ {principal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Lucro Estimado</span>
                            <span className="font-bold text-green-400">+ R$ {profit.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Parcelas</span>
                            <span className="font-bold">{installments}x de R$ {(total / (parseInt(installments)||1)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                        {interestType === 'saldo_devedor' && (
                             <div className="bg-gray-800 p-2 rounded mt-2">
                                <p className="text-[10px] text-gray-400 text-center">
                                    Nota: Juros s/ Saldo Devedor. O lucro real dependerá do ritmo de amortização.
                                </p>
                             </div>
                        )}
                    </div>

                    <button 
                        onClick={handleSave}
                        className="w-full bg-brand-orange text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                    >
                        <Clock size={20} />
                        Criar Empréstimo
                    </button>
                </div>
            </Card>
        </div>
      </div>

       {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg animate-slide-up shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="text-brand-orange" /> Novo Cliente Rápido
                    </h3>
                    <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <form onSubmit={handleSaveClient} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Nome Completo</label>
                        <input 
                            required
                            autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange transition-colors"
                            value={newClient.name}
                            onChange={e => setNewClient({...newClient, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Telefone</label>
                        <input 
                            required
                            type="tel"
                            maxLength={15}
                            placeholder="(88) 99999-9999"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange transition-colors"
                            value={newClient.phone}
                            onChange={handleNewClientPhoneChange}
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setShowClientModal(false)}
                            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 bg-brand-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            Salvar e Selecionar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
