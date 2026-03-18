<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Http;
use Symfony\Component\DomCrawler\Crawler;

class HandelsRegister {
    private $cookies   = [];
    private $cid       = '0';
    private $viewState = '';

    public function process($commercialRegister) {
        $html = $this->fetchSearchResults($commercialRegister);
        if (empty($html)) {
            return null;
        }
        return $this->parseCompany($html);
    }
    private function fetchSearchResults($commercialRegister) {
        $url = 'https://www.handelsregister.de/rp_web/normalesuche.xhtml';

        $parts              = preg_split('/[|,]/', $commercialRegister);
        $registerArt        = trim($parts[0] ?? '');
        $registerNummer     = trim($parts[1] ?? '');
        $registerGerichtOrt = trim($parts[2] ?? '');
        $registerGericht    = $this->mapRegistergericht($registerGerichtOrt);

        if (empty($registerArt) || empty($registerNummer) || empty($registerGericht)) {
            return null;
        }

        $parameters = [
            'javax.faces.partial.ajax'      => true,
            'javax.faces.partial.execute'   => '@all',
            'form:btnSuche'                 => 'form:btnSuche',
            'form'                          => 'form',
            'form:registerArt_input'        => $registerArt,
            'form:registerNummer'           => $registerNummer,
            'form:registergericht_input'    => $registerGericht,
            'form:ergebnisseProSeite_input' => 10,
            'javax.faces.ViewState'         => 'stateless',
        ];

        $resultResponse = Http::asForm()->post($url, $parameters);
        if ($resultResponse->failed()) {
            $this->error('Failed to fetch the company data.');
            return null;
        }
        foreach ($resultResponse->cookies() as $cookie) {
            $this->cookies[$cookie->getName()] = $cookie->getValue();
        }
        preg_match('/cid=(\d+)/', $resultResponse->body(), $matches);
        if (isset($matches[1])) {
            $this->cid = $matches[1];
        }
        preg_match('/<update id="j_id1:javax.faces.ViewState:0"><!\[CDATA\[(.*?)\]\]><\/update>/', $resultResponse->body(), $matches);
        if (isset($matches[1])) {
            $this->viewState = $matches[1];
        }
        return $resultResponse->body();
    }
    private function parseCompany($html) {
        $html = trim($html);
        $html = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');
        if (preg_match('/<html.*<\/html>/s', $html, $matches)) {
            $html = $matches[0];
        }
        $crawler    = new Crawler($html);
        $form       = $crawler->filter('form[id=ergebnissForm]')->first();
        $formAction = $form->attr('action');

        $row = $crawler->filter('table[role="grid"] tbody tr[data-ri]')->first();

        $cells = $row->filter('td')->each(function ($cell) {
            return trim($cell->text());
        });

        $links = $crawler->filter('td:nth-child(4) a')->each(function ($linkNode) {
            $onclick = $linkNode->attr('onclick');

            preg_match_all("/'([^']+)'/", $onclick, $matches);
            $params = $matches[1] ?? [];
            return [
                'text'   => $linkNode->filter('span')->text(),
                'spanId' => $linkNode->attr('id') ?? null,
                'params' => $params,
            ];
        });

        $insolvent = false;
        foreach ($links as $link) {
            if ($link['text'] != 'SI') {
                continue;
            }
            $response = Http::asForm()->withCookies($this->cookies, 'www.handelsregister.de')
                ->post('https://www.handelsregister.de'.$formAction, [
                    'ergebnissForm'         => 'ergebnissForm',
                    'javax.faces.ViewState' => $this->viewState,
                    $link['spanId']         => $link['spanId'],
                    'property'              => 'Global.Dokumentart.SI',
                ]);

            if ($response->ok()) {
                $insolvent = strpos($response->body(), 'Insolvenz') !== false;
            }
        }
        return [
            'court'     => $cells[1] ?? '-',
            'name'      => $cells[2] ?? '-',
            'state'     => $cells[3] ?? '-',
            'status'    => $cells[4] ?? '-',
            'insolvent' => $insolvent,
            'history'   => array_slice($cells, 8),
        ];
    }
    private function mapRegisterGericht($registerGerichtOrt) {
        $mapping = [
            'alle'                               => '',
            'Aachen'                             => 'R3101',
            'Altenburg'                          => 'Y1201',
            'Amberg'                             => 'D3101',
            'Ansbach'                            => 'D3201',
            'Apolda'                             => 'Y1101',
            'Arnsberg'                           => 'R1901',
            'Arnstadt'                           => 'Y1102',
            'Arnstadt Zweigstelle Ilmenau'       => 'Y1303',
            'Aschaffenburg'                      => 'D4102',
            'Augsburg'                           => 'D2102',
            'Aurich'                             => 'P3101',
            'Bad Hersfeld'                       => 'M1305',
            'Bad Homburg v.d.H.'                 => 'M1202',
            'Bad Kreuznach'                      => 'T2101',
            'Bad Oeynhausen'                     => 'R2108',
            'Bad Salzungen'                      => 'Y1301',
            'Bamberg'                            => 'D4201',
            'Bayreuth'                           => 'D4301',
            'Berlin'                             => 'F1103',
            'Bielefeld'                          => 'R2101',
            'Bochum'                             => 'R2201',
            'Bonn'                               => 'R3201',
            'Braunschweig'                       => 'P1103',
            'Bremen'                             => 'H1101',
            'Chemnitz'                           => 'U1206',
            'Coburg'                             => 'D4401',
            'Coesfeld'                           => 'R2707',
            'Cottbus'                            => 'G1103',
            'Darmstadt'                          => 'M1103',
            'Deggendorf'                         => 'D2201',
            'Dortmund'                           => 'R2402',
            'Dresden'                            => 'U1104',
            'Duisburg'                           => 'R1202',
            'Düren'                              => 'R3103',
            'Düsseldorf'                         => 'R1101',
            'Eisenach'                           => 'Y1105',
            'Erfurt'                             => 'Y1106',
            'Eschwege'                           => 'M1602',
            'Essen'                              => 'R2503',
            'Flensburg'                          => 'X1112',
            'Frankfurt am Main'                  => 'M1201',
            'Frankfurt/Oder'                     => 'G1207',
            'Freiburg'                           => 'B1204',
            'Friedberg'                          => 'M1405',
            'Fritzlar'                           => 'M1603',
            'Fulda'                              => 'M1301',
            'Fürth'                              => 'D3304',
            'Gelsenkirchen'                      => 'R2507',
            'Gera'                               => 'Y1203',
            'Gießen'                             => 'M1406',
            'Gotha'                              => 'Y1108',
            'Göttingen'                          => 'P2204',
            'Greiz'                              => 'Y1205',
            'Gütersloh'                          => 'R2103',
            'Hagen'                              => 'R2602',
            'Hamburg'                            => 'K1101',
            'Hamm'                               => 'R2404',
            'Hanau'                              => 'M1502',
            'Hannover'                           => 'P2305',
            'Heilbad Heiligenstadt'              => 'Y1109',
            'Hildburghausen'                     => 'Y1302',
            'Hildesheim'                         => 'P2408',
            'Hof'                                => 'D4501',
            'Homburg'                            => 'V1102',
            'Ingolstadt'                         => 'D5701',
            'Iserlohn'                           => 'R2604',
            'Jena'                               => 'Y1206',
            'Kaiserslautern'                     => 'T3201',
            'Kassel'                             => 'M1607',
            'Kempten'                            => 'D2304',
            'Kiel'                               => 'X1517',
            'Kleve'                              => 'R1304',
            'Koblenz'                            => 'T2210',
            'Köln'                               => 'R3306',
            'Königstein'                         => 'M1203',
            'Korbach'                            => 'M1608',
            'Krefeld'                            => 'R1402',
            'Landau'                             => 'T3304',
            'Landshut'                           => 'D2404',
            'Langenfeld'                         => 'R1105',
            'Lebach'                             => 'V1103',
            'Leipzig'                            => 'U1308',
            'Lemgo'                              => 'R2307',
            'Limburg'                            => 'M1706',
            'Lübeck'                             => 'X1721',
            'Ludwigshafen a.Rhein'               => 'T3104',
            'Lüneburg'                           => 'P2507',
            'Mainz'                              => 'T2304',
            'Mannheim'                           => 'B1601',
            'Marburg'                            => 'M1809',
            'Meiningen'                          => 'Y1304',
            'Memmingen'                          => 'D2505',
            'Merzig'                             => 'V1104',
            'Mönchengladbach'                    => 'R1504',
            'Montabaur'                          => 'T2214',
            'Mühlhausen'                         => 'Y1110',
            'München'                            => 'D2601',
            'Münster'                            => 'R2713',
            'Neubrandenburg'                     => 'N1105',
            'Neunkirchen'                        => 'V1105',
            'Neuruppin'                          => 'G1309',
            'Neuss'                              => 'R1102',
            'Nordhausen'                         => 'Y1111',
            'Nürnberg'                           => 'D3310',
            'Offenbach am Main'                  => 'M1114',
            'Oldenburg (Oldenburg)'              => 'P3210',
            'Osnabrück'                          => 'P3313',
            'Ottweiler'                          => 'V1107',
            'Paderborn'                          => 'R2809',
            'Passau'                             => 'D2803',
            'Pinneberg'                          => 'X1321',
            'Pößneck'                            => 'Y1209',
            'Pößneck Zweigstelle Bad Lobenstein' => 'Y1208',
            'Potsdam'                            => 'G1312',
            'Recklinghausen'                     => 'R2204',
            'Regensburg'                         => 'D3410',
            'Rostock'                            => 'N1206',
            'Rudolstadt'                         => 'Y1210',
            'Saarbrücken'                        => 'V1109',
            'Saarlouis'                          => 'V1110',
            'Schweinfurt'                        => 'D4608',
            'Schwerin'                           => 'N1308',
            'Siegburg'                           => 'R3208',
            'Siegen'                             => 'R2909',
            'Sömmerda'                           => 'Y1112',
            'Sondershausen'                      => 'Y1113',
            'Sonneberg'                          => 'Y1307',
            'Stadthagen'                         => 'P2106',
            'Stadtroda'                          => 'Y1214',
            'Steinfurt'                          => 'R2706',
            'Stendal'                            => 'W1215',
            'St. Ingbert'                        => 'V1111',
            'Stralsund'                          => 'N1209',
            'Straubing'                          => 'D3413',
            'Stuttgart'                          => 'B2609',
            'St. Wendel'                         => 'V1112',
            'Suhl'                               => 'Y1308',
            'Tostedt'                            => 'P2613',
            'Traunstein'                         => 'D2910',
            'Ulm'                                => 'B2805',
            'Völklingen'                         => 'V1115',
            'Walsrode'                           => 'P2716',
            'Weiden i. d. OPf.'                  => 'D3508',
            'Weimar'                             => 'Y1114',
            'Wetzlar'                            => 'M1710',
            'Wiesbaden'                          => 'M1906',
            'Wittlich'                           => 'T2408',
            'Wuppertal'                          => 'R1608',
            'Würzburg'                           => 'D4708',
            'Zweibrücken'                        => 'T3403',
        ];
        return $mapping[$registerGerichtOrt] ?? null;
    }
}
