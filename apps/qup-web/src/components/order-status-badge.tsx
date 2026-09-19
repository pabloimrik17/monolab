import type { PublicOrderSummaryDto } from "@m0n0lab/qup-shared";

// `OrderDto` and `PublicOrderSummaryDto` carry the same status union, so one badge serves
// the admin queue and the public screens alike.
const STATUS_COLORS: Record<PublicOrderSummaryDto["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PREPARING: "bg-blue-100 text-blue-800",
    DONE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

export function OrderStatusBadge(props: { status: PublicOrderSummaryDto["status"] }) {
    return (
        <span
            class={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[props.status]}`}
        >
            {props.status}
        </span>
    );
}
