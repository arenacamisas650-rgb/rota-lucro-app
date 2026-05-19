/**
 * RotaLucro local Diagnostics and Performance Monitor
 */
import { useAppStore } from '../store/useAppStore';

export const AnalyticsService = {
  // Registra um evento de erro
  logError(error, context = '') {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const logMsg = `[ERRO] ${context ? context + ': ' : ''}${errorMsg}`;
    
    // Insere na store Zustand
    useAppStore.getState().addLog(logMsg, 'error');
    console.error(logMsg, error);
  },

  // Registra um aviso ou auditoria
  logWarning(message) {
    useAppStore.getState().addLog(`[AVISO] ${message}`, 'warning');
    console.warn(message);
  },

  // Monitora e mede tempos de execução de operações críticas (e.g. renders ou Douglas-Peucker)
  measurePerformance(label, callback) {
    const start = performance.now();
    try {
      const result = callback();
      const end = performance.now();
      const duration = (end - start).toFixed(2);
      
      // Apenas loga no console de desenvolvimento e na store se demorar mais que 16ms (1 frame)
      if (duration > 16) {
        useAppStore.getState().addLog(`[PERF] ${label} demorou ${duration}ms`, 'info');
      }
      return result;
    } catch (err) {
      this.logError(err, `Performance: ${label}`);
      throw err;
    }
  }
};
