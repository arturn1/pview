import { IProjectRepository } from './IProjectRepository';
import { SqliteApiProjectRepository } from './SqliteApiProjectRepository';
import { LocalStorageProjectRepository } from './LocalStorageProjectRepository';

// Tipo de provedor de banco de dados
export type DatabaseProvider = 'sqlite' | 'localstorage';

/**
 * Fábrica de Repositórios: para trocar de SQLite para outro banco (Postgres, Supabase, LocalStorage),
 * basta alterar o provider padrão ou chamar createProjectRepository('outro_tipo').
 */
export function createProjectRepository(provider: DatabaseProvider = 'sqlite'): IProjectRepository {
  switch (provider) {
    case 'sqlite':
      return new SqliteApiProjectRepository();
    case 'localstorage':
      return new LocalStorageProjectRepository();
    default:
      return new SqliteApiProjectRepository();
  }
}

// Instância ativa do repositório utilizada em toda a aplicação
export const projectRepository = createProjectRepository('sqlite');
