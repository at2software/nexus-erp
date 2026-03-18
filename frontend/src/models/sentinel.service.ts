import { Injectable } from "@angular/core"
import { Sentinel } from "src/models/sentinel.model"
import { NexusHttpService } from "./http/http.nexus"

@Injectable({ providedIn: 'root' })
export class SentinelService extends NexusHttpService<Sentinel> {
  public apiPath = 'sentinels'
  public TYPE = () => Sentinel
  //index = () => this.aget(this.url('sentinels'), Sentinel)
  indexActive = () => this.aget('sentinels/active')
  store = (item: Sentinel) => this.post('sentinels', item)
  show = (id: string) => this.get(`sentinels/${id}`)
  update = (item: Sentinel, data?: any) => this.put(`sentinels/${item.id}`, data ?? item)
}