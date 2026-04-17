<?php

namespace App\Actions;

use App\Enums\InvoiceItemType;
use App\Models\Document;
use App\Models\File;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectProjectState;
use Illuminate\Http\Response;

class GenerateProjectQuoteAction {
    public function execute(Project $project): Response {
        ProjectProjectState::create([
            'project_id'       => $project->id,
            'project_state_id' => 6,
        ]);
        $template                                  = Document::getPdfTemplate();
        [$items, $footer, $all, $discounts, $lang] = Invoice::enhancedItemsForPdf(
            $project->indexedItems()->whereStage(0)->get(),
            $project->company
        );

        $content  = $this->buildContent($project, $items, $footer, $discounts, $lang);
        $template = str_replace('[content]', $content, $template);
        $template = Document::personalized($template, $project->addressee, withContactInfo: false, project: $project);

        $data     = Document::renderPdf($template);
        $filename = $this->makeFileName($project, $lang);

        File::saveTo('quotes/'.$filename, $data, $project, 'invoices.values');
        return File::streamPdf($data, utf8_decode($filename));
    }
    private function buildContent(Project $project, $items, $footer, $discounts, string $lang): string {
        $formality = $project->company->getFormality();

        $hasOptionalItems = $items->filter(fn ($item) => $item->type === InvoiceItemType::Optional)->isNotEmpty();
        $content          = '';
        $content .= $project->param('PROJECT_PREFIX', true)->localizedValue($lang, $formality);
        $content .= '<br>';
        foreach ($project->getQuoteDescriptions() as $description) {
            $content .= "<div>$description</div><br>";
        }
        $content .= Invoice::getInvoiceBlade($items, $footer, $discounts, $lang);
        if ($hasOptionalItems) {
            $content .= '<div style="font-size:10pt;">'.__('pdf.quote_optional_items_note', [], $lang).'</div>';
        }
        $content .= '<br>';

        $content .= $project->param('PROJECT_SUFFIX', true)->localizedValue($lang, $formality);
        $content = str_replace('[payment-plan]', $this->renderPaymentPlanHtml($project, $lang), $content);
        return $content;
    }
    private function renderPaymentPlanHtml(Project $project, string $lang): string {
        $steps = $project->getEffectivePaymentPlan();
        if (empty($steps)) {
            return '';
        }

        $isDe      = $lang === 'de';
        $headerPct = $isDe ? '%' : '%';
        $headerDue = $isDe ? 'Fälligkeit' : 'Due';
        $headerAmt = $isDe ? 'Betrag (netto)' : 'Amount (net)';
        $net       = $project->net;

        $rows = '';
        foreach ($steps as $step) {
            $percentage = (int)($step['percentage'] ?? 0);
            $trigger    = $step['trigger'] ?? '';
            $months     = (int)($step['months'] ?? 0);
            $amount     = $net * ($percentage / 100);
            $formatted  = number_format($amount, 2, ',', '.');

            $label = match ($trigger) {
                'project_start'    => $isDe ? 'bei Projektstart' : 'upon project start',
                'feature_complete' => $isDe ? 'bei Feature-Complete' : 'upon feature complete',
                'acceptance'       => $isDe ? 'bei Abnahme' : 'upon acceptance',
                'monthly'          => $isDe
                    ? "{$months} monatliche Vorausrate(n) nach Projektstart"
                    : "{$months} monthly prepayment(s) after project start",
                default => $trigger,
            };

            $rows .= "<tr><td style='padding:3px 8px;'>{$percentage}%</td>"
                   ."<td style='padding:3px 8px;'>{$label}</td>"
                   ."<td style='padding:3px 8px; text-align:right;'>€ {$formatted}</td></tr>";
        }
        return "<table style='width:100%; border-collapse:collapse; margin:8px 0; font-size:10pt;'>"
             ."<tr style='font-weight:bold; border-bottom:1px solid #ccc;'>"
             ."<td style='padding:3px 8px;'>{$headerPct}</td>"
             ."<td style='padding:3px 8px;'>{$headerDue}</td>"
             ."<td style='padding:3px 8px; text-align:right;'>{$headerAmt}</td></tr>"
             .$rows
             .'</table>';
    }
    private function makeFileName(Project $project, string $lang): string {
        return date('Y-m-d').' '.__('pdf.quote', [], $lang).' '.File::filename_safe($project->name).'.pdf';
    }
}
