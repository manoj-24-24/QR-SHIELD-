export default function ResultPanel({ result, onViewQr }) {
  if (!result) {
    return (
      <section className="result-panel empty-state">
        <h2>Ready to scan</h2>
        <p>Point the camera at a QR code or upload an image.</p>
      </section>
    );
  }

  const isSafe = result.status === "safe";
  const verdict = isSafe ? "Safe" : "Unsafe";
  const panelClass = isSafe ? "verdict-safe" : "verdict-unsafe";
  const isAppLink = /^(upi|whatsapp):\/\//i.test(result.value || "");
  const buttonLabel = isAppLink ? "Open in app" : "Open safe link";
  const actionText = isSafe
    ? result.canOpen
      ? "Safe to proceed after checking the displayed destination."
      : "No external opening action is needed."
    : "Opening is blocked because the QR does not match trusted rules.";

  function vibrate() {
    if ("vibrate" in navigator) navigator.vibrate(80);
  }

  function buildAndroidIntent(value) {
    if (!/^upi:\/\//i.test(value)) return "";
    return value.replace(/^upi:\/\//i, "intent://") + "#Intent;scheme=upi;end";
  }

  function openResult() {
    if (!result.canOpen || !isSafe) return;
    vibrate();

    if (isAppLink) {
      const anchor = document.createElement("a");
      anchor.href = result.value;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      const intentUrl = buildAndroidIntent(result.value);
      if (intentUrl) {
        window.setTimeout(() => {
          window.location.href = intentUrl;
        }, 700);
      }
      return;
    }

    window.open(result.value, "_blank", "noopener,noreferrer");
  }

  return (
    <section className={`result-panel ${panelClass}`} aria-live="polite">
      <div className="verdict-card">
        <span className="verdict-icon" aria-hidden="true">
          {isSafe ? "OK" : "!"}
        </span>
        <div>
          <p>{verdict}</p>
          <h2>{result.title}</h2>
        </div>
      </div>

      <p className="result-message">{result.message}</p>
      <div className="report-grid">
        <div>
          <span>Verdict</span>
          <strong>{verdict}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{result.type}</strong>
        </div>
        <div>
          <span>Action</span>
          <strong>{result.canOpen && isSafe ? "Allowed" : "Blocked"}</strong>
        </div>
      </div>
      <p className="report-note">{actionText}</p>
      {result.imageDataUrl && (
        <button type="button" className="photo-button" onClick={() => onViewQr?.(result)}>
          <img className="result-photo" src={result.imageDataUrl} alt="Scanned QR capture" />
          <span>View QR code</span>
        </button>
      )}
      <p className="result-value">{result.value || "No readable QR content"}</p>

      {result.details && (
        <dl className="details-grid">
          <div>
            <dt>Payee</dt>
            <dd>{result.details.payeeName || "Not shown"}</dd>
          </div>
          <div>
            <dt>UPI ID</dt>
            <dd>{result.details.payeeAddress || "Missing"}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{result.details.amount ? `${result.details.currency} ${result.details.amount}` : "Not fixed"}</dd>
          </div>
        </dl>
      )}

      <ul className="reason-list">
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <button type="button" className="open-button" disabled={!result.canOpen || !isSafe} onClick={openResult}>
        {isSafe && result.canOpen ? buttonLabel : "Opening blocked"}
      </button>
    </section>
  );
}
