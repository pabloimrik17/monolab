# Run live updates on one API instance

Qup supports one API process for live updates and keeps its SSE event bus in memory instead of adding shared pub/sub or polling fallback. The intended home-gathering deployment does not justify distributed delivery infrastructure; initial snapshots and subsequent refetches remain authoritative, but multi-replica deployments are explicitly unsupported for live event delivery.
