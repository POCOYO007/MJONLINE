
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Client, Loan } from '../types';
import { ArrowLeft, User, Phone, MapPin, Save, X, MessageSquare, Pencil, Clock, Calculator, FileText } from 'lucide-react';
import { Card } from '../components/Card';

const ClientProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
      name: '',
      phone: '',
      document: '',
      address: '',
      observations: ''
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if(!id) return;
    const allClients = await StorageService.getClients();
    const foundClient = allClients.find(c => c.id === id);
    
    if (foundClient) {
        setClient(foundClient);
        setFormData({
            name: foundClient.name,
            phone: foundClient.phone,
            document: foundClient.document || '',
            address: foundClient.address,
            observations: foundClient.observations
        });

        // Load loans history
        const allLoans = await StorageService.getLoans();
        const clientLoans = allLoans.filter(l => l.clientId === id);
        setLoans(clientLoans);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.slice(0, 11);

    if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
        value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }

    setFormData({...formData, phone: value});
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    
    // Limit to 14 digits (CNPJ size)
    if (value.length > 14) value = value.slice(0, 14);

    // Mask Logic
    if (value.length <= 11) {
      // CPF: 000.000.000-00
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d)/, "$1.$2");
      value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // CNPJ: 00.000.000/0000-00
      value = value.replace(/^(\d{2})(\d)/, "$1.$2");
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
      value = value.replace(/(\d{4})(\d)/, "$1-$2");
    }

    setFormData({...formData, document: value});
};

  const handleSave = async () => {
      if (!client) return;

      const updatedClient: Client = {
          ...client,
          name: formData.name,
          phone: formData.phone,
          document: formData.document,
          address: formData.address,
          observations: formData.observations
      };

      await StorageService.updateClient(updatedClient);
      setClient(updatedClient);
      setIsEditing(false);
  };

  const openWhatsApp = () => {
      if (!client) return;
      const cleanPhone = client.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const handleNewLoan = () => {
      if (!client) return;
      navigate('/emprestimos/novo', { state: { preSelectedClientId: client.id } });
  };

  if (!client) return <div className="p-8 text-center">Carregando perfil...</div>;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full hover:shadow-md transition-all">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-brand-black">Perfil do Cliente</h2>
            </div>
            
            {!isEditing && (
                 <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-brand-black rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                    <Pencil size={18} /> Editar
                </button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Info Card */}
            <div className="md:col-span-2">
                <Card className="h-full">
                    {/* Header with Avatar */}
                    <div className="flex flex-col sm:flex-row gap-6 mb-8 border-b border-gray-100 pb-8">
                        <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto sm:mx-0">
                            <span className="text-4xl font-bold text-brand-orange">{client.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-2 pt-2">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Nome Completo</label>
                                        <input 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange font-bold text-lg"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">CPF / CNPJ</label>
                                        <input 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                            value={formData.document}
                                            onChange={handleDocumentChange}
                                            maxLength={18}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold text-brand-black">{client.name}</h1>
                                    {client.document ? (
                                        <div className="flex items-center justify-center sm:justify-start gap-1 text-gray-500 text-sm">
                                            <FileText size={14} />
                                            <span>{client.document}</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400">Sem CPF/CNPJ cadastrado</p>
                                    )}
                                    <p className="text-gray-400 text-xs mt-1">Cliente desde {new Date(client.createdAt).toLocaleDateString('pt-BR')}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Details Form */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <Phone size={16} className="text-brand-orange" /> Telefone
                                </label>
                                {isEditing ? (
                                    <input 
                                        type="tel"
                                        maxLength={15}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        placeholder="(00) 00000-0000"
                                    />
                                ) : (
                                    <p className="p-3 bg-gray-50 rounded-xl text-gray-700">{client.phone}</p>
                                )}
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <MapPin size={16} className="text-brand-orange" /> Endereço
                                </label>
                                {isEditing ? (
                                    <input 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                        value={formData.address}
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                    />
                                ) : (
                                    <p className="p-3 bg-gray-50 rounded-xl text-gray-700 break-words">{client.address || 'Sem endereço cadastrado'}</p>
                                )}
                            </div>
                        </div>

                        <div>
                             <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                <MessageSquare size={16} className="text-brand-orange" /> Observações
                            </label>
                            {isEditing ? (
                                <textarea 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange resize-none h-24"
                                    value={formData.observations}
                                    onChange={e => setFormData({...formData, observations: e.target.value})}
                                />
                            ) : (
                                <p className="p-3 bg-gray-50 rounded-xl text-gray-700 min-h-[60px] italic">
                                    {client.observations || 'Nenhuma observação.'}
                                </p>
                            )}
                        </div>

                        {/* Edit Actions */}
                        {isEditing && (
                            <div className="flex gap-3 pt-4 border-t border-gray-100 animate-fade-in">
                                <button 
                                    onClick={() => {
                                        setFormData({
                                            name: client.name,
                                            phone: client.phone,
                                            document: client.document || '',
                                            address: client.address,
                                            observations: client.observations
                                        });
                                        setIsEditing(false);
                                    }}
                                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={18} /> Cancelar
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="flex-1 bg-brand-orange text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                                >
                                    <Save size={18} /> Salvar Alterações
                                </button>
                            </div>
                        )}

                        {!isEditing && (
                             <button 
                                onClick={openWhatsApp}
                                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                            >
                                <Phone size={18} /> Conversar no WhatsApp
                            </button>
                        )}
                    </div>
                </Card>
            </div>

            {/* Loan History Side */}
            <div className="space-y-6">
                <Card title="Resumo Financeiro">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl text-blue-700">
                            <span className="text-sm font-medium">Empréstimos Ativos</span>
                            <span className="font-bold text-xl">{loans.filter(l => l.status === 'ativo' || l.status === 'atrasado').length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl text-green-700">
                            <span className="text-sm font-medium">Empréstimos Pagos</span>
                            <span className="font-bold text-xl">{loans.filter(l => l.status === 'pago').length}</span>
                        </div>

                        {/* NEW LOAN BUTTON */}
                        <div className="pt-4 mt-2 border-t border-gray-100">
                            <button 
                                onClick={handleNewLoan}
                                className="w-full bg-brand-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Calculator size={18} /> Simular Novo Empréstimo
                            </button>
                        </div>
                     </div>
                </Card>

                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Clock size={18} /> Histórico Recente
                </h3>

                {loans.length === 0 ? (
                    <p className="text-gray-400 text-center text-sm">Nenhum empréstimo registrado.</p>
                ) : (
                    <div className="space-y-3">
                        {loans.slice(0, 5).map(loan => (
                            <div 
                                key={loan.id} 
                                onClick={() => navigate(`/emprestimos/${loan.id}`)}
                                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-brand-orange/30 transition-all"
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-brand-black">R$ {loan.totalAmount.toLocaleString('pt-BR')}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                        loan.status === 'ativo' ? 'bg-orange-100 text-brand-orange' :
                                        loan.status === 'pago' ? 'bg-green-100 text-green-600' :
                                        'bg-red-100 text-red-600'
                                    }`}>
                                        {loan.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400">Vence: {new Date(loan.dateDue).toLocaleDateString('pt-BR')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ClientProfile;
