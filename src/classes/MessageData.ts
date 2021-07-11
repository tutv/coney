export class MessageData {
    public static from(data: any): MessageData {
        const str = JSON.stringify(data)
        const buffer = Buffer.from(str)

        return new MessageData(buffer)
    }

    public data: Buffer

    constructor(data: Buffer) {
        this.data = data
    }

    public toJSON() {
        const str = this.data.toString()

        try {
            return JSON.parse(str)
        } catch (error) {
            return str
        }
    }

    public toBuffer(): Buffer {
        return this.data
    }
}

