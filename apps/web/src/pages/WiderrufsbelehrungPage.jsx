import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { ContentPanel, PageShell } from '@/components/PageShell.jsx';
import { useTranslation } from '@/contexts/TranslationContext.jsx';

const WiderrufsbelehrungPage = () => {
  const { language } = useTranslation();

  const copy = useMemo(() => (
    language === 'EN'
      ? {
        eyebrow: 'Legal',
        title: 'Right of withdrawal',
        description: 'This right of withdrawal applies only to official shop purchases. Marketplace purchases between users are excluded.',
        sections: [
          {
            title: 'Official shop purchases only',
            body: [
              'The statutory right of withdrawal applies only to products sold directly through the official Zahnibörse shop.',
              'Ordinary marketplace transactions between users are excluded from this withdrawal policy. Marketplace complaints follow the separate claim workflow and can be reviewed by admin.',
            ],
          },
          {
            title: 'Withdrawal period',
            body: [
              'For eligible shop purchases, the withdrawal period is 14 days from the day on which you, or a third party named by you who is not the carrier, took possession of the goods.',
              'To meet the deadline, it is sufficient to send your withdrawal notice before the period expires.',
            ],
          },
          {
            title: 'How to exercise the withdrawal',
            body: [
              'To exercise your withdrawal right, inform us clearly by email or post. You may also use the return form on this site for shop returns after signing in and selecting the purchased item from your order reference.',
              'Address: Patrick Tchoquessi Wetie, Zahnibörse, Angelika-Machinek Straße 12, 60486 Frankfurt, Germany. Email: info@zahniboerse.com.',
            ],
          },
          {
            title: 'Effects of withdrawal',
            body: [
              'If you withdraw from an eligible shop purchase, we reimburse payments received for that purchase no later than 14 days after we receive your withdrawal notice, subject to the statutory conditions.',
              'We may withhold reimbursement until the goods have been returned or until you provide proof that you sent them back, whichever is earlier.',
            ],
          },
          {
            title: 'Return shipment',
            body: [
              'Returned shop goods must be sent back without undue delay and no later than 14 days after you informed us about the withdrawal.',
              'Unless stated otherwise, the direct return costs are borne by the customer. Items excluded from withdrawal are handled only through the applicable claim or support workflow.',
            ],
          },
        ],
        updatedAt: 'Updated: April 2026',
      }
      : {
        eyebrow: 'Rechtliches',
        title: 'Widerrufsbelehrung',
        description: 'Dieses Widerrufsrecht gilt nur für offizielle Shop-Käufe. Marktplatzkäufe zwischen Nutzern sind ausgeschlossen.',
        sections: [
          {
            title: 'Nur für offizielle Shop-Käufe',
            body: [
              'Das gesetzliche Widerrufsrecht gilt nur für Produkte, die direkt über den offiziellen Zahnibörse-Shop verkauft werden.',
              'Normale Marktplatzgeschäfte zwischen Nutzern sind von dieser Widerrufsbelehrung ausgeschlossen. Für Marktplatzfälle gilt der separate Reklamationsprozess mit möglicher Admin-Prüfung.',
            ],
          },
          {
            title: 'Widerrufsfrist',
            body: [
              'Für berechtigte Shop-Käufe beträgt die Widerrufsfrist 14 Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Ware in Besitz genommen hast.',
              'Zur Wahrung der Frist reicht es aus, wenn du die Widerrufserklärung vor Ablauf der Frist absendest.',
            ],
          },
          {
            title: 'Ausübung des Widerrufs',
            body: [
              'Um dein Widerrufsrecht auszuüben, informiere uns eindeutig per E-Mail oder Post. Nach dem Login kannst du für Shop-Retouren auch das Retourenformular auf dieser Seite nutzen und den gekauften Artikel über deine Bestellreferenz auswählen.',
              'Adresse: Patrick Tchoquessi Wetie, Zahnibörse, Angelika-Machinek Straße 12, 60486 Frankfurt. E-Mail: info@zahniboerse.com.',
            ],
          },
          {
            title: 'Folgen des Widerrufs',
            body: [
              'Wenn du einen berechtigten Shop-Kauf widerrufst, erstatten wir die dafür erhaltenen Zahlungen spätestens binnen 14 Tagen nach Eingang deiner Widerrufserklärung, vorbehaltlich der gesetzlichen Voraussetzungen.',
              'Wir können die Erstattung verweigern, bis die Ware zurückerhalten wurde oder bis du den Nachweis erbracht hast, dass du die Ware abgesendet hast.',
            ],
          },
          {
            title: 'Rücksendung',
            body: [
              'Retouren aus dem Shop müssen unverzüglich und spätestens binnen 14 Tagen nach deiner Widerrufserklärung abgesendet werden.',
              'Soweit nicht anders angegeben, trägst du die unmittelbaren Kosten der Rücksendung. Ausgeschlossene Artikel werden ausschließlich über den jeweiligen Reklamations- oder Supportprozess behandelt.',
            ],
          },
        ],
        updatedAt: 'Stand: April 2026',
      }
  ), [language]);

  return (
    <>
      <Helmet>
        <title>{copy.title} - Zahnibörse</title>
      </Helmet>
      <PageShell
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        maxWidth="max-w-4xl"
      >
        <ContentPanel>
          <div className="space-y-6 text-[hsl(var(--foreground))] leading-relaxed">
            {copy.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
                <div className="space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <div className="pt-8 mt-8 border-t border-[hsl(var(--border))] text-sm text-[hsl(var(--secondary-text))]">
              {copy.updatedAt}
            </div>
          </div>
        </ContentPanel>
      </PageShell>
    </>
  );
};

export default WiderrufsbelehrungPage;
