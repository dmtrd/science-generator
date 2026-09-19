// ============================================================
// STRUCTURE: year groups, subjects, exam levels, tiers, topics
// Based on the AQA specifications and the KS3 National Curriculum.
// Edit freely. Topic ids are used to tag questions and keywords.
// ============================================================

window.STRUCTURE = {

  // Year groups and the level they map to
  yearGroups: [
    { id: "7",  label: "Year 7",  level: "ks3" },
    { id: "8",  label: "Year 8",  level: "ks3" },
    { id: "9",  label: "Year 9",  level: "ks3" },
    { id: "10", label: "Year 10", level: "gcse" },
    { id: "11", label: "Year 11", level: "gcse" },
    { id: "12", label: "Year 12", level: "alevel" },
    { id: "13", label: "Year 13", level: "alevel" }
  ],

  levels: {
    ks3:    { label: "Key Stage 3", hasTiers: false, minutesPerMark: 1.2 },
    gcse:   { label: "GCSE (AQA)",  hasTiers: true,  minutesPerMark: 1.0 },
    alevel: { label: "A level (AQA)", hasTiers: false, minutesPerMark: 1.0 }
  },

  tiers: [
    { id: "F", label: "Foundation" },
    { id: "H", label: "Higher" }
  ],

  // Subjects available at each level
  subjects: {
    ks3: [
      { id: "science",   label: "Science (all)" },
      { id: "biology",   label: "Biology" },
      { id: "chemistry", label: "Chemistry" },
      { id: "physics",   label: "Physics" }
    ],
    gcse: [
      { id: "combined",  label: "Combined Science: Trilogy" },
      { id: "biology",   label: "Biology" },
      { id: "chemistry", label: "Chemistry" },
      { id: "physics",   label: "Physics" }
    ],
    alevel: [
      { id: "biology",   label: "Biology" },
      { id: "chemistry", label: "Chemistry" },
      { id: "physics",   label: "Physics" }
    ]
  },

  // ---------------------------------------------------------
  // TOPICS
  // Each topic: id, label, subject (biology/chemistry/physics),
  // level, and for KS3 a typical year. "combined": false marks
  // separate-science-only GCSE topics.
  // ---------------------------------------------------------
  topics: [

    // ---------- KS3 (National Curriculum) ----------
    { id: "ks3-cells",          label: "Cells and organisation",              subject: "biology",   level: "ks3", year: "7" },
    { id: "ks3-reproduction",   label: "Reproduction",                        subject: "biology",   level: "ks3", year: "7" },
    { id: "ks3-ecosystems",     label: "Relationships in an ecosystem",       subject: "biology",   level: "ks3", year: "7" },
    { id: "ks3-skeleton",       label: "Skeletal and muscular systems",       subject: "biology",   level: "ks3", year: "7" },
    { id: "ks3-nutrition",      label: "Nutrition and digestion",             subject: "biology",   level: "ks3", year: "8" },
    { id: "ks3-gas-exchange",   label: "Gas exchange systems and breathing",  subject: "biology",   level: "ks3", year: "8" },
    { id: "ks3-health",         label: "Health, drugs and lifestyle",         subject: "biology",   level: "ks3", year: "8" },
    { id: "ks3-photosynthesis", label: "Photosynthesis",                      subject: "biology",   level: "ks3", year: "8" },
    { id: "ks3-respiration",    label: "Cellular respiration",                subject: "biology",   level: "ks3", year: "9" },
    { id: "ks3-inheritance",    label: "Inheritance, chromosomes, DNA and genes", subject: "biology", level: "ks3", year: "9" },

    { id: "ks3-particles",      label: "The particulate nature of matter",    subject: "chemistry", level: "ks3", year: "7" },
    { id: "ks3-atoms",          label: "Atoms, elements and compounds",       subject: "chemistry", level: "ks3", year: "7" },
    { id: "ks3-separating",     label: "Pure and impure substances (separating mixtures)", subject: "chemistry", level: "ks3", year: "7" },
    { id: "ks3-acids",          label: "Acids and alkalis",                   subject: "chemistry", level: "ks3", year: "7" },
    { id: "ks3-reactions",      label: "Chemical reactions",                  subject: "chemistry", level: "ks3", year: "8" },
    { id: "ks3-periodic-table", label: "The periodic table",                  subject: "chemistry", level: "ks3", year: "8" },
    { id: "ks3-earth",          label: "Earth and atmosphere",                subject: "chemistry", level: "ks3", year: "8" },
    { id: "ks3-energetics",     label: "Energetics (exothermic and endothermic)", subject: "chemistry", level: "ks3", year: "9" },
    { id: "ks3-materials",      label: "Materials (ceramics, polymers, composites)", subject: "chemistry", level: "ks3", year: "9" },

    { id: "ks3-forces",         label: "Forces and motion",                   subject: "physics",   level: "ks3", year: "7" },
    { id: "ks3-energy",         label: "Energy",                              subject: "physics",   level: "ks3", year: "7" },
    { id: "ks3-space",          label: "Space physics",                       subject: "physics",   level: "ks3", year: "7" },
    { id: "ks3-electricity",    label: "Electricity and electromagnetism",    subject: "physics",   level: "ks3", year: "8" },
    { id: "ks3-sound",          label: "Waves: sound",                        subject: "physics",   level: "ks3", year: "8" },
    { id: "ks3-light",          label: "Waves: light",                        subject: "physics",   level: "ks3", year: "8" },
    { id: "ks3-matter",         label: "Matter: density and pressure",        subject: "physics",   level: "ks3", year: "9" },
    { id: "ks3-magnetism",      label: "Magnetism",                           subject: "physics",   level: "ks3", year: "9" },

    // ---------- GCSE AQA Biology (8461) / Combined (8464) ----------
    { id: "gcse-bio-1", label: "4.1 Cell biology",                          subject: "biology", level: "gcse", combined: true },
    { id: "gcse-bio-2", label: "4.2 Organisation",                          subject: "biology", level: "gcse", combined: true },
    { id: "gcse-bio-3", label: "4.3 Infection and response",                subject: "biology", level: "gcse", combined: true },
    { id: "gcse-bio-4", label: "4.4 Bioenergetics",                         subject: "biology", level: "gcse", combined: true },
    { id: "gcse-bio-5", label: "4.5 Homeostasis and response",              subject: "biology", level: "gcse", combined: true },
    { id: "gcse-bio-6", label: "4.6 Inheritance, variation and evolution",  subject: "biology", level: "gcse", combined: true },
    { id: "gcse-bio-7", label: "4.7 Ecology",                               subject: "biology", level: "gcse", combined: true },

    // ---------- GCSE AQA Chemistry (8462) ----------
    { id: "gcse-chem-1",  label: "4.1 Atomic structure and the periodic table",     subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-2",  label: "4.2 Bonding, structure and properties of matter", subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-3",  label: "4.3 Quantitative chemistry",                      subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-4",  label: "4.4 Chemical changes",                            subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-5",  label: "4.5 Energy changes",                              subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-6",  label: "4.6 The rate and extent of chemical change",      subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-7",  label: "4.7 Organic chemistry",                           subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-8",  label: "4.8 Chemical analysis",                           subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-9",  label: "4.9 Chemistry of the atmosphere",                 subject: "chemistry", level: "gcse", combined: true },
    { id: "gcse-chem-10", label: "4.10 Using resources",                            subject: "chemistry", level: "gcse", combined: true },

    // ---------- GCSE AQA Physics (8463) ----------
    { id: "gcse-phys-1", label: "4.1 Energy",                          subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-2", label: "4.2 Electricity",                     subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-3", label: "4.3 Particle model of matter",        subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-4", label: "4.4 Atomic structure",                subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-5", label: "4.5 Forces",                          subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-6", label: "4.6 Waves",                           subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-7", label: "4.7 Magnetism and electromagnetism",  subject: "physics", level: "gcse", combined: true },
    { id: "gcse-phys-8", label: "4.8 Space physics (Physics only)",    subject: "physics", level: "gcse", combined: false },

    // ---------- A level AQA Biology (7402) ----------
    { id: "al-bio-1", label: "3.1 Biological molecules",                                             subject: "biology", level: "alevel", year: "12" },
    { id: "al-bio-2", label: "3.2 Cells",                                                            subject: "biology", level: "alevel", year: "12" },
    { id: "al-bio-3", label: "3.3 Organisms exchange substances with their environment",             subject: "biology", level: "alevel", year: "12" },
    { id: "al-bio-4", label: "3.4 Genetic information, variation and relationships between organisms", subject: "biology", level: "alevel", year: "12" },
    { id: "al-bio-5", label: "3.5 Energy transfers in and between organisms",                        subject: "biology", level: "alevel", year: "13" },
    { id: "al-bio-6", label: "3.6 Organisms respond to changes in their environments",               subject: "biology", level: "alevel", year: "13" },
    { id: "al-bio-7", label: "3.7 Genetics, populations, evolution and ecosystems",                  subject: "biology", level: "alevel", year: "13" },
    { id: "al-bio-8", label: "3.8 The control of gene expression",                                   subject: "biology", level: "alevel", year: "13" },

    // ---------- A level AQA Chemistry (7405) ----------
    { id: "al-chem-1-1",  label: "3.1.1 Atomic structure",                          subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-2",  label: "3.1.2 Amount of substance",                       subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-3",  label: "3.1.3 Bonding",                                   subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-4",  label: "3.1.4 Energetics",                                subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-5",  label: "3.1.5 Kinetics",                                  subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-6",  label: "3.1.6 Chemical equilibria, Le Chatelier and Kc",  subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-7",  label: "3.1.7 Oxidation, reduction and redox equations",  subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-1-8",  label: "3.1.8 Thermodynamics",                            subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-1-9",  label: "3.1.9 Rate equations",                            subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-1-10", label: "3.1.10 Equilibrium constant Kp",                  subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-1-11", label: "3.1.11 Electrode potentials and electrochemical cells", subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-1-12", label: "3.1.12 Acids and bases",                          subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-2-1",  label: "3.2.1 Periodicity",                               subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-2-2",  label: "3.2.2 Group 2, the alkaline earth metals",        subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-2-3",  label: "3.2.3 Group 7(17), the halogens",                 subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-2-4",  label: "3.2.4 Properties of Period 3 elements and their oxides", subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-2-5",  label: "3.2.5 Transition metals",                         subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-2-6",  label: "3.2.6 Reactions of ions in aqueous solution",     subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-1",  label: "3.3.1 Introduction to organic chemistry",         subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-3-2",  label: "3.3.2 Alkanes",                                   subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-3-3",  label: "3.3.3 Halogenoalkanes",                           subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-3-4",  label: "3.3.4 Alkenes",                                   subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-3-5",  label: "3.3.5 Alcohols",                                  subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-3-6",  label: "3.3.6 Organic analysis",                          subject: "chemistry", level: "alevel", year: "12" },
    { id: "al-chem-3-7",  label: "3.3.7 Optical isomerism",                         subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-8",  label: "3.3.8 Aldehydes and ketones",                     subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-9",  label: "3.3.9 Carboxylic acids and derivatives",          subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-10", label: "3.3.10 Aromatic chemistry",                       subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-11", label: "3.3.11 Amines",                                   subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-12", label: "3.3.12 Polymers",                                 subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-13", label: "3.3.13 Amino acids, proteins and DNA",            subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-14", label: "3.3.14 Organic synthesis",                        subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-15", label: "3.3.15 Nuclear magnetic resonance spectroscopy",  subject: "chemistry", level: "alevel", year: "13" },
    { id: "al-chem-3-16", label: "3.3.16 Chromatography",                           subject: "chemistry", level: "alevel", year: "13" },

    // ---------- A level AQA Physics (7408) ----------
    { id: "al-phys-1",  label: "3.1 Measurements and their errors",         subject: "physics", level: "alevel", year: "12" },
    { id: "al-phys-2",  label: "3.2 Particles and radiation",               subject: "physics", level: "alevel", year: "12" },
    { id: "al-phys-3",  label: "3.3 Waves",                                 subject: "physics", level: "alevel", year: "12" },
    { id: "al-phys-4",  label: "3.4 Mechanics and materials",               subject: "physics", level: "alevel", year: "12" },
    { id: "al-phys-5",  label: "3.5 Electricity",                           subject: "physics", level: "alevel", year: "12" },
    { id: "al-phys-6",  label: "3.6 Further mechanics and thermal physics", subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-7",  label: "3.7 Fields and their consequences",         subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-8",  label: "3.8 Nuclear physics",                       subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-9",  label: "3.9 Astrophysics (option)",                 subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-10", label: "3.10 Medical physics (option)",             subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-11", label: "3.11 Engineering physics (option)",         subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-12", label: "3.12 Turning points in physics (option)",   subject: "physics", level: "alevel", year: "13" },
    { id: "al-phys-13", label: "3.13 Electronics (option)",                 subject: "physics", level: "alevel", year: "13" }
  ]
};
