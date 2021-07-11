export interface PublishOptions {
    ttl?: number//milliseconds
    headers?: Record<any, any>
}

export interface SeederOptions extends PublishOptions {
    durationMilliseconds: number,
    redeclare?: boolean,
}

