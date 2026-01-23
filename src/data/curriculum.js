// Arbeitskategorien für Automobilfachmann/-frau EFZ
export const workCategories = [
  {
    id: 'vehicle-check',
    name: 'Fahrzeuge prüfen und warten',
    icon: '🔧',
    tasks: [
      'Lichtsysteme einstellen',
      'Sichtprüfung Fahrzeug aussen',
      'Anhängersteckdose prüfen',
      'Anhängekupplung Spiel prüfen',
      'Bauteile fachgerecht ersetzen'
    ]
  },
  {
    id: 'engine',
    name: 'Motor / Motorraum',
    icon: '🔥',
    tasks: [
      'Zündkerzen ersetzen',
      'Zündkerzen mit Drehmoment anziehen',
      'Aufbau und Funktion Zündkerzen erklären',
      'Antriebsriemen prüfen',
      'Antriebsriemen ersetzen',
      'Spannsysteme erklären',
      'Heizsystem prüfen',
      'Klimaanlage prüfen',
      'Kältemittelvorschriften einhalten'
    ]
  },
  {
    id: 'brakes',
    name: 'Fahrzeugunterseite / Bremsen',
    icon: '🛞',
    tasks: [
      'Bremsanlage prüfen',
      'Wirkungsweise Bremsanlage erklären',
      'Scheibenbremsen Aufbau erklären',
      'Trommelbremsen Aufbau erklären',
      'Bremsbeläge ersetzen',
      'Trommelbremsen instand setzen',
      'Luftfederung warten',
      'Aufbau Luftfederung erklären',
      'Längs- und Querstreben prüfen'
    ]
  },
  {
    id: 'chassis',
    name: 'Fahrwerk / Lenkung',
    icon: '🧭',
    tasks: [
      'Lenkgeometrie erklären',
      'Spurwerte berechnen',
      'Lenkung prüfen',
      'Lenkungsteile ersetzen',
      'Lenkunterstützung prüfen',
      'Federungs- und Dämpfungssystem erklären'
    ]
  },
  {
    id: 'electronics',
    name: 'Elektrik / Elektronik',
    icon: '🔋',
    tasks: [
      'Batterie ersetzen',
      'Kennwerte Batterie erklären',
      'Physikalische Grundlagen anwenden',
      'Starter prüfen',
      'Generator prüfen',
      'Generator ersetzen'
    ]
  },
  {
    id: 'comfort-safety',
    name: 'Komfort- und Sicherheitssysteme',
    icon: '🧊',
    tasks: [
      'Heizsystem prüfen',
      'Klimasystem diagnostizieren',
      'Aufbau Heiz- und Klimaanlage erklären',
      'Zutrittssysteme erklären',
      'Rückhaltesysteme erklären',
      'Sicherheitsvorschriften einhalten'
    ]
  },
  {
    id: 'methodology',
    name: 'Arbeitsmethodik / Verantwortung',
    icon: '🧠',
    tasks: [
      'Werkstattinformationssystem nutzen',
      'Systematisch diagnostizieren',
      'Arbeitssicherheit einhalten',
      'Umweltvorschriften anwenden',
      'Arbeit reflektieren'
    ]
  }
];

// Kompetenzen für Automobilfachmann/-frau EFZ
export const competencies = [
  {
    id: 'technical',
    name: 'Fachkompetenz',
    description: 'Fahrzeugtechnisches Wissen anwenden und Zusammenhänge verstehen'
  },
  {
    id: 'safety',
    name: 'Arbeitssicherheit',
    description: 'Sicherheitsvorschriften einhalten und Gefahren erkennen'
  },
  {
    id: 'quality',
    name: 'Qualitätsbewusstsein',
    description: 'Präzise und sorgfältig arbeiten, Qualitätsstandards einhalten'
  },
  {
    id: 'customer',
    name: 'Kundenorientierung',
    description: 'Kundenbedürfnisse verstehen und freundlich kommunizieren'
  },
  {
    id: 'teamwork',
    name: 'Teamfähigkeit',
    description: 'Konstruktiv zusammenarbeiten und Kolleg*innen unterstützen'
  },
  {
    id: 'independence',
    name: 'Selbstständigkeit',
    description: 'Eigenverantwortlich und initiativ arbeiten'
  },
  {
    id: 'problem-solving',
    name: 'Problemlösungskompetenz',
    description: 'Fehler systematisch diagnostizieren und Lösungen entwickeln'
  },
  {
    id: 'environment',
    name: 'Umweltbewusstsein',
    description: 'Umweltvorschriften einhalten und ressourcenschonend arbeiten'
  },
  {
    id: 'efficiency',
    name: 'Wirtschaftlichkeit',
    description: 'Effizient arbeiten und Ressourcen optimal einsetzen'
  },
  {
    id: 'communication',
    name: 'Kommunikationsfähigkeit',
    description: 'Informationen klar weitergeben und aktiv zuhören'
  }
];

// Rating-Skala (1-6 entspricht Schweizer Notensystem)
export const ratingScale = [
  { value: 1, label: 'Ungenügend', color: '#dc2626' },
  { value: 2, label: 'Schwach', color: '#ea580c' },
  { value: 3, label: 'Knapp genügend', color: '#f59e0b' },
  { value: 4, label: 'Genügend', color: '#84cc16' },
  { value: 5, label: 'Gut', color: '#22c55e' },
  { value: 6, label: 'Sehr gut', color: '#10b981' }
];
