let products = [];

/* ---------- LOAD ---------- */
async function loadProducts(){
  let res = await fetch("/products");
  let data = await res.json();
  products = data.map(p=>({name:p[0],rack:p[1],row:p[2],qty:p[3]}));
  updateTable();
}
loadProducts();

/* ---------- POPUP ---------- */
function toggleAddForm(){
  addForm.style.display = addForm.style.display=="flex"?"none":"flex";
  clearForm();
}
function clearForm(){
  pName.value=""; pRack.value=""; pRow.value=""; pQty.value="";
}

/* ---------- TABLE ---------- */
function updateTable(){
  let tbody = document.querySelector("#productTable tbody");
  tbody.innerHTML="";
  products.forEach(p=>{
    tbody.innerHTML+=`
      <tr>
        <td>${p.name}</td>
        <td>${p.rack}</td>
        <td>${p.row}</td>
        <td>${p.qty}</td>
        <td>
          <button onclick="editProduct('${p.name}','${p.rack}',${p.row},${p.qty})">✏️</button>
          <button onclick="deleteProduct('${p.name}','${p.rack}',${p.row})">❌</button>
        </td>
      </tr>`;
  });
}

/* ---------- ADD ---------- */
async function addProduct(){
  let name=pName.value.toLowerCase();
  let rack=pRack.value.toUpperCase();
  let row=parseInt(pRow.value);
  let qty=parseInt(pQty.value);
  if(!name||!rack||!row||!qty) return alert("Fill all");

  await fetch("/add",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,rack,row,qty})
  });
  toggleAddForm();
  loadProducts();
}

/* ---------- DELETE ---------- */
async function deleteProduct(name,rack,row){
  if(!confirm("Delete "+name+"?")) return;
  await fetch(`/delete/${name}/${rack}/${row}`,{method:"DELETE"});
  loadProducts();
}

/* ---------- EDIT ---------- */
function editProduct(name,rack,row,qty){
  let newRack=prompt("Rack:",rack);
  let newRow=prompt("Row:",row);
  let newQty=prompt("Qty:",qty);
  if(!newRack||!newRow||!newQty) return;

  fetch("/update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      name,
      oldRack:rack,
      oldRow:row,
      newRack:newRack.toUpperCase(),
      newRow:parseInt(newRow),
      newQty:parseInt(newQty)
    })
  }).then(loadProducts);
}

/* ---------- SEARCH (MULTI LOCATION) ---------- */
async function searchItem(){
  let input = searchInput.value.toLowerCase().trim();

  document.querySelectorAll(".rack").forEach(r=>r.classList.remove("highlight"));
  document.querySelectorAll(".row").forEach(r=>r.classList.remove("rowHighlight"));
  clear3D();

  if(!input){
    result.innerHTML="Enter item";
    return;
  }

  let res = await fetch("/search/"+encodeURIComponent(input));
  let foundList = await res.json();

  if(foundList.length===0){
    result.innerHTML="Item not found";
    pointer.innerHTML="❌ No location found";
    return;
  }

  let html = `<b>Found in ${foundList.length} locations:</b><br>`;
  foundList.forEach(([name,rack,row,qty])=>{
    html += `• Rack ${rack}, Row ${row}, Qty ${qty}<br>`;

    let rackDiv=document.getElementById(rack);
    if(rackDiv){
      rackDiv.classList.add("highlight");
      let rowDiv=rackDiv.querySelector(`[data-row='${row}']`);
      if(rowDiv) rowDiv.classList.add("rowHighlight");
    }

    highlightOne3D(rack,row);
  });

  result.innerHTML = html;
  pointer.innerHTML = "➡ Item available in multiple locations";
}

/* ================= 3D ================= */
let scene=new THREE.Scene();
let camera=new THREE.PerspectiveCamera(75,1,0.1,1000);
let renderer=new THREE.WebGLRenderer({antialias:true});
threeContainer.appendChild(renderer.domElement);

function resize3D(){
  let r=threeContainer.getBoundingClientRect();
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;
  camera.updateProjectionMatrix();
}
resize3D(); window.addEventListener("resize",resize3D);

camera.position.set(4,6,4);
camera.lookAt(0,0,0);
scene.add(new THREE.DirectionalLight(0xffffff,1));
scene.add(new THREE.AmbientLight(0x404040));

let rackMeshes={};
function createRack(name,x,z){
  let group=new THREE.Group(),rows=[];
  for(let i=0;i<3;i++){
    let box=new THREE.Mesh(
      new THREE.BoxGeometry(1.2,0.6,0.6),
      new THREE.MeshStandardMaterial({color:0x777777})
    );
    box.position.set(0,i*0.65,0);
    group.add(box); rows.push(box);
  }
  group.position.set(x,0,z);
  scene.add(group);
  rackMeshes[name]={group,rows};
}
createRack("A1",0,0);
createRack("A2",2,0);
createRack("B1",0,2);
createRack("B2",2,2);

function animate(){
  requestAnimationFrame(animate);
  scene.rotation.z=0;
  renderer.render(scene,camera);
}
animate();

/* ---------- 3D HIGHLIGHT HELPERS ---------- */
let highlightedRacks = new Set();

function clear3D(){
  Object.values(rackMeshes).forEach(r =>
    r.rows.forEach(b => b.material.color.set(0x777777))
  );
  highlightedRacks.clear();
}

function highlightOne3D(rack,row){
  if(!rackMeshes[rack]) return;

  if(!highlightedRacks.has(rack)){
    rackMeshes[rack].rows.forEach(b =>
      b.material.color.set(0xffff00)
    );
    highlightedRacks.add(rack);
  }

  if(row){
    let b=rackMeshes[rack].rows[row-1];
    if(b) b.material.color.set(0x00ff00);
  }
}

/* ---------- ROTATE & ZOOM ---------- */
let drag=false,px,py;
renderer.domElement.onmousedown=e=>{drag=true;px=e.clientX;py=e.clientY;}
window.onmouseup=()=>drag=false;
window.onmousemove=e=>{
  if(!drag) return;
  scene.rotation.y+=(e.clientX-px)*0.005;
  px=e.clientX; py=e.clientY;
}
renderer.domElement.onwheel=e=>camera.position.z+=e.deltaY*0.01;
