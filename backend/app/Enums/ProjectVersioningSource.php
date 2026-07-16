<?php

namespace App\Enums;

enum ProjectVersioningSource: int {
    case None   = 0;
    case GitLab = 1;
}
