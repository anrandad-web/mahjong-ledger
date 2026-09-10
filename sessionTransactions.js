/**
 * sessionTransactions.js - Financial Balance Sheet Ledger & Seat Rotations
 */
Object.assign(SessionEngine, {
  commitCalculatedPointsToBalance() {
    // 1. Grab point values printed inside ScoreEngine ledger panel output variables labels
    const reportTotalLabel = document.getElementById("report-total");
    if (!reportTotalLabel || reportTotalLabel.innerText === "") {
    return customAlert("Error: Please process hand calculation logic first by pressing the Calculate button.");    }

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
      // --- VICTORY PATH: DISCARD PAYOUT BALANCES SYSTEM ---
      const loserIdx = parseInt(loserSelection, 10);
      if (winnerIdx === loserIdx) return customAlert("Error: Winner cannot match the discard player index slot.");
      
      let isPayoutDoubled = (winnerIdx === this.gameState.dealerIndex || loserIdx === this.gameState.dealerIndex);
      let cost = isPayoutDoubled ? (handScoreValue * 2) : handScoreValue;

      this.gameState.players[loserIdx].score -= cost;
      this.gameState.players[winnerIdx].score += cost;
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
    // ----------------------------------------------------------

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
  }
});
