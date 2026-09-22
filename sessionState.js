/**
* sessionState.js - Player Seat Tracking & Wind Select Syncer (Automated Version)
*/
Object.assign(SessionEngine, {
 updateWindMappings() {
   for (let i = 0; i < 4; i++) {
     let seat = ((i - this.gameState.dealerIndex + 4) % 4) + 1;
     this.gameState.players[i].currentSeat = seat;
   }
 },

 renderLedgerDOM() {
   document.getElementById("ledger-game-count").innerText = `Game Count: #${this.gameState.gameCount}`;
   document.getElementById("ledger-round-wind").innerText = `Round Wind: ${this.getWindString(this.gameState.roundWind)}`;
   const tbody = document.getElementById("ledger-table-body");
   if (tbody) {
     tbody.innerHTML = "";
     this.gameState.players.forEach((p, idx) => {
       const isDealer = (idx === this.gameState.dealerIndex);
       const row = document.createElement("tr");
       row.style.background = isDealer ? "rgba(46, 204, 113, 0.1)" : "transparent";
       
       row.innerHTML = `
         <td style="padding: 10px; border-bottom: 1px solid var(--border-color); font-weight: ${isDealer ? 'bold' : 'normal'};">
           ${p.name} ${isDealer ? '👑 (Dealer)' : ''}
         </td>
         <td style="padding: 10px; border-bottom: 1px solid var(--border-color); color: var(--accent-blue);">
           ${this.getWindString(p.currentSeat)}
         </td>
         <td style="padding: 10px; border-bottom: 1px solid var(--border-color); font-weight: bold; color: ${p.score >= 0 ? 'var(--primary-green)' : '#e74c3c'}; text-align: right;">
           ${p.score} ${this.gameState.trackMode === "FAAN" ? "Faan" : "Pts"}
         </td>
       `;
       tbody.appendChild(row);
     });
   }

   // Automatically inject active session winds into read-only labels
   const roundTextEl = document.getElementById("text-wind-round");
   const roundHiddenInput = document.getElementById("wind-round");
   if (roundTextEl && roundHiddenInput) {
     roundTextEl.innerText = this.getWindString(this.gameState.roundWind);
     roundHiddenInput.value = this.gameState.roundWind.toString();
   }
   
   // --- FIXED ERROR-FREE HISTORY LOG RENDERER LOOP ---
   const historyBox = document.getElementById("history-log-body");
   if (historyBox && this.gameState.historyLog) {
     historyBox.innerHTML = "";
     
     if (this.gameState.historyLog.length === 0) {
       historyBox.innerHTML = `<div style="font-size: 12px; color: var(--text-dim); text-align: center; padding: 10px 0;">No rounds logged yet. Start playing!</div>`;
     } else {
       for (let i = this.gameState.historyLog.length - 1; i >= 0; i--) {
         const item = this.gameState.historyLog[i];
         const row = document.createElement("div");
         row.style.cssText = "display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px dashed var(--border-color); color: var(--text-light);";
         row.innerHTML = `
           <span style="font-weight: bold; color: gold; width: 60px;">🀄 Game ${item.gameNumber}</span>
           <span style="flex: 1; padding-left: 5px;">Winner: <b style="color:var(--primary-green);">${item.winner}</b> (${item.type})</span>
           <span style="font-weight: bold; color: var(--accent-blue); width: 60px; text-align: right;">+${item.score}</span>
         `;
         historyBox.appendChild(row);
       }
     }
   }
   
   this.syncSidebarWinds();
 },

 openCalculator() {
   const selectWinner = document.getElementById("winner-player-select");
   
   if (selectWinner) {
     selectWinner.innerHTML = "";
     this.gameState.players.forEach((p, idx) => {
       selectWinner.innerHTML += `<option value="${idx}">${p.name} (${this.getWindString(p.currentSeat)})</option>`;
     });
     
     // 🀄 FIX: Bind list update logic to automatically filter out the winner on entry boot
     selectWinner.onchange = () => {
       this.syncSidebarWinds();
       this.rebuildLoserDropdown();
     };
   }

   if (window.HandOrganizer) window.HandOrganizer.clearHand();
   document.getElementById("ledger-screen").style.display = "none";
   document.getElementById("calculator-wrapper").style.display = "block";
   
   // Re-adjust dropdown suffixes dynamically based on game mode parameters
   const suffixLabel = document.getElementById("manual-score-suffix");
   if (suffixLabel) {
     suffixLabel.innerText = this.gameState.trackMode === "FAAN" ? "Faan" : "Points";
   }

   this.syncSidebarWinds();
   this.rebuildLoserDropdown(); // Generate clean list entries right away
 },

 // 🀄 NEW DYNAMIC FILTERING ENGINE FOR DISCARD PATH VALUES
 rebuildLoserDropdown() {
   const selectWinner = document.getElementById("winner-player-select");
   const selectLoser = document.getElementById("loser-player-select");
   if (!selectWinner || !selectLoser) return;

   const winnerIdx = parseInt(selectWinner.value, 10);
   
   // Initialize base selection tracks
   selectLoser.innerHTML = `<option value="all">Self-Draw/Zi Mo</option>`;
   
   // Loop through all options, completely stripping the active winner from the options matrix
   this.gameState.players.forEach((p, idx) => {
     if (idx !== winnerIdx) {
       selectLoser.innerHTML += `<option value="${idx}">${p.name} (${this.getWindString(p.currentSeat)})</option>`;
     }
   });

   // Hook the syncer listener event trigger cleanly
   selectLoser.onchange = () => {
     this.syncVictoryMethodRadio();
   };
   
   this.syncVictoryMethodRadio(); // Refresh hidden engine components tracking state flags
 },

 syncSidebarWinds() {
   const winnerIdx = parseInt(document.getElementById("winner-player-select")?.value || "0", 10);
   const targetPlayer = this.gameState.players[winnerIdx];
   
   const seatTextEl = document.getElementById("text-wind-seat");
   const seatHiddenInput = document.getElementById("wind-seat");
   
   if (seatTextEl && seatHiddenInput) {
     seatTextEl.innerText = this.getWindString(targetPlayer.currentSeat);
     seatHiddenInput.value = targetPlayer.currentSeat.toString();
   }
 },

 syncVictoryMethodRadio() {
   const loserSelection = document.getElementById("loser-player-select")?.value;
   const discardRadio = document.getElementById("hidden-win-discard");
   const wallRadio = document.getElementById("hidden-win-wall");
   if (loserSelection === "all") {
     if (wallRadio) {
       wallRadio.checked = true;
       wallRadio.dispatchEvent(new Event('change'));
     }
   } else {
     if (discardRadio) {
       discardRadio.checked = true;
       discardRadio.dispatchEvent(new Event('change'));
     }
   }
 }
});
