// Centralized API configuration with seamless Client-Side Autonomous Fallback
import axios from 'axios';
import { LocalEngine } from '../services/localEngine';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Set default short timeout (1500ms) on all axios requests so if Hostinger / backend proxy hangs,
// the request aborts quickly and triggers the instantaneous LocalEngine fallback
axios.defaults.timeout = 1500;

// Export local handler for immediate local execution if needed
export { handleLocally };

// Handle API requests locally if remote server is unreachable, 403, 404, or 503
function handleLocally(method: string, urlPath: string, data?: any, params?: any): any {
  // Extract query parameters from urlPath if any
  const effectiveParams: any = { ...params };
  if (urlPath && urlPath.includes('?')) {
    try {
      const queryString = urlPath.split('?')[1];
      const searchParams = new URLSearchParams(queryString);
      searchParams.forEach((val, key) => {
        if (effectiveParams[key] === undefined) {
          effectiveParams[key] = val;
        }
      });
    } catch {
      // ignore
    }
  }

  const cleanPath = urlPath.replace(/^(?:https?:\/\/[^/]+)?(?:\/api|\/?api)/, '').replace(/\?.*$/, '');

  // 0. Auth endpoints
  if (cleanPath === '/auth/register' || cleanPath === 'auth/register') {
    const { name, email, password } = data || {};
    return LocalEngine.registerUser(name, email, password);
  }

  if (cleanPath === '/auth/login' || cleanPath === 'auth/login') {
    const { email, password } = data || {};
    return LocalEngine.loginUser(email, password);
  }

  if (cleanPath === '/auth/me' || cleanPath === 'auth/me') {
    const currentUser = LocalEngine.getCurrentUser();
    if (currentUser) {
      return { status: 'success', user: currentUser };
    }
    return { status: 'error', message: 'Non connecté' };
  }

  if (cleanPath === '/auth/logout' || cleanPath === 'auth/logout') {
    LocalEngine.logoutUser();
    return { status: 'success', message: 'Déconnecté avec succès' };
  }

  // 1. /sectors
  if (cleanPath === '/sectors' || cleanPath === 'sectors') {
    return LocalEngine.getSectors();
  }

  // 2. /screen
  if (cleanPath === '/screen' || cleanPath === 'screen') {
    return LocalEngine.screenCompanies(data || {});
  }

  // 3. /export-csv
  if (cleanPath === '/export-csv' || cleanPath === 'export-csv') {
    const res = LocalEngine.screenCompanies(data || {});
    return res.items;
  }

  // 4. /pipeline/refresh
  if (cleanPath === '/pipeline/refresh' || cleanPath === 'pipeline/refresh') {
    return { status: 'success', message: 'Calculs locaux à jour', companies_updated: 24 };
  }

  // 5. /companies/:symbol/copilot/abigail
  const abigailMatch = cleanPath.match(/\/companies\/([^/]+)\/copilot\/abigail/);
  if (abigailMatch) {
    const sym = abigailMatch[1].toUpperCase();
    const comp = LocalEngine.getCompanyDetail(sym);
    if (comp) return LocalEngine.getAbigailAnalysis(comp as any);
  }

  // 6. /companies/:symbol/copilot/warren
  const warrenMatch = cleanPath.match(/\/companies\/([^/]+)\/copilot\/warren/);
  if (warrenMatch) {
    const sym = warrenMatch[1].toUpperCase();
    const comp = LocalEngine.getCompanyDetail(sym);
    if (comp) return LocalEngine.getWarrenAnalysis(comp as any);
  }

  // 7. /companies/:symbol/copilot/einstein
  const einsteinMatch = cleanPath.match(/\/companies\/([^/]+)\/copilot\/einstein/);
  if (einsteinMatch) {
    const sym = einsteinMatch[1].toUpperCase();
    const comp = LocalEngine.getCompanyDetail(sym);
    if (comp) return LocalEngine.getEinsteinRanking(comp as any);
  }

  // 8. /companies/:symbol/news
  const newsMatch = cleanPath.match(/\/companies\/([^/]+)\/news/);
  if (newsMatch) {
    const sym = newsMatch[1].toUpperCase();
    const comp = LocalEngine.getCompanyDetail(sym);
    return LocalEngine.getCompanyNews(sym, comp ? comp.name : sym);
  }

  // 9. /companies/:symbol
  const compMatch = cleanPath.match(/\/companies\/([^/]+)/);
  if (compMatch) {
    const sym = compMatch[1].toUpperCase();
    return LocalEngine.getCompanyDetail(sym);
  }

  // 10. /portfolio/strategies
  if (cleanPath === '/portfolio/strategies' || cleanPath.startsWith('/portfolio/strategies')) {
    const capital = Number(effectiveParams?.capital || 10000);
    const currency = effectiveParams?.currency || 'EUR';
    return LocalEngine.getAllStrategies(capital, currency);
  }

  // 11. /portfolio/list
  if (cleanPath === '/portfolio/list' || cleanPath === 'portfolio/list') {
    return LocalEngine.listPortfolios();
  }

  // 12. /portfolio/setup
  if (cleanPath === '/portfolio/setup' || cleanPath === 'portfolio/setup') {
    const p = LocalEngine.createOrSetupPortfolio(data || {});
    return LocalEngine.getPortfolioPerformance(p.id);
  }

  // 13. /portfolio/positions
  if (cleanPath === '/portfolio/positions' || cleanPath === 'portfolio/positions') {
    if (method.toUpperCase() === 'POST') {
      const portId = effectiveParams?.portfolio_id ? Number(effectiveParams.portfolio_id) : LocalEngine.getActivePortfolioId();
      return LocalEngine.addOrUpdatePosition(data || {}, portId);
    }
  }

  const delPosMatch = cleanPath.match(/\/portfolio\/positions\/(\d+)/);
  if (delPosMatch && method.toUpperCase() === 'DELETE') {
    const posId = Number(delPosMatch[1]);
    LocalEngine.removePosition(posId);
    return { status: 'success', message: `Position ${posId} deleted` };
  }

  // 14. /portfolio/reset
  if (cleanPath === '/portfolio/reset' || cleanPath === 'portfolio/reset') {
    const portId = effectiveParams?.portfolio_id ? Number(effectiveParams.portfolio_id) : LocalEngine.getActivePortfolioId();
    LocalEngine.resetPortfolio(portId);
    return { status: 'success', message: 'Portfolio reset' };
  }

  // 15. /portfolio/analyze
  if (cleanPath === '/portfolio/analyze' || cleanPath === 'portfolio/analyze') {
    const portId = effectiveParams?.portfolio_id ? Number(effectiveParams.portfolio_id) : LocalEngine.getActivePortfolioId();
    return LocalEngine.analyzePortfolio(portId);
  }

  // 16. /portfolio
  if (cleanPath === '/portfolio' || cleanPath === 'portfolio') {
    const portId = effectiveParams?.portfolio_id ? Number(effectiveParams.portfolio_id) : LocalEngine.getActivePortfolioId();
    return LocalEngine.getPortfolioPerformance(portId);
  }

  return null;
}

// Axios Request Interceptor:
// Attach Authorization Bearer token from localStorage if available
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('stockscreener_auth_token_v1');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

// Axios Response Interceptor for Fallback
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const url = config.url || '';
    if (url.includes('/api/') || url.startsWith('/api') || url.includes('api')) {
      const method = config.method || 'get';
      let body: any = config.data;
      if (typeof config.data === 'string') {
        try {
          body = JSON.parse(config.data);
        } catch {
          body = config.data;
        }
      }
      const params = config.params;

      const fallbackData = handleLocally(method, url, body, params);
      if (fallbackData !== null && fallbackData !== undefined) {
        return Promise.resolve({
          data: fallbackData,
          status: 200,
          statusText: 'OK (Local Fallback)',
          headers: {},
          config
        });
      }
    }
    return Promise.reject(error);
  }
);
