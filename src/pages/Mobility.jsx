import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Button from '../components/Button';
import Card from '../components/Card';

export const Mobility = () => {
  const saveRide = useAppStore(state => state.saveRide);
  const activeVehicle = useAppStore(state => state.vehicles.find(v => v.id === state.activeVehicleId));

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('Uber');
  const [grossEarning, setGrossEarning] = useState('');
  const [kmRodados, setKmRodados] = useState('');
  const [tempoTrabalhado, setTempoTrabalhado] = useState(''); // horas
  const [combustivelPreco, setCombustivelPreco] = useState('5.69');
  const [autonomia, setAutonomia] = useState('10.0');
  const [alimentacao, setAlimentacao] = useState('');
  const [outrosCustos, setOutrosCustos] = useState('');

  // Projeções
  const [fuelCost, setFuelCost] = useState(0);
  const [profitPerHour, setProfitPerHour] = useState(0);
  const [profitPerKm, setProfitPerKm] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [margin, setMargin] = useState(0);

  // Sincroniza autonomia e combustível com veículo ativo
  useEffect(() => {
    if (activeVehicle) {
      setAutonomia(String(activeVehicle.cityConsumption || '10.0'));
    }
  }, [activeVehicle]);

  // Recalcula projeções em tempo real
  useEffect(() => {
    const earning = parseFloat(grossEarning) || 0;
    const km = parseFloat(kmRodados) || 0;
    const hours = parseFloat(tempoTrabalhado) || 1;
    const price = parseFloat(combustivelPreco) || 0;
    const eff = parseFloat(autonomia) || 1;
    const food = parseFloat(alimentacao) || 0;
    const others = parseFloat(outrosCustos) || 0;

    const fuel = (km / eff) * price;
    const expense = fuel + food + others;
    const profit = earning - expense;
    
    setFuelCost(fuel);
    setNetProfit(profit);
    setProfitPerHour(hours > 0 ? profit / hours : 0);
    setProfitPerKm(km > 0 ? profit / km : 0);
    setMargin(earning > 0 ? (profit / earning) * 100 : 0);
  }, [grossEarning, kmRodados, tempoTrabalhado, combustivelPreco, autonomia, alimentacao, outrosCustos]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!grossEarning || !kmRodados || !tempoTrabalhado) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const newRide = {
      date,
      platform,
      grossEarning: parseFloat(grossEarning),
      kmRodados: parseFloat(kmRodados),
      tempoTrabalhado: parseFloat(tempoTrabalhado),
      combustivelPreco: parseFloat(combustivelPreco),
      alimentacao: parseFloat(alimentacao) || 0,
      outrosCustos: parseFloat(outrosCustos) || 0,
      fuelCost,
      totalExpense: fuelCost + (parseFloat(alimentacao) || 0) + (parseFloat(outrosCustos) || 0),
      netProfit
    };

    saveRide(newRide);
    alert('Corrida cadastrada com sucesso!');
    
    // Reseta form
    setGrossEarning('');
    setKmRodados('');
    setTempoTrabalhado('');
    setAlimentacao('');
    setOutrosCustos('');
  };

  return (
    <section id="tab-mobility" className="tab-content active" style={{ paddingBottom: '80px' }}>
      <div className="form-header-banner mobility-banner">
        <h3><i class="bx bx-car"></i> Apps de Corrida</h3>
        <p>Registre ganhos com Uber, 99, InDrive e outros apps de mobilidade.</p>
      </div>

      <form onSubmit={handleSubmit} className="custom-form">
        <div className="form-group">
          <label htmlFor="ride-date">Data</label>
          <div className="input-icon-wrapper">
            <i className="bx bx-calendar"></i>
            <input
              type="date"
              id="ride-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="ride-platform">Plataforma</label>
            <select
              id="ride-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="Uber">Uber</option>
              <option value="99">99</option>
              <option value="InDrive">InDrive</option>
              <option value="Outra">Outra</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ride-earning">Faturamento Bruto (R$)</label>
            <div className="input-icon-wrapper prefix">
              <span className="currency-prefix">R$</span>
              <input
                type="number"
                id="ride-earning"
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
            <label htmlFor="ride-km">Km Rodados</label>
            <div className="input-icon-wrapper">
              <i className="bx bx-navigation"></i>
              <input
                type="number"
                id="ride-km"
                placeholder="Ex: 120 km"
                step="0.1"
                value={kmRodados}
                onChange={(e) => setKmRodados(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ride-hours">Horas Online (Turno)</label>
            <div className="input-icon-wrapper">
              <i className="bx bx-time"></i>
              <input
                type="number"
                id="ride-hours"
                placeholder="Ex: 6.5"
                step="0.1"
                value={tempoTrabalhado}
                onChange={(e) => setTempoTrabalhado(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <h4 className="form-subtitle">Combustível & Eficiência</h4>
        <div className="form-grid-two">
          <div className="form-group">
            <label>Preço Combustível (R$/L)</label>
            <input
              type="number"
              step="0.01"
              value={combustivelPreco}
              onChange={(e) => setCombustivelPreco(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Consumo Médio (km/L)</label>
            <input
              type="number"
              step="0.1"
              value={autonomia}
              onChange={(e) => setAutonomia(e.target.value)}
            />
          </div>
        </div>

        <h4 className="form-subtitle">Outras Despesas</h4>
        <div className="form-grid-two" style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label>Alimentação (R$)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={alimentacao}
              onChange={(e) => setAlimentacao(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Estacionamento / Outros (R$)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={outrosCustos}
              onChange={(e) => setOutrosCustos(e.target.value)}
            />
          </div>
        </div>

        {/* Card de Cálculo em Tempo Real */}
        <Card variant="glass" style={{ borderLeft: '4px solid var(--purple)', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#FFF', marginBottom: '12px' }}>Indicadores da Corrida</h4>
          
          <div className="summary-mini-grid" style={{ marginBottom: '12px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="mini-card" style={{ padding: '6px' }}>
              <span className="mini-label" style={{ fontSize: '0.65rem' }}>Lucro/Hora</span>
              <span className="mini-value text-emerald" style={{ fontSize: '0.9rem' }}>R$ {profitPerHour.toFixed(2)}</span>
            </div>
            <div className="mini-card" style={{ padding: '6px' }}>
              <span className="mini-label" style={{ fontSize: '0.65rem' }}>Lucro/Km</span>
              <span className="mini-value text-emerald" style={{ fontSize: '0.9rem' }}>R$ {profitPerKm.toFixed(2)}</span>
            </div>
            <div className="mini-card" style={{ padding: '6px' }}>
              <span className="mini-label" style={{ fontSize: '0.65rem' }}>Combustível</span>
              <span className="mini-value text-red" style={{ fontSize: '0.9rem' }}>R$ {fuelCost.toFixed(0)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontSize: '0.9rem' }}>
            <span style={{ color: '#FFF', fontWeight: '600' }}>Lucro Líquido Real ({Math.round(margin)}%):</span>
            <strong style={{ color: netProfit >= 0 ? 'var(--emerald)' : 'var(--red)' }}>R$ {netProfit.toFixed(2)}</strong>
          </div>
        </Card>

        <Button variant="primary" type="submit" style={{ width: '100%' }}>Salvar Corrida</Button>
      </form>
    </section>
  );
};
export default Mobility;
