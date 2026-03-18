<?php

namespace App\Traits;

trait VcardGenderTrait {
    public static $_genderDatabase = null;

    public static function findGenderInDatabase($name) {
        self::$_genderDatabase || self::$_genderDatabase = file_get_contents(resource_path('first_names.db')); // load DB
        preg_match('/^'.mb_strtoupper($name, 'UTF-8').'.*?,(.*?),.*$/im', self::$_genderDatabase, $attr);
        if (count($attr) == 2) {
            return $attr[1];
        }
        if (preg_match('/(.*?)[\s-]/', $name, $_)) {
            return self::findGenderInDatabase($_[1]);
        } // combined names
        return null;
    }
    public function getGenderAttribute(): ?string {
        // First, check if GENDER field is explicitly set
        if ($g = $this->vcard->getFirstValue('GENDER')) {
            return $g;
        }

        // Try to get first name from N field: [Family, Given, Middle, Prefix, Suffix]
        if ($n = $this->vcard->getFirstAttr('N')) {
            $firstName = $n[1] ?? null; // Given name is at index 1
            if ($firstName) {
                return self::findGenderInDatabase($firstName);
            }
        }

        // Fallback to FN (formatted name) field
        if ($fn = $this->vcard->getFirstValue('FN')) {
            // Try to extract first name from formatted name
            // Assuming format like "John Smith" or "John"
            $parts = explode(' ', trim($fn));
            if (count($parts) > 0 && ! empty($parts[0])) {
                return self::findGenderInDatabase($parts[0]);
            }
        }

        return null;
    }
    public function getSalutationAttribute(): string {
        $lang = $this->vcard?->getFirstValue('X-LANG') ?? 'de';
        if ($lang === 'en') {
            return match ($this->gender) {
                'M'     => 'Mr.',
                'F'     => 'Mrs.',
                default => '',
            };
        }
        return match ($this->gender) {
            'M'     => 'Herr',
            'F'     => 'Frau',
            default => '',
        };
    }
    public function is_male(): bool {
        return $this->gender == 'M';
    }
    public function salutationReplacements() {
        $n = $this->vcard->getFirstAttr('N', ['', '', '', '', '']);
        $a = [
            'familyName' => $n[0],
            'firstName'  => $n[1],
            'middleName' => $n[2],
            'prefix'     => $n[3],
            'suffix'     => $n[4],
            'salutation' => strlen($n[3]) ? $n[3] : $this->salutation,
        ];
        $a['fullSalutation'] = $a['salutation'].' '.$a['firstName'].' '.$a['familyName'];
        return $a;
    }
}
