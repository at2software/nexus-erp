<?php

namespace App\DAV;

use Sabre\CardDAV\AddressBookHome;

class OwnAddressBookHome extends AddressBookHome {
    public function getChildren() {
        $addressbooks = $this->carddavBackend->getAddressBooksForUser($this->principalUri);
        $objs         = [];
        foreach ($addressbooks as $addressbook) {
            $objs[] = new OwnAddressBook($this->carddavBackend, $addressbook);
        }
        return $objs;
    }
}
