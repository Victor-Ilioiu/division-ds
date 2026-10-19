# ApprovalRequest

> A pause before an action that changes something in the real world (a side effect). It shows a preview of exactly what will happen, Approve and Reject buttons, and then a status line that takes keyboard focus.

- **Best for:** An assistant is about to send, change or spend something outside the conversation.
- **Not for:** Confirming a destructive action on an ordinary screen: use AlertDialog.
- Molecule. Source: `src/components/molecules/approval-request/ApprovalRequest.tsx`
- Rendered docs page: `/components/approval-request`

## Import

```tsx
import { ApprovalRequest } from 'src/components/molecules/approval-request/ApprovalRequest'
```

## Requires

- A parent that holds the state and sets it to approved or rejected in onApprove and onReject.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` |  | Required. The action as a question. It also names the section. |
| `state` | `'pending' \| 'approved' \| 'rejected'` |  | Required. Pending shows the buttons; approved or rejected shows the status line. |
| `onApprove` | `() => void` |  | Required. Run the action, then set state to approved. |
| `onReject` | `() => void` |  | Required. Set state to rejected. Nothing else happens. |
| `approveLabel` | `string` | `'Approve'` | The approve button. Say the action, like "Send". |
| `rejectLabel` | `string` | `'Reject'` | The reject button, like "Don't send". |
| `approvedLabel` | `string` | `'Approved by you'` | The status line once approved. |
| `rejectedLabel` | `string` | `'Rejected'` | The status line once rejected. |
| `className` | `string` |  | Goes on the section. |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
export type ApprovalState = 'pending' | 'approved' | 'rejected'
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Pending: approve or reject, and the keyboard focus then moves to the result

```tsx
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

<LiveApproval />
```

### Resolved

```tsx
<div className="flex w-full max-w-xl flex-col gap-3">
  <ApprovalRequest title="Move the Friday pickup to Thursday?" state="approved" onApprove={() => {}} onReject={() => {}}>
    Pickup at Depot 4, Thursday 08:00 instead of Friday 08:00.
  </ApprovalRequest>
  <ApprovalRequest title="Cancel order ORD-1182?" state="rejected" onApprove={() => {}} onReject={() => {}}>
    Two replicas, already packed.
  </ApprovalRequest>
</div>
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves to Approve, then Reject. |
| `Enter` `Space` | Approves or rejects. Focus then moves to the status line that replaces the buttons. |

## Do

- Ask before every action that reaches outside the conversation: a message sent, a record changed, money spent.
- Name the buttons for the action ("Send", "Don't send") when the title alone leaves any doubt.
- Keep the decided request in the thread. It's the record of what was agreed.

## Don't

- Don't run the action before onApprove. The preview is a promise of what will happen, not a report.
- Don't focus the Approve button when the request appears: someone in the middle of typing would approve it with their next Enter.
- Don't summarise the preview. Show the email, the change, the amount.

## Common mistakes

Wrong:

```tsx
<ApprovalRequest title="Send the email?" ...>An email to the depot lead.</ApprovalRequest>
```

Right:

```tsx
<ApprovalRequest title="Send this email to Ilse Varga?" ...><p>Subject: Thursday pickup</p><p>Hi Ilse, ...</p></ApprovalRequest>
```

A person can only approve what they can see. The preview is the content itself, not a summary of it.

Wrong:

```tsx
{state === "pending" && <ApprovalRequest ... />}
```

Right:

```tsx
<ApprovalRequest state={state} ... />
```

Removing it from the page once it's decided drops focus back to the page and wipes the record of what was decided. The component swaps its own buttons for a status line instead.

## Anatomy

- **Section**: Named by the title. Outlined in the signal colour while pending, and a thin line once it's decided.
- **Label**: "Needs your approval" with a shield icon while pending, then "Approval".
- **Title**: The action as a question: "Send this order to Arad depot?"
- **Preview**: Exactly what will happen, beside a thin line.
- **Actions**: Approve (primary) and Reject (secondary). Neither has focus when the request appears.
- **Status line**: Takes the place of the buttons: "Approved by you" or "Rejected". It has tabIndex -1 so it can receive focus from code, and focus moves here when the decision was made here.
