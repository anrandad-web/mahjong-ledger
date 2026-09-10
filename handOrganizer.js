/**
 * handOrganizer.js - State Management & Tile Placement Lifecycle Manager
 */
const HandOrganizer = {
  tileRegistry: [
    { id: "T_WAN_1", pool: "WAN", val: 1, text: "🀇", img: "image/wan1.svg" },
    { id: "T_WAN_2", pool: "WAN", val: 2, text: "🀈", img: "image/wan2.svg" },
    { id: "T_WAN_3", pool: "WAN", val: 3, text: "🀉", img: "image/wan3.svg" },
    { id: "T_WAN_4", pool: "WAN", val: 4, text: "🀊", img: "image/wan4.svg" },
    { id: "T_WAN_5", pool: "WAN", val: 5, text: "🀋", img: "image/wan5.svg" },
    { id: "T_WAN_6", pool: "WAN", val: 6, text: "🀌", img: "image/wan6.svg" },
    { id: "T_WAN_7", pool: "WAN", val: 7, text: "🀍", img: "image/wan7.svg" },
    { id: "T_WAN_8", pool: "WAN", val: 8, text: "🀎", img: "image/wan8.svg" },
    { id: "T_WAN_9", pool: "WAN", val: 9, text: "🀏", img: "image/wan9.svg" },
    { id: "T_TONG_1", pool: "TONG", val: 1, text: "🀙", img: "image/tong1.svg" },
    { id: "T_TONG_2", pool: "TONG", val: 2, text: "🀚", img: "image/tong2.svg" },
    { id: "T_TONG_3", pool: "TONG", val: 3, text: "🀛", img: "image/tong3.svg" },
    { id: "T_TONG_4", pool: "TONG", val: 4, text: "🀜", img: "image/tong4.svg" },
    { id: "T_TONG_5", pool: "TONG", val: 5, text: "🀝", img: "image/tong5.svg" },
    { id: "T_TONG_6", pool: "TONG", val: 6, text: "🀞", img: "image/tong6.svg" },
    { id: "T_TONG_7", pool: "TONG", val: 7, text: "🀟", img: "image/tong7.svg" },
    { id: "T_TONG_8", pool: "TONG", val: 8, text: "🀠", img: "image/tong8.svg" },
    { id: "T_TONG_9", pool: "TONG", val: 9, text: "🀡", img: "image/tong9.svg" },
    { id: "T_SUO_1", pool: "SUO", val: 1, text: "🀐", img: "image/suo1.svg" },
    { id: "T_SUO_2", pool: "SUO", val: 2, text: "🀑", img: "image/suo2.svg" },
    { id: "T_SUO_3", pool: "SUO", val: 3, text: "🀒", img: "image/suo3.svg" },
    { id: "T_SUO_4", pool: "SUO", val: 4, text: "🀓", img: "image/suo4.svg" },
    { id: "T_SUO_5", pool: "SUO", val: 5, text: "🀔", img: "image/suo5.svg" },
    { id: "T_SUO_6", pool: "SUO", val: 6, text: "🀕", img: "image/suo6.svg" },
    { id: "T_SUO_7", pool: "SUO", val: 7, text: "🀖", img: "image/suo7.svg" },
    { id: "T_SUO_8", pool: "SUO", val: 8, text: "🀗", img: "image/suo8.svg" },
    { id: "T_SUO_9", pool: "SUO", val: 9, text: "🀘", img: "image/suo9.svg" },
    { id: "T_WND_E", pool: "WIND", val: 1, text: "🀀", img: "image/dong.svg" },
    { id: "T_WND_S", pool: "WIND", val: 2, text: "🀁", img: "image/nan.svg" },
    { id: "T_WND_W", pool: "WIND", val: 3, text: "🀂", img: "image/xi.svg" },
    { id: "T_WND_N", pool: "WIND", val: 4, text: "🀃", img: "image/bei.svg" },
    { id: "T_DRG_R", pool: "DRAGON", val: 1, text: "🀄", img: "image/zhong.svg" },
    { id: "T_DRG_G", pool: "DRAGON", val: 2, text: "🀅", img: "image/fa.svg" },
    { id: "T_DRG_W", pool: "DRAGON", val: 3, text: "🀆", img: "image/bai.svg" }
  ],
  
  handLayout: { meldedSets: [], concealedTiles: [], winningTile: null },

  init() { 
    this.refreshDOM(); 
  },

  calculateTotalTilesCount() {
    let size = this.handLayout.concealedTiles.length;
    if (this.handLayout.winningTile) size++;
    this.handLayout.meldedSets.forEach(set => { 
      // Tally elements logically using a value of 3 for Kongs to keep math at exactly 14 elements total
      size += 3; 
    });
    return size;
  },

  handleTileClickByID(tileID) {
    const tile = this.tileRegistry.find(t => t.id === tileID);
    if (!tile) return;

    const mode = document.querySelector('input[name="input-mode"]:checked').value;
    const currentTotal = this.calculateTotalTilesCount();

    // Ensure your routing keys match these updated input string tokens cleanly:
    switch(mode) {
      case "winning_tile": // Fired by green winning tile button click
        this.handLayout.winningTile = tile;
        break;

      case "concealed_tile": // Fired by single tile/pair option click
        if (currentTotal >= 14) return customAlert("Hand full!");
        this.handLayout.concealedTiles.push(tile);
        break;

      case "pung": // Column A radio selector
      case "concealed_pung": { // Column B radio selector
        if (currentTotal + 3 > 14) return customAlert("Space Full!");
        const isConcealed = (mode === "concealed_pung");
        this.handLayout.meldedSets.push({
          type: "pung",
          concealed: isConcealed,
          tiles: [ { ...tile }, { ...tile }, { ...tile } ]
        });
        break;
      }

      case "melded_kong": // Column A radio selector
      case "concealed_kong": { // Column B radio selector
        if (currentTotal + 3 > 14) return customAlert("Space Full!");
        const isConcealed = (mode === "concealed_kong");
        this.handLayout.meldedSets.push({
          type: "kong",
          concealed: isConcealed,
          tiles: [ { ...tile }, { ...tile }, { ...tile }, { ...tile } ]
        });
        break;
      }

      case "chow": // Column A radio selector
      case "concealed_chow": { // Column B radio selector
        if (["WIND", "DRAGON"].includes(tile.pool)) return customAlert("Honors cannot form sequential Chows!");
        if (tile.val === 1 || tile.val === 9) return customAlert("Click middle tile.");
        if (currentTotal + 3 > 14) return customAlert("Space Full!");

        const t1 = this.tileRegistry.find(t => t.pool === tile.pool && t.val === tile.val - 1);
        const t3 = this.tileRegistry.find(t => t.pool === tile.pool && t.val === tile.val + 1);
        if (!t1 || !t3) return customAlert("Invalid Sequence.");

        const isConcealed = (mode === "concealed_chow");
        this.handLayout.meldedSets.push({ type: "chow", concealed: isConcealed, tiles: [t1, tile, t3] });
        break;
      }
    }
    this.refreshDOM();
  },

  injectSVGObject(targetContainer, imgUrl) {
    const obj = document.createElement("object");
    obj.type = "image/svg+xml";
    obj.data = imgUrl;
    obj.style.cssText = "width: 100%; height: 100%; position: absolute; top: 0; left: 0; pointer-events: none; background: transparent; z-index: 5;";
    targetContainer.appendChild(obj);
  },

  clearHand() {
    this.handLayout.meldedSets = []; 
    this.handLayout.concealedTiles = [];
    this.handLayout.winningTile = null;
    const p = document.getElementById("report-panel"); 
    if (p) p.style.display = "none";
    this.refreshDOM();
  },

  refreshDOM() {
    const mBox = document.getElementById("display-melded-sets");
    const cBox = document.getElementById("display-concealed-tiles");
    const wBox = document.getElementById("display-winning-tile");
    
    if (mBox) mBox.innerHTML = ""; 
    if (cBox) cBox.innerHTML = ""; 
    if (wBox) wBox.innerHTML = "";

    this.handLayout.meldedSets.forEach((set, sIdx) => {
      const wrap = document.createElement("div"); 
      wrap.className = "meld-block";
      wrap.onclick = () => { 
        this.handLayout.meldedSets.splice(sIdx, 1); 
        this.refreshDOM(); 
      };

      set.tiles.forEach(t => {
        const card = document.createElement("div"); 
        card.className = "tile-card";
        wrap.appendChild(card); 
        this.injectSVGObject(card, t.img);
        // Unified stylistic tint across structural components
        // if (set.concealed) card.style.filter = "brightness(0.65) contrast(1.15)";
      });

      if (set.concealed && cBox) {
        cBox.appendChild(wrap); 
      } else if (!set.concealed && mBox) {
        mBox.appendChild(wrap); 
      }
    });

    this.handLayout.concealedTiles.forEach((tile, cIdx) => {
      const card = document.createElement("div"); 
      card.className = "tile-card single-tile"; 
      card.style.marginRight = "4px";
      card.onclick = () => { 
        this.handLayout.concealedTiles.splice(cIdx, 1); 
        this.refreshDOM(); 
      };
      // Make loose items inherit uniform concealed visual tones cleanly
      // card.style.filter = "brightness(0.65) contrast(1.15)";
      if (cBox) cBox.appendChild(card); 
      this.injectSVGObject(card, tile.img);
    });

    if (this.handLayout.winningTile) {
      const card = document.createElement("div"); 
      card.className = "tile-card single-tile";
      card.onclick = () => { 
        this.handLayout.winningTile = null; 
        this.refreshDOM(); 
      };
      if (wBox) wBox.appendChild(card); 
      this.injectSVGObject(card, this.handLayout.winningTile.img);
    }

    const counter = document.getElementById("workbench-counter");
    if (counter) counter.innerText = `Tiles Loaded: ${this.calculateTotalTilesCount()} / 14`;
  },

  gatherContextState() {
    let loose = [...this.handLayout.concealedTiles];
    if (this.handLayout.winningTile) loose.push(this.handLayout.winningTile);

    const variantRadio = document.querySelector('input[name="game-variant"]:checked');
    const winMethodRadio = document.querySelector('input[name="win-method"]:checked');

    return {
      variant: variantRadio ? variantRadio.value : "MCR",
      winMethod: winMethodRadio ? winMethodRadio.value : "discard",
      lastTile: document.getElementById("param-last-tile")?.checked || false,
      lastKind: document.getElementById("param-last-kind")?.checked || false,
      replacement: document.getElementById("param-replacement")?.checked || false,
      robbing: document.getElementById("param-robbing")?.checked || false,
      roundWind: parseInt(document.getElementById("wind-round")?.value || "1", 10),
      seatWind: parseInt(document.getElementById("wind-seat")?.value || "1", 10),
      hkFlowerCondition: document.getElementById("hk-flower-condition")?.value || "NO_FLOWERS",
      flowerCount: parseInt(document.getElementById("mcr-flowers-count")?.value || "0", 10),
      
      // Keep arrays separated cleanly so the recursive evaluator can parse them properly
      concealedLoose: loose,
      sets: this.handLayout.meldedSets,
      winningTile: this.handLayout.winningTile
    };
  }
};

window.HandOrganizer = HandOrganizer;
