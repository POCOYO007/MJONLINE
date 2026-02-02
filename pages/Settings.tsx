
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { StorageService, DEFAULT_TEMPLATES } from '../services/storage';
import { SystemSettings } from '../types';
import { Save, Building2, MessageSquare, CheckCircle, Smartphone, LogOut, AlertTriangle, RefreshCw } from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
      companyName: '',
      tradingName: '',
      document: '',
      phone: '',
      address: '',
      messageTemplates: {
          billing: '',
          late: '',
          receipt: ''
      }
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'messages'>('company');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
      const data = await StorageService.getSettings();
      setSettings(data);
      setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      await StorageService.saveSettings(settings);
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
  };

  const handleRestoreDefaults = () => {
      if (confirm("Deseja restaurar as mensagens para os modelos padrão do sistema?")) {
          setSettings({
              ...settings,
              messageTemplates: { ...DEFAULT_TEMPLATES }
          });
      }
  };

  const handleLogoutClick = () => {
      setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    const user = StorageService.getUser();
    await StorageService.logout();
    if (user?.role === 'cobrador') navigate('/login-cobrador');
    else navigate('/login');
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando configurações...</div>;

  return (
    <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-brand-black">Configurações</h2>
                <p className="text-gray-400">Personalize os dados da empresa e mensagens</p>
            </div>
            <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-orange text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 w-full sm:w-auto"
            >
                {saving ? 'Salvando...' : success ? 'Salvo!' : 'Salvar Alterações'}
                {success ? <CheckCircle size={20}/> : <Save size={20} />}
            </button>
        </div>

        <div className="flex flex-col sm:flex-row bg-white p-1 rounded-xl border border-gray-100 w-full max-w-md gap-2 sm:gap-0">
            <button 
                onClick={() => setActiveTab('company')}
                className={`flex-1 py-3 sm:py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'company' ? 'bg-brand-black text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Building2 size={16}/> Dados da Empresa
            </button>
            <button 
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-3 sm:py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'messages' ? 'bg-brand-black text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <MessageSquare size={16}/> Mensagens WhatsApp
            </button>
        </div>

        <form onSubmit={handleSave} className="animate-fade-in space-y-6">
            {activeTab === 'company' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Identificação" className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-gray-700 ml-1">Razão Social</label>
                                <input 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                    placeholder="Ex: GestPay Financeira Ltda"
                                    value={settings.companyName}
                                    onChange={e => setSettings({...settings, companyName: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 ml-1">Nome Fantasia</label>
                                <input 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                    placeholder="Ex: GestPay Soluções"
                                    value={settings.tradingName}
                                    onChange={e => setSettings({...settings, tradingName: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 ml-1">CNPJ / CPF</label>
                                <input 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                    placeholder="00.000.000/0001-00"
                                    value={settings.document}
                                    onChange={e => setSettings({...settings, document: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700 ml-1">Telefone de Contato</label>
                                <input 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                    placeholder="(00) 00000-0000"
                                    value={settings.phone}
                                    onChange={e => setSettings({...settings, phone: e.target.value})}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card title="Localização" className="md:col-span-2">
                         <div>
                            <label className="text-sm font-bold text-gray-700 ml-1">Endereço Completo</label>
                            <input 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange"
                                placeholder="Rua Exemplo, 123 - Centro"
                                value={settings.address}
                                onChange={e => setSettings({...settings, address: e.target.value})}
                            />
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'messages' && (
                 <div className="grid grid-cols-1 gap-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-800">Variáveis Disponíveis</h4>
                                <p className="text-sm text-blue-600 mb-2">Use estes códigos nas mensagens:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['{CLIENTE}', '{VALOR}', '{DATA}'].map(v => (
                                        <span key={v} className="bg-white px-2 py-1 rounded border border-blue-200 text-xs font-mono font-bold text-blue-700">{v}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={handleRestoreDefaults}
                            className="text-xs bg-white text-blue-600 border border-blue-200 px-3 py-2 rounded-lg font-bold hover:bg-blue-50 flex items-center gap-1 shrink-0"
                        >
                            <RefreshCw size={14} /> Restaurar Padrões
                        </button>
                    </div>

                    <Card title="Cobrança Padrão (Lembrete)">
                         <textarea 
                            className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange resize-none font-sans"
                            value={settings.messageTemplates.billing}
                            onChange={e => setSettings({
                                ...settings, 
                                messageTemplates: {...settings.messageTemplates, billing: e.target.value}
                            })}
                        />
                    </Card>

                    <Card title="Cobrança Atrasada">
                         <textarea 
                            className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange resize-none font-sans"
                            value={settings.messageTemplates.late}
                            onChange={e => setSettings({
                                ...settings, 
                                messageTemplates: {...settings.messageTemplates, late: e.target.value}
                            })}
                        />
                    </Card>

                    <Card title="Comprovante de Pagamento">
                         <textarea 
                            className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-orange resize-none font-sans"
                            value={settings.messageTemplates.receipt}
                            onChange={e => setSettings({
                                ...settings, 
                                messageTemplates: {...settings.messageTemplates, receipt: e.target.value}
                            })}
                        />
                    </Card>
                 </div>
            )}
        </form>

        <div className="pt-8 border-t border-gray-200 mt-8">
            <button
                onClick={handleLogoutClick}
                className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100"
            >
                <LogOut size={20} />
                Sair da Conta
            </button>
        </div>

        {showLogoutModal && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-slide-up text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-red-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-brand-black mb-2">Sair da Conta?</h3>
                    <p className="text-gray-500 mb-6 text-sm">Tem certeza que deseja sair?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowLogoutModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">Cancelar</button>
                        <button onClick={confirmLogout} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl">Sair</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;
