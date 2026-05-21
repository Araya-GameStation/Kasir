const app = document.getElementById("app");
let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
let _isRendering = false;
let _lastView = null;

const NAV_ORDER = ['kasir','openBill','history','laporan','pengeluaran','bahanManager','menuManager','modifierManager','settings'];

window.triggerPageTransition = function(direction = 'forward') {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const el = document.querySelector('.main-inner');
            if (!el) return;
            el.classList.remove('page-enter', 'page-enter-back');
            void el.offsetWidth;
            el.classList.add(direction === 'back' ? 'page-enter-back' : 'page-enter');
        });
    });
};

window.navigateTo = function(view) {
    if (_lastView === view) return;
    if (window.innerWidth <= 768) {
        sidebarCollapsed = true;
        window.sidebarCollapsed = true;
        localStorage.setItem('sidebarCollapsed', true);
    }
    const fromIdx = NAV_ORDER.indexOf(_lastView);
    const toIdx   = NAV_ORDER.indexOf(view);
    const dir = (fromIdx !== -1 && toIdx !== -1 && toIdx < fromIdx) ? 'back' : 'forward';
    _lastView = view;
    state.currentView = view;
    if (view === 'kasir')                window.renderKasir?.();
    else if (view === 'history')         window.renderHistory?.();
    else if (view === 'menuManager')     window.renderMenuManager?.();
    else if (view === 'bahanManager')    window.renderBahanManager?.();
    else if (view === 'modifierManager') window.renderModifierManager?.();
    else if (view === 'laporan')         window.renderLaporan?.();
    else if (view === 'settings')        window.renderSettings?.();
    window._startTopProgress?.();
    setTimeout(() => {
        window.triggerPageTransition(dir);
        window._doneTopProgress?.();
    }, 60);
};

function createState(initialState) {
    const handlers = {
        set(target, property, value) {
            if (target[property] === value) return true;
            target[property] = value;
            const shouldRender = [
                'currentView','cart','selectedCategory','selectedTable',
                'selectedPaymentMethod','cashAmount','qrisAmount',
                'transactions','selectedHistory','selectedMenus',
                'modifierGroups','openBills','activeMobileTab'
            ].includes(property);
            if (!_isRendering && shouldRender) {
                _isRendering = true;
                requestAnimationFrame(() => {
                    window.safeRender();
                    _isRendering = false;
                });
            }
            return true;
        }
    };
    return new Proxy(initialState, handlers);
}

let state = createState({
    user: null, cart: [], menus: [], categories: [],
    selectedCategory: "ALL", selectedMenus: new Set(),
    transactions: [], allTransactions: [],
    expandedHistory: null, selectedHistory: new Set(),
    currentView: "kasir", currentCategoryId: null,
    currentSession: null, sessions: [], allSessions: [],
    rawMaterials: [], stockMutations: [], tables: [],
    selectedTable: null, settings: null, offlineQueue: [],
    pengeluaran: [], selectedPaymentMethod: 'tunai',
    cashAmount: 0, qrisAmount: 0,
    lastCategoryScroll: 0, lastMenuScroll: 0, lastCartScroll: 0,
    modifierGroups: [], openBills: [],
    kasirSearchQuery: '', categorySearchQuery: '',
    activeMobileTab: 'menu'
});

window.app = app;
window.state = state;
window.sidebarCollapsed = sidebarCollapsed;

window.toggleSidebar = function () {
    sidebarCollapsed = !sidebarCollapsed;
    window.sidebarCollapsed = sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    window.safeRender();
};

window.safeRender = function () {
    if (_isRendering) return;
    _isRendering = true;
    const viewChanged = _lastView !== state.currentView;
    if (viewChanged) _lastView = state.currentView;
    requestAnimationFrame(() => {
        try {
            if      (state.currentView === "kasir"          && typeof window.renderKasir         === 'function') window.renderKasir();
            else if (state.currentView === "history"         && typeof window.renderHistory        === 'function') window.renderHistory();
            else if (state.currentView === "menuManager"     && typeof window.renderMenuManager    === 'function') window.renderMenuManager();
            else if (state.currentView === "openCategory"    && typeof window.openCategory         === 'function') window.openCategory(state.currentCategoryId);
            else if (state.currentView === "bahanManager"    && typeof window.renderBahanManager   === 'function') window.renderBahanManager();
            else if (state.currentView === "modifierManager" && typeof window.renderModifierManager === 'function') window.renderModifierManager();
            else if (state.currentView === "laporan"         && typeof window.renderLaporan        === 'function') window.renderLaporan();
            else if (state.currentView === "settings"        && typeof window.renderSettings       === 'function') window.renderSettings();
            if (viewChanged) {
                window._startTopProgress?.();
                setTimeout(() => {
                    window.triggerPageTransition('forward');
                    window._doneTopProgress?.();
                }, 60);
            }
        } catch (e) {
        } finally {
            _isRendering = false;
        }
    });
};
