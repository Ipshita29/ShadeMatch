import Button from '../common/Button'
import styles from './QuickMatchCard.module.css'

function QuickMatchCard() {
  return (
    <div className={`${styles.card} grain`}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Quick Match</p>
        <h2 className={styles.title}>Find a foundation match</h2>
        <p className={styles.body}>
          Upload a client&rsquo;s photo and discover their closest foundation shades.
        </p>
        <Button to="/clients/new" size="lg">
          Start New Match
        </Button>
      </div>
    </div>
  )
}

export default QuickMatchCard
