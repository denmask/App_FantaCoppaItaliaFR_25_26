let allCalendarData = {}; 
let currentSquadraFilter = 'all'; 
let currentTurnoFilter = 'all'; 

// MAPPA FANTALLENATORI → squadra ➜ Fantallenatore
const fantallenatoriMap = {
    "Udinese": "Kevin Sandri",
    "Milan": "Lorenzo Moro",
    "Inter": "Federico Burello",
    "Juve": "Denis Mascherin",
    "Napoli": "Mattia Beltrame",
    "Roma": "Alex Beltrame",
    "Lazio": "Cristian Tartaro",
    "Fiorentina": "Valentina Pozzi",
    "Bologna": "Nicola Marano",
    "Atalanta": "Kevin Di Bernardo"
};

document.addEventListener("DOMContentLoaded", () => {
    fetch("data.json")
        .then(response => {
            if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
            document.getElementById("torneo-nome").textContent = data.nomeTorneo;

            popolaSquadreFanta(data.squadreFanta);

            allCalendarData = data.calendario;
            popolaCalendario(allCalendarData);

            popolaSezioniFinali({
                classificaFinale: data.classificaFinale,
                classificaFantallenatori: data.classificaFantallenatori,
                palmares: data.palmares
            });

            // Eventi filtri turno
            document.querySelectorAll(".filtro-btn").forEach(btn => {
                btn.addEventListener("click", handleFiltroTurnoClick);
            });

            // Eventi filtri squadra
            document.querySelectorAll(".filtro-squadra-btn").forEach(btn => {
                btn.addEventListener("click", handleFiltroSquadraClick);
            });

            applyAllFilters();
        })
        .catch((error) => {
            console.error("Errore nel caricamento dei dati JSON:", error);
            document.querySelector("main").innerHTML =
                '<p style="color:red;">Errore nel caricamento dei dati.</p>';
        });
});

/* -------------------------------------------------------------
 * POPOLA SQUADRE FANTA (Invariata)
 * ------------------------------------------------------------- */
function popolaSquadreFanta(squadre) {
    const listaSquadre = document.getElementById("lista-squadre");
    listaSquadre.style.display = "none";

    const filtriSquadreDiv = document.getElementById("filtri-squadre");

    Array.from(filtriSquadreDiv.querySelectorAll('.filtro-squadra-btn:not([data-squadra="all"])'))
        .forEach(btn => btn.remove());

    squadre.forEach(squadra => {
        const btn = document.createElement("button");
        btn.classList.add("filtro-squadra-btn");
        btn.dataset.squadra = squadra;
        btn.textContent = squadra;
        filtriSquadreDiv.appendChild(btn);
    });
}

/* -------------------------------------------------------------
 * FORMATTA NOME DEL TURNO (Invariata)
 * ------------------------------------------------------------- */
function formattaTitoloTurno(key) {
    if (key === "trentaduesimi") return "Trentaduesimi";
    if (key === "secondoTurno") return "Secondo Turno";
    if (key === "ottavi") return "Ottavi";
    if (key === "quarti") return "Quarti";
    if (key === "semifinali") return "Semifinali";
    if (key === "finale") return "Finale";

    return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
}

/* -------------------------------------------------------------
 * FANTALLENATORI STRING (RESTITUISCE SOLO LA LISTA DEI NOMI)
 * ------------------------------------------------------------- */
function getFantallenatoriString(arr) {
    if (!arr || arr.length === 0) return "";
    return arr.join(", ");
}

/* -------------------------------------------------------------
 * POPOLA CALENDARIO (CORREZIONE: RIMOZIONE "Fanta: ")
 * ------------------------------------------------------------- */
function popolaCalendario(calendario) {
    const container = document.getElementById("contenuto-calendario");
    const filtriTurni = document.getElementById("filtri-turni");

    container.innerHTML = "";
    Array.from(filtriTurni.querySelectorAll('.filtro-btn:not([data-turno="all"])'))
        .forEach(btn => btn.remove());

    for (const turnoKey in calendario) {
        const turno = calendario[turnoKey];
        const titoloTurno = formattaTitoloTurno(turnoKey);

        // Bottone filtro turno
        const btn = document.createElement("button");
        btn.classList.add("filtro-btn");
        btn.dataset.turno = turnoKey;
        btn.textContent = titoloTurno;
        filtriTurni.appendChild(btn);

        // Contenitore turno
        const turnoDiv = document.createElement("div");
        turnoDiv.classList.add("turno-container", turnoKey);

        const h3 = document.createElement("h3");
        h3.textContent = titoloTurno.toUpperCase();
        turnoDiv.appendChild(h3);

        const date = document.createElement("p");
        date.textContent = `Periodo: ${turno.date}`;
        turnoDiv.appendChild(date);

        // PARTITE
        turno.partite.forEach(partita => {
            const partitaDiv = document.createElement("div");
            partitaDiv.classList.add("partita");

            const squadreDiv = document.createElement("span");
            squadreDiv.classList.add("squadre");

            let casa = `<span>${partita.casa}</span>`;
            let ospite = `<span>${partita.ospite}</span>`;
            let qualificata = "";

            // Risultato
            const risultatoDiv = document.createElement("span");
            risultatoDiv.classList.add("risultato");
            risultatoDiv.textContent = partita.risultato;

            /* ---------------------------------------------------
             * DETERMINA QUALIFICATA
             * --------------------------------------------------- */
            if (partita.risultato.toLowerCase() !== "da giocare") {
                let res = partita.risultato;

                let scoreRegex = res.match(/(\d+)-(\d+)/);
                if (scoreRegex) {
                    let golCasa = parseInt(scoreRegex[1]);
                    let golOspite = parseInt(scoreRegex[2]);

                    if (golCasa > golOspite) qualificata = partita.casa;
                    else if (golOspite > golCasa) qualificata = partita.ospite;
                }
            }

            if (qualificata === partita.casa) casa = `<span class="squadra-qualificata">${partita.casa}</span>`;
            if (qualificata === partita.ospite) ospite = `<span class="squadra-qualificata">${partita.ospite}</span>`;

            /* ---------------------------------------------------
             * SEPARATORE DINAMICO (MODIFICATO)
             * Il separatore è ora sempre un trattino (" - ") come richiesto.
             * --------------------------------------------------- */
            const separatore = " - "; 

            squadreDiv.innerHTML = `${casa}${separatore}${ospite}`;

            // Fantallenatori
            const fantaDiv = document.createElement("div");
            fantaDiv.classList.add("fantallenatori-coinvolti");

            const fantaArray = partita.fantallenatoriCoinvolti || [];
            const fantaNames = getFantallenatoriString(fantaArray);
            
            // CORREZIONE: Mostra SOLO i nomi o l'etichetta "Nessuna squadra Fanta coinvolta"
            fantaDiv.textContent = fantaNames ? fantaNames : "Nessuna squadra Fanta coinvolta";

            partitaDiv.appendChild(squadreDiv);
            partitaDiv.appendChild(risultatoDiv);
            partitaDiv.appendChild(fantaDiv);

            turnoDiv.appendChild(partitaDiv);
        });

        container.appendChild(turnoDiv);
    }
}

/* -------------------------------------------------------------
 * FILTRO TURNI (Invariato)
 * ------------------------------------------------------------- */
function handleFiltroTurnoClick(e) {
    document.querySelectorAll(".filtro-btn").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    currentTurnoFilter = e.target.dataset.turno;
    applyAllFilters();
}

/* -------------------------------------------------------------
 * FILTRO SQUADRE (Invariato)
 * ------------------------------------------------------------- */
function handleFiltroSquadraClick(e) {
    document.querySelectorAll(".filtro-squadra-btn").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    currentSquadraFilter = e.target.dataset.squadra;
    applyAllFilters();
}

/* -------------------------------------------------------------
 * APPLICA TUTTI I FILTRI (Il filtro per squadra non cerca "Fanta: ")
 * ------------------------------------------------------------- */
function applyAllFilters() {
    const turni = document.querySelectorAll(".turno-container");

    turni.forEach(turno => {
        const turnoKey = turno.classList[1];

        // 1. Controlla se il turno è selezionato (Logica di filtro turno corretta)
        const showTurnoByTurnoFilter = currentTurnoFilter === "all" || currentTurnoFilter === turnoKey;

        const partite = turno.querySelectorAll(".partita");
        let turnoHasVisibleMatches = false; 

        partite.forEach(partita => {
            let showPartitaBySquadraFilter = true;

            const squadreTxt = partita.querySelector(".squadre").textContent;
            const fantaTxt = partita.querySelector(".fantallenatori-coinvolti").textContent;

            // 2. Filtro Squadra
            if (currentSquadraFilter !== "all") {
                const fantallenatore = fantallenatoriMap[currentSquadraFilter];

                const matchSquadra = squadreTxt.includes(currentSquadraFilter);
                // CORREZIONE: Cerca SOLO il nome del fantallenatore nel campo a destra
                const matchFanta = fantallenatore && fantaTxt.includes(fantallenatore);

                if (!matchSquadra && !matchFanta) {
                    showPartitaBySquadraFilter = false;
                }
            }
            
            // 3. Applica visibilità Partita:
            if (showTurnoByTurnoFilter && showPartitaBySquadraFilter) {
                partita.classList.remove("hidden");
                turnoHasVisibleMatches = true; 
            } else {
                partita.classList.add("hidden");
            }
        });

        // 4. Applica visibilità Turno:
        if (showTurnoByTurnoFilter && turnoHasVisibleMatches) {
            turno.classList.remove("hidden");
        } else {
            turno.classList.add("hidden");
        }
    });
}

/* -------------------------------------------------------------
 * POPOLA SEZIONI FINALI (Invariata)
 * ------------------------------------------------------------- */
function popolaSezioniFinali(data) {
    document.querySelector("#classifica-finale pre").textContent = data.classificaFinale || "";
    document.querySelector("#classifica-fantallenatori pre").textContent = data.classificaFantallenatori || "";
    document.querySelector("#palmares-fantacoppa pre").textContent = data.palmares || "";
}