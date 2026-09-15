import styles from './Card.module.css'

function Card({ children, as: Tag = 'div', interactive = false, className = '', ...rest }) {
  const classes = [styles.card, interactive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}

export default Card
