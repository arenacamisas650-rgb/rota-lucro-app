/**
 * RotaLucro - Módulo de Banco de Dados Local (Offline-First)
 * Gerencia a persistência via LocalStorage para entregas e corridas de app.
 */

export const DB = {
    // Chaves de armazenamento
    KEYS: {
        USER: 'rotalucro_user',
        RUNS: 'rotalucro_runs',
        RIDES: 'rotalucro_rides',
        VEHICLES: 'rotalucro_vehicles',
        ACTIVE_VEHICLE: 'rotalucro_active_vehicle',
        MAINTENANCE: 'rotalucro_maintenance',
        GOALS: 'rotalucro_goals',
        SETTINGS: 'rotalucro_settings',
        ONBOARDING: 'rotalucro_onboarding_done'
    },

    // Inicialização do Banco de Dados
    init() {
        if (!localStorage.getItem(this.KEYS.VEHICLES)) {
            localStorage.setItem(this.KEYS.VEHICLES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.RUNS)) {
            localStorage.setItem(this.KEYS.RUNS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.RIDES)) {
            localStorage.setItem(this.KEYS.RIDES, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.KEYS.MAINTENANCE)) {
            localStorage.setItem(this.KEYS.MAINTENANCE, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.KEYS.GOALS)) {
            localStorage.setItem(this.KEYS.GOALS, JSON.stringify([]));
        }
    },

    // -------------------------------------------------------------
    // CONTROLE DE SAÍDAS (ENTREGAS)
    // -------------------------------------------------------------
    getRuns() {
        return JSON.parse(localStorage.getItem(this.KEYS.RUNS)) || [];
    },

    saveRun(run) {
        const runs = this.getRuns();
        run.id = 'r_' + Date.now();
        run.type = 'delivery';
        run.vehicleId = localStorage.getItem(this.KEYS.ACTIVE_VEHICLE);
        runs.unshift(run);
        localStorage.setItem(this.KEYS.RUNS, JSON.stringify(runs));

        const vehicle = this.getVehicle();
        if (vehicle && run.vehicleId === vehicle.id) {
            vehicle.currentKm = (parseFloat(vehicle.currentKm) || 0) + parseFloat(run.kmRodados || 0);
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
    // CONTROLE DE CORRIDAS (APPS DE MOBILIDADE)
    // -------------------------------------------------------------
    getRides() {
        return JSON.parse(localStorage.getItem(this.KEYS.RIDES)) || [];
    },

    saveRide(ride) {
        const rides = this.getRides();
        ride.id = 'ride_' + Date.now();
        ride.type = 'ride';
        ride.vehicleId = localStorage.getItem(this.KEYS.ACTIVE_VEHICLE);
        rides.unshift(ride);
        localStorage.setItem(this.KEYS.RIDES, JSON.stringify(rides));

        const vehicle = this.getVehicle();
        if (vehicle && ride.vehicleId === vehicle.id) {
            vehicle.currentKm = (parseFloat(vehicle.currentKm) || 0) + parseFloat(ride.kmRodados || 0);
            this.saveVehicle(vehicle);
        }
        return rides;
    },

    updateRide(updatedRide) {
        let rides = this.getRides();
        const idx = rides.findIndex(r => r.id === updatedRide.id);
        if (idx !== -1) {
            rides[idx] = updatedRide;
            localStorage.setItem(this.KEYS.RIDES, JSON.stringify(rides));
        }
        return rides;
    },

    deleteRide(id) {
        let rides = this.getRides();
        rides = rides.filter(r => r.id !== id);
        localStorage.setItem(this.KEYS.RIDES, JSON.stringify(rides));
        return rides;
    },

    // Retorna todos os registros (entregas + corridas) combinados e ordenados por data
    getAllRecords() {
        const runs = this.getRuns();
        const rides = this.getRides();
        return [...runs, ...rides].sort((a, b) => new Date(b.date) - new Date(a.date));
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

        return vehicles[0];
    },

    setActiveVehicle(id) {
        localStorage.setItem(this.KEYS.ACTIVE_VEHICLE, id);
    },

    saveVehicle(vehicle) {
        const vehicles = this.getVehicles();
        const existingIdx = vehicles.findIndex(v => v.id === vehicle.id);

        if (!vehicle.fixedCosts) vehicle.fixedCosts = {};
        if (vehicle.fixedCosts.garage === undefined) vehicle.fixedCosts.garage = 0;
        if (vehicle.fixedCosts.maintenanceAvg === undefined) vehicle.fixedCosts.maintenanceAvg = 0;
        if (vehicle.fixedCosts.internet === undefined) vehicle.fixedCosts.internet = 0;
        if (vehicle.fixedCosts.others === undefined) vehicle.fixedCosts.others = 0;

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
        if (!maint[type]) {
            maint[type] = { intervalKm: 10000, cost: 0 };
        }
        maint[type].lastChangedKm = parseInt(kmRegister);
        maint[type].cost = parseFloat(cost);
        localStorage.setItem(this.KEYS.MAINTENANCE, JSON.stringify(maint));

        const vehicle = this.getVehicle();
        if (vehicle && parseInt(kmRegister) > (vehicle.currentKm || 0)) {
            vehicle.currentKm = parseInt(kmRegister);
            this.saveVehicle(vehicle);
        }
        return maint;
    },

    // -------------------------------------------------------------
    // METAS FINANCEIRAS — CRUD COMPLETO
    // -------------------------------------------------------------
    getGoals() {
        return JSON.parse(localStorage.getItem(this.KEYS.GOALS)) || [];
    },

    saveGoal(goal) {
        const goals = this.getGoals();
        goal.id = 'g_' + Date.now();
        goal.completed = false;
        goal.createdAt = new Date().toISOString();
        goals.push(goal);
        localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        return goals;
    },

    updateGoal(updatedGoal) {
        let goals = this.getGoals();
        const idx = goals.findIndex(g => g.id === updatedGoal.id);
        if (idx !== -1) {
            goals[idx] = { ...goals[idx], ...updatedGoal };
            localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        }
        return goals;
    },

    deleteGoal(id) {
        let goals = this.getGoals();
        goals = goals.filter(g => g.id !== id);
        localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        return goals;
    },

    depositGoal(id, amount) {
        const goals = this.getGoals();
        const goalIndex = goals.findIndex(g => g.id === id);
        if (goalIndex !== -1) {
            goals[goalIndex].currentAmount = parseFloat(goals[goalIndex].currentAmount || 0) + parseFloat(amount);
            // Marcar como concluída automaticamente se atingiu a meta
            if (goals[goalIndex].currentAmount >= goals[goalIndex].targetAmount) {
                goals[goalIndex].completed = true;
            }
            localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
        }
        return goals;
    },

    completeGoal(id) {
        const goals = this.getGoals();
        const idx = goals.findIndex(g => g.id === id);
        if (idx !== -1) {
            goals[idx].completed = true;
            goals[idx].currentAmount = goals[idx].targetAmount;
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
    // BACKUP E SINCRONIZAÇÃO (MOCKUP)
    // -------------------------------------------------------------
    syncWithCloud(callback) {
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
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
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
