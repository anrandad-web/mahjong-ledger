/**
 * scoreEngineMCRStandard.js - Standard Combinatorics Patterns Scoring Registry
 * Calculates standard geometric combinations ranging from 1 to 24 points.
 */
Object.assign(ScoreEngine, {
  evaluateMCRStandardPatterns(ctx, flatTiles, sol, suitsInHand, honorTiles, localBreakdown) {
    let chows = sol.melds.filter(m => m.type === "chow");
    let pungs = sol.melds.filter(m => m.type === "pung" || m.type === "kong");
    let kongs = sol.melds.filter(m => m.type === "kong");
    let pairPool = sol.pair ? sol.pair.pool : "";

    // --- SECTION A: MID-TIER FLUSH PATTERNS ---
    if (suitsInHand.size === 1 && honorTiles.length === 0) {
      localBreakdown.push({ rule: "Full Flush", pts: 24 });
    } else if (suitsInHand.size === 1 && honorTiles.length > 0) {
      localBreakdown.push({ rule: "Half Flush", pts: 6 });
    }

    // All Types (6 Points)
    let uniquePools = new Set(flatTiles.map(t => t.pool));
    if (uniquePools.has("WAN") && uniquePools.has("TONG") && uniquePools.has("SUO") && uniquePools.has("WIND") && uniquePools.has("DRAGON")) {
      localBreakdown.push({ rule: "All Types", pts: 6 });
    }

    // REVERSIBLE TILES (推不倒 - MCR-42 - 8 Points)
    let allowedReversibleKeys = [
      "TONG_1", "TONG_2", "TONG_3", "TONG_4", "TONG_5", "TONG_8", "TONG_9",
      "SUO_2", "SUO_4", "SUO_5", "SUO_6", "SUO_8", "SUO_9", "DRAGON_3"
    ];
    let isReversible = flatTiles.every(t => {
      let uniqueKey = t.pool === "DRAGON" ? `DRAGON_${t.val}` : `${t.pool}_${t.val}`;
      return allowedReversibleKeys.includes(uniqueKey);
    });
    if (isReversible) {
      localBreakdown.push({ rule: "Reversible Tiles (MCR-42)", pts: 8 });
    }

    // PURE TERMINAL CHOWS (全帶五 - MCR-21 - 24 Points)
    if (suitsInHand.size === 1 && honorTiles.length === 0 && chows.length === 4) {
      let targetPool = flatTiles.find(t => ["WAN", "TONG", "SUO"].includes(t.pool))?.pool || "";
      let hasPairOfFives = sol.pair && sol.pair.pool === targetPool && sol.pair.val === 5;
      
      // Process chowMetadata helper locally for Section A step rules
      let tempMetadata = chows.map(c => {
        let values = c.tiles.map(t => parseInt(t.val, 10) || 0);
        return { startVal: Math.min(...values), pool: (c.tiles && c.tiles[0]) ? (c.tiles[0].pool || "") : "" };
      });

      let count123 = tempMetadata.filter(c => c.pool === targetPool && c.startVal === 1).length;
      let count789 = tempMetadata.filter(c => c.pool === targetPool && c.startVal === 7).length;
      
      if (hasPairOfFives && count123 === 2 && count789 === 2) {
        localBreakdown.push({ rule: "Pure Terminal Chows (MCR-21)", pts: 24 });
      }
    }
    // --- SECTION B: PUNGS & KONG CONFIGURATIONS ---
    if (pungs.length === 4) {
      localBreakdown.push({ rule: "All Pungs", pts: 6 });
    }

    // ENHANCED KONG TRACKERS (MCR-76, MCR-77)
    kongs.forEach(k => {
      if (k.concealed === true) {
        localBreakdown.push({ rule: "Concealed Kong (MCR-76)", pts: 2 });
      } else {
        localBreakdown.push({ rule: "Melded Kong (MCR-77)", pts: 1 });
      }
    });

    // PUNG OF TERMINALS SCANNER (么九刻 - MCR-70 - 1 Point)
    pungs.forEach(p => {
      let rep = p.tiles && p.tiles[0] ? p.tiles[0] : null;
      if (rep && (rep.val === 1 || rep.val === 9) && !["WIND", "DRAGON"].includes(rep.pool)) {
        localBreakdown.push({ rule: `Terminal Pung (${rep.pool} ${rep.val})`, pts: 1 });
      }
    });

    // ONE VOIDED SUIT SCANNER (缺一門 - MCR-52 - 1 Point)
    let standardSuitsFound = new Set();
    flatTiles.forEach(t => {
      if (["WAN", "TONG", "SUO"].includes(t.pool)) {
        standardSuitsFound.add(t.pool);
      }
    });
    if (standardSuitsFound.size === 2) {
      localBreakdown.push({ rule: "One Voided Suit (MCR-52)", pts: 1 });
    }

    // Double Pung Rule (2 Points)
    if (pungs.length >= 2) {
      let foundDoublePung = false;
      for (let i = 0; i < pungs.length; i++) {
        for (let j = i + 1; j < pungs.length; j++) {
          let m1 = pungs[i]; let m2 = pungs[j];
          if (m1.tiles && m2.tiles && m1.tiles[0] && m2.tiles[0]) {
            let t1 = m1.tiles[0]; let t2 = m2.tiles[0];
            if (t1.val === t2.val && t1.pool !== t2.pool && !["WIND", "DRAGON"].includes(t1.pool) && !["WIND", "DRAGON"].includes(t2.pool)) {
              if (!foundDoublePung) {
                localBreakdown.push({ rule: "Double Pung", pts: 2 });
                foundDoublePung = true;
              }
            }
          }
        }
      }
    }

    // MIXED TRIPLE PUNG / MIXED TRIPLETS (三色三同刻 - MCR-40 - 8 Points)
    if (pungs.length >= 3) {
      let pungVals = pungs.map(p => {
        let rep = p.tiles && p.tiles[0] ? p.tiles[0] : null;
        return rep ? { val: rep.val, pool: rep.pool } : null;
      }).filter(v => v !== null && !["WIND", "DRAGON"].includes(v.pool));
      let valCounts = {};
      pungVals.forEach(p => {
        valCounts[p.val] = valCounts[p.val] || new Set();
        valCounts[p.val].add(p.pool);
      });
      let hasMixedTriplets = Object.values(valCounts).some(suitSet => suitSet.size === 3);
      if (hasMixedTriplets) {
        localBreakdown.push({ rule: "Mixed Triple Pung (MCR-40)", pts: 8 });
      }
    }

    // CONCEALED PUNG EVALUATOR (MCR-15, MCR-32, MCR-69)
    let concealedPungCount = 0;
    pungs.forEach(p => {
      let isMeldConcealed = p.concealed === true;
      if (isMeldConcealed && ctx.winMethod === "discard") {
        let repTile = p.tiles && p.tiles[0] ? p.tiles[0] : null;
        if (repTile && ctx.winningTile && repTile.pool === ctx.winningTile.pool && repTile.val === ctx.winningTile.val) {
          isMeldConcealed = false; 
        }
      }
      if (isMeldConcealed) { concealedPungCount++; }
    });
    if (concealedPungCount === 4) {
      localBreakdown.push({ rule: "Four Concealed Pungs (MCR-15)", pts: 64 });
    } else if (concealedPungCount === 3) {
      localBreakdown.push({ rule: "Three Concealed Pungs (MCR-32)", pts: 6 });
    } else if (concealedPungCount === 2) {
      localBreakdown.push({ rule: "Double Concealed Pung (MCR-69)", pts: 2 });
    }

    // SHIFTED PUNGS & KONG CONFIGURATIONS (MCR-45, MCR-49, MCR-51, MCR-56)
    if (pungs.length >= 3) {
      let numericalPungs = pungs.map(p => {
        let rep = p.tiles && p.tiles[0] ? p.tiles[0] : null;
        return rep ? { val: parseInt(rep.val, 10) || 0, pool: rep.pool } : null;
      }).filter(v => v !== null && !["WIND", "DRAGON"].includes(v.pool));
      let sortedPungs = numericalPungs.sort((a, b) => a.val - b.val);
      
      let hitPureShiftedPungs = false;
      for (let i = 0; i < sortedPungs.length - 2; i++) {
        let p1 = sortedPungs[i], p2 = sortedPungs[i+1], p3 = sortedPungs[i+2];
        if (p1.pool === p2.pool && p2.pool === p3.pool) {
          if (p2.val - p1.val === 1 && p3.val - p2.val === 1) {
            localBreakdown.push({ rule: "Pure Shifted Pungs (MCR-49)", pts: 24 });
            hitPureShiftedPungs = true;
            break;
          }
        }
      }
      if (!hitPureShiftedPungs && sortedPungs.length >= 3) {
        for (let i = 0; i < sortedPungs.length - 2; i++) {
          let p1 = sortedPungs[i], p2 = sortedPungs[i+1], p3 = sortedPungs[i+2];
          let distinctSuits = new Set([p1.pool, p2.pool, p3.pool]);
          if (distinctSuits.size === 3) {
            if (p2.val - p1.val === 1 && p3.val - p2.val === 1) {
              localBreakdown.push({ rule: "Three Shifted Pungs (MCR-45)", pts: 6 });
              break;
            }
          }
        }
      }
    }
    let windPungsCount = pungs.filter(p => p.tiles && p.tiles[0] && p.tiles[0].pool === "WIND").length;
    let hasBigFourWinds = localBreakdown.some(item => item.rule.includes("Big Four Winds") || item.rule.includes("Little Four Winds"));
    if (windPungsCount === 3 && !hasBigFourWinds) {
      localBreakdown.push({ rule: "Big Three Winds (MCR-51)", pts: 12 });
    }
    let concealedKongsCount = kongs.filter(k => k.concealed === true).length;
    if (concealedKongsCount === 2) {
      localBreakdown.push({ rule: "Two Concealed Kongs (MCR-56)", pts: 6 });
    }
    // ==========================================================================
    // --- SECTION C: CHOWS & SEQUENCES PATTERNS (THE GEOMETRIC FIX) ---
    // ==========================================================================
    if (chows.length === 4 && honorTiles.length === 0) {
      localBreakdown.push({ rule: "All Chows", pts: 2 });
    }
    let chowMetadata = chows.map(c => {
      let values = c.tiles.map(t => parseInt(t.val, 10) || 0);
      let poolName = (c.tiles && c.tiles[0]) ? (c.tiles[0].pool || "") : "";
      return { startVal: Math.min(...values), pool: poolName };
    });

    let hitPureStraight = false;
    let hitMixedStraight = false;
    if (chowMetadata.length >= 3) {
      let sortedChows = [...chowMetadata].sort((a, b) => a.startVal - b.startVal);
      for (let i = 0; i < sortedChows.length - 2; i++) {
        let c1 = sortedChows[i]; let c2 = sortedChows[i+1]; let c3 = sortedChows[i+2];
        if (c1.pool === c2.pool && c2.pool === c3.pool && c1.pool !== "") {
          if (c1.startVal === 1 && c2.startVal === 4 && c3.startVal === 7) {
            localBreakdown.push({ rule: "Pure Straight (MCR-25)", pts: 16 });
            hitPureStraight = true;
          }
        }
      }
      for (let i = 0; i < sortedChows.length - 2; i++) {
        let c1 = sortedChows[i]; let c2 = sortedChows[i+1]; let c3 = sortedChows[i+2];
        let distinctSuits = new Set([c1.pool, c2.pool, c3.pool]);
        if (distinctSuits.size === 3 && !distinctSuits.has("")) {
          if (c1.startVal === 1 && c2.startVal === 4 && c3.startVal === 7) {
            localBreakdown.push({ rule: "Mixed Straight (MCR-39)", pts: 8 });
            hitMixedStraight = true;
          }
        }
      }
      if (!hitPureStraight && !hitMixedStraight) {
        for (let i = 0; i < sortedChows.length - 2; i++) {
          let c1 = sortedChows[i]; let c2 = sortedChows[i+1]; let c3 = sortedChows[i+2];
          let distinctSuits = new Set([c1.pool, c2.pool, c3.pool]);
          if (distinctSuits.size === 3 && !distinctSuits.has("") && (c2.startVal - c1.startVal === 1) && (c3.startVal - c2.startVal === 1)) {
            localBreakdown.push({ rule: "Mixed Shifted Chows", pts: 6 });
          }
        }
      }
    }

    let hitFourShifted = false;
    let hitThreeShifted = false;
    if (chowMetadata.length === 4 && !hitPureStraight) {
      let sortedChows = [...chowMetadata].sort((a, b) => a.startVal - b.startVal);
      let c1 = sortedChows[0], c2 = sortedChows[1], c3 = sortedChows[2], c4 = sortedChows[3];
      if (c1.pool === c2.pool && c2.pool === c3.pool && c3.pool === c4.pool && c1.pool !== "") {
        let d1 = c2.startVal - c1.startVal;
        let d2 = c3.startVal - c2.startVal;
        let d3Actual = c4.startVal - c3.startVal;
        if ((d1 === 1 && d3Actual === 1) || (d1 === 2 && d3Actual === 2)) {
          localBreakdown.push({ rule: "Four Shifted Chows (MCR-24)", pts: 32 });
          hitFourShifted = true;
        }
      }
    }
    if (chowMetadata.length >= 3 && !hitPureStraight && !hitFourShifted) {
      let sortedChows = [...chowMetadata].sort((a, b) => a.startVal - b.startVal);
      for (let i = 0; i < sortedChows.length - 2; i++) {
        let c1 = sortedChows[i], c2 = sortedChows[i+1], c3 = sortedChows[i+2];
        if (c1.pool === c2.pool && c2.pool === c3.pool && c1.pool !== "") {
          let diff1 = c2.startVal - c1.startVal;
          let diff2 = c3.startVal - c2.startVal;
          if ((diff1 === 1 && diff2 === 1) || (diff1 === 2 && diff2 === 2)) {
            localBreakdown.push({ rule: "Three Shifted Chows (MCR-26)", pts: 16 });
            hitThreeShifted = true;
            break;
          }
        }
      }
    }

    // --- TILE-HOG / FOUR TILES INTEGRATION SCANNER (四歸一 - MCR-72 - 1 Point) ---
    let tileCountsTracker = {};
    flatTiles.forEach(t => {
      let k = `${t.pool}_${t.val}`;
      tileCountsTracker[k] = (tileCountsTracker[k] || 0) + 1;
    });
    let tileHogCount = 0;
    let totalKongsCount = sol.melds.filter(m => m.type === "kong").length;
    Object.keys(tileCountsTracker).forEach(k => {
      if (tileCountsTracker[k] === 4) { tileHogCount++; }
    });
    let finalTileHogs = Math.max(0, tileHogCount - totalKongsCount);
    if (finalTileHogs > 0) {
      localBreakdown.push({ rule: "Tile-Hog (MCR-72)", pts: finalTileHogs * 1 });
    }
    // PARALLEL TWIN CHOW ANALYZER (MCR-23, MCR-41, MCR-71, MCR-73)
    if (chowMetadata.length >= 2) {
      let valuePatterns = {};
      chowMetadata.forEach(c => {
        valuePatterns[c.startVal] = valuePatterns[c.startVal] || [];
        valuePatterns[c.startVal].push(c.pool);
      });
      let identicalChowsCount = 0;
      let mixedTwinChowsCount = 0;
      let hitTripleIdentical = false;
      let hitThreeSuitedTwin = false;
      Object.keys(valuePatterns).forEach(startVal => {
        let suits = valuePatterns[startVal];
        let suitCounts = {};
        suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
        Object.keys(suitCounts).forEach(s => {
          if (suitCounts[s] === 3) {
            localBreakdown.push({ rule: "Triple Identical Chows (MCR-23)", pts: 24 });
            hitTripleIdentical = true;
          } else if (suitCounts[s] === 2) { identicalChowsCount++; }
        });
        let uniqueSuits = new Set(suits);
        if (uniqueSuits.size === 3 && !uniqueSuits.has("")) {
          localBreakdown.push({ rule: "Three Suited Twin Chows (MCR-41)", pts: 8 });
          hitThreeSuitedTwin = true;
        } else if (uniqueSuits.size === 2 && !uniqueSuits.has("")) { mixedTwinChowsCount++; }
      });
      if (!hitTripleIdentical && identicalChowsCount > 0) {
        localBreakdown.push({ rule: "Two Identical Chows (MCR-71)", pts: identicalChowsCount * 1 });
      }
      if (!hitThreeSuitedTwin && mixedTwinChowsCount > 0) {
        localBreakdown.push({ rule: "Two Suited Twin Chows (MCR-73)", pts: mixedTwinChowsCount * 1 });
      }
    }

    // CONTINUOUS SEQUENCES & SHORT STRAIGHT RUNS (MCR-53, MCR-73 VAR)
    if (chowMetadata.length >= 2) {
      let sortedChows = [...chowMetadata].sort((a, b) => a.startVal - b.startVal);
      let hitShortStraight = false;
      for (let i = 0; i < sortedChows.length - 1; i++) {
        for (let j = i + 1; j < sortedChows.length; j++) {
          let c1 = sortedChows[i]; let c2 = sortedChows[j];
          if (c2.startVal - c1.startVal === 3) {
            if (c1.pool === c2.pool && c1.pool !== "") {
              localBreakdown.push({ rule: "Short Straight (MCR-53)", pts: 2 });
              hitShortStraight = true;
              break;
            } else if (c1.pool !== "" && c2.pool !== "") {
              localBreakdown.push({ rule: "Two Suit Short Straight", pts: 1 });
              break;
            }
          }
        }
        if (hitShortStraight) break;
      }
    }

    if (chowMetadata.length >= 2 && !hitPureStraight && !hitMixedStraight) {
      let sortedChows = [...chowMetadata].sort((a, b) => a.startVal - b.startVal);
      let shortStraightCount = 0;
      for (let i = 0; i < sortedChows.length - 1; i++) {
        if (sortedChows[i+1].startVal - sortedChows[i].startVal === 3 && sortedChows[i].pool === sortedChows[i+1].pool && sortedChows[i].pool !== "") {
          shortStraightCount++;
        }
      }
      if (shortStraightCount > 0) {
        localBreakdown.push({ rule: "Short Straight", pts: Math.min(shortStraightCount, 2) });
      }
      for (let i = 0; i < sortedChows.length - 1; i++) {
        if (sortedChows[i].startVal === 1 && sortedChows[i+1].startVal === 7 && sortedChows[i].pool === sortedChows[i+1].pool && sortedChows[i].pool !== "") {
          localBreakdown.push({ rule: "Two Terminal Chows", pts: 1 });
        }
      }
    }
    // ==========================================================================
    // --- SECTION D: LOW-TIER BUILDERS & VALUE-GROUPING PATTERNS ---
    // ==========================================================================
    let numericalSuitTiles = flatTiles.filter(t => !["WIND", "DRAGON"].includes(t.pool));
    if (numericalSuitTiles.length > 0) {
      let isLowerThree = numericalSuitTiles.every(t => t.val >= 1 && t.val <= 3);
      if (isLowerThree) { localBreakdown.push({ rule: "Lower Tiles (MCR-55)", pts: 6 }); }
      
      let isLowerFour = numericalSuitTiles.every(t => t.val >= 1 && t.val <= 4);
      if (isLowerFour && !isLowerThree) { localBreakdown.push({ rule: "Lower Four (MCR-37)", pts: 12 }); }
      
      let isUpperThree = numericalSuitTiles.every(t => t.val >= 7 && t.val <= 9);
      if (isUpperThree) { localBreakdown.push({ rule: "Upper Tiles (MCR-53)", pts: 6 }); }
      
      let isUpperFour = numericalSuitTiles.every(t => t.val >= 6 && t.val <= 9);
      if (isUpperFour && !isUpperThree) { localBreakdown.push({ rule: "Upper Four (MCR-36)", pts: 12 }); }
      
      let isMiddleThree = numericalSuitTiles.every(t => t.val >= 4 && t.val <= 6);
      if (isMiddleThree) { localBreakdown.push({ rule: "Middle Tiles (MCR-54)", pts: 6 }); }
      
      let pairHasFive = sol.pair && sol.pair.val === 5;
      let allMeldsHaveFive = sol.melds.every(m => m.tiles && m.tiles.some(t => t.val === 5));
      if (pairHasFive && allMeldsHaveFive) { localBreakdown.push({ rule: "All Fives (MCR-38)", pts: 16 }); }
    }

    let hasTerminalsOrHonors = flatTiles.some(t => t.val === 1 || t.val === 9 || ["WIND", "DRAGON"].includes(t.pool));
    if (!hasTerminalsOrHonors) {
      localBreakdown.push({ rule: "No Terminals", pts: 1 });
    }

    pungs.forEach(p => {
      if (p.tiles && p.tiles[0] && p.tiles[0].pool === "DRAGON") {
        let t = p.tiles[0];
        let dName = "White";
        if (t.val === 1 || t.id === "T_DRG_R") dName = "Red";
        if (t.val === 2 || t.id === "T_DRG_G") dName = "Green";
        localBreakdown.push({ rule: `Dragon Pung (${dName})`, pts: 2 });
      }
    });

    pungs.forEach(p => {
      if (p.tiles && p.tiles[0] && p.tiles[0].pool === "WIND") {
        let t = p.tiles[0];
        let wVal = parseInt(t.val, 10) || 0;
        if (wVal === 1) {
          if (ctx.seatWind === 1) localBreakdown.push({ rule: "Seat Wind (East)", pts: 2 });
          if (ctx.roundWind === 1) localBreakdown.push({ rule: "Prevalent Wind (East)", pts: 2 });
        }
        if (wVal === 2) {
          if (ctx.seatWind === 2) localBreakdown.push({ rule: "Seat Wind (South)", pts: 2 });
          if (ctx.roundWind === 2) localBreakdown.push({ rule: "Prevalent Wind (South)", pts: 2 });
        }
        if (wVal === 3) {
          if (ctx.seatWind === 3) localBreakdown.push({ rule: "Seat Wind (West)", pts: 2 });
          if (ctx.roundWind === 3) localBreakdown.push({ rule: "Prevalent Wind (West)", pts: 2 });
        }
        if (wVal === 4) {
          if (ctx.seatWind === 4) localBreakdown.push({ rule: "Seat Wind (North)", pts: 2 });
          if (ctx.roundWind === 4) localBreakdown.push({ rule: "Prevalent Wind (North)", pts: 2 });
        }
      }
    });

    let standardMelds = sol.melds;
    let pairTile = sol.pair;
    if (pairTile) {
      let isEveryTileTerminalOrHonor = flatTiles.every(t => t.val === 1 || t.val === 9 || ["WIND", "DRAGON"].includes(t.pool));
      let chowsCount = standardMelds.filter(m => m.type === "chow").length;
      let isAllPungs = (chowsCount === 0);
      if (isEveryTileTerminalOrHonor && isAllPungs) {
        let totalSuitsFound = new Set(flatTiles.map(t => t.pool).filter(p => ["WAN", "TONG", "SUO"].includes(p))).size;
        if (totalSuitsFound > 0 && honorTiles.length > 0) {
          localBreakdown.push({ rule: "Mixed Terminals (MCR-29)", pts: 32 });
        }
      }
      let pairIsOutside = (pairTile.val === 1 || pairTile.val === 9 || ["WIND", "DRAGON"].includes(pairTile.pool));
      let allMeldsAreOutside = standardMelds.every(m => m.tiles.some(t => t.val === 1 || t.val === 9 || ["WIND", "DRAGON"].includes(t.pool)));
      if (pairIsOutside && allMeldsAreOutside) {
        let hasHigherTerminal = localBreakdown.some(item => item.rule.includes("All Terminals") || item.rule.includes("Mixed Terminals"));
        if (!hasHigherTerminal) { localBreakdown.push({ rule: "Outside Hand (MCR-60)", pts: 4 }); }
      }
    }

    if (ctx.winningTile && sol.pair) {
      let isSingleWait = (ctx.winningTile.pool === sol.pair.pool && parseInt(ctx.winningTile.val) === parseInt(sol.pair.val));
      if (isSingleWait) {
        let totalMatchingConcealed = ctx.concealedLoose.filter(t => t.pool === ctx.winningTile.pool && parseInt(t.val) === parseInt(ctx.winningTile.val)).length;
        if (totalMatchingConcealed === 1) { localBreakdown.push({ rule: "Single Wait (MCR-80)", pts: 1 }); }
      }
      let chowsList = sol.melds.filter(m => m.type === "chow");
      for (let c of chowsList) {
        if (c.tiles && c.tiles.length === 3 && c.tiles[0] && c.tiles[0].pool === ctx.winningTile.pool) {
          let vals = c.tiles.map(t => parseInt(t.val)).sort((a, b) => a - b);
          let winVal = parseInt(ctx.winningTile.val);
          if (winVal === vals[1]) {
            localBreakdown.push({ rule: "Closed Wait (MCR-79)", pts: 1 });
            break;
          }
          if ((vals[0] === 1 && winVal === 3) || (vals[2] === 9 && winVal === 7)) {
            localBreakdown.push({ rule: "Edge Wait (MCR-81)", pts: 1 });
            break;
          }
        }
      }
    }
  }
});
