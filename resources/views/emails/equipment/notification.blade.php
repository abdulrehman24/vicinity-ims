@extends('emails.layouts.app')

@section('content')
    <div style="font-size:12px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#9ca3af;margin-bottom:12px;">
        Equipment Notification
    </div>

    <div style="font-size:20px;font-weight:800;color:#4a5a67;margin-bottom:4px;">
        @if($action === 'created')
            New Gear Added
        @elseif($action === 'decommissioned')
            Gear Decommissioned
        @else
            Equipment Update
        @endif
    </div>

    <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">
        @if($action === 'created')
            New equipment has been added to the inventory.
        @elseif($action === 'decommissioned')
            Equipment has been marked as decommissioned.
        @endif
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
            <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Name</div>
                <div>{{ $equipment->name }}</div>
            </td>
            <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Serial Number</div>
                <div style="text-transform:uppercase;">{{ $equipment->serial_number ?? 'N/A' }}</div>
            </td>
        </tr>
        <tr>
            <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Category</div>
                <div>{{ $equipment->category }}</div>
            </td>
            <td style="width:50%;padding:6px 0;font-size:12px;color:#6b7280;">
                <div style="font-weight:700;color:#4a5a67;">Status</div>
                <div style="text-transform:uppercase;">{{ str_replace('_', ' ', $equipment->status) }}</div>
            </td>
        </tr>
    </table>

    @if($equipment->image_path)
    <div style="margin-bottom:16px;">
        <img src="{{ asset($equipment->image_path) }}" alt="{{ $equipment->name }}" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb;">
    </div>
    @endif

    @if($action === 'decommissioned' && $equipment->decommission_reason)
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#9ca3af;margin-bottom:4px;">
        Decommission Reason
    </div>
    <div style="font-size:12px;color:#4b5563;white-space:pre-line;margin-bottom:24px;">
        {{ $equipment->decommission_reason }}
    </div>
    @endif

    <div style="font-size:11px;color:#9ca3af;">
        You can view full details in the Vicinity IMS inventory.
    </div>
@endsection
