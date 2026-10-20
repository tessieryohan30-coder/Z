// Code d'accès demandé après « je suis Zoé ». Essais illimités.
// Le code n'est pas écrit en clair : on compare son empreinte SHA-256
// (en minuscules, espaces autour ignorés).
const EMPREINTE = 'c4bd8fc9be0a043effc150273e42058d26811d3c4e73d72b09f1ac899805c4e5';

const RATES = [
  'Ce n’est pas ça.',
  'Non… essaie encore.',
  'Toujours pas.',
  'Prends ton temps.',
  'Ce n’est pas le bon mot.',
];

const normaliser = (s) => s.normalize('NFC').trim().toLowerCase();

async function empreinte(texte) {
  const octets = new TextEncoder().encode(texte);
  const h = await crypto.subtle.digest('SHA-256', octets);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function estLeBonCode(saisie) {
  const s = normaliser(saisie);
  if (window.crypto?.subtle) return (await empreinte(s)) === EMPREINTE;
  // navigateur sans WebCrypto (page hors https) : comparaison simple
  return s === String.fromCharCode(110, 117, 100, 105, 116, 233);
}

// Affiche le champ et résout la promesse quand le bon code est saisi.
export function demanderCode() {
  const form = document.getElementById('gate');
  const input = document.getElementById('code');
  const msg = document.getElementById('gate-msg');
  let essais = 0;

  document.body.classList.add('asking');
  setTimeout(() => input.focus({ preventScroll: true }), 400);

  return new Promise((resolve) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!input.value.trim()) return;
      if (await estLeBonCode(input.value)) {
        input.blur();
        msg.textContent = '';
        document.body.classList.remove('asking');
        document.body.classList.add('unlocked');
        resolve();
        return;
      }
      msg.textContent = RATES[essais++ % RATES.length];
      input.value = '';
      form.classList.remove('wrong');
      void form.offsetWidth; // relance l'animation
      form.classList.add('wrong');
    });
  });
}
