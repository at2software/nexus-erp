import { Component, input, OnChanges, OnInit } from '@angular/core';
import { Color } from 'src/constants/Color';

@Component({
    selector: 'chart-base',
    templateUrl: './chart-base.component.html',
    standalone: true
})
export abstract class ChartBaseComponent implements OnChanges, OnInit {

    card    = input<boolean>(true)
    title   = input<string>('Chart')
    series  = input<any[]>([])
    color   = input<string>(Color.fromVar('primary').toString())
    options = input<any>({})

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
