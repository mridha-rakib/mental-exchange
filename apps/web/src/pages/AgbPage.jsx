import React from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';

const AgbPage = () => {
  return (
    <>
      <Helmet>
        <title>AGB & Nutzungsbedingungen - Zahnibörse</title>
      </Helmet>
      <PageShell
        eyebrow="Rechtliches"
        title="AGB & Nutzungsbedingungen"
        description="Nutzungsbedingungen für den Marktplatz und Verkaufsbedingungen für den offiziellen Store."
        maxWidth="max-w-5xl"
      >
        <ContentPanel>
            <Tabs defaultValue="teil-a" className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 mb-8 h-auto">
                <TabsTrigger value="teil-a" className="py-3 text-sm md:text-base whitespace-normal h-auto">TEIL A: Nutzungsbedingungen Marketplace</TabsTrigger>
                <TabsTrigger value="teil-b" className="py-3 text-sm md:text-base whitespace-normal h-auto">TEIL B: Verkaufsbedingungen Store</TabsTrigger>
              </TabsList>
              
              <TabsContent value="teil-a" className="space-y-6 text-[hsl(var(--foreground))] leading-relaxed">
                <h2 className="text-2xl font-semibold mb-4 font-['Playfair_Display']">TEIL A: Nutzungsbedingungen Marketplace</h2>
                
                <section>
                  <h3 className="font-semibold text-lg">§1 Geltungsbereich</h3>
                  <p className="text-sm md:text-base mt-1">Diese Nutzungsbedingungen gelten für die Nutzung des Marktplatzes der Zahnibörse, auf dem registrierte Nutzer zahnmedizinische Instrumente und Materialien kaufen und verkaufen können.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§2 Leistungsbeschreibung</h3>
                  <p className="text-sm md:text-base mt-1">Zahnibörse stellt lediglich die Plattform zur Verfügung. Verträge kommen ausschließlich zwischen den Nutzern (Käufer und Verkäufer) zustande.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§3 Registrierung und Nutzerkonto</h3>
                  <p className="text-sm md:text-base mt-1">Die Nutzung erfordert eine Registrierung. Nutzer müssen wahrheitsgemäße Angaben machen und ihre Zugangsdaten geheim halten.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§4 Zulässige Angebote</h3>
                  <p className="text-sm md:text-base mt-1">Es dürfen nur zahnmedizinische Instrumente, Materialien und Fachliteratur angeboten werden, die sich im rechtmäßigen Eigentum des Verkäufers befinden.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§5 Verbotene Angebote und Nutzung</h3>
                  <p className="text-sm md:text-base mt-1">Verboten sind verschreibungspflichtige Medikamente, Gefahrstoffe, defekte Instrumente ohne ausdrücklichen Hinweis sowie illegale oder urheberrechtsverletzende Artikel.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§6 Verantwortung der Verkäufer</h3>
                  <p className="text-sm md:text-base mt-1">Verkäufer sind für die Richtigkeit ihrer Angaben, die Einhaltung gesetzlicher Vorschriften und die ordnungsgemäße Abwicklung verantwortlich.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§7 Vertragsschluss im Marketplace</h3>
                  <p className="text-sm md:text-base mt-1">Das Einstellen eines Artikels stellt ein verbindliches Angebot dar. Der Vertrag kommt durch die Annahme (Kauf) durch einen anderen Nutzer zustande.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§8 Preise, Gebühren und Zahlungsabwicklung</h3>
                  <p className="text-sm md:text-base mt-1">Die Nutzung für Käufer ist kostenfrei. Für Verkäufer können Gebühren anfallen, die vor dem Einstellen angezeigt werden. Die Zahlungsabwicklung erfolgt über integrierte Zahlungsdienstleister.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§9 Versand und Lieferung</h3>
                  <p className="text-sm md:text-base mt-1">Der Verkäufer ist verpflichtet, den Artikel nach Zahlungseingang unverzüglich und sicher verpackt an den Käufer zu versenden.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§10 Rückgaben und Konfliktfälle</h3>
                  <p className="text-sm md:text-base mt-1">Bei privaten Verkäufen besteht grundsätzlich kein Widerrufsrecht, es sei denn, der Artikel weicht erheblich von der Beschreibung ab. Zahnibörse bietet eine Schlichtungsfunktion an.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§11 Bewertungen und Nutzerinhalte</h3>
                  <p className="text-sm md:text-base mt-1">Nutzer können sich gegenseitig bewerten. Bewertungen müssen sachlich und wahrheitsgemäß sein.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§12 Sperrung und Löschung</h3>
                  <p className="text-sm md:text-base mt-1">Zahnibörse behält sich das Recht vor, bei Verstößen gegen diese Bedingungen Nutzerkonten temporär oder dauerhaft zu sperren.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§13 Haftung</h3>
                  <p className="text-sm md:text-base mt-1">Zahnibörse haftet nicht für die Beschaffenheit der gehandelten Artikel oder das Verhalten der Nutzer. Die Haftung für Vorsatz und grobe Fahrlässigkeit bleibt unberührt.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§14 Anwendbares Recht</h3>
                  <p className="text-sm md:text-base mt-1">Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</p>
                </section>
              </TabsContent>
              
              <TabsContent value="teil-b" className="space-y-6 text-[hsl(var(--foreground))] leading-relaxed">
                <h2 className="text-2xl font-semibold mb-4 font-['Playfair_Display']">TEIL B: Verkaufsbedingungen Store</h2>
                
                <section>
                  <h3 className="font-semibold text-lg">§1 Geltungsbereich</h3>
                  <p className="text-sm md:text-base mt-1">Diese Bedingungen gelten für alle Käufe, die direkt im offiziellen Zahnibörse Store getätigt werden.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§2 Angebot und Vertragsschluss</h3>
                  <p className="text-sm md:text-base mt-1">Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, sondern einen unverbindlichen Online-Katalog dar. Durch Anklicken des Bestellbuttons geben Sie eine verbindliche Bestellung ab.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§3 Produkte und Zustandsangaben</h3>
                  <p className="text-sm md:text-base mt-1">Wir bieten sowohl Neuware als auch geprüfte Gebrauchtware an. Der jeweilige Zustand ist in der Artikelbeschreibung eindeutig gekennzeichnet.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§4 Preise und Versandkosten</h3>
                  <p className="text-sm md:text-base mt-1">Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. Zusätzlich anfallende Versandkosten werden im Bestellvorgang deutlich ausgewiesen.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§5 Zahlungsbedingungen</h3>
                  <p className="text-sm md:text-base mt-1">Die Zahlung erfolgt wahlweise per Kreditkarte, PayPal oder anderen im Bestellvorgang angebotenen Zahlungsmitteln.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§6 Lieferung</h3>
                  <p className="text-sm md:text-base mt-1">Die Lieferung erfolgt an die vom Kunden angegebene Lieferadresse. Die Lieferzeit beträgt in der Regel 2-4 Werktage innerhalb Deutschlands.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§7 Eigentumsvorbehalt</h3>
                  <p className="text-sm md:text-base mt-1">Die gelieferte Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§8 Widerrufsrecht</h3>
                  <p className="text-sm md:text-base mt-1">Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Details hierzu finden Sie in unserer separaten Widerrufsbelehrung.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§9 Gewährleistung</h3>
                  <p className="text-sm md:text-base mt-1">Es gelten die gesetzlichen Gewährleistungsrechte. Bei Gebrauchtwaren ist die Gewährleistungsfrist auf ein Jahr beschränkt.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§10 Haftung</h3>
                  <p className="text-sm md:text-base mt-1">Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Für einfache Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-lg">§11 Anwendbares Recht</h3>
                  <p className="text-sm md:text-base mt-1">Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.</p>
                </section>
              </TabsContent>
            </Tabs>

            <div className="pt-8 mt-8 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--secondary-text))]">
              Stand: März 2026
            </div>
        </ContentPanel>
      </PageShell>
    </>
  );
};

export default AgbPage;
