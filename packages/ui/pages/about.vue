<template>
  <div class="about">
    <!-- Hero -->
    <section class="about__hero">
      <h1 class="about__title">⚒️ Volund Data Forge</h1>
      <p class="about__tagline">Smeed je eigen data tools</p>
    </section>

    <!-- Wat is het -->
    <section class="about__section">
      <h2 class="about__heading">Wat is Volund?</h2>
      <p class="about__text">
        Volund Data Forge is een <strong>schema-driven data platform</strong>.
        Definieer je datamodel, en Volund bouwt de rest — tabellen, formulieren,
        koppelingen en meer. Geen code nodig.
      </p>
    </section>

    <!-- Features -->
    <section class="about__section">
      <h2 class="about__heading">Features</h2>
      <div class="about__features">
        <div class="about__feature">
          <span class="about__feature-icon">🏗️</span>
          <div>
            <strong>Visual Schema Builder</strong>
            <p>Datamodel samenklikken via een visuele interface.</p>
          </div>
        </div>
        <div class="about__feature">
          <span class="about__feature-icon">📊</span>
          <div>
            <strong>DataTable</strong>
            <p>Automatisch gegenereerde tabellen uit je schema.</p>
          </div>
        </div>
        <div class="about__feature">
          <span class="about__feature-icon">📝</span>
          <div>
            <strong>DataForm</strong>
            <p>Slimme formulieren die meegroeien met je datamodel.</p>
          </div>
        </div>
        <div class="about__feature">
          <span class="about__feature-icon">🔗</span>
          <div>
            <strong>Koppelingen</strong>
            <p>Relaties tussen data leggen zonder technische kennis.</p>
          </div>
        </div>
        <div class="about__feature">
          <span class="about__feature-icon">🔄</span>
          <div>
            <strong>Migraties</strong>
            <p>Schema wijzigingen doorvoeren zonder dataverlies.</p>
          </div>
        </div>
        <div class="about__feature">
          <span class="about__feature-icon">🎨</span>
          <div>
            <strong>FTP Design System</strong>
            <p>Consistent en mooi, van componenten tot tokens.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Technologie -->
    <section class="about__section">
      <h2 class="about__heading">Technologie</h2>
      <div class="about__tags">
        <span class="about__tag">Vue 3</span>
        <span class="about__tag">Nuxt</span>
        <span class="about__tag">TypeScript</span>
        <span class="about__tag">SQLite</span>
      </div>
    </section>

    <!-- Status -->
    <section class="about__section">
      <h2 class="about__heading">Status</h2>
      <p class="about__text">
        <span class="about__badge">Alpha</span>
        Volund Data Forge is in actieve ontwikkeling. Verwacht veranderingen,
        verbeteringen en af en toe wat ruwe randjes.
      </p>
    </section>

    <!-- Achtergrond -->
    <section class="about__section">
      <h2 class="about__heading">Achtergrond</h2>
      <p class="about__text">
        Vernoemd naar <strong>Völundr</strong>, de legendarische Noorse meestersmid
        uit de Edda. Zoals Völundr meesterlijke artefacten smeedde, zo smeedt
        dit platform je data tools — krachtig, precies en op maat.
      </p>
    </section>
  </div>
</template>

<style scoped>
.about {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl, 36px);
}

.about__hero {
  text-align: center;
  padding: var(--space-xl, 36px) 0;
  border-bottom: 1px solid var(--border-subtle, #1a2244);
}

.about__title {
  font-size: 2rem;
  color: var(--text-heading, #fff);
  margin: 0 0 var(--space-xs, 6px);
}

.about__tagline {
  font-size: 1.125rem;
  color: var(--text-secondary, #9ea5c2);
  margin: 0;
}

.about__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.about__heading {
  font-size: 1.25rem;
  color: var(--text-heading, #fff);
  margin: 0;
}

.about__text {
  color: var(--text-default, #c5cbdf);
  line-height: 1.6;
  margin: 0;
}

.about__features {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.about__feature {
  display: flex;
  gap: var(--space-s, 10px);
  padding: var(--space-s, 10px) var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border-radius: var(--radius-default, 5px);
  border: 1px solid var(--border-subtle, #1a2244);
}

.about__feature-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.about__feature p {
  margin: var(--space-3xs, 2px) 0 0;
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.875rem;
}

.about__feature strong {
  color: var(--text-heading, #fff);
}

.about__tags {
  display: flex;
  gap: var(--space-xs, 6px);
  flex-wrap: wrap;
}

.about__tag {
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8125rem;
}

.about__badge {
  display: inline-block;
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--accent-primary, #4f6df5);
  border-radius: var(--radius-default, 5px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-right: var(--space-xs, 6px);
}
</style>
