import {ConnectionBuilder} from "./ConnectionBuilder"
import {ChannelBuilder} from "./ChannelBuilder"
import {PREFIX_QUEUE_TYPES} from "../types/PREFIX_QUEUE_TYPES"
import {PublishOptions} from "../interfaces/PublishOptions"
import {MessageData} from "./MessageData"
import {MessageOptions} from "./MessageOptions"
import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {JobHandler} from "./JobHandler"


export class SimpleConey {
    private readonly connection: ConnectionBuilder
    private readonly channelBuilder: ChannelBuilder
    public readonly prefix: string = ''

    constructor(connection: ConnectionBuilder, prefix?: string) {
        this.connection = connection
        this.channelBuilder = ChannelBuilder.getChannelBuilder(this.connection)
        this.prefix = prefix || 'coney'
    }

    private _injectPrefix(name: string, type: string): string {
        return `${this.prefix}:${type}.${name}`
    }

    public async addJob(subject: string, payload: any, opts?: PublishOptions) {
        const vQueueName = this._injectPrefix(subject, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        await channel.assertQueue(vQueueName, {
            durable: true,
        })

        const buffer = MessageData.from(payload).toBuffer()
        const options = new MessageOptions(opts)

        return channel.sendToQueue(vQueueName, buffer, options.toObject())
    }

    public async handleJob(subject: string, opts: WorkerOptions = {}, handler: Function) {
        const vQueueName = this._injectPrefix(subject, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        await channel.assertQueue(vQueueName, {
            durable: true,
        })

        const jobHandler = new JobHandler(channel, opts)
        await jobHandler.consume(vQueueName, handler)
    }
}

