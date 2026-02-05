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
        '<p style="color:#cd212a;font-weight:600;">Errore nel caricamento dei dati del torneo.</p>';
    });
});

function init() {
  buildFilters();
  renderCalendar();
  updateRanking();
  document.getElementById("palmares-box").textContent = db.palmares;
  setupWhatsAppShare();
}

/* FILTRI */

function buildFilters() {
  const container = document.getElementById("filter-container");

  // Checkbox "Tutti"
  const allDiv = document.createElement("div");
  allDiv.className = "filter-item";
  allDiv.innerHTML = `
    <input type="checkbox" id="chk-all" checked />
    <label for="chk-all"><strong>Tutti</strong></label>
  `;
  container.appendChild(allDiv);

  // Singole squadre
  db.squadreFanta.forEach((s, index) => {
    const id = `chk-${index}`;
    const div = document.createElement("div");
    div.className = "filter-item";
    div.innerHTML = `
      <input type="checkbox" id="${id}" data-squadra="${s.squadra}" checked />
      <label for="${id}">
        ${s.fantallenatore}<br/><small>${s.squadra}</small>
      </label>
    `;
    container.appendChild(div);
  });

  container.addEventListener("change", (event) => {
    const target = event.target;

    if (target.id === "chk-all") {
      const allChecked = target.checked;
      container
        .querySelectorAll('input[type="checkbox"]')
        .forEach((chk) => {
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

/* CALENDARIO */

function renderCalendar() {
  const container = document.getElementById("calendario-live");
  container.innerHTML = "";

  for (const turno in db.calendario) {
    const wrapper = document.createElement("div");
    wrapper.className = "turno-wrapper";
    wrapper.dataset.turno = turno;

    const title = document.createElement("h3");
    title.className = "turno-title";
    title.textContent = turno.toUpperCase();
    wrapper.appendChild(title);

    const matchesContainer = document.createElement("div");
    matchesContainer.className = "matches-container";

    db.calendario[turno].partite.forEach((p) => {
      const card = createMatchCard(p);
      matchesContainer.appendChild(card);
    });

    wrapper.appendChild(matchesContainer);
    container.appendChild(wrapper);
  }
}

function createMatchCard(partita) {
  const card = document.createElement("div");
  card.className = "match-card";
  card.dataset.teams = `${partita.casa},${partita.ospite}`;

  const fCasa = db.squadreFanta.find((s) => s.squadra === partita.casa);
  const fOspite = db.squadreFanta.find((s) => s.squadra === partita.ospite);

  const matchResult = analyzeMatch(partita);

  const casaClass =
    matchResult.winner === "casa" ? "team-name team-winner" : "team-name";
  const ospiteClass =
    matchResult.winner === "ospite" ? "team-name team-winner" : "team-name";

  let winnerHTML = `<div class="winner-text">${matchResult.text}</div>`;
  if (matchResult.penalties) {
    winnerHTML = `<div class="winner-text penalties">${matchResult.text}</div>`;
  }

  let scoreHTML = "";
  if (partita.risultato && partita.risultato !== "Da giocare") {
    if (matchResult.penalties && partita.rigori) {
      scoreHTML = `
        <div class="score-container">
          <div class="score">${partita.risultato}</div>
          <div class="penalties-score">RIG ${partita.rigori}</div>
        </div>
      `;
    } else {
      scoreHTML = `
        <div class="score-container">
          <div class="score">${partita.risultato}</div>
        </div>
      `;
    }
  } else {
    scoreHTML = `
      <div class="score-container">
        <div class="score">Da giocare</div>
      </div>
    `;
  }

  const casaName = fCasa ? `${partita.casa} (${fCasa.fantallenatore})` : partita.casa;
  const ospiteName = fOspite
    ? `${partita.ospite} (${fOspite.fantallenatore})`
    : partita.ospite;

  card.innerHTML = `
    <div class="match-info">
      <div class="match-teams">
        <span class="${casaClass}">${casaName}</span>
        <span class="vs-text">vs</span>
        <span class="${ospiteClass}">${ospiteName}</span>
      </div>
      ${winnerHTML}
    </div>
    ${scoreHTML}
  `;

  return card;
}

function analyzeMatch(partita) {
  if (!partita.risultato || partita.risultato === "Da giocare") {
    return { winner: null, text: "Da giocare", penalties: false };
  }

  const [gCasa, gOspite] = partita.risultato
    .split("-")
    .map((n) => parseInt(n, 10));

  if (isNaN(gCasa) || isNaN(gOspite)) {
    return { winner: null, text: "Da giocare", penalties: false };
  }

  // Eventuali rigori
  if (partita.rigori) {
    const [rCasa, rOspite] = partita.rigori
      .split("-")
      .map((n) => parseInt(n, 10));
    const fCasa = db.squadreFanta.find((s) => s.squadra === partita.casa);
    const fOspite = db.squadreFanta.find((s) => s.squadra === partita.ospite);

    if (rCasa > rOspite) {
      const nome = fCasa ? fCasa.fantallenatore : partita.casa;
      return {
        winner: "casa",
        text: `Ha vinto ai rigori ${partita.casa} (${nome})`,
        penalties: true,
      };
    } else if (rOspite > rCasa) {
      const nome = fOspite ? fOspite.fantallenatore : partita.ospite;
      return {
        winner: "ospite",
        text: `Ha vinto ai rigori ${partita.ospite} (${nome})`,
        penalties: true,
      };
    }
  }

  if (gCasa > gOspite) {
    const fCasa = db.squadreFanta.find((s) => s.squadra === partita.casa);
    const nome = fCasa ? fCasa.fantallenatore : partita.casa;
    return {
      winner: "casa",
      text: `Ha vinto ${partita.casa} (${nome})`,
      penalties: false,
    };
  } else if (gOspite > gCasa) {
    const fOspite = db.squadreFanta.find((s) => s.squadra === partita.ospite);
    const nome = fOspite ? fOspite.fantallenatore : partita.ospite;
    return {
      winner: "ospite",
      text: `Ha vinto ${partita.ospite} (${nome})`,
      penalties: false,
    };
  }

  return { winner: null, text: "Pareggio", penalties: false };
}

/* CLASSIFICA */

function updateRanking() {
  const container = document.getElementById("ranking-container");

  const weights = {
    ottavi: 1,
    quarti: 2,
    semifinali: 3,
    finale: 4,
  };

  let ranking = db.squadreFanta.map((s) => {
    let maxTurno = "Nessuno";
    let weight = 0;
    let eliminated = false;
    let totalGoals = 0;

    for (const turno in db.calendario) {
      db.calendario[turno].partite.forEach((p) => {
        if (p.casa === s.squadra || p.ospite === s.squadra) {
          if (weights[turno] && weights[turno] > weight) {
            maxTurno = turno;
            weight = weights[turno];
          }

          if (p.risultato && p.risultato !== "Da giocare") {
            const res = p.risultato.split("-");
            if (res.length === 2 && res[0] !== "Da giocare") {
              const scoreCasa = parseInt(res[0], 10);
              const scoreOspite = parseInt(res[1], 10);
              if (!isNaN(scoreCasa) && !isNaN(scoreOspite)) {
                if (p.casa === s.squadra) {
                  totalGoals += scoreCasa;
                  if (scoreOspite > scoreCasa) {
                    eliminated = true;
                  }
                } else if (p.ospite === s.squadra) {
                  totalGoals += scoreOspite;
                  if (scoreCasa > scoreOspite) {
                    eliminated = true;
                  }
                }

                if (p.rigori) {
                  const [rCasa, rOspite] = p.rigori
                    .split("-")
                    .map((n) => parseInt(n, 10));
                  if (p.casa === s.squadra && rOspite > rCasa) {
                    eliminated = true;
                  } else if (p.ospite === s.squadra && rCasa > rOspite) {
                    eliminated = true;
                  }
                }
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
      totalGoals,
    };
  });

  ranking.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (a.eliminated !== b.eliminated) return a.eliminated - b.eliminated;
    return b.totalGoals - a.totalGoals;
  });

  // salviamo per WhatsApp
  window.currentRanking = ranking;

  container.innerHTML = ranking
    .map((r, index) => {
      const posizione = index + 1;

      let statusText = "";
      let badgeClass = "";

      let turnoText = "";
      if (r.maxTurno === "ottavi") turnoText = "agli ottavi";
      else if (r.maxTurno === "quarti") turnoText = "ai quarti";
      else if (r.maxTurno === "semifinali") turnoText = "in semifinale";
      else if (r.maxTurno === "finale") turnoText = "in finale";

      if (r.maxTurno === "finale" && !r.eliminated) {
        statusText = "Vittoria";
        badgeClass = "vittoria-finale";
      } else if (r.eliminated) {
        statusText = `Uscito ${turnoText}`;
        badgeClass = "eliminato";
      } else {
        statusText = `In gara ${turnoText}`;
        badgeClass = "in-gara";
      }

      return `
        <div class="ranking-row">
          <div class="rank-info">
            <span class="rank-position">${posizione}</span>
            <div class="rank-name">
              ${r.fantallenatore} <span>(${r.squadra})</span>
            </div>
          </div>
          <div class="rank-badge ${badgeClass}">
            ${statusText}
          </div>
        </div>
      `;
    })
    .join("");
}

/* WHATSAPP */

function setupWhatsAppShare() {
  const shareBtn = document.getElementById("share-whatsapp");
  if (!shareBtn) return;

  shareBtn.addEventListener("click", () => {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  });
}

function generateWhatsAppMessage() {
  const ranking = window.currentRanking || [];

  let message = "";
  message += "*FANTACOPPA ITALIA FRECCIAROSSA 2025-26*\n";
  message += "*CLASSIFICA AVANZAMENTO*\n";
  message += "========================\n\n";

  ranking.forEach((r, index) => {
    const posizione = index + 1;

    let turnoText = "";
    if (r.maxTurno === "ottavi") turnoText = "Ottavi";
    else if (r.maxTurno === "quarti") turnoText = "Quarti";
    else if (r.maxTurno === "semifinali") turnoText = "Semifinale";
    else if (r.maxTurno === "finale") turnoText = "Finale";

    let statusText = "";
    if (r.maxTurno === "finale" && !r.eliminated) {
      statusText = "In gara Finale";
    } else if (r.eliminated) {
      statusText = `Eliminato ${turnoText}`;
    } else {
      statusText = `In gara ${turnoText}`;
    }

    message += `${posizione}. *${r.fantallenatore}* ${r.squadra} - ${statusText}\n`;
  });

  message += "========================\n";
  message += "*ALBO D'ORO*\n";

  const palmaresLines = db.palmares.split("\n");
  palmaresLines.forEach((line) => {
    if (line.trim()) {
      message += `• ${line.trim()}\n`;
    }
  });

  message += "\n_Fantacoppa Italia Frecciarossa 2025/26_";

  return message;
}


/* FILTRO MATCHES */

function filterMatches(selectedTeams) {
  const calendarContainer = document.getElementById("calendario-live");

  if (!selectedTeams || selectedTeams.length === 0) {
    const turnoWrappers = document.querySelectorAll(".turno-wrapper");
    turnoWrappers.forEach((wrapper) => {
      wrapper.style.display = "none";
    });

    let noMatchesMsg = calendarContainer.querySelector(".no-matches-message");
    if (!noMatchesMsg) {
      noMatchesMsg = document.createElement("div");
      noMatchesMsg.className = "no-matches-message";
      noMatchesMsg.textContent =
        "Nessuna squadra disponibile per i filtri impostati.";
      calendarContainer.appendChild(noMatchesMsg);
    }
    noMatchesMsg.style.display = "block";
    return;
  }

  const turnoWrappers = document.querySelectorAll(".turno-wrapper");
  let anyVisible = false;

  turnoWrappers.forEach((turnoWrapper) => {
    const matchCards = turnoWrapper.querySelectorAll(".match-card");
    let hasVisibleMatch = false;

    matchCards.forEach((card) => {
      const hasMatch = selectedTeams.some((team) =>
        card.dataset.teams.includes(team)
      );
      if (hasMatch) {
        card.style.display = "flex";
        hasVisibleMatch = true;
      } else {
        card.style.display = "none";
      }
    });

    if (hasVisibleMatch) {
      turnoWrapper.style.display = "block";
      anyVisible = true;
    } else {
      turnoWrapper.style.display = "none";
    }
  });

  let noMatchesMsg = calendarContainer.querySelector(".no-matches-message");
  if (!anyVisible) {
    if (!noMatchesMsg) {
      noMatchesMsg = document.createElement("div");
      noMatchesMsg.className = "no-matches-message";
      noMatchesMsg.textContent =
        "Nessuna squadra disponibile per i filtri impostati.";
      calendarContainer.appendChild(noMatchesMsg);
    }
    noMatchesMsg.style.display = "block";
  } else if (noMatchesMsg) {
    noMatchesMsg.style.display = "none";
  }
}
