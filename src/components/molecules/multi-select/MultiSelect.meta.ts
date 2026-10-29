import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'MultiSelect',
  title: 'Multi-select',
  tier: 'molecules',
  slug: 'multi-select',
  summary:
    'Pick several choices from a list. The chosen ones sit inside the field as tags you can remove, followed by a text field that filters the list as you type. It\'s the many-values version of Select.',
  requires: [
    'A <FormField> around it. FormField supplies the visible label, the help and the error, and replaces the label prop with its own.',
  ],
  pitfalls: [
    {
      wrong: '<Select label="Kit" options={kit} /> // then a second Select for the next item',
      right: '<MultiSelect label="Kit" options={kit} value={chosen} onValueChange={setChosen} />',
      why: 'Select holds one value. A list of picks is one MultiSelect, whose value is a string array (a list of text values).',
    },
  ],
  anatomy: [
    { part: 'Field', description: "Looks like Input, but grows to fit: it wraps onto more lines as tags are added. Clicking anywhere on it puts focus in the text field and opens the list." },
    { part: 'Tag', description: 'One for each chosen option, in the order they were chosen. Removing one fades it out and slides the tags after it into its place (M7). Focus goes back to the text field.' },
    { part: 'Text field', description: 'Has role="combobox", which tells screen readers it\'s a text field with a list attached. Typing filters the list. The placeholder only shows while nothing is chosen.' },
    { part: 'Listbox', description: 'The list, where several options can be chosen. It sits in a panel rendered in a portal (at the end of the page, so nothing clips it), with the same background as Select and the crosshair. It slides down out of the field and back up into it (M7). A tick marks every chosen row.' },
  ],
  props: [
    { name: 'label', type: 'string', description: 'The name screen readers give the text field and the list. Leave it out inside a FormField, which sets it from its own label. Outside one it is required, and `division-ds check` flags a missing one.' },
    { name: 'options', type: 'SelectOption[]', description: '{ value, label, disabled? }, the same rows Select takes.' },
    { name: 'value', type: 'string[]', description: 'The current selection when the page keeps track of it (controlled), as option values in the order they were chosen.' },
    { name: 'defaultValue', type: 'string[]', description: 'The starting selection when the component keeps track itself (uncontrolled).' },
    { name: 'onValueChange', type: '(value: string[]) => void', description: 'Runs with the whole new array every time an option is added or removed.' },
    { name: 'placeholder', type: 'string', default: "'Select…'", description: 'Shown while nothing is chosen.' },
    { name: 'emptyMessage', type: 'string', default: "'No matches'", description: 'Shown in the panel when the typed text matches no option.' },
    { name: 'inputSize', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Matches Input and Select: a minimum height of 32, 40 or 48px (pixels), with text at size xs, sm or base. It also sets the size of the typed text and of the option rows in the list (28, 32 or 40px). The tags come in one size, so sm fits a single row of them snugly, and md and lg add room around it. The field grows past the minimum as tags wrap.' },
    { name: 'invalid', type: 'boolean', default: 'false', description: 'Sets aria-invalid (which tells screen readers the value has a problem) and the invalid border. FormField sets it from error.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Turns the field off. The chosen tags stay visible, without their remove buttons.' },
    { name: 'required', type: 'boolean', default: 'false', description: 'Sets aria-required on the text field, so screen readers say it\'s required.' },
    { name: 'name', type: 'string', description: 'Sends each chosen value with the form as its own hidden input under this name.' },
    { name: 'className', type: 'string', description: 'Extra CSS classes, merged onto the field.' },
    { name: 'ref', type: 'Ref<HTMLInputElement>', description: 'Passed through to the text field.' },
    { name: 'id', type: 'string', description: 'The text field’s id. FormField sets it.' },
    { name: 'aria-describedby', type: 'string', description: 'The ids of the help and error text, put on the text field so screen readers read them. FormField sets it.' },
  ],
  keyboard: [
    { keys: ['↓', '↑'], does: 'Opens the list, then moves the highlight, skipping rows that are turned off.' },
    { keys: ['Enter'], does: 'Adds or removes the highlighted option. The list stays open.' },
    { keys: ['Backspace'], does: 'When the text field is empty, removes the last tag.' },
    { keys: ['Esc'], does: 'Closes the list. Press it again to clear the typed text.' },
    { keys: ['Tab'], does: 'Moves through the tags’ remove buttons and the text field, and closes the list on the way out.' },
  ],
  useWhen: 'Any number of choices, including none, from a list too long to show all at once.',
  notFor: 'A single choice: use Select, or Radio when there are fewer than about five options. A handful that all fit: use Checkbox.',
  dos: [
    'Use it when someone may pick any number of options, including none.',
    'Wrap it in a FormField, like every other form control.',
    'Keep option labels short. They become tags, and long tags wrap the field onto many lines.',
    'Turn off (disable) an option that isn\'t available, instead of leaving it out.',
  ],
  donts: [
    "Don't use it for a single choice. That's Select, or radios when there are fewer than about five options.",
    "Don't use it for a handful of options that all fit on screen. Checkboxes show every choice at once.",
    "Don't put actions in the list. It chooses values, and a command belongs in a DropdownMenu.",
  ],
}
