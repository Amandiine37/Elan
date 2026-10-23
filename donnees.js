/* ==================================================================
   Élan — contenus de l'application (aucune donnée personnelle ici).
   - ACTIVITES : types de séance affichés dans les semainiers
   - EXERCICES : bibliothèque utilisée par le générateur de programme
   - RECETTES, BONUS : contenus à débloquer
   - THEMES : palettes de couleurs (dont celles à débloquer)
   - RECOMPENSES : les paliers et ce qu'ils débloquent
   ================================================================== */

var ACTIVITES = {
  renfo:    { e: "💪", nom: "Renforcement" },
  muscu:    { e: "🏋️", nom: "Musculation" },
  hiit:     { e: "⚡", nom: "HIIT / circuit" },
  course:   { e: "🏃", nom: "Course" },
  marche:   { e: "🚶", nom: "Marche" },
  velo:     { e: "🚴", nom: "Vélo" },
  natation: { e: "🏊", nom: "Natation" },
  yoga:     { e: "🧘", nom: "Yoga" },
  pilates:  { e: "🤸", nom: "Pilates / gainage" },
  etirements:{ e: "🙆", nom: "Étirements" },
  rando:    { e: "🥾", nom: "Randonnée" },
  danse:    { e: "💃", nom: "Danse" },
  collectif:{ e: "⚽", nom: "Sport collectif" },
  raquette: { e: "🎾", nom: "Raquette" },
  combat:   { e: "🥊", nom: "Boxe / combat" },
  autre:    { e: "⭐", nom: "Autre" }
};

/* Bibliothèque d'exercices.
   c  : catégorie (force, cardio, gainage, mobilite)
   z  : zones (jambes, haut, abdos, dos)
   m  : matériel — l'un des éléments suffit ("aucun" = poids du corps)
   imp: 1 = avec sauts (exclu si « sans saut » ou genoux fragiles)
   gen: 1 = sollicite beaucoup les genoux
   dos: 1 = déconseillé si dos sensible
   nv : niveau minimum (1 débutant, 2 intermédiaire, 3 confirmé)
   iso: 1 = exercice tenu (en secondes) ; uni: 1 = par côté          */
var EXERCICES = [
  // ---- Jambes, poids du corps
  { n: "Squat", c: "force", z: ["jambes"], m: ["aucun"], nv: 1, t: "Pieds largeur d'épaules, descends comme pour t'asseoir, dos droit, genoux dans l'axe des pieds." },
  { n: "Fente arrière alternée", c: "force", z: ["jambes"], m: ["aucun"], gen: 1, nv: 1, uni: 1, t: "Recule une jambe, descends le genou arrière vers le sol, le genou avant reste au-dessus de la cheville." },
  { n: "Pont fessier", c: "force", z: ["jambes", "dos"], m: ["aucun"], nv: 1, t: "Allongé·e sur le dos, pieds à plat, pousse dans les talons pour monter le bassin, serre les fessiers en haut." },
  { n: "Pont fessier sur une jambe", c: "force", z: ["jambes"], m: ["aucun"], nv: 2, uni: 1, t: "Comme le pont fessier, une jambe tendue en l'air. Le bassin reste bien horizontal." },
  { n: "Chaise contre le mur", c: "force", z: ["jambes"], m: ["aucun"], gen: 1, nv: 1, iso: 1, t: "Dos collé au mur, cuisses parallèles au sol, genoux à 90°. Respire calmement." },
  { n: "Montée sur marche", c: "force", z: ["jambes"], m: ["aucun"], nv: 1, uni: 1, t: "Sur une marche d'escalier ou un step stable : monte en poussant dans le talon, redescends lentement." },
  { n: "Squat sumo", c: "force", z: ["jambes"], m: ["aucun"], nv: 1, t: "Pieds écartés, pointes vers l'extérieur, descends en gardant le buste droit." },
  { n: "Fente latérale", c: "force", z: ["jambes"], m: ["aucun"], gen: 1, nv: 2, uni: 1, t: "Grand pas sur le côté, fléchis la jambe d'appui, l'autre reste tendue. Fesses vers l'arrière." },
  { n: "Squat sauté", c: "force", z: ["jambes"], m: ["aucun"], imp: 1, gen: 1, nv: 2, t: "Squat puis saute en extension. Atterris en douceur, genoux souples." },
  { n: "Mollets sur marche", c: "force", z: ["jambes"], m: ["aucun"], nv: 1, t: "Pointes de pieds sur une marche, monte sur la pointe puis descends les talons sous la marche." },
  // ---- Haut du corps, poids du corps
  { n: "Pompes sur les genoux", c: "force", z: ["haut"], m: ["aucun"], nv: 1, t: "Mains sous les épaules, genoux au sol, corps aligné des genoux à la tête. Descends la poitrine près du sol." },
  { n: "Pompes", c: "force", z: ["haut", "abdos"], m: ["aucun"], nv: 2, t: "Corps gainé comme une planche, coudes à 45° du corps, poitrine près du sol." },
  { n: "Pompes pieds surélevés", c: "force", z: ["haut"], m: ["aucun"], nv: 3, t: "Pieds sur une chaise ou un canapé : plus dur, sollicite le haut des pectoraux et les épaules." },
  { n: "Pompes contre le mur", c: "force", z: ["haut"], m: ["aucun"], nv: 1, t: "Mains contre le mur, un pas en arrière, plie les coudes jusqu'à approcher le mur." },
  { n: "Dips sur chaise", c: "force", z: ["haut"], m: ["aucun"], nv: 1, t: "Mains sur le bord d'une chaise stable, fesses dans le vide, plie les coudes vers l'arrière." },
  { n: "Pompes en pike (épaules)", c: "force", z: ["haut"], m: ["aucun"], nv: 2, t: "Fesses hautes en V inversé, descends la tête vers le sol entre tes mains." },
  // ---- Dos et posture
  { n: "Superman", c: "force", z: ["dos"], m: ["aucun"], nv: 1, t: "À plat ventre, décolle bras et jambes tendus, regard vers le sol, sans forcer sur la nuque." },
  { n: "Bird dog", c: "gainage", z: ["dos", "abdos"], m: ["aucun"], nv: 1, uni: 1, t: "À quatre pattes, tends bras droit et jambe gauche, dos plat, puis change de côté lentement." },
  { n: "Y-T-W au sol", c: "force", z: ["dos", "haut"], m: ["aucun"], nv: 1, t: "À plat ventre, dessine les lettres Y, T puis W avec les bras en serrant les omoplates." },
  // ---- Gainage / abdos
  { n: "Planche", c: "gainage", z: ["abdos"], m: ["aucun"], nv: 1, iso: 1, t: "Sur les avant-bras, corps aligné, nombril rentré, fesses ni trop hautes ni trop basses." },
  { n: "Planche latérale", c: "gainage", z: ["abdos"], m: ["aucun"], nv: 1, iso: 1, uni: 1, t: "Sur un avant-bras, hanches hautes, corps aligné. Version facile : genou du bas au sol." },
  { n: "Dead bug", c: "gainage", z: ["abdos"], m: ["aucun"], nv: 1, t: "Sur le dos, bras et genoux vers le plafond, descends bras et jambe opposés en gardant le bas du dos collé au sol." },
  { n: "Crunch", c: "gainage", z: ["abdos"], m: ["aucun"], nv: 1, t: "Sur le dos, genoux pliés, enroule le haut du dos en soufflant, sans tirer sur la nuque." },
  { n: "Relevés de jambes", c: "gainage", z: ["abdos"], m: ["aucun"], dos: 1, nv: 2, t: "Sur le dos, mains sous les fesses, monte les jambes tendues à la verticale puis redescends lentement." },
  { n: "Planche avec touches d'épaules", c: "gainage", z: ["abdos", "haut"], m: ["aucun"], nv: 2, t: "En planche sur les mains, touche l'épaule opposée sans faire tourner le bassin." },
  { n: "Hollow (bateau creux)", c: "gainage", z: ["abdos"], m: ["aucun"], nv: 3, iso: 1, t: "Sur le dos, épaules et jambes décollées, bas du dos plaqué au sol, corps en banane." },
  { n: "Rotations russes", c: "gainage", z: ["abdos"], m: ["aucun"], dos: 1, nv: 2, t: "Assis·e, buste incliné en arrière, tourne les épaules de gauche à droite." },
  // ---- Cardio
  { n: "Jumping jacks", c: "cardio", z: ["jambes"], m: ["aucun"], imp: 1, nv: 1, t: "Saute en écartant bras et jambes, puis reviens. Reste sur l'avant des pieds." },
  { n: "Jacks sans saut", c: "cardio", z: ["jambes"], m: ["aucun"], nv: 1, t: "Écarte une jambe sur le côté en levant les bras, puis l'autre. Rythme soutenu, zéro impact." },
  { n: "Montées de genoux", c: "cardio", z: ["jambes", "abdos"], m: ["aucun"], imp: 1, nv: 1, t: "Course sur place en montant les genoux à hauteur de hanches, bras actifs." },
  { n: "Marche rapide genoux hauts", c: "cardio", z: ["jambes"], m: ["aucun"], nv: 1, t: "Marche sur place en montant franchement les genoux, sans sauter, bras dynamiques." },
  { n: "Talons-fesses", c: "cardio", z: ["jambes"], m: ["aucun"], imp: 1, nv: 1, t: "Course sur place en ramenant les talons vers les fesses." },
  { n: "Mountain climbers", c: "cardio", z: ["abdos", "haut"], m: ["aucun"], nv: 1, t: "En appui sur les mains, ramène les genoux vers la poitrine l'un après l'autre. Lent = facile, rapide = intense." },
  { n: "Burpees", c: "cardio", z: ["jambes", "haut"], m: ["aucun"], imp: 1, gen: 1, nv: 2, t: "Accroupi·e, pieds en arrière en planche, reviens, puis saute. Version douce : sans saut ni pompe." },
  { n: "Boxe dans le vide", c: "cardio", z: ["haut", "abdos"], m: ["aucun"], nv: 1, t: "Garde haute, enchaîne directs et crochets en pivotant le buste, en restant léger·e sur les appuis." },
  { n: "Patineur", c: "cardio", z: ["jambes"], m: ["aucun"], imp: 1, gen: 1, nv: 2, t: "Bonds latéraux d'une jambe sur l'autre, comme un patineur de vitesse." },
  { n: "Squat + extension des bras", c: "cardio", z: ["jambes", "haut"], m: ["aucun"], nv: 1, t: "Enchaîne un squat et une extension complète des bras au-dessus de la tête, sans sauter." },
  { n: "Sauts à la corde", c: "cardio", z: ["jambes"], m: ["corde"], imp: 1, nv: 1, t: "Petits sauts sur l'avant des pieds, poignets qui tournent, coudes près du corps." },
  { n: "Vélo / home trainer", c: "cardio", z: ["jambes"], m: ["velo"], nv: 1, t: "Cadence régulière, résistance modérée. Augmente la résistance sur les accélérations." },
  { n: "Rameur", c: "cardio", z: ["jambes", "dos", "haut"], m: ["salle"], nv: 1, t: "Pousse d'abord avec les jambes, puis tire avec le dos et les bras. Retour dans l'ordre inverse." },
  { n: "Elliptique", c: "cardio", z: ["jambes"], m: ["salle"], nv: 1, t: "Mouvement ample, buste droit, sans t'appuyer sur les poignées." },
  // ---- Haltères / kettlebell
  { n: "Squat goblet", c: "force", z: ["jambes"], m: ["halteres", "kettlebell"], nv: 1, t: "Une charge tenue contre la poitrine, descends en squat, coudes entre les genoux." },
  { n: "Soulevé de terre jambes semi-tendues", c: "force", z: ["jambes", "dos"], m: ["halteres", "kettlebell"], dos: 1, nv: 2, t: "Charges devant les cuisses, recule les fesses en gardant le dos plat, descends jusqu'aux genoux." },
  { n: "Rowing un bras", c: "force", z: ["dos", "haut"], m: ["halteres", "kettlebell"], nv: 1, uni: 1, t: "Une main en appui sur une chaise, tire l'haltère vers la hanche en serrant l'omoplate." },
  { n: "Développé épaules", c: "force", z: ["haut"], m: ["halteres"], nv: 1, t: "Haltères à hauteur d'épaules, pousse vers le plafond sans cambrer le dos." },
  { n: "Développé couché au sol", c: "force", z: ["haut"], m: ["halteres"], nv: 1, t: "Allongé·e au sol, pousse les haltères vers le plafond, coudes qui touchent légèrement le sol en bas." },
  { n: "Curl biceps", c: "force", z: ["haut"], m: ["halteres", "elastique"], nv: 1, t: "Coudes collés au corps, monte la charge vers les épaules puis redescends lentement." },
  { n: "Extension triceps", c: "force", z: ["haut"], m: ["halteres"], nv: 1, t: "Haltère tenu à deux mains derrière la tête, tends les bras vers le plafond." },
  { n: "Fentes avec haltères", c: "force", z: ["jambes"], m: ["halteres"], gen: 1, nv: 2, uni: 1, t: "Une charge dans chaque main, fente avant ou arrière, buste droit." },
  { n: "Élévations latérales", c: "force", z: ["haut"], m: ["halteres", "elastique"], nv: 1, t: "Bras légèrement fléchis, monte les charges sur les côtés jusqu'à hauteur d'épaules." },
  { n: "Swing kettlebell", c: "force", z: ["jambes", "dos"], m: ["kettlebell"], dos: 1, nv: 2, t: "Charnière de hanche : la poussée vient des fesses, pas des bras. Dos plat." },
  { n: "Thruster", c: "force", z: ["jambes", "haut"], m: ["halteres", "kettlebell"], nv: 2, t: "Squat avec charges aux épaules, puis à la remontée pousse les bras vers le plafond." },
  // ---- Élastiques
  { n: "Tirage élastique", c: "force", z: ["dos"], m: ["elastique"], nv: 1, t: "Élastique accroché devant toi, tire les mains vers le ventre en serrant les omoplates." },
  { n: "Marche latérale élastique", c: "force", z: ["jambes"], m: ["elastique"], nv: 1, t: "Élastique autour des genoux ou des chevilles, mi-squat, pas chassés sur le côté." },
  { n: "Écarté élastique", c: "force", z: ["haut", "dos"], m: ["elastique"], nv: 1, t: "Bras tendus devant toi, écarte l'élastique jusqu'à la poitrine." },
  { n: "Pallof press", c: "gainage", z: ["abdos"], m: ["elastique"], nv: 2, uni: 1, t: "Élastique accroché sur le côté, pousse les mains devant toi sans laisser le buste tourner." },
  // ---- Barre de traction / banc / salle
  { n: "Suspension active", c: "force", z: ["dos", "haut"], m: ["traction"], nv: 1, iso: 1, t: "Suspendu·e à la barre, épaules descendues loin des oreilles, corps gainé." },
  { n: "Tractions négatives", c: "force", z: ["dos", "haut"], m: ["traction"], nv: 2, t: "Monte menton au-dessus de la barre (avec une chaise), puis descends le plus lentement possible." },
  { n: "Tractions", c: "force", z: ["dos", "haut"], m: ["traction"], nv: 3, t: "Prise largeur d'épaules, monte jusqu'au menton au-dessus de la barre, sans élan." },
  { n: "Hip thrust sur banc", c: "force", z: ["jambes"], m: ["banc"], nv: 2, t: "Haut du dos appuyé sur le banc, pousse le bassin vers le haut, menton rentré." },
  { n: "Presse à cuisses", c: "force", z: ["jambes"], m: ["salle"], nv: 1, t: "Pieds largeur de hanches, descends jusqu'à 90° sans décoller le bas du dos." },
  { n: "Tirage vertical à la poulie", c: "force", z: ["dos"], m: ["salle"], nv: 1, t: "Tire la barre vers le haut de la poitrine, buste légèrement incliné, coudes vers le bas." },
  { n: "Développé couché à la barre", c: "force", z: ["haut"], m: ["salle"], nv: 2, t: "Omoplates serrées, descends la barre au milieu de la poitrine, pousse sans décoller les fesses." },
  { n: "Soulevé de terre", c: "force", z: ["jambes", "dos"], m: ["salle"], dos: 1, nv: 3, t: "Barre contre les tibias, dos plat, pousse le sol avec les jambes. Apprends-le avec un coach." },
  // ---- Mobilité / étirements
  { n: "Chat-vache", c: "mobilite", z: ["dos"], m: ["aucun"], nv: 1, t: "À quatre pattes, alterne dos rond en soufflant et dos creux en inspirant, lentement." },
  { n: "Posture de l'enfant", c: "mobilite", z: ["dos"], m: ["aucun"], nv: 1, t: "Fesses vers les talons, bras allongés devant, front au sol. Respire dans le dos." },
  { n: "Chien tête en bas", c: "mobilite", z: ["jambes", "dos", "haut"], m: ["aucun"], nv: 1, t: "V inversé, pousse le sol avec les mains, talons vers le sol (genoux pliés si besoin)." },
  { n: "Étirement des fléchisseurs de hanche", c: "mobilite", z: ["jambes"], m: ["aucun"], nv: 1, uni: 1, t: "Un genou au sol, avance le bassin doucement jusqu'à sentir l'étirement devant la hanche." },
  { n: "Étirement des ischios", c: "mobilite", z: ["jambes"], m: ["aucun"], nv: 1, uni: 1, t: "Une jambe tendue devant, penche le buste dos plat jusqu'à sentir l'arrière de la cuisse." },
  { n: "Étirement des quadriceps", c: "mobilite", z: ["jambes"], m: ["aucun"], nv: 1, uni: 1, t: "Debout, attrape ta cheville derrière toi, genoux serrés, bassin vers l'avant." },
  { n: "Pigeon", c: "mobilite", z: ["jambes"], m: ["aucun"], gen: 1, nv: 2, uni: 1, t: "Jambe avant pliée devant toi, jambe arrière allongée. Étire le fessier, sans douleur au genou." },
  { n: "Rotation thoracique à quatre pattes", c: "mobilite", z: ["dos"], m: ["aucun"], nv: 1, uni: 1, t: "Une main derrière la tête, ouvre le coude vers le plafond en suivant du regard." },
  { n: "Cobra doux", c: "mobilite", z: ["dos", "abdos"], m: ["aucun"], nv: 1, t: "À plat ventre, appuie sur les avant-bras et ouvre la poitrine, sans pincer le bas du dos." },
  { n: "Papillon", c: "mobilite", z: ["jambes"], m: ["aucun"], nv: 1, t: "Assis·e, plantes de pieds collées, laisse les genoux descendre vers le sol, dos long." },
  { n: "Étirement des épaules", c: "mobilite", z: ["haut"], m: ["aucun"], nv: 1, uni: 1, t: "Ramène un bras tendu contre la poitrine avec l'autre main." },
  { n: "Étirement des pectoraux au mur", c: "mobilite", z: ["haut"], m: ["aucun"], nv: 1, uni: 1, t: "Avant-bras contre un mur ou un cadre de porte, tourne doucement le buste à l'opposé." },
  { n: "Torsion allongée", c: "mobilite", z: ["dos"], m: ["aucun"], nv: 1, uni: 1, t: "Sur le dos, laisse tomber les genoux d'un côté, regard de l'autre, épaules au sol." },
  { n: "Fente basse avec ouverture", c: "mobilite", z: ["jambes", "dos"], m: ["aucun"], nv: 2, uni: 1, t: "Grande fente, main au sol, ouvre l'autre bras vers le plafond en tournant le buste." },
  { n: "Respiration abdominale", c: "mobilite", z: ["abdos"], m: ["aucun"], nv: 1, t: "Allongé·e, une main sur le ventre : inspire 4 s en gonflant le ventre, souffle 6 s." }
];

/* Échauffement : mouvements doux, choisis selon l'impact autorisé. */
var ECHAUFFEMENT = [
  { n: "Cercles de bras", t: "10 vers l'avant, 10 vers l'arrière, en grandissant le cercle." },
  { n: "Rotations du bassin", t: "Mains sur les hanches, grands cercles dans un sens puis dans l'autre." },
  { n: "Marche sur place dynamique", t: "Monte les genoux, balance les bras, accélère petit à petit." },
  { n: "Squats lents", t: "8 à 10 squats sans forcer, pour réveiller les jambes." },
  { n: "Ouverture de hanches debout", t: "Monte un genou et ouvre-le sur le côté, alterne." },
  { n: "Rotations du buste", t: "Bras relâchés, tourne les épaules à gauche puis à droite." },
  { n: "Jumping jacks légers", t: "Rythme tranquille, juste pour monter en température.", imp: 1 },
  { n: "Petits sauts sur place", t: "Sur l'avant des pieds, souples et légers.", imp: 1 }
];

/* Objectifs proposés dans le générateur. */
var OBJECTIFS = {
  forme:     { e: "🌱", nom: "Me remettre en forme", court: "Remise en forme", type: "circuit" },
  perte:     { e: "🔥", nom: "Perdre du poids / m'affiner", court: "Brûle-graisse", type: "circuit" },
  renfo:     { e: "💪", nom: "Me renforcer, me tonifier", court: "Renfo", type: "force" },
  muscle:    { e: "🏋️", nom: "Prendre du muscle", court: "Prise de muscle", type: "force" },
  endurance: { e: "🫀", nom: "Améliorer mon cardio / endurance", court: "Cardio", type: "cardio" },
  course:    { e: "🏃", nom: "Préparer une course (5 ou 10 km)", court: "Prépa course", type: "course" },
  souplesse: { e: "🤸", nom: "Gagner en souplesse et mobilité", court: "Souplesse", type: "mobilite" },
  dos:       { e: "🧍", nom: "Soulager mon dos, ma posture", court: "Dos & posture", type: "posture" },
  zen:       { e: "🧘", nom: "Me détendre, déstresser", court: "Bien-être", type: "mobilite" }
};

/* Recettes « sportives » à débloquer. */
var RECETTES = {
  "r-energy": {
    titre: "Energy balls cacao-avoine", e: "🍫", temps: "10 min · sans cuisson", pour: "12 boules",
    pourquoi: "Un en-cas facile à glisser dans le sac : sucres lents de l'avoine + bons gras des oléagineux.",
    ingredients: ["100 g de flocons d'avoine", "8 dattes dénoyautées", "2 c. à soupe de purée d'amande (ou beurre de cacahuète)", "1 c. à soupe de cacao non sucré", "1 pincée de sel", "Un peu de noix de coco râpée"],
    etapes: ["Mixe les dattes avec la purée d'amande et 1 c. à soupe d'eau.", "Ajoute l'avoine, le cacao et le sel, mixe par à-coups.", "Forme des boules, roule-les dans la coco.", "Garde-les au frais jusqu'à 1 semaine."]
  },
  "r-bowl": {
    titre: "Bowl récup' saumon-quinoa", e: "🥗", temps: "25 min", pour: "2 bols",
    pourquoi: "Protéines pour réparer les muscles, glucides pour recharger, oméga-3 contre l'inflammation.",
    ingredients: ["120 g de quinoa", "2 pavés de saumon (ou tofu fumé)", "1 avocat", "1 poignée d'épinards", "½ concombre", "1 c. à soupe de graines de sésame", "Sauce : 1 c. à soupe de sauce soja, 1 c. à café de miel, jus d'½ citron"],
    etapes: ["Cuis le quinoa 12 min dans 2 fois son volume d'eau.", "Poêle le saumon 4 min de chaque côté.", "Coupe avocat et concombre.", "Dresse : quinoa, épinards, légumes, saumon émietté, sésame, sauce."]
  },
  "r-pancakes": {
    titre: "Pancakes protéinés à la banane", e: "🥞", temps: "15 min", pour: "8 petits pancakes",
    pourquoi: "Parfaits après une séance du matin : œufs et skyr pour les protéines, banane pour l'énergie.",
    ingredients: ["1 banane bien mûre", "2 œufs", "60 g de flocons d'avoine mixés", "100 g de skyr (ou fromage blanc)", "½ sachet de levure", "Cannelle"],
    etapes: ["Écrase la banane, ajoute les œufs et le skyr.", "Incorpore l'avoine, la levure et la cannelle.", "Cuis de petites louches 2 min par face dans une poêle légèrement huilée.", "Sers avec des fruits rouges."]
  },
  "r-smoothie": {
    titre: "Smoothie vert récup'", e: "🥤", temps: "5 min", pour: "1 grand verre",
    pourquoi: "Hydrate, apporte potassium et magnésium : idéal juste après l'effort.",
    ingredients: ["1 banane", "1 poignée d'épinards", "½ pomme", "1 c. à soupe de graines de chia", "200 ml de lait (ou boisson végétale)", "Quelques feuilles de menthe"],
    etapes: ["Mets tout dans le blender.", "Mixe 1 minute jusqu'à ce que ce soit bien lisse.", "Bois tout de suite, bien frais."]
  },
  "r-oats": {
    titre: "Overnight oats fruits rouges", e: "🫐", temps: "5 min la veille", pour: "1 pot",
    pourquoi: "Petit-déjeuner prêt au réveil, qui tient jusqu'au déjeuner sans coup de barre.",
    ingredients: ["50 g de flocons d'avoine", "125 g de yaourt grec ou skyr", "80 ml de lait", "1 c. à soupe de graines de chia", "1 poignée de fruits rouges", "1 c. à café de miel"],
    etapes: ["Mélange avoine, yaourt, lait, chia et miel dans un pot.", "Ajoute les fruits rouges dessus.", "Ferme et laisse au frigo toute la nuit."]
  },
  "r-wrap": {
    titre: "Wrap poulet-houmous", e: "🌯", temps: "15 min", pour: "2 wraps",
    pourquoi: "Un repas complet à emporter : protéines maigres, légumes et pois chiches.",
    ingredients: ["2 galettes de blé complet", "1 blanc de poulet cuit (ou falafels)", "4 c. à soupe de houmous", "1 carotte râpée", "Quelques feuilles de salade", "Paprika"],
    etapes: ["Tartine les galettes de houmous.", "Ajoute salade, carotte et poulet émincé.", "Saupoudre de paprika, roule serré.", "Coupe en deux, enveloppe dans du papier pour emporter."]
  },
  "r-omelette": {
    titre: "Omelette épinards-feta", e: "🍳", temps: "10 min", pour: "1 personne",
    pourquoi: "Rapide, rassasiante et riche en protéines : le dîner des soirs d'entraînement.",
    ingredients: ["3 œufs", "1 grosse poignée d'épinards", "40 g de feta", "½ oignon", "Poivre, herbes"],
    etapes: ["Fais fondre l'oignon émincé 3 min.", "Ajoute les épinards jusqu'à ce qu'ils tombent.", "Verse les œufs battus, émiette la feta.", "Cuis à feu doux 4 min, plie et sers."]
  },
  "r-salade": {
    titre: "Salade quinoa-pois chiches", e: "🥙", temps: "20 min", pour: "3 portions",
    pourquoi: "Se garde 3 jours au frigo : la lunch box parfaite pour toute la semaine.",
    ingredients: ["150 g de quinoa", "1 boîte de pois chiches rincés", "1 poivron", "10 tomates cerises", "½ oignon rouge", "Persil, menthe", "Vinaigrette : huile d'olive, citron, cumin"],
    etapes: ["Cuis le quinoa et laisse refroidir.", "Coupe les légumes en petits dés.", "Mélange tout avec les herbes et la vinaigrette.", "Laisse reposer 30 min au frais pour que les saveurs se mélangent."]
  }
};

/* Exercices bonus à débloquer : de petits défis à glisser dans la semaine. */
var BONUS = {
  "x-tabata": {
    titre: "Tabata 4 minutes", e: "⏱️", duree: 4, activite: "hiit",
    intro: "Le format le plus court et le plus intense : 8 tours de 20 s à fond, 10 s de repos.",
    etapes: ["Choisis un mouvement : squats, mountain climbers ou jacks sans saut.", "20 s le plus vite possible, en restant propre.", "10 s de repos.", "Recommence 8 fois. C'est fini en 4 minutes !"],
    astuce: "Pour un « double tabata », alterne deux mouvements sur les 8 tours."
  },
  "x-etoile": {
    titre: "Gainage dynamique en étoile", e: "⭐", duree: 8, activite: "pilates",
    intro: "Un enchaînement de planches qui travaille tout le tronc dans les 3 directions.",
    etapes: ["30 s de planche sur les avant-bras.", "30 s de planche latérale à droite.", "30 s de planche, touches d'épaules.", "30 s de planche latérale à gauche.", "30 s de repos, puis recommence 3 fois."],
    astuce: "Si c'est trop dur, pose les genoux : la qualité compte plus que la durée."
  },
  "x-cent": {
    titre: "Le défi des 100", e: "💯", duree: 20, activite: "renfo",
    intro: "100 répétitions de 4 mouvements, découpées comme tu veux, le plus vite possible.",
    etapes: ["100 squats", "100 crunchs", "100 jacks (avec ou sans saut)", "100 secondes de planche au total", "Note ton temps et essaie de le battre le mois prochain."],
    astuce: "Découpe en 10 tours de 10 répétitions : c'est beaucoup plus facile dans la tête."
  },
  "x-soleil": {
    titre: "Salutation au soleil", e: "🌞", duree: 10, activite: "yoga",
    intro: "L'enchaînement de yoga qui réveille tout le corps en quelques minutes.",
    etapes: ["Debout, bras vers le ciel en inspirant.", "Plie-toi en avant en soufflant.", "Recule en planche, descends doucement.", "Cobra en inspirant, chien tête en bas en soufflant (5 respirations).", "Reviens debout. Fais 5 à 8 salutations."],
    astuce: "Synchronise chaque mouvement avec une respiration, c'est le secret."
  },
  "x-echelle": {
    titre: "Burpees en échelle", e: "🪜", duree: 12, activite: "hiit",
    intro: "1 burpee, repos, 2 burpees, repos… jusqu'à 10. Puis redescends si tu oses.",
    etapes: ["Fais 1 burpee, marche 15 s.", "Fais 2 burpees, marche 15 s.", "Continue jusqu'à 10 (55 burpees au total !).", "Version douce : burpees sans saut ni pompe."],
    astuce: "Garde un rythme régulier plutôt que de tout donner au début."
  },
  "x-pistol": {
    titre: "Progression vers le pistol squat", e: "🦵", duree: 15, activite: "renfo",
    intro: "Le squat sur une jambe : un vrai défi de force et d'équilibre, en 4 étapes.",
    etapes: ["Étape 1 : assieds-toi sur une chaise sur une jambe, 3 × 5 par côté.", "Étape 2 : relève-toi de la chaise sur une jambe.", "Étape 3 : même chose en tenant un cadre de porte, sans chaise.", "Étape 4 : le pistol complet, bras tendus devant pour l'équilibre."],
    astuce: "Ne passe à l'étape suivante que quand tu réussis 3 × 5 propres. Évite si genoux douloureux."
  },
  "x-corde": {
    titre: "Corde à sauter fractionnée", e: "🪢", duree: 15, activite: "hiit",
    intro: "Un cardio redoutable en un minimum de temps (ou corde imaginaire, ça marche aussi).",
    etapes: ["2 min de sauts tranquilles pour s'échauffer.", "30 s rapide / 30 s lent, 10 fois.", "Termine par 2 min tranquilles et des étirements des mollets."],
    astuce: "Pas de corde ? Fais le geste sans corde, ou remplace par des montées de genoux."
  }
};

/* Thèmes de couleurs. Chacun a une version claire et une sombre.
   « energie » est le thème de départ, les autres se débloquent. */
var THEMES = {
  energie: {
    nom: "Énergie", e: "🔥", apercu: ["#FF5A36", "#FFB020"],
    light: { bg: "#FFF7F2", surface: "#FFFFFF", surface2: "#FFEDE4", ink: "#2B1D25", muted: "#7E6A72", border: "#F1DCD2", accent: "#F2542D", accentStrong: "#C93A18", accentInk: "#FFFFFF", or: "#E89B00", ok: "#1F9D6B", alerte: "#D0342C" },
    dark:  { bg: "#18121A", surface: "#231A25", surface2: "#2E2230", ink: "#F7ECEF", muted: "#B49FA7", border: "#3E2F40", accent: "#FF7A57", accentStrong: "#FFA084", accentInk: "#1A0F12", or: "#FFC247", ok: "#4BD39A", alerte: "#FF7B73" }
  },
  ocean: {
    nom: "Océan", e: "🌊", apercu: ["#0C7DA3", "#2EC4B6"],
    light: { bg: "#F1F8FB", surface: "#FFFFFF", surface2: "#E0F0F6", ink: "#10262F", muted: "#5D7A86", border: "#CFE3EB", accent: "#0C7DA3", accentStrong: "#08607E", accentInk: "#FFFFFF", or: "#E3A008", ok: "#16967A", alerte: "#D03B3B" },
    dark:  { bg: "#0B1820", surface: "#12232D", surface2: "#183140", ink: "#E6F4F9", muted: "#93B3C0", border: "#22404F", accent: "#3CC2E8", accentStrong: "#7DD8F1", accentInk: "#06141A", or: "#F7C04A", ok: "#3ED6AE", alerte: "#FF8080" }
  },
  foret: {
    nom: "Forêt", e: "🌲", apercu: ["#2F7D4F", "#A3C76D"],
    light: { bg: "#F4F8F1", surface: "#FFFFFF", surface2: "#E5EFDF", ink: "#1C2A1F", muted: "#66786A", border: "#D3E1CC", accent: "#2F7D4F", accentStrong: "#1F5E39", accentInk: "#FFFFFF", or: "#C99A13", ok: "#2F7D4F", alerte: "#C2412D" },
    dark:  { bg: "#111A13", surface: "#18241B", surface2: "#203024", ink: "#E8F2E6", muted: "#9DB29F", border: "#2C4231", accent: "#6FCB8E", accentStrong: "#A2E0B6", accentInk: "#0B140E", or: "#E8C14E", ok: "#6FCB8E", alerte: "#F08A70" }
  },
  sunset: {
    nom: "Coucher de soleil", e: "🌅", apercu: ["#E0475F", "#F59F00"],
    light: { bg: "#FFF5F1", surface: "#FFFFFF", surface2: "#FFE6E0", ink: "#2E1A20", muted: "#86676E", border: "#F3D6D0", accent: "#D93B5C", accentStrong: "#AE2442", accentInk: "#FFFFFF", or: "#F08C00", ok: "#2B9A66", alerte: "#C92A2A" },
    dark:  { bg: "#1C1016", surface: "#28161F", surface2: "#351D29", ink: "#FCEBEF", muted: "#C29BA6", border: "#47283A", accent: "#FF6F8E", accentStrong: "#FFA0B4", accentInk: "#1E0B12", or: "#FFB44A", ok: "#53D193", alerte: "#FF8787" }
  },
  nuit: {
    nom: "Nuit étoilée", e: "✨", apercu: ["#6C5CE7", "#FDCB6E"],
    light: { bg: "#F5F4FF", surface: "#FFFFFF", surface2: "#E9E6FF", ink: "#1D1A3A", muted: "#6D6893", border: "#DAD6F5", accent: "#5B4BDB", accentStrong: "#4232B8", accentInk: "#FFFFFF", or: "#D99A00", ok: "#1F9D7A", alerte: "#D6336C" },
    dark:  { bg: "#0D0C1F", surface: "#16152E", surface2: "#1F1D3D", ink: "#ECEAFF", muted: "#A39FD0", border: "#2C2A52", accent: "#9C8CFF", accentStrong: "#C3B9FF", accentInk: "#0D0C1F", or: "#FDCB6E", ok: "#55E0B4", alerte: "#FF7FA8" }
  },
  neon: {
    nom: "Néon", e: "💜", apercu: ["#C026D3", "#22D3EE"],
    light: { bg: "#FCF5FF", surface: "#FFFFFF", surface2: "#F5E4FB", ink: "#2A1530", muted: "#7E6187", border: "#EBD3F2", accent: "#B21EC7", accentStrong: "#8A0F9C", accentInk: "#FFFFFF", or: "#0891B2", ok: "#16A34A", alerte: "#DC2626" },
    dark:  { bg: "#120716", surface: "#1D0D23", surface2: "#291333", ink: "#FBEAFF", muted: "#C49BD0", border: "#3F1E4A", accent: "#E879F9", accentStrong: "#F5B4FF", accentInk: "#16061A", or: "#22D3EE", ok: "#4ADE80", alerte: "#FB7185" }
  },
  or: {
    nom: "Or olympique", e: "🥇", apercu: ["#B8860B", "#1F2937"],
    light: { bg: "#FFFBEF", surface: "#FFFFFF", surface2: "#FBF0D2", ink: "#26200F", muted: "#7D7253", border: "#EEDFB4", accent: "#A87A06", accentStrong: "#7D5A02", accentInk: "#FFFFFF", or: "#A87A06", ok: "#2E8B57", alerte: "#C0392B" },
    dark:  { bg: "#14120B", surface: "#1E1B11", surface2: "#2A2517", ink: "#FBF4DE", muted: "#BCAE85", border: "#3D3520", accent: "#F2C94C", accentStrong: "#F9DE8A", accentInk: "#171308", or: "#F2C94C", ok: "#5BD08F", alerte: "#FF8A7A" }
  }
};

/* Paliers et récompenses.
   cond.k : serie (meilleure série de semaines complètes), seances (total),
            heures, et des conditions spéciales (valeur 1 = obtenu).        */
var RECOMPENSES = [
  // --- Série de semaines complètes
  { id: "b-serie1",  type: "badge", e: "🌱", titre: "Premier élan", texte: "Ta première semaine complète.", cond: { k: "serie", v: 1 } },
  { id: "r-energy",  type: "recette", cond: { k: "serie", v: 2 } },
  { id: "b-serie3",  type: "badge", e: "🔥", titre: "Sur la lancée", texte: "3 semaines complètes d'affilée.", cond: { k: "serie", v: 3 } },
  { id: "x-tabata",  type: "exercice", cond: { k: "serie", v: 3 } },
  { id: "t-ocean",   type: "theme", theme: "ocean", cond: { k: "serie", v: 4 } },
  { id: "r-bowl",    type: "recette", cond: { k: "serie", v: 5 } },
  { id: "x-etoile",  type: "exercice", cond: { k: "serie", v: 6 } },
  { id: "b-serie8",  type: "badge", e: "🗓️", titre: "Deux mois de feu", texte: "8 semaines complètes d'affilée.", cond: { k: "serie", v: 8 } },
  { id: "t-foret",   type: "theme", theme: "foret", cond: { k: "serie", v: 8 } },
  { id: "r-pancakes",type: "recette", cond: { k: "serie", v: 10 } },
  { id: "b-serie12", type: "badge", e: "🛡️", titre: "Trimestre d'acier", texte: "12 semaines complètes d'affilée.", cond: { k: "serie", v: 12 } },
  { id: "x-cent",    type: "exercice", cond: { k: "serie", v: 12 } },
  { id: "t-sunset",  type: "theme", theme: "sunset", cond: { k: "serie", v: 16 } },
  { id: "r-smoothie",type: "recette", cond: { k: "serie", v: 20 } },
  { id: "b-serie26", type: "badge", e: "🌓", titre: "Demi-année", texte: "26 semaines complètes d'affilée.", cond: { k: "serie", v: 26 } },
  { id: "t-nuit",    type: "theme", theme: "nuit", cond: { k: "serie", v: 26 } },
  { id: "b-serie52", type: "badge", e: "🏆", titre: "Une année entière", texte: "52 semaines complètes d'affilée. Légendaire.", cond: { k: "serie", v: 52 } },
  { id: "t-or",      type: "theme", theme: "or", cond: { k: "serie", v: 52 } },
  // --- Nombre total de séances
  { id: "b-s1",      type: "badge", e: "👟", titre: "C'est parti !", texte: "Ta toute première séance cochée.", cond: { k: "seances", v: 1 } },
  { id: "r-oats",    type: "recette", cond: { k: "seances", v: 5 } },
  { id: "b-s10",     type: "badge", e: "🔟", titre: "10 séances", texte: "Dix séances au compteur.", cond: { k: "seances", v: 10 } },
  { id: "x-soleil",  type: "exercice", cond: { k: "seances", v: 10 } },
  { id: "r-wrap",    type: "recette", cond: { k: "seances", v: 25 } },
  { id: "b-s50",     type: "badge", e: "🎖️", titre: "50 séances", texte: "Cinquante séances, quelle régularité.", cond: { k: "seances", v: 50 } },
  { id: "t-neon",    type: "theme", theme: "neon", cond: { k: "seances", v: 50 } },
  { id: "x-echelle", type: "exercice", cond: { k: "seances", v: 75 } },
  { id: "b-s100",    type: "badge", e: "💯", titre: "Centurion", texte: "100 séances cochées.", cond: { k: "seances", v: 100 } },
  { id: "r-omelette",type: "recette", cond: { k: "seances", v: 100 } },
  { id: "x-pistol",  type: "exercice", cond: { k: "seances", v: 150 } },
  { id: "b-s200",    type: "badge", e: "👑", titre: "Légende", texte: "200 séances. Respect.", cond: { k: "seances", v: 200 } },
  // --- Temps total
  { id: "b-h10",     type: "badge", e: "⏳", titre: "10 heures de sport", texte: "10 heures cumulées.", cond: { k: "heures", v: 10 } },
  { id: "x-corde",   type: "exercice", cond: { k: "heures", v: 25 } },
  { id: "b-h50",     type: "badge", e: "⌛", titre: "50 heures de sport", texte: "50 heures cumulées.", cond: { k: "heures", v: 50 } },
  { id: "b-h100",    type: "badge", e: "🕰️", titre: "100 heures de sport", texte: "100 heures cumulées.", cond: { k: "heures", v: 100 } },
  // --- Spéciaux
  { id: "b-weekend", type: "badge", e: "🏖️", titre: "Guerrier·ère du week-end", texte: "Une séance le samedi ET le dimanche de la même semaine.", cond: { k: "weekend", v: 1 } },
  { id: "b-parfaite",type: "badge", e: "🎯", titre: "Semaine parfaite", texte: "Toutes les séances prévues faites le jour prévu (au moins 2).", cond: { k: "parfaite", v: 1 } },
  { id: "b-touche",  type: "badge", e: "🎨", titre: "Touche-à-tout", texte: "5 activités différentes pratiquées.", cond: { k: "types", v: 5 } },
  { id: "r-salade",  type: "recette", cond: { k: "types", v: 5 } },
  { id: "b-phenix",  type: "badge", e: "🐦‍🔥", titre: "Phénix", texte: "Une série cassée… puis une nouvelle série de 2 semaines. Bravo d'être revenu·e !", cond: { k: "phenix", v: 1 } },
  { id: "b-archi",   type: "badge", e: "📐", titre: "Architecte", texte: "Ton premier programme créé ou généré.", cond: { k: "architecte", v: 1 } },
  { id: "b-sauve",   type: "badge", e: "💾", titre: "Prévoyant·e", texte: "Ta première sauvegarde. Tes efforts sont à l'abri.", cond: { k: "sauvegarde", v: 1 } }
];

/* Un joker (semaine off qui ne casse pas la série) est gagné toutes les
   JOKER_TOUTES semaines complètes. */
var JOKER_TOUTES = 4;

var PHRASES = [
  "Une séance faite vaut mieux qu'une séance parfaite.",
  "Le plus dur, c'est de mettre les baskets. Le reste suit.",
  "Tu ne le regretteras jamais après.",
  "Petit à petit, semaine après semaine.",
  "La régularité bat l'intensité.",
  "Ton futur toi te dit merci.",
  "Même 10 minutes, ça compte.",
  "Bouge pour l'énergie, pas pour la punition.",
  "Écoute ton corps : repos aussi, c'est de l'entraînement.",
  "Chaque case cochée est une promesse tenue.",
  "Pas besoin d'être motivé·e, juste d'être là.",
  "Le progrès, pas la perfection.",
  "Aujourd'hui compte.",
  "Respire, souris, et c'est parti.",
  "Tu es plus fort·e que tu ne le crois."
];

/* Contre-indications (dispense, douleur, fragilité).
   exos     : exercices à éviter quand cette zone est cochée
   sansSaut : la zone exclut aussi tous les exercices avec sauts
   flag     : les exercices marqués de ce drapeau dans EXERCICES sont exclus aussi */
var ZONES_SENSIBLES = {
  chevilles: { e: "🦶", nom: "Chevilles / pieds", sansSaut: true,
    exos: ["Mollets sur marche", "Fente arrière alternée", "Fente latérale", "Fentes avec haltères", "Montée sur marche", "Patineur", "Sauts à la corde", "Jacks sans saut", "Burpees"] },
  genoux: { e: "🦵", nom: "Genoux", sansSaut: true, flag: "gen", exos: [] },
  hanches: { e: "🦴", nom: "Hanches", exos: ["Pigeon", "Fente latérale", "Squat sumo", "Papillon", "Fente basse avec ouverture", "Patineur", "Marche latérale élastique"] },
  dos: { e: "🧍", nom: "Dos", flag: "dos", exos: [] },
  nuque: { e: "🙇", nom: "Nuque / cervicales", exos: ["Crunch", "Hollow (bateau creux)", "Rotations russes", "Relevés de jambes", "Superman"] },
  epaules: { e: "🤷", nom: "Épaules", exos: ["Développé épaules", "Pompes en pike (épaules)", "Pompes pieds surélevés", "Dips sur chaise", "Élévations latérales", "Tractions", "Tractions négatives", "Suspension active", "Thruster", "Développé couché à la barre", "Développé couché au sol", "Extension triceps"] },
  poignets: { e: "✋", nom: "Poignets / mains", exos: ["Pompes sur les genoux", "Pompes", "Pompes pieds surélevés", "Pompes contre le mur", "Dips sur chaise", "Pompes en pike (épaules)", "Planche avec touches d'épaules", "Mountain climbers", "Burpees", "Bird dog", "Chat-vache", "Chien tête en bas", "Rotation thoracique à quatre pattes", "Fente basse avec ouverture"] }
};

/* Exercices bonus déconseillés selon la zone sensible. */
BONUS["x-etoile"].eviter = ["poignets"];
BONUS["x-soleil"].eviter = ["poignets"];
BONUS["x-echelle"].eviter = ["chevilles", "genoux", "poignets"];
BONUS["x-pistol"].eviter = ["chevilles", "genoux"];
BONUS["x-corde"].eviter = ["chevilles", "genoux"];
