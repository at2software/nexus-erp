<?php

declare(strict_types=1);

namespace App\DAV;

use Sabre\CardDAV\AddressBook;

/**
 * The AddressBook class represents a CardDAV addressbook, owned by a specific user.
 *
 * The AddressBook can contain multiple vcards
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @author Evert Pot (http://evertpot.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */
class OwnAddressBook extends AddressBook {
    public function getChildACL() {
        return [
            [
                'privilege' => '{DAV:}read',
                'principal' => $this->getOwner(),
                'protected' => true,
            ],
        ];
    }
    public function getACL() {
        return [
            [
                'privilege' => '{DAV:}read',
                'principal' => $this->getOwner(),
                'protected' => true,
            ],
        ];
    }
}
