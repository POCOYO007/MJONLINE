
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Loan, Client, SystemSettings, Payment, Frequency } from '../types';
import { ArrowLeft, Check, Trash2, Send, DollarSign, User, AlertTriangle, Printer, RefreshCw, FileText, Share2, X, ChevronDown, Clock, TrendingUp, Info, Calendar, MessageCircle, Percent, Hash, Smartphone } from 'lucide-react';
import { Card } from '../components/Card';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const LoanDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState(''); 
  const user = StorageService.getUser();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{amount: number, date: string, type: string} | null>(null);

  const [calculations, setCalculations] = useState({
      penalty: 0,
      interest: 0,
      daysOverdue: 0,
      accruedInterest: 0,
      currentDebt: 0,
      principalRemaining: 0,
      feesRemaining: 0,
      nextRenewalCost: 0
  });

  const [paymentType, setPaymentType] = useState<'amortization' | 'renewal'>('amortization');

  const isAdmin = user?.role === 'admin' || user?.role === 'master';

  useEffect(() => {
    loadData();
  }, [id, loan?.payments]);

  const loadData = async () => {
      if (!id) return;
      const loans = await StorageService.getLoans();
      const found = loans.find(l => l.id === id);
      const sysSettings = await StorageService.getSettings();
      setSettings(sysSettings);
      if (found) {
          setLoan(found);
          calculateLoanState(found);
          const clients = await StorageService.getClients();
          const foundClient = clients.find(c => c.id === found.clientId);
          setClient(foundClient || null);
      }
  };

  const dateDiffInDays = (a: Date, b: Date) => {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  }

  const calculateLoanState = (currentLoan: Loan) => {
      const now = new Date();
      const due = new Date(currentLoan.dateDue);
      const diffDaysOverdue = dateDiffInDays(due, now);
      
      let penalty = 0;
      let overdueInterest = 0;
      
      if (currentLoan.status !== 'pago' && currentLoan.penaltyConfig?.active && diffDaysOverdue > 0) {
          if (diffDaysOverdue > currentLoan.penaltyConfig.graceDays) {
              penalty = currentLoan.penaltyConfig.fixedPenaltyType === 'daily' 
                  ? currentLoan.penaltyConfig.fixedPenalty * diffDaysOverdue 
                  : currentLoan.penaltyConfig.fixedPenalty;
              
              const dailyRate = (currentLoan.penaltyConfig.interestRate / 100) / 30;
              overdueInterest = currentLoan.totalAmount * dailyRate * diffDaysOverdue;
          }
      }

      const totalPlannedInterest = Math.max(0, currentLoan.totalAmount - currentLoan.amount);
      const totalPaid = currentLoan.paidAmount || 0;
      const baseDebt = Math.max(0, currentLoan.totalAmount - totalPaid);
      const feesRemaining = Math.min(baseDebt, totalPlannedInterest);
      const principalRemaining = Math.max(0, baseDebt - feesRemaining);

      setCalculations({
          penalty,
          interest: overdueInterest,
          daysOverdue: diffDaysOverdue > 0 ? diffDaysOverdue : 0,
          accruedInterest: totalPlannedInterest,
          currentDebt: baseDebt + penalty + overdueInterest,
          principalRemaining,
          feesRemaining,
          nextRenewalCost: currentLoan.interestType === 'saldo_devedor' ? principalRemaining * (currentLoan.rate / 100) : (totalPlannedInterest / currentLoan.installments)
      });
  };

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value === "") { setPaymentAmount(""); return; }
      setPaymentAmount(formatMoney(parseInt(value) / 100));
  };

  const handleSubmitPayment = async () => {
    if (!loan || !id || !paymentAmount) return;
    const amount = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'));
    try {
        let updatedLoan: Loan;
        const remainingTotal = calculations.currentDebt;
        const isPayoff = Math.abs(amount - remainingTotal) < 1.0;
        
        if (paymentType === 'renewal' && !isPayoff) {
             updatedLoan = await StorageService.payInterestOnly(id, user?.name || 'Desconhecido', amount, paymentDescription);
        } else {
             updatedLoan = await StorageService.registerPayment(id, amount, user?.name || 'Desconhecido', isPayoff, paymentDescription);
        }
        
        setLoan(updatedLoan);
        setLastPaymentInfo({ amount, date: new Date().toISOString(), type: isPayoff ? 'Quitação' : (paymentType === 'renewal' ? 'Renovação' : 'Amortização') });
        setShowSuccessModal(true);
        setPaymentAmount('');
        setPaymentDescription('');
    } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const generateContract = () => {
      if (!loan || !settings) return;
      const doc = new jsPDF();
      doc.setFillColor(0, 0, 0); doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 122, 0); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text(settings.tradingName || "GestPay", 15, 20);
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("CONTRATO DE MÚTUO FINANCEIRO", 195, 20, { align: "right" });
      doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("INSTRUMENTO PARTICULAR DE EMPRÉSTIMO", 105, 45, { align: "center" });
      let y = 60;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      const addLine = (text: string) => { doc.text(text, 15, y); y += 6; };
      addLine(`CREDOR: ${settings.companyName} | CPF/CNPJ: ${settings.document}`);
      addLine(`DEVEDOR: ${loan.clientName} | TEL: ${loan.clientPhone || 'Não informado'}`);
      y += 10;
      doc.setFont("helvetica", "bold"); addLine("OBJETO E VALORES:"); doc.setFont("helvetica", "normal");
      addLine(`Valor Principal: R$ ${formatMoney(loan.amount)}`);
      addLine(`Taxa de Juros: ${loan.rate}% (${loan.interestType.toUpperCase()})`);
      addLine(`Total a Pagar: R$ ${formatMoney(loan.totalAmount)}`);
      y += 5;
      const schedule = getInstallmentSchedule(loan);
      const tableData = schedule.map((s) => [s.num, s.date, `R$ ${formatMoney(loan.totalAmount / loan.installments)}`]);
      autoTable(doc, { head: [['Cota', 'Vencimento', 'Valor']], body: tableData, startY: y, headStyles: { fillColor: [0, 0, 0] } });
      doc.save(`Contrato_${loan.clientName}.pdf`);
  };

  const generateStatement = () => {
    if (!loan || !settings) return;
    const doc = new jsPDF();
    doc.setFillColor(255, 122, 0); doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.text(settings.tradingName || "GestPay", 15, 17);
    doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.text(`Cliente: ${loan.clientName}`, 15, 40);
    doc.text(`Saldo Devedor: R$ ${formatMoney(calculations.currentDebt)}`, 15, 54);
    const tableRows = (loan.payments || []).slice().reverse().map(p => [new Date(p.date).toLocaleDateString('pt-BR'), p.type === 'interest_only' ? 'Renovação' : 'Amortização', `R$ ${formatMoney(p.amount)}`, p.description || '-', p.collectedBy || '-']);
    autoTable(doc, { head: [["Data", "Tipo", "Valor", "Obs", "Coletor"]], body: tableRows, startY: 70, headStyles: { fillColor: [0,0,0] } });
    doc.save(`Extrato_${loan.clientName}.pdf`);
  };

  const getInstallmentSchedule = (l: Loan) => {
      const schedule = [];
      const daysMap: Record<string, number> = { 'semanal': 7, 'quinzenal': 15, 'mensal': 30, 'unica': 30 };
      const gap = daysMap[l.frequency] || 30;
      for(let i = 1; i <= l.installments; i++) {
          const d = new Date(l.dateLoan);
          d.setDate(d.getDate() + (gap * i));
          schedule.push({ num: i, date: d.toLocaleDateString('pt-BR') });
      }
      return schedule;
  };

  const handleWhatsApp = () => {
      if (!loan || !settings) return;
      const message = `Olá *${loan.clientName}*, resumo atualizado:\n\n📉 *Saldo Devedor:* R$ ${formatMoney(calculations.currentDebt)}\n📅 *Vencimento:* ${new Date(loan.dateDue).toLocaleDateString('pt-BR')}`;
      const phoneToUse = client?.phone || loan.clientPhone;
      if (phoneToUse) window.open(`https://wa.me/55${phoneToUse.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!loan) return <div className="p-8 text-center text-gray-400">Buscando dados...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full hover:shadow-md transition-all">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-brand-black">Detalhes do Empréstimo</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={generateContract} className="p-2 bg-white border border-gray-100 rounded-xl text-gray-600 hover:text-brand-orange hover:border-brand-orange/30 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
                <FileText size={18}/> Contrato
            </button>
            <button onClick={generateStatement} className="p-2 bg-white border border-gray-100 rounded-xl text-gray-600 hover:text-brand-orange hover:border-brand-orange/30 flex items-center gap-2 text-sm font-bold shadow-sm transition-all">
                <Printer size={18}/> Extrato
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="!bg-brand-black !text-white relative overflow-hidden flex flex-col justify-between min-h-[260px] shadow-2xl">
            <div className="relative z-10 space-y-4">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-60">Saldo Devedor Atual</p>
                    <h1 className="text-5xl font-bold tracking-tight mt-1">R$ {formatMoney(calculations.currentDebt)}</h1>
                    {calculations.daysOverdue > 0 && calculations.currentDebt > 0 && (
                      <div className="mt-4 flex items-center gap-2 bg-red-500/30 text-red-100 p-2 rounded-lg border border-red-500/50 backdrop-blur-sm">
                        <AlertTriangle size={18} />
                        <span className="text-xs font-bold">{calculations.daysOverdue} dias em atraso</span>
                      </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total Recebido</p>
                        <p className="text-lg font-bold text-green-400">R$ {formatMoney(loan.paidAmount)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Total do Contrato</p>
                        <p className="text-lg font-bold">R$ {formatMoney(loan.totalAmount)}</p>
                    </div>
                </div>
            </div>
        </Card>

        <Card title="Composição da Dívida" subtitle="Breakdown analítico do saldo">
            <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Hash size={14} className="text-brand-orange"/>
                        <span className="text-sm font-medium">Principal Restante</span>
                    </div>
                    <span className="font-bold text-brand-black">R$ {formatMoney(calculations.principalRemaining)}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Percent size={14} className="text-brand-orange"/>
                        <span className="text-sm font-medium">Juros Contratuais</span>
                    </div>
                    <span className="font-bold text-brand-black">R$ {formatMoney(calculations.feesRemaining)}</span>
                </div>
                {(calculations.penalty > 0 || calculations.interest > 0) && (
                    <div className="flex justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle size={14}/>
                            <span className="text-sm font-bold">Multa e Mora</span>
                        </div>
                        <span className="font-bold text-red-600">+ R$ {formatMoney(calculations.penalty + calculations.interest)}</span>
                    </div>
                )}
                <div className="pt-2 flex justify-between items-center border-t border-gray-100 mt-4 font-bold">
                    <span className="text-xs text-gray-400 uppercase tracking-widest">Total Analítico</span>
                    <span className="text-xl text-brand-black">R$ {formatMoney(calculations.currentDebt)}</span>
                </div>
            </div>
        </Card>

        <Card title="Dados do Contrato" subtitle="Parâmetros originais">
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Taxa de Juros</p>
                    <div className="flex items-center gap-2"><TrendingUp size={16} className="text-brand-orange"/><span className="font-bold text-brand-black">{loan.rate}% ({loan.interestType})</span></div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Cotas</p>
                    <div className="flex items-center gap-2"><RefreshCw size={16} className="text-brand-orange"/><span className="font-bold text-brand-black">{loan.installments}x {loan.frequency}</span></div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Vencimento Final</p>
                    <div className="flex items-center gap-2"><Calendar size={16} className="text-brand-orange"/><span className="font-bold text-brand-black">{new Date(loan.dateDue).toLocaleDateString('pt-BR')}</span></div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Capital Original</p>
                    <div className="flex items-center gap-2"><DollarSign size={16} className="text-brand-orange"/><span className="font-bold text-brand-black">R$ {formatMoney(loan.amount)}</span></div>
                </div>
             </div>
        </Card>

        <Card title="Registrar Recebimento">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="tel" placeholder="0,00" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-xl font-bold outline-none focus:border-brand-orange" value={paymentAmount} onChange={handleAmountChange} disabled={loan.status === 'pago'} />
                    </div>
                    <button onClick={handleSubmitPayment} disabled={loan.status === 'pago' || !paymentAmount} className="bg-brand-black text-white px-6 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center">
                        <Check size={24}/>
                    </button>
                </div>
                {paymentAmount && (
                    <div className="grid grid-cols-2 gap-2 animate-fade-in">
                        <button onClick={() => setPaymentType('amortization')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${paymentType === 'amortization' ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-gray-500 border-gray-100'}`}>Amortizar Principal</button>
                        <button onClick={() => setPaymentType('renewal')} className={`p-3 rounded-xl border text-xs font-bold transition-all ${paymentType === 'renewal' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-100'}`}>Renovar (Juros)</button>
                    </div>
                )}
                <button onClick={handleWhatsApp} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                    <Smartphone size={18}/> Enviar Lembrete (Zap)
                </button>
            </div>
        </Card>

        <Card title="Histórico de Recebimentos" className="md:col-span-2">
             <div className="space-y-2 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                {(loan.payments || []).slice().reverse().map((p) => (
                    <div key={p.id} className="flex justify-between items-center py-4 border-b border-gray-50 group px-3 hover:bg-gray-50 rounded-xl transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`${p.type === 'interest_only' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'} p-3 rounded-xl`}>
                                {p.type === 'interest_only' ? <RefreshCw size={18} /> : <DollarSign size={18} />}
                            </div>
                            <div><p className="font-bold text-lg text-brand-black">R$ {formatMoney(p.amount)}</p><p className="text-xs text-gray-400 flex items-center gap-2"><span className="flex items-center gap-1 font-bold text-gray-500"><User size={12}/>{p.collectedBy}</span>{p.description && <span className="italic">• {p.description}</span>}</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-400 font-bold bg-white border border-gray-100 px-2 py-1 rounded-lg">{new Date(p.date).toLocaleDateString('pt-BR')}</span>
                            {isAdmin && (<button onClick={() => { if(confirm("Deseja realmente excluir este pagamento?")) StorageService.deletePayment(loan.id, p.id).then(() => loadData()); }} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>)}
                        </div>
                    </div>
                ))}
                {(!loan.payments || loan.payments.length === 0) && <p className="text-center text-gray-400 py-10 italic">Nenhum pagamento registrado ainda.</p>}
            </div>
        </Card>
      </div>

      {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-slide-up">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200"><Check className="text-green-600" size={32}/></div>
                  <h3 className="text-2xl font-bold mb-2 text-brand-black">Recebido!</h3>
                  <p className="text-gray-500 mb-6">Pagamento de <b className="text-brand-black">R$ {formatMoney(lastPaymentInfo?.amount || 0)}</b> registrado com sucesso.</p>
                  <button onClick={() => setShowSuccessModal(false)} className="w-full bg-brand-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors">Confirmar e Fechar</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default LoanDetails;
