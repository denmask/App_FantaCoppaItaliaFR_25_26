let db = {};
let filterS = 'all';
let filterT = 'all';

document.addEventListener("DOMContentLoaded", () => {
    fetch("data.json")
        .then(r => r.json())
        .then(data => {
            db = data;
            
            // Popola filtri squadre
            const fDiv = document.getElementById("filtri-squadre");
            data.squadreFanta.forEach(item => {
                const b = document.createElement("button");
                b.className = "btn-f";
                b.dataset.squadra = item.squadra;
                b.innerHTML = `${item.squadra}<br><small>${item.fantallenatore}</small>`;
                fDiv.appendChild(b);
            });

            renderCal();
            calcolaRanking();
            document.getElementById("palmares").textContent = data.palmares;
            setupEvents();
        });
});

function renderCal() {
    const container = document.getElementById("contenuto-calendario");
    const tFiltri = document.getElementById("filtri-turni");
    container.innerHTML = "";

    for (const key in db.calendario) {
        if(!tFiltri.querySelector(`[data-turno="${key}"]`)) {
            const tb = document.createElement("button");
            tb.className = "btn-t";
            tb.dataset.turno = key;
            tb.textContent = key.toUpperCase();
            tFiltri.appendChild(tb);
        }

        const turno = db.calendario[key];
        const turnoDiv = document.createElement("div");
        turnoDiv.className = `turno-container t-${key}`;
        turnoDiv.innerHTML = `<h3 style="color:var(--coppa-red)">${key.toUpperCase()}</h3>`;

        turno.partite.forEach(p => {
            const card = document.createElement("div");
            card.className = "match-card";
            let cWin = "", oWin = "";
            const s = p.risultato.split("-");
            if(s.length === 2) {
                if(parseInt(s[0]) > parseInt(s[1])) cWin = "squadra-win";
                else if(parseInt(s[1]) > parseInt(s[0])) oWin = "squadra-win";
            }

            card.innerHTML = `
                <div class="match-main">
                    <div class="squadre-names">
                        <span class="${cWin}">${p.casa}</span> vs <span class="${oWin}">${p.ospite}</span>
                    </div>
                    <div class="score-box">${p.risultato}</div>
                </div>
                <div class="fanta-info">Fanta: ${p.fanta.join(" & ")}</div>
            `;
            card.dataset.teams = `${p.casa} ${p.ospite} ${p.fanta.join(" ")}`;
            turnoDiv.appendChild(card);
        });
        container.appendChild(turnoDiv);
    }
    applyFilters();
}

function calcolaRanking() {
    const rankingDiv = document.getElementById("ranking-fanta");
    rankingDiv.innerHTML = "";
    
    // Mappa per tracciare lo stato delle squadre (eliminata o no)
    const status = {};
    db.squadreFanta.forEach(s => status[s.squadra] = { fanta: s.fantallenatore, active: true });

    // Analisi risultati calendario
    for (const turno in db.calendario) {
        db.calendario[turno].partite.forEach(p => {
            const r = p.risultato.split("-");
            if(r.length === 2) {
                const gC = parseInt(r[0]);
                const gO = parseInt(r[1]);
                if(gC > gO) status[p.ospite] ? status[p.ospite].active = false : null;
                else if(gO > gC) status[p.casa] ? status[p.casa].active = false : null;
            }
        });
    }

    // Rendering lista
    Object.keys(status).forEach(sq => {
        const item = document.createElement("div");
        item.className = "ranking-item";
        const info = status[sq];
        item.innerHTML = `
            <span class="${info.active ? 'status-in' : 'status-out'}">${sq} (${info.fanta})</span>
            <span>${info.active ? 'IN GARA' : 'ELIMINATO'}</span>
        `;
        rankingDiv.appendChild(item);
    });
}

function setupEvents() {
    document.addEventListener("click", e => {
        const btnF = e.target.closest(".btn-f");
        const btnT = e.target.closest(".btn-t");
        if(btnF) {
            document.querySelectorAll(".btn-f").forEach(x => x.classList.remove("btn-active"));
            btnF.classList.add("btn-active");
            filterS = btnF.dataset.squadra;
            applyFilters();
        }
        if(btnT) {
            document.querySelectorAll(".btn-t").forEach(x => x.classList.remove("btn-active"));
            btnT.classList.add("btn-active");
            filterT = btnT.dataset.turno;
            applyFilters();
        }
    });
}

function applyFilters() {
    document.querySelectorAll(".turno-container").forEach(t => {
        const isTMatch = filterT === 'all' || t.classList.contains(`t-${filterT}`);
        let hasM = false;
        t.querySelectorAll(".match-card").forEach(m => {
            const isSMatch = filterS === 'all' || m.dataset.teams.includes(filterS);
            if(isTMatch && isSMatch) { m.style.display = "flex"; hasM = true; }
            else { m.style.display = "none"; }
        });
        t.style.display = hasM ? "block" : "none";
    });
}