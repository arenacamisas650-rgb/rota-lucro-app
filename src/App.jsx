import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { SupabaseService } from './services/supabase';
import Dashboard from './pages/Dashboard';
import AddRoute from './pages/AddRoute';
import Mobility from './pages/Mobility';
import Vehicle from './pages/Vehicle';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Card from './components/Card';
import Button from './components/Button';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const onboardingDone = useAppStore(state => state.onboardingDone);
  const setOnboardingDone = useAppStore(state => state.setOnboardingDone);
  const vehicles = useAppStore(state => state.vehicles);
  const activeVehicleId = useAppStore(state => state.activeVehicleId);
  const saveVehicle = useAppStore(state => state.saveVehicle);
  const addLog = useAppStore(state => state.addLog);

  // Zustand Sync Queue e Config
  const syncQueue = useAppStore(state => state.syncQueue);
  const syncSettings = useAppStore(state => state.syncSettings);
  const popSyncQueue = useAppStore(state => state.popSyncQueue);
  const incrementSyncRetry = useAppStore(state => state.incrementSyncRetry);

  // Estados do form de onboarding
  const [onbNickname, setOnbNickname] = useState('');
  const [onbBrand, setOnbBrand] = useState('');
  const [onbModel, setOnbModel] = useState('');
  const [onbYear, setOnbYear] = useState('');
  const [onbPlate, setOnbPlate] = useState('');
  const [onbKm, setOnbKm] = useState('');
  const [onbFuel, setOnbFuel] = useState('Etanol');
  const [onbCityConsumption, setOnbCityConsumption] = useState('');

  // 1. DAEMON DE SINCRONIZAÇÃO EM BACKGROUND (OFFLINE-FIRST)
  useEffect(() => {
    if (!syncSettings.enabled) return;

    const runSync = async () => {
      if (syncQueue.length === 0 || !navigator.onLine) return;
      
      addLog(`Processando fila de sincronização offline: ${syncQueue.length} itens pendentes.`);
      
      await SupabaseService.processQueue(
        syncQueue,
        syncSettings,
        // Sucesso: Remove da fila
        (timestamp) => {
          popSyncQueue(timestamp);
          addLog(`Item de sincronização processado e removido.`);
        },
        // Falha definitiva: Remove ou reporta
        (timestamp, err) => {
          popSyncQueue(timestamp);
          addLog(`Sincronização falhou permanentemente: ${err}`, 'error');
        },
        // Falha temporária: Incrementa retry para a próxima tentativa
        (timestamp) => {
          incrementSyncRetry(timestamp);
        }
      );
    };

    // Roda sync a cada 10 segundos
    const interval = setInterval(runSync, 10000);

    // Escuta evento de voltar a ter internet
    window.addEventListener('online', runSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', runSync);
    };
  }, [syncQueue, syncSettings, popSyncQueue, incrementSyncRetry, addLog]);

  // Se onboarding não estiver concluído e não houver veículos cadastrados, força cadastro inicial
  if (!onboardingDone || vehicles.length === 0) {
    const handleOnboardingSubmit = (e) => {
      e.preventDefault();
      if (!onbNickname || !onbBrand || !onbModel || !onbKm) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      const vehicle = {
        id: 'v_' + Date.now(),
        nickname: onbNickname,
        brand: onbBrand,
        model: onbModel,
        version: '',
        year: parseInt(onbYear) || new Date().getFullYear(),
        plate: onbPlate,
        currentKm: parseInt(onbKm) || 0,
        mainFuel: onbFuel,
        cityConsumption: parseFloat(onbCityConsumption) || 10,
        highwayConsumption: (parseFloat(onbCityConsumption) || 10) * 1.2,
        fixedCosts: {
          loan: 0,
          insurance: 0,
          ipva: 0,
          garage: 0,
          maintenanceAvg: 0,
          internet: 0,
          others: 0
        }
      };

      saveVehicle(vehicle);
      setOnboardingDone(true);
      addLog(`Onboarding finalizado com sucesso. Veículo ${onbNickname} ativo.`);
    };

    return (
      <div className="onboarding-screen" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19', padding: '20px' }}>
        <Card variant="glass" style={{ maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--blue)' }}>
            <i className="bx bx-rocket" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: '900', color: '#FFF' }}>RotaLucro Premium</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 20px 0' }}>
            Olá! Para começar a gerenciar sua lucratividade como profissional, configure seu veículo de trabalho principal.
          </p>

          <form onSubmit={handleOnboardingSubmit} className="custom-form" style={{ padding: 0, textAlign: 'left' }}>
            <div className="form-group">
              <label>Nome do Veículo</label>
              <input type="text" placeholder="Ex: Meu Uno de Trabalho" value={onbNickname} onChange={(e) => setOnbNickname(e.target.value)} required />
            </div>

            <div className="form-grid-two">
              <div className="form-group">
                <label>Marca</label>
                <input type="text" placeholder="Ex: Fiat" value={onbBrand} onChange={(e) => setOnbBrand(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Modelo</label>
                <input type="text" placeholder="Ex: Uno Way" value={onbModel} onChange={(e) => setOnbModel(e.target.value)} required />
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-group">
                <label>Ano</label>
                <input type="number" placeholder="2014" value={onbYear} onChange={(e) => setOnbYear(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>KM Odômetro</label>
                <input type="number" placeholder="125000" value={onbKm} onChange={(e) => setOnbKm(e.target.value)} required />
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-group">
                <label>Combustível</label>
                <select value={onbFuel} onChange={(e) => setOnbFuel(e.target.value)}>
                  <option value="Etanol">Etanol</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="GNV">GNV</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
              <div className="form-group">
                <label>Consumo km/l</label>
                <input type="number" step="0.1" placeholder="10.5" value={onbCityConsumption} onChange={(e) => setOnbCityConsumption(e.target.value)} required />
              </div>
            </div>

            <Button variant="primary" type="submit" style={{ width: '100%', marginTop: '16px' }} icon="bx-check-double">
              Pronto! Entrar no App
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // 2. RENDERIZADOR DE PÁGINAS SELECIONADAS (ABAS)
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'add-route': return <AddRoute />;
      case 'mobility': return <Mobility />;
      case 'vehicle': return <Vehicle />;
      case 'goals': return <Goals />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  return (
    <div className="app-container" style={{ background: '#0B0F19', minHeight: '100vh', color: '#FFF' }}>
      
      {/* HEADER PREMIUM */}
      <header className="app-header" style={{ padding: '16px 20px', background: '#111520', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontFamily: 'Outfit', fontWeight: '900', color: '#FFF' }}>
            RotaLucro <span style={{ color: 'var(--blue)', fontSize: '0.75rem', fontWeight: '600' }}>Pro</span>
          </h1>
          {activeVehicle && (
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <i className="bx bx-car"></i> Veículo: {activeVehicle.nickname} ({activeVehicle.plate || 'S/P'})
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {syncSettings.enabled && (
            <span
              className={`cloud-sync-status ${navigator.onLine ? 'online' : 'offline'}`}
              style={{
                fontSize: '0.65rem',
                backgroundColor: navigator.onLine ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: navigator.onLine ? 'var(--emerald)' : 'var(--red)',
                border: `1px solid ${navigator.onLine ? 'var(--emerald)' : 'var(--red)'}`,
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <i className="bx bx-cloud"></i> {navigator.onLine ? 'Nuvem OK' : 'Offline'}
            </span>
          )}
          <div className="driver-avatar-mini" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.85rem' }}>
            RL
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DA PÁGINA */}
      <main style={{ padding: '20px' }}>
        {renderActivePage()}
      </main>

      {/* NAVEGAÇÃO / DOCK DE ABAS INFERIOR MOBILE-FIRST */}
      <nav className="tabs-dock" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111520', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '8px 4px', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
        <button
          className={`tab-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ background: 'none', border: 'none', color: activeTab === 'dashboard' ? 'var(--blue)' : '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', gap: '3px', cursor: 'pointer' }}
        >
          <i className="bx bx-grid-alt" style={{ fontSize: '1.4rem' }}></i>
          Painel
        </button>
        
        <button
          className={`tab-link ${activeTab === 'mobility' ? 'active' : ''}`}
          onClick={() => setActiveTab('mobility')}
          style={{ background: 'none', border: 'none', color: activeTab === 'mobility' ? 'var(--purple)' : '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', gap: '3px', cursor: 'pointer' }}
        >
          <i className="bx bx-trip" style={{ fontSize: '1.4rem' }}></i>
          Corridas
        </button>

        <button
          className={`tab-link ${activeTab === 'add-route' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-route')}
          style={{ background: 'none', border: 'none', color: activeTab === 'add-route' ? 'var(--orange)' : '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', gap: '3px', cursor: 'pointer' }}
        >
          <i className="bx bx-package" style={{ fontSize: '1.4rem' }}></i>
          Entregas
        </button>

        <button
          className={`tab-link ${activeTab === 'vehicle' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicle')}
          style={{ background: 'none', border: 'none', color: activeTab === 'vehicle' ? 'var(--blue)' : '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', gap: '3px', cursor: 'pointer' }}
        >
          <i className="bx bx-car" style={{ fontSize: '1.4rem' }}></i>
          Carro
        </button>

        <button
          className={`tab-link ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
          style={{ background: 'none', border: 'none', color: activeTab === 'goals' ? 'var(--gold)' : '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', gap: '3px', cursor: 'pointer' }}
        >
          <i className="bx bx-target-lock" style={{ fontSize: '1.4rem' }}></i>
          Metas
        </button>

        <button
          className={`tab-link ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
          style={{ background: 'none', border: 'none', color: activeTab === 'reports' ? 'var(--blue)' : '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', gap: '3px', cursor: 'pointer' }}
        >
          <i className="bx bx-bar-chart-alt-2" style={{ fontSize: '1.4rem' }}></i>
          Relatórios
        </button>
      </nav>
    </div>
  );
}
export { App };
