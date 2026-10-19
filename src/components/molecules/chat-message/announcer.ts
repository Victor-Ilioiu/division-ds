import { createContext } from 'react'

/**
 * How a ChatMessage reaches its ChatThread's one polite status region. Not public: ChatThread
 * provides it and ChatMessage reads it, so a message outside a thread simply announces nothing.
 *
 * `live()` says whether the thread has finished its first render. A message that was already
 * there (the history a thread opens with) is never announced; one that arrives later is, once.
 */
export type ChatAnnouncer = {
  announce: (text: string) => void
  live: () => boolean
}

export const ChatAnnouncerContext = createContext<ChatAnnouncer | null>(null)

/** Blocks inside a message that are not its reply (a ToolCall, an ApprovalRequest) carry this
 *  attribute, and the announcement leaves them out: "Done, 1.2 s, Show details" read out after
 *  every reply is noise, and each block is its own stop for a reader browsing the log. */
export const CHAT_BLOCK_ATTRIBUTE = 'data-chat-block'

/** The text of a finished message, without its blocks, in one line. */
export function announcementText(body: HTMLElement): string {
  const copy = body.cloneNode(true) as HTMLElement
  copy.querySelectorAll(`[${CHAT_BLOCK_ATTRIBUTE}]`).forEach(block => block.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}
