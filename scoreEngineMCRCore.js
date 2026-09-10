/**
 * scoreEngineMCRCore.js - MCR Master Module Orchestrator Gateway
 * Handles global variable mapping, situational modifiers, and structural
 * anti-duplication non-separation rule ledger filtration.
 */
Object.assign(ScoreEngine, {
  evaluateAllMCRRules(ctx, totalFlatTiles, solutions, breakdown) {
    let bestScore = 0;
    let bestBreakdown = [];
    const isSelfDraw = (ctx.winMethod === "self_draw" || ctx.winMethod === "self" || ctx.winMethod === "wall");
    
    // Extract clean unique suit tokens and honor subsets for global evaluation mapping
    let suitsInHand = new Set(totalFlatTiles.map(t => t.pool).filter(p => ["WAN", "TONG", "SUO"].includes(p)));
    let honorTiles = totalFlatTiles.filter(t => ["WIND", "DRAGON"].includes(t.pool));

    // ⭐ GLOBAL INTERCEPTOR FIX: Check Thirteen Orphans independently of standard solutions array
    if (totalFlatTiles.length === 14) {
      let uniqueOrphans = new Set(totalFlatTiles.map(t => `${t.pool}_${t.val}`));
      let hasThirteen = ["WAN_1", "WAN_9", "TONG_1", "TONG_9", "SUO_1", "SUO_9",
                         "WIND_1", "WIND_2", "WIND_3", "WIND_4",
                         "DRAGON_1", "DRAGON_2", "DRAGON_3"].every(k => uniqueOrphans.has(k));
      
      if (hasThirteen) {
        breakdown.push({ rule: "Thirteen Orphans (MCR-7)", pts: 88 });
        
        // Include global movement modifiers for limit hands too
        if (isSelfDraw) breakdown.push({ rule: "Self-Draw", pts: 1 });
        if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
        return; // 🌟 STOP EVERYTHING HERE! Hand successfully computed as 88+ points.
      }
    }

    // ⭐ GLOBAL INTERCEPTOR FIX B: THE KNITTED PATTERNS PIPELINE
    if (totalFlatTiles.length === 14) {
      let isKnittedEligible = true;
      let suitSequences = { WAN: new Set(), TONG: new Set(), SUO: new Set() };
      let uniqueHonors = new Set();
      let counts = {};

      totalFlatTiles.forEach(t => {
        let k = `${t.pool}_${t.val}`;
        counts[k] = (counts[k] || 0) + 1;
        if (["WIND", "DRAGON"].includes(t.pool)) {
          uniqueHonors.add(t.id);
        } else if (["WAN", "TONG", "SUO"].includes(t.pool)) {
          suitSequences[t.pool].add(t.val);
        }
      });

      // Check if there are duplicates among the non-honor components (Knitted cannot have standard duplicate suit tiles)
      let duplicatesInSuits = Object.keys(counts).some(k => !k.startsWith("WIND") && !k.startsWith("DRAGON") && counts[k] > 1);

      if (!duplicatesInSuits) {
        // Map the three valid modular configurations: [1,4,7], [2,5,8], and [3,6,9]
        let configA = [1, 4, 7]; let configB = [2, 5, 8]; let configC = [3, 6, 9];
        
        let matchKnittedStraight = false;
        let suitPools = ["WAN", "TONG", "SUO"];

        // Permutate combinations to see if each suit takes a completely different module
        let permutations = [
          { WAN: configA, TONG: configB, SUO: configC },
          { WAN: configA, TONG: configC, SUO: configB },
          { WAN: configB, TONG: configA, SUO: configC },
          { WAN: configB, TONG: configC, SUO: configA },
          { WAN: configC, TONG: configA, SUO: configB },
          { WAN: configC, TONG: configB, SUO: configA }
        ];

        let validStraightPerm = null;
        permutations.forEach(perm => {
          let wanOk = perm.WAN.every(v => suitSequences.WAN.has(v));
          let tongOk = perm.TONG.every(v => suitSequences.TONG.has(v));
          let suoOk = perm.SUO.every(v => suitSequences.SUO.has(v));
          if (wanOk && tongOk && suoOk) {
            matchKnittedStraight = true;
            validStraightPerm = perm;
          }
        });

        // 1. KNITTED STRAIGHT (MCR-35 - 12 Points)
        // Hand contains all 9 straight tiles across 3 knitted sets + a 3-tile meld and a pair
        // Since we are intercepting at the root, we confirm total unique suit tiles is exactly 9
        let totalSuitTilesCount = suitSequences.WAN.size + suitSequences.TONG.size + suitSequences.SUO.size;
        if (matchKnittedStraight && totalSuitTilesCount === 9) {
          breakdown.push({ rule: "Knitted Straight (MCR-35)", pts: 12 });
          if (isSelfDraw) breakdown.push({ rule: "Self-Draw", pts: 1 });
          if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
          return; // Terminate execution early!
        }

        // 2. HONORS AND KNITTED TILES PATTERNS (14 unique singles, no sets)
        let totalUniqueSinglesCount = totalSuitTilesCount + uniqueHonors.size;
        if (totalUniqueSinglesCount === 14) {
          
          // Verify that suit components do not cross-contaminate modular rows internally
          let checkValidKnittedGrouping = (set) => {
            let hasA = configA.some(v => set.has(v));
            let hasB = configB.some(v => set.has(v));
            let hasC = configC.some(v => set.has(v));
            // A single suit can only belong to exactly ONE modular line group
            return (hasA ? 1 : 0) + (hasB ? 1 : 0) + (hasC ? 1 : 0) <= 1;
          };

          if (checkValidKnittedGrouping(suitSequences.WAN) && checkValidKnittedGrouping(suitSequences.TONG) && checkValidKnittedGrouping(suitSequences.SUO)) {
            
            // GREATER HONORS AND KNITTED TILES (MCR-12 - 24 Points): All 7 unique honors are present
            if (uniqueHonors.size === 7) {
              breakdown.push({ rule: "Greater Honors & Knitted Tiles (MCR-12)", pts: 24 });
            } 
            // LESSER HONORS AND KNITTED TILES (MCR-34 - 12 Points): Fewer than 7 honors, completely irregular
            else if (uniqueHonors.size > 0) {
              breakdown.push({ rule: "Lesser Honors & Knitted Tiles (MCR-34)", pts: 12 });
            }

            if (isSelfDraw) breakdown.push({ rule: "Self-Draw", pts: 1 });
            if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
            return; // Terminate execution early!
          }
        }
      }
    }

    // ⭐ GLOBAL INTERCEPTOR FIX C: SEVEN PAIRS & SEVEN SHIFTED PAIRS PIPELINE
    if (totalFlatTiles.length === 14) {
      let pairCounts = {};
      totalFlatTiles.forEach(t => { let k = `${t.pool}_${t.val}`; pairCounts[k] = (pairCounts[k] || 0) + 1; });
      
      let totalPairs = Object.values(pairCounts).filter(c => c === 2).length;
      let totalQuads = Object.values(pairCounts).filter(c => c === 4).length;

      // If the hand is physically composed entirely of pairs
      if (totalPairs + (totalQuads * 2) === 7) {
        let uniqueTilesInPairs = totalFlatTiles.filter((t, i, arr) => arr.findIndex(x => x.pool === t.pool && x.val === t.val) === i);
        
        // Check for SEVEN SHIFTED PAIRS (連七對 - MCR-4 - 88 Points)
        // Must be in ONE suit, and values must be completely consecutive (e.g., 1, 2, 3, 4, 5, 6, 7)
        let isSingleSuit = uniqueTilesInPairs.every(t => t.pool === uniqueTilesInPairs[0].pool && !["WIND", "DRAGON"].includes(t.pool));
        if (isSingleSuit && uniqueTilesInPairs.length === 7) {
          let sortedVals = uniqueTilesInPairs.map(t => t.val).sort((a, b) => a - b);
          let isConsecutive = sortedVals.every((v, idx) => idx === 0 || v - sortedVals[idx - 1] === 1);
          
          if (isConsecutive) {
            breakdown.push({ rule: "Seven Shifted Pairs (MCR-4)", pts: 88 });
            if (isSelfDraw) breakdown.push({ rule: "Self-Draw", pts: 1 });
            if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
            return; // Terminate execution early!
          }
        }

        // Standard SEVEN PAIRS fallback (七對子 - MCR-19 - 24 Points)
        breakdown.push({ rule: "Seven Pairs (MCR-19)", pts: 24 });
        if (isSelfDraw) breakdown.push({ rule: "Self-Draw", pts: 1 });
        if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
        return; // Terminate execution early!
      }
    }

    // 1. Loop Through Standard Solutions to Find the Highest Combinatorics Score
    solutions.forEach(sol => {
      let localBreakdown = [];
      
      // A. Intercept Remaining High-Tier Limit Hands First (Pass dummy or standard structures)
      let hitLimit = this.checkMCRLimitHands(ctx, totalFlatTiles, sol, suitsInHand, honorTiles, localBreakdown);
      
      // B. If no ultimate limit hit, execute standard geometric patterns evaluation
      if (!hitLimit) {
        this.evaluateMCRStandardPatterns(ctx, totalFlatTiles, sol, suitsInHand, honorTiles, localBreakdown);
      }
      
      // --- C. ENHANCED ENVIRONMENTAL & WINNING TRACKERS INTERCEPTOR ---
      let hasOpenMelds = ctx.sets.some(s => s.concealed === false);
      let isFullyConcealedHand = !hasOpenMelds;

      // 1. Concealed vs. Fully Concealed Hand Rules
      if (isFullyConcealedHand) {
        if (isSelfDraw) {
          // Fully Concealed Hand is 4 points and officially absorbs/replaces the 1 point for Self-Draw
          localBreakdown.push({ rule: "Fully Concealed Hand (MCR-61)", pts: 4 });
        } else {
          // No open melds, but won off someone's discard
          localBreakdown.push({ rule: "Concealed Hand (MCR-57)", pts: 2 });
        }
      } else {
        // Fallback base modifier if the player has open sets but draws the winning tile themselves
        if (isSelfDraw) localBreakdown.push({ rule: "Self-Draw", pts: 1 });
      }

      // 2. Flower Tiles Tally Counters (1 Point per flower)
      if (ctx.flowerCount > 0) {
        localBreakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
      }

      // 3. Special Strategic Win Modifiers (Linked straight to your sidebar UI checkboxes)
      if (ctx.lastTile) {
        localBreakdown.push({ rule: "Win on Last Tile (MCR-27)", pts: 8 });
      }
      if (ctx.replacement) {
        localBreakdown.push({ rule: "Out with Replacement Tile (MCR-28)", pts: 8 });
      }
      if (ctx.robbing) {
        localBreakdown.push({ rule: "Robbing the Kong (MCR-30)", pts: 8 });
      }
      
      // D. Apply MCR Non-Separation / Non-Repeat Verification Filtering
      let filteredBreakdown = this.filterMCRDoubleCounting(localBreakdown);
      let sum = filteredBreakdown.reduce((s, item) => s + item.pts, 0);
      
      // Retain the split arrangement strategy that yields maximum points
      if (sum > bestScore || bestBreakdown.length === 0) {
        bestScore = sum;
        bestBreakdown = filteredBreakdown;
      }
    });

    // 2. Print final output ledger entries directly to core execution arrays
    bestBreakdown.forEach(item => breakdown.push(item));
  },

  filterMCRDoubleCounting(combinations) {
    let rules = combinations.map(c => c.rule);
    let filtered = combinations.map(c => ({ ...c }));
   
    // A Full Flush uses exactly 1 suit, meaning it natively voids the other 2 suits. 
    // It is illegal to stack "One Voided Suit" points on top of it.
    if (rules.includes("Full Flush")) {
      filtered = filtered.filter(c => c.rule !== "One Voided Suit (MCR-52)");
    }
    // All Terminals already counts the terminal layout traits, clear the base sub-rules
    if (rules.includes("All Terminals")) {
      filtered = filtered.filter(c => !c.rule.includes("Terminal Pung"));
    }
    // High tier special configurations automatically absorb base wait modifiers
    if (rules.includes("Thirteen Orphans (MCR-7)") || rules.includes("Seven Pairs (MCR-19)") || rules.includes("Seven Shifted Pairs (MCR-4)")) {
      filtered = filtered.filter(c => c.rule !== "Single Wait (MCR-80)");
    }
    // All Pungs hands can trigger Single Wait, but cannot claim Closed or Edge waits
    if (rules.includes("All Pungs")) {
      filtered = filtered.filter(c => c.rule !== "Closed Wait (MCR-79)" && c.rule !== "Edge Wait (MCR-81)");
    }
    // A pure 1-9 run automatically encompasses 6-tile continuous traits, wipe the sub-rules
    if (rules.includes("Pure Straight (MCR-25)")) {
      filtered = filtered.filter(c => c.rule !== "Short Straight (MCR-53)" && c.rule !== "Two Terminal Chows");
    }
    if (rules.includes("Four Shifted Chows (MCR-24)")) {
      filtered = filtered.filter(c => c.rule !== "Short Straight (MCR-53)");
    }
    // Pure Shifted Pungs natively holds structural traits of basic Double Pung and All Pungs overrides
    if (rules.includes("Pure Shifted Pungs (MCR-49)")) {
      filtered = filtered.filter(c => c.rule !== "Double Pung" && c.rule !== "All Pungs");
    }
    // Big Three Winds absorbs standard single Wind Pung modifiers to prevent point inflation
    if (rules.includes("Big Three Winds (MCR-51)")) {
      filtered = filtered.filter(c => !c.rule.includes("Prevalent Wind") && !c.rule.includes("Seat Wind"));
    }
    // A triple combination inherently holds two identical chows, so wipe the base double point
    if (rules.includes("Triple Identical Chows (MCR-23)")) {
      filtered = filtered.filter(c => c.rule !== "Two Identical Chows (MCR-71)" && c.rule !== "All Chows");
    }
    if (rules.includes("Three Suited Twin Chows (MCR-41)")) {
      filtered = filtered.filter(c => c.rule !== "Two Suited Twin Chows (MCR-73)" && c.rule !== "All Chows");
    }
    // Pure Terminal Chows are made of pairs of matching chows (123x2 and 789x2), so clear low-level duplicates
    if (rules.includes("Pure Terminal Chows (MCR-21)")) {
      filtered = filtered.filter(c => c.rule !== "Two Identical Chows (MCR-71)");
    }
    if (rules.includes("Four Shifted Chows (MCR-24)")) {
      filtered = filtered.filter(c => c.rule !== "Three Shifted Chows (MCR-26)" && c.rule !== "All Chows");
    }
     // A Pure Straight (1-9) naturally contains a 3-step shifted run (1, 4, 7), so filter out the lower duplicate
    if (rules.includes("Pure Straight (MCR-25)")) {
      filtered = filtered.filter(c => c.rule !== "Three Shifted Chows (MCR-26)");
    }
    // Thirteen Orphans is mathematically always fully concealed; separate points are illegal
    if (rules.includes("Thirteen Orphans (MCR-7)")) {
      filtered = filtered.filter(c => c.rule !== "Fully Concealed Hand (MCR-61)" && c.rule !== "Concealed Hand (MCR-57)");
    }
   // Special pair combinations are always concealed by design
    if (rules.includes("Seven Pairs (MCR-19)") || rules.includes("Seven Shifted Pairs (MCR-4)")) {
      filtered = filtered.filter(c => c.rule !== "Fully Concealed Hand (MCR-61)" && c.rule !== "Concealed Hand (MCR-57)");
    }
    // Prevents stacking redundant base points on top of the 64-pt payout
    if (rules.includes("Four Concealed Pungs (MCR-15)")) {
      filtered = filtered.filter(c => c.rule !== "All Pungs");
    }
    // Prevent stacking lower sub-rules on top of the 32-point payout balance
    if (rules.includes("Mixed Terminals (MCR-29)")) {
      filtered = filtered.filter(c => c.rule !== "All Pungs" && c.rule !== "Outside Hand (MCR-60)");
    }
    // Apply Official MCR Non-Repeat Separation Rules Filters
    if (rules.includes("Big Three Dragons")) {
      filtered = filtered.filter(c => !c.rule.includes("Dragon Pung"));
    }
    if (rules.includes("All Terminals")) {
      filtered = filtered.filter(c => c.rule !== "All Pungs");
    }
    if (rules.includes("Full Flush")) {
      filtered = filtered.filter(c => c.rule !== "Half Flush");
    }
    if (rules.includes("Big Four Winds")) {
      filtered = filtered.filter(c => c.rule !== "All Pungs");
    }
    // Official tournament duplication safety overrides
    if (rules.includes("Pure Terminal Chows (MCR-21)")) {
      filtered = filtered.filter(c => c.rule !== "Full Flush (MCR-22)" && c.rule !== "All Chows (MCR-65)" && c.rule !== "Two Terminal Chows");
    }
    if (rules.includes("Mixed Triple Pung (MCR-40)")) {
      filtered = filtered.filter(c => c.rule !== "Double Pung");
    }
    return filtered;
  }
});
