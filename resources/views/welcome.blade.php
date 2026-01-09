<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vicinity IMS - Equipment Dashboard</title>
    <meta name="description" content="Professional camera equipment inventory management system for film production companies" />
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/js/main.jsx'])
    <script>
        window.user = @json(auth()->user());
    </script>
</head>
<body class="bg-gray-900">
    <div id="root"></div>
</body>
</html>
