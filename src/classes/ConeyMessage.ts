import {Channel, ConsumeMessage} from "amqplib"
import {parseBufferToJSON} from "../helpers/parseBufferToJSON"


export class ConeyMessage {
    private readonly _channel: Channel
    private readonly _msg: ConsumeMessage
    public readonly body: any
    public retries: number = 0

    constructor(channel: Channel, msg: ConsumeMessage) {
        this._msg = msg
        this._channel = channel
        this.body = parseBufferToJSON(msg.content)
        this._parseRetries()
    }

    private _parseRetries() {
        const {headers} = Object.assign({}, this._msg.properties)
        const {'x-retries': retries} = Object.assign({}, headers)
        this.retries = retries > 0 ? parseInt(retries, 10) : 0
    }
}

