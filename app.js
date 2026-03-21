document.addEventListener('DOMContentLoaded', () => {
    // --- i18n Data ---
    const I18N_DATA = {
        zh: {
            nav_title: "Noita 魔杖全量穷举查询器",
            nav_subtitle: "768万种组合 • 高性能本地筛选",
            filter_title: "高级筛选",
            slots_label: "魔杖槽位",
            spells_label: "法术库存上限 (Inventory)",
            search_placeholder: "输入目标 FLY_DOWNWARDS 数量 (例如: 54)",
            search_btn: "开始查询",
            sidebar_footer: "点击“查询”应用筛选条件",
            table_seq: "最简魔杖序列",
            table_slots: "槽位",
            status_ready: "已准备就绪",
            status_fetching: (count) => `⏳ 正在从云端拉取产出量为 ${count} 的全量数据...`,
            status_no_results: (count) => `❌ 未找到产出量为 ${count} 的法术组合。请更换数值尝试。`,
            status_no_matches: (total) => `📭 在 ${total} 组数据中未找到匹配当前筛选条件的组合。`,
            status_complete: (matches, limit) => `✅ 筛选完成：匹配 ${matches} 组。展示前 ${limit} 组。`,
            status_error: "⚠️ 查询出错，请确认网络连接或数据是否存在。",
            min_lbl: "最少",
            max_lbl: "最多"
        },
        en: {
            nav_title: "Noita Wand Analytics",
            nav_subtitle: "7.68 Million Combinations • High Performance",
            filter_title: "Advanced Filter",
            slots_label: "Wand Slots",
            spells_label: "Spells Inventory Limits",
            search_placeholder: "Target FLY_DOWNWARDS count (e.g. 54)",
            search_btn: "Search",
            sidebar_footer: "Click 'Search' to apply filters",
            table_seq: "Wand Sequence",
            table_slots: "Slots",
            status_ready: "Ready",
            status_fetching: (count) => `⏳ Fetching dataset for target count ${count}...`,
            status_no_results: (count) => `❌ No combinations found for count ${count}.`,
            status_no_matches: (total) => `📭 No matching combinations found among ${total} results.`,
            status_complete: (matches, limit) => `✅ Filtering complete: ${matches} matches. Showing top ${limit}.`,
            status_error: "⚠️ Search error. Check network or data existence.",
            min_lbl: "Min",
            max_lbl: "Max"
        }
    };

    let currentLang = localStorage.getItem('noita_lang') || 
                      (navigator.language.startsWith('zh') ? 'zh' : 'en');

    const t = (key, ...args) => {
        const val = I18N_DATA[currentLang][key];
        return typeof val === 'function' ? val(...args) : val;
    };

    const updateUIStrings = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });
        document.title = t('nav_title');
        renderFilters();
    };

    // --- Configuration & Data ---
    const SPELL_DATA = {
        "BURST_8": { icon: "burst_8.png", zh: "八重", en: "Octagonal Bolt Bundle" },
        "DIVIDE_10": { icon: "divide_10.png", zh: "十分裂", en: "Divide By 10" },
        "DIVIDE_4": { icon: "divide_4.png", zh: "四分裂", en: "Divide By 4" },
        "DIVIDE_3": { icon: "divide_3.png", zh: "三分裂", en: "Divide By 3" },
        "DIVIDE_2": { icon: "divide_2.png", zh: "二分裂", en: "Divide By 2" },
        "TAU": { icon: "tau.png", zh: "希腊字母 Tau", en: "Tau" },
        "ADD_TRIGGER": { icon: "add_trigger.png", zh: "增加触发", en: "Add Trigger" },
        "FLY_DOWNWARDS": { icon: "fly_downwards.png", zh: "向下飞行", en: "Fly Downwards" }
    };

    // Filter State
    const filterState = {
        minSlots: null,
        maxSlots: null,
        spells: {} // { ID: { min: 0, max: Infinity } }
    };

    // Initialize Filter State
    Object.keys(SPELL_DATA).forEach(id => {
        filterState.spells[id] = { min: 0, max: Infinity };
    });

    // --- DOM Elements ---
    const elements = {
        targetCount: document.getElementById('targetCount'),
        searchBtn: document.getElementById('searchBtn'),
        status: document.getElementById('status'),
        resultsBody: document.getElementById('resultsBody'),
        resultsContainer: document.getElementById('resultsContainer'),
        spellFilters: document.getElementById('spellFilters'),
        minSlots: document.getElementById('minSlots'),
        maxSlots: document.getElementById('maxSlots'),
        sidebar: document.getElementById('sidebar'),
        mobileToggle: document.getElementById('mobileToggle'),
        langToggle: document.getElementById('langToggle')
    };

    // --- UI Rendering ---

    const renderFilters = () => {
        elements.spellFilters.innerHTML = Object.entries(SPELL_DATA).map(([id, data]) => {
            const state = filterState.spells[id];
            const maxDisplay = state.max === Infinity ? '∞' : state.max;
            const maxClass = state.max === Infinity ? 'infinity' : '';
            const name = currentLang === 'zh' ? data.zh : data.en;
            return `
            <div class="spell-filter-item" data-id="${id}">
                <img src="assets/spells/${data.icon}" class="spell-icon-sm" title="${name} (${id})">
                <div class="limit-box" title="Minimum required count">
                    <span class="limit-lbl">${t('min_lbl')}</span>
                    <div class="counter">
                        <button class="count-btn" onclick="updateMin('${id}', -1)">-</button>
                        <span class="count-val" id="min-${id}">${state.min}</span>
                        <button class="count-btn" onclick="updateMin('${id}', 1)">+</button>
                    </div>
                </div>
                <div class="limit-box" title="Maximum allowed count (Inventory limit)">
                    <span class="limit-lbl">${t('max_lbl')}</span>
                    <div class="counter">
                        <button class="count-btn" onclick="updateMax('${id}', -1)">-</button>
                        <span class="count-val ${maxClass}" id="max-${id}">${maxDisplay}</span>
                        <button class="count-btn" onclick="updateMax('${id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `}).join('');
    };

    window.updateMin = (id, delta) => {
        const item = filterState.spells[id];
        let val = item.min + delta;
        if (val < 0) val = 0;
        if (val > 8) val = 8;
        item.min = val;

        if (item.min > item.max) {
            item.max = item.min;
            updateMaxUI(id);
        }

        document.getElementById(`min-${id}`).textContent = item.min;
    };

    window.updateMax = (id, delta) => {
        const item = filterState.spells[id];

        let val;
        if (item.max === Infinity) {
            if (delta < 0) val = 8;
            else val = Infinity;
        } else {
            val = item.max + delta;
            if (val > 8) val = Infinity;
            if (val < 0) val = 0;
        }

        item.max = val;

        if (item.max < item.min) {
            item.min = item.max;
            document.getElementById(`min-${id}`).textContent = item.min;
        }

        updateMaxUI(id);
    };

    const updateMaxUI = (id) => {
        const item = filterState.spells[id];
        const el = document.getElementById(`max-${id}`);
        if (item.max === Infinity) {
            el.textContent = '∞';
            el.classList.add('infinity');
        } else {
            el.textContent = item.max;
            el.classList.remove('infinity');
        }
    };

    // Mobile Sidebar Toggle
    elements.mobileToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
        elements.mobileToggle.innerHTML = elements.sidebar.classList.contains('active') ? '✕' : '☰';
    });

    // --- Search Logic ---

    const handleSearch = async () => {
        const count = elements.targetCount.value;
        if (!count) return;

        elements.status.textContent = t('status_fetching', count);
        elements.resultsBody.innerHTML = '';
        elements.resultsContainer.classList.remove('visible');

        try {
            const response = await fetch(`./data/${count}.txt`);
            if (!response.ok) {
                elements.status.textContent = t('status_no_results', count);
                return;
            }

            const text = await response.text();
            const rawWands = text.trim().split('\n');

            // Get Current Filter State
            const minS = parseInt(elements.minSlots.value) || 0;
            const maxS = parseInt(elements.maxSlots.value) || 99;

            // Process and Filter
            const results = rawWands.map(w => {
                const parts = w.trim().split(',');
                const spellCounts = {};
                parts.forEach(p => spellCounts[p] = (spellCounts[p] || 0) + 1);

                return {
                    wand: w.trim(),
                    parts: parts,
                    length: parts.length,
                    counts: spellCounts
                };
            }).filter(item => {
                // 1. Slots Filter
                if (item.length < minS || item.length > maxS) return false;

                // 2. Advanced Spell Filter
                for (const [sid, config] of Object.entries(filterState.spells)) {
                    const actualCount = item.counts[sid] || 0;
                    if (actualCount < config.min || actualCount > config.max) {
                        return false;
                    }
                }
                return true;
            }).sort((a, b) => a.length - b.length);

            // Render Results
            const limit = 500;
            const displayed = results.slice(0, limit);

            if (displayed.length === 0) {
                elements.status.textContent = t('status_no_matches', rawWands.length);
                return;
            }

            displayed.forEach(item => {
                const tr = document.createElement('tr');

                // Icons row
                const iconsHtml = item.parts.map(p => {
                    const data = SPELL_DATA[p];
                    if (data) {
                        const name = currentLang === 'zh' ? data.zh : data.en;
                        return `<img src="assets/spells/${data.icon}" class="spell-icon-res" title="${name}">`;
                    }
                    return `<span class="count-badge">${p}</span>`;
                }).join('');

                tr.innerHTML = `
                    <td>
                        <div class="wand-sequence">
                            <div class="spell-icons-row">${iconsHtml}</div>
                            <div class="wand-text-id">${item.wand}</div>
                        </div>
                    </td>
                    <td><span class="count-badge">${item.length} ${t('table_slots')}</span></td>
                `;
                elements.resultsBody.appendChild(tr);
            });

            elements.status.textContent = t('status_complete', results.length, displayed.length);
            elements.resultsContainer.classList.add('visible');

            // Close sidebar on mobile after search
            if (window.innerWidth <= 1024) {
                elements.sidebar.classList.remove('active');
                elements.mobileToggle.innerHTML = '☰';
            }

        } catch (error) {
            console.error(error);
            elements.status.textContent = t('status_error');
        }
    };

    // Language Toggle
    elements.langToggle.onclick = () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('noita_lang', currentLang);
        updateUIStrings();
    };

    // --- Initialization ---
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.targetCount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    updateUIStrings();
});
