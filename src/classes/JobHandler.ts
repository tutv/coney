import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {Channel, ConsumeMessage} from "amqplib"
import {parseBufferToJSON} from "../helpers/parseBufferToJSON"
import {ConeyMessage} from "./ConeyMessage"
import {ConeyHandler} from "../types/ConeyHandler"

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


    private async _handle(msg: ConsumeMessage, handler: ConeyHandler): Promise<void> {
        const message = new ConeyMessage(this.channel, msg)
        const {noAck} = this.options

        try {
            await handler(message)

            if (noAck) {
                await this.channel.ack(msg)
            }
        } catch (error) {
            console.error("HANDLE_JOB_FAILED:", error)
        }
    }

    public async consume(queueName: string, handler: ConeyHandler): Promise<void> {
        await this.channel.assertQueue(queueName, {
            durable: true,
        })

        await this.channel.consume(queueName, (msg) => {
            if (!msg) return

            return this._handle(msg, handler)
        })
    }
}

