import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { Color } from 'src/constants/Color';

@Component({
    selector: 'chart-base',
    templateUrl: './chart-base.component.html',
    standalone: true
})
export abstract class ChartBaseComponent implements OnChanges, OnInit {
    @Input() card: boolean = true
    @Input() title: string = 'Chart'
    @Input() series: any[]
    @Input() color: string = Color.fromVar('primary').toString()
    @Input() options: any = {}

    updateFlag: boolean = false

    #viewDidLoad: boolean = false

    ngOnInit(): void {
        this.#viewDidLoad = true
        this.redraw()
    }
    ngOnChanges(): void {
        this.redraw()
    }
    redraw(): void {
        if (!this.#viewDidLoad) return
        this.removeSeries()
        this.registerSeries()
        this.updateFlag = true
    }
    registerSeries = () => this.series.forEach(_ => {
        // Override in subclass to register series
    })
    removeSeries = () => {
        // Override in subclass to remove series
    }

}
