import {ConnectionBuilder} from "./ConnectionBuilder"
import {ChannelBuilder} from "./ChannelBuilder"
import {PREFIX_QUEUE_TYPES} from "../types/PREFIX_QUEUE_TYPES"
import {PublishOptions} from "../interfaces/PublishOptions"
import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {JobHandler} from "./JobHandler"
import {ConeyHandler} from "../types/ConeyHandler"
import {DEFAULT_PREFIX} from "../constants/common"
import {JobMaker} from "./JobMaker"


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

    public async sendToQueue(queueName: string, body: any, opts?: PublishOptions) {
        const vQueueName = this._injectPrefix(queueName, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        const jobMaker = new JobMaker(channel, vQueueName, opts)
        return jobMaker.sendToQueue(body)
    }

    public async consume(queueName: string, opts: WorkerOptions = {}, handler: ConeyHandler) {
        const vQueueName = this._injectPrefix(queueName, PREFIX_QUEUE_TYPES.queue)
        const channel = await this.channelBuilder.getChannel()

        const jobHandler = new JobHandler(channel, opts)
        await jobHandler.consume(vQueueName, handler)
    }
}

