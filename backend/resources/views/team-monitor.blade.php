<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Monitor</title>
    <link href="{{ asset('css/TeamMonitor.css?v=' . filemtime(public_path('css/TeamMonitor.css'))) }}" rel="stylesheet">
</head>
<body>
    <div id="team-monitor-container">
        <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; z-index: 9999;">
            Last refresh: <span id="last-refresh-time">{{ $lastRefresh ?? 'Loading...' }}</span>
        </div>
        
        <!-- JavaScript-based refresh for Raspberry Pi/Chromium compatibility -->
        <script>
            // Primary refresh strategy - simple JavaScript interval
            console.log('Starting JavaScript-based refresh every 20 seconds');
            
            // Update timestamp display
            function updateRefreshTime() {
                document.getElementById('last-refresh-time').textContent = new Date().toLocaleTimeString();
            }
            
            // Main refresh function
            function refreshPage() {
                console.log('Refreshing page at', new Date().toLocaleTimeString());
                updateRefreshTime();
                window.location.reload();
            }
            
            // Set up 20-second refresh interval
            setInterval(refreshPage, 20000); // 20 seconds
            
            // Refresh when tab becomes visible (handles sleep/wake)
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden) {
                    console.log('Tab became visible, refreshing in 2 seconds');
                    setTimeout(refreshPage, 2000);
                }
            });
            
            // Refresh when network reconnects
            window.addEventListener('online', function() {
                console.log('Network reconnected, refreshing in 2 seconds');
                setTimeout(refreshPage, 2000);
            });
            
            // Initial timestamp update
            updateRefreshTime();
        </script>

        @foreach ($users as $user)
        <div class="user-pill {{$user->availability}} {{ $user->is_sick ? 'pill-sick' : '' }} {{ $user->is_on_vacation ? 'pill-vacation' : '' }}" style="--user-bg-color: {{ $user->availability === 'user-offline' ? '#000' : $user->focus_color }}; background-color: var(--user-bg-color);">
            <div class="pill-left">
                <div class="user-image">
                    <img src="api/{{$user->icon}}" alt="{{$user->name}}">
                </div>
            </div>

            <div class="pill-content">
                <div class="user-info">
                    <div class="user-name">{{$user->name}}</div>
                    <div class="user-focus">{{$user->focus_name}}</div>
                </div>
            </div>

            <div class="pill-right">
                <div class="work-chart">
                    @foreach ($user->workinfo as $data)
                        <div class="work-bar {{$data['class']}}" title="{{$data['day']}}: {{$data['value']}}h / {{$data['required']}}h" style="--bar-height: {{ $data['value'] * 5 }}px; height: var(--bar-height);"></div>
                    @endforeach
                </div>
                <div class="work-stats">
                    <div class="work-average {{$user->averageClass}}">
                        {{$user->average}}<span class="unit">h/w</span>
                    </div>
                    <div class="work-required">
                        {{rtrim(rtrim(number_format($user->required_hours, 1, '.', ''), '0'), '.')}}<span class="unit">h/w</span>
                    </div>
                </div>
            </div>

            <div class="pill-focus-icon">
                @if ($user->is_sick)
                    <img class="status-icon sick" src="{{ asset('icons/healing_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg') }}" title="sick until: {{$user->is_sick}}" alt="Sick">
                @elseif ($user->is_on_vacation)
                    <img class="status-icon vacation" src="{{ asset('icons/beach_access_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg') }}" title="vacation until: {{$user->is_on_vacation}}" alt="Vacation">
                @elseif ($user->focus_icon)
                    <img src="api/{{$user->focus_icon}}" alt="{{$user->focus_name}}">
                @endif
            </div>
        </div>
        @endforeach
    </div>
</body>
</html>