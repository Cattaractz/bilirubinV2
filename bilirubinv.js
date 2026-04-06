let bilirubinChart = null;


// Exact data points provided for 0-14 days nomogram
const linesData = {
    exchange: [ {x:0, y:200}, {x:3, y:400}, {x:14, y:400} ],
    red:      [ {x:0, y:133}, {x:0.5, y:133}, {x:0.51, y:154}, {x:0.999, y:154}, {x:1, y:175}, {x:3, y:350}, {x:14, y:350} ],
    pink:     [ {x:0, y:108}, {x:0.5, y:108}, {x:0.51, y:129}, {x:0.999, y:129}, {x:1, y:150}, {x:3, y:300}, {x:14, y:300} ],
    blue:     [ {x:0, y:100}, {x:0.5, y:100}, {x:0.51, y:123}, {x:0.999, y:123}, {x:1, y:150}, {x:4, y:250}, {x:14, y:250} ],
    cyan:     [ {x:0, y:100}, {x:0.5, y:100}, {x:0.51, y:100}, {x:0.999, y:100}, {x:1, y:125}, {x:4, y:200}, {x:14, y:200} ],
    green:    [ {x:0, y:100}, {x:0.5, y:100}, {x:0.51, y:100}, {x:0.999, y:100}, {x:1, y:100}, {x:4, y:150}, {x:14, y:150} ]
};

const curveMeta = [
    { id: 'red', label: 'Rød >2500g (GA≥38)', color: '#ff4d4d' },
    { id: 'pink', label: 'Rosa >2500g & 34-37 uker', color: '#ff99cc' },
    { id: 'blue', label: 'Blå 1500-2500g', color: '#3399ff' },
    { id: 'cyan', label: 'Cyan 1000-1500g', color: '#00cccc' },
    { id: 'green', label: 'Grønn <1000g', color: '#33cc33' }
];

const infoContent = {
    nomogram: {
        title: "Veiledning til bruk av nomogram",
        text: "Velg riktig kurve, manuelt eller skriv in GA og FV for og la programmet velge rett graf for deg. Grafen viser behandlingsgrenser. På måling 1 skriver du inn barnets alder ved prøvetaking og bilirubinverdi. Klikk beregn for å se hvor langt verdien er fra grensen. Har du 2 verdier får du estimert når den kan forventes å krysse sin grense. \n \n OBS! Nomogrammet kan brukes utover 10 dager, men bruk da aktuell vekt/postmentruell alder på barnet.  "
    }, 
    rebound: {
        title: "Veiledning til langvarig gulsot kalkulator",
        text: "Langvarig gulsot defineres som synlig gulsot:  \n" +
          "<ul>" +
          "<li>Ved 2 ukers alder hos barn som kun får morsmelkerstatning</li>" +
          "<li>Ved 3 ukers alder hos barn som ammes </li>" +
          "</ul>" + 
          "Dette verktøyet beregner stigningstakt etter lysbehandling. Legg inn de 2 siste prøvene før barnet ble lagt i lys, og kontrollprøven etter barnet ble tatt ut av lys. <br><br>" +
          "Toppverdi er prøven hvor barnet har krysset lysgrense, prøve 1 er siste prøven før dette og kontrollprøven er første prøve etter barnet er tatt ut av lys. Kalkulatoren regner da ut når bilirubinverdien vil krysse grensen på nytt basert på forrige stigningsgrad.<br><br>" +
          "Se <a href='https://www.helsebiblioteket.no/innhold/retningslinjer/pediatri/nyfodtmedisin-veiledende-prosedyrer-fra-norsk-barnelegeforening/8-gulsott-og-hemolytisk-sykdom/8.4-prolongert-ikterus-mistenkt-kolestase-1014-dagers-alder' target='_blank' style='text-decoration: underline; color: #008080;'>veileder</a> for mer informasjon."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const dateIn = document.getElementById('birth_date_input');
    const timeIn = document.getElementById('birth_time_input');
    const testDate = document.getElementById('test_date_input');
    const testTime = document.getElementById('test_time_input');
    const display = document.getElementById('live_age_val');
    const resetBtn = document.getElementById('reset_age_btn');

    // --- 1. Date Auto-formatter (DD.MM) ---
    const handleDateInput = (e) => {
        
            let val = e.target.value.replace(/\D/g, ''); 
            if (val.length > 2) {
                val = val.slice(0, 2) + '.' + val.slice(2, 4);
            }
            e.target.value = val;
            
            //auto-focus logic - flytter automatisk til tid
            if (val.length === 5) {
                const nextInputId = e.target.id.replace('date', 'time');
                const nextInput = document.getElementById(nextInputId);
                if (nextInput) nextInput.focus();
            }

            updateAgeDisplay();
    
    };

    // --- 2. Time Auto-formatter (HH:MM) ---
    const handleTimeInput = (e) => {
     
            let val = e.target.value.replace(/\D/g, ''); 
            if (val.length > 2) {
                val = val.slice(0, 2) + ':' + val.slice(2, 4);
            }
            e.target.value = val;
            updateAgeDisplay();
        
    };

    [dateIn, testDate].forEach(el => el && el.addEventListener('input', handleDateInput));
    [timeIn, testTime].forEach(el => el && el.addEventListener('input', handleTimeInput));

    // --- 3. The Math & Display Logic ---
    function updateAgeDisplay() {
        if (!dateIn || !testDate || !display ) return;
        
        
        const birthDate = parseSmartDate(dateIn.value);
        const targetDate = parseSmartDate(testDate.value)

        if (!birthDate || !targetDate) {
            display.innerText = "-- timer";
            display.style.color = "#8fa0b3";
            return;
        }

        const applyTime = (dateObj, inputElement, defaultHour) => {
            const val = inputElement ? inputElement.value.trim() : "";
            if (val.length === 5) {
                const [hours, minutes] = val.split(':');
                dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                return true;
            } else {
                dateObj.setHours(defaultHour, defaultMinute, 0, 0);
                return false;
            }
        };

        const birthTimeSet = applyTime(birthDate, timeIn, 23, 59); // Latest possible birth
        const testTimeSet = applyTime(targetDate, testTime, 0, 0);  // Earliest possible test


        const timeVal = timeIn ? timeIn.value.trim() : "";

        const isTimeComplete = (timeVal.length === 5);

        if (isTimeComplete) {
            // User entered specific time
            const [hours, minutes] = timeVal.split(':');
            birthDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);
        } else {
            // DEFAULT MATH: Assume 23:59 for "Minimum Age" if time is missing
            birthDate.setHours(23, 59, 0, 0);
        }

        const diffHours = (targetDate - birthDate) / (1000 * 60 * 60);

        if (diffHours < -0.01) {
            display.innerText = "Fremtid?";
            display.style.color = "#d9534f";
        } else {
            const bothTimesProvided = birthTimeSet && testTimeSet;
            const val = bothTimesProvided ? (Math.round(diffHours * 10) / 10) : Math.floor(diffHours);
            
            display.innerText = (bothTimesProvided ? "" : "Minst ") + val + " timer";
            display.style.color = bothTimesProvided ? "#5abcb6" : "#4cb98f";
        }
    }

    // --- 4. Click to Apply Logic ---
    if (display) {
        display.addEventListener('click', () => {
            const text = display.innerText;
            const match = text.match(/\d+(\.\d+)?/);
            
            if (match) {
            const valToCopy = match[0];

            // 1. Try modern Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(valToCopy).then(() => {
                    showCopyFeedback(display);
                });
            } else {
                // 2. Fallback for non-https or local files
                const textArea = document.createElement("textarea");
                textArea.value = valToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showCopyFeedback(display);
                } catch (err) {
                    console.error('Kunne ikke kopiere', err);
                }
                document.body.removeChild(textArea);
            }
        }
        });
    }
    function showCopyFeedback(el) {
    const originalText = el.innerText;
    const originalColor = el.style.color;
    
    el.innerText = "Kopiert!";
    el.style.color = "#bc715a";
    
    setTimeout(() => {
        el.innerText = originalText;
        el.style.color = originalColor;
    }, 1000);
}

    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
                dateIn.value = "";
                timeIn.value = "";
                testDate.value = "";
                testTime.value = "";
                updateAgeDisplay();
        });
    }

    // --- 5. Other UI Event Listeners ---


// Add a way to close it by clicking anywhere on the overlay
document.getElementById('info-text').onclick = function() {
    this.style.display = "none";
};

    const toggle = document.getElementById('toggle-input');
    if (toggle) toggle.onchange = toggleInputMethod;

    const weightIn = document.getElementById('weight_input');
    const gaIn = document.getElementById('ga_input');
    const t1In = document.getElementById('t1');
    
    if (weightIn) {
    weightIn.addEventListener('input', (e) => {
        // Remove non-numeric chars
        let val = e.target.value.replace(/\D/g, '');
        
        // Auto-select curve logic (keep your existing call)
        autoSelectCurve();

        // 2. ADD THIS: Tell the chart to redraw with the new curve
        updateChart();

        // Auto-jump to GA if weight is 4 digits (e.g., 3500)
        if (e.target.value.length >= 4 && gaIn) {
            gaIn.focus();
        }
    });
}

if (gaIn) {
    gaIn.addEventListener('input', (e) => {
        // Auto-select curve logic
        autoSelectCurve();
        // 2. ADD THIS: Tell the chart to redraw with the new curve
        updateChart()

        // Auto-jump to Måling 1 (t1) if GA is 2 digits (e.g., 38)
        if (e.target.value.length >= 2) {
            const t1Input = document.getElementById('t1');
            if (t1Input) t1Input.focus();
        }
    });
}



    // Initialize the graph
    initChart();

    const riskLineSelect = document.getElementById('riskLine');
    if (riskLineSelect) {
        riskLineSelect.addEventListener('change', (e) => {
            const colorMap = {
                red: '#ff4d4d', pink: '#ff99cc', blue: '#3399ff', cyan: '#00cccc', green: '#33cc33'
            };
            e.target.style.borderColor = colorMap[e.target.value];
            
            updateChart();
        });
    }

    // Close age popup when clicking outside
    window.addEventListener('click', function(event) {
        const popup = document.getElementById('age-popup');
        const ageBtn = document.querySelector('.age-open-btn');
        if (popup && popup.style.display === 'block') {
            if (!popup.contains(event.target) && !ageBtn.contains(event.target)) {
                closeAgePopup();
            }
        }
    });




   // This should be the last thing inside your DOMContentLoaded block
const t1Field = document.getElementById('t1');
const v1Field = document.getElementById('v1');
const t2Field = document.getElementById('t2');
const v2Field = document.getElementById('v2');

[t1Field, v1Field, t2Field, v2Field].forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            // Only update if we have enough data for at least one point
            
                updateChart();
            
        });
    }
});

const measurementInputs = ['t1', 'v1', 't2', 'v2'];
measurementInputs.forEach(id => {
    const inputElement = document.getElementById(id);
    if (inputElement) {
        inputElement.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevents the page from reloading
                calculateBilirubin(); // Triggers your main calculation function
            }
        });
    }
});

});

// Helper: Linear Interpolation for treatment limits
function getLimitAtTime(curveId, hours) {
    const days = hours / 24;
    const data = linesData[curveId];
    if (!data) return 0;
    
    for (let i = 0; i < data.length - 1; i++) {
        let p1 = data[i];
        let p2 = data[i + 1];
        if (days >= p1.x && days <= p2.x) {
            if (p1.x === p2.x) return p2.y;
            const t = (days - p1.x) / (p2.x - p1.x);
            return p1.y + t * (p2.y - p1.y);
        }
    }
    return data[data.length - 1].y;
}

function calculateBilirubin() {
    const t1 = parseFloat(document.getElementById('t1').value);
    const v1 = parseFloat(document.getElementById('v1').value);
    const t2 = parseFloat(document.getElementById('t2').value);
    const v2 = parseFloat(document.getElementById('v2').value);
    const selId = document.getElementById('riskLine').value;

    if (isNaN(t1) || isNaN(v1)) {
        alert("Vennligst legg inn minst Måling 1");
        return;
    }

    const selectedCurve = curveMeta.find(c => c.id === selId);
    const actT = isNaN(t2) ? t1 : t2;
    const actV = isNaN(v2) ? v1 : v2;
    const limit = getLimitAtTime(selId, actT);
    const exchangeLimit = getLimitAtTime('exchange', actT)
    const diff = actV - limit;
    const isOverLimit = actV >= limit;
    const isOverExchange = actV >= exchangeLimit;
    const avstand = Math.round(Math.abs(actV - limit));
    const diffOverExchange = Math.round(actV - exchangeLimit);
    const distanceToLimit = Math.abs(diff);


    // 1. Beregn avstand til ALLE kurver
    const compData = curveMeta.map(c => {
        const lim = getLimitAtTime(c.id, actT);
        return {
            id: c.id,
            label: c.label,
            color: c.color,
            diff: actV - lim
        };
    });

    // 2. Logikk for å finne krysning (intersectX)
    let intersectX = null;
    if (!isNaN(t2) && !isNaN(v2) && t2 > t1) {
        const slope = (v2 - v1) / (t2 - t1);
        for (let checkT = t2; checkT <= 336; checkT += 0.5) {
            const projectedV = v2 + slope * (checkT - t2);
            if (projectedV >= getLimitAtTime(selId, checkT)) {
                intersectX = checkT;
                break;
            }
        }
    }

    let alertHtml = "";
    const needsHemolysisWorkup = actV > 400 || (actT < 24 && isOverLimit);

    if (actV > 450){
        alertHtml = `<div style="margin-top: 15px; padding: 15px; background-color: #f8d7da; border-left: 6px solid #dc3545; color: #721c24; border-radius: 8px;">
                <strong style="display: block; font-size: 1.1rem; margin-bottom: 5px;">🚨 KRITISK: Over utskiftningsgrense!</strong>
                <span style="font-size: 0.95rem; line-height: 1.4;">
                    Verdien på <strong>${actV} µmol/L</strong> er over grensen for utskiftningstransfusjon (~${Math.floor(exchangeLimit)} µmol/L). Legg barnet i lys, bruk reflekterende flater (hvitt laken innvendig rundt sengen og hvitt forheng rundt lyskassen), og avstanden mellom overlyset og barnet reduseres til 15-20 cm. Barnet bør være innlagt ved en nyfødtavdeling og ha overvåkning med minimum metningsmåler.  Det kan være nødvendig med Hb, retikulocytter, blodtype og DAT.
                    <strong>Konferer med vakthavende barnelege umiddelbart.</strong>
                </span>
            </div>`;
    }
    else if (isOverExchange) {
        alertHtml = `<div style="margin-top: 15px; padding: 15px; background-color: #f8d7da; border-left: 6px solid #dc3545; color: #721c24; border-radius: 8px;">
                <strong style="display: block; font-size: 1.1rem; margin-bottom: 5px;">🚨 KRITISK: Over utskiftningsgrense!</strong>
                <span style="font-size: 0.95rem; line-height: 1.4;">
                    Verdien på <strong>${actV} µmol/L</strong> er over grensen for utskiftningstransfusjon (~${Math.floor(exchangeLimit)} µmol/L). Det kan være nødvendig med Hb, retikulocytter, blodtype og DAT. Vurder kontroll s-bili 6 timer etter oppstart lysbehandling.
                    <strong>Konferer med vakthavende barnelege umiddelbart.</strong>
                </span>
            </div>`;
    }else if (actT < 24 && isOverLimit){
        alertHtml = `
            <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-left: 6px solid #ffc107; color: #856404; border-radius: 8px;">
                <strong style="display: block; font-size: 1rem; margin-bottom: 5px;">⚠️ Utvidet utredning påkrevd</strong>
                <span style="font-size: 0.9rem; line-height: 1.4;">
                    Ved behandlingskrevende gulsott < 24t skal det tas <strong>Hb, retikulocytter, blodtype og DAT</strong> for å utelukke hemolyse. Vurder kontroll s-bili 6 timer etter oppstart lysbehandling.
                </span>
            </div>`;
    }     else if (isOverLimit) {
        alertHtml = `
            <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-left: 6px solid #ffc107; color: #856404; border-radius: 8px;">
                <strong style="display: block; font-size: 1rem; margin-bottom: 5px;">⚠️ Vurder blodprøve (S-Bili)</strong>
                <span style="font-size: 0.9rem; line-height: 1.4;">
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Ved kontroll under 18 timer etter avsluttet lysbehandling tas kontroll med TSB (ikke TcB).</li>
                        <li>Ved kontroll over 18 timer etter avsluttet lysbehandling kan kontroll tas med TcB.</li>
                    </ul>
                    <div style="margin-top: 12px; font-weight: 600;">
                        Foreslåtte kontrolltidspunkt: 08:00, 12:00, 18:00, 23:00
                    </div>
                </span>
            </div>`;


    }else if (!isOverLimit && (avstand <=50 || actV > 275)){
    const isTooClose = !isOverLimit && distanceToLimit <= 50; 
    const isAboveAbsoluteThreshold = actV > 275;

        let begrunnelse = isAboveAbsoluteThreshold 
            ? `målt verdi (${actV} µmol/L) er over 275 µmol/L` 
            : `verdien er kun ${avstand} µmol/L fra behandlingsgrensen`;

        alertHtml = `
            <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-left: 6px solid #ffc107; color: #856404; border-radius: 8px;">
                <strong style="display: block; font-size: 1rem; margin-bottom: 5px;">⚠️ Vurder blodprøve (S-Bili)</strong>
                <span style="font-size: 0.9rem; line-height: 1.4;">
                    Fordi ${begrunnelse}, er transkutan måling (tc-bili) upresis. 
                    <strong>Dersom verdien er målt med tc-bili, må det tas en blodprøve før klinisk beslutning.</strong>
                </span>
            </div>`;
    
    }

    // 3. TC-BILI SIKKERHETSSJEKK
    

    // 4. Generer de spesifikke setningene (FIXED LOGIC)
    let dynamiskTekst = "";
    if (!isNaN(t2) && !isNaN(v2)) {
        const slope = (v2 - v1) / (t2 - t1);
        const currentLimit = getLimitAtTime(selId, t2)
        const distanceToLimit = currentLimit - v2;
        
        if (isOverExchange){
            dynamiskTekst = `Pasientens verdi på ${v2} er ~ ${diffOverExchange} µmol/L over utskiftningsgrensen. Barnet skal legges i lys og det tas en kontroll TSB 6 timer etter oppstart lysbehandling.`;
        }

        else if (isOverLimit) {
            dynamiskTekst = `Siste målte verdi på ${v2} er ${avstand} µmol/L over behandlingsgrense på ${Math.floor(currentLimit)}. Barnet kan legges i lys og ny kontroll kan tas en gang mellom 12-24 timer etter avsluttet fototerapi. `;
        }
        else if (slope === 0) {
        dynamiskTekst = "Pasientens bilirubinverdi er stabil, det kan være behov for en ny kontroll.";
    } else {
        const trendOrd = slope >= 0 ? "stiger" : "faller";
        const stigningPerTime = Math.abs(slope).toFixed(2);

        let krysningTekst = "";
        if (slope > 0) {
            if (intersectX){
                const timerFraSiste = Math.round(intersectX - t2);
                krysningTekst = ` og vil krysse grensen ved ca. ${Math.floor(intersectX)} timer alder (~${timerFraSiste}t fra siste prøve). Det kan tas ny kontroll på blodprøverunder ved eller like etter krysningstidspunktet.`;
            }
            else {
                krysningTekst = ", men vil sannsynligvis ikke krysse sin behandlingsgrense innen 14 dagers alder";
            }
            
        } else  {
            krysningTekst = ". Verdien er synkende. Kontroller kan avsluttes, men det kan tas ny kontroll om barnet utvikler mer synlig gulsott eller om det får klinikk forenelig med hyperbilirubinemi.";
            
        } 

        dynamiskTekst = `Pasientens bilirubinverdi ${trendOrd} med ${stigningPerTime} µmol/L per time${krysningTekst}.`;

        if (!isOverLimit && distanceToLimit < 20 && distanceToLimit > 0){
            dynamiskTekst += " Verdien er under 20 µmol/L fra grensen; ny kontroll anbefales om ca. 24 timer.";
        }
    }
        
        
    } else {
        const avstand = Math.round(distanceToLimit);
        const currentLimit = getLimitAtTime(selId, t1)
        const overUnder = isOverLimit ? "over" : "under";
        if (isOverExchange){
            dynamiskTekst = `Pasientens verdi på ${v1} er ~ ${diffOverExchange} µmol/L over utskiftningsgrensen. Barnet kan legges i lys og ny kontroll tas 6 timer etter oppstart lysbehandling`;
        } else {
           dynamiskTekst = `Pasienten har en verdi på ${actV} µmol/L, som er ${avstand} µmol/L ${overUnder} behandlingsgrensen på ~ ${Math.floor(currentLimit)} µmol/L`; 
        }
        
    }


    // 6. Oppdater grafen
    updateChart(t1, v1, t2, v2, intersectX);

    // 7. Vis resultatet i boksen
    const resBox = document.getElementById('result-box');
    resBox.classList.add('visible');
    resBox.innerHTML = `
        <div class="comparison-column">
            <div style="font-size:0.75rem; font-weight:bold; color:#8fa0b3; margin-bottom:10px; text-transform: uppercase;">Avstand til kurver</div>
            ${compData.map(c => `
                <div class="comparison-card" style="border-left: 4px solid ${c.color}; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; font-weight: 600;">${c.label.split(' ')[0]}</span>
                    <strong style="color:${c.diff > 0 ? '#d9534f' : '#5abcb6'}">
                        ${c.diff > 0 ? '+' : ''}${Math.round(c.diff)}
                    </strong>
                </div>
            `).join('')}
        </div>
        <div class="main-result-panel" style="flex: 1;">
            <h3 style="margin:0; color:${isOverExchange ? '#dc3545' : (isOverLimit ? '#d9534f' : '#5abcb6')}">
                ${isOverExchange ? '‼️ OVER UTSKIFTNINGSGRENSE' : (isOverLimit ? '🚨 Over behandlingsgrense' : '✅ Under behandlingsgrense')}
            </h3>
            <div style="font-size:2.8rem; font-weight:900; margin: 5px 0;">${actV} <small style="font-size:1.2rem; color:#666;">µmol/L</small></div>
            
            <p style="margin:0 0 15px 0; font-size: 1.15rem; line-height: 1.5; color: #33475b;">
                ${dynamiskTekst}
            </p>

            <button class="copy-journal-btn" id="copyBtn">
                 <i class="fa-regular fa-copy"></i> Kopier til journal
            </button>

            ${alertHtml}
        </div>
    `;
        const btn = document.getElementById('copyBtn');
    if (btn) {
        btn.onclick = () => {
            // Vi bygger teksten her for å sikre at vi har de nyeste verdiene
            const journalText = `${dynamiskTekst}`;
            
            copyToJournal(journalText);
        };
    }
};


function initChart() {
    const ctx = document.getElementById('bilirubinChart').getContext('2d');
    if (bilirubinChart) bilirubinChart.destroy();
    
    const datasets = [
        {
            label: 'Utskiftning',
            data: linesData.exchange.map(p => ({x: p.x * 24, y: p.y})),
            borderColor: '#000',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
        },
        ...curveMeta.map(c => ({
            label: c.label,
            data: linesData[c.id].map(p => ({x: p.x * 24, y: p.y})),
            borderColor: c.color,
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false
        }))
    ];

    bilirubinChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, pointStyle: 'line', padding: 15 }
                }
            },
            scales: {
                x: { 
                    type: 'linear', 
                    title: { display: true, text: 'Alder', font: {weight: 'bold'} }, 
                    min: 0, 
                    max: 336, // EXTENDED TO 14 DAYS (14 * 24)
                    ticks: { 
                        stepSize: 24, // Show a vertical line for every day
                        callback: function(value) { 
                            return [(value/24) + 'd ', +value + 't ' ]; }
                    }
                },
                y: { 
                    title: { display: true, text: 'Bilirubin (µmol/L)' }, 
                    min: 0, max: 450 
                }
            }
        }
    });
}

function updateChart(t1, v1, t2, v2, intersectX) {

    // 1. If no numbers were passed (live update), grab them from the boxes
    if (t1 === undefined) t1 = parseFloat(document.getElementById('t1').value);
    if (v1 === undefined) v1 = parseFloat(document.getElementById('v1').value);
    if (t2 === undefined) t2 = parseFloat(document.getElementById('t2').value);
    if (v2 === undefined) v2 = parseFloat(document.getElementById('v2').value);


    const selId = document.getElementById('riskLine').value;
    
    // 1. Highlight Logic: Update base datasets (Exchange + 5 risk lines)
    const datasetMap = { red: 1, pink: 2, blue: 3, cyan: 4, green: 5 };
    const activeIndex = datasetMap[selId];

    bilirubinChart.data.datasets.forEach((dataset, index) => {
        if (index === 0) {
            // Exchange line: Dark grey/black but thin
            dataset.borderColor = 'rgba(44, 62, 80, 0.2)';
            dataset.borderWidth = 1.5;
        } else if (index >= 1 && index <= 5) {
            const originalColor = curveMeta[index - 1].color;
            
            if (index === activeIndex) {
                // Selected line: Full vibrant color and thick
                dataset.borderColor = originalColor;
                dataset.borderWidth = 4;
            } else {
                // Inactive lines: Faint greyish version of the color
                // We use '66' (40% opacity) to make them less faded than before
                // while keeping them distinct from the active one.
                dataset.borderColor = originalColor + '66'; 
                dataset.borderWidth = 2; // Slightly thicker than before to see the color better
            }
        }
    });

    // 2. Clear old measurement points/projections (indices 6+)
    bilirubinChart.data.datasets = bilirubinChart.data.datasets.slice(0, 6);


    if (!isNaN(t1) && !isNaN(v1)) {

            // 3. Re-add Patient measurements
        let patientPoints = [{x: t1, y: v1}];
        if (!isNaN(t2) && !isNaN(v2)) patientPoints.push({x: t2, y: v2});

        bilirubinChart.data.datasets.push({
            label: 'Målt stigning',
            data: patientPoints,
            borderColor: '#2c3e50',
            borderWidth: 3,
            pointRadius: 6,
            pointBackgroundColor: '#2c3e50',
            showLine: true,
            fill: false
        });

        // 4. Re-add Projection Logic
        if (intersectX && !isNaN(t2)) {
            const slope = (v2 - v1) / (t2 - t1);
            const intersectY = v2 + slope * (intersectX - t2);

            bilirubinChart.data.datasets.push({
                label: 'Projisert trend',
                data: [{x: t2, y: v2}, {x: intersectX, y: intersectY}],
                borderColor: '#2c3e50',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                showLine: true,
                fill: false
            });

            bilirubinChart.data.datasets.push({
                label: 'Krysningspunkt',
                data: [{x: intersectX, y: intersectY}],
                pointStyle: 'crossRot',
                pointRadius: 10,
                pointBorderColor: '#d9534f',
                pointBorderWidth: 4,
                showLine: false
            });
        }
    }
    



    bilirubinChart.update();
}

function toggleInputMethod() {
    const isAuto = document.getElementById('toggle-input').checked;
    const autoFields = document.getElementById('auto-input-fields');
    const manualFields = document.getElementById('manual-input-fields');

    if (isAuto) {
        autoFields.style.display = 'grid';
        manualFields.style.display = 'none';
    } else {
        autoFields.style.display = 'none';
        manualFields.style.display = 'block';
    }
}

function autoSelectCurve() {
    const w = parseFloat(document.getElementById('weight_input').value);
    const ga = parseFloat(document.getElementById('ga_input').value);
    const sel = document.getElementById('riskLine');
    if (isNaN(w) && isNaN(ga)) return;

    let target = "red";
    if (w < 1000) target = "green";
    else if (w < 1500) target = "cyan";
    else if (w < 2500) target = "blue";
    else if (ga >= 34 && ga <= 37) target = "pink";
    if (sel.value !== target) {
        sel.value = target;
        sel.dispatchEvent(new Event('change')); // This makes the chart pop up!
    }
}

function switchTab(element, tabId) {
    // 1. Oppdater aktive faner
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // 2. Vis riktig seksjon og skjul andre
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + tabId).classList.add('active');

    // 3. Oppdater overskrift og info-tekst dynamisk
    const titleEl = document.getElementById('view-title');

    // Skjul info-boksen automatisk ved tab-skifte for en renere overgang
    document.getElementById('info-text').style.display = 'none';
}

function resetForm() { location.reload(); }

function copyToJournal(text, btnId = 'copyBtn') {
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(btnId);
        if(!btn) return;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopiert!';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '#4a6fa5';
        }, 2000);
    }).catch(err => {
        console.error('Kunne ikke kopiere: ', err);
    });
}

// ----------------------------------------------------
// PROTRAHERT BILIRUBIN (REBOUND) - 3 Verdier
// ----------------------------------------------------
function calcRebound() {
    const d1 = new Date(document.getElementById('r_d1').value);
    const v1 = parseFloat(document.getElementById('r_v1').value);
    const d2 = new Date(document.getElementById('r_d2').value);
    const v2 = parseFloat(document.getElementById('r_v2').value);
    const d3 = new Date(document.getElementById('r_d3').value);
    const v3 = parseFloat(document.getElementById('r_v3').value);
    const limit = parseFloat(document.getElementById('r_limit').value);
    const resBox = document.getElementById('res-rebound');

    if (isNaN(d1) || isNaN(v1) || isNaN(d2) || isNaN(v2) || isNaN(d3) || isNaN(v3)) {
        alert("Vennligst fyll ut alle feltene.");
        return;
    }

    // FIXED: Force the box to display in case CSS display:none is stuck
    resBox.style.display = 'flex';
    resBox.classList.add('visible');
    
    // Calculate rate (stigningstakt) based on measurements 1 and 2
    const diffHours = Math.abs(d2 - d1) / 3600000;
    const rate = (v2 - v1) / diffHours;
    const remaining = limit - v3;
    
    let statusText = "✅ Under grense";
    let statusColor = "#5abcb6";
    let mainMsg = "";

    if (rate <= 0) {
        mainMsg = `Trenden er flat eller synkende (${rate.toFixed(2)} µmol/L/t). Ingen krysning beregnet.`;
    } else if (remaining <= 0) {
        statusText = "🚨 Over grense";
        statusColor = "#d9534f";
        mainMsg = `Siste kontroll er allerede over valgt grense på ${limit} µmol/L.`;
    } else {
        const hoursToLimit = remaining / rate;
        const crossDate = new Date(d3.getTime() + (hoursToLimit * 3600000));
        
        // Format date and time for Norwegian locale (e.g., 14. mars klokken 12:00)
        const dateStr = crossDate.toLocaleDateString('no-NO', { day: 'numeric', month: 'long' });
        const timeStr = crossDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        
        statusColor = "#ac3618";
        statusText = "⚠️ Forventet krysning";
        mainMsg = `Viss bilirubinverdien fortsetter å stige i samme hastighet vil den krysse lysgrensen ${limit} µmol/L, den ${dateStr} klokken ${timeStr}.`;
    }

    resBox.innerHTML = `
        <div class="comparison-column">
            <div style="font-size:0.75rem; font-weight:bold; color:#8fa0b3; margin-bottom:10px; text-transform:uppercase;">Trend-detaljer</div>
            <div class="comparison-card" style="border-left: 4px solid #4a6fa5; margin-bottom: 8px;">
                <span>Stigning</span><strong>${rate.toFixed(1)} <small>µ/t</small></strong>
            </div>
            <div class="comparison-card" style="border-left: 4px solid #5abcb6;">
                <span>Grense</span><strong>${limit}</strong>
            </div>
        </div>
        <div class="main-result-panel" style="justify-content: flex-start;">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; gap: 10px;">
                <h3 style="margin:0; font-size:1.1rem; color:${statusColor}">${statusText}</h3>
                <button class="copy-journal-btn" id="copyReboundBtn" style="margin:0; padding: 8px 12px; font-size: 0.85rem;">
                    <i class="fa-regular fa-copy"></i> Kopier tekst
                </button>
            </div>
            
            <div style="background: #ffffff; padding: 18px; border-radius: 12px; border: 1px solid #e1eef1; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
                <p style="margin:0; font-size: 1.1rem; color: #33475b; line-height: 1.5;">${mainMsg}</p>
            </div>

        </div>
    `;
    document.getElementById('copyReboundBtn').onclick = () => copyToJournal(mainMsg, 'copyReboundBtn');
}

function clearRebound() {
    document.getElementById('r_d1').value = '';
    document.getElementById('r_v1').value = '';
    document.getElementById('r_d2').value = '';
    document.getElementById('r_v2').value = '';
    document.getElementById('r_d3').value = '';
    document.getElementById('r_v3').value = '';
    document.getElementById('r_limit').value = '350';
    
    // Ensure both class and inline style reset
    const resBox = document.getElementById('res-rebound');
    resBox.classList.remove('visible');
    resBox.style.display = 'none';
}

// Vise og beregne barnest alder. 

function parseSmartDate(inputStr) {
    if (!inputStr || inputStr.length < 5) return null;

    const now = new Date();
    const currentYear = now.getFullYear(); 
    
    // Replace dots/commas with slashes for uniform processing
    let cleanStr = inputStr.replace(/[\.,]/g, '/');
    
    // Split the date (expects day/month or day/month/year)
    let parts = cleanStr.split('/');
    
    let day, month, year;

    if (parts.length >= 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-11
        let year = parts[2] ? parseInt(parts[2], 10) : currentYear;

        if (year < 100) year += 2000;
        
        const parsedDate = new Date(year, month, day);

        // Logic to handle year-crossover (e.g. Dec to Jan)
        // If the date is more than 6 months in the future relative to "now", 
        // it's likely from the previous year.
        if (parsedDate - now > 1.5e10) { 
            parsedDate.setFullYear(currentYear - 1);
        }

        if (parsedDate.getDate() === day && parsedDate.getMonth() === month) {
            return parsedDate;
        }
    }
    return null;
}

function toggleAgePopup(event) {
    event.stopPropagation(); // Hindrer at klikket lukker boksen umiddelbart
    const popup = document.getElementById('age-popup');
    popup.style.display = 'block';
}

function closeAgePopup() {
    document.getElementById('age-popup').style.display = 'none';
}


function openInfoModal() {
    const infoModal = document.getElementById('info-text'); // The overlay div
    const infoParagraph = document.getElementById('info-content'); // The text container
    
    // 1. Determine which tab is active
    const isRebound = document.getElementById('view-rebound').classList.contains('active');
    const contentKey = isRebound ? 'rebound' : 'nomogram';

    // 2. Pull the correct text from your infoContent variable
    const data = infoContent[contentKey];

    // 3. Update the HTML and show it
    if (data) {
        infoParagraph.innerHTML = `<h2 style="margin-top:0;">${data.title}</h2><hr><br>${data.text.replace(/\n/g, '<br>')}`;
        infoModal.style.display = "flex";
    }
    
}
function closeInfoModal() {
    document.getElementById('info-text').style.display = "none";

    
}

// ----------------------------------------------------
// FEEDBACK MODAL LOGIC
// ----------------------------------------------------

function sendFeedback() {
    const isReboundActive = document.getElementById('view-rebound').classList.contains('active');
    
    // 1. Bygg teksten
    let bodyText = "Hei,\n\nJeg vil gjerne melde fra om følgende feil/tilbakemelding i kalkulatoren:\n\n";
    bodyText += "[SKRIV INN DIN TILBAKEMELDING HER]\n\n";
    bodyText += "-----------------------------------------\n";
    bodyText += "AUTOGENERERT DIAGNOSTIKK:\n\n";

    if (!isReboundActive) {
        bodyText += "--- MODUS: BILIRUBINKURVE (0-14 dager) ---\n";
        const weight = document.getElementById('weight_input').value || "Ikke oppgitt";
        const ga = document.getElementById('ga_input').value || "Ikke oppgitt";
        const curveSelect = document.getElementById('riskLine');
        const curveName = curveSelect.options[curveSelect.selectedIndex].text;

        bodyText += `Fødselsvekt: ${weight} g\n`;
        bodyText += `Gestasjonsalder: ${ga} uker\n`;
        bodyText += `Valgt kurve: ${curveName}\n\n`;

        bodyText += "MÅLINGER:\n";
        const t1 = document.getElementById('t1').value || "Mangler";
        const v1 = document.getElementById('v1').value || "Mangler";
        bodyText += `- Måling 1: Alder = ${t1} timer, Verdi = ${v1} µmol/L\n`;

        const t2 = document.getElementById('t2').value;
        const v2 = document.getElementById('v2').value;
        if (t2 || v2) {
            bodyText += `- Måling 2: Alder = ${t2 || "Mangler"} timer, Verdi = ${v2 || "Mangler"} µmol/L\n`;
        }
    } else {
        bodyText += "--- MODUS: LANGVARIG GULSOT (Rebound) ---\n";
        const r_limit = document.getElementById('r_limit').value;
        bodyText += `Valgt lysgrense: ${r_limit} µmol/L\n\n`;
        bodyText += "MÅLINGER:\n";
        
        const formatReboundDate = (id_d, id_v) => {
            const d = document.getElementById(id_d).value;
            const v = document.getElementById(id_v).value;
            return `Dato/Tid: ${d || "Mangler"}, Verdi: ${v || "Mangler"} µmol/L`;
        };

        bodyText += `- Prøve 1: ${formatReboundDate('r_d1', 'r_v1')}\n`;
        bodyText += `- Toppverdi: ${formatReboundDate('r_d2', 'r_v2')}\n`;
        bodyText += `- Kontroll: ${formatReboundDate('r_d3', 'r_v3')}\n`;
    }

    // 2. Legg teksten inn i tekstboksen og vis modalen
    document.getElementById('feedbackTextarea').value = bodyText;
    
    // Using 'flex' here activates the centering from your CSS!
    document.getElementById('feedbackModal').style.display = 'flex'; 
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').style.display = 'none';
}

function copyFeedbackText() {
    const textarea = document.getElementById('feedbackTextarea');
    
    // Kopierer teksten til utklippstavlen
    navigator.clipboard.writeText(textarea.value).then(() => {
        // Gir brukeren en visuell bekreftelse på at det fungerte
        const btn = document.getElementById('copyFeedbackBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopiert!';
        btn.style.background = '#2ecc71'; // Grønn farge
        
        // Setter knappen tilbake til normalen etter 3 sekunder
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '#e74c3c'; // Tilbake til rød
        }, 3000);
    }).catch(err => {
        alert("Kunne ikke kopiere automatisk. Vennligst marker teksten og kopier manuelt.");
    });
}

window.onclick = function(event) {
    const infoModal = document.getElementById('info-text');
    const feedbackModal = document.getElementById('feedbackModal');
    
    if (event.target == infoModal) {
        infoModal.style.display = "none";
    }
    if (event.target == feedbackModal) {
        feedbackModal.style.display = "none";
    }
}