import { useEffect, useState } from 'react';
import { ArrowLeft, Check, History, X } from 'lucide-react';
import { getProjectHistory, reviewProjectChange, type ProjectChangeItem, type ProjectHistory as HistoryData } from '../../api/projects';
import type { AuthUser } from '../common/AuthGate';
import { useAppDialog } from '../common/AppDialog';
import { WorkspaceHeader } from '../common/WorkspaceHeader';
import { useProjectStore } from '../../store/useProjectStore';

const itemLabels: Record<ProjectChangeItem['itemType'], string> = {
  project: 'Projeto',
  module: 'Módulo',
  feature: 'Funcionalidade',
  rule: 'Regra',
  calculation: 'Cálculo',
  input: 'Campo de entrada',
  output: 'Campo de saída',
  note: 'Anotação',
  connection: 'Conexão',
};

const actionLabels: Record<ProjectChangeItem['action'], string> = {
  CREATED: 'Criado',
  UPDATED: 'Alterado',
  DELETED: 'Excluído',
};

const statusLabels: Record<HistoryData['history'][number]['status'], string> = {
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function displayValue(value: unknown) {
  if (value === null) return '—';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function ChangeItems({ changes }: { changes: ProjectChangeItem[] }) {
  return (
    <div className="mt-4 space-y-3">
      {changes.map((change, index) => <details key={`${change.itemType}-${change.itemId}-${index}`} className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
          <span className="text-brand-600">{itemLabels[change.itemType]}</span> · {change.label} · {actionLabels[change.action]}
        </summary>
        <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
          <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Antes</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{displayValue(change.before)}</pre></div>
          <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Depois</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{displayValue(change.after)}</pre></div>
        </div>
      </details>)}
    </div>
  );
}

export function ProjectHistory({ projectId, user, onLogout, onBack }: {
  projectId: string; user: AuthUser; onLogout: () => void; onBack: () => void;
}) {
  const showDialog = useAppDialog();
  const loadFromRepository = useProjectStore(state => state.loadFromRepository);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProjectHistory(projectId).then(result => {
      if (active) setHistory(result);
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar o histórico.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [projectId, version]);

  const review = (action: 'approve' | 'reject') => {
    const pending = history?.pending;
    if (!pending) return;
    const approving = action === 'approve';
    showDialog({
      title: approving ? 'Aprovar mudanças' : 'Rejeitar mudanças',
      message: approving
        ? 'A proposta será publicada para todos os usuários. Deseja continuar?'
        : 'A proposta será rejeitada e descartada. Deseja continuar?',
      confirmLabel: approving ? 'Aprovar' : 'Rejeitar',
      onConfirm: () => {
        setBusy(true);
        setError(null);
        reviewProjectChange(pending.id, action).then(async () => {
          await loadFromRepository();
          setVersion(value => value + 1);
        }).catch(failure => {
          setError(failure instanceof Error ? failure.message : 'Não foi possível revisar a proposta.');
        }).finally(() => setBusy(false));
      },
    });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader user={user} onLogout={onLogout} />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Voltar aos projetos</button>
        <div className="mt-6 flex items-center gap-3">
          <History className="h-6 w-6 text-brand-600" />
          <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Auditoria do projeto</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Histórico de mudanças</h1></div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-700">{error}</p>}
        {loading ? <p role="status" className="mt-8 text-sm text-slate-500">Carregando histórico...</p> : history && (
          <>
            {history.pending && <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-amber-900">Proposta pendente</h2>
                  <p className="mt-1 text-xs text-amber-800">Criada por {history.pending.authorName}{history.pending.updatedByName !== history.pending.authorName ? ` · atualizada por ${history.pending.updatedByName}` : ''} · {displayDate(history.pending.updatedAt)}</p>
                </div>
                {history.canApprove && <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => review('reject')} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"><X className="h-4 w-4" /> Rejeitar</button>
                  <button type="button" disabled={busy} onClick={() => review('approve')} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="h-4 w-4" /> Aprovar</button>
                </div>}
              </div>
              <ChangeItems changes={history.pending.changes} />
            </section>}
            <section className="mt-8">
              <h2 className="text-sm font-bold text-slate-900">Revisões anteriores</h2>
              {!history.history.length ? <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Ainda não há mudanças revisadas.</p> : (
                <div className="mt-4 space-y-4">
                  {history.history.map(revision => <article key={revision.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{statusLabels[revision.status]} · {displayDate(revision.createdAt)}</h3>
                      <p className="text-xs text-slate-500">Por {revision.authorName}{revision.reviewerName ? ` · revisada por ${revision.reviewerName}` : ''}</p>
                    </div>
                    <ChangeItems changes={revision.changes} />
                  </article>)}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
