
<br>
<br>

@if (count(@$data->days))
<br>
<b>Verpflegungsmehraufwand</b>
<br>
<br>
<table style="width:100%;">
    @foreach ($data->days as $day)
    <tr>
        <td>{{$day->name}}</td>

        @if ($day->brunch)
        <td><img src="material-icons/free_breakfast_24dp_E8EAED.png" style="width:1rem; height:1rem;"></td>
        @else
        <td></td>
        @endif

        @if ($day->lunch)
        <td><img src="material-icons/lunch_dining_24dp_E8EAED.png" style="width:1rem; height:1rem;"></td>
        @else
        <td></td>
        @endif

        @if ($day->dinner)
        <td><img src="material-icons/local_bar_24dp_E8EAED.png" style="width:1rem; height:1rem;"></td>
        @else
        <td></td>
        @endif

        @if ($day->sleep)
        <td><img src="material-icons/bed_24dp_E8EAED.png" style="width:1rem; height:1rem;"></td>
        @else
        <td></td>
        @endif

        <td style="width: 3cm; text-align:right;">{{number_format($day->sum, 2, ',', '.')}} €</td>
    </tr>
    @endforeach
</table>
<br>

<b>Legende</b>
<br>
<br>
<table style="width:100%;">
    <tr>
        <td><img src="material-icons/free_breakfast_24dp_E8EAED.png" style="width:.75rem; height:.75rem;"></td>
        <td style="font-size: smaller;">Frühstück vom Arbeitgeber oder Kunden bezahlt</td>
    </tr>
    <tr>
        <td><img src="material-icons/lunch_dining_24dp_E8EAED.png" style="width:.75rem; height:.75rem;"></td>
        <td style="font-size: smaller;">Mittagessen vom Arbeitgeber oder Kunden bezahlt</td>
    </tr>
    <tr>
        <td><img src="material-icons/local_bar_24dp_E8EAED.png" style="width:.75rem; height:.75rem;"></td>
        <td style="font-size: smaller;">Abendessen vom Arbeitgeber oder Kunden bezahlt</td>
    </tr>
    <tr>
        <td><img src="material-icons/bed_24dp_E8EAED.png" style="width:.75rem; height:.75rem;"></td>
        <td style="font-size: smaller;">Übernachtung vom Arbeitgeber oder Kunden bezahlt</td>
    </tr>
</table>

@endif

@if (count(@$data->expenses))
<br>
<b>Sonstige Ausgaben</b>
<br>
<table style="width:100%;">
    @foreach ($data->expenses as $day)
    <tr>
        <td>{{$day->name}}</td>
        <td>{{$day->value}} {{$day->suffix}}</td>
        <td style="width: 3cm; text-align:right;">{{number_format($day->sum, 2, ',', '.')}} €</td>
    </tr>
    @endforeach
</table>
@endif

<br>
<div style="border-top:1px black solid; text-align:right; font-size:16pt;"><b>Gesamt: {{number_format($total, 2, ',', '.')}} €</b></div>

<br>
<br>
<div style="overflow: hidden; margin: 0; padding: 0;">
    <table style="table-layout:fixed; border-collapse: separate; border-spacing: 10px 0; width: 100%;">
        <tr>
            <td></td>
            <td style="width:30%; height: 3cm; vertical-align: bottom; font-size:smaller;">
                <hr>
                Datum, Unterschrift Mitarbeiter
            </td>
            <td style="width:30%; height: 3cm; vertical-align: bottom; font-size:smaller;">
                <hr>
                Datum, Unterschrift at² GmbH
            </td>
        </tr>
    </table>
</div>