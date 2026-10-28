import { Copy, RotateCcw } from 'lucide-react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ChatMessage.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { ChatMessage } from './ChatMessage'
import { ResponseFeedback } from './ResponseFeedback'

/** Stands in for a network call, so the docs show "Submitting feedback" for a moment. */
const pretendSend = () => new Promise<void>(resolve => setTimeout(resolve, 800))

export function ChatMessageDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="The three roles">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <ChatMessage role="user" author="You" time="2026-10-15T09:40:00+03:00" timeLabel="09:40">
            Which replicas are running low at Depot 4?
          </ChatMessage>
          <ChatMessage
            role="assistant"
            author="Assistant"
            time="2026-10-15T09:40:00+03:00"
            timeLabel="09:40"
            actions={
              <>
                <Button size="xs" variant="ghost" iconStart={<Copy />}>
                  Copy
                </Button>
                <Button size="xs" variant="ghost" iconStart={<RotateCcw />}>
                  Retry
                </Button>
              </>
            }
          >
            Two are under their reorder point: the K-41 field radio (6 left, reorder at 10) and the trail
            pack (3 left, reorder at 8). Everything else has at least two weeks of cover.
          </ChatMessage>
          <ChatMessage role="system" author="Status">
            Assistant stopped
          </ChatMessage>
        </div>
      </Example>

      <Example caption="While the reply is still streaming in: aria-busy, an ARIA (Accessible Rich Internet Applications) attribute that tells screen readers the message isn't finished, and a cursor that doesn't blink">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <ChatMessage role="assistant" author="Assistant" streaming>
            Depot 4 holds 1,240 replicas across 38 lines. The busiest
          </ChatMessage>
        </div>
      </Example>
      <Example caption="Feedback on a reply: thumbs up or down, one vote, and an optional detail step after Not helpful">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <ChatMessage
            role="assistant"
            author="Assistant"
            actions={<ResponseFeedback onSubmit={pretendSend} onDetail={() => {}} />}
          >
            Depot 4 holds 1,240 replicas. Eleven are below their reorder point.
          </ChatMessage>
        </div>
      </Example>
    </ComponentDocs>
  )
}
