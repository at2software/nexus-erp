import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NexusModule } from '@app/nx/nexus.module';
import { Comment } from 'src/models/comment/comment.model';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'tab-comment',
    templateUrl: './tab-comment.component.html',
    styleUrls: ['./tab-comment.component.scss'],
    imports: [DatePipe, CommonModule, NexusModule, SafePipe],
    standalone: true,
})
export class TabCommentComponent {
    @Input() comment: Comment
    @Input() nicon?: string

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / 1048576).toFixed(1)} MB`
    }

    getFormattedTextWithLink(): string {
        let text = this.comment.formattedText

        // If this is a git push event, format with icons
        if (this.comment.var?.showGitIcon) {
            const branch = this.comment.var.branch || 'branch'
            const commitCount = this.comment.var.commitCount || 1
            const userPart = this.comment.var.nicon ? this.comment.text.split(' ')[0] + ' ' : ''
            return `${userPart}<i>arrow_right</i> git <code>${branch}</code> [${commitCount}]`
        }

        // If this is a git or mantis issue with a webUrl and issueNumber, make the issue number clickable
        if (this.comment.var?.webUrl && this.comment.var?.issueNumber) {
            const issueNumber = this.comment.var.issueNumber
            const webUrl = this.comment.var.webUrl
            const isClosed = this.comment.var.isClosed
            const state = this.comment.var.state

            // Determine color based on state
            const stateColor = isClosed ? 'text-success' : 'text-primary'

            // Replace the issue number with a clickable link
            const linkedIssue = `<a href="${webUrl}" target="_blank">${issueNumber}</a>`
            text = text.replace(issueNumber, linkedIssue)

            // Replace the state text with colored version
            if (state) {
                text = text.replace(`: ${state}`, `: <span class="${stateColor}">${state}</span>`)
            }
        }

        return text
    }
}
