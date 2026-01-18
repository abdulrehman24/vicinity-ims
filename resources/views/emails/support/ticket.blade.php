@extends('emails.layouts.app')

@section('content')
    <div style="font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">
        Support Ticket
    </div>

    <div style="font-size:20px;font-weight:800;color:#4a5a67;margin-bottom:4px;">
        {{ $ticket->ticket_code }}
    </div>

    <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">
        A new technical support ticket has been submitted in Vicinity IMS.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
            <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Reported By</div>
                <div>{{ $ticket->reported_by }}</div>
            </td>
            <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Severity</div>
                <div style="text-transform:uppercase;">{{ $ticket->severity }}</div>
            </td>
        </tr>
        @if($ticket->equipment)
            <tr>
                <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Equipment</div>
                    <div>{{ $ticket->equipment->name }}</div>
                </td>
                <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                    <div style="font-weight:700;color:#4a5a67;">Serial</div>
                    <div>{{ $ticket->equipment->serialNumber ?? 'N/A' }}</div>
                </td>
            </tr>
        @endif
    </table>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#9ca3af;margin-bottom:4px;">
        Issue Category
    </div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:16px;text-transform:capitalize;">
        {{ str_replace('_', ' ', $ticket->issue_type) }}
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#9ca3af;margin-bottom:4px;">
        Technical Description
    </div>
    <div style="font-size:12px;color:#4b5563;white-space:pre-line;margin-bottom:24px;">
        {{ $ticket->description }}
    </div>

    <div style="font-size:11px;color:#9ca3af;">
        Please triage this ticket and update status in Vicinity IMS once resolved.
    </div>
@endsection

