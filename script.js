let db = {};

document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      db = data;
      init();
    });
});

function init() {
  buildFilters(); // checkbox
  render(); // calendario
  updateRanking(); // classifica
}

// ---- FILTRI CON CHECKBOX ----

function buildFilters() {
  const container = document.getElementById("filter-container");

  // checkbox "Tutti"
  const allDiv = document.createElement("div");
  allDiv.className = "filter-item";
  allDiv.innerHTML = `
    <input type="checkbox" id="chk-all" checked>
    <label for="chk-all"><strong>Tutti</strong></label>
  `;
  container.appendChild(allDiv);

  // checkbox per ogni fantallenatore/squadra
  db.squadreFanta.forEach((s, index) => {
    const id = `chk-${index}`;
    const div = document.createElement("div");
    div.className = "filter-item";
    div.innerHTML = `
      <input type="checkbox" id="${id}" data-squadra="${s.squadra}" checked>
      <label for="${id}">${s.fantallenatore} (${s.squadra})</label>
    `;
    container.appendChild(div);
  });

  // logica "tutti" / singoli
  container.addEventListener("change", (event) => {
    const target = event.target;

    if (target.id === "chk-all") {
      const allChecked = target.checked;
      container.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
        chk.checked = allChecked;
      });
    } else {
      const chkAll = document.getElementById("chk-all");
      chkAll.checked = false;

      const checkboxes = Array.from(
        container.querySelectorAll('input[type="checkbox"]')
      ).filter((chk) => chk.id !== "chk-all");

      const allSinglesChecked = checkboxes.every((chk) => chk.checked);
      if (allSinglesChecked) {
        chkAll.checked = true;
      }
    }

    applyFilterFromCheckbox();
  });
}

function applyFilterFromCheckbox() {
  const container = document.getElementById("filter-container");
  const chkAll = document.getElementById("chk-all");

  let selectedTeams = [];

  if (chkAll.checked) {
    selectedTeams = db.squadreFanta.map((s) => s.squadra);
  } else {
    selectedTeams = Array.from(
      container.querySelectorAll('input[type="checkbox"][data-squadra]:checked')
    ).map((chk) => chk.dataset.squadra);
  }

  filter(selectedTeams);
}

// ---- RENDER CALENDARIO + VINCITORE ----

function render() {
  const container = document.getElementById("calendario-live");
  container.innerHTML = "";

  for (const turno in db.calendario) {
    const wrapper = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "turno-title";
    title.textContent = turno.toUpperCase();
    wrapper.appendChild(title);

    db.calendario[turno].partite.forEach((p) => {
      const card = document.createElement("div");
      card.className = "match-card";
      card.dataset.teams = `${p.casa} ${p.ospite}`;

      const fCasa = db.squadreFanta.find((s) => s.squadra === p.casa);
      const fOspite = db.squadreFanta.find((s) => s.squadra === p.ospite);

      let winnerText = "Da giocare";
      let winnerSide = null; // 'casa' | 'ospite'

      if (p.risultato && p.risultato.includes("-")) {
        const [gCasa, gOspite] = p.risultato.split("-").map((n) => parseInt(n));
        if (!isNaN(gCasa) && !isNaN(gOspite)) {
          if (gCasa > gOspite) {
            const nomeF = fCasa ? ` (${fCasa.fantallenatore})` : "";
            winnerText = `Ha vinto ${p.casa}${nomeF}`;
            winnerSide = "casa";
          } else if (gOspite > gCasa) {
            const nomeF = fOspite ? ` (${fOspite.fantallenatore})` : "";
            winnerText = `Ha vinto ${p.ospite}${nomeF}`;
            winnerSide = "ospite";
          } else {
            winnerText = "Pareggio";
          }
        }
      }

      const classCasa =
        winnerSide === "casa" ? "team-name team-winner" : "team-name";
      const classOspite =
        winnerSide === "ospite" ? "team-name team-winner" : "team-name";

      card.innerHTML = `
        <div>
          <div>
            <span class="${classCasa}">${p.casa}</span>
            &nbsp;vs&nbsp;
            <span class="${classOspite}">${p.ospite}</span>
          </div>
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

// ---- CLASSIFICA CON POSIZIONE E VITTORIA FINALE ----

function updateRanking() {
  const container = document.getElementById("ranking-container");
  const weights = { ottavi: 1, quarti: 2, semifinali: 3, finale: 4 };

  let ranking = db.squadreFanta.map((s) => {
    let maxTurno = "Nessuno";
    let weight = 0;
    let eliminated = false;

    for (const turno in db.calendario) {
      db.calendario[turno].partite.forEach((p) => {
        if (p.casa === s.squadra || p.ospite === s.squadra) {
          if (weights[turno] >= weight) {
            maxTurno = turno;
            weight = weights[turno];
          }

          const res = p.risultato.split("-");
          if (res.length === 2 && res[0] !== "Da giocare") {
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

  ranking.sort((a, b) => b.weight - a.weight || a.eliminated - b.eliminated);

  container.innerHTML = ranking
    .map((r, index) => {
      const posizione = index + 1;

      let statusText;
      if (r.maxTurno === "finale" && !r.eliminated) {
        statusText = "Vittoria finale";
      } else if (r.eliminated) {
        statusText = `Uscito ai ${r.maxTurno}`;
      } else {
        statusText = `In gara (${r.maxTurno})`;
      }

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
    })
    .join("");
}

// ---- FILTRO MATCH IN BASE ALLE SQUADRE ----

function filter(selectedTeams) {
  document.querySelectorAll(".match-card").forEach((c) => {
    if (!selectedTeams || selectedTeams.length === 0) {
      c.style.display = "flex";
      return;
    }
    const match = selectedTeams.some((s) => c.dataset.teams.includes(s));
    c.style.display = match ? "flex" : "none";
  });
}
