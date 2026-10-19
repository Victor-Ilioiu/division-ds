import { useId } from 'react'
import { Checkbox, Select, Slider, Switch, type SelectOption } from '../../../components/atoms'
import { FormField, Search } from '../../../components/molecules'
import { formatMoney } from '../../../lib/money'
import { CATEGORIES, type Category } from '../../store/catalog'
import type { SortKey } from '../../filters'

const SORT_OPTIONS: SelectOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Rating' },
]

const LABEL = 'font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]'

export type FilterPanelProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchEnter: (value: string) => void
  selectedCategories: Category['id'][]
  onCategoryChange: (id: Category['id'], checked: boolean) => void
  sliderValue: number[]
  sliderMax: number
  onSliderChange: (values: number[]) => void
  onSliderCommit: (values: number[]) => void
  inStock: boolean
  onInStockChange: (checked: boolean) => void
  sort: SortKey
  onSortChange: (sort: SortKey) => void
}

/**
 * The filter controls, shared verbatim between the `lg`-and-up sidebar and the Filters sheet
 * below it (Shop.tsx mounts one or the other, never both at once -- see its own comment). Every
 * control here writes through the callbacks it is given; this component holds no state of its
 * own beyond the ids it generates for its own labels, so the sidebar and the sheet can never
 * drift onto two different ideas of what the current filters are.
 */
export function FilterPanel({
  searchValue,
  onSearchChange,
  onSearchEnter,
  selectedCategories,
  onCategoryChange,
  sliderValue,
  sliderMax,
  onSliderChange,
  onSliderCommit,
  inStock,
  onInStockChange,
  sort,
  onSortChange,
}: FilterPanelProps) {
  const uid = useId()
  const inStockId = `${uid}-in-stock`

  return (
    <div className="flex flex-col gap-6">
      <Search
        label="Search the range"
        value={searchValue}
        onValueChange={onSearchChange}
        onSearch={onSearchEnter}
        placeholder="Search the range"
      />

      <fieldset className="flex flex-col gap-3 border-0 p-0 m-0 min-w-0">
        <legend className={LABEL}>Categories</legend>
        {CATEGORIES.map(category => {
          const id = `${uid}-category-${category.id}`
          return (
            <div key={category.id} className="flex items-center gap-3">
              <Checkbox
                id={id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={checked => onCategoryChange(category.id, checked === true)}
              />
              <label htmlFor={id} className="font-body text-sm text-[var(--color-text-primary)]">
                {category.label}
              </label>
            </div>
          )
        })}
      </fieldset>

      <Slider
        label="Maximum price"
        min={10}
        max={sliderMax}
        step={10}
        value={sliderValue}
        onValueChange={onSliderChange}
        onValueCommit={onSliderCommit}
        formatValue={value => formatMoney(value * 100)}
        showValue
      />

      <div className="flex items-center gap-3">
        <Switch id={inStockId} checked={inStock} onCheckedChange={onInStockChange} />
        <label htmlFor={inStockId} className="font-body text-sm text-[var(--color-text-primary)]">
          In stock only
        </label>
      </div>

      <FormField label="Sort by">
        <Select
          label="Sort by"
          options={SORT_OPTIONS}
          value={sort}
          onValueChange={value => onSortChange(value as SortKey)}
        />
      </FormField>
    </div>
  )
}
