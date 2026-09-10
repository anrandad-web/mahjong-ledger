/**
 * scoreEngineMCRLimit.js - MCR High-Tier Limit Hands Registry Detector
 * Calculates combinations ranging from 32 to 88 points.
 */
Object.assign(ScoreEngine, {
    checkMCRLimitHands(ctx, flatTiles, sol, suitsInHand, honorTiles, localBreakdown) {
        let pungs = sol.melds.filter(m => m.type === "pung" || m.type === "kong");
        let kongs = sol.melds.filter(m => m.type === "kong");
        let pairPool = sol.pair ? sol.pair.pool : "";

        // [PATTERN 1] THIRTEEN ORPHANS (十三幺 - 88 Points)
        if (sol.isSpecial && flatTiles.length === 14) {
            let uniqueOrphans = new Set(flatTiles.map(t => `${t.pool}_${t.val}`));
            let hasThirteen = ["WAN_1", "WAN_9", "TONG_1", "TONG_9", "SUO_1", "SUO_9",
                               "WIND_1", "WIND_2", "WIND_3", "WIND_4", 
                               "DRAGON_1", "DRAGON_2", "DRAGON_3"].every(k => uniqueOrphans.has(k));
            if (hasThirteen) {
                localBreakdown.push({ rule: "Thirteen Orphans", pts: 88 });
                return true;
            }
        }

        // Extract internal honor sets
        let dragonPungIds = new Set();
        let windPungIds = new Set();
        pungs.forEach(p => {
            let rep = p.tiles && p.tiles.length > 0 ? p.tiles[0] : null;
            if (!rep) return;
            if (rep.pool === "DRAGON") dragonPungIds.add(rep.id);
            if (rep.pool === "WIND") windPungIds.add(rep.id);
        });

        // [PATTERN 2] BIG FOUR WINDS (大四喜 - 88 Points)
        if (windPungIds.size === 4) {
            localBreakdown.push({ rule: "Big Four Winds", pts: 88 });
            return true;
        }
        // [PATTERN 3] BIG THREE DRAGONS (大三元 - 88 Points)
        if (dragonPungIds.size === 3) {
            localBreakdown.push({ rule: "Big Three Dragons", pts: 88 });
            return true;
        }

        // [PATTERN 4] NINE GATES (九蓮寶燈 - 88 Points)
        if (suitsInHand.size === 1 && honorTiles.length === 0 && !sol.isSpecial) {
            let valueCounts = {};
            for (let i = 1; i <= 9; i++) valueCounts[i] = 0;
            flatTiles.forEach(t => { valueCounts[t.val] = (valueCounts[t.val] || 0) + 1; });
            if (valueCounts[1] >= 3 && valueCounts[9] >= 3 && [2,3,4,5,6,7,8].every(v => valueCounts[v] >= 1)) {
                localBreakdown.push({ rule: "Nine Gates", pts: 88 });
                return true;
            }
        }

        // ⭐ FIXED ALL GREEN (绿一色 - MCR-10 - 88 Points)
        // Triggers when every single tile in the hand is strictly a 2, 3, 4, 6, or 8 of Suo (Bamboos), 
        // or a Green Dragon. No other tiles allowed!
        let allowedGreenIds = ["T_SUO_2", "T_SUO_3", "T_SUO_4", "T_SUO_6", "T_SUO_8", "T_DRG_G"];
        let isAllGreen = flatTiles.every(t => allowedGreenIds.includes(t.id));
            if (isAllGreen) {
                localBreakdown.push({ rule: "All Green", pts: 88 });
                return true; // Instantly intercepts the pipeline and blocks standard evaluation!
            }

        // [PATTERN 5] LITTLE FOUR WINDS (小四喜 - 64 Points)
        if (windPungIds.size === 3 && pairPool === "WIND") {
            localBreakdown.push({ rule: "Little Four Winds", pts: 64 });
            return true;
        }
        // [PATTERN 6] LITTLE THREE DRAGONS (小三元 - 64 Points)
        if (dragonPungIds.size === 2 && pairPool === "DRAGON") {
            localBreakdown.push({ rule: "Little Three Dragons", pts: 64 });
            return true;
        }
        // [PATTERN 7] ALL TERMINALS (清么九 - 64 Points)
        let allTerminals = flatTiles.every(t => (t.val === 1 || t.val === 9) && !["WIND", "DRAGON"].includes(t.pool));
        if (allTerminals && pungs.length === 4) {
            localBreakdown.push({ rule: "All Terminals", pts: 64 });
            return true;
        }

        // [PATTERN 8] FOUR PURE KONGS (四剛 - 64 Points)
        if (kongs.length === 4) {
            localBreakdown.push({ rule: "Four Pure Kongs", pts: 64 });
            return true;
        }
        // [PATTERN 9] THREE KONGS (三剛 - 32 Points)
        if (kongs.length === 3) {
            localBreakdown.push({ rule: "Three Kongs", pts: 32 });
            return true;
        }

        return false; // No limit hands matched; fall back to standard scoring
    }
});
