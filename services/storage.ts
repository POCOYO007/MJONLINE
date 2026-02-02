
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  setDoc
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';
import { Client, Loan, User, Cobrador, Payment, Frequency, CobradorTransaction, SystemSettings, LoanStatus } from '../types';

// Nome das Coleções no Firestore
const COLL_ACCOUNTS = 'accounts';
const COLL_CLIENTS = 'clients';
const COLL_LOANS = 'loans';
const COLL_COBRADORES = 'cobradores';
const COLL_TRANSACTIONS = 'transactions';
const COLL_SETTINGS = 'settings';
const COLL_SESSIONS = 'cobrador_sessions';

// Email Mestre (Super Admin)
const MASTER_EMAIL = 'contasteamsiri@gmail.com';

// Modelos de mensagens padrão exportados para uso na UI se necessário
export const DEFAULT_TEMPLATES = {
    billing: "Olá *{CLIENTE}*.\n\nPassando para lembrar do seu empréstimo.\nValor: R$ {VALOR}\nVencimento: {DATA}",
    late: "Olá *{CLIENTE}*.\n\nSeu empréstimo venceu em {DATA}.\nTotal acumulado: R$ {VALOR}.\n\nPor favor, entre em contato para regularizar.",
    receipt: "Olá *{CLIENTE}*.\n\nPagamento confirmado de R$ {VALOR}!\nObrigado pela preferência."
};

// Helper: Calcula dias baseados na frequência
const getDaysFromFrequency = (freq: Frequency): number => {
    switch (freq) {
      case 'semanal': return 7;
      case 'quinzenal': return 15;
      case 'mensal': return 30;
      case 'unica': return 30;
      default: return 30;
    }
};

// Helper: Diferença de dias UTC
const dateDiffInDays = (a: Date, b: Date) => {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};

// Cache local simples para evitar ler o Firestore toda hora para usuário atual
let currentUserCache: User | null = null;

export const StorageService = {
  
  // --- AUTHENTICATION ---

  login: async (identifier: string, passwordInput?: string): Promise<User> => {
    if (identifier.includes('@')) {
        try {
            const pass = passwordInput || '123456'; 
            const userCredential = await signInWithEmailAndPassword(auth, identifier, pass);
            const uid = userCredential.user.uid;
            const email = userCredential.user.email || identifier;

            const userDoc = await getDoc(doc(db, COLL_ACCOUNTS, uid));
            
            if (!userDoc.exists()) {
                const role = email === MASTER_EMAIL ? 'master' : 'admin';
                const recoveredUser: User = {
                    uid, email,
                    name: userCredential.user.displayName || 'Usuário',
                    role,
                    createdAt: new Date().toISOString(),
                    subscription: {
                        status: 'active',
                        plan: 'mensal',
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    }
                };
                await setDoc(doc(db, COLL_ACCOUNTS, uid), recoveredUser);
                currentUserCache = recoveredUser;
                return recoveredUser;
            }

            const userData = userDoc.data() as User;
            if (email === MASTER_EMAIL && userData.role !== 'master') {
                userData.role = 'master';
                await updateDoc(doc(db, COLL_ACCOUNTS, uid), { role: 'master' });
            }
            
            currentUserCache = { ...userData, uid };
            return currentUserCache;
        } catch (error: any) {
            console.error("Erro Auth Admin:", error);
            throw error;
        }
    } 
    else {
        // Login de Cobrador
        const q = query(collection(db, COLL_COBRADORES), where("username", "==", identifier));
        const snapshot = await getDocs(q);

        if (snapshot.empty) throw new Error("Cobrador não encontrado.");

        const cobradorDoc = snapshot.docs[0];
        const cobradorData = cobradorDoc.data() as Cobrador;

        if (!cobradorData.isActive) throw new Error("Cobrador inativo.");
        
        // Valida senha se fornecida
        if (passwordInput && cobradorData.password !== passwordInput) {
             throw new Error("Senha incorreta.");
        }

        try {
            if (auth.currentUser) await signOut(auth);
            const authResult = await signInAnonymously(auth);
            
            await setDoc(doc(db, COLL_SESSIONS, authResult.user.uid), {
                tenantId: cobradorData.tenantId,
                cobradorId: cobradorDoc.id,
                username: cobradorData.username,
                lastLogin: new Date().toISOString()
            });
        } catch (err: any) {
            console.error("Erro Sessão Anônima:", err);
            if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
                throw new Error("Login Anônimo desativado no Firebase. Ative em Authentication -> Sign-in Method.");
            }
            throw new Error("Falha ao criar sessão segura: " + (err.message || "Erro desconhecido"));
        }

        const user: User = {
            uid: cobradorDoc.id,
            username: cobradorData.username,
            name: cobradorData.name,
            role: 'cobrador',
            tenantId: cobradorData.tenantId
        };
        currentUserCache = user;
        return user;
    }
  },

  logout: async () => {
    await signOut(auth);
    currentUserCache = null;
  },

  getUser: (): User | null => {
    if (currentUserCache) return currentUserCache;
    const fbUser = auth.currentUser;
    if (fbUser) {
        return { uid: fbUser.uid, email: fbUser.email || '', role: 'admin', name: 'Carregando...' } as User;
    }
    return null;
  },

  restoreSession: async (): Promise<void> => {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, COLL_ACCOUNTS, user.uid);
                    const snap = await getDoc(docRef);
                    
                    if (snap.exists()) {
                         const data = snap.data() as User;
                         currentUserCache = { ...data, uid: user.uid };
                    } else if (user.isAnonymous) {
                         const sessionSnap = await getDoc(doc(db, COLL_SESSIONS, user.uid));
                         if (sessionSnap.exists()) {
                             const sData = sessionSnap.data();
                             let realName = sData!.username;
                             try {
                                 const realCobradorSnap = await getDoc(doc(db, COLL_COBRADORES, sData!.cobradorId));
                                 if (realCobradorSnap.exists()) {
                                     realName = realCobradorSnap.data()!.name;
                                 }
                             } catch (e) { }

                             currentUserCache = {
                                 uid: sData!.cobradorId,
                                 username: sData!.username,
                                 name: realName, 
                                 role: 'cobrador',
                                 tenantId: sData!.tenantId
                             };
                         }
                    }
                } catch(e) { console.error("Erro ao restaurar sessão:", e); }
            }
            resolve();
            unsubscribe();
        });
    });
  },

  getAccounts: async (): Promise<User[]> => {
      const snapshot = await getDocs(collection(db, COLL_ACCOUNTS));
      return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as User));
  },

  createAccount: async (user: Omit<User, 'uid' | 'role'>): Promise<User> => {
      const userCred = await createUserWithEmailAndPassword(auth, user.email!, user.password || '123456');
      const uid = userCred.user.uid;
      const role = user.email === MASTER_EMAIL ? 'master' : 'admin';
      const newUser: User = {
          uid, email: user.email, name: user.name, role,
          createdAt: new Date().toISOString(),
          subscription: {
              status: 'active', plan: 'mensal',
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
      };
      await setDoc(doc(db, COLL_ACCOUNTS, uid), newUser);
      return newUser;
  },

  renewSubscription: async (uid: string, days: number): Promise<void> => {
      const userRef = doc(db, COLL_ACCOUNTS, uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as User;
      const currentExpires = new Date(userData.subscription?.expiresAt || Date.now());
      currentExpires.setDate(currentExpires.getDate() + days);
      await updateDoc(userRef, {
          'subscription.expiresAt': currentExpires.toISOString(),
          'subscription.status': 'active'
      });
  },

  toggleAccountStatus: async (uid: string): Promise<void> => {
      const userRef = doc(db, COLL_ACCOUNTS, uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as User;
      const currentStatus = userData.subscription?.status || 'active';
      const newStatus = currentStatus === 'active' ? 'frozen' : 'active';
      await updateDoc(userRef, { 'subscription.status': newStatus });
  },

  deleteAccount: async (uid: string): Promise<void> => {
      await deleteDoc(doc(db, COLL_ACCOUNTS, uid));
  },

  getSettings: async (): Promise<SystemSettings> => {
    const user = auth.currentUser;
    const currentUid = user?.uid || currentUserCache?.uid;
    
    // Fallback inicial
    const baseSettings = { 
        companyName: 'GestPay', 
        tradingName: 'GestPay', 
        document: '', 
        phone: '', 
        address: '', 
        messageTemplates: { ...DEFAULT_TEMPLATES } 
    };

    if (!currentUid) return baseSettings;

    let targetSettingsId = currentUid;
    if (currentUserCache?.role === 'cobrador' && currentUserCache.tenantId) {
        targetSettingsId = currentUserCache.tenantId;
    }

    const docRef = doc(db, COLL_SETTINGS, targetSettingsId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data() as SystemSettings;
        // Merge rigoroso: se o campo estiver vazio ou for apenas espaços, usa o padrão
        return {
            ...baseSettings,
            ...data,
            messageTemplates: {
                billing: data.messageTemplates?.billing?.trim() ? data.messageTemplates.billing : DEFAULT_TEMPLATES.billing,
                late: data.messageTemplates?.late?.trim() ? data.messageTemplates.late : DEFAULT_TEMPLATES.late,
                receipt: data.messageTemplates?.receipt?.trim() ? data.messageTemplates.receipt : DEFAULT_TEMPLATES.receipt,
            }
        };
    }

    return baseSettings;
  },

  saveSettings: async (settings: SystemSettings): Promise<void> => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");
      await setDoc(doc(db, COLL_SETTINGS, user.uid), settings);
  },

  getClients: async (): Promise<Client[]> => {
    const user = currentUserCache || (auth.currentUser ? { ...auth.currentUser, role: 'admin' } as any : null);
    if (!user) return [];
    if (user.role === 'master') {
        const snapshot = await getDocs(collection(db, COLL_CLIENTS));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    }
    let tenantId = user.uid;
    if (user.role === 'cobrador' && user.tenantId) tenantId = user.tenantId;
    const q = query(collection(db, COLL_CLIENTS), where("tenantId", "==", tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
  },

  addClient: async (client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Login necessário");
    const newClientData = { ...client, tenantId: user.uid, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, COLL_CLIENTS), newClientData);
    return { id: docRef.id, ...newClientData } as Client;
  },

  updateClient: async (client: Client): Promise<void> => {
      await updateDoc(doc(db, COLL_CLIENTS, client.id), { ...client });
  },

  deleteClient: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, COLL_CLIENTS, id));
  },

  getLoans: async (): Promise<Loan[]> => {
    const user = currentUserCache || (auth.currentUser ? { ...auth.currentUser, role: 'admin' } as any : null);
    if (!user) return [];
    if (user.role === 'master') {
         const snapshot = await getDocs(collection(db, COLL_LOANS));
         return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Loan));
    }
    let tenantId = user.uid;
    if (user.role === 'cobrador' && user.tenantId) tenantId = user.tenantId;
    const q = query(collection(db, COLL_LOANS), where("tenantId", "==", tenantId));
    const snapshot = await getDocs(q);
    const loans = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Loan));
    const today = new Date().toISOString().split('T')[0];
    return loans.map(loan => {
        if (loan.status === 'ativo' && loan.dateDue < today) return { ...loan, status: 'atrasado' };
        return loan;
    });
  },

  addLoan: async (loan: Omit<Loan, 'id' | 'status' | 'paidAmount'>): Promise<Loan> => {
      const user = auth.currentUser;
      if (!user) throw new Error("Login necessário");
      const newLoanData = { ...loan, tenantId: user.uid, status: 'ativo', paidAmount: 0, payments: [] };
      const docRef = await addDoc(collection(db, COLL_LOANS), newLoanData);
      return { id: docRef.id, ...newLoanData } as Loan;
  },

  deleteLoan: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, COLL_LOANS, id));
  },

  deletePayment: async (loanId: string, paymentId: string): Promise<Loan> => {
      const loanRef = doc(db, COLL_LOANS, loanId);
      const loanSnap = await getDoc(loanRef);
      if (!loanSnap.exists()) throw new Error("Empréstimo não encontrado");
      const loan = loanSnap.data() as Loan;
      const newPayments = loan.payments?.filter(p => p.id !== paymentId) || [];
      const newPaidAmount = newPayments.reduce((acc, p) => acc + p.amount, 0);
      let newStatus: LoanStatus = loan.status;
      const today = new Date().toISOString().split('T')[0];
      if (loan.status === 'pago' && newPaidAmount < (loan.totalAmount - 0.1)) {
          newStatus = loan.dateDue < today ? 'atrasado' : 'ativo';
      } 
      await updateDoc(loanRef, { payments: newPayments, paidAmount: newPaidAmount, status: newStatus });
      return { ...loan, payments: newPayments, paidAmount: newPaidAmount, status: newStatus };
  },

  updatePayment: async (loanId: string, updatedPayment: Payment): Promise<Loan> => {
      const loanRef = doc(db, COLL_LOANS, loanId);
      const loanSnap = await getDoc(loanRef);
      if (!loanSnap.exists()) throw new Error("Empréstimo não encontrado");
      const loan = loanSnap.data() as Loan;
      const newPayments = loan.payments?.map(p => p.id === updatedPayment.id ? updatedPayment : p) || [];
      const newPaidAmount = newPayments.reduce((acc, p) => acc + p.amount, 0);
      let newStatus: LoanStatus = loan.status;
      const today = new Date().toISOString().split('T')[0];
      if (newPaidAmount >= (loan.totalAmount - 0.1)) newStatus = 'pago';
      else newStatus = loan.dateDue < today ? 'atrasado' : 'ativo';
      await updateDoc(loanRef, { payments: newPayments, paidAmount: newPaidAmount, status: newStatus });
      return { ...loan, payments: newPayments, paidAmount: newPaidAmount, status: newStatus };
  },

  registerPayment: async (loanId: string, amount: number, collectedBy: string, isPayoff: boolean = false, description: string = ''): Promise<Loan> => {
      const loanRef = doc(db, COLL_LOANS, loanId);
      const loanSnap = await getDoc(loanRef);
      if (!loanSnap.exists()) throw new Error("Empréstimo não encontrado");
      const loan = loanSnap.data() as Loan;
      const newPaid = (loan.paidAmount || 0) + amount;
      const finalStatus = (isPayoff || newPaid >= loan.totalAmount - 0.1) ? 'pago' : loan.status;
      let commission = 0;
      if (currentUserCache?.role === 'cobrador') {
          const cobradorSnap = await getDoc(doc(db, COLL_COBRADORES, currentUserCache.uid));
          if (cobradorSnap.exists()) {
              const cData = cobradorSnap.data() as Cobrador;
              if (cData.commissionRate > 0) commission = amount * (cData.commissionRate / 100);
          }
      }
      const payment: Payment = { id: crypto.randomUUID(), amount, date: new Date().toISOString(), collectedBy, commissionAmount: commission, type: 'regular', description };
      const updatedData = { paidAmount: newPaid, status: finalStatus, payments: [...(loan.payments || []), payment] };
      await updateDoc(loanRef, updatedData);
      return { ...loan, ...updatedData };
  },

  payInterestOnly: async (loanId: string, collectedBy: string, amountPaid: number, description: string = ''): Promise<Loan> => {
      const loanRef = doc(db, COLL_LOANS, loanId);
      const loanSnap = await getDoc(loanRef);
      if (!loanSnap.exists()) throw new Error("Não encontrado");
      const loan = loanSnap.data() as Loan;
      const daysToAdd = getDaysFromFrequency(loan.frequency);
      const currentDueDate = new Date(loan.dateDue + 'T12:00:00');
      currentDueDate.setDate(currentDueDate.getDate() + daysToAdd);
      const newDueDate = currentDueDate.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      const newStatus: LoanStatus = newDueDate < today ? 'atrasado' : 'ativo';
      let commission = 0;
      if (currentUserCache?.role === 'cobrador') {
          const cobradorSnap = await getDoc(doc(db, COLL_COBRADORES, currentUserCache.uid));
          if (cobradorSnap.exists()) {
              const cData = cobradorSnap.data() as Cobrador;
              if (cData.commissionRate > 0) commission = amountPaid * (cData.commissionRate / 100);
          }
      }
      const payment: Payment = { id: crypto.randomUUID(), amount: amountPaid, date: new Date().toISOString(), collectedBy, commissionAmount: commission, type: 'interest_only', description };
      const updatedData = { totalAmount: loan.totalAmount + amountPaid, paidAmount: loan.paidAmount + amountPaid, dateDue: newDueDate, status: newStatus, payments: [...(loan.payments || []), payment] };
      await updateDoc(loanRef, updatedData);
      return { ...loan, ...updatedData };
  },

  getCobradores: async (): Promise<Cobrador[]> => {
      const user = auth.currentUser;
      if (!user) return [];
      if (currentUserCache?.role === 'master') {
          const snap = await getDocs(collection(db, COLL_COBRADORES));
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cobrador));
      }
      const q = query(collection(db, COLL_COBRADORES), where("tenantId", "==", user.uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cobrador));
  },

  addCobrador: async (cobrador: Omit<Cobrador, 'id' | 'createdAt' | 'token'>): Promise<Cobrador> => {
      const user = auth.currentUser;
      if (!user) throw new Error("Login necessário");
      const q = query(collection(db, COLL_COBRADORES), where("username", "==", cobrador.username));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Usuário já existe");
      const newCobrador = { ...cobrador, tenantId: user.uid, token: crypto.randomUUID(), createdAt: new Date().toISOString(), commissionRate: cobrador.commissionRate || 0 };
      const docRef = await addDoc(collection(db, COLL_COBRADORES), newCobrador);
      return { id: docRef.id, ...newCobrador } as Cobrador;
  },

  updateCobrador: async (cobrador: Cobrador): Promise<void> => {
      await updateDoc(doc(db, COLL_COBRADORES, cobrador.id), { ...cobrador });
  },

  deleteCobrador: async (id: string): Promise<void> => {
      await deleteDoc(doc(db, COLL_COBRADORES, id));
  },

  getCobradorTransactions: async (): Promise<CobradorTransaction[]> => {
       const user = currentUserCache || (auth.currentUser ? { ...auth.currentUser, role: 'admin' } as any : null);
       if(!user) return [];
       let tenantId = user.uid;
       if (user.role === 'cobrador' && user.tenantId) tenantId = user.tenantId;
       const q = query(collection(db, COLL_TRANSACTIONS), where("tenantId", "==", tenantId));
       const snap = await getDocs(q);
       return snap.docs.map(d => ({id: d.id, ...d.data()} as CobradorTransaction));
  },

  addCobradorTransaction: async (tx: Omit<CobradorTransaction, 'id'>): Promise<CobradorTransaction> => {
      const user = auth.currentUser;
      if (!user) throw new Error("Login necessário");
      const newTx = { ...tx, tenantId: user.uid };
      const docRef = await addDoc(collection(db, COLL_TRANSACTIONS), newTx);
      return { id: docRef.id, ...newTx } as CobradorTransaction;
  }
};
