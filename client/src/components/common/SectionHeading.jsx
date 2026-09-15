import styles from './SectionHeading.module.css'

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  as: Heading = 'h2',
  className = '',
}) {
  return (
    <div className={`${styles.wrap} ${styles[align]} ${className}`}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <Heading className={styles.title}>{title}</Heading>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  )
}

export default SectionHeading
