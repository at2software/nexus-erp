<?php

namespace App\Http\Controllers;

use App\Enums\FileType;
use App\Models\Company;
use App\Models\Document;
use App\Models\File;
use App\Models\Param;
use App\Models\Project;
use App\Models\User;
use App\Traits\ControllerHasPermissionsTrait;
use Barryvdh\DomPDF\Facade\Pdf;

class FileController extends Controller {
    use ControllerHasPermissionsTrait;

    public function show(int $id) {
        $file = File::findOrFail($id);
        return File::stream($file->dir, utf8_decode($file->name));
    }
    public function destroy(File $file) {
        return $file->delete();
    }
    public function uploadAvatar(Company|User $obj) {
        request()->validate(['file' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048']);
        return $obj->setPhoto(request()->file('file')->path());
    }
    public function uploadTravelExpenses() {
        $request = request();
        $me      = Company::find(Param::get('ME_ID')->value);
        $total   = 0;
        $data    = json_decode($request->data);
        foreach (@$data->days as $_) {
            $total += $_->sum;
        }
        foreach (@$data->expenses as $_) {
            $total += $_->sum;
        }
        $headers = [];
        $info    = '<div style="position:absolute; top: -7cm; left: 0cm; width: 10cm;">'.
            Document::pdfBlockRow('Mitarbeiter', $request->user()->name).
            Document::pdfBlockRow('Reiseanlass', $data->purpose).
            Document::pdfBlockRow('Strecke', $data->way).
            Document::pdfBlockRow('Start', $data->start).
            Document::pdfBlockRow('Ende', $data->end)
            .'</div>';

        $content  = $info.
            '<div style="margin-top: -4cm;">'
            .view('TravelExpense', ['data' => $data, 'user' => $request->user()->name, 'total' => $total])->render()
            .'</div>';
        $template = Document::getPdfTemplate('Reisekostenabrechnung', ['address']);
        $template = str_replace('[content]', $content, $template);
        $template = Document::personalized($template, null, $headers, false);

        $pdf      = Pdf::loadHTML($template);
        $filename = File::filename_safe($data->start.'-'.$data->end.' - '.$request->user()->name.'.pdf');
        $filepath = 'travel-expenses/'.$filename;
        $f        = File::saveTo($filepath, $pdf->stream()->getContent(), $request->user(), 'hr.module');
        $f->type  = FileType::TypeTravelExpenses;
        $f->save();

        $uploadedFiles = $request->file('file', []);

        // Validate uploaded files for PDF merging
        foreach ($uploadedFiles as $uploadedFile) {
            if ($uploadedFile && $uploadedFile->getMimeType() !== 'application/pdf') {
                return response()->json(['error' => 'Only PDF files are allowed for travel expense attachments.'], 422);
            }
        }

        $changed = Document::mergePdfs($filepath, $uploadedFiles);
        if ($changed) {
            $content = \Illuminate\Support\Facades\File::get(storage_path('app/'.$filepath));
            return response($content, 200)
                ->header('Access-Control-Expose-Headers', 'Content-Type, Content-Disposition')
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
        }
        return response($pdf->stream()->getContent())->withHeaders(File::headers($filename, 'application/pdf'));
    }
    public function storeCompanyAvatar(Company $_) {
        return $this->uploadAvatar($_);
    }
    public function storeUserAvatar(User $_) {
        return $this->uploadAvatar($_);
    }
    public static function uploadMedia(Company|Project $obj) {
        request()->validate([
            'file' => 'required|mimes:pdf,jpeg,png,jpg,gif,webp|max:10240',
        ]);
        $dir = request()->file('file')->store('media');
        return File::create([
            'name' => request()->file('file')->getClientOriginalName(),
            'dir'  => $dir,
            'mime' => request()->file('file')->getMimeType(),
            ...$obj->toPoly(),
        ]);
    }
    public function uploadProjectMedia(Project $_) {
        return $this->uploadMedia($_);
    }
    public function uploadCompanyMedia(Company $_) {
        return $this->uploadMedia($_);
    }
    public static function usesVcardTrait($obj) {
        return in_array(\App\Traits\VcardTrait::class, class_uses_recursive($obj));
    }
}
