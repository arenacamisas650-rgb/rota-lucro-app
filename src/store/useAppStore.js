import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // --- ESTADOS ---
      user: null, // { name: '', email: '', avatarUrl: '' }
      onboardingDone: false,
      vehicles: [], // Array de objetos de veículo
      activeVehicleId: null, // ID do veículo ativo
      runs: [], // Entregas
      rides: [], // Corridas de app
      shifts: [], // Histórico de turnos encerrados
      activeShift: null, // Turno em andamento { id, startTime, startKm, pauseTime, totalPauseDurationMs, status, routePoints }
      goals: [], // Metas
      fuelLogs: [], // Abastecimentos
      maintenanceLogs: [], // Manutenções
      syncQueue: [], // Fila de sincronização offline-first
      syncSettings: { url: '', anonKey: '', enabled: false }, // Configurações do Supabase
      logs: [], // Logs internos para diagnóstico

      // --- AÇÕES ---

      // Diagnóstico / Analytics
      addLog: (message, type = 'info') => {
        const newLog = {
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          timestamp: new Date().toISOString(),
          message,
          type
        };
        set(state => ({ logs: [newLog, ...state.logs].slice(0, 100) }));
      },

      clearLogs: () => set({ logs: [] }),

      // Configurações do Supabase
      saveSyncSettings: (settings) => {
        set({ syncSettings: settings });
        get().addLog(`Configurações de sincronização atualizadas: ${settings.enabled ? 'Ativo' : 'Inativo'}`);
      },

      // Usuário / Onboarding
      saveUser: (user) => set({ user }),
      setOnboardingDone: (done) => set({ onboardingDone: done }),

      // Veículos
      saveVehicle: (vehicle) => {
        set(state => {
          const idx = state.vehicles.findIndex(v => v.id === vehicle.id);
          let newVehicles = [...state.vehicles];
          
          // Custos fixos estruturados
          const fixedCosts = {
            garage: 0,
            maintenanceAvg: 0,
            internet: 0,
            others: 0,
            loan: 0,
            insurance: 0,
            ipva: 0,
            ...(vehicle.fixedCosts || {})
          };

          const formattedVehicle = { ...vehicle, fixedCosts };

          if (idx !== -1) {
            newVehicles[idx] = formattedVehicle;
          } else {
            newVehicles.push(formattedVehicle);
          }

          const activeId = state.activeVehicleId || formattedVehicle.id;

          // Enfilera na sincronização
          const syncQueue = [...state.syncQueue, {
            action: 'UPSERT_VEHICLE',
            payload: formattedVehicle,
            timestamp: Date.now(),
            retries: 0
          }];

          return { 
            vehicles: newVehicles, 
            activeVehicleId: activeId,
            syncQueue
          };
        });
        get().addLog(`Veículo salvo: ${vehicle.nickname}`);
      },

      setActiveVehicle: (id) => {
        set({ activeVehicleId: id });
        get().addLog(`Veículo ativo alterado para ID: ${id}`);
      },

      deleteVehicle: (id) => {
        set(state => {
          const newVehicles = state.vehicles.filter(v => v.id !== id);
          const nextActive = newVehicles.length > 0 ? newVehicles[0].id : null;
          
          const syncQueue = [...state.syncQueue, {
            action: 'DELETE_VEHICLE',
            payload: { id },
            timestamp: Date.now(),
            retries: 0
          }];

          return { 
            vehicles: newVehicles, 
            activeVehicleId: nextActive,
            syncQueue
          };
        });
        get().addLog(`Veículo excluído ID: ${id}`);
      },

      // Entregas (Runs)
      saveRun: (run) => {
        const id = run.id || 'r_' + Date.now();
        const activeVehId = get().activeVehicleId;
        const newRun = {
          ...run,
          id,
          type: 'delivery',
          vehicleId: activeVehId,
          createdAt: run.createdAt || new Date().toISOString()
        };

        set(state => {
          const filteredRuns = state.runs.filter(r => r.id !== id);
          
          // Atualiza odômetro do veículo
          const newVehicles = state.vehicles.map(v => {
            if (v.id === activeVehId) {
              const runKm = parseFloat(run.kmRodados) || 0;
              return { ...v, currentKm: (parseFloat(v.currentKm) || 0) + runKm };
            }
            return v;
          });

          const syncQueue = [...state.syncQueue, {
            action: 'INSERT_RUN',
            payload: newRun,
            timestamp: Date.now(),
            retries: 0
          }];

          return {
            runs: [newRun, ...filteredRuns],
            vehicles: newVehicles,
            syncQueue
          };
        });

        get().addLog(`Entrega registrada: R$ ${run.grossEarning} - ${run.platform}`);
      },

      deleteRun: (id) => {
        set(state => {
          const syncQueue = [...state.syncQueue, {
            action: 'DELETE_RUN',
            payload: { id },
            timestamp: Date.now(),
            retries: 0
          }];
          return {
            runs: state.runs.filter(r => r.id !== id),
            syncQueue
          };
        });
        get().addLog(`Entrega excluída ID: ${id}`);
      },

      // Corridas (Rides)
      saveRide: (ride) => {
        const id = ride.id || 'ride_' + Date.now();
        const activeVehId = get().activeVehicleId;
        const newRide = {
          ...ride,
          id,
          type: 'ride',
          vehicleId: activeVehId,
          createdAt: ride.createdAt || new Date().toISOString()
        };

        set(state => {
          const filteredRides = state.rides.filter(r => r.id !== id);

          // Atualiza odômetro do veículo
          const newVehicles = state.vehicles.map(v => {
            if (v.id === activeVehId) {
              const rideKm = parseFloat(ride.kmRodados) || 0;
              return { ...v, currentKm: (parseFloat(v.currentKm) || 0) + rideKm };
            }
            return v;
          });

          const syncQueue = [...state.syncQueue, {
            action: 'INSERT_RIDE',
            payload: newRide,
            timestamp: Date.now(),
            retries: 0
          }];

          return {
            rides: [newRide, ...filteredRides],
            vehicles: newVehicles,
            syncQueue
          };
        });

        get().addLog(`Corrida registrada: R$ ${ride.grossEarning} - ${ride.platform}`);
      },

      deleteRide: (id) => {
        set(state => {
          const syncQueue = [...state.syncQueue, {
            action: 'DELETE_RIDE',
            payload: { id },
            timestamp: Date.now(),
            retries: 0
          }];
          return {
            rides: state.rides.filter(r => r.id !== id),
            syncQueue
          };
        });
        get().addLog(`Corrida excluída ID: ${id}`);
      },

      // Turnos / Jornada
      startShift: (startKm) => {
        const activeVehId = get().activeVehicleId;
        const activeShift = {
          id: 's_' + Date.now(),
          vehicleId: activeVehId,
          startTime: new Date().toISOString(),
          pauseTime: null,
          totalPauseDurationMs: 0,
          startKm: parseFloat(startKm) || 0,
          status: 'running',
          routePoints: []
        };
        set({ activeShift });
        get().addLog(`Turno de trabalho iniciado com KM ${startKm}`);
      },

      pauseShift: () => {
        set(state => {
          if (!state.activeShift || state.activeShift.status !== 'running') return {};
          return {
            activeShift: {
              ...state.activeShift,
              status: 'paused',
              pauseTime: new Date().toISOString()
            }
          };
        });
        get().addLog('Turno pausado');
      },

      resumeShift: () => {
        set(state => {
          if (!state.activeShift || state.activeShift.status !== 'paused') return {};
          const now = new Date();
          const pauseInstant = new Date(state.activeShift.pauseTime);
          const pauseDuration = now.getTime() - pauseInstant.getTime();
          return {
            activeShift: {
              ...state.activeShift,
              status: 'running',
              pauseTime: null,
              totalPauseDurationMs: (state.activeShift.totalPauseDurationMs || 0) + pauseDuration
            }
          };
        });
        get().addLog('Turno retomado');
      },

      addShiftRoutePoint: (lat, lng) => {
        set(state => {
          if (!state.activeShift || state.activeShift.status !== 'running') return {};
          const point = { lat, lng, timestamp: Date.now() };
          return {
            activeShift: {
              ...state.activeShift,
              routePoints: [...(state.activeShift.routePoints || []), point]
            }
          };
        });
      },

      stopShift: (endKm, totalEarnings, shiftExpenses) => {
        const shift = get().activeShift;
        if (!shift) return;

        const endTime = new Date().toISOString();
        const start = new Date(shift.startTime).getTime();
        const end = new Date(endTime).getTime();
        const durationMs = (end - start) - (shift.totalPauseDurationMs || 0);

        const activeVehId = get().activeVehicleId;
        const finalEndKm = parseFloat(endKm) || shift.startKm;
        const kmRodados = Math.max(0, finalEndKm - shift.startKm);

        const completedShift = {
          ...shift,
          endTime,
          endKm: finalEndKm,
          durationMs,
          grossEarnings: parseFloat(totalEarnings) || 0,
          expenses: parseFloat(shiftExpenses) || 0,
          netProfit: (parseFloat(totalEarnings) || 0) - (parseFloat(shiftExpenses) || 0),
          kmRodados,
          status: 'stopped'
        };

        set(state => {
          // Atualiza odômetro do veículo
          const newVehicles = state.vehicles.map(v => {
            if (v.id === activeVehId) {
              return { ...v, currentKm: finalEndKm };
            }
            return v;
          });

          const syncQueue = [...state.syncQueue, {
            action: 'INSERT_SHIFT',
            payload: completedShift,
            timestamp: Date.now(),
            retries: 0
          }];

          return {
            shifts: [completedShift, ...state.shifts],
            activeShift: null,
            vehicles: newVehicles,
            syncQueue
          };
        });

        get().addLog(`Turno encerrado. Lucro: R$ ${completedShift.netProfit.toFixed(2)}, KM: ${kmRodados}`);
        return completedShift;
      },

      cancelShift: () => {
        set({ activeShift: null });
        get().addLog('Turno cancelado e descartado');
      },

      // Abastecimento (FuelLogs)
      saveFuelLog: (log) => {
        const id = log.id || 'f_' + Date.now();
        const activeVehId = get().activeVehicleId;
        const newLog = {
          ...log,
          id,
          vehicleId: activeVehId,
          date: log.date || new Date().toISOString().split('T')[0]
        };

        set(state => {
          const filtered = state.fuelLogs.filter(f => f.id !== id);
          
          // Atualiza odômetro do veículo se o abastecimento for maior
          const newVehicles = state.vehicles.map(v => {
            if (v.id === activeVehId && (parseFloat(log.odometer) || 0) > (parseFloat(v.currentKm) || 0)) {
              return { ...v, currentKm: parseFloat(log.odometer) };
            }
            return v;
          });

          const syncQueue = [...state.syncQueue, {
            action: 'UPSERT_FUEL_LOG',
            payload: newLog,
            timestamp: Date.now(),
            retries: 0
          }];

          return {
            fuelLogs: [newLog, ...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)),
            vehicles: newVehicles,
            syncQueue
          };
        });
        get().addLog(`Abastecimento salvo: R$ ${log.totalCost} no posto ${log.gasStation}`);
      },

      deleteFuelLog: (id) => {
        set(state => {
          const syncQueue = [...state.syncQueue, {
            action: 'DELETE_FUEL_LOG',
            payload: { id },
            timestamp: Date.now(),
            retries: 0
          }];
          return {
            fuelLogs: state.fuelLogs.filter(f => f.id !== id),
            syncQueue
          };
        });
        get().addLog(`Abastecimento excluído ID: ${id}`);
      },

      // Manutenção (MaintenanceLogs)
      saveMaintenanceLog: (log) => {
        const id = log.id || 'm_' + Date.now();
        const activeVehId = get().activeVehicleId;
        const newLog = {
          ...log,
          id,
          vehicleId: activeVehId,
          date: log.date || new Date().toISOString().split('T')[0]
        };

        set(state => {
          const filtered = state.maintenanceLogs.filter(m => m.id !== id);

          // Atualiza odômetro do veículo se for maior
          const newVehicles = state.vehicles.map(v => {
            if (v.id === activeVehId && (parseInt(log.lastChangedKm) || 0) > (parseInt(v.currentKm) || 0)) {
              return { ...v, currentKm: parseInt(log.lastChangedKm) };
            }
            return v;
          });

          const syncQueue = [...state.syncQueue, {
            action: 'UPSERT_MAINTENANCE',
            payload: newLog,
            timestamp: Date.now(),
            retries: 0
          }];

          return {
            maintenanceLogs: [newLog, ...filtered],
            vehicles: newVehicles,
            syncQueue
          };
        });
        get().addLog(`Manutenção registrada: ${log.type} no valor de R$ ${log.cost}`);
      },

      deleteMaintenanceLog: (id) => {
        set(state => {
          const syncQueue = [...state.syncQueue, {
            action: 'DELETE_MAINTENANCE',
            payload: { id },
            timestamp: Date.now(),
            retries: 0
          }];
          return {
            maintenanceLogs: state.maintenanceLogs.filter(m => m.id !== id),
            syncQueue
          };
        });
        get().addLog(`Manutenção excluída ID: ${id}`);
      },

      // Metas (Goals)
      saveGoal: (goal) => {
        const id = goal.id || 'g_' + Date.now();
        const newGoal = {
          id,
          name: goal.name,
          category: goal.category || 'geral',
          targetAmount: parseFloat(goal.targetAmount) || 0,
          currentAmount: parseFloat(goal.currentAmount) || 0,
          deadline: goal.deadline,
          completed: goal.completed || false,
          recurring: goal.recurring || 'unica', // 'unica', 'mensal', 'anual'
          createdAt: goal.createdAt || new Date().toISOString(),
          deposits: goal.deposits || []
        };

        // Verifica autocompletar se saldo >= objetivo
        if (newGoal.currentAmount >= newGoal.targetAmount) {
          newGoal.completed = true;
        }

        set(state => {
          const filtered = state.goals.filter(g => g.id !== id);
          
          const syncQueue = [...state.syncQueue, {
            action: 'UPSERT_GOAL',
            payload: newGoal,
            timestamp: Date.now(),
            retries: 0
          }];

          return {
            goals: [...filtered, newGoal],
            syncQueue
          };
        });
        get().addLog(`Meta salva: ${goal.name}`);
      },

      deleteGoal: (id) => {
        set(state => {
          const syncQueue = [...state.syncQueue, {
            action: 'DELETE_GOAL',
            payload: { id },
            timestamp: Date.now(),
            retries: 0
          }];
          return {
            goals: state.goals.filter(g => g.id !== id),
            syncQueue
          };
        });
        get().addLog(`Meta excluída ID: ${id}`);
      },

      depositGoal: (id, amount) => {
        const depAmt = parseFloat(amount) || 0;
        if (depAmt <= 0) return;

        set(state => {
          const updatedGoals = state.goals.map(g => {
            if (g.id === id) {
              const currentAmount = (parseFloat(g.currentAmount) || 0) + depAmt;
              const completed = currentAmount >= g.targetAmount;
              const deposits = [
                ...(g.deposits || []),
                { date: new Date().toISOString().split('T')[0], amount: depAmt }
              ];
              const updated = { ...g, currentAmount, completed, deposits };
              
              // Enfileira sincronização para essa alteração
              setTimeout(() => {
                get().queueSyncAction('UPSERT_GOAL', updated);
              }, 0);

              return updated;
            }
            return g;
          });

          return { goals: updatedGoals };
        });
        get().addLog(`Aporte de R$ ${depAmt} na meta ID: ${id}`);
      },

      // Fila de Sincronização direta
      queueSyncAction: (action, payload) => {
        set(state => ({
          syncQueue: [...state.syncQueue, {
            action,
            payload,
            timestamp: Date.now(),
            retries: 0
          }]
        }));
      },

      popSyncQueue: (timestamp) => {
        set(state => ({
          syncQueue: state.syncQueue.filter(item => item.timestamp !== timestamp)
        }));
      },

      incrementSyncRetry: (timestamp) => {
        set(state => ({
          syncQueue: state.syncQueue.map(item => {
            if (item.timestamp === timestamp) {
              return { ...item, retries: item.retries + 1 };
            }
            return item;
          })
        }));
      },

      // Reset Total de Dados
      resetAllData: () => {
        set({
          user: null,
          onboardingDone: false,
          vehicles: [],
          activeVehicleId: null,
          runs: [],
          rides: [],
          shifts: [],
          activeShift: null,
          goals: [],
          fuelLogs: [],
          maintenanceLogs: [],
          syncQueue: [],
          logs: []
        });
        get().addLog('Todos os dados foram resetados localmente.');
      },

      // Carregar dados de Backup importados
      importBackupData: (data) => {
        try {
          if (!data) return false;
          set({
            user: data.user || null,
            onboardingDone: data.onboardingDone || false,
            vehicles: data.vehicles || [],
            activeVehicleId: data.activeVehicleId || null,
            runs: data.runs || [],
            rides: data.rides || [],
            shifts: data.shifts || [],
            activeShift: data.activeShift || null,
            goals: data.goals || [],
            fuelLogs: data.fuelLogs || [],
            maintenanceLogs: data.maintenanceLogs || [],
            syncQueue: data.syncQueue || [],
            syncSettings: data.syncSettings || { url: '', anonKey: '', enabled: false }
          });
          get().addLog('Dados de backup restaurados com sucesso.');
          return true;
        } catch (e) {
          get().addLog(`Erro ao importar backup: ${e.message}`, 'error');
          return false;
        }
      }
    }),
    {
      name: 'rotalucro_state_store'
    }
  )
);
