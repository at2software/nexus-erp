<?php

namespace App\Models;

class Holiday {
    public static function isValidForZip($holiday, string $workZip): bool {
        $holidayName = $holiday->name;
        $hint        = $holiday->hinweis ?? '';

        if (strpos($holidayName, 'Augsburger Friedensfest') !== false) {
            return substr($workZip, 0, 2) === '86';
        }

        if (strpos($holidayName, 'Mariä Himmelfahrt') !== false) {
            return static::isCatholicMajorityZip($workZip);
        }

        if (strpos($holidayName, 'Fronleichnam') !== false && ! empty($hint)) {
            return static::isFronleichnamValidForZip($workZip, $hint);
        }
        return true;
    }
    public static function isCatholicMajorityZip(string $workZip): bool {
        $catholicZipRanges = [
            ['80331', '80339'],
            ['80469', '80469'],
            ['81241', '81249'],
            ['84028', '84028'],
            ['94032', '94036'],
            ['84347', '84359'],
            ['83022', '83026'],
            ['82467', '82467'],
            ['83471', '83471'],
            ['87435', '87439'],
            ['89073', '89077'],
        ];

        foreach ($catholicZipRanges as $range) {
            if ($workZip >= $range[0] && $workZip <= $range[1]) {
                return true;
            }
        }
        return false;
    }
    public static function isFronleichnamValidForZip(string $workZip, string $hint): bool {
        if (strpos($hint, 'sorbischen Siedlungsgebietes') !== false) {
            $sorbianZips = ['02625', '02627', '02694', '02699', '02906', '02929', '02957', '02999'];
            return in_array($workZip, $sorbianZips);
        }

        if (strpos($hint, 'Landkreis Eichsfeld') !== false) {
            return substr($workZip, 0, 3) === '373' || substr($workZip, 0, 3) === '374';
        }
        return true;
    }
}
