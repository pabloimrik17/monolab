/** A symbol's price at one moment; a newer price is a new quote. */
export interface Quote {
    readonly symbol: string;
    readonly price: number;
    readonly change: number;
    readonly changePercent: number;
    readonly updatedAt: Date;
}
