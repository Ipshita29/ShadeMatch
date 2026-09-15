import { Link } from 'react-router-dom'
import Badge from '../common/Badge'
import styles from './ClientCard.module.css'

function ClientCard({ client }) {
  return (
    <Link to="/clients/new" className={styles.card}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(client.name)}
      </span>

      <div className={styles.body}>
        <p className={styles.name}>{client.name}</p>
        <p className={styles.meta}>
          Last analyzed {formatDate(client.lastAnalyzed)}
        </p>
      </div>

      <div className={styles.tags}>
        <Badge tone="sage">{client.skinProfile.undertone}</Badge>
        <Badge tone="outline">{client.skinProfile.depth}</Badge>
      </div>

      <div className={styles.lastMatch}>
        <p className={styles.lastMatchLabel}>Last matched</p>
        <p className={styles.lastMatchValue}>
          {client.lastMatchedFoundation.brand} &middot; {client.lastMatchedFoundation.shade}
        </p>
      </div>
    </Link>
  )
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default ClientCard
