import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface ConnectionIndicatorProps {
    isConnected: boolean;
    isReconnecting?: boolean;
    connectionError?: string | null;
    onReconnect?: () => void;
    showDetails?: boolean;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
    isConnected,
    isReconnecting = false,
    connectionError = null,
    onReconnect,
    showDetails = true
}) => {
    const getStatusColor = () => {
        if (isConnected) return 'bg-green-500';
        if (isReconnecting) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getStatusText = () => {
        if (isConnected) return 'Live';
        if (isReconnecting) return 'Reconnecting...';
        if (connectionError) return 'Disconnected';
        return 'Offline';
    };

    const getIcon = () => {
        if (isConnected) return <Wifi className="w-4 h-4" />;
        if (isReconnecting) return <RefreshCw className="w-4 h-4 animate-spin" />;
        return <WifiOff className="w-4 h-4" />;
    };

    return (
        <div className="flex flex-col items-end">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isConnected
                        ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                        : isReconnecting
                            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                            : 'bg-red-900/50 text-red-300 border border-red-700/50'
                    }`}
            >
                <motion.div
                    animate={{
                        scale: isConnected ? [1, 1.2, 1] : 1,
                        opacity: isReconnecting ? [1, 0.5, 1] : 1
                    }}
                    transition={{
                        repeat: isConnected ? 0 : isReconnecting ? Infinity : 0,
                        duration: isReconnecting ? 1 : 0.3
                    }}
                    className={`w-2 h-2 rounded-full ${getStatusColor()}`}
                />
                {showDetails && (
                    <>
                        {getIcon()}
                        <span>{getStatusText()}</span>
                    </>
                )}
            </motion.div>

            {/* Error message with reconnect button */}
            <AnimatePresence>
                {!isConnected && !isReconnecting && connectionError && onReconnect && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 bg-red-900/30 border border-red-700/50 rounded-lg p-3 max-w-xs"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-red-300 text-xs font-medium">Connection Lost</p>
                                <p className="text-red-400/70 text-xs mt-1">{connectionError}</p>
                                <button
                                    onClick={onReconnect}
                                    className="mt-2 flex items-center gap-1 text-xs text-red-200 hover:text-white bg-red-700/50 hover:bg-red-600/50 px-2 py-1 rounded transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Retry Connection
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ConnectionIndicator;
