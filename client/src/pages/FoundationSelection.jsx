import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import StepIndicator from '../components/matching/StepIndicator'
import ShadeGridItem from '../components/foundations/ShadeGridItem'
import Button from '../components/common/Button'
import { getBrands, getFoundations, getShades } from '../services/foundationService'
import styles from './FoundationSelection.module.css'

function FoundationSelection() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientId, previewUrl, skinProfile } = location.state || {}

  const [brands, setBrands] = useState([])
  const [brandName, setBrandName] = useState('')
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [shades, setShades] = useState([])

  // Load brands once.
  useEffect(() => {
    getBrands()
      .then((data) => {
        setBrands(data)
        if (data.length) setBrandName(data[0].name)
      })
      .catch(() => setBrands([]))
  }, [])

  // Load products whenever the selected brand changes.
  useEffect(() => {
    if (!brandName) return undefined
    let cancelled = false

    getFoundations({ brand: brandName })
      .then((data) => {
        if (cancelled) return
        setProducts(data)
        setProductId(data[0]?._id || '')
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })

    return () => {
      cancelled = true
    }
  }, [brandName])

  const selectedProduct = products.find((product) => product._id === productId)

  // Load a shade preview whenever the selected product changes.
  useEffect(() => {
    const product = products.find((p) => p._id === productId)
    if (!product) return undefined
    let cancelled = false

    getShades({ brand: brandName, product: product.name, limit: 60 })
      .then((response) => {
        if (!cancelled) setShades(response.data)
      })
      .catch(() => {
        if (!cancelled) setShades([])
      })

    return () => {
      cancelled = true
    }
  }, [productId, brandName, products])

  const handleBrandChange = (event) => {
    setBrandName(event.target.value)
  }

  if (!clientId) {
    return (
      <div>
        <h1 className={styles.title}>Choose a foundation</h1>
        <div className={styles.missingCard}>
          <p>Start a new match to choose a foundation to match against.</p>
          <Button to="/clients/new">Start New Match</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className={styles.title}>Choose a foundation</h1>
      <p className={styles.subtitle}>Select the brand and product you&rsquo;d like to match.</p>

      <StepIndicator current={3} />

      <div className={styles.selectors}>
        <label className={styles.field}>
          <span className={styles.label}>Brand</span>
          <select className={styles.select} value={brandName} onChange={handleBrandChange}>
            {brands.map((brand) => (
              <option key={brand._id} value={brand.name}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Product</span>
          <select className={styles.select} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.shadeHeader}>
        <p className={styles.shadeCount}>
          {selectedProduct ? `${selectedProduct.shadeCount} shades available` : 'Loading shades…'}
        </p>
      </div>

      <div className={styles.shadeGrid}>
        {shades.map((shade) => (
          <ShadeGridItem
            key={shade._id}
            shade={{
              ...shade,
              hex: shade.color?.rgb ? `rgb(${shade.color.rgb.r}, ${shade.color.rgb.g}, ${shade.color.rgb.b})` : undefined,
            }}
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
          disabled={!productId}
          onClick={() =>
            navigate('/clients/new/results', {
              state: { clientId, previewUrl, skinProfile, productId },
            })
          }
        >
          Find Matches
        </Button>
      </div>
    </div>
  )
}

export default FoundationSelection
