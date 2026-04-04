import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  UserPlus, 
  ChevronRight, 
  Baby, 
  Heart, 
  Activity, 
  UserRound,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  documentId
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { runInitialMigration } from '../lib/migrations';

interface Equipe {
  id: string;
  nome: string;
  area: string;
  supervisor: string;
}

interface Paciente {
  id: string;
  nome: string;
  dataNascimento: string;
  equipeId: string;
  categorias: string[];
  cpf?: string;
  visitaACS?: boolean;
  consultaPuerperal?: boolean;
}

const CATEGORIAS = ["Diabético", "Hipertenso", "Criança", "Idoso", "Gestante", "Puérpera"];

export const EquipesPacientes: React.FC<{ userProfile: any, loading: boolean }> = ({ userProfile, loading }) => {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<string>('all');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [showAddEquipe, setShowAddEquipe] = useState(false);
  const [showAddPaciente, setShowAddPaciente] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  const isAdmin = userProfile?.role === 'admin';
  const userEquipeId = userProfile?.equipeId;

  const handleSeed = async () => {
    if (!isAdmin) return;
    setIsMigrating(true);
    const result = await runInitialMigration();
    alert(result.message);
    setIsMigrating(false);
  };

  // Form states
  const [newEquipe, setNewEquipe] = useState({ nome: '', area: '', supervisor: '' });
  const [newPaciente, setNewPaciente] = useState({ 
    nome: '', 
    dataNascimento: '', 
    equipeId: userEquipeId || '', 
    categorias: [] as string[],
    cpf: '',
    visitaACS: false,
    consultaPuerperal: false
  });

  useEffect(() => {
    // Reset selected equipe if professional
    if (!isAdmin && userEquipeId) {
      setSelectedEquipe(userEquipeId);
      setNewPaciente(prev => ({ ...prev, equipeId: userEquipeId }));
    }
  }, [isAdmin, userEquipeId]);

  useEffect(() => {
    if (loading) return; // Wait for profile

    const equipesQuery = isAdmin 
      ? collection(db, 'equipes') 
      : query(collection(db, 'equipes'), where(documentId(), '==', userEquipeId || 'none'));

    const unsubEquipes = onSnapshot(equipesQuery, (snapshot) => {
      const allEquipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipe));
      setEquipes(allEquipes);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'equipes'));

    const pacientesQuery = isAdmin 
      ? collection(db, 'pacientes') 
      : query(collection(db, 'pacientes'), where('equipeId', '==', userEquipeId || 'none'));

    const unsubPacientes = onSnapshot(pacientesQuery, (snapshot) => {
      const allPacientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paciente));
      setPacientes(allPacientes);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pacientes'));

    return () => {
      unsubEquipes();
      unsubPacientes();
    };
  }, [isAdmin, userEquipeId, loading]);

  const handleAddEquipe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'equipes'), {
        ...newEquipe,
        createdAt: serverTimestamp()
      });
      setNewEquipe({ nome: '', area: '', supervisor: '' });
      setShowAddEquipe(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'equipes');
    }
  };

  const handleAddPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaciente.equipeId) return alert('Selecione uma equipe');
    try {
      await addDoc(collection(db, 'pacientes'), {
        ...newPaciente,
        createdAt: serverTimestamp()
      });
      setNewPaciente({ 
        nome: '', 
        dataNascimento: '', 
        equipeId: userEquipeId || '', 
        categorias: [], 
        cpf: '',
        visitaACS: false,
        consultaPuerperal: false
      });
      setShowAddPaciente(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pacientes');
    }
  };

  const handleDeletePaciente = async (id: string) => {
    if (!confirm('Deseja realmente excluir este paciente?')) return;
    try {
      await deleteDoc(doc(db, 'pacientes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pacientes/${id}`);
    }
  };

  const filteredPacientes = pacientes.filter(p => {
    const matchesEquipe = selectedEquipe === 'all' || p.equipeId === selectedEquipe;
    const matchesCategoria = selectedCategoria === 'all' || p.categorias.includes(selectedCategoria);
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.cpf && p.cpf.includes(searchTerm));
    return matchesEquipe && matchesCategoria && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
            <span>Brasil 360</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary font-semibold">Equipes e Pacientes</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">Gestão de Equipes PSF</h1>
          <p className="text-sm text-on-surface-variant mt-1">Monitoramento por equipes e cadastro individualizado</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {isAdmin && (
            <button 
              onClick={() => setShowAddEquipe(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-outline-variant/20 rounded-xl text-sm font-medium hover:bg-surface-container-low transition-colors w-full sm:w-auto"
            >
              <Users className="w-4 h-4" />
              Nova Equipe
            </button>
          )}
          <button 
            onClick={() => setShowAddPaciente(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Paciente
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              Filtros
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase block mb-2">Equipe</label>
                <select 
                  value={selectedEquipe}
                  onChange={(e) => setSelectedEquipe(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-surface-container border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {isAdmin && <option value="all">Todas as Equipes</option>}
                  {equipes.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase block mb-2">Categoria</label>
                <select 
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full bg-surface-container border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Todas as Categorias</option>
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-outline-variant/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-container border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary" 
                    placeholder="Nome ou CPF..." 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-container/10 p-6 rounded-3xl border border-primary/10">
            <h4 className="text-sm font-bold text-primary mb-2">Resumo da Rede</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-on-surface-variant">Total de Equipes</span>
                <span className="font-bold">{equipes.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-on-surface-variant">Total de Pacientes</span>
                <span className="font-bold">{pacientes.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="lg:col-span-3 space-y-4">
          {filteredPacientes.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-outline" />
              </div>
              <h3 className="font-bold text-lg">Nenhum paciente encontrado</h3>
              <p className="text-sm text-on-surface-variant max-w-xs mb-6">Tente ajustar os filtros ou cadastrar um novo paciente.</p>
              {isAdmin && (
                <button 
                  onClick={handleSeed}
                  disabled={isMigrating}
                  className="px-6 py-2 bg-secondary text-white rounded-xl text-sm font-bold shadow-lg shadow-secondary/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isMigrating ? 'Semeando...' : 'Semear Dados Iniciais'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPacientes.map(p => (
                <motion.div 
                  layout
                  key={p.id}
                  className="bg-white p-5 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserRound className="text-primary w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">{p.nome}</h4>
                        <p className="text-[10px] text-on-surface-variant font-medium">Equipe: {equipes.find(e => e.id === p.equipeId)?.nome || 'N/A'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeletePaciente(p.id)}
                      className="p-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {p.categorias.map(cat => (
                      <span key={cat} className="px-2 py-0.5 bg-surface-container-high rounded-full text-[9px] font-bold uppercase text-on-surface-variant">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-outline-variant/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] font-medium text-on-surface-variant">
                      <span>Nasc: {new Date(p.dataNascimento).toLocaleDateString()}</span>
                      {p.cpf && <span>CPF: {p.cpf}</span>}
                    </div>
                    {p.categorias.includes('Criança') && (
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={() => updateDoc(doc(db, 'pacientes', p.id), { visitaACS: !p.visitaACS })}
                          className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase transition-all ${p.visitaACS ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error hover:bg-error/20'}`}
                        >
                          ACS: {p.visitaACS ? 'OK' : 'PENDENTE'}
                        </button>
                        <button 
                          onClick={() => updateDoc(doc(db, 'pacientes', p.id), { consultaPuerperal: !p.consultaPuerperal })}
                          className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase transition-all ${p.consultaPuerperal ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error hover:bg-error/20'}`}
                        >
                          CONSULTA: {p.consultaPuerperal ? 'OK' : 'PENDENTE'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddEquipe && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddEquipe(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Nova Equipe PSF</h2>
              <form onSubmit={handleAddEquipe} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Nome da Equipe</label>
                  <input 
                    required
                    value={newEquipe.nome}
                    onChange={e => setNewEquipe({...newEquipe, nome: e.target.value})}
                    className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Equipe Azul"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Área de Abrangência</label>
                  <input 
                    required
                    value={newEquipe.area}
                    onChange={e => setNewEquipe({...newEquipe, area: e.target.value})}
                    className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Setor Norte"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Supervisor Responsável</label>
                  <input 
                    value={newEquipe.supervisor}
                    onChange={e => setNewEquipe({...newEquipe, supervisor: e.target.value})}
                    className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary"
                    placeholder="Nome do supervisor"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddEquipe(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    Salvar Equipe
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddPaciente && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddPaciente(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">Cadastrar Novo Paciente</h2>
              <form onSubmit={handleAddPaciente} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Nome Completo</label>
                    <input 
                      required
                      value={newPaciente.nome}
                      onChange={e => setNewPaciente({...newPaciente, nome: e.target.value})}
                      className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Data de Nascimento</label>
                    <input 
                      required
                      type="date"
                      value={newPaciente.dataNascimento}
                      onChange={e => setNewPaciente({...newPaciente, dataNascimento: e.target.value})}
                      className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">CPF (Opcional)</label>
                    <input 
                      value={newPaciente.cpf}
                      onChange={e => setNewPaciente({...newPaciente, cpf: e.target.value})}
                      className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Equipe de PSF</label>
                  <select 
                    required
                    value={newPaciente.equipeId}
                    onChange={e => setNewPaciente({...newPaciente, equipeId: e.target.value})}
                    disabled={!isAdmin}
                    className="w-full bg-surface-container border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {!isAdmin && userEquipeId ? null : <option value="">Selecione uma equipe...</option>}
                    {equipes.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">Categorias de Monitoramento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS.map(cat => (
                      <label key={cat} className="flex items-center gap-2 p-3 bg-surface-container rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
                        <input 
                          type="checkbox"
                          checked={newPaciente.categorias.includes(cat)}
                          onChange={(e) => {
                            const cats = e.target.checked 
                              ? [...newPaciente.categorias, cat]
                              : newPaciente.categorias.filter(c => c !== cat);
                            setNewPaciente({...newPaciente, categorias: cats});
                          }}
                          className="w-4 h-4 rounded border-none text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="button"
                    onClick={() => setShowAddPaciente(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    Finalizar Cadastro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
