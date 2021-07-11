import {Connection} from 'amqplib'
import logger from '../helpers/logger'


export class ConnectionBuilder {
    private readonly _connect: Promise<Connection>
    private connection!: Connection
    private connecting: boolean = false
    private subscribers: Array<Function> = []

    constructor(connection: Promise<Connection>) {
        this._connect = connection

        this._openRabbitMQ().then(() => {
            logger(`Opened RabbitMQ`)
        }).catch((error) => {
            logger(`Open RabbitMQ Failed`, error)
        })
    }

    private async _openRabbitMQ(): Promise<Connection> {
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

    private _broadcast(error: Error | null, connection?: Connection) {
        this.subscribers.forEach(callback => {
            callback(error, connection)
        })
        this.subscribers = []
    }

    public async open(): Promise<Connection> {
        if (this.connection) return this.connection

        if (this.connecting) {
            return new Promise((resolve, reject) => {
                this.subscribers.push((error: Error, connection: Connection) => {
                    if (error) return reject(error)

                    return resolve(connection)
                })
            })
        }

        this.connecting = true

        return this._openRabbitMQ()
    }

    public getConnection(): Connection {
        return this.connection
    }
}

