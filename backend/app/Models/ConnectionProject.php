<?php

namespace App\Models;

use App\Collections\ConnectionProjectCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Summary of ConnectionProject
 * Company connections can be linked to multiple projects.
 * E.g.: Our company made a project with company A and the invoice is sent to A as well
 * but A is only a subcontractor of B, who itself is only a subcontractor of the end customer C.
 * Since the invoice is only sent to A, the stats would still show B and C without revenue (which is true)
 * but we still want to keep track that we indirectly had a project with them.
 */
/**
 * @property Connection $connection
 */
class ConnectionProject extends BaseModel {
    use HasFactory;

    protected $fillable = ['project_id', 'connection_id'];
    protected $access   = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    public function connection() {
        return $this->belongsTo(Connection::class);
    }
    public function project() {
        return $this->belongsTo(Project::class);
    }
    public function newCollection(array $models = []) {
        return new ConnectionProjectCollection($models);
    }
}
