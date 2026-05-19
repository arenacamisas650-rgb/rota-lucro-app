import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateGoalForecast } from '../utils/calculations';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';

export const Goals = () => {
  const goals = useAppStore(state => state.goals);
  const saveGoal = useAppStore(state => state.saveGoal);
  const deleteGoal = useAppStore(state => state.deleteGoal);
  const depositGoal = useAppStore(state => state.depositGoal);

  const runs = useAppStore(state => state.runs);
  const rides = useAppStore(state => state.rides);

  // Modais
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Form Meta
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState('carro');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [recurring, setRecurring] = useState('unica');

  // Form Aporte
  const [depositTargetGoal, setDepositTargetGoal] = useState(null);
  const [depositValue, setDepositValue] = useState('');

  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoalId(goal.id);
      setGoalName(goal.name);
      setGoalCategory(goal.category || 'geral');
      setTargetAmount(String(goal.targetAmount));
      setCurrentAmount(String(goal.currentAmount));
      setDeadline(goal.deadline || '');
      setRecurring(goal.recurring || 'unica');
    } else {
      setEditingGoalId(null);
      setGoalName('');
      setGoalCategory('carro');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setRecurring('unica');
    }
    setShowGoalModal(true);
  };

  const handleGoalSubmit = (e) => {
    e.preventDefault();
    if (!goalName || !targetAmount) return;

    const payload = {
      id: editingGoalId,
      name: goalName,
      category: goalCategory,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      deadline,
      recurring,
      completed: (parseFloat(currentAmount) || 0) >= parseFloat(targetAmount)
    };

    saveGoal(payload);
    setShowGoalModal(false);
  };

  const handleDepositSubmit = (e) => {
    e.preventDefault();
    if (!depositValue || !depositTargetGoal) return;
    
    depositGoal(depositTargetGoal.id, depositValue);
    setShowDepositModal(false);
    setDepositValue('');
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'carro': return 'bx-car';
      case 'lazer': return 'bx-party';
      case 'reserva': return 'bx-shield-quarter';
      case 'investimento': return 'bx-trending-up';
      default: return 'bx-bullseye';
    }
  };

  // Divide metas
  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <section id="tab-goals" className="tab-content active" style={{ paddingBottom: '80px' }}>
      
      {/* HEADER E ADD BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Minhas Metas</h3>
        <Button variant="glass" onClick={() => handleOpenGoalModal()} icon="bx-plus">Adicionar Meta</Button>
      </div>

      {goals.length === 0 ? (
        <Card variant="glass" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <i className="bx bx-target-lock" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '12px' }}></i>
          <h4>Foco nos Seus Objetivos</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
            Defina metas como seguro, troca de pneus, IPVA ou reserva de emergência para manter as contas no azul.
          </p>
          <Button variant="primary" onClick={() => handleOpenGoalModal()} icon="bx-plus-circle">Criar Minha Primeira Meta</Button>
        </Card>
      ) : (
        <>
          {/* METAS EM ANDAMENTO */}
          {activeGoals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {activeGoals.map(g => {
                const forecast = calculateGoalForecast(g, runs, rides);
                return (
                  <Card key={g.id} variant="glass" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`bx ${getCategoryIcon(g.category)}`} style={{ fontSize: '1.25rem' }}></i>
                        </div>
                        <div>
                          <h4 style={{ color: '#FFF', fontWeight: '700' }}>{g.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {g.category} {g.recurring === 'mensal' ? '• Mensal' : '• Única'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenGoalModal(g)}
                          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                        >
                          <i className="bx bx-edit-alt"></i>
                        </button>
                        <button
                          onClick={() => { if(confirm('Excluir esta meta?')) deleteGoal(g.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                        >
                          <i className="bx bx-trash"></i>
                        </button>
                      </div>
                    </div>

                    <ProgressBar
                      value={g.currentAmount}
                      max={g.targetAmount}
                      colorClass="bg-blue"
                      labelPrefix={formatCurrency(g.currentAmount)}
                      labelSuffix={` / ${formatCurrency(g.targetAmount)}`}
                      labelFormat="fraction"
                    />

                    {/* Previsão IA */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <i className="bx bx-timer" style={{ marginRight: '4px' }}></i> Previsão:
                      </span>
                      <strong style={{ color: 'var(--emerald)' }}>
                        {forecast.days !== null ? `${forecast.days} dias (~ ${formatDateShort(forecast.date)})` : 'Rodar mais para estimar'}
                      </strong>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => { setDepositTargetGoal(g); setShowDepositModal(true); }}
                      style={{ width: '100%', marginTop: '12px', padding: '6px 12px', fontSize: '0.8rem' }}
                      icon="bx-plus"
                    >
                      Aportar
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}

          {/* METAS CONCLUÍDAS (GOLD CARD STYLE) */}
          {completedGoals.length > 0 && (
            <div>
              <h4 className="section-title" style={{ fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.5px' }}>
                <i className="bx bxs-award" style={{ marginRight: '4px' }}></i> CONCLUÍDAS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {completedGoals.map(g => (
                  <Card key={g.id} variant="glowing-gold" style={{ padding: '14px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <i className="bx bx-check-circle" style={{ color: 'var(--gold)', fontSize: '1.25rem' }}></i>
                        <div>
                          <h4 style={{ color: '#FFF', fontWeight: '700', textDecoration: 'line-through' }}>{g.name}</h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>
                            Objetivo de {formatCurrency(g.targetAmount)} alcançado!
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { if(confirm('Excluir meta concluída?')) deleteGoal(g.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--gold)', opacity: 0.6, cursor: 'pointer' }}
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: NOVA/EDITAR META */}
      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title={editingGoalId ? 'Editar Objetivo' : 'Novo Objetivo'}>
        <form onSubmit={handleGoalSubmit} className="custom-form" style={{ padding: '0 16px' }}>
          <div className="form-group">
            <label>Nome do Objetivo</label>
            <input type="text" placeholder="Ex: IPVA 2026 ou Pneus novos" value={goalName} onChange={(e) => setGoalName(e.target.value)} required />
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>Categoria</label>
              <select value={goalCategory} onChange={(e) => setGoalCategory(e.target.value)}>
                <option value="carro">Veículo / Manutenção</option>
                <option value="lazer">Lazer / Viagem</option>
                <option value="reserva">Reserva de Emergência</option>
                <option value="investimento">Investimento</option>
                <option value="geral">Geral</option>
              </select>
            </div>
            <div className="form-group">
              <label>Recorrência</label>
              <select value={recurring} onChange={(e) => setRecurring(e.target.value)}>
                <option value="unica">Meta Única</option>
                <option value="mensal">Mensal Recorrente</option>
              </select>
            </div>
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label>Valor Objetivo (R$)</label>
              <input type="number" step="0.01" placeholder="Ex: 1200.00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Saldo Inicial (R$)</label>
              <input type="number" step="0.01" placeholder="0.00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Data Alvo</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <Button variant="primary" type="submit" style={{ width: '100%' }}>Salvar Meta</Button>
        </form>
      </Modal>

      {/* MODAL: DEPOSITAR/APORTAR */}
      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title={`Aporte: ${depositTargetGoal?.name}`}>
        <form onSubmit={handleDepositSubmit} className="custom-form" style={{ padding: '0 16px' }}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Quanto deseja aportar?</label>
            <div className="input-icon-wrapper prefix">
              <span className="currency-prefix">R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>
          <Button variant="primary" type="submit" style={{ width: '100%' }}>Confirmar Depósito</Button>
        </form>
      </Modal>

    </section>
  );
};
export default Goals;
