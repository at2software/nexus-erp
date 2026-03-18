import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Color } from 'src/constants/Color';
import { Assignee } from 'src/models/assignee/assignee.model';
import { NexusModule } from '@app/nx/nexus.module';

@Component({
    selector: 'app-assignees',
    templateUrl: './assignees.component.html',
    styleUrls: ['./assignees.component.scss'],
    standalone: true,
    imports: [CommonModule, NexusModule]
})
export class AssigneesComponent {
  
  @Input() assignees:Assignee[]
  
  posToHex = (id:any) => Color.posToHex(parseInt(id))

}
