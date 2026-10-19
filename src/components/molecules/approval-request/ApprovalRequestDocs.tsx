import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './ApprovalRequest.meta'
import { Example } from '../../docs/Example'
import { Button } from '../../atoms'
import { ApprovalRequest, type ApprovalState } from './ApprovalRequest'

function LiveApproval() {
  const [state, setState] = useState<ApprovalState>('pending')
  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-3">
      <ApprovalRequest
        title="Send this reorder to the supplier?"
        state={state}
        onApprove={() => setState('approved')}
        onReject={() => setState('rejected')}
        approveLabel="Send reorder"
        rejectLabel="Don't send"
        className="w-full"
      >
        <p>To: Arad replica supply</p>
        <p>10 × K-41 field radio, 8 × trail pack. Delivery to Depot 4 by Thursday 22 October.</p>
      </ApprovalRequest>
      {state === 'pending' ? null : (
        <Button size="sm" variant="ghost" onClick={() => setState('pending')}>
          Reset the example
        </Button>
      )}
    </div>
  )
}

export function ApprovalRequestDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Pending: approve or reject, and the keyboard focus then moves to the result">
        <LiveApproval />
      </Example>

      <Example caption="Resolved">
        <div className="flex w-full max-w-xl flex-col gap-3">
          <ApprovalRequest title="Move the Friday pickup to Thursday?" state="approved" onApprove={() => {}} onReject={() => {}}>
            Pickup at Depot 4, Thursday 08:00 instead of Friday 08:00.
          </ApprovalRequest>
          <ApprovalRequest title="Cancel order ORD-1182?" state="rejected" onApprove={() => {}} onReject={() => {}}>
            Two replicas, already packed.
          </ApprovalRequest>
        </div>
      </Example>
    </ComponentDocs>
  )
}
