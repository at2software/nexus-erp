<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class ProjectIssueSource extends Enum {
    const Internal = 0;
    const GitLab   = 1;
    const Mantis   = 2;
}
