
export interface Client {
  id: string;
  name: string;
  phone: string;
  document?: string; // CPF or CNPJ
  address: string;
  observations: string;
  createdAt: string;
}

export type InterestType = 'simples' | 'composto' | 'diario' | 'saldo_devedor';
export type LoanStatus = 'ativo' | 'atrasado' | 'pago';
export type UserRole = 'master' | 'admin' | 'user' | 'cobrador';
export type Frequency = 'semanal' | 'quinzenal' | 'mensal' | 'unica';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  collectedBy: string; // Name or ID of the user who collected
  commissionAmount?: number; // Value earned by the cobrador
  type?: 'regular' | 'interest_only'; // Distinguish payment types
  description?: string; // Nova descrição do pagamento (Ex: Pix, Dinheiro)
}

export interface PenaltyConfig {
  active: boolean;
  graceDays: number; // Dias de carência
  interestRate: number; // Taxa de mora (%)
  fixedPenalty: number; // Multa por atraso (Valor fixo)
  fixedPenaltyType?: 'fixed' | 'daily'; // 'fixed' = Única, 'daily' = Por dia de atraso
}

export interface Loan {
  id: string;
  clientId: string;
  clientName: string; // Denormalized for ease
  clientPhone?: string; // Added for quick access by Cobrador
  amount: number;
  interestType: InterestType;
  rate: number;
  
  // New fields for frequency and installments
  frequency: Frequency;
  installments: number; // Cotas
  
  days: number; // Calculated total duration in days
  dateLoan: string;
  dateDue: string; // Final due date
  totalAmount: number;
  paidAmount: number;
  status: LoanStatus;
  observations?: string;
  payments?: Payment[];
  
  // New Penalty Config
  penaltyConfig?: PenaltyConfig;
}

export interface Subscription {
  status: 'active' | 'frozen' | 'expired';
  expiresAt: string; // ISO Date
  plan: string;
}

export interface User {
  uid: string;
  email?: string;
  username?: string;
  password?: string; // Stored for demo purposes
  role: UserRole;
  name: string;
  tenantId?: string; // ID of the Admin account this user belongs to (for Cobradores)
  subscription?: Subscription;
  createdAt?: string;
}

export interface Cobrador {
  id: string;
  name: string;
  username: string;
  password?: string; // Mock password
  token: string;
  isActive: boolean;
  createdAt: string;
  commissionRate: number; // Percentage (0-100)
  tenantId?: string; // Linked Admin ID
}

export interface CobradorTransaction {
  id: string;
  cobradorId: string;
  type: 'PAYOUT' | 'BONUS'; // PAYOUT = Retirada (diminui saldo), BONUS = Adicional (aumenta saldo)
  amount: number;
  date: string;
  description: string;
}

export interface DashboardStats {
  activeLoans: number;
  totalReceivable: number;
  overdueLoans: number;
  paidThisMonth: number;
}

export interface MessageTemplates {
  billing: string; // Cobrança padrão
  late: string; // Cobrança atraso
  receipt: string; // Comprovante pagamento
}

export interface SystemSettings {
  companyName: string; // Razão Social
  tradingName: string; // Nome Fantasia
  document: string; // CNPJ ou CPF
  phone: string; // Telefone da empresa
  address: string;
  messageTemplates: MessageTemplates;
}