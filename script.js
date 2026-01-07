let db = {};

document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then(r => r.json())
    .then(data => {
      db = data;
      init();
    });
});

function init() {
  const select = document.getElementById("fanta-select");

  // popolamento squadre
  db.squadreFanta.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.squadra;
    opt.textContent = `${s.fantallenatore} (${s.squadra})`;
    select.appendChild(opt);
  });

  // gestione filtri moderni con "tutti"
  select.addEventListener("change", (event) => {
    if (event.target.value === "all") {
      const allSelected = select.options[0].selected;
      for (let i = 1; i < select.options.length; i++) {
        select.options[i].selected = false;
      }
      if (!allSelected) select.options[0].selected = true;
    } else {
      select.options[0].selected = false;
    }

    const selected = Array.from(select.selectedOptions).map(o => o.value);
    filter(selected);
  });

  render();
  updateRanking();
}

function render() {
  const container = document.getElementById("calendario-live");
  container.innerHTML = "";

  for (const turno in db.calendario) {
    const wrapper = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "turno-title";
    title.textContent = turno.toUpperCase();
    wrapper.appendChild(title);

    db.calendario[turno].partite.forEach(p => {
      const card = document.createElement("div");
      card.className = "match-card";
      card.dataset.teams = `${p.casa} ${p.ospite}`;

      let winnerText = "Da giocare";
      if (p.risultato && p.risultato.includes("-")) {
        const [gCasa, gOspite] = p.risultato.split("-").map(n => parseInt(n));
        if (!isNaN(gCasa) && !isNaN(gOspite)) {
          if (gCasa > gOspite) winnerText = `Ha vinto ${p.casa}`;
          else if (gOspite > gCasa) winnerText = `Ha vinto ${p.ospite}`;
          else winnerText = "Pareggio";
        }
      }

      card.innerHTML = `
        <div>
          <div><strong>${p.casa}</strong> vs <strong>${p.ospite}</strong></div>
          <div class="winner-text">${winnerText}</div>
        </div>
        <div class="score">${p.risultato}</div>
      `;

      wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
  }

  document.getElementById("palmares-box").textContent = db.palmares;
}

function updateRanking() {
  const container = document.getElementById("ranking-container");
  const weights = { "ottavi": 1, "quarti": 2, "semifinali": 3, "finale": 4 };

  let ranking = db.squadreFanta.map(s => {
    let maxTurno = "Nessuno";
    let weight = 0;
    let eliminated = false;

    for (const turno in db.calendario) {
      db.calendario[turno].partite.forEach(p => {
        if (p.casa === s.squadra || p.ospite === s.squadra) {
          if (weights[turno] >= weight) {
            maxTurno = turno;
            weight = weights[turno];
          }

          const res = p.risultato.split("-");
          if (res.length === 2) {
            const scoreCasa = parseInt(res[0]);
            const scoreOspite = parseInt(res[1]);

            if (
              (p.casa === s.squadra && scoreOspite > scoreCasa) ||
              (p.ospite === s.squadra && scoreCasa > scoreOspite)
            ) {
              eliminated = true;
            }
          }
        }
      });
    }

    return { ...s, maxTurno, weight, eliminated };
  });

  // Ordinamento: per turno raggiunto, poi per stato "in gara"
  ranking.sort((a, b) => b.weight - a.weight || a.eliminated - b.eliminated);

  container.innerHTML = ranking.map((r, index) => {
    const posizione = index + 1;
    const statusText = r.eliminated
      ? `Uscito ai ${r.maxTurno}`
      : `In gara (${r.maxTurno})`;
    const badgeClass = r.eliminated ? "eliminato" : "in-gara";

    return `
      <div class="ranking-row">
        <div>
          <span class="rank-name">${posizione}. ${r.fantallenatore} (${r.squadra})</span>
        </div>
        <div class="rank-badge ${badgeClass}">
          ${statusText}
        </div>
      </div>
    `;
  }).join("");
}

function filter(selected) {
  document.querySelectorAll(".match-card").forEach(c => {
    const isAll = selected.includes("all") || selected.length === 0;
    const match = selected.some(s => c.dataset.teams.includes(s));
    c.style.display = (isAll || match) ? "flex" : "none";
  });
}
