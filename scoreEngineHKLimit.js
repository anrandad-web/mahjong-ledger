/**
 * scoreEngineHKLimit.js - Ultimate Limit Hands Registry Detector
 */
Object.assign(ScoreEngine, {
  checkHongKongLimitHands(ctx, flatTiles, suitsInHand, honorTiles, isFullyConcealed, breakdown) {
    const isWall = ctx.winMethod === "wall";

    // [PATTERN 1] THIRTEEN ORPHANS (十三幺)
    if (isFullyConcealed && ctx.sets.length === 0) {
      let orphansTracker = {
        wan1: false, wan9: false, tong1: false, tong9: false, suo1: false, suo9: false,
        windE: false, windS: false, windW: false, windN: false, dragonRed: false, dragonGreen: false, dragonWhite: false
      };
      
      flatTiles.forEach(t => {
        const pool = (t.pool || "").toUpperCase();
        if (pool === "WAN" && t.val === 1) orphansTracker.wan1 = true;
        if (pool === "WAN" && t.val === 9) orphansTracker.wan9 = true;
        if (pool === "TONG" && t.val === 1) orphansTracker.tong1 = true;
        if (pool === "TONG" && t.val === 9) orphansTracker.tong9 = true;
        if (pool === "SUO" && t.val === 1) orphansTracker.suo1 = true;
        if (pool === "SUO" && t.val === 9) orphansTracker.suo9 = true;
        if (pool === "WIND") {
          if (t.id === "T_WND_E") orphansTracker.windE = true;
          if (t.id === "T_WND_S") orphansTracker.windS = true;
          if (t.id === "T_WND_W") orphansTracker.windW = true;
          if (t.id === "T_WND_N") orphansTracker.windN = true;
        }
        if (pool === "DRAGON") {
          if (t.id === "T_DRG_R") orphansTracker.dragonRed = true;
          if (t.id === "T_DRG_G") orphansTracker.dragonGreen = true;
          if (t.id === "T_DRG_W") orphansTracker.dragonWhite = true;
        }
      });

      let uniqueFound = Object.values(orphansTracker).filter(flag => flag === true).length;
      if (uniqueFound === 13 && flatTiles.length === 14) {
        let localBreakdown = [{ rule: "Thirteen Orphans (Limit Hand)", pts: 10 }];
        this.applyFlowerAndWinModifiers(ctx, isFullyConcealed, isWall, localBreakdown);
        localBreakdown.forEach(item => breakdown.push(item));
        return true;
      }
    }

    // [PATTERN 2] NINE GATES (九蓮寶燈) - FULLY FIXED VALID LOGIC
    if (isFullyConcealed && suitsInHand.size === 1 && honorTiles.length === 0) {
      let valueCounts = {};
      for (let i = 1; i <= 9; i++) valueCounts[i] = 0;
      flatTiles.forEach(t => { valueCounts[t.val] = (valueCounts[t.val] || 0) + 1; });

      let hasThreeOnes = (valueCounts[1] >= 3);
      let hasThreeNines = (valueCounts[9] >= 3);
      
      // Explicit array containing middle values from 2 to 8
      let middleValues = Array.of(2, 3, 4, 5, 6, 7, 8);
      let hasMiddleRun = middleValues.every(v => valueCounts[v] >= 1);

      if (hasThreeOnes && hasThreeNines && hasMiddleRun && flatTiles.length === 14) {
        let localBreakdown = [{ rule: "Nine Gates (Limit Hand)", pts: 10 }];
        this.applyFlowerAndWinModifiers(ctx, isFullyConcealed, isWall, localBreakdown);
        localBreakdown.forEach(item => breakdown.push(item));
        return true;
      }
    }

    return false; // Bypassed, no limits hit
  }
});
