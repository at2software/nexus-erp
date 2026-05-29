<?php

namespace App\Exceptions;

class TanChallengeException extends \RuntimeException {
    public function __construct(
        private string $challengeId,
        private array $challenge,
    ) {
        parent::__construct('TAN required');
    }

    public function getChallengeId(): string {
        return $this->challengeId;
    }

    public function getChallenge(): array {
        return $this->challenge;
    }
}
