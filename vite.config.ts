import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Plugin do Vite que fornece a API SQLite (/api/project) utilizando o node:sqlite nativo.
 * O banco de dados é salvo no arquivo local 'flowdoc.db'.
 */
function sqliteApiPlugin(): Plugin {
  return {
    name: 'sqlite-api-plugin',
    configureServer(server) {
      const dbPath = path.resolve(__dirname, 'flowdoc.db');
      const db = new DatabaseSync(dbPath);

      // Cria a tabela de projetos se não existir
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost');
        if (!url.pathname.startsWith('/api/project')) {
          return next();
        }

        // GET /api/project
        if (req.method === 'GET') {
          const id = url.searchParams.get('id') || 'proj_gestor_projetos';
          const stmt = db.prepare('SELECT data FROM projects WHERE id = ?');
          const row = stmt.get(id) as { data: string } | undefined;

          if (row) {
            res.setHeader('Content-Type', 'application/json');
            res.end(row.data);
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Projeto ainda não salvo no SQLite' }));
          }
          return;
        }

        // POST /api/project
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const project = JSON.parse(body);
              const stmt = db.prepare(`
                INSERT INTO projects (id, data, updated_at) 
                VALUES (?, ?, ?) 
                ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
              `);
              stmt.run(project.id, JSON.stringify(project), new Date().toISOString());

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, savedAt: new Date().toISOString() }));
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: msg }));
            }
          });
          return;
        }

        // DELETE /api/project
        if (req.method === 'DELETE') {
          const id = url.searchParams.get('id') || 'proj_gestor_projetos';
          const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
          stmt.run(id);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, deleted: id }));
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), sqliteApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
