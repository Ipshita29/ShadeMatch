import Badge from '../common/Badge'
import Button from '../common/Button'
import styles from './ClientRow.module.css'

function ClientRow({ client }) {
  return (
    <tr className={styles.row}>
      <th scope="row" className={styles.nameCell}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(client.name)}
        </span>
        {client.name}
      </th>
      <td>
        {client.lastMatchedFoundation.brand} &middot; {client.lastMatchedFoundation.shade}
      </td>
      <td>
        <div className={styles.profileTags}>
          <Badge tone="sage">{client.skinProfile.undertone}</Badge>
          <Badge tone="outline">{client.skinProfile.depth}</Badge>
        </div>
      </td>
      <td className={styles.date}>{formatDate(client.lastAnalyzed)}</td>
      <td className={styles.action}>
        <Button variant="ghost" size="sm" to="/clients/new">
          New match
        </Button>
      </td>
    </tr>
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
    year: 'numeric',
  })
}

export default ClientRow
