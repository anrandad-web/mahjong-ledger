/**
 * scoreEngineHKStandard.js - Standard Combinatorics Patterns Scoring Registry
 */
Object.assign(ScoreEngine, {
  evaluateHKStandardPatterns(ctx, flatTiles, sol, suitsInHand, honorTiles) {
    let localBreakdown = [];

    // [PATTERN 3] SEVEN PAIRS (七對子)
    if (sol.isSpecial && sol.type === "SEVEN_PAIRS") {
      localBreakdown.push({ rule: "Seven Pairs", pts: 4 });
      return localBreakdown; // Terminate early as Seven Pairs cannot hold standard melds
    }

    if (!sol.isSpecial && sol.type === "STANDARD") {
      let chows = sol.melds.filter(m => m.type === "chow");
      let pungs = sol.melds.filter(m => m.type === "pung" || m.type === "kong");
      let pairTilePool = sol.pair ? sol.pair.pool : "";

      // [PATTERN 4] ALL CHOWS / COMMON HAND (平胡)
      if (chows.length === 4 && pairTilePool !== "WIND" && pairTilePool !== "DRAGON") {
        localBreakdown.push({ rule: "All Chows (Common Hand)", pts: 1 });
      }

      // [PATTERN 5] ALL TRIPLETS (對對胡)
      if (pungs.length === 4) {
        // [PATTERN 6] ALL TERMINALS (清么九 - LIMIT)
        let allTerminals = flatTiles.every(t => (t.val === 1 || t.val === 9) && !["WIND", "DRAGON"].includes(t.pool));
        if (allTerminals) {
          localBreakdown.push({ rule: "All Terminals (Limit Hand)", pts: 10 });
        } else {
          localBreakdown.push({ rule: "All Triplets", pts: 3 });
        }
      }

      // Track individual Pung IDs for honor combinations
      let dragonPungIds = new Set();
      let windPungIds = new Set();

      pungs.forEach(p => {
        let rep = p.tiles && p.tiles.length > 0 ? p.tiles[0] : null;
        if (!rep) return;

        // [PATTERNS 7, 8, 9] INDIVIDUAL DRAGON VALUED TRIPLETS (箭刻)
        if (rep.pool === "DRAGON") {
          dragonPungIds.add(rep.id);
          let dragonName = rep.id === "T_DRG_R" ? "Red" : rep.id === "T_DRG_G" ? "Green" : "White";
          localBreakdown.push({ rule: `Dragon Triplet (${dragonName})`, pts: 1 });
        }

        // [PATTERNS 10, 11] SEAT WIND & PREVALENT ROUND WIND TRIPLETS (風刻)
        if (rep.pool === "WIND") {
          windPungIds.add(rep.id);
          if (rep.id === "T_WND_E" && ctx.seatWind === 1) localBreakdown.push({ rule: "Own Seat Wind (East)", pts: 1 });
          if (rep.id === "T_WND_S" && ctx.seatWind === 2) localBreakdown.push({ rule: "Own Seat Wind (South)", pts: 1 });
          if (rep.id === "T_WND_W" && ctx.seatWind === 3) localBreakdown.push({ rule: "Own Seat Wind (West)", pts: 1 });
          if (rep.id === "T_WND_N" && ctx.seatWind === 4) localBreakdown.push({ rule: "Own Seat Wind (North)", pts: 1 });

          if (rep.id === "T_WND_E" && ctx.roundWind === 1) localBreakdown.push({ rule: "Prevalent Round Wind (East)", pts: 1 });
          if (rep.id === "T_WND_S" && ctx.roundWind === 2) localBreakdown.push({ rule: "Prevalent Round Wind (South)", pts: 1 });
          if (rep.id === "T_WND_W" && ctx.roundWind === 3) localBreakdown.push({ rule: "Prevalent Round Wind (West)", pts: 1 });
          if (rep.id === "T_WND_N" && ctx.roundWind === 4) localBreakdown.push({ rule: "Prevalent Round Wind (North)", pts: 1 });
        }
      });

      // HIGHER-TIER GROUP HONOR CONFIGURATIONS
      // [PATTERN 12] GREAT THREE DRAGONS (大三元) & [PATTERN 13] SMALL THREE DRAGONS (小三元)
      if (dragonPungIds.size === 3) {
        localBreakdown = localBreakdown.filter(item => !item.rule.includes("Dragon Triplet"));
        localBreakdown.push({ rule: "Great Three Dragons", pts: 8 });
      } else if (dragonPungIds.size === 2 && sol.pair && sol.pair.pool === "DRAGON") {
        localBreakdown = localBreakdown.filter(item => !item.rule.includes("Dragon Triplet"));
        localBreakdown.push({ rule: "Small Three Dragons", pts: 5 });
      }

      // [PATTERN 14] GREAT FOUR WINDS (大四喜 - LIMIT) & [PATTERN 15] SMALL FOUR WINDS (小四喜)
      if (windPungIds.size === 4) {
        localBreakdown = localBreakdown.filter(item => !item.rule.includes("Wind"));
        localBreakdown.push({ rule: "Great Four Winds (Limit Hand)", pts: 10 });
      } else if (windPungIds.size === 3 && sol.pair && sol.pair.pool === "WIND") {
        localBreakdown = localBreakdown.filter(item => !item.rule.includes("Wind"));
        localBreakdown.push({ rule: "Small Four Winds", pts: 8 });
      }
    }

    // FLUSH CONFIGURATIONS AND SUIT EXTRACTORS
    if (!localBreakdown.some(item => item.rule.includes("All Terminals"))) {
      // [PATTERN 16] MIXED ONE SUIT / HALF FLUSH (混一色)
      if (suitsInHand.size === 1 && honorTiles.length > 0) {
        localBreakdown.push({ rule: "Mixed One Suit", pts: 3 });
      } 
      // [PATTERN 17] PURE ONE SUIT / FULL FLUSH (清一色)
      else if (suitsInHand.size === 1 && honorTiles.length === 0) {
        localBreakdown.push({ rule: "Pure One Suit", pts: 6 });
      } 
      // ALL HONORS (字一色 - LIMIT)
      else if (suitsInHand.size === 0 && honorTiles.length > 0) {
        if (!localBreakdown.some(item => item.rule.includes("Four Winds"))) {
          localBreakdown.push({ rule: "All Honors (Limit Hand)", pts: 10 });
        }
      }
    }

    return localBreakdown;
  }
});
