
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Layers, Sparkles, Package, ArrowRight } from 'lucide-react';

type Extension = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
};

export default async function ExtensionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  
  const [
    { data: profile },
    { data: extensionRows, error: extensionsError },
    { data: cardRows, error: cardsError },
    { data: ownedRows, error: ownedError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single(),

    supabase
      .from('extensions')
      .select('id, name, slug, description, cover_url')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),

    supabase
      .from('cards')
      .select('id, extension_id')
      .eq('is_active', true),

    supabase
      .from('player_cards')
      .select('card_id, quantity')
      .eq('user_id', user.id)
      .gt('quantity', 0),
  ]);

  if (!profile?.username) redirect('/choisir-pseudo');

  if (extensionsError) {
    console.error('Erreur extensions :', extensionsError);
  }

  if (cardsError) {
    console.error('Erreur cartes :', cardsError);
  }

  if (ownedError) {
    console.error('Erreur collection :', ownedError);
  }

  const extensions = (extensionRows ?? []) as Extension[];
  const cards = cardRows ?? [];
  const ownedCards = new Set(
    (ownedRows ?? []).map((card) => card.card_id)
  );

  const extensionStats = extensions.map((extension) => {
    const extensionCards = cards.filter(
      (card) => card.extension_id === extension.id
    );

    const ownedCount = extensionCards.filter(
      (card) => ownedCards.has(card.id)
    ).length;

    const totalCount = extensionCards.length;

    const percentage =
      totalCount > 0
        ? Math.round((ownedCount / totalCount) * 100)
        : 0;

    return {
      ...extension,
      totalCount,
      ownedCount,
      percentage,
    };
  });

  const totalCards = extensionStats.reduce(
    (sum, extension) => sum + extension.totalCount,
    0
  );

  const totalOwned = extensionStats.reduce(
    (sum, extension) => sum + extension.ownedCount,
    0
  );

  const completedExtensions = extensionStats.filter(
    (extension) =>
      extension.totalCount > 0 &&
      extension.ownedCount === extension.totalCount
  ).length;

  const globalPercentage =
    totalCards > 0
      ? Math.round((totalOwned / totalCards) * 100)
      : 0;

  return (
    <main className="page-container extensions-page">
      <header className="extensions-header">
        <div>
          <span className="extensions-eyebrow">
            <Sparkles size={14} /> MMI POCKET
          </span>

          <h1>Les extensions</h1>

          <p className="page-description">
            Découvre toutes les séries de cartes disponibles et complète
            chaque extension pour devenir un collectionneur exceptionnel.
          </p>
        </div>

        <div className="extensions-header-icon">
          <Package size={35} />
        </div>
      </header>

      <section className="extensions-overview">
        <div className="extensions-overview-item">
          <span>Extensions disponibles</span>
          <strong>{extensions.length}</strong>
        </div>

        <div className="extensions-overview-item">
          <span>Cartes découvertes</span>
          <strong>{totalOwned} / {totalCards}</strong>
        </div>

        <div className="extensions-overview-item">
          <span>Extensions terminées</span>
          <strong>
            {completedExtensions} / {extensions.length}
          </strong>
        </div>

        <div className="extensions-overview-progress">
          <div className="extensions-overview-progress-top">
            <span>Progression générale</span>
            <strong>{globalPercentage}%</strong>
          </div>

          <div className="extensions-progress-track">
            <div
              className={`extensions-progress-fill ${
                totalCards > 0 && globalPercentage === 100
                  ? 'progress-fill-completed'
                  : ''
              }`}
              style={{ width: `${globalPercentage}%` }}
            />
          </div>
        </div>
      </section>

      <div className="extensions-section-title">
        <div>
          <span>TON ALBUM</span>
          <h2>Les séries disponibles</h2>
        </div>

        <span className="extensions-count">
          {extensions.length} série(s)
        </span>
      </div>

      {extensionsError || cardsError || ownedError ? (
        <section className="extensions-empty">
          <Package size={32} />
          <h2>Impossible de charger les extensions</h2>
          <p>Une erreur est survenue pendant le chargement des données.</p>
        </section>
      ) : extensions.length === 0 ? (
        <section className="extensions-empty">
          <Package size={32} />
          <h2>Aucune extension disponible</h2>
          <p>Les prochaines séries de cartes arriveront bientôt !</p>
        </section>
      ) : (
        <section className="extensions-grid">
          {extensionStats.map((extension, index) => (
            <article
              className={`extension-card ${
                extension.totalCount > 0 &&
                extension.percentage === 100
                  ? 'extension-card-completed'
                  : ''
              }`}
              key={extension.id}
            >
              <div className="extension-cover">
                {extension.cover_url ? (
                  <img
                    src={extension.cover_url}
                    alt={extension.name}
                  />
                ) : (
                  <div className="extension-cover-placeholder">
                    <Layers size={48} />
                    <span>MMI POCKET</span>
                  </div>
                )}

                <span className="extension-number">
                  SÉRIE {String(index + 1).padStart(2, '0')}
                </span>

                {extension.totalCount > 0 &&
                  extension.percentage === 100 && (
                    <span className="extension-complete">
                      <Sparkles size={13} /> TERMINÉE
                    </span>
                  )}
              </div>

              <div className="extension-card-content">
                <h3>{extension.name}</h3>

                <p className="extension-description">
                  {extension.description ||
                    'Découvre les cartes de cette extension.'}
                </p>

                <div className="extension-card-stats">
                  <div>
                    <strong>{extension.ownedCount}</strong>
                    <span>Possédées</span>
                  </div>

                  <div>
                    <strong>{extension.totalCount}</strong>
                    <span>Cartes au total</span>
                  </div>

                  <div>
                    <strong>{extension.percentage}%</strong>
                    <span>Complétée</span>
                  </div>
                </div>

                <div className="extension-progress-track">
                  <div
                    className={`extension-progress-fill ${
                      extension.totalCount > 0 && extension.percentage === 100
                        ? 'progress-fill-completed'
                        : ''
                    }`}
                    style={{
                      width: `${extension.percentage}%`,
                    }}
                  />
                </div>

                <Link
                  href="/collection"
                  className="extension-collection-link"
                >
                  Voir ma collection
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
