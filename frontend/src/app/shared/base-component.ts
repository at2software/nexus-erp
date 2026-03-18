import { OnDestroy, Directive } from '@angular/core';
import { Subject } from 'rxjs';

export interface EventListenerConfig {
    element: Element | Document | Window;
    event: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
}

@Directive()
export abstract class BaseComponent implements OnDestroy {
    protected destroy$ = new Subject<void>();

    // Event listeners registry for cleanup
    #eventListeners: EventListenerConfig[] = [];

    // Timeouts registry for cleanup
    #timeouts = new Set<any>();

    // Intervals registry for cleanup
    #intervals = new Set<any>();

    // Observers registry for cleanup
    #observers = new Set<MutationObserver | IntersectionObserver | ResizeObserver>();

    /**
     * Register an event listener for automatic cleanup
     */
    protected addEventListenerCleanup(config: EventListenerConfig): void {
        config.element.addEventListener(config.event, config.handler, config.options);
        this.#eventListeners.push(config);
    }

    /**
     * Register multiple event listeners for automatic cleanup
     */
    protected addEventListenersCleanup(configs: EventListenerConfig[]): void {
        configs.forEach(config => this.addEventListenerCleanup(config));
    }

    /**
     * Register a timeout for automatic cleanup
     */
    protected addTimeoutCleanup(timeout: any): any {
        this.#timeouts.add(timeout);
        return timeout;
    }

    /**
     * Register an interval for automatic cleanup
     */
    protected addIntervalCleanup(interval: any): any {
        this.#intervals.add(interval);
        return interval;
    }

    /**
     * Register an observer for automatic cleanup
     */
    protected addObserverCleanup<T extends MutationObserver | IntersectionObserver | ResizeObserver>(observer: T): T {
        this.#observers.add(observer);
        return observer;
    }

    /**
     * Manually clean up a specific timeout
     */
    protected clearTimeoutCleanup(timeout: any): void {
        if (this.#timeouts.has(timeout)) {
            clearTimeout(timeout);
            this.#timeouts.delete(timeout);
        }
    }

    /**
     * Manually clean up a specific interval
     */
    protected clearIntervalCleanup(interval: any): void {
        if (this.#intervals.has(interval)) {
            clearInterval(interval);
            this.#intervals.delete(interval);
        }
    }

    ngOnDestroy(): void {
        // Complete the destroy subject
        this.destroy$.next();
        this.destroy$.complete();

        // Clean up event listeners
        this.#eventListeners.forEach(({ element, event, handler, options }) => {
            try {
                element.removeEventListener(event, handler, options);
            } catch (error) {
                console.warn('Error removing event listener:', error);
            }
        });
        this.#eventListeners.length = 0;

        // Clean up timeouts
        this.#timeouts.forEach(timeout => {
            try {
                clearTimeout(timeout);
            } catch (error) {
                console.warn('Error clearing timeout:', error);
            }
        });
        this.#timeouts.clear();

        // Clean up intervals
        this.#intervals.forEach(interval => {
            try {
                clearInterval(interval);
            } catch (error) {
                console.warn('Error clearing interval:', error);
            }
        });
        this.#intervals.clear();

        // Clean up observers
        this.#observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn('Error disconnecting observer:', error);
            }
        });
        this.#observers.clear();
    }
}