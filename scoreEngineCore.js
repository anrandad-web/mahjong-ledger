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

 // Build a clean flat tile bank without duplicates
 let totalFlatTiles = [...looseInventory];
 processedMelds.forEach(m => {
 let cards = m.type === "kong" ? m.tiles.slice(0, 3) : m.tiles;
 totalFlatTiles = totalFlatTiles.concat(cards);
 });

 // Pass items smoothly to structural recursive deconstruction pipelines
 let validDecompositions = this.parseHandStructure(looseInventory, processedMelds);
 
 // 🀄 FIX: SPECIAL IRREGULAR HAND BYPASS INTERCEPTOR
 // If standard parsing fails, verify if it qualifies as an irregular special hand signature
 if (validDecompositions.length === 0) {
 let isIrregularSpecial = this.checkIrregularHandSignatures(totalFlatTiles);
 if (isIrregularSpecial) {
 // Inject an irregular solution blueprint to bypass the structural blocking gate
 validDecompositions.push({ isSpecial: true, type: "IRREGULAR", melds: [] });
 } else {
 customAlert("INVALID HAND: These tiles cannot form any legal winning combination!");
 return;
 }
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

 /**
 * 🀄 HELPER: Core structural validator verifying if an undecomposable hand configuration 
 * matches the absolute baseline properties of a Knitted Hand or Thirteen Orphans.
 */
 checkIrregularHandSignatures(flatTiles) {
 if (flatTiles.length !== 14) return false;

 // 1. Baseline Extraction Keys
 let uniqueKeys = new Set(flatTiles.map(t => `${t.pool}_${t.val}`));
 let uniqueHonors = new Set(flatTiles.filter(t => ["WIND", "DRAGON"].includes(t.pool)).map(t => t.id));

 // 2. Test Signature A: Thirteen Orphans Matrix Check
 let hasThirteen = ["WAN_1", "WAN_9", "TONG_1", "TONG_9", "SUO_1", "SUO_9",
 "WIND_1", "WIND_2", "WIND_3", "WIND_4",
 "DRAGON_1", "DRAGON_2", "DRAGON_3"].every(k => uniqueKeys.has(k));
 if (hasThirteen) return true;

 // 3. Test Signature B: Knitted Patterns Pipeline Track Verification
 let suitSequences = { WAN: new Set(), TONG: new Set(), SUO: new Set() };
 let counts = {};
 let duplicateFoundInSuits = false;

 flatTiles.forEach(t => {
 let k = `${t.pool}_${t.val}`;
 counts[k] = (counts[k] || 0) + 1;
 if (["WAN", "TONG", "SUO"].includes(t.pool)) {
 suitSequences[t.pool].add(t.val);
 if (counts[k] > 1) duplicateFoundInSuits = true;
 }
 });

 // Knitted hands strictly cannot contain duplicate copies of numerical suit tiles
 if (!duplicateFoundInSuits) {
 let configA =[1,4,7], configB =[2,5,8], configC =[3,6,9];
 let getTrackAssignment = (set) => {
 if (set.size === 0) return 0;
 let vals = [...set];
 if (vals.every(v => configA.includes(v))) return 1;
 if (vals.every(v => configB.includes(v))) return 2;
 if (vals.every(v => configC.includes(v))) return 3;
 return -1;
 };

 let trackWan = getTrackAssignment(suitSequences.WAN);
 let trackTong = getTrackAssignment(suitSequences.TONG);
 let trackSuo = getTrackAssignment(suitSequences.SUO);

 let activeTracks = [trackWan, trackTong, trackSuo].filter(t => t > 0);
 let totalUniqueTracks = new Set(activeTracks).size;

 // Ensure all active suits sit cleanly on non-clashing track configurations
 if (trackWan !== -1 && trackTong !== -1 && trackSuo !== -1 && activeTracks.length === totalUniqueTracks) {
 let totalSuitTilesCount = suitSequences.WAN.size + suitSequences.TONG.size + suitSequences.SUO.size;
 if (totalSuitTilesCount + uniqueHonors.size === 14) {
 return true; // Successfully confirmed Knitted Hand footprint
 }
 }
 }

 return false; // Hand is truly random junk
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
