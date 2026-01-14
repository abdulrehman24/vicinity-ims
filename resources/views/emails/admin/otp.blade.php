@extends('emails.layouts.app')

@section('content')
    <div style="font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">
        Admin Access Verification
    </div>

    <div style="font-size:18px;font-weight:800;color:#4a5a67;margin-bottom:8px;">
        One-Time Passcode
    </div>

    <div style="font-size:12px;color:#6b7280;margin-bottom:20px;">
        Use the code below to complete your admin access verification. Do not share this code with anyone.
    </div>

    <div style="font-size:26px;font-weight:800;letter-spacing:0.4em;padding:20px 24px;background:#f3f4f6;text-align:center;border-radius:16px;color:#4a5a67;margin-bottom:16px;">
        {{ $otp }}
    </div>

    <div style="font-size:11px;color:#9ca3af;margin-bottom:24px;">
        This code will expire in 10 minutes.
    </div>

    <div style="font-size:11px;color:#6b7280;">
        If you did not request admin access, please contact the system administrator immediately.
    </div>
@endsection
