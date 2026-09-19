// ============================================================
// SUB-TOPICS
// Sub-topics. GCSE ones use AQA's own specification numbering, which is the
// same reference printed in the mark schemes, so questions tag themselves.
// GCSE Biology (8461) uses the bare number ("4.1.1") because the question
// data already carries those tags. Chemistry (8462) and Physics (8463) reuse
// the same numbering but prefixed ("chem-4.1.1" / "phys-4.1.1") so that ids
// stay unique across subjects.
// KS3 sub-topics are a teaching sequence for each National Curriculum topic,
// ids of the form <topic-id>-a, -b, -c ...
// A level topics deliberately have no sub-topics yet.
// ============================================================

window.SUBTOPICS = [

  // ================= GCSE Biology (AQA 8461) =================
  { id: "4.1.1", topic: "gcse-bio-1", label: "Cell structure" },
  { id: "4.1.2", topic: "gcse-bio-1", label: "Cell division" },
  { id: "4.1.3", topic: "gcse-bio-1", label: "Transport in cells" },

  { id: "4.2.1", topic: "gcse-bio-2", label: "Principles of organisation" },
  { id: "4.2.2", topic: "gcse-bio-2", label: "Animal tissues, organs and organ systems" },
  { id: "4.2.3", topic: "gcse-bio-2", label: "Plant tissues, organs and systems" },

  { id: "4.3.1", topic: "gcse-bio-3", label: "Communicable diseases" },
  { id: "4.3.2", topic: "gcse-bio-3", label: "Monoclonal antibodies" },
  { id: "4.3.3", topic: "gcse-bio-3", label: "Plant disease" },

  { id: "4.4.1", topic: "gcse-bio-4", label: "Photosynthesis" },
  { id: "4.4.2", topic: "gcse-bio-4", label: "Respiration" },

  { id: "4.5.1", topic: "gcse-bio-5", label: "Homeostasis" },
  { id: "4.5.2", topic: "gcse-bio-5", label: "The human nervous system" },
  { id: "4.5.3", topic: "gcse-bio-5", label: "Hormonal coordination in humans" },
  { id: "4.5.4", topic: "gcse-bio-5", label: "Plant hormones" },

  { id: "4.6.1", topic: "gcse-bio-6", label: "Reproduction" },
  { id: "4.6.2", topic: "gcse-bio-6", label: "Variation and evolution" },
  { id: "4.6.3", topic: "gcse-bio-6", label: "Understanding genetics and evolution" },
  { id: "4.6.4", topic: "gcse-bio-6", label: "Classification of living organisms" },

  { id: "4.7.1", topic: "gcse-bio-7", label: "Adaptations, interdependence, competition" },
  { id: "4.7.2", topic: "gcse-bio-7", label: "Organisation of an ecosystem" },
  { id: "4.7.3", topic: "gcse-bio-7", label: "Biodiversity and human interaction" },
  { id: "4.7.4", topic: "gcse-bio-7", label: "Trophic levels in an ecosystem" },
  { id: "4.7.5", topic: "gcse-bio-7", label: "Food production" },

  // ================= GCSE Chemistry (AQA 8462) =================
  { id: "chem-4.1.1",  topic: "gcse-chem-1", label: "A simple model of the atom" },
  { id: "chem-4.1.2",  topic: "gcse-chem-1", label: "The periodic table" },
  { id: "chem-4.1.3",  topic: "gcse-chem-1", label: "Properties of transition metals" },

  { id: "chem-4.2.1",  topic: "gcse-chem-2", label: "Chemical bonds: ionic, covalent, metallic" },
  { id: "chem-4.2.2",  topic: "gcse-chem-2", label: "Bonding, structure and properties" },
  { id: "chem-4.2.3",  topic: "gcse-chem-2", label: "Structure and bonding of carbon" },
  { id: "chem-4.2.4",  topic: "gcse-chem-2", label: "Bulk and surface properties, nanoparticles" },

  { id: "chem-4.3.1",  topic: "gcse-chem-3", label: "Chemical measurements and conservation" },
  { id: "chem-4.3.2",  topic: "gcse-chem-3", label: "Amount of substance and reacting masses" },
  { id: "chem-4.3.3",  topic: "gcse-chem-3", label: "Yield and atom economy" },
  { id: "chem-4.3.4",  topic: "gcse-chem-3", label: "Using concentrations of solutions" },
  { id: "chem-4.3.5",  topic: "gcse-chem-3", label: "Amount of substance and gas volumes" },

  { id: "chem-4.4.1",  topic: "gcse-chem-4", label: "Reactivity of metals" },
  { id: "chem-4.4.2",  topic: "gcse-chem-4", label: "Reactions of acids" },
  { id: "chem-4.4.3",  topic: "gcse-chem-4", label: "Electrolysis" },

  { id: "chem-4.5.1",  topic: "gcse-chem-5", label: "Exothermic and endothermic reactions" },
  { id: "chem-4.5.2",  topic: "gcse-chem-5", label: "Chemical cells and fuel cells" },

  { id: "chem-4.6.1",  topic: "gcse-chem-6", label: "Rate of reaction" },
  { id: "chem-4.6.2",  topic: "gcse-chem-6", label: "Reversible reactions and equilibrium" },

  { id: "chem-4.7.1",  topic: "gcse-chem-7", label: "Carbon compounds as fuels and feedstock" },
  { id: "chem-4.7.2",  topic: "gcse-chem-7", label: "Reactions of alkenes and alcohols" },
  { id: "chem-4.7.3",  topic: "gcse-chem-7", label: "Synthetic and natural polymers" },

  { id: "chem-4.8.1",  topic: "gcse-chem-8", label: "Purity, formulations and chromatography" },
  { id: "chem-4.8.2",  topic: "gcse-chem-8", label: "Identification of common gases" },
  { id: "chem-4.8.3",  topic: "gcse-chem-8", label: "Identification of ions" },

  { id: "chem-4.9.1",  topic: "gcse-chem-9", label: "Composition and evolution of atmosphere" },
  { id: "chem-4.9.2",  topic: "gcse-chem-9", label: "Greenhouse gases: carbon dioxide, methane" },
  { id: "chem-4.9.3",  topic: "gcse-chem-9", label: "Common atmospheric pollutants" },

  { id: "chem-4.10.1", topic: "gcse-chem-10", label: "Earth's resources and potable water" },
  { id: "chem-4.10.2", topic: "gcse-chem-10", label: "Life cycle assessment and recycling" },
  { id: "chem-4.10.3", topic: "gcse-chem-10", label: "Using materials" },
  { id: "chem-4.10.4", topic: "gcse-chem-10", label: "The Haber process and NPK fertilisers" },

  // ================= GCSE Physics (AQA 8463) =================
  { id: "phys-4.1.1", topic: "gcse-phys-1", label: "Energy stores and systems" },
  { id: "phys-4.1.2", topic: "gcse-phys-1", label: "Conservation and dissipation of energy" },
  { id: "phys-4.1.3", topic: "gcse-phys-1", label: "National and global energy resources" },

  { id: "phys-4.2.1", topic: "gcse-phys-2", label: "Current, potential difference, resistance" },
  { id: "phys-4.2.2", topic: "gcse-phys-2", label: "Series and parallel circuits" },
  { id: "phys-4.2.3", topic: "gcse-phys-2", label: "Domestic uses and safety" },
  { id: "phys-4.2.4", topic: "gcse-phys-2", label: "Energy transfers" },
  { id: "phys-4.2.5", topic: "gcse-phys-2", label: "Static electricity" },

  { id: "phys-4.3.1", topic: "gcse-phys-3", label: "Changes of state and the particle model" },
  { id: "phys-4.3.2", topic: "gcse-phys-3", label: "Internal energy and energy transfers" },
  { id: "phys-4.3.3", topic: "gcse-phys-3", label: "Particle model and pressure" },

  { id: "phys-4.4.1", topic: "gcse-phys-4", label: "Atoms and isotopes" },
  { id: "phys-4.4.2", topic: "gcse-phys-4", label: "Atoms and nuclear radiation" },
  { id: "phys-4.4.3", topic: "gcse-phys-4", label: "Hazards and uses of radioactive emissions" },
  { id: "phys-4.4.4", topic: "gcse-phys-4", label: "Nuclear fission and fusion" },

  { id: "phys-4.5.1", topic: "gcse-phys-5", label: "Forces and their interactions" },
  { id: "phys-4.5.2", topic: "gcse-phys-5", label: "Work done and energy transfer" },
  { id: "phys-4.5.3", topic: "gcse-phys-5", label: "Forces and elasticity" },
  { id: "phys-4.5.4", topic: "gcse-phys-5", label: "Moments, levers and gears" },
  { id: "phys-4.5.5", topic: "gcse-phys-5", label: "Pressure and pressure differences in fluids" },
  { id: "phys-4.5.6", topic: "gcse-phys-5", label: "Forces and motion" },
  { id: "phys-4.5.7", topic: "gcse-phys-5", label: "Momentum" },

  { id: "phys-4.6.1", topic: "gcse-phys-6", label: "Waves in air, fluids and solids" },
  { id: "phys-4.6.2", topic: "gcse-phys-6", label: "Electromagnetic waves" },
  { id: "phys-4.6.3", topic: "gcse-phys-6", label: "Black body radiation" },

  { id: "phys-4.7.1", topic: "gcse-phys-7", label: "Permanent and induced magnetism" },
  { id: "phys-4.7.2", topic: "gcse-phys-7", label: "The motor effect" },
  { id: "phys-4.7.3", topic: "gcse-phys-7", label: "Induced potential and transformers" },

  { id: "phys-4.8.1", topic: "gcse-phys-8", label: "Solar system and orbital motion" },
  { id: "phys-4.8.2", topic: "gcse-phys-8", label: "Red-shift" },

  // ================= KS3 Biology =================
  { id: "ks3-cells-a", topic: "ks3-cells", label: "Using a microscope" },
  { id: "ks3-cells-b", topic: "ks3-cells", label: "Animal and plant cells" },
  { id: "ks3-cells-c", topic: "ks3-cells", label: "Specialised cells" },
  { id: "ks3-cells-d", topic: "ks3-cells", label: "Cells, tissues and organs" },
  { id: "ks3-cells-e", topic: "ks3-cells", label: "Diffusion in cells" },

  { id: "ks3-reproduction-a", topic: "ks3-reproduction", label: "Human reproductive systems" },
  { id: "ks3-reproduction-b", topic: "ks3-reproduction", label: "Fertilisation and pregnancy" },
  { id: "ks3-reproduction-c", topic: "ks3-reproduction", label: "Puberty and the menstrual cycle" },
  { id: "ks3-reproduction-d", topic: "ks3-reproduction", label: "Flowers and pollination" },
  { id: "ks3-reproduction-e", topic: "ks3-reproduction", label: "Seeds and dispersal" },

  { id: "ks3-ecosystems-a", topic: "ks3-ecosystems", label: "Habitats and adaptations" },
  { id: "ks3-ecosystems-b", topic: "ks3-ecosystems", label: "Food chains and food webs" },
  { id: "ks3-ecosystems-c", topic: "ks3-ecosystems", label: "Competition and interdependence" },
  { id: "ks3-ecosystems-d", topic: "ks3-ecosystems", label: "Sampling populations" },
  { id: "ks3-ecosystems-e", topic: "ks3-ecosystems", label: "Human impact on ecosystems" },

  { id: "ks3-skeleton-a", topic: "ks3-skeleton", label: "Functions of the skeleton" },
  { id: "ks3-skeleton-b", topic: "ks3-skeleton", label: "Bones and joints" },
  { id: "ks3-skeleton-c", topic: "ks3-skeleton", label: "Muscles and antagonistic pairs" },
  { id: "ks3-skeleton-d", topic: "ks3-skeleton", label: "Movement and forces" },

  { id: "ks3-nutrition-a", topic: "ks3-nutrition", label: "A balanced diet" },
  { id: "ks3-nutrition-b", topic: "ks3-nutrition", label: "Food tests" },
  { id: "ks3-nutrition-c", topic: "ks3-nutrition", label: "The digestive system" },
  { id: "ks3-nutrition-d", topic: "ks3-nutrition", label: "Enzymes and digestion" },
  { id: "ks3-nutrition-e", topic: "ks3-nutrition", label: "Diet and health" },

  { id: "ks3-gas-exchange-a", topic: "ks3-gas-exchange", label: "The breathing system" },
  { id: "ks3-gas-exchange-b", topic: "ks3-gas-exchange", label: "Breathing movements" },
  { id: "ks3-gas-exchange-c", topic: "ks3-gas-exchange", label: "Gas exchange in the alveoli" },
  { id: "ks3-gas-exchange-d", topic: "ks3-gas-exchange", label: "Gas exchange in plants" },
  { id: "ks3-gas-exchange-e", topic: "ks3-gas-exchange", label: "Exercise and lung disease" },

  { id: "ks3-health-a", topic: "ks3-health", label: "Health and lifestyle" },
  { id: "ks3-health-b", topic: "ks3-health", label: "Smoking and its effects" },
  { id: "ks3-health-c", topic: "ks3-health", label: "Alcohol and other drugs" },
  { id: "ks3-health-d", topic: "ks3-health", label: "Microorganisms and disease" },
  { id: "ks3-health-e", topic: "ks3-health", label: "Defending the body" },

  { id: "ks3-photosynthesis-a", topic: "ks3-photosynthesis", label: "The photosynthesis reaction" },
  { id: "ks3-photosynthesis-b", topic: "ks3-photosynthesis", label: "Leaves and plant transport" },
  { id: "ks3-photosynthesis-c", topic: "ks3-photosynthesis", label: "Testing leaves for starch" },
  { id: "ks3-photosynthesis-d", topic: "ks3-photosynthesis", label: "Limiting factors" },
  { id: "ks3-photosynthesis-e", topic: "ks3-photosynthesis", label: "Plant minerals" },

  { id: "ks3-respiration-a", topic: "ks3-respiration", label: "Aerobic respiration" },
  { id: "ks3-respiration-b", topic: "ks3-respiration", label: "Anaerobic respiration" },
  { id: "ks3-respiration-c", topic: "ks3-respiration", label: "Fermentation and its uses" },
  { id: "ks3-respiration-d", topic: "ks3-respiration", label: "Respiration and exercise" },
  { id: "ks3-respiration-e", topic: "ks3-respiration", label: "Investigating respiration" },

  { id: "ks3-inheritance-a", topic: "ks3-inheritance", label: "DNA, genes and chromosomes" },
  { id: "ks3-inheritance-b", topic: "ks3-inheritance", label: "Discovering DNA structure" },
  { id: "ks3-inheritance-c", topic: "ks3-inheritance", label: "Variation" },
  { id: "ks3-inheritance-d", topic: "ks3-inheritance", label: "Species and biodiversity" },
  { id: "ks3-inheritance-e", topic: "ks3-inheritance", label: "Natural selection and extinction" },

  // ================= KS3 Chemistry =================
  { id: "ks3-particles-a", topic: "ks3-particles", label: "States of matter" },
  { id: "ks3-particles-b", topic: "ks3-particles", label: "Changes of state" },
  { id: "ks3-particles-c", topic: "ks3-particles", label: "Evaporation and condensation" },
  { id: "ks3-particles-d", topic: "ks3-particles", label: "Diffusion" },
  { id: "ks3-particles-e", topic: "ks3-particles", label: "Gas pressure and compression" },

  { id: "ks3-atoms-a", topic: "ks3-atoms", label: "Atoms and elements" },
  { id: "ks3-atoms-b", topic: "ks3-atoms", label: "Compounds and formulae" },
  { id: "ks3-atoms-c", topic: "ks3-atoms", label: "Elements, compounds and mixtures" },
  { id: "ks3-atoms-d", topic: "ks3-atoms", label: "Conservation of mass" },

  { id: "ks3-separating-a", topic: "ks3-separating", label: "Pure substances and mixtures" },
  { id: "ks3-separating-b", topic: "ks3-separating", label: "Solutions and solubility" },
  { id: "ks3-separating-c", topic: "ks3-separating", label: "Filtration and crystallisation" },
  { id: "ks3-separating-d", topic: "ks3-separating", label: "Distillation" },
  { id: "ks3-separating-e", topic: "ks3-separating", label: "Chromatography" },

  { id: "ks3-acids-a", topic: "ks3-acids", label: "Acids, alkalis and safety" },
  { id: "ks3-acids-b", topic: "ks3-acids", label: "The pH scale and indicators" },
  { id: "ks3-acids-c", topic: "ks3-acids", label: "Neutralisation" },
  { id: "ks3-acids-d", topic: "ks3-acids", label: "Reactions of acids and salts" },

  { id: "ks3-reactions-a", topic: "ks3-reactions", label: "Chemical changes and equations" },
  { id: "ks3-reactions-b", topic: "ks3-reactions", label: "Combustion and fuels" },
  { id: "ks3-reactions-c", topic: "ks3-reactions", label: "Oxidation, decomposition, rusting" },
  { id: "ks3-reactions-d", topic: "ks3-reactions", label: "Displacement and reactivity" },
  { id: "ks3-reactions-e", topic: "ks3-reactions", label: "Rates and conservation of mass" },

  { id: "ks3-periodic-table-a", topic: "ks3-periodic-table", label: "Metals and non-metals" },
  { id: "ks3-periodic-table-b", topic: "ks3-periodic-table", label: "Arranging the periodic table" },
  { id: "ks3-periodic-table-c", topic: "ks3-periodic-table", label: "Group 1: the alkali metals" },
  { id: "ks3-periodic-table-d", topic: "ks3-periodic-table", label: "Group 7: the halogens" },
  { id: "ks3-periodic-table-e", topic: "ks3-periodic-table", label: "Group 0: the noble gases" },

  { id: "ks3-earth-a", topic: "ks3-earth", label: "Earth structure and rocks" },
  { id: "ks3-earth-b", topic: "ks3-earth", label: "Weathering and erosion" },
  { id: "ks3-earth-c", topic: "ks3-earth", label: "The Earth's atmosphere" },
  { id: "ks3-earth-d", topic: "ks3-earth", label: "Climate change and pollution" },
  { id: "ks3-earth-e", topic: "ks3-earth", label: "Resources and recycling" },

  { id: "ks3-energetics-a", topic: "ks3-energetics", label: "Exothermic and endothermic" },
  { id: "ks3-energetics-b", topic: "ks3-energetics", label: "Energy and changes of state" },
  { id: "ks3-energetics-c", topic: "ks3-energetics", label: "Everyday energy changes" },
  { id: "ks3-energetics-d", topic: "ks3-energetics", label: "Measuring temperature change" },
  { id: "ks3-energetics-e", topic: "ks3-energetics", label: "Comparing fuels" },

  { id: "ks3-materials-a", topic: "ks3-materials", label: "Metals and alloys" },
  { id: "ks3-materials-b", topic: "ks3-materials", label: "Ceramics and glass" },
  { id: "ks3-materials-c", topic: "ks3-materials", label: "Polymers" },
  { id: "ks3-materials-d", topic: "ks3-materials", label: "Composite materials" },
  { id: "ks3-materials-e", topic: "ks3-materials", label: "Choosing and extracting materials" },

  // ================= KS3 Physics =================
  { id: "ks3-forces-a", topic: "ks3-forces", label: "Measuring forces" },
  { id: "ks3-forces-b", topic: "ks3-forces", label: "Mass and weight" },
  { id: "ks3-forces-c", topic: "ks3-forces", label: "Speed and motion" },
  { id: "ks3-forces-d", topic: "ks3-forces", label: "Balanced and unbalanced forces" },
  { id: "ks3-forces-e", topic: "ks3-forces", label: "Moments and springs" },

  { id: "ks3-energy-a", topic: "ks3-energy", label: "Energy stores" },
  { id: "ks3-energy-b", topic: "ks3-energy", label: "Energy transfers and conservation" },
  { id: "ks3-energy-c", topic: "ks3-energy", label: "Conduction, convection, radiation" },
  { id: "ks3-energy-d", topic: "ks3-energy", label: "Insulation and the home" },
  { id: "ks3-energy-e", topic: "ks3-energy", label: "Energy resources" },

  { id: "ks3-space-a", topic: "ks3-space", label: "The Solar System" },
  { id: "ks3-space-b", topic: "ks3-space", label: "Day, night and the seasons" },
  { id: "ks3-space-c", topic: "ks3-space", label: "The Moon and eclipses" },
  { id: "ks3-space-d", topic: "ks3-space", label: "Gravity and weight in space" },
  { id: "ks3-space-e", topic: "ks3-space", label: "Stars and galaxies" },

  { id: "ks3-electricity-a", topic: "ks3-electricity", label: "Current and potential difference" },
  { id: "ks3-electricity-b", topic: "ks3-electricity", label: "Series and parallel circuits" },
  { id: "ks3-electricity-c", topic: "ks3-electricity", label: "Resistance" },
  { id: "ks3-electricity-d", topic: "ks3-electricity", label: "Static electricity" },
  { id: "ks3-electricity-e", topic: "ks3-electricity", label: "Conductors, insulators, safety" },

  { id: "ks3-sound-a", topic: "ks3-sound", label: "How sound is made and travels" },
  { id: "ks3-sound-b", topic: "ks3-sound", label: "Frequency, pitch and volume" },
  { id: "ks3-sound-c", topic: "ks3-sound", label: "Speed of sound and echoes" },
  { id: "ks3-sound-d", topic: "ks3-sound", label: "Hearing and ultrasound" },
  { id: "ks3-sound-e", topic: "ks3-sound", label: "Using and reducing sound" },

  { id: "ks3-light-a", topic: "ks3-light", label: "How light travels" },
  { id: "ks3-light-b", topic: "ks3-light", label: "Reflection" },
  { id: "ks3-light-c", topic: "ks3-light", label: "Refraction and lenses" },
  { id: "ks3-light-d", topic: "ks3-light", label: "Colour and filters" },
  { id: "ks3-light-e", topic: "ks3-light", label: "The eye and seeing" },

  { id: "ks3-matter-a", topic: "ks3-matter", label: "Particle model and diffusion" },
  { id: "ks3-matter-b", topic: "ks3-matter", label: "Density" },
  { id: "ks3-matter-c", topic: "ks3-matter", label: "Pressure in solids" },
  { id: "ks3-matter-d", topic: "ks3-matter", label: "Pressure in fluids and gases" },
  { id: "ks3-matter-e", topic: "ks3-matter", label: "Changes of state and expansion" },

  { id: "ks3-magnetism-a", topic: "ks3-magnetism", label: "Magnets and magnetic materials" },
  { id: "ks3-magnetism-b", topic: "ks3-magnetism", label: "Magnetic fields" },
  { id: "ks3-magnetism-c", topic: "ks3-magnetism", label: "Electromagnets" },
  { id: "ks3-magnetism-d", topic: "ks3-magnetism", label: "Uses of electromagnets" }

];
