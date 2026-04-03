import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const SEED_EQUIPES = [
  { nome: "Equipe Azul - Centro", area: "Setor Central", supervisor: "Dr. Ricardo Silva" },
  { nome: "Equipe Verde - Norte", area: "Distrito Norte", supervisor: "Enf. Maria Santos" },
  { nome: "Equipe Amarela - Sul", area: "Vila Esperança", supervisor: "Dr. Carlos Oliveira" }
];

const SEED_PACIENTES = [
  { nome: "João da Silva", dataNascimento: "1955-05-12", categorias: ["Hipertenso", "Idoso"], cpf: "123.456.789-00" },
  { nome: "Maria Oliveira", dataNascimento: "1960-10-20", categorias: ["Diabético", "Hipertenso"], cpf: "234.567.890-11" },
  { nome: "Pedro Santos", dataNascimento: "2020-03-15", categorias: ["Criança"], cpf: "345.678.901-22" },
  { nome: "Ana Costa", dataNascimento: "1995-08-05", categorias: ["Gestante"], cpf: "456.789.012-33" },
  { nome: "Julia Lima", dataNascimento: "1998-12-12", categorias: ["Puérpera"], cpf: "567.890.123-44" },
  { nome: "José Pereira", dataNascimento: "1948-02-28", categorias: ["Idoso", "Diabético"], cpf: "678.901.234-55" }
];

export const runInitialMigration = async () => {
  try {
    // Check if we already have teams
    const equipesSnap = await getDocs(query(collection(db, 'equipes'), limit(1)));
    if (!equipesSnap.empty) {
      console.log("Database already has data. Skipping migration.");
      return { success: false, message: "O banco de dados já possui dados." };
    }

    console.log("Starting migration...");
    const createdEquipeIds: string[] = [];

    // 1. Create Equipes
    for (const eq of SEED_EQUIPES) {
      const docRef = await addDoc(collection(db, 'equipes'), {
        ...eq,
        createdAt: serverTimestamp()
      });
      createdEquipeIds.push(docRef.id);
    }

    // 2. Create Pacientes linked to random teams
    for (const pac of SEED_PACIENTES) {
      const randomEquipeId = createdEquipeIds[Math.floor(Math.random() * createdEquipeIds.length)];
      await addDoc(collection(db, 'pacientes'), {
        ...pac,
        equipeId: randomEquipeId,
        createdAt: serverTimestamp()
      });
    }

    console.log("Migration completed successfully!");
    return { success: true, message: "Migração concluída com sucesso! Equipes e pacientes iniciais criados." };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'migration');
    return { success: false, message: "Erro ao executar migração." };
  }
};
