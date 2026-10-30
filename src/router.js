import { useEffect, useState } from 'react';

// Hash routing keeps the app a pure static bundle (works on GitHub Pages without rewrites).
export const ROUTES = ['', 'upload', 'suitability', 'profile', 'dashboard', 'simulator', 'risks', 'careers', 'report', 'how-it-works', 'data'];

function currentRoute() {
  const route = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES.includes(route) ? route : '';
}

export function navigate(route) {
  window.location.hash = `/${route}`;
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(currentRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
