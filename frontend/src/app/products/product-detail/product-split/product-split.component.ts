import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '@models/product/product.service';
import { Product } from '@models/product/product.model';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { IAIPlugin } from '@models/ai/ai.plugin.interface';
import { PluginInstance } from '@models/http/plugin.instance';
import { SafePipe } from '@pipes/safe.pipe';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { filter, map, switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-product-refactor',
    templateUrl: './product-split.component.html',
    styleUrls: ['./product-split.component.scss'],
    standalone: true,
    imports: [SearchInputComponent, SafePipe, SpinnerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductRefactorComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #productService = inject(ProductService);
    readonly #pluginFactory = inject(PluginInstanceFactory);

    readonly #productId$ = this.#route.parent!.params.pipe(map(p => Number(p['id'])), filter(id => id > 0));

    readonly splitItems = toSignal<any[]>(this.#productId$.pipe(switchMap(id => this.#productService.getSplit(id))));
    readonly currentProduct = toSignal(this.#productId$.pipe(switchMap(id => this.#productService.show(id.toString()))));

    readonly productSuggestions = signal<string[]>([]);
    readonly isLoadingSuggestions = signal(false);

    readonly hasAIPlugins = () => this.#pluginFactory.getPluginEncryptionsOfType('local_ai').length > 0;

    readonly suggestNewProducts = () => {
        if (this.isLoadingSuggestions()) return;

        const aiPlugins = this.#pluginFactory.getPluginEncryptionsOfType('local_ai');
        if (!aiPlugins.length) return;

        const pluginConfig = aiPlugins[0];
        if (!pluginConfig.value?.url) return;

        const aiPlugin = this.#pluginFactory.instanceFor(pluginConfig) as IAIPlugin & PluginInstance;
        if (!aiPlugin?.IAIPluginProperty || aiPlugin.state !== 'connected') return;

        this.isLoadingSuggestions.set(true);

        const items = this.splitItems() ?? [];
        const itemsWithIds = items.map(item => `ID:${item.id} - "${item.text}" (${item.project_name})`).join('\n');
        const prompt = `IMPORTANT: Respond with ONLY valid JSON array. NO text, explanations, or formatting. Raw JSON only.\n\nAnalyze these invoice items and group them into 5-7 product categories:\n${itemsWithIds}\n\nRequired output format (EXACT):\n[{"name":"Category Name","itemIds":[1,2,3]},{"name":"Another Category","itemIds":[4,5,6]}]\n\nSTRICT: Start response with [ and end with ]. Nothing else.`;
        const selectedModel = pluginConfig.value?.model || aiPlugin.getDefaultModel()?.id || 'gpt-4o';

        aiPlugin.createCompletion(prompt, selectedModel).subscribe({
            next: (response) => {
                const content = response.choices?.[0]?.message?.content?.trim();
                if (content) {
                    try {
                        let suggestions;
                        try {
                            suggestions = JSON.parse(content);
                            if (typeof suggestions === 'string') suggestions = JSON.parse(suggestions);
                        } catch {
                            const jsonMatch = content.match(/\[.*\]/s);
                            if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
                            else throw new Error('No JSON found');
                        }
                        if (Array.isArray(suggestions)) {
                            this.productSuggestions.set(
                                suggestions.length > 0 && typeof suggestions[0] === 'object' && suggestions[0].name
                                    ? suggestions.map((item: any) => `${item.name} (${item.itemIds?.length || 0} items)`)
                                    : suggestions,
                            );
                        }
                    } catch {
                        this.#extractSuggestionsFromText(content);
                    }
                }
                this.isLoadingSuggestions.set(false);
            },
            error: () => this.isLoadingSuggestions.set(false),
        });
    };

    readonly createProductFromSuggestion = (suggestion: string) => {
        const product = this.currentProduct();
        if (!product) return;
        const cleanName = suggestion.replace(/\s*\(\d+\s*items?\)$/, '').trim();
        Product.createWithParentId(cleanName, (product as any).product_group_id).subscribe({
            next: () => this.productSuggestions.update(s => s.filter(x => x !== suggestion)),
        });
    };

    readonly getSelectedProductName = (item: any) => item.selectedProduct?.name || '';

    readonly onProductSelected = (item: any, selectedProduct: any) => {
        if (selectedProduct?.id) {
            item.selectedProduct = selectedProduct;
            item.product_source_id = selectedProduct.id;
        } else {
            item.selectedProduct = null;
            item.product_source_id = null;
        }
    };

    #extractSuggestionsFromText(content: string): void {
        const jsonTagMatch = content.match(/<json>\s*([\s\S]*?)\s*<\/json>/);
        if (jsonTagMatch) {
            try {
                const suggestions = JSON.parse(jsonTagMatch[1].trim());
                if (Array.isArray(suggestions)) {
                    this.#setSuggestions(suggestions);
                    return;
                }
            } catch { /* fall through */ }
        }

        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            try {
                const suggestions = JSON.parse(jsonMatch[0]);
                if (Array.isArray(suggestions)) {
                    this.#setSuggestions(suggestions);
                    return;
                }
            } catch { /* fall through */ }
        }

        const lines = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.toLowerCase().includes('okay') && !line.toLowerCase().includes('first') && !line.toLowerCase().includes('need to'))
            .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 0 && line.length < 100);

        this.productSuggestions.set(lines.slice(0, 10));
    }

    #setSuggestions(suggestions: any[]): void {
        this.productSuggestions.set(
            suggestions.length > 0 && typeof suggestions[0] === 'object' && suggestions[0].name
                ? suggestions.map((item: any) => `${item.name} (${item.itemIds?.length || 0} items)`)
                : suggestions,
        );
    }
}
