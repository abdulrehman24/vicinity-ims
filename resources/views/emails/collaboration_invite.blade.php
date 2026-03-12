@extends('emails.layouts.app')

@section('content')
    <div style="font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">
        Collaboration Invitation
    </div>

    <div style="font-size:20px;font-weight:800;color:#4a5a67;margin-bottom:8px;">
        Collaborate on Project
    </div>
    
    <div style="font-size:12px;color:#6b7280;margin-bottom:24px;">
        You have been invited to collaborate on the booking for <strong>{{ $booking->project_title }}</strong>.
    </div>
    
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
            Project Details
        </div>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width:50%;padding-bottom:12px;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Project</div>
                    <div>{{ $booking->project_title }}</div>
                </td>
                <td style="width:50%;padding-bottom:12px;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Dates</div>
                    <div>{{ \Carbon\Carbon::parse($booking->start_date)->format('d M Y') }} - {{ \Carbon\Carbon::parse($booking->end_date)->format('d M Y') }}</div>
                </td>
            </tr>
            <tr>
                <td style="width:50%;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Booking Owner</div>
                    <div>{{ $booking->user ? $booking->user->name : 'System' }}</div>
                </td>
                <td style="width:50%;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Link Expires</div>
                    <div style="color:#be123c;font-weight:700;">{{ $expires_at }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div style="margin-bottom:32px;text-align:center;">
        <a href="{{ $link }}" style="background-color:#4a5a67;color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;letter-spacing:0.05em;text-transform:uppercase;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            Open Collaborative Link
        </a>
    </div>

    <div style="font-size:11px;color:#9ca3af;line-height:1.6;">
        <p><strong>Note:</strong> This link is secure and unique to you. It will grant access to view and edit this specific booking only. Access will automatically expire 24 hours after the project ends.</p>
        <p>If you did not expect this invitation, please ignore this email.</p>
    </div>
@endsection
