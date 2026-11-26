
type PricePoint = {
  sale_date: string;
  average_price: number;
  quantity_sold: number;
  sales_count: number;
};

export function MarketPriceChart({ points }: { points: PricePoint[] }) {
  const sorted = [...points].sort((a, b) =>
    a.sale_date.localeCompare(b.sale_date)
  );

  const latest = sorted[sorted.length - 1];
  const values = sorted.map((p) => Number(p.average_price));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = Math.max(max - min, 1);

  const coords = sorted.map((point, index) => ({
    x: sorted.length === 1 ? 150 : 8 + (index / (sorted.length - 1)) * 284,
    y: 76 - ((Number(point.average_price) - min) / range) * 58,
    point,
  }));

  const line = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div style={{
      marginTop: 8,
      padding: 12,
      borderRadius: 12,
      background: '#f7faf6',
      border: '1px solid #e5eee3'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <strong style={{ color: '#355640', fontSize: 12 }}>
          Cours sur 7 jours
        </strong>

        {latest && (
          <strong style={{ color: '#25804a', fontSize: 12 }}>
            {Number(latest.average_price).toLocaleString('fr-FR')} pièces
          </strong>
        )}
      </div>

      {sorted.length === 0 ? (
        <p style={{ color: '#89958b', fontSize: 11 }}>
          Pas encore de vente enregistrée.
        </p>
      ) : (
        <>
          <svg
            viewBox="0 0 300 96"
            role="img"
            aria-label="Évolution du prix moyen sur 7 jours"
            style={{ width: '100%', height: 96 }}
          >
            <line x1="8" y1="76" x2="292" y2="76"
              stroke="#dce8da" />

            <line x1="8" y1="47" x2="292" y2="47"
              stroke="#e7eee5" strokeDasharray="3 4" />

            {coords.length > 1 && (
              <path
                d={line}
                fill="none"
                stroke="#31945a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {coords.map((p) => (
              <circle
                key={p.point.sale_date}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#25804a"
                stroke="white"
                strokeWidth="2"
              />
            ))}

            <text x="8" y="92" fill="#89958b" fontSize="9">
              {sorted[0].sale_date.slice(5).replace('-', '/')}
            </text>

            <text x="292" y="92" fill="#89958b"
              fontSize="9" textAnchor="end">
              {latest.sale_date.slice(5).replace('-', '/')}
            </text>
          </svg>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#89958b',
            fontSize: 10
          }}>
            <span>Min. {min.toLocaleString('fr-FR')}</span>
            <span>
              {sorted.reduce((sum, p) =>
                sum + Number(p.quantity_sold), 0
              )} carte(s) vendue(s)
            </span>
            <span>Max. {max.toLocaleString('fr-FR')}</span>
          </div>
        </>
      )}
    </div>
  );
}
