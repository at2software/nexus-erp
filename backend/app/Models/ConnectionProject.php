<?php

namespace App\Models;

use App\Collections\ConnectionProjectCollection;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * @property Connection $connection
 */
class ConnectionProject extends BaseModel {
    use HasFactory;

    protected $fillable = ['project_id', 'connection_id'];

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
