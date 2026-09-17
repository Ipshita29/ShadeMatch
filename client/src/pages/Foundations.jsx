import { useEffect, useState } from 'react'
import ShadeLibraryCard from '../components/foundations/ShadeLibraryCard'
import Button from '../components/common/Button'
import { getBrands, getShades, searchShades } from '../services/foundationService'
import styles from './Foundations.module.css'

const UNDERTONES = ['All undertones', 'Warm', 'Cool', 'Neutral', 'Olive', 'Uncertain']
const DEPTHS = ['All depths', 'Light', 'Light Medium', 'Medium', 'Medium Deep', 'Deep', 'Very Deep']
const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 300

function Foundations() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('All brands')
  const [undertone, setUndertone] = useState(UNDERTONES[0])
  const [depth, setDepth] = useState(DEPTHS[0])
  const [page, setPage] = useState(1)
  const [retryKey, setRetryKey] = useState(0)

  const [brands, setBrands] = useState([])
  const [status, setStatus] = useState('loading')
  const [shades, setShades] = useState([])
  const [pagination, setPagination] = useState(null)

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Changing a filter should jump back to page 1. Computed during render
  // (React's recommended way to "reset" state when an input changes)
  // rather than in an effect, so the page-1 request fires immediately
  // instead of one render late.
  const filterKey = `${search}|${brand}|${undertone}|${depth}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  const filtersChanged = filterKey !== lastFilterKey
  const effectivePage = filtersChanged ? 1 : page
  if (filtersChanged) {
    setLastFilterKey(filterKey)
    if (page !== 1) setPage(1)
  }

  const requestKey = `${filterKey}|${effectivePage}|${retryKey}`
  const [lastRequestKey, setLastRequestKey] = useState(null)
  if (requestKey !== lastRequestKey) {
    setLastRequestKey(requestKey)
    setStatus('loading')
  }

  useEffect(() => {
    let cancelled = false

    const params = {
      page: effectivePage,
      limit: PAGE_SIZE,
      brand: brand === 'All brands' ? undefined : brand,
      undertone: undertone === UNDERTONES[0] ? undefined : undertone,
      depth: depth === DEPTHS[0] ? undefined : depth,
    }

    const request = search ? searchShades({ q: search, ...params }) : getShades(params)

    request
      .then((response) => {
        if (cancelled) return
        setShades(response.data)
        setPagination(response.pagination)
        setStatus('success')
      })
      .catch(() => {
        if (cancelled) return
        // Spec: don't surface raw backend errors — a generic message covers it.
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch is driven by requestKey, which encodes every dependency below
  }, [requestKey])

  useEffect(() => {
    getBrands()
      .then(setBrands)
      .catch(() => setBrands([])) // brand filter is a nice-to-have; a failure here shouldn't block the page
  }, [])

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Foundation Library</h1>
          <p className={styles.subtitle}>Browse the brands and shade ranges available for matching.</p>
        </div>
        <Button to="/foundations/import" variant="secondary">
          Add Shade Chart
        </Button>
      </div>

      <div className={styles.search}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search brands, products or shades..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search foundations"
        />
      </div>

      <div className={styles.filters}>
        <FilterSelect
          label="Brand"
          value={brand}
          onChange={setBrand}
          options={['All brands', ...brands.map((b) => b.name)]}
        />
        <FilterSelect label="Undertone" value={undertone} onChange={setUndertone} options={UNDERTONES} />
        <FilterSelect label="Depth" value={depth} onChange={setDepth} options={DEPTHS} />
      </div>

      {status === 'loading' && <p className={styles.statusText}>Loading foundation shades&hellip;</p>}

      {status === 'error' && (
        <div className={styles.empty}>
          <p>Unable to load foundation library. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => setRetryKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      {status === 'success' && shades.length === 0 && (
        <div className={styles.empty}>
          <p>No shades found.</p>
        </div>
      )}

      {status === 'success' && shades.length > 0 && (
        <>
          <div className={styles.grid}>
            {shades.map((shade) => (
              <ShadeLibraryCard key={shade._id} shade={shade} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className={styles.filterField}>
      <span className={styles.filterLabel}>{label}</span>
      <select
        className={styles.filterSelect}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default Foundations
