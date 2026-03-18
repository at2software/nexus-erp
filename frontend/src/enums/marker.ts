import { Observable } from "rxjs"

export interface IHasMarker {
    marker: number | null
    update(data: Partial<IHasMarker>): Observable<any>
}

export const Marker = [
    'blue',
    'indigo',
    'purple',
    'pink',
    'red',
    'orange',
    'yellow',
    'green',
    'teal',
    'cyan',
]
export const markerIntFor = (marker: string): number | null => {
    const index = Marker.indexOf(marker)
    return index >= 0 ? index : null
}