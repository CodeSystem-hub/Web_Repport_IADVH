// Configurações da API
const API_CONFIG = {
    BASE_URL: 'https://institutode137168.rm.cloudtotvs.com.br:8051/api/framework/v1/consultaSQLServer/RealizaConsulta/CUBO.P.0117/0/P/?context=CODCOLIGADA%3D0',
    AUTH_TYPE: 'basic' // basic ou token
};

const EMAIL_CONFIG = {
    provider: 'emailjs',
    serviceId: 'service_bd6d318',
    templateId: 'template_ppuqkac',
    publicKey: 'FaepqPvA2ZD8Qzsy8',
    fromEmail: 'mobile@institutoiadvh.org.br',
    cancelToEmail: 'equiperescisao@iadvh.org.br'
};

// Estado global da aplicação
let appState = {
    isAuthenticated: false,
    currentUser: null,
    data: [],
    filteredData: [],
    selectedItem: null,
    currentViewItems: [],
    currentPage: 1,
    pageSize: 15,
    listView: 'cards',
    listTab: 'all',
    sortKey: 'recent',
    pinnedIds: new Set(),
    filters: {
        unidade: '',
        categoria: '',
        etapa: '',
        status: '',
        dataInicio: '',
        dataFim: '',
        search: ''
    },
    charts: {}
};

// Elementos DOM comuns
const elements = {
    // Login page
    loginForm: document.getElementById('loginForm'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('loginBtn'),
    errorMessage: document.getElementById('errorMessage'),
    
    // Dashboard page
    syncBtn: document.getElementById('syncBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userGreeting: document.getElementById('userGreeting'),
    kpiContainer: document.getElementById('kpiContainer'),
    totalCount: document.getElementById('totalCount'),
    completedCount: document.getElementById('completedCount'),
    cancelledCount: document.getElementById('cancelledCount'),
    inProgressCount: document.getElementById('inProgressCount'),
    
    // Filters
    unidadeFilter: document.getElementById('unidadeFilter'),
    categoriaFilter: document.getElementById('categoriaFilter'),
    etapaFilter: document.getElementById('etapaFilter'),
    statusFilter: document.getElementById('statusFilter'),
    dataInicioFilter: document.getElementById('dataInicioFilter'),
    dataFimFilter: document.getElementById('dataFimFilter'),
    searchFilter: document.getElementById('searchFilter'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    
    // Table
    cardsContainer: document.getElementById('cardsContainer'),
    tableWrapper: document.getElementById('tableWrapper'),
    dataTable: document.getElementById('dataTable'),
    tableBody: document.getElementById('tableBody'),
    showingCount: document.getElementById('showingCount'),
    totalRecords: document.getElementById('totalRecords'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    exportConfigBtn: document.getElementById('exportConfigBtn'),
    sortSelect: document.getElementById('sortSelect'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    viewCardsBtn: document.getElementById('viewCardsBtn'),
    viewListBtn: document.getElementById('viewListBtn'),
    tabAllBtn: document.getElementById('tabAllBtn'),
    tabPinnedBtn: document.getElementById('tabPinnedBtn'),
    
    // Modal
    detailModal: document.getElementById('detailModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modalBody: document.getElementById('modalBody'),
    exportConfigModal: document.getElementById('exportConfigModal'),
    closeExportConfigModalBtn: document.getElementById('closeExportConfigModalBtn'),
    exportConfigCancelBtn: document.getElementById('exportConfigCancelBtn'),
    exportConfigDownloadBtn: document.getElementById('exportConfigDownloadBtn'),
    exportColumnsList: document.getElementById('exportColumnsList'),
    syncModal: document.getElementById('syncModal'),
    closeSyncModalBtn: document.getElementById('closeSyncModalBtn'),
    syncMessage: document.getElementById('syncMessage'),
    
    // Loader
    globalLoader: document.getElementById('globalLoader')
};

const usersDirectory = {
    _map: new Map(),
    _rows: [],
    _loaded: false,
    async load() {
        if (this._loaded) return true;
        this._loaded = true;

        const cached = localStorage.getItem('usuariosDirectoryCache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    this._rows = parsed;
                    this._buildMapFromRows(parsed);
                }
            } catch {}
        }

        const jsonUrls = [
            'imagens/usuarios.json',
            'imagens/Usuarios.json',
            'usuarios.json',
            'Usuarios.json'
        ];

        for (const url of jsonUrls) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) continue;
                const data = await res.json();
                const rows = this._coerceToRows(data);
                if (!Array.isArray(rows) || rows.length === 0) continue;
                this._rows = rows;
                this._buildMapFromRows(rows);
                localStorage.setItem('usuariosDirectoryCache', JSON.stringify(rows));
                return true;
            } catch {}
        }

        if (!window.XLSX) return this._map.size > 0;

        const urls = [
            'imagens/usuarios.xlsx',
            'imagens/Usuarios.xlsx',
            'usuarios.xlsx',
            'Usuarios.xlsx'
        ];

        for (const url of urls) {
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) continue;
                const buffer = await res.arrayBuffer();
                const wb = window.XLSX.read(buffer, { type: 'array' });
                const sheetName =
                    wb.SheetNames.find((n) => String(n).trim().toLowerCase() === 'usuarios') ||
                    wb.SheetNames[0];
                const ws = sheetName ? wb.Sheets[sheetName] : null;
                if (!ws) continue;

                const rows = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
                if (!Array.isArray(rows) || rows.length === 0) continue;

                this._rows = rows;
                this._buildMapFromRows(rows);
                localStorage.setItem('usuariosDirectoryCache', JSON.stringify(rows));
                return true;
            } catch {}
        }

        return this._map.size > 0;
    },
    _coerceToRows(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'object') {
            const out = [];
            for (const [k, v] of Object.entries(data)) {
                if (v && typeof v === 'object') {
                    out.push({ 'Usuário': k, ...v });
                } else {
                    out.push({ 'Usuário': k, 'Nome': v });
                }
            }
            return out;
        }
        return [];
    },
    _buildMapFromRows(rows) {
        this._map.clear();

        const pickKey = (obj, regex) => {
            if (!obj || typeof obj !== 'object') return '';
            const k = Object.keys(obj).find((key) => regex.test(key));
            return k || '';
        };

        for (const row of rows) {
            if (!row || typeof row !== 'object') continue;
            const userKey =
                pickKey(row, /^usu[aá]rio$/i) ||
                pickKey(row, /^usuario$/i) ||
                pickKey(row, /usu[aá]rio/i) ||
                pickKey(row, /usuario/i);
            const nameKey = pickKey(row, /^nome$/i) || pickKey(row, /nome/i);
            const emailKey =
                pickKey(row, /^e-?mail$/i) ||
                pickKey(row, /^email$/i) ||
                pickKey(row, /e-?mail/i);
            const username = userKey ? String(row[userKey] || '').trim() : '';
            const fullName = nameKey ? String(row[nameKey] || '').trim() : '';
            const email = emailKey ? String(row[emailKey] || '').trim() : '';
            if (!username || (!fullName && !email)) continue;
            const lowerKey = username.toLowerCase();
            this._map.set(lowerKey, { nome: fullName, email });
        }
    },
    resolveUser(username) {
        const raw = String(username || '').trim();
        if (!raw) return { nome: '', email: '' };
        const lowerKey = raw.toLowerCase();
        const found = this._map.get(lowerKey);
        if (!found) return { nome: '', email: '' };
        const nome = found && typeof found === 'object' ? String(found.nome || '') : '';
        const email = found && typeof found === 'object' ? String(found.email || '') : '';
        return { nome, email };
    },
    resolveFullName(username) {
        return this.resolveUser(username).nome || '';
    },
    resolveEmail(username) {
        return this.resolveUser(username).email || '';
    },
    getRows() {
        return Array.isArray(this._rows) ? this._rows : [];
    }
};

// Serviço de API
const apiService = {
    // Autenticação básica
    async authenticate(username, password) {
        const authString = btoa(`${username}:${password}`);
        
        try {
            console.log('Tentando autenticar na API RM TOTVS...');
            
            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Adicionar timeout para evitar espera infinita
                signal: AbortSignal.timeout(10000)
            });

            console.log('Status da resposta:', response.status, response.statusText);

            if (response.status === 401 || response.status === 403) {
                throw new Error('Credenciais inválidas ou acesso não autorizado');
            }

            if (!response.ok) {
                // Tentar obter mais informações do erro
                let errorMessage = `Erro ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.text();
                    if (errorData) {
                        errorMessage += ` - ${errorData.substring(0, 100)}`;
                    }
                } catch (e) {
                    // Ignora erro ao ler corpo da resposta
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Autenticação bem-sucedida, dados recebidos:', data);
            
            // Salvar credenciais (em ambiente real, usar método mais seguro)
            localStorage.setItem('authToken', authString);
            localStorage.setItem('username', username);
            
            return { success: true, data };
            
        } catch (error) {
            console.error('Erro detalhado na autenticação:', error);
            
            // Mensagens de erro mais específicas
            let errorMessage = 'Erro na conexão com o servidor';
            
            if (error.name === 'TimeoutError') {
                errorMessage = 'Timeout: A API não respondeu dentro do tempo limite';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Erro de rede: Verifique sua conexão com a internet';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Não foi possível conectar com a API. Verifique a URL e CORS';
            } else if (error.message.includes('Credenciais')) {
                errorMessage = error.message;
            }
            
            return { 
                success: false, 
                error: errorMessage,
                details: error.message
            };
        }
    },

    // Buscar dados da API
    async fetchData() {
        const authToken = localStorage.getItem('authToken');
        
        if (!authToken) {
            throw new Error('Usuário não autenticado');
        }

        try {
            showLoader();
            console.log('Buscando dados da API RM TOTVS...');
            
            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });

            console.log('Status da resposta (dados):', response.status, response.statusText);

            if (response.status === 401 || response.status === 403) {
                // Token expirado ou inválido
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                throw new Error('Sessão expirada. Faça login novamente');
            }

            if (!response.ok) {
                let errorMessage = `Erro ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.text();
                    if (errorData) {
                        errorMessage += ` - ${errorData.substring(0, 100)}`;
                    }
                } catch (e) {
                    // Ignora erro ao ler corpo da resposta
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Dados recebidos com sucesso:', data);
            hideLoader();
            
            return { success: true, data };
            
        } catch (error) {
            console.error('Erro detalhado ao buscar dados:', error);
            hideLoader();
            
            let errorMessage = 'Erro na conexão com a API';
            
            if (error.name === 'TimeoutError') {
                errorMessage = 'Timeout: A API não respondeu dentro do tempo limite';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Erro de rede: Verifique sua conexão';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Não foi possível conectar com a API';
            } else if (error.message.includes('Sessão expirada')) {
                errorMessage = error.message;
                // Redirecionar para login se a sessão expirou
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
            
            return { 
                success: false, 
                error: errorMessage,
                details: error.message
            };
        }
    },

    // Sincronizar dados
    async syncData() {
        return await this.fetchData();
    }
};

// Utilitários
const utils = {
    // Formatar data
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch {
            return dateString;
        }
    },

    formatDisplayName(fullName) {
        const raw = String(fullName || '').trim();
        if (!raw) return '';

        const separators = Array.from(raw.matchAll(/\s[-–—]\s/g));
        const lastSep = separators.length ? separators[separators.length - 1] : null;
        const sepIndex = lastSep && typeof lastSep.index === 'number' ? lastSep.index : -1;
        const namePart = sepIndex >= 0 ? raw.slice(0, sepIndex).trim() : raw;
        const suffixPart = sepIndex >= 0 ? raw.slice(sepIndex).replace(/\s+$/g, '') : '';

        const tokens = namePart.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        if (tokens.length === 0) return '';

        const particles = new Set(['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'D']);
        const pickLast = () => {
            for (let i = tokens.length - 1; i >= 0; i--) {
                const t = String(tokens[i] || '').trim();
                if (!t) continue;
                if (particles.has(t.toUpperCase())) continue;
                return t;
            }
            return tokens[tokens.length - 1] || '';
        };

        const first = tokens[0] || '';
        const last = pickLast();

        const title = (word) => {
            const lower = String(word || '').toLowerCase();
            return lower.replace(/(^|[-'’])([a-zà-ÿ])/g, (_m, p1, p2) => `${p1}${p2.toUpperCase()}`);
        };

        const firstT = title(first);
        const lastT = title(last);
        const base = !lastT || firstT.toLowerCase() === lastT.toLowerCase() ? firstT : `${firstT} ${lastT}`;
        return suffixPart ? `${base}${suffixPart}` : base;
    },

    // Extrair valores únicos para filtros
    getUniqueValues(data, key) {
        const values = data.map(item => item[key]).filter(Boolean);
        return [...new Set(values)].sort();
    },

    // Filtrar dados
    filterData(data, filters) {
        return data.filter(item => {
            // Filtro por unidade
            if (filters.unidade && item.unidade !== filters.unidade) {
                return false;
            }
            
            // Filtro por categoria
            if (filters.categoria && item.categoria !== filters.categoria) {
                return false;
            }
            
            // Filtro por etapa
            if (filters.etapa && item.etapa !== filters.etapa) {
                return false;
            }
            
            // Filtro por status
            if (filters.status && item.status !== filters.status) {
                return false;
            }
            
            // Filtro por data
            if (filters.dataInicio || filters.dataFim) {
                const itemDate = new Date(item.dataAbertura);
                const startDate = filters.dataInicio ? new Date(filters.dataInicio) : null;
                const endDate = filters.dataFim ? new Date(filters.dataFim) : null;
                
                if (startDate && itemDate < startDate) return false;
                if (endDate && itemDate > endDate) return false;
            }
            
            // Filtro de busca
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchableFields = [
                    item.assunto,
                    item.unidade,
                    item.nome,
                    item.funcao,
                    item.etapa,
                    item.solicitante
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchableFields.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
    },

    // Paginar dados
    paginateData(data, page, pageSize) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return data.slice(0, end);
    },

    normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }
};

// Gerenciamento de UI
const uiManager = {
    // Mostrar/ocultar loader
    showLoader() {
        if (elements.globalLoader) {
            elements.globalLoader.style.display = 'flex';
        }
    },

    hideLoader() {
        if (elements.globalLoader) {
            elements.globalLoader.style.display = 'none';
        }
    },

    // Mostrar erro
    showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
            
            setTimeout(() => {
                elements.errorMessage.style.display = 'none';
            }, 5000);
        }
    },

    // Atualizar contadores KPI
    updateKPICounters(data) {
        if (!elements.totalCount) return;

        const total = data.length;
        const completed = data.filter(item => item.status === 'Finalizado').length;
        const cancelled = data.filter(item => item.status === 'Cancelado').length;
        const inProgress = data.filter(item => item.status === 'Em Andamento').length;

        elements.totalCount.textContent = total;
        elements.completedCount.textContent = completed;
        elements.cancelledCount.textContent = cancelled;
        elements.inProgressCount.textContent = inProgress;
    },

    updateFiltersIndicator() {
        if (!elements.applyFiltersBtn) return;
        const f = appState.filters || {};
        const active = Boolean(
            (f.unidade || '').trim() ||
            (f.categoria || '').trim() ||
            (f.etapa || '').trim() ||
            (f.status || '').trim() ||
            (f.dataInicio || '').trim() ||
            (f.dataFim || '').trim() ||
            (f.search || '').trim()
        );
        elements.applyFiltersBtn.classList.toggle('filter-active', active);
    },

    loadListPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('listPreferences') || 'null');
            if (prefs && typeof prefs === 'object') {
                if (prefs.view === 'cards' || prefs.view === 'list') appState.listView = prefs.view;
                if (prefs.tab === 'all' || prefs.tab === 'pinned') appState.listTab = prefs.tab;
                if (typeof prefs.sortKey === 'string') appState.sortKey = prefs.sortKey;
                const size = Number(prefs.pageSize);
                if ([15, 30, 50, 100].includes(size)) appState.pageSize = size;
            }
        } catch {}

        try {
            const pins = JSON.parse(localStorage.getItem('pinnedRequests') || '[]');
            if (Array.isArray(pins)) appState.pinnedIds = new Set(pins.map((x) => String(x).trim()).filter(Boolean));
        } catch {}
    },

    saveListPreferences() {
        localStorage.setItem('listPreferences', JSON.stringify({
            view: appState.listView,
            tab: appState.listTab,
            sortKey: appState.sortKey,
            pageSize: appState.pageSize
        }));
        localStorage.setItem('pinnedRequests', JSON.stringify(Array.from(appState.pinnedIds || [])));
    },

    setListView(view) {
        appState.listView = view === 'list' ? 'list' : 'cards';
        this.saveListPreferences();
        this.syncListControlsUI();
        this.updateTable(appState.filteredData);
    },

    setListTab(tab) {
        appState.listTab = tab === 'pinned' ? 'pinned' : 'all';
        appState.currentPage = 1;
        this.saveListPreferences();
        this.syncListControlsUI();
        this.updateTable(appState.filteredData);
    },

    setSortKey(key) {
        appState.sortKey = String(key || 'recent');
        appState.currentPage = 1;
        this.saveListPreferences();
        this.syncListControlsUI();
        this.updateTable(appState.filteredData);
    },

    setPageSize(size) {
        const n = Number(size);
        if (![15, 30, 50, 100].includes(n)) return;
        appState.pageSize = n;
        appState.currentPage = 1;
        this.saveListPreferences();
        this.syncListControlsUI();
        this.updateTable(appState.filteredData);
    },

    togglePinned(id) {
        const key = String(id || '').trim();
        if (!key) return;
        if (!appState.pinnedIds) appState.pinnedIds = new Set();
        if (appState.pinnedIds.has(key)) appState.pinnedIds.delete(key);
        else appState.pinnedIds.add(key);
        this.saveListPreferences();
        this.syncListControlsUI();
        this.updateTable(appState.filteredData);
    },

    syncListControlsUI() {
        if (elements.sortSelect) elements.sortSelect.value = appState.sortKey || 'recent';
        if (elements.pageSizeSelect) elements.pageSizeSelect.value = String(appState.pageSize || 15);
        if (elements.viewCardsBtn) elements.viewCardsBtn.classList.toggle('is-active', appState.listView === 'cards');
        if (elements.viewListBtn) elements.viewListBtn.classList.toggle('is-active', appState.listView === 'list');
        if (elements.tabAllBtn) elements.tabAllBtn.classList.toggle('is-active', appState.listTab === 'all');
        if (elements.tabPinnedBtn) elements.tabPinnedBtn.classList.toggle('is-active', appState.listTab === 'pinned');
        if (elements.cardsContainer) elements.cardsContainer.style.display = appState.listView === 'cards' ? 'grid' : 'none';
        if (elements.tableWrapper) elements.tableWrapper.style.display = appState.listView === 'list' ? 'block' : 'none';
        if (elements.tabAllBtn) elements.tabAllBtn.setAttribute('aria-selected', appState.listTab === 'all' ? 'true' : 'false');
        if (elements.tabPinnedBtn) elements.tabPinnedBtn.setAttribute('aria-selected', appState.listTab === 'pinned' ? 'true' : 'false');
    },

    getSortedData(data) {
        const list = Array.isArray(data) ? [...data] : [];
        const byText = (a, b, key) => String(a[key] || '').localeCompare(String(b[key] || ''), 'pt-BR');
        const toTime = (v) => {
            const d = new Date(v);
            const t = d.getTime();
            return Number.isFinite(t) ? t : 0;
        };
        const statusRank = (s) => {
            const n = utils.normalizeText(s);
            if (n.includes('em andamento')) return 0;
            if (n.includes('final')) return 1;
            if (n.includes('cancel')) return 2;
            return 3;
        };

        const key = appState.sortKey || 'recent';
        if (key === 'dateAsc') list.sort((a, b) => toTime(a.dataAbertura) - toTime(b.dataAbertura));
        else if (key === 'unidade') list.sort((a, b) => byText(a, b, 'unidade'));
        else if (key === 'status') list.sort((a, b) => statusRank(a.status) - statusRank(b.status) || byText(a, b, 'status'));
        else if (key === 'etapa') list.sort((a, b) => byText(a, b, 'etapa'));
        else list.sort((a, b) => toTime(b.dataAbertura) - toTime(a.dataAbertura));
        return list;
    },

    // Popular filtros
    populateFilters(data) {
        if (!elements.unidadeFilter) return;

        // Unidades
        const unidades = utils.getUniqueValues(data, 'unidade');
        elements.unidadeFilter.innerHTML = '<option value="">Todas</option>';
        unidades.forEach(unidade => {
            elements.unidadeFilter.innerHTML += `<option value="${unidade}">${unidade}</option>`;
        });

        // Categorias
        const categorias = utils.getUniqueValues(data, 'categoria');
        elements.categoriaFilter.innerHTML = '<option value="">Todas</option>';
        categorias.forEach(categoria => {
            elements.categoriaFilter.innerHTML += `<option value="${categoria}">${categoria}</option>`;
        });

        // Etapas
        const etapas = utils.getUniqueValues(data, 'etapa');
        elements.etapaFilter.innerHTML = '<option value="">Todas</option>';
        etapas.forEach(etapa => {
            elements.etapaFilter.innerHTML += `<option value="${etapa}">${etapa}</option>`;
        });
    },

    // Atualizar tabela
    updateTable(data) {
        if (!elements.cardsContainer && !elements.tableBody) return;

        const base = Array.isArray(data) ? data : [];
        const pinnedOnly = appState.listTab === 'pinned';
        const pinnedSet = appState.pinnedIds || new Set();
        const filtered = pinnedOnly ? base.filter((it) => pinnedSet.has(String(it.id || '').trim())) : base;
        const sorted = this.getSortedData(filtered);

        const paginatedData = utils.paginateData(sorted, appState.currentPage, appState.pageSize);
        appState.currentViewItems = paginatedData;
        
        if (paginatedData.length === 0) {
            if (elements.cardsContainer) elements.cardsContainer.innerHTML = `<div class="no-data">Nenhum dado encontrado</div>`;
            if (elements.tableBody) elements.tableBody.innerHTML = `<tr><td colspan="8" class="no-data">Nenhum dado encontrado</td></tr>`;
            return;
        }

        const escapeHtml = (v) => String(v === undefined || v === null ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const starSvg = `
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 17.3l-6.2 3.6 1.7-7.1L2 8.9l7.2-.6L12 1.8l2.8 6.5 7.2.6-5.5 4.9 1.7 7.1L12 17.3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
        `;

        if (elements.cardsContainer && appState.listView === 'cards') {
            let html = '';
            paginatedData.forEach((item, index) => {
                const status = item.status || 'N/A';
                const statusClass = String(status)
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                const nome = item.nome || 'N/A';
                const funcao = item.funcao || '';
                const nomeLinha = funcao ? `${nome} (${funcao})` : nome;
                const etapa = item.etapa || 'N/A';
                const unidade = item.unidade || 'N/A';
                const solicitante = item.solicitante || 'N/A';
                const atendente = item.atendenteAtual || 'N/A';
                const confirmacoes = item.confirmacoes || '';
                const idKey = String(item.id || '').trim();
                const pinned = idKey && pinnedSet.has(idKey);

                html += `
                    <div class="request-card" role="button" tabindex="0" data-index="${index}">
                        <div class="request-card-top">
                            <div class="request-card-title">${escapeHtml(nomeLinha)}</div>
                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                <span class="status-badge status-${statusClass}">${escapeHtml(status)}</span>
                                <button type="button" class="pin-btn ${pinned ? 'is-pinned' : ''}" data-action="pin" data-id="${escapeHtml(idKey)}" aria-label="Fixar">
                                    ${starSvg}
                                </button>
                            </div>
                        </div>
                        <div class="request-card-grid">
                            <div class="request-meta">
                                <div class="request-meta-label">Unidade</div>
                                <div class="request-meta-value">${escapeHtml(unidade)}</div>
                            </div>
                            <div class="request-meta">
                                <div class="request-meta-label">Etapa Atual</div>
                                <div class="request-meta-value">${escapeHtml(etapa)}</div>
                            </div>
                            <div class="request-meta">
                                <div class="request-meta-label">Data de Abertura</div>
                                <div class="request-meta-value">${escapeHtml(utils.formatDate(item.dataAbertura))}</div>
                            </div>
                            <div class="request-meta">
                                <div class="request-meta-label">Solicitante</div>
                                <div class="request-meta-value">${escapeHtml(solicitante)}</div>
                            </div>
                            <div class="request-meta">
                                <div class="request-meta-label">Atendente Atual</div>
                                <div class="request-meta-value">${escapeHtml(atendente)}</div>
                            </div>
                            ${confirmacoes ? `
                            <div class="request-meta request-meta-wide">
                                <div class="request-meta-label">Confirmações</div>
                                <div class="request-meta-value">${escapeHtml(confirmacoes)}</div>
                            </div>` : ''}
                        </div>
                    </div>
                `;
            });
            elements.cardsContainer.innerHTML = html;
        }

        if (elements.tableBody && appState.listView === 'list') {
            let html = '';
            paginatedData.forEach((item, index) => {
                const idKey = String(item.id || '').trim();
                const pinned = idKey && pinnedSet.has(idKey);
                html += `
                    <tr data-index="${index}">
                        <td class="table-pin-cell">
                            <button type="button" class="pin-btn ${pinned ? 'is-pinned' : ''}" data-action="pin" data-id="${escapeHtml(idKey)}" aria-label="Fixar">
                                ${starSvg}
                            </button>
                        </td>
                        <td>${escapeHtml(item.unidade || 'N/A')}</td>
                        <td>${escapeHtml(item.nome || 'N/A')}${item.funcao ? ` (${escapeHtml(item.funcao)})` : ''}</td>
                        <td>${escapeHtml(item.etapa || 'N/A')}</td>
                        <td>${escapeHtml(utils.formatDate(item.dataAbertura))}</td>
                        <td>${escapeHtml(item.solicitante || 'N/A')}</td>
                        <td>${escapeHtml(item.atendenteAtual || 'N/A')}</td>
                        <td>${escapeHtml(item.confirmacoes || 'N/A')}</td>
                    </tr>
                `;
            });
            elements.tableBody.innerHTML = html;
        }
        
        // Atualizar contadores
        if (elements.showingCount && elements.totalRecords) {
            elements.showingCount.textContent = paginatedData.length;
            elements.totalRecords.textContent = filtered.length;
        }

        // Mostrar/ocultar botão "Carregar mais"
        if (elements.loadMoreBtn) {
            elements.loadMoreBtn.style.display = 
                paginatedData.length < filtered.length ? 'block' : 'none';
        }
    },

    // Abrir modal de detalhes
    openModal(index) {
        const source = Array.isArray(appState.currentViewItems) && appState.currentViewItems.length
            ? appState.currentViewItems
            : appState.filteredData;
        const item = source[index];
        if (!item || !elements.modalBody) return;

        appState.selectedItem = item;

        const etapaNorm = String(item.etapa || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const hideCancelBtn = etapaNorm.includes('cancelado') || etapaNorm.includes('demissao efetivada');

        // Conteúdo principal (dados processados)
        let modalContent = `
            <div class="modal-detail-group">
                <h4>Assunto</h4>
                <p>${item.assunto || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Unidade</h4>
                <p>${item.unidade || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Nome e Função</h4>
                <p>${item.nome || 'N/A'} ${item.funcao ? `(${item.funcao})` : ''}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Etapa Atual</h4>
                <p>${item.etapa || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Data de Abertura</h4>
                <p>${utils.formatDate(item.dataAbertura)}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Solicitante</h4>
                <p>${item.solicitante || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Atendente Atual</h4>
                <p>${item.atendenteAtual || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Confirmações</h4>
                <p>${item.confirmacoes || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Status</h4>
                <p>${item.status || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Categoria</h4>
                <p>${item.categoria || 'N/A'}</p>
            </div>
            <div class="modal-detail-group">
                <h4>Descrição Completa</h4>
                <p>${item.descricao || 'Nenhuma descrição disponível'}</p>
            </div>
            <div class="modal-detail-group" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                ${hideCancelBtn ? '' : '<button type="button" class="btn btn-secondary" id="cancelRequestBtn" onclick="cancelSolicitacao()">Cancelar</button>'}
                <div id="cancelStatus" class="action-status" role="status" aria-live="polite"></div>
            </div>
        `;

        // Adicionar todos os dados completos (dados originais da API)
        const dadosOriginais = Array.isArray(item.dadosCompletosLista) && item.dadosCompletosLista.length
            ? item.dadosCompletosLista
            : item.dadosCompletos;

        if (dadosOriginais) {
            modalContent += `
                <div class="modal-detail-group" style="margin-top: 30px; border-top: 2px solid #dce8d7; padding-top: 20px;">
                    <h4 style="color: #14A449;">📋 Dados Completos da API</h4>
                    <div style="max-height: 300px; overflow-y: auto; background: #f7fbf4; padding: 15px; border-radius: 8px; margin-top: 10px;">
                        <pre style="font-size: 12px; line-height: 1.4; margin: 0;">${this.formatDadosCompletos(dadosOriginais)}</pre>
                    </div>
                </div>
            `;
        }

        elements.modalBody.innerHTML = modalContent;
        elements.detailModal.style.display = 'block';
    },

    async sendCancelEmail(item, buttonEl, statusEl) {
        const setStatus = (text, kind) => {
            if (!statusEl) return;
            statusEl.textContent = text || '';
            statusEl.classList.remove('success', 'error');
            if (kind) statusEl.classList.add(kind);
        };

        const toEmail = String(EMAIL_CONFIG.cancelToEmail || '').trim();
        if (!toEmail) {
            setStatus('E-mail de destino para cancelamento não configurado.', 'error');
            return;
        }

        if (!window.emailjs || typeof window.emailjs.init !== 'function') {
            setStatus('Serviço de e-mail não carregado. Recarregue a página.', 'error');
            console.error('EmailJS não está disponível ou não foi carregado corretamente:', window.emailjs);
            return;
        }

        if (!isEmailConfigSet()) {
            setStatus('Configuração do EmailJS inválida. Verifique as credenciais.', 'error');
            console.error('Configuração do EmailJS inválida:', EMAIL_CONFIG);
            return;
        }

        await usersDirectory.load();
        const requestedByUser = (appState && appState.currentUser) || localStorage.getItem('username') || '';
        const requestedByFullName = usersDirectory.resolveFullName(requestedByUser);
        const requestedByName = utils.formatDisplayName(requestedByFullName);
        const requestedByEmail = usersDirectory.resolveEmail(requestedByUser);
        const requestedByEmailLower = requestedByEmail ? String(requestedByEmail).trim().toLowerCase() : '';
        const subject = `Solicitação de cancelamento${item.id ? ` - ${item.id}` : ''}`.trim();

        const lines = [
            'Olá,',
            '',
            'Solicito o cancelamento da solicitação abaixo. Este e-mail formaliza o pedido para tratativa manual no sistema:',
            '',
            `Assunto: ${item.assunto || ''}`,
            `Nome: ${item.nome || ''}`,
            `Função: ${item.funcao || ''}`,
            `Unidade: ${item.unidade || ''}`,
            `Data de Abertura: ${utils.formatDate(item.dataAbertura) || ''}`,
            `Solicitante: ${item.solicitante || ''}`,
            `Atendente Atual: ${item.atendenteAtual || ''}`,
            `Etapa Atual: ${item.etapa || ''}`,
            ''
        ];
        const body = lines.join('\n');
        const now = new Date();
        const params = {
            name: (requestedByName || requestedByUser || 'Solicitação de Cancelamento').trim(),
            time: now.toLocaleString('pt-BR'),
            email: requestedByEmailLower,
            to_email: toEmail,
            from_email: EMAIL_CONFIG.fromEmail,
            subject,
            message: body,
            usuario_logado: requestedByUser,
            nome_usuario: requestedByName,
            email_usuario: requestedByEmailLower,
            solicitacao_id: item.id || '',
            unidade: item.unidade || '',
            nome: item.nome || '',
            funcao: item.funcao || '',
            etapa_atual: item.etapa || '',
            status: item.status || '',
            solicitante: item.solicitante || '',
            atendente_atual: item.atendenteAtual || '',
            atendente_email: item.atendenteEmail || '',
            confirmacoes: item.confirmacoes || '',
            data_abertura: utils.formatDate(item.dataAbertura) || ''
        };

        uiManager.showLoader();
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.dataset.originalText = buttonEl.textContent || 'Cancelar';
            buttonEl.textContent = 'Enviando...';
        }
        setStatus('Enviando e-mail...', null);
        try {
            console.log('Iniciando envio de email com params:', params);
            uiManager.initEmailJs(EMAIL_CONFIG.publicKey);
            
            // Verificar se o EmailJS está pronto
            if (typeof window.emailjs.send !== 'function') {
                throw new Error('EmailJS não está completamente carregado');
            }
            
            const result = await window.emailjs.send(EMAIL_CONFIG.serviceId, EMAIL_CONFIG.templateId, params);
            console.log('Email enviado com sucesso:', result);
            setStatus(`Enviado para ${toEmail}.`, 'success');
        } catch (err) {
            const msg = (err && (err.text || err.message)) ? String(err.text || err.message) : '';
            const errorMsg = msg ? `Falha ao enviar: ${msg}` : 'Falha ao enviar e-mail.';
            setStatus(errorMsg, 'error');
            console.error('Erro ao enviar email:', err);
            console.error('Params usados:', params);
        } finally {
            uiManager.hideLoader();
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.textContent = buttonEl.dataset.originalText || 'Cancelar';
            }
        }
    },

    initEmailJs(publicKey) {
        if (!window.emailjs) return;
        if (this._emailJsInitedWith === publicKey) return;
        window.emailjs.init({ publicKey });
        this._emailJsInitedWith = publicKey;
    },

    getResponsavelEmail(item) {
        const isEmail = (v) => {
            if (!v) return false;
            const s = String(v).trim();
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
        };

        const pickFromObject = (obj) => {
            if (!obj || typeof obj !== 'object') return '';
            const keys = Object.keys(obj);
            
            // Primeiro, procurar por campos que contenham email e responsável/atendente
            const preferredKeys = keys.filter((k) => /mail|e-?mail/i.test(k) && /resp|respons|atend/i.test(k));
            for (const k of preferredKeys) {
                const v = obj[k];
                if (isEmail(v)) return String(v).trim();
            }
            
            // Procurar por qualquer campo que contenha email
            const emailKeys = keys.filter((k) => /mail|e-?mail/i.test(k));
            for (const k of emailKeys) {
                const v = obj[k];
                if (isEmail(v)) return String(v).trim();
            }
            
            // Procurar em todos os campos por valores que parecem emails
            for (const k of keys) {
                const v = obj[k];
                if (isEmail(v)) return String(v).trim();
            }
            
            return '';
        };

        // Debug: log para verificar o que está sendo recebido
        console.log('Procurando email para item:', { 
            id: item?.id, 
            atendenteEmail: item?.atendenteEmail,
            atendenteAtual: item?.atendenteAtual,
            hasDadosCompletos: !!item?.dadosCompletos,
            hasDadosCompletosLista: Array.isArray(item?.dadosCompletosLista) ? item.dadosCompletosLista.length : 0,
            dadosCompletosKeys: item?.dadosCompletos ? Object.keys(item.dadosCompletos) : []
        });
        
        // Log completo dos dados para debug
        console.log('Dados completos do item:', item?.dadosCompletos);

        // Verificar campos diretos primeiro
        if (isEmail(item && item.atendenteEmail)) {
            console.log('Email encontrado em atendenteEmail:', item.atendenteEmail);
            return String(item.atendenteEmail).trim();
        }
        if (isEmail(item && item.atendenteAtual)) {
            console.log('Email encontrado em atendenteAtual:', item.atendenteAtual);
            return String(item.atendenteAtual).trim();
        }

        // Procurar em dadosCompletos
        const fromMain = pickFromObject(item && item.dadosCompletos);
        if (fromMain) {
            console.log('Email encontrado em dadosCompletos:', fromMain);
            return fromMain;
        }

        // Procurar em dadosCompletosLista
        const list = item && item.dadosCompletosLista;
        if (Array.isArray(list)) {
            for (const obj of list) {
                const v = pickFromObject(obj);
                if (v) {
                    console.log('Email encontrado em dadosCompletosLista:', v);
                    return v;
                }
            }
        }

        console.log('Nenhum email válido encontrado para o item');
        return '';
    },

    
    
    // Formatar dados completos para exibição
    formatDadosCompletos(dados) {
        try {
            return JSON.stringify(dados, null, 2)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        } catch (error) {
            return 'Erro ao formatar dados: ' + error.message;
        }
    },

    // Fechar modal
    closeModal() {
        if (elements.detailModal) {
            elements.detailModal.style.display = 'none';
        }
    },

    openSyncModal({ ok, newCount, error }) {
        if (!elements.syncModal) return;
        const n = Number(newCount) || 0;
        const isOk = Boolean(ok);
        const msg = isOk
            ? (n > 0 ? `Sincronização concluída. Há ${n} novas solicitações.` : 'Sincronização concluída. Nenhuma nova solicitação.')
            : `Falha na sincronização: ${String(error || 'Erro inesperado')}`;
        if (elements.syncMessage) elements.syncMessage.textContent = msg;
        elements.syncModal.style.display = 'block';
    },

    closeSyncModal() {
        if (elements.syncModal) {
            elements.syncModal.style.display = 'none';
        }
    },

    openExportConfigModal() {
        if (!elements.exportConfigModal || !elements.exportColumnsList) return;
        const dataset = eventHandlers.getExportDataset();
        const allHeaders = Array.isArray(dataset.headers) ? dataset.headers : [];

        const defaultSelected = ['Unidade', 'Nome', 'Função', 'Etapa Atual', 'Data de Abertura', 'Solicitante', 'Atendente Atual', 'Email Atendente', 'Status', 'Confirmações']
            .filter((h) => allHeaders.includes(h));

        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem('exportConfig') || 'null');
        } catch {}

        const savedSelected = Array.isArray(saved && saved.selectedHeaders) ? saved.selectedHeaders : null;
        const selectedSet = new Set((savedSelected && savedSelected.length ? savedSelected : defaultSelected).map((h) => String(h)));

        const savedOrder = Array.isArray(saved && saved.order) ? saved.order.map((h) => String(h)) : [];
        const order = [
            ...savedOrder.filter((h) => allHeaders.includes(h)),
            ...allHeaders.filter((h) => !savedOrder.includes(h))
        ];

        const format = saved && (saved.format === 'csv' || saved.format === 'xlsx') ? saved.format : 'xlsx';
        const formatInputs = elements.exportConfigModal.querySelectorAll('input[name="exportFormat"]');
        formatInputs.forEach((input) => {
            input.checked = String(input.value) === format;
        });

        elements.exportColumnsList.innerHTML = order.map((h) => {
            const checked = selectedSet.has(h) ? 'checked' : '';
            return `
                <div class="export-col-item" role="listitem" data-key="${h.replace(/"/g, '&quot;')}">
                    <div class="export-col-main">
                        <input class="export-col-check" type="checkbox" ${checked}>
                        <span class="export-col-label">${h}</span>
                    </div>
                    <div class="export-col-controls">
                        <button type="button" class="btn btn-secondary btn-mini export-move-up" aria-label="Mover para cima" title="Mover para cima">
                            <span class="btn-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M12 5l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M12 5l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </button>
                        <button type="button" class="btn btn-secondary btn-mini export-move-down" aria-label="Mover para baixo" title="Mover para baixo">
                            <span class="btn-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M12 19l-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M12 19l6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        elements.exportConfigModal.style.display = 'block';
    },

    closeExportConfigModal() {
        if (elements.exportConfigModal) {
            elements.exportConfigModal.style.display = 'none';
        }
    },

    // Inicializar gráficos
    initCharts(data) {
        this.ensureChartSetup();
        this.createCategoriaChart(data);
        this.createUnidadeChart(data);
        this.createStatusChart(data);
        this.createEvolucaoChart(data);
    },

    ensureChartSetup() {
        if (!window.Chart) return;
        if (this._chartSetupDone) return;
        this._chartSetupDone = true;

        const valueLabelsPlugin = {
            id: 'valueLabels',
            afterDatasetsDraw: (chart, _args, pluginOptions) => {
                const ctx = chart.ctx;
                if (!ctx) return;
                const type = chart.config.type;
                const color = (pluginOptions && pluginOptions.color) || '#094720';
                const fontSize = (pluginOptions && pluginOptions.fontSize) || 11;

                ctx.save();
                ctx.fillStyle = color;
                ctx.font = `${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (!meta || meta.hidden) return;
                    if (!Array.isArray(meta.data)) return;

                    meta.data.forEach((element, index) => {
                        const rawValue = dataset.data && dataset.data[index];
                        const value = rawValue === undefined || rawValue === null ? '' : String(rawValue);
                        if (!value || value === '0') return;

                        const pos = element.tooltipPosition ? element.tooltipPosition() : null;
                        if (!pos) return;

                        let x = pos.x;
                        let y = pos.y;
                        if (type === 'bar' || type === 'line') y = y - 10;

                        ctx.fillText(value, x, y);
                    });
                });

                ctx.restore();
            }
        };

        window.Chart.register(valueLabelsPlugin);
    },

    applyChartFilter({ unidade, categoria, status, etapa, monthYear }) {
        if (unidade !== undefined && elements.unidadeFilter) elements.unidadeFilter.value = unidade;
        if (categoria !== undefined && elements.categoriaFilter) elements.categoriaFilter.value = categoria;
        if (etapa !== undefined && elements.etapaFilter) elements.etapaFilter.value = etapa;
        if (status !== undefined && elements.statusFilter) elements.statusFilter.value = status;

        if (monthYear && elements.dataInicioFilter && elements.dataFimFilter) {
            const parts = String(monthYear).split('/');
            const month = parseInt(parts[0], 10);
            const year = parseInt(parts[1], 10);
            if (!Number.isNaN(month) && !Number.isNaN(year)) {
                const start = new Date(year, month - 1, 1);
                const end = new Date(year, month, 0);
                const toISODate = (d) => d.toISOString().slice(0, 10);
                elements.dataInicioFilter.value = toISODate(start);
                elements.dataFimFilter.value = toISODate(end);
            }
        }

        if (eventHandlers && typeof eventHandlers.applyFilters === 'function') {
            eventHandlers.applyFilters();
        }
    },

    // Gráfico por categoria
    createCategoriaChart(data) {
        const ctx = document.getElementById('categoriaChart');
        if (!ctx) return;

        const categorias = utils.getUniqueValues(data, 'categoria');
        const counts = categorias.map(cat => 
            data.filter(item => item.categoria === cat).length
        );
        const palette = ['#46d643', '#14A449', '#7AB340', '#094720', '#DAEFBE'];
        const colors = categorias.map((_, idx) => palette[idx % palette.length]);

        if (appState.charts.categoria) {
            appState.charts.categoria.destroy();
        }

        appState.charts.categoria = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categorias,
                datasets: [{
                    data: counts,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    valueLabels: { color: '#094720', fontSize: 11 }
                },
                onClick: (_evt, elementsClicked) => {
                    if (!elementsClicked || !elementsClicked.length) return;
                    const i = elementsClicked[0].index;
                    const label = categorias[i];
                    this.applyChartFilter({ categoria: label });
                }
            }
        });
    },

    // Gráfico por unidade
    createUnidadeChart(data) {
        const ctx = document.getElementById('unidadeChart');
        if (!ctx) return;

        const unidades = utils.getUniqueValues(data, 'unidade').slice(0, 8);
        const counts = unidades.map(uni => 
            data.filter(item => item.unidade === uni).length
        );

        if (appState.charts.unidade) {
            appState.charts.unidade.destroy();
        }

        appState.charts.unidade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: unidades,
                datasets: [{
                    label: 'Solicitações',
                    data: counts,
                    backgroundColor: '#14A449'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    valueLabels: { color: '#094720', fontSize: 11 }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                onClick: (_evt, elementsClicked) => {
                    if (!elementsClicked || !elementsClicked.length) return;
                    const i = elementsClicked[0].index;
                    const label = unidades[i];
                    this.applyChartFilter({ unidade: label });
                }
            }
        });
    },

    // Gráfico por status
    createStatusChart(data) {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        const statuses = ['Finalizado', 'Cancelado', 'Em Andamento'];
        const counts = statuses.map(status => 
            data.filter(item => item.status === status).length
        );

        if (appState.charts.status) {
            appState.charts.status.destroy();
        }

        appState.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statuses,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#14A449', '#094720', '#7AB340']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    valueLabels: { color: '#094720', fontSize: 11 }
                },
                onClick: (_evt, elementsClicked) => {
                    if (!elementsClicked || !elementsClicked.length) return;
                    const i = elementsClicked[0].index;
                    const label = statuses[i];
                    this.applyChartFilter({ status: label });
                }
            }
        });
    },

    // Gráfico de evolução
    createEvolucaoChart(data) {
        const ctx = document.getElementById('evolucaoChart');
        if (!ctx) return;

        // Agrupar por mês
        const monthlyData = {};
        data.forEach(item => {
            if (item.dataAbertura) {
                const date = new Date(item.dataAbertura);
                const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
                
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = 0;
                }
                monthlyData[monthYear]++;
            }
        });

        const labels = Object.keys(monthlyData).sort();
        const values = labels.map(label => monthlyData[label]);

        if (appState.charts.evolucao) {
            appState.charts.evolucao.destroy();
        }

        appState.charts.evolucao = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Solicitações',
                    data: values,
                    borderColor: '#14A449',
                    backgroundColor: 'rgba(20, 164, 73, 0.12)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    valueLabels: { color: '#094720', fontSize: 11 }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                onClick: (_evt, elementsClicked) => {
                    if (!elementsClicked || !elementsClicked.length) return;
                    const i = elementsClicked[0].index;
                    const label = labels[i];
                    this.applyChartFilter({ monthYear: label });
                }
            }
        });
    }
};

// Handlers de eventos
const eventHandlers = {
    // Login
    initLoginHandlers() {
        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = elements.usernameInput.value.trim();
                const password = elements.passwordInput.value;
                
                if (!username || !password) {
                    uiManager.showError('Por favor, preencha todos os campos');
                    return;
                }

                // Mostrar loading no botão
                const btnText = elements.loginBtn.querySelector('.btn-text');
                const btnLoader = elements.loginBtn.querySelector('.btn-loader');
                
                if (btnText && btnLoader) {
                    btnText.style.display = 'none';
                    btnLoader.style.display = 'inline';
                }
                
                elements.loginBtn.disabled = true;

                try {
                    const result = await apiService.authenticate(username, password);
                    
                    if (result.success) {
                        // Redirecionar para dashboard
                        window.location.href = 'dashboard.html';
                    } else {
                        uiManager.showError(result.error);
                    }
                } catch (error) {
                    uiManager.showError('Erro inesperado durante o login');
                } finally {
                    // Restaurar botão
                    if (btnText && btnLoader) {
                        btnText.style.display = 'inline';
                        btnLoader.style.display = 'none';
                    }
                    elements.loginBtn.disabled = false;
                }
            });
        }
    },

    // Dashboard
    initDashboardHandlers() {
        // Sincronizar
        if (elements.syncBtn) {
            elements.syncBtn.addEventListener('click', async () => {
                uiManager.showLoader();
                
                try {
                    const result = await apiService.syncData();
                    
                    if (result.success) {
                        // Processar dados e atualizar UI
                        const previousData = Array.isArray(appState.data) ? appState.data : [];
                        const previousIds = new Set(previousData.map((it) => String(it && it.id !== undefined ? it.id : '').trim()).filter(Boolean));
                        const nextData = this.processApiData(result.data);
                        const newCount = previousData.length
                            ? nextData.filter((it) => {
                                const id = String(it && it.id !== undefined ? it.id : '').trim();
                                return id && !previousIds.has(id);
                            }).length
                            : 0;

                        appState.data = nextData;
                        appState.filteredData = utils.filterData(appState.data, appState.filters);
                        
                        uiManager.updateKPICounters(appState.filteredData);
                        uiManager.populateFilters(appState.data);
                        uiManager.updateTable(appState.filteredData);
                        uiManager.initCharts(appState.filteredData);
                        
                        // Salvar dados no localStorage
                        localStorage.setItem('cachedData', JSON.stringify(appState.data));
                        
                        uiManager.openSyncModal({ ok: true, newCount });
                    } else {
                        uiManager.openSyncModal({ ok: false, error: result.error });
                    }
                } catch (error) {
                    uiManager.openSyncModal({ ok: false, error: 'Erro inesperado durante a sincronização' });
                } finally {
                    uiManager.hideLoader();
                }
            });
        }

        // Logout
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('username');
                localStorage.removeItem('cachedData');
                window.location.href = 'login.html';
            });
        }

        // Filtros
        if (elements.applyFiltersBtn) {
            elements.applyFiltersBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        if (elements.clearFiltersBtn) {
            elements.clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Carregar mais
        if (elements.loadMoreBtn) {
            elements.loadMoreBtn.addEventListener('click', () => {
                appState.currentPage++;
                uiManager.updateTable(appState.filteredData);
            });
        }

        if (elements.exportConfigBtn) {
            elements.exportConfigBtn.addEventListener('click', () => {
                uiManager.openExportConfigModal();
            });
        }

        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', (e) => {
                uiManager.setSortKey(e.target.value);
            });
        }

        if (elements.pageSizeSelect) {
            elements.pageSizeSelect.addEventListener('change', (e) => {
                uiManager.setPageSize(e.target.value);
            });
        }

        if (elements.viewCardsBtn) {
            elements.viewCardsBtn.addEventListener('click', () => {
                uiManager.setListView('cards');
            });
        }

        if (elements.viewListBtn) {
            elements.viewListBtn.addEventListener('click', () => {
                uiManager.setListView('list');
            });
        }

        if (elements.tabAllBtn) {
            elements.tabAllBtn.addEventListener('click', () => {
                uiManager.setListTab('all');
            });
        }

        if (elements.tabPinnedBtn) {
            elements.tabPinnedBtn.addEventListener('click', () => {
                uiManager.setListTab('pinned');
            });
        }

        // Modal
        if (elements.closeModalBtn) {
            elements.closeModalBtn.addEventListener('click', () => {
                uiManager.closeModal();
            });
        }

        // Fechar modal clicando fora
        if (elements.detailModal) {
            elements.detailModal.addEventListener('click', (e) => {
                if (e.target === elements.detailModal) {
                    uiManager.closeModal();
                }
            });
        }

        if (elements.closeSyncModalBtn) {
            elements.closeSyncModalBtn.addEventListener('click', () => {
                uiManager.closeSyncModal();
            });
        }

        if (elements.syncModal) {
            elements.syncModal.addEventListener('click', (e) => {
                if (e.target === elements.syncModal) {
                    uiManager.closeSyncModal();
                }
            });
        }

        if (elements.closeExportConfigModalBtn) {
            elements.closeExportConfigModalBtn.addEventListener('click', () => {
                uiManager.closeExportConfigModal();
            });
        }

        if (elements.exportConfigCancelBtn) {
            elements.exportConfigCancelBtn.addEventListener('click', () => {
                uiManager.closeExportConfigModal();
            });
        }

        if (elements.exportConfigModal) {
            elements.exportConfigModal.addEventListener('click', (e) => {
                if (e.target === elements.exportConfigModal) {
                    uiManager.closeExportConfigModal();
                }
            });
        }

        if (elements.exportColumnsList) {
            elements.exportColumnsList.addEventListener('click', (e) => {
                const target = e.target;
                const item = target && target.closest ? target.closest('.export-col-item') : null;
                if (!item) return;
                const upBtn = target.closest ? target.closest('.export-move-up') : null;
                const downBtn = target.closest ? target.closest('.export-move-down') : null;
                if (upBtn) {
                    const prev = item.previousElementSibling;
                    if (prev) item.parentElement.insertBefore(item, prev);
                } else if (downBtn) {
                    const next = item.nextElementSibling;
                    if (next) item.parentElement.insertBefore(next, item);
                }
            });
        }

        if (elements.cardsContainer) {
            elements.cardsContainer.addEventListener('click', (e) => {
                const target = e.target;
                const pin = target && target.closest ? target.closest('[data-action="pin"]') : null;
                if (pin) {
                    const id = pin.getAttribute('data-id');
                    uiManager.togglePinned(id);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const card = target && target.closest ? target.closest('.request-card') : null;
                if (!card) return;
                const index = parseInt(card.getAttribute('data-index') || '', 10);
                if (!Number.isNaN(index)) uiManager.openModal(index);
            });
        }

        if (elements.tableBody) {
            elements.tableBody.addEventListener('click', (e) => {
                const target = e.target;
                const pin = target && target.closest ? target.closest('[data-action="pin"]') : null;
                if (pin) {
                    const id = pin.getAttribute('data-id');
                    uiManager.togglePinned(id);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }

                const row = target && target.closest ? target.closest('tr[data-index]') : null;
                if (!row) return;
                const index = parseInt(row.getAttribute('data-index') || '', 10);
                if (!Number.isNaN(index)) uiManager.openModal(index);
            });
        }

        if (elements.exportConfigDownloadBtn) {
            elements.exportConfigDownloadBtn.addEventListener('click', () => {
                if (!elements.exportColumnsList || !elements.exportConfigModal) return;

                const selectedHeaders = Array.from(elements.exportColumnsList.querySelectorAll('.export-col-item'))
                    .filter((el) => {
                        const cb = el.querySelector('.export-col-check');
                        return cb && cb.checked;
                    })
                    .map((el) => String(el.getAttribute('data-key') || '').trim())
                    .filter(Boolean);

                const order = Array.from(elements.exportColumnsList.querySelectorAll('.export-col-item'))
                    .map((el) => String(el.getAttribute('data-key') || '').trim())
                    .filter(Boolean);

                const formatInput = elements.exportConfigModal.querySelector('input[name="exportFormat"]:checked');
                const format = formatInput ? String(formatInput.value) : 'xlsx';

                localStorage.setItem('exportConfig', JSON.stringify({ format, selectedHeaders, order }));
                uiManager.closeExportConfigModal();

                if (!selectedHeaders.length) return;
                if (format === 'csv') {
                    this.exportCSV(selectedHeaders);
                } else {
                    this.exportXLSX(selectedHeaders);
                }
            });
        }

        // Busca em tempo real
        if (elements.searchFilter) {
            elements.searchFilter.addEventListener('input', (e) => {
                appState.filters.search = e.target.value;
                this.applyFilters();
            });
        }
    },

    // Aplicar filtros
    applyFilters() {
        appState.filters = {
            unidade: elements.unidadeFilter.value,
            categoria: elements.categoriaFilter.value,
            etapa: elements.etapaFilter.value,
            status: elements.statusFilter.value,
            dataInicio: elements.dataInicioFilter.value,
            dataFim: elements.dataFimFilter.value,
            search: elements.searchFilter.value
        };

        appState.filteredData = utils.filterData(appState.data, appState.filters);
        appState.currentPage = 1;
        
        uiManager.updateKPICounters(appState.filteredData);
        uiManager.updateTable(appState.filteredData);
        uiManager.initCharts(appState.filteredData);
        uiManager.updateFiltersIndicator();
    },

    // Limpar filtros
    clearFilters() {
        if (elements.unidadeFilter) elements.unidadeFilter.value = '';
        if (elements.categoriaFilter) elements.categoriaFilter.value = '';
        if (elements.etapaFilter) elements.etapaFilter.value = '';
        if (elements.statusFilter) elements.statusFilter.value = '';
        if (elements.dataInicioFilter) elements.dataInicioFilter.value = '';
        if (elements.dataFimFilter) elements.dataFimFilter.value = '';
        if (elements.searchFilter) elements.searchFilter.value = '';

        this.applyFilters();
    },

    getExportDataset(headersOverride) {
        const data = Array.isArray(appState.filteredData) ? appState.filteredData : [];

        const valueToString = (v) => {
            if (v === undefined || v === null) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            try {
                return JSON.stringify(v);
            } catch {
                return String(v);
            }
        };

        const unique = (arr) => Array.from(new Set(arr.filter((x) => x !== '')));

        const mergeRawList = (list) => {
            const merged = {};
            const keys = new Set();
            for (const row of list) {
                if (!row || typeof row !== 'object') continue;
                for (const k of Object.keys(row)) keys.add(k);
            }
            for (const k of keys) {
                const parts = [];
                for (const row of list) {
                    if (!row || typeof row !== 'object') continue;
                    const val = valueToString(row[k]);
                    if (val) parts.push(val);
                }
                const vals = unique(parts);
                merged[k] = vals.length <= 1 ? (vals[0] || '') : vals.join(' | ');
            }
            return merged;
        };

        const exportObjects = data.map((item) => {
            const rawList = Array.isArray(item.dadosCompletosLista) && item.dadosCompletosLista.length
                ? item.dadosCompletosLista
                : item.dadosCompletos
                    ? [item.dadosCompletos]
                    : [];

            const mergedRaw = mergeRawList(rawList);

            const base = {
                'Unidade': item.unidade || '',
                'Nome': item.nome || '',
                'Função': item.funcao || '',
                'Etapa Atual': item.etapa || '',
                'Data de Abertura': utils.formatDate(item.dataAbertura) || '',
                'Solicitante': item.solicitante || '',
                'Atendente Atual': item.atendenteAtual || '',
                'Email Atendente': item.atendenteEmail || '',
                'Status': item.status || '',
                'Confirmações': item.confirmacoes || ''
            };

            return { ...base, ...mergedRaw };
        });

        const preferred = ['Unidade', 'Nome', 'Função', 'Etapa Atual', 'Data de Abertura', 'Solicitante', 'Atendente Atual', 'Email Atendente', 'Status', 'Confirmações'];
        const allKeys = new Set(preferred);
        for (const obj of exportObjects) {
            for (const k of Object.keys(obj)) allKeys.add(k);
        }

        const restKeys = Array.from(allKeys).filter((k) => !preferred.includes(k)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const defaultHeaders = [...preferred, ...restKeys];
        const headers = Array.isArray(headersOverride) && headersOverride.length ? headersOverride : defaultHeaders;
        const rows = exportObjects.map((obj) => headers.map((h) => valueToString(obj[h])));

        return { headers, rows, exportObjects };
    },

    exportCSV(headersOverride) {
        const { headers, rows } = this.getExportDataset(headersOverride);
        const escape = (value) => {
            const str = value === null || value === undefined ? '' : String(value);
            const needsQuotes = /[",\n;]/.test(str);
            const escaped = str.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
        };

        const lines = [
            headers.map(escape).join(';'),
            ...rows.map((r) => r.map(escape).join(';'))
        ];

        const csv = `\uFEFF${lines.join('\n')}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const date = new Date().toISOString().slice(0, 10);
        this.downloadBlob(blob, `solicitacoes_${date}.csv`);
    },

    exportXLSX(headersOverride) {
        const { headers, exportObjects } = this.getExportDataset(headersOverride);
        const date = new Date().toISOString().slice(0, 10);

        if (!window.XLSX) {
            this.exportCSV(headersOverride);
            return;
        }

        const ws = window.XLSX.utils.json_to_sheet(exportObjects, { header: headers });
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Solicitacoes');
        const userRows = usersDirectory.getRows();
        if (Array.isArray(userRows) && userRows.length) {
            const wsUsers = window.XLSX.utils.json_to_sheet(userRows);
            window.XLSX.utils.book_append_sheet(wb, wsUsers, 'Usuarios');
            wb.Workbook = wb.Workbook || {};
            const sheetsMeta = wb.SheetNames.map((name) => ({ name }));
            const idx = wb.SheetNames.indexOf('Usuarios');
            if (idx >= 0) sheetsMeta[idx].Hidden = 1;
            wb.Workbook.Sheets = sheetsMeta;
        }
        window.XLSX.writeFile(wb, `solicitacoes_${date}.xlsx`);
    },

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    },

    // Processar dados da API RM TOTVS
    processApiData(apiData) {
        console.log('Dados brutos da API:', apiData);
        let rows = null;

        if (Array.isArray(apiData)) {
            rows = apiData;
        } else if (apiData && Array.isArray(apiData.value)) {
            rows = apiData.value;
        } else if (apiData && Array.isArray(apiData.result)) {
            rows = apiData.result;
        } else if (apiData && Array.isArray(apiData.data)) {
            rows = apiData.data;
        } else if (apiData && typeof apiData === 'object') {
            for (const key in apiData) {
                if (Array.isArray(apiData[key])) {
                    rows = apiData[key];
                    break;
                }
            }
        }

        if (rows) {
            const mapped = rows.map((item, index) => this.mapApiItem(item, index));
            return this.aggregateRecords(mapped);
        }

        if (apiData && typeof apiData === 'object') {
            return this.aggregateRecords([this.mapApiItem(apiData, 0)]);
        }

        console.warn('Nenhum dado válido encontrado na resposta da API. Retornando array vazio.');
        return [];
    },
    
    // Mapear item individual da API para o formato interno
    mapApiItem(item, index) {
        // Esta função precisa ser adaptada conforme a estrutura real dos dados
        // Aqui estou fazendo um mapeamento genérico baseado em nomes comuns de campos
        
        // Processar confirmações - concatenar se for array
        const confirmacoesRaw =
            item['CONFIRMAÇÕES'] ||
            item['CONFIRMACOES'] ||
            item.confirmacoes ||
            item.CONFIRMACOES ||
            item.approvals ||
            item.APPROVALS ||
            item.confirmations ||
            item.CONFIRMATIONS ||
            '';
        const confirmacoesProcessed = this.processConfirmacoes(confirmacoesRaw);

        const etapaAtualRaw =
            item.ETAPA_ATUAL ||
            item.etapa_atual ||
            item.etapaAtual ||
            item.ETAPA ||
            item.etapa ||
            item.phase ||
            item.PHASE ||
            '';

        const responsavelRaw =
            item.RESPONSAVEL ||
            item.responsavel ||
            item.RESPONSÁVEL ||
            item['RESPONSÁVEL'] ||
            item['RESPONSAVEL'] ||
            item.ATENDENTE_ATUAL ||
            item.atendente_atual ||
            item.atendenteAtual ||
            '';

        const responsavelEmailRaw =
            item.EMAIL ||
            item.email ||
            item.EMAIL_RESPONSAVEL ||
            item.email_responsavel ||
            item.EMAIL_ATENDENTE ||
            item.email_atendente ||
            item['E-MAIL'] ||
            item['E_MAIL'] ||
            '';

        const statusRaw =
            item.STATUS ||
            item.status ||
            item.SITUACAO ||
            item.situacao ||
            item.state ||
            item.STATE ||
            '';
        const statusTexto = this.translateStatus(statusRaw) || 'Em Andamento';

        const etapaTexto = String(etapaAtualRaw || '').trim();
        const etapaFinal = etapaTexto ? etapaTexto : (statusTexto === 'Cancelado' ? 'Cancelado' : 'N/A');
        
        const id =
            item.id ||
            item.ID ||
            item.codigo ||
            item.CODIGO ||
            item.codSolicitacao ||
            item.CODSOLICITACAO ||
            item.numProcesso ||
            item.NUMPROCESSO ||
            item.codProcesso ||
            item.CODPROCESSO ||
            index + 1;

        const categoriaRaw = item.categoria || item.CATEGORIA || item.type || item.TYPE || item.tipo || item.TIPO || 'Termino de Contrato';
        const categoriaNorm = String(categoriaRaw || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
        const categoriaFinal = categoriaNorm === 'rescisao' || categoriaNorm === 'rescisaoes' || categoriaNorm.includes('rescis')
            ? 'Termino de Contrato'
            : String(categoriaRaw || '').trim() || 'Termino de Contrato';

        return {
            id,
            assunto: item.assunto || item.ASSUNTO || item.descricao || item.DESCRICAO || item.nome || item.NOME || 'Solicitação de Rescisão',
            unidade: item.unidade || item.UNIDADE || item.filial || item.FILIAL || item.departamento || item.DEPARTAMENTO || 'N/A',
            nome: item.nome || item.NOME || item.funcionario || item.FUNCIONARIO || item.colaborador || item.COLABORADOR || 'Funcionário',
            funcao: item.funcao || item.FUNCAO || item.cargo || item.CARGO || item.position || item.POSITION || '',
            etapa: etapaFinal,
            dataAbertura: item.dataAbertura || item.DATA_ABERTURA || item.data || item.DATA || item.createDate || item.CREATE_DATE || new Date().toISOString(),
            solicitante: item.solicitante || item.SOLICITANTE || item.requester || item.REQUESTER || item.usuario || item.USUARIO || '',
            confirmacoes: confirmacoesProcessed,
            status: statusTexto,
            atendenteAtual: responsavelRaw,
            atendenteEmail: responsavelEmailRaw,
            categoria: categoriaFinal,
            descricao: item.descricao || item.DESCRICAO || item.description || item.DESCRIPTION || item.observacao || item.OBSERVACAO || '',
            dadosCompletos: item
        };
    },
    
    // Processar confirmações - concatenar se for array ou objeto
    processConfirmacoes(confirmacoes) {
        if (!confirmacoes) return '';
        
        // Se for array, concatenar com vírgulas
        if (Array.isArray(confirmacoes)) {
            return confirmacoes.filter(Boolean).join(', ');
        }
        
        // Se for objeto, extrair valores
        if (typeof confirmacoes === 'object') {
            const valores = Object.values(confirmacoes).filter(Boolean);
            return valores.join(', ');
        }
        
        // Se já for string, retornar como está
        return String(confirmacoes);
    },

    translateStatus(status) {
        if (status === undefined || status === null) return '';
        const s = String(status).trim();
        if (!s) return '';
        const upper = s.toUpperCase();

        if (upper === 'A') return 'Em Andamento';
        if (upper === 'C') return 'Cancelado';
        if (upper === 'O') return 'Finalizado';

        if (upper === 'EM ANDAMENTO' || upper === 'EM ADAMENTO') return 'Em Andamento';
        if (upper === 'CANCELADO') return 'Cancelado';
        if (upper === 'FINALIZADO') return 'Finalizado';

        return s;
    },

    aggregateRecords(records) {
        const groups = new Map();

        const toParts = (value) => {
            if (!value) return [];
            const str = String(value);
            return str
                .split(/[,\n;|]+/g)
                .map((s) => s.trim())
                .filter(Boolean);
        };

        const unique = (arr) => Array.from(new Set(arr));

        const getKeyFromRaw = (raw) => {
            if (!raw || typeof raw !== 'object') return null;
            const candidates = [
                'id',
                'ID',
                'Id',
                'codigo',
                'CODIGO',
                'codSolicitacao',
                'CODSOLICITACAO',
                'cod_solicitacao',
                'COD_SOLICITACAO',
                'numProcesso',
                'NUMPROCESSO',
                'num_processo',
                'NUM_PROCESSO',
                'codProcesso',
                'CODPROCESSO',
                'cod_processo',
                'COD_PROCESSO'
            ];
            for (const k of candidates) {
                const v = raw[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
            }
            return null;
        };

        const normalizeKeyPart = (v) => {
            if (v === undefined || v === null) return '';
            return String(v).trim().toLowerCase().replace(/\s+/g, ' ');
        };

        const getCompositeKey = (rec) => {
            return [
                normalizeKeyPart(rec.unidade),
                normalizeKeyPart(rec.nome),
                normalizeKeyPart(rec.funcao),
                normalizeKeyPart(rec.etapa),
                normalizeKeyPart(rec.dataAbertura),
                normalizeKeyPart(rec.solicitante)
            ].join('|');
        };

        for (const rec of records) {
            const rawKey = getKeyFromRaw(rec.dadosCompletos);
            const key = rawKey || getCompositeKey(rec);

            const existing = groups.get(key);
            if (!existing) {
                groups.set(key, {
                    ...rec,
                    dadosCompletosLista: rec.dadosCompletos ? [rec.dadosCompletos] : [],
                    _confirmacoesParts: toParts(rec.confirmacoes)
                });
                continue;
            }

            existing.dadosCompletosLista.push(rec.dadosCompletos);
            existing._confirmacoesParts.push(...toParts(rec.confirmacoes));

            const fields = ['assunto', 'unidade', 'nome', 'funcao', 'etapa', 'dataAbertura', 'solicitante', 'atendenteAtual', 'atendenteEmail', 'status', 'categoria', 'descricao'];
            for (const f of fields) {
                if ((!existing[f] || existing[f] === 'N/A') && rec[f]) existing[f] = rec[f];
            }
        }

        return Array.from(groups.values()).map((r) => {
            const confirmacoes = unique(r._confirmacoesParts).join(', ');
            const { _confirmacoesParts, dadosCompletos, ...rest } = r;
            return {
                ...rest,
                confirmacoes,
                dadosCompletosLista: r.dadosCompletosLista
            };
        });
    }
};

// Função de debug para testar conexão com a API
async function testAPIConnection() {
    console.log('Testando conexão com a API...');
    
    try {
        // Teste simples de conexão sem autenticação
        const testResponse = await fetch(API_CONFIG.BASE_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
        });
        
        console.log('Teste de conexão - Status:', testResponse.status, testResponse.statusText);
        console.log('Teste de conexão - Headers:', Object.fromEntries(testResponse.headers.entries()));
        
        if (testResponse.status === 401) {
            console.log('API requer autenticação (esperado)');
            return { accessible: true, requiresAuth: true };
        }
        
        return { accessible: testResponse.ok, requiresAuth: testResponse.status === 401 };
        
    } catch (error) {
        console.error('Erro no teste de conexão:', error);
        return { 
            accessible: false, 
            error: error.message,
            requiresAuth: false 
        };
    }
}

function isEmailConfigSet() {
    const invalid = new Set(['', 'SEU_EMAILJS_SERVICE_ID', 'SEU_EMAILJS_TEMPLATE_ID', 'SUA_EMAILJS_PUBLIC_KEY']);
    const serviceId = String(EMAIL_CONFIG.serviceId || '').trim();
    const templateId = String(EMAIL_CONFIG.templateId || '').trim();
    const publicKey = String(EMAIL_CONFIG.publicKey || '').trim();

    if (!EMAIL_CONFIG) return false;
    if (invalid.has(serviceId) || invalid.has(templateId) || invalid.has(publicKey)) return false;

    if (!/^service_[a-zA-Z0-9]+$/.test(serviceId)) return false;
    if (!/^template_[a-zA-Z0-9]+$/.test(templateId)) return false;
    if (templateId.includes('@')) return false;
    if (publicKey.length < 10) return false;

    return true;
}

// Inicialização da aplicação
const app = {
    async init() {
        // Verificar autenticação
        const authToken = localStorage.getItem('authToken');
        const username = localStorage.getItem('username');
        
        if (authToken && username) {
            appState.isAuthenticated = true;
            appState.currentUser = username;
        }

        // Testar conexão com a API para debug
        if (!window.location.href.includes('dashboard.html')) {
            const connectionTest = await testAPIConnection();
            console.log('Resultado do teste de conexão:', connectionTest);
            
            if (!connectionTest.accessible) {
                console.warn('⚠️  API pode não estar acessível. Verifique:');
                console.warn('1. URL da API: ', API_CONFIG.BASE_URL);
                console.warn('2. Problemas de CORS');
                console.warn('3. Conexão de rede');
                
                // Mostrar alerta apenas na página de login
                if (window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/')) {
                    setTimeout(() => {
                        alert('⚠️  Aviso: A API pode não estar acessível. \n\n' +
                              'Isso pode ser devido a:\n' +
                              '• Problemas de CORS (configuração do servidor)\n' +
                              '• API offline ou URL incorreta\n' +
                              '• Problemas de rede\n\n' +
                              'O sistema usará dados de demonstração.');
                    }, 1000);
                }
            }
        }

        // Inicializar handlers baseado na página atual
        if (window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/')) {
            if (appState.isAuthenticated) {
                window.location.href = 'dashboard.html';
            } else {
                eventHandlers.initLoginHandlers();
            }
        } else if (window.location.pathname.includes('dashboard.html')) {
            if (!appState.isAuthenticated) {
                window.location.href = 'login.html';
                return;
            }

            uiManager.loadListPreferences();
            uiManager.syncListControlsUI();

            await usersDirectory.load();
            if (elements.userGreeting) {
                const username = appState.currentUser || '';
                const fullName = usersDirectory.resolveFullName(username);
                const nome = utils.formatDisplayName(fullName) || username;
                const hora = new Date().getHours();
                const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
                elements.userGreeting.textContent = nome ? `${saudacao}, ${nome}` : saudacao;
            }

            const dateTimeEl = document.getElementById('currentDateTime');
            if (dateTimeEl) {
                const format = () => new Date().toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                dateTimeEl.textContent = format();
                if (window.__headerClockInterval) clearInterval(window.__headerClockInterval);
                window.__headerClockInterval = setInterval(() => {
                    dateTimeEl.textContent = format();
                }, 1000);
            }

            // Carregar dados iniciais
            this.loadInitialData();
            eventHandlers.initDashboardHandlers();
        }
    },

    async loadInitialData() {
        // Tentar carregar dados do cache primeiro
        const cachedData = localStorage.getItem('cachedData');
        
        if (cachedData) {
            try {
                appState.data = JSON.parse(cachedData);
                appState.filteredData = utils.filterData(appState.data, appState.filters);
                
                uiManager.updateKPICounters(appState.filteredData);
                uiManager.populateFilters(appState.data);
                uiManager.updateTable(appState.filteredData);
                uiManager.initCharts(appState.filteredData);
                
                return;
            } catch (error) {
                console.error('Erro ao carregar dados do cache:', error);
            }
        }

        // Se não houver cache, buscar da API
        uiManager.showLoader();
        
        try {
            const result = await apiService.fetchData();
            
            if (result.success) {
                appState.data = eventHandlers.processApiData(result.data);
                appState.filteredData = utils.filterData(appState.data, appState.filters);
                
                uiManager.updateKPICounters(appState.filteredData);
                uiManager.populateFilters(appState.data);
                uiManager.updateTable(appState.filteredData);
                uiManager.initCharts(appState.filteredData);
                
                // Salvar no cache
                localStorage.setItem('cachedData', JSON.stringify(appState.data));
            } else {
                alert('Erro ao carregar dados: ' + result.error);
                
                // Usar dados mock em caso de erro
                appState.data = eventHandlers.processApiData(null);
                appState.filteredData = utils.filterData(appState.data, appState.filters);
                
                uiManager.updateKPICounters(appState.filteredData);
                uiManager.populateFilters(appState.data);
                uiManager.updateTable(appState.filteredData);
                uiManager.initCharts(appState.filteredData);
            }
        } catch (error) {
            alert('Erro inesperado ao carregar dados');
            
            // Usar dados mock em caso de erro
            appState.data = eventHandlers.processApiData(null);
            appState.filteredData = utils.filterData(appState.data, appState.filters);
            
            uiManager.updateKPICounters(appState.filteredData);
            uiManager.populateFilters(appState.data);
            uiManager.updateTable(appState.filteredData);
            uiManager.initCharts(appState.filteredData);
        } finally {
            uiManager.hideLoader();
        }
    }
};

// Funções globais para acesso via HTML
function openModal(index) {
    uiManager.openModal(index);
}

function showLoader() {
    uiManager.showLoader();
}

function hideLoader() {
    uiManager.hideLoader();
}

function cancelSolicitacao() {
    const btn = document.getElementById('cancelRequestBtn');
    const statusEl = document.getElementById('cancelStatus');
    const item = appState.selectedItem;
    
    if (!item) {
        if (statusEl) {
            statusEl.textContent = 'Nenhuma solicitação selecionada.';
            statusEl.classList.remove('success');
            statusEl.classList.add('error');
        }
        return;
    }
    
    // Mostrar modal de confirmação
    const modal = document.getElementById('confirmCancelModal');
    modal.style.display = 'block';
    
    // Configurar eventos do modal
    const closeModal = () => {
        modal.style.display = 'none';
    };
    
    // Fechar modal ao clicar no X
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = closeModal;
    
    // Fechar modal ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Botão Não
    const noBtn = document.getElementById('confirmCancelNo');
    noBtn.onclick = closeModal;
    
    // Botão Sim
    const yesBtn = document.getElementById('confirmCancelYes');
    yesBtn.onclick = async () => {
        closeModal();
        await uiManager.sendCancelEmail(item, btn, statusEl);
    };
}

// Criar modal de confirmação de cancelamento
const confirmModalHTML = `
<div id="confirmCancelModal" class="modal" style="display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
    <div class="modal-content" style="background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); position: relative;">
        <span class="close" style="position: absolute; right: 15px; top: 10px; color: #aaa; font-size: 24px; font-weight: bold; cursor: pointer;">&times;</span>
        <h3 style="margin-top: 0; color: #333;">Confirmar Cancelamento</h3>
        <p style="margin: 15px 0;">Ao confirmar, será enviado um e-mail para equiperescisao@iadvh.org.br para formalizar a solicitação de cancelamento. Deseja continuar?</p>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="confirmCancelNo" style="padding: 8px 16px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Não</button>
            <button id="confirmCancelYes" style="padding: 8px 16px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Sim, Solicitar Cancelamento</button>
        </div>
    </div>
</div>
`;

// Adicionar modal ao DOM
document.body.insertAdjacentHTML('beforeend', confirmModalHTML);

// Iniciar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
