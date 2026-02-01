<!DOCTYPE html>
<html>
<head>
    <title>Stock Take Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: {{ $status === 'overdue' ? '#dc2626' : '#4a5a67' }};">
            {{ $status === 'overdue' ? 'Stock Take Overdue' : 'Stock Take Upcoming' }}
        </h2>
        
        <p>This is a reminder regarding the scheduled equipment inventory audit.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Status:</strong> {{ ucfirst($status) }}</p>
            <p><strong>Deadline:</strong> {{ $deadline }}</p>
            @if($status === 'overdue')
                <p style="color: #dc2626; font-weight: bold;">Days Overdue: {{ $days }}</p>
            @else
                <p>Days Remaining: {{ $days }}</p>
            @endif
        </div>

        <p>Please login to complete the stock take.</p>
        
        <a href="{{ url('/stock-take') }}" style="display: inline-block; background-color: #4a5a67; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Go to Stock Take
        </a>
    </div>
</body>
</html>
