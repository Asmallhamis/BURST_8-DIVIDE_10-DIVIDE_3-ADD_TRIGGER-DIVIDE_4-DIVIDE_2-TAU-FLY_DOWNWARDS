document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('targetCount');
    const btn = document.getElementById('searchBtn');
    const status = document.getElementById('status');
    const tableContainer = document.querySelector('.results-container');
    const body = document.getElementById('resultsBody');

    const handleSearch = async () => {
        const count = input.value;
        if (!count) return;

        status.textContent = `正在查询产出量为 ${count} 的组合...`;
        body.innerHTML = '';
        tableContainer.classList.remove('visible');

        try {
            // 数据文件位于 data/<count>.txt
            // 请注意，部署在 GitHub 时，路径通常是 ./data/<count>.txt
            const response = await fetch(`./data/${count}.txt`);
            
            if (!response.ok) {
                status.textContent = `未找到产出量为 ${count} 的法术组合。`;
                return;
            }

            const text = await response.text();
            const wands = text.trim().split('\n');

            // 计算长度并排序
            const results = wands.map(w => ({
                wand: w.trim(),
                length: w.split(',').length
            })).sort((a, b) => a.length - b.length);

            // 性能优化：限制展示前 1000 条最简组合，防止浏览器渲染压力过大
            const limit = 1000;
            const displayedResults = results.slice(0, limit);

            displayedResults.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="wand-text">${item.wand}</td>
                    <td>${item.length}</td>
                `;
                body.appendChild(tr);
            });

            if (results.length > limit) {
                status.textContent = `找到 ${results.length} 组匹配组合。已为您展示前 ${limit} 组最简方案。`;
            } else {
                status.textContent = `找到 ${results.length} 组匹配组合。`;
            }
            tableContainer.classList.add('visible');

        } catch (error) {
            console.error(error);
            status.textContent = '查询出错，请确认数据文件是否存在。';
        }
    };

    btn.addEventListener('click', handleSearch);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});
