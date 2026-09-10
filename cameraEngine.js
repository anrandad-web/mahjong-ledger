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
    canvas.width = 64; 
    canvas.height = 84;
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
  
  // Stabilized Part 3: Noise-Filtered Hybrid Contour & Distance-Gated ORB Matcher
  async executeTemplateMatching() {
    console.log("Noise-Filtered AI template matching loop entered.");
    
    if (!window.cv || typeof window.cv.Mat !== "function") {
      return customAlert("AI Engine Error: OpenCV layer unavailable.");
    }
    if (!this.lastCapturedHand) {
      return customAlert("Error: Capture memory layer empty.");
    }
    if (window.HandOrganizer) window.HandOrganizer.clearHand();

    const { topRow, bottomRow, dimensions } = this.lastCapturedHand;
    
    setTimeout(() => {
      try {
        let topMatSrc = window.cv.matFromImageData(topRow);
        let bottomMatSrc = window.cv.matFromImageData(bottomRow);
        
        let processedRows = [
          { mat: topMatSrc, isTopRow: true },
          { mat: bottomMatSrc, isTopRow: false }
        ];

        processedRows.forEach(rowObj => {
          let gray = new window.cv.Mat();
          let thresh = new window.cv.Mat();
          window.cv.cvtColor(rowObj.mat, gray, window.cv.COLOR_RGBA2GRAY);
          
          // Clean thresholding tailored exactly to isolate distinct characters cleanly
          window.cv.threshold(gray, thresh, 120, 255, window.cv.THRESH_BINARY_INV);
          
          let contours = new window.cv.MatVector();
          let hierarchy = new window.cv.Mat();
          window.cv.findContours(thresh, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);
          
          let detectedTilesInRow = [];
          for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let rect = window.cv.boundingRect(cnt);
            let area = rect.width * rect.height;
            
            // Tighter dimensions barrier to filter out table reflections and noise blocks
            if (rect.width > 30 && rect.height > 45 && area > 1500 && area < 25000) {
              detectedTilesInRow.push({ rect: rect, contour: cnt });
            }
          }
          
          // Sort layout left-to-right across your dashboard workbench tracking line
          detectedTilesInRow.sort((a, b) => a.rect.x - b.rect.x);
          
          detectedTilesInRow.forEach((tileObj, tIdx) => {
            let croppedTile = thresh.roi(tileObj.rect);
            let matchFound = false;
            let bestMatchId = null;
            
            // 1. STABILIZED BLOB GEOMETRY ANALYSIS (Tongs & Suos)
            let internalContours = new window.cv.MatVector();
            let intHierarchy = new window.cv.Mat();
            window.cv.findContours(croppedTile, internalContours, intHierarchy, window.cv.RETR_TREE, window.cv.CHAIN_APPROX_SIMPLE);
            
            let circleCount = 0;
            let barCount = 0;
            
            for (let j = 0; j < internalContours.size(); ++j) {
              let c = internalContours.get(j);
              let r = window.cv.boundingRect(c);
              let aspect = r.width / r.height;
              let innerArea = r.width * r.height;
              
              // Tighter geometric shape gates to prevent background patterns from breaking layout
              if (aspect >= 0.85 && aspect <= 1.15 && r.width > 8 && innerArea > 60) circleCount++;
              if (aspect >= 0.15 && aspect <= 0.35 && r.height > 15) barCount++;
            }
            
            if (circleCount >= 1 && circleCount <= 9) {
              bestMatchId = `T_TONG_${circleCount}`;
              matchFound = true;
            } else if (barCount >= 1 && barCount <= 9) {
              bestMatchId = `T_SUO_${barCount}`;
              matchFound = true;
            }
            
            // 2. ROBUST GATED FEATURE FILTER ENGINE (Wans, Winds, Dragons)
            if (!matchFound) {
              let highestValidMatches = 0;
              
              let orb = new window.cv.ORB();
              let kp1 = new window.cv.KeyPointVector();
              let desc1 = new window.cv.Mat();
              orb.detectAndCompute(croppedTile, new window.cv.Mat(), kp1, desc1);
              
              for (let tileId in this.tilePixelTemplates) {
                if (tileId.includes("TONG") || tileId.includes("SUO")) continue;
                
                let templateMat = this.tilePixelTemplates[tileId];
                let kp2 = new window.cv.KeyPointVector();
                let desc2 = new window.cv.Mat();
                orb.detectAndCompute(templateMat, new window.cv.Mat(), kp2, desc2);
                
                if (!desc1.empty() && !desc2.empty()) {
                  let matcher = new window.cv.BFMatcher(window.cv.NORM_HAMMING, false);
                  let matches = new window.cv.DMatchVectorVector();
                  
                  // Run a k-Nearest Neighbor query to implement an elite distance validation check
                  matcher.knnMatch(desc1, desc2, matches, 2);
                  let strictGoodCount = 0;
                  
                  for (let k = 0; k < matches.size(); ++k) {
                    let matchPair = matches.get(k);
                    if (matchPair.size() >= 2) {
                      let m1 = matchPair.get(0);
                      let m2 = matchPair.get(1);
                      // Lowe's Ratio Filter: Only count it if the match is distinctly clear
                      if (m1.distance < 0.75 * m2.distance) {
                        strictGoodCount++;
                      }
                    }
                  }
                  
                  // Requires a minimum threshold of 6 strong, clear matching structural layout traits
                  if (strictGoodCount > highestValidMatches && strictGoodCount >= 6) {
                    highestValidMatches = strictGoodCount;
                    bestMatchId = tileId;
                  }
                  matcher.delete(); matches.delete();
                }
                kp2.delete(); desc2.delete();
              }
              kp1.delete(); desc1.delete(); orb.delete();
            }
            
            // 3. SECURE SEAT STATE ROW INJECTION
            if (bestMatchId) {
              let matchedObject = window.HandOrganizer.tileRegistry.find(t => t.id === bestMatchId);
              if (matchedObject) {
                if (rowObj.isTopRow) {
                  window.HandOrganizer.handLayout.meldedSets.push({
                    type: "pung",
                    concealed: false,
                    tiles: [ { ...matchedObject } ]
                  });
                } else {
                  let isFarRight = (tIdx === detectedTilesInRow.length - 1);
                  if (isFarRight) {
                    window.HandOrganizer.handLayout.winningTile = { ...matchedObject };
                  } else {
                    window.HandOrganizer.handLayout.concealedTiles.push({ ...matchedObject });
                  }
                }
              }
            }
            
            croppedTile.delete();
            internalContours.delete();
            intHierarchy.delete();
          });
          
          gray.delete(); thresh.delete(); contours.delete(); hierarchy.delete();
        });

        topMatSrc.delete(); bottomMatSrc.delete();
        window.HandOrganizer.refreshDOM();
        customAlert("AI Scanner processing complete!");
      } catch (err) {
        console.error("AI dynamic analysis block failed: ", err);
      }
    }, 150);
  }
};
window.CameraEngine = CameraEngine;
