@extends('emails.layouts.app')

@section('content')
    <div style="font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">
        Collaboration Invitation
    </div>

    <div style="font-size:20px;font-weight:800;color:#4a5a67;margin-bottom:8px;">
        You've been invited!
    </div>
    
    <div style="font-size:12px;color:#6b7280;margin-bottom:24px;">
        You have been added as a collaborator for the project <strong>{{ $booking->project_title }}</strong>.
    </div>
    
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
            Booking Details
        </div>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
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
                <td style="width:50%;padding-bottom:12px;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Shift</div>
                    <div>{{ $booking->shift }}</div>
                </td>
                <td style="width:50%;padding-bottom:12px;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Equipment Items</div>
                    <div>{{ $booking->equipments->sum('pivot.quantity') }} items allocated</div>
                </td>
            </tr>
            <tr>
                <td style="width:50%;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Quotation</div>
                    <div>{{ $booking->quotation_number ?: 'N/A' }}</div>
                </td>
                <td style="width:50%;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Shoot Type</div>
                    <div>{{ $booking->shoot_type }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
            Equipment List
        </div>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th align="left" style="padding-bottom:8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;">Item</th>
                    <th align="right" style="padding-bottom:8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;">Qty</th>
                </tr>
            </thead>
            <tbody>
                @foreach($booking->equipments as $equipment)
                <tr>
                    <td style="padding-top:8px;border-top:1px solid #f3f4f6;font-size:12px;color:#4a5a67;">
                        {{ $equipment->name }}
                    </td>
                    <td align="right" style="padding-top:8px;border-top:1px solid #f3f4f6;font-size:12px;color:#4a5a67;font-weight:700;">
                        {{ $equipment->pivot->quantity }}
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div style="background-color:#fff1f2;border:1px solid #ebc1b6;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#be123c;margin-bottom:12px;border-bottom:1px solid #fecdd3;padding-bottom:8px;">
            Action Required
        </div>
        <div style="font-size:12px;color:#881337;margin-bottom:16px;">
            An account has been created for you. Please log in using the temporary credentials below and update your password immediately.
        </div>
        
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="padding-bottom:8px;font-size:12px;color:#881337;">
                    <strong>Email:</strong> {{ $email }}
                </td>
            </tr>
            <tr>
                <td style="font-size:12px;color:#881337;">
                    <strong>Temporary Password:</strong> <span style="font-family:monospace;background:white;padding:4px 8px;border-radius:4px;border:1px solid #fecdd3;font-weight:700;">{{ $password }}</span>
                </td>
            </tr>
        </table>
    </div>

    <div style="text-align:center;">
        <a href="{{ url('/login') }}" style="display:inline-block;background-color:#4a5a67;color:#ffffff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;padding:14px 28px;text-decoration:none;border-radius:8px;">
            Access Dashboard
        </a>
    </div>
@endsection
