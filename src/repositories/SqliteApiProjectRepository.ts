import { IProjectRepository } from './IProjectRepository';
import { Project } from '../types';

/**
 * Implementação do repositório conectado à API SQLite local (/api/project).
 * O banco de dados SQLite real é armazenado no arquivo 'flowdoc.db' via node:sqlite.
 */
export class SqliteApiProjectRepository implements IProjectRepository {
  private endpoint = '/api/project';

  async getProject(id?: string): Promise<Project | null> {
    try {
      const url = id ? `${this.endpoint}?id=${encodeURIComponent(id)}` : this.endpoint;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Falha ao carregar do SQLite: ${res.statusText}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('[SqliteApiProjectRepository] Erro ao buscar projeto:', err);
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });

    if (!res.ok) {
      throw new Error(`Falha ao salvar no SQLite: ${res.statusText}`);
    }
  }

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${this.endpoint}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error(`Falha ao excluir do SQLite: ${res.statusText}`);
    }
  }
}
