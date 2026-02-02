
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { StorageService } from '../services/storage';
import { Loan } from '../types';
import { Calendar, DollarSign, MessageCircle } from 'lucide-react';

const LoanList: React.FC = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    const loadLoans = async () => {
      const data = await StorageService.getLoans();
      setLoans(data);
    };
    loadLoans();
  }, []);

  const handleWhatsApp = (loan: Loan, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if phone exists on Loan object (quick access)
    if (loan.clientPhone) {
        const cleanPhone = loan.clientPhone.replace(/\D/g, '');
        const message = `Olá ${loan.clientName}, estou entrando em contato referente ao seu empréstimo.`;
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
        // Fallback: If phone is not on loan object (old records), open generic link 
        // Note: For full robustness, we could fetch the client details here, but that might impact list performance.
        // Best practice is to rely on 'LoanDetails' page for full context, or migrate data.
        const message = `Olá ${loan.clientName}, referente ao empréstimo.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-brand-black">Meus Empréstimos</h2>
      </div>

      <div className="space-y-4">
        {loans.map(loan => {
           const percentPaid = (loan.paidAmount / loan.totalAmount) * 100;
           return (
            <Card 
                key={loan.id} 
                onClick={() => navigate(`/emprestimos/${loan.id}`)}
                className="group cursor-pointer hover:border-brand-orange/30 transition-colors"
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-brand-black">{loan.clientName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Calendar size={14} />
                            <span>Vence: {new Date(loan.dateDue).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            loan.status === 'ativo' ? 'bg-orange-100 text-brand-orange' :
                            loan.status === 'pago' ? 'bg-green-100 text-green-600' :
                            'bg-red-100 text-red-600'
                        }`}>
                            {loan.status.toUpperCase()}
                        </span>
                        <p className="font-bold mt-2 text-lg">
                            R$ {loan.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                    <div 
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                            loan.status === 'pago' ? 'bg-green-500' : 'bg-brand-orange'
                        }`}
                        style={{ width: `${percentPaid}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-4">
                    <span>Pago: R$ {loan.paidAmount.toFixed(2)}</span>
                    <span>Restante: R$ {(loan.totalAmount - loan.paidAmount).toFixed(2)}</span>
                </div>

                <div className="flex gap-2">
                     <button 
                        onClick={(e) => handleWhatsApp(loan, e)}
                        className="flex-1 bg-green-50 text-green-600 py-2 rounded-lg font-medium text-sm hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                     >
                        <MessageCircle size={16} /> Cobrar
                     </button>
                     <button className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors">
                        Detalhes
                     </button>
                </div>
            </Card>
           );
        })}
      </div>
    </div>
  );
};

export default LoanList;