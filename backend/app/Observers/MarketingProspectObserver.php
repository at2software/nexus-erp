<?php

namespace App\Observers;

use App\Models\MarketingProspect;

class MarketingProspectObserver {
    public function created(MarketingProspect $prospect) {
        $prospect->initializeWorkflowActivities();
    }
}
