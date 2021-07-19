import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {Channel, ConsumeMessage} from "amqplib"
import {ConeyMessage} from "./ConeyMessage"
import {ConeyHandler} from "../types/ConeyHandler"
import {REQUEUE_POSTFIX, RETRY_QUEUE_POSTFIX} from "../constants/queue"
import logger from "../helpers/logger"


const DEFAULT_OPTIONS: WorkerOptions = {
    noAck: true
}

export class JobHandler {
    private readonly channel: Channel
    private readonly queueName: string
    private readonly options: WorkerOptions


    constructor(channel: Channel, queueName: string, opts: WorkerOptions) {
        this.channel = channel
        this.queueName = queueName
        this.options = Object.assign({}, DEFAULT_OPTIONS, opts)
    }


    private async _handle(msg: ConsumeMessage, handler: ConeyHandler): Promise<void> {
        const message = new ConeyMessage(this.channel, msg)
        const {noAck} = this.options

        const {headers} = msg.properties
        const {'x-retries': retries} = headers
        const vRetries = retries > 0 ? parseInt(retries, 10) : 0
        logger("RETRIES:", vRetries)

        try {
            await handler(message)

            if (noAck) {
                await this.channel.ack(msg)
            }
        } catch (error) {
            // console.error("HANDLE_JOB_FAILED:", error)
            const delayTime = (vRetries + 1) ** 2 * 1000
            logger("DELAY_TIME:", delayTime)
            const retryExchange = `${this.queueName}.${RETRY_QUEUE_POSTFIX}`
            this.channel.publish(retryExchange, this.queueName, msg.content, {
                expiration: `${delayTime}`,
                headers: {
                    'x-retries': vRetries + 1
                }
            })

            await this.channel.ack(msg)
        }
    }

    private async _setupOriginalQueue() {
        await this.channel.assertQueue(this.queueName, {
            durable: true,
        })
    }

    private async _setupRequeue() {
        const retryExchange = `${this.queueName}.${RETRY_QUEUE_POSTFIX}`
        const requeueExchange = `${this.queueName}.${REQUEUE_POSTFIX}`

        //assert exchange retry, requeue
        await Promise.all([
            this.channel.assertExchange(requeueExchange, 'direct', {
                durable: true
            }),
            this.channel.assertExchange(retryExchange, 'direct', {
                durable: true
            })
        ])

        await this.channel.assertQueue(requeueExchange, {
            durable: true,
            arguments: {
                'x-dead-letter-exchange': requeueExchange,
                'x-dead-letter-routing-key': this.queueName
            }
        })

        await this.channel.bindQueue(requeueExchange, retryExchange, this.queueName)
        await this.channel.bindQueue(this.queueName, requeueExchange, this.queueName)
    }

    public async consume(handler: ConeyHandler): Promise<void> {
        await this._setupOriginalQueue()
        await this._setupRequeue()

        await this.channel.consume(this.queueName, (msg) => {
            if (!msg) return

            return this._handle(msg, handler)
        })
    }
}

