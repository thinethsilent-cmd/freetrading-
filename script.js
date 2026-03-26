/**
 * AuraX - AI Crypto Signal Generator v4.2
 * Full-stack client-side application
 * Features: Real-time data, AI Signals, Portfolio, Live Feed, Charts
 */

// ───────────────────────────────────────────────
// GLOBAL STATE
// ───────────────────────────────────────────────
const APP = {
    user: null,
    cryptoData: [],
    selectedCoin: null,
    currentInterval: '15',
    savedSignals: JSON.parse(localStorage.getItem('aurax_signals') || '[]'),
    holdings: JSON.parse(localStorage.getItem('aurax_holdings') || '[]'),
    settings: JSON.parse(localStorage.getItem('aurax_settings') || '{}'),
    liveSignals: [],
    tickerInterval: null,
    currentFilter: 'all',
    signalFilter: 'all',
    currentPage: 'dashboard',
};

// ───────────────────────────────────────────────
// UTILITY FUNCTIONS
// ───────────────────────────────────────────────
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
}
window.togglePassword = togglePassword;

function formatNumber(num, decimals = 2) {
    if (num === undefined || num === null || isNaN(num)) return '--';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatPrice(num) {
    if (!num && num !== 0) return '--';
    if (num < 0.01) return '$' + num.toFixed(6);
    if (num < 1) return '$' + num.toFixed(4);
    return '$' + formatNumber(num, 2);
}

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}

// ───────────────────────────────────────────────
// TOAST SYSTEM
// ───────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s, transform 0.4s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ───────────────────────────────────────────────
// LIVE CLOCK
// ───────────────────────────────────────────────
function startClock() {
    const el = document.getElementById('topbar-time');
    if (!el) return;
    function update() {
        const now = new Date();
        el.textContent = now.toUTCString().replace(' GMT', ' UTC').slice(0, -4);
    }
    update();
    setInterval(update, 1000);
}

// ───────────────────────────────────────────────
// PARTICLES CANVAS
// ───────────────────────────────────────────────
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    });
    const particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1
    }));
    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(59,130,246,${p.opacity})`;
            ctx.fill();
        });
        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(59,130,246,${0.07 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
    // Toggle
    document.getElementById('particles-toggle')?.addEventListener('change', (e) => {
        canvas.style.display = e.target.checked ? 'block' : 'none';
    });
}

// ───────────────────────────────────────────────
// AUTHENTICATION
// ───────────────────────────────────────────────
function initAuth() {
    const loginOverlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('app-dashboard');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            loginForm.style.display = target === 'login' ? '' : 'none';
            registerForm.style.display = target === 'register' ? '' : 'none';
        });
    });

    // Login
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const btn = document.getElementById('login-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        btn.disabled = true;
        setTimeout(() => {
            const name = email.split('@')[0];
            APP.user = { name: capitalize(name), email };
            localStorage.setItem('aurax_user', JSON.stringify(APP.user));
            loginOverlay.style.opacity = '0';
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                dashboard.classList.remove('hidden');
                onDashboardReady();
            }, 400);
        }, 1600);
    });

    // Register
    registerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const btn = document.getElementById('register-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
        btn.disabled = true;
        setTimeout(() => {
            APP.user = { name, email };
            localStorage.setItem('aurax_user', JSON.stringify(APP.user));
            loginOverlay.style.opacity = '0';
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                dashboard.classList.remove('hidden');
                showToast(`Welcome to AuraX, ${name}! 🎉`, 'success');
                onDashboardReady();
            }, 400);
        }, 1800);
    });

    // Auto-login
    const savedUser = localStorage.getItem('aurax_user');
    if (savedUser) {
        APP.user = JSON.parse(savedUser);
        loginOverlay.style.display = 'none';
        dashboard.classList.remove('hidden');
        onDashboardReady();
    }

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        localStorage.removeItem('aurax_user');
        location.reload();
    });
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ───────────────────────────────────────────────
// DASHBOARD INIT
// ───────────────────────────────────────────────
function onDashboardReady() {
    updateUserUI();
    startClock();
    fetchCryptoData();
    initNavigation();
    initSidebar();
    initSearch();
    initFilterTabs();
    initChartIntervals();
    initSignalButtons();
    initPortfolio();
    initSettings();
    initLiveSignalsFeed();
    initAddHolding();
    generateLiveSignals();
    startTickerUpdate();
    showToast('AI Engine online. Scanning markets...', 'success');
}

function updateUserUI() {
    if (!APP.user) return;
    document.getElementById('sidebar-username').textContent = APP.user.name;
    const avatar = document.getElementById('sidebar-avatar');
    if (avatar) avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(APP.user.name)}&background=3b82f6&color=fff&bold=true`;
    const settingName = document.getElementById('setting-name');
    const settingEmail = document.getElementById('setting-email');
    if (settingName) settingName.value = APP.user.name;
    if (settingEmail) settingEmail.value = APP.user.email || '';
}

// ───────────────────────────────────────────────
// NAVIGATION
// ───────────────────────────────────────────────
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    APP.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(i => {
        i.classList.toggle('active', i.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });
    if (page === 'signals') renderLiveSignals();
    if (page === 'portfolio') renderPortfolio();
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    toggle?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    });
}

// ───────────────────────────────────────────────
// DATA FETCHING
// ───────────────────────────────────────────────
async function fetchCryptoData() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h');
        if (!res.ok) throw new Error('API error');
        APP.cryptoData = await res.json();
        document.getElementById('table-loader').style.display = 'none';
        renderCryptoTable(APP.cryptoData);
        document.getElementById('stat-markets').textContent = APP.cryptoData.length;
        updateTopTickers();
        if (APP.cryptoData.length > 0) selectCoin(APP.cryptoData[0]);
    } catch (err) {
        console.warn('CoinGecko rate-limited, using mock data:', err);
        loadMockData();
    }
}

function loadMockData() {
    const prices = {
        bitcoin: 67432, ethereum: 3521, solana: 168,
        binancecoin: 412, cardano: 0.48, avalanche: 38.5,
        polkadot: 8.2, chainlink: 18.4, litecoin: 84.3, ripple: 0.58
    };
    APP.cryptoData = [
        { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 67432, price_change_percentage_24h: 2.34, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', market_cap: 1320000000000, total_volume: 28000000000 },
        { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3521, price_change_percentage_24h: -1.2, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', market_cap: 423000000000, total_volume: 14000000000 },
        { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 168, price_change_percentage_24h: 5.67, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', market_cap: 78000000000, total_volume: 4200000000 },
        { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 412, price_change_percentage_24h: 0.8, image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', market_cap: 63000000000, total_volume: 1800000000 },
        { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 0.48, price_change_percentage_24h: -3.1, image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', market_cap: 17000000000, total_volume: 540000000 },
        { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', current_price: 38.5, price_change_percentage_24h: 4.2, image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', market_cap: 16000000000, total_volume: 690000000 },
        { id: 'polkadot', symbol: 'dot', name: 'Polkadot', current_price: 8.2, price_change_percentage_24h: -0.5, image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', market_cap: 11000000000, total_volume: 310000000 },
        { id: 'chainlink', symbol: 'link', name: 'Chainlink', current_price: 18.4, price_change_percentage_24h: 6.1, image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', market_cap: 11000000000, total_volume: 720000000 },
        { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', current_price: 84.3, price_change_percentage_24h: 1.0, image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png', market_cap: 6300000000, total_volume: 420000000 },
        { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 0.58, price_change_percentage_24h: -2.1, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', market_cap: 32000000000, total_volume: 1200000000 },
    ];
    document.getElementById('table-loader').style.display = 'none';
    renderCryptoTable(APP.cryptoData);
    document.getElementById('stat-markets').textContent = APP.cryptoData.length;
    updateTopTickers();
    if (APP.cryptoData.length > 0) selectCoin(APP.cryptoData[0]);
    // Simulate price jitter
    setInterval(() => {
        APP.cryptoData.forEach(c => {
            const jitter = (Math.random() - 0.5) * 0.002;
            c.current_price = c.current_price * (1 + jitter);
        });
        updateTopTickers();
        // Refresh prices in table without re-rendering
        APP.cryptoData.forEach(c => {
            const priceCell = document.querySelector(`tr[data-id="${c.id}"] .price`);
            if (priceCell) priceCell.textContent = formatPrice(c.current_price);
        });
        // Update chart header if coin selected
        if (APP.selectedCoin) updateChartHeader(APP.selectedCoin);
    }, 4000);
}

function updateTopTickers() {
    const btc = APP.cryptoData.find(c => c.id === 'bitcoin');
    const eth = APP.cryptoData.find(c => c.id === 'ethereum');
    const sol = APP.cryptoData.find(c => c.id === 'solana');
    if (btc) setTicker('tick-btc', btc);
    if (eth) setTicker('tick-eth', eth);
    if (sol) setTicker('tick-sol', sol);
}

function setTicker(id, coin) {
    const el = document.getElementById(id);
    if (!el) return;
    const change = coin.price_change_percentage_24h || 0;
    el.textContent = formatPrice(coin.current_price);
    el.className = `ticker-price ${change >= 0 ? 'up' : 'down'}`;
}

function startTickerUpdate() {
    // Periodic full refresh every 2 mins
    setInterval(fetchCryptoData, 120000);
}

// ───────────────────────────────────────────────
// TABLE RENDERING
// ───────────────────────────────────────────────
function renderCryptoTable(data) {
    const tbody = document.getElementById('crypto-table-body');
    if (!tbody) return;
    toolbar_row: if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">No results found</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    data.forEach((coin, idx) => {
        const row = document.createElement('tr');
        row.dataset.id = coin.id;
        const isPos = (coin.price_change_percentage_24h || 0) >= 0;
        const change = (coin.price_change_percentage_24h || 0).toFixed(2);
        row.innerHTML = `
            <td class="rank">${idx + 1}</td>
            <td>
                <div class="coin-info">
                    <img src="${coin.image}" alt="${coin.name}" class="coin-icon" onerror="this.style.display='none'">
                    <div>
                        <div class="coin-symbol">${coin.symbol.toUpperCase()}</div>
                        <div class="coin-name">${coin.name}</div>
                    </div>
                </div>
            </td>
            <td class="price">${formatPrice(coin.current_price)}</td>
            <td class="change ${isPos ? 'up' : 'down'}">${isPos ? '+' : ''}${change}%</td>
            <td><button class="btn-analyze">Analyze</button></td>
        `;
        row.addEventListener('click', () => selectCoin(coin));
        row.querySelector('.btn-analyze').addEventListener('click', (e) => {
            e.stopPropagation();
            selectCoin(coin);
        });
        if (APP.selectedCoin?.id === coin.id) row.classList.add('selected');
        tbody.appendChild(row);
    });
}

// ───────────────────────────────────────────────
// SEARCH
// ───────────────────────────────────────────────
function initSearch() {
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
        const term = input.value.toLowerCase().trim();
        if (!term) {
            dropdown.classList.remove('open');
            renderCryptoTable(applyFilter(APP.cryptoData, APP.currentFilter));
            return;
        }
        const filtered = APP.cryptoData.filter(c =>
            c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term)
        );
        renderCryptoTable(filtered);
        // Dropdown
        if (filtered.length) {
            dropdown.innerHTML = filtered.slice(0, 6).map(c => `
                <div class="search-item" data-id="${c.id}">
                    <img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'">
                    <span><strong>${c.symbol.toUpperCase()}</strong> — ${c.name}</span>
                    <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:0.75rem">${formatPrice(c.current_price)}</span>
                </div>
            `).join('');
            dropdown.classList.add('open');
            dropdown.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', () => {
                    const coin = APP.cryptoData.find(c => c.id === item.dataset.id);
                    if (coin) { selectCoin(coin); input.value = ''; dropdown.classList.remove('open'); }
                });
            });
        } else {
            dropdown.innerHTML = `<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:0.8rem">No results</div>`;
            dropdown.classList.add('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) dropdown.classList.remove('open');
    });
}

// ───────────────────────────────────────────────
// FILTER TABS
// ───────────────────────────────────────────────
function initFilterTabs() {
    document.querySelectorAll('#filter-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filter-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP.currentFilter = btn.dataset.filter;
            renderCryptoTable(applyFilter(APP.cryptoData, APP.currentFilter));
        });
    });
}

function applyFilter(data, filter) {
    switch (filter) {
        case 'gainers': return [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
        case 'losers': return [...data].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
        case 'volume': return [...data].sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
        default: return data;
    }
}

// ───────────────────────────────────────────────
// COIN SELECTION & CHART
// ───────────────────────────────────────────────
function selectCoin(coin) {
    APP.selectedCoin = coin;
    // Highlight table row
    document.querySelectorAll('#crypto-table-body tr').forEach(r => {
        r.classList.toggle('selected', r.dataset.id === coin.id);
    });
    // Update signal widget header
    const nameEl = document.getElementById('selected-asset-name');
    if (nameEl) nameEl.innerHTML = `<strong>${coin.symbol.toUpperCase()}</strong>/USDT`;
    // Enable buttons
    document.getElementById('btn-scalp').disabled = false;
    document.getElementById('btn-swing').disabled = false;
    // Reset signal UI
    document.getElementById('signal-result').classList.add('hidden');
    document.getElementById('signal-processing').classList.add('hidden');
    document.getElementById('signal-idle').style.display = '';
    // Chart header
    updateChartHeader(coin);
    // Render chart
    renderChart(coin.symbol.toUpperCase(), APP.currentInterval);
}

function updateChartHeader(coin) {
    const infoEl = document.getElementById('chart-asset-info');
    if (!infoEl) return;
    const isPos = (coin.price_change_percentage_24h || 0) >= 0;
    infoEl.innerHTML = `
        <div class="asset-header">
            <img src="${coin.image}" style="width:24px;height:24px;border-radius:50%" onerror="this.style.display='none'">
            <span class="asset-name">${coin.symbol.toUpperCase()}/USDT</span>
            <span class="asset-price">${formatPrice(coin.current_price)}</span>
            <span class="asset-change-badge ${isPos ? 'up' : 'down'}">${isPos ? '+' : ''}${(coin.price_change_percentage_24h || 0).toFixed(2)}%</span>
        </div>
    `;
}

function initChartIntervals() {
    document.querySelectorAll('.interval-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP.currentInterval = btn.dataset.interval;
            if (APP.selectedCoin) renderChart(APP.selectedCoin.symbol.toUpperCase(), APP.currentInterval);
        });
    });
}

function renderChart(symbol, interval) {
    const container = document.getElementById('tv_chart_container');
    if (!container) return;
    container.innerHTML = '';
    const tvSymbol = `BINANCE:${symbol}USDT`;
    try {
        new TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: interval,
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            enable_publishing: false,
            backgroundColor: 'rgba(6,9,19,0)',
            gridColor: 'rgba(255,255,255,0.03)',
            hide_side_toolbar: false,
            allow_symbol_change: true,
            studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
            save_image: false,
            container_id: 'tv_chart_container',
            toolbar_bg: 'rgba(0,0,0,0)',
            overrides: {
                'paneProperties.background': 'rgba(6,9,19,0)',
                'paneProperties.vertGridProperties.color': 'rgba(255,255,255,0.02)',
                'paneProperties.horzGridProperties.color': 'rgba(255,255,255,0.02)',
            }
        });
    } catch (e) {
        container.innerHTML = `<div class="chart-placeholder"><i class="fa-solid fa-chart-candlestick fa-3x"></i><p>Chart unavailable — check connection</p></div>`;
    }
}

// ───────────────────────────────────────────────
// AI SIGNAL GENERATOR
// ───────────────────────────────────────────────
function initSignalButtons() {
    document.getElementById('btn-scalp')?.addEventListener('click', () => generateSignal('scalp'));
    document.getElementById('btn-swing')?.addEventListener('click', () => generateSignal('swing'));
}

const INDICATORS = ['RSI(14)', 'MACD', 'BB(20)', 'EMA(50)', 'EMA(200)', 'Stoch', 'ATR', 'Volume', 'OBV', 'CCI(20)'];

function generateSignal(type) {
    if (!APP.selectedCoin) return;
    const coin = APP.selectedCoin;

    // Reset UI
    document.getElementById('signal-idle').style.display = 'none';
    document.getElementById('signal-result').classList.add('hidden');
    const procEl = document.getElementById('signal-processing');
    procEl.classList.remove('hidden');
    const fill = document.getElementById('progress-fill');
    fill.style.width = '0%';

    // Step animation
    const steps = ['ps1', 'ps2', 'ps3', 'ps4'];
    steps.forEach(s => document.getElementById(s)?.classList.add('hidden'));
    document.getElementById('ps1')?.classList.remove('hidden');

    let progress = 0;
    const progressTimer = setInterval(() => {
        progress += Math.random() * 12;
        if (progress > 95) progress = 95;
        fill.style.width = progress + '%';
        // Show steps progressively
        if (progress > 25) document.getElementById('ps2')?.classList.remove('hidden');
        if (progress > 55) document.getElementById('ps3')?.classList.remove('hidden');
        if (progress > 80) document.getElementById('ps4')?.classList.remove('hidden');
    }, 200);

    const delay = Math.random() * 1200 + 2000;

    setTimeout(() => {
        clearInterval(progressTimer);
        fill.style.width = '100%';
        setTimeout(() => buildSignalResult(type, coin, procEl), 300);
    }, delay);
}

function buildSignalResult(type, coin, procEl) {
    const price = coin.current_price;
    const trend24h = coin.price_change_percentage_24h || 0;
    const rand = Math.random();
    const bullish = trend24h > 0 ? rand > 0.28 : rand > 0.65;
    const direction = bullish ? 'BUY' : 'SELL';
    const vol = type === 'scalp' ? (0.012 + Math.random() * 0.018) : (0.055 + Math.random() * 0.06);
    let entry, tp, sl;
    if (direction === 'BUY') {
        entry = price * (1 - Math.random() * 0.004);
        tp = entry * (1 + vol);
        sl = entry * (1 - vol * 0.45);
    } else {
        entry = price * (1 + Math.random() * 0.004);
        tp = entry * (1 - vol);
        sl = entry * (1 + vol * 0.45);
    }
    const confidence = Math.floor(Math.random() * 13) + 82;
    const rr = ((Math.abs(tp - entry) / Math.abs(sl - entry))).toFixed(2);
    const tf = type === 'scalp' ? '15m — 4H' : '1D — 1W';
    const usedIndicators = shuffle(INDICATORS).slice(0, 4);

    // Update DOM
    const badge = document.getElementById('signal-direction');
    badge.textContent = direction;
    badge.className = `signal-badge ${direction.toLowerCase()}`;
    document.getElementById('signal-type-label').textContent = type.toUpperCase();
    document.getElementById('sig-entry').textContent = formatPrice(entry);
    document.getElementById('sig-tp').textContent = formatPrice(tp);
    document.getElementById('sig-sl').textContent = formatPrice(sl);
    document.getElementById('sig-conf').textContent = confidence + '%';
    document.getElementById('sig-rr').textContent = `1 : ${rr}`;
    document.getElementById('sig-tf').textContent = tf;
    document.getElementById('indicators-used').innerHTML = usedIndicators.map(i =>
        `<span class="indicator-tag">${i}</span>`
    ).join('');

    procEl.classList.add('hidden');
    document.getElementById('signal-result').classList.remove('hidden');
    document.getElementById('signal-idle').style.display = 'none';

    // Save signal button
    const saveBtn = document.getElementById('btn-save-signal');
    const signalData = { coin: coin.symbol.toUpperCase(), coinName: coin.name, coinImage: coin.image, type, direction, entry, tp, sl, confidence, rr, indicators: usedIndicators, timestamp: Date.now() };
    saveBtn.onclick = () => saveSignal(signalData);

    // Toast
    showToast(`${direction} signal generated for ${coin.symbol.toUpperCase()} — ${confidence}% confidence`, direction === 'BUY' ? 'success' : 'info');
}

function saveSignal(signal) {
    APP.savedSignals.unshift(signal);
    if (APP.savedSignals.length > 50) APP.savedSignals.pop();
    localStorage.setItem('aurax_signals', JSON.stringify(APP.savedSignals));
    showToast('Signal saved to portfolio history!', 'success');
    renderSignalHistory();
    // Update stat
    document.getElementById('stat-signals').textContent = APP.savedSignals.length + 247;
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

// ───────────────────────────────────────────────
// LIVE SIGNALS FEED
// ───────────────────────────────────────────────
const COINS_FOR_FEED = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'AVAX', 'LINK', 'DOT', 'LTC', 'XRP', 'MATIC', 'ATOM', 'NEAR', 'ALGO', 'FTM'];

function generateLiveSignals() {
    APP.liveSignals = Array.from({ length: 18 }, (_, i) => generateFeedSignal(i));
    // Append fresh signals over time
    setInterval(() => {
        APP.liveSignals.unshift(generateFeedSignal(0));
        if (APP.liveSignals.length > 50) APP.liveSignals.pop();
        if (APP.currentPage === 'signals') renderLiveSignals();
    }, 30000);
}

function generateFeedSignal(ageOffset) {
    const coin = COINS_FOR_FEED[Math.floor(Math.random() * COINS_FOR_FEED.length)];
    const dir = Math.random() > 0.45 ? 'buy' : 'sell';
    const type = Math.random() > 0.5 ? 'scalp' : 'swing';
    const basePrice = getBasePrice(coin);
    const vol = type === 'scalp' ? 0.015 + Math.random() * 0.015 : 0.055 + Math.random() * 0.05;
    const entry = basePrice;
    const tp = dir === 'buy' ? entry * (1 + vol) : entry * (1 - vol);
    const sl = dir === 'buy' ? entry * (1 - vol * 0.45) : entry * (1 + vol * 0.45);
    const conf = Math.floor(Math.random() * 14) + 81;
    return { coin, dir, type, entry, tp, sl, conf, timestamp: Date.now() - ageOffset * 120000 - Math.random() * 60000 };
}

function getBasePrice(symbol) {
    const prices = { BTC: 67432, ETH: 3521, SOL: 168, BNB: 412, ADA: 0.48, AVAX: 38.5, LINK: 18.4, DOT: 8.2, LTC: 84.3, XRP: 0.58, MATIC: 0.88, ATOM: 11.2, NEAR: 7.4, ALGO: 0.21, FTM: 0.94 };
    const base = prices[symbol] || 1;
    return base * (1 + (Math.random() - 0.5) * 0.03);
}

function initLiveSignalsFeed() {
    document.querySelectorAll('[data-signal-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-signal-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            APP.signalFilter = btn.dataset.signalFilter;
            renderLiveSignals();
        });
    });
}

function renderLiveSignals() {
    const grid = document.getElementById('signals-grid');
    if (!grid) return;
    let signals = APP.liveSignals;
    const f = APP.signalFilter;
    if (f === 'buy') signals = signals.filter(s => s.dir === 'buy');
    else if (f === 'sell') signals = signals.filter(s => s.dir === 'sell');
    else if (f === 'scalp') signals = signals.filter(s => s.type === 'scalp');
    else if (f === 'swing') signals = signals.filter(s => s.type === 'swing');

    grid.innerHTML = signals.map(s => `
        <div class="signal-card ${s.dir}">
            <div class="sc-header">
                <span class="sc-asset">${s.coin}/USDT</span>
                <span class="sc-badge ${s.dir}">${s.dir.toUpperCase()}</span>
            </div>
            <div class="sc-body">
                <div class="sc-row"><span class="sc-label">Entry</span><span class="sc-value" style="color:#facc15">${formatPrice(s.entry)}</span></div>
                <div class="sc-row"><span class="sc-label">Take Profit</span><span class="sc-value" style="color:var(--accent)">${formatPrice(s.tp)}</span></div>
                <div class="sc-row"><span class="sc-label">Stop Loss</span><span class="sc-value" style="color:var(--danger)">${formatPrice(s.sl)}</span></div>
                <div class="sc-row"><span class="sc-label">Confidence</span><span class="sc-value" style="color:var(--primary)">${s.conf}%</span></div>
            </div>
            <div class="sc-footer">
                <span class="sc-type">${s.type.toUpperCase()}</span>
                <span class="sc-time">${timeAgo(s.timestamp)}</span>
                <span class="sc-conf">${s.conf}%</span>
            </div>
        </div>
    `).join('');
}

// ───────────────────────────────────────────────
// PORTFOLIO
// ───────────────────────────────────────────────
function initPortfolio() {
    renderPortfolio();
    renderSignalHistory();
}

function renderPortfolio() {
    renderHoldings();
    renderSignalHistory();
}

function renderHoldings() {
    const list = document.getElementById('holdings-list');
    if (!list) return;
    if (APP.holdings.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wallet"></i><p>No holdings yet. Add your first position!</p></div>`;
        document.getElementById('portfolio-total').textContent = '$0.00';
        return;
    }
    let totalValue = 0;
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#f97316'];
    const allocs = [];
    list.innerHTML = APP.holdings.map((h, idx) => {
        const coin = APP.cryptoData.find(c => c.symbol.toLowerCase() === h.coin.toLowerCase());
        const currentPrice = coin ? coin.current_price : h.buyPrice;
        const currentValue = h.amount * currentPrice;
        const cost = h.amount * h.buyPrice;
        const pnlAmt = currentValue - cost;
        const pnlPct = ((pnlAmt / cost) * 100).toFixed(2);
        totalValue += currentValue;
        const color = colors[idx % colors.length];
        allocs.push({ symbol: h.coin.toUpperCase(), value: currentValue, color });
        return `
            <div class="holding-item">
                ${coin ? `<img src="${coin.image}" class="holding-icon" alt="${h.coin}">` : `<div class="holding-icon" style="background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700">${h.coin[0]}</div>`}
                <div class="holding-info">
                    <div class="holding-symbol">${h.coin.toUpperCase()}</div>
                    <div class="holding-amount">${h.amount} @ ${formatPrice(h.buyPrice)}</div>
                </div>
                <div class="holding-value">
                    <div class="holding-usd">${formatPrice(currentValue)}</div>
                    <div class="holding-pnl ${pnlAmt >= 0 ? 'up' : 'down'}">${pnlAmt >= 0 ? '+' : ''}${pnlPct}%</div>
                </div>
                <button class="btn-remove-holding" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.btn-remove-holding').forEach(btn => {
        btn.addEventListener('click', () => {
            APP.holdings.splice(parseInt(btn.dataset.idx), 1);
            localStorage.setItem('aurax_holdings', JSON.stringify(APP.holdings));
            renderHoldings();
            showToast('Holding removed', 'info');
        });
    });

    document.getElementById('portfolio-total').textContent = '$' + formatNumber(totalValue, 2);
    document.getElementById('portfolio-change').textContent = totalValue > 0 ? 'Live prices' : '';

    // Allocation list
    const allocList = document.getElementById('allocation-list');
    if (allocList) {
        allocList.innerHTML = allocs.map(a => `
            <div class="alloc-item">
                <div class="alloc-dot" style="background:${a.color}"></div>
                <span class="alloc-name">${a.symbol}</span>
                <span class="alloc-pct">$${formatNumber(a.value, 0)}</span>
            </div>
        `).join('');
    }
}

function renderSignalHistory() {
    const list = document.getElementById('signal-history-list');
    if (!list) return;
    if (APP.savedSignals.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bookmark"></i><p>Saved signals appear here.</p></div>`;
        return;
    }
    list.innerHTML = APP.savedSignals.slice(0, 20).map(s => `
        <div class="history-item">
            ${s.coinImage ? `<img src="${s.coinImage}" style="width:28px;height:28px;border-radius:50%" onerror="this.style.display='none'">` : ''}
            <span class="history-badge ${s.direction.toLowerCase()}">${s.direction}</span>
            <div class="history-info">
                <div class="history-asset">${s.coin}/USDT</div>
                <div class="history-meta">${s.type.toUpperCase()} · ${timeAgo(s.timestamp)}</div>
            </div>
            <span class="history-conf">${s.confidence}%</span>
        </div>
    `).join('');
}

// ───────────────────────────────────────────────
// ADD HOLDING MODAL
// ───────────────────────────────────────────────
function initAddHolding() {
    const modal = document.getElementById('add-holding-modal');
    const openBtn = document.getElementById('btn-add-holding');
    const closeBtn = document.getElementById('close-holding-modal');
    const form = document.getElementById('add-holding-form');
    openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const coin = document.getElementById('holding-coin').value.trim();
        const amount = parseFloat(document.getElementById('holding-amount').value);
        const buyPrice = parseFloat(document.getElementById('holding-buy-price').value);
        if (!coin || isNaN(amount) || isNaN(buyPrice)) return;
        APP.holdings.push({ coin: coin.toUpperCase(), amount, buyPrice });
        localStorage.setItem('aurax_holdings', JSON.stringify(APP.holdings));
        modal.classList.add('hidden');
        form.reset();
        renderHoldings();
        showToast(`${coin.toUpperCase()} added to portfolio!`, 'success');
    });
}

// ───────────────────────────────────────────────
// SETTINGS
// ───────────────────────────────────────────────
function initSettings() {
    // Confidence slider
    const slider = document.getElementById('conf-slider');
    const confVal = document.getElementById('conf-val');
    slider?.addEventListener('input', () => { confVal.textContent = slider.value + '%'; });

    // Color swatches
    document.querySelectorAll('.swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
            const color = sw.dataset.color;
            document.documentElement.style.setProperty('--primary', color);
            document.documentElement.style.setProperty('--primary-glow', color + '66');
            showToast('Accent color updated!', 'success');
        });
    });

    // Load saved settings
    const saved = APP.settings;
    if (saved.accentColor) {
        document.documentElement.style.setProperty('--primary', saved.accentColor);
        document.documentElement.style.setProperty('--primary-glow', saved.accentColor + '66');
        document.querySelectorAll('.swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.color === saved.accentColor);
        });
    }
    if (saved.confThreshold && slider) { slider.value = saved.confThreshold; confVal.textContent = saved.confThreshold + '%'; }

    // Save
    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        const settings = {
            accentColor: document.querySelector('.swatch.active')?.dataset.color,
            confThreshold: slider?.value,
            notifSignals: document.getElementById('notif-signals')?.checked,
            notifPrice: document.getElementById('notif-price')?.checked,
            notifNews: document.getElementById('notif-news')?.checked,
            particles: document.getElementById('particles-toggle')?.checked,
            sound: document.getElementById('sound-toggle')?.checked,
            displayName: document.getElementById('setting-name')?.value,
        };
        APP.settings = settings;
        localStorage.setItem('aurax_settings', JSON.stringify(settings));
        // Update username if changed
        if (settings.displayName && APP.user) {
            APP.user.name = settings.displayName;
            localStorage.setItem('aurax_user', JSON.stringify(APP.user));
            document.getElementById('sidebar-username').textContent = settings.displayName;
        }
        showToast('Settings saved!', 'success');
    });
}

// ───────────────────────────────────────────────
// ANIMATED STATS
// ───────────────────────────────────────────────
function animateStatCounters() {
    const stats = [
        { el: 'stat-signals', target: 247, prefix: '', suffix: '' },
        { el: 'stat-streak', target: 7, prefix: '', suffix: '' },
    ];
    stats.forEach(({ el, target }) => {
        const elem = document.getElementById(el);
        if (!elem) return;
        let start = 0;
        const step = target / 40;
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { elem.textContent = target; clearInterval(timer); return; }
            elem.textContent = Math.floor(start);
        }, 30);
    });
}
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});
document.addEventListener('keydown', function (e) {
    // Check if Ctrl (or Cmd on Mac) + U is pressed
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
        e.preventDefault();
        alert("Source viewing is disabled on this page.");
        return false;
    }
});
───────────────────────────────────────
// ENTRYPOINT
// ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initAuth();
    animateStatCounters();
});
