import {WorkerOptions} from "../interfaces/SubscribeOptions"
import {Channel, ConsumeMessage} from "amqplib"
import {ConeyMessage} from "./ConeyMessage"
import {ConeyHandler} from "../types/ConeyHandler"
import {REQUEUE_POSTFIX, RETRY_QUEUE_POSTFIX} from "../constants/queue"
import logger from "../helpers/logger"
import {X_REASON, X_RETRIES} from "../constants/header"
import {DelayStrategy} from "./DelayStrategy"


const DEFAULT_OPTIONS: WorkerOptions = {
    noAck: true,
    maxRetries: 0
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
        const {[X_RETRIES]: retries} = headers
        const vRetries = retries > 0 ? parseInt(retries, 10) : 0
        logger("RETRIES:", vRetries)

        try {
            await handler(message)

            if (noAck) {
                await this.channel.ack(msg)
            }
        } catch (error) {
            const countRetries = vRetries + 1
            const {maxRetries, calculateDelay} = this.options

            if (countRetries > maxRetries) {
                console.error('[HANDLE_ERROR]', error)
                console.error(`Max retries reached. Retries: ${vRetries}/${maxRetries}`)
                await this.channel.ack(msg)

                return
            }

            const delayStrategy = new DelayStrategy(calculateDelay)
            const delayTime = delayStrategy.calculate(countRetries)
            logger("DELAY_TIME:", delayTime)
            const retryExchange = `${this.queueName}.${RETRY_QUEUE_POSTFIX}`
            this.channel.publish(retryExchange, this.queueName, msg.content, {
                expiration: `${delayTime}`,
                headers: {
                    [X_RETRIES]: countRetries,
                    [X_REASON]: error.message
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

