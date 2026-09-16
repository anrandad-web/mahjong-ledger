/**
 * cameraEngine.js - TensorFlow.js + MobileNet KNN Offline AI Edition
 */
const CameraEngine = {
  streamInstance: null,
  lastCapturedHand: null,
  
  // Neural Net Storage Buffers
  mobilenetModel: null,
  knnClassifier: null,
  isAiPrimed: false,

  // Async wrapper to load reference images cleanly
  loadImageAsset(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Block canvas context security halts
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`Failed loading asset: ${src}`));
      img.src = src;
    });
  },

  // 1. OFFLINE BRAIN INITIALIZER (Trains the model inside your browser memory)
  async initializeTemplateDatabase() {
    if (this.isAiPrimed) return true;

    if (!window.HandOrganizer || !window.HandOrganizer.tileRegistry || window.HandOrganizer.tileRegistry.length === 0) {
      console.warn("AI Engine Delay: Tile registry uninitialized.");
      return false;
    }

    console.log("TF.js Loading: Initializing MobileNet feature neural network layer...");
    customAlert("AI Initializing: Downloading lightweight model architecture...");
    
    // Load the pre-trained feature extractor models
    this.mobilenetModel = await mobilenet.load({ version: 1, alpha: 0.25 }); // 0.25 keeps it ultra-light for mobile
    this.knnClassifier = knnClassifier.create();

    console.log("TF.js Training: Passing your ref_img folder through the neural network...");
    customAlert("AI Training: Rasterizing your custom tile stencils...");

    for (let tile of window.HandOrganizer.tileRegistry) {
      try {
        // Map paths directly to your newly scanned PNGs
        const targetPath = "./" + tile.img.replace("image/", "ref_img/").replace(".svg", ".png");
        const visualAsset = await this.loadImageAsset(targetPath);
        
        // Pass image through TensorFlow tensors
        const tfActivation = tf.tidy(() => {
          const tfImg = tf.browser.fromPixels(visualAsset);
          // Resize precisely to MobileNet's expected input dimensions
          const resizedImg = tf.image.resizeBilinear(tfImg, [224, 224]);
          // Extract the high-level geometric feature descriptions
          return this.mobilenetModel.infer(resizedImg, 'conv_preds');
        });

        // Add this specific mathematical embedding signature to our local memory bank
        this.knnClassifier.addExample(tfActivation, tile.id);
        tfActivation.dispose(); // Instantly clean GPU/CPU memory leaks
      } catch (err) {
        console.error(`AI Training Error on item map [${tile.id}]:`, err);
      }
    }

    console.log("TF.js Sync Success: Neural memory bank successfully primed!");
    this.isAiPrimed = true;
    return true;
  },

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
    
    // Snip our data frames
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

  // 3. AI PREDICTION ENGINE (Evaluates camera frames via TensorFlow vector proximity)
  async executeTemplateMatching() {
    if (!this.isAiPrimed || !this.knnClassifier) {
      return customAlert("AI Error: Neural classifier layer is uninitialized.");
    }
    if (window.HandOrganizer) window.HandOrganizer.clearHand();

    const { topRow, bottomRow, dimensions } = this.lastCapturedHand;
    
    // Create temporary offscreen helper canvases to translate HTML ImageData blocks to Tensors smoothly
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    const approxWidth = Math.floor(dimensions.w / 7.0);

    const processRowAI = async (rowBlock, isTopRow) => {
      tempCanvas.width = rowBlock.width;
      tempCanvas.height = rowBlock.height;
      tempCtx.putImageData(rowBlock, 0, 0);

      let currentX = 0;
      let detectedTiles = [];

      while (currentX + approxWidth <= rowBlock.width) {
        // Slice an individual tile out from the horizontal canvas lane strip
        const tileSliceData = tempCtx.getImageData(currentX, 0, approxWidth, rowBlock.height);
        
        // Pass slice directly into the Machine Learning prediction brain
        const predictedId = tf.tidy(() => {
          const tfImg = tf.browser.fromPixels(tileSliceData);
          const resizedImg = tf.image.resizeBilinear(tfImg, [224, 224]);
          const embedding = this.mobilenetModel.infer(resizedImg, 'conv_preds');
          
          // KNN runs an instant spatial index check to find the closest match reference string key
          const prediction = this.knnClassifier.predictClass(embedding);
          return prediction.label;
        });

        if (predictedId) {
          detectedTiles.push(predictedId);
        }
        currentX += approxWidth;
      }

      // Sync successfully classified items back into your dashboard hand layout tracks
      detectedTiles.forEach((tileId, idx) => {
        let matchedObject = window.HandOrganizer.tileRegistry.find(t => t.id === tileId);
        if (!matchedObject) return;

        if (isTopRow) {
          window.HandOrganizer.handLayout.meldedSets.push({
            type: "pung",
            concealed: false,
            tiles: [ { ...matchedObject } ]
          });
        } else {
          let isFarRight = (idx === detectedTiles.length - 1);
          if (isFarRight) {
            window.HandOrganizer.handLayout.winningTile = { ...matchedObject };
          } else {
            window.HandOrganizer.handLayout.concealedTiles.push({ ...matchedObject });
          }
        }
      });
    };

    // Run both lane arrays concurrently
    await processRowAI(topRow, true);
    await processRowAI(bottomRow, false);

    window.HandOrganizer.refreshDOM();
    customAlert("AI Scanning Complete: TensorFlow Neural Network Sync Complete!");
  }
};
window.CameraEngine = CameraEngine;
