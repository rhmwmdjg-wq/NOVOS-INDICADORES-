import { 
  LayoutDashboard, 
  Users, 
  UserRound, 
  Activity, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  HelpCircle, 
  ChevronRight,
  Download,
  Calendar,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Info,
  Home,
  Baby,
  Stethoscope,
  Maximize2,
  Plus,
  Heart,
  BabyIcon,
  ClipboardList,
  MapPin,
  LogIn
} from 'lucide-react';
import React, { useState, useEffect, Component, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { EquipesPacientes } from './components/EquipesPacientes';

// --- Types ---
type UserRole = 'admin' | 'profissional';
type UserStatus = 'pending' | 'active' | 'rejected';

interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  role: UserRole;
  equipeId?: string;
  status: UserStatus;
  requestedRole?: UserRole;
  requestedEquipeId?: string;
  preferences?: {
    emailNotifications: boolean;
    weeklyReports: boolean;
    darkMode: boolean;
  };
  lastReportSentAt?: any;
}

type View = 'dashboard' | 'ciclos' | 'mulher' | 'cronicas' | 'equipes' | 'settings' | 'buscativas';

// --- Components ---

const Sidebar = ({ currentView, setView, userProfile, equipes, systemSettings }: { 
  currentView: View, 
  setView: (v: View) => void, 
  userProfile: UserProfile | null,
  equipes: any[],
  systemSettings: any
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
    { id: 'equipes', label: 'Equipes e Pacientes', icon: Users },
    { id: 'buscativas', label: 'Busca Ativa', icon: ClipboardList },
    { id: 'ciclos', label: 'Ciclos de Vida', icon: Baby },
    { id: 'mulher', label: 'Saúde da Mulher', icon: UserRound },
    { id: 'cronicas', label: 'Condições Crônicas', icon: Activity },
  ];

  const teamName = useMemo(() => {
    if (userProfile?.role === 'profissional' && userProfile.equipeId) {
      const eq = equipes.find(e => e.id === userProfile.equipeId);
      return eq?.nome || `Equipe ${userProfile.equipeId}`;
    }
    return null;
  }, [userProfile, equipes]);

  const displayTitle = teamName || systemSettings?.name || "Centro Médico";
  const displaySubtitle = teamName ? "Sua Unidade de Saúde" : (systemSettings?.subtitle || "Unidade Central");

  return (
    <aside className="w-72 h-screen fixed left-0 top-0 pt-16 bg-surface-container dark:bg-slate-900 border-r border-outline-variant/20 z-40 hidden md:flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
          <Stethoscope className="text-white w-6 h-6" />
        </div>
        <div>
          <h3 className="font-headline text-sm font-bold text-primary truncate max-w-[160px]">{displayTitle}</h3>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold truncate max-w-[160px]">{displaySubtitle}</p>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 text-sm font-medium">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              currentView === item.id 
                ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/20' 
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-outline-variant/20 space-y-1">
        <button 
          onClick={() => setView('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            currentView === 'settings' 
              ? 'bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/20' 
              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
          } text-sm font-medium`}
        >
          <Settings className="w-5 h-5" />
          Configurações
        </button>
        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-error hover:bg-error-container/10 transition-colors text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

const TopBar = ({ user, currentView, setView, systemSettings }: { 
  user: User | null, 
  currentView: View, 
  setView: (v: View) => void,
  systemSettings: any
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check for redirect result on mount
  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login failed", error);
    });
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    
    // Check if we are in an iframe
    const inIframe = window.self !== window.top;
    
    try {
      if (inIframe) {
        const proceed = confirm("Você parece estar visualizando o sistema dentro de outra página (iframe). Para o login funcionar corretamente, recomendamos abrir o sistema em uma nova aba. Deseja tentar entrar mesmo assim?");
        if (!proceed) {
          setIsLoggingIn(false);
          return;
        }
      }

      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      
      // If popup is blocked or fails, try redirect as fallback
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        const useRedirect = confirm("A janela de login foi bloqueada ou fechada. Deseja tentar o método alternativo (redirecionamento)? Isso recarregará a página.");
        if (useRedirect) {
          try {
            await signInWithRedirect(auth, provider);
            return; 
          } catch (redirectError: any) {
            alert("Erro no redirecionamento: " + redirectError.message);
          }
        }
      }

      let message = "Erro ao fazer login.";
      if (error.code === 'auth/unauthorized-domain') {
        message = "Este domínio não está autorizado no Firebase. Adicione " + window.location.hostname + " nos domínios autorizados do Console do Firebase.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = "A janela de login foi fechada antes de concluir.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "O seu navegador bloqueou a janela de login. Por favor, permita popups para este site (verifique o ícone na barra de endereços).";
      }
      alert(message + "\n\nCódigo do erro: " + error.code);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <header className="fixed top-0 left-0 w-full flex items-center justify-between px-6 py-3 z-50 glass-panel border-b border-outline-variant/10">
      <div className="flex items-center gap-8">
        <span className="text-xl font-extrabold tracking-tighter text-primary font-headline cursor-pointer" onClick={() => setView('dashboard')}>
          {systemSettings?.name || "Brasil 360"}
        </span>
        <nav className="hidden md:flex items-center gap-6 font-headline font-semibold text-sm tracking-tight">
          <button 
            onClick={() => setView('dashboard')}
            className={`transition-all ${currentView === 'dashboard' ? 'text-primary font-bold border-b-2 border-primary py-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setView('ciclos')}
            className={`transition-all ${currentView === 'ciclos' ? 'text-primary font-bold border-b-2 border-primary py-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Ciclos de Vida
          </button>
          <button 
            onClick={() => setView('equipes')}
            className={`transition-all ${currentView === 'equipes' ? 'text-primary font-bold border-b-2 border-primary py-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Gestão
          </button>
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
          <input 
            className="bg-surface-container border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary transition-all" 
            placeholder="Buscar indicadores..." 
            type="text"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold text-on-surface leading-none">{user.displayName}</p>
                <p className="text-[9px] text-on-surface-variant">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container border border-outline-variant/20 overflow-hidden"
              >
                {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {isLoggingIn ? "Carregando..." : "Entrar"}
              </button>
              {isLoggingIn && (
                <span className="text-[9px] text-primary mt-1 animate-pulse">
                  Verifique se o navegador bloqueou o popup
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// --- Page Views ---

const DashboardGeral: React.FC<{ userProfile: UserProfile | null, onGenerateReport: () => void, setView: (v: View) => void }> = ({ userProfile, onGenerateReport, setView }) => {
  const [patients, setPatients] = useState<any[]>([]);
  const isFiltered = userProfile?.role === 'profissional' && userProfile?.equipeId;

  useEffect(() => {
    const q = isFiltered 
      ? query(collection(db, 'pacientes'), where('equipeId', '==', userProfile.equipeId))
      : collection(db, 'pacientes');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPatients = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setPatients(allPatients);
    });

    return unsubscribe;
  }, [isFiltered, userProfile?.equipeId]);

  const childAlerts = useMemo(() => {
    const now = new Date();
    return patients.filter(p => {
      if (!p.categorias?.includes('Criança')) return false;
      if (p.visitaACS && p.consultaPuerperal) return false;

      const birthDate = new Date(p.dataNascimento);
      const diffTime = Math.abs(now.getTime() - birthDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= 25 && diffDays <= 35;
    });
  }, [patients]);

  const stats = useMemo(() => {
    const total = patients.length;
    
    // Heuristic for "Indicadores na Meta"
    // Let's say a patient is "on target" if they don't have critical alerts
    const gestanteIncompleto = patients.filter(p => p.categorias?.includes('Gestante') && (p.consultasRealizadas || 0) < 7).length;
    const puerperaAtraso = patients.filter(p => {
      if (!p.categorias?.includes('Puérpera')) return false;
      if (p.consultaPuerperal) return false;
      const birthDate = new Date(p.dataNascimento);
      const diffDays = Math.ceil(Math.abs(new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 42;
    }).length;

    const totalAlerts = childAlerts.length + gestanteIncompleto + puerperaAtraso;
    const onTargetCount = total > 0 ? Math.max(0, total - totalAlerts) : 0;
    const onTargetPercent = total > 0 ? (onTargetCount / total) * 100 : 0;

    // Resource allocation (mock distribution based on actual categories)
    const cronicos = patients.filter(p => p.categorias?.includes('Hipertenso') || p.categorias?.includes('Diabético')).length;
    const prevencao = patients.filter(p => p.categorias?.includes('Criança') || p.categorias?.includes('Gestante')).length;
    const others = Math.max(0, total - cronicos - prevencao);
    
    const cronicosPct = total > 0 ? (cronicos / total) * 100 : 0;
    const prevencaoPct = total > 0 ? (prevencao / total) * 100 : 0;
    const othersPct = total > 0 ? (others / total) * 100 : 0;

    return {
      total,
      onTargetPercent: onTargetPercent.toFixed(1),
      totalAlerts,
      score: total > 0 ? (onTargetPercent / 10).toFixed(1) : '0.0',
      cronicosPct: cronicosPct.toFixed(0),
      prevencaoPct: prevencaoPct.toFixed(0),
      othersPct: othersPct.toFixed(0)
    };
  }, [patients, childAlerts]);

  const performanceCiclos = useMemo(() => {
    const getPct = (cat: string, filterFn: (p: any) => boolean) => {
      const catPatients = patients.filter(p => p.categorias?.includes(cat));
      if (catPatients.length === 0) return 0; // Show 0 if no patients in category
      const onTarget = catPatients.filter(filterFn).length;
      return Math.round((onTarget / catPatients.length) * 100);
    };

    return [
      { label: 'Saúde do Idoso', value: getPct('Idoso', p => true), icon: Users },
      { label: 'Saúde da Criança', value: getPct('Criança', p => p.visitaACS || p.consultaPuerperal || false), icon: Baby },
      { label: 'Gestante / Puérpera', value: getPct('Gestante', p => (p.consultasRealizadas || 0) >= 7), icon: UserRound, alert: true },
      { label: 'Hipertensos', value: getPct('Hipertenso', p => true), icon: Activity },
    ];
  }, [patients]);

  const isReportDue = useMemo(() => {
    if (!userProfile?.preferences?.weeklyReports) return false;
    if (!userProfile.lastReportSentAt) return true;
    
    const lastSent = userProfile.lastReportSentAt.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastSent.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [userProfile]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="space-y-4">
        {isReportDue && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/10 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <ClipboardList className="text-primary w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Relatório Semanal Disponível</p>
                <p className="text-xs text-on-surface-variant">Seu relatório consolidado da semana está pronto para ser gerado.</p>
              </div>
            </div>
            <button 
              onClick={onGenerateReport}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Gerar Agora
            </button>
          </motion.div>
        )}

        {childAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-error/5 border border-error/10 p-4 rounded-3xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center">
                <Baby className="text-error w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-error">Alertas de Puerpério Infantil ({childAlerts.length})</p>
                <p className="text-xs text-on-surface-variant">Crianças completando 30 dias de vida com pendências de acompanhamento.</p>
              </div>
              <button 
                onClick={() => setView('buscativas')}
                className="ml-auto px-4 py-2 bg-error text-white rounded-xl text-[10px] font-bold hover:opacity-90 transition-all"
              >
                VER LISTA COMPLETA
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {childAlerts.map(child => (
                <div key={child.id} className="bg-white p-4 rounded-2xl border border-error/10 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold">{child.nome}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold">Nasc: {new Date(child.dataNascimento).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-error/10 text-error rounded text-[9px] font-bold uppercase">Urgente</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateDoc(doc(db, 'pacientes', child.id), { visitaACS: true })}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${child.visitaACS ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-error/5'}`}
                    >
                      {child.visitaACS ? '✓ VISITA ACS' : 'PENDENTE: ACS'}
                    </button>
                    <button 
                      onClick={() => updateDoc(doc(db, 'pacientes', child.id), { consultaPuerperal: true })}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${child.consultaPuerperal ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-low text-on-surface-variant hover:bg-error/5'}`}
                    >
                      {child.consultaPuerperal ? '✓ CONSULTA' : 'PENDENTE: MÉD/ENF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
            <span>Brasil 360</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-semibold">Dashboard Geral</span>
            {isFiltered && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                  Equipe {userProfile.equipeId}
                </span>
              </>
            )}
          </nav>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Visão Panorâmica de Indicadores</h1>
          <p className="text-on-surface-variant mt-1">
            {isFiltered 
              ? `Dados consolidados da Equipe ${userProfile.equipeId}` 
              : 'Dados consolidados referentes ao Sistema de Saúde Nacional'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-surface-container-low p-1 rounded-full flex items-center">
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white shadow-sm text-primary">Nacional</button>
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface">Regional</button>
            <button className="px-4 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface">Local</button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/20 rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors">
            <Calendar className="w-4 h-4" />
            Últimos 12 meses
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
            <Activity className="w-4 h-4" />
            Filtros Avançados
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'População Atendida', value: stats.total.toLocaleString(), sub: 'pacientes', trend: stats.total > 0 ? '+0%' : '0%', icon: Users, color: 'bg-primary-container text-primary' },
          { label: 'Indicadores na Meta', value: `${stats.onTargetPercent}%`, sub: 'global', trend: 'estável', icon: CheckCircle2, color: 'bg-secondary-container text-secondary' },
          { label: 'Alertas Críticos', value: stats.totalAlerts.toString(), sub: 'indicadores', trend: stats.totalAlerts > 0 ? '+1' : '0', icon: AlertCircle, color: 'bg-error-container text-error' },
          { label: 'Eficiência de Gestão', value: stats.score, sub: 'score', trend: 'estável', icon: TrendingUp, color: 'bg-surface-container-highest text-on-surface' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold ${stat.trend.includes('+') ? 'text-secondary' : 'text-on-surface-variant'}`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-headline">{stat.value}</span>
              <span className="text-xs text-on-surface-variant">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold">Desempenho por Ciclo de Vida</h2>
              <p className="text-sm text-on-surface-variant">Percentual de cumprimento de metas assistenciais</p>
            </div>
            <button className="p-2 hover:bg-surface-container-low rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            {performanceCiclos.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.alert && item.value < 95 ? 'text-error' : 'text-primary'}`} />
                    {item.label}
                  </span>
                  <span className={`font-bold ${item.alert && item.value < 95 ? 'text-error' : ''}`}>
                    {item.value}% {item.alert && item.value < 95 && <span className="text-xs font-normal">(Abaixo da Meta)</span>}
                  </span>
                </div>
                <div className="h-3 bg-surface-container-low rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full ${item.alert && item.value < 95 ? 'bg-error' : 'bg-gradient-to-r from-primary to-primary-container'}`} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm flex flex-col">
          <h2 className="text-xl font-bold mb-1">Alocação de Recursos</h2>
          <p className="text-sm text-on-surface-variant mb-8">Distribuição por prioridade clínica</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle className="text-surface-container" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="12" />
                <circle className="text-primary" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (Number(stats.cronicosPct) / 100))} strokeLinecap="round" strokeWidth="12" />
                <circle className="text-secondary" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (Number(stats.prevencaoPct) / 100))} strokeLinecap="round" strokeWidth="12" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold font-headline">{stats.total > 0 ? '92%' : '0%'}</span>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Utilização</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {[
                { label: 'Crônicos', value: `${stats.cronicosPct}%`, color: 'bg-primary' },
                { label: 'Prevenção', value: `${stats.prevencaoPct}%`, color: 'bg-secondary' },
                { label: 'Administrativo', value: `${stats.othersPct}%`, color: 'bg-surface-container' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-on-surface-variant">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CiclosDeVida: React.FC<{ userProfile: UserProfile | null }> = ({ userProfile }) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const q = userProfile.role === 'profissional' && userProfile.equipeId
      ? query(collection(db, 'pacientes'), where('equipeId', '==', userProfile.equipeId))
      : collection(db, 'pacientes');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setPatients(all);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const stats = useMemo(() => {
    const criancas = patients.filter(p => p.categorias?.includes('Criança'));
    const idosos = patients.filter(p => p.categorias?.includes('Idoso'));
    
    // Mocking some trends based on actual data counts
    const vacinacaoPct = criancas.length > 0 ? 90 : 0; // Simplified
    const consultasRealizadas = patients.length * 2; // Mocked logic
    
    return {
      vacinacaoPct,
      consultasRealizadas,
      totalPatients: patients.length
    };
  }, [patients]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
            <span>Painel</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-bold text-primary">Ciclos de Vida</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">Monitoramento de Ciclos</h1>
          <p className="text-on-surface-variant max-w-2xl mt-1">Análise detalhada de performance clínica para populações vulneráveis: infância e terceira idade.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface-container-high px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-surface-variant transition-colors">
            <Calendar className="w-4 h-4" />
            Setembro 2023
          </button>
          <button className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center gap-2">
            <Download className="w-4 h-4" />
            Relatório Completo
          </button>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Baby className="text-primary w-6 h-6" />
          <h2 className="text-xl font-bold">Saúde da Criança</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg">Tendência Temporal de Vacinação</h3>
                <p className="text-xs text-on-surface-variant">Cobertura vacinal completa (0-5 anos)</p>
              </div>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-[10px] font-bold text-primary"><span className="w-2 h-2 rounded-full bg-primary"></span> Atual</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-outline"><span className="w-2 h-2 rounded-full bg-outline"></span> Meta (95%)</span>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-4 relative">
              <div className="absolute inset-x-4 top-1/4 border-t-2 border-dashed border-outline/10"></div>
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${[40, 50, 70, 65, 80, 90][i]}%` }}
                    className={`w-full rounded-t-xl transition-colors relative ${month === 'Abr' ? 'bg-primary/40 border-t-4 border-primary' : 'bg-primary/20 group-hover:bg-primary/30'}`}
                  >
                    {month === 'Abr' && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold">87%</div>}
                  </motion.div>
                  <span className={`text-[10px] font-medium ${month === 'Abr' ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{month}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 grid grid-rows-2 gap-4">
            <div className="bg-primary text-white p-6 rounded-3xl shadow-lg relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <Activity className="w-24 h-24" />
              </div>
              <h4 className="text-xs uppercase tracking-widest font-bold opacity-80">Taxa de Vacinação</h4>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-4xl font-extrabold">{stats.vacinacaoPct.toFixed(1)}%</span>
                <span className="text-xs text-secondary-container font-bold mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> +0%</span>
              </div>
              <p className="text-xs mt-4 opacity-70">Dados baseados nos registros atuais do sistema.</p>
            </div>
            <div className="bg-surface-container-high p-6 rounded-3xl border border-outline-variant/20">
              <h4 className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Consultas de Rotina</h4>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface font-medium">Realizadas</span>
                  <span className="font-bold">{stats.consultasRealizadas.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-1/2 rounded-full"></div>
                </div>
                <p className="text-[10px] text-on-surface-variant">Baseado no total de pacientes: {stats.totalPatients}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-outline-variant/10">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Performance por Unidade de Saúde</h2>
          <p className="text-sm text-on-surface-variant">Alcance de metas vacinais e consultas de crescimento.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold uppercase text-on-surface-variant tracking-widest border-b border-outline-variant/10">
                <th className="pb-4">Unidade</th>
                <th className="pb-4 text-center">Vacinação (%)</th>
                <th className="pb-4 text-center">Rotina (Meta)</th>
                <th className="pb-4">Status</th>
                <th className="pb-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant/10">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant italic">
                    Nenhum dado disponível para as unidades selecionadas.
                  </td>
                </tr>
              ) : (
                [
                  { name: 'UBS Jardim das Oliveiras', vac: 94.2, rot: '88%', status: 'Meta Atingida', color: 'bg-secondary-container text-secondary' },
                  { name: 'UPA Central Norte', vac: 76.8, rot: '62%', status: 'Ação Urgente', color: 'bg-error-container text-error' },
                ].map((row, i) => (
                  <tr key={i} className="group hover:bg-surface-container-low transition-colors">
                    <td className="py-4 font-bold text-primary">{row.name}</td>
                    <td className="py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div className={`h-full ${row.vac > 80 ? 'bg-secondary' : 'bg-error'}`} style={{ width: `${row.vac}%` }} />
                        </div>
                        <span className="font-bold">{row.vac}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-center font-medium">{row.rot}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${row.color}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-outline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};

const SaudeDaMulher: React.FC<{ userProfile: UserProfile | null, setView: (v: View) => void }> = ({ userProfile, setView }) => {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const q = userProfile.role === 'profissional' && userProfile.equipeId
      ? query(collection(db, 'pacientes'), where('equipeId', '==', userProfile.equipeId))
      : collection(db, 'pacientes');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = all.filter((p: any) => 
        p.categorias?.includes('Gestante') || p.categorias?.includes('Puérpera')
      );
      setPacientes(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar pacientes (Saúde da Mulher):", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const handleConvocar = async (pacienteId: string) => {
    try {
      await updateDoc(doc(db, 'pacientes', pacienteId), {
        convocada: true,
        dataConvocacao: serverTimestamp()
      });
      alert("Paciente convocada com sucesso!");
    } catch (error) {
      console.error("Erro ao convocar paciente:", error);
      alert("Erro ao convocar paciente. Verifique suas permissões.");
    }
  };

  const gestantes = pacientes.filter(p => p.categorias?.includes('Gestante'));
  const puerperas = pacientes.filter(p => p.categorias?.includes('Puérpera'));

  // Calculate KPIs
  const preNatalCompleto = gestantes.length > 0 
    ? (gestantes.filter(p => (p.consultasRealizadas || 0) >= 7).length / gestantes.length * 100).toFixed(1)
    : '0.0';
  
  const acompPuerperal = puerperas.length > 0
    ? (puerperas.filter(p => p.consultaPuerperal).length / puerperas.length * 100).toFixed(1)
    : '0.0';

  // Find overdue puerperal
  const overduePuerperas = puerperas.filter(p => {
    if (p.consultaPuerperal) return false;
    const birthDate = new Date(p.dataNascimento);
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 42;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Saúde da Mulher</h1>
          <p className="text-on-surface-variant font-medium">Gestante, Puérpera e Rastreamento Oncológico</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-on-surface-variant px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 border border-outline-variant/20 hover:bg-surface-container-low transition-all">
            <Calendar className="w-4 h-4" />
            Últimos 30 dias
          </button>
          <button className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Paciente
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pré-Natal Completo', value: `${preNatalCompleto}%`, sub: 'Mínimo 7 consultas', trend: '+12%', color: 'bg-primary-container text-primary' },
          { label: 'Acomp. Puerperal', value: `${acompPuerperal}%`, sub: 'Até 42 dias pós-parto', trend: '-3%', color: 'bg-secondary-container text-secondary' },
          { label: 'Citopatológico', value: '91.8%', sub: 'Cobertura trienal', trend: 'Meta OK', color: 'bg-tertiary-container text-white' },
          { label: 'Mamografias', value: '52.1%', sub: 'Fila: 124 mulheres', trend: 'Crítico', color: 'bg-error-container text-error' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl ${kpi.color}`}>
                <Activity className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${kpi.trend.includes('+') || kpi.trend === 'Meta OK' ? 'bg-secondary-container/20 text-secondary' : 'bg-error-container/20 text-error'}`}>
                {kpi.trend}
              </span>
            </div>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">{kpi.label}</p>
            <h3 className="text-2xl font-extrabold mt-1">{kpi.value}</h3>
            <p className="text-[10px] text-on-surface-variant mt-2 font-medium">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold px-2">Jornadas de Cuidado Ativas</h2>
          
          {pacientes.length === 0 && !loading && (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-outline-variant/30 text-center">
              <p className="text-on-surface-variant">Nenhuma paciente em monitoramento ativo.</p>
            </div>
          )}

          {gestantes.slice(0, 2).map(p => (
            <div key={p.id} className="bg-white rounded-3xl p-6 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserRound className="text-primary w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold">{p.nome}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary-container/20 text-secondary rounded uppercase">Gestante</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Nascimento: {new Date(p.dataNascimento).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                  <span>Progresso do Pré-Natal (7 Consultas)</span>
                  <span className="text-primary">{p.consultasRealizadas || 0} de 7</span>
                </div>
                <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(((p.consultasRealizadas || 0) / 7) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          ))}

          {overduePuerperas.map(p => (
            <div key={p.id} className="bg-white rounded-3xl p-6 border-l-4 border-l-error border-y border-r border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                  <AlertCircle className="text-error w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold">{p.nome}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-error-container text-error rounded uppercase">Puerpério</span>
                  </div>
                  <p className="text-xs text-error font-bold">Acompanhamento puerperal em atraso</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-error-container/10 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Bell className="text-error w-5 h-5" />
                  <span className="text-xs font-semibold">
                    {p.convocada ? `Convocada em ${p.dataConvocacao?.toDate().toLocaleDateString()}` : 'Necessário contato imediato para agendamento'}
                  </span>
                </div>
                {!p.convocada && (
                  <button 
                    onClick={() => handleConvocar(p.id)}
                    className="bg-error text-white text-[10px] font-bold px-4 py-2 rounded-xl shadow-sm hover:opacity-90 transition-all"
                  >
                    CONVOCAR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10">
            <h3 className="text-lg font-bold mb-4">Alertas de Atenção</h3>
            <div className="space-y-4">
              {[
                { label: '14 Gestantes', desc: 'Consultas em atraso (> 30 dias)', color: 'bg-error' },
                { label: '8 Puérperas', desc: 'Próximas ao limite de 42 dias', color: 'bg-amber-500' },
                { label: '22 Exames', desc: 'Resultados aguardando revisão', color: 'bg-primary' },
              ].map((alert, i) => (
                <div key={i} className="flex gap-4 items-start p-3 bg-white rounded-2xl shadow-sm">
                  <div className={`w-2 h-2 rounded-full ${alert.color} mt-1.5 shrink-0`} />
                  <div>
                    <p className="text-xs font-bold">{alert.label}</p>
                    <p className="text-[11px] text-on-surface-variant">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setView('buscativas')}
              className="w-full mt-6 py-3 text-xs font-bold text-primary bg-primary-container/10 rounded-xl hover:bg-primary-container/20 transition-colors"
            >
              GERAR LISTA DE BUSCA ATIVA
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BuscaAtiva: React.FC<{ userProfile: UserProfile | null }> = ({ userProfile }) => {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const q = userProfile.role === 'profissional' && userProfile.equipeId
      ? query(collection(db, 'pacientes'), where('equipeId', '==', userProfile.equipeId))
      : collection(db, 'pacientes');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPacientes(all);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const now = new Date();

  const childAlerts = pacientes.filter(p => {
    if (!p.categorias?.includes('Criança')) return false;
    if (p.visitaACS && p.consultaPuerperal) return false;
    const birthDate = new Date(p.dataNascimento);
    const diffDays = Math.ceil(Math.abs(now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 25 && diffDays <= 35;
  });

  const gestanteAlerts = pacientes.filter(p => {
    if (!p.categorias?.includes('Gestante')) return false;
    return (p.consultasRealizadas || 0) < 7;
  });

  const puerperaAlerts = pacientes.filter(p => {
    if (!p.categorias?.includes('Puérpera')) return false;
    if (p.consultaPuerperal) return false;
    const birthDate = new Date(p.dataNascimento);
    const diffDays = Math.ceil(Math.abs(now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 42;
  });

  const generatePDF = () => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(20);
    docPdf.text('Lista de Busca Ativa - Brasil 360', 14, 22);
    docPdf.setFontSize(11);
    docPdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    const data = [
      ...childAlerts.map(p => [p.nome, 'Criança', 'Puerpério Infantil Pendente']),
      ...gestanteAlerts.map(p => [p.nome, 'Gestante', 'Pré-natal Incompleto']),
      ...puerperaAlerts.map(p => [p.nome, 'Puérpera', 'Consulta Puerperal em Atraso']),
    ];

    autoTable(docPdf, {
      startY: 40,
      head: [['Nome', 'Categoria', 'Motivo da Busca Ativa']],
      body: data,
      headStyles: { fillColor: [220, 38, 38] },
    });

    docPdf.save(`busca_ativa_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Busca Ativa</h1>
          <p className="text-on-surface-variant">Pacientes com pendências críticas de acompanhamento.</p>
        </div>
        <button 
          onClick={generatePDF}
          className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar Lista (PDF)
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Crianças</h3>
          <p className="text-4xl font-extrabold text-error">{childAlerts.length}</p>
          <p className="text-xs text-on-surface-variant mt-2">Pendências de 30 dias</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Gestantes</h3>
          <p className="text-4xl font-extrabold text-amber-500">{gestanteAlerts.length}</p>
          <p className="text-xs text-on-surface-variant mt-2">Pré-natal incompleto</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Puérperas</h3>
          <p className="text-4xl font-extrabold text-error">{puerperaAlerts.length}</p>
          <p className="text-xs text-on-surface-variant mt-2">Atraso {'>'} 42 dias</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low border-b border-outline-variant/10">
            <tr>
              <th className="px-6 py-4 font-bold">Paciente</th>
              <th className="px-6 py-4 font-bold">Categoria</th>
              <th className="px-6 py-4 font-bold">Motivo</th>
              <th className="px-6 py-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {[...childAlerts, ...gestanteAlerts, ...puerperaAlerts].length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                  Nenhuma busca ativa pendente no momento.
                </td>
              </tr>
            ) : (
              [...childAlerts, ...gestanteAlerts, ...puerperaAlerts].map((p, i) => (
                <tr key={i} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{p.nome}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-surface-container rounded text-[10px] font-bold uppercase">
                      {p.categorias?.join(', ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant">
                    {p.categorias?.includes('Criança') && 'Puerpério Infantil Pendente'}
                    {p.categorias?.includes('Gestante') && 'Pré-natal Incompleto'}
                    {p.categorias?.includes('Puérpera') && 'Consulta Puerperal em Atraso'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary hover:underline font-bold text-xs">Ver Prontuário</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

const CondicoesCronicas: React.FC<{ userProfile: UserProfile | null }> = ({ userProfile }) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const q = userProfile.role === 'profissional' && userProfile.equipeId
      ? query(collection(db, 'pacientes'), where('equipeId', '==', userProfile.equipeId))
      : collection(db, 'pacientes');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setPatients(all);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const stats = useMemo(() => {
    const has = patients.filter(p => p.categorias?.includes('Hipertenso'));
    const dm = patients.filter(p => p.categorias?.includes('Diabético'));
    
    // Mocking some trends based on actual data counts
    const hasPct = has.length > 0 ? 70 : 0; 
    const dmPct = dm.length > 0 ? 55 : 0;
    
    return {
      hasPct,
      dmPct,
      totalPatients: patients.length
    };
  }, [patients]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Condições Crônicas</h1>
        <p className="text-on-surface-variant max-w-2xl">Monitoramento estratégico de Hipertensão (HAS) e Diabetes (DM). Foco em adesão ao tratamento e redução de desfechos graves.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Pressão Arterial (HAS)', value: `${stats.hasPct.toFixed(1)}%`, trend: '+0%', meta: '85%', color: 'border-primary', iconColor: 'text-primary' },
          { label: 'Hemoglobina Glicada (DM)', value: `${stats.dmPct.toFixed(1)}%`, trend: '+0%', meta: '70%', color: 'border-secondary', iconColor: 'text-secondary' },
        ].map((card, i) => (
          <div key={i} className={`bg-white rounded-3xl p-8 border-b-4 ${card.color} shadow-sm`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Acompanhamento Semestral</p>
                <h3 className="text-xl font-bold">{card.label}</h3>
              </div>
              <Activity className={`w-8 h-8 ${card.iconColor} opacity-20`} />
            </div>
            <div className="flex items-end gap-4">
              <span className="text-4xl font-extrabold">{card.value}</span>
              <span className={`flex items-center text-sm font-bold mb-1 ${card.trend.includes('+') ? 'text-secondary' : 'text-error'}`}>
                {card.trend.includes('+') ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {card.trend}
              </span>
            </div>
            <div className="mt-6 h-2.5 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${card.iconColor.replace('text-', 'bg-')}`} style={{ width: card.value }} />
            </div>
            <p className="text-xs text-on-surface-variant mt-4 italic">Meta: {card.meta} da população cadastrada</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold">Eficácia por Unidade Básica</h3>
            <p className="text-sm text-on-surface-variant">Correlação entre acompanhamento e controle glicêmico</p>
          </div>
          <div className="flex gap-2 bg-surface-container-low p-1 rounded-xl">
            <button className="px-4 py-2 text-xs font-bold rounded-lg text-on-surface-variant hover:text-on-surface">MENSAL</button>
            <button className="px-4 py-2 bg-white shadow-sm text-primary text-xs font-bold rounded-lg">TRIMESTRAL</button>
          </div>
        </div>
        
        <div className="relative h-80 w-full bg-surface-container-low/30 rounded-2xl p-8 border border-outline-variant/5">
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10 pointer-events-none">
            {[...Array(16)].map((_, i) => <div key={i} className="border-r border-b border-on-surface" />)}
          </div>
          
          <div className="relative w-full h-full">
            <div className="absolute bottom-[20%] left-[15%] w-12 h-12 rounded-full bg-error/20 border-2 border-error flex items-center justify-center text-[10px] font-bold text-error shadow-lg">UBS 04</div>
            <div className="absolute bottom-[45%] left-[35%] w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary shadow-lg">UBS 01</div>
            <div className="absolute bottom-[75%] left-[65%] w-20 h-20 rounded-full bg-secondary/20 border-2 border-secondary flex items-center justify-center text-[10px] font-bold text-secondary shadow-lg">UBS 09</div>
            <div className="absolute bottom-[85%] left-[85%] w-14 h-14 rounded-full bg-secondary/40 border-2 border-secondary flex items-center justify-center text-[10px] font-bold text-secondary shadow-lg">UBS 02</div>
          </div>

          <div className="absolute bottom-2 left-8 text-[10px] font-bold text-on-surface-variant">BAIXO ACOMPANHAMENTO</div>
          <div className="absolute bottom-2 right-8 text-[10px] font-bold text-on-surface-variant">ALTO ACOMPANHAMENTO</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-on-surface-variant">CONTROLE EFICAZ</div>
        </div>
      </div>
    </motion.div>
  );
};

const SettingsView: React.FC<{ 
  user: any, 
  userProfile: UserProfile | null, 
  onGenerateReport: () => void, 
  generating: boolean,
  systemSettings: any
}> = ({ user, userProfile, onGenerateReport, generating, systemSettings }) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [equipes, setEquipes] = useState<any[]>([]);
  const [editingSystem, setEditingSystem] = useState(false);
  const [newSystemName, setNewSystemName] = useState(systemSettings?.name || '');
  const [newSystemSubtitle, setNewSystemSubtitle] = useState(systemSettings?.subtitle || '');
  const isAdmin = userProfile?.role === 'admin';

  const handleSaveSystemSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        name: newSystemName,
        subtitle: newSystemSubtitle
      }, { merge: true });
      setEditingSystem(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveUser = async (userId: string, approved: boolean) => {
    try {
      const userToApprove = allUsers.find(u => u.id === userId);
      if (!userToApprove) return;

      if (approved) {
        await updateDoc(doc(db, 'users', userId), {
          status: 'active',
          role: userToApprove.requestedRole || 'profissional',
          equipeId: userToApprove.requestedEquipeId || ''
        });
      } else {
        await updateDoc(doc(db, 'users', userId), {
          status: 'rejected'
        });
      }
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: approved ? 'active' : 'rejected' } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const pendingUsers = allUsers.filter(u => u.status === 'pending');

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        const usersSnap = await getDocs(collection(db, 'users'));
        setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      };
      fetchUsers();
    }
    const fetchEquipes = async () => {
      const equipesSnap = await getDocs(collection(db, 'equipes'));
      setEquipes(equipesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchEquipes();
  }, [isAdmin]);

  const handleUpdateUserEquipe = async (userId: string, equipeId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { equipeId });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, equipeId } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePreference = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      const currentPrefs = userProfile?.preferences || { emailNotifications: true, weeklyReports: false, darkMode: false };
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: { ...currentPrefs, [key]: value }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const prefs = [
    { id: 'emailNotifications', label: 'Notificações por E-mail', desc: 'Receber alertas de indicadores críticos', active: userProfile?.preferences?.emailNotifications ?? true },
    { id: 'weeklyReports', label: 'Relatórios Semanais', desc: 'Envio automático de PDF consolidado', active: userProfile?.preferences?.weeklyReports ?? false },
    { id: 'darkMode', label: 'Modo Escuro', desc: 'Alterar interface para cores escuras', active: userProfile?.preferences?.darkMode ?? false },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Configurações</h1>
        <p className="text-on-surface-variant">Gerencie suas preferências e informações da conta.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UserRound className="text-primary w-5 h-5" />
              Perfil do Usuário
            </h2>
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container border-4 border-white shadow-xl overflow-hidden">
                {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-12 h-12" />}
              </div>
              <div>
                <h3 className="text-xl font-bold">{user?.displayName || 'Usuário'}</h3>
                <p className="text-on-surface-variant">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-secondary-container/20 text-secondary text-[10px] font-bold rounded-full uppercase">
                  {userProfile?.role === 'admin' ? 'Administrador' : 'Profissional de Saúde'}
                </span>
                {userProfile?.equipeId && (
                  <p className="text-xs text-primary font-bold mt-2">Vínculo: Equipe {userProfile.equipeId}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-on-surface-variant">Nome de Exibição</label>
                <input disabled value={user?.displayName || ''} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm opacity-70" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-on-surface-variant">E-mail Institucional</label>
                <input disabled value={user?.email || ''} className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm opacity-70" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Settings className="text-primary w-5 h-5" />
              Preferências do Sistema
            </h2>
            <div className="space-y-4">
              {prefs.map((pref, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                  <div>
                    <p className="text-sm font-bold">{pref.label}</p>
                    <p className="text-xs text-on-surface-variant">{pref.desc}</p>
                  </div>
                  <div 
                    onClick={() => handleUpdatePreference(pref.id, !pref.active)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${pref.active ? 'bg-primary' : 'bg-outline-variant'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${pref.active ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}

              {userProfile?.preferences?.weeklyReports && (
                <div className="mt-6 pt-6 border-t border-outline-variant/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">Relatório Consolidado</p>
                      <p className="text-xs text-on-surface-variant">
                        {userProfile.lastReportSentAt 
                          ? `Último relatório gerado em: ${userProfile.lastReportSentAt.toDate().toLocaleDateString('pt-BR')}`
                          : 'Nenhum relatório gerado ainda.'}
                      </p>
                    </div>
                    <button 
                      onClick={onGenerateReport}
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {generating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Gerar Agora
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings className="text-primary w-5 h-5" />
                Configurações Globais do Sistema
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-on-surface-variant">Nome do Sistema</label>
                    <input 
                      value={newSystemName}
                      onChange={(e) => setNewSystemName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm"
                      placeholder="Ex: Brasil 360"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-on-surface-variant">Subtítulo / Unidade</label>
                    <input 
                      value={newSystemSubtitle}
                      onChange={(e) => setNewSystemSubtitle(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-3 px-4 text-sm"
                      placeholder="Ex: Unidade Central"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleSaveSystemSettings}
                    className="px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {isAdmin && pendingUsers.length > 0 && (
            <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 shadow-sm mb-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-amber-800">
                <Bell className="w-5 h-5" />
                Solicitações de Acesso Pendentes ({pendingUsers.length})
              </h2>
              <div className="space-y-4">
                {pendingUsers.map((u) => (
                  <div key={u.id} className="bg-white p-4 rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                        {u.nome?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{u.nome}</p>
                        <p className="text-xs text-on-surface-variant">{u.email}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">
                            {u.requestedRole === 'admin' ? 'Adm' : 'Prof'}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">
                            Equipe: {equipes.find(e => e.id === u.requestedEquipeId)?.nome || u.requestedEquipeId}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveUser(u.id, false)}
                        className="px-4 py-2 text-error text-xs font-bold hover:bg-error/5 rounded-xl transition-all"
                      >
                        Recusar
                      </button>
                      <button 
                        onClick={() => handleApproveUser(u.id, true)}
                        className="px-6 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all"
                      >
                        Aprovar Acesso
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="bg-white rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Users className="text-primary w-5 h-5" />
                Gestão de Profissionais
              </h2>
              <div className="space-y-4">
                {allUsers.filter(u => u.role !== 'admin').map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <div>
                      <p className="text-sm font-bold">{u.nome}</p>
                      <p className="text-xs text-on-surface-variant">{u.email}</p>
                    </div>
                    <select 
                      value={u.equipeId || ''}
                      onChange={(e) => handleUpdateUserEquipe(u.id, e.target.value)}
                      className="bg-white border-none rounded-lg text-xs font-bold py-2 px-3 focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Sem Equipe</option>
                      {equipes.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nome}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {allUsers.filter(u => u.role !== 'admin').length === 0 && (
                  <p className="text-center text-xs text-on-surface-variant py-4">Nenhum profissional cadastrado.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-primary text-white rounded-3xl p-8 shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Settings className="w-40 h-40" />
            </div>
            <h3 className="text-lg font-bold mb-2">Suporte Técnico</h3>
            <p className="text-sm opacity-80 mb-6">Precisa de ajuda com o sistema ou encontrou algum erro?</p>
            <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-surface-container-low transition-colors">
              Abrir Chamado
            </button>
          </div>
          
          <div className="bg-surface-container-high rounded-3xl p-6 border border-outline-variant/10">
            <h3 className="text-sm font-bold mb-4">Sobre o Brasil 360</h3>
            <div className="space-y-2 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Versão</span>
                <span className="font-bold">2.4.0-stable</span>
              </div>
              <div className="flex justify-between">
                <span>Última Atualização</span>
                <span className="font-bold">03/04/2026</span>
              </div>
              <div className="flex justify-between">
                <span>Licença</span>
                <span className="font-bold">Uso Institucional</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Access Request Components ---

const RequestAccess = ({ user, equipes }: { user: User, equipes: any[] }) => {
  const [nome, setNome] = useState(user.displayName || '');
  const [requestedRole, setRequestedRole] = useState<UserRole>('profissional');
  const [requestedEquipeId, setRequestedEquipeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isDefaultAdmin = user.email === "rhmwmdjg@gmail.com";
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        nome: nome,
        role: isDefaultAdmin ? 'admin' : 'profissional', // Default role for creation, but status is pending
        status: isDefaultAdmin ? 'active' : 'pending',
        requestedRole: requestedRole,
        requestedEquipeId: requestedEquipeId,
        preferences: {
          emailNotifications: true,
          weeklyReports: false,
          darkMode: false
        }
      };
      await setDoc(doc(db, 'users', user.uid), {
        ...newProfile,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error requesting access:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full border border-outline-variant/10"
      >
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
          <UserRound className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Solicitar Acesso</h2>
        <p className="text-on-surface-variant mb-8 text-sm">
          Preencha os dados abaixo para solicitar acesso ao sistema. Um administrador precisará aprovar sua solicitação.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-on-surface-variant ml-1">Seu Nome Completo</label>
            <input 
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="Como você quer ser chamado?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-on-surface-variant ml-1">Perfil Desejado</label>
            <select 
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as UserRole)}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="profissional">Profissional de Saúde (Usuário)</option>
              <option value="admin">Administrador do Sistema</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-on-surface-variant ml-1">Unidade / Equipe</label>
            <select 
              required
              value={requestedEquipeId}
              onChange={(e) => setRequestedEquipeId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
              <option value="">Selecione sua unidade...</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>

          <button 
            disabled={submitting}
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
          >
            {submitting ? 'Enviando solicitação...' : 'Enviar Solicitação'}
          </button>
          
          <button 
            type="button"
            onClick={() => signOut(auth)}
            className="w-full py-3 text-on-surface-variant text-sm font-medium hover:bg-surface-container rounded-xl transition-all"
          >
            Sair e entrar com outra conta
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const PendingApproval = ({ userProfile }: { userProfile: UserProfile }) => {
  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-outline-variant/10"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
          <ClipboardList className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-4">Aguardando Aprovação</h2>
        <p className="text-on-surface-variant mb-8">
          Olá, <span className="font-bold text-on-surface">{userProfile.nome}</span>! Sua solicitação de acesso foi enviada com sucesso.
          <br /><br />
          Um administrador revisará seu pedido em breve. Você receberá acesso assim que for autorizado.
        </p>
        <div className="p-4 bg-surface-container-low rounded-2xl text-left mb-8 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant font-bold uppercase">Perfil solicitado:</span>
            <span className="font-bold text-primary">{userProfile.requestedRole === 'admin' ? 'Administrador' : 'Profissional'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-on-surface-variant font-bold uppercase">Status:</span>
            <span className="font-bold text-amber-600">Pendente</span>
          </div>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="w-full py-4 border-2 border-outline-variant/20 text-on-surface font-bold rounded-2xl hover:bg-surface-container transition-all"
        >
          Sair da Conta
        </button>
      </motion.div>
    </div>
  );
};

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: any;
}

class ErrorBoundary extends Component<any, any> {
  public state: any;
  public props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error };
  }

  render() {
    const { hasError, errorInfo } = this.state;
    if (hasError) {
      let message = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(errorInfo.message);
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          message = "Você não tem permissão para realizar esta ação ou visualizar estes dados.";
        }
      } catch (e) {
        message = errorInfo.message || message;
      }

      return (
        <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-error/10">
            <div className="w-16 h-16 bg-error-container text-error rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-2">Ops! Algo deu errado</h2>
            <p className="text-on-surface-variant mb-8">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [view, setView] = useState<View>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({ name: 'Brasil 360', subtitle: 'Unidade Central' });
  const [equipes, setEquipes] = useState<any[]>([]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSystemSettings(doc.data());
      }
    }, (error) => {
      console.warn("Settings listener error (expected if not public):", error);
    });

    return () => {
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setEquipes([]);
      return;
    }

    const unsubEquipes = onSnapshot(collection(db, 'equipes'), (snapshot) => {
      setEquipes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Equipes listener error:", error);
    });

    return () => {
      unsubEquipes();
    };
  }, [user]);

  const generateWeeklyReport = async () => {
    if (!user || !userProfile) return;
    setGenerating(true);
    try {
      const patientsSnap = await getDocs(collection(db, 'pacientes'));
      const equipesSnap = await getDocs(collection(db, 'equipes'));
      const equipes = equipesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      let patients = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      if (userProfile.role !== 'admin' && userProfile.equipeId) {
        patients = patients.filter((p: any) => p.equipeId === userProfile.equipeId);
      }

      const docPdf = new jsPDF();
      docPdf.setFontSize(20);
      docPdf.text('Relatório Semanal - Brasil 360', 14, 22);
      docPdf.setFontSize(11);
      docPdf.setTextColor(100);
      docPdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
      docPdf.text(`Responsável: ${userProfile.nome || user.displayName}`, 14, 36);
      
      if (userProfile.equipeId) {
        const eq = equipes.find(e => e.id === userProfile.equipeId);
        docPdf.text(`Equipe: ${eq?.nome || userProfile.equipeId}`, 14, 42);
      }

      autoTable(docPdf, {
        startY: 50,
        head: [['Nome', 'CPF', 'Categorias', 'Equipe']],
        body: patients.map((p: any) => [
          p.nome,
          p.cpf,
          (p.categorias || []).join(', '),
          equipes.find(e => e.id === p.equipeId)?.nome || 'N/A'
        ]),
        headStyles: { fillColor: [0, 102, 204] },
      });

      docPdf.save(`relatorio_semanal_${new Date().toISOString().split('T')[0]}.pdf`);
      
      await updateDoc(doc(db, 'users', user.uid), {
        lastReportSentAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Erro ao gerar relatório:", e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Reactive profile fetching
        unsubscribeProfile = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile({ id: docSnap.id, ...docSnap.data() } as any as UserProfile);
          } else {
            // No profile yet - will show request form
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile snapshot error:", error);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!user ? (
        <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-12 rounded-[48px] shadow-2xl max-w-md w-full text-center border border-outline-variant/10"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Stethoscope className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-on-surface mb-2">{systemSettings?.name || 'Brasil 360'}</h1>
            <p className="text-on-surface-variant mb-10 text-sm font-medium uppercase tracking-widest">
              {systemSettings?.subtitle || 'Gestão de Saúde da Família'}
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={async () => {
                  const provider = new GoogleAuthProvider();
                  try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
                }}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <LogIn className="w-5 h-5" />
                Entrar com Google
              </button>
              <p className="text-[10px] text-on-surface-variant px-6">
                Ao entrar, você concorda com os termos de uso e política de privacidade da instituição.
              </p>
            </div>
          </motion.div>
        </div>
      ) : !userProfile ? (
        <RequestAccess user={user} equipes={equipes} />
      ) : userProfile.status === 'pending' ? (
        <PendingApproval userProfile={userProfile} />
      ) : userProfile.status === 'rejected' ? (
        <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6 text-center">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-error/10">
            <div className="w-20 h-20 bg-error-container text-error rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-4">Acesso Negado</h2>
            <p className="text-on-surface-variant mb-8">
              Sua solicitação de acesso não foi aprovada. Entre em contato com a coordenação para mais informações.
            </p>
            <button 
              onClick={() => signOut(auth)}
              className="w-full py-4 bg-surface-container text-on-surface font-bold rounded-2xl hover:bg-surface-container-high transition-all"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      ) : (
        <>
          <TopBar user={user} currentView={view} setView={setView} systemSettings={systemSettings} />
          <Sidebar 
            currentView={view} 
            setView={setView} 
            userProfile={userProfile} 
            equipes={equipes} 
            systemSettings={systemSettings} 
          />
          
          <main className="md:ml-72 pt-24 px-6 pb-12 lg:px-10">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                {view === 'dashboard' && <DashboardGeral key="dashboard" userProfile={userProfile} onGenerateReport={generateWeeklyReport} setView={setView} />}
                {view === 'buscativas' && <BuscaAtiva key="buscativas" userProfile={userProfile} />}
                {view === 'equipes' && <EquipesPacientes key="equipes" userProfile={userProfile} loading={loading} />}
                {view === 'ciclos' && <CiclosDeVida key="ciclos" userProfile={userProfile} />}
                {view === 'mulher' && <SaudeDaMulher key="mulher" userProfile={userProfile} setView={setView} />}
                {view === 'cronicas' && <CondicoesCronicas key="cronicas" userProfile={userProfile} />}
                {view === 'settings' && (
                  <SettingsView 
                    key="settings" 
                    user={user} 
                    userProfile={userProfile} 
                    onGenerateReport={generateWeeklyReport} 
                    generating={generating}
                    systemSettings={systemSettings}
                  />
                )}
              </AnimatePresence>
            </div>
          </main>

          <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
            <Plus className="w-8 h-8" />
          </button>
        </>
      )}
    </div>
  );
}
