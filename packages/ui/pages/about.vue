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
        Volund Data Forge is een <strong>schema-driven data platform</strong>. Definieer je
        datamodel, en Volund bouwt de rest — tabellen, formulieren, koppelingen en meer. Geen code
        nodig.
      </p>
    </section>

    <!-- Features -->
    <section class="about__section">
      <h2 class="about__heading">Features</h2>
      <div class="about__features">
        <FtpCard v-for="feature in features" :key="feature.title">
          <template #title>
            <span>{{ feature.icon }} {{ feature.title }}</span>
          </template>
          <template #content>
            <p class="about__feature-desc">{{ feature.desc }}</p>
          </template>
        </FtpCard>
      </div>
    </section>

    <!-- Technologie -->
    <section class="about__section">
      <h2 class="about__heading">Technologie</h2>
      <div class="about__tags">
        <FtpTag v-for="tech in ['Vue 3', 'Nuxt', 'TypeScript', 'SQLite']" :key="tech" :value="tech" />
      </div>
    </section>

    <!-- Status -->
    <section class="about__section">
      <h2 class="about__heading">Status</h2>
      <p class="about__text">
        <FtpBadge value="Alpha" severity="info" />
        Volund Data Forge is in actieve ontwikkeling. Verwacht veranderingen, verbeteringen en af en
        toe wat ruwe randjes.
      </p>
    </section>

    <!-- Achtergrond -->
    <section class="about__section">
      <h2 class="about__heading">Achtergrond</h2>
      <p class="about__text">
        Vernoemd naar <strong>Völundr</strong>, de legendarische Noorse meestersmid uit de Edda.
        Zoals Völundr meesterlijke artefacten smeedde, zo smeedt dit platform je data tools —
        krachtig, precies en op maat.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
const features = [
  { icon: '🏗️', title: 'Visual Schema Builder', desc: 'Datamodel samenklikken via een visuele interface.' },
  { icon: '📊', title: 'DataTable', desc: 'Automatisch gegenereerde tabellen uit je schema.' },
  { icon: '📝', title: 'DataForm', desc: 'Slimme formulieren die meegroeien met je datamodel.' },
  { icon: '🔗', title: 'Koppelingen', desc: 'Relaties tussen data leggen zonder technische kennis.' },
  { icon: '🔄', title: 'Migraties', desc: 'Schema wijzigingen doorvoeren zonder dataverlies.' },
  { icon: '🎨', title: 'FTP Design System', desc: 'Consistent en mooi, van componenten tot tokens.' },
]
</script>

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
  color: var(--text-heading);
  margin: 0 0 var(--space-xs, 6px);
}

.about__tagline {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin: 0;
}

.about__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.about__heading {
  font-size: 1.25rem;
  color: var(--text-heading);
  margin: 0;
}

.about__text {
  color: var(--text-default);
  line-height: 1.6;
  margin: 0;
}

.about__features {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.about__feature-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.about__tags {
  display: flex;
  gap: var(--space-xs, 6px);
  flex-wrap: wrap;
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .about {
    max-width: 100%;
  }

  .about__title {
    font-size: 1.5rem;
  }

  .about__hero {
    padding: var(--space-m, 16px) 0;
  }
}
</style>
