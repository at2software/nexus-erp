import { Component, Input, OnInit } from "@angular/core"
import { Serializable } from "@models/serializable"
import { FormsModule } from "@angular/forms"


@Component({
    selector: 'input-switch-group',
    templateUrl: 'input-switch.component.html',
    styleUrls: ['./input-group.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class InputSwitchGroupComponent implements OnInit {
    @Input() object?: Serializable
    @Input() key:string
    @Input() default:number = 0

    ngOnInit() {
        if (this.object) {
            const p = this.object.getParam(this.key)
            if (p !== undefined) {
                this.default = parseInt(p)
            }
        } else {
            console.warn('not implemented yet')
        }
    }
    getPath = () => this.object ? this.object.getParamPath(this.key) : this.key
    onChange() {
        if (this.object) {
            this.object.params![this.key] = this.default
            this.object.updateParam(this.key, { value: this.default ? 1 : 0 }).subscribe()
        } else {
            console.warn('not implemented yet')
        }
    }
}