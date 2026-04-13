import React from 'react';
import { Helmet } from 'react-helmet';
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';

const ImpressumPage = () => {
  return (
    <>
      <Helmet>
        <title>Impressum - Zahnibörse</title>
      </Helmet>
      <PageShell eyebrow="Rechtliches" title="Impressum" maxWidth="max-w-3xl">
        <ContentPanel>
            <div className="space-y-6 text-[hsl(var(--foreground))] leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold mb-2">Anbieter:</h2>
                <p>
                  Patrick Tchoquessi Wetie<br />
                  Zahnibörse<br />
                  Angelika-Machinek Straße 12<br />
                  60486 Frankfurt
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Kontakt:</h2>
                <p>
                  E-Mail: <a href="mailto:info@zahniboerse.com" className="text-[#0000FF] hover:underline">info@zahniboerse.com</a><br />
                  Tel: +49 1522 3496241
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Verantwortlich für den Inhalt:</h2>
                <p>Patrick Tchoquessi Wetie</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">EU-Streitschlichtung:</h2>
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <br />
                  <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#0000FF] hover:underline">
                    https://ec.europa.eu/consumers/odr
                  </a>
                </p>
              </section>

              <section>
                <p>
                  Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </section>

              <div className="pt-8 mt-8 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--secondary-text))]">
                Stand: März 2026
              </div>
            </div>
        </ContentPanel>
      </PageShell>
    </>
  );
};

export default ImpressumPage;
