import { createRef, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Button,
  Checkbox,
  IconButton,
  Input,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Textarea,
} from '../components/atoms'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  RatingInput,
  Tabs,
  TabsList,
  TabsTrigger,
} from '../components/molecules'
import { disabledObject, disabledText } from './disabled'

const SPEEDS = [
  { value: 'standard', label: 'Standard' },
  { value: 'overnight', label: 'Overnight', disabled: true },
]

/** True when every class in `rule` is authored on the element. Which half a component takes is the
 *  decision this file pins; that the styles then apply is CSS, which jsdom never evaluates. */
function carries(el: Element, rule: string) {
  return rule.split(' ').every(token => el.classList.contains(token))
}

type Case = { name: string; half: 'text' | 'object'; find: () => Promise<Element> }

const show = (node: ReactNode) => render(<>{node}</>)

const CASES: Case[] = [
  {
    name: 'Input',
    half: 'text',
    find: async () => (show(<Input aria-label="Depot" disabled />), screen.getByRole('textbox')),
  },
  {
    name: 'Textarea',
    half: 'text',
    find: async () => (show(<Textarea aria-label="Notes" disabled />), screen.getByRole('textbox')),
  },
  {
    name: 'Select trigger',
    half: 'text',
    find: async () => (show(<Select label="Speed" options={SPEEDS} disabled />), screen.getByRole('combobox')),
  },
  {
    name: 'Select option',
    half: 'text',
    find: async () => {
      show(<Select label="Speed" options={SPEEDS} />)
      await userEvent.click(screen.getByRole('combobox'))
      return screen.findByRole('option', { name: 'Overnight' })
    },
  },
  {
    name: 'DropdownMenu item',
    half: 'text',
    find: async () => {
      show(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuItem disabled>Export</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      await userEvent.click(screen.getByRole('button', { name: 'Actions' }))
      return screen.findByRole('menuitem', { name: 'Export' })
    },
  },
  {
    name: 'Tabs trigger',
    half: 'text',
    find: async () => {
      show(
        <Tabs defaultValue="open">
          <TabsList aria-label="Manifests">
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="archived" disabled>
              Archived
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )
      return screen.getByRole('tab', { name: 'Archived' })
    },
  },
  {
    name: 'Button',
    half: 'object',
    find: async () => (show(<Button disabled>Save</Button>), screen.getByRole('button')),
  },
  {
    name: 'IconButton',
    half: 'object',
    find: async () => (show(<IconButton label="Close" disabled>x</IconButton>), screen.getByRole('button')),
  },
  {
    name: 'Checkbox',
    half: 'object',
    find: async () => (show(<Checkbox aria-label="Fragile" disabled />), screen.getByRole('checkbox')),
  },
  {
    name: 'Radio',
    half: 'object',
    find: async () => (
      show(
        <RadioGroup aria-label="Speed">
          <Radio value="standard" aria-label="Standard" disabled />
        </RadioGroup>
      ),
      screen.getByRole('radio')
    ),
  },
  {
    name: 'Switch',
    half: 'object',
    find: async () => (show(<Switch aria-label="Notify" disabled />), screen.getByRole('switch')),
  },
  {
    name: 'RatingInput star',
    half: 'object',
    find: async () => (show(<RatingInput label="Rate the replica" disabled />), screen.getAllByRole('radio')[0]),
  },
  {
    name: 'Slider',
    half: 'object',
    find: async () => {
      const ref = createRef<HTMLSpanElement>()
      show(<Slider ref={ref} label="Load" defaultValue={[40]} disabled />)
      if (!ref.current) throw new Error('Slider did not forward its ref')
      return ref.current
    },
  },
]

describe('the disabled-state rule', () => {
  for (const c of CASES) {
    it(`${c.name} takes the ${c.half} half`, async () => {
      const el = await c.find()
      const [own, other] = c.half === 'text' ? [disabledText, disabledObject] : [disabledObject, disabledText]
      expect(carries(el, own), `${c.name} should carry: ${own}`).toBe(true)
      expect(carries(el, other), `${c.name} should not carry: ${other}`).toBe(false)
    })
  }

  it('a disabled Select trigger with no value still shows disabled text, not placeholder text', () => {
    show(<Select label="Speed" options={SPEEDS} disabled />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('data-placeholder')
    expect(
      carries(trigger, 'data-[disabled]:data-[placeholder]:text-[var(--component-control-text-disabled)]')
    ).toBe(true)
  })
})
