import {ConnectionBuilder} from "./ConnectionBuilder"
import {ChannelBuilder} from "./ChannelBuilder"
import {PREFIX_QUEUE_TYPES} from "../types/PREFIX_QUEUE_TYPES"
import {AddJobOptions} from "../interfaces/PublishOptions"
import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {JobHandler} from "./JobHandler"
import {ConeyHandler} from "../types/ConeyHandler"
import {DEFAULT_PREFIX} from "../constants/common"
import {JobMaker} from "./JobMaker"


interface AssertQueue {
    queue: string
    messageCount: number
    consumerCount: number
}

export class SimpleConey {
    private readonly connection: ConnectionBuilder
    private readonly channelBuilder: ChannelBuilder
    public readonly prefix: string = ''

    constructor(connection: ConnectionBuilder, prefix?: string) {
        this.connection = connection
        this.prefix = prefix || DEFAULT_PREFIX
        this.channelBuilder = ChannelBuilder.getChannelBuilder(this.connection)
    }

    private _injectPrefix(name: string, type: string): string {
        return `${this.prefix}:${type}.${name}`
    }

    public async sendToQueue(queueName: string, body: any, opts?: AddJobOptions) {
        const vQueueName = this._injectPrefix(queueName, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        const jobMaker = new JobMaker(channel, vQueueName, opts)
        return jobMaker.sendToQueue(body)
    }

    public async consume(queueName: string, opts: WorkerOptions, handler: ConeyHandler) {
        const vQueueName = this._injectPrefix(queueName, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        const jobHandler = new JobHandler(channel, vQueueName, opts)
        await jobHandler.consume(handler)
    }

    public async getQueue(queueName: string): Promise<AssertQueue> {
        const vQueueName = this._injectPrefix(queueName, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        return channel.checkQueue(vQueueName)
    }
}

