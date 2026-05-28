import styles from './MemoriesProvenance.module.css';

export type ProvenanceRow = {
  label: string;
  value: string;
};

type Props = {
  rows: ProvenanceRow[];
};

export function MemoriesProvenance({ rows }: Props) {
  return (
    <dl className={styles.provenance}>
      {rows.map((row) => (
        <div className={styles['provenance__row']} key={row.label}>
          <dt className={styles['provenance__label']}>{row.label}</dt>
          <dd className={styles['provenance__value']}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
