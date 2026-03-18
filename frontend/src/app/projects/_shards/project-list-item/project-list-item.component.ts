import { Component, Input } from '@angular/core';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { Project } from 'src/models/project/project.model';

@Component({
  selector: 'project-list-item',
  templateUrl: './project-list-item.component.html',
  styleUrls: ['./project-list-item.component.scss'],
  imports: [SmartLinkDirective]
})
export class ProjectListItemComponent {

  @Input() project:Project
  @Input() imageUrl:string|null = null

  getImageUrl = () => (this.imageUrl)

}
