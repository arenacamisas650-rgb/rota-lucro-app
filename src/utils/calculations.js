/**
 * RotaLucro - Engine de Cálculos Financeiros e Métricas Físicas
 */

// 1. CÁLCULO DE CONSUMO REAL E EFICIÊNCIA DE COMBUSTÍVEL
export const calculateFuelEfficiency = (fuelLogs, vehicleId) => {
  const vehicleLogs = fuelLogs
    .filter(log => log.vehicleId === vehicleId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (vehicleLogs.length < 2) return null; // Precisa de pelo menos 2 registros para calcular a diferença

  let totalKm = 0;
  let totalLiters = 0;

  for (let i = 1; i < vehicleLogs.length; i++) {
    const prev = vehicleLogs[i - 1];
    const curr = vehicleLogs[i];
    
    const kmDiff = (parseFloat(curr.odometer) || 0) - (parseFloat(prev.odometer) || 0);
    const liters = parseFloat(curr.liters) || 0;

    if (kmDiff > 0 && liters > 0) {
      totalKm += kmDiff;
      totalLiters += liters;
    }
  }

  return totalLiters > 0 ? (totalKm / totalLiters) : null;
};

// 2. COMPARATIVO DE COMBUSTÍVEL (ETANOL VS GASOLINA VS GNV)
// Regra tradicional: Etanol compensa se for < 70% do preço da gasolina
// GNV compensa quase sempre pelo rendimento de m³ (geralmente compensa se tiver kit instalado e rodar muito)
export const compareFuels = (gasPrice, ethanolPrice, gnvPrice, vehicle) => {
  const priceGas = parseFloat(gasPrice) || 0;
  const priceEth = parseFloat(ethanolPrice) || 0;
  const priceGnv = parseFloat(gnvPrice) || 0;

  const results = {
    best: 'Gasolina',
    ratio: 0,
    savingsPer100Km: 0,
    costPerKm: { Gasolina: 0, Etanol: 0, GNV: 0 }
  };

  // Consumos estimados por combustível
  const effGas = parseFloat(vehicle?.highwayConsumption || vehicle?.cityConsumption) || 10;
  const effEth = effGas * 0.7; // Regra padrão de consumo
  const effGnv = effGas * 1.3; // GNV rende mais km por m³ em média

  if (priceGas > 0) {
    results.costPerKm.Gasolina = priceGas / effGas;
  }
  if (priceEth > 0) {
    results.costPerKm.Etanol = priceEth / effEth;
  }
  if (priceGnv > 0) {
    results.costPerKm.GNV = priceGnv / effGnv;
  }

  // Compara custos reais por KM
  let minCost = Infinity;
  let bestFuel = 'Gasolina';

  Object.entries(results.costPerKm).forEach(([fuel, cost]) => {
    if (cost > 0 && cost < minCost) {
      minCost = cost;
      bestFuel = fuel;
    }
  });

  results.best = bestFuel;
  if (priceGas > 0 && priceEth > 0) {
    results.ratio = (priceEth / priceGas) * 100;
  }

  // Economia aproximada por 100 km rodados comparado com o pior
  let maxCost = 0;
  Object.values(results.costPerKm).forEach(cost => {
    if (cost > maxCost) maxCost = cost;
  });

  if (maxCost > 0 && minCost < Infinity) {
    results.savingsPer100Km = (maxCost - minCost) * 100;
  }

  return results;
};

// 3. SCORE DE SAÚDE FINANCEIRA DO VEÍCULO (0 A 100)
export const calculateVehicleHealthScore = (vehicle, runs, rides, fuelLogs, maintenanceLogs) => {
  if (!vehicle) return 50;

  const vehicleId = vehicle.id;
  const vRuns = runs.filter(r => r.vehicleId === vehicleId);
  const vRides = rides.filter(r => r.vehicleId === vehicleId);
  const vFuel = fuelLogs.filter(f => f.vehicleId === vehicleId);
  const vMaint = maintenanceLogs.filter(m => m.vehicleId === vehicleId);

  let score = 100;
  const reasons = [];

  // Fator 1: Margem de Lucro (Ganhos vs Gastos Totais)
  const totalGross = [...vRuns, ...vRides].reduce((acc, curr) => acc + (parseFloat(curr.grossEarning) || 0), 0);
  const totalExpense = [...vRuns, ...vRides].reduce((acc, curr) => acc + (parseFloat(curr.totalExpense) || 0), 0) +
                       vMaint.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0) +
                       vFuel.reduce((acc, curr) => acc + (parseFloat(curr.totalCost) || 0), 0);

  const margin = totalGross > 0 ? ((totalGross - totalExpense) / totalGross) : 1;

  if (margin < 0.2) {
    score -= 25;
    reasons.push('Margem de lucro líquido muito baixa (abaixo de 20%). Cuidado com despesas.');
  } else if (margin < 0.4) {
    score -= 10;
    reasons.push('Margem de lucro razoável. Tente diminuir o custo por quilômetro rodado.');
  }

  // Fator 2: Consumo Médio
  const computedEff = calculateFuelEfficiency(fuelLogs, vehicleId);
  const targetEff = parseFloat(vehicle.cityConsumption) || 10;

  if (computedEff && computedEff < targetEff * 0.85) {
    score -= 15;
    reasons.push(`O consumo real (${computedEff.toFixed(1)} km/l) está 15%+ abaixo do esperado (${targetEff.toFixed(1)} km/l).`);
  }

  // Fator 3: Desgaste de Manutenção
  // Verifica se há alguma manutenção próxima de expirar ou expirada
  const currentKm = parseFloat(vehicle.currentKm) || 0;
  let activeAlerts = 0;

  // Itens padrão de manutenção preditiva
  const itemsToCheck = [
    { type: 'oil', interval: 10000, label: 'Troca de Óleo' },
    { type: 'tires', interval: 40000, label: 'Pneus e Alinhamento' },
    { type: 'brakes', interval: 20000, label: 'Pastilhas de Freio' }
  ];

  itemsToCheck.forEach(item => {
    const log = vMaint.filter(m => m.type === item.type).sort((a, b) => b.lastChangedKm - a.lastChangedKm)[0];
    const lastKm = log ? parseInt(log.lastChangedKm) : 0;
    const interval = log ? parseInt(log.intervalKm) : item.interval;
    const diff = currentKm - lastKm;

    if (diff >= interval) {
      activeAlerts += 1;
      score -= 15;
    } else if (diff >= interval * 0.9) {
      score -= 5;
    }
  });

  if (activeAlerts > 0) {
    reasons.push(`Há ${activeAlerts} manutenções críticas expiradas que requerem atenção urgente.`);
  }

  // Assegura limites do score
  score = Math.max(0, Math.min(100, score));

  let status = 'Excelente';
  if (score < 40) status = 'Crítico';
  else if (score < 70) status = 'Regular';
  else if (score < 90) status = 'Bom';

  return {
    score,
    status,
    reasons: reasons.length > 0 ? reasons : ['Seu veículo está operando em excelente eficiência de custo!']
  };
};

// 4. PREVISÃO DE CONCLUSÃO DE METAS FINANCEIRAS
export const calculateGoalForecast = (goal, runs, rides) => {
  const target = parseFloat(goal.targetAmount) || 0;
  const current = parseFloat(goal.currentAmount) || 0;
  const remaining = Math.max(0, target - current);

  if (remaining === 0) return { days: 0, date: new Date().toISOString().split('T')[0] };

  // Calcula média de lucro diária do motorista nos últimos 30 dias
  const allRecords = [...runs, ...rides].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (allRecords.length === 0) return { days: null, date: null };

  // Filtra registros do último mês
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentRecords = allRecords.filter(r => new Date(r.date) >= thirtyDaysAgo);

  let totalNetProfit = 0;
  let totalDaysWorked = new Set();

  const recordsToUse = recentRecords.length > 0 ? recentRecords : allRecords.slice(0, 10);

  recordsToUse.forEach(r => {
    const net = parseFloat(r.netProfit || (parseFloat(r.grossEarning) - parseFloat(r.totalExpense || 0)));
    totalNetProfit += net;
    totalDaysWorked.add(r.date);
  });

  const activeDaysCount = totalDaysWorked.size || 1;
  // Média de lucro nos dias em que efetivamente trabalhou
  const avgProfitPerDay = Math.max(1, totalNetProfit / activeDaysCount);

  // Considera que ele guarda uma parcela desse lucro (e.g. 20% para a meta, ou baseia-se na reserva dele)
  const savingsRate = 0.25; // Motorista poupa em média 25% do lucro líquido para metas
  const savingPerDay = avgProfitPerDay * savingsRate;

  const daysNeeded = Math.ceil(remaining / savingPerDay);
  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + daysNeeded);

  return {
    days: daysNeeded,
    date: forecastDate.toISOString().split('T')[0]
  };
};

// 5. CÁLCULO DE IMPOSTO E LIMITE DO MEI (TRANSPORTE E ENTREGAS)
// Teto MEI no Brasil: R$ 81.000 anual (R$ 6.750 mensal proporcional)
// Isenção do IRPF para motorista de aplicativo: 32% do faturamento bruto é isento
export const calculateMEIStats = (runs, rides) => {
  const currentYear = new Date().getFullYear();
  const yearRecords = [...runs, ...rides].filter(r => {
    const recYear = new Date(r.date).getFullYear();
    return recYear === currentYear;
  });

  const totalGross = yearRecords.reduce((acc, curr) => acc + (parseFloat(curr.grossEarning) || 0), 0);
  const totalExpense = yearRecords.reduce((acc, curr) => acc + (parseFloat(curr.totalExpense) || 0), 0);
  const netProfit = totalGross - totalExpense;

  const tetoMEI = 81000;
  const pctUsed = (totalGross / tetoMEI) * 100;
  
  // Parcela Isenta do IRPF (32% para serviços de transporte de passageiros/cargas)
  const exemptPortion = totalGross * 0.32;
  // Rendimento Tributável (Lucro Líquido - Parcela Isenta)
  const taxablePortion = Math.max(0, netProfit - exemptPortion);

  // Projeção anual de faturamento bruto
  const monthsActive = new Set(yearRecords.map(r => r.date.substring(0, 7))).size || 1;
  const avgMonthlyGross = totalGross / monthsActive;
  const projectedGrossAnnual = avgMonthlyGross * 12;
  const willExceedTeto = projectedGrossAnnual > tetoMEI;

  return {
    totalGross,
    netProfit,
    exemptPortion,
    taxablePortion,
    pctUsed,
    limit: tetoMEI,
    projectedGrossAnnual,
    willExceedTeto,
    dasMonthlyCost: 78.20 // Custo aproximado do DAS-MEI (Comércio/Serviço) em 2026
  };
};
