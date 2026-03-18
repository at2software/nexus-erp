<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class CommentType extends Enum {
    const Default = 0;
    const Info    = 1;
    const Warning = 2;
    const Notice  = 3;
}
