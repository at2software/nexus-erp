<?php

namespace App\Builders;

class AssignmentBuilder extends BaseBuilder {
    public function whereParent($obj) {
        return $this->whereMorph($obj);
    }
    public function whereAssignee($obj) {
        return $this->whereMorph($obj, 'assignee');
    }
    public function whereParentAndAssignee($parent, $assignee) {
        return $this->whereParent($parent)->whereAssignee($assignee);
    }
}
