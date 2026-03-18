<?php

namespace App\DAV;

use Sabre\DAV\Auth\Backend\AbstractBasic;
use Sabre\HTTP;

/**
 * This is an authentication backend that uses a database to manage passwords.
 *
 * @copyright Copyright (C) fruux GmbH (https://fruux.com/)
 * @license http://sabre.io/license/ Modified BSD License
 */
class OwnPDOBasicAuthBackend extends AbstractBasic {
    /**
     * Reference to PDO connection.
     *
     * @var \PDO
     */
    protected $pdo;

    /**
     * Creates the backend object.
     *
     * If the filename argument is passed in, it will parse out the specified file fist.
     */
    public function __construct(\PDO $pdo) {
        $this->pdo = $pdo;
    }

    /**
     * Validates a username and password.
     *
     * This method should return true or false depending on if login
     * succeeded.
     *
     * @param string $username
     * @param string $password
     * @return bool
     */
    public function validateUserPass($username, $password) {
        $stmt = $this->pdo->prepare('SELECT '.'email'.' FROM '.'users'.' WHERE '.'email'.' = ?');
        $stmt->execute([$username]);
        $result = $stmt->fetchAll();

        if (! count($result)) {
            return false;
        } else {
            return true;
        }
    }
}
