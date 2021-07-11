export interface BaseOptions {
    oneShot?: boolean,
    noAck?: boolean,
    initialDelayTime?: number, // 5000
    maxRetries?: number, // 5
}

export interface SubscribeOptions extends BaseOptions {
    queue: string,
}

export interface WorkerOptions extends BaseOptions {
}