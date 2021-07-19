import {calculateDelay} from "../types/calculateDelay"


export interface BaseOptions {
    noAck?: boolean,
    maxRetries?: number,
}

export interface SubscribeOptions extends BaseOptions {
    queue: string,
}

export interface WorkerOptions extends BaseOptions {
    maxRetries: number,
    calculateDelay?: calculateDelay
}

