
import { Component, HostBinding, Input, OnInit } from '@angular/core';

@Component({
    selector: 'empty-state',
    templateUrl: './empty-state.component.html',
    styleUrls: ['./empty-state.component.scss'],
    standalone: true,
    imports: []
})
export class EmptyStateComponent implements OnInit {
  @Input() title:string|undefined
  @Input() card:boolean = true
  @Input() class:string = ''
  @Input() size:number = 6
  @HostBinding('class') cardClass = ''
  ngOnInit = () => this.cardClass = this.card ? 'card' : ''
  // ai prompt
  // can you draw a white rocket  pointing upwars on dark grey background. place a big teal (#00c9a7) checkmark in front of it (slightly to the right). the art style should be flat design and all elements shoud be very simple
  // can you draw a hummingbird looking happy towards the camera. the art style should be flat design and all elements shoud be very simple and the colors should be white and teal (#00c9a7) on a dark grey background
}
