import { EventEmitter } from "@angular/core"

export class ChartSeries {

  points  : number[][] = []
  reversed: number[][]
  colors  : string[] = []
  x_title : string[]
  y_title : string[] = []
  columns : number

  onUpdate = new EventEmitter<void>()

  addKeyValueSeries = (title:string, x:object[], color:string = 'primary') => this.addSeries('Revenue', x.map((_:any)=>parseFloat(_[1])), color, x.map((_:any)=>_[0]))
  addSeries(title:string, points:number[], color:string = 'primary', names?:string[]) {
    this.y_title.push(title)
    this.points.push(points)
    this.colors.push(color)
    
    if (!this.x_title) this.x_title = Array(points.length).fill('')
    if (names && names.length == this.x_title.length) this.x_title = names

    this.reversed = this.#transposed(this.points)
    this.onUpdate.next()
  }

  max = () => Math.max(...this.combined())  
  combined = ():number[] => this.#combined(this.reversed)
  value = ():number => {
     const l = this.#combined(this.reversed); 
     return l[l.length-1]; 
    }
  
  #combined = (l:number[][]):number[] => (l ? (l[0].length > 1 ? l.map(x => x.reduce((a,b) => a + b)) : l.map(x => x[0])) : [0])
  #transposed = (matrix:number[][]):number[][] => matrix[0].map((_col, i) => matrix.map(row => row[i]))

}