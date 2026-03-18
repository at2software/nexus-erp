<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Invoice Unit Code Mapping
    |--------------------------------------------------------------------------
    |
    | Mapping of German/local unit names to UN/ECE standard unit codes
    | for eRechnung/ZUGFeRD compliance.
    |
    | See: UN/ECE Recommendation No. 20 - Codes for Units of Measure Used in International Trade
    |
    */
    'unit_codes' => [
        // Pieces / Items
        'Stück' => 'C62',
        'St'    => 'C62',

        // Time units
        'Stunde' => 'HUR',
        'h'      => 'HUR',
        'Std'    => 'HUR',
        'Tag'    => 'DAY',
        'Tage'   => 'DAY',
        'PT'     => 'DAY',
        'Monat'  => 'MON',
        'Jahr'   => 'ANN',

        // Weight units
        'kg' => 'KGM',
        'g'  => 'GRM',

        // Volume units
        'l'  => 'LTR',
        'ml' => 'MLT',

        // Length units
        'm'  => 'MTR',
        'cm' => 'CMT',
        'mm' => 'MMT',

        // Area units
        'm²' => 'MTK',

        // Volume units (cubic)
        'm³' => 'MTQ',
    ],
];
