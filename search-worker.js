const DATA_DIR = './data13';
const FULL_HITS_DIR = `${DATA_DIR}/full_hits`;
const MAX_SLOTS = 9;
const RESULT_LIMIT = 500;
const CANDIDATE_SET_LIMIT = 2_000_000;
const CANDIDATE_SET_MIN_INDEX_ROWS = 50_000;

const SPELL_IDS = [
    'BURST_8',
    'DIVIDE_10',
    'DIVIDE_3',
    'ADD_TRIGGER',
    'DIVIDE_4',
    'DIVIDE_2',
    'TAU',
    'FLY_DOWNWARDS',
    'IF_ELSE',
    'RESET',
    'IF_HP',
    'IF_END',
    'BLACK_HOLE#0'
];
const CORE_CODES = ['0', '3', '+', '4', '2', 'T', 'F', 'E', 'R', 'H', 'N', 'K'];
const CODE_TO_SPELL = {
    B: 'BURST_8',
    0: 'DIVIDE_10',
    3: 'DIVIDE_3',
    '+': 'ADD_TRIGGER',
    4: 'DIVIDE_4',
    2: 'DIVIDE_2',
    T: 'TAU',
    F: 'FLY_DOWNWARDS',
    E: 'IF_ELSE',
    R: 'RESET',
    H: 'IF_HP',
    N: 'IF_END',
    K: 'BLACK_HOLE#0'
};
const COUNT_SEGMENTS = (() => {
    const segments = [];
    let cursor = 0;
    for (let length = 1; length <= MAX_SLOTS; length++) {
        [
            { prefix: '', remLen: length },
            { prefix: 'B', remLen: length - 1 }
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

let activeQueryId = 0;

const maxValue = (value) => value === null || value === undefined ? Infinity : value;

const emptyCounts = () => Object.fromEntries(SPELL_IDS.map(id => [id, 0]));

const getRule = (filters, id) => filters.spells[id] || { min: 0, max: null };

const isDefaultAllPassFilter = (filters) => {
    if ((filters.minS || 0) > 1 || (filters.maxS || MAX_SLOTS) < MAX_SLOTS) return false;
    return SPELL_IDS.every(id => {
        const rule = getRule(filters, id);
        const defaultMax = id === 'BURST_8' ? 1 : Infinity;
        return (rule.min || 0) === 0 && maxValue(rule.max) >= defaultMax;
    });
};

const shouldTryCandidateSet = (filters) => {
    let score = 0;
    for (const id of SPELL_IDS) {
        const rule = getRule(filters, id);
        const defaultMax = id === 'BURST_8' ? 1 : Infinity;
        if ((rule.min || 0) > 0) score += 2;
        if (maxValue(rule.max) < defaultMax) score += 1;
    }
    return score >= 3;
};

const getConstrainedSpellIds = (filters) => SPELL_IDS.filter(id => {
    const rule = getRule(filters, id);
    const defaultMax = id === 'BURST_8' ? 1 : Infinity;
    return (rule.min || 0) > 0 || maxValue(rule.max) < defaultMax;
});

const countsCanStillMatch = (counts, filters, remaining) => {
    for (const id of SPELL_IDS) {
        const rule = getRule(filters, id);
        const actual = counts[id] || 0;
        if (actual > maxValue(rule.max)) return false;
        if (actual + remaining < (rule.min || 0)) return false;
    }
    return true;
};

const estimateCandidateCount = (filters, cap) => {
    const constrainedIds = getConstrainedSpellIds(filters);
    if (constrainedIds.length === 0) return cap + 1;
    const constrainedIndex = Object.fromEntries(constrainedIds.map((id, index) => [id, index]));
    const constrainedCanStillMatch = (counts, remaining) => {
        for (let i = 0; i < constrainedIds.length; i++) {
            const rule = getRule(filters, constrainedIds[i]);
            if (counts[i] > maxValue(rule.max)) return false;
            if (counts[i] + remaining < (rule.min || 0)) return false;
        }
        return true;
    };
    const constrainedMatchFinal = (counts) => {
        for (let i = 0; i < constrainedIds.length; i++) {
            const rule = getRule(filters, constrainedIds[i]);
            if (counts[i] < (rule.min || 0) || counts[i] > maxValue(rule.max)) return false;
        }
        return true;
    };

    let total = 0;
    for (const segment of COUNT_SEGMENTS) {
        const length = segment.prefix.length + segment.remLen;
        if (length < filters.minS || length > filters.maxS) continue;

        const startCounts = new Array(constrainedIds.length).fill(0);
        if (segment.prefix === 'B' && constrainedIndex.BURST_8 !== undefined) {
            startCounts[constrainedIndex.BURST_8] = 1;
        }
        if (!constrainedCanStillMatch(startCounts, segment.remLen)) continue;

        const memo = new Map();
        const visit = (pos, counts) => {
            const remaining = segment.remLen - pos;
            if (!constrainedCanStillMatch(counts, remaining)) return 0;
            if (pos === segment.remLen) return constrainedMatchFinal(counts) ? 1 : 0;

            const key = `${pos}|${counts.join(',')}`;
            const cached = memo.get(key);
            if (cached !== undefined) return cached;

            let subtotal = 0;
            for (const code of CORE_CODES) {
                const spellId = CODE_TO_SPELL[code];
                const idx = constrainedIndex[spellId];
                if (idx === undefined) {
                    subtotal += visit(pos + 1, counts);
                } else {
                    counts[idx] += 1;
                    if (counts[idx] <= maxValue(getRule(filters, spellId).max)) {
                        subtotal += visit(pos + 1, counts);
                    }
                    counts[idx] -= 1;
                }
                if (subtotal > cap) {
                    memo.set(key, cap + 1);
                    return cap + 1;
                }
            }
            memo.set(key, subtotal);
            return subtotal;
        };

        total += visit(0, startCounts);
        if (total > cap) return cap + 1;
    }
    return total;
};

const shouldBuildCandidateSet = (filters, entryTotal) => {
    if (entryTotal < CANDIDATE_SET_MIN_INDEX_ROWS || !shouldTryCandidateSet(filters)) return false;
    const cap = Math.min(CANDIDATE_SET_LIMIT, entryTotal * 2);
    return estimateCandidateCount(filters, cap) <= cap;
};

const countsMatchFinal = (counts, filters) => {
    for (const id of SPELL_IDS) {
        const rule = getRule(filters, id);
        const actual = counts[id] || 0;
        if (actual < (rule.min || 0) || actual > maxValue(rule.max)) return false;
    }
    return true;
};

const buildCandidateSet = (filters) => {
    const candidates = new Set();
    const addCandidate = (index) => {
        candidates.add(index);
        if (candidates.size > CANDIDATE_SET_LIMIT) {
            throw new Error('too_many_candidates');
        }
    };

    for (const segment of COUNT_SEGMENTS) {
        const length = segment.prefix.length + segment.remLen;
        if (length < filters.minS || length > filters.maxS) continue;

        const counts = emptyCounts();
        if (segment.prefix === 'B') counts.BURST_8 = 1;
        if (!countsCanStillMatch(counts, filters, segment.remLen)) continue;

        const visit = (pos, offset) => {
            const remaining = segment.remLen - pos;
            if (!countsCanStillMatch(counts, filters, remaining)) return;
            if (pos === segment.remLen) {
                if (countsMatchFinal(counts, filters)) addCandidate(segment.start + offset);
                return;
            }

            for (let digit = 0; digit < CORE_CODES.length; digit++) {
                const spellId = CODE_TO_SPELL[CORE_CODES[digit]];
                counts[spellId] += 1;
                if (counts[spellId] <= maxValue(getRule(filters, spellId).max)) {
                    visit(pos + 1, offset * CORE_CODES.length + digit);
                }
                counts[spellId] -= 1;
            }
        };
        visit(0, 0);
    }

    return candidates;
};

const indexToCode = (index) => {
    const segment = COUNT_SEGMENTS.find(item => index >= item.start && index < item.end);
    if (!segment) return '';
    let offset = index - segment.start;
    const digits = new Array(segment.remLen);
    for (let pos = segment.remLen - 1; pos >= 0; pos--) {
        const digit = offset % CORE_CODES.length;
        digits[pos] = CORE_CODES[digit];
        offset = Math.floor(offset / CORE_CODES.length);
    }
    return segment.prefix + digits.join('');
};

const buildResultItemFromIndex = (count, index) => {
    const code = indexToCode(index);
    const parts = Array.from(code).map(ch => CODE_TO_SPELL[ch]);
    return {
        target: count,
        wand: parts.join(','),
        parts,
        length: parts.length
    };
};

const indexMatchesFilters = (index, filters) => {
    const code = indexToCode(index);
    if (!code || code.length < filters.minS || code.length > filters.maxS) return false;

    const counts = emptyCounts();
    for (const ch of code) {
        const spellId = CODE_TO_SPELL[ch];
        counts[spellId] += 1;
        if (counts[spellId] > maxValue(getRule(filters, spellId).max)) return false;
    }
    return countsMatchFinal(counts, filters);
};

const sampleItemMatchesFilters = (item, filters) => {
    if (item.length < filters.minS || item.length > filters.maxS) return false;
    const counts = emptyCounts();
    item.parts.forEach(part => counts[part] += 1);
    return countsMatchFinal(counts, filters);
};

const makeResult = (count, entry, results, matchTotal, mode, missing = false) => ({
    count,
    rawTotal: entry?.total || 0,
    indexedTotal: entry?.total || 0,
    fullTotal: entry?.total || 0,
    matchTotal,
    results,
    missing,
    mode
});

const fetchIndexByteStream = async (entry) => {
    const candidates = [];
    if (entry.compressed_file && self.DecompressionStream) {
        candidates.push({ file: entry.compressed_file, compressed: true });
    }
    candidates.push({ file: entry.file, compressed: false });

    for (const candidate of candidates) {
        const response = await fetch(`${FULL_HITS_DIR}/${candidate.file}`);
        if (!response.ok) continue;

        if (!candidate.compressed) {
            return {
                file: candidate.file,
                stream: response.body || null,
                arrayBuffer: () => response.arrayBuffer()
            };
        }

        const alreadyDecoded = response.headers.get('content-encoding') === 'gzip';
        if (alreadyDecoded) {
            return {
                file: candidate.file,
                stream: response.body || null,
                arrayBuffer: () => response.arrayBuffer()
            };
        }
        if (!response.body?.pipeThrough) continue;

        try {
            return {
                file: candidate.file,
                stream: response.body.pipeThrough(new DecompressionStream('gzip')),
                arrayBuffer: null
            };
        } catch (_error) {
            continue;
        }
    }

    return null;
};

const scanIndexStream = async (queryId, count, entry, filters, onPartial) => {
    const allPass = isDefaultAllPassFilter(filters);
    let candidateSet = null;
    if (!allPass && shouldBuildCandidateSet(filters, entry.total)) {
        try {
            candidateSet = buildCandidateSet(filters);
        } catch (error) {
            if (error.message !== 'too_many_candidates') throw error;
            candidateSet = null;
        }
    }

    const source = await fetchIndexByteStream(entry);
    if (!source) return null;

    const results = [];
    let previous = -1;
    let value = 0;
    let multiplier = 1;
    let decoded = 0;
    let matchTotal = 0;
    let partialSent = false;

    const handleIndex = (index) => {
        decoded += 1;
        const matches = allPass || (candidateSet ? candidateSet.has(index) : indexMatchesFilters(index, filters));
        if (!matches) return false;

        matchTotal += 1;
        if (results.length < RESULT_LIMIT) {
            results.push(buildResultItemFromIndex(count, index));
            if (results.length === RESULT_LIMIT && !partialSent) {
                partialSent = true;
                onPartial(makeResult(count, entry, results.slice(), null, 'full'));
                return allPass && entry.total > RESULT_LIMIT;
            }
        }
        return false;
    };

    const processBytes = (bytes) => {
        for (const byte of bytes) {
            value += (byte & 0x7F) * multiplier;
            if (byte & 0x80) {
                multiplier *= 128;
                continue;
            }

            previous += value + 1;
            value = 0;
            multiplier = 1;
            if (handleIndex(previous)) return true;
        }
        return false;
    };

    if (source.stream?.getReader) {
        const reader = source.stream.getReader();
        while (true) {
            if (activeQueryId !== queryId) {
                await reader.cancel();
                return null;
            }
            const { value: chunk, done } = await reader.read();
            if (done) break;
            if (processBytes(chunk)) {
                await reader.cancel();
                matchTotal = entry.total;
                break;
            }
        }
    } else if (source.arrayBuffer) {
        const bytes = new Uint8Array(await source.arrayBuffer());
        processBytes(bytes);
    } else {
        return null;
    }

    if (activeQueryId !== queryId) return null;
    if (value !== 0 || multiplier !== 1) {
        throw new Error(`Partial varint at end of ${source.file}`);
    }
    if (!allPass && decoded !== entry.total) {
        throw new Error(`Decoded ${decoded} rows for ${source.file}, expected ${entry.total}`);
    }
    if (allPass) matchTotal = entry.total;

    return makeResult(count, entry, results, matchTotal, 'full');
};

const loadSampleCountResults = async (count, filters, meta) => {
    const response = await fetch(`${DATA_DIR}/${count}.txt`);
    if (!response.ok) {
        return {
            count,
            rawTotal: 0,
            indexedTotal: meta.indexed || 0,
            fullTotal: meta.total || 0,
            matchTotal: 0,
            results: [],
            missing: true,
            mode: 'sample'
        };
    }

    const text = await response.text();
    const rawWands = text.trim().split('\n').filter(Boolean);
    const results = rawWands.map(wand => {
        const parts = wand.trim().split(',');
        return {
            target: count,
            wand: wand.trim(),
            parts,
            length: parts.length
        };
    }).filter(item => sampleItemMatchesFilters(item, filters)).sort((a, b) => a.length - b.length);

    return {
        count,
        rawTotal: rawWands.length,
        indexedTotal: rawWands.length,
        fullTotal: meta.total || rawWands.length,
        matchTotal: results.length,
        results,
        missing: false,
        mode: 'sample'
    };
};

const loadCountResults = async (queryId, count, filters, datasetManifest, fullHitManifest, onPartial) => {
    const key = String(count);
    const meta = datasetManifest?.counts?.[key] || { total: 0, indexed: 0 };
    const entry = fullHitManifest?.counts?.[key];
    if (entry) {
        const fullResult = await scanIndexStream(queryId, count, entry, filters, onPartial);
        if (fullResult) return fullResult;
        if (activeQueryId !== queryId) return null;
    }
    return loadSampleCountResults(count, filters, meta);
};

self.onmessage = async (event) => {
    const message = event.data;
    if (message.type !== 'query') return;

    const { queryId, counts, filters, datasetManifest, fullHitManifest } = message;
    activeQueryId = queryId;
    const partialResults = new Map();

    const postPartial = (result) => {
        if (activeQueryId !== queryId) return;
        partialResults.set(String(result.count), result);
        self.postMessage({
            type: 'partial',
            queryId,
            loaded: counts.map(count => partialResults.get(String(count))).filter(Boolean)
        });
    };

    try {
        for (const count of counts) {
            if (activeQueryId !== queryId) return;
            const result = await loadCountResults(
                queryId,
                count,
                filters,
                datasetManifest,
                fullHitManifest,
                postPartial
            );
            if (!result || activeQueryId !== queryId) return;
            partialResults.set(String(count), result);
            postPartial(result);
        }

        self.postMessage({
            type: 'complete',
            queryId,
            loaded: counts.map(count => partialResults.get(String(count))).filter(Boolean)
        });
    } catch (error) {
        if (activeQueryId !== queryId) return;
        self.postMessage({
            type: 'error',
            queryId,
            message: error.message || String(error)
        });
    }
};
