import type { FC } from "react";
interface RefreshIndicatorProps {
    lastUpdate: Date | null;
    isPolling: boolean;
}

export const RefreshIndicator: FC<RefreshIndicatorProps> = ({ lastUpdate, isPolling }) => {
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
};
