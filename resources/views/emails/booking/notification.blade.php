@extends('emails.layouts.app')

@section('content')
    <div style="font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">
        Booking Notification
    </div>

    <div style="font-size:20px;font-weight:800;color:#4a5a67;margin-bottom:8px;">
        {{ $booking->project_title }}
    </div>

    <div style="font-size:12px;color:#6b7280;margin-bottom:24px;">
        A new equipment booking has been scheduled. You have been added as a collaborator for this deployment.
    </div>

    @php
        $formattedDates = '';

        if (isset($dates) && is_array($dates) && count($dates) > 0) {
            $formattedDates = collect($dates)
                ->map(function ($date) {
                    return \Carbon\Carbon::parse($date)->format('d M Y');
                })
                ->implode(', ');
        } elseif ($booking->start_date && $booking->end_date) {
            $formattedDates = \Carbon\Carbon::parse($booking->start_date)->format('d M Y').' – '.\Carbon\Carbon::parse($booking->end_date)->format('d M Y');
        }
    @endphp

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
            <td style="width:50%;padding:8px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Dates</div>
                <div>{{ $formattedDates }}</div>
            </td>
            <td style="width:50%;padding:8px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Shift</div>
                <div>{{ $booking->shift }}</div>
            </td>
        </tr>
        <tr>
            <td style="width:50%;padding:8px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Quotation</div>
                <div>{{ $booking->quotation_number ?: 'N/A' }}</div>
            </td>
            <td style="width:50%;padding:8px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Shoot Type</div>
                <div>{{ $booking->shoot_type }}</div>
            </td>
        </tr>
        @if(!empty($booking->remarks))
        <tr>
            <td colspan="2" style="padding:8px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Remarks</div>
                <div>{{ $booking->remarks }}</div>
            </td>
        </tr>
        @endif
    </table>

    <div style="font-size:13px;font-weight:700;color:#4a5a67;margin-bottom:8px;">
        Equipment Allocation
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <thead>
            <tr>
                <th align="left" style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;border-bottom:1px solid #e5e7eb;">
                    Item
                </th>
                <th align="center" style="padding:8px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;border-bottom:1px solid #e5e7eb;">
                    Qty
                </th>
            </tr>
        </thead>
        <tbody>
            @foreach($booking->equipments as $equipment)
                <tr>
                    <td style="padding:8px 12px;font-size:12px;color:#4b5563;border-bottom:1px solid #f3f4f6;">
                        {{ $equipment->name }}
                    </td>
                    <td align="center" style="padding:8px 12px;font-size:12px;color:#4b5563;border-bottom:1px solid #f3f4f6;">
                        {{ $equipment->pivot->quantity }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if(is_array($booking->collaborators) && count($booking->collaborators) > 0)
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#9ca3af;margin-bottom:4px;">
            Collaborators
        </div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:24px;">
            @php
                $collabEmails = [];
                foreach($booking->collaborators as $collab) {
                    if (is_array($collab) && isset($collab['email'])) {
                        $collabEmails[] = $collab['email'];
                    } elseif (is_string($collab)) {
                        $collabEmails[] = $collab;
                    }
                }
            @endphp
            {{ implode(', ', $collabEmails) }}
        </div>
    @endif

    <div style="font-size:12px;color:#6b7280;">
        Please review the allocation and coordinate with the operations team if any changes are required.
    </div>
@endsection
