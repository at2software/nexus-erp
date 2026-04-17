import { Component, input, model, OnInit } from "@angular/core"
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
    object = input<Serializable|undefined>();
    key = input<string>('');
    default = model<number>(0);

    ngOnInit() {
        if (this.object()) {
            const p = this.object()?.getParam(this.key())
            if (p !== undefined) {
                this.default.set(parseInt(p))
            }
        } else {
            console.warn('not implemented yet')
        }
    }
    getPath = () => this.object() ? this.object()?.getParamPath(this.key()) : this.key()
    onChange() {
        const object = this.object()
        const key = this.key()
        if (object) {
            object.params![key] = this.default()
            object.updateParam(key, { value: this.default() ? 1 : 0 }).subscribe()
        } else {
            console.warn('not implemented yet')
        }
    }
}