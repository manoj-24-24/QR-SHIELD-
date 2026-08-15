import { useEffect, useMemo, useState } from "react";
import QrScanner from "./QrScanner.jsx";
import ResultPanel from "./ResultPanel.jsx";
import { assessQrContent } from "./qrSafety.js";

const HISTORY_KEY = "qr-shield-history";
const HISTORY_LIMIT = 6;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

export default function App() {
  const [result, setResult] = useState(null);
  const [manualValue, setManualValue] = useState("");
  const [history, setHistory] = useState(loadHistory);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);

  useEffect(() => {
    function handleInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  }, [history]);

  function assess(value, imageDataUrl = "") {
    const nextResult = { ...assessQrContent(value), imageDataUrl };
    setResult(nextResult);
    setHistory((items) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        value: nextResult.value || value || "Unreadable QR",
        status: nextResult.status,
        title: nextResult.title,
        imageDataUrl,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ].slice(0, HISTORY_LIMIT));
  }

  const counts = useMemo(
    () => ({
      safe: history.filter((item) => item.status === "safe").length,
      unsafe: history.filter((item) => item.status !== "safe").length,
    }),
    [history]
  );

  async function installApp() {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  const isInstalled =
    window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div>
          <p>QR Shield</p>
          <h1>Scan before you trust</h1>
        </div>
        <button type="button" className="install-button" onClick={installApp}>
          {isInstalled ? "Installed" : "Download app"}
        </button>
      </header>

      <section className="workspace">
        <div className="left-column">
          <section className="download-card">
            <div>
              <span>Scanner shortcut</span>
              <h2>QR Shield Scanner</h2>
              <p>{isInstalled ? "Installed and ready from your home screen." : "Download the scanner for quick access like a built-in QR tool."}</p>
            </div>
            <button type="button" onClick={installApp} disabled={isInstalled}>
              {isInstalled ? "Installed" : "Download app"}
            </button>
          </section>

          <QrScanner onScan={assess} />

          <form
            className="manual-check"
            onSubmit={(event) => {
              event.preventDefault();
              assess(manualValue);
            }}
          >
            <label htmlFor="manual-value">Manual check</label>
            <div>
              <input
                id="manual-value"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="Paste a URL, UPI QR text, or QR content"
              />
              <button type="submit">Check</button>
            </div>
          </form>
        </div>

        <div className="right-column">
          <ResultPanel result={result} onViewQr={setQrPreview} />

          <section className="history-panel">
            <div className="history-header">
              <h2>Recent scans</h2>
              <button type="button" onClick={() => setHistory([])} disabled={!history.length}>
                Clear
              </button>
            </div>

            <div className="scan-stats" aria-label="Scan summary">
              <span>{counts.safe} safe</span>
              <span>{counts.unsafe} unsafe</span>
            </div>

            {history.length ? (
              <ol className="history-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <span className={`dot status-${item.status}`} />
                    <button
                      className="history-item-main"
                      type="button"
                      onClick={() => setResult({ ...assessQrContent(item.value), imageDataUrl: item.imageDataUrl })}
                    >
                      {item.imageDataUrl && <img src={item.imageDataUrl} alt="" />}
                      <strong>{item.title}</strong>
                      <small>{item.value}</small>
                    </button>
                    {item.imageDataUrl && (
                      <button
                        type="button"
                        className="view-qr-button"
                        onClick={() => setQrPreview({ ...assessQrContent(item.value), imageDataUrl: item.imageDataUrl })}
                      >
                        View QR
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="history-empty">No scans yet.</p>
            )}
          </section>
        </div>
      </section>

      {qrPreview && (
        <div className="qr-modal" role="dialog" aria-modal="true" aria-label="Scanned QR code preview">
          <div className="qr-modal-content">
            <div className="qr-modal-header">
              <h2>Scanned QR</h2>
              <button type="button" onClick={() => setQrPreview(null)}>
                Close
              </button>
            </div>
            <img src={qrPreview.imageDataUrl} alt="Scanned QR code" />
            <p>{qrPreview.value}</p>
          </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="qr-modal" role="dialog" aria-modal="true" aria-label="Install QR Shield">
          <div className="qr-modal-content install-help">
            <div className="qr-modal-header">
              <h2>Download QR Shield</h2>
              <button type="button" onClick={() => setShowInstallHelp(false)}>
                Close
              </button>
            </div>
            <div className="install-steps">
              <div>
                <strong>Chrome or Samsung Internet</strong>
                <p>Open the browser menu and choose Add to Home screen or Install app.</p>
              </div>
              <div>
                <strong>Requirement</strong>
                <p>The app must run on HTTPS or a deployed Firebase URL for installation.</p>
              </div>
              <div>
                <strong>After install</strong>
                <p>Use the QR Shield Scanner icon from your home screen for quick scanning.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
