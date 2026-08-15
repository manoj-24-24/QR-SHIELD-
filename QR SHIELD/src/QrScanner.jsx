import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QrScanner({ onScan }) {
  const [cameraError, setCameraError] = useState("");
  const [scanHint, setScanHint] = useState("Align the QR code inside the square.");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [scanMode, setScanMode] = useState("far");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(0);
  const lastScanRef = useRef("");
  const isScanningRef = useRef(false);
  const cameraActiveRef = useRef(false);

  useEffect(() => {
    if (!isCameraOn) {
      stopCamera();
      return undefined;
    }

    let cancelled = false;
    cameraActiveRef.current = true;

    async function startCamera() {
      try {
        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: scanMode === "far" ? 2560 : 1280 },
            height: { ideal: scanMode === "far" ? 1440 : 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (!videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        await improveCameraFocus(stream);
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (cameraActiveRef.current) scanNextFrame();
      } catch (error) {
        setCameraError(
          error?.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow camera access and try again."
            : "Camera is unavailable. You can still upload a QR image."
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isCameraOn, scanMode]);

  function stopCamera() {
    cameraActiveRef.current = false;
    window.clearTimeout(scanTimerRef.current);
    isScanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function improveCameraFocus(stream) {
    const [track] = stream.getVideoTracks();
    if (!track?.getCapabilities) return;

    try {
      const capabilities = track.getCapabilities();
      const advanced = [];

      if (capabilities.focusMode?.includes("continuous")) {
        advanced.push({ focusMode: "continuous" });
      }

      if (capabilities.exposureMode?.includes("continuous")) {
        advanced.push({ exposureMode: "continuous" });
      }

      if (capabilities.zoom?.max && capabilities.zoom.max > 1) {
        advanced.push({ zoom: Math.min(capabilities.zoom.max, scanMode === "far" ? 2 : 1.2) });
      }

      if (advanced.length) await track.applyConstraints({ advanced });
    } catch {
      // Camera tuning is optional; scanning still works without it.
    }
  }

  function vibrateOnScan() {
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
      window.setTimeout(() => navigator.vibrate([180, 70, 180, 70, 260]), 30);
      return true;
    }
    return false;
  }

  function captureSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return "";
    return canvas.toDataURL("image/jpeg", 0.62);
  }

  function emitScan(value, imageDataUrl = "") {
    const text = String(value || "").trim();
    if (!text || text === lastScanRef.current) return;
    lastScanRef.current = text;
    setScanHint("QR code read successfully.");
    vibrateOnScan();
    onScan(text, imageDataUrl || captureSnapshot());
  }

  async function detectWithBarcodeDetector(video) {
    if (!("BarcodeDetector" in window)) return "";

    try {
      if (!detectorRef.current) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      }
      const codes = await detectorRef.current.detect(video);
      return codes[0]?.rawValue || "";
    } catch {
      return "";
    }
  }

  function decodeCanvas(canvas, context, sourceLabel) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (result?.data) {
      setScanHint(`QR detected from ${sourceLabel}.`);
      return result.data;
    }

    return "";
  }

  function drawVideoToMainCanvas(video) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context || !video.videoWidth || !video.videoHeight) return null;

    const scale = Math.min(1, 1440 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return { canvas, context };
  }

  function detectWithJsQr(video) {
    const frame = drawVideoToMainCanvas(video);
    if (!frame) return "";

    const { canvas, context } = frame;
    const fullResult = decodeCanvas(canvas, context, "camera");
    if (fullResult) return fullResult;

    const cropCanvas = cropCanvasRef.current || document.createElement("canvas");
    const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
    const cropRatios = scanMode === "far" ? [0.9, 0.72, 0.5, 0.34] : [0.8, 0.6];

    for (const ratio of cropRatios) {
      const sourceSize = Math.floor(Math.min(canvas.width, canvas.height) * ratio);
      const x = Math.floor((canvas.width - sourceSize) / 2);
      const y = Math.floor((canvas.height - sourceSize) / 2);
      const targetSize = Math.max(sourceSize, 900);
      cropCanvas.width = targetSize;
      cropCanvas.height = targetSize;
      cropContext.imageSmoothingEnabled = false;
      cropContext.drawImage(canvas, x, y, sourceSize, sourceSize, 0, 0, targetSize, targetSize);

      const result = decodeCanvas(cropCanvas, cropContext, `center ${Math.round(ratio * 100)}%`);
      if (result) return result;
    }

    return "";
  }

  async function scanFrame() {
    if (!cameraActiveRef.current) return;
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      isScanningRef.current = false;
      if (cameraActiveRef.current) scanNextFrame();
      return;
    }

    const barcodeResult = await detectWithBarcodeDetector(video);
    if (!cameraActiveRef.current) {
      isScanningRef.current = false;
      return;
    }

    if (barcodeResult) drawVideoToMainCanvas(video);
    const decodedText = barcodeResult || detectWithJsQr(video);

    if (decodedText) emitScan(decodedText);

    isScanningRef.current = false;
    if (cameraActiveRef.current) scanNextFrame();
  }

  function scanNextFrame() {
    if (!cameraActiveRef.current) return;
    window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = window.setTimeout(scanFrame, 220);
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current || document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (result?.data) {
        emitScan(result.data, canvas.toDataURL("image/jpeg", 0.72));
      } else {
        setScanHint("Could not read a QR code from that image. Try a clearer image.");
      }

      URL.revokeObjectURL(image.src);
      event.target.value = "";
    };
    image.src = URL.createObjectURL(file);
  }

  return (
    <section className="scan-panel" aria-label="QR scanner">
      <div className="scanner-frame">
        {isCameraOn ? (
          <video ref={videoRef} autoPlay muted playsInline aria-label="Camera preview" />
        ) : (
          <div className="camera-paused">Camera paused</div>
        )}
        <div className="scan-corners" aria-hidden="true" />
      </div>
      <canvas ref={canvasRef} className="scan-canvas" aria-hidden="true" />
      <canvas ref={cropCanvasRef} className="scan-canvas" aria-hidden="true" />

      <p className="scan-hint">{scanHint}</p>
      {cameraError && <p className="error-text">{cameraError}</p>}

      <div className="scanner-actions">
        <button type="button" onClick={() => setIsCameraOn((value) => !value)}>
          {isCameraOn ? "Pause" : "Resume"}
        </button>
        <button type="button" onClick={() => setScanMode((value) => (value === "far" ? "near" : "far"))}>
          {scanMode === "far" ? "Far scan" : "Near scan"}
        </button>
        <label className="file-button">
          Upload QR
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </label>
      </div>
    </section>
  );
}
