import { useMemo, useState } from 'react'
import Button from '../components/common/Button'
import ClientRow from '../components/clients/ClientRow'
import { mockClients } from '../utils/mockData'
import styles from './Clients.module.css'

function Clients() {
  const [search, setSearch] = useState('')

  const filteredClients = useMemo(() => {
    if (!search) return mockClients
    return mockClients.filter((client) =>
      client.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Clients</h1>
          <p className={styles.subtitle}>Every client you&rsquo;ve analyzed and matched.</p>
        </div>
        <Button to="/clients/new">+ New Client</Button>
      </div>

      <input
        type="search"
        className={styles.searchInput}
        placeholder="Search clients..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Search clients"
      />

      {filteredClients.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Last match</th>
                <th scope="col">Skin profile</th>
                <th scope="col">Date</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No clients match &ldquo;{search}&rdquo;.</p>
        </div>
      )}
    </div>
  )
}

export default Clients
