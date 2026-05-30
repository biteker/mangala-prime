import { useState, useEffect } from 'react';

export type RouteType = '#/login' | '#/register' | '#/lobby' | '#/game';

export function useRouter() {
  const getHash = (): RouteType => {
    const hash = window.location.hash;
    if (hash === '#/register' || hash === '#/lobby' || hash === '#/game') {
      return hash as RouteType;
    }
    return '#/login';
  };

  const [route, setRoute] = useState<RouteType>(getHash());

  useEffect(() => {
    const handleHashChange = (): void => {
      setRoute(getHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = (path: RouteType): void => {
    window.location.hash = path;
  };

  return { route, navigate };
}
