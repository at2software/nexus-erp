
<style>
.content-table { font-size: 9pt; }
</style>

<table class="content-table">
    <thead>
        <th class="text-end align-top">#</th>
        <th class="text-start align-top">{{ __('pdf.description', [], $lang) }}</th>
        <th class="text-end align-top">{{ __('pdf.price', [], $lang) }}</th>
        <th class="text-end align-top">{{ __('pdf.qty', [], $lang) }}</th>
        <th class="text-end align-top"></th>
        <th class="text-center align-top"></th>
        <th class="text-end align-top">{{ __('pdf.total', [], $lang) }}</th>
    </thead>
    <tbody>
    @foreach($items as $item)
        @switch($item->type)
            @case(0)
                <tr>
                    <td class="text-end align-top">{{ $item->sPosition }}</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap">{{ $item->qty }} {{ $item->unit_name }}</td>
                    <td class="text-end align-top nowrap font-dejavu">{{$item->ehandling}}</td>
                    <td class="text-center align-top nowrap"></td>
                    <td class="text-end align-top nowrap">{{ $item->etotal }}</td>
                </tr>
                @break
            @case(1)
                @break
            @case(2)
                <tr>
                    <td class="text-end align-top">({{ $item->sPosition }})</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap">{{ $item->qty }} {{ $item->unit_name }}</td>
                    <td class="text-end align-top nowrap font-dejavu">{{$item->ehandling}}</td>
                    <td class="text-center align-top nowrap"></td>
                    <td class="text-end align-top nowrap">({{ $item->etotal }})</td>
                </tr>
                @break
            @case(10)
            @case(11)
                <!-- paydown -->
                <tr>
                    <td class="text-end align-top"></td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap"></td>
                    <td class="text-end align-top nowrap"></td>
                    <td class="text-end align-top nowrap"></td>
                    <td class="text-center align-top nowrap"></td>
                    <td class="text-end align-top nowrap">{{ $item->etotal }}</td>
                </tr>
                @break
            @case(20)
                <tr>
                    <td colspan="7" class="group-header text-start py-1"><b>{!! $item->text !!}</b></td>
                </tr>
                @break
            @case(30)
                <tr>
                    <td class="text-end align-top">{{ $item->sPosition }}</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap" colspan="4">{{ __('pdf.daily_recurring', [], $lang) }}</td>
                </tr>
                @break
            @case(31)
                <tr>
                    <td class="text-end align-top">{{ $item->sPosition }}</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap" colspan="4">{{ __('pdf.weekly_recurring', [], $lang) }}</td>
                </tr>
                @break
            @case(32)
                <tr>
                    <td class="text-end align-top">{{ $item->sPosition }}</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap" colspan="4">{{ __('pdf.monthly_recurring', [], $lang) }}</td>
                </tr>
                @break
            @case(33)
                <tr>
                    <td class="text-end align-top">{{ $item->sPosition }}</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap" colspan="4">{{ __('pdf.quarterly_recurring', [], $lang) }}</td>
                </tr>
                @break
            @case(34)
                <tr>
                    <td class="text-end align-top">{{ $item->sPosition }}</td>
                    <td class="text-start align-top">{!! $item->text !!}</td>
                    <td class="text-end align-top nowrap">{{ $item->eprice }}</td>
                    <td class="text-end align-top nowrap" colspan="4">{{ __('pdf.yearly_recurring', [], $lang) }}</td>
                </tr>
                @break
            @default
                <tr>
                    <td colspan="7">{{ $item->type }} not implemented</td>
                </tr>
                @break
        @endswitch
    @endforeach
    </tbody>
    <tfoot>
    @foreach ($footers as $pos => [$key, $value, $handling])
        <tr class="{{ $pos==0 ? 'net-row' : '' }} {{ $pos==count($footers) ? 'gross-row' : '' }}">
            <td class="py-0 text-end align-top font-dejavu">{!! $handling !!}</td>
            <td class="py-0 align-top" colspan="3">{!! $key !!}</td>
            <td class="py-0 text-end align-top nowrap" colspan="3">{{$value}}</td>
        </tr>
    @endforeach
    @foreach ($discounts as [$key, $value, $handling])
        <tr>
            <td class="py-0 text-end align-top">{{$handling}}</td>
            <td class="py-0 align-top" colspan="3">{{$key}}</td>
            <td class="py-0 text-end align-top nowrap" colspan="3">{{$value}}</td>
        </tr>
    @endforeach
    </tfoot>
</table>
<br>
