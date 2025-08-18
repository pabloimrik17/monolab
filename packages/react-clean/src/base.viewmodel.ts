import { injectable } from "inversify";
import type { Subscription } from "rxjs";

/**
 * All view models should extend this
 *
 * It provides lifecycle events from the components
 */
@injectable()
export abstract class BaseViewModel {
    private compositeSubscriptions: Subscription[] = [];

    /**
     * Adds one or more subscriptions to the composite subscription list.
     *
     * @param {...Subscription[]} subscriptions - The subscriptions to be added.
     * @return {void} This method does not return a value.
     */
    addSub(...subscriptions: Subscription[]): void {
        this.compositeSubscriptions = [
            ...this.compositeSubscriptions,
            ...subscriptions,
        ];
    }

    /**
     * Lifecycle method executed immediately after the component is mounted.
     * Typically used for initializing data, setting up subscriptions, or making API calls.
     *
     * @return {Promise<void> | void} Returns a Promise if asynchronous operations are performed,
     * otherwise returns void if no asynchronous operations are required.
     */
    didMount(): Promise<void> | void {}

    /**
     * Handles the cleanup operations before the component is unmounted.
     * Unsubscribes all subscriptions stored in the compositeSubscriptions array
     * and clears the array to prevent memory leaks.
     *
     * @return {void} This method does not return a value.
     */
    willUnmount(): void {
        this.compositeSubscriptions.forEach((subscription) => {
            subscription.unsubscribe();
        });
        this.compositeSubscriptions = [];
    }
}
