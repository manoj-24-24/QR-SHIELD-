const TRUSTED_BRANDS = [
  { name: "Google", domains: ["google.com", "google.co.in"] },
  { name: "Microsoft", domains: ["microsoft.com", "live.com", "office.com"] },
  { name: "Amazon", domains: ["amazon.com", "amazon.in"] },
  { name: "Meta", domains: ["facebook.com", "fb.com", "fb.me", "instagram.com", "threads.net", "messenger.com"] },
  { name: "Apple", domains: ["apple.com"] },
  { name: "HP", domains: ["hp.com"] },
  { name: "Samsung", domains: ["samsung.com", "smartthings.com", "samsungiot.com"] },
  { name: "TCL", domains: ["tcl.com", "tcl.com/in"] },
  { name: "LG", domains: ["lg.com"] },
  { name: "Sony", domains: ["sony.com", "playstation.com"] },
  { name: "Dell", domains: ["dell.com"] },
  { name: "Lenovo", domains: ["lenovo.com"] },
  { name: "Xiaomi", domains: ["mi.com", "xiaomi.com"] },
  { name: "OnePlus", domains: ["oneplus.com"] },
  { name: "Oppo", domains: ["oppo.com"] },
  { name: "Vivo", domains: ["vivo.com"] },
  { name: "Realme", domains: ["realme.com"] },
  { name: "Philips", domains: ["philips.com"] },
  { name: "Bosch", domains: ["bosch-home.in", "bosch.com"] },
  { name: "Whirlpool", domains: ["whirlpoolindia.com", "whirlpool.com"] },
  { name: "TP-Link", domains: ["tp-link.com", "tplinkcloud.com"] },
  { name: "Tuya Smart", domains: ["tuya.com", "tuyaus.com"] },
  { name: "Steam", domains: ["steampowered.com", "steamcommunity.com"] },
  { name: "Epic Games", domains: ["epicgames.com", "epicgames.dev"] },
  { name: "Xbox", domains: ["xbox.com"] },
  { name: "Nintendo", domains: ["nintendo.com"] },
  { name: "Garena", domains: ["garena.com"] },
  { name: "Roblox", domains: ["roblox.com"] },
  { name: "Discord", domains: ["discord.com", "discord.gg"] },
];

const GOVERNMENT_SUFFIXES = [".gov.in", ".nic.in", ".gov", ".edu", ".ac.in", ".org.in", ".bharat"];
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "shorturl.at", "rebrand.ly"];
const HIGH_RISK_WORDS = ["login", "verify", "bank", "password", "otp", "kyc", "update", "secure", "wallet", "reward", "free", "offer", "claim", "urgent"];
const RISKY_TLDS = [".zip", ".mov", ".click", ".top", ".xyz", ".tk", ".gq", ".cf"];
const ALLOWED_PROTOCOLS = ["https:", "upi:", "whatsapp:"];
const TRUSTED_UPI_HANDLES = [
  "paytm",
  "ptaxis",
  "ptyes",
  "pthdfc",
  "ybl",
  "ibl",
  "axl",
  "okaxis",
  "okbizaxis",
  "okhdfcbank",
  "okicici",
  "oksbi",
  "okbizicici",
  "okbizhdfc",
  "okbizsbi",
  "upi",
  "apl",
  "payu",
  "icici",
  "hdfcbank",
  "sbi",
  "axisbank",
];
const PAYMENT_DOMAINS = [
  { name: "Paytm", domains: ["paytm.com", "paytm.me"] },
  { name: "PhonePe", domains: ["phonepe.com"] },
  { name: "Google Pay", domains: ["pay.google.com", "gpay.app.goo.gl"] },
  { name: "BHIM", domains: ["bhimupi.org.in", "npci.org.in"] },
];

const SAFE_TEXT_PREFIXES = ["wifi:", "wpa:", "hotspot:"];

function normalizeInput(value) {
  return String(value || "").trim();
}

function parseWebUrl(value) {
  try {
    const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value);
    const looksLikeDomain = /(^localhost$)|(^localhost:\d+$)|(^(\w|-)+\.[^\s]{2,})/i.test(value);
    if (!hasProtocol && !looksLikeDomain) return null;

    const withProtocol = hasProtocol ? value : `https://${value}`;
    const url = new URL(withProtocol);
    if (!url.hostname || url.protocol === "upi:" || url.protocol === "whatsapp:") return null;
    return url;
  } catch {
    return null;
  }
}

function domainMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function parseUpi(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "upi:" || url.hostname !== "pay") return null;
    return {
      payeeAddress: url.searchParams.get("pa") || "",
      payeeName: url.searchParams.get("pn") || "",
      amount: url.searchParams.get("am") || "",
      currency: url.searchParams.get("cu") || "INR",
      note: url.searchParams.get("tn") || "",
    };
  } catch {
    return null;
  }
}

function getUpiHandle(payeeAddress) {
  return String(payeeAddress || "").split("@")[1]?.toLowerCase() || "";
}

function getTrustedPaymentDomain(hostname) {
  return PAYMENT_DOMAINS.find((provider) =>
    provider.domains.some((domain) => domainMatches(hostname, domain))
  );
}

function hasIpHost(hostname) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":");
}

function hasSuspiciousBrandAbuse(hostname) {
  const compact = hostname.replace(/[-.]/g, "");
  return TRUSTED_BRANDS.some((brand) => {
    const isOfficialDomain = brand.domains.some((domain) => domainMatches(hostname, domain));
    if (isOfficialDomain) return false;

    return brand.domains.some((domain) => {
      const brandRoot = domain.split(".")[0];
      return compact.includes(brandRoot);
    });
  });
}

export function assessQrContent(rawValue) {
  const value = normalizeInput(rawValue);
  const lower = value.toLowerCase();

  if (!value) {
    return {
      status: "danger",
      type: "empty",
      value,
      title: "Empty QR",
      message: "No readable content was found.",
      reasons: ["The scanner returned blank content."],
      canOpen: false,
    };
  }

  if (SAFE_TEXT_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return {
      status: "safe",
      type: "network",
      value,
      title: "Wi-Fi or Hotspot QR",
      message: "This QR contains network connection details.",
      reasons: ["Recognized Wi-Fi/hotspot QR format."],
      canOpen: false,
    };
  }

  if (lower.startsWith("upi://pay")) {
    const details = parseUpi(value);
    const handle = getUpiHandle(details?.payeeAddress);
    const isTrustedPaymentHandle = TRUSTED_UPI_HANDLES.includes(handle);
    const hasMerchantName = Boolean(details?.payeeName && details.payeeName.length >= 2);
    const reasons = [];

    if (!details?.payeeAddress) reasons.push("Missing UPI payee address.");
    if (details?.payeeAddress && !isTrustedPaymentHandle) reasons.push("Unknown UPI payment handle.");
    if (!hasMerchantName) reasons.push("Missing payee name. Confirm before paying.");
    if (isTrustedPaymentHandle) reasons.push(`Trusted UPI handle detected: @${handle}`);
    if (hasMerchantName) reasons.push(`Payee name shown: ${details.payeeName}`);

    const isTrustedUpi = details?.payeeAddress && isTrustedPaymentHandle;

    return {
      status: isTrustedUpi ? "safe" : "danger",
      type: "payment",
      value,
      title: isTrustedUpi
        ? "Trusted UPI Payment QR"
        : !hasMerchantName
          ? "Possible Swapped Payment QR"
          : "Unsafe Payment QR",
      message:
        isTrustedUpi
          ? "Known UPI payment handle detected. Still match the payee name with the shop before paying."
          : "Payment QR details are incomplete or not trusted.",
      reasons,
      details,
      canOpen: Boolean(details?.payeeAddress && isTrustedPaymentHandle && hasMerchantName),
    };
  }

  if (lower.startsWith("whatsapp://")) {
    return {
      status: "safe",
      type: "login",
      value,
      title: "WhatsApp QR",
      message: "Looks like a WhatsApp-related QR.",
      reasons: ["Known WhatsApp URL pattern detected."],
      canOpen: true,
    };
  }

  const url = parseWebUrl(value);
  if (!url) {
    return {
      status: "safe",
      type: "text",
      value,
      title: "Plain Text QR",
      message: "This QR does not appear to open a website.",
      reasons: ["No web URL pattern detected."],
      canOpen: false,
    };
  }

  const hostname = url.hostname.toLowerCase();
  const trustedPaymentDomain = getTrustedPaymentDomain(hostname);
  if (trustedPaymentDomain && url.protocol === "https:") {
    return {
      status: "safe",
      type: "payment",
      value: url.href,
      title: `${trustedPaymentDomain.name} Payment Link`,
      message: "The payment link belongs to a known payment provider.",
      reasons: [`Matched trusted payment domain: ${hostname}`],
      canOpen: true,
    };
  }

  if (["wa.me", "whatsapp.com", "web.whatsapp.com"].some((domain) => domainMatches(hostname, domain))) {
    return {
      status: "safe",
      type: "login",
      value: url.href,
      title: "WhatsApp QR",
      message: "Looks like a WhatsApp-related QR.",
      reasons: [`Matched WhatsApp domain: ${hostname}`],
      canOpen: true,
    };
  }

  const trustedBrand = TRUSTED_BRANDS.find((brand) =>
    brand.domains.some((domain) => domainMatches(hostname, domain))
  );
  const isGovernment = GOVERNMENT_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

  if (trustedBrand && url.protocol === "https:") {
    return {
      status: "safe",
      type: "brand",
      value: url.href,
      title: `${trustedBrand.name} Official Link`,
      message: "The domain matches a known trusted brand.",
      reasons: [`Matched trusted domain: ${hostname}`],
      canOpen: true,
    };
  }

  if (isGovernment && url.protocol === "https:") {
    return {
      status: "safe",
      type: "government",
      value: url.href,
      title: "Government or Education Link",
      message: "The domain matches a recognized public-sector suffix.",
      reasons: [`Matched domain suffix: ${hostname}`],
      canOpen: true,
    };
  }

  const reasons = [];
  let score = 0;

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    score += 5;
    reasons.push(`Unsafe protocol: ${url.protocol}`);
  }

  if (url.protocol !== "https:") {
    score += 2;
    reasons.push("The link does not use HTTPS.");
  }

  if (SHORTENERS.some((domain) => domainMatches(hostname, domain))) {
    score += 3;
    reasons.push("Shortened link detected. The final destination is hidden.");
  }

  if (hasIpHost(hostname)) {
    score += 3;
    reasons.push("The link uses an IP address instead of a normal domain.");
  }

  if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
    score += 3;
    reasons.push("The domain uses punycode, which can hide lookalike characters.");
  }

  if (RISKY_TLDS.some((suffix) => hostname.endsWith(suffix))) {
    score += 2;
    reasons.push("The domain uses a commonly abused top-level domain.");
  }

  if (HIGH_RISK_WORDS.some((word) => lower.includes(word))) {
    score += 2;
    reasons.push("The QR text contains sensitive or scam-like words.");
  }

  if (hasSuspiciousBrandAbuse(hostname)) {
    score += 4;
    reasons.push("The domain appears to imitate a trusted brand.");
  }

  if (score >= 5) {
    return {
      status: "danger",
      type: "url",
      value: url.href,
      title: "High-Risk Link",
      message: "Do not open this link unless you fully trust the source.",
      reasons,
      canOpen: false,
    };
  }

  if (score > 0) {
    return {
      status: "danger",
      type: "url",
      value: url.href,
      title: "Unsafe Suspicious Link",
      message: "This link has suspicious signs and should not be opened.",
      reasons,
      canOpen: false,
    };
  }

  return {
    status: "danger",
    type: "url",
    value: url.href,
    title: "Unsafe Unknown Link",
    message: "This link is not in the trusted government, payment, or company list.",
    reasons: ["Unknown domain.", "Production apps should verify this with a backend reputation database."],
    canOpen: false,
  };
}
