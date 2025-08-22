## CSP and Device Fingerprinting: Step-by-Step Guidance (DaySave)

This guide explains how your Content Security Policy (CSP) can affect device fingerprinting accuracy and what to change safely. It includes concrete steps, code edits, and validation procedures tailored to DaySave.

### Why CSP can reduce fingerprint completeness
- Strict CSP can block third‑party script loading, network beacons, Web Workers/AudioWorklets, and blob/data URLs used by some fingerprint techniques.
- Symptoms: FingerprintJS fails to initialize; fewer components collected (no canvas/audio/webgl); admin dashboard shows sparse or missing device details; DevTools shows CSP “Refused to connect/script” errors.

DaySave specifics:
- The login page loads FingerprintJS from `cdn.jsdelivr.net` and uses `/public/js/device-fingerprint.js`.
- Production CSP is enforced via Helmet in `middleware/security.js`.
- Development disables CSP (so issues are production-only).

---

### Step 1 — Inspect current behavior (non-invasive)
1. Open the login page in production/staging with DevTools → Console + Network.
2. Look for CSP violations such as “Refused to connect to … because it violates the document’s Content Security Policy”.
3. Note any blocked origins (script or XHR/fetch endpoints) and any blocked worker creation.

Reasoning: We only whitelist what’s actually needed. DevTools tells you exactly which origin and directive to adjust.

---

### Step 2 — (Optional) Temporarily enable CSP Report-Only to audit
You can flip CSP to report-only in production to collect violations without breaking functionality.

Edit `middleware/security.js` to allow toggling report-only via env var (example):

```js
// in securityHeaders() helmetConfig
contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
  directives: cspDirectives,
  reportOnly: process.env.CSP_REPORT_ONLY === 'true'
} : false,
```

Then deploy with `CSP_REPORT_ONLY=true` for one release, review console/server logs, and revert to strict mode.

Reasoning: Safe way to enumerate all missing allowlists before enforcing.

---

### Step 3 — Ensure script sources are allowed
DaySave currently uses FingerprintJS via jsDelivr, which is already allowed:
- `scriptSrc`: `'self'`, `https://cdn.jsdelivr.net`, plus Google Maps and jQuery.

Only needed if you switch loaders/providers:
- If using OpenFP CDN loader: add `https://openfpcdn.io` to `scriptSrc`.
- Do NOT add `'unsafe-inline'` for scripts. Keep external files per CSP rules.

Reasoning: FingerprintJS must load; loader host must be whitelisted.

---

### Step 4 — Allow workers for richer fingerprint data
Add Worker support to avoid silent feature drops in some browsers:

Edit `middleware/security.js` CSP directives to include:

```js
workerSrc: ["'self'", 'blob:']
```

Place it alongside existing directives in `cspDirectives`.

Reasoning: Some techniques rely on Web Workers/AudioWorklets; blocking workers can reduce signal quality.

---

### Step 5 — Keep blob/data URLs for canvas/audio
Already present in DaySave CSP:
- `imgSrc`: includes `data:` and `blob:`
- `mediaSrc`: includes `blob:`

Action: No change needed here. Verify via DevTools that canvas/audio previews aren’t blocked.

Reasoning: Canvas snapshots and audio buffers may use data/blob URLs.

---

### Step 6 — If using FingerprintJS Pro, allow its endpoints
If you upgrade to Pro, add its telemetry/API hosts to `connectSrc`:

Common additions:
- `https://metrics.fpjs.io`
- `https://api.fpjs.io` (or your region-specific endpoint per FingerprintJS docs)

Example `connectSrc` extension:

```js
connectSrc: [
  "'self'",
  'https://maps.googleapis.com',
  'https://maps.gstatic.com',
  // FingerprintJS Pro (only if used)
  'https://metrics.fpjs.io',
  'https://api.fpjs.io'
]
```

Reasoning: Without connect permissions, Pro beacons/XHRs are blocked, reducing accuracy.

---

### Step 7 — Validate thoroughly
1. Clear cache and reload the login page.
2. Confirm in Console: no CSP violations; FingerprintJS initializes; a visitorId is produced.
3. Check Network: `fp.min.js` (from jsDelivr) loads; if Pro, confirm calls to `metrics.fpjs.io`/`api.fpjs.io` succeed.
4. Verify admin fingerprinting dashboard shows rich `device_details` (canvas hash, audio hash, webgl info, display info). Fewer “Unknown” entries indicate better completeness.

Reasoning: Objective validation in both browser and UI.

---

### Step 8 — Keep CSP strong and compliant with project rules
- Do NOT add `'unsafe-inline'` for scripts. Keep using external JS files.
- Prefer origin allowlisting over wildcards.
- In development, CSP stays disabled in DaySave by design to avoid localhost HTTPS complications.

Reasoning: Maintains security posture while enabling necessary features.

---

### Minimal code edit summary (production)
Edit `middleware/security.js` and update `cspDirectives` with:

```js
workerSrc: ["'self'", 'blob:'],
// If using FingerprintJS Pro
// connectSrc: [...existing, 'https://metrics.fpjs.io', 'https://api.fpjs.io']
// If switching to OpenFP CDN loader
// scriptSrc: [...existing, 'https://openfpcdn.io']
```

These are no-inline, least-privilege changes that preserve CSP integrity and improve fingerprint completeness.

---

### Troubleshooting
- Seeing “Refused to connect … metrics.fpjs.io”: Add it to `connectSrc` or revert to open-source library without Pro endpoints.
- FingerprintJS undefined: Ensure `https://cdn.jsdelivr.net` remains in `scriptSrc` and that the login page includes the `<script>` tag before `/js/device-fingerprint.js`.
- Clipboard copy fails: Modern browsers require a secure context for `navigator.clipboard`. This is unrelated to CSP but may affect UI; fallback exists in code.

---

### Use cases
- Authentication: Client fingerprint sent with login attempts supports anomaly detection and risk scoring.
- Admin dashboard: Rich device details (canvas/audio/webgl/display) enable investigations and trust decisions.

---

### References
- Helmet CSP docs: `https://helmetjs.github.io/`
- FingerprintJS (open-source) via jsDelivr: `https://www.jsdelivr.com/package/npm/@fingerprintjs/fingerprintjs`
- FingerprintJS Pro CSP guidance: `https://dev.fingerprint.com/docs/csp`


