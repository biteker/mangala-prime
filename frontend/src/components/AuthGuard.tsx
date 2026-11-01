import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from '../lib/router';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): ReactNode {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { route, navigate } = useRouter();

  useEffect(() => {
    if (!accessToken) {
      if (route !== '#/login' && route !== '#/register') {
        navigate('#/login');
      }
    } else {
      if (route === '#/login' || route === '#/register') {
        navigate('#/lobby');
      }
    }
  }, [accessToken, route, navigate]);

  return children;
}
