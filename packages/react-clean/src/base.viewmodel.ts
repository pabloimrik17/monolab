import { injectable } from "inversify";
import { Subscription } from "rxjs";

/**
 * All view models should extend this
 *
 * It provides lifecycle events from the components
 */
@injectable()
export abstract class BaseViewModel {
    private composite: Subscription = new Subscription();

    /**
     * Adds one or more subscriptions to the composite subscription list.
     *
     * @param {...Subscription} subscriptions - The subscriptions to be added.
     * @return {void} This method does not return a value.
     */
    addSub(...subscriptions: Subscription[]): void {
        for (const sub of subscriptions) {
            this.composite.add(sub);
        }
    }

    /**
     * Optional lifecycle method executed after the component is mounted.
     */
    didMount?(): Promise<void> | void;

    /**
     * Handles the cleanup operations before the component is unmounted.
     * Unsubscribes all subscriptions stored in the compositeSubscriptions array
     * and clears the array to prevent memory leaks.
     *
     * @return {void} This method does not return a value.
     */
    willUnmount(): void {
        this.composite.unsubscribe();
        this.composite = new Subscription();
    }
}
