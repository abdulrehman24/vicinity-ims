<x-mail::message>
# Admin Access Verification

Use the following code to complete your admin access verification:

<div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 20px; background: #f4f4f4; text-align: center; border-radius: 8px;">
    {{ $otp }}
</div>

This code will expire in 10 minutes.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
