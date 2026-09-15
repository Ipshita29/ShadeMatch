import { useNavigate } from 'react-router-dom'
import Logo from '../components/common/Logo'
import Button from '../components/common/Button'
import styles from './Login.module.css'

function Login() {
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    // Part 2 is UI only — there is no real authentication yet.
    navigate('/dashboard')
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.visual} grain`} aria-hidden="true">
        <div className={styles.visualGlow} />
        <div className={styles.visualQuote}>
          <p>
            &ldquo;The right shade should disappear into the skin, not sit on top of
            it.&rdquo;
          </p>
          <span>ShadeMatch, for makeup artists</span>
        </div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formWrap}>
          <Logo />

          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue matching clients to their shades.</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@studio.com"
                required
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                required
                className={styles.input}
              />
            </label>

            <Button type="submit" size="lg" className={styles.submit}>
              Sign in
            </Button>
          </form>

          <p className={styles.footerText}>
            Don&rsquo;t have an account? <a href="#create-account">Create one</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
