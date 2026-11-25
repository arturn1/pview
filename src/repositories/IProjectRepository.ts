import { Project } from '../types';

/**
 * Interface de Repositório para Persistência do Projeto.
 * Permite trocar a fonte de dados (SQLite, LocalStorage, Supabase, PostgreSQL)
 * sem alterar nenhuma linha de código da UI ou dos componentes.
 */
export interface IProjectRepository {
  /**
   * Obtém o projeto persistido
   */
  getProject(id?: string): Promise<Project | null>;

  /**
   * Salva o projeto completo no banco
   */
  saveProject(project: Project): Promise<void>;

  /**
   * Remove o projeto do banco
   */
  deleteProject(id: string): Promise<void>;
}
