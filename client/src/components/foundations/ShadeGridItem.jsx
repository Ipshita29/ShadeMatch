import ShadeSwatch from '../common/ShadeSwatch'
import styles from './ShadeGridItem.module.css'

function ShadeGridItem({ shade, selected = false, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.item} ${selected ? styles.selected : ''}`}
      onClick={() => onSelect?.(shade)}
      aria-pressed={selected}
    >
      <ShadeSwatch hex={shade.hex} size="lg" selected={selected} label={`${shade.name} swatch`} />
      <span className={styles.name}>{shade.name}</span>
      <span className={styles.meta}>
        {shade.undertone} &middot; {shade.depth}
      </span>
    </button>
  )
}

export default ShadeGridItem
