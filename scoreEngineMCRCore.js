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
        if (isSelfDraw) breakdown.push({ rule: "Self-Draw (MCR-80)", pts: 1 });
        if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
        return; 
      }
    }
 // ⭐ GLOBAL INTERCEPTOR FIX B: THE KNITTED PATTERNS PIPELINE
    let knittedTilesCheckArray = [...totalFlatTiles];
    if (knittedTilesCheckArray.length === 14) {
      let suitSequences = { WAN: new Set(), TONG: new Set(), SUO: new Set() };
      let uniqueHonors = new Set();
      let counts = {};
      
      knittedTilesCheckArray.forEach(t => {
        let k = `${t.pool}_${t.val}`;
        counts[k] = (counts[k] || 0) + 1;
        if (["WIND", "DRAGON"].includes(t.pool)) {
          uniqueHonors.add(t.id);
        } else if (["WAN", "TONG", "SUO"].includes(t.pool)) {
          suitSequences[t.pool].add(parseInt(t.val, 10));
        }
      });

      let duplicatesInSuits = Object.keys(counts).some(k => !k.startsWith("WIND") && !k.startsWith("DRAGON") && counts[k] > 1);
      
      if (!duplicatesInSuits) {
        let configA =[1,4,7]; 
        let configB =[2,5,8]; 
        let configC =[3,6,9];
        
        let getTrackAssignment = (set) => {
          if (set.size === 0) return 0;
          let vals = [...set];
          if (vals.every(v => configA.includes(v))) return 1;
          if (vals.every(v => configB.includes(v))) return 2;
          if (vals.every(v => configC.includes(v))) return 3;
          return -1; // Invalid mixed track
        };

        let trackWan = getTrackAssignment(suitSequences.WAN);
        let trackTong = getTrackAssignment(suitSequences.TONG);
        let trackSuo = getTrackAssignment(suitSequences.SUO);

        // Ensure every active suit has a clean track, and no two suits share the same track!
        let activeTracks = [trackWan, trackTong, trackSuo].filter(t => t > 0);
        let totalUniqueTracks = new Set(activeTracks).size;

        if (trackWan !== -1 && trackTong !== -1 && trackSuo !== -1 && activeTracks.length === totalUniqueTracks) {
          let totalSuitTilesCount = suitSequences.WAN.size + suitSequences.TONG.size + suitSequences.SUO.size;
          let totalUniqueSinglesCount = totalSuitTilesCount + uniqueHonors.size;

          if (totalUniqueSinglesCount === 14) {
            if (uniqueHonors.size === 7) {
              breakdown.push({ rule: "Greater Honors & Knitted Tiles (MCR-12)", pts: 24 });
            } else if (uniqueHonors.size > 0) {
              breakdown.push({ rule: "Lesser Honors & Knitted Tiles (MCR-34)", pts: 12 });
            }
            if (ctx.flowerCount > 0) breakdown.push({ rule: `Flower Tiles (x${ctx.flowerCount})`, pts: ctx.flowerCount });
            return; 
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
        localBreakdown.push({ rule: "Last Tile Draw (MCR-44)", pts: 8 }); // Picked from wall
      }
      // 🀄 FIX B: EVALUATE LAST TILE CLAIM PAYOUT
      if (ctx.lastKind) {
        localBreakdown.push({ rule: "Last Tile Claim (MCR-45)", pts: 4 }); // Claimed off discard
      }
      if (ctx.replacement) {
        localBreakdown.push({ rule: "Out with Replacement Tile (MCR-46)", pts: 8 });
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
    if (rules.some(r => r.includes("Full Flush"))) {
      filtered = filtered.filter(c => 
        !c.rule.includes("One Voided Suit") && 
        !c.rule.includes("No Honors")
      );
    }
    if (rules.some(r => r.includes("All Terminals"))) {
      filtered = filtered.filter(c => !c.rule.includes("Terminal Pung"));
    }
    if (rules.some(r => r.includes("Thirteen Orphans") || r.includes("Seven Pairs") || r.includes("Seven Shifted Pairs"))) {
      filtered = filtered.filter(c => !c.rule.includes("Single Wait"));
    }
    if (rules.some(r => r.includes("All Pungs"))) {
      filtered = filtered.filter(c => !c.rule.includes("Closed Wait") && !c.rule.includes("Edge Wait"));
    }
    
    // ==========================================================================
    // 🀄 FIX: AIRTIGHT STRAIGHT EXCLUSIONS (PREVENTS SUB-STRAIGHT POINT LEAKS)
    // ==========================================================================
    let hasPremiumStraight = rules.some(r => 
      r.includes("Pure Straight") || 
      r.includes("Mixed Straight") || 
      r.includes("Four Shifted Chows") || 
      r.includes("Mixed Shifted Chows") || 
      r.includes("Three Shifted Chows")
    );

    if (hasPremiumStraight) {
      filtered = filtered.filter(c => 
        !c.rule.includes("Short Straight") && 
        !c.rule.includes("Two Suit Short Straight") && 
        !c.rule.includes("Two Terminal Chows")
      );
    }

    if (rules.some(r => r.includes("Pure Shifted Pungs"))) {
      filtered = filtered.filter(c => !c.rule.includes("Double Pung") && !c.rule.includes("All Pungs"));
    }
    if (rules.some(r => r.includes("Pure Shifted Pungs"))) {
      filtered = filtered.filter(c => !c.rule.includes("Double Pung") && !c.rule.includes("All Pungs"));
    }
    if (rules.some(r => r.includes("Big Three Winds"))) {
      filtered = filtered.filter(c => !c.rule.includes("Prevalent Wind") && !c.rule.includes("Seat Wind"));
    }
    if (rules.some(r => r.includes("Triple Identical Chows"))) {
      filtered = filtered.filter(c => !c.rule.includes("Two Identical Chows") && !c.rule.includes("All Chows"));
    }
    if (rules.some(r => r.includes("Three Suited Twin Chows"))) {
      filtered = filtered.filter(c => !c.rule.includes("Two Suited Twin Chows") && !c.rule.includes("All Chows"));
    }
    if (rules.some(r => r.includes("Pure Terminal Chows"))) {
      filtered = filtered.filter(c => !c.rule.includes("Two Identical Chows") && !c.rule.includes("Full Flush") && !c.rule.includes("All Chows") && !c.rule.includes("Two Terminal Chows"));
    }
    if (rules.some(r => r.includes("Thirteen Orphans"))) {
      filtered = filtered.filter(c => !c.rule.includes("Fully Concealed Hand") && !c.rule.includes("Concealed Hand"));
    }
    if (rules.some(r => r.includes("Seven Pairs") || r.includes("Seven Shifted Pairs"))) {
      filtered = filtered.filter(c => !c.rule.includes("Fully Concealed Hand") && !c.rule.includes("Concealed Hand"));
    }
    if (rules.some(r => r.includes("Four Concealed Pungs"))) {
      filtered = filtered.filter(c => !c.rule.includes("All Pungs"));
    }
    if (rules.some(r => r.includes("Mixed Terminals"))) {
      filtered = filtered.filter(c => !c.rule.includes("All Pungs") && !c.rule.includes("Outside Hand"));
    }
    if (rules.some(r => r.includes("Big Three Dragons"))) {
      filtered = filtered.filter(c => !c.rule.includes("Dragon Pung"));
    }
    if (rules.some(r => r.includes("All Terminals"))) {
      filtered = filtered.filter(c => !c.rule.includes("All Pungs"));
    }
    if (rules.some(r => r.includes("Mixed Triple Pung"))) {
      filtered = filtered.filter(c => !c.rule.includes("Double Pung"));
    }
    // Add inside filterMCRDoubleCounting just for extra safety:
    if (rules.some(r => r.includes("All Simples"))) {
      filtered = filtered.filter(c => !c.rule.includes("No Honors"));
    }
    if (rules.some(r => r.includes("All Chows"))) {
      filtered = filtered.filter(c => !c.rule.includes("No Honors"));
    }
    // 🀄 FIX: BULLETPROOF ALL TERMINALS & HONORS OVERRIDE PROTECTION
    // Natively strips out lower-tier triplets and geometric extensions to prevent points inflation!
    if (rules.some(r => r.includes("All Terminals & Honors"))) {
      filtered = filtered.filter(c => 
        !c.rule.includes("All Pungs") && 
        !c.rule.includes("Outside Hand") && 
        !c.rule.includes("Pung of Terminals or Honors")
      );
    }
        if (rules.some(r => r.includes("Reversible Tiles"))) {
      filtered = filtered.filter(c => !c.rule.includes("One Voided Suit"));
    }

    return filtered;
  }
});
