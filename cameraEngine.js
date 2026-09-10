/**
 * cameraEngine.js - Part 1: Monochrome Silhouette Stencil Database Cacher (Path Fixed)
 */
const CameraEngine = {
  streamInstance: null,
  tilePixelTemplates: {}, // Holds binary mask matrices for shape matching
  lastCapturedHand: null,

  // Asynchronous wrapper utility to safely load local template PNG assets
  loadImageAsset(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`Failed loading asset path: ${src}`));
      img.src = src;
    });
  },

  async initializeTemplateDatabase() {
    const currentCachedCount = Object.keys(this.tilePixelTemplates).length;
    if (currentCachedCount >= 34) {
      console.log(`AI Engine: Database is already primed with ${currentCachedCount} cached tiles.`);
      return true;
    }

    if (!window.HandOrganizer || !window.HandOrganizer.tileRegistry || window.HandOrganizer.tileRegistry.length === 0) {
      console.warn("AI Engine Delay: HandOrganizer tile registry is empty or uninitialized.");
      return false;
    }

    console.log("AI Scanner: Initiating shape-grounded monochrome rasterization matrix...");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = 128; 
    canvas.height = 128;
    let loadedCount = 0;

    for (let tile of window.HandOrganizer.tileRegistry) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        // FIXED PATH MAPPING LOGIC:
        // Converts "image/wan1.svg" directly into "./ref_img/wan1.png" to match your exact filenames perfectly!
        const targetPath = "./" + tile.img.replace("image/", "ref_img/").replace(".svg", ".png");
        const visualAsset = await this.loadImageAsset(targetPath);

        // Draw pristine square reference image into memory
        ctx.drawImage(visualAsset, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (window.cv && window.cv.matFromImageData) {
          let srcMat = window.cv.matFromImageData(imgData);
          let grayMat = new window.cv.Mat();
          let binaryMat = new window.cv.Mat();

          // 1. Flatten into grayscale channel
          window.cv.cvtColor(srcMat, grayMat, window.cv.COLOR_RGBA2GRAY);
          
          // 2. Invert threshold to cleanly isolate the black shapes on the white background
          window.cv.threshold(grayMat, binaryMat, 128, 255, window.cv.THRESH_BINARY_INV);

          if (this.tilePixelTemplates[tile.id]) {
            this.tilePixelTemplates[tile.id].delete();
          }

          this.tilePixelTemplates[tile.id] = binaryMat;
          srcMat.delete();
          grayMat.delete();
          loadedCount++;
        }
      } catch (assetException) {
        console.error("AI Database Rasterization Error on item mapping:", tile.id, assetException);
      }
    }

    console.log(`AI Database Sync Success: Primed [${loadedCount} / 34] stencils!`);
    return loadedCount >= 34;
  },
  /**
   * cameraEngine.js - Part 2: Hardware Control & Image Frame Slicer
   */
  async openCameraScanner() {
    const scannerScreen = document.getElementById("camera-scanner-screen");
    const videoFeed = document.getElementById("camera-stream-feed");
    if (!scannerScreen || !videoFeed) return;

    await this.initializeTemplateDatabase();

    scannerScreen.style.display = "flex";
    try {
      const constraints = {
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };
      this.streamInstance = await navigator.mediaDevices.getUserMedia(constraints);
      videoFeed.srcObject = this.streamInstance;
    } catch (err) {
      console.error("Camera access rejected:", err);
      scannerScreen.style.display = "none";
      customAlert("Hardware Access Error: Could not establish camera stream.");
    }
  },

  closeCameraScanner() {
    const scannerScreen = document.getElementById("camera-scanner-screen");
    const videoFeed = document.getElementById("camera-stream-feed");
    if (scannerScreen) scannerScreen.style.display = "none";
    if (this.streamInstance) {
      this.streamInstance.getTracks().forEach(track => track.stop());
      this.streamInstance = null;
    }
    if (videoFeed) videoFeed.srcObject = null;
  },

  captureSnapshotFrame() {
    const videoFeed = document.getElementById("camera-stream-feed");
    const processingCanvas = document.getElementById("camera-processing-canvas");
    if (!videoFeed || !processingCanvas) return;

    const ctx = processingCanvas.getContext("2d");
    const width = videoFeed.videoWidth || 1280;
    const height = videoFeed.videoHeight || 720;

    processingCanvas.width = width;
    processingCanvas.height = height;
    ctx.drawImage(videoFeed, 0, 0, width, height);

    const boxWidth = Math.floor(width * 0.90);
    const boxHeight = Math.floor(height * 0.60);
    const startX = Math.floor((width - boxWidth) / 2);
    const startY = Math.floor((height - boxHeight) / 2);
    const rowHeight = Math.floor(boxHeight / 2);

    const topRowImageBlock = ctx.getImageData(startX, startY, boxWidth, rowHeight);
    const bottomRowImageBlock = ctx.getImageData(startX, startY + rowHeight, boxWidth, rowHeight);
    
    this.closeCameraScanner();

    this.lastCapturedHand = {
      topRow: topRowImageBlock,
      bottomRow: bottomRowImageBlock,
      dimensions: { w: boxWidth, h: rowHeight }
    };
    
    this.executeTemplateMatching();
  },
  /**
   * cameraEngine.js - Part 3: Dual-Row OpenCV Threshold Shape Matcher
   */
  async executeTemplateMatching() {
    if (!window.cv || typeof window.cv.Mat !== "function") {
      return customAlert("AI Engine Error: OpenCV compilation layer unavailable.");
    }
    if (!this.lastCapturedHand) {
      return customAlert("Error: Image memory layer empty.");
    }

    const templatesList = Object.keys(this.tilePixelTemplates);
    if (templatesList.length === 0) {
      return customAlert("AI Error: Template database is empty.");
    }

    customAlert("AI Scanner active: Comparing tile shapes...");
    if (window.HandOrganizer) window.HandOrganizer.clearHand();

    const { topRow, bottomRow, dimensions } = this.lastCapturedHand;

    setTimeout(() => {
      try {
        let topMatSrc = window.cv.matFromImageData(topRow);
        let bottomMatSrc = window.cv.matFromImageData(bottomRow);
        let topMatGray = new window.cv.Mat();
        let bottomMatGray = new window.cv.Mat();
        let topMatBin = new window.cv.Mat();
        let bottomMatBin = new window.cv.Mat();

        window.cv.cvtColor(topMatSrc, topMatGray, window.cv.COLOR_RGBA2GRAY);
        window.cv.cvtColor(bottomMatSrc, bottomMatGray, window.cv.COLOR_RGBA2GRAY);

        // Turn live camera slices into clean B&W shapes to eliminate reflections/shadows
        window.cv.threshold(topMatGray, topMatBin, 120, 255, window.cv.THRESH_BINARY_INV);
        window.cv.threshold(bottomMatGray, bottomMatBin, 120, 255, window.cv.THRESH_BINARY_INV);

        const approximateTileWidth = Math.floor(dimensions.w / 7.5);
        const templateScaleFactor = 0.90; // Scales the 128x128 stencil to fit the character footprint area properly

        // --- SCAN TOP ROW ---
        let currentX_Top = 0;
        let detectedTopTiles = [];
        while (currentX_Top + approximateTileWidth <= dimensions.w) {
          let rect = new window.cv.Rect(currentX_Top, 0, approximateTileWidth, dimensions.h);
          let croppedTileMat = topMatBin.roi(rect);
          let highestMatchScore = -1;
          let bestMatchedTileObject = null;

          for (let tileId in this.tilePixelTemplates) {
            let templateMat = this.tilePixelTemplates[tileId];
            let resizedTemplate = new window.cv.Mat();
            let targetSizeVal = Math.floor(approximateTileWidth * templateScaleFactor);
            let targetSize = new window.cv.Size(targetSizeVal, targetSizeVal);
            
            window.cv.resize(templateMat, resizedTemplate, targetSize, 0, 0, window.cv.INTER_LINEAR);
            let matchResult = new window.cv.Mat();
            window.cv.matchTemplate(croppedTileMat, resizedTemplate, matchResult, window.cv.TM_CCOEFF_NORMED);

            let minMax = window.cv.minMaxLoc(matchResult);
            if (minMax.maxVal > highestMatchScore) {
              highestMatchScore = minMax.maxVal;
              bestMatchedTileObject = window.HandOrganizer.tileRegistry.find(t => t.id === tileId);
            }
            resizedTemplate.delete();
            matchResult.delete();
          }

          if (bestMatchedTileObject && highestMatchScore > 0.50) {
            detectedTopTiles.push({ ...bestMatchedTileObject });
          }
          croppedTileMat.delete();
          currentX_Top += approximateTileWidth;
        }

        // Tally up open melds and flowers
        let flowerCountDetected = 0;
        detectedTopTiles.forEach(tile => {
          if (tile.pool === "FLOWER" || tile.pool === "SEASON") {
            flowerCountDetected++;
          } else {
            window.HandOrganizer.handLayout.meldedSets.push({ type: "pung", concealed: false, tiles: [ { ...tile } ] });
          }
        });

        // Sync Flower Select Elements
        const hkFlowerSelect = document.getElementById("hk-flower-condition");
        const mcrFlowerSelect = document.getElementById("mcr-flowers-count");
        if (flowerCountDetected > 0) {
          if (mcrFlowerSelect) mcrFlowerSelect.value = Math.min(flowerCountDetected, 8).toString();
          if (hkFlowerSelect) {
            if (flowerCountDetected >= 8) hkFlowerSelect.value = "COMPLETE_EIGHT";
            else if (flowerCountDetected >= 4) hkFlowerSelect.value = "ALL_FLOWERS";
            else if (flowerCountDetected >= 2) hkFlowerSelect.value = "TWO_MATCH";
            else hkFlowerSelect.value = "ONE_MATCH";
          }
        }

        // --- SCAN BOTTOM ROW ---
        let currentX_Bot = 0;
        let looseTilesStaging = [];
        while (currentX_Bot + approximateTileWidth <= dimensions.w) {
          let isFarRightTile = (currentX_Bot + (approximateTileWidth * 1.5) > dimensions.w);
          let rect = new window.cv.Rect(currentX_Bot, 0, approximateTileWidth, dimensions.h);
          let croppedTileMat = bottomMatBin.roi(rect);
          let highestMatchScore = -1;
          let bestMatchedTileObject = null;

          for (let tileId in this.tilePixelTemplates) {
            let templateMat = this.tilePixelTemplates[tileId];
            let resizedTemplate = new window.cv.Mat();
            let targetSizeVal = Math.floor(approximateTileWidth * templateScaleFactor);
            let targetSize = new window.cv.Size(targetSizeVal, targetSizeVal);
            
            window.cv.resize(templateMat, resizedTemplate, targetSize, 0, 0, window.cv.INTER_LINEAR);
            let matchResult = new window.cv.Mat();
            window.cv.matchTemplate(croppedTileMat, resizedTemplate, matchResult, window.cv.TM_CCOEFF_NORMED);

            let minMax = window.cv.minMaxLoc(matchResult);
            if (minMax.maxVal > highestMatchScore) {
              highestMatchScore = minMax.maxVal;
              bestMatchedTileObject = window.HandOrganizer.tileRegistry.find(t => t.id === tileId);
            }
            resizedTemplate.delete();
            matchResult.delete();
          }

          if (bestMatchedTileObject && highestMatchScore > 0.50) {
            if (isFarRightTile) {
              window.HandOrganizer.handLayout.winningTile = { ...bestMatchedTileObject };
            } else {
              looseTilesStaging.push({ ...bestMatchedTileObject });
            }
          }
          croppedTileMat.delete();
          currentX_Bot += approximateTileWidth;
        }

        window.HandOrganizer.handLayout.concealedTiles = looseTilesStaging;

        // Cleanup Mat Memory Layers
        topMatSrc.delete(); bottomMatSrc.delete();
        topMatGray.delete(); bottomMatGray.delete();
        topMatBin.delete(); bottomMatBin.delete();

        window.HandOrganizer.refreshDOM();
        customAlert(`AI Scanning Complete! Dashboard updated cleanly.`);
      } catch (opencvError) {
        console.error("OpenCV execution crash:", opencvError);
        customAlert("AI Scanner Failed. Check alignment or room lighting levels.");
      }
    }, 150);
  }
};
window.CameraEngine = CameraEngine;
