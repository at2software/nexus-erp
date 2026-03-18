<?php

return [
    /**
     * Country phone codes mapping
     */
    'country_codes' => [
        '+43'  => 'AT', // Austria
        '+49'  => 'DE', // Germany
        '+41'  => 'CH', // Switzerland
        '+33'  => 'FR', // France
        '+39'  => 'IT', // Italy
        '+34'  => 'ES', // Spain
        '+31'  => 'NL', // Netherlands
        '+32'  => 'BE', // Belgium
        '+45'  => 'DK', // Denmark
        '+46'  => 'SE', // Sweden
        '+47'  => 'NO', // Norway
        '+48'  => 'PL', // Poland
        '+420' => 'CZ', // Czech Republic
        '+44'  => 'GB', // United Kingdom
        '+1'   => 'US', // United States/Canada
        '+352' => 'LU', // Luxembourg
        '+423' => 'LI', // Liechtenstein
    ],

    /**
     * Top Level Domain to country mapping
     */
    'tld_to_country' => [
        '.de'    => 'DE', // Germany
        '.at'    => 'AT', // Austria
        '.ch'    => 'CH', // Switzerland
        '.com'   => 'US', // United States (default)
        '.net'   => 'US', // United States (default)
        '.org'   => 'US', // United States (default)
        '.fr'    => 'FR', // France
        '.it'    => 'IT', // Italy
        '.es'    => 'ES', // Spain
        '.nl'    => 'NL', // Netherlands
        '.be'    => 'BE', // Belgium
        '.dk'    => 'DK', // Denmark
        '.se'    => 'SE', // Sweden
        '.no'    => 'NO', // Norway
        '.pl'    => 'PL', // Poland
        '.cz'    => 'CZ', // Czech Republic
        '.uk'    => 'GB', // United Kingdom
        '.co.uk' => 'GB', // United Kingdom
        '.lu'    => 'LU', // Luxembourg
        '.li'    => 'LI', // Liechtenstein
    ],

    /**
     * Country to phone code mapping (reverse lookup)
     */
    'country_to_phone_code' => [
        'AT' => '+43', // Austria
        'DE' => '+49', // Germany
        'CH' => '+41', // Switzerland
        'FR' => '+33', // France
        'IT' => '+39', // Italy
        'ES' => '+34', // Spain
        'NL' => '+31', // Netherlands
        'BE' => '+32', // Belgium
        'DK' => '+45', // Denmark
        'SE' => '+46', // Sweden
        'NO' => '+47', // Norway
        'PL' => '+48', // Poland
        'CZ' => '+420', // Czech Republic
        'GB' => '+44', // United Kingdom
        'US' => '+1', // United States
        'LU' => '+352', // Luxembourg
        'LI' => '+423', // Liechtenstein
    ],

    /**
     * Default fallback country
     */
    'default_country' => 'DE',
];
