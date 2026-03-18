
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VaultService } from '@models/vault.service';
import { Toast } from '@shards/toast/toast';

type TDict = Record<string, string>;
interface TVault { prefix:string, name:string, active:boolean, keys: TDict, map: TDict}

@Component({
  selector: 'settings-vault',
  imports: [FormsModule],
  templateUrl: './settings-vault.component.html',
  styleUrl: './settings-vault.component.scss'
})
export class SettingsVaultComponent implements OnInit {
    
    vaults:TVault[] = []
    currentVault?:TVault
    vaultService = inject(VaultService)

    ngOnInit() {
        this.vaultService.index().subscribe((response:TVault[]) => {            
            response.forEach(vault => {
                const map:TDict = {}
                Object.keys(vault.keys).forEach(key => map[`${vault.prefix}_${key}`] = '')
                vault.map = map
            })
            this.vaults = response
            this.currentVault = response.first()
        })
    }
    checkCredentials() {
        this.vaultService.update(this.currentVault!.map).subscribe(response => {
            if (response.success) {
                Toast.success('Connection test successful / Credentials saved');
                this.currentVault!.active = true
            }
        })
    }
    keysFor = (vault:TVault) => Object.keys(vault.keys)
    mapKey = (key:string) => this.currentVault!.prefix + '_' + key
}
