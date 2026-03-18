import { Component, Input, OnInit, OnChanges, OnDestroy, AfterViewInit, ViewChildren, QueryList, ElementRef, inject } from '@angular/core';
import { VcardRow } from 'src/models/vcard/VcardRow';
import { Company } from 'src/models/company/company.model';
import { CompanyContact } from 'src/models/company/company-contact.model';
import { Contact } from 'src/models/company/contact.model';
import { ActionEmitterType } from 'src/app/nx/nx.directive';
import { VcardClass } from 'src/models/vcard/VcardClass';
import { User } from 'src/models/user/user.model';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { NominatimHttpWrapper } from 'src/models/http/http.nominatim';
import { SOCIAL_MEDIA_TYPES } from './socialmediatypes';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import * as L from 'leaflet';
import { DB_COUNTRIES } from '../db.countries';
import { DB_PLZ } from '../db.plz';

@Component({
    selector: 'app-vcard',
    templateUrl: './vcard.component.html',
    styleUrls: ['./vcard.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NexusModule, NgbDropdownModule, NgbTooltipModule]
})
export class VcardComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {

    @Input() object: VcardClass
    @Input() type: string = 'work'
    @ViewChildren('mapContainer') mapContainers!: QueryList<ElementRef<HTMLElement>>;

    liClass: string = 'list-group-item pe-9 px-3 py-1'

    db_countries: any[] = DB_COUNTRIES
    db_plz: any[] = DB_PLZ
    showNameDetails:boolean = false
    smtypes = SOCIAL_MEDIA_TYPES
    smtypekeys:string[] = Object.keys(this.smtypes)
    #nominatim = inject(NominatimHttpWrapper)
    singleGeoLoad:boolean = false
    isImportingImprint:boolean = false
    #mapInstances = new Map<HTMLElement, L.Map>();
    src_string:string

    constructor() {
        // Fix Leaflet default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
            iconUrl: 'assets/leaflet/marker-icon.png',
            shadowUrl: 'assets/leaflet/marker-shadow.png',
        });
    }

    isCompany        = (): boolean => this.object instanceof Company
    isCompanyContact = (): boolean => this.object instanceof CompanyContact
    isContact        = (): boolean => this.object instanceof Contact
    isUser           = (): boolean => this.object instanceof User
    isProspect       = (): boolean => this.object instanceof MarketingProspect
    
    smSrcForKey = (key?:string) => (key && this.smtypekeys.includes(key)) ? this.smtypes[key] : undefined

    resetDirty = ():void => {
        if (this.object?.card) {
            this.src_string = this.object.card.toString()
            const geo = this.object.card.get('GEO').first()
            if (!geo) {
                this.#nominatim.init().then(() => {
                    const adr = this.object.card?.get('ADR').first() ?? undefined
                    if (adr) {
                        if (!this.singleGeoLoad) {
                            this.singleGeoLoad = true
                            this.#nominatim.lookup(adr).subscribe(info => {
                                if (Array.isArray(info) && info.length) {
                                    this.object.card?.rows.push(new VcardRow('GEO', [], [info[0].lat, info[0].lon]))
                                    this.updateVcard()
                                }
                            })
                        }
                    }
                })

            }
        }
    }
    useName = (event:any) => {
        if (event.ctrlKey) {
           this.onOrgChange(event)
        }
    }
    ngOnInit (): void {
        this.resetDirty()
        this.ensureI18nFields()
    }

    ngAfterViewInit() {
        this.initializeMaps();
    }

    ngOnChanges ():void {
        this.resetDirty()
        this.ensureI18nFields()
        // Re-initialize maps when object changes
        setTimeout(() => this.initializeMaps(), 0);
    }
    isDirty = ():boolean => this.src_string != this.object.card?.toString()

    delete = (r: any) => {
        this.object.card?.rows.splice(r as number, 1)
    }
    removeRow = (_: any) => {
        this.object.card?.rows.splice(this.object.card.rows.indexOf(_ as VcardRow), 1)
    }
    addRow = (s: string) => {
        const row = VcardRow.fromString(s)
        if (row && this.object.card) this.object.card.rows.push(row)
    }
    addEmergencyContact = () => {
        if (this.object.card) {
            this.object.card.rows.push(VcardRow.fromString('RELATED;TYPE=emergency:')!)
            this.object.card.rows.push(VcardRow.fromString('TEL;TYPE=cell,emergency:')!)
        }
    }
    updateVcard = () => {
        if (this.isDirty()) {
            // Store data that might not be returned by the update API
            const preservedData: any = {};
            if (this.object instanceof MarketingProspect && this.object.activities) {
                preservedData.activities = this.object.activities;
            }
            
            this.object.update({'vcard': this.object.card?.toString() }).subscribe((response)=> {
                if (this.object instanceof CompanyContact) {
                    this.object.contact = Contact.fromJson(response.contact)
                }
                
                // Restore preserved data if it wasn't in the response
                if (this.object instanceof MarketingProspect && preservedData.activities && !response.activities) {
                    (this.object as MarketingProspect).activities = preservedData.activities;
                }
            })
        }
    }
    importImprint = () => {
        if (!(this.object instanceof Company) || this.isImportingImprint) return

        this.isImportingImprint = true
        this.object.importImprint().subscribe({
            next: (_) => {
                Object.assign(this.object, _)
                this.isImportingImprint = false
            },
            error: () => {
                this.isImportingImprint = false
            }
        })
    }
    getTelType = (row:VcardRow) => {
        if (row.mods.filter(_ => _.toLowerCase().match('voice')).length) return 'VOICE'
        if (row.mods.filter(_ => _.toLowerCase().match('cell')).length) return 'MOBILE'
        if (row.mods.filter(_ => _.toLowerCase().match('fax')).length) return 'FAX'
        if (row.mods.filter(_ => _.toLowerCase().match('work')).length) return 'WORK'
        if (row.mods.filter(_ => _.toLowerCase().match('home')).length) return 'HOME'
        return 'VOICE'
    }
    setTelType = (row:VcardRow, type:string) => {
        const isEmergency = this.isEmergencyContact(row)
        row.mods = row.mods.filter(_ => !_.toLowerCase().match(/^type=/i))

        if (isEmergency) {
            row.mods.push(`TYPE=${type},emergency`)
        } else {
            row.mods.push(`TYPE=${type}`)
        }
    }
    isEmergencyContact = (row:VcardRow) => {
        return row.mods.some(_ => _.toLowerCase().includes('emergency'))
    }
    getEmergencyTelForRelated = (relatedIndex:number):VcardRow|null => {
        if (!this.object.card) return null
        for (let i = relatedIndex + 1; i < this.object.card.rows.length; i++) {
            const row = this.object.card.rows[i]
            if (row.key === 'TEL' && this.isEmergencyContact(row)) {
                return row
            }
            if (row.key === 'RELATED') break
        }
        return null
    }
    isEmergencyTelForRelated = (telRow:VcardRow):boolean => {
        if (!this.object.card || telRow.key !== 'TEL') return false
        if (!this.isEmergencyContact(telRow)) return false
        const telIndex = this.object.card.rows.indexOf(telRow)
        for (let i = telIndex - 1; i >= 0; i--) {
            const row = this.object.card.rows[i]
            if (row.key === 'RELATED' && row.mods.includes('TYPE=emergency')) {
                return true
            }
            if (row.key === 'TEL') break
        }
        return false
    }

    org = () => this.object.card?.first("ORG")?.vals[0] ?? ''
    onOrgChange = ($event:any) => {
        if (this.object.card) {
            this.object.card.get('FN')[0].vals[0] = $event.target.value
            this.object.card.get('ORG')[0].vals[0] = $event.target.value
        }
    }
    fn = () => this.object.card?.get("FN")[0].vals[0] ?? ''
    onFnChange($event:any) {
        if (this.object.card) {
            this.object.card.get("FN")[0].vals[0] = $event.target.value
            const n = this.object.card?.get("N")
            if (n.length) {
                const parts = $event.target.value.split(' ')
                const ref = n[0].vals
                if (parts.length > 0) ref[1] = parts.shift(); else ref[1] = ''
                if (parts.length > 0) ref[0] = parts.pop(); else ref[0] = ''
                if (parts.length > 0) ref[2] = parts.join(' '); else ref[2] = ''
            }
        }
    }
    onNChange(row:VcardRow) {
        let fn = row.vals[1] + ' ' + row.vals[2] + " " + row.vals[0]
        fn = fn.replace(/\s+/, ' ')
        if (this.object.card) {
            this.object.card.get("FN")[0].vals[0] = fn
        }
    }
    onPlzUpdate(o: VcardRow) {
        if (o.vals[6] != 'DE') return
        if (o.vals[5].length != 5) return
        //if (o.vals[3].length > 0) return
        const plz = parseInt(o.vals[5])
        const res: any[] = this.db_plz.filter((x: any) => x.plz == plz)
        if (res.length) {
            o.vals[3] = res[0].ort
        }
    }
    needsWarning(o: VcardRow): string | undefined {
        if (['CLASS'].includes(o.key)) return o.key + ' is not needed here'
        if (this.isCompany()) {
            if (['N', 'TITLE'].includes(o.key)) return o.key + ' is not needed here (should be part of a contact)'
        }
        if (this.isCompanyContact()) {
            if (['ORG'].includes(o.key)) return o.key + ' is not needed here (should be part of company information)'
            if (['ADR'].includes(o.key)) return o.key + ' is not needed here (should be part of company information)'
            if (['URL'].includes(o.key)) return o.key + ' is not needed here (should be part of company information)'
        }
        if (this.isContact()) {
            if (['ORG'].includes(o.key)) return o.key + ' is not needed here (personal contact could  work in many companies)'
            //if (['URL'].includes(o.key)) return o.key + ' is not needed here (personal contact could  work in many companies)'
        }
        return undefined
    }
    singleActionResolved(a: ActionEmitterType) {
        if (a.action.title === 'Remove') {
            this.removeRow(a.object.nx)
            this.updateVcard()
        }
    }

    initializeMaps() {
        if (!this.mapContainers || !this.object?.card) return;

        this.mapContainers.forEach((container) => {
            const mapEl = container.nativeElement;
            const mapId = mapEl.getAttribute('data-map-id');
            const lat = mapEl.getAttribute('data-lat');
            const lon = mapEl.getAttribute('data-lon');

            if (mapId && lat && lon) {
                const geoRow = new VcardRow('GEO', [], [lat, lon]);
                this.initMap(geoRow, mapEl);
            }
        });
    }

    initMap(geoRow: VcardRow, container: HTMLElement) {
        const lat = parseFloat(geoRow.vals[0]);
        const lon = parseFloat(geoRow.vals[1]);

        if (isNaN(lat) || isNaN(lon)) {
            container.innerHTML = '<div class="p-3 text-muted text-center">Invalid coordinates</div>';
            return;
        }

        // If map already exists for this container, don't recreate it
        if (this.#mapInstances.has(container)) {
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create map
        const map = L.map(container, {
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: true
        }).setView([lat, lon], 15);

        // Detect dark mode (you can adjust this based on your theme detection)
        const isDarkMode = document.body.classList.contains('dark') ||
                          document.body.classList.contains('dark-theme') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Choose tile layer based on theme
        const tileLayer = isDarkMode
            ? L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
                subdomains: 'abcd',
                maxZoom: 19
              })
            : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
                maxZoom: 19
              });

        tileLayer.addTo(map);

        // Store map instance
        this.#mapInstances.set(container, map);

        // Force tile loading and map sizing
        setTimeout(() => {
            map.invalidateSize();
            map.setView([lat, lon], 15); // Re-set view to force tile loading
        }, 200);
    }

    hasGeoForAddress(adrIndex: number): VcardRow | null {
        return this.getGeoForAddress(adrIndex);
    }

    getGeoForAddress(_adrIndex: number): VcardRow | null {
        if (!this.object?.card?.rows) return null;
        const geoRows = this.object.card.rows.filter(row => row.key === 'GEO');
        return geoRows.length > 0 ? geoRows[0] : null;
    }

    ngOnDestroy() {
        // Clean up map instances
        this.#mapInstances.forEach((map) => map.remove());
        this.#mapInstances.clear();
    }

    isRealCompany(): boolean {
        if (!this.isCompany()) return false;
        const company = this.object as Company;
        return company.name?.includes('GmbH') || company.name?.includes('AG') || company.name?.includes('KG') || company.name?.includes('OHG') || false;
    }

    getCommercialRegister(): string {
        if (this.isCompany()) {
            return (this.object as Company).commercial_register || '';
        }
        return '';
    }

    setCommercialRegister(value: string) {
        if (this.isCompany()) {
            (this.object as Company).commercial_register = value;
        }
    }

    getRegisterType(): string {
        const register = this.getCommercialRegister();
        if (register && register.includes('|')) {
            return register.split('|')[0] || '';
        }
        return '';
    }

    getRegisterNumber(): string {
        const register = this.getCommercialRegister();
        if (register && register.includes('|')) {
            const parts = register.split('|');
            return parts[1] || '';
        }
        return '';
    }

    getRegisterCourt(): string {
        const register = this.getCommercialRegister();
        if (register && register.includes('|')) {
            const parts = register.split('|');
            return parts[2] || '';
        }
        return '';
    }

    setRegisterType = (value: string) => this.#updateRegisterParts(value, this.getRegisterNumber(), this.getRegisterCourt());
    setRegisterNumber = (value: string) => this.#updateRegisterParts(this.getRegisterType(), value, this.getRegisterCourt());
    setRegisterCourt = (value: string) => this.#updateRegisterParts(this.getRegisterType(), this.getRegisterNumber(), value);

    #updateRegisterParts(type: string, number: string, court: string) {
        if (this.isCompany()) {
            const parts = [type, number, court].filter(part => part && part.trim());
            const register = parts.length > 0 ? parts.join('|') : '';
            (this.object as Company).commercial_register = register;
        }
    }

    updateCommercialRegister() {
        if (this.isCompany()) {
            const company = this.object as Company;
            company.update({'commercial_register': company.commercial_register}).subscribe();
        }
    }

    ensureI18nFields() {
        if (!this.object?.card) return;
        
        // Ensure basic required fields exist
        if (!this.object.card.rows.some(r => r.key === 'FN')) {
            this.addRow('FN:');
        }
        if (!this.object.card.rows.some(r => r.key === 'N')) {
            this.addRow('N:;;;;');
        }
        
        // Ensure i18n fields for Contact, User, and Prospect
        if (this.isContact() || this.isUser() || this.isProspect()) {
            if (!this.object.card.rows.some(r => r.key === 'X-LANG')) {
                this.addRow('X-LANG:de');
            }
            if (!this.object.card.rows.some(r => r.key === 'X-FORMALITY')) {
                this.addRow('X-FORMALITY:formal');
            }
        }
    }

    addLanguageFormality = () => {
        if (!this.object.card) return;
        if (!this.object.card.rows.some(r => r.key === 'X-LANG')) this.addRow('X-LANG:de');
        if (!this.object.card.rows.some(r => r.key === 'X-FORMALITY')) this.addRow('X-FORMALITY:formal');
    }

    hasLanguageFormality = (): boolean => {
        return this.object?.card?.rows.some(r => r.key === 'X-LANG') ?? false;
    }

}
