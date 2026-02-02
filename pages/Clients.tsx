
import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { StorageService } from '../services/storage';
import { Client } from '../types';
import { Search, Phone, Trash2, Plus, UserX, AlertTriangle, Pencil, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  
  // New Client Form State
  const [newClient, setNewClient] = useState({ name: '', phone: '', document: '', address: '', observations: '' });

  // Delete Confirmation State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await StorageService.getClients();
    setClients(data);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClientToDelete(id);
    setShowDeleteModal(true);
  };

  const handleEditClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/clientes/${id}`);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await StorageService.deleteClient(clientToDelete);
      setShowDeleteModal(false);
      setClientToDelete(null);
      loadClients();
    }
  };

  // --- PHONE MASK HELPER ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // 1. Remove non-digits
    value = value.replace(/\D/g, "");
    
    // 2. Limit to 11 digits
    value = value.slice(0, 11);

    // 3. Apply mask (XX) XXXXX-XXXX
    if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 9) {
        value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }

    setNewClient({...newClient, phone: value});
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

      setNewClient({...newClient, document: value});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await StorageService.addClient(newClient);
    setShowModal(false);
    setNewClient({ name: '', phone: '', document: '', address: '', observations: '' });
    loadClients();
  };

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  // Real-time filtering by name
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-brand-black">Clientes</h2>
            <p className="text-gray-400">Gerencie sua carteira de clientes</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-brand-orange text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
        >
            <Plus size={20} />
            Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
            type="text" 
            placeholder="Buscar por nome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length > 0 ? (
            filteredClients.map(client => (
                <Card 
                    key={client.id} 
                    className="group relative overflow-hidden cursor-pointer hover:border-brand-orange/30 transition-all"
                    onClick={() => navigate(`/clientes/${client.id}`)}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                            {client.name.charAt(0)}
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={(e) => handleEditClick(client.id, e)}
                                className="p-2 bg-gray-50 text-brand-black rounded-lg hover:bg-gray-200 transition-colors"
                                title="Editar Perfil"
                            >
                                <Pencil size={18} />
                            </button>
                            <button 
                                onClick={(e) => openWhatsApp(client.phone, e)}
                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                title="WhatsApp"
                            >
                                <Phone size={18} />
                            </button>
                            <button 
                                onClick={(e) => handleDeleteClick(client.id, e)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                                title="Excluir"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                    <h3 className="font-bold text-lg text-brand-black truncate">{client.name}</h3>
                    <div className="space-y-1">
                        <p className="text-gray-400 text-sm flex items-center gap-1">
                            <Phone size={12} /> {client.phone}
                        </p>
                        {client.document && (
                            <p className="text-gray-400 text-sm flex items-center gap-1">
                                <FileText size={12} /> {client.document}
                            </p>
                        )}
                    </div>
                </Card>
            ))
        ) : (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <UserX size={24} className="text-gray-400" />
                </div>
                <p>{search ? 'Nenhum cliente encontrado com esse nome.' : 'Nenhum cliente cadastrado.'}</p>
            </div>
        )}
      </div>

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg animate-slide-up">
                <h3 className="text-xl font-bold mb-6">Novo Cliente</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Nome Completo</label>
                        <input 
                            required
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                            value={newClient.name}
                            onChange={e => setNewClient({...newClient, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Telefone (Whatsapp)</label>
                        <input 
                            required
                            type="tel"
                            placeholder="(88) 99999-9999"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                            value={newClient.phone}
                            onChange={handlePhoneChange}
                            maxLength={15}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">CPF ou CNPJ</label>
                        <input 
                            type="tel"
                            maxLength={18}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                            placeholder="000.000.000-00"
                            value={newClient.document}
                            onChange={handleDocumentChange}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Endereço</label>
                        <input 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                            value={newClient.address}
                            onChange={e => setNewClient({...newClient, address: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 ml-1">Observações</label>
                        <textarea 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange resize-none h-24"
                            value={newClient.observations}
                            onChange={e => setNewClient({...newClient, observations: e.target.value})}
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
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="text-red-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-brand-black mb-2">Excluir Cliente?</h3>
                <p className="text-gray-500 mb-6">Esta ação não pode ser desfeita e removerá o cliente permanentemente.</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeleteModal(false)}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors"
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
