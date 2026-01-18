<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Page Not Found • Vicinity IMS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#4a5a67; font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        .card { position:relative; max-width:480px; width:100%; background:#fcfaf9; border-radius:28px; padding:40px 32px; box-shadow:0 24px 60px rgba(15,23,42,0.45); overflow:hidden; }
        .badge { font-size:10px; font-weight:900; letter-spacing:0.3em; text-transform:uppercase; color:#9ca3af; margin-bottom:12px; }
        .title { font-size:28px; font-weight:900; color:#4a5a67; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:8px; }
        .subtitle { font-size:13px; color:#6b7280; margin-bottom:24px; line-height:1.5; }
        .pill { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; background:#111827; color:#f9fafb; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.2em; margin-bottom:24px; }
        .pill-dot { width:8px; height:8px; border-radius:999px; background:#ef4444; box-shadow:0 0 0 4px rgba(239,68,68,0.18); }
        .meta-row { display:flex; justify-content:space-between; font-size:11px; color:#6b7280; margin-bottom:20px; }
        .meta-label { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#9ca3af; margin-bottom:4px; }
        .meta-value { font-weight:700; color:#4b5563; }
        .actions { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
        .btn-primary { display:inline-flex; justify-content:center; align-items:center; gap:8px; width:100%; padding:12px 16px; border-radius:999px; border:none; background:#fcfaf9; color:#111827; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.25em; cursor:pointer; box-shadow:0 18px 36px rgba(15,23,42,0.22); }
        .btn-secondary { display:inline-flex; justify-content:center; align-items:center; width:100%; padding:11px 16px; border-radius:999px; border:1px solid rgba(156,163,175,0.4); background:transparent; color:#e5e7eb; font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; cursor:pointer; }
        .tag { display:inline-flex; align-items:center; gap:6px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.24em; color:#9ca3af; }
        .tag-dot { width:6px; height:6px; border-radius:999px; background:#f97316; }
        .halo-1 { position:absolute; inset:auto auto -80px -80px; width:200px; height:200px; background:#ebc1b6; opacity:0.14; border-radius:999px; filter:blur(4px); }
        .halo-2 { position:absolute; inset:-100px -100px auto auto; width:240px; height:240px; background:#0f172a; opacity:0.45; border-radius:999px; filter:blur(6px); }
        @media (max-width:640px) { .card { margin:24px; padding:30px 22px; } }
    </style>
</head>
<body>
    <div class="card">
        <div class="halo-1"></div>
        <div class="halo-2"></div>
        <div class="badge">Vicinity IMS</div>
        <div class="title">404 • Missing Route</div>
        <div class="subtitle">
            The endpoint you requested is not registered in the current Vicinity IMS deployment. Verify the URL or return to the operations dashboard.
        </div>
        <div class="pill">
            <div class="pill-dot"></div>
            <span>Inventory Control Firewall</span>
        </div>
        <div class="meta-row">
            <div>
                <div class="meta-label">Requested Path</div>
                <div class="meta-value">{{ request()->path() }}</div>
            </div>
            <div style="text-align:right;">
                <div class="meta-label">Status Code</div>
                <div class="meta-value">HTTP 404</div>
            </div>
        </div>
        <div class="actions">
            <button class="btn-primary" onclick="window.location.href='{{ url('/') }}'">
                <span>Return to Home</span>
            </button>
            <button class="btn-secondary" onclick="window.history.back()">
                Go Back to Previous Screen
            </button>
        </div>
        <div style="margin-top:22px; display:flex; justify-content:space-between; align-items:center;">
            <div class="tag">
                <div class="tag-dot"></div>
                <span>Route Registry</span>
            </div>
            <div style="font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.2em;">
                Error Boundary • Edge Node
            </div>
        </div>
    </div>
</body>
</html>

