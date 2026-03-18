// German Travel Allowance Data for 2025
// Based on ARVVwV 2025 (Allgemeine Verwaltungsvorschrift über die Neufestsetzung der Auslandstage- und Auslandsübernachtungsgelder)

export interface TravelAllowanceRates {
    country: string;
    kleinePauschale: number;   // Small allowance (arrival/departure day)
    grossePauschale: number;   // Large allowance (full 24-hour day)
    uebernachtung: number;     // Accommodation allowance
}

// Travel allowance rates for 2025 (amounts in EUR)
// Source: BMF "Steuerliche Behandlung von Reisekosten und Reisekostenvergütungen bei betrieblich und beruflich veranlassten Auslandsreisen ab 1. Januar 2025"
export const TRAVEL_ALLOWANCE_DATA: TravelAllowanceRates[] = [
    // Germany (domestic travel)
    { country: 'Deutschland', kleinePauschale: 14, grossePauschale: 28, uebernachtung: 20 },
    
    // Major European countries
    { country: 'Österreich', kleinePauschale: 26, grossePauschale: 39, uebernachtung: 88 },
    { country: 'Schweiz', kleinePauschale: 40, grossePauschale: 60, uebernachtung: 143 },
    { country: 'Frankreich', kleinePauschale: 39, grossePauschale: 58, uebernachtung: 159 },
    { country: 'Italien', kleinePauschale: 30, grossePauschale: 45, uebernachtung: 119 },
    { country: 'Spanien', kleinePauschale: 27, grossePauschale: 41, uebernachtung: 91 },
    { country: 'Niederlande', kleinePauschale: 34, grossePauschale: 51, uebernachtung: 130 },
    { country: 'Belgien', kleinePauschale: 30, grossePauschale: 46, uebernachtung: 117 },
    { country: 'Luxemburg', kleinePauschale: 33, grossePauschale: 49, uebernachtung: 138 },
    { country: 'Dänemark', kleinePauschale: 40, grossePauschale: 60, uebernachtung: 145 },
    { country: 'Schweden', kleinePauschale: 35, grossePauschale: 53, uebernachtung: 119 },
    { country: 'Norwegen', kleinePauschale: 44, grossePauschale: 66, uebernachtung: 159 },
    { country: 'Finnland', kleinePauschale: 32, grossePauschale: 48, uebernachtung: 120 },
    { country: 'Polen', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
    { country: 'Tschechien', kleinePauschale: 22, grossePauschale: 33, uebernachtung: 75 },
    
    // Major non-European countries
    { country: 'Vereinigtes Königreich', kleinePauschale: 44, grossePauschale: 66, uebernachtung: 163 },
    { country: 'USA', kleinePauschale: 44, grossePauschale: 66, uebernachtung: 308 },
    { country: 'Kanada', kleinePauschale: 35, grossePauschale: 53, uebernachtung: 133 },
    { country: 'Japan', kleinePauschale: 40, grossePauschale: 60, uebernachtung: 181 },
    { country: 'Australien', kleinePauschale: 35, grossePauschale: 53, uebernachtung: 151 },
    { country: 'China', kleinePauschale: 30, grossePauschale: 45, uebernachtung: 108 },
    { country: 'Indien', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
    { country: 'Singapur', kleinePauschale: 35, grossePauschale: 53, uebernachtung: 163 },
    { country: 'Südkorea', kleinePauschale: 30, grossePauschale: 45, uebernachtung: 119 },
    
    // Additional European countries
    { country: 'Griechenland', kleinePauschale: 28, grossePauschale: 42, uebernachtung: 96 },
    { country: 'Portugal', kleinePauschale: 27, grossePauschale: 41, uebernachtung: 89 },
    { country: 'Irland', kleinePauschale: 35, grossePauschale: 53, uebernachtung: 141 },
    { country: 'Island', kleinePauschale: 38, grossePauschale: 57, uebernachtung: 145 },
    { country: 'Kroatien', kleinePauschale: 25, grossePauschale: 38, uebernachtung: 81 },
    { country: 'Ungarn', kleinePauschale: 22, grossePauschale: 33, uebernachtung: 75 },
    { country: 'Slowakei', kleinePauschale: 22, grossePauschale: 33, uebernachtung: 70 },
    { country: 'Slowenien', kleinePauschale: 25, grossePauschale: 38, uebernachtung: 85 },
    { country: 'Estland', kleinePauschale: 23, grossePauschale: 35, uebernachtung: 78 },
    { country: 'Lettland', kleinePauschale: 23, grossePauschale: 35, uebernachtung: 75 },
    { country: 'Litauen', kleinePauschale: 23, grossePauschale: 35, uebernachtung: 75 },
    
    // Rest of world (sample countries with standard rates)
    { country: 'Brasilien', kleinePauschale: 25, grossePauschale: 38, uebernachtung: 89 },
    { country: 'Argentinien', kleinePauschale: 25, grossePauschale: 38, uebernachtung: 85 },
    { country: 'Chile', kleinePauschale: 28, grossePauschale: 42, uebernachtung: 96 },
    { country: 'Mexiko', kleinePauschale: 25, grossePauschale: 38, uebernachtung: 89 },
    { country: 'Südafrika', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
    { country: 'Ägypten', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
    { country: 'Marokko', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
    { country: 'Israel', kleinePauschale: 30, grossePauschale: 45, uebernachtung: 130 },
    { country: 'Türkei', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
    { country: 'Russland', kleinePauschale: 25, grossePauschale: 38, uebernachtung: 89 },
    { country: 'Ukraine', kleinePauschale: 20, grossePauschale: 30, uebernachtung: 66 },
];

// Helper function to get travel allowance rates by country name
export function getTravelAllowanceByCountry(countryName: string): TravelAllowanceRates | undefined {
    return TRAVEL_ALLOWANCE_DATA.find(rate => rate.country === countryName);
}

// Helper function to get all available countries
export function getAvailableCountries(): string[] {
    return TRAVEL_ALLOWANCE_DATA.map(rate => rate.country).sort();
}