import { useEffect, useState, type ReactNode } from 'react';
import { Layers } from 'lucide-react';

export type Role = 'ADM' | 'DIGITAL' | 'DEV' | 'USER';
export type AuthUser = { name: string; email: string; role: Role };
type AuthState = { status: 'authenticated'; user: AuthUser } | { status: 'redirecting'; action: 'login' | 'logout' } | { status: 'error' | 'logoutError'; message: string };
let initialization: Promise<AuthState> | undefined;

const callbackParams = new URLSearchParams(window.location.hash.slice(1));
const hasCallback = callbackParams.has('id_token') || callbackParams.has('error') || callbackParams.has('access_token');
if (hasCallback) window.history.replaceState(null, '', window.location.pathname + window.location.search);

async function startLogin(): Promise<AuthState> {
  const response = await fetch('/api/auth/login');
  if (!response.ok) throw new Error('Não foi possível iniciar a autenticação. Verifique a conexão com o provedor.');
  const result: { authorizationUrl?: string } = await response.json();
  if (!result.authorizationUrl) throw new Error('A resposta do provedor é inválida.');
  window.location.assign(result.authorizationUrl);
  return { status: 'redirecting', action: 'login' };
}

export async function initializeAuth(): Promise<AuthState> {
  if (hasCallback) {
    const error = callbackParams.has('error');
    const idToken = callbackParams.get('id_token');
    const accessToken = callbackParams.get('access_token');
    const state = callbackParams.get('state');
    callbackParams.delete('id_token');
    callbackParams.delete('access_token');
    if (error) throw new Error('O provedor de identidade recusou a autenticação.');
    if (!idToken || !accessToken || !state) throw new Error('O retorno de autenticação está incompleto.');
    const response = await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, accessToken, state }),
    });
    if (!response.ok) throw new Error('Não foi possível validar o retorno do provedor de identidade.');
  }
  const response = await fetch('/api/auth/session');
  if (response.status === 401) return startLogin();
  if (!response.ok) throw new Error('Não foi possível consultar a sessão.');
  const session: { authenticated?: boolean; name?: string; email?: string; role?: Role } = await response.json();
  if (!session.authenticated || !['ADM', 'DIGITAL', 'DEV', 'USER'].includes(session.role || '')) throw new Error('A resposta de autenticação é inválida.');
  return { status: 'authenticated', user: { name: session.name || '', email: session.email || '', role: session.role! } };
}

export async function endSession() {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  const result: { logoutUrl?: string; error?: string } = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível encerrar a sessão.');
  if (!result.logoutUrl) throw new Error('O provedor não retornou o endereço de saída.');
  initialization = undefined;
  window.location.assign(result.logoutUrl);
}

export function AuthGate({ children }: { children: (user: AuthUser, logout: () => void) => ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    let active = true;
    initialization ??= initializeAuth().catch((error: unknown) => ({
      status: 'error' as const,
      message: error instanceof Error ? error.message : 'Erro ao autenticar.',
    }));
    initialization.then(result => { if (active) setAuth(result); });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    setAuth({ status: 'redirecting', action: 'logout' });
    try {
      await endSession();
    } catch (error) {
      setAuth({ status: 'logoutError', message: error instanceof Error ? error.message : 'Erro ao sair.' });
    }
  };

  if (auth?.status === 'authenticated') {
    return <>{children(auth.user, logout)}</>;
  }
  return (
    <div className="flex h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
        <Layers className="mx-auto h-8 w-8 text-brand-600" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">FlowDoc</h1>
        {auth?.status === 'error' || auth?.status === 'logoutError' ? (
          <div>
            <p role="alert" className="mt-2 text-sm text-rose-700">
              {auth.message}
            </p>
            <button type="button" onClick={async () => {
              if (auth.status === 'logoutError') return logout();
              setAuth({ status: 'redirecting', action: 'login' });
              try {
                setAuth(await startLogin());
              } catch (error) {
                setAuth({ status: 'error', message: error instanceof Error ? error.message : 'Erro ao autenticar.' });
              }
            }} className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700">
              {auth.status === 'logoutError' ? 'Tentar sair novamente' : 'Tentar novamente'}
            </button>
          </div>
        ) : <p role="status" className="mt-2 text-sm text-slate-500">{auth?.status === 'redirecting' && auth.action === 'logout' ? 'Redirecionando para saída...' : 'Redirecionando para autenticação...'}</p>}
      </div>
    </div>
  );
}
