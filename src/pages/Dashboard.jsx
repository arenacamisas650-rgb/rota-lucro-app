import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useGPS } from '../hooks/useGPS';
import { generateInsights } from '../services/aiInsights';
import { formatCurrency, formatDuration, formatDurationShort, formatKm } from '../utils/formatters';
import SVGChart from '../components/SVGChart';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';

export const Dashboard = () => {
  const activeShift = useAppStore(state => state.activeShift);
  const startShift = useAppStore(state => state.startShift);
  const pauseShift = useAppStore(state => state.pauseShift);
  const resumeShift = useAppStore(state => state.resumeShift);
  const stopShift = useAppStore(state => state.stopShift);
  const runs = useAppStore(state => state.runs);
  const rides = useAppStore(state => state.rides);
  const fuelLogs = useAppStore(state => state.fuelLogs);
  const maintenanceLogs = useAppStore(state => state.maintenanceLogs);
  const activeVehicle = useAppStore(state => state.vehicles.find(v => v.id === state.activeVehicleId));
  const activeVehicleId = useAppStore(state => state.activeVehicleId);

  const { currentPosition, accumulatedDistance, gpsError } = useGPS();

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [startKmInput, setStartKmInput] = useState('');
  const [endKmInput, setEndKmInput] = useState('');
  const [totalEarningsInput, setTotalEarningsInput] = useState('');
  const [shiftExpensesInput, setShiftExpensesInput] = useState('');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineRef = useRef(null);

  // IA Insights
  const insights = generateInsights(runs, rides, fuelLogs, maintenanceLogs, activeVehicle);
  const [currentInsightIdx, setCurrentInsightIdx] = useState(0);

  // Rotaciona os insights da IA a cada 10 segundos
  useEffect(() => {
    if (insights.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentInsightIdx(prev => (prev + 1) % insights.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [insights.length]);

  // Atualizador do Timer do Turno
  useEffect(() => {
    let timer;
    if (activeShift && activeShift.status === 'running') {
      const updateTimer = () => {
        const start = new Date(activeShift.startTime).getTime();
        const now = Date.now();
        const duration = (now - start) - (activeShift.totalPauseDurationMs || 0);
        setTimeElapsed(Math.max(0, duration));
      };
      updateTimer();
      timer = setInterval(updateTimer, 1000);
    } else if (activeShift && activeShift.status === 'paused') {
      const start = new Date(activeShift.startTime).getTime();
      const pauseInstant = new Date(activeShift.pauseTime).getTime();
      const duration = (pauseInstant - start) - (activeShift.totalPauseDurationMs || 0);
      setTimeElapsed(Math.max(0, duration));
    } else {
      setTimeElapsed(0);
    }
    return () => clearInterval(timer);
  }, [activeShift]);

  // Inicializador e atualizador do Mapa Leaflet
  useEffect(() => {
    if (!window.L || !mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Cria instância do mapa
      mapInstanceRef.current = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([-23.55052, -46.633308], 15); // Centro inicial SP

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Atualiza marcador de posição atual
    if (currentPosition) {
      const { lat, lng } = currentPosition;
      map.setView([lat, lng], map.getZoom());

      // Marcador do motorista
      if (window.driverMarker) {
        window.driverMarker.setLatLng([lat, lng]);
      } else {
        const driverIcon = window.L.divIcon({
          className: 'gps-driver-marker',
          html: `<div class="gps-pulse"></div><div class="gps-center-dot"></div>`,
          iconSize: [20, 20]
        });
        window.driverMarker = window.L.marker([lat, lng], { icon: driverIcon }).addTo(map);
      }
    }

    // Desenha traçado da rota
    const points = activeShift?.routePoints || [];
    const latLngs = points.map(p => [p.lat, p.lng]);

    // Simulação no Desktop: Se o turno está ativo e não tem pontos reais, desenha uma rota simulada bonita
    if (activeShift && latLngs.length === 0) {
      const simPoints = [
        [-23.55052, -46.633308],
        [-23.55152, -46.634308],
        [-23.55352, -46.632308],
        [-23.55252, -46.630308]
      ];
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(simPoints);
      } else {
        routePolylineRef.current = window.L.polyline(simPoints, {
          color: 'var(--purple)',
          weight: 4,
          opacity: 0.8
        }).addTo(map);
      }
      map.fitBounds(simPoints);
    } else if (latLngs.length > 0) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(latLngs);
      } else {
        routePolylineRef.current = window.L.polyline(latLngs, {
          color: 'var(--purple)',
          weight: 4,
          opacity: 0.8
        }).addTo(map);
      }
      map.fitBounds(latLngs);
    } else {
      // Remove rota se o turno terminou
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
    }
  }, [currentPosition, activeShift?.routePoints]);

  const handleStartShiftSubmit = (e) => {
    e.preventDefault();
    startShift(startKmInput);
    setShowStartModal(false);
  };

  const handleStopShiftSubmit = (e) => {
    e.preventDefault();
    stopShift(endKmInput, totalEarningsInput, shiftExpensesInput);
    setShowStopModal(false);
    
    // Autocompleta registros no app com base no resumo se preenchidos
    if (parseFloat(totalEarningsInput) > 0) {
      const parsedEarnings = parseFloat(totalEarningsInput);
      const parsedExpenses = parseFloat(shiftExpensesInput) || 0;
      const parsedKm = Math.max(0, (parseFloat(endKmInput) || 0) - (activeShift?.startKm || 0));

      const isRide = confirm('Deseja cadastrar esse faturamento como Corrida de App (Uber/99)? Cancelar criará como Entrega.');
      
      const payload = {
        date: new Date().toISOString().split('T')[0],
        grossEarning: parsedEarnings,
        kmRodados: parsedKm,
        platform: isRide ? 'Uber' : 'Shopee',
        tempoTrabalhado: timeElapsed / 3600000 // converte ms para horas
      };

      if (isRide) {
        useAppStore.getState().saveRide({
          ...payload,
          combustivelPreco: 5.69,
          outrosCustos: parsedExpenses
        });
      } else {
        useAppStore.getState().saveRun({
          ...payload,
          pacotes: 30,
          combustivel: 'Gasolina',
          precoCombustivel: 5.69,
          autonomia: 10,
          pedagio: 0,
          alimentacao: parsedExpenses
        });
      }
    }
  };

  // Estatísticas Rápidas do Mês Corrente
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const monthlyRuns = runs.filter(r => r.date.substring(0, 7) === currentMonthStr);
  const monthlyRides = rides.filter(r => r.date.substring(0, 7) === currentMonthStr);

  const grossEarningsMonth = [...monthlyRuns, ...monthlyRides].reduce((acc, r) => acc + (parseFloat(r.grossEarning) || 0), 0);
  const expensesMonth = [...monthlyRuns, ...monthlyRides].reduce((acc, r) => acc + (parseFloat(r.totalExpense) || 0), 0);
  const netProfitMonth = grossEarningsMonth - expensesMonth;

  // Eficiência Hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = [...runs, ...rides].filter(r => r.date === todayStr);
  const todayProfit = todayRecords.reduce((acc, r) => acc + (parseFloat(r.grossEarning) || 0) - (parseFloat(r.totalExpense) || 0), 0);

  // Eficiência Semana
  const getStartOfWeek = (d) => {
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };
  const startOfWeekStr = getStartOfWeek(new Date());
  const weeklyRecords = [...runs, ...rides].filter(r => r.date >= startOfWeekStr);
  const weeklyProfit = weeklyRecords.reduce((acc, r) => acc + (parseFloat(r.grossEarning) || 0) - (parseFloat(r.totalExpense) || 0), 0);

  const currentInsight = insights[currentInsightIdx] || insights[0];

  return (
    <section id="tab-dashboard" className="tab-content active" style={{ paddingBottom: '80px' }}>
      
      {/* 1. ASSISTENTE DE IA INTELIGENTE */}
      {currentInsight && (
        <div className={`smart-advisor-carousel ${currentInsight.type}-theme`} style={{ marginBottom: '16px' }}>
          <div className="advisor-slide">
            <i className={`bx ${currentInsight.icon} advisor-icon`}></i>
            <div className="advisor-text">
              <h4>{currentInsight.title}</h4>
              <p dangerouslySetInnerHTML={{ __html: currentInsight.message }}></p>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODO JORNADA / TURNO CONTROLLER */}
      <Card variant={activeShift ? 'glowing-purple' : 'glass'} style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-indicator ${activeShift ? 'online pulse' : 'offline'}`}></span>
            {activeShift ? 'Jornada em Andamento' : 'Jornada Fechada'}
          </h3>
          {activeShift && (
            <span style={{ fontSize: '1.25rem', fontFamily: 'Outfit', fontWeight: '700', color: '#FFF' }}>
              {formatDuration(timeElapsed)}
            </span>
          )}
        </div>

        {activeShift ? (
          <div>
            <div className="summary-mini-grid" style={{ marginBottom: '16px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="mini-card" style={{ padding: '8px' }}>
                <span className="mini-label" style={{ fontSize: '0.65rem' }}>KM Início</span>
                <span className="mini-value" style={{ fontSize: '0.9rem' }}>{activeShift.startKm} km</span>
              </div>
              <div className="mini-card" style={{ padding: '8px' }}>
                <span className="mini-label" style={{ fontSize: '0.65rem' }}>KM Rodados</span>
                <span className="mini-value text-emerald" style={{ fontSize: '0.9rem' }}>
                  {formatKm(accumulatedDistance)}
                </span>
              </div>
              <div className="mini-card" style={{ padding: '8px' }}>
                <span className="mini-label" style={{ fontSize: '0.65rem' }}>Velocidade</span>
                <span className="mini-value" style={{ fontSize: '0.9rem' }}>
                  {currentPosition?.speed ? `${Math.round(currentPosition.speed * 3.6)} km/h` : '0 km/h'}
                </span>
              </div>
            </div>

            {gpsError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', color: '#EF4444', fontSize: '0.75rem', marginBottom: '12px' }}>
                <i className="bx bx-error-circle" style={{ marginRight: '4px' }}></i> {gpsError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {activeShift.status === 'running' ? (
                <Button variant="glass" onClick={pauseShift} style={{ flex: 1 }} icon="bx-pause">Pausar</Button>
              ) : (
                <Button variant="primary" onClick={resumeShift} style={{ flex: 1 }} icon="bx-play">Retomar</Button>
              )}
              <Button
                variant="danger"
                onClick={() => {
                  setEndKmInput((parseFloat(activeShift.startKm) + parseFloat(accumulatedDistance)).toFixed(0));
                  setShowStopModal(true);
                }}
                style={{ flex: 1 }}
                icon="bx-stop"
              >
                Encerrar
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
              Inicie um turno para rastrear seu trajeto, tempo e faturamento dinamicamente.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                if (!activeVehicleId) {
                  alert('Por favor, cadastre um veículo nas configurações do Carro antes de iniciar o turno!');
                  return;
                }
                setStartKmInput(activeVehicle?.currentKm || '');
                setShowStartModal(true);
              }}
              style={{ width: '100%' }}
              icon="bx-play-circle"
            >
              Iniciar Novo Turno
            </Button>
          </div>
        )}
      </Card>

      {/* 3. MAPA DO TRAJETO ATIVO / SIMULADO */}
      <div
        className="glass-card"
        style={{
          height: '160px',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '16px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#111520' }}></div>
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            zIndex: 1000,
            background: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(4px)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.65rem',
            color: 'var(--text-muted)'
          }}
        >
          {activeShift ? 'GPS Rastreando Rota' : 'Mapa Offline RotaLucro'}
        </div>
      </div>

      {/* 4. METRICAS FINANCEIRAS */}
      <div className="summary-cards-container" style={{ marginBottom: '16px' }}>
        <div className="summary-card main-profit">
          <span className="card-label">Lucro Líquido Real (Mês)</span>
          <div className="card-value-row">
            <h2>{formatCurrency(netProfitMonth)}</h2>
            <span className={`percentage-badge ${netProfitMonth >= 0 ? 'up' : 'down'}`}>
              <i className={`bx ${netProfitMonth >= 0 ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt'}`}></i>
              {grossEarningsMonth > 0 ? `${((netProfitMonth / grossEarningsMonth) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="card-footer-info">
            <span>Faturado: <strong className="text-emerald">{formatCurrency(grossEarningsMonth)}</strong></span>
            <span>Gastos: <strong className="text-red">{formatCurrency(expensesMonth)}</strong></span>
          </div>
        </div>
        
        <div className="summary-mini-grid">
          <div className="mini-card">
            <span className="mini-label">Lucro Hoje</span>
            <span className={`mini-value ${todayProfit >= 0 ? 'text-emerald' : 'text-red'}`}>
              {formatCurrency(todayProfit)}
            </span>
          </div>
          <div className="mini-card">
            <span className="mini-label">Lucro Semana</span>
            <span className={`mini-value ${weeklyProfit >= 0 ? 'text-emerald' : 'text-red'}`}>
              {formatCurrency(weeklyProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. GRAFICO DE EVOLUÇÃO */}
      <h3 className="section-title" style={{ marginTop: '24px' }}>Evolução de 7 Dias</h3>
      <Card variant="glass" style={{ padding: '16px' }}>
        <SVGChart type="earnings" data={[...runs, ...rides]} />
      </Card>

      {/* MODAL: INICIAR TURNO */}
      <Modal isOpen={showStartModal} onClose={() => setShowStartModal(false)} title="Iniciar Jornada">
        <form onSubmit={handleStartShiftSubmit} className="custom-form" style={{ padding: '0 16px' }}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label htmlFor="start-km">Odômetro Inicial (KM)</label>
            <div className="input-icon-wrapper">
              <i className="bx bx-tachometer"></i>
              <input
                type="number"
                id="start-km"
                placeholder="Ex: 142000"
                value={startKmInput}
                onChange={(e) => setStartKmInput(e.target.value)}
                required
              />
            </div>
          </div>
          <Button variant="primary" type="submit" style={{ width: '100%' }}>Dar Partida <i className="bx bx-chevron-right"></i></Button>
        </form>
      </Modal>

      {/* MODAL: ENCERRAR TURNO */}
      <Modal isOpen={showStopModal} onClose={() => setShowStopModal(false)} title="Resumo do Turno">
        <form onSubmit={handleStopShiftSubmit} className="custom-form" style={{ padding: '0 16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tempo Total:</span>
              <strong style={{ color: '#FFF' }}>{formatDurationShort(timeElapsed)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Distância Percorrida:</span>
              <strong style={{ color: 'var(--emerald)' }}>{formatKm(accumulatedDistance)}</strong>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label htmlFor="stop-km">Odômetro Final (KM)</label>
            <div className="input-icon-wrapper">
              <i className="bx bx-tachometer"></i>
              <input
                type="number"
                id="stop-km"
                value={endKmInput}
                onChange={(e) => setEndKmInput(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-two">
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="shift-earnings">Ganhos do Turno (R$)</label>
              <div className="input-icon-wrapper prefix">
                <span className="currency-prefix">R$</span>
                <input
                  type="number"
                  id="shift-earnings"
                  placeholder="0.00"
                  step="0.01"
                  value={totalEarningsInput}
                  onChange={(e) => setTotalEarningsInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="shift-expenses">Despesas Extras (R$)</label>
              <div className="input-icon-wrapper prefix">
                <span className="currency-prefix">R$</span>
                <input
                  type="number"
                  id="shift-expenses"
                  placeholder="0.00"
                  step="0.01"
                  value={shiftExpensesInput}
                  onChange={(e) => setShiftExpensesInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button variant="danger" type="submit" style={{ width: '100%', marginTop: '8px' }}>Finalizar e Salvar</Button>
        </form>
      </Modal>

    </section>
  );
};
export default Dashboard;
