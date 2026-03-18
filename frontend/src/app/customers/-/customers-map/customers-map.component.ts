import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CompanyService } from '@models/company/company.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import * as L from 'leaflet';

interface CustomerLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    path: string;
    pinSize: 'small' | 'medium' | 'large';
    pinColor: 'grey' | 'red' | 'orange' | 'yellow' | 'green';
}

@Component({
    selector: 'customers-map',
    templateUrl: './customers-map.component.html',
    styleUrls: ['./customers-map.component.scss'],
    standalone: true,
    imports: [ToolbarComponent]
})
export class CustomersMapComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLElement>;
    
    #companyService = inject(CompanyService);
    
    #map?: L.Map;
    #markers: L.Marker[] = [];
    customers: CustomerLocation[] = [];
    loading = true;

    constructor() {
        // Fix Leaflet default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
            iconUrl: 'assets/leaflet/marker-icon.png',
            shadowUrl: 'assets/leaflet/marker-shadow.png',
        });
    }

    ngOnInit(): void {
        this.#loadCustomers();
    }

    ngAfterViewInit(): void {
        this.#initializeMap();
    }

    ngOnDestroy(): void {
        if (this.#map) {
            this.#map.remove();
        }
    }

    #loadCustomers(): void {
        this.loading = true;
        this.#companyService.getWithCoordinates().subscribe((response: any) => {
            this.customers = response as CustomerLocation[];
            this.loading = false;
            if (this.#map) {
                this.#addMarkersToMap();
            }
        }, (error) => {
            console.error('Error loading customers:', error);
            this.loading = false;
        });
    }

    #initializeMap(): void {
        // Initialize map centered on Europe
        this.#map = L.map(this.mapContainer.nativeElement, {
            center: [50.0, 10.0], // Center of Europe
            zoom: 4,
            zoomControl: false,
            scrollWheelZoom: true,
            attributionControl: false
        });

        // Add dark themed tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(this.#map);

        // Add markers if customers are already loaded
        if (this.customers.length > 0) {
            this.#addMarkersToMap();
        }
    }

    #addMarkersToMap(): void {
        if (!this.#map) return;

        // Clear existing markers
        this.#markers.forEach(marker => marker.remove());
        this.#markers = [];

        // Add markers for each customer
        this.customers.forEach(customer => {
            // Validate coordinates before creating marker
            if (customer.lat && customer.lng && 
                !isNaN(customer.lat) && !isNaN(customer.lng) && 
                isFinite(customer.lat) && isFinite(customer.lng)) {
                
                // Create custom icon based on pin properties
                const customIcon = this.#createCustomIcon(customer.pinSize, customer.pinColor);
                
                const marker = L.marker([customer.lat, customer.lng], { icon: customIcon })
                    .bindPopup(`
                        <div class="customer-popup">
                            <h6>${customer.name}</h6>
                            <button class="btn btn-sm btn-primary mt-2" onclick="window.open('${customer.path}', '_blank')">
                                View Customer
                            </button>
                        </div>
                    `)
                    .on('click', () => {
                        // Optional: navigate to customer detail
                        // this.#router.navigate([customer.path]);
                    });

                marker.addTo(this.#map!);
                this.#markers.push(marker);
            } else {
                console.warn('Invalid coordinates for customer:', customer.name, customer.lat, customer.lng);
            }
        });

        // Fit map bounds to show all markers if there are any
        if (this.#markers.length > 0) {
            const group = new L.FeatureGroup(this.#markers);
            this.#map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    onMarkerClick(customer: CustomerLocation): void {
        window.open(customer.path, '_blank');
    }

    #createCustomIcon(size: string, color: string): L.Icon {
        const sizes: Record<string, [number, number]> = {
            small: [12, 19],
            medium: [18, 29],
            large: [24, 38]
        };

        const iconSize = sizes[size as keyof typeof sizes] || sizes.small;

        return L.icon({
            iconUrl: `data:image/svg+xml;base64,${btoa(this.#createMarkerSvg(color))}`,
            shadowUrl: 'assets/leaflet/marker-shadow.png',
            iconSize: iconSize,
            iconAnchor: [iconSize[0] / 2, iconSize[1]],
            popupAnchor: [0, -iconSize[1]],
            shadowSize: [41, 41],
            shadowAnchor: [12, 41]
        });
    }

    #createMarkerSvg(color: string): string {
        const colors = {
            grey: '#6c757d',
            red: '#dc3545',
            orange: '#fd7e14',
            yellow: '#ffc107',
            green: '#28a745'
        };

        const fillColor = colors[color as keyof typeof colors] || colors.grey;

        return `
            <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.596 19.404 0 12.5 0z" 
                      fill="${fillColor}" 
                      stroke="#000" 
                      stroke-width="1"/>
                <circle cx="12.5" cy="12.5" r="4" fill="#fff"/>
            </svg>
        `;
    }
}