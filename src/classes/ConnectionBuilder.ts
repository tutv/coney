import {ChannelModel} from 'amqplib'
import logger from '../helpers/logger'


export class ConnectionBuilder {
    private readonly _connect: Promise<ChannelModel>
    private connection!: ChannelModel
    private connecting: boolean = false
    private subscribers: Array<Function> = []

    constructor(connection: Promise<ChannelModel>) {
        this._connect = connection

        this._openRabbitMQ().then(() => {
            logger(`Opened RabbitMQ`)
        }).catch((error) => {
            logger(`Open RabbitMQ Failed`, error)
        })
    }

    private async _openRabbitMQ(): Promise<ChannelModel> {
        return this._connect
            .then(connection => {
                this.connection = connection
                this._broadcast(null, this.connection)
                this.connecting = false

                return this.connection
            })
            .catch(error => {
                this._broadcast(error)
                this.connecting = false

                throw error
            })
    }

    private _broadcast(error: Error | null, connection?: ChannelModel) {
        this.subscribers.forEach(callback => {
            callback(error, connection)
        })
        this.subscribers = []
    }

    public async open(): Promise<ChannelModel> {
        if (this.connection) return this.connection

        if (this.connecting) {
            return new Promise((resolve, reject) => {
                this.subscribers.push((error: Error, connection: ChannelModel) => {
                    if (error) return reject(error)

                    return resolve(connection)
                })
            })
        }

        this.connecting = true

        return this._openRabbitMQ()
    }

    public getConnection(): ChannelModel {
        return this.connection
    }
}

