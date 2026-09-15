import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import ShadeGridItem from '../components/foundations/ShadeGridItem'
import Button from '../components/common/Button'
import { mockBrands, mockProducts, mockShades } from '../utils/mockData'
import styles from './FoundationSelection.module.css'

function FoundationSelection() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState(mockBrands[0])
  const productsForBrand = useMemo(
    () => mockProducts.filter((product) => product.brand === brand),
    [brand]
  )
  const [productId, setProductId] = useState(productsForBrand[0]?.id)
  const [selectedShadeId, setSelectedShadeId] = useState(null)

  const handleBrandChange = (event) => {
    const nextBrand = event.target.value
    setBrand(nextBrand)
    const firstProduct = mockProducts.find((product) => product.brand === nextBrand)
    setProductId(firstProduct?.id)
    setSelectedShadeId(null)
  }

  const handleProductChange = (event) => {
    setProductId(event.target.value)
    setSelectedShadeId(null)
  }

  const product = mockProducts.find((item) => item.id === productId)
  const shades = mockShades[productId] || []

  return (
    <div>
      <h1 className={styles.title}>Choose a foundation</h1>
      <p className={styles.subtitle}>Select the brand and product you&rsquo;d like to match.</p>

      <StepIndicator current={3} />

      <div className={styles.selectors}>
        <label className={styles.field}>
          <span className={styles.label}>Brand</span>
          <select className={styles.select} value={brand} onChange={handleBrandChange}>
            {mockBrands.map((brandOption) => (
              <option key={brandOption} value={brandOption}>
                {brandOption}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Product</span>
          <select className={styles.select} value={productId} onChange={handleProductChange}>
            {productsForBrand.map((productOption) => (
              <option key={productOption.id} value={productOption.id}>
                {productOption.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.shadeHeader}>
        <p className={styles.shadeCount}>{product?.shadeCount} shades available</p>
      </div>

      <div className={styles.shadeGrid}>
        {shades.map((shade) => (
          <ShadeGridItem
            key={shade.id}
            shade={shade}
            selected={selectedShadeId === shade.id}
            onSelect={(selected) => setSelectedShadeId(selected.id)}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.uploadChart}>
          <p className={styles.footerText}>Can&rsquo;t find your foundation?</p>
          <Button variant="secondary" size="sm" type="button">
            Upload Shade Chart
          </Button>
        </div>

        <Button
          size="lg"
          disabled={!selectedShadeId}
          onClick={() =>
            navigate('/clients/new/results', {
              state: { brand, product: product?.name, shadeId: selectedShadeId },
            })
          }
        >
          Continue to Matches
        </Button>
      </div>
    </div>
  )
}

export default FoundationSelection
