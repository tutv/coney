import {Channel, ConsumeMessage} from "amqplib"
import {parseBufferToJSON} from "../helpers/parseBufferToJSON"


export class ConeyMessage {
    private readonly _channel: Channel
    private readonly _msg: ConsumeMessage
    public readonly body: any


    constructor(channel: Channel, msg: ConsumeMessage) {
        this._msg = msg
        this._channel = channel
        this.body = parseBufferToJSON(msg.content)
    }
}

