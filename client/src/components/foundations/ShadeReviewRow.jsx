import ShadeSwatch from '../common/ShadeSwatch'
import { DEPTH_VALUES, UNDERTONE_VALUES, HUE_VALUES } from '../../utils/foundationEnums'
import styles from './ShadeReviewRow.module.css'

function swatchColor(rgb) {
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : null
}

function clampChannel(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

function StatusItem({ ok, okText, missingText }) {
  return (
    <li className={ok ? styles.statusOk : styles.statusMissing}>
      <StatusIcon ok={ok} />
      {ok ? okText : missingText}
    </li>
  )
}

function StatusIcon({ ok }) {
  if (ok) {
    return (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 10.2l2.4 2.4L14 7.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" />
    </svg>
  )
}

// One editable candidate in the Part 9 review screen. The artist can
// correct every field before anything reaches the database — nothing here
// writes to Mongo directly, it only calls onChange with the edited draft.
function ShadeReviewRow({ shade, rank, onChange, onRemove }) {
  const included = shade.include !== false

  const update = (patch) => onChange({ ...shade, ...patch, verified: true })

  const updateRgbChannel = (channel, rawValue) => {
    const base = shade.rgb || { r: 128, g: 128, b: 128 }
    update({ rgb: { ...base, [channel]: clampChannel(rawValue) } })
  }

  return (
    <div className={`${styles.row} ${!included ? styles.excluded : ''}`}>
      <div className={styles.swatchCol}>
        <ShadeSwatch hex={swatchColor(shade.rgb)} size="lg" label={`${shade.name || 'Unnamed shade'} swatch`} />
        <span className={styles.rank}>#{rank}</span>
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            className={styles.input}
            value={shade.name || ''}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="Shade name"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Code</span>
          <input
            className={styles.input}
            value={shade.code || ''}
            onChange={(event) => update({ code: event.target.value })}
            placeholder="e.g. NC40"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Depth</span>
          <select className={styles.select} value={shade.depth || ''} onChange={(event) => update({ depth: event.target.value || null })}>
            <option value="">Not set</option>
            {DEPTH_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Undertone</span>
          <select
            className={styles.select}
            value={shade.undertone || ''}
            onChange={(event) => update({ undertone: event.target.value || null })}
          >
            <option value="">Not set</option>
            {UNDERTONE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Hue</span>
          <select className={styles.select} value={shade.hue || ''} onChange={(event) => update({ hue: event.target.value || null })}>
            <option value="">Not set</option>
            {HUE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.colorCol}>
        <span className={styles.fieldLabel}>Color (RGB)</span>
        {shade.rgb ? (
          <div className={styles.rgbInputs}>
            {['r', 'g', 'b'].map((channel) => (
              <input
                key={channel}
                type="number"
                min="0"
                max="255"
                className={styles.rgbInput}
                value={shade.rgb[channel]}
                aria-label={`${channel.toUpperCase()} channel`}
                onChange={(event) => updateRgbChannel(channel, event.target.value)}
              />
            ))}
          </div>
        ) : (
          <button type="button" className={styles.addColorButton} onClick={() => update({ rgb: { r: 200, g: 170, b: 140 } })}>
            Enter RGB manually
          </button>
        )}
      </div>

      <ul className={styles.statusList}>
        <StatusItem ok={Boolean(shade.name)} okText="Shade label detected" missingText="No label detected — enter a name" />
        <StatusItem ok={Boolean(shade.rgb)} okText="Color estimated from chart" missingText="Color not detected — enter RGB manually" />
      </ul>

      <div className={styles.actions}>
        <label className={styles.includeToggle}>
          <input type="checkbox" checked={included} onChange={(event) => onChange({ ...shade, include: event.target.checked })} />
          Include
        </label>
        <button type="button" className={styles.removeButton} onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}

export default ShadeReviewRow
