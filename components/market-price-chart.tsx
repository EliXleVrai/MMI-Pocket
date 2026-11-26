
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
  const first = sorted[0];

  const values = sorted.map((p) => Number(p.average_price));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const currentPrice = latest ? Number(latest.average_price) : 0;
  const firstPrice = first ? Number(first.average_price) : 0;

  const evolution =
    firstPrice > 0
      ? ((currentPrice - firstPrice) / firstPrice) * 100
      : 0;

  const totalSales = sorted.reduce(
    (sum, p) => sum + Number(p.sales_count),
    0
  );

  const totalQuantity = sorted.reduce(
    (sum, p) => sum + Number(p.quantity_sold),
    0
  );

  const coords = sorted.map((point, index) => ({
    x: sorted.length === 1 ? 150 : 8 + (index / (sorted.length - 1)) * 284,
    y: 76 - ((Number(point.average_price) - min) / Math.max(max - min, 1)) * 58,
    point,
  }));

  const line = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const formatPrice = (value: number) =>
    value.toLocaleString('fr-FR');

  return (
    <div style={{
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      background: '#f7faf6',
      border: '1px solid #e5eee3',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}>
        <strong style={{ color: '#355640', fontSize: 13 }}>
          📊 Fiche de marché
        </strong>

        <span style={{
          fontSize: 10,
          color: '#89958b',
          background: '#eaf1e8',
          padding: '4px 8px',
          borderRadius: 20,
        }}>
          7 derniers jours
        </span>
      </div>

      {sorted.length === 0 ? (
        <p style={{
          color: '#89958b',
          fontSize: 12,
          textAlign: 'center',
          padding: 12,
        }}>
          Pas encore de vente enregistrée pour cette carte.
        </p>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}>
            <div style={{
              background: 'white',
              border: '1px solid #e5eee3',
              borderRadius: 10,
              padding: 10,
            }}>
              <span style={{ color: '#89958b', fontSize: 10 }}>
                Cours actuel
              </span>
              <div style={{
                color: '#355640',
                fontWeight: 800,
                fontSize: 17,
                marginTop: 3,
              }}>
                {formatPrice(currentPrice)}
                <span style={{ fontSize: 10, fontWeight: 500 }}> pièces</span>
              </div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e5eee3',
              borderRadius: 10,
              padding: 10,
            }}>
              <span style={{ color: '#89958b', fontSize: 10 }}>
                Évolution
              </span>
              <div style={{
                color: evolution > 0 ? '#25804a' : evolution < 0 ? '#c34b4b' : '#89958b',
                fontWeight: 800,
                fontSize: 17,
                marginTop: 3,
              }}>
                {evolution > 0 ? '+' : ''}{evolution.toFixed(1).replace('.', ',')} %
              </div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e5eee3',
              borderRadius: 10,
              padding: 10,
            }}>
              <span style={{ color: '#89958b', fontSize: 10 }}>
                Transactions
              </span>
              <div style={{
                color: '#355640',
                fontWeight: 800,
                fontSize: 17,
                marginTop: 3,
              }}>
                {totalSales}
              </div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e5eee3',
              borderRadius: 10,
              padding: 10,
            }}>
              <span style={{ color: '#89958b', fontSize: 10 }}>
                Cartes vendues
              </span>
              <div style={{
                color: '#355640',
                fontWeight: 800,
                fontSize: 17,
                marginTop: 3,
              }}>
                {totalQuantity}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 5,
          }}>
            <strong style={{ color: '#355640', fontSize: 11 }}>
              Historique des cours
            </strong>
            <span style={{ color: '#89958b', fontSize: 10 }}>
              Prix moyen journalier
            </span>
          </div>

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
              {first.sale_date.slice(5).replace('-', '/')}
            </text>

            <text x="292" y="92" fill="#89958b"
              fontSize="9" textAnchor="end">
              {latest.sale_date.slice(5).replace('-', '/')}
            </text>
          </svg>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 6,
            paddingTop: 10,
            borderTop: '1px solid #e5eee3',
            color: '#89958b',
            fontSize: 10,
          }}>
            <span>
              Min. <strong style={{ color: '#355640' }}>
                {formatPrice(min)}
              </strong>
            </span>
            <span>
              Max. <strong style={{ color: '#355640' }}>
                {formatPrice(max)}
              </strong>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
