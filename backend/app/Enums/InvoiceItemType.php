<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class InvoiceItemType extends Enum {
    const Default               = 0;
    const Inactive              = 1;
    const Optional              = 2;
    const Paydown               = 10;
    const Discount              = 11;
    const Instalment            = 12;
    const Header                = 20;
    const Daily                 = 30;
    const Weekly                = 31;
    const Monthly               = 32;
    const Quarterly             = 33;
    const Yearly                = 34;
    const Repeating             = [self::Daily, self::Weekly, self::Monthly, self::Quarterly, self::Yearly];
    const Total                 = [self::Default, self::Discount, self::Paydown];
    const TotalRemaining        = [self::Default, self::Discount, self::Paydown, self::Instalment];
    const ProjectTotal          = [self::Default, self::Discount];
    const ProjectTotalRemaining = [self::Default, self::Discount, self::Paydown, self::Instalment];
}
