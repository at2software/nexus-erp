<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class ProjectVersioningSource extends Enum {
    const None   = 0;
    const GitLab = 1;
}
