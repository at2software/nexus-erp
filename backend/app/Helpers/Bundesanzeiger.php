<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Http;
use Symfony\Component\DomCrawler\Crawler;

class Bundesanzeiger {
    private $headers = ['Referer' => 'https://www.bundesanzeiger.de/'];
    private $cookies = [];

    public function process($fulltext, $startDate, $endDate) {
        $html = $this->fetchSearchResults($fulltext, $startDate, $endDate);
        if (empty($html)) {
            return null;
        }
        return $this->parseReports($html);
    }
    private function fetchSearchResults($fulltext, $startDate, $endDate) {
        $initialResponse = Http::withHeaders($this->headers)->get('https://www.bundesanzeiger.de');
        if ($initialResponse->failed()) {
            $this->error('Failed to fetch the initial page.');
            return null;
        }

        foreach ($initialResponse->cookies() as $cookie) {
            $this->cookies[$cookie->getName()] = $cookie->getValue();
        }

        $startPageResponse = Http::withHeaders($this->headers)->withCookies($this->cookies, 'www.bundesanzeiger.de')
            ->get('https://www.bundesanzeiger.de/pub/de/start?0');
        if ($startPageResponse->failed()) {
            $this->error('Failed to fetch the start page.');
            return null;
        }

        $searchUrl      = 'https://www.bundesanzeiger.de/pub/de/start?0-2.-top%7Econtent%7Epanel-left%7Ecard-form=&fulltext='.urlencode($fulltext).'&start_date="01.01.2023"&end_date="12.12.2024"&area_select=&search_button=Suchen';
        $searchResponse = Http::withHeaders($this->headers)->withCookies($this->cookies, 'www.bundesanzeiger.de')
            ->get($searchUrl);
        if ($searchResponse->failed()) {
            $this->error('Failed to perform the search.');
            return null;
        }
        return $searchResponse->body();
    }
    private function parseReports($html) {
        $crawler = new Crawler($html);

        $reports = [];

        $crawler->filter('.result_container .row')->each(function (Crawler $node, $i) use (&$reports) {
            $date    = $node->filter('.date')->count() ? $node->filter('.date')->text() : null;
            $name    = $node->filter('.info a')->count() ? $node->filter('.info a')->text() : null;
            $link    = $node->filter('.info a')->count() ? $node->filter('.info a')->attr('href') : null;
            $company = $node->filter('.first')->count() ? $node->filter('.first')->text() : null;

            if (! $date || ! $name || ! $link || ! $company) {
                return;
            }

            $reports[] = [
                'date'    => $date,
                'name'    => $name,
                'link'    => $link,
                'company' => $company,
            ];
        });
        return $reports;
    }
}
