/**
 * RotaLucro - Módulo de Banco de Dados Local (Offline-First)
 * Gerencia a persistência via LocalStorage, dados Mock e sincronização.
 */

export const DB = {
    // Chaves de armazenamento
    KEYS: {
        USER: 'rotalucro_user',
        RUNS: 'rotalucro_runs',
        VEHICLES: 'rotalucro_vehicles',
        ACTIVE_VEHICLE: 'rotalucro_active_vehicle',
        MAINTENANCE: 'rotalucro_maintenance',
        GOALS: 'rotalucro_goals',
        SETTINGS: 'rotalucro_settings',
        ONBOARDING: 'rotalucro_onboarding_done'
    },

    // Inicialização do Banco de Dados
    init() {
        // App inicia vazio no modo de uso real.
        // Sem chamada para seedMockData() automático.
        
        // Garante que a estrutura base exista
        if (!localStorage.getItem(this.KEYS.VEHICLES)) {
            localStorage.setItem(this.KEYS.VEHICLES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.RUNS)) {
            localStorage.setItem(this.KEYS.RUNS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.MAINTENANCE)) {
            localStorage.setItem(this.KEYS.MAINTENANCE, JSON.stringify({}));
        }
    },

    // Seed de dados iniciais profissionais para demonstração imediata
    seedMockData() {
        // 1. Veículo Padrão
        const defaultVehicle = {
            id: 'v1',
            model: 'Chevrolet Corsa Hatch',
            plate: 'MHX-7E42',
            year: 2012,
            currentKm: 142500,
            fixedCosts: {
                loan: 450.00,
                insurance: 120.00,
                ipva: 80.00,
                other: 0.00
            }
        };

        // 2. Histórico de Saídas (Últimos 7 dias em relação à data atual fictícia de Maio/2026)
        const mockRuns = [
            {
                id: 'r1',
                date: '2026-05-12',
                platform: 'Amazon Flex',
                grossEarning: 240.00,
                packages: 32,
                kmRodados: 68.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 0.00,
                food: 16.00,
                parking: 0.00,
                otherExpenses: 0.00,
                fuelCost: 27.13,
                totalExpense: 43.13,
                netProfit: 196.87,
                profitPerPackage: 6.15,
                profitPerKm: 2.90
            },
            {
                id: 'r2',
                date: '2026-05-13',
                platform: 'Shopee',
                grossEarning: 180.00,
                packages: 48,
                kmRodados: 42.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 4.50,
                food: 12.00,
                parking: 0.00,
                otherExpenses: 0.00,
                fuelCost: 16.76,
                totalExpense: 33.26,
                netProfit: 146.74,
                profitPerPackage: 3.06,
                profitPerKm: 3.49
            },
            {
                id: 'r3',
                date: '2026-05-14',
                platform: 'Mercado Livre',
                grossEarning: 310.00,
                packages: 64,
                kmRodados: 88.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 12.50,
                food: 20.00,
                parking: 4.00,
                otherExpenses: 0.00,
                fuelCost: 35.11,
                totalExpense: 71.61,
                netProfit: 238.39,
                profitPerPackage: 3.72,
                profitPerKm: 2.71
            },
            {
                id: 'r4',
                date: '2026-05-15',
                platform: 'Amazon Flex',
                grossEarning: 240.00,
                packages: 28,
                kmRodados: 75.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 0.00,
                food: 15.00,
                parking: 0.00,
                otherExpenses: 5.00,
                fuelCost: 29.92,
                totalExpense: 49.92,
                netProfit: 190.08,
                profitPerPackage: 6.79,
                profitPerKm: 2.53
            },
            {
                id: 'r5',
                date: '2026-05-16',
                platform: 'Shopee',
                grossEarning: 195.00,
                packages: 51,
                kmRodados: 38.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 0.00,
                food: 10.00,
                parking: 0.00,
                otherExpenses: 0.00,
                fuelCost: 15.16,
                totalExpense: 25.16,
                netProfit: 169.84,
                profitPerPackage: 3.33,
                profitPerKm: 4.47
            },
            {
                id: 'r6',
                date: '2026-05-17',
                platform: 'Lalamove',
                grossEarning: 145.00,
                packages: 8,
                kmRodados: 52.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 0.00,
                food: 8.50,
                parking: 3.00,
                otherExpenses: 0.00,
                fuelCost: 20.76,
                totalExpense: 32.26,
                netProfit: 112.74,
                profitPerPackage: 14.09,
                profitPerKm: 2.17
            },
            {
                id: 'r7',
                date: '2026-05-18',
                platform: 'Mercado Livre',
                grossEarning: 290.00,
                packages: 58,
                kmRodados: 72.0,
                fuelType: 'Etanol',
                fuelPrice: 3.79,
                efficiency: 9.5,
                tolls: 6.50,
                food: 18.00,
                parking: 0.00,
                otherExpenses: 0.00,
                fuelCost: 28.72,
                totalExpense: 53.22,
                netProfit: 236.78,
                profitPerPackage: 4.08,
                profitPerKm: 3.29
            }
        ];

        // 3. Manutenções Preditivas (Troca realizada e estimativa)
        const defaultMaintenance = {
            oil: {
                lastChangedKm: 141300,
                intervalKm: 10000,
                cost: 180.00
            },
            tires: {
                lastChangedKm: 137000,
                intervalKm: 10000, // alinhamento/rodízio a cada 10k
                cost: 90.00
            },
            brakes: {
                lastChangedKm: 122000,
                intervalKm: 20000,
                cost: 250.00
            }
        };

        // 4. Metas Financeiras Ativas
        const defaultGoals = [
            {
                id: 'g1',
                name: 'Prestação do Carro',
                targetAmount: 450.00,
                currentAmount: 350.00,
                deadline: '2026-05-25',
                category: 'fixa'
            },
            {
                id: 'g2',
                name: 'Reserva para Pneus Novos',
                targetAmount: 1400.00,
                currentAmount: 480.00,
                deadline: '2026-08-30',
                category: 'manutencao'
            },
            {
                id: 'g3',
                name: 'Meta Faturamento Mensal',
                targetAmount: 5000.00,
                currentAmount: 1735.00,
                deadline: '2026-05-31',
                category: 'pessoal'
            }
        ];

        // Salvando no LocalStorage
        localStorage.setItem(this.KEYS.VEHICLE, JSON.stringify(defaultVehicle));
        localStorage.setItem(this.KEYS.RUNS, JSON.stringify(mockRuns));
        localStorage.setItem(this.KEYS.MAINTENANCE, JSON.stringify(defaultMaintenance));
        localStorage.setItem(this.KEYS.GOALS, JSON.stringify(defaultGoals));
        localStorage.setItem(this.KEYS.USER, JSON.stringify({ name: 'Carlos Silva', email: 'entregador.pro@gmail.com' }));
    },

    // -------------------------------------------------------------
    // CONTROLE DE SAÍDAS (ROTAS)
    // -------------------------------------------------------------
    getRuns() {
        return JSON.parse(localStorage.getItem(this.KEYS.RUNS)) || [];
    },

    saveRun(run) {
        const runs = this.getRuns();
        run.id = 'r_' + Date.now();
        run.vehicleId = localStorage.getItem(this.KEYS.ACTIVE_VEHICLE); // Vincular a rota ao carro ativo
        runs.unshift(run); // Insere no início
        localStorage.setItem(this.KEYS.RUNS, JSON.stringify(runs));

        // Atualiza quilometragem do veículo se a rota foi mais recente
        const vehicle = this.getVehicle();
        if (vehicle && run.vehicleId === vehicle.id) {
            // Supondo que adicionou km à rodagem
            vehicle.currentKm += parseFloat(run.kmRodados);
            this.saveVehicle(vehicle);
        }
        return runs;
    },

    deleteRun(id) {
        let runs = this.getRuns();
        runs = runs.filter(r => r.id !== id);
        localStorage.setItem(this.KEYS.RUNS, JSON.stringify(runs));
        return runs;
    },

    // -------------------------------------------------------------
    // CONTROLE DO VEÍCULO (MÚLTIPLOS)
    // -------------------------------------------------------------
    getVehicles() {
        return JSON.parse(localStorage.getItem(this.KEYS.VEHICLES)) || [];
    },

    getVehicle() {
        const vehicles = this.getVehicles();
        if (vehicles.length === 0) return null;
        
        const activeId = localStorage.getItem(this.KEYS.ACTIVE_VEHICLE);
        if (activeId) {
            const found = vehicles.find(v => v.id === activeId);
            if (found) return found;
        }
        
        // Se não tem ativo definido, pega o primeiro
        return vehicles[0];
    },

    setActiveVehicle(id) {
        localStorage.setItem(this.KEYS.ACTIVE_VEHICLE, id);
    },

    saveVehicle(vehicle) {
        const vehicles = this.getVehicles();
        const existingIdx = vehicles.findIndex(v => v.id === vehicle.id);
        
        if (!vehicle.fixedCosts.garage) vehicle.fixedCosts.garage = 0.00;
        if (!vehicle.fixedCosts.maintenanceAvg) vehicle.fixedCosts.maintenanceAvg = 0.00;
        if (!vehicle.fixedCosts.internet) vehicle.fixedCosts.internet = 0.00;
        if (!vehicle.fixedCosts.others) vehicle.fixedCosts.others = 0.00;
        
        if (existingIdx !== -1) {
            vehicles[existingIdx] = vehicle;
        } else {
            vehicles.push(vehicle);
            if (vehicles.length === 1) {
                this.setActiveVehicle(vehicle.id);
            }
        }
        localStorage.setItem(this.KEYS.VEHICLES, JSON.stringify(vehicles));
    },

    deleteVehicle(id) {
        let vehicles = this.getVehicles();
        vehicles = vehicles.filter(v => v.id !== id);
        localStorage.setItem(this.KEYS.VEHICLES, JSON.stringify(vehicles));
        if (vehicles.length > 0) {
            this.setActiveVehicle(vehicles[0].id);
        } else {
            localStorage.removeItem(this.KEYS.ACTIVE_VEHICLE);
        }
    },

    // -------------------------------------------------------------
    // MANUTENÇÃO DO VEÍCULO
    // -------------------------------------------------------------
    getMaintenance() {
        return JSON.parse(localStorage.getItem(this.KEYS.MAINTENANCE)) || {};
    },

    saveMaintenanceLog(type, kmRegister, cost) {
        const maint = this.getMaintenance();
        if (maint[type]) {
            maint[type].lastChangedKm = parseInt(kmRegister);
            maint[type].cost = parseFloat(cost);
            localStorage.setItem(this.KEYS.MAINTENANCE, JSON.stringify(maint));
            
            // Também adicionamos ao log geral do carro
            const vehicle = this.getVehicle();
            if (vehicle && parseInt(kmRegister) > vehicle.currentKm) {
                vehicle.currentKm = parseInt(kmRegister);
                this.saveVehicle(vehicle);
            }
        }
        return maint;
    },

    // -------------------------------------------------------------
    // METAS FINANCEIRAS
    // -------------------------------------------------------------
    getGoals() {
        return JSON.parse(localStorage.getItem(this.KEYS.GOALS)) || [];
    },

    saveGoal(goal) {
        const goals = this.getGoals();
        goal.id = 'g_' + Date.now();
        goals.push(goal);
        localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        return goals;
    },

    depositGoal(id, amount) {
        const goals = this.getGoals();
        const goalIndex = goals.findIndex(g => g.id === id);
        if (goalIndex !== -1) {
            goals[goalIndex].currentAmount = parseFloat(goals[goalIndex].currentAmount) + parseFloat(amount);
            localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        }
        return goals;
    },

    // -------------------------------------------------------------
    // ONBOARDING STATUS
    // -------------------------------------------------------------
    isOnboardingDone() {
        return localStorage.getItem(this.KEYS.ONBOARDING) === 'true';
    },

    setOnboardingDone() {
        localStorage.setItem(this.KEYS.ONBOARDING, 'true');
    },

    // -------------------------------------------------------------
    // USUÁRIO
    // -------------------------------------------------------------
    getUser() {
        return JSON.parse(localStorage.getItem(this.KEYS.USER)) || null;
    },

    saveUser(user) {
        localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
    },

    // -------------------------------------------------------------
    // BACKUP E SINCRONIZAÇÃO EM NUVEM (MOCKUP)
    // -------------------------------------------------------------
    syncWithCloud(callback) {
        // Simulação de sincronização em nuvem (2 segundos de delay)
        setTimeout(() => {
            callback({ success: true, timestamp: Date.now() });
        }, 1800);
    },

    // -------------------------------------------------------------
    // RESET TOTAL DOS DADOS
    // -------------------------------------------------------------
    resetAllData(exportFirst = false) {
        if (exportFirst) {
            this.exportBackupData();
        }
        
        // Limpar LocalStorage (apenas as chaves do app)
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Limpar possíveis dados residuais (IndexedDB e Cache) caso existam no futuro
        // window.location.reload() será chamado pela interface
    },

    exportBackupData() {
        const allData = {};
        Object.keys(this.KEYS).forEach(k => {
            const key = this.KEYS[k];
            allData[key] = JSON.parse(localStorage.getItem(key) || 'null');
        });
        
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `rotalucro_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Inicializar banco ao carregar
DB.init();
window.DB = DB;
