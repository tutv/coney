import {PublishOptions} from "../interfaces/PublishOptions"
import {Channel} from "amqplib"
import {MessageData} from "./MessageData"
import {MessageOptions} from "./MessageOptions"


export class JobMaker {
    private readonly channel: Channel
    private readonly queueName: string
    private readonly opts?: PublishOptions

    public constructor(channel: Channel, queueName: string, opts?: PublishOptions) {
        this.channel = channel
        this.queueName = queueName
        this.opts = opts
    }

    public async sendToQueue(body: any) {
        await this.channel.assertQueue(this.queueName, {
            durable: true,
        })

        const buffer = MessageData.from(body).toBuffer()
        const options = new MessageOptions(this.opts)

        return this.channel.sendToQueue(this.queueName, buffer, options.toObject())
    }
}

