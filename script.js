let db = {};

document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      db = data;
      init();
    })
    .catch((err) => {
      console.error("Errore nel caricamento dei dati:", err);
      document.getElementById("calendario-live").innerHTML = 
        '<p style="color: #cd212a; font-weight: 600;">Errore nel caricamento dei dati del torneo.</p>';
    });
});

function init() {
  buildFilters();
  renderCalendar();
  updateRanking();
}

// ========== FILTRI ==========

function buildFilters() {
  const container = document.getElementById("filter-container");

  // Checkbox "Tutti"
  const allDiv = document.createElement("div");
  allDiv.className = "filter-item";
  allDiv.innerHTML = `
    <input type="checkbox" id="chk-all" checked>
    <label for="chk-all"><strong>✨ Tutti</strong></label>
  `;
  container.appendChild(allDiv);

  // Checkbox per ogni fantallenatore
  db.squadreFanta.forEach((s, index) => {
    const id = `chk-${index}`;
    const div = document.createElement("div");
    div.className = "filter-item";
    div.innerHTML = `
      <input type="checkbox" id="${id}" data-squadra="${s.squadra}" checked>
      <label for="${id}">${s.fantallenatore}<br><small>(${s.squadra})</small></label>
    `;
    container.appendChild(div);
  });

  // Gestione cambiamento checkbox
  container.addEventListener("change", (event) => {
    const target = event.target;

    if (target.id === "chk-all") {
      const allChecked = target.checked;
      container.querySelectorAll('input[type="checkbox"]').forEach((chk) => {
        chk.checked = allChecked;
      });
    } else {
      const checkboxes = Array.from(
        container.querySelectorAll('input[type="checkbox"]')
      ).filter((chk) => chk.id !== "chk-all");

      const allSinglesChecked = checkboxes.every((chk) => chk.checked);
      document.getElementById("chk-all").checked = allSinglesChecked;
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

  filterMatches(selectedTeams);
}

// ========== CALENDARIO ==========

function renderCalendar() {
  const container = document.getElementById("calendario-live");
  container.innerHTML = "";

  for (const turno in db.calendario) {
    const wrapper = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "turno-title";
    title.textContent = turno.toUpperCase();
    wrapper.appendChild(title);

    db.calendario[turno].partite.forEach((p) => {
      const card = createMatchCard(p);
      wrapper.appendChild(card);
    });

    container.appendChild(wrapper);
  }

  // Palmares
  document.getElementById("palmares-box").textContent = db.palmares;
}

function createMatchCard(partita) {
  const card = document.createElement("div");
  card.className = "match-card";
  card.dataset.teams = `${partita.casa} ${partita.ospite}`;

  const fCasa = db.squadreFanta.find((s) => s.squadra === partita.casa);
  const fOspite = db.squadreFanta.find((s) => s.squadra === partita.ospite);

  const matchResult = analyzeMatch(partita);

  const casaClass = matchResult.winner === "casa" ? "team-name team-winner" : "team-name";
  const ospiteClass = matchResult.winner === "ospite" ? "team-name team-winner" : "team-name";

  let winnerHTML = `<div class="winner-text">${matchResult.text}</div>`;
  
  if (matchResult.penalties) {
    winnerHTML = `
      <div class="winner-text">${matchResult.text}</div>
      <div class="winner-text penalties">🎯 Rigori: ${partita.rigori}</div>
    `;
  }

  const scoreHTML = matchResult.penalties 
    ? `
      <div class="score-container">
        <div class="score">${partita.risultato}</div>
        <div class="penalties-score">RIG ${partita.rigori}</div>
      </div>
    `
    : `
      <div class="score-container">
        <div class="score">${partita.risultato}</div>
      </div>
    `;

  card.innerHTML = `
    <div class="match-info">
      <div class="match-teams">
        <span class="${casaClass}">${partita.casa}</span>
        <span class="vs-text">vs</span>
        <span class="${ospiteClass}">${partita.ospite}</span>
      </div>
      ${winnerHTML}
    </div>
    ${scoreHTML}
  `;

  return card;
}

function analyzeMatch(partita) {
  if (!partita.risultato || partita.risultato === "Da giocare") {
    return { winner: null, text: "🕐 Da giocare", penalties: false };
  }

  const [gCasa, gOspite] = partita.risultato.split("-").map(n => parseInt(n));

  if (isNaN(gCasa) || isNaN(gOspite)) {
    return { winner: null, text: "Da giocare", penalties: false };
  }

  // Verifica rigori
  if (partita.rigori) {
    const [rCasa, rOspite] = partita.rigori.split("-").map(n => parseInt(n));
    const fCasa = db.squadreFanta.find(s => s.squadra === partita.casa);
    const fOspite = db.squadreFanta.find(s => s.squadra === partita.ospite);
    
    if (rCasa > rOspite) {
      const nome = fCasa ? ` (${fCasa.fantallenatore})` : "";
      return { 
        winner: "casa", 
        text: `🏆 Vittoria ai rigori: ${partita.casa}${nome}`, 
        penalties: true 
      };
    } else {
      const nome = fOspite ? ` (${fOspite.fantallenatore})` : "";
      return { 
        winner: "ospite", 
        text: `🏆 Vittoria ai rigori: ${partita.ospite}${nome}`, 
        penalties: true 
      };
    }
  }

  // Vittoria normale
  if (gCasa > gOspite) {
    const fCasa = db.squadreFanta.find(s => s.squadra === partita.casa);
    const nome = fCasa ? ` (${fCasa.fantallenatore})` : "";
    return { winner: "casa", text: `🏆 Ha vinto ${partita.casa}${nome}`, penalties: false };
  } else if (gOspite > gCasa) {
    const fOspite = db.squadreFanta.find(s => s.squadra === partita.ospite);
    const nome = fOspite ? ` (${fOspite.fantallenatore})` : "";
    return { winner: "ospite", text: `🏆 Ha vinto ${partita.ospite}${nome}`, penalties: false };
  } else {
    return { winner: null, text: "⚖️ Pareggio", penalties: false };
  }
}

// ========== CLASSIFICA ==========

function updateRanking() {
  const container = document.getElementById("ranking-container");
  const weights = { ottavi: 1, quarti: 2, semifinali: 3, finale: 4 };

  let ranking = db.squadreFanta.map((s) => {
    let maxTurno = "Nessuno";
    let weight = 0;
    let eliminated = false;
    let wonByPenalties = false;
    let totalGoals = 0;

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

            if (!isNaN(scoreCasa) && !isNaN(scoreOspite)) {
              // Verifica eliminazione e calcola gol
              let isEliminated = false;
              
              if (p.rigori) {
                // Con rigori: conta solo gol partita + 1 se vinci ai rigori
                if (p.casa === s.squadra) {
                  totalGoals += scoreCasa;
                } else {
                  totalGoals += scoreOspite;
                }
                
                const [rCasa, rOspite] = p.rigori.split("-").map(n => parseInt(n));
                if (p.casa === s.squadra && rOspite > rCasa) {
                  isEliminated = true;
                } else if (p.ospite === s.squadra && rCasa > rOspite) {
                  isEliminated = true;
                } else if (p.casa === s.squadra && rCasa > rOspite) {
                  wonByPenalties = true;
                  totalGoals += 1; // Bonus vittoria rigori (NON i gol dei rigori)
                } else if (p.ospite === s.squadra && rOspite > rCasa) {
                  wonByPenalties = true;
                  totalGoals += 1; // Bonus vittoria rigori (NON i gol dei rigori)
                }
              } else {
                // Senza rigori: conta tutti i gol normalmente
                if (p.casa === s.squadra) {
                  totalGoals += scoreCasa;
                } else {
                  totalGoals += scoreOspite;
                }
                
                if (
                  (p.casa === s.squadra && scoreOspite > scoreCasa) ||
                  (p.ospite === s.squadra && scoreCasa > scoreOspite)
                ) {
                  isEliminated = true;
                }
              }

              if (isEliminated) {
                eliminated = true;
              }
            }
          }
        }
      });
    }

    return { 
      ...s, 
      maxTurno, 
      weight, 
      eliminated, 
      wonByPenalties,
      totalGoals 
    };
  });

  // Ordinamento: peso turno, poi stato eliminazione, poi gol totali (solo a parità)
  ranking.sort((a, b) => {
    // Prima: peso turno
    if (b.weight !== a.weight) return b.weight - a.weight;
    
    // Seconda: stato eliminazione
    if (a.eliminated !== b.eliminated) return a.eliminated - b.eliminated;
    
    // Terza: gol totali (solo se stesso turno E stesso stato)
    return b.totalGoals - a.totalGoals;
  });

  container.innerHTML = ranking
    .map((r, index) => {
      const posizione = index + 1;

      let statusText;
      let badgeClass;

      if (r.maxTurno === "finale" && !r.eliminated) {
        statusText = "🏆 Vittoria finale";
        badgeClass = "vittoria-finale";
      } else if (r.eliminated) {
        statusText = `❌ Uscito ai ${r.maxTurno}`;
        badgeClass = "eliminato";
      } else {
        statusText = `✅ In gara (${r.maxTurno})`;
        badgeClass = "in-gara";
      }

      return `
        <div class="ranking-row">
          <div class="rank-info">
            <span class="rank-position">${posizione}</span>
            <span class="rank-name">${r.fantallenatore} (${r.squadra})</span>
          </div>
          <div class="rank-badge ${badgeClass}">
            ${statusText}
          </div>
        </div>
      `;
    })
    .join("");
}

// ========== FILTRO VISIBILITÀ ==========

function filterMatches(selectedTeams) {
  document.querySelectorAll(".match-card").forEach((card) => {
    if (!selectedTeams || selectedTeams.length === 0) {
      card.style.display = "flex";
      return;
    }
    
    const hasMatch = selectedTeams.some((team) => 
      card.dataset.teams.includes(team)
    );
    
    card.style.display = hasMatch ? "flex" : "none";
  });
}