<?php

namespace App\DAV;

use Sabre\CardDAV\AddressBookRoot;

class OwnAddressBookRoot extends AddressBookRoot {
    public function getChildForPrincipal(array $principal) {
        return new OwnAddressBookHome($this->carddavBackend, $principal['uri']);
    }
}
