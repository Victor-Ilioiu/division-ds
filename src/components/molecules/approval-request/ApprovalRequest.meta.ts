import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'ApprovalRequest',
  title: 'Approval request',
  tier: 'molecules',
  slug: 'approval-request',
  summary:
    "A pause before an action that changes something in the real world (a side effect). It shows a preview of exactly what will happen, Approve and Reject buttons, and then a status line that takes keyboard focus.",
  useWhen: 'An assistant is about to send, change or spend something outside the conversation.',
  notFor: 'Confirming a destructive action on an ordinary screen: use AlertDialog.',
  requires: ['A parent that holds the state and sets it to approved or rejected in onApprove and onReject.'],
  pitfalls: [
    {
      wrong: '<ApprovalRequest title="Send the email?" ...>An email to the depot lead.</ApprovalRequest>',
      right: '<ApprovalRequest title="Send this email to Ilse Varga?" ...><p>Subject: Thursday pickup</p><p>Hi Ilse, ...</p></ApprovalRequest>',
      why: "A person can only approve what they can see. The preview is the content itself, not a summary of it.",
    },
    {
      wrong: '{state === "pending" && <ApprovalRequest ... />}',
      right: '<ApprovalRequest state={state} ... />',
      why: "Removing it from the page once it's decided drops focus back to the page and wipes the record of what was decided. The component swaps its own buttons for a status line instead.",
    },
  ],
  anatomy: [
    { part: 'Section', description: "Named by the title. Outlined in the signal colour while pending, and a thin line once it's decided." },
    { part: 'Label', description: '"Needs your approval" with a shield icon while pending, then "Approval".' },
    { part: 'Title', description: 'The action as a question: "Send this order to Arad depot?"' },
    { part: 'Preview', description: 'Exactly what will happen, beside a thin line.' },
    { part: 'Actions', description: "Approve (primary) and Reject (secondary). Neither has focus when the request appears." },
    { part: 'Status line', description: 'Takes the place of the buttons: "Approved by you" or "Rejected". It has tabIndex -1 so it can receive focus from code, and focus moves here when the decision was made here.' },
  ],
  props: [
    { name: 'title', type: 'string', description: 'Required. The action as a question. It also names the section.' },
    { name: 'state', type: "'pending' | 'approved' | 'rejected'", description: 'Required. Pending shows the buttons; approved or rejected shows the status line.' },
    { name: 'onApprove', type: '() => void', description: 'Required. Run the action, then set state to approved.' },
    { name: 'onReject', type: '() => void', description: 'Required. Set state to rejected. Nothing else happens.' },
    { name: 'approveLabel', type: 'string', default: "'Approve'", description: 'The approve button. Say the action, like "Send".' },
    { name: 'rejectLabel', type: 'string', default: "'Reject'", description: 'The reject button, like "Don\'t send".' },
    { name: 'approvedLabel', type: 'string', default: "'Approved by you'", description: 'The status line once approved.' },
    { name: 'rejectedLabel', type: 'string', default: "'Rejected'", description: 'The status line once rejected.' },
    { name: 'className', type: 'string', description: 'Goes on the section.' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves to Approve, then Reject.' },
    { keys: ['Enter', 'Space'], does: 'Approves or rejects. Focus then moves to the status line that replaces the buttons.' },
  ],
  dos: [
    'Ask before every action that reaches outside the conversation: a message sent, a record changed, money spent.',
    'Name the buttons for the action ("Send", "Don\'t send") when the title alone leaves any doubt.',
    "Keep the decided request in the thread. It's the record of what was agreed.",
  ],
  donts: [
    "Don't run the action before onApprove. The preview is a promise of what will happen, not a report.",
    "Don't focus the Approve button when the request appears: someone in the middle of typing would approve it with their next Enter.",
    "Don't summarise the preview. Show the email, the change, the amount.",
  ],
}
