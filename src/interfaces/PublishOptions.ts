export interface PublishOptions {
    ttl?: number//milliseconds
    headers?: Record<any, any>
}

export interface AddJobOptions extends PublishOptions {

}
