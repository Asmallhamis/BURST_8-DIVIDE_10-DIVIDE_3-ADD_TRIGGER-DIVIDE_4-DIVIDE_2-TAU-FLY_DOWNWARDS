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
            status_ready: "已准备就绪：旧数据抽取 26 / 贡献数据抽取 1，最多 11 槽",
            status_fetching: (count) => `正在读取产出量为 ${count} 的本地索引...`,
            status_fetching_range: (total) => `正在查询 ${total} 个目标产出量的本地索引...`,
            status_no_results: (count) => `索引中未找到产出量为 ${count} 的法术组合。`,
            status_no_matches: (indexed, total) => `样本索引 ${formatNumber(indexed)} 组中没有匹配当前筛选条件的组合；全量命中 ${formatNumber(total)} 组。`,
            status_complete: (matches, limit, indexed, total) => `筛选完成：索引样本 ${formatNumber(indexed)} / 全量 ${formatNumber(total)} 组，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`,
            status_complete_range: (matches, limit, totalTargets, indexed, total) => `查询完成：${totalTargets} 个目标，索引样本 ${formatNumber(indexed)} / 全量 ${formatNumber(total)} 组，筛选后 ${formatNumber(matches)} 组，展示 ${formatNumber(limit)} 组。`,
            status_range_empty: "请输入有效的范围或数字列表。",
            status_error: "⚠️ 查询出错，请确认网络连接或数据是否存在。",
            min_lbl: "Min",
            max_lbl: "Max",
            dataset_label: "数据来源 / 初始抽取数",
            dataset_all: "全部来源（分别标注条件）",
            dataset_legacy: "旧数据 · 抽取 26 · 最多 9 槽",
            dataset_contribution: "Ko0bEy · 抽取 1 · 最多 11 槽",
            half_label: "IF_HALF 初始状态（仅贡献数据）",
            half_all: "全部状态",
            notes_title: "数据来源、计算条件与验证说明",
            notes_intro: "相同法术排列在不同初始抽取数或 IF_HALF 状态下，产出可能不同。抽取数不是施放次数，也不是最终执行的法术数。请按结果旁的条件使用配方。",
            notes_legacy: "旧数据：13 种法术、最多 9 槽；初始抽取 26、施放 1 次，统计 FLY_DOWNWARDS（向下飞行）的执行次数。其中黑洞固定为 0 次数（BLACK_HOLE#0），不受“无限法术”天赋影响。页面使用每个产出最多 1,000 条的样本索引；未命中筛选条件不代表不存在配方。",
            notes_contribution: "贡献数据：Ko0bEy 于 2026-09-26 提供；12 种法术、最多 11 槽，初始抽取 1。这批法术池包含血魔法，不包含黑洞。原表共 171,084 条、2,978 种产出值。网站将原表的 ELECTRIC_CHARGE（电荷）统一映射为 FLY_DOWNWARDS（向下飞行），按相同产出和相同排列合并重复配方，保留所有来源、抽取数和 half 条件；原始 CSV 保持不变。",
            notes_validation: "验证：全表已检查字段、法术编码、长度、条件及重复项；另用 wand_eval_tree 抽样复算 310 条，抽取 1 时全部吻合，改成 26 时有 8 条产出变化。未对全部结果复算。我们复算时使用施放 1 次、法力 10,000、无模组。以上是我们的复算设置，贡献者的原始完整配置未提供。",
            notes_half: "half=0/1 表示 IF_HALF 的初始状态。界面只对 half=1 添加醒目标记，常规的 half=0 不显示；合并结果还支持其他条件时，标记为“IF_HALF=1 可用”。完整条件仍保留在悬停说明和复制内容中。来源和 half 筛选只保留匹配的条件。TWWE 链接打开统一装配模板，复现时请按配方条件设置抽取数及 half。",
            source_csv: "原始 CSV",
            validation_csv: "抽样复算记录",
            dataset_docs: "详细说明 / 导入方法",
            legacy_condition: "旧数据 · 初始抽取 26 · 向下飞行计数",
            contribution_condition: (draws, half) => `Ko0bEy · 初始抽取 ${draws} · IF_HALF 初始状态 ${half} · 向下飞行计数`,
            legacy_condition_short: "旧 · 抽26",
            contribution_condition_short: (draws) => `Ko0bEy · 抽${draws}`,
            half_one_label: "IF_HALF=1",
            half_one_supported: "IF_HALF=1 可用",
            template_hint: "打开统一装配模板；复现时按配方条件设置抽取数及 half",
            copy_recipe: "复制配方和条件",
            copy_recipe_short: "复制",
            copied: "已复制",
            copy_failed: "复制失败，请手动选取配方和条件",
            empty_wand: "空序列",
            status_combined: (matches, shown, legacyIndexed, legacyTotal, contributed) => `去重后匹配 ${formatNumber(matches)} 条配方，展示 ${formatNumber(shown)} 条；旧数据索引 ${formatNumber(legacyIndexed)} / 全量命中 ${formatNumber(legacyTotal)} 条，贡献数据读取 ${formatNumber(contributed)} 条记录。`,
            status_contributed: (matches, shown, total) => `贡献数据：读取 ${formatNumber(total)} 条记录，去重后匹配 ${formatNumber(matches)} 条配方，展示 ${formatNumber(shown)} 条。`,
            no_filtered_results: "当前来源和筛选条件下无匹配结果。"
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
            status_ready: "Ready: legacy draw 26 / contributed draw 1, up to 11 slots",
            status_fetching: (count) => `Reading local index for target count ${count}...`,
            status_fetching_range: (total) => `Reading local indexes for ${total} target counts...`,
            status_no_results: (count) => `No indexed combinations found for count ${count}.`,
            status_no_matches: (indexed, total) => `No matching combinations among ${formatNumber(indexed)} indexed samples; full run has ${formatNumber(total)} hits.`,
            status_complete: (matches, limit, indexed, total) => `Filtering complete: ${formatNumber(indexed)} indexed / ${formatNumber(total)} full hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`,
            status_complete_range: (matches, limit, totalTargets, indexed, total) => `Search complete: ${totalTargets} targets, ${formatNumber(indexed)} indexed / ${formatNumber(total)} full hits, ${formatNumber(matches)} after filters. Showing ${formatNumber(limit)}.`,
            status_range_empty: "Enter a valid range or number list.",
            status_error: "⚠️ Search error. Check network or data existence.",
            min_lbl: "Min",
            max_lbl: "Max",
            dataset_label: "Dataset / initial draw count",
            dataset_all: "All sources (conditions shown separately)",
            dataset_legacy: "Legacy · draw 26 · up to 9 slots",
            dataset_contribution: "Ko0bEy · draw 1 · up to 11 slots",
            half_label: "Initial IF_HALF state (contribution only)",
            half_all: "Both states",
            notes_title: "Sources, evaluation conditions and validation",
            notes_intro: "The same spell sequence can produce different counts with different initial draws or IF_HALF states. Initial draws are not the number of casts or the final number of spell executions. Use the conditions shown beside each recipe.",
            notes_legacy: "Legacy data: 13 spells, up to 9 slots; initial draw 26, one cast, counting FLY_DOWNWARDS executions. Black Hole is explicitly set to zero charges (BLACK_HOLE#0) and is exempt from the Unlimited Spells perk. This page uses a sample index of up to 1,000 recipes per output. No filtered match does not prove that no recipe exists.",
            notes_contribution: "Contribution: supplied by Ko0bEy on 2026-09-26; 12 spells, up to 11 slots, initial draw 1. This pool includes Blood Magic and does not include Black Hole. The original export contains 171,084 rows and 2,978 output counts. The website maps ELECTRIC_CHARGE to FLY_DOWNWARDS and merges recipes with the same output and normalized sequence, retaining all sources, draws and half states. The original CSV is unchanged.",
            notes_validation: "Validation: all rows were checked for fields, spell codes, lengths, conditions and duplicates. A 310-row sample was reevaluated with wand_eval_tree: all matched at draw 1; 8 changed at draw 26. The entire dataset has not been reevaluated. Our sample check used one cast, 10,000 mana and no mods. These are our reevaluation settings. The contributor's complete original configuration was not supplied.",
            notes_half: "half=0/1 records the initial IF_HALF state. Only half=1 receives a highlighted badge; the usual half=0 is not displayed. If a merged recipe also has other matching conditions, the badge says “IF_HALF=1 supported”. Full conditions remain in the tooltip and copied text. Source and half filters retain only matching conditions. TWWE links open the shared assembly templates; use the recipe's initial draws and half when reproducing it.",
            source_csv: "Original CSV",
            validation_csv: "Validation sample",
            dataset_docs: "Details / import instructions",
            legacy_condition: "Legacy · initial draw 26 · FLY_DOWNWARDS count",
            contribution_condition: (draws, half) => `Ko0bEy · initial draw ${draws} · initial IF_HALF state ${half} · FLY_DOWNWARDS count`,
            legacy_condition_short: "Legacy · D26",
            contribution_condition_short: (draws) => `Ko0bEy · D${draws}`,
            half_one_label: "IF_HALF=1",
            half_one_supported: "IF_HALF=1 supported",
            template_hint: "Open the shared assembly template; set initial draws and half to the recipe conditions",
            copy_recipe: "Copy recipe and conditions",
            copy_recipe_short: "Copy",
            copied: "Copied",
            copy_failed: "Copy failed; select the recipe and conditions manually",
            empty_wand: "Empty sequence",
            status_combined: (matches, shown, legacyIndexed, legacyTotal, contributed) => `${formatNumber(matches)} unique matching recipes, showing ${formatNumber(shown)}; legacy ${formatNumber(legacyIndexed)} indexed / ${formatNumber(legacyTotal)} full hits, ${formatNumber(contributed)} contributed records read.`,
            status_contributed: (matches, shown, total) => `Contribution: ${formatNumber(total)} records read, ${formatNumber(matches)} unique matching recipes, showing ${formatNumber(shown)}.`,
            no_filtered_results: "No matches for the selected source and filters."
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
        document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
        renderFilters();
    };

    // --- Configuration & Data ---
    const DATA_DIR = './data13';
    const CONTRIBUTION_DIR = './data-contrib/koobey-20260926';
    const MAX_SLOTS = 11;
    let datasetManifest = null;
    let contributionManifest = null;
    let searchGeneration = 0;
    const contributionBuckets = new Map();

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
        "BLACK_HOLE#0": { icon: "black_hole.png", label: "BH0", zh: "黑洞（0 次）", en: "Black Hole (0 charges)" },
        "IF_HALF": { icon: "if_half.png", label: "HALF", zh: "要求：每隔一次", en: "Requirement: Every Other" },
        "BLOOD_MAGIC": { icon: "blood_magic.png", label: "BM", zh: "血魔法", en: "Blood Magic" }
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
        // The contribution includes recipes with more than one BURST_8.
        filterState.spells[id] = { min: 0, max: Infinity };
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
        langToggle: document.getElementById('langToggle'),
        datasetSelect: document.getElementById('datasetSelect'),
        halfSelect: document.getElementById('halfSelect'),
        halfFilter: document.getElementById('halfFilter')
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
        maxS: elements.maxSlots.value === '' ? MAX_SLOTS : Number(elements.maxSlots.value),
        dataset: elements.datasetSelect.value,
        half: elements.halfSelect.value,
        spells: Object.fromEntries(Object.entries(filterState.spells).map(([id, config]) => [id, { ...config }]))
    });

    const makeResult = (count, parts, source, draws, half) => {
        parts = parts.map(spell => spell === 'ELECTRIC_CHARGE' ? 'FLY_DOWNWARDS' : spell);
        const spellCounts = {};
        parts.forEach(spell => spellCounts[spell] = (spellCounts[spell] || 0) + 1);
        return {
            target: count, wand: parts.join(','), parts, length: parts.length,
            counts: spellCounts, source, draws, half, conditions: [{ source, draws, half }]
        };
    };

    const loadLegacyCount = async (count) => {
        if (!datasetManifest) throw new Error('Legacy manifest unavailable');
        const meta = datasetManifest.counts[String(count)];
        if (!meta) return { indexedTotal: 0, fullTotal: 0, results: [] };
        const response = await fetch(`${DATA_DIR}/${count}.txt`);
        if (!response.ok) throw new Error(`Legacy index ${count} unavailable`);
        const text = await response.text();
        const rawWands = text.trim().split('\n').filter(Boolean);
        return {
            indexedTotal: rawWands.length,
            fullTotal: meta.total,
            results: rawWands.map(wand => makeResult(count, wand.trim().split(','), 'legacy', 26, null))
        };
    };

    const loadContributionCount = async (count) => {
        if (!contributionManifest) throw new Error('Contribution manifest unavailable');
        if (!contributionManifest.counts[String(count)]) return [];
        const bucket = Math.floor(Number(count) / contributionManifest.bucket_size) * contributionManifest.bucket_size;
        if (!contributionBuckets.has(bucket)) {
            const request = fetch(`${CONTRIBUTION_DIR}/${bucket}.json`).then(response => {
                if (!response.ok) throw new Error(`Contribution index ${bucket} unavailable`);
                return response.json();
            }).catch(error => {
                contributionBuckets.delete(bucket);
                throw error;
            });
            contributionBuckets.set(bucket, request);
        }
        const data = await contributionBuckets.get(bucket);
        const rows = data[String(count)];
        if (!rows || rows.length !== contributionManifest.counts[String(count)]) throw new Error('Incomplete contribution index');
        return rows.map(([sequence, draws, half]) => {
            const parts = [...sequence].map(code => {
                const spell = contributionManifest.spell_codes[code];
                if (!SPELL_DATA[spell] && spell !== 'ELECTRIC_CHARGE') throw new Error('Unknown contributed spell');
                return spell;
            });
            return makeResult(count, parts, 'contribution', draws, half);
        });
    };

    const loadCountResults = async (count, filters) => {
        const [legacy, contributed] = await Promise.all([
            filters.dataset === 'contribution' ? { indexedTotal: 0, fullTotal: 0, results: [] } : loadLegacyCount(count),
            filters.dataset === 'legacy' ? [] : loadContributionCount(count)
        ]);
        const filtered = [...legacy.results, ...contributed].filter(item => {
            if (item.length < filters.minS || item.length > filters.maxS) return false;
            if (item.source === 'contribution' && filters.half !== 'all' && item.half !== Number(filters.half)) return false;
            for (const [sid, config] of Object.entries(filters.spells)) {
                const actualCount = item.counts[sid] || 0;
                if (actualCount < config.min || actualCount > config.max) return false;
            }
            return true;
        });
        // This loader handles one output count. Merge normalized sequences,
        // keeping every condition that passed the selected filters.
        const byWand = new Map();
        for (const item of filtered) {
            const existing = byWand.get(item.wand);
            if (!existing) {
                byWand.set(item.wand, item);
                continue;
            }
            for (const condition of item.conditions) {
                if (!existing.conditions.some(value => value.source === condition.source && value.draws === condition.draws && value.half === condition.half)) {
                    existing.conditions.push(condition);
                }
            }
        }
        const results = [...byWand.values()].sort((a, b) => a.length - b.length);
        return {
            count, results,
            indexedTotal: legacy.indexedTotal + contributed.length,
            legacyIndexed: legacy.indexedTotal,
            fullTotal: legacy.fullTotal,
            contributedTotal: contributed.length,
            missing: legacy.indexedTotal + contributed.length === 0
        };
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

    const getConditionsLabel = (item, compact = false) => {
        const groups = new Map();
        for (const condition of item.conditions) {
            const key = `${condition.source}:${condition.draws}`;
            if (!groups.has(key)) groups.set(key, { ...condition, halves: [] });
            const group = groups.get(key);
            if (condition.half !== null && !group.halves.includes(condition.half)) group.halves.push(condition.half);
        }
        return [...groups.values()].map(condition => {
            if (condition.source === 'legacy') return t(compact ? 'legacy_condition_short' : 'legacy_condition');
            return t(compact ? 'contribution_condition_short' : 'contribution_condition', condition.draws, condition.halves.sort().join('/'));
        }).join(' / ');
    };

    const getHalfBadgeHtml = (item) => {
        if (!item.conditions.some(condition => condition.half === 1)) return '';
        const hasOtherCondition = item.conditions.some(condition => condition.half !== 1);
        return `<span class="half-one-badge" title="${getConditionsLabel(item)}">${t(hasOtherCondition ? 'half_one_supported' : 'half_one_label')}</span>`;
    };

    const getWandResultHtml = (item) => `
        <div class="wand-sequence">
            <div class="wand-result-main">
                <div class="spell-icons-row">${getIconsHtml(item.parts)}</div>
                <div class="twwe-actions">
                    <a class="twwe-link" href="${getTwweUrl(item.wand)}" target="_blank" rel="noopener" title="${t('template_hint')}">TWWE</a>
                    <a class="twwe-link phasing-link" href="${getPhasingUrl(item.wand)}" target="_blank" rel="noopener" title="${t('template_hint')}">PHASING_ARC</a>
                    <button type="button" class="twwe-link copy-recipe" title="${t('copy_recipe')}" aria-label="${t('copy_recipe')}" data-wand="${item.wand}" data-conditions="${encodeURIComponent(JSON.stringify(item.conditions))}" data-target="${item.target}">${t('copy_recipe_short')}</button>
                </div>
            </div>
            <div class="recipe-caption">
                ${getHalfBadgeHtml(item)}
                <span class="result-conditions" title="${getConditionsLabel(item)}">${getConditionsLabel(item, true)}</span>
                <span class="wand-text-id" title="${item.wand || t('empty_wand')}">${item.wand || t('empty_wand')}</span>
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
                <td><span class="count-badge">${item.length}</span></td>
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
                : `<div class="range-empty">${t('no_filtered_results')}</div>`;

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
        const generation = ++searchGeneration;
        if (counts.length === 0) {
            elements.status.textContent = t('status_range_empty');
            return;
        }

        elements.status.textContent = counts.length === 1 ? t('status_fetching', counts[0]) : t('status_fetching_range', counts.length);
        elements.resultsBody.innerHTML = '';
        elements.rangeResults.innerHTML = '';
        elements.resultsContainer.classList.remove('visible');

        try {
            if (!manifestsReady) manifestsReady = loadManifest();
            await manifestsReady;
            const filters = getActiveFilters();
            const loaded = await Promise.all(counts.map(count => loadCountResults(count, filters)));
            if (generation !== searchGeneration) return;
            const indexedTotal = loaded.reduce((total, item) => total + item.indexedTotal, 0);
            const fullTotal = loaded.reduce((total, item) => total + item.fullTotal, 0);
            const legacyIndexed = loaded.reduce((total, item) => total + item.legacyIndexed, 0);
            const contributedTotal = loaded.reduce((total, item) => total + item.contributedTotal, 0);
            const results = loaded.flatMap(item => item.results);
            const limit = 500;
            const displayed = counts.length === 1
                ? results.slice(0, limit)
                : loaded.flatMap(item => item.results.slice(0, Math.max(1, Math.floor(limit / counts.length)))).slice(0, limit);

            if (displayed.length === 0) {
                elements.status.textContent = filters.dataset === 'legacy'
                    ? (indexedTotal === 0 ? t('status_no_results', counts.join(', ')) : t('status_no_matches', indexedTotal, fullTotal))
                    : t('no_filtered_results');
                return;
            }

            if (counts.length === 1) {
                renderResults(displayed);
            } else {
                renderRangeResults(loaded, Math.max(1, Math.floor(limit / counts.length)), limit);
            }
            if (filters.dataset === 'contribution') {
                elements.status.textContent = t('status_contributed', results.length, displayed.length, contributedTotal);
            } else if (filters.dataset === 'all') {
                elements.status.textContent = t('status_combined', results.length, displayed.length, legacyIndexed, fullTotal, contributedTotal);
            } else {
                elements.status.textContent = counts.length === 1
                    ? t('status_complete', results.length, displayed.length, indexedTotal, fullTotal)
                    : t('status_complete_range', results.length, displayed.length, counts.length, indexedTotal, fullTotal);
            }
            elements.resultsContainer.classList.add('visible');
            closeSidebarOnMobile();
        } catch (error) {
            if (generation !== searchGeneration) return;
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
        if (elements.targetCount.value.trim()) handleSearch();
        else elements.status.textContent = t('status_ready');
    };

    const loadManifest = async () => {
        await Promise.all([
            [DATA_DIR, manifest => { datasetManifest = manifest; }],
            [CONTRIBUTION_DIR, manifest => { contributionManifest = manifest; }]
        ].map(async ([directory, save]) => {
            try {
                const response = await fetch(`${directory}/_manifest.json?v=20261004-text`);
                if (!response.ok) throw new Error('Manifest unavailable');
                save(await response.json());
            } catch (error) {
                console.warn('Dataset manifest unavailable.', error);
            }
        }));
    };

    // --- Initialization ---
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.targetCount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    const updateDatasetFilter = () => {
        elements.halfFilter.hidden = elements.datasetSelect.value === 'legacy';
        if (elements.targetCount.value.trim()) handleSearch();
    };
    elements.datasetSelect.addEventListener('change', updateDatasetFilter);
    elements.halfSelect.addEventListener('change', updateDatasetFilter);
    elements.resultsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('.copy-recipe');
        if (!button) return;
        const { wand, target } = button.dataset;
        const conditions = JSON.parse(decodeURIComponent(button.dataset.conditions));
        const conditionText = conditions.map(condition => condition.source === 'legacy'
            ? 'Legacy: initial draws 26'
            : `Ko0bEy (2026-09-26): initial draws ${condition.draws}, initial IF_HALF state ${condition.half}`
        ).join('\n');
        const text = `Sequence: ${wand || '(empty)'}\nCounted spell: FLY_DOWNWARDS\nExpected output: ${target}\nConditions:\n${conditionText}`;
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = t('copied');
        } catch (error) {
            button.textContent = t('copy_failed');
        }
    });

    elements.minSlots.max = String(MAX_SLOTS);
    elements.maxSlots.max = String(MAX_SLOTS);
    let manifestsReady = null;
    updateUIStrings();
    elements.status.textContent = t('status_ready');
});
