import Link from 'next/link'
import styles from '../../styles/sidebar.module.css'

const Sidebar = () => {
  const startYear = 1990
  const endYear = new Date().getFullYear()
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => endYear - index
  )

  return (
    <div className={styles.sidebar}>
      {years.map((year) => {
        const href = year === endYear ? `/` : `/seasons/${year}`
        return (
          <Link key={year} href={href} className={styles.yearStyle}>
            {year}
          </Link>
        )
      })}
    </div>
  )
}

export default Sidebar
