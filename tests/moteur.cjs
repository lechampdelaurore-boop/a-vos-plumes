// Vérifie le moteur de correction (dans index.html, entre MOTEUR (début) et MOTEUR (fin)) :
// alignement mot à mot et type d'erreur donné à l'enfant.
// Usage : node tests/moteur.cjs [index.html]
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || __dirname + '/../index.html', 'utf8');
const M = new Function(html.slice(html.indexOf('// === MOTEUR (début)'), html.indexOf('// === MOTEUR (fin)')) + '; return M;')();
// [phrase marquée, ce que l'enfant a écrit, mots justes, erreurs attendues "mot:type", mots en trop]
const CAS = [
  ["Lila {a|h} / deux {chats|n:deux} {noirs|gn:deux chats}.", "Lila a deux chats noirs.", 5, [], []],
  ["Lila {a|h} / deux {chats|n:deux} {noirs|gn:deux chats}.", "lila a deux chats noirs", 5, [], []],
  ["Lila {a|h} / deux {chats|n:deux} {noirs|gn:deux chats}.", "Lila à deux chat noir.", 2, ['a:homophone', 'chats:accord', 'noirs:accord'], []],
  ["Le matin, / l'école {est|h} fermée.", "Le matin lécole et fermé.", 2, ["l':colle", 'école:colle', 'est:homophone', 'fermée:terminaison'], []],
  ["Le matin, / l'école {est|h} fermée.", "Le matin l ecole est fer mée.", 3, ["l':apostrophe", 'école:accent', 'fermée:coupe'], []],
  ["Comment {connaît|m}-on / {ces|h} animaux {aujourd'hui|i} ?", "comment connait-on ses animaux aujourdhui ?", 3, ['ces:homophone', "aujourd'hui:apostrophe"], []],
  ["Ils {s'entraînaient|t:imparfait:ils} souvent.", "ils s'entrainait souvent souvent.", 3, ['entraînaient:verbe'], ['souvent']],
  ["Elle veut {jouer|er} / avec {sa|h} sœur.", "Elle veut jouait avec ça soeur.", 4, ['jouer:ee', 'sa:homophone'], []],
  ["Les enfants {sont|sv:les enfants} {arrivés|pe:les enfants}.", "Les enfants son arrivé.", 2, ['sont:verbe', 'arrivés:participe'], []],
  ["Le {chemin|l:rj} est long.", "Le chemain est long.", 3, ['chemin:liste'], []],
  ["Il {mangea|t:passé simple:il} une pomme.", "Il mangeat une pomme.", 3, ['mangea:verbe'], []],
  ["Il a {mangé|e} sa pomme.", "Il a mangée sa pomme.", 4, ['mangé:ee'], []],
  ["La forêt est belle.", "La foret est belle.", 3, ['forêt:accent'], []],
  ["Il {a|h} un chat.", "Il un chat.", 3, ['a:oubli'], []],
  // Rectifications de 1990 : l'accent circonflexe sur i et u est facultatif, sauf dû, mûr, sûr, jeûne
  ["Il {connaît|m} la route.", "Il connait la route.", 4, [], []],
  ["Il est {sûr|m} de lui.", "Il est sur de lui.", 4, ['sûr:accent'], []]
];
let ko = 0;
CAS.forEach(([src, tape, justes, errs, trop]) => {
  const r = M.corriger(M.lirePhrase(src), tape);
  const vus = r.mots.filter(x => !x.juste).map(x => x.attendu + ':' + x.type);
  const tr = r.trop.map(x => x.tape);
  const ok = r.justes === justes && JSON.stringify(vus) === JSON.stringify(errs) && JSON.stringify(tr) === JSON.stringify(trop);
  if (!ok) { ko++; console.log('✗ « ' + tape + ' » → ' + r.justes + ' justes, ' + JSON.stringify(vus) + ' trop ' + JSON.stringify(tr) + ' (attendu ' + justes + ', ' + JSON.stringify(errs) + ')'); }
});
// Les questions de relecture et les explications existent pour chaque piège des textes
const bloc = html.slice(html.indexOf('// DÉBUT TEXTES'), html.indexOf('// FIN TEXTES'));
const { TEXTES, ECOLE } = new Function(bloc + '; return { TEXTES, ECOLE };')();
let n = 0;
TEXTES.concat(ECOLE).forEach(t => t.phrases.forEach(ph => {
  const p = M.lirePhrase(Array.isArray(ph) ? ph[1] : ph);
  // une dictée parfaite reste parfaite
  const r = M.corriger(p, p.texte);
  if (r.justes !== r.total || r.trop.length) { ko++; console.log('✗ ' + t.id + ' : la phrase exacte n\'est pas juste : ' + p.texte); }
  p.pieges.forEach(x => { n++; if (!M.question(x)) { ko++; console.log('✗ ' + t.id + ' : pas de question de relecture pour ' + x.mot); } });
}));
console.log(CAS.length + ' cas de correction, ' + n + ' pièges : ' + ko + ' problème(s).');
process.exit(ko ? 1 : 0);
