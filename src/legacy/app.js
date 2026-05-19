/**
 * RotaLucro - Controlador Central do Aplicativo (App Core)
 * Gerencia a navegação, formulários, cálculos em tempo real, modais e relatórios.
 */

import { DB } from './db.js';
import { Charts } from './charts.js';

export const App = {
    // Estado temporário em memória
    state: {
        activeTab: 'tab-dashboard',
        user: null,
        vehicle: null,
        runs: [],
        maintenance: {},
        goals: [],
        rides: [],
        alerts: []
    },

    // Inicialização geral
    init() {
        // Carrega dados iniciais do DB
        this.loadData();

        // Mantém a interface legível mesmo se o CDN de ícones falhar no deploy.
        this.setupIconFallbacks();
        
        // Registra todos os Event Listeners
        this.registerEvents();

        // Controla o fluxo inicial (Splash -> Onboarding -> Login -> App)
        this.runAppFlow();
    },

    setupIconFallbacks() {
        const fallbackMap = {
            'bxs-direction-left': 'R',
            'bx-map-pin': 'P',
            'bx-trending-up': '+',
            'bxs-brain': '*',
            'bx-chevron-right': '>',
            'bx-check': '✓',
            'bx-envelope': '@',
            'bx-lock-alt': '•',
            'bx-wifi-off': 'off',
            'bx-car': 'car',
            'bx-bell': '!',
            'bxs-dashboard': '▦',
            'bx-plus': '+',
            'bx-bar-chart-alt-2': '▥',
            'bx-target-lock': '◎',
            'bx-history': '↺',
            'bxs-magic-wand': '✦',
            'bx-up-arrow-alt': '↑',
            'bx-package': '□',
            'bx-transfer-alt': '↔',
            'bx-purchase-tag-alt': '$',
            'bx-gas-pump': 'G',
            'bx-calendar-x': '×',
            'bx-buildings': '▣',
            'bx-tachometer': 'km',
            'bx-wallet': '$',
            'bx-analyse': '◌',
            'bx-check-double': '✓',
            'bx-card': '#',
            'bx-calendar': 'cal',
            'bx-edit-alt': '✎',
            'bx-credit-card': 'card',
            'bx-shield-quarter': '◇',
            'bx-file': 'doc',
            'bx-save': 'save',
            'bx-droplet': 'oil',
            'bx-disc': 'O',
            'bx-wrench': 'fix',
            'bx-error-circle': '!',
            'bx-x': '×',
            'bx-calculator': '=',
            'bx-trophy': '★',
            'bx-downvote': '↓',
            'bx-spreadsheet': 'csv',
            'bx-file-pdf': 'pdf',
            'bx-cloud-upload': '☁',
            'bx-plus-circle': '+'
        };

        window.addEventListener('load', () => {
            setTimeout(() => {
                const probe = document.createElement('i');
                probe.className = 'bx bx-bell';
                probe.style.position = 'absolute';
                probe.style.opacity = '0';
                probe.style.pointerEvents = 'none';
                document.body.appendChild(probe);
                const fontFamily = getComputedStyle(probe).fontFamily.toLowerCase();
                probe.remove();

                if (fontFamily.includes('boxicons')) return;

                document.body.classList.add('icon-fallback');
                document.querySelectorAll('i[class*="bx"]').forEach(icon => {
                    const match = [...icon.classList].find(cls => fallbackMap[cls]);
                    if (match) {
                        icon.textContent = fallbackMap[match];
                        icon.setAttribute('aria-hidden', 'true');
                    }
                });
            }, 800);
        });
    },

    // Carrega dados do LocalStorage para o estado da aplicação
    loadData() {
        this.state.runs = DB.getRuns();
        this.state.vehicle = DB.getVehicle();
        this.state.maintenance = DB.getMaintenance();
        this.state.goals = DB.getGoals();
        this.state.rides = DB.getRides();
        this.state.user = DB.getUser();
    },

    // Salva o estado atualizado no LocalStorage
    saveState() {
        DB.saveVehicle(this.state.vehicle);
        // Os demais são persistidos diretamente pelas funções do DB.js
    },

    // -------------------------------------------------------------
    // CONTROLES DE FLUXO DE TELAS (Splash, Onboarding, Login)
    // -------------------------------------------------------------
    runAppFlow() {
        const splash = document.getElementById('splash-screen');
        const onboarding = document.getElementById('onboarding-screen');
        const login = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');

        // 1. Splash Screen por 1.5s
        setTimeout(() => {
            splash.classList.remove('active');
            
            // Verifica se o Onboarding já foi realizado
            if (!DB.isOnboardingDone()) {
                onboarding.classList.add('active');
                this.setupOnboarding();
            } else if (!this.state.user) {
                login.classList.add('active');
            } else {
                // Vai direto pro aplicativo
                mainApp.classList.add('active');
                
                // Se não tiver veículo configurado, força Primeira Configuração
                if (!DB.getVehicle()) {
                    this.openModal('modal-first-setup');
                }
                
                this.refreshUI();
            }
        }, 1500);
    },

    // Onboarding Slideshow
    setupOnboarding() {
        const slides = document.querySelectorAll('.onboarding-slide');
        const dots = document.querySelectorAll('.onboarding-dots .dot');
        const btnNext = document.getElementById('btn-next-onboarding');
        let currentSlide = 0;

        btnNext.addEventListener('click', () => {
            if (currentSlide < slides.length - 1) {
                // Avança slide
                slides[currentSlide].classList.remove('active');
                dots[currentSlide].classList.remove('active');
                
                currentSlide++;
                
                slides[currentSlide].classList.add('active');
                dots[currentSlide].classList.add('active');

                if (currentSlide === slides.length - 1) {
                    btnNext.innerHTML = 'Começar Agora <i class="bx bx-check"></i>';
                }
            } else {
                // Finaliza Onboarding
                DB.setOnboardingDone();
                document.getElementById('onboarding-screen').classList.remove('active');
                document.getElementById('login-screen').classList.add('active');
            }
        });
    },

    // -------------------------------------------------------------
    // REGISTRO DE EVENTOS (FORMULÁRIOS, BOTÕES E TABS)
    // -------------------------------------------------------------
    registerEvents() {
        // --- Navegação inferior por Abas ---
        const navItems = document.querySelectorAll('.app-bottom-nav .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = item.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Link de "Ver todas" no Dashboard vai para Relatórios
        document.getElementById('view-all-history-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('tab-reports');
        });

        // --- Fluxo de Login Mock ---
        const syncAndEnter = (username, email) => {
            const syncLoader = document.getElementById('sync-loader');
            syncLoader.classList.add('active');
            
            DB.syncWithCloud(() => {
                const user = { name: username, email: email };
                DB.saveUser(user);
                this.state.user = user;
                
                syncLoader.classList.remove('active');
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('main-app').classList.add('active');
                this.refreshUI();
            });
        };

        document.getElementById('btn-login-email').addEventListener('click', () => {
            const email = document.getElementById('login-email').value;
            syncAndEnter('Carlos Silva', email);
        });

        document.getElementById('btn-login-google').addEventListener('click', () => {
            syncAndEnter('Carlos Silva', 'carlos.entregador@gmail.com');
        });

        document.getElementById('btn-login-offline').addEventListener('click', () => {
            syncAndEnter('Carlos Silva (Offline)', 'offline@rotalucro.com');
        });

        // --- MÚLTIPLOS VEÍCULOS (HEADER SELECT) ---
        const activeSelect = document.getElementById('active-vehicle-select');
        if (activeSelect) {
            activeSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'add-new') {
                    // Reseta formulário de adicionar veículo
                    document.getElementById('form-manage-vehicle').reset();
                    document.getElementById('manage-car-id').value = '';
                    document.getElementById('manage-vehicles-title').textContent = 'Cadastrar Novo Veículo';
                    document.getElementById('btn-delete-manage-vehicle').style.display = 'none';
                    this.openModal('modal-manage-vehicles');
                    // Retorna para o carro ativo anterior no select visualmente até criar
                    this.updateHeaderVehicleSelect();
                } else if (val === 'edit-active') {
                    // Editar carro ativo
                    const v = this.state.vehicle;
                    if (v) {
                        document.getElementById('manage-car-id').value = v.id;
                        document.getElementById('manage-car-nickname').value = v.nickname || '';
                        document.getElementById('manage-car-brand').value = v.brand || '';
                        document.getElementById('manage-car-model').value = v.model || '';
                        document.getElementById('manage-car-version').value = v.version || '';
                        document.getElementById('manage-car-year').value = v.year || '';
                        document.getElementById('manage-car-plate').value = v.plate || '';
                        document.getElementById('manage-car-km').value = v.currentKm || 0;
                        document.getElementById('manage-car-fuel').value = v.fuelType || 'Etanol';
                        document.getElementById('manage-car-city').value = v.cityConsumption || '';
                        document.getElementById('manage-car-highway').value = v.highwayConsumption || '';
                        document.getElementById('manage-vehicles-title').textContent = 'Editar Veículo';
                        document.getElementById('btn-delete-manage-vehicle').style.display = 'block';
                        this.openModal('modal-manage-vehicles');
                    }
                    this.updateHeaderVehicleSelect();
                } else {
                    // Trocou de carro
                    DB.setActiveVehicle(val);
                    this.refreshUI();
                }
            });
        }

        // --- SALVAR PRIMEIRO VEÍCULO (FIRST SETUP) ---
        const firstSetupForm = document.getElementById('form-first-setup');
        if (firstSetupForm) {
            firstSetupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const vehicle = {
                    id: 'car_' + Date.now(),
                    nickname: document.getElementById('setup-car-nickname').value,
                    brand: document.getElementById('setup-car-brand').value,
                    model: document.getElementById('setup-car-model').value,
                    version: document.getElementById('setup-car-version').value,
                    year: document.getElementById('setup-car-year').value,
                    plate: document.getElementById('setup-car-plate').value,
                    currentKm: parseInt(document.getElementById('setup-car-km').value) || 0,
                    fuelType: document.getElementById('setup-car-fuel').value,
                    cityConsumption: parseFloat(document.getElementById('setup-car-city').value) || 0,
                    highwayConsumption: parseFloat(document.getElementById('setup-car-highway').value) || 0,
                    fixedCosts: {
                        loan: parseFloat(document.getElementById('setup-cost-loan').value) || 0,
                        insurance: parseFloat(document.getElementById('setup-cost-insurance').value) || 0,
                        ipva: parseFloat(document.getElementById('setup-cost-ipva').value) || 0,
                        garage: parseFloat(document.getElementById('setup-cost-garage').value) || 0,
                        maintenanceAvg: parseFloat(document.getElementById('setup-cost-maint').value) || 0,
                        internet: parseFloat(document.getElementById('setup-cost-internet').value) || 0,
                        others: parseFloat(document.getElementById('setup-cost-others').value) || 0
                    }
                };
                
                DB.saveVehicle(vehicle);
                this.closeModal('modal-first-setup');
                this.refreshUI();
            });
        }

        // --- SALVAR / EDITAR VEÍCULOS (MANAGE) ---
        const manageForm = document.getElementById('form-manage-vehicle');
        if (manageForm) {
            manageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('manage-car-id').value || 'car_' + Date.now();
                // Preserva custos fixos se estiver editando, ou cria default se novo
                const existing = DB.getVehicles().find(v => v.id === id);
                
                const vehicle = {
                    id: id,
                    nickname: document.getElementById('manage-car-nickname').value,
                    brand: document.getElementById('manage-car-brand').value,
                    model: document.getElementById('manage-car-model').value,
                    version: document.getElementById('manage-car-version').value,
                    year: document.getElementById('manage-car-year').value,
                    plate: document.getElementById('manage-car-plate').value,
                    currentKm: parseInt(document.getElementById('manage-car-km').value) || 0,
                    fuelType: document.getElementById('manage-car-fuel').value,
                    cityConsumption: parseFloat(document.getElementById('manage-car-city').value) || 0,
                    highwayConsumption: parseFloat(document.getElementById('manage-car-highway').value) || 0,
                    fixedCosts: existing ? existing.fixedCosts : {
                        loan: 0, insurance: 0, ipva: 0, garage: 0, maintenanceAvg: 0, internet: 0, others: 0
                    }
                };
                
                DB.saveVehicle(vehicle);
                this.closeModal('modal-manage-vehicles');
                this.refreshUI();
            });
        }
        
        document.getElementById('btn-close-manage-vehicles-modal')?.addEventListener('click', () => this.closeModal('modal-manage-vehicles'));
        
        document.getElementById('btn-delete-manage-vehicle')?.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir este veículo?')) {
                const id = document.getElementById('manage-car-id').value;
                DB.deleteVehicle(id);
                this.closeModal('modal-manage-vehicles');
                this.refreshUI();
            }
        });

        // --- CONFIGURAÇÕES & RESET (CLICK NO AVATAR) ---
        document.getElementById('user-avatar-img')?.addEventListener('click', () => {
            this.openModal('modal-settings');
        });
        document.getElementById('btn-close-settings-modal')?.addEventListener('click', () => this.closeModal('modal-settings'));
        
        document.getElementById('btn-export-backup')?.addEventListener('click', () => {
            DB.exportBackupData();
        });
        
        document.getElementById('btn-reset-app')?.addEventListener('click', () => {
            if (confirm('ATENÇÃO: Todos os dados serão apagados permanentemente!\n\nDeseja baixar um backup primeiro? Clique "Cancelar" para sair ou "OK" para prosseguir com a exclusão.')) {
                if (confirm('Tem certeza absoluta? Esta ação não pode ser desfeita.')) {
                    DB.resetAllData(true); // exporta backup antes de apagar e reinicia
                    window.location.reload();
                }
            }
        });

        // --- CÁLCULO EM TEMPO REAL NO CADASTRO DE ROTAS ---
        const routeInputs = [
            'route-earning', 'route-packages', 'route-km', 
            'route-fuel-price', 'route-car-efficiency', 
            'route-toll', 'route-food', 'route-parking'
        ];
        const routeDateInput = document.getElementById('route-date');
        if (routeDateInput) {
            routeDateInput.value = new Date().toISOString().split('T')[0];
            routeDateInput.max = new Date().toISOString().split('T')[0];
        }
        routeInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateLiveRouteEstimation());
            }
        });
        document.getElementById('route-fuel-type').addEventListener('change', () => {
            // Atualiza preço padrão baseado no tipo
            const fuelType = document.getElementById('route-fuel-type').value;
            const priceField = document.getElementById('route-fuel-price');
            if (fuelType === 'Gasolina') priceField.value = '5.59';
            else if (fuelType === 'Etanol') priceField.value = '3.79';
            else if (fuelType === 'Diesel') priceField.value = '5.90';
            else if (fuelType === 'GNV') priceField.value = '4.69';
            this.calculateLiveRouteEstimation();
        });

        // --- MÁSCARAS DE INPUT ---
        const plateInputs = document.querySelectorAll('.mask-plate');
        plateInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (val.length > 7) val = val.slice(0, 7);
                if (val.length > 3) {
                    val = val.slice(0, 3) + '-' + val.slice(3);
                }
                e.target.value = val;
            });
        });

        // --- SALVAR NOVA ROTA ---
        document.getElementById('route-registration-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRegisteredRoute();
        });

        // --- SALVAR CUSTOS FIXOS DO VEÍCULO ---
        document.getElementById('btn-save-fixed-costs').addEventListener('click', () => {
            this.saveVehicleFixedCosts();
        });

        // --- FILTROS DE HISTÓRICO ---
        document.getElementById('filter-platform').addEventListener('change', () => this.renderHistoryTab());
        document.getElementById('filter-month').addEventListener('change', () => this.renderHistoryTab());
        document.getElementById('btn-reset-filters').addEventListener('click', () => {
            document.getElementById('filter-platform').value = 'all';
            document.getElementById('filter-month').value = 'all';
            this.renderHistoryTab();
        });

        // --- EXPORTAÇÕES ---
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportHistoryCSV());
        document.getElementById('btn-export-pdf').addEventListener('click', () => window.print());

        // --- MODAIS GERAIS (Abre/Fecha) ---
        // 1. Odômetro
        document.getElementById('btn-update-odometer').addEventListener('click', () => {
            document.getElementById('new-odometer-km').value = this.state.vehicle.currentKm;
            this.openModal('modal-odometer');
        });
        document.getElementById('btn-close-odo-modal').addEventListener('click', () => this.closeModal('modal-odometer'));
        document.getElementById('btn-cancel-odo-modal').addEventListener('click', () => this.closeModal('modal-odometer'));
        document.getElementById('form-update-odometer').addEventListener('submit', (e) => {
            e.preventDefault();
            const newKm = parseInt(document.getElementById('new-odometer-km').value);
            this.state.vehicle.currentKm = newKm;
            this.saveState();
            this.closeModal('modal-odometer');
            this.refreshUI();
        });

        // 2. Metas
        document.getElementById('btn-open-create-goal-modal').addEventListener('click', () => {
            // Seta data mínima de hoje
            document.getElementById('goal-deadline').value = new Date().toISOString().split('T')[0];
            this.openModal('modal-new-goal');
        });
        document.getElementById('btn-close-goal-modal').addEventListener('click', () => this.closeModal('modal-new-goal'));
        document.getElementById('btn-cancel-goal-modal').addEventListener('click', () => this.closeModal('modal-new-goal'));
        document.getElementById('form-create-goal').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNewGoal();
        });

        // 3. Depósito de Metas
        document.getElementById('btn-close-deposit-modal').addEventListener('click', () => this.closeModal('modal-goal-deposit'));
        document.getElementById('btn-cancel-deposit-modal').addEventListener('click', () => this.closeModal('modal-goal-deposit'));
        document.getElementById('form-goal-deposit').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGoalDeposit();
        });

        // 4. Registrar Troca / Manutenção
        document.getElementById('btn-add-maintenance-log').addEventListener('click', () => {
            document.getElementById('maint-km').value = this.state.vehicle.currentKm;
            this.openModal('modal-maintenance-log');
        });
        document.getElementById('btn-close-maint-modal').addEventListener('click', () => this.closeModal('modal-maintenance-log'));
        document.getElementById('btn-cancel-maint-modal').addEventListener('click', () => this.closeModal('modal-maintenance-log'));
        document.getElementById('form-register-maint').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMaintenanceRegistration();
        });

        // --- GAVETA DE ALERTAS NOTIFICAÇÕES ---
        document.getElementById('btn-alerts-panel').addEventListener('click', () => {
            document.getElementById('alerts-drawer').classList.add('active');
            this.renderAlertsDrawer();
        });
        document.getElementById('btn-close-drawer').addEventListener('click', () => {
            document.getElementById('alerts-drawer').classList.remove('active');
        });
        document.getElementById('btn-clear-alerts').addEventListener('click', () => {
            this.state.alerts = [];
            document.getElementById('alerts-count-badge').style.display = 'none';
            document.getElementById('alerts-drawer').classList.remove('active');
            this.refreshUI();
        });

        // --- RIDE FORM EVENTS ---
        const rideInputs = ['ride-earning','ride-hours','ride-km','ride-fuel','ride-tolls','ride-app-fee','ride-tips','ride-food'];
        rideInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calculateLiveRideEstimation());
        });
        const rideDateInput = document.getElementById('ride-date');
        if (rideDateInput) { rideDateInput.value = new Date().toISOString().split('T')[0]; }
        const rideForm = document.getElementById('ride-registration-form');
        if (rideForm) rideForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveRegisteredRide(); });

        // --- EDIT GOAL MODAL ---
        document.getElementById('btn-close-edit-goal-modal')?.addEventListener('click', () => this.closeModal('modal-edit-goal'));
        document.getElementById('btn-cancel-edit-goal')?.addEventListener('click', () => this.closeModal('modal-edit-goal'));
        document.getElementById('form-edit-goal')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveEditedGoal(); });

        // --- REPORT TYPE FILTER ---
        document.getElementById('filter-type')?.addEventListener('change', () => this.renderHistoryTab());
    },

    // Navegação entre abas
    switchTab(tabId) {
        // Remove classes ativas antigas
        document.querySelectorAll('.app-bottom-nav .nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            }
        });

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Ativa aba nova
        const activeTabEl = document.getElementById(tabId);
        if (activeTabEl) {
            activeTabEl.classList.add('active');
            this.state.activeTab = tabId;
            
            // Executa renderizadores específicos para cada aba aberta
            if (tabId === 'tab-dashboard') {
                this.renderDashboard();
            } else if (tabId === 'tab-vehicle') {
                this.renderVehicleTab();
            } else if (tabId === 'tab-mobility') {
                this.renderMobilityTab();
            } else if (tabId === 'tab-goals') {
                this.renderGoalsTab();
            } else if (tabId === 'tab-reports') {
                this.renderHistoryTab();
            }
        }
    },

    // Controle de Modais
    openModal(id) {
        document.getElementById(id).classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    // -------------------------------------------------------------
    // ATUALIZAÇÃO DA INTERFACE DO APLICATIVO
    // -------------------------------------------------------------
    updateHeaderVehicleSelect() {
        const select = document.getElementById('active-vehicle-select');
        if (!select) return;
        
        const vehicles = DB.getVehicles();
        const active = DB.getVehicle();
        
        select.innerHTML = '';
        vehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.model} (${v.plate || v.year})`;
            if (active && active.id === v.id) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        
        if (active) {
            const editOpt = document.createElement('option');
            editOpt.value = 'edit-active';
            editOpt.textContent = '✎ Editar Veículo Ativo';
            select.appendChild(editOpt);
        }
        
        const addOpt = document.createElement('option');
        addOpt.value = 'add-new';
        addOpt.textContent = '+ Cadastrar Novo Carro';
        select.appendChild(addOpt);
    },

    refreshUI() {
        this.loadData();
        
        // Define nome do usuário
        if (this.state.user) {
            document.getElementById('header-username').textContent = this.state.user.name;
        }
        
        this.updateHeaderVehicleSelect();

        // Calcula alertas ativos para atualizar sino de notificações
        this.calculateAlerts();

        // Recarrega aba corrente
        this.switchTab(this.state.activeTab);
    },

    // Calcula os alertas mecânicos e financeiros do motorista
    calculateAlerts() {
        const vehicle = this.state.vehicle;
        const maint = this.state.maintenance;
        const alerts = [];

        if (!vehicle || !maint) {
            this.state.alerts = alerts;
            return;
        }

        if (maint.oil && maint.oil.lastChangedKm !== undefined) {
            const oilRemaining = (maint.oil.lastChangedKm + maint.oil.intervalKm) - vehicle.currentKm;
            if (oilRemaining <= 0) {
                alerts.push({ type: 'danger', title: 'Óleo do motor VENCIDO', desc: `Ultrapassou ${Math.abs(oilRemaining)} km. Troque urgente!` });
            } else if (oilRemaining <= 1500) {
                alerts.push({ type: 'warning', title: 'Troca de Óleo Próxima', desc: `Restam ${oilRemaining} km para a próxima troca.` });
            }
        }

        if (maint.tires && maint.tires.lastChangedKm !== undefined) {
            const tireRemaining = (maint.tires.lastChangedKm + maint.tires.intervalKm) - vehicle.currentKm;
            if (tireRemaining <= 0) {
                alerts.push({ type: 'warning', title: 'Alinhamento vencido', desc: `Passaram ${Math.abs(tireRemaining)} km do rodízio sugerido.` });
            }
        }

        if (maint.brakes && maint.brakes.lastChangedKm !== undefined) {
            const brakeRemaining = (maint.brakes.lastChangedKm + maint.brakes.intervalKm) - vehicle.currentKm;
            if (brakeRemaining <= 0) {
                alerts.push({ type: 'danger', title: 'Pastilhas de freio críticas!', desc: `Ultrapassou em ${Math.abs(brakeRemaining)} km. Risco de segurança.` });
            }
        }

        this.state.alerts = alerts;
        const badge = document.getElementById('alerts-count-badge');
        if (alerts.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = alerts.length;
        } else {
            badge.style.display = 'none';
        }
    },

    // -------------------------------------------------------------
    // ABA 1: DASHBOARD
    // -------------------------------------------------------------
    renderDashboard() {
        const runs = this.state.runs;
        
        // --- 1. Cálculos de Lucro Total do Mês Atual ---
        let totalGross = 0;
        let totalExpense = 0;
        let totalPackages = 0;
        let totalKm = 0;

        runs.forEach(run => {
            totalGross += parseFloat(run.grossEarning);
            totalExpense += parseFloat(run.totalExpense);
            totalPackages += parseInt(run.packages);
            totalKm += parseFloat(run.kmRodados);
        });

        const totalNet = totalGross - totalExpense;
        const avgPackageProfit = totalPackages > 0 ? (totalNet / totalPackages) : 0;
        const costPerKm = totalKm > 0 ? (totalExpense / totalKm) : 0;

        // Atualiza a UI do topo
        document.getElementById('dash-net-profit').textContent = this.formatCurrency(totalNet);
        document.getElementById('dash-gross-earning').textContent = this.formatCurrency(totalGross);
        document.getElementById('dash-total-expense').textContent = this.formatCurrency(totalExpense);
        
        // Estatísticas de Hoje e Semana
        const todayStr = new Date().toISOString().split('T')[0];
        let profitToday = 0;
        let profitWeek = 0;
        
        // Calcula semana corrente (últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        runs.forEach(run => {
            if (run.date === todayStr) {
                profitToday += parseFloat(run.netProfit);
            }
            if (new Date(run.date + 'T00:00:00') >= sevenDaysAgo) {
                profitWeek += parseFloat(run.netProfit);
            }
        });

        document.getElementById('dash-profit-today').textContent = this.formatCurrency(profitToday);
        document.getElementById('dash-profit-week').textContent = this.formatCurrency(profitWeek);

        // Indicadores secundários
        document.getElementById('dash-total-packages').textContent = totalPackages;
        document.getElementById('dash-total-km').textContent = `${Math.round(totalKm)} km`;
        document.getElementById('dash-avg-package-profit').textContent = this.formatCurrency(avgPackageProfit);
        document.getElementById('dash-cost-per-km').textContent = this.formatCurrency(costPerKm);

        // --- 2. RENDERIZAR GRÁFICOS ---
        Charts.drawEarningsChart('earnings-chart-box', runs);
        Charts.drawPlatformDonut('platform-chart-box', runs);

        // --- 3. LISTA DE ÚLTIMAS 3 ROTAS ---
        const recentBox = document.getElementById('dashboard-recent-routes');
        recentBox.innerHTML = '';
        const limitRuns = runs.slice(0, 3);

        if (limitRuns.length === 0) {
            recentBox.innerHTML = `
                <div class="empty-state">
                    <i class="bx bx-calendar-x"></i>
                    <p>Nenhuma rota salva. Clique em "Nova Rota" para registrar.</p>
                </div>`;
        } else {
            limitRuns.forEach(run => {
                const dateObj = new Date(run.date + 'T00:00:00');
                const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const logoClass = this.getPlatformLogoClass(run.platform);

                const item = document.createElement('div');
                item.className = 'route-item';
                item.innerHTML = `
                    <div class="route-left">
                        <div class="platform-badge-logo ${logoClass}">
                            ${run.platform.charAt(0)}
                        </div>
                        <div class="route-details">
                            <span class="route-platform-name">${run.platform}</span>
                            <span class="route-sub-meta">${dateStr} • ${run.packages} pacotes • ${run.kmRodados} km</span>
                        </div>
                    </div>
                    <div class="route-right">
                        <span class="route-profit-val text-emerald">+ ${this.formatCurrency(run.netProfit)}</span>
                        <span class="route-calc-sub">líquido real</span>
                    </div>
                `;
                recentBox.appendChild(item);
            });
        }

        // --- 4. SOURCE BREAKDOWN (Entregas vs Corridas) ---
        const breakdownBox = document.getElementById('source-breakdown');
        if (breakdownBox) {
            const rides = this.state.rides;
            let rideGross = 0, rideNet = 0, rideHours = 0;
            rides.forEach(r => { rideGross += parseFloat(r.grossEarning || 0); rideNet += parseFloat(r.netProfit || 0); rideHours += parseFloat(r.hoursWorked || 0); });
            breakdownBox.innerHTML = `
                <div class="source-card delivery-source">
                    <i class="bx bx-package"></i>
                    <div><span class="source-label">Entregas</span><strong class="text-emerald">${this.formatCurrency(totalNet)}</strong></div>
                </div>
                <div class="source-card ride-source">
                    <i class="bx bx-car"></i>
                    <div><span class="source-label">Corridas</span><strong class="text-blue">${this.formatCurrency(rideNet)}</strong></div>
                </div>`;
        }

        // --- 5. RANKING DE PLATAFORMAS ---
        const rankBox = document.getElementById('dashboard-platform-ranking');
        if (rankBox) {
            const allRecords = [...runs, ...this.state.rides];
            const pStats = {};
            allRecords.forEach(r => {
                const p = r.platform;
                if (!pStats[p]) pStats[p] = { totalNet: 0, count: 0, hours: 0 };
                pStats[p].totalNet += parseFloat(r.netProfit || 0);
                pStats[p].count++;
                pStats[p].hours += parseFloat(r.hoursWorked || 0);
            });
            const ranked = Object.keys(pStats).map(p => ({ platform: p, ...pStats[p], avg: pStats[p].count > 0 ? pStats[p].totalNet / pStats[p].count : 0 })).sort((a, b) => b.totalNet - a.totalNet);
            rankBox.innerHTML = '';
            if (ranked.length === 0) {
                rankBox.innerHTML = '<div class="empty-state"><p>Sem dados para ranking.</p></div>';
            } else {
                ranked.forEach((d, i) => {
                    const item = document.createElement('div');
                    item.className = 'ranking-item';
                    item.innerHTML = `<div class="rank-pos">${i+1}</div><div class="rank-details"><h5>${d.platform}</h5><span>${this.formatCurrency(d.avg)} m\u00e9dia por registro</span></div><div class="rank-score text-emerald">${this.formatCurrency(d.totalNet)}</div>`;
                    rankBox.appendChild(item);
                });
            }
        }

        // --- 6. CONSELHEIRO INTELIGENTE ---
        this.generateSmartAdvice(totalNet, totalPackages, avgPackageProfit);
    },

    // Inteligência Financeira Preditiva
    generateSmartAdvice(totalNet, totalPackages, avgPackageProfit) {
        const advisorText = document.getElementById('advisor-message');
        const alerts = this.state.alerts;
        const runs = this.state.runs;

        // Se houver alerta grave mecânico
        if (alerts.length > 0 && alerts[0].type === 'danger') {
            advisorText.textContent = `Mecânica: ${alerts[0].title}. ${alerts[0].desc}`;
            return;
        }

        // Se combustível está muito pesado
        let totalFuel = 0;
        let totalEarning = 0;
        runs.forEach(r => {
            totalFuel += parseFloat(r.fuelCost || 0);
            totalEarning += parseFloat(r.grossEarning || 0);
        });
        const fuelPct = totalEarning > 0 ? (totalFuel / totalEarning) * 100 : 0;

        if (fuelPct > 22) {
            advisorText.textContent = `Atenção: O combustível consumiu ${fuelPct.toFixed(1)}% do seu faturamento bruto. Melhore o consumo mantendo pneus calibrados e rotas curtas.`;
            return;
        }

        // Dica de Rentabilidade por pacote
        if (avgPackageProfit > 0 && avgPackageProfit < 3.20) {
            advisorText.textContent = `Alerta de Lucro: Sua margem média por pacote está baixa (R$ ${avgPackageProfit.toFixed(2)}). Procure focar em rotas da Amazon ou Mercado Livre que pagam mais por volume.`;
            return;
        }

        // Projeção saudável por padrão
        advisorText.textContent = `Parabéns Carlos! Se manter a média diária de faturamento atual de R$ 195 líquidos, você baterá a prestação do veículo com folga em apenas 3 dias.`;
    },

    // -------------------------------------------------------------
    // ABA 2: CÁLCULOS E REGISTRO DE ROTAS
    // -------------------------------------------------------------
    calculateLiveRouteEstimation() {
        const earning = parseFloat(document.getElementById('route-earning').value) || 0;
        const packages = parseInt(document.getElementById('route-packages').value) || 0;
        const km = parseFloat(document.getElementById('route-km').value) || 0;
        const fuelPrice = parseFloat(document.getElementById('route-fuel-price').value) || 0;
        const efficiency = parseFloat(document.getElementById('route-car-efficiency').value) || 1;
        
        const tolls = parseFloat(document.getElementById('route-toll').value) || 0;
        const food = parseFloat(document.getElementById('route-food').value) || 0;
        const parking = parseFloat(document.getElementById('route-parking').value) || 0;

        // Cálculos
        const fuelCost = (km / efficiency) * fuelPrice;
        const totalExpenses = fuelCost + tolls + food + parking;
        const netProfit = earning - totalExpenses;
        const profitPerPackage = packages > 0 ? (netProfit / packages) : 0;
        const marginPct = earning > 0 ? (netProfit / earning) * 100 : 0;

        // Atualiza a UI da estimativa
        document.getElementById('live-fuel-cost').textContent = this.formatCurrency(fuelCost);
        document.getElementById('live-total-cost').textContent = this.formatCurrency(totalExpenses);
        
        const netProfitEl = document.getElementById('live-net-profit');
        netProfitEl.textContent = this.formatCurrency(netProfit);
        if (netProfit < 0) {
            netProfitEl.className = 'calc-value text-red font-bold';
        } else {
            netProfitEl.className = 'calc-value text-emerald font-bold';
        }

        document.getElementById('live-package-profit').textContent = this.formatCurrency(profitPerPackage);

        // Preenche Barra de Margem
        const meterFill = document.getElementById('live-profit-meter');
        const marginPctEl = document.getElementById('live-margin-pct');
        
        marginPctEl.textContent = `${Math.max(0, Math.round(marginPct))}%`;
        meterFill.style.width = `${Math.min(100, Math.max(0, marginPct))}%`;

        // Inteligência de cor da barra
        if (marginPct < 30) {
            meterFill.className = 'meter-fill bg-red';
            marginPctEl.className = 'text-red font-bold';
        } else if (marginPct < 60) {
            meterFill.className = 'meter-fill bg-gold';
            marginPctEl.className = 'text-gold font-bold';
        } else {
            meterFill.className = 'meter-fill bg-emerald';
            marginPctEl.className = 'text-emerald font-bold';
        }
    },

    saveRegisteredRoute() {
        const platform = document.getElementById('route-platform').value;
        const earning = parseFloat(document.getElementById('route-earning').value);
        const packages = parseInt(document.getElementById('route-packages').value);
        const km = parseFloat(document.getElementById('route-km').value);
        const routeDate = document.getElementById('route-date')?.value || new Date().toISOString().split('T')[0];
        const fuelType = document.getElementById('route-fuel-type').value;
        const fuelPrice = parseFloat(document.getElementById('route-fuel-price').value);
        const efficiency = parseFloat(document.getElementById('route-car-efficiency').value);
        
        const tolls = parseFloat(document.getElementById('route-toll').value) || 0;
        const food = parseFloat(document.getElementById('route-food').value) || 0;
        const parking = parseFloat(document.getElementById('route-parking').value) || 0;

        // Recalcula custos exatos para salvar
        const fuelCost = (km / efficiency) * fuelPrice;
        const totalExpenses = fuelCost + tolls + food + parking;
        const netProfit = earning - totalExpenses;
        const profitPerPackage = packages > 0 ? (netProfit / packages) : 0;
        const profitPerKm = km > 0 ? (netProfit / km) : 0;

        const newRun = {
            date: routeDate,
            platform,
            grossEarning: earning,
            packages,
            kmRodados: km,
            fuelType,
            fuelPrice,
            efficiency,
            tolls,
            food,
            parking,
            otherExpenses: 0.00,
            fuelCost,
            totalExpense: totalExpenses,
            netProfit,
            profitPerPackage,
            profitPerKm
        };

        // Salva no DB local
        DB.saveRun(newRun);

        // Feedback visual de sucesso e redirecionamento pro Dashboard
        alert('Rota salva com sucesso! O odômetro do veículo e os dados financeiros foram atualizados.');
        
        // Reseta formulário
        document.getElementById('route-registration-form').reset();
        const routeDateInput = document.getElementById('route-date');
        if (routeDateInput) {
            routeDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Zera UI de estimativa
        this.calculateLiveRouteEstimation();

        // Atualiza e volta pro Dashboard
        this.refreshUI();
        this.switchTab('tab-dashboard');
    },

    // -------------------------------------------------------------
    // ABA 3: CONTROLE DO CARRO & MANUTENÇÃO
    // -------------------------------------------------------------
    renderVehicleTab() {
        const vehicle = this.state.vehicle;
        const maint = this.state.maintenance;

        if (!vehicle || !maint) return;

        // Atualiza cabeçalho do carro
        const nicknameEl = document.getElementById('car-card-nickname');
        if (nicknameEl) nicknameEl.textContent = vehicle.nickname || vehicle.model;
        document.getElementById('car-card-model').textContent = `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.version || ''}`.trim() || 'Veículo não identificado';
        document.getElementById('car-card-plate').textContent = vehicle.plate || 'S/ Placa';
        document.getElementById('car-card-year').textContent = vehicle.year || '----';
        document.getElementById('car-card-km').textContent = `${(vehicle.currentKm || 0).toLocaleString()} km`;

        // Preenche campos de custos fixos
        document.getElementById('car-fixed-loan').value = vehicle.fixedCosts.loan || 0;
        document.getElementById('car-fixed-insurance').value = vehicle.fixedCosts.insurance || 0;
        document.getElementById('car-fixed-ipva').value = vehicle.fixedCosts.ipva || 0;
        document.getElementById('car-fixed-garage').value = vehicle.fixedCosts.garage || 0;
        if (document.getElementById('car-fixed-maint')) document.getElementById('car-fixed-maint').value = vehicle.fixedCosts.maintenanceAvg || 0;
        if (document.getElementById('car-fixed-internet')) document.getElementById('car-fixed-internet').value = vehicle.fixedCosts.internet || 0;
        if (document.getElementById('car-fixed-others')) document.getElementById('car-fixed-others').value = vehicle.fixedCosts.others || 0;

        const totalFixed = parseFloat(vehicle.fixedCosts.loan || 0) + 
                           parseFloat(vehicle.fixedCosts.insurance || 0) + 
                           parseFloat(vehicle.fixedCosts.ipva || 0) + 
                           parseFloat(vehicle.fixedCosts.garage || 0) +
                           parseFloat(vehicle.fixedCosts.maintenanceAvg || 0) +
                           parseFloat(vehicle.fixedCosts.internet || 0) +
                           parseFloat(vehicle.fixedCosts.others || 0);
        document.getElementById('car-fixed-total-label').textContent = `${this.formatCurrency(totalFixed)} /mês`;

        // --- MANUTENÇÃO PREDITIVA ---
        // 1. Óleo
        if (maint.oil && maint.oil.lastChangedKm !== undefined) {
            const oilPassed = vehicle.currentKm - maint.oil.lastChangedKm;
            const oilPct = Math.min(100, Math.max(0, (oilPassed / maint.oil.intervalKm) * 100));
            const oilRemaining = maint.oil.intervalKm - oilPassed;
            document.getElementById('oil-progress-bar').style.width = `${oilPct}%`;
            document.getElementById('oil-km-fraction').textContent = `${oilPassed.toLocaleString()} / ${maint.oil.intervalKm.toLocaleString()} km`;
            const oilLbl = document.getElementById('oil-remaining-km');
            if (oilRemaining <= 0) {
                oilLbl.textContent = 'Trocar urgente!';
                oilLbl.className = 'maint-remaining-lbl text-red font-bold';
                document.getElementById('oil-progress-bar').className = 'maint-fill bg-red';
            } else {
                oilLbl.textContent = `Restam ${oilRemaining.toLocaleString()} km`;
                oilLbl.className = 'maint-remaining-lbl text-emerald';
                document.getElementById('oil-progress-bar').className = 'maint-fill bg-emerald';
            }
        }

        // 2. Pneus
        if (maint.tires && maint.tires.lastChangedKm !== undefined) {
            const tirePassed = vehicle.currentKm - maint.tires.lastChangedKm;
            const tirePct = Math.min(100, Math.max(0, (tirePassed / maint.tires.intervalKm) * 100));
            const tireRemaining = maint.tires.intervalKm - tirePassed;
            document.getElementById('tire-progress-bar').style.width = `${tirePct}%`;
            document.getElementById('tire-km-fraction').textContent = `${tirePassed.toLocaleString()} / ${maint.tires.intervalKm.toLocaleString()} km`;
            const tireLbl = document.getElementById('tire-remaining-km');
            if (tireRemaining <= 0) {
                tireLbl.textContent = 'Fazer Rodízio / Calibrar!';
                tireLbl.className = 'maint-remaining-lbl text-red font-bold';
                document.getElementById('tire-progress-bar').className = 'maint-fill bg-red';
            } else {
                tireLbl.textContent = `Restam ${tireRemaining.toLocaleString()} km`;
                tireLbl.className = 'maint-remaining-lbl text-blue';
                document.getElementById('tire-progress-bar').className = 'maint-fill bg-blue';
            }
        }

        // 3. Freios
        if (maint.brakes && maint.brakes.lastChangedKm !== undefined) {
            const brakePassed = vehicle.currentKm - maint.brakes.lastChangedKm;
            const brakePct = Math.min(100, Math.max(0, (brakePassed / maint.brakes.intervalKm) * 100));
            const brakeRemaining = maint.brakes.intervalKm - brakePassed;
            document.getElementById('brakes-progress-bar').style.width = `${brakePct}%`;
            document.getElementById('brakes-km-fraction').textContent = `${brakePassed.toLocaleString()} / ${maint.brakes.intervalKm.toLocaleString()} km`;
            const brakeLbl = document.getElementById('brakes-remaining-km');
            if (brakeRemaining <= 0) {
                brakeLbl.textContent = 'Trocar pastilhas urgente!';
                brakeLbl.className = 'maint-remaining-lbl text-red font-bold';
                document.getElementById('brakes-progress-bar').className = 'maint-fill bg-red';
            } else {
                brakeLbl.textContent = `Restam ${brakeRemaining.toLocaleString()} km`;
                brakeLbl.className = 'maint-remaining-lbl text-emerald';
                document.getElementById('brakes-progress-bar').className = 'maint-fill bg-emerald';
            }
        }

        // --- PAINEL DE ALERTAS ATIVOS ---
        const alertListEl = document.getElementById('car-alerts-list');
        alertListEl.innerHTML = '';

        if (this.state.alerts.length === 0) {
            alertListEl.innerHTML = `
                <div class="alert-item warning" style="border-left-color: var(--emerald); background: rgba(16, 185, 129, 0.04);">
                    <i class="bx bx-check-shield text-emerald alert-item-icon" style="font-size: 1.3rem;"></i>
                    <div class="alert-item-content">
                        <h5>Veículo em dia</h5>
                        <p>Nenhum alerta de manutenção ou custo vencido no momento.</p>
                    </div>
                    <span class="alert-date">Seguro</span>
                </div>`;
        } else {
            this.state.alerts.forEach(alert => {
                const item = document.createElement('div');
                item.className = `alert-item ${alert.type}`;
                item.innerHTML = `
                    <i class="bx bx-error-circle alert-item-icon"></i>
                    <div class="alert-item-content">
                        <h5>${alert.title}</h5>
                        <p>${alert.desc}</p>
                    </div>
                    <span class="alert-date">${alert.type === 'danger' ? 'Crítico' : 'Aviso'}</span>
                `;
                alertListEl.appendChild(item);
            });
        }
    },

    saveVehicleFixedCosts() {
        const loan = parseFloat(document.getElementById('car-fixed-loan').value) || 0;
        const ins = parseFloat(document.getElementById('car-fixed-insurance').value) || 0;
        const ipva = parseFloat(document.getElementById('car-fixed-ipva').value) || 0;
        const garage = parseFloat(document.getElementById('car-fixed-garage').value) || 0;
        const maint = document.getElementById('car-fixed-maint') ? parseFloat(document.getElementById('car-fixed-maint').value) || 0 : 0;
        const internet = document.getElementById('car-fixed-internet') ? parseFloat(document.getElementById('car-fixed-internet').value) || 0 : 0;
        const others = document.getElementById('car-fixed-others') ? parseFloat(document.getElementById('car-fixed-others').value) || 0 : 0;

        this.state.vehicle.fixedCosts.loan = loan;
        this.state.vehicle.fixedCosts.insurance = ins;
        this.state.vehicle.fixedCosts.ipva = ipva;
        this.state.vehicle.fixedCosts.garage = garage;
        this.state.vehicle.fixedCosts.maintenanceAvg = maint;
        this.state.vehicle.fixedCosts.internet = internet;
        this.state.vehicle.fixedCosts.others = others;

        this.saveState();
        alert('Custos fixos mensais atualizados!');
        this.refreshUI();
    },

    saveMaintenanceRegistration() {
        const type = document.getElementById('maint-type').value;
        const km = parseInt(document.getElementById('maint-km').value);
        const cost = parseFloat(document.getElementById('maint-cost').value);

        DB.saveMaintenanceLog(type, km, cost);
        
        alert('Manutenção registrada com sucesso!');
        this.closeModal('modal-maintenance-log');
        this.refreshUI();
    },

    // GAVETA DE ALERTAS NOTIFICAÇÕES (Header Sino)
    renderAlertsDrawer() {
        const box = document.getElementById('drawer-alerts-list');
        box.innerHTML = '';

        if (this.state.alerts.length === 0) {
            box.innerHTML = `
                <div class="empty-state">
                    <i class="bx bx-notification-off"></i>
                    <p>Sem notificações no momento.</p>
                </div>`;
        } else {
            this.state.alerts.forEach(alert => {
                const item = document.createElement('div');
                item.className = `alert-item ${alert.type}`;
                item.innerHTML = `
                    <i class="bx bx-notification alert-item-icon"></i>
                    <div class="alert-item-content">
                        <h5 style="color: #FFFFFF; font-weight:700;">${alert.title}</h5>
                        <p style="margin-top: 4px; font-size: 0.75rem;">${alert.desc}</p>
                    </div>
                `;
                box.appendChild(item);
            });
        }
    },

    // -------------------------------------------------------------
    // ABA 4: MOBILIDADE (APPS DE CORRIDA)
    // -------------------------------------------------------------
    calculateLiveRideEstimation() {
        const earning = parseFloat(document.getElementById('ride-earning').value) || 0;
        const hours = parseFloat(document.getElementById('ride-hours').value) || 0;
        const km = parseFloat(document.getElementById('ride-km').value) || 0;
        const fuel = parseFloat(document.getElementById('ride-fuel').value) || 0;
        const tolls = parseFloat(document.getElementById('ride-tolls').value) || 0;
        const appFee = parseFloat(document.getElementById('ride-app-fee').value) || 0;
        const tips = parseFloat(document.getElementById('ride-tips').value) || 0;
        const food = parseFloat(document.getElementById('ride-food').value) || 0;

        const totalCost = fuel + tolls + appFee + food;
        const netProfit = earning + tips - totalCost;
        const perHour = hours > 0 ? netProfit / hours : 0;
        const perKm = km > 0 ? netProfit / km : 0;

        document.getElementById('live-ride-cost').textContent = this.formatCurrency(totalCost);
        const profitEl = document.getElementById('live-ride-profit');
        profitEl.textContent = this.formatCurrency(netProfit);
        profitEl.className = netProfit < 0 ? 'calc-value text-red font-bold' : 'calc-value text-emerald font-bold';
        document.getElementById('live-ride-per-hour').textContent = this.formatCurrency(perHour);
        document.getElementById('live-ride-per-km').textContent = this.formatCurrency(perKm);
    },

    saveRegisteredRide() {
        const ride = {
            date: document.getElementById('ride-date').value || new Date().toISOString().split('T')[0],
            platform: document.getElementById('ride-platform').value,
            grossEarning: parseFloat(document.getElementById('ride-earning').value) || 0,
            hoursWorked: parseFloat(document.getElementById('ride-hours').value) || 0,
            kmRodados: parseFloat(document.getElementById('ride-km').value) || 0,
            fuelCost: parseFloat(document.getElementById('ride-fuel').value) || 0,
            tolls: parseFloat(document.getElementById('ride-tolls').value) || 0,
            appFee: parseFloat(document.getElementById('ride-app-fee').value) || 0,
            tips: parseFloat(document.getElementById('ride-tips').value) || 0,
            food: parseFloat(document.getElementById('ride-food').value) || 0,
            notes: document.getElementById('ride-notes').value || ''
        };
        ride.totalExpense = ride.fuelCost + ride.tolls + ride.appFee + ride.food;
        ride.netProfit = ride.grossEarning + ride.tips - ride.totalExpense;
        ride.profitPerHour = ride.hoursWorked > 0 ? ride.netProfit / ride.hoursWorked : 0;
        ride.profitPerKm = ride.kmRodados > 0 ? ride.netProfit / ride.kmRodados : 0;

        DB.saveRide(ride);
        alert('Corrida salva com sucesso!');
        document.getElementById('ride-registration-form').reset();
        document.getElementById('ride-date').value = new Date().toISOString().split('T')[0];
        this.calculateLiveRideEstimation();
        this.refreshUI();
        this.switchTab('tab-mobility');
    },

    renderMobilityTab() {
        const rides = this.state.rides;
        const listEl = document.getElementById('recent-rides-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        const recent = rides.slice(0, 5);
        if (recent.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><i class="bx bx-car"></i><p>Nenhuma corrida registrada ainda.</p></div>';
            return;
        }
        recent.forEach(ride => {
            const d = new Date(ride.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const logo = this.getPlatformLogoClass(ride.platform);
            const item = document.createElement('div');
            item.className = 'route-item';
            item.innerHTML = `
                <div class="route-left">
                    <div class="platform-badge-logo ${logo}">${ride.platform.charAt(0)}</div>
                    <div class="route-details">
                        <span class="route-platform-name">${ride.platform}</span>
                        <span class="route-sub-meta">${d} \u2022 ${ride.hoursWorked}h \u2022 ${ride.kmRodados} km</span>
                    </div>
                </div>
                <div class="route-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
                    <span class="route-profit-val text-emerald">+ ${this.formatCurrency(ride.netProfit)}</span>
                    <span class="route-calc-sub">${this.formatCurrency(ride.profitPerHour)}/h</span>
                    <button class="btn btn-xs btn-glass" onclick="App.deleteRideRecord('${ride.id}')" style="padding:2px 6px;font-size:0.6rem;border-color:rgba(239,68,68,0.2);color:var(--red);"><i class="bx bx-trash"></i></button>
                </div>`;
            listEl.appendChild(item);
        });
    },

    deleteRideRecord(id) {
        if (confirm('Excluir esta corrida?')) {
            DB.deleteRide(id);
            this.refreshUI();
        }
    },

    // -------------------------------------------------------------
    // ABA 5: METAS FINANCEIRAS
    // -------------------------------------------------------------
    renderGoalsTab() {
        const goals = this.state.goals;
        const box = document.getElementById('financial-goals-container');
        box.innerHTML = '';
        if (goals.length === 0) {
            box.innerHTML = '<div class="empty-state"><i class="bx bx-target-lock"></i><p>Você não tem metas criadas. Crie sua primeira meta abaixo!</p></div>';
            return;
        }
        const catIcons = { prestacao:'bx-credit-card', pneus:'bx-disc', reserva:'bx-wallet', carro:'bx-car', viagem:'bx-plane', emergencia:'bx-error', manutencao:'bx-wrench', combustivel:'bx-gas-pump', aluguel:'bx-home', investimento:'bx-trending-up', outro:'bx-target-lock' };
        goals.forEach(goal => {
            const pct = Math.min(100, Math.round((parseFloat(goal.currentAmount || 0) / parseFloat(goal.targetAmount)) * 100));
            const dateStr = new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const icon = catIcons[goal.category] || 'bx-target-lock';
            const isComplete = goal.completed || pct >= 100;
            const card = document.createElement('div');
            card.className = 'goal-card' + (isComplete ? ' goal-completed' : '');
            card.innerHTML = `
                <span class="goal-pct-badge">${isComplete ? '\u2713 Conclu\u00edda' : pct + '% conclu\u00eddo'}</span>
                <div class="goal-top">
                    <div class="goal-title-area">
                        <h4><i class="bx ${icon}" style="margin-right:6px;"></i>${goal.name}</h4>
                        <span class="goal-deadline-lbl"><i class="bx bx-calendar"></i> Limite: ${dateStr}</span>
                    </div>
                    <button class="btn-add-fund-goal" onclick="App.openDepositGoalModal('${goal.id}', '${goal.name.replace(/'/g, '\\&#39;')}')"><i class="bx bx-plus"></i></button>
                </div>
                <div class="goal-progress-section">
                    <div class="goal-progress-bar-bg">
                        <div class="goal-progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="goal-numbers">
                        <span class="goal-current-amt">${this.formatCurrency(goal.currentAmount || 0)}</span>
                        <span class="goal-target-amt">Meta: ${this.formatCurrency(goal.targetAmount)}</span>
                    </div>
                </div>
                <div class="goal-actions-row">
                    <button class="btn btn-xs btn-glass" onclick="App.editGoal('${goal.id}')"><i class="bx bx-edit-alt"></i> Editar</button>
                    ${!isComplete ? '<button class="btn btn-xs btn-glass text-emerald" onclick="App.completeGoal(\'' + goal.id + '\')"><i class="bx bx-check"></i> Concluir</button>' : ''}
                    <button class="btn btn-xs btn-glass text-red" onclick="App.deleteGoalRecord('${goal.id}')"><i class="bx bx-trash"></i> Excluir</button>
                </div>`;
            box.appendChild(card);
        });
    },

    saveNewGoal() {
        const goal = {
            name: document.getElementById('goal-name').value,
            targetAmount: parseFloat(document.getElementById('goal-target').value),
            currentAmount: parseFloat(document.getElementById('goal-current').value) || 0,
            deadline: document.getElementById('goal-deadline').value,
            category: document.getElementById('goal-category')?.value || 'outro'
        };
        DB.saveGoal(goal);
        alert('Meta criada com sucesso!');
        document.getElementById('form-create-goal').reset();
        this.closeModal('modal-new-goal');
        this.refreshUI();
    },

    editGoal(id) {
        const goal = this.state.goals.find(g => g.id === id);
        if (!goal) return;
        document.getElementById('edit-goal-id').value = goal.id;
        document.getElementById('edit-goal-name').value = goal.name;
        document.getElementById('edit-goal-target').value = goal.targetAmount;
        document.getElementById('edit-goal-current').value = goal.currentAmount || 0;
        document.getElementById('edit-goal-deadline').value = goal.deadline;
        document.getElementById('edit-goal-category').value = goal.category || 'outro';
        this.openModal('modal-edit-goal');
    },

    saveEditedGoal() {
        const updated = {
            id: document.getElementById('edit-goal-id').value,
            name: document.getElementById('edit-goal-name').value,
            targetAmount: parseFloat(document.getElementById('edit-goal-target').value),
            currentAmount: parseFloat(document.getElementById('edit-goal-current').value) || 0,
            deadline: document.getElementById('edit-goal-deadline').value,
            category: document.getElementById('edit-goal-category').value || 'outro'
        };
        DB.updateGoal(updated);
        alert('Meta atualizada!');
        this.closeModal('modal-edit-goal');
        this.refreshUI();
    },

    deleteGoalRecord(id) {
        if (confirm('Excluir esta meta permanentemente?')) {
            DB.deleteGoal(id);
            this.refreshUI();
        }
    },

    completeGoal(id) {
        DB.completeGoal(id);
        alert('Meta marcada como conclu\u00edda!');
        this.refreshUI();
    },

    openDepositGoalModal(id, title) {
        document.getElementById('deposit-goal-id').value = id;
        document.getElementById('deposit-goal-title').innerHTML = `Meta: <strong>${title}</strong>`;
        document.getElementById('deposit-amount').value = '';
        this.openModal('modal-goal-deposit');
    },

    saveGoalDeposit() {
        const id = document.getElementById('deposit-goal-id').value;
        const amount = parseFloat(document.getElementById('deposit-amount').value);

        DB.depositGoal(id, amount);
        
        alert('Depósito adicionado com sucesso!');
        this.closeModal('modal-goal-deposit');
        this.refreshUI();
    },

    // -------------------------------------------------------------
    // ABA 6: HISTÓRICO & RELATÓRIOS EXPORTÁVEIS
    // -------------------------------------------------------------
    renderHistoryTab() {
        const runs = this.state.runs;
        const rides = this.state.rides;
        const filterType = document.getElementById('filter-type')?.value || 'all';
        const filterPlat = document.getElementById('filter-platform').value;
        const filterMonth = document.getElementById('filter-month').value;
        const listEl = document.getElementById('reports-runs-history-list');
        listEl.innerHTML = '';

        let records = [];
        if (filterType === 'all' || filterType === 'delivery') records = records.concat(runs.map(r => ({...r, _type:'delivery'})));
        if (filterType === 'all' || filterType === 'ride') records = records.concat(rides.map(r => ({...r, _type:'ride'})));
        records.sort((a,b) => new Date(b.date) - new Date(a.date));

        const filtered = records.filter(r => {
            const matchPlat = filterPlat === 'all' || r.platform === filterPlat;
            const runMonth = r.date.split('-')[1];
            const matchMonth = filterMonth === 'all' || runMonth === filterMonth;
            return matchPlat && matchMonth;
        });

        let sumGross = 0, sumExpense = 0, sumNet = 0;
        filtered.forEach(r => { sumGross += parseFloat(r.grossEarning||0); sumExpense += parseFloat(r.totalExpense||0); sumNet += parseFloat(r.netProfit||0); });
        document.getElementById('filtered-gross').textContent = this.formatCurrency(sumGross);
        document.getElementById('filtered-expense').textContent = this.formatCurrency(sumExpense);
        document.getElementById('filtered-net').textContent = this.formatCurrency(sumNet);

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><i class="bx bx-filter-alt"></i><p>Nenhum registro encontrado.</p></div>';
            return;
        }

        filtered.forEach(rec => {
            const dateStr = new Date(rec.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const logo = this.getPlatformLogoClass(rec.platform);
            const isRide = rec._type === 'ride';
            const meta = isRide ? `${dateStr} \u2022 ${rec.hoursWorked||0}h \u2022 ${rec.kmRodados} km` : `${dateStr} \u2022 ${rec.packages} pct \u2022 ${rec.kmRodados} km`;
            const badge = isRide ? '<span class="type-badge ride-badge">Corrida</span>' : '<span class="type-badge delivery-badge">Entrega</span>';
            const delFn = isRide ? `App.deleteRideRecord('${rec.id}')` : `App.deleteRoute('${rec.id}')`;
            const card = document.createElement('div');
            card.className = 'route-item';
            card.innerHTML = `
                <div class="route-left">
                    <div class="platform-badge-logo ${logo}">${rec.platform.charAt(0)}</div>
                    <div class="route-details">
                        <span class="route-platform-name">${rec.platform} ${badge}</span>
                        <span class="route-sub-meta">${meta}</span>
                    </div>
                </div>
                <div class="route-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                    <span class="route-profit-val text-emerald">+ ${this.formatCurrency(rec.netProfit)}</span>
                    <button class="btn btn-xs btn-glass" onclick="${delFn}" style="padding:2px 6px;font-size:0.6rem;border-color:rgba(239,68,68,0.2);color:var(--red);"><i class="bx bx-trash"></i></button>
                </div>`;
            listEl.appendChild(card);
        });
    },

    deleteRoute(id) {
        if (confirm('Deseja realmente deletar esta rota? Isto reajustará o seu saldo e histórico.')) {
            DB.deleteRun(id);
            this.refreshUI();
        }
    },

    // Exportador de Planilha CSV (Excel)
    exportHistoryCSV() {
        const runs = this.state.runs;
        if (runs.length === 0) {
            alert('Não há dados para exportar!');
            return;
        }

        // Cabeçalhos Excel
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Data;Plataforma;Ganhos Brutos (R$);Pacotes;Distancia (KM);Tipo Combustivel;Custo Combustivel (R$);Pedagios (R$);Alimentacao (R$);Estacionamento (R$);Custo Total (R$);Lucro Liquido (R$);Lucro por Pacote (R$);Lucro por KM (R$)\n';

        runs.forEach(run => {
            const row = [
                run.date,
                run.platform,
                run.grossEarning.toFixed(2),
                run.packages,
                run.kmRodados.toFixed(1),
                run.fuelType,
                run.fuelCost.toFixed(2),
                run.tolls.toFixed(2),
                run.food.toFixed(2),
                run.parking.toFixed(2),
                run.totalExpense.toFixed(2),
                run.netProfit.toFixed(2),
                run.profitPerPackage.toFixed(2),
                run.profitPerKm.toFixed(2)
            ].join(';');
            csvContent += row + '\n';
        });

        // Dispara download pelo navegador
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `rotalucro_relatorio_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // -------------------------------------------------------------
    // UTILS & AUXILIARES
    // -------------------------------------------------------------
    formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    },

    getPlatformLogoClass(plat) {
        if (plat === 'Shopee') return 'shopee';
        if (plat === 'Amazon Flex') return 'amazon';
        if (plat === 'Mercado Livre') return 'ml';
        if (plat === 'Lalamove') return 'lala';
        if (plat === 'Loggi') return 'loggi';
        if (plat === 'Uber Flash' || plat === 'Uber') return 'uber';
        if (plat === '99') return 'nn';
        if (plat === 'InDrive') return 'indrive';
        if (plat === 'Maxim') return 'maxim';
        if (plat === 'Porta a Porta') return 'pap';
        return 'outra';
    }
};
window.App = App;
