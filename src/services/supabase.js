/**
 * RotaLucro - Cliente de Sincronização Supabase (REST Nativo)
 * Funciona sem SDKs pesados, fazendo chamadas nativas HTTP e suportando offline-first de verdade.
 */

export const SupabaseService = {
  // Inicialização e verificação das chaves
  getClient(settings) {
    if (!settings || !settings.enabled || !settings.url || !settings.anonKey) {
      return null;
    }
    return {
      url: settings.url.replace(/\/$/, ''),
      anonKey: settings.anonKey
    };
  },

  // Cabeçalhos padrão para a API Rest do Supabase
  getHeaders(client) {
    return {
      'apikey': client.anonKey,
      'Authorization': `Bearer ${client.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };
  },

  // Sincroniza um único item da fila offline para o Supabase
  async syncItem(item, settings) {
    const client = this.getClient(settings);
    if (!client) return { success: false, error: 'Supabase não configurado ou inativo.' };

    const headers = this.getHeaders(client);
    let endpoint = '';
    let method = 'POST';
    let body = JSON.stringify(item.payload);

    // Mapeamento de ações para tabelas do Supabase
    switch (item.action) {
      case 'UPSERT_VEHICLE':
        endpoint = `${client.url}/rest/v1/vehicles`;
        // Restrutura dados locais de veículo para colunas relacionais
        const v = item.payload;
        body = JSON.stringify({
          id: v.id,
          model: `${v.brand} ${v.model}`,
          plate: v.plate || 'S/P',
          year: parseInt(v.year) || 2020,
          current_km: parseInt(v.currentKm) || 0,
          loan_cost: parseFloat(v.fixedCosts?.loan) || 0,
          insurance_cost: parseFloat(v.fixedCosts?.insurance) || 0,
          ipva_cost: parseFloat(v.fixedCosts?.ipva) || 0
        });
        break;

      case 'DELETE_VEHICLE':
        endpoint = `${client.url}/rest/v1/vehicles?id=eq.${item.payload.id}`;
        method = 'DELETE';
        body = null;
        break;

      case 'INSERT_RUN':
        endpoint = `${client.url}/rest/v1/runs`;
        const run = item.payload;
        body = JSON.stringify({
          id: run.id,
          platform: run.platform,
          gross_earning: parseFloat(run.grossEarning),
          packages: parseInt(run.pacotes || run.packages) || 0,
          km_rodados: parseFloat(run.kmRodados),
          fuel_type: run.combustivel || 'Etanol',
          fuel_price: parseFloat(run.precoCombustivel) || 0,
          efficiency: parseFloat(run.autonomia) || 10,
          tolls_cost: parseFloat(run.pedagio) || 0,
          food_cost: parseFloat(run.alimentacao) || 0,
          parking_cost: parseFloat(run.outrosCustos || run.parking_cost) || 0
        });
        break;

      case 'DELETE_RUN':
        endpoint = `${client.url}/rest/v1/runs?id=eq.${item.payload.id}`;
        method = 'DELETE';
        body = null;
        break;

      case 'INSERT_RIDE':
        // No Supabase relacional, runs e rides podem se unificar ou bater em tabelas separadas.
        // Seguiremos o mapeamento salvando corridas de passageiros também na tabela 'runs' com flag de tipo
        endpoint = `${client.url}/rest/v1/runs`;
        const ride = item.payload;
        body = JSON.stringify({
          id: ride.id,
          platform: ride.platform,
          gross_earning: parseFloat(ride.grossEarning),
          packages: 0,
          km_rodados: parseFloat(ride.kmRodados),
          fuel_type: 'Etanol',
          fuel_price: parseFloat(ride.combustivelPreco) || 0,
          efficiency: 10,
          tolls_cost: 0,
          food_cost: parseFloat(ride.alimentacao) || 0,
          parking_cost: parseFloat(ride.outrosCustos) || 0
        });
        break;

      case 'DELETE_RIDE':
        endpoint = `${client.url}/rest/v1/runs?id=eq.${item.payload.id}`;
        method = 'DELETE';
        body = null;
        break;

      case 'UPSERT_GOAL':
        endpoint = `${client.url}/rest/v1/goals`;
        const g = item.payload;
        body = JSON.stringify({
          id: g.id,
          name: g.name,
          target_amount: parseFloat(g.targetAmount),
          current_amount: parseFloat(g.currentAmount),
          deadline: g.deadline,
          category: g.category || 'geral'
        });
        break;

      case 'DELETE_GOAL':
        endpoint = `${client.url}/rest/v1/goals?id=eq.${item.payload.id}`;
        method = 'DELETE';
        body = null;
        break;

      default:
        // Caso a ação não esteja mapeada na nuvem ainda, ignore para não bloquear a fila
        return { success: true };
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Processa toda a fila de sincronização
  async processQueue(queue, settings, onSuccess, onFailure, onRetry) {
    if (queue.length === 0 || !navigator.onLine) return;

    for (const item of queue) {
      const result = await this.syncItem(item, settings);
      if (result.success) {
        onSuccess(item.timestamp);
      } else {
        if (item.retries >= 3) {
          // Após 3 tentativas de falha de conexão/API, remove da fila ou suspende para diagnosticar
          onFailure(item.timestamp, result.error);
        } else {
          onRetry(item.timestamp);
        }
        break; // Interrompe processamento de fila para tentar novamente mais tarde
      }
    }
  }
};
