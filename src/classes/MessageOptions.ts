import {PublishOptions} from "../interfaces/PublishOptions"

export class MessageOptions {
    public headers: Record<any, any> = {}
    public expiration!: number
    public persistent: boolean = true


    constructor(opts?: PublishOptions) {
        const {ttl, headers} = Object.assign({}, opts)
        if (headers && typeof headers === 'object') {
            this.headers = headers
        }

        if (ttl && ttl > 0) {
            this.expiration = ttl
        }
    }

    public setHeader(key: string, value: any): MessageOptions {
        this.headers = Object.assign({}, this.headers, {
            [key]: value
        })

        return this
    }

    public toOptions(): Record<string, any> {
        return {
            ttl: this.expiration,
            headers: this.headers,
            persistent: this.persistent,
        }
    }

    public toObject(): Record<string, any> {
        return {
            headers: this.headers,
            expiration: this.expiration,
            persistent: this.persistent,
        }
    }
}

