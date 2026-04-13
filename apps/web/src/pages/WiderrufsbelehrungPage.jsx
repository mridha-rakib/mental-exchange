import React from 'react';
import { Helmet } from 'react-helmet';
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';

const WiderrufsbelehrungPage = () => {
  return (
    <>
      <Helmet>
        <title>Widerrufsbelehrung - Zahnibörse</title>
      </Helmet>
      <PageShell
        eyebrow="Rechtliches"
        title="Widerrufsbelehrung"
        description="Informationen zum gesetzlichen Widerrufsrecht für Store-Käufe."
        maxWidth="max-w-4xl"
      >
        <ContentPanel>
            <div className="space-y-6 text-[hsl(var(--foreground))] leading-relaxed">
              <section>
                <h2 className="text-xl font-semibold mb-2">Widerrufsrecht (14 Tage)</h2>
                <p>
                  Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. 
                  Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, 
                  der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Ausübung des Widerrufsrechts</h2>
                <p>
                  Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Patrick Tchoquessi Wetie, Zahnibörse, Angelika-Machinek Straße 12, 60486 Frankfurt, E-Mail: info@zahniboerse.com, Tel: +49 1522 3496241) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
                </p>
                <p className="mt-2">
                  Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Folgen des Widerrufs</h2>
                <p>
                  Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
                </p>
                <p className="mt-2">
                  Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Rücksendung</h2>
                <p>
                  Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.
                </p>
                <p className="mt-2">
                  Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
                </p>
                <p className="mt-2">
                  Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.
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

export default WiderrufsbelehrungPage;
