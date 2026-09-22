/**
* sessionTransactions.js - Financial Balance Sheet Ledger & Seat Rotations
*/
Object.assign(SessionEngine, {
 commitCalculatedPointsToBalance() {
   // 1. Grab point values printed inside ScoreEngine ledger panel output variables labels
   const reportTotalLabel = document.getElementById("report-total");
   if (!reportTotalLabel || reportTotalLabel.innerText === "") {
     return customAlert("Error: Please process hand calculation logic first by pressing the Calculate button."); 
   }
   
   // Parse values extracted out from standard response text lines e.g. "Total Score: { 6 Faan }"
   const match = reportTotalLabel.innerText.match(/\d+/);
   if (!match) return alert("Error reading final hand point metric totals.");
   const handScoreValue = parseInt(match, 10);
   const winnerIdx = parseInt(document.getElementById("winner-player-select").value, 10);
   const loserSelection = document.getElementById("loser-player-select").value;
   
   // Save the exact current game number before any score modifications or rotations happen
   const currentGameNumber = this.gameState.gameCount;
   
   // 2. Execute standard point balance transaction shifts logic configurations
   let dealerWasWinner = (winnerIdx === this.gameState.dealerIndex);
   if (loserSelection === "all") {
     // --- VICTORY PATH: SELF-DRAW (ZI MO) PAYOUT BALANCES SYSTEM ---
     let totalCollected = 0;
     this.gameState.players.forEach((p, idx) => {
       if (idx !== winnerIdx) {
         // Double payout logic rules apply if a non-dealer pays out to a dealer, or a dealer pays out to a non-dealer
         let isPayoutDoubled = (winnerIdx === this.gameState.dealerIndex || idx === this.gameState.dealerIndex);
         let cost = isPayoutDoubled ? (handScoreValue * 2) : handScoreValue;
         
         p.score -= cost;
         totalCollected += cost;
       }
     });
     this.gameState.players[winnerIdx].score += totalCollected;
   } else {
     // --- FIXED VICTORY PATH: DISCARD PAYOUT BALANCES SYSTEM ---
     const loserIdx = parseInt(loserSelection, 10);
     if (winnerIdx === loserIdx) return customAlert("Error: Winner cannot match the discard player index slot.");
     
     let totalCollected = 0;
     this.gameState.players.forEach((p, idx) => {
       if (idx !== winnerIdx) {
         // The person who discarded pays DOUBLE, the other two players pay SINGLE
         let cost = (idx === loserIdx) ? (handScoreValue * 2) : handScoreValue;
         
         p.score -= cost;
         totalCollected += cost;
       }
     });
     this.gameState.players[winnerIdx].score += totalCollected;
   }
   
   // --- RECORD GAME TO HISTORY LOG (FIXED ORDERING LOGIC) ---
   const winnerName = this.gameState.players[winnerIdx].name;
   let typeString = "";
   if (loserSelection === "all") {
     typeString = "Zi Mo (Self-Draw)";
   } else {
     const loserIdx = parseInt(loserSelection, 10);
     typeString = `Discard from ${this.gameState.players[loserIdx].name}`;
   }
   this.gameState.historyLog.push({
     gameNumber: currentGameNumber, // Strictly uses the snapshot of the round you just finished
     winner: winnerName,
     type: typeString,
     score: `${handScoreValue} ${this.gameState.trackMode === "FAAN" ? "Faan" : "Pts"}`
   });
   
   // 3. WINDS ROTATION LOGIC PIPELINE MATRIX
   if (dealerWasWinner) {
     // If the dealer wins, the dealer stays (Lian Zhuang). Winds do not shift.
     customAlert(`Dealer (${this.gameState.players[this.gameState.dealerIndex].name}) won the round! Dealer stays.`);
   } else {
     // If a non-dealer wins, the dealer shifts to the next player in clockwise order (Dong -> Nan -> Xi -> Bei)
     this.gameState.dealerIndex = (this.gameState.dealerIndex + 1) % 4;
     
     // If the dealer index loops back to 0 (Dong), the table round wind advances to the next wind quadrant
     if (this.gameState.dealerIndex === 0) {
       this.gameState.roundWind = (this.gameState.roundWind % 4) + 1;
       customAlert(`Winds shifted! Round wind advances to: ${this.getWindString(this.gameState.roundWind)}`);
     }
   }
   
   // Increment the main session match count for the next round
   this.gameState.gameCount++;
   this.updateWindMappings();
   
   // 4. Reset screens display state scopes
   document.getElementById("calculator-wrapper").style.display = "none";
   document.getElementById("ledger-screen").style.display = "block";
   this.renderLedgerDOM();
 },

 // 🀄 QUICK MANUAL SCORING BYPASS HUB
 commitManualOverrideScore() {
   const scoreInput = document.getElementById("manual-score-input");
   const handScoreValue = parseInt(scoreInput?.value || "", 10);

   if (isNaN(handScoreValue) || handScoreValue < 0) {
     return customAlert("Error: Please enter a valid positive number for the score.");
   }

   const winnerIdx = parseInt(document.getElementById("winner-player-select").value, 10);
   const loserSelection = document.getElementById("loser-player-select").value;
   const currentGameNumber = this.gameState.gameCount;
   let dealerWasWinner = (winnerIdx === this.gameState.dealerIndex);

   // 1. Process standard transaction logic using the typed override value
   if (loserSelection === "all") {
     // --- Zi Mo (Self-Draw) Matrix Payouts ---
     let totalCollected = 0;
     this.gameState.players.forEach((p, idx) => {
       if (idx !== winnerIdx) {
         let isPayoutDoubled = (winnerIdx === this.gameState.dealerIndex || idx === this.gameState.dealerIndex);
         let cost = isPayoutDoubled ? (handScoreValue * 2) : handScoreValue;
         p.score -= cost;
         totalCollected += cost;
       }
     });
     this.gameState.players[winnerIdx].score += totalCollected;
   } else {
     // --- FIXED VICTORY PATH: DISCARD PAYOUT BALANCES SYSTEM ---
     const loserIdx = parseInt(loserSelection, 10);
     if (winnerIdx === loserIdx) return customAlert("Error: Winner cannot match the discard player.");

     let totalCollected = 0;
     this.gameState.players.forEach((p, idx) => {
       if (idx !== winnerIdx) {
         // The person who discarded pays DOUBLE, the other two players pay SINGLE
         let cost = (idx === loserIdx) ? (handScoreValue * 2) : handScoreValue;
         
         p.score -= cost;
         totalCollected += cost;
       }
     });
     this.gameState.players[winnerIdx].score += totalCollected;
   }

   // 2. Map to historical log dashboard ledger tracks
   let typeString = (loserSelection === "all") ? "Zi Mo (Self-Draw)" : `Discard from ${this.gameState.players[parseInt(loserSelection, 10)].name}`;
   this.gameState.historyLog.push({
     gameNumber: currentGameNumber,
     winner: this.gameState.players[winnerIdx].name,
     type: typeString + " [Manual Override]",
     score: `${handScoreValue} ${this.gameState.trackMode === "FAAN" ? "Faan" : "Pts"}`
   });

   // 3. Auto-reset current text boxes and fields for next round
   if (scoreInput) scoreInput.value = "";

   // 4. Handle standard wind quadrant movement step sequences (Lian Zhuang check)
   if (!dealerWasWinner) {
     this.gameState.dealerIndex = (this.gameState.dealerIndex + 1) % 4;
     if (this.gameState.dealerIndex === 0) {
       this.gameState.roundWind = (this.gameState.roundWind % 4) + 1;
       customAlert(`Winds shifted! Round wind advances to: ${this.getWindString(this.gameState.roundWind)}`);
     }
   } else {
     customAlert(`Dealer (${this.gameState.players[this.gameState.dealerIndex].name}) won! Dealer stays.`);
   }

   // 5. Update display states and clear workbench arrays cleanly
   this.gameState.gameCount++;
   this.updateWindMappings();
   document.getElementById("calculator-wrapper").style.display = "none";
   document.getElementById("ledger-screen").style.display = "block";
   this.renderLedgerDOM();
 }
});
