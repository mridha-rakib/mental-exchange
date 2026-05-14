/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const moduleCollection = app.findCollectionByNameOrId("learning_modules");
  const lessonCollection = app.findCollectionByNameOrId("learning_lessons");

  const packageImports = [
    {
      packageSlug: "z3-start",
      modulePrefix: "z3-start",
      modules: [
        {
          slug: "road-to-z3-orientation",
          title: "Road-to-Z3 Orientierung",
          description: "Einstieg in die Z3 Vorbereitung mit Lernlogik, Inhaltsstruktur und einem klaren ersten Lernblock.",
          position: 10,
          isPreview: true,
          lessons: [
            {
              slug: "start-here",
              title: "So startest du mit Road-to-Z3",
              description: "Der erste Lernschritt erklärt, wie du die Themen öffnest, Lektionen durcharbeitest und Wiederholungen vorbereitest.",
              position: 10,
              isPreview: true,
              estimatedMinutes: 12,
              textContent: [
                "Road-to-Z3 ist als webbasierter Lernpfad aufgebaut. Du arbeitest nicht mit einer losen PDF-Sammlung, sondern mit klaren Lernseiten, die du direkt aus dem E-Learning Bereich öffnen kannst.",
                "Starte mit dem ersten Thema, markiere offene Begriffe in deinen eigenen Notizen und schließe eine Lektion erst ab, wenn du die Kernaussagen ohne Unterbrechung erklären kannst.",
                "Die Lernseiten sind bewusst kompakt gehalten: Orientierung, Kernpunkte, Wiederholung und ein nächster Schritt. Dadurch bleibt der Fortschritt sichtbar und du kannst später gezielt zurückspringen.",
              ],
            },
            {
              slug: "study-system",
              title: "Dein Lernsystem einrichten",
              description: "Ein kurzer Ablauf für selbstständiges Lernen mit festen Themenblöcken, Wiederholung und sauberer Navigation.",
              position: 20,
              estimatedMinutes: 15,
              textContent: [
                "Plane pro Lernblock ein konkretes Thema, ein Subtopic und eine kurze Wiederholung ein. Öffne die Lernseite direkt, arbeite die Kernpunkte durch und notiere nur die Punkte, die du wirklich nacharbeiten musst.",
                "Nach jedem Block entscheidest du, ob das Thema offen, gestartet, abgeschlossen oder zur Wiederholung vorgemerkt ist. Diese Statuslogik wird später für die Lernplanung genutzt.",
                "Wichtig ist ein stabiler Rhythmus: wenige Themen sauber bearbeiten, statt viele Seiten nur oberflächlich zu lesen.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-fachgebiete",
          title: "Fachgebiete und Themenstruktur",
          description: "Die Road-to-Z3 Inhalte nach Fachgebieten, Topics und Subtopics verstehen und gezielt ansteuern.",
          position: 20,
          lessons: [
            {
              slug: "fachgebiete-sortieren",
              title: "Fachgebiete sortieren",
              description: "Wie du Themen nach Fachbereich öffnest und zusammengehörige Inhalte in der richtigen Reihenfolge lernst.",
              position: 10,
              estimatedMinutes: 18,
              textContent: [
                "Die Road-to-Z3 Module sind nach Fachgebieten aufgebaut. Jedes Fachgebiet bündelt mehrere Topics, die wiederum in kleinere Subtopics aufgeteilt werden.",
                "Lerne zuerst die Basisbegriffe eines Fachgebiets, danach die typischen Verknüpfungen und erst anschließend die kompakten High-Yield Abschnitte.",
                "Wenn du ein Fachgebiet später wiederholst, steigst du direkt beim passenden Topic ein. So bleibt die Navigation kurz und du vermeidest doppelte Sucharbeit.",
              ],
            },
            {
              slug: "subtopics-direkt-nutzen",
              title: "Subtopics gezielt nutzen",
              description: "Subtopics als direkte Lernseiten verwenden, damit einzelne Lücken ohne Umwege nachgearbeitet werden können.",
              position: 20,
              estimatedMinutes: 16,
              textContent: [
                "Ein Subtopic ist die kleinste sinnvolle Lerneinheit im System. Es sollte so konkret sein, dass du es in einem Lernblock öffnen, bearbeiten und bewerten kannst.",
                "Nutze Subtopics für gezielte Nacharbeit: Wenn ein Begriff, Ablauf oder Zusammenhang unklar bleibt, springst du später direkt zu dieser Seite zurück.",
                "Für die nächste Ausbaustufe werden diese Subtopics stabile URLs bekommen, damit interne Links und Suchergebnisse direkt auf den richtigen Inhalt zeigen.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-high-yield",
          title: "High-Yield Wiederholung",
          description: "Kompakte Wiederholungsseiten für wichtige Kernaussagen, Merksätze und priorisierte Nacharbeit.",
          position: 30,
          lessons: [
            {
              slug: "high-yield-marker",
              title: "High-Yield Markierungen lesen",
              description: "So erkennst du besonders wichtige Kernaussagen und trennst sie von Hintergrundwissen.",
              position: 10,
              estimatedMinutes: 14,
              textContent: [
                "High-Yield Markierungen zeigen Inhalte, die du besonders sicher beherrschen solltest. Sie ersetzen nicht das Verstehen des Themas, helfen aber beim Priorisieren.",
                "Lies zuerst den normalen Abschnitt und prüfe danach die markierten Kernaussagen. Wenn eine Markierung ohne Kontext unklar bleibt, gehst du zurück zum Subtopic.",
                "Notiere High-Yield Punkte knapp und wiederholbar. Ein guter Eintrag ist kurz genug für eine schnelle Wiederholung, aber präzise genug, um den Zusammenhang zu behalten.",
              ],
            },
            {
              slug: "wiederholungsfenster",
              title: "Wiederholungsfenster planen",
              description: "Eine einfache Struktur für erste Wiederholung, spätere Festigung und Nacharbeit offener Themen.",
              position: 20,
              estimatedMinutes: 17,
              textContent: [
                "Wiederholung funktioniert am besten, wenn sie geplant, kurz und konkret ist. Lege nach einem Lernblock fest, welche Punkte am nächsten Tag und welche am Ende der Woche erneut geöffnet werden.",
                "Offene Themen bleiben sichtbar, bis du sie sauber nachgearbeitet hast. Ein Thema gilt erst dann als abgeschlossen, wenn du die zentrale Aussage ohne Hilfetext wiedergeben kannst.",
                "Bei längeren Pausen setzt du nicht bei null an. Du prüfst zuerst offene und überfällige Themen und baust daraus den nächsten realistischen Lernblock.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-lernalltag",
          title: "Lernalltag und Nacharbeit",
          description: "Praktische Abläufe für Tagesblöcke, kurze Wiederholung und kontrolliertes Nacharbeiten.",
          position: 40,
          lessons: [
            {
              slug: "tagesblock-vorbereiten",
              title: "Tagesblock vorbereiten",
              description: "Ein Lernblock mit Ziel, direktem Inhaltslink, Wiederholung und sauberem Abschluss.",
              position: 10,
              estimatedMinutes: 13,
              textContent: [
                "Ein Tagesblock braucht ein klares Ziel: welches Topic, welches Subtopic und welche Wiederholung dazugehören. Öffne die passende Lernseite vor dem Start, damit der Block ohne Sucharbeit beginnt.",
                "Arbeite den Inhalt in einer festen Reihenfolge durch: Überblick, Kernpunkte, eigene Kurznotiz und Abschlussbewertung.",
                "Wenn du hängen bleibst, markierst du das Thema als offen und planst es für Nacharbeiten ein. Der Block bleibt dadurch verwertbar, auch wenn nicht alles sofort abgeschlossen ist.",
              ],
            },
            {
              slug: "nacharbeiten-ohne-neustart",
              title: "Nacharbeiten ohne Neustart",
              description: "Wie du verpasste Inhalte kontrolliert aufholst, ohne den gesamten Lernplan zu verlieren.",
              position: 20,
              estimatedMinutes: 15,
              textContent: [
                "Nacharbeiten bedeutet nicht, den gesamten Plan neu zu beginnen. Sammle zuerst offene und überfällige Themen, sortiere sie nach Fachgebiet und bearbeite die wichtigsten Einheiten zuerst.",
                "Halte Nacharbeitsblöcke kleiner als normale Lernblöcke. Ziel ist, eine konkrete Lücke zu schließen und danach wieder in den regulären Rhythmus zurückzukehren.",
                "Wenn mehrere Tage fehlen, reduzierst du neue Inhalte vorübergehend und bringst zuerst die offenen Grundlagen unter Kontrolle.",
              ],
            },
          ],
        },
      ],
    },
    {
      packageSlug: "z3-struktur",
      modulePrefix: "z3-struktur",
      modules: [
        {
          slug: "road-to-z3-orientation",
          title: "Road-to-Z3 Orientierung",
          description: "Einstieg in die Z3 Vorbereitung mit Lernlogik, Inhaltsstruktur und einem klaren ersten Lernblock.",
          position: 10,
          isPreview: true,
          lessons: [
            {
              slug: "start-here",
              title: "So startest du mit Road-to-Z3",
              description: "Der erste Lernschritt erklärt, wie du die Themen öffnest, Lektionen durcharbeitest und Wiederholungen vorbereitest.",
              position: 10,
              isPreview: true,
              estimatedMinutes: 12,
              textContent: [
                "Road-to-Z3 ist als webbasierter Lernpfad aufgebaut. Du arbeitest nicht mit einer losen PDF-Sammlung, sondern mit klaren Lernseiten, die du direkt aus dem E-Learning Bereich öffnen kannst.",
                "Starte mit dem ersten Thema, markiere offene Begriffe in deinen eigenen Notizen und schließe eine Lektion erst ab, wenn du die Kernaussagen ohne Unterbrechung erklären kannst.",
                "Die Lernseiten sind bewusst kompakt gehalten: Orientierung, Kernpunkte, Wiederholung und ein nächster Schritt. Dadurch bleibt der Fortschritt sichtbar und du kannst später gezielt zurückspringen.",
              ],
            },
            {
              slug: "study-system",
              title: "Dein Lernsystem einrichten",
              description: "Ein kurzer Ablauf für strukturiertes Lernen mit festen Themenblöcken, Wiederholung und sauberer Navigation.",
              position: 20,
              estimatedMinutes: 15,
              textContent: [
                "Plane pro Lernblock ein konkretes Thema, ein Subtopic und eine kurze Wiederholung ein. Öffne die Lernseite direkt, arbeite die Kernpunkte durch und notiere nur die Punkte, die du wirklich nacharbeiten musst.",
                "Nach jedem Block entscheidest du, ob das Thema offen, gestartet, abgeschlossen oder zur Wiederholung vorgemerkt ist. Diese Statuslogik wird später für die Lernplanung genutzt.",
                "Wichtig ist ein stabiler Rhythmus: wenige Themen sauber bearbeiten, statt viele Seiten nur oberflächlich zu lesen.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-fachgebiete",
          title: "Fachgebiete und Themenstruktur",
          description: "Die Road-to-Z3 Inhalte nach Fachgebieten, Topics und Subtopics verstehen und gezielt ansteuern.",
          position: 20,
          lessons: [
            {
              slug: "fachgebiete-sortieren",
              title: "Fachgebiete sortieren",
              description: "Wie du Themen nach Fachbereich öffnest und zusammengehörige Inhalte in der richtigen Reihenfolge lernst.",
              position: 10,
              estimatedMinutes: 18,
              textContent: [
                "Die Road-to-Z3 Module sind nach Fachgebieten aufgebaut. Jedes Fachgebiet bündelt mehrere Topics, die wiederum in kleinere Subtopics aufgeteilt werden.",
                "Lerne zuerst die Basisbegriffe eines Fachgebiets, danach die typischen Verknüpfungen und erst anschließend die kompakten High-Yield Abschnitte.",
                "Wenn du ein Fachgebiet später wiederholst, steigst du direkt beim passenden Topic ein. So bleibt die Navigation kurz und du vermeidest doppelte Sucharbeit.",
              ],
            },
            {
              slug: "subtopics-direkt-nutzen",
              title: "Subtopics gezielt nutzen",
              description: "Subtopics als direkte Lernseiten verwenden, damit einzelne Lücken ohne Umwege nachgearbeitet werden können.",
              position: 20,
              estimatedMinutes: 16,
              textContent: [
                "Ein Subtopic ist die kleinste sinnvolle Lerneinheit im System. Es sollte so konkret sein, dass du es in einem Lernblock öffnen, bearbeiten und bewerten kannst.",
                "Nutze Subtopics für gezielte Nacharbeit: Wenn ein Begriff, Ablauf oder Zusammenhang unklar bleibt, springst du später direkt zu dieser Seite zurück.",
                "Für die nächste Ausbaustufe werden diese Subtopics stabile URLs bekommen, damit interne Links und Suchergebnisse direkt auf den richtigen Inhalt zeigen.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-high-yield",
          title: "High-Yield Wiederholung",
          description: "Kompakte Wiederholungsseiten für wichtige Kernaussagen, Merksätze und priorisierte Nacharbeit.",
          position: 30,
          lessons: [
            {
              slug: "high-yield-marker",
              title: "High-Yield Markierungen lesen",
              description: "So erkennst du besonders wichtige Kernaussagen und trennst sie von Hintergrundwissen.",
              position: 10,
              estimatedMinutes: 14,
              textContent: [
                "High-Yield Markierungen zeigen Inhalte, die du besonders sicher beherrschen solltest. Sie ersetzen nicht das Verstehen des Themas, helfen aber beim Priorisieren.",
                "Lies zuerst den normalen Abschnitt und prüfe danach die markierten Kernaussagen. Wenn eine Markierung ohne Kontext unklar bleibt, gehst du zurück zum Subtopic.",
                "Notiere High-Yield Punkte knapp und wiederholbar. Ein guter Eintrag ist kurz genug für eine schnelle Wiederholung, aber präzise genug, um den Zusammenhang zu behalten.",
              ],
            },
            {
              slug: "wiederholungsfenster",
              title: "Wiederholungsfenster planen",
              description: "Eine einfache Struktur für erste Wiederholung, spätere Festigung und Nacharbeit offener Themen.",
              position: 20,
              estimatedMinutes: 17,
              textContent: [
                "Wiederholung funktioniert am besten, wenn sie geplant, kurz und konkret ist. Lege nach einem Lernblock fest, welche Punkte am nächsten Tag und welche am Ende der Woche erneut geöffnet werden.",
                "Offene Themen bleiben sichtbar, bis du sie sauber nachgearbeitet hast. Ein Thema gilt erst dann als abgeschlossen, wenn du die zentrale Aussage ohne Hilfetext wiedergeben kannst.",
                "Bei längeren Pausen setzt du nicht bei null an. Du prüfst zuerst offene und überfällige Themen und baust daraus den nächsten realistischen Lernblock.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-lernalltag",
          title: "Lernalltag und Nacharbeit",
          description: "Praktische Abläufe für Tagesblöcke, kurze Wiederholung und kontrolliertes Nacharbeiten.",
          position: 40,
          lessons: [
            {
              slug: "tagesblock-vorbereiten",
              title: "Tagesblock vorbereiten",
              description: "Ein Lernblock mit Ziel, direktem Inhaltslink, Wiederholung und sauberem Abschluss.",
              position: 10,
              estimatedMinutes: 13,
              textContent: [
                "Ein Tagesblock braucht ein klares Ziel: welches Topic, welches Subtopic und welche Wiederholung dazugehören. Öffne die passende Lernseite vor dem Start, damit der Block ohne Sucharbeit beginnt.",
                "Arbeite den Inhalt in einer festen Reihenfolge durch: Überblick, Kernpunkte, eigene Kurznotiz und Abschlussbewertung.",
                "Wenn du hängen bleibst, markierst du das Thema als offen und planst es für Nacharbeiten ein. Der Block bleibt dadurch verwertbar, auch wenn nicht alles sofort abgeschlossen ist.",
              ],
            },
            {
              slug: "nacharbeiten-ohne-neustart",
              title: "Nacharbeiten ohne Neustart",
              description: "Wie du verpasste Inhalte kontrolliert aufholst, ohne den gesamten Lernplan zu verlieren.",
              position: 20,
              estimatedMinutes: 15,
              textContent: [
                "Nacharbeiten bedeutet nicht, den gesamten Plan neu zu beginnen. Sammle zuerst offene und überfällige Themen, sortiere sie nach Fachgebiet und bearbeite die wichtigsten Einheiten zuerst.",
                "Halte Nacharbeitsblöcke kleiner als normale Lernblöcke. Ziel ist, eine konkrete Lücke zu schließen und danach wieder in den regulären Rhythmus zurückzukehren.",
                "Wenn mehrere Tage fehlen, reduzierst du neue Inhalte vorübergehend und bringst zuerst die offenen Grundlagen unter Kontrolle.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-struktur-rhythmus",
          title: "Lernrhythmus und Fortschritt",
          description: "Zusätzliche Struktur-Seiten für Wochenziele, Pufferzeit und nachvollziehbaren Fortschritt.",
          position: 50,
          lessons: [
            {
              slug: "wochenziele-ableiten",
              title: "Wochenziele ableiten",
              description: "Aus Themenumfang, offenen Subtopics und verfügbarer Zeit realistische Wochenziele bauen.",
              position: 10,
              estimatedMinutes: 18,
              textContent: [
                "Ein Wochenziel ist nur hilfreich, wenn es aus konkreten Topics besteht. Wähle wenige Fachgebiete aus und lege fest, welche Subtopics bis zum Ende der Woche abgeschlossen sein sollen.",
                "Plane Wiederholung bewusst mit ein. Ein Ziel ist nicht erreicht, wenn alle Seiten nur geöffnet wurden, sondern wenn die wichtigsten Punkte aktiv abrufbar sind.",
                "Wenn der Umfang zu groß wird, verschiebst du weniger dringende Themen in einen Pufferblock und hältst die Kernziele stabil.",
              ],
            },
            {
              slug: "puffer-und-reviewtage",
              title: "Puffer- und Wiederholungstage vorbereiten",
              description: "Wie Pufferzeiten verhindern, dass offene Themen den gesamten Lernrhythmus blockieren.",
              position: 20,
              estimatedMinutes: 16,
              textContent: [
                "Puffertage sind feste Lernzeit für offene Themen, nicht freie Reserven ohne Zweck. Sammle während der Woche die offenen Punkte und schließe sie in kurzen, gezielten Blöcken.",
                "Ein Wiederholungstag beginnt mit den markierten High-Yield Punkten und endet mit einer kurzen Statusbewertung der bearbeiteten Topics.",
                "So bleibt der Plan flexibel, ohne dass du bei jeder Verzögerung komplett neu starten musst.",
              ],
            },
          ],
        },
      ],
    },
    {
      packageSlug: "z3-pruefungstrainer",
      modulePrefix: "z3-pruefungstrainer",
      modules: [
        {
          slug: "road-to-z3-orientation",
          title: "Road-to-Z3 Orientierung",
          description: "Einstieg in die Z3 Vorbereitung mit Lernlogik, Inhaltsstruktur und einem klaren ersten Lernblock.",
          position: 10,
          isPreview: true,
          lessons: [
            {
              slug: "start-here",
              title: "So startest du mit Road-to-Z3",
              description: "Der erste Lernschritt erklärt, wie du die Themen öffnest, Lektionen durcharbeitest und Wiederholungen vorbereitest.",
              position: 10,
              isPreview: true,
              estimatedMinutes: 12,
              textContent: [
                "Road-to-Z3 ist als webbasierter Lernpfad aufgebaut. Du arbeitest nicht mit einer losen PDF-Sammlung, sondern mit klaren Lernseiten, die du direkt aus dem E-Learning Bereich öffnen kannst.",
                "Starte mit dem ersten Thema, markiere offene Begriffe in deinen eigenen Notizen und schließe eine Lektion erst ab, wenn du die Kernaussagen ohne Unterbrechung erklären kannst.",
                "Die Lernseiten sind bewusst kompakt gehalten: Orientierung, Kernpunkte, Wiederholung und ein nächster Schritt. Dadurch bleibt der Fortschritt sichtbar und du kannst später gezielt zurückspringen.",
              ],
            },
            {
              slug: "study-system",
              title: "Dein Lernsystem einrichten",
              description: "Ein kurzer Ablauf für intensive Wiederholung mit festen Themenblöcken und sauberer Navigation.",
              position: 20,
              estimatedMinutes: 15,
              textContent: [
                "Plane pro Lernblock ein konkretes Thema, ein Subtopic und eine kurze Wiederholung ein. Öffne die Lernseite direkt, arbeite die Kernpunkte durch und notiere nur die Punkte, die du wirklich nacharbeiten musst.",
                "Nach jedem Block entscheidest du, ob das Thema offen, gestartet, abgeschlossen oder zur Wiederholung vorgemerkt ist. Diese Statuslogik wird später für die Lernplanung genutzt.",
                "Wichtig ist ein stabiler Rhythmus: wenige Themen sauber bearbeiten, statt viele Seiten nur oberflächlich zu lesen.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-fachgebiete",
          title: "Fachgebiete und Themenstruktur",
          description: "Die Road-to-Z3 Inhalte nach Fachgebieten, Topics und Subtopics verstehen und gezielt ansteuern.",
          position: 20,
          lessons: [
            {
              slug: "fachgebiete-sortieren",
              title: "Fachgebiete sortieren",
              description: "Wie du Themen nach Fachbereich öffnest und zusammengehörige Inhalte in der richtigen Reihenfolge lernst.",
              position: 10,
              estimatedMinutes: 18,
              textContent: [
                "Die Road-to-Z3 Module sind nach Fachgebieten aufgebaut. Jedes Fachgebiet bündelt mehrere Topics, die wiederum in kleinere Subtopics aufgeteilt werden.",
                "Lerne zuerst die Basisbegriffe eines Fachgebiets, danach die typischen Verknüpfungen und erst anschließend die kompakten High-Yield Abschnitte.",
                "Wenn du ein Fachgebiet später wiederholst, steigst du direkt beim passenden Topic ein. So bleibt die Navigation kurz und du vermeidest doppelte Sucharbeit.",
              ],
            },
            {
              slug: "subtopics-direkt-nutzen",
              title: "Subtopics gezielt nutzen",
              description: "Subtopics als direkte Lernseiten verwenden, damit einzelne Lücken ohne Umwege nachgearbeitet werden können.",
              position: 20,
              estimatedMinutes: 16,
              textContent: [
                "Ein Subtopic ist die kleinste sinnvolle Lerneinheit im System. Es sollte so konkret sein, dass du es in einem Lernblock öffnen, bearbeiten und bewerten kannst.",
                "Nutze Subtopics für gezielte Nacharbeit: Wenn ein Begriff, Ablauf oder Zusammenhang unklar bleibt, springst du später direkt zu dieser Seite zurück.",
                "Für die nächste Ausbaustufe werden diese Subtopics stabile URLs bekommen, damit interne Links und Suchergebnisse direkt auf den richtigen Inhalt zeigen.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-high-yield",
          title: "High-Yield Wiederholung",
          description: "Kompakte Wiederholungsseiten für wichtige Kernaussagen, Merksätze und priorisierte Nacharbeit.",
          position: 30,
          lessons: [
            {
              slug: "high-yield-marker",
              title: "High-Yield Markierungen lesen",
              description: "So erkennst du besonders wichtige Kernaussagen und trennst sie von Hintergrundwissen.",
              position: 10,
              estimatedMinutes: 14,
              textContent: [
                "High-Yield Markierungen zeigen Inhalte, die du besonders sicher beherrschen solltest. Sie ersetzen nicht das Verstehen des Themas, helfen aber beim Priorisieren.",
                "Lies zuerst den normalen Abschnitt und prüfe danach die markierten Kernaussagen. Wenn eine Markierung ohne Kontext unklar bleibt, gehst du zurück zum Subtopic.",
                "Notiere High-Yield Punkte knapp und wiederholbar. Ein guter Eintrag ist kurz genug für eine schnelle Wiederholung, aber präzise genug, um den Zusammenhang zu behalten.",
              ],
            },
            {
              slug: "wiederholungsfenster",
              title: "Wiederholungsfenster planen",
              description: "Eine einfache Struktur für erste Wiederholung, spätere Festigung und Nacharbeit offener Themen.",
              position: 20,
              estimatedMinutes: 17,
              textContent: [
                "Wiederholung funktioniert am besten, wenn sie geplant, kurz und konkret ist. Lege nach einem Lernblock fest, welche Punkte am nächsten Tag und welche am Ende der Woche erneut geöffnet werden.",
                "Offene Themen bleiben sichtbar, bis du sie sauber nachgearbeitet hast. Ein Thema gilt erst dann als abgeschlossen, wenn du die zentrale Aussage ohne Hilfetext wiedergeben kannst.",
                "Bei längeren Pausen setzt du nicht bei null an. Du prüfst zuerst offene und überfällige Themen und baust daraus den nächsten realistischen Lernblock.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-lernalltag",
          title: "Lernalltag und Nacharbeit",
          description: "Praktische Abläufe für Tagesblöcke, kurze Wiederholung und kontrolliertes Nacharbeiten.",
          position: 40,
          lessons: [
            {
              slug: "tagesblock-vorbereiten",
              title: "Tagesblock vorbereiten",
              description: "Ein Lernblock mit Ziel, direktem Inhaltslink, Wiederholung und sauberem Abschluss.",
              position: 10,
              estimatedMinutes: 13,
              textContent: [
                "Ein Tagesblock braucht ein klares Ziel: welches Topic, welches Subtopic und welche Wiederholung dazugehören. Öffne die passende Lernseite vor dem Start, damit der Block ohne Sucharbeit beginnt.",
                "Arbeite den Inhalt in einer festen Reihenfolge durch: Überblick, Kernpunkte, eigene Kurznotiz und Abschlussbewertung.",
                "Wenn du hängen bleibst, markierst du das Thema als offen und planst es für Nacharbeiten ein. Der Block bleibt dadurch verwertbar, auch wenn nicht alles sofort abgeschlossen ist.",
              ],
            },
            {
              slug: "nacharbeiten-ohne-neustart",
              title: "Nacharbeiten ohne Neustart",
              description: "Wie du verpasste Inhalte kontrolliert aufholst, ohne den gesamten Lernplan zu verlieren.",
              position: 20,
              estimatedMinutes: 15,
              textContent: [
                "Nacharbeiten bedeutet nicht, den gesamten Plan neu zu beginnen. Sammle zuerst offene und überfällige Themen, sortiere sie nach Fachgebiet und bearbeite die wichtigsten Einheiten zuerst.",
                "Halte Nacharbeitsblöcke kleiner als normale Lernblöcke. Ziel ist, eine konkrete Lücke zu schließen und danach wieder in den regulären Rhythmus zurückzukehren.",
                "Wenn mehrere Tage fehlen, reduzierst du neue Inhalte vorübergehend und bringst zuerst die offenen Grundlagen unter Kontrolle.",
              ],
            },
          ],
        },
        {
          slug: "road-to-z3-intensive-review",
          title: "Intensive Wiederholung",
          description: "Zusätzliche Inhaltsstruktur für priorisierte Wiederholung und vertiefende High-Yield Lernseiten.",
          position: 50,
          lessons: [
            {
              slug: "priorisierte-wiederholung",
              title: "Priorisierte Wiederholungsthemen",
              description: "Wie du wichtige Inhalte zuerst öffnest und die Wiederholung nach Fachgebiet und Dringlichkeit sortierst.",
              position: 10,
              estimatedMinutes: 18,
              textContent: [
                "Priorisierte Wiederholung beginnt mit den Inhalten, die für das Gesamtverständnis am stärksten tragen. Öffne zuerst die Fachgebiete, bei denen mehrere Subtopics voneinander abhängen.",
                "Danach folgen die High-Yield Seiten, die kurze Kernaussagen und typische Verknüpfungen bündeln. Du nutzt sie als verdichtete Lernseiten, nicht als Ersatz für die Grundlagen.",
                "Wenn ein Thema trotz Wiederholung unsicher bleibt, markierst du es für Nacharbeit und gehst zurück zur vollständigen Lernseite.",
              ],
            },
            {
              slug: "inhaltsuebersicht",
              title: "Prüfungsnahe Inhaltsübersicht",
              description: "Eine kompakte Übersicht, die Inhalte nach Relevanz und Lernlogik ordnet, ohne zusätzliche Übungstools zu aktivieren.",
              position: 20,
              estimatedMinutes: 16,
              textContent: [
                "Die prüfungsnahe Inhaltsübersicht ordnet Road-to-Z3 Themen so, dass du schnell zwischen Grundlagen, Vertiefung und Wiederholung wechseln kannst.",
                "Sie bleibt eine Lern- und Navigationsstruktur. Interaktive Trainingsfunktionen werden in diesem Import nicht aktiviert.",
                "Nutze die Übersicht, um intensive Wiederholung zu planen und offene Themen kontrolliert abzuschließen.",
              ],
            },
          ],
        },
      ],
    },
  ];

  const sanitizeLearnerText = (value) => String(value || "")
    .replace(/Made by[^\n]*(\n|$)/gi, "")
    .replace(/1\.\s*Auflage\s*2026/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const findOne = (collectionName, filter) => {
    const records = app.findRecordsByFilter(collectionName, filter, "", 1, 0);
    return records.length > 0 ? records[0] : null;
  };

  const setCoreFields = (record, fields) => {
    for (const [fieldName, value] of Object.entries(fields)) {
      record.set(fieldName, value);
    }
  };

  for (const packageImport of packageImports) {
    let packageRecord = null;

    try {
      packageRecord = app.findFirstRecordByData("learning_packages", "slug", packageImport.packageSlug);
    } catch {
      packageRecord = null;
    }

    if (!packageRecord) {
      console.log(`Learning package ${packageImport.packageSlug} not found, skipping Road-to-Z3 import`);
      continue;
    }

    for (const moduleSeed of packageImport.modules) {
      const moduleSlug = `${packageImport.modulePrefix}-${moduleSeed.slug}`;
      let moduleRecord = findOne(
        "learning_modules",
        `package_id="${packageRecord.id}" && slug="${moduleSlug}"`,
      );

      if (!moduleRecord) {
        moduleRecord = new Record(moduleCollection);
      }

      const estimatedDurationMinutes = moduleSeed.lessons
        .reduce((total, lessonSeed) => total + Number(lessonSeed.estimatedMinutes || 0), 0);

      setCoreFields(moduleRecord, {
        package_id: packageRecord.id,
        slug: moduleSlug,
        title: moduleSeed.title,
        description: sanitizeLearnerText(moduleSeed.description),
        status: "published",
        position: moduleSeed.position,
        is_preview: moduleSeed.isPreview === true,
        estimated_duration_minutes: estimatedDurationMinutes,
      });

      app.save(moduleRecord);

      for (const lessonSeed of moduleSeed.lessons) {
        const lessonSlug = `${packageImport.modulePrefix}-${moduleSeed.slug}-${lessonSeed.slug}`;
        let lessonRecord = findOne(
          "learning_lessons",
          `package_id="${packageRecord.id}" && module_id="${moduleRecord.id}" && slug="${lessonSlug}"`,
        );

        if (!lessonRecord) {
          lessonRecord = new Record(lessonCollection);
        }

        setCoreFields(lessonRecord, {
          package_id: packageRecord.id,
          module_id: moduleRecord.id,
          slug: lessonSlug,
          title: lessonSeed.title,
          description: sanitizeLearnerText(lessonSeed.description),
          status: "published",
          content_type: "text",
          text_content: sanitizeLearnerText(lessonSeed.textContent.join("\n\n")),
          video_url: "",
          material_url: "",
          pdf_url: "",
          download_url: "",
          attachments: [],
          position: lessonSeed.position,
          is_preview: lessonSeed.isPreview === true,
          estimated_minutes: lessonSeed.estimatedMinutes,
        });

        app.save(lessonRecord);
      }
    }
  }
}, () => {
  console.log("Road-to-Z3 import rollback skipped to preserve edited learning content");
})
