import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '@models/product/product.service';
import { Product } from '@models/product/product.model';
import { Observable } from 'rxjs';
import { NexusModule } from '@app/nx/nexus.module';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { IAIPlugin } from '@models/ai/ai.plugin.interface';
import { PluginInstance } from '@models/http/plugin.instance';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'app-product-refactor',
    templateUrl: './product-split.component.html',
    styleUrls: ['./product-split.component.scss'],
    standalone: true,
    imports: [CommonModule, NexusModule, SearchInputComponent, SafePipe]
})
export class ProductRefactorComponent implements OnInit {

    #route = inject(ActivatedRoute);
    #productService = inject(ProductService);
    #pluginFactory = inject(PluginInstanceFactory);

    productId: number = 0;
    splitItems$: Observable<any[]> | null = null;
    splitItems: any[] = [];
    productSuggestions: string[] = [];
    currentProduct: any = null;
    isLoadingSuggestions: boolean = false;
    isDataLoaded: boolean = false;

    ngOnInit(): void {
        this.productId = Number(this.#route.parent?.snapshot.params['id']);
        if (this.productId) {
            this.loadSplitData();
        }
    }

    loadSplitData(): void {
        this.splitItems$ = this.#productService.getSplit(this.productId);
        // Also store the items for LocalAI processing
        this.splitItems$.subscribe(items => {
            this.splitItems = items;
            this.isDataLoaded = true;
        });
        
        // Load current product details for group information
        this.#productService.show(this.productId.toString()).subscribe(product => {
            this.currentProduct = product;
        });
    }

    suggestNewProducts(): void {
        // Prevent multiple simultaneous requests
        if (this.isLoadingSuggestions) {
            return;
        }

        // Get AI plugin instances (any IAIPlugin implementation)
        const aiPlugins = this.#pluginFactory.getPluginEncryptionsOfType('local_ai');
        
        if (aiPlugins.length === 0) {
            console.warn('No AI plugins configured');
            return;
        }

        // Check if plugin has proper configuration
        const pluginConfig = aiPlugins[0];
        if (!pluginConfig.value || !pluginConfig.value.url) {
            console.warn('AI plugin not properly configured - missing URL');
            return;
        }
        
        // Use the first available AI plugin through the interface
        const aiPlugin = this.#pluginFactory.instanceFor(pluginConfig) as IAIPlugin & PluginInstance;
        
        if (!aiPlugin || !aiPlugin.IAIPluginProperty || aiPlugin.state !== 'connected') {
            console.warn('AI plugin not connected or not implementing IAIPlugin. State:', aiPlugin?.state);
            return;
        }


        this.isLoadingSuggestions = true;

        // Prepare prompt with split data
        const itemsWithIds = this.splitItems.map(item => `ID:${item.id} - "${item.text}" (${item.project_name})`).join('\n');
        const prompt = `IMPORTANT: Respond with ONLY valid JSON array. NO text, explanations, or formatting. Raw JSON only.

Analyze these invoice items and group them into 5-7 product categories:
${itemsWithIds}

Required output format (EXACT):
[{"name":"Category Name","itemIds":[1,2,3]},{"name":"Another Category","itemIds":[4,5,6]}]

STRICT: Start response with [ and end with ]. Nothing else.`;


        // Use configured model or fallback to first available model
        const selectedModel = pluginConfig.value?.model || aiPlugin.getDefaultModel()?.id || 'gpt-4o';
        
        // Query AI plugin through interface using configured model
        aiPlugin.createCompletion(prompt, selectedModel).subscribe({
            next: (response) => {
                
                // Try to parse the AI response as JSON
                const content = response.choices?.[0]?.message?.content?.trim();
                if (content) {
                    try {
                        // Handle escaped JSON - try parsing twice if needed
                        let suggestions;
                        try {
                            suggestions = JSON.parse(content);
                            // If the result is still a string, parse again (double-escaped JSON)
                            if (typeof suggestions === 'string') {
                                suggestions = JSON.parse(suggestions);
                            }
                        } catch (firstParseError) {
                            // If first parse fails, content might not be properly escaped JSON
                            // Try to extract JSON from the content string
                            const jsonMatch = content.match(/\[.*\]/s);
                            if (jsonMatch) {
                                suggestions = JSON.parse(jsonMatch[0]);
                            } else {
                                throw firstParseError;
                            }
                        }
                        console.log('Parsed Product Suggestions:', suggestions);
                        if (Array.isArray(suggestions)) {
                            // Handle new format with objects containing name and itemIds
                            if (suggestions.length > 0 && typeof suggestions[0] === 'object' && suggestions[0].name) {
                                this.productSuggestions = suggestions.map(item => `${item.name} (${item.itemIds?.length || 0} items)`);
                                console.log('Product suggestions with item counts:', this.productSuggestions);
                            } else {
                                // Handle old format with simple strings
                                this.productSuggestions = suggestions;
                            }
                        }
                    } catch (_error: any) {
                        console.warn('Could not parse AI response as JSON:', content);
                        // Try to extract suggestions from plain text if JSON parsing fails
                        this.extractSuggestionsFromText(content);
                    }
                }
                this.isLoadingSuggestions = false;
            },
            error: (error: any) => {
                console.error('AI Plugin Error:', error);
                this.isLoadingSuggestions = false;
            }
        });
    }

    extractSuggestionsFromText(content: string): void {
        // Try to find JSON within <json> tags first
        const jsonTagMatch = content.match(/<json>\s*([\s\S]*?)\s*<\/json>/);
        if (jsonTagMatch) {
            try {
                const suggestions = JSON.parse(jsonTagMatch[1].trim());
                if (Array.isArray(suggestions)) {
                    // Handle new format with objects containing name and itemIds
                    if (suggestions.length > 0 && typeof suggestions[0] === 'object' && suggestions[0].name) {
                        this.productSuggestions = suggestions.map(item => `${item.name} (${item.itemIds?.length || 0} items)`);
                    } else {
                        // Handle old format with simple strings
                        this.productSuggestions = suggestions;
                    }
                    return;
                }
            } catch (_error) {
                console.warn('Found JSON tags but could not parse content:', jsonTagMatch[1]);
            }
        }

        // Try to find JSON array in the response (for models that do reasoning)
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            try {
                const suggestions = JSON.parse(jsonMatch[0]);
                if (Array.isArray(suggestions)) {
                    // Handle new format with objects containing name and itemIds
                    if (suggestions.length > 0 && typeof suggestions[0] === 'object' && suggestions[0].name) {
                        this.productSuggestions = suggestions.map(item => `${item.name} (${item.itemIds?.length || 0} items)`);
                    } else {
                        // Handle old format with simple strings
                        this.productSuggestions = suggestions;
                    }
                    return;
                }
            } catch (_error) {
                console.warn('Found JSON-like structure but could not parse:', jsonMatch[0]);
            }
        }

        // Fallback: Extract suggestions from numbered/bullet list format
        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !line.toLowerCase().includes('okay') && !line.toLowerCase().includes('first') && !line.toLowerCase().includes('need to'))
            .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 0 && line.length < 100); // Reasonable product name length
        
        this.productSuggestions = lines.slice(0, 10); // Limit to 10 suggestions
    }

    createProductFromSuggestion(suggestion: string): void {
        if (!this.currentProduct) {
            console.warn('Current product not loaded');
            return;
        }

        // Extract clean product name from suggestion (remove item count if present)
        const cleanName = suggestion.replace(/\s*\(\d+\s*items?\)$/, '').trim();

        // Use the same pattern as product-group.component.ts
        Product.createWithParentId(cleanName, this.currentProduct.product_group_id).subscribe({
            next: (newProduct: any) => {
                console.log('Created new product:', newProduct);
                // Remove the suggestion from the list after successful creation
                this.productSuggestions = this.productSuggestions.filter(s => s !== suggestion);
            },
            error: (error: any) => {
                console.error('Failed to create product:', error);
            }
        });
    }
    
    // Get the display name for selected product
    getSelectedProductName(item: any): string {
        // If item has a selected product, return its name
        return item.selectedProduct?.name || '';
    }
    
    // Handle product selection for an invoice item
    onProductSelected(item: any, selectedProduct: any): void {
        if (selectedProduct && selectedProduct.id) {
            // Update the item with the selected product
            item.selectedProduct = selectedProduct;
            item.product_source_id = selectedProduct.id;
            
            // You might want to save this change to the backend here
            // For example: this.updateInvoiceItem(item);
            console.log(`Updated item ${item.id} with product:`, selectedProduct);
        } else {
            // Clear the selection
            item.selectedProduct = null;
            item.product_source_id = null;
        }
    }
    
    // Check if AI plugins are available
    hasAIPlugins(): boolean {
        const aiPlugins = this.#pluginFactory.getPluginEncryptionsOfType('local_ai');
        return aiPlugins.length > 0;
    }
    
    // Optional: Method to save changes to backend
    // private updateInvoiceItem(item: any): void {
    //     // Implement API call to update invoice item with new product_source_id
    // }
}