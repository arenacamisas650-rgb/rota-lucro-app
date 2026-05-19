import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateFuelEfficiency, calculateVehicleHealthScore } from '../utils/calculations';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

export const Vehicle = () => {
  const vehicles = useAppStore(state => state.vehicles);
  const activeVehicleId = useAppStore(state => state.activeVehicleId);
  const saveVehicle = useAppStore(state => state.saveVehicle);
  const setActiveVehicle = useAppStore(state => state.setActiveVehicle);
  const deleteVehicle = useAppStore(state => state.deleteVehicle);

  const runs = useAppStore(state => state.runs);
  const rides = useAppStore(state => state.rides);
  const fuelLogs = useAppStore(state => state.fuelLogs);
  const maintenanceLogs = useAppStore(state => state.maintenanceLogs);

  const saveFuelLog = useAppStore(state => state.saveFuelLog);
  const deleteFuelLog = useAppStore(state => state.deleteFuelLog);
  const saveMaintenanceLog = useAppStore(state => state.saveMaintenanceLog);
  const deleteMaintenanceLog = useAppStore(state => state.deleteMaintenanceLog);

  // Modais
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);

  // Form Veículo
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [mainFuel, setMainFuel] = useState('Etanol');
  const [cityConsumption, setCityConsumption] = useState('');
  const [highwayConsumption, setHighwayConsumption] = useState('');
  // Custos Fixos
  const [loan, setLoan] = useState('');
  const [insurance, setInsurance] = useState('');
  const [ipva, setIpva] = useState('');
  const [garage, setGarage] = useState('');
  const [maintAvg, setMaintAvg] = useState('');
  const [internet, setInternet] = useState('');
  const [others, setOthers] = useState('');

  // Form Abastecimento
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState('Etanol');
  const [fuelPrice, setFuelPrice] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelTotal, setFuelTotal] = useState('');
  const [fuelOdometer, setFuelOdometer] = useState('');
  const [fuelStation, setFuelStation] = useState('');

  // Form Manutenção
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintType, setMaintType] = useState('oil');
  const [maintKm, setMaintKm] = useState('');
  const [maintInterval, setMaintInterval] = useState('10000');
  const [maintCost, setMaintCost] = useState('');
  const [maintNotes, setMaintNotes] = useState('');

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  // Cálculos do veículo
  const healthStats = activeVehicle ? calculateVehicleHealthScore(activeVehicle, runs, rides, fuelLogs, maintenanceLogs) : null;
  const fuelEfficiency = activeVehicle ? calculateFuelEfficiency(fuelLogs, activeVehicle.id) : null;

  const handleOpenVehicleModal = (veh = null) => {
    if (veh) {
      setEditingVehicleId(veh.id);
      setNickname(veh.nickname || '');
      setBrand(veh.brand || '');
      setModel(veh.model || '');
      setVersion(veh.version || '');
      setYear(String(veh.year || ''));
      setPlate(veh.plate || '');
      setCurrentKm(String(veh.currentKm || ''));
      setMainFuel(veh.mainFuel || 'Etanol');
      setCityConsumption(String(veh.cityConsumption || ''));
      setHighwayConsumption(String(veh.highwayConsumption || ''));
      setLoan(String(veh.fixedCosts?.loan || ''));
      setInsurance(String(veh.fixedCosts?.insurance || ''));
      setIpva(String(veh.fixedCosts?.ipva || ''));
      setGarage(String(veh.fixedCosts?.garage || ''));
      setMaintAvg(String(veh.fixedCosts?.maintenanceAvg || ''));
      setInternet(String(veh.fixedCosts?.internet || ''));
      setOthers(String(veh.fixedCosts?.others || ''));
    } else {
      setEditingVehicleId(null);
      setNickname('');
      setBrand('');
      setModel('');
      setVersion('');
      setYear('');
      setPlate('');
      setCurrentKm('');
      setMainFuel('Etanol');
      setCityConsumption('');
      setHighwayConsumption('');
      setLoan('');
      setInsurance('');
      setIpva('');
      setGarage('');
      setMaintAvg('');
      setInternet('');
      setOthers('');
    }
    setShowVehicleModal(true);
  };

  const handleVehicleSubmit = (e) => {
    e.preventDefault();
    const id = editingVehicleId || 'v_' + Date.now();
    const newVehicle = {
      id,
      nickname,
      brand,
      model,
      version,
      year: parseInt(year) || 2020,
      plate,
      currentKm: parseInt(currentKm) || 0,
      mainFuel,
      cityConsumption: parseFloat(cityConsumption) || 10,
      highwayConsumption: parseFloat(highwayConsumption) || 12,
      fixedCosts: {
        loan: parseFloat(loan) || 0,
        insurance: parseFloat(insurance) || 0,
        ipva: parseFloat(ipva) || 0,
        garage: parseFloat(garage) || 0,
        maintenanceAvg: parseFloat(maintAvg) || 0,
        internet: parseFloat(internet) || 0,
        others: parseFloat(others) || 0
      }
    };

    saveVehicle(newVehicle);
    setShowVehicleModal(false);
  };

  const handleFuelSubmit = (e) => {
    e.preventDefault();
    const cost = parseFloat(fuelTotal) || (parseFloat(fuelPrice) * parseFloat(fuelLiters)) || 0;
    const log = {
      date: fuelDate,
      fuelType,
      pricePerLiter: parseFloat(fuelPrice),
      liters: parseFloat(fuelLiters) || (cost / parseFloat(fuelPrice)),
      totalCost: cost,
      odometer: parseInt(fuelOdometer),
      gasStation: fuelStation
    };
    saveFuelLog(log);
    setShowFuelModal(false);

    // Reseta form
    setFuelPrice('');
    setFuelLiters('');
    setFuelTotal('');
    setFuelOdometer('');
    setFuelStation('');
  };

  const handleMaintSubmit = (e) => {
    e.preventDefault();
    const log = {
      date: maintDate,
      type: maintType,
      lastChangedKm: parseInt(maintKm),
      intervalKm: parseInt(maintInterval),
      cost: parseFloat(maintCost) || 0,
      notes: maintNotes
    };
    saveMaintenanceLog(log);
    setShowMaintModal(false);

    // Reseta form
    setMaintKm('');
    setMaintCost('');
    setMaintNotes('');
  };

  const getMaintenanceItemStatus = (itemType, fallbackInterval) => {
    if (!activeVehicle) return { diff: 0, pct: 0, lastKm: 0, interval: fallbackInterval };
    const logs = maintenanceLogs
      .filter(m => m.vehicleId === activeVehicle.id && m.type === itemType)
      .sort((a, b) => b.lastChangedKm - a.lastChangedKm);
    
    const lastKm = logs.length > 0 ? parseInt(logs[0].lastChangedKm) : 0;
    const interval = logs.length > 0 ? parseInt(logs[0].intervalKm) : fallbackInterval;
    const current = activeVehicle.currentKm;
    const diff = current - lastKm;
    const pct = Math.min(100, (diff / interval) * 100);

    return { diff, pct, lastKm, interval };
  };

  const getHealthThemeColor = (score) => {
    if (score >= 90) return 'emerald';
    if (score >= 70) return 'blue';
    if (score >= 40) return 'yellow';
    return 'red';
  };

  return (
    <section id="tab-vehicle" className="tab-content active" style={{ paddingBottom: '80px' }}>
      
      {/* 1. SELEÇÃO DE VEÍCULO ATIVO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Meus Veículos</h3>
        <Button variant="glass" onClick={() => handleOpenVehicleModal()} icon="bx-plus">Adicionar</Button>
      </div>

      {vehicles.length === 0 ? (
        <Card variant="glass" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <i className="bx bx-car" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '12px' }}></i>
          <h4>Nenhum Veículo Cadastrado</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
            Cadastre o seu carro ou moto para gerenciar despesas fixas, manutenções e consumo.
          </p>
          <Button variant="primary" onClick={() => handleOpenVehicleModal()} icon="bx-plus-circle">Cadastrar Primeiro Veículo</Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {vehicles.map(v => (
            <Card
              key={v.id}
              variant={v.id === activeVehicleId ? 'glowing-blue' : 'glass'}
              interactive
              onClick={() => setActiveVehicle(v.id)}
              style={{ padding: '14px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ color: '#FFF', fontWeight: '700' }}>{v.nickname}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {v.brand} {v.model} • {v.plate || 'Sem placa'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {v.id === activeVehicleId && (
                    <span className="badge-active" style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--blue)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--blue)' }}>Ativo</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenVehicleModal(v); }}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    <i className="bx bx-edit-alt"></i>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if(confirm('Deseja realmente excluir este veículo?')) deleteVehicle(v.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    <i className="bx bx-trash"></i>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Hodômetro: <strong style={{ color: '#FFF' }}>{v.currentKm.toLocaleString('pt-BR')} km</strong></span>
                <span>Combustível: <strong style={{ color: '#FFF' }}>{v.mainFuel}</strong></span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeVehicle && (
        <>
          {/* 2. SAÚDE FINANCEIRA DO CARRO */}
          <h3 className="section-title">Saúde Financeira do Carro</h3>
          {healthStats && (
            <Card variant={`glowing-${getHealthThemeColor(healthStats.score)}`} style={{ padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ color: '#FFF', fontWeight: '700' }}>Score de Eficiência</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Métricas de desgaste, lucro e consumo</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontFamily: 'Outfit', fontWeight: '900', margin: 0 }}>{healthStats.score}</h2>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600' }} className={`text-${getHealthThemeColor(healthStats.score)}`}>
                    Status: {healthStats.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <strong style={{ color: '#FFF' }}>Diagnóstico da IA:</strong>
                {healthStats.reasons.map((r, i) => (
                  <p key={i} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <i className="bx bx-chevron-right" style={{ marginTop: '2px', color: 'var(--blue)' }}></i> {r}
                  </p>
                ))}
              </div>
            </Card>
          )}

          {/* 3. MANUTENÇÕES PREDITIVAS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Manutenção Preventiva</h3>
            <Button variant="glass" onClick={() => { setMaintKm(String(activeVehicle.currentKm)); setShowMaintModal(true); }} icon="bx-wrench">Registrar</Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {/* Óleo */}
            {(() => {
              const info = getMaintenanceItemStatus('oil', 10000);
              return (
                <Card variant="glass" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                    <strong><i className="bx bx-droplet text-blue" style={{ marginRight: '6px' }}></i> Óleo e Filtro</strong>
                    <span style={{ color: info.pct >= 90 ? 'var(--red)' : 'var(--text-muted)' }}>
                      Trocado há {info.diff.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <ProgressBar value={info.diff} max={info.interval} showLabel={false} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Último: {info.lastKm.toLocaleString('pt-BR')} km</span>
                    <span>Intervalo: {info.interval.toLocaleString('pt-BR')} km</span>
                  </div>
                </Card>
              );
            })()}

            {/* Pneus */}
            {(() => {
              const info = getMaintenanceItemStatus('tires', 40000);
              return (
                <Card variant="glass" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                    <strong><i className="bx bx-disc text-yellow" style={{ marginRight: '6px' }}></i> Pneus e Alinhamento</strong>
                    <span style={{ color: info.pct >= 90 ? 'var(--red)' : 'var(--text-muted)' }}>
                      Rodado {info.diff.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <ProgressBar value={info.diff} max={info.interval} showLabel={false} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Último: {info.lastKm.toLocaleString('pt-BR')} km</span>
                    <span>Troca: {info.interval.toLocaleString('pt-BR')} km</span>
                  </div>
                </Card>
              );
            })()}

            {/* Freios */}
            {(() => {
              const info = getMaintenanceItemStatus('brakes', 20000);
              return (
                <Card variant="glass" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                    <strong><i className="bx bx-stop-circle text-red" style={{ marginRight: '6px' }}></i> Pastilhas de Freio</strong>
                    <span style={{ color: info.pct >= 90 ? 'var(--red)' : 'var(--text-muted)' }}>
                      Desgaste {info.diff.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <ProgressBar value={info.diff} max={info.interval} showLabel={false} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Último: {info.lastKm.toLocaleString('pt-BR')} km</span>
                    <span>Troca: {info.interval.toLocaleString('pt-BR')} km</span>
                  </div>
                </Card>
              );
            })()}
          </div>

          {/* 4. ABASTECIMENTO INTELIGENTE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>Histórico de Abastecimentos</h3>
            <Button variant="glass" onClick={() => { setFuelOdometer(String(activeVehicle.currentKm)); setShowFuelModal(true); }} icon="bx-gas-pump">Abastecer</Button>
          </div>

          {fuelEfficiency && (
            <Card variant="glass" style={{ padding: '12px 16px', marginBottom: '12px', borderLeft: '4px solid var(--emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consumo Real Calculado:</span>
                <strong style={{ fontSize: '1rem', color: 'var(--emerald)' }}>{fuelEfficiency.toFixed(1)} km/L</strong>
              </div>
            </Card>
          )}

          {fuelLogs.filter(f => f.vehicleId === activeVehicle.id).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
              Nenhum abastecimento registrado para este veículo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {fuelLogs
                .filter(f => f.vehicleId === activeVehicle.id)
                .slice(0, 5)
                .map(f => (
                  <div key={f.id} className="history-item" style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <strong>{f.fuelType} • {f.liters.toFixed(1)} L</strong>
                      <span className="text-red">-{formatCurrency(f.totalCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>{f.gasStation || 'Posto'} • {formatDateShort(f.date)}</span>
                      <span>{f.odometer.toLocaleString('pt-BR')} km</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* MODAL: CADASTRO VEÍCULO */}
      <Modal isOpen={showVehicleModal} onClose={() => setShowVehicleModal(false)} title={editingVehicleId ? 'Editar Veículo' : 'Cadastrar Veículo'}>
        <form onSubmit={handleVehicleSubmit} className="custom-form" style={{ padding: '0 16px 20px 16px' }}>
          <div className="form-group">
            <label>Apelido do Veículo</label>
            <input type="text" placeholder="Ex: Corsa de Trabalho" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>Marca</label>
              <input type="text" placeholder="Ex: Chevrolet" value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Modelo</label>
              <input type="text" placeholder="Ex: Corsa Hatch" value={model} onChange={(e) => setModel(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid-three">
            <div className="form-group">
              <label>Ano</label>
              <input type="number" placeholder="2012" value={year} onChange={(e) => setYear(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Placa</label>
              <input type="text" placeholder="ABC-1234" value={plate} onChange={(e) => setPlate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Km Atual</label>
              <input type="number" placeholder="142000" value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} required />
            </div>
          </div>

          <h4 className="form-subtitle">Consumo de Fábrica</h4>
          <div className="form-grid-three">
            <div className="form-group">
              <label>Combustível</label>
              <select value={mainFuel} onChange={(e) => setMainFuel(e.target.value)}>
                <option value="Etanol">Etanol</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Flex">Flex (Gas/Alcool)</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cons. Urbano</label>
              <input type="number" step="0.1" placeholder="9.5" value={cityConsumption} onChange={(e) => setCityConsumption(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cons. Rodov.</label>
              <input type="number" step="0.1" placeholder="12.0" value={highwayConsumption} onChange={(e) => setHighwayConsumption(e.target.value)} />
            </div>
          </div>

          <h4 className="form-subtitle">Custos Fixos Mensais (Opcional)</h4>
          <div className="form-grid-two">
            <div className="form-group">
              <label>Financiamento (R$/mês)</label>
              <input type="number" placeholder="0.00" value={loan} onChange={(e) => setLoan(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Seguro (R$/mês)</label>
              <input type="number" placeholder="0.00" value={insurance} onChange={(e) => setInsurance(e.target.value)} />
            </div>
          </div>

          <div className="form-grid-three">
            <div className="form-group">
              <label>IPVA (mês)</label>
              <input type="number" placeholder="0.00" value={ipva} onChange={(e) => setIpva(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Garagem</label>
              <input type="number" placeholder="0.00" value={garage} onChange={(e) => setGarage(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Média Maint</label>
              <input type="number" placeholder="0.00" value={maintAvg} onChange={(e) => setMaintAvg(e.target.value)} />
            </div>
          </div>

          <Button variant="primary" type="submit" style={{ width: '100%', marginTop: '16px' }}>Salvar Configuração</Button>
        </form>
      </Modal>

      {/* MODAL: ABASTECIMENTO */}
      <Modal isOpen={showFuelModal} onClose={() => setShowFuelModal(false)} title="Registrar Abastecimento">
        <form onSubmit={handleFuelSubmit} className="custom-form" style={{ padding: '0 16px' }}>
          <div className="form-group">
            <label>Data</label>
            <input type="date" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} required />
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>Combustível</label>
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                <option value="Etanol">Etanol</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
              </select>
            </div>
            <div className="form-group">
              <label>Preço por Litro (R$)</label>
              <input type="number" step="0.001" placeholder="5.69" value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid-three">
            <div className="form-group">
              <label>Litros</label>
              <input type="number" step="0.01" placeholder="25.5" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Valor Total (R$)</label>
              <input type="number" step="0.01" placeholder="145.00" value={fuelTotal} onChange={(e) => setFuelTotal(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Odômetro (KM)</label>
              <input type="number" placeholder="142080" value={fuelOdometer} onChange={(e) => setFuelOdometer(e.target.value)} required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Posto de Combustível</label>
            <input type="text" placeholder="Ex: Posto Ipiranga" value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} />
          </div>

          <Button variant="primary" type="submit" style={{ width: '100%' }}>Concluir Abastecimento</Button>
        </form>
      </Modal>

      {/* MODAL: MANUTENÇÃO */}
      <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Registrar Manutenção">
        <form onSubmit={handleMaintSubmit} className="custom-form" style={{ padding: '0 16px' }}>
          <div className="form-grid-two">
            <div className="form-group">
              <label>Data</label>
              <input type="date" value={maintDate} onChange={(e) => setMaintDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Tipo de Peça / Serviço</label>
              <select value={maintType} onChange={(e) => setMaintType(e.target.value)}>
                <option value="oil">Óleo e Filtro</option>
                <option value="tires">Pneus / Alinhamento</option>
                <option value="brakes">Freios (Pastilhas/Discos)</option>
                <option value="suspension">Suspensão / Amortecedores</option>
                <option value="battery">Bateria</option>
                <option value="rev">Revisão Geral / Outro</option>
              </select>
            </div>
          </div>

          <div className="form-grid-three">
            <div className="form-group">
              <label>Km Atual</label>
              <input type="number" placeholder="142000" value={maintKm} onChange={(e) => setMaintKm(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Intervalo (KM)</label>
              <input type="number" placeholder="10000" value={maintInterval} onChange={(e) => setMaintInterval(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Custo Total (R$)</label>
              <input type="number" step="0.01" placeholder="250.00" value={maintCost} onChange={(e) => setMaintCost(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Notas / Observações</label>
            <input type="text" placeholder="Ex: Marca da pastilha Bosch" value={maintNotes} onChange={(e) => setMaintNotes(e.target.value)} />
          </div>

          <Button variant="primary" type="submit" style={{ width: '100%' }}>Salvar Manutenção</Button>
        </form>
      </Modal>

    </section>
  );
};
export default Vehicle;
