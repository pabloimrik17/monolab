interface RefreshIndicatorProps {
    lastUpdate: Date | null;
    isPolling: boolean;
}

export function RefreshIndicator({ lastUpdate, isPolling }: RefreshIndicatorProps) {
    return (
        <div className="refresh-indicator">
            {lastUpdate ? (
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            ) : (
                <span className="loading">Waiting for data...</span>
            )}
            {isPolling && <span className="polling-dot">●</span>}
        </div>
    );
}
