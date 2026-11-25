import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { meta } from './CommentThread.meta'
import { CommentThread, type ThreadComment } from './CommentThread'

const START: ThreadComment[] = [
  {
    id: 'c1',
    author: { name: 'Ilse Varga' },
    body: 'The scanner at gate 2 drops every third read. A photo of the error is attached.',
    time: '2026-11-25T09:40:00Z',
    timeLabel: '25 Nov, 09:40',
    canEdit: true,
    canDelete: true,
    replies: [
      {
        id: 'c2',
        author: { name: 'Assistant', assistant: true },
        body: 'The firmware on that scanner is two versions behind the others. I have drafted the update steps in the description.',
        time: '2026-11-25T09:52:00Z',
        timeLabel: '25 Nov, 09:52',
      },
    ],
  },
  {
    id: 'c3',
    author: { name: 'Tomas Reyes' },
    body: 'I can do the update on Thursday morning.',
    time: '2026-11-25T11:10:00Z',
    timeLabel: '25 Nov, 11:10',
  },
]

function LiveThreadExample() {
  const [comments, setComments] = useState(START)
  const stamp = () => ({ time: new Date().toISOString(), timeLabel: 'Just now' })
  return (
    <CommentThread
      className="max-w-2xl"
      label="Comments on R-1043"
      comments={comments}
      composerHelp="Ctrl+Enter sends."
      onAdd={(body, parentId) => {
        const comment: ThreadComment = { id: `n${Date.now()}`, author: { name: 'Ilse Varga' }, body, canEdit: true, canDelete: true, ...stamp() }
        setComments(current => parentId
          ? current.map(c => (c.id === parentId ? { ...c, replies: [...(c.replies ?? []), comment] } : c))
          : [...current, comment])
      }}
      onEdit={(id, body) => setComments(current => current.map(c => (c.id === id ? { ...c, body, edited: true } : c)))}
      onDelete={id => setComments(current => current.filter(c => c.id !== id))}
    />
  )
}

export function CommentThreadDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Comment, reply, edit and delete">
        <LiveThreadExample />
      </Example>
      <Example caption="Read-only, with nothing yet">
        <CommentThread label="Comments on R-1044" comments={[]} />
      </Example>
    </ComponentDocs>
  )
}
