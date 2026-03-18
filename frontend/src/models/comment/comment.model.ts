import { CommentService } from "./comment.service"
import { Serializable } from "./../serializable"
import { User } from "./../user/user.model"
import { NxAction } from "src/app/nx/nx.actions"
import { NxGlobal } from "src/app/nx/nx.global"
import { REFLECTION } from "src/constants/constants"
import { AutoWrap } from "@constants/autowrap"
import { Accessor } from "@constants/accessor"
import { getCommentActions } from "./comment.actions"

export class Comment extends Serializable {

    static API_PATH = (): string => 'comments'
    SERVICE = CommentService

    text      : string             = ''
    type      : string             = ''
    is_sticky : boolean             = false
    is_mini   : boolean            = false
    user_id  ?: string
    isMyUser:boolean
    formattedText:string

    reactions?: { emoji: string; count: number }[]
    attachments?: { id: string; name: string; mimeType: string; isImage: boolean; size: number; blobUrl?: string }[]

    @AutoWrap('User') user:User

    @Accessor(REFLECTION) parent:any
    
    colorCss = 'white'
    doubleClickAction: number = 0
    actions:NxAction[] = getCommentActions(this)

    serialize = (_json: any) => {
        this.colorCss = (['dark-grey', 'info', 'danger', 'warning-darker'])[this.type as any] as string
        this.isMyUser = NxGlobal.global.user?.id === this.user_id
        this.formattedText = this.#formattedText()
    }

    #formattedText = () => {
        let _ = this.text
        // Only replace URLs that are not already inside an <a> tag
        // Use negative lookbehind to check if URL is not preceded by href="
        _ = _.replace(/(?<!href=["'])((http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/g, "<a href=\"$1\" class=\"text-primary\" target=\"_blank\" title=\"$1\"><i>link</i></a>")
        return _
    }
}