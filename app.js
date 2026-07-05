document.addEventListener('DOMContentLoaded', () => {
    // --- i18n Data ---
    const I18N_DATA = {
        zh: {
            nav_title: "Noita Wand Codex",
            filter_title: "高级筛选",
            slots_label: "魔杖槽位",
            spells_label: "法术库存上限 (Inventory)",
            search_placeholder: "输入目标数量或范围 (例如: 54 / 54-56 / 54 55 56)",
            search_btn: "开始查询",
            sidebar_footer: "点击“查询”应用筛选条件",
            table_count: "产出量",
            table_seq: "最简魔杖序列",
            table_slots: "槽位",
            twwe_btn: "打开 TWWE",
            status_ready: "已准备就绪：13 法术 / 9 槽静态索引",
            status_fetching: (count) => `正在读取产出量为 ${count} 的本地索引...`,
            status_fetching_range: (total) => `正在查询 ${total} 个目标产出量的本地索引...`,
            status_no_results: (count) => `索引中未找到产出量为 ${count} 的法术组合。`,
            status_no_matches: (indexed, total) => `样本索引 ${formatNumber(indexed)} 组中没有匹配当前筛选条件的组合；全量命中 ${formatNumber(total)} 组。`,
            status_complete: (matches, limit, indexed, total) => `筛选完成：索引样本 ${formatNumber(indexed)} / 全量 ${formatNumber(total)} 组，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`,
            status_complete_range: (matches, limit, totalTargets, indexed, total) => `查询完成：${totalTargets} 个目标，索引样本 ${formatNumber(indexed)} / 全量 ${formatNumber(total)} 组，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`,
            status_range_empty: "请输入有效的范围或数字列表。",
            status_error: "⚠️ 查询出错，请确认网络连接或数据是否存在。",
            min_lbl: "Min",
            max_lbl: "Max"
        },
        en: {
            nav_title: "Noita Wand Codex",
            filter_title: "Advanced Filter",
            slots_label: "Wand Slots",
            spells_label: "Spells Inventory Limits",
            search_placeholder: "Target count or range (e.g. 54 / 54-56 / 54 55 56)",
            search_btn: "Search",
            sidebar_footer: "Click 'Search' to apply filters",
            table_count: "Target",
            table_seq: "Wand Sequence",
            table_slots: "Slots",
            twwe_btn: "Open TWWE",
            status_ready: "Ready: 13-spell / 9-slot static index",
            status_fetching: (count) => `Reading local index for target count ${count}...`,
            status_fetching_range: (total) => `Reading local indexes for ${total} target counts...`,
            status_no_results: (count) => `No indexed combinations found for count ${count}.`,
            status_no_matches: (indexed, total) => `No matching combinations among ${formatNumber(indexed)} indexed samples; full run has ${formatNumber(total)} hits.`,
            status_complete: (matches, limit, indexed, total) => `Filtering complete: ${formatNumber(indexed)} indexed / ${formatNumber(total)} full hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`,
            status_complete_range: (matches, limit, totalTargets, indexed, total) => `Search complete: ${totalTargets} targets, ${formatNumber(indexed)} indexed / ${formatNumber(total)} full hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`,
            status_range_empty: "Enter a valid range or number list.",
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
    const DATA_DIR = './data13';
    const MAX_SLOTS = 9;
    let datasetManifest = null;

    const formatNumber = (value) => {
        if (value === undefined || value === null || Number.isNaN(Number(value))) return '?';
        return Number(value).toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US');
    };

    const SPELL_DATA = {
        "BURST_8": { icon: "burst_8.png", label: "B", zh: "八重", en: "Octagonal Bolt Bundle" },
        "DIVIDE_10": { icon: "divide_10.png", label: "/10", zh: "十分裂", en: "Divide By 10" },
        "DIVIDE_3": { icon: "divide_3.png", label: "/3", zh: "三分裂", en: "Divide By 3" },
        "ADD_TRIGGER": { icon: "add_trigger.png", label: "+", zh: "增加触发", en: "Add Trigger" },
        "DIVIDE_4": { icon: "divide_4.png", label: "/4", zh: "四分裂", en: "Divide By 4" },
        "DIVIDE_2": { icon: "divide_2.png", label: "/2", zh: "二分裂", en: "Divide By 2" },
        "TAU": { icon: "tau.png", label: "T", zh: "希腊字母 Tau", en: "Tau" },
        "FLY_DOWNWARDS": { icon: "fly_downwards.png", label: "F", zh: "向下飞行", en: "Fly Downwards" },
        "IF_ELSE": { icon: "if_else.png", label: "EL", zh: "如果否则", en: "If Else" },
        "RESET": { icon: "reset.png", label: "R", zh: "重置", en: "Reset" },
        "IF_HP": { icon: "if_hp.png", label: "HP", zh: "要求：生命值", en: "Requirement: HP" },
        "IF_END": { icon: "if_end.png", label: "END", zh: "条件结束", en: "If End" },
        "BLACK_HOLE#0": { icon: "black_hole.png", label: "BH0", zh: "黑洞（0 次）", en: "Black Hole (0 charges)" }
    };
    const SIMULATOR_BASE_URL = 'https://asmallhamis.github.io/TheWebWandEngine/';
    const TWWE_WAND_PREFIX = 'NOLLA,HORIZONTAL_ARC,DELAYED_SPELL,BURST_8,TENTACLE_TIMER,CASTER_CAST,TELEPORT_PROJECTILE_CLOSER,,,';
    const TWWE_PHASING_PREFIX = ',BURST_3,,LINE_ARC,EXPLOSION_REMOVE,SLOW_BULLET_TIMER,BURST_2,BLOODLUST,SWAPPER_PROJECTILE,FISH,,,,,,,';
    const TWWE_PHASING_SUFFIX = ',,,,';
    const formatTwweSpellToken = (spellId) => {
        const charged = spellId.match(/^(.+)#(-?\d+)$/);
        return charged ? `${charged[1]}{${charged[2]}}` : spellId;
    };
    const formatTwweSpellSequence = (wand) => wand.split(',').map(formatTwweSpellToken).join(',');
    const formatPhasingSpellSequence = (wand) => wand
        .split(',')
        .map(spell => spell === 'FLY_DOWNWARDS' ? 'PHASING_ARC' : spell)
        .map(formatTwweSpellToken)
        .join(',');
    const getTwweWandText = (wand) => `{{Wand2
| wandCard     = Yes
| castDelay    = 0.13
| rechargeTime = 0.22
| manaMax      = 5000.00
| manaCharge   = 5000.00
| capacity     = 26
| spread       = 0
| speed        = 1.00
| spells       = ${TWWE_WAND_PREFIX + formatTwweSpellSequence(wand)}
}}`;
    const getPhasingWandText = (wand) => `{{Wand2
| wandCard     = Yes
| castDelay    = 0.13
| rechargeTime = 0.22
| manaMax      = 5000.00
| manaCharge   = 5000.00
| capacity     = 26
| spread       = 0
| speed        = 1.00
| spells       = ${TWWE_PHASING_PREFIX + formatPhasingSpellSequence(wand) + TWWE_PHASING_SUFFIX}
}}`;

    // Filter State
    const filterState = {
        minSlots: null,
        maxSlots: null,
        spells: {} // { ID: { min: 0, max: Infinity } }
    };

    // Initialize Filter State
    Object.keys(SPELL_DATA).forEach(id => {
        // BURST_8 always appears at most once in the dataset
        const maxVal = id === 'BURST_8' ? 1 : Infinity;
        filterState.spells[id] = { min: 0, max: maxVal };
    });

    // --- DOM Elements ---
    const elements = {
        targetCount: document.getElementById('targetCount'),
        searchBtn: document.getElementById('searchBtn'),
        status: document.getElementById('status'),
        resultsBody: document.getElementById('resultsBody'),
        resultsContainer: document.getElementById('resultsContainer'),
        resultsTable: document.getElementById('resultsTable'),
        tableWrapper: document.querySelector('.table-wrapper'),
        rangeResults: document.getElementById('rangeResults'),
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
            const iconHtml = data.icon
                ? `<img src="assets/spells/${data.icon}" class="spell-icon-sm" title="${name} (${id})">`
                : `<span class="spell-icon-sm spell-icon-fallback" title="${name} (${id})">${data.label}</span>`;
            return `
            <div class="spell-filter-item" data-id="${id}">
                ${iconHtml}
                <div class="limit-box" title="Minimum required count">
                    <span class="limit-lbl">${t('min_lbl')}</span>
                    <div class="counter">
                        <button class="count-btn" onclick="updateMin('${id}', -1)">-</button>
                        <input class="count-val count-input" id="min-${id}" value="${state.min}" inputmode="numeric" onclick="this.select()" onkeydown="handleLimitKey(event)" onchange="setLimitValue('${id}', 'min', this.value)" onblur="setLimitValue('${id}', 'min', this.value)">
                        <button class="count-btn" onclick="updateMin('${id}', 1)">+</button>
                    </div>
                </div>
                <div class="limit-box" title="Maximum allowed count (Inventory limit)">
                    <span class="limit-lbl">${t('max_lbl')}</span>
                    <div class="counter">
                        <button class="count-btn" onclick="updateMax('${id}', -1)">-</button>
                        <input class="count-val count-input ${maxClass}" id="max-${id}" value="${maxDisplay}" inputmode="numeric" onclick="this.select()" onkeydown="handleLimitKey(event)" onchange="setLimitValue('${id}', 'max', this.value)" onblur="setLimitValue('${id}', 'max', this.value)">
                        <button class="count-btn" onclick="updateMax('${id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `}).join('');
    };

    const clampLimit = (value) => Math.max(0, Math.min(MAX_SLOTS, value));
    const parseLimitValue = (value, allowInfinity) => {
        const text = String(value).trim().toLowerCase();
        if (allowInfinity && (text === '' || text === '∞' || text === 'inf' || text === 'infinity')) {
            return Infinity;
        }
        const parsed = parseInt(text, 10);
        return Number.isFinite(parsed) ? clampLimit(parsed) : 0;
    };

    const setLimitInputValue = (id, kind, value) => {
        const el = document.getElementById(`${kind}-${id}`);
        if (!el) return;
        el.value = value === Infinity ? '∞' : value;
        el.classList.toggle('infinity', value === Infinity);
    };

    window.updateMin = (id, delta) => {
        const item = filterState.spells[id];
        const val = clampLimit(item.min + delta);
        item.min = val;

        if (item.min > item.max) {
            item.max = item.min;
            updateMaxUI(id);
        }

        setLimitInputValue(id, 'min', item.min);
    };

    window.updateMax = (id, delta) => {
        const item = filterState.spells[id];

        let val;
        if (item.max === Infinity && delta > 0) {
            val = item.min;
        } else if (item.max === item.min && delta < 0) {
            val = Infinity;
        } else if (item.max === Infinity) {
            if (delta < 0) val = MAX_SLOTS;
            else val = Infinity;
        } else {
            val = item.max + delta;
            if (val > MAX_SLOTS) val = Infinity;
            if (val < 0) val = 0;
        }

        item.max = val;

        if (item.max < item.min) {
            item.min = item.max;
            setLimitInputValue(id, 'min', item.min);
        }

        updateMaxUI(id);
    };

    window.setLimitValue = (id, kind, value) => {
        const item = filterState.spells[id];
        if (!item) return;

        if (kind === 'min') {
            item.min = parseLimitValue(value, false);
            if (item.min > item.max) {
                item.max = item.min;
            }
        } else {
            item.max = parseLimitValue(value, true);
            if (item.max < item.min) {
                item.min = item.max;
            }
        }

        setLimitInputValue(id, 'min', item.min);
        updateMaxUI(id);
    };

    window.handleLimitKey = (event) => {
        if (event.key === 'Enter') event.target.blur();
        if (event.key === 'Escape') {
            const wrapper = event.target.closest('.spell-filter-item');
            const id = wrapper?.dataset.id;
            const kind = event.target.id.startsWith('min-') ? 'min' : 'max';
            if (id && filterState.spells[id]) {
                setLimitInputValue(id, kind, filterState.spells[id][kind]);
            }
            event.target.blur();
        }
    };

    const updateMaxUI = (id) => {
        const item = filterState.spells[id];
        setLimitInputValue(id, 'max', item.max);
    };

    const iconMenu = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
    const iconClose = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    elements.mobileToggle.addEventListener('click', () => {
        elements.sidebar.classList.toggle('active');
        elements.mobileToggle.innerHTML = elements.sidebar.classList.contains('active') ? iconClose : iconMenu;
    });

    // --- Search Logic ---

    const parseCounts = (value) => {
        const counts = [];
        const seen = new Set();
        const countParts = value.match(/\d+\s*-\s*\d+|\d+/g) || [];

        const addCount = (count) => {
            if (seen.has(count)) return;
            seen.add(count);
            counts.push(String(count));
        };

        countParts.forEach(partText => {
            if (partText.includes('-')) {
                const [a, b] = partText.split('-').map(part => parseInt(part.trim(), 10));
                const start = Math.min(a, b);
                const end = Math.max(a, b);
                for (let count = start; count <= end; count++) {
                    addCount(count);
                }
            } else {
                addCount(parseInt(partText, 10));
            }
        });

        return counts;
    };

    const getActiveFilters = () => ({
        minS: parseInt(elements.minSlots.value) || 0,
        maxS: parseInt(elements.maxSlots.value) || 99
    });

    const loadCountResults = async (count, filters) => {
        const meta = datasetManifest?.counts?.[String(count)] || { total: 0, indexed: 0 };
        const response = await fetch(`${DATA_DIR}/${count}.txt`);
        if (!response.ok) {
            return {
                count,
                rawTotal: 0,
                indexedTotal: meta.indexed || 0,
                fullTotal: meta.total || 0,
                results: [],
                missing: true
            };
        }

        const text = await response.text();
        const rawWands = text.trim().split('\n').filter(Boolean);
        const indexedTotal = meta.indexed || rawWands.length;
        const fullTotal = meta.total || rawWands.length;

        const results = rawWands.map(w => {
            const parts = w.trim().split(',');
            const spellCounts = {};
            parts.forEach(p => spellCounts[p] = (spellCounts[p] || 0) + 1);

            return {
                target: count,
                wand: w.trim(),
                parts: parts,
                length: parts.length,
                counts: spellCounts
            };
        }).filter(item => {
            if (item.length < filters.minS || item.length > filters.maxS) return false;

            for (const [sid, config] of Object.entries(filterState.spells)) {
                const actualCount = item.counts[sid] || 0;
                if (actualCount < config.min || actualCount > config.max) {
                    return false;
                }
            }
            return true;
        }).sort((a, b) => a.length - b.length);

        return { count, rawTotal: rawWands.length, indexedTotal, fullTotal, results, missing: false };
    };

    const utf8ToBase64 = (value) => window.btoa(unescape(encodeURIComponent(value)));
    const getTwweUrl = (wand) => `${SIMULATOR_BASE_URL}?wand=${encodeURIComponent(utf8ToBase64(getTwweWandText(wand)))}`;
    const getPhasingUrl = (wand) => `${SIMULATOR_BASE_URL}?wand=${encodeURIComponent(utf8ToBase64(getPhasingWandText(wand)))}`;

    const getIconsHtml = (parts) => parts.map(p => {
        const data = SPELL_DATA[p];
        if (data) {
            const name = currentLang === 'zh' ? data.zh : data.en;
            if (!data.icon) {
                return `<span class="spell-icon-res spell-icon-fallback" title="${name}">${data.label}</span>`;
            }
            return `<img src="assets/spells/${data.icon}" class="spell-icon-res" title="${name}">`;
        }
        return `<span class="count-badge">${p}</span>`;
    }).join('');

    const getWandResultHtml = (item) => `
        <div class="wand-sequence">
            <div class="spell-icons-row">${getIconsHtml(item.parts)}</div>
            <div class="wand-result-main">
                <div class="wand-text-id">${item.wand}</div>
                <div class="twwe-actions">
                    <a class="twwe-link" href="${getTwweUrl(item.wand)}" target="_blank" rel="noopener">${t('twwe_btn')}</a>
                    <a class="twwe-link phasing-link" href="${getPhasingUrl(item.wand)}" target="_blank" rel="noopener">PHASING_ARC</a>
                </div>
            </div>
        </div>
    `;

    const renderResults = (items) => {
        elements.resultsBody.innerHTML = '';
        elements.resultsTable.style.display = '';
        elements.rangeResults.style.display = 'none';
        elements.tableWrapper.classList.remove('range-mode');

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="count-badge">${item.target}</span></td>
                <td>${getWandResultHtml(item)}</td>
                <td><span class="count-badge">${item.length} ${t('table_slots')}</span></td>
            `;
            elements.resultsBody.appendChild(tr);
        });
    };

    const renderRangeResults = (groups, perColumnLimit, totalLimit) => {
        elements.resultsBody.innerHTML = '';
        elements.resultsTable.style.display = 'none';
        elements.rangeResults.style.display = '';
        elements.tableWrapper.classList.add('range-mode');

        let rendered = 0;
        elements.rangeResults.innerHTML = groups.map(group => {
            const remaining = totalLimit - rendered;
            if (remaining <= 0) return '';
            const items = group.results.slice(0, Math.min(perColumnLimit, remaining));
            rendered += items.length;

            const bodyHtml = items.length > 0
                ? items.map(item => `
                    <div class="range-card">
                        ${getWandResultHtml(item)}
                        <span class="count-badge">${item.length} ${t('table_slots')}</span>
                    </div>
                `).join('')
                : `<div class="range-empty">${group.missing ? t('status_no_results', group.count) : t('status_no_matches', group.indexedTotal, group.fullTotal)}</div>`;

            return `
                <section class="range-column">
                    <div class="range-column-header">
                        <span>${group.count}</span>
                        <span>${group.results.length}</span>
                    </div>
                    <div class="range-column-body">${bodyHtml}</div>
                </section>
            `;
        }).join('');
    };

    const closeSidebarOnMobile = () => {
        if (window.innerWidth <= 1024) {
            elements.sidebar.classList.remove('active');
            elements.mobileToggle.innerHTML = iconMenu;
        }
    };

    const runSearch = async (counts) => {
        if (counts.length === 0) {
            elements.status.textContent = t('status_range_empty');
            return;
        }

        elements.status.textContent = counts.length === 1 ? t('status_fetching', counts[0]) : t('status_fetching_range', counts.length);
        elements.resultsBody.innerHTML = '';
        elements.rangeResults.innerHTML = '';
        elements.resultsContainer.classList.remove('visible');

        try {
            const filters = getActiveFilters();
            const loaded = await Promise.all(counts.map(count => loadCountResults(count, filters)));
            const indexedTotal = loaded.reduce((total, item) => total + item.indexedTotal, 0);
            const fullTotal = loaded.reduce((total, item) => total + item.fullTotal, 0);
            const results = loaded.flatMap(item => item.results);
            const limit = 500;
            const displayed = counts.length === 1
                ? results.slice(0, limit)
                : loaded.flatMap(item => item.results.slice(0, Math.max(1, Math.floor(limit / counts.length)))).slice(0, limit);

            if (displayed.length === 0) {
                elements.status.textContent = indexedTotal === 0 ? t('status_no_results', counts.join(', ')) : t('status_no_matches', indexedTotal, fullTotal);
                return;
            }

            if (counts.length === 1) {
                renderResults(displayed);
            } else {
                renderRangeResults(loaded, Math.max(1, Math.floor(limit / counts.length)), limit);
            }
            elements.status.textContent = counts.length === 1
                ? t('status_complete', results.length, displayed.length, indexedTotal, fullTotal)
                : t('status_complete_range', results.length, displayed.length, counts.length, indexedTotal, fullTotal);
            elements.resultsContainer.classList.add('visible');
            closeSidebarOnMobile();
        } catch (error) {
            console.error(error);
            elements.status.textContent = t('status_error');
        }
    };

    const handleSearch = async () => {
        runSearch(parseCounts(elements.targetCount.value));
    };

    // Language Toggle
    elements.langToggle.onclick = () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('noita_lang', currentLang);
        updateUIStrings();
    };

    const loadManifest = async () => {
        try {
            const response = await fetch(`${DATA_DIR}/_manifest.json`);
            if (response.ok) {
                datasetManifest = await response.json();
            }
        } catch (error) {
            console.warn('Dataset manifest unavailable.', error);
        }
    };

    // --- Initialization ---
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.targetCount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    elements.minSlots.max = String(MAX_SLOTS);
    elements.maxSlots.max = String(MAX_SLOTS);
    loadManifest().finally(updateUIStrings);
});
