<?php

namespace App\Enums;

enum TaskState: int {
    case Open   = 0;
    case Closed = 1;
}
