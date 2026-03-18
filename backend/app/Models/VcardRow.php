<?php

namespace App\Models;

class VcardRow {
    private string $name;
    private array $parameters;
    private array $values;

    public function __construct(string $line) {
        // Split into left (name+params) and right (values) parts
        [$left, $right] = array_pad(explode(':', $line, 2), 2, '');

        // Parse name and parameters
        $parts            = explode(';', $left);
        $this->name       = strtoupper(array_shift($parts));
        $this->parameters = [];

        // Parse parameters (TYPE=work,voice -> ['TYPE' => ['work', 'voice']])
        foreach ($parts as $param) {
            [$key, $value]                      = array_pad(explode('=', $param, 2), 2, '');
            $this->parameters[strtoupper($key)] = array_map('trim', explode(',', $value));
        }

        // Parse values (a;b;c -> ['a', 'b', 'c'])
        $this->values = array_map('trim', explode(';', $right));
    }
    public function getName(): string {
        return $this->name;
    }
    public function getParameters(): array {
        return $this->parameters;
    }
    public function getValues(): array {
        return $this->values;
    }
    public function hasParameter(string $key, string $value): bool {
        $key = strtoupper($key);
        return isset($this->parameters[$key]) && in_array($value, $this->parameters[$key]);
    }
    public function toLine(): string {
        $parts = [$this->name];

        foreach ($this->parameters as $key => $values) {
            $parts[] = $key.'='.implode(',', $values);
        }
        return implode(';', $parts).':'.implode(';', $this->values);
    }
    public function __toString(): string {
        return $this->toLine();
    }
}
