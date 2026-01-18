<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>System Error • Vicinity IMS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
        body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#111827; font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        .card { position:relative; max-width:520px; width:100%; background:#fcfaf9; border-radius:28px; padding:40px 32px; box-shadow:0 30px 70px rgba(15,23,42,0.6); overflow:hidden; }
        .badge { font-size:10px; font-weight:900; letter-spacing:0.3em; text-transform:uppercase; color:#9ca3af; margin-bottom:12px; }
        .title { font-size:26px; font-weight:900; color:#4a5a67; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px; }
        .subtitle { font-size:13px; color:#6b7280; margin-bottom:22px; line-height:1.6; }
        .pill { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; background:#b91c1c; color:#fef2f2; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.24em; margin-bottom:20px; }
        .pill-dot { width:8px; height:8px; border-radius:999px; background:#fecaca; box-shadow:0 0 0 4px rgba(248,113,113,0.35); }
        .meta-row { display:flex; justify-content:space-between; font-size:11px; color:#6b7280; margin-bottom:18px; }
        .meta-label { font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#9ca3af; margin-bottom:4px; }
        .meta-value { font-weight:700; color:#4b5563; }
        .actions { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
        .btn-primary { display:inline-flex; justify-content:center; align-items:center; gap:8px; width:100%; padding:12px 16px; border-radius:999px; border:none; background:#4a5a67; color:#ebc1b6; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.25em; cursor:pointer; box-shadow:0 20px 40px rgba(15,23,42,0.4); }
        .btn-secondary { display:inline-flex; justify-content:center; align-items:center; width:100%; padding:11px 16px; border-radius:999px; border:1px solid rgba(156,163,175,0.4); background:transparent; color:#6b7280; font-size:10px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; cursor:pointer; }
        .tag-row { display:flex; justify-content:space-between; align-items:center; margin-top:22px; }
        .tag { display:inline-flex; align-items:center; gap:6px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.24em; color:#9ca3af; }
        .tag-dot { width:6px; height:6px; border-radius:999px; background:#6366f1; }
        .halo-1 { position:absolute; inset:auto auto -90px -70px; width:210px; height:210px; background:#ebc1b6; opacity:0.18; border-radius:999px; filter:blur(5px); }
        .halo-2 { position:absolute; inset:-120px -120px auto auto; width:260px; height:260px; background:#4a5a67; opacity:0.35; border-radius:999px; filter:blur(6px); }
        .log-hint { font-size:10px; color:#9ca3af; margin-top:10px; line-height:1.5; }
        @media (max-width:640px) { .card { margin:24px; padding:30px 22px; } }
    </style>
</head>
<body>
    <div class="card">
        <div class="halo-1"></div>
        <div class="halo-2"></div>
        <div class="badge">Vicinity IMS</div>
        <div class="title">500 • System Fault</div>
        <div class="subtitle">
            An unexpected condition was detected while processing your request. The operation log has been flagged for review by the engineering team.
        </div>
        <div class="pill">
            <div class="pill-dot"></div>
            <span>Critical Runtime Exception</span>
        </div>
        <div class="meta-row">
            <div>
                <div class="meta-label">Request Id</div>
                <div class="meta-value">{{ Str::uuid() }}</div>
            </div>
            <div style="text-align:right;">
                <div class="meta-label">Status Code</div>
                <div class="meta-value">HTTP 500</div>
            </div>
        </div>
        <div class="actions">
            <button class="btn-primary" onclick="window.location.href='{{ url('/') }}'">
                <span>Return to Home</span>
            </button>
            <button class="btn-secondary" onclick="window.location.reload()">
                Retry Operation
            </button>
        </div>
        <div class="tag-row">
            <div class="tag">
                <div class="tag-dot"></div>
                <span>Error Boundary</span>
            </div>
            <div style="font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:0.2em;">
                Logged to Server Diagnostics
            </div>
        </div>
        <div class="log-hint">
            If you are an administrator, you can inspect application logs via the log viewer dashboard once authenticated.
        </div>
    </div>
</body>
</html>

