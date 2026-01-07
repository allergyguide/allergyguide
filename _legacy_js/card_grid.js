async function fetchTOML(path) {
  const response = await fetch(path);
  const text = await response.text();
  return parseTOML(text);
}

function parseTOML(text) {
  const data = {};
  let currentKey = null;
  text.split('\n').forEach(line => {
    line = line.trim();
    if (line.startsWith('[') && line.endsWith(']')) {
      currentKey = line.slice(1, -1);
      data[currentKey] = {};
    } else if (currentKey && line.includes('=')) {
      let [key, value] = line.split('=').map(s => s.trim());
      value = value.replace(/^"|"$/g, ''); // Remove quotes
      data[currentKey][key] = value;
    }
  });
  return data;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getRandomEntries(data, count) {
  const keys = Object.keys(data);
  const seedDate = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  keys.sort((a, b) => {
    const seedA = hashString(seedDate + a);
    const seedB = hashString(seedDate + b);
    return seededRandom(seedA) - seededRandom(seedB);
  });
  return keys.slice(0, count).map(key => data[key]);
}

async function displayRandomCards() {
  const data = await fetchTOML('/toml/homepage_grid.toml');
  const selectedCards = getRandomEntries(data, 3);

  const container = document.querySelector('.card_grid');
  container.innerHTML = '';

  selectedCards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = 'grid-item';

    const imgClass = card.dark_invert == 'true'
      ? 'contact-card-image dark-invert'
      : 'contact-card-image';

    console.log(card.dark_invert);
    console.log(imgClass);

    cardElement.innerHTML = `
          <a href="${card.url}" class="contact-card-link">
              <div>
                  <img src="${card.src}" alt="${card.title}" class="${imgClass}">
              </div>
              <div class="contact-card-content">
                  <h3 class="contact-card-title">${card.title}</h3>
                  <p class="contact-card-body">${card.text}</p>
              </div>
          </a>
      `;
    container.appendChild(cardElement);
  });
}

document.addEventListener('DOMContentLoaded', displayRandomCards);

