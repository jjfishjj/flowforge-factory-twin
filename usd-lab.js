const stationMeta = {
  Receiving: {cycle:'0.38 min',oee:'94%',mes:'PL01.RECV.001',position:'19.5, 32, 1.5'},
  CNC_01: {cycle:'0.52 min',oee:'89%',mes:'PL01.CNC.001',position:'42, 21, 1.5'},
  Inspection: {cycle:'0.46 min',oee:'91%',mes:'PL01.QC.001',position:'66, 21.5, 1.5'},
  Assembly: {cycle:'0.39 min',oee:'82%',mes:'PL01.ASM.001',position:'70, 56, 1.5'},
  Packaging: {cycle:'0.43 min',oee:'88%',mes:'PL01.PKG.001',position:'42, 56, 1.5'}
};

let selectedStation = 'Receiving';
const stationTree = document.querySelector('#station-tree');

function renderTree(){
  stationTree.innerHTML = Object.keys(stationMeta).map(name => `<button class="tree-row station ${name===selectedStation?'selected':''}" role="treeitem" data-station="${name}"><span></span><b>◇</b><strong>${name.replace('_',' ')}</strong><em>reference</em></button>`).join('');
  stationTree.querySelectorAll('.station').forEach(button => button.addEventListener('click',()=>selectStation(button.dataset.station)));
}

function usdaFor(name){
  const m=stationMeta[name];
  return `def Xform "${name}" (
    kind = "component"
    prepend references = @./components/station.usda@</Station>
)
{
    custom string factory:stationId = "${name}"
    custom string factory:mesTag = "${m.mes}"
    custom double factory:cycleTimeMinutes = ${m.cycle.split(' ')[0]}
    custom double factory:nominalOee = ${(+m.oee.replace('%','')/100).toFixed(2)}
    double3 xformOp:translate = (${m.position})
}`;
}

function selectStation(name){
  selectedStation=name;
  const m=stationMeta[name];
  renderTree();
  document.querySelector('#prim-path').textContent=`/Factory/Equipment/${name}`;
  document.querySelector('#asset-cube span').textContent=name[0];
  document.querySelector('#metadata-list').innerHTML=`
    <div><dt>factory:stationId</dt><dd>${name}</dd></div>
    <div><dt>factory:mesTag</dt><dd>${m.mes}</dd></div>
    <div><dt>cycleTimeMinutes</dt><dd>${m.cycle}</dd></div>
    <div><dt>nominalOee</dt><dd>${m.oee}</dd></div>
    <div><dt>xformOp:translate</dt><dd>(${m.position})</dd></div>
    <div><dt>assetInfo:version</dt><dd>1.0.0</dd></div>`;
  document.querySelector('#usda-preview').textContent=usdaFor(name);
  window.dispatchEvent(new CustomEvent('factory:select-machine',{detail:{name}}));
}

function syncUsdVariant(layout){
  document.querySelectorAll('.usd-variant').forEach(button=>button.classList.toggle('active',button.dataset.layout===layout));
}

document.querySelectorAll('.usd-variant').forEach(button=>button.addEventListener('click',()=>{
  const matching=document.querySelector(`.layout-btn[data-layout="${button.dataset.layout}"]`);
  if(matching) matching.click();
  syncUsdVariant(button.dataset.layout);
}));

window.addEventListener('factory:layout-change',event=>syncUsdVariant(event.detail.layout));

document.querySelector('#copy-usda').addEventListener('click',async()=>{
  const status=document.querySelector('#copy-status');
  try{await navigator.clipboard.writeText(usdaFor(selectedStation));status.textContent='COPIED TO CLIPBOARD';}
  catch{status.textContent='COPY UNAVAILABLE — SELECT TEXT MANUALLY';}
  setTimeout(()=>status.textContent='',1800);
});

renderTree();
selectStation(selectedStation);

