import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateMEIStats } from '../utils/calculations';
import { formatCurrency, formatKm } from '../utils/formatters';
import { BackupService } from '../services/backup';
import Card from '../components/Card';
import Button from '../components/Button';
import SVGChart from '../components/SVGChart';
import PlatformBadge from '../components/PlatformBadge';

export const Reports = () => {
  const runs = useAppStore(state => state.runs);
  const rides = useAppStore(state => state.rides);
  const deleteRun = useAppStore(state => state.deleteRun);
  const deleteRide = useAppStore(state => state.deleteRide);
  
  // Backup / Sync States
  const syncSettings = useAppStore(state => state.syncSettings);
  const saveSyncSettings = useAppStore(state => state.saveSyncSettings);
  const resetAllData = useAppStore(state => state.resetAllData);
  const importBackupData = useAppStore(state => state.importBackupData);

  // States de UI
  const [activeReportTab, setActiveReportTab] = useState('comparador'); // 'comparador', 'mei', 'historico', 'config'
  const [filterType, setFilterType] = useState('all'); // 'all', 'delivery', 'ride'
  const [filterPlatform, setFilterPlatform] = useState('all');

  // Supabase Sync Config Form States
  const [supabaseUrl, setSupabaseUrl] = useState(syncSettings.url || '');
  const [supabaseKey, setSupabaseKey] = useState(syncSettings.anonKey || '');
  const [syncEnabled, setSyncEnabled] = useState(syncSettings.enabled || false);

  const allRecords = [
    ...runs.map(r => ({ ...r, recordType: 'delivery' })),
    ...rides.map(r => ({ ...r, recordType: 'ride' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // 1. COMPARADOR DE PLATAFORMAS - RANKING AUTOMÁTICO
  const getPlatformRanking = () => {
    const stats = {};
    allRecords.forEach(rec => {
      const plat = rec.platform || 'Outra';
      const gross = parseFloat(rec.grossEarning) || 0;
      const exp = parseFloat(rec.totalExpense) || 0;
      const net = gross - exp;
      const hours = parseFloat(rec.tempoTrabalhado || 0) || 1;
      const km = parseFloat(rec.kmRodados) || 0;

      if (!stats[plat]) {
        stats[plat] = { gross: 0, net: 0, hours: 0, km: 0, count: 0 };
      }
      stats[plat].gross += gross;
      stats[plat].net += net;
      stats[plat].hours += hours;
      stats[plat].km += km;
      stats[plat].count += 1;
    });

    return Object.entries(stats)
      .map(([name, s]) => ({
        name,
        gross: s.gross,
        net: s.net,
        hourlyRate: s.hours > 0 ? (s.net / s.hours) : 0,
        kmRate: s.km > 0 ? (s.net / s.km) : 0,
        count: s.count
      }))
      .sort((a, b) => b.hourlyRate - a.hourlyRate);
  };

  const rankings = getPlatformRanking();

  // 2. MEI ANALYTICS
  const mei = calculateMEIStats(runs, rides);

  // 3. FILTRAGEM DO HISTÓRICO
  const filteredRecords = allRecords.filter(rec => {
    const typeMatch = filterType === 'all' || rec.recordType === filterType;
    const platformMatch = filterPlatform === 'all' || rec.platform === filterPlatform;
    return typeMatch && platformMatch;
  });

  // Lista única de plataformas cadastradas
  const registeredPlatforms = Array.from(new Set(allRecords.map(r => r.platform)));

  // Importar Backup JSON File
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const result = await BackupService.importBackup(file);
    if (result.success) {
      importBackupData(result.data);
      alert('Dados importados e aplicados com sucesso!');
    } else {
      alert(`Falha na importação: ${result.error}`);
    }
  };

  const handleSaveSyncSettings = (e) => {
    e.preventDefault();
    saveSyncSettings({
      url: supabaseUrl,
      anonKey: supabaseKey,
      enabled: syncEnabled
    });
    alert('Configurações de nuvem salvas!');
  };

  return (
    <section id="tab-reports" className="tab-content active" style={{ paddingBottom: '80px' }}>
      
      {/* NAVEGAÇÃO DE RELATÓRIOS */}
      <div className="reports-sub-tabs" style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px' }}>
        <button
          className={`sub-tab-btn ${activeReportTab === 'comparador' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('comparador')}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeReportTab === 'comparador' ? 'var(--blue)' : 'none', color: '#FFF' }}
        >
          Comparador
        </button>
        <button
          className={`sub-tab-btn ${activeReportTab === 'mei' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('mei')}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeReportTab === 'mei' ? 'var(--blue)' : 'none', color: '#FFF' }}
        >
          MEI / IR
        </button>
        <button
          className={`sub-tab-btn ${activeReportTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('historico')}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeReportTab === 'historico' ? 'var(--blue)' : 'none', color: '#FFF' }}
        >
          Histórico
        </button>
        <button
          className={`sub-tab-btn ${activeReportTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveReportTab('config')}
          style={{ flex: 1, padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeReportTab === 'config' ? 'var(--blue)' : 'none', color: '#FFF' }}
        >
          Config / Sync
        </button>
      </div>

      {/* --- CONTEÚDOS DAS SUB-ABAS --- */}

      {/* 1. COMPARADOR DE PLATAFORMAS */}
      {activeReportTab === 'comparador' && (
        <div>
          <h3 className="section-title">Donut de Plataformas</h3>
          <Card variant="glass" style={{ padding: '16px', marginBottom: '20px' }}>
            <SVGChart type="donut" data={allRecords} />
          </Card>

          <h3 className="section-title">Ranking de Lucratividade</h3>
          {rankings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>Adicione corridas ou entregas para comparar as plataformas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rankings.map((p, idx) => (
                <Card key={p.name} variant={idx === 0 ? 'glowing-emerald' : 'glass'} style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: idx === 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>#{idx + 1}</span>
                      <div>
                        <strong style={{ color: '#FFF', fontSize: '0.9rem' }}>{p.name}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.count} saídas registradas</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--emerald)', fontSize: '0.85rem', fontWeight: '700' }}>R$ {p.hourlyRate.toFixed(2)}/h</div>
                      <div style={{ color: 'var(--blue)', fontSize: '0.7rem' }}>R$ {p.kmRate.toFixed(2)}/km</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MEI E IMPOSTOS */}
      {activeReportTab === 'mei' && (
        <div>
          <h3 className="section-title">Relatório Anual MEI ({new Date().getFullYear()})</h3>
          <Card variant="glass" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span>Faturamento Acumulado</span>
              <span><strong>{formatCurrency(mei.totalGross)}</strong> / {formatCurrency(mei.limit)}</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ width: `${Math.min(100, mei.pctUsed)}%`, height: '100%', background: mei.pctUsed > 85 ? 'var(--red)' : 'var(--blue)', borderRadius: '10px' }}></div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Você utilizou <strong>{mei.pctUsed.toFixed(1)}%</strong> do limite anual do MEI.
            </span>
          </Card>

          <h3 className="section-title">Imposto de Renda (IRPF) Estimado</h3>
          <Card variant="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Receita Bruta Total:</span>
                <strong style={{ color: '#FFF' }}>{formatCurrency(mei.totalGross)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Parcela Isenta (32%):</span>
                <strong style={{ color: 'var(--emerald)' }}>{formatCurrency(mei.exemptPortion)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rendimento Tributável:</span>
                <strong style={{ color: 'var(--red)' }}>{formatCurrency(mei.taxablePortion)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Projeção Anual:</span>
                <strong style={{ color: mei.willExceedTeto ? 'var(--red)' : 'var(--blue)' }}>
                  {mei.willExceedTeto ? 'Risco de Estourar Teto MEI' : 'Dentro do limite'}
                </strong>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. HISTÓRICO DE SAÍDAS */}
      {activeReportTab === 'historico' && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ flex: 1, padding: '8px', background: '#161C2C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#FFF', fontSize: '0.75rem' }}
            >
              <option value="all">Tipos (Todos)</option>
              <option value="delivery">Entregas</option>
              <option value="ride">Corridas de App</option>
            </select>

            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              style={{ flex: 1, padding: '8px', background: '#161C2C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#FFF', fontSize: '0.75rem' }}
            >
              <option value="all">Plataformas (Todas)</option>
              {registeredPlatforms.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {filteredRecords.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '24px' }}>Nenhum registro encontrado para estes filtros.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredRecords.map(rec => (
                <div key={rec.id} className="history-item" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <PlatformBadge platform={rec.platform} />
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rec.date}</span>
                        <div style={{ fontSize: '0.8rem', color: '#FFF', marginTop: '2px' }}>
                          {formatKm(rec.kmRodados)} rodados
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--emerald)', fontSize: '0.85rem', fontWeight: '700' }}>+{formatCurrency(rec.grossEarning)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Líq: {formatCurrency(rec.netProfit)}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Deseja excluir este registro de corrida/entrega?')) {
                            if (rec.recordType === 'delivery') deleteRun(rec.id);
                            else deleteRide(rec.id);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. CONFIGURAÇÕES E BACKUP */}
      {activeReportTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SUPABASE CLOUD SYNC */}
          <Card variant="glass" style={{ padding: '16px' }}>
            <h4 style={{ color: '#FFF', fontWeight: '700', marginBottom: '8px' }}>Sincronização em Nuvem (Supabase)</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Configure a sincronização opcional para ter backup automático em tempo real na nuvem do Supabase.
            </p>

            <form onSubmit={handleSaveSyncSettings} className="custom-form" style={{ padding: 0 }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.7rem' }}>Supabase URL</label>
                <input type="text" placeholder="https://xxxx.supabase.co" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.7rem' }}>Chave Pública Anon</label>
                <input type="password" placeholder="eyJhbGciOi..." value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input type="checkbox" id="sync-enabled-check" checked={syncEnabled} onChange={(e) => setSyncEnabled(e.target.checked)} />
                <label htmlFor="sync-enabled-check" style={{ fontSize: '0.75rem', color: '#FFF', cursor: 'pointer' }}>Ativar Sincronização Automática</label>
              </div>

              <Button variant="primary" type="submit" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }}>Salvar Configurações Cloud</Button>
            </form>
          </Card>

          {/* BACKUP LOCAL */}
          <Card variant="glass" style={{ padding: '16px' }}>
            <h4 style={{ color: '#FFF', fontWeight: '700', marginBottom: '8px' }}>Segurança & Backup Local</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Exporte seus dados locais para um arquivo protegido ou restaure a partir de um backup existente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Button
                variant="glass"
                onClick={() => {
                  const state = useAppStore.getState();
                  BackupService.exportBackup(state, true);
                }}
                icon="bx-download"
                style={{ width: '100%' }}
              >
                Exportar Backup Seguro (.rlb)
              </Button>
              <Button
                variant="glass"
                onClick={() => {
                  const state = useAppStore.getState();
                  BackupService.exportBackup(state, false);
                }}
                icon="bx-export"
                style={{ width: '100%' }}
              >
                Exportar JSON Simples (.json)
              </Button>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px' }}>
                <label className="btn btn-glass" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                  <i className="bx bx-upload btn-icon-left"></i> Restaurar de Backup
                  <input type="file" accept=".json,.rlb" onChange={handleImportFile} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </Card>

          {/* RESET DE DADOS */}
          <Card variant="glass" style={{ padding: '16px', borderLeft: '4px solid var(--red)' }}>
            <h4 style={{ color: '#FFF', fontWeight: '700', marginBottom: '8px' }}>Área de Perigo</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Esta ação excluirá permanentemente todos os seus dados locais de veículos, histórico e metas do navegador.
            </p>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('DADOS CRÍTICOS: Tem certeza que deseja apagar DEFINITIVAMENTE todos os dados deste celular?')) {
                  resetAllData();
                  alert('Todos os dados locais foram apagados!');
                  window.location.reload();
                }
              }}
              icon="bx-trash"
              style={{ width: '100%' }}
            >
              Apagar Tudo Localmente
            </Button>
          </Card>

        </div>
      )}

    </section>
  );
};
export default Reports;
