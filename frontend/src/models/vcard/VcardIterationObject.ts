export class VcardIterationObject<T> {
    o: T
    t: string = 'work'
    constructor(attr:string[], o:T) {
      this.t = attr.join('')
      this.o = o
    }
  }