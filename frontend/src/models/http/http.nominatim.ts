import { Type, Injectable } from "@angular/core"
import { HttpInjectWrapper } from "./http.wrapper"
import { NexusHttpInterceptor } from "src/app/http.interceptor"
import { HttpHeaders } from "@angular/common/http"
import { VcardRow } from "src/models/vcard/VcardRow"

@Injectable({ providedIn: 'root' })
export abstract class NominatimHttpWrapper extends HttpInjectWrapper {
    TYPE = (): Type<any> => Object
    baseUrl = () => 'https://nominatim.openstreetmap.org/'
    
    init = () => new Promise<boolean>((resolve) => {
        NexusHttpInterceptor.add(this.baseUrl(), new HttpHeaders({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Credentials': "true" }))
        resolve(true)
    })
    search = (params:any) => this.get('search', params)
    lookup = (address:VcardRow) => this.search({q: address.vals.join(','), format: 'json'})
}