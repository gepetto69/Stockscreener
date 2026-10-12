// Centralized API configuration with seamless Client-Side Autonomous Fallback
import axios from 'axios';
import { LocalEngine } from '../services/localEngine';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Handle API requests locally if remote server is unreachable, 403, 404, or 503
function handleLocally(method: string, urlPath: string, data?: any, params?: any): any {
  const cleanPath = urlPath.replace(/^(?:https?:\/\/[^/]+)?(?:\/api|\/?api)/, '').replace(/\?.*$/, '');

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
    const capital = Number(params?.capital || 10000);
    const currency = params?.currency || 'EUR';
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
      const portId = params?.portfolio_id ? Number(params.portfolio_id) : null;
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
    const portId = params?.portfolio_id ? Number(params.portfolio_id) : null;
    LocalEngine.resetPortfolio(portId);
    return { status: 'success', message: 'Portfolio reset' };
  }

  // 15. /portfolio/analyze
  if (cleanPath === '/portfolio/analyze' || cleanPath === 'portfolio/analyze') {
    const portId = params?.portfolio_id ? Number(params.portfolio_id) : null;
    return LocalEngine.analyzePortfolio(portId);
  }

  // 16. /portfolio
  if (cleanPath === '/portfolio' || cleanPath === 'portfolio') {
    const portId = params?.portfolio_id ? Number(params.portfolio_id) : null;
    return LocalEngine.getPortfolioPerformance(portId);
  }

  return null;
}

// Axios Response Interceptor for Fallback
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    const url = config.url || '';
    if (url.includes('/api/') || url.startsWith('/api') || url.includes('api')) {
      const method = config.method || 'get';
      const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data;
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
