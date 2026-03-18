
import { Component, Input } from '@angular/core';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { User } from 'src/models/user/user.model';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'rsa-settings-empty',
    templateUrl: './rsa-settings-empty.component.html',
    styleUrls: ['./rsa-settings-empty.component.scss'],
    standalone: true,
    imports: [EmptyStateComponent, CommonModule]
})
export class RsaSettingsEmptyComponent {
    @Input() user:User
    isGenerating = false

    async createKeypair() {
        this.isGenerating = true
        try {
            await this.user.createRsaKeyPair()
        } catch (error) {
            console.error('Failed to generate RSA keypair:', error)
            window.alert('Failed to generate RSA keypair. Please try again.')
        } finally {
            this.isGenerating = false
        }
    }

    onFileSelected($event:any) {
        const input = $event.srcElement
        if (input.files && input.files[0]) {
	        const fileReader = new FileReader();
	        fileReader.onload = () => {
                this.user.importFromPem(fileReader.result as string)
            }
            fileReader.readAsText(input.files[0])

        }
    }
}
