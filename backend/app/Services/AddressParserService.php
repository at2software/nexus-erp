<?php

namespace App\Services;

class AddressParserService {
    public function parse(string $input): array {
        $input = trim($input, '<br>');
        $parts = explode('<br>', $input);

        $company_name = $parts[0] ?? null;
        $salutations  = $parts[1] ?? null;
        $street_full  = $parts[2] ?? null;

        $postcode_location = $parts[3] ?? null;
        preg_match('/^(\d+)\s+(.*)$/', $postcode_location, $location_parts);
        $postcode = $location_parts[1] ?? null;
        $location = $location_parts[2] ?? null;
        return [
            'company_name' => $company_name,
            'salutations'  => $salutations,
            'street_full'  => $street_full,
            'postcode'     => $postcode,
            'location'     => $location,
        ];
    }
}
