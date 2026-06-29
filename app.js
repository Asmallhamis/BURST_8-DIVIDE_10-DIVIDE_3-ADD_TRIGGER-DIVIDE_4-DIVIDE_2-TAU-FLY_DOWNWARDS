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
            status_ready: "已准备就绪：13 法术 / 9 槽静态索引。全量查询按需下载压缩索引：23≈1.4 MB，24≈1.8 MB，160≈25 KB。",
            status_fetching: (count, traffic) => `正在读取产出量为 ${count} 的索引${traffic ? `（首次约 ${traffic} 流量）` : ''}...`,
            status_fetching_range: (total, traffic) => `正在查询 ${total} 个目标产出量的索引${traffic ? `（首次合计约 ${traffic} 流量）` : ''}...`,
            status_no_results: (count) => `索引中未找到产出量为 ${count} 的法术组合。`,
            status_no_matches: (indexed, total, mode) => mode === 'full'
                ? `全量筛选完成：已检查 ${formatNumber(total)} 组真实命中，没有符合当前筛选的配方。`
                : `当前目标过大，网页只筛选 ${formatNumber(indexed)} 条预览样本；这些样本里没有匹配项。全量运行有 ${formatNumber(total)} 组命中。`,
            status_partial: (shown) => `已先展示 ${formatNumber(shown)} 组，正在后台统计完整匹配数...`,
            status_complete: (matches, limit, indexed, total, mode) => mode === 'full'
                ? `全量筛选完成：已检查 ${formatNumber(total)} 组真实命中，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`
                : `样本筛选完成：网页可筛选样本 ${formatNumber(indexed)} / 全量 ${formatNumber(total)} 组，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`,
            status_complete_range: (matches, limit, totalTargets, indexed, total, mode) => mode === 'full'
                ? `全量筛选完成：${totalTargets} 个目标，已检查 ${formatNumber(total)} 组真实命中，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`
                : `查询完成：${totalTargets} 个目标，网页可筛选样本 ${formatNumber(indexed)} / 全量 ${formatNumber(total)} 组，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`,
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
            status_ready: "Ready: 13-spell / 9-slot static index. Exact searches download compressed indexes on demand: 23≈1.4 MB, 24≈1.8 MB, 160≈25 KB.",
            status_fetching: (count, traffic) => `Reading index for target count ${count}${traffic ? ` (~${traffic} first-load transfer)` : ''}...`,
            status_fetching_range: (total, traffic) => `Reading indexes for ${total} target counts${traffic ? ` (~${traffic} first-load transfer)` : ''}...`,
            status_no_results: (count) => `No indexed combinations found for count ${count}.`,
            status_no_matches: (indexed, total, mode) => mode === 'full'
                ? `Full filtering complete: checked ${formatNumber(total)} real hits; none match the current filters.`
                : `This target is too large for the full static index, so the page filtered ${formatNumber(indexed)} preview rows; none match. The full run has ${formatNumber(total)} hits.`,
            status_partial: (shown) => `Showing the first ${formatNumber(shown)} matches while the full count continues in the background...`,
            status_complete: (matches, limit, indexed, total, mode) => mode === 'full'
                ? `Full filtering complete: checked ${formatNumber(total)} real hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`
                : `Sample filtering complete: ${formatNumber(indexed)} preview rows / ${formatNumber(total)} full hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`,
            status_complete_range: (matches, limit, totalTargets, indexed, total, mode) => mode === 'full'
                ? `Full filtering complete: ${totalTargets} targets, checked ${formatNumber(total)} real hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`
                : `Search complete: ${totalTargets} targets, ${formatNumber(indexed)} preview rows / ${formatNumber(total)} full hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`,
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
    const FULL_HITS_DIR = `${DATA_DIR}/full_hits`;
    const MAX_SLOTS = 9;
    const RESULT_LIMIT = 500;
    let datasetManifest = null;
    let fullHitManifest = null;
    const fullHitCache = new Map();
    let activeWorker = null;
    let activeSearchId = 0;

    const formatNumber = (value) => {
        if (value === undefined || value === null || Number.isNaN(Number(value))) return '?';
        return Number(value).toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US');
    };

    const formatBytes = (bytes) => {
        if (!bytes || Number.isNaN(Number(bytes))) return '';
        const value = Number(bytes);
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 100 * 1024 ? 1 : 0)} KB`;
        return `${(value / 1024 / 1024).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
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
    const CORE_CODES = ["0", "3", "+", "4", "2", "T", "F", "E", "R", "H", "N", "K"];
    const CODE_TO_SPELL = {
        "B": "BURST_8",
        "0": "DIVIDE_10",
        "3": "DIVIDE_3",
        "+": "ADD_TRIGGER",
        "4": "DIVIDE_4",
        "2": "DIVIDE_2",
        "T": "TAU",
        "F": "FLY_DOWNWARDS",
        "E": "IF_ELSE",
        "R": "RESET",
        "H": "IF_HP",
        "N": "IF_END",
        "K": "BLACK_HOLE#0"
    };
    const COUNT_SEGMENTS = (() => {
        const segments = [];
        let cursor = 0;
        for (let length = 1; length <= MAX_SLOTS; length++) {
            [
                { prefix: "", remLen: length },
                { prefix: "B", remLen: length - 1 }
            ].forEach(segment => {
                const size = CORE_CODES.length ** segment.remLen;
                segments.push({
                    start: cursor,
                    end: cursor + size,
                    prefix: segment.prefix,
                    remLen: segment.remLen
                });
                cursor += size;
            });
        }
        return segments;
    })();
    const SIMULATOR_BASE_URL = 'https://asmallhamis.github.io/TheWebWandEngine/';
    const TWWE_WAND_PREFIX = 'NOLLA,HORIZONTAL_ARC,DELAYED_SPELL,BURST_8,TENTACLE_TIMER,CASTER_CAST,TELEPORT_PROJECTILE_CLOSER,,,';
    const formatTwweSpellToken = (spellId) => {
        const charged = spellId.match(/^(.+)#(-?\d+)$/);
        return charged ? `${charged[1]}{${charged[2]}}` : spellId;
    };
    const formatTwweSpellSequence = (wand) => wand.split(',').map(formatTwweSpellToken).join(',');
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
        if (val > MAX_SLOTS) val = MAX_SLOTS;
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

    const getActiveFilters = () => {
        const spells = {};
        Object.entries(filterState.spells).forEach(([id, config]) => {
            spells[id] = {
                min: config.min,
                max: config.max === Infinity ? null : config.max
            };
        });
        return {
            minS: parseInt(elements.minSlots.value) || 0,
            maxS: parseInt(elements.maxSlots.value) || 99,
            spells
        };
    };

    const indexToCode = (index) => {
        const segment = COUNT_SEGMENTS.find(item => index >= item.start && index < item.end);
        if (!segment) return "";
        let offset = index - segment.start;
        const digits = new Array(segment.remLen);
        for (let pos = segment.remLen - 1; pos >= 0; pos--) {
            const digit = offset % CORE_CODES.length;
            digits[pos] = CORE_CODES[digit];
            offset = Math.floor(offset / CORE_CODES.length);
        }
        return segment.prefix + digits.join("");
    };

    const buildResultItemFromCode = (count, code) => {
        const parts = Array.from(code).map(ch => CODE_TO_SPELL[ch]);
        const spellCounts = {};
        parts.forEach(p => spellCounts[p] = (spellCounts[p] || 0) + 1);
        const wand = parts.join(',');
        return {
            target: count,
            wand,
            parts,
            length: parts.length,
            counts: spellCounts
        };
    };

    const itemMatchesFilters = (item, filters) => {
        if (item.length < filters.minS || item.length > filters.maxS) return false;

        for (const [sid, config] of Object.entries(filters.spells || filterState.spells)) {
            const actualCount = item.counts[sid] || 0;
            const max = config.max === null || config.max === undefined ? Infinity : config.max;
            if (actualCount < config.min || actualCount > max) {
                return false;
            }
        }
        return true;
    };

    const decodeVarintGapIndexes = (buffer, expectedTotal) => {
        const bytes = new Uint8Array(buffer);
        const indexes = new Float64Array(expectedTotal);
        let previous = -1;
        let value = 0;
        let multiplier = 1;
        let out = 0;

        for (const byte of bytes) {
            value += (byte & 0x7F) * multiplier;
            if (byte & 0x80) {
                multiplier *= 128;
                continue;
            }

            previous += value + 1;
            if (out < indexes.length) indexes[out] = previous;
            out += 1;
            value = 0;
            multiplier = 1;
        }

        if (out !== expectedTotal) {
            console.warn(`Full hit index decoded ${out} rows, expected ${expectedTotal}.`);
        }
        return out === indexes.length ? indexes : indexes.slice(0, out);
    };

    const loadFullHitIndexes = async (count) => {
        const key = String(count);
        if (fullHitCache.has(key)) return fullHitCache.get(key);

        const entry = fullHitManifest?.counts?.[key];
        if (!entry) return null;

        const buffer = await fetchFullHitIndexBuffer(entry);
        if (!buffer) return null;

        const indexes = decodeVarintGapIndexes(buffer, entry.total);
        const loaded = { entry, indexes };
        fullHitCache.set(key, loaded);
        return loaded;
    };

    const fetchFullHitIndexBuffer = async (entry) => {
        const candidates = [];
        if (entry.compressed_file && window.DecompressionStream) {
            candidates.push({ file: entry.compressed_file, compressed: true });
        }
        candidates.push({ file: entry.file, compressed: false });

        for (const candidate of candidates) {
            const response = await fetch(`${FULL_HITS_DIR}/${candidate.file}`);
            if (!response.ok) continue;

            if (!candidate.compressed || response.headers.get('content-encoding') === 'gzip') {
                return response.arrayBuffer();
            }
            if (!response.body?.pipeThrough) continue;

            try {
                const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
                return new Response(stream).arrayBuffer();
            } catch (_error) {
                continue;
            }
        }
        return null;
    };

    const getIndexTransferBytes = (count) => {
        const entry = fullHitManifest?.counts?.[String(count)];
        if (!entry) return 0;
        return entry.compressed_bytes || entry.bytes || 0;
    };

    const getTrafficSummary = (counts) => {
        const bytes = counts.reduce((total, count) => total + getIndexTransferBytes(count), 0);
        return formatBytes(bytes);
    };

    const loadFullCountResults = async (count, filters, meta) => {
        const loaded = await loadFullHitIndexes(count);
        if (!loaded) return null;

        const results = [];
        let matchTotal = 0;
        for (const index of loaded.indexes) {
            const code = indexToCode(index);
            if (!code) continue;
            const item = buildResultItemFromCode(count, code);
            if (!itemMatchesFilters(item, filters)) continue;

            matchTotal += 1;
            if (results.length < RESULT_LIMIT) {
                results.push(item);
            }
        }

        const fullTotal = meta.total || loaded.entry.total;
        return {
            count,
            rawTotal: loaded.entry.total,
            indexedTotal: loaded.entry.total,
            fullTotal,
            matchTotal,
            results,
            missing: false,
            mode: 'full'
        };
    };

    const loadSampleCountResults = async (count, filters, meta) => {
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
        const indexedTotal = rawWands.length;
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
        }).filter(item => itemMatchesFilters(item, filters)).sort((a, b) => a.length - b.length);

        return {
            count,
            rawTotal: rawWands.length,
            indexedTotal,
            fullTotal,
            matchTotal: results.length,
            results,
            missing: false,
            mode: 'sample'
        };
    };

    const loadCountResults = async (count, filters) => {
        const meta = datasetManifest?.counts?.[String(count)] || { total: 0, indexed: 0 };
        const fullResults = await loadFullCountResults(count, filters, meta);
        if (fullResults) return fullResults;
        return loadSampleCountResults(count, filters, meta);
    };

    const getResultMode = (loaded) => {
        const present = loaded.filter(item => !item.missing);
        if (present.length === 0) return 'sample';
        return present.every(item => item.mode === 'full') ? 'full' : 'sample';
    };

    const utf8ToBase64 = (value) => window.btoa(unescape(encodeURIComponent(value)));
    const getTwweUrl = (wand) => `${SIMULATOR_BASE_URL}?wand=${encodeURIComponent(utf8ToBase64(getTwweWandText(wand)))}`;

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
                <a class="twwe-link" href="${getTwweUrl(item.wand)}" target="_blank" rel="noopener">${t('twwe_btn')}</a>
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
                : `<div class="range-empty">${group.missing ? t('status_no_results', group.count) : t('status_no_matches', group.indexedTotal, group.fullTotal, group.mode)}</div>`;

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

    const renderLoadedResults = (counts, loaded, isFinal) => {
        const indexedTotal = loaded.reduce((total, item) => total + item.indexedTotal, 0);
        const fullTotal = loaded.reduce((total, item) => total + item.fullTotal, 0);
        const matchTotal = loaded.reduce((total, item) => {
            if (item.matchTotal === null || item.matchTotal === undefined) return total;
            return total + item.matchTotal;
        }, 0);
        const resultMode = getResultMode(loaded);
        const results = loaded.flatMap(item => item.results);
        const limit = RESULT_LIMIT;
        const displayed = counts.length === 1
            ? results.slice(0, limit)
            : loaded.flatMap(item => item.results.slice(0, Math.max(1, Math.floor(limit / counts.length)))).slice(0, limit);

        if (displayed.length === 0) {
            if (isFinal) {
                elements.status.textContent = indexedTotal === 0 ? t('status_no_results', counts.join(', ')) : t('status_no_matches', indexedTotal, fullTotal, resultMode);
            }
            return;
        }

        if (counts.length === 1) {
            renderResults(displayed);
        } else {
            renderRangeResults(loaded, Math.max(1, Math.floor(limit / counts.length)), limit);
        }
        elements.resultsContainer.classList.add('visible');

        if (!isFinal) {
            elements.status.textContent = t('status_partial', displayed.length);
            return;
        }

        elements.status.textContent = counts.length === 1
            ? t('status_complete', matchTotal, displayed.length, indexedTotal, fullTotal, resultMode)
            : t('status_complete_range', matchTotal, displayed.length, counts.length, indexedTotal, fullTotal, resultMode);
        closeSidebarOnMobile();
    };

    const runSearchOnMainThread = async (counts, filters) => {
        const loaded = await Promise.all(counts.map(count => loadCountResults(count, filters)));
        renderLoadedResults(counts, loaded, true);
    };

    const runSearch = async (counts) => {
        if (counts.length === 0) {
            elements.status.textContent = t('status_range_empty');
            return;
        }

        if (activeWorker) {
            activeWorker.terminate();
            activeWorker = null;
        }
        const queryId = ++activeSearchId;
        const traffic = getTrafficSummary(counts);
        elements.status.textContent = counts.length === 1 ? t('status_fetching', counts[0], traffic) : t('status_fetching_range', counts.length, traffic);
        elements.resultsBody.innerHTML = '';
        elements.rangeResults.innerHTML = '';
        elements.resultsContainer.classList.remove('visible');

        const filters = getActiveFilters();
        if (!window.Worker) {
            try {
                await runSearchOnMainThread(counts, filters);
            } catch (error) {
                console.error(error);
                elements.status.textContent = t('status_error');
            }
            return;
        }

        try {
            const worker = new Worker('search-worker.js');
            activeWorker = worker;
            worker.onmessage = (event) => {
                const message = event.data;
                if (message.queryId !== queryId) return;
                if (message.type === 'partial') {
                    renderLoadedResults(counts, message.loaded, false);
                    return;
                }
                if (message.type === 'complete') {
                    renderLoadedResults(counts, message.loaded, true);
                    worker.terminate();
                    if (activeWorker === worker) activeWorker = null;
                    return;
                }
                if (message.type === 'error') {
                    console.error(message.message);
                    elements.status.textContent = t('status_error');
                    worker.terminate();
                    if (activeWorker === worker) activeWorker = null;
                }
            };
            worker.onerror = (error) => {
                if (queryId !== activeSearchId) return;
                console.error(error);
                elements.status.textContent = t('status_error');
                worker.terminate();
                if (activeWorker === worker) activeWorker = null;
            };
            worker.postMessage({
                type: 'query',
                queryId,
                counts,
                filters,
                datasetManifest,
                fullHitManifest
            });
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

    const loadFullHitManifest = async () => {
        try {
            const response = await fetch(`${FULL_HITS_DIR}/_manifest.json`);
            if (response.ok) {
                fullHitManifest = await response.json();
            }
        } catch (error) {
            console.warn('Full hit index manifest unavailable.', error);
        }
    };

    // --- Initialization ---
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.targetCount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    elements.minSlots.max = String(MAX_SLOTS);
    elements.maxSlots.max = String(MAX_SLOTS);
    Promise.all([loadManifest(), loadFullHitManifest()]).finally(updateUIStrings);
});
