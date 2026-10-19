import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { Example } from '../../docs/Example'
import { Switch } from '../../atoms'
import { meta } from './Accordion.meta'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion'

/** One labelled switch row for the settings example: the Switch takes an id and a label htmlFor,
 *  not a FormField (AGENTS.md, Forms). */
function SettingRow({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="text-sm text-[var(--color-text-primary)]">
        {label}
      </label>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  )
}

/** Controlled: the open sections live in the page's state, so something outside the accordion can
 *  read them. Here, a line that names what is open. */
function ControlledExample() {
  const [open, setOpen] = useState<string[]>(['battery'])
  return (
    <div className="w-full max-w-lg">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
        Open: {open.length ? open.join(', ') : 'none'}
      </p>
      <Accordion type="multiple" value={open} onValueChange={setOpen}>
        <AccordionItem value="battery">
          <AccordionTrigger>Battery</AccordionTrigger>
          <AccordionContent>11.1V LiPo, 1450mAh, with a deans connector.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="hop-up">
          <AccordionTrigger>Hop-up</AccordionTrigger>
          <AccordionContent>Rotary adjustment, 60 degree bucking.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export function AccordionDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Frequently asked questions (FAQ): plain style, one answer open at a time, and the open one can be closed again">
        <div className="w-full max-w-lg">
          <Accordion type="single" collapsible>
            <AccordionItem value="shipping">
              <AccordionTrigger>How long does shipping take?</AccordionTrigger>
              <AccordionContent>
                Two to four working days inside the EU. Every parcel leaves the depot with a tracking
                number, sent to you by email the same day.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>Can I return a replica?</AccordionTrigger>
              <AccordionContent>
                Within 30 days, unfired and in its original box. Open a return from your order page and
                print the label.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="age">
              <AccordionTrigger>Do I need to prove my age?</AccordionTrigger>
              <AccordionContent>
                Yes, once. We check an ID document at the first order of a replica; accessories need no
                check.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="custom" disabled>
              <AccordionTrigger>Custom builds (paused)</AccordionTrigger>
              <AccordionContent>The workshop takes no new builds this season.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Example>

      <Example caption="Settings sections: boxed style, several open at once, and each section header is a level-2 heading (h2)">
        <div className="w-full max-w-lg">
          <Accordion type="multiple" variant="boxed" defaultValue={['notifications']}>
            <AccordionItem value="notifications">
              <AccordionTrigger level={2}>Notifications</AccordionTrigger>
              <AccordionContent>
                <SettingRow id="acc-set-shipping" label="Shipping updates" defaultChecked />
                <SettingRow id="acc-set-restock" label="Restock alerts" />
                <SettingRow id="acc-set-news" label="Monthly newsletter" />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="privacy">
              <AccordionTrigger level={2}>Privacy</AccordionTrigger>
              <AccordionContent>
                <SettingRow id="acc-set-profile" label="Show my squad profile" defaultChecked />
                <SettingRow id="acc-set-history" label="Keep order history" defaultChecked />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="display">
              <AccordionTrigger level={2}>Display</AccordionTrigger>
              <AccordionContent>
                <SettingRow id="acc-set-motion" label="Reduce motion" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Example>

      <Example caption="Controlled: the page keeps track of which sections are open">
        <ControlledExample />
      </Example>
    </ComponentDocs>
  )
}
