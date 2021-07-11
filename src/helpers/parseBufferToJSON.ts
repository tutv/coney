export function safeParseJSON(str?: string) {
    if (!str) return null

    try {
        return JSON.parse(str)
    } catch (e) {
        return str
    }
}

export const parseBufferToJSON = (buf: Buffer) => {
    const content = buf.toString()

    if (!content) return null

    return safeParseJSON(content)
}