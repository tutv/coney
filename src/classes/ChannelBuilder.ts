import {ConnectionBuilder} from './ConnectionBuilder'
import {Channel} from 'amqplib'
import {ChannelBuilderOption} from "../interfaces/ChannelBuilderOption"


const DEFAULT_CHANNEL_PREFETCH = 1
const DEFAULT_CONSUMER_PREFETCH = 1


export class ChannelBuilder {
    static ConnectionRegistries: Map<ConnectionBuilder, ChannelBuilder> = new Map()

    public static getChannelBuilder(connection: ConnectionBuilder): ChannelBuilder {
        let channelBuilder = ChannelBuilder.ConnectionRegistries.get(connection)

        if (channelBuilder) {
            return channelBuilder
        }

        channelBuilder = new ChannelBuilder(connection)
        ChannelBuilder.ConnectionRegistries.set(connection, channelBuilder)

        return channelBuilder
    }

    private readonly connection: ConnectionBuilder
    private channel!: Channel
    private isCreating: boolean = false
    private subscribers: Array<Function> = []
    private opts: ChannelBuilderOption

    private constructor(connection: ConnectionBuilder, opts?: ChannelBuilderOption) {
        this.connection = connection

        this.opts = Object.assign({
            channelPrefetch: DEFAULT_CHANNEL_PREFETCH,
            consumerPrefetch: DEFAULT_CONSUMER_PREFETCH,
        }, opts)
    }

    private _broadcast(error: Error | null, channel?: Channel) {
        this.subscribers.forEach(callback => {
            callback(error, channel)
        })
        this.subscribers = []
    }

    public async basicQos(count: number, global: boolean = false): Promise<boolean> {
        if (!this.channel) return false

        await this.channel.prefetch(count, global)

        return true
    }

    public async createChannel(): Promise<Channel> {
        const connection = await this.connection.open()

        return connection.createChannel()
    }

    public async getChannel(): Promise<Channel> {
        if (this.channel) return this.channel

        if (this.isCreating) return new Promise((resolve, reject) => {
            this.subscribers.push((error: Error, result: Channel) => {
                if (error) return reject(error)

                return resolve(result)
            })
        })

        this.isCreating = true

        try {
            const connection = await this.connection.open()
            this.channel = await connection.createChannel()

            await this.basicQos(this.opts.channelPrefetch, true)
            await this.basicQos(this.opts.consumerPrefetch, true)

            this._broadcast(null, this.channel)
            this.isCreating = false

            return this.channel
        } catch (error) {
            this.isCreating = false
            this._broadcast(error)

            throw error
        }
    }
}

