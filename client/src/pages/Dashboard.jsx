import Button from '../components/common/Button'
import QuickMatchCard from '../components/dashboard/QuickMatchCard'
import StatCard from '../components/dashboard/StatCard'
import ClientCard from '../components/dashboard/ClientCard'
import MatchRow from '../components/matching/MatchRow'
import { artist, mockClients, mockMatches, quickStats } from '../utils/mockData'
import styles from './Dashboard.module.css'

function Dashboard() {
  const firstName = artist.name.split(' ')[0]
  const recentClients = mockClients.slice(0, 5)
  const recentMatches = mockMatches.slice(0, 4)

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Good morning, {firstName}</h1>
          <p className={styles.subtext}>Ready to find the right shade?</p>
        </div>
        <Button to="/clients/new">+ New Client</Button>
      </div>

      <div className={styles.quickMatch}>
        <QuickMatchCard />
      </div>

      <div className={styles.columns}>
        <section aria-labelledby="recent-clients-heading">
          <div className={styles.sectionHead}>
            <h2 id="recent-clients-heading" className={styles.sectionTitle}>
              Recent Clients
            </h2>
            <Button to="/clients" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <div className={styles.clientList}>
            {recentClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        </section>

        <section aria-labelledby="recent-matches-heading">
          <div className={styles.sectionHead}>
            <h2 id="recent-matches-heading" className={styles.sectionTitle}>
              Recent Matches
            </h2>
            <Button to="/matches" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <ul className={styles.matchList}>
            {recentMatches.map((match) => (
              <MatchRow key={match.id} match={match} showClient />
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="quick-stats-heading" className={styles.stats}>
        <h2 id="quick-stats-heading" className={styles.sectionTitle}>
          Quick Stats
        </h2>
        <div className={styles.statsGrid}>
          {quickStats.map((stat) => (
            <StatCard key={stat.id} label={stat.label} value={stat.value} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
