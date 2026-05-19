/**
 * RotaLucro AI Insights Engine
 * Analisa dados financeiros e gera recomendações estratégicas baseadas em regras de negócio.
 */

export const generateInsights = (runs, rides, fuelLogs, maintenanceLogs, activeVehicle) => {
  const insights = [];

  const allRecords = [...runs, ...rides].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (allRecords.length === 0) {
    return [
      {
        id: 'welcome',
        title: 'Bem-vindo ao RotaLucro AI',
        message: 'Comece a cadastrar suas corridas, entregas e custos de combustível para receber conselhos financeiros inteligentes em tempo real!',
        type: 'info',
        icon: 'bx-wink-smile'
      }
    ];
  }

  // 1. ANÁLISE DE PLATAFORMAS (LUCRO POR HORA E KM)
  const platformStats = {};

  allRecords.forEach(rec => {
    const plat = rec.platform || 'Outra';
    const gross = parseFloat(rec.grossEarning) || 0;
    const exp = parseFloat(rec.totalExpense) || 0;
    const net = gross - exp;
    const hours = parseFloat(rec.tempoTrabalhado || rec.tempoDecorrido) || 1; // em horas
    const km = parseFloat(rec.kmRodados) || 0;

    if (!platformStats[plat]) {
      platformStats[plat] = { totalNet: 0, totalHours: 0, totalKm: 0, count: 0 };
    }

    platformStats[plat].totalNet += net;
    platformStats[plat].totalHours += hours;
    platformStats[plat].totalKm += km;
    platformStats[plat].count += 1;
  });

  // Compara faturamento/hora entre as duas maiores plataformas
  const sortedByHourlyRate = Object.entries(platformStats)
    .map(([name, stat]) => ({
      name,
      hourlyRate: stat.totalHours > 0 ? (stat.totalNet / stat.totalHours) : 0,
      kmRate: stat.totalKm > 0 ? (stat.totalNet / stat.totalKm) : 0
    }))
    .filter(p => p.hourlyRate > 0)
    .sort((a, b) => b.hourlyRate - a.hourlyRate);

  if (sortedByHourlyRate.length >= 2) {
    const best = sortedByHourlyRate[0];
    const second = sortedByHourlyRate[sortedByHourlyRate.length - 1];
    const diffPct = (((best.hourlyRate - second.hourlyRate) / second.hourlyRate) * 100).toFixed(0);

    if (diffPct > 10) {
      insights.push({
        id: 'platform_comp',
        title: 'Otimização de Plataformas',
        message: `A plataforma **${best.name}** está rendendo **${diffPct}% mais lucro/hora** (R$ ${best.hourlyRate.toFixed(2)}/h) do que a **${second.name}** (R$ ${second.hourlyRate.toFixed(2)}/h). Priorize turnos nela!`,
        type: 'success',
        icon: 'bx-trending-up'
      });
    }
  }

  // 2. CUSTO OPERACIONAL EM ALERTA (> 35% do faturamento)
  const totalGross = allRecords.reduce((acc, r) => acc + (parseFloat(r.grossEarning) || 0), 0);
  const totalExpense = allRecords.reduce((acc, r) => acc + (parseFloat(r.totalExpense) || 0), 0);
  const costRatio = totalGross > 0 ? (totalExpense / totalGross) : 0;

  if (costRatio > 0.40) {
    insights.push({
      id: 'high_expenses',
      title: 'Custos Elevados',
      message: `Suas despesas consomem **${(costRatio * 100).toFixed(0)}% do seu faturamento bruto**. Tente economizar no combustível ou renegociar despesas fixas para aumentar sua margem.`,
      type: 'danger',
      icon: 'bx-error-alt'
    });
  } else if (costRatio < 0.25 && totalGross > 500) {
    insights.push({
      id: 'low_expenses',
      title: 'Excelente Eficiência',
      message: `Parabéns! Seu custo operacional está sob controle, consumindo apenas **${(costRatio * 100).toFixed(0)}% das suas receitas**. Mantenha esse ritmo!`,
      type: 'success',
      icon: 'bx-rocket'
    });
  }

  // 3. ANÁLISE DE COMBUSTÍVEL E CONSUMO
  if (fuelLogs.length >= 2 && activeVehicle) {
    const recentFuel = fuelLogs.filter(f => f.vehicleId === activeVehicle.id).slice(0, 5);
    if (recentFuel.length >= 2) {
      // Diferença de preço do combustível
      const newest = parseFloat(recentFuel[0].pricePerLiter) || 0;
      const oldest = parseFloat(recentFuel[recentFuel.length - 1].pricePerLiter) || 0;
      
      if (newest > oldest * 1.05) {
        const increase = (((newest - oldest) / oldest) * 100).toFixed(1);
        insights.push({
          id: 'fuel_price_hike',
          title: 'Aumento de Combustível',
          message: `O preço médio do litro subiu **${increase}%** nos seus últimos abastecimentos. Considere pesquisar postos alternativos.`,
          type: 'warning',
          icon: 'bx-gas-pump'
        });
      }
    }
  }

  // 4. ALERTAS DE MANUTENÇÃO PREVENTIVA
  if (activeVehicle) {
    const currentKm = parseFloat(activeVehicle.currentKm) || 0;
    const vMaint = maintenanceLogs.filter(m => m.vehicleId === activeVehicle.id);

    const checkList = [
      { type: 'oil', interval: 10000, name: 'Troca de Óleo' },
      { type: 'brakes', interval: 20000, name: 'Pastilhas de Freio' }
    ];

    let maintenanceUrgent = false;

    checkList.forEach(item => {
      const logs = vMaint.filter(m => m.type === item.type).sort((a, b) => b.lastChangedKm - a.lastChangedKm);
      const lastKm = logs.length > 0 ? parseInt(logs[0].lastChangedKm) : 0;
      const diff = currentKm - lastKm;

      if (diff >= item.interval && !maintenanceUrgent) {
        maintenanceUrgent = true;
        insights.push({
          id: `maint_urgent_${item.type}`,
          title: 'Manutenção Pendente',
          message: `O prazo de quilometragem recomendado para a **${item.name}** venceu há ${Math.round(diff - item.interval)} km. Faça a revisão do veículo!`,
          type: 'danger',
          icon: 'bx-wrench'
        });
      }
    });
  }

  // Fallback se não disparou insights complexos
  if (insights.length === 0) {
    insights.push({
      id: 'generic_good',
      title: 'Tudo Sob Controle',
      message: 'A IA do RotaLucro analisou seus registros e não encontrou anomalias de consumo ou despesas. Bom trabalho!',
      type: 'info',
      icon: 'bx-check-double'
    });
  }

  return insights;
};
