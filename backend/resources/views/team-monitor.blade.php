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

        @foreach ($users as $user)
        <div data-user-id="{{$user->id}}" class="user-pill {{$user->availability}} {{ $user->is_sick ? 'pill-sick' : '' }} {{ $user->is_on_vacation ? 'pill-vacation' : '' }}" style="--user-bg-color: {{ $user->availability === 'user-offline' ? '#000' : $user->focus_color }}; background-color: var(--user-bg-color);">
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
                    <img class="status-icon sick" src="{{ asset('icons/healing_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg') }}" title="sick until: {{$user->is_sick}}" alt="Sick" data-type="sick">
                @elseif ($user->is_on_vacation)
                    <img class="status-icon vacation" src="{{ asset('icons/beach_access_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg') }}" title="vacation until: {{$user->is_on_vacation}}" alt="Vacation" data-type="vacation">
                @elseif ($user->focus_icon)
                    <img src="api/{{$user->focus_icon}}" alt="{{$user->focus_name}}" data-type="focus" data-focus-id="{{$user->current_focus_id}}">
                @endif
            </div>
        </div>
        @endforeach
    </div>
    <script>
        var _tmToken = "{{ config('app.team_monitor_api_key') }}";
        var _tmSickIcon = "{{ asset('icons/healing_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg') }}";
        var _tmVacationIcon = "{{ asset('icons/beach_access_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg') }}";
        var _tmContainer = document.getElementById('team-monitor-container');
        var _tmUrl = (function() {
            var base = location.pathname.replace(/\/[^\/]*$/, '');
            return location.origin + base + '/api/team-monitor?X-Auth-Token=' + encodeURIComponent(_tmToken);
        }());
        var _tmFetching = false;

        function _tmFormatHours(h) {
            return parseFloat(parseFloat(h).toFixed(1)).toString();
        }

        function _tmUpdatePill(pill, user) {
            var bgColor = user.availability === 'user-offline' ? '#000' : user.focus_color;
            var classes = ['user-pill', user.availability, user.is_sick ? 'pill-sick' : '', user.is_on_vacation ? 'pill-vacation' : ''].filter(Boolean).join(' ');

            pill.className = classes;
            pill.style.setProperty('--user-bg-color', bgColor);
            pill.style.backgroundColor = bgColor;

            pill.querySelector('.user-focus').textContent = user.focus_name;

            pill.querySelector('.work-chart').innerHTML = (user.workinfo || []).map(function(d) {
                return '<div class="work-bar ' + d.class + '" title="' + d.day + ': ' + d.value + 'h / ' + d.required + 'h" style="--bar-height:' + (d.value * 5) + 'px;height:var(--bar-height);"></div>';
            }).join('');

            var avgEl = pill.querySelector('.work-average');
            avgEl.className = 'work-average ' + user.averageClass;
            avgEl.innerHTML = user.average + '<span class="unit">h/w</span>';

            pill.querySelector('.work-required').innerHTML = _tmFormatHours(user.required_hours) + '<span class="unit">h/w</span>';

            var iconEl = pill.querySelector('.pill-focus-icon');
            var iconImg = iconEl.querySelector('img');
            var iconType = iconImg ? iconImg.getAttribute('data-type') : null;

            if (user.is_sick) {
                if (iconType !== 'sick')
                    iconEl.innerHTML = '<img class="status-icon sick" src="' + _tmSickIcon + '" title="sick until: ' + user.is_sick + '" alt="Sick" data-type="sick">';
            } else if (user.is_on_vacation) {
                if (iconType !== 'vacation')
                    iconEl.innerHTML = '<img class="status-icon vacation" src="' + _tmVacationIcon + '" title="vacation until: ' + user.is_on_vacation + '" alt="Vacation" data-type="vacation">';
            } else if (user.focus_icon) {
                var focusId = String(user.current_focus_id !== null && user.current_focus_id !== undefined ? user.current_focus_id : '');
                if (iconType === 'focus') {
                    if (iconImg.getAttribute('data-focus-id') !== focusId)
                        iconImg.src = 'api/' + user.focus_icon;
                    iconImg.alt = user.focus_name;
                    iconImg.setAttribute('data-focus-id', focusId);
                } else {
                    iconEl.innerHTML = '<img src="api/' + user.focus_icon + '" alt="' + user.focus_name + '" data-type="focus" data-focus-id="' + focusId + '">';
                }
            } else {
                iconEl.innerHTML = '';
            }
        }

        var _tmContainer = document.getElementById('team-monitor-container');
        var _tmUrl = (function() {
            var base = location.pathname.replace(/\/[^\/]*$/, '');
            return location.origin + base + '/api/team-monitor?X-Auth-Token=' + encodeURIComponent(_tmToken);
        }());
        var _tmFetching = false;

        function _tmFetchAndUpdate() {
            if (_tmFetching) return;
            _tmFetching = true;
            fetch(_tmUrl)
                .then(function(res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function(users) {
                    users.forEach(function(user) {
                        var pill = _tmContainer.querySelector('[data-user-id="' + user.id + '"]');
                        if (!pill) return;
                        _tmUpdatePill(pill, user);
                        _tmContainer.appendChild(pill);
                    });
                })
                .catch(function(e) { console.error('Team monitor refresh failed', e); })
                .then(function() { _tmFetching = false; setTimeout(_tmFetchAndUpdate, 20000); });
        }

        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) setTimeout(_tmFetchAndUpdate, 2000);
        });

        window.addEventListener('online', function() {
            setTimeout(_tmFetchAndUpdate, 2000);
        });

        setTimeout(_tmFetchAndUpdate, 20000);
    </script>
</body>
</html>