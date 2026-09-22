/**
* sessionCore.js - Setup Orchestrator & View State Controller
*/
const SessionEngine = {
 gameState: {
   isActive: false,
   gameCount: 0,
   trackMode: "FAAN", // "FAAN" for HK, "POINTS" for MCR
   roundWind: 1,      // 1=East, 2=South, 3=West, 4=North
   dealerIndex: 0,    // 0=Dong, 1=Nan, 2=Xi, 3=Bei
   historyLog: [],    // TRACK HISTORY
   players: [
     { name: "Player 1", score: 0, initialSeat: 1, currentSeat: 1 },
     { name: "Player 2", score: 0, initialSeat: 2, currentSeat: 2 },
     { name: "Player 3", score: 0, initialSeat: 3, currentSeat: 3 },
     { name: "Player 4", score: 0, initialSeat: 4, currentSeat: 4 }
   ]
 },

 startGame() {
   const dName = document.getElementById("setup-name-dong")?.value.trim() || "Dong";
   const nName = document.getElementById("setup-name-nan")?.value.trim() || "Nan";
   const xName = document.getElementById("setup-name-xi")?.value.trim() || "Xi";
   const bName = document.getElementById("setup-name-bei")?.value.trim() || "Bei";
   
   this.gameState.players[0].name = dName;
   this.gameState.players[1].name = nName;
   this.gameState.players[2].name = xName;
   this.gameState.players[3].name = bName;
   
   const variant = document.querySelector('input[name="game-variant"]:checked')?.value || "HK";
   this.gameState.trackMode = (variant === "HK") ? "FAAN" : "POINTS";
   
   // 🀄 FIXED STRING INTERPOLATION SELECTION LAYER
   const targetRadio = document.querySelector('input[name="game-variant"][value="' + variant + '"]');
   if (targetRadio) {
     targetRadio.checked = true;
     targetRadio.dispatchEvent(new Event('change'));
   }
   
   this.gameState.isActive = true;
   this.gameState.gameCount = 1;
   this.gameState.roundWind = 1;
   this.gameState.dealerIndex = 0;
   this.gameState.players.forEach(p => p.score = 0);
   this.updateWindMappings();
   
   document.getElementById("setup-screen").style.display = "none";
   document.getElementById("ledger-screen").style.display = "block";
   document.getElementById("calculator-wrapper").style.display = "none";
   this.renderLedgerDOM();
 },

 getWindString(windNum) {
   switch(windNum) {
     case 1: return "Dong (🀀)";
     case 2: return "Nan (🀁)";
     case 3: return "Xi (🀂)";
     case 4: return "Bei (🀃)";
     default: return "";
   }
 },

 backToLedger() {
   document.getElementById("calculator-wrapper").style.display = "none";
   document.getElementById("ledger-screen").style.display = "block";
   this.renderLedgerDOM();
 }
};

// Master custom popups override functions pipeline
SessionEngine.showAppNotification = function(textMessage) {
 const toast = document.getElementById("app-notification-toast");
 const msgLabel = document.getElementById("app-notification-message");
 if (toast && msgLabel) {
   msgLabel.innerText = textMessage;
   toast.style.display = "block";
 }
};

SessionEngine.closeAppNotification = function() {
 const toast = document.getElementById("app-notification-toast");
 if (toast) toast.style.display = "none";
};

// Global shorthand binder to override the default system alert window completely
window.customAlert = function(msg) {
 SessionEngine.showAppNotification(msg);
};
window.SessionEngine = SessionEngine;
