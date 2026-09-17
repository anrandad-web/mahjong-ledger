/**
 * scoreEngineParser.js - Structural Backtracking Combinatorics Deconstruction
 */
Object.assign(ScoreEngine, {
  parseHandStructure(looseTiles, meldedSets) {
    let solutions = [];
    let workingPool = [...looseTiles];
    let structuredMelds = [];
    
    meldedSets.forEach(m => {
      let coreTiles = m.type === "kong" ? m.tiles.slice(0, 3) : m.tiles;
      // 🀄 FIX 1: Explicitly preserve the dashboard's concealed flag state here!
      structuredMelds.push({ type: m.type, concealed: m.concealed, tiles: coreTiles });
    });

    let counts = {};
    workingPool.forEach(t => { const k = `${t.pool}_${t.val}`; counts[k] = (counts[k] || 0) + 1; });
    
    // Check Seven Pairs Special Layout Criteria
    let pairsCount = Object.values(counts).filter(c => c === 2).length;
    let quadsCount = Object.values(counts).filter(c => c === 4).length;
    if (pairsCount + (quadsCount * 2) === 7 && structuredMelds.length === 0) {
      solutions.push({ isSpecial: true, type: "SEVEN_PAIRS", melds: [] });
    }

    // Standard recursive backtrack validator: loop keys for possible eyes matching
    let uniqueKeys = [...new Set(workingPool.map(t => `${t.pool}_${t.val}`))];
    uniqueKeys.forEach(key => {
      let [pool, valStr] = key.split("_");
      let val = parseInt(valStr, 10);
      if (counts[key] >= 2) {
        let remaining = [...workingPool];
        for (let i = 0; i < 2; i++) {
          let idx = remaining.findIndex(t => t.pool === pool && t.val === val);
          remaining.splice(idx, 1);
        }
        this.backtrackMelds(remaining, [...structuredMelds], (foundMelds) => {
          solutions.push({ isSpecial: false, type: "STANDARD", melds: foundMelds, pair: { pool, val } });
        });
      }
    });
    return solutions;
  },

  backtrackMelds(tiles, currentMelds, callback) {
    if (tiles.length === 0) { callback([...currentMelds]); return; }
    // Sort array safely by custom structural constraints
    let sortedTiles = [...tiles].sort((a, b) => a.pool.localeCompare(b.pool) || a.val - b.val);
    let first = sortedTiles[0];

    // Check Pungs
    let pungMatches = sortedTiles.filter(t => t.pool === first.pool && t.val === first.val);
    if (pungMatches.length >= 3) {
      let nextTiles = [...sortedTiles];
      for (let i = 0; i < 3; i++) { 
        let remIdx = nextTiles.findIndex(t => t.pool === first.pool && t.val === first.val);
        if (remIdx !== -1) nextTiles.splice(remIdx, 1); 
      }
      
      // 🀄 FIX 2: Correctly attach the concealed flag for items discovered in loose cards
      currentMelds.push({ type: "pung", concealed: true, tiles: pungMatches.slice(0, 3) });
      this.backtrackMelds(nextTiles, currentMelds, callback);
      currentMelds.pop();
    }

    // Check Chows
    if (!["WIND", "DRAGON"].includes(first.pool)) {
      let idx1 = sortedTiles.findIndex(t => t.pool === first.pool && t.val === first.val);
      let idx2 = sortedTiles.findIndex(t => t.pool === first.pool && t.val === first.val + 1);
      let idx3 = sortedTiles.findIndex(t => t.pool === first.pool && t.val === first.val + 2);
      
      if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1) {
        let nextTiles = [...sortedTiles];
        
        // Grab references to the elements cleanly
        let t1 = sortedTiles[idx1];
        let t2 = sortedTiles[idx2];
        let t3 = sortedTiles[idx3];

        // Safely strip the items by matching unique identifier instances out from the layout
        nextTiles.splice(nextTiles.findIndex(t => t.id === t1.id), 1);
        nextTiles.splice(nextTiles.findIndex(t => t.id === t2.id), 1);
        nextTiles.splice(nextTiles.findIndex(t => t.id === t3.id), 1);
        
        let chowTiles = [t1, t2, t3].sort((a, b) => a.val - b.val);
        
        // 🀄 FIX 3: Correctly attach the concealed flag for chows built out of loose cards
        currentMelds.push({ type: "chow", concealed: true, tiles: chowTiles });
        this.backtrackMelds(nextTiles, currentMelds, callback);
        currentMelds.pop();
      }
    }
  }
});
