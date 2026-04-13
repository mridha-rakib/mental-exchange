import React from 'react';
import { Helmet } from 'react-helmet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';

const DatenschutzPage = () => {
  const sections = [
    { title: "1. Verantwortlicher", content: "Verantwortlich für die Datenverarbeitung auf dieser Website ist: Patrick Tchoquessi Wetie, Zahnibörse, Angelika-Machinek Straße 12, 60486 Frankfurt. E-Mail: info@zahniboerse.com." },
    { title: "2. Allgemeine Hinweise", content: "Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung." },
    { title: "3. Arten der verarbeiteten Daten", content: "Wir verarbeiten Bestandsdaten (z.B. Namen, Adressen), Kontaktdaten (z.B. E-Mail, Telefonnummern), Inhaltsdaten (z.B. Texteingaben, Fotografien), Nutzungsdaten (z.B. besuchte Webseiten, Interesse an Inhalten, Zugriffszeiten) und Meta-/Kommunikationsdaten (z.B. Geräte-Informationen, IP-Adressen)." },
    { title: "4. Zwecke und Rechtsgrundlagen", content: "Die Verarbeitung erfolgt zur Zurverfügungstellung des Onlineangebotes, Beantwortung von Kontaktanfragen, Erbringung vertraglicher Leistungen, Kundenservice und Marketing. Rechtsgrundlagen sind Art. 6 Abs. 1 lit. a, b, c und f DSGVO." },
    { title: "5. Hosting (Hostinger)", content: "Wir hosten unsere Website bei Hostinger. Der Anbieter ist Hostinger International Ltd. Die Nutzung von Hostinger erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung unserer Website." },
    { title: "6. Registrierung und Nutzerkonto", content: "Nutzer können ein Nutzerkonto anlegen. Im Rahmen der Registrierung werden die erforderlichen Pflichtangaben mitgeteilt. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO." },
    { title: "7. Käufe, Verkäufe und Vertragsabwicklung", content: "Wir verarbeiten die Daten unserer Kunden im Rahmen der Bestellvorgänge in unserem Onlineshop, um ihnen die Auswahl und die Bestellung der gewählten Produkte und Leistungen, sowie deren Bezahlung und Zustellung, bzw. Ausführung zu ermöglichen." },
    { title: "8. Zahlungsabwicklung (Stripe, PayPal, Überweisung)", content: "Wir setzen externe Zahlungsdienstleister ein, über deren Plattformen die Nutzer und wir Zahlungstransaktionen vornehmen können. Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)." },
    { title: "9. Kontaktaufnahme", content: "Bei der Kontaktaufnahme mit uns (z.B. per Kontaktformular, E-Mail, Telefon) werden die Angaben des Nutzers zur Bearbeitung der Kontaktanfrage und deren Abwicklung gem. Art. 6 Abs. 1 lit. b. DSGVO verarbeitet." },
    { title: "10. Newsletter", content: "Mit den nachfolgenden Hinweisen klären wir Sie über die Inhalte unseres Newsletters sowie das Anmelde-, Versand- und das statistische Auswertungsverfahren sowie Ihre Widerspruchsrechte auf." },
    { title: "11. Cookies und Consent-Management", content: "Unsere Website verwendet Cookies. Das sind kleine Textdateien, die Ihr Webbrowser auf Ihrem Endgerät speichert. Cookies helfen uns dabei, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen." },
    { title: "12. Social-Media-Verlinkungen", content: "Wir unterhalten Onlinepräsenzen innerhalb sozialer Netzwerke und Plattformen, um mit den dort aktiven Kunden, Interessenten und Nutzern kommunizieren und sie dort über unsere Leistungen informieren zu können." },
    { title: "13. Empfänger personenbezogener Daten", content: "Sofern wir im Rahmen unserer Verarbeitung Daten gegenüber anderen Personen und Unternehmen (Auftragsverarbeitern oder Dritten) offenbaren, sie an diese übermitteln oder ihnen sonst Zugriff auf die Daten gewähren, erfolgt dies nur auf Grundlage einer gesetzlichen Erlaubnis." },
    { title: "14. Speicherdauer", content: "Die von uns verarbeiteten Daten werden nach Maßgabe der gesetzlichen Vorgaben gelöscht oder in ihrer Verarbeitung eingeschränkt. Sofern nicht im Rahmen dieser Datenschutzerklärung ausdrücklich angegeben, werden die bei uns gespeicherten Daten gelöscht, sobald sie für ihre Zweckbestimmung nicht mehr erforderlich sind." },
    { title: "15. Rechte betroffener Personen", content: "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerruf erteilter Einwilligungen sowie Widerspruch gegen die Verarbeitung Ihrer Daten." },
    { title: "16. Datensicherheit", content: "Wir treffen nach Maßgabe des Art. 32 DSGVO unter Berücksichtigung des Stands der Technik, der Implementierungskosten und der Art, des Umfangs, der Umstände und der Zwecke der Verarbeitung geeignete technische und organisatorische Maßnahmen." },
    { title: "17. Keine automatisierte Entscheidungsfindung", content: "Wir verzichten auf eine automatische Entscheidungsfindung oder ein Profiling." },
    { title: "18. Änderungen dieser Datenschutzerklärung", content: "Wir behalten uns vor, die Datenschutzerklärung anzupassen, um sie an geänderte Rechtslagen, oder bei Änderungen des Dienstes sowie der Datenverarbeitung anzupassen." }
  ];

  return (
    <>
      <Helmet>
        <title>Datenschutzerklärung - Zahnibörse</title>
      </Helmet>
      <PageShell
        eyebrow="Rechtliches"
        title="Datenschutzerklärung"
        description="Informationen zur Verarbeitung personenbezogener Daten auf Zahnibörse."
        maxWidth="max-w-4xl"
      >
        <ContentPanel>
            <Accordion type="single" collapsible className="w-full">
              {sections.map((section, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-semibold text-base md:text-lg hover:text-[#0000FF]">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-[hsl(var(--foreground))] leading-relaxed text-sm md:text-base">
                    {section.content}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="pt-8 mt-8 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--secondary-text))]">
              Stand: März 2026
            </div>
        </ContentPanel>
      </PageShell>
    </>
  );
};

export default DatenschutzPage;
