<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MarketingAssetController extends Controller {
    /**
     * Get list of marketing assets
     */
    public function index(Request $request) {
        $query = File::where('parent_type', 'marketing');

        // Get parameters from query string or request body
        $category    = $request->input('category');
        $searchQuery = $request->input('query');
        $searchTags  = $request->input('tags');

        // Filter by category if provided
        if ($category) {
            $query->where('category', $category);
        }

        // Search by filename if query provided
        if ($searchQuery) {
            $query->where('name', 'like', '%'.$searchQuery.'%');
        }

        // Search by tags if provided
        if ($searchTags) {
            $tags = explode(',', $searchTags);
            $query->where(function ($q) use ($tags) {
                foreach ($tags as $tag) {
                    $tag = trim($tag);
                    if ($tag) {
                        $q->orWhere('tags', 'like', '%'.$tag.'%');
                    }
                }
            });
        }

        $assets = $query->latest()->get()->map(function ($file) {
            return [
                'id'           => $file->id,
                'name'         => $file->name,
                'mime'         => $file->mime,
                'category'     => $file->category ?? 'Documents',
                'tags'         => $file->tags ? explode(',', $file->tags) : [],
                'created_at'   => $file->created_at->toISOString(),
                'file_size'    => $file->file_size,
                'dimensions'   => $file->dimensions,
                'download_url' => route('files.show', $file->id),
                'preview_url'  => $this->getPreviewUrl($file),
                'thumbnail'    => $file->thumbnail,
            ];
        });
        return response()->json($assets);
    }

    /**
     * Store a new marketing asset
     */
    public function store(Request $request) {
        // Handle FormData uploads
        $uploadedFile = $request->file('file');

        if (! $uploadedFile) {
            return response()->json(['error' => 'No file uploaded'], 422);
        }

        // Validate file
        $request->validate([
            'file' => 'required|file|max:20480', // 20MB max
        ]);

        // Get category from FormData
        $category = $request->input('category') ?: $this->categorizeFile($uploadedFile);

        // Generate unique filename
        $filename  = time().'_'.File::filename_safe($uploadedFile->getClientOriginalName());
        $directory = 'marketing-assets/'.Str::slug($category);
        $filepath  = $directory.'/'.$filename;

        // Store file
        $path = Storage::putFileAs($directory, $uploadedFile, $filename);

        // Get file info
        $fileSize   = $uploadedFile->getSize();
        $dimensions = null;

        // Get image dimensions if it's an image
        if (Str::startsWith($uploadedFile->getMimeType(), 'image/')) {
            $imageInfo = getimagesize($uploadedFile->getPathname());
            if ($imageInfo) {
                $dimensions = $imageInfo[0].'x'.$imageInfo[1];
            }
        }

        // Create file record
        $file = File::create([
            'name'        => $uploadedFile->getClientOriginalName(),
            'dir'         => $filepath,
            'mime'        => $uploadedFile->getMimeType(),
            'parent_type' => 'marketing',
            'parent_id'   => null,
            'category'    => $category,
            'file_size'   => $fileSize,
            'dimensions'  => $dimensions,
            'uploaded_by' => Auth::id(),
        ]);
        return response()->json([
            'id'       => $file->id,
            'name'     => $file->name,
            'mime'     => $file->mime,
            'category' => $file->category,
            'message'  => 'Asset uploaded successfully',
        ]);
    }

    /**
     * Delete a marketing asset
     */
    public function destroy($id) {
        $file = File::findOrFail($id);

        // Delete physical file
        if (Storage::exists($file->dir)) {
            Storage::delete($file->dir);
        }

        // Delete database record
        $file->delete();
        return response()->json(['message' => 'Asset deleted successfully']);
    }

    /**
     * Update asset tags
     */
    public function updateTags($id, Request $request) {
        $file = File::findOrFail($id);

        $request->validate([
            'tags'   => 'array',
            'tags.*' => 'string|max:50',
        ]);

        $tags       = $request->input('tags', []);
        $file->tags = implode(',', $tags);
        $file->save();
        return response()->json([
            'message' => 'Tags updated successfully',
            'tags'    => $tags,
        ]);
    }

    /**
     * Categorize file based on mime type and extension
     */
    private function categorizeFile($file): string {
        $extension = strtolower($file->getClientOriginalExtension());
        $mimeType  = $file->getMimeType();

        if (Str::startsWith($mimeType, 'image/')) {
            if (in_array($extension, ['svg', 'ai', 'eps'])) {
                return 'Brand Assets';
            }
            return 'Social Media';
        }

        if (Str::startsWith($mimeType, 'video/')) {
            return 'Video Content';
        }

        if (in_array($extension, ['pdf', 'doc', 'docx'])) {
            return 'Documents';
        }

        if (in_array($extension, ['ppt', 'pptx'])) {
            return 'Presentations';
        }

        if (in_array($extension, ['html', 'htm'])) {
            return 'Email Templates';
        }
        return 'Documents';
    }

    /**
     * Get preview URL for file if applicable
     */
    private function getPreviewUrl($file): ?string {
        // Only generate preview URLs for images
        if (Str::startsWith($file->mime, 'image/')) {
            return route('files.show', $file->id);
        }
        return null;
    }
}
