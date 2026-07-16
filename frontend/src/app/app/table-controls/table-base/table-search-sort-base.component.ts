import { Dictionary } from '@constants/constants';
import { SearchData } from '../search-data';
import { SortData } from '../sort-data';
import { SortMode } from '../sort-mode';

export abstract class TableSearchSortBase<T> {
    public sortedItems: T[] = [];
    public sortData: SortData = {
        key: 'created_at',
        sortMode: SortMode.NONE,
    };
    public searchData: SearchData = {
        key: 'created_at',
        searchString: undefined,
    };

    protected abstract getItems(): T[];

    public searchFor(searchData: SearchData): void {
        this.searchData = searchData;
        this.refreshItems();
    }

    public sortBy(sortData: SortData): void {
        this.sortData = sortData;
        this.refreshItems();
    }

    protected refreshItems(): void {
        this.sortedItems = this.getItems().filter((item) => {
            if (this.searchData.searchString) {
                const itemAsAny = item as Dictionary<unknown>;
                const keyValue = itemAsAny[this.searchData.key];
                const keyString = keyValue != null ? String(keyValue).toLowerCase() : '';
                if (!keyString.includes(this.searchData.searchString.toLowerCase())) {
                    return false;
                }
            }
            return true;
        });
        this.#sortItems();
    }

    #sortItems(): void {
        const sortOrder = this.sortData.sortMode === SortMode.ASCENDING ? 1 : -1;
        const key = this.sortData.key;

        this.sortedItems = this.sortedItems
            .map((item) => {
                const itemAsAny = item as Dictionary<unknown>;
                return { item, keyValue: itemAsAny[key] };
            })
            .sort((a, b) => {
                const av = a.keyValue as string | number;
                const bv = b.keyValue as string | number;
                if (av < bv) return -sortOrder;
                if (av > bv) return sortOrder;
                return 0;
            })
            .map((sortedItem) => sortedItem.item);
    }
}
