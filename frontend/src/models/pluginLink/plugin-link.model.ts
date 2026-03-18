import { PluginLinkService } from "./plugin-link.service";
import { Serializable } from "./../serializable";
import { NxAction } from "src/app/nx/nx.actions";
import { getPluginLinkActions } from "./plugin-link.actions";

export class PluginLink extends Serializable {

    type:string
    name:string
    url:string

    static API_PATH = (): string => 'plugin_links'
    SERVICE = PluginLinkService

    actions: NxAction[] = getPluginLinkActions(this)

}