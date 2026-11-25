import { IProjectRepository } from './IProjectRepository';
import { Project } from '../types';

/**
 * Implementação alternativa de repositório em LocalStorage.
 * Demonstra a facilidade de troca de banco via interface IProjectRepository.
 */
export class LocalStorageProjectRepository implements IProjectRepository {
  private storageKey = 'flowdoc_project_data';

  async getProject(_id?: string): Promise<Project | null> {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as Project;
    } catch {
      return null;
    }
  }

  async saveProject(project: Project): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(project));
  }

  async deleteProject(_id: string): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }
}
