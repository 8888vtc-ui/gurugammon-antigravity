export declare class Logger {
    private context;
    constructor(context: string);
    info(message: string, data?: any): void;
    error(message: string, error?: Error): void;
    warn(message: string, data?: any): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map