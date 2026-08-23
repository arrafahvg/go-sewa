'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import ProductCard from '@/components/storefront/product-card'
import { formatMoneyCompact } from '@/lib/utils/money'
import type { CatalogProduct, CatalogCategory } from '@/lib/data/catalog'

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name'

/** Price-band quick filters in Rp (daily rate). -1 = any. */
const PRICE_BANDS: { key: string; label: string; min?: number; max?: number }[] = [
  { key: 'any', label: 'Any price', max: -1 },
  { key: 'under50', label: 'Under Rp 50k', max: 50_000 },
  { key: '50to100', label: 'Rp 50k – 100k', min: 50_000, max: 100_000 },
  { key: '100to150', label: 'Rp 100k – 150k', min: 100_000, max: 150_000 },
  { key: 'over150', label: 'Over Rp 150k', min: 150_000 },
]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'name', label: 'Name A–Z' },
]
export default function RentExplorer({
  products,
  categories,
  initialCategory = '',
  initialSort = 'featured',
}: {
  products: CatalogProduct[]
  categories: CatalogCategory[]
  initialCategory?: string
  initialSort?: string
}) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [priceKey, setPriceKey] = useState('any')
  const [depositFree, setDepositFree] = useState(false)
  const [sort, setSort] = useState<SortKey>(initialSort as SortKey)

  // Debounced search per §44 — filter in-memory to avoid redundant queries.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250)
    return () => clearTimeout(t)
  }, [q])

  const results = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase()
    const price = PRICE_BANDS.find((b) => b.key === priceKey)
    const filtered = products.filter((p) => {
      if (category && (p.categorySlug ?? '') !== category) return false
      if (price) {
        if (price.min !== undefined && p.dailyCents < price.min) return false
        if (price.max !== undefined && p.dailyCents > price.max) return false
      }
      if (depositFree && p.depositCents > 0) return false
      if (term) {
        const haystack = [
          p.name, p.description, p.categoryNameEn ?? '',
          ...Object.values(p.specs ?? {}),
        ].join(' ').toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
    if (sort === 'price-asc') filtered.sort((a, b) => a.dailyCents - b.dailyCents)
    else if (sort === 'price-desc') filtered.sort((a, b) => b.dailyCents - a.dailyCents)
    else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name))
    else filtered.sort((a, b) => (a.categoryNameEn ?? '').localeCompare(b.categoryNameEn ?? ''))
    return filtered
  }, [debouncedQ, category, priceKey, depositFree, sort, products])

  const hasFilters = q.trim() !== '' || category !== '' || priceKey !== 'any' || depositFree

  function clearAll() {
    setQ(''); setDebouncedQ(''); setCategory(''); setPriceKey('any'); setDepositFree(false)
  }

  return (
    <RentExplorerView
      q={q} setQ={setQ}
      sort={sort} setSort={setSort}
      category={category} setCategory={setCategory}
      categories={categories}
      priceKey={priceKey} setPriceKey={setPriceKey}
      depositFree={depositFree} setDepositFree={setDepositFree}
      results={results}
      hasFilters={hasFilters}
      clearAll={clearAll}
    />
  )

function RentExplorerView(props: {
  q: string; setQ: Dispatch<SetStateAction<string>>
  sort: SortKey; setSort: Dispatch<SetStateAction<SortKey>>
  category: string; setCategory: Dispatch<SetStateAction<string>>
  categories: CatalogCategory[]
  priceKey: string; setPriceKey: Dispatch<SetStateAction<string>>
  depositFree: boolean; setDepositFree: Dispatch<SetStateAction<boolean>>
  results: CatalogProduct[]
  hasFilters: boolean
  clearAll: () => void
}) {
  const { q, setQ, sort, setSort, category, setCategory, categories, priceKey, setPriceKey, depositFree, setDepositFree, results, hasFilters, clearAll } = props

  return (
    <div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#173b3b]/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search devices, specs…"
            aria-label="Search rental devices"
            className="w-full rounded-full border border-[#173b3b]/15 bg-white py-3 pl-11 pr-10 text-sm font-normal outline-none focus:border-[#e76f51]"
          />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#173b3b]/50"><X size={15} /></button>}
        </div>
        <label className="sr-only" htmlFor="rent-sort">Sort devices</label>
        <select
          id="rent-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-full sm:w-auto rounded-full border border-[#173b3b]/15 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#e76f51]"
        >
          {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      <FiltersRow
        category={category} setCategory={setCategory} categories={categories}
        priceKey={priceKey} setPriceKey={setPriceKey}
        depositFree={depositFree} setDepositFree={setDepositFree}
      />

      <p className="mt-4 text-xs text-[#173b3b]/55">
        {results.length === 1 ? '1 device' : `${results.length} devices`} {hasFilters ? 'matching your filters' : 'in the lineup'}
        {hasFilters && <button onClick={clearAll} className="ml-2 font-bold text-[#387066] underline-offset-2 hover:underline">Clear all</button>}
      </p>

      {results.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-[#173b3b]/15 p-10 text-center text-sm text-[#173b3b]/60">
          No devices match your search. Try a different keyword or clear your filters.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <ProductCard
              key={p.id}
              name={p.name}
              slug={p.slug}
              imageUrl={p.imageUrl}
              category={p.categoryNameEn ?? 'Rental'}
              price={formatMoneyCompact(p.dailyCents)}
              deposit={p.depositCents}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FiltersRow({ category, setCategory, categories, priceKey, setPriceKey, depositFree, setDepositFree }: {
  category: string; setCategory: Dispatch<SetStateAction<string>>
  categories: CatalogCategory[]
  priceKey: string; setPriceKey: Dispatch<SetStateAction<string>>
  depositFree: boolean; setDepositFree: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setCategory('')} className={`rounded-full px-4 py-2 text-xs font-bold transition ${category === '' ? 'bg-[#173b3b] text-white' : 'border border-[#173b3b]/15 bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>All</button>
        {categories.map((c) => (
          <button key={c.slug} onClick={() => setCategory(category === c.slug ? '' : c.slug)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${category === c.slug ? 'bg-[#173b3b] text-white' : 'border border-[#173b3b]/15 bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>{c.nameEn}</button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={15} className="text-[#173b3b]/40" />
        {PRICE_BANDS.map((b) => (
          <button key={b.key} onClick={() => setPriceKey(b.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${priceKey === b.key ? 'bg-[#173b3b] text-white' : 'border border-[#173b3b]/15 bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>{b.label}</button>
        ))}
        <button onClick={() => setDepositFree((v) => !v)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${depositFree ? 'bg-[#173b3b] text-white' : 'border border-[#173b3b]/15 bg-white text-[#173b3b]/70 hover:bg-[#e4eee8]'}`}>No deposit</button>
      </div>
    </>
  )
}

}