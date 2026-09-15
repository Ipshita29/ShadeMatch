import { useMemo, useState } from 'react'
import ProductCard from '../components/foundations/ProductCard'
import { mockBrands, mockProducts, mockShades } from '../utils/mockData'
import styles from './Foundations.module.css'

const undertones = ['All undertones', 'Warm', 'Cool', 'Neutral']
const depths = ['All depths', 'Light', 'Light Medium', 'Medium', 'Medium Deep', 'Deep']

function Foundations() {
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('All brands')
  const [undertone, setUndertone] = useState(undertones[0])
  const [depth, setDepth] = useState(depths[0])

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const shades = mockShades[product.id] || []
      const matchesSearch =
        !search ||
        `${product.brand} ${product.name}`.toLowerCase().includes(search.toLowerCase()) ||
        shades.some((shade) => shade.name.toLowerCase().includes(search.toLowerCase()))
      const matchesBrand = brand === 'All brands' || product.brand === brand
      const matchesUndertone =
        undertone === undertones[0] || shades.some((shade) => shade.undertone === undertone)
      const matchesDepth = depth === depths[0] || shades.some((shade) => shade.depth === depth)

      return matchesSearch && matchesBrand && matchesUndertone && matchesDepth
    })
  }, [search, brand, undertone, depth])

  return (
    <div>
      <h1 className={styles.title}>Foundation Library</h1>
      <p className={styles.subtitle}>Browse the brands and shade ranges available for matching.</p>

      <div className={styles.search}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search brands, products or shades..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search foundations"
        />
      </div>

      <div className={styles.filters}>
        <FilterSelect label="Brand" value={brand} onChange={setBrand} options={['All brands', ...mockBrands]} />
        <FilterSelect label="Undertone" value={undertone} onChange={setUndertone} options={undertones} />
        <FilterSelect label="Depth" value={depth} onChange={setDepth} options={depths} />
      </div>

      {filteredProducts.length > 0 ? (
        <div className={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              previewHexes={(mockShades[product.id] || []).slice(0, 5).map((shade) => shade.hex)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No foundations match your filters.</p>
        </div>
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
