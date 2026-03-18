
export class VcardAddress {
    name     :string = ''
    extended:string  = ''
    street   :string = ''
    city     :string = ''
    region   :string = ''
    zip      :string = ''
    country  :string = 'DE'
    constructor(values:string[]) {
      this.name     = values[0]
      this.extended = values[1]
      this.street   = values[2]
      this.city     = values[3]
      this.region   = values[4]
      this.zip      = values[5]
      this.country  = values[6]
    }
  }