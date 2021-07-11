import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {Channel, ConsumeMessage} from "amqplib"
import {parseBufferToJSON} from "../helpers/parseBufferToJSON"

const DEFAULT_OPTIONS: WorkerOptions = {
    noAck: true
}

export class JobHandler {
    private readonly channel: Channel
    private readonly options: WorkerOptions


    constructor(channel: Channel, opts: WorkerOptions) {
        this.channel = channel
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts)
    }


    private async _handle(msg: ConsumeMessage, handler: Function): Promise<void> {
        const {content} = msg
        const body = parseBufferToJSON(content)

        const {noAck} = this.options

        try {
            await handler(body)

            if (noAck) {
                await this.channel.ack(msg)
            }
        } catch (error) {
            console.error("HANDLE_JOB_FAILED:", error)
        }
    }

    public async consume(queueName: string, handler: Function): Promise<void> {
        await this.channel.consume(queueName, (msg) => {
            if (!msg) return

            return this._handle(msg, handler)
        })
    }
}

