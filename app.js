(() => {
  'use strict';
  const D = window.IBB_DATA;
  if (!D || !D.meta) {
    document.body.innerHTML = '<div class="no-script">Les données du snapshot sont indisponibles.</div>';
    return;
  }

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const n = (v) => Number(v) || 0;
  const fmt = (v, digits = 1) => new Intl.NumberFormat('fr-FR', {maximumFractionDigits:digits, minimumFractionDigits:digits === 0 ? 0 : undefined}).format(n(v));
  const compact = (v) => new Intl.NumberFormat('fr-FR', {notation:'compact', maximumFractionDigits:1}).format(n(v));
  const longDate = (iso) => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(new Date(`${iso}T12:00:00`));
  const shortDate = (iso) => new Intl.DateTimeFormat('fr-FR', {day:'2-digit', month:'2-digit'}).format(new Date(`${iso}T12:00:00`));
  const minutesLabel = (mins) => mins >= 60 ? `${fmt(mins / 60, 1)} h` : `${fmt(mins, 0)} min`;
  const colors = ['#ff6b35','#58d6b4','#70a9ff','#c5e86c','#aa8cff','#ffb15c','#ef719c','#6bd7e9'];
  const dates = [...new Set(D.reports.map(x => x.date))].sort();
  const dateSet = new Set(dates);
  const params = new URLSearchParams(location.search);
  const requestedDate = params.get('date');
  const requestedShift = params.get('poste');
  const requestedView = params.get('vue');
  const state = {
    date: dateSet.has(requestedDate) ? requestedDate : D.meta.defaultDate,
    shift: ['Jour','Soir','Nuit'].includes(requestedShift) ? requestedShift : 'Tous',
    view: ['overview','energy','anomalies','data'].includes(requestedView) ? requestedView : 'overview'
  };

  const metricFields = ['fabQty','fabTons','kilnInQty','kilnInTons','kilnOutQty','kilnOutTons','packQty','pallets','coils','anomalyMinutes','anomalyCount','fuelDryer1','fuelDryer2','fuelDryer3','fuelKiln1','fuelKiln2','fuelReportedTotal','gasDryer1','gasDryer2','gasDryer3','gasKiln1','gasKiln2','gasReportedTotal'];
  const sum = (rows) => metricFields.reduce((o, key) => (o[key] = rows.reduce((a, r) => a + n(r[key]), 0), o), {});
  const reportsFor = (date, shift = state.shift) => D.reports.filter(r => r.date === date && (shift === 'Tous' || r.shift === shift));
  const bricksFor = (date, shift = state.shift) => D.bricks.filter(r => r.date === date && (shift === 'Tous' || r.shift === shift));
  const anomaliesFor = (date, shift = state.shift) => D.anomalies.filter(r => r.date === date && (shift === 'Tous' || r.shift === shift));
  const electricFor = (date) => D.electricity.filter(r => r.date === date);
  const totalFuel = (x) => n(x.fuelDryer1)+n(x.fuelDryer2)+n(x.fuelDryer3)+n(x.fuelKiln1)+n(x.fuelKiln2);
  const totalGas = (x) => n(x.gasDryer1)+n(x.gasDryer2)+n(x.gasDryer3)+n(x.gasKiln1)+n(x.gasKiln2);
  const previousDate = (date) => dates[Math.max(0, dates.indexOf(date)-1)];
  const lastDates = (count) => { const i = dates.indexOf(state.date); return dates.slice(Math.max(0, i-count+1), i+1); };
  const percent = (a,b) => b ? ((a-b)/Math.abs(b))*100 : (a ? 100 : 0);
  const efficiency = (a,b) => b ? a/b*100 : 0;
  const group = (rows, key, value = 'minutes') => Object.values(rows.reduce((o,r) => { const k=r[key] || 'Non renseigné'; o[k] ||= {label:k,value:0,count:0}; o[k].value += n(r[value]); o[k].count += n(r.occurrences || 1); return o; }, {})).sort((a,b) => b.value-a.value);
  const coefficientFor = (date) => {
    const eligible = D.gasCoefficients.filter(x => x.date <= date).sort((a,b) => a.date.localeCompare(b.date));
    return eligible.length ? n(eligible.at(-1).coefficient) : 4.3;
  };
  const icon = (type) => ({
    factory:'<svg viewBox="0 0 24 24"><path d="M3 20V9l6 4V9l6 4V5h5v15H3Z"/><path d="M7 17h2m3 0h2m3 0h2"/></svg>',
    kiln:'<svg viewBox="0 0 24 24"><path d="M5 20h14V8H5v12Zm3-12V4h8v4"/><path d="M9 16c0-2 3-2 3-5 2 2 3 3 3 5"/></svg>',
    pack:'<svg viewBox="0 0 24 24"><path d="m4 8 8-4 8 4v9l-8 4-8-4V8Zm0 0 8 4 8-4m-8 4v9"/></svg>',
    yield:'<svg viewBox="0 0 24 24"><path d="M4 18 10 12l4 3 6-9"/><path d="M15 6h5v5"/></svg>',
    alert:'<svg viewBox="0 0 24 24"><path d="M12 3 3 20h18L12 3Zm0 6v5m0 3v.1"/></svg>',
    bolt:'<svg viewBox="0 0 24 24"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/></svg>',
    flame:'<svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-2 4-3 5 0-3-1-5-3-8 0 5-3 7-3 12 0 4 3 7 7 7Z"/></svg>',
    cost:'<svg viewBox="0 0 24 24"><path d="M12 3v18m4-14.5c-1-1-2-1.5-4-1.5-2.2 0-4 1.1-4 3s1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3c-2 0-3.2-.6-4.2-1.7"/></svg>'
  }[type] || '');

  function updateUrl() {
    const p = new URLSearchParams();
    p.set('date', state.date);
    if (state.shift !== 'Tous') p.set('poste', state.shift);
    if (state.view !== 'overview') p.set('vue', state.view);
    history.replaceState(null, '', `${location.pathname}?${p.toString()}`);
  }

  function sparkline(values, color) {
    if (!values.length) return '';
    const w=68,h=22,max=Math.max(...values,1),min=Math.min(...values),range=max-min||1;
    const pts=values.map((v,i)=>`${(i/(values.length-1||1))*w},${h-2-((v-min)/range)*(h-5)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function kpi(label, value, unit, delta, type, accent, series, context='vs veille') {
    const cls = Math.abs(delta)<.05 ? 'neutral' : delta>0 ? 'up' : 'down';
    const sign = delta>0 ? '+' : '';
    return `<article class="kpi-card" style="--accent:${accent}"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon(type)}</span></div><div class="kpi-value">${value}<small>${unit}</small></div><div class="kpi-foot"><span class="delta ${cls}">${sign}${fmt(delta,1)}%</span><span>${context}</span><span class="sparkline">${sparkline(series,accent)}</span></div></article>`;
  }

  function renderLineChart(target, dateList, series) {
    const root = typeof target === 'string' ? $(target) : target;
    if (!dateList.length || !series.some(s => s.values.some(v => v>0))) { root.innerHTML='<div class="empty-state">Aucune donnée pour cette période</div>'; return; }
    const W=900,H=260,pad={l:45,r:18,t:18,b:35};
    const max=Math.max(...series.flatMap(s=>s.values),1)*1.12;
    const x=i=>pad.l+(i/(dateList.length-1||1))*(W-pad.l-pad.r);
    const y=v=>pad.t+(1-v/max)*(H-pad.t-pad.b);
    let svg=`<svg viewBox="0 0 ${W} ${H}" role="img"><defs>${series.map((s,i)=>`<linearGradient id="grad-${root.id}-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".23"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`;
    for(let i=0;i<4;i++){const yy=pad.t+i*(H-pad.t-pad.b)/3;svg+=`<line class="grid-line" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"/><text class="axis-label" x="2" y="${yy+4}">${compact(max*(1-i/3))}</text>`}
    dateList.forEach((d,i)=>{if(i===0||i===dateList.length-1||i%Math.ceil(dateList.length/5)===0){const label=/^\d{4}-\d{2}-\d{2}$/.test(d)?shortDate(d):d;svg+=`<text class="axis-label" text-anchor="middle" x="${x(i)}" y="${H-8}">${label}</text>`}});
    series.forEach((s,si)=>{const points=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');const area=`${x(0)},${H-pad.b} ${points} ${x(dateList.length-1)},${H-pad.b}`;svg+=`<polygon points="${area}" fill="url(#grad-${root.id}-${si})"/><polyline class="chart-line" points="${points}" stroke="${s.color}"/>`;s.values.forEach((v,i)=>{if(i===s.values.length-1)svg+=`<circle class="chart-dot" cx="${x(i)}" cy="${y(v)}" r="5" fill="${s.color}"/>`})});
    root.innerHTML=svg+'</svg>';
  }

  function donutMarkup(items, centerValue, centerLabel) {
    const useful=items.filter(x=>x.value>0);const total=useful.reduce((a,x)=>a+x.value,0);
    if(!total)return '<div class="empty-state">Aucune donnée enregistrée</div>';
    let cursor=0;const stops=useful.map((x,i)=>{const start=cursor;cursor+=x.value/total*100;return `${x.color||colors[i%colors.length]} ${start}% ${cursor}%`});
    return `<div class="donut" style="background:conic-gradient(${stops.join(',')})"><div class="donut-center"><strong>${centerValue}</strong><small>${centerLabel}</small></div></div><div class="donut-legend">${useful.slice(0,7).map((x,i)=>`<div><i style="background:${x.color||colors[i%colors.length]}"></i><span title="${esc(x.label)}">${esc(x.label)}</span><strong>${x.display ?? fmt(x.value,1)}</strong></div>`).join('')}</div>`;
  }

  function renderOverview() {
    const current=sum(reportsFor(state.date));const prev=sum(reportsFor(previousDate(state.date)));const trendDates=lastDates(10);
    $('#overviewSubtitle').textContent=`${longDate(state.date)} · ${state.shift==='Tous'?'Tous les postes':`Poste ${state.shift}`}`;
    const seriesFor = key => trendDates.map(d => sum(reportsFor(d))[key]);
    const eff=efficiency(current.kilnOutTons,current.kilnInTons),prevEff=efficiency(prev.kilnOutTons,prev.kilnInTons);
    $('#kpiGrid').innerHTML=[
      kpi('Fabrication',fmt(current.fabTons,1),'t',percent(current.fabTons,prev.fabTons),'factory','#ff6b35',seriesFor('fabTons')),
      kpi('Sortie four',fmt(current.kilnOutTons,1),'t',percent(current.kilnOutTons,prev.kilnOutTons),'kiln','#58d6b4',seriesFor('kilnOutTons')),
      kpi('Emballage',fmt(current.pallets,0),'palettes',percent(current.pallets,prev.pallets),'pack','#70a9ff',seriesFor('pallets')),
      kpi('Rendement four',fmt(eff,1),'%',percent(eff,prevEff),'yield','#c5e86c',trendDates.map(d=>{const x=sum(reportsFor(d));return efficiency(x.kilnOutTons,x.kilnInTons)})),
      kpi('Arrêts cumulés',fmt(current.anomalyMinutes/60,1),'h',percent(current.anomalyMinutes,prev.anomalyMinutes),'alert','#ff7272',seriesFor('anomalyMinutes'))
    ].join('');
    if(dates.length===1){const shifts=['Jour','Soir','Nuit'];$('#trendTitle').textContent='Production par poste';renderLineChart('#trendChart',shifts,[{color:'#ff6b35',values:shifts.map(s=>sum(reportsFor(state.date,s)).fabTons)},{color:'#58d6b4',values:shifts.map(s=>sum(reportsFor(state.date,s)).kilnOutTons)}])}
    else{$('#trendTitle').textContent='Production sur 10 jours';renderLineChart('#trendChart',trendDates,[{color:'#ff6b35',values:seriesFor('fabTons')},{color:'#58d6b4',values:seriesFor('kilnOutTons')}])}
    renderShiftBars();renderFlow(current);renderBrick(current);
  }

  function renderShiftBars(){
    const rows=['Jour','Soir','Nuit'].map(shift=>({shift,data:sum(reportsFor(state.date,shift))}));const max=Math.max(...rows.flatMap(x=>[x.data.fabTons,x.data.kilnOutTons]),1);
    $('#shiftBars').innerHTML=rows.map(x=>`<div class="shift-row"><div class="shift-row-head"><span>${x.shift}</span><strong>${fmt(x.data.fabTons,1)} t</strong></div><div class="dual-bar fab"><i style="width:${x.data.fabTons/max*100}%"></i></div><div class="dual-bar kiln"><i style="width:${x.data.kilnOutTons/max*100}%"></i></div><div class="shift-row-labels"><span>Fabrication</span><span>Four ${fmt(x.data.kilnOutTons,1)} t</span></div></div>`).join('');
  }

  function renderFlow(x){
    const stages=[['Fabrication',x.fabTons,'Tonnage fabriqué','#ff6b35'],['Entrée four',x.kilnInTons,'Charge enfournée','#ff9d63'],['Sortie four',x.kilnOutTons,`${fmt(efficiency(x.kilnOutTons,x.kilnInTons),1)}% de rendement`,'#58d6b4'],['Emballage',x.pallets,`${fmt(x.packQty,0)} unités déclarées`,'#70a9ff']];
    const max=Math.max(...stages.map(s=>s[1]),1);$('#flowPipeline').innerHTML=stages.map((s,i)=>`<div class="flow-step" style="--step:${s[3]}"><small>0${i+1} · ${s[0]}</small><strong>${fmt(s[1],i===3?0:1)}<em>${i===3?'palettes':'t'}</em></strong><div class="flow-meter"><i style="width:${s[1]/max*100}%"></i></div><p>${s[2]}</p></div>`).join('');
  }

  function renderBrick(){
    const rows=bricksFor(state.date);const by=Object.values(rows.reduce((o,r)=>{const k=r.brick;o[k]||={brick:k,fabQty:0,fabTons:0,kilnInQty:0,kilnInTons:0,kilnOutQty:0,kilnOutTons:0,packQty:0};Object.keys(o[k]).filter(x=>x!=='brick').forEach(x=>o[k][x]+=n(r[x]));return o},{})).sort((a,b)=>b.kilnOutTons-a.kilnOutTons);
    const total=by.reduce((a,x)=>a+x.kilnOutTons,0);$('#brickMix').innerHTML=donutMarkup(by.map((x,i)=>({label:x.brick,value:x.kilnOutTons,color:colors[i],display:`${fmt(total?x.kilnOutTons/total*100:0,0)}%`})),fmt(total,1),'tonnes sorties');
    $('#brickCount').textContent=`${by.length} type${by.length>1?'s':''}`;
    $('#brickTable').innerHTML=by.length?by.map((x,i)=>`<tr><td><div class="product-cell"><span class="brick-swatch" style="filter:hue-rotate(${i*28}deg)"></span><strong>${esc(x.brick)}</strong></div></td><td>${fmt(x.fabTons,1)} t <small>· ${fmt(x.fabQty,0)} u.</small></td><td>${fmt(x.kilnInTons,1)} t</td><td>${fmt(x.kilnOutTons,1)} t</td><td>${fmt(x.packQty,0)} u.</td><td><div class="progress-cell"><div class="mini-progress"><i style="width:${Math.min(100,efficiency(x.kilnOutTons,x.kilnInTons))}%"></i></div>${fmt(efficiency(x.kilnOutTons,x.kilnInTons),1)}%</div></td></tr>`).join(''):'<tr><td colspan="6" class="empty-state">Aucune production enregistrée</td></tr>';
  }

  function renderEnergy(){
    const x=sum(reportsFor(state.date));const prev=sum(reportsFor(previousDate(state.date)));const el=electricFor(state.date).reduce((o,r)=>{['morning','peak','night','evening','totalKwh','costTnd','kilnOutTons'].forEach(k=>o[k]=(o[k]||0)+n(r[k]));return o},{});const prevEl=electricFor(previousDate(state.date)).reduce((o,r)=>{o.totalKwh=(o.totalKwh||0)+n(r.totalKwh);o.costTnd=(o.costTnd||0)+n(r.costTnd);return o},{});
    const fuel=totalFuel(x),gas=totalGas(x),prevFuel=totalFuel(prev),prevGas=totalGas(prev);const coeff=coefficientFor(state.date);const gasRatio=(x.kilnOutTons?((x.gasKiln1+x.gasKiln2)*coeff/x.kilnOutTons)*10:0)+(x.fabTons?((x.gasDryer1+x.gasDryer2+x.gasDryer3)*coeff/x.fabTons)*10:0);const fuelRatio=x.kilnOutTons?fuel*1000/x.kilnOutTons:0;const elecRatio=x.kilnOutTons?n(el.totalKwh)/x.kilnOutTons:0;
    $('#energySubtitle').textContent=`${longDate(state.date)} · ${state.shift==='Tous'?'Bilan 24 heures':`Poste ${state.shift} — électricité sur 24 h`}`;
    const ed=lastDates(10);$('#energyKpis').innerHTML=[
      kpi('Fuel total',fmt(fuel,1),'m³',percent(fuel,prevFuel),'flame','#ff9d63',ed.map(d=>totalFuel(sum(reportsFor(d))))),
      kpi('Gaz total',fmt(gas,1),'m³',percent(gas,prevGas),'flame','#c5e86c',ed.map(d=>totalGas(sum(reportsFor(d))))),
      kpi('Électricité 24 h',fmt(el.totalKwh,0),'kWh',percent(el.totalKwh,prevEl.totalKwh),'bolt','#70a9ff',ed.map(d=>electricFor(d).reduce((a,r)=>a+n(r.totalKwh),0)),'vs veille'),
      kpi('Coût électrique',fmt(el.costTnd,0),'TND',percent(el.costTnd,prevEl.costTnd),'cost','#aa8cff',ed.map(d=>electricFor(d).reduce((a,r)=>a+n(r.costTnd),0)),'estimation GMAO')
    ].join('');
    const eDates=lastDates(14);if(dates.length===1){$('#electricTitle').textContent='Profil électrique du 5 novembre';renderLineChart('#electricTrend',['Matin','Pointe','Nuit','Soir'],[{color:'#70a9ff',values:[n(el.morning),n(el.peak),n(el.night),n(el.evening)]}])}else{renderLineChart('#electricTrend',eDates,[{color:'#70a9ff',values:eDates.map(d=>{const rows=electricFor(d),k=rows.reduce((a,r)=>a+n(r.totalKwh),0),tons=sum(reportsFor(d,'Tous')).kilnOutTons;return tons?k/tons:0})}])}
    const slots=[['Matin',n(el.morning),'#ffb15c'],['Pointe',n(el.peak),'#ff7272'],['Nuit',n(el.night),'#70a9ff'],['Soir',n(el.evening),'#aa8cff']];$('#electricMix').innerHTML=donutMarkup(slots.map(s=>({label:s[0],value:s[1],color:s[2],display:`${compact(s[1])} kWh`})),fmt(elecRatio,1),'kWh / tonne');
    $('#gasCoefficient').textContent=`Coef. ${fmt(coeff,2)}`;renderBreakdown('#gasBreakdown',[['Séchoir 1',x.gasDryer1],['Séchoir 2',x.gasDryer2],['Séchoir 3',x.gasDryer3],['Four 1',x.gasKiln1],['Four 2',x.gasKiln2]],'#c5e86c');renderBreakdown('#fuelBreakdown',[['Séchoir 1',x.fuelDryer1],['Séchoir 2',x.fuelDryer2],['Séchoir 3',x.fuelDryer3],['Four 1',x.fuelKiln1],['Four 2',x.fuelKiln2]],'#ff9d63');
    $('#formulaCards').innerHTML=[['Ratio gaz général',`${fmt(gasRatio,2)} Th/t`,'(Gaz × coefficient ÷ tonnage) × 10, fours + séchoirs.'],['Ratio fuel',`${fmt(fuelRatio,2)} L/t`,'Fuel total × 1 000 ÷ tonnage de sortie four.'],['Ratio électrique',`${fmt(elecRatio,2)} kWh/t`,'Différence des compteurs J+1 − J ÷ tonnage de sortie four.'],['Coût électrique',`${fmt(el.costTnd,2)} TND`,'Tarifs Matin/Pointe/Nuit/Soir, TVA 19 % et part fixe GMAO.'],['Rendement four',`${fmt(efficiency(x.kilnOutTons,x.kilnInTons),2)} %`,'Tonnage sortie four ÷ tonnage entrée four × 100.'],['Périmètre',state.shift==='Tous'?'24 heures':`Poste ${state.shift}`,'Les ratios fuel et gaz suivent le filtre de poste ; l’électricité reste journalière.']].map(f=>`<div class="formula-card"><span>${f[0]}</span><code>${f[1]}</code><small>${f[2]}</small></div>`).join('');
  }

  function renderBreakdown(target,rows,color){const max=Math.max(...rows.map(x=>n(x[1])),1);$(target).innerHTML=rows.map(x=>`<div class="breakdown-row"><span>${x[0]}</span><div class="breakdown-track"><i style="--bar:${color};width:${n(x[1])/max*100}%"></i></div><strong>${fmt(x[1],1)} m³</strong></div>`).join('')}

  function renderAnomalies(){
    const rows=anomaliesFor(state.date);const total=rows.reduce((a,x)=>a+n(x.minutes),0),occ=rows.reduce((a,x)=>a+n(x.occurrences),0);$('#anomalySubtitle').textContent=`${longDate(state.date)} · ${state.shift==='Tous'?'Tous les postes':`Poste ${state.shift}`}`;$('#anomalyHero').innerHTML=`<strong>${minutesLabel(total)}</strong><span>${occ} occurrences cumulées</span>`;
    const causes=group(rows,'cause').slice(0,10),max=Math.max(...causes.map(x=>x.value),1);$('#causeBars').innerHTML=causes.length?causes.map(x=>`<div class="cause-row"><span title="${esc(x.label)}">${esc(x.label)}</span><div class="cause-track"><i style="width:${x.value/max*100}%"></i></div><strong>${fmt(x.value,0)}</strong></div>`).join(''):'<div class="empty-state">Aucune anomalie enregistrée</div>';
    const units=group(rows,'unit').slice(0,7);$('#unitMix').innerHTML=donutMarkup(units.map((x,i)=>({label:x.label,value:x.value,color:colors[(i+1)%colors.length],display:minutesLabel(x.value)})),minutesLabel(total),'arrêts cumulés');
    const sorted=[...rows].sort((a,b)=>n(b.minutes)-n(a.minutes));$('#anomalyCount').textContent=`${occ} occurrence${occ>1?'s':''}`;$('#anomalyTable').innerHTML=sorted.length?sorted.slice(0,100).map(r=>`<tr><td><strong>${esc(r.cause)}</strong></td><td>${esc(r.unit)}</td><td>${esc(r.section)}</td><td>${esc(r.shift)}</td><td>${fmt(r.occurrences,0)}</td><td>${minutesLabel(r.minutes)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-state">Aucune anomalie enregistrée</td></tr>';
  }

  function renderData(){
    const rows=['Jour','Soir','Nuit'].map(s=>({shift:s,data:sum(reportsFor(state.date,s)),exists:reportsFor(state.date,s).length>0}));$('#reportStatus').textContent=`${rows.filter(x=>x.exists).length}/3 rapports`;
    $('#shiftTable').innerHTML=rows.map(x=>`<tr><td><strong>${x.shift}</strong>${x.exists?'':' · absent'}</td><td>${fmt(x.data.fabTons,2)}</td><td>${fmt(x.data.kilnInTons,2)}</td><td>${fmt(x.data.kilnOutTons,2)}</td><td>${fmt(x.data.packQty,0)}</td><td>${fmt(x.data.pallets,0)}</td><td>${minutesLabel(x.data.anomalyMinutes)}</td><td>${fmt(totalFuel(x.data),2)}</td><td>${fmt(totalGas(x.data),2)}</td></tr>`).join('');
    const generated=new Date(D.meta.generatedAt);$('#snapshotCard').innerHTML=`<div class="snapshot-lock"><svg viewBox="0 0 24 24"><path d="M6 10V7a6 6 0 0 1 12 0v3M5 10h14v11H5V10Zm7 4v3"/></svg></div><h2>Snapshot autonome</h2><p>Les données ont été préparées à l’avance. Le navigateur du client n’accède jamais au serveur SQL et aucun identifiant de base n’est présent dans le site.</p><div class="snapshot-meta"><div><small>Période</small><strong>${shortDate(D.meta.minDate)} → ${shortDate(D.meta.maxDate)}</strong></div><div><small>Rapports</small><strong>${fmt(D.meta.reportCount,0)}</strong></div><div><small>Généré</small><strong>${generated.toLocaleDateString('fr-FR')}</strong></div><div><small>Mode</small><strong>Lecture seule</strong></div></div>`;
  }

  function downloadCsv(){const rows=reportsFor(state.date,'Tous');const headers=['date','poste',...metricFields];const lines=[headers.join(';'),...rows.map(r=>headers.map(h=>String(h==='poste'?r.shift:r[h]??'').replace(';',',')).join(';'))];const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`IBB-production-${state.date}.csv`;a.click();URL.revokeObjectURL(a.href);toast('Export CSV créé');}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400)}

  function render(){
    $('#dateFilter').value=state.date;$$('.shift-filter button').forEach(b=>b.classList.toggle('active',b.dataset.shift===state.shift));$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${state.view}`));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    renderOverview();renderEnergy();renderAnomalies();renderData();updateUrl();
  }

  function setDate(date){if(!dateSet.has(date)){const nearest=dates.reduce((a,b)=>Math.abs(new Date(b)-new Date(date))<Math.abs(new Date(a)-new Date(date))?b:a,dates[0]);state.date=nearest;toast(`Date disponible la plus proche : ${shortDate(nearest)}`)}else state.date=date;render()}
  $('#dateFilter').min=D.meta.minDate;$('#dateFilter').max=D.meta.maxDate;$('#dateFilter').addEventListener('change',e=>setDate(e.target.value));if(dates.length===1){$('.date-control').classList.add('locked');$('#dateFilter').disabled=true;$('.date-control label span').textContent='Rapport figé'}
  $('#previousDate').addEventListener('click',()=>{const i=dates.indexOf(state.date);if(i>0)setDate(dates[i-1])});$('#nextDate').addEventListener('click',()=>{const i=dates.indexOf(state.date);if(i<dates.length-1)setDate(dates[i+1])});
  $$('.shift-filter button').forEach(b=>b.addEventListener('click',()=>{state.shift=b.dataset.shift;render()}));
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render();scrollTo({top:0,behavior:'smooth'})}));
  $('#shareButton').addEventListener('click',async()=>{updateUrl();try{await navigator.clipboard.writeText(location.href);toast('Lien daté copié')}catch{toast('Lien prêt dans la barre d’adresse')}});$('#downloadCsv').addEventListener('click',downloadCsv);
  $('#sideDateRange').textContent=`${D.meta.minDate.slice(0,4)} — ${D.meta.maxDate.slice(0,4)}`;
  const generated=new Date(D.meta.generatedAt);$('#generatedAt').textContent=generated.toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});$('#footerSnapshot').textContent=`Données au ${new Date(`${D.meta.maxDate}T12:00:00`).toLocaleDateString('fr-FR')}`;
  render();
})();
