import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MarketingService } from '@models/marketing/marketing.service';
import { NgbDropdownModule, NgbTooltipModule, NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { DndDirective } from '@directives/dnd.directive';
import { Nx } from '@app/nx/nx.directive';
import { File } from '@models/file/file.model';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { Dictionary } from '@constants/constants';

interface AssetCategory {
    name: string;
    icon: string;
    color: string;
    count: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-assets',
    templateUrl: './marketing-assets.component.html',
    styleUrls: ['./marketing-assets.component.scss'],
    imports: [DatePipe, FormsModule, NgbDropdownModule, NgbTooltipModule, NgbTypeaheadModule, DndDirective, Nx, TextParamEditorComponent, EmptyStateComponent, GuidedTourComponent, SpinnerComponent],
})
export class MarketingAssetsComponent {
    #marketingService = inject(MarketingService);
    #route = inject(ActivatedRoute);

    assets = signal<File[]>([]);
    categories = signal<AssetCategory[]>([]);
    loading = signal(true);
    selectedCategory = 'Brand Assets';
    searchQuery = '';
    searchTags = '';
    newTagInput = '';
    allTags: string[] = [];

    // Asset categories based on research
    defaultCategories: AssetCategory[] = [
        { name: 'Brand Assets', icon: 'branding_watermark', color: 'primary', count: 0 },
        { name: 'Social Media', icon: 'share', color: 'info', count: 0 },
        { name: 'Email Templates', icon: 'email', color: 'success', count: 0 },
        { name: 'Presentations', icon: 'slideshow', color: 'warning', count: 0 },
        { name: 'Print Materials', icon: 'print', color: 'secondary', count: 0 },
        { name: 'Video Content', icon: 'videocam', color: 'danger', count: 0 },
        { name: 'Documents', icon: 'description', color: 'dark', count: 0 },
    ];

    constructor() {
        // Check for category parameter from route
        const category = this.#route.snapshot.paramMap.get('category');
        if (category) {
            this.selectedCategory = decodeURIComponent(category);
        }

        this.loadAssets();
        this.initializeCategories();
    }

    loadAssets() {
        this.loading.set(true);
        this.#marketingService.indexMarketingAssets(this.selectedCategory, this.searchQuery, this.searchTags).subscribe({
            next: (data) => {
                this.assets.set(data);
                this.loadCategoryCounts();
                this.updateAllTags();
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    loadCategoryCounts() {
        // Fetch all assets without category filter to get accurate counts
        this.#marketingService.indexMarketingAssets('', '', '').subscribe((allAssets) => {
            this.categories.update((categories) =>
                categories.map((category) => ({
                    ...category,
                    count: allAssets.filter((asset: File) => asset.category === category.name).length,
                })),
            );
        });
    }

    initializeCategories() {
        this.categories.set([...this.defaultCategories]);
    }

    onFilesUploaded() {
        // Called when DND directive successfully uploads files
        this.loadAssets(); // Refresh the asset list
    }

    categorizeFile(file: File): string {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const type = file.mime.toLowerCase() || '';

        if (type.startsWith('image/')) {
            if (['jpg', 'jpeg', 'png', 'svg'].includes(extension || '')) {
                return 'Brand Assets';
            }
            return 'Social Media';
        }

        if (type.startsWith('video/')) return 'Video Content';
        if (['pdf', 'doc', 'docx'].includes(extension || '')) return 'Documents';
        if (['ppt', 'pptx'].includes(extension || '')) return 'Presentations';
        return 'Documents';
    }

    filterByCategory(category: string) {
        this.selectedCategory = category === this.selectedCategory ? '' : category;
        this.loadAssets();
    }

    onSearch() {
        this.loadAssets();
    }

    updateAllTags() {
        const tagSet = new Set<string>();
        this.assets().forEach((asset) => {
            if (asset.tags) {
                asset.tags.forEach((tag) => tagSet.add(tag));
            }
        });
        this.allTags = Array.from(tagSet).sort();
    }

    #setAssetTags(asset: File, newTags: string[]) {
        asset.tags = newTags;
        this.assets.update((assets) => [...assets]);
    }

    addTagToAsset(asset: File, tag: string) {
        if (!tag.trim()) return;

        const currentTags = asset.tags || [];
        if (!currentTags.includes(tag.trim())) {
            const newTags = [...currentTags, tag.trim()];
            this.#marketingService.updateMarketingAssetTags(asset.id, newTags).subscribe(() => {
                this.#setAssetTags(asset, newTags);
                this.updateAllTags();
            });
        }
    }

    removeTagFromAsset(asset: File, tagToRemove: string) {
        if (!asset.tags) return;

        const newTags = asset.tags.filter((tag) => tag !== tagToRemove);
        this.#marketingService.updateMarketingAssetTags(asset.id, newTags).subscribe(() => {
            this.#setAssetTags(asset, newTags);
            this.updateAllTags();
        });
    }

    onTagInputKeyup(event: KeyboardEvent, asset: File, input: HTMLInputElement) {
        if (event.key === 'Enter' && input.value.trim()) {
            const tagValue = input.value.trim();
            this.addTagToAsset(asset, tagValue);
            input.value = '';
            event.preventDefault();
        }
    }

    onTagSelected(event: NgbTypeaheadSelectItemEvent, asset: File) {
        event.preventDefault();
        this.addTagToAsset(asset, event.item);
    }

    onTagSearchSelected(event: NgbTypeaheadSelectItemEvent) {
        event.preventDefault();
        this.searchTags = event.item;
        this.onSearch();
    }

    tagTypeahead = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map((term) => (term.length < 1 ? [] : this.allTags.filter((tag) => tag.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))),
        );

    getCategoryColor(categoryName: string | undefined): string {
        if (!categoryName) return 'secondary';
        const category = this.defaultCategories.find((cat) => cat.name === categoryName);
        return category ? category.color : 'secondary';
    }

    getCategoryParamKey(categoryName: string): string {
        const keyMap: Dictionary<string> = {
            'Brand Assets': 'params/MARKETING_BRAND_ASSETS_DESC',
            'Social Media': 'params/MARKETING_SOCIAL_MEDIA_DESC',
            'Email Templates': 'params/MARKETING_EMAIL_TEMPLATES_DESC',
            Presentations: 'params/MARKETING_PRESENTATIONS_DESC',
            'Print Materials': 'params/MARKETING_PRINT_MATERIALS_DESC',
            'Video Content': 'params/MARKETING_VIDEO_CONTENT_DESC',
            Documents: 'params/MARKETING_DOCUMENTS_DESC',
        };
        return keyMap[categoryName] || 'params/MARKETING_DOCUMENTS_DESC';
    }

    getFileIcon(mime: string): string {
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'videocam';
        if (mime.includes('pdf')) return 'picture_as_pdf';
        if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slideshow';
        if (mime.includes('spreadsheet') || mime.includes('excel')) return 'table_chart';
        if (mime.includes('document') || mime.includes('word')) return 'description';
        return 'insert_drive_file';
    }

    formatFileSize(bytes?: number): string {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    }

    isImage(mime: string): boolean {
        return mime.startsWith('image/');
    }

    uncategorizedLabel = $localize`:@@i18n.marketing.uncategorized:uncategorized`;

    getRemoveTagTitle(tag: string): string {
        return $localize`:@@i18n.marketing.click_to_remove_tag:click to remove: ${tag}`;
    }
}
