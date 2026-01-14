<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ config('app.name') }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                        <td style="background-color:#4a5a67;padding:24px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="left">
                                        <div style="font-size:10px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#ebc1b6;">Operations</div>
                                        <div style="margin-top:4px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.05em;text-transform:uppercase;">
                                            {{ config('app.name') }}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 32px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="left" style="font-size:11px;color:#6b7280;">
                                        <div style="font-weight:700;color:#4a5a67;">{{ config('app.name') }} Operations</div>
                                        <div style="margin-top:4px;">Automated notification from the equipment scheduling system.</div>
                                    </td>
                                    <td align="right" style="font-size:10px;color:#9ca3af;">
                                        <div>Do not reply to this email.</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

