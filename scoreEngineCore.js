/**
 * scoreEngineCore.js - Master Orchestrator & Panel Render Engine
 */
const ScoreEngine = {
  calculateHandPoints() {
    if (!window.HandOrganizer) return;
    const ctx = HandOrganizer.gatherContextState();
    const total = HandOrganizer.calculateTotalTilesCount();

    if (total < 14) {
      customAlert(`Hand Incomplete: Requires exactly 14 core items. Found: ${total}`);
      return;
    }
    if (!ctx.winningTile) {
      customAlert("Missing Parameter: Select your Winning Tile target anchor slot.");
      return;
    }

    let breakdown = [];
    const suffix = ctx.variant === "HK" ? "Faan" : "Points";
    
    // Standardize object structures safely across external script tracking scopes
    let looseInventory = ctx.concealedLoose.map(t => ({ id: t.id, pool: t.pool, val: parseInt(t.val, 10) || 0 }));
    let processedMelds = ctx.sets.map(s => ({ 
      type: s.type, 
      concealed: s.concealed, 
      tiles: s.tiles.map(t => ({ id: t.id, pool: t.pool, val: parseInt(t.val, 10) || 0 })) 
    }));

    // Pass items smoothly to structural recursive deconstruction pipelines
    let validDecompositions = this.parseHandStructure(looseInventory, processedMelds);

    // Build flattened array checks for global style testing trackers
    let totalFlatTiles = [...looseInventory];
    processedMelds.forEach(m => {
      let cards = m.type === "kong" ? m.tiles.slice(0, 3) : m.tiles;
      totalFlatTiles = totalFlatTiles.concat(cards);
    });
     // 🌟 THE FIX: Explicitly injection process the Winning Tile into the global flat array bank
    if (ctx.winningTile) {
     totalFlatTiles.push({
         id: ctx.winningTile.id,
         pool: ctx.winningTile.pool,
         val: parseInt(ctx.winningTile.val, 10) || 0
     });
    }

    // Delegate calculation queries out to dedicated rules modules
    if (ctx.variant === "HK") {
      this.evaluateAllHongKongRules(ctx, totalFlatTiles, validDecompositions, breakdown);
    } else {
      this.evaluateAllMCRRules(ctx, totalFlatTiles, validDecompositions, breakdown);
    }

    let basePoints = breakdown.reduce((sum, item) => sum + item.pts, 0);
    if (basePoints === 0) {
      const fallbackValue = ctx.variant === "HK" ? 0 : 8;
      breakdown.push({ rule: ctx.variant === "HK" ? "Chicken Hand (Gai Wu)" : "Chicken Hand (MCR-43)", pts: fallbackValue });
      basePoints = fallbackValue;
    }

    this.paintReportPanel(basePoints, breakdown, suffix);
  },

  paintReportPanel(total, list, suffix) {
    const box = document.getElementById("report-breakdown");
    const totalLabel = document.getElementById("report-total");
    const panel = document.getElementById("report-panel");
    if (box && totalLabel && panel) {
      box.innerHTML = ""; let listHtml = "";
      list.forEach(item => {
        listHtml += `<div class="report-line" style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dotted #333;"><span>🔹 ${item.rule}</span><b style="color: var(--primary-green);">+${item.pts} ${suffix}</b></div>`;
      });
      box.innerHTML = listHtml; totalLabel.innerText = `Total Score: { ${total} ${suffix} }`; panel.style.display = "block";
      panel.style.borderColor = (suffix === "Points" && total < 8) ? "#e74c3c" : "var(--primary-green)";
    }
  }
};

window.ScoreEngine = ScoreEngine;
