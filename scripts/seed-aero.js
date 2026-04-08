const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const standards = [
  // ── Aviation Science (AVS) ─────────────────────────────────────────────────
  {
    code: 'AERO.AVS.9.1',
    description: 'Identify and explain the four forces of flight — lift, weight, thrust, and drag — and describe how each force affects an aircraft in steady level flight.',
    gradeLevel: 9,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.9.2',
    description: 'Describe Bernoulli\'s Principle and Newton\'s Third Law of Motion and apply both concepts to explain how an airfoil generates lift.',
    gradeLevel: 9,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.9.3',
    description: 'Identify the primary flight control surfaces (ailerons, elevator, rudder) and explain how each controls aircraft movement about the longitudinal, lateral, and vertical axes.',
    gradeLevel: 9,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.9.4',
    description: 'Explain the effects of angle of attack on lift and drag, and describe the conditions under which an airfoil will stall.',
    gradeLevel: 9,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.10.1',
    description: 'Identify the major components of a reciprocating piston engine and describe the four-stroke combustion cycle (intake, compression, power, exhaust).',
    gradeLevel: 10,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.10.2',
    description: 'Describe the operating principles of a turbine engine, including the compressor, combustion chamber, turbine, and exhaust sections, and compare thrust output to a piston engine.',
    gradeLevel: 10,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.10.3',
    description: 'Explain the function and operation of the aircraft fuel system, including fuel types, fuel grades, and the risks of fuel contamination and misfueling.',
    gradeLevel: 10,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.10.4',
    description: 'Interpret basic flight instruments including the airspeed indicator, altimeter, and vertical speed indicator, and explain their operating principles.',
    gradeLevel: 10,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.11.1',
    description: 'Analyze the effects of aircraft weight, balance, and center of gravity on flight performance and stability, and perform basic weight-and-balance calculations.',
    gradeLevel: 11,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.11.2',
    description: 'Explain the concepts of aircraft stability — longitudinal, lateral, and directional — and describe how design features such as dihedral and sweep promote stable flight.',
    gradeLevel: 11,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.11.3',
    description: 'Describe the effects of high-altitude flight on aircraft performance, including density altitude, true airspeed versus indicated airspeed, and engine power output.',
    gradeLevel: 11,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.12.1',
    description: 'Evaluate the performance characteristics of different aircraft categories (single-engine, multi-engine, jet) using pilot operating handbook data for takeoff distance, climb rate, and landing distance.',
    gradeLevel: 12,
    subject: 'Aviation Science',
  },
  {
    code: 'AERO.AVS.12.2',
    description: 'Describe advanced aerodynamic phenomena including wake turbulence, wingtip vortices, and ground effect, and explain the associated safety precautions.',
    gradeLevel: 12,
    subject: 'Aviation Science',
  },

  // ── Aerospace Exploration (AXS) ────────────────────────────────────────────
  {
    code: 'AERO.AXS.9.1',
    description: 'Describe the structure of the solar system and explain the orbital mechanics that govern the movement of planets, moons, and artificial satellites using Kepler\'s laws.',
    gradeLevel: 9,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.9.2',
    description: 'Identify the layers of Earth\'s atmosphere (troposphere, stratosphere, mesosphere, thermosphere, exosphere) and describe the physical properties of each relevant to aerospace operations.',
    gradeLevel: 9,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.9.3',
    description: 'Explain the basic principles of rocketry, including Newton\'s Third Law applied to thrust, specific impulse, and the rocket equation (Tsiolkovsky), and calculate estimated delta-v for simple scenarios.',
    gradeLevel: 9,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.10.1',
    description: 'Compare and contrast chemical, ion, and nuclear propulsion systems in terms of thrust, specific impulse, and suitability for different mission profiles.',
    gradeLevel: 10,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.10.2',
    description: 'Describe the concept of orbital insertion, orbital transfer maneuvers (Hohmann transfer), and re-entry, and explain the energy considerations involved.',
    gradeLevel: 10,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.10.3',
    description: 'Identify major milestones in robotic space exploration (Sputnik, Voyager, Mars rovers, James Webb Space Telescope) and explain the scientific objectives and findings of each mission.',
    gradeLevel: 10,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.11.1',
    description: 'Analyze the challenges of human spaceflight including microgravity effects on the human body, radiation exposure, life support requirements, and psychological isolation.',
    gradeLevel: 11,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.11.2',
    description: 'Describe the design and operation of space launch vehicles, including multi-stage rockets, payload fairings, and launch trajectory optimization, using current commercial and government launch vehicles as examples.',
    gradeLevel: 11,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.12.1',
    description: 'Evaluate the feasibility and design considerations for future human missions to the Moon and Mars, including propulsion, life support, surface operations, and return mission planning.',
    gradeLevel: 12,
    subject: 'Aerospace Exploration',
  },
  {
    code: 'AERO.AXS.12.2',
    description: 'Analyze the scientific principles behind space telescopes and remote sensing satellites, including electromagnetic spectrum utilization, resolution, and data transmission.',
    gradeLevel: 12,
    subject: 'Aerospace Exploration',
  },

  // ── Aerospace Engineering (AEM) ────────────────────────────────────────────
  {
    code: 'AERO.AEM.9.1',
    description: 'Apply the engineering design process — define, research, brainstorm, prototype, test, evaluate, redesign — to solve a basic aeronautical design challenge such as building a glider with maximum glide ratio.',
    gradeLevel: 9,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.9.2',
    description: 'Identify common aerospace materials (aluminum alloys, titanium, composites, steel) and explain the trade-offs between strength, weight, cost, and corrosion resistance for aircraft structures.',
    gradeLevel: 9,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.10.1',
    description: 'Describe the primary structural components of an aircraft (fuselage, wing spar, ribs, skin) and explain how each contributes to carrying flight loads including bending, torsion, and shear.',
    gradeLevel: 10,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.10.2',
    description: 'Explain the concept of factor of safety in structural engineering and describe how fatigue, stress concentration, and cyclic loading influence aircraft structural design and inspection intervals.',
    gradeLevel: 10,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.10.3',
    description: 'Apply basic aerodynamic analysis tools (lift equation, drag polar, L/D ratio) to compare the efficiency of different wing configurations including aspect ratio, taper, and sweep.',
    gradeLevel: 10,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.11.1',
    description: 'Design a basic unmanned aerial vehicle (UAV) airframe, selecting wing geometry, propulsion system, and materials to meet a defined payload and endurance requirement.',
    gradeLevel: 11,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.11.2',
    description: 'Explain computational fluid dynamics (CFD) as an engineering tool, describe how simulation replaces or supplements wind tunnel testing, and interpret basic CFD output including pressure distribution and boundary layer behavior.',
    gradeLevel: 11,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.12.1',
    description: 'Conduct a systems engineering analysis of a complete aircraft design, integrating propulsion, aerodynamics, structures, avionics, and human factors into a cohesive design concept with defined performance metrics.',
    gradeLevel: 12,
    subject: 'Aerospace Engineering',
  },
  {
    code: 'AERO.AEM.12.2',
    description: 'Evaluate the role of airworthiness certification (FAA Part 23/25, EASA CS-23/25) in the aircraft design process and describe the testing requirements a new aircraft design must meet before entering service.',
    gradeLevel: 12,
    subject: 'Aerospace Engineering',
  },

  // ── Aerospace History (AEH) ────────────────────────────────────────────────
  {
    code: 'AERO.AEH.9.1',
    description: 'Describe the contributions of Orville and Wilbur Wright to powered flight, including their experimental methodology, the significance of wing warping for control, and the events at Kitty Hawk in December 1903.',
    gradeLevel: 9,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.9.2',
    description: 'Trace the development of aviation from World War I biplanes through the interwar Golden Age of Aviation, identifying key figures such as Charles Lindbergh, Amelia Earhart, and Jimmy Doolittle.',
    gradeLevel: 9,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.10.1',
    description: 'Explain how World War II accelerated aviation technology, including the development of the jet engine (Whittle and von Ohain), long-range bombers, and pressurized cabins.',
    gradeLevel: 10,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.10.2',
    description: 'Describe the Space Race between the United States and Soviet Union, including Sputnik, Vostok 1, the Apollo program, and the Moon landing of July 1969, in their Cold War geopolitical context.',
    gradeLevel: 10,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.11.1',
    description: 'Analyze the development of commercial aviation from the Douglas DC-3 through the Boeing 707 jet age to the wide-body era, and explain how these aircraft transformed global transportation and economies.',
    gradeLevel: 11,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.11.2',
    description: 'Describe the development of the Space Shuttle program, including its design rationale, operational history, the Challenger and Columbia accidents, and the lessons learned that influenced subsequent spacecraft design.',
    gradeLevel: 11,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.12.1',
    description: 'Evaluate the rise of commercial spaceflight, including the contributions of SpaceX, Blue Origin, Virgin Galactic, and Rocket Lab, and analyze how private investment is reshaping access to orbit.',
    gradeLevel: 12,
    subject: 'Aerospace History',
  },
  {
    code: 'AERO.AEH.12.2',
    description: 'Analyze the international dimensions of aerospace history, including the development of Airbus as a European consortium, the role of JAXA and ESA in space exploration, and cooperation on the International Space Station.',
    gradeLevel: 12,
    subject: 'Aerospace History',
  },

  // ── Aviation and Space Safety (AAS) ────────────────────────────────────────
  {
    code: 'AERO.AAS.9.1',
    description: 'Explain the concept of a safety culture in aviation and describe how human factors such as complacency, distraction, fatigue, and spatial disorientation contribute to aviation accidents.',
    gradeLevel: 9,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.9.2',
    description: 'Describe the hierarchy of controls (elimination, substitution, engineering controls, administrative controls, PPE) and apply it to identify and mitigate risks in an aviation maintenance environment.',
    gradeLevel: 9,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.10.1',
    description: 'Apply the DECIDE model (Detect, Estimate, Choose, Identify, Do, Evaluate) to a simulated in-flight emergency scenario, demonstrating systematic aeronautical decision-making.',
    gradeLevel: 10,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.10.2',
    description: 'Describe the IMSAFE checklist (Illness, Medication, Stress, Alcohol, Fatigue, Emotion) and explain how each factor can impair pilot performance and judgment.',
    gradeLevel: 10,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.11.1',
    description: 'Analyze real accident case studies from the NTSB accident database to identify causal chains, identify contributing human factors, and propose corrective safety measures.',
    gradeLevel: 11,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.11.2',
    description: 'Describe emergency procedures for common in-flight emergencies including engine failure after takeoff, electrical failure, inadvertent IMC entry, and cabin depressurization.',
    gradeLevel: 11,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.12.1',
    description: 'Evaluate Safety Management System (SMS) frameworks used by airlines and MRO organizations, including hazard identification, risk assessment matrices, safety assurance, and safety promotion.',
    gradeLevel: 12,
    subject: 'Aviation and Space Safety',
  },
  {
    code: 'AERO.AAS.12.2',
    description: 'Describe the unique safety challenges of human spaceflight, including launch abort systems, EVA hazards, micrometeorite risk, and emergency return procedures from orbit.',
    gradeLevel: 12,
    subject: 'Aviation and Space Safety',
  },

  // ── Meteorology (MET) ─────────────────────────────────────────────────────
  {
    code: 'AERO.MET.9.1',
    description: 'Describe the composition and structure of the atmosphere, explain how solar energy drives atmospheric circulation, and identify how temperature, pressure, and humidity interact to produce weather.',
    gradeLevel: 9,
    subject: 'Meteorology',
  },
  {
    code: 'AERO.MET.9.2',
    description: 'Explain how frontal systems (cold, warm, stationary, occluded) form and move, and describe the typical weather patterns associated with each front type.',
    gradeLevel: 9,
    subject: 'Meteorology',
  },
  {
    code: 'AERO.MET.10.1',
    description: 'Interpret standard aviation weather products including METARs, TAFs, PIREPs, SIGMETs, AIRMETs, and area forecasts, and use them to conduct a preflight weather briefing.',
    gradeLevel: 10,
    subject: 'Meteorology',
  },
  {
    code: 'AERO.MET.10.2',
    description: 'Explain the formation, types (cumulus, stratus, cirrus, cumulonimbus), and flight hazards associated with clouds, and describe the ceiling and visibility minimums for VFR and IFR flight.',
    gradeLevel: 10,
    subject: 'Meteorology',
  },
  {
    code: 'AERO.MET.11.1',
    description: 'Describe aviation-specific weather hazards including structural icing, thunderstorm embedded in overcast, microburst, wind shear, mountain wave turbulence, and fog, and explain avoidance strategies for each.',
    gradeLevel: 11,
    subject: 'Meteorology',
  },
  {
    code: 'AERO.MET.11.2',
    description: 'Explain how density altitude is calculated from pressure altitude and temperature, and analyze its effect on aircraft takeoff performance, climb rate, and engine power output at high-elevation airports.',
    gradeLevel: 11,
    subject: 'Meteorology',
  },
  {
    code: 'AERO.MET.12.1',
    description: 'Analyze upper-level weather charts, jet stream forecasts, and prog charts to plan a cross-country flight routing that minimizes headwinds, avoids hazardous weather, and meets fuel range requirements.',
    gradeLevel: 12,
    subject: 'Meteorology',
  },

  // ── Navigation (NAV) ──────────────────────────────────────────────────────
  {
    code: 'AERO.NAV.9.1',
    description: 'Explain the fundamentals of sectional aeronautical charts including scale, symbols, contour lines, airspace classifications, and how to determine true course and magnetic course using a plotter and E6B.',
    gradeLevel: 9,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.9.2',
    description: 'Describe dead reckoning navigation principles, and plan a VFR cross-country flight by calculating true course, wind correction angle, magnetic heading, true airspeed, groundspeed, and estimated time en route.',
    gradeLevel: 9,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.10.1',
    description: 'Explain how VOR (VHF Omnidirectional Range) navigation works, interpret VOR course deviation indicator (CDI) indications, and demonstrate tracking to and from a VOR station on a simulated chart problem.',
    gradeLevel: 10,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.10.2',
    description: 'Describe how GPS navigation operates using satellite triangulation, explain RAIM (Receiver Autonomous Integrity Monitoring), and compare GPS accuracy and reliability to traditional ground-based navigation aids.',
    gradeLevel: 10,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.11.1',
    description: 'Interpret IFR en-route charts, SIDs, STARs, and instrument approach procedure plates, and explain how IFR flight plans are filed and cleared through the National Airspace System.',
    gradeLevel: 11,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.11.2',
    description: 'Describe RNAV (Area Navigation) and RNP (Required Navigation Performance) concepts, explain how performance-based navigation improves route efficiency and approach minimums, and identify PBN designators on approach charts.',
    gradeLevel: 11,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.12.1',
    description: 'Plan and brief a complete IFR cross-country flight including alternate airport selection, fuel planning, NOTAM review, TFR checking, filing procedures, and lost communication contingency procedures.',
    gradeLevel: 12,
    subject: 'Navigation',
  },
  {
    code: 'AERO.NAV.12.2',
    description: 'Describe oceanic and polar navigation techniques used in long-range operations, including NAT tracks, MNPS airspace requirements, HF communication, and the use of inertial navigation systems (INS/IRS).',
    gradeLevel: 12,
    subject: 'Navigation',
  },
]

async function main() {
  console.log('Seeding AERO standards...')
  let created = 0

  for (const standard of standards) {
    await prisma.aeroStandard.upsert({
      where: { code: standard.code },
      create: standard,
      update: { description: standard.description },
    })
    created++
  }

  console.log(`Done: ${created} standards upserted`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
