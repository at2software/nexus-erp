@php
const QR_SIZE = "20mm";
const QR_MARGIN = "2mm";
@endphp
<div style="float:right; margin:-15mm 0 10mm 10mm; ">
    <img src="{{$qr}}" style="width:{{QR_SIZE}}; height:{{QR_SIZE}};">
    <div style="font-weight: bold; text-align:center; padding-top:.5mm;">
        SEPA QR
    </div>
</div>