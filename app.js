document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & Data ---
    const SPELL_DATA = {
        "BURST_8": { icon: "burst_8.png", name: "八倍法术" },
        "DIVIDE_10": { icon: "divide_10.png", name: "一分为十" },
        "DIVIDE_4": { icon: "divide_4.png", name: "一分为四" },
        "DIVIDE_3": { icon: "divide_3.png", name: "一分为三" },
        "DIVIDE_2": { icon: "divide_2.png", name: "一分为二" },
        "TAU": { icon: "tau.png", name: "陶" },
        "ADD_TRIGGER": { icon: "add_trigger.png", name: "追加触发" },
        "FLY_DOWNWARDS": { icon: "fly_downwards.png", name: "向下飞行" }
    };

    // Filter State
    const filterState = {
        minSlots: null,
        maxSlots: null,
        spells: {} // { ID: { minCount: 0, excluded: false } }
    };

    // Initialize Filter State
    Object.keys(SPELL_DATA).forEach(id => {
        filterState.spells[id] = { minCount: 0, excluded: false };
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
        mobileToggle: document.getElementById('mobileToggle')
    };

    // --- UI Rendering ---

    const renderFilters = () => {
        elements.spellFilters.innerHTML = Object.entries(SPELL_DATA).map(([id, data]) => `
            <div class="spell-filter-item" data-id="${id}">
                <img src="assets/spells/${data.icon}" class="spell-icon-sm" title="${data.name}">
                <span class="spell-name-sm">${data.name}</span>
                <div class="spell-controls">
                    <button class="exclude-btn ${filterState.spells[id].excluded ? 'active' : ''}" onclick="toggleExclude('${id}')" title="排除该法术">✕</button>
                    <div class="counter text-center">
                        <button class="count-btn" onclick="updateCount('${id}', -1)">-</button>
                        <span class="count-val" id="count-${id}">${filterState.spells[id].minCount}</span>
                        <button class="count-btn" onclick="updateCount('${id}', 1)">+</button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    window.updateCount = (id, delta) => {
        const item = filterState.spells[id];
        item.minCount = Math.max(0, item.minCount + delta);
        document.getElementById(`count-${id}`).textContent = item.minCount;
        if (item.minCount > 0) {
            item.excluded = false;
            document.querySelector(`.spell-filter-item[data-id="${id}"] .exclude-btn`).classList.remove('active');
        }
    };

    window.toggleExclude = (id) => {
        const item = filterState.spells[id];
        item.excluded = !item.excluded;
        if (item.excluded) {
            item.minCount = 0;
            document.getElementById(`count-${id}`).textContent = 0;
        }
        document.querySelector(`.spell-filter-item[data-id="${id}"] .exclude-btn`).classList.toggle('active');
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

        elements.status.textContent = `⏳ 正在从云端拉取产出量为 ${count} 的全量数据...`;
        elements.resultsBody.innerHTML = '';
        elements.resultsContainer.classList.remove('visible');

        try {
            const response = await fetch(`./data/${count}.txt`);
            if (!response.ok) {
                elements.status.textContent = `❌ 未找到产出量为 ${count} 的法术组合。请更换数值尝试。`;
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
                    if (config.excluded && actualCount > 0) return false;
                    if (config.minCount > 0 && actualCount < config.minCount) return false;
                }
                return true;
            }).sort((a, b) => a.length - b.length);

            // Render Results
            const limit = 500;
            const displayed = results.slice(0, limit);

            if (displayed.length === 0) {
                elements.status.textContent = `📭 在 ${rawWands.length} 组数据中未找到匹配当前筛选条件的组合。`;
                return;
            }

            displayed.forEach(item => {
                const tr = document.createElement('tr');
                
                // Icons row
                const iconsHtml = item.parts.map(p => {
                    const data = SPELL_DATA[p];
                    if (data) {
                        return `<img src="assets/spells/${data.icon}" class="spell-icon-res" title="${data.name}">`;
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
                    <td><span class="count-badge">${item.length} 槽位</span></td>
                `;
                elements.resultsBody.appendChild(tr);
            });

            elements.status.textContent = `✅ 筛选完成：匹配 ${results.length} 组。展示前 ${displayed.length} 组方案。`;
            elements.resultsContainer.classList.add('visible');
            
            // Close sidebar on mobile after search
            if (window.innerWidth <= 1024) {
                elements.sidebar.classList.remove('active');
                elements.mobileToggle.innerHTML = '☰';
            }

        } catch (error) {
            console.error(error);
            elements.status.textContent = '⚠️ 查询出错，请确认网络连接或数据是否存在。';
        }
    };

    // --- Initialization ---
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.targetCount.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    renderFilters();
});
