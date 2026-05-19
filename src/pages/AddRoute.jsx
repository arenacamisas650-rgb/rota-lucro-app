import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Button from '../components/Button';
import Card from '../components/Card';

export const AddRoute = () => {
  const saveRun = useAppStore(state => state.saveRun);
  const activeVehicle = useAppStore(state => state.vehicles.find(v => v.id === state.activeVehicleId));

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('Shopee');
  const [grossEarning, setGrossEarning] = useState('');
  const [packages, setPackages] = useState('');
  const [kmRodados, setKmRodados] = useState('');
  const [fuelType, setFuelType] = useState('Etanol');
  const [fuelPrice, setFuelPrice] = useState('3.79');
  const [efficiency, setEfficiency] = useState('9.5');
  const [tollsCost, setTollsCost] = useState('');
  const [foodCost, setFoodCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');

  // Estados de cálculo em tempo real
  const [fuelCostCalc, setFuelCostCalc] = useState(0);
  const [totalExpenseCalc, setTotalExpenseCalc] = useState(0);
  const [netProfitCalc, setNetProfitCalc] = useState(0);
  const [marginCalc, setMarginCalc] = useState(0);

  // Sincroniza autonomia e combustível conforme veículo ativo muda
  useEffect(() => {
    if (activeVehicle) {
      setFuelType(activeVehicle.mainFuel || 'Etanol');
      setEfficiency(String(activeVehicle.cityConsumption || '9.5'));
    }
  }, [activeVehicle]);

  // Recalcula projeções em tempo real
  useEffect(() => {
    const earning = parseFloat(grossEarning) || 0;
    const km = parseFloat(kmRodados) || 0;
    const price = parseFloat(fuelPrice) || 0;
    const eff = parseFloat(efficiency) || 1;
    const tolls = parseFloat(tollsCost) || 0;
    const food = parseFloat(foodCost) || 0;
    const parking = parseFloat(parkingCost) || 0;

    const fuel = (km / eff) * price;
    const expense = fuel + tolls + food + parking;
    const profit = earning - expense;
    const margin = earning > 0 ? (profit / earning) * 100 : 0;

    setFuelCostCalc(fuel);
    setTotalExpenseCalc(expense);
    setNetProfitCalc(profit);
    setMarginCalc(margin);
  }, [grossEarning, kmRodados, fuelPrice, efficiency, tollsCost, foodCost, parkingCost]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!grossEarning || !kmRodados) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const newRun = {
      date,
      platform,
      grossEarning: parseFloat(grossEarning),
      packages: parseInt(packages) || 0,
      kmRodados: parseFloat(kmRodados),
      fuelType,
      fuelPrice: parseFloat(fuelPrice),
      efficiency: parseFloat(efficiency),
      tollsCost: parseFloat(tollsCost) || 0,
      foodCost: parseFloat(foodCost) || 0,
      parkingCost: parseFloat(parkingCost) || 0,
      fuelCost: fuelCostCalc,
      totalExpense: totalExpenseCalc,
      netProfit: netProfitCalc
    };

    saveRun(newRun);
    alert('Rota de entrega cadastrada com sucesso!');
    
    // Reseta form mantendo configurações do veículo
    setGrossEarning('');
    setKmRodados('');
    setPackages('');
    setTollsCost('');
    setFoodCost('');
    setParkingCost('');
  };

  return (
    <section id="tab-add-route" className="tab-content active" style={{ paddingBottom: '80px' }}>
      <div className="form-header-banner">
        <h3><i class="bx bx-package"></i> Registrar Entregas</h3>
        <p>Preencha os dados da rota para calcular o seu lucro real líquido.</p>
      </div>

      <form onSubmit={handleSubmit} className="custom-form">
        <div className="form-group">
          <label htmlFor="route-date">Data da Saída</label>
          <div className="input-icon-wrapper">
            <i className="bx bx-calendar"></i>
            <input
              type="date"
              id="route-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="route-platform">Plataforma</label>
            <select
              id="route-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="Shopee">Shopee</option>
              <option value="Amazon Flex">Amazon Flex</option>
              <option value="Mercado Livre">Mercado Livre</option>
              <option value="Lalamove">Lalamove</option>
              <option value="Loggi">Loggi</option>
              <option value="Uber Flash">Uber Flash</option>
              <option value="Outra">Outra</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="route-earning">Faturamento Bruto (R$)</label>
            <div className="input-icon-wrapper prefix">
              <span className="currency-prefix">R$</span>
              <input
                type="number"
                id="route-earning"
                placeholder="0.00"
                step="0.01"
                value={grossEarning}
                onChange={(e) => setGrossEarning(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="route-packages">Pacotes Entregues</label>
            <div className="input-icon-wrapper">
              <i className="bx bx-box"></i>
              <input
                type="number"
                id="route-packages"
                placeholder="Ex: 45"
                value={packages}
                onChange={(e) => setPackages(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="route-km">Distância Rodada (KM)</label>
            <div className="input-icon-wrapper">
              <i className="bx bx-navigation"></i>
              <input
                type="number"
                id="route-km"
                placeholder="Ex: 85 km"
                step="0.1"
                value={kmRodados}
                onChange={(e) => setKmRodados(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <h4 className="form-subtitle">Configurações de Combustível</h4>
        <div className="form-grid-three">
          <div className="form-group">
            <label>Tipo</label>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Diesel">Diesel</option>
              <option value="GNV">GNV</option>
            </select>
          </div>
          <div className="form-group">
            <label>Preço Litro</label>
            <input
              type="number"
              step="0.001"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Consumo (km/l)</label>
            <input
              type="number"
              step="0.1"
              value={efficiency}
              onChange={(e) => setEfficiency(e.target.value)}
            />
          </div>
        </div>

        <h4 className="form-subtitle">Despesas Adicionais (Opcional)</h4>
        <div className="form-grid-three" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Pedágio</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tollsCost}
              onChange={(e) => setTollsCost(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Alimentação</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={foodCost}
              onChange={(e) => setFoodCost(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Estac. / Outros</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={parkingCost}
              onChange={(e) => setParkingCost(e.target.value)}
            />
          </div>
        </div>

        {/* Card de Cálculo em Tempo Real */}
        <Card variant="glass" style={{ borderLeft: '4px solid var(--emerald)', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFF', marginBottom: '12px' }}>Estimativa da Rota (Tempo Real)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Custo Combustível:</span>
              <strong style={{ color: 'var(--red)' }}>R$ {fuelCostCalc.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Margem Líquida:</span>
              <strong style={{ color: 'var(--blue)' }}>{Math.round(marginCalc)}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#FFF', fontWeight: '600' }}>Lucro Líquido Real:</span>
              <strong style={{ color: netProfitCalc >= 0 ? 'var(--emerald)' : 'var(--red)' }}>R$ {netProfitCalc.toFixed(2)}</strong>
            </div>
          </div>
        </Card>

        <Button variant="primary" type="submit" style={{ width: '100%' }}>Concluir e Salvar Rota</Button>
      </form>
    </section>
  );
};
export default AddRoute;
