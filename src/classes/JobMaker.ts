import {AddJobOptions, PublishOptions} from "../interfaces/PublishOptions"
import {Channel} from "amqplib"
import {MessageData} from "./MessageData"
import {MessageOptions} from "./MessageOptions"


export class JobMaker {
    private readonly channel: Channel
    private readonly queueName: string
    private readonly opts?: PublishOptions

    public constructor(channel: Channel, queueName: string, opts?: AddJobOptions) {
        this.channel = channel
        this.queueName = queueName
        this.opts = opts
    }

    private async _setupOriginalQueue() {
        await this.channel.assertQueue(this.queueName, {
            durable: true,
        })
    }

    public async sendToQueue(body: any) {
        await this._setupOriginalQueue()

        const buffer = MessageData.from(body).toBuffer()
        const options = new MessageOptions(this.opts)

        return this.channel.sendToQueue(this.queueName, buffer, options.toObject())
    }
}

