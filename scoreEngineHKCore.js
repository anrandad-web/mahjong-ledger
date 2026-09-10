/**
 * scoreEngineHKCore.js - Hong Kong Master Module Orchestrator
 */
Object.assign(ScoreEngine, {
  evaluateAllHongKongRules(ctx, flatTiles, solutions, breakdown) {
    let bestScore = 0;
    let bestBreakdown = [];
    const isWall = ctx.winMethod === "wall";

    let suitsInHand = new Set(flatTiles.map(t => t.pool).filter(p => ["WAN", "TONG", "SUO"].includes(p)));
    let honorTiles = flatTiles.filter(t => ["WIND", "DRAGON"].includes(t.pool));
    
    // Check if any declared set block on the board is an open meld from discards
    let hasOpenMelds = ctx.sets.some(s => s.concealed === false);
    let isFullyConcealed = !hasOpenMelds;

    // 1. Intercept Ultimate Limit Hands First
    if (this.checkHongKongLimitHands(ctx, flatTiles, suitsInHand, honorTiles, isFullyConcealed, breakdown)) {
      return; // If a limit hand triggers, stop standard calculations immediately
    }

    // 2. Loop Through Standard Solutions to Find the Highest Combinatorics Score
    solutions.forEach(sol => {
      let localBreakdown = this.evaluateHKStandardPatterns(ctx, flatTiles, sol, suitsInHand, honorTiles);
      
      if (isFullyConcealed && !isWall) {
        localBreakdown.push({ rule: "Concealed Hand", pts: 1 });
      }

      let sum = localBreakdown.reduce((s, i) => s + i.pts, 0);
      if (sum > bestScore || bestBreakdown.length === 0) {
        bestScore = sum;
        bestBreakdown = localBreakdown;
      }
    });

    // 3. Apply Global Movement Modifiers
    if (isWall) {
      if (isFullyConcealed) {
        bestBreakdown.push({ rule: "Fully Concealed Self-Drawn", pts: 2 });
      } else {
        bestBreakdown.push({ rule: "Self-Drawn Bonus", pts: 1 });
      }
    }

    // 4. Inject Flower Values into the Final Score Analysis Ledger
    this.applyFlowerAndWinModifiers(ctx, isFullyConcealed, isWall, bestBreakdown);
    bestBreakdown.forEach(item => breakdown.push(item));
  },

  applyFlowerAndWinModifiers(ctx, isFullyConcealed, isWall, localBreakdown) {
    switch (ctx.hkFlowerCondition) {
      case "NO_FLOWERS": localBreakdown.push({ rule: "No Flowers", pts: 1 }); break;
      case "ONE_MATCH": localBreakdown.push({ rule: "Matching Seat Flower", pts: 1 }); break;
      case "TWO_MATCH": localBreakdown.push({ rule: "Double Seat Flowers", pts: 2 }); break;
      case "ALL_FLOWERS": localBreakdown.push({ rule: "Complete Flower Set", pts: 2 }); break;
      case "ALL_SEASONS": localBreakdown.push({ rule: "Complete Season Set", pts: 2 }); break;
      case "COMPLETE_EIGHT": localBreakdown.push({ rule: "All 8 Flowers", pts: 8 }); break;
    }
  }
});
