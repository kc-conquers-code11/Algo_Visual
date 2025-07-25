const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");
let NODES = [];
let EDGES = [];
let NODE_RADIUS = 15;
let selectedNode = null;
let dragging = false;
let dragStartNode = null;
let edgeHistory = [];

class Node {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.id = id;
    this.visited = false;
    this.distance = Infinity;
    this.previous = null;
  }
}

class Edge {
  constructor(from, to, weight) {
    this.from = from;
    this.to = to;
    this.weight = weight;
  }
}

function log(msg) {
  const logOutput = document.getElementById("logOutput");
  logOutput.innerHTML += msg + "\n";
  logOutput.scrollTop = logOutput.scrollHeight;
}
function clearLog() {
  document.getElementById("logOutput").innerHTML = "";
}

function drawGrid() {
  const spacing = 25;
  ctx.strokeStyle = "#eee";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawGraph() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  
  for (const edge of EDGES) {
    const from = NODES[edge.from];
    const to = NODES[edge.to];
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.stroke();

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(edge.weight, midX, midY);
  }

  for (const node of NODES) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = node.visited ? "#4caf50" : "#2196f3";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = selectedNode === node ? "yellow" : "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.id, node.x, node.y);

    ctx.fillStyle = "#ffd700";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`d=${node.distance === Infinity ? "∞" : node.distance}`, node.x, node.y + 20);
  }
}

canvas.addEventListener("mousedown", (e) => {
  const { offsetX, offsetY } = e;
  const clickedNode = NODES.find(n => Math.hypot(n.x - offsetX, n.y - offsetY) < NODE_RADIUS);
  if (e.shiftKey && clickedNode) {
    dragging = true;
    dragStartNode = clickedNode;
  } else if (clickedNode) {
    selectedNode = clickedNode;
  } else {
    const id = NODES.length;
    NODES.push(new Node(offsetX, offsetY, id));
    updateNodeSelectors();
  }
  drawGraph();
});

canvas.addEventListener("mouseup", (e) => {
  if (dragging) {
    const { offsetX, offsetY } = e;
    const endNode = NODES.find(n => Math.hypot(n.x - offsetX, n.y - offsetY) < NODE_RADIUS);
    if (dragStartNode && endNode && dragStartNode !== endNode) {
      EDGES.push(new Edge(dragStartNode.id, endNode.id, randomWeight()));
      edgeHistory.push([dragStartNode.id, endNode.id]);
    }
  } else if (selectedNode) {
    const { offsetX, offsetY } = e;
    const toNode = NODES.find(n => Math.hypot(n.x - offsetX, n.y - offsetY) < NODE_RADIUS);
    if (toNode && toNode !== selectedNode) {
      EDGES.push(new Edge(selectedNode.id, toNode.id, randomWeight()));
      edgeHistory.push([selectedNode.id, toNode.id]);
    }
    selectedNode = null;
  }
  dragging = false;
  drawGraph();
});

function resetGrid() {
  NODES = [];
  EDGES = [];
  edgeHistory = [];
  updateNodeSelectors();
  clearLog();
  drawGraph();
}

function undoLastEdge() {
  const last = edgeHistory.pop();
  if (!last) return;
  const index = EDGES.findIndex(e => e.from === last[0] && e.to === last[1]);
  if (index !== -1) EDGES.splice(index, 1);
  drawGraph();
}

function randomWeight() {
  return Math.floor(Math.random() * 9 + 1);
}

function randomWeights() {
  for (let edge of EDGES) {
    edge.weight = randomWeight();
  }
  drawGraph();
}
function updateNodeSelectors() {
  const startSelect = document.getElementById("startNode");
  const endSelect = document.getElementById("endNode");
  [startSelect, endSelect].forEach(select => {
    select.innerHTML = "";
    NODES.forEach(node => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = node.id;
      select.appendChild(option);
    });
  });
}

async function runDijkstra() {
  clearLog();
  const delay = parseInt(document.getElementById("speed").value);
  const start = parseInt(document.getElementById("startNode").value);
  const end = parseInt(document.getElementById("endNode").value);

  for (const node of NODES) {
    node.distance = Infinity;
    node.previous = null;
    node.visited = false;
  }

  NODES[start].distance = 0;
  const pq = [NODES[start]];

  while (pq.length > 0) {
    pq.sort((a, b) => a.distance - b.distance);
    const current = pq.shift();
    if (current.visited) continue;
    current.visited = true;

    log(`Visiting Node ${current.id} (Distance: ${current.distance})`);
    drawGraph();
    await new Promise(r => setTimeout(r, delay));

    for (const edge of EDGES.filter(e => e.from === current.id)) {
      const neighbor = NODES[edge.to];
      if (neighbor.visited) continue;
      const newDist = current.distance + edge.weight;
      log(`→ Checking neighbor Node ${neighbor.id} via edge weight ${edge.weight}`);
      if (newDist < neighbor.distance) {
        log(`✔️ Updating distance of Node ${neighbor.id} from ${neighbor.distance} → ${newDist}`);
        neighbor.distance = newDist;
        neighbor.previous = current;
        pq.push(neighbor);
      } else {
        log(`⛔ No update needed for Node ${neighbor.id} (Current: ${neighbor.distance}, New: ${newDist})`);
      }
    }
  }

  log("✅ Dijkstra complete! Drawing shortest path now...");
  let current = NODES[end];
  ctx.lineWidth = 4;
  while (current.previous) {
    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.lineTo(current.previous.x, current.previous.y);
    ctx.strokeStyle = "yellow";
    ctx.stroke();
    current = current.previous;
  }
  ctx.lineWidth = 1;
}

function downloadGraphData() {
  const graphData = {
    nodes: NODES.map(n => ({ x: n.x, y: n.y, id: n.id })),
    edges: EDGES.map(e => ({ from: e.from, to: e.to, weight: e.weight }))
  };
  const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "graph.json";
  a.click();
}

function importGraphFromJSON(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      NODES = data.nodes.map(n => new Node(n.x, n.y, n.id));
      EDGES = data.edges.map(e => new Edge(e.from, e.to, e.weight));
      updateNodeSelectors();
      drawGraph();
      clearLog();
    } catch (err) {
      alert("Invalid JSON format");
    }
  };
  reader.readAsText(file);
}

function downloadCanvasImage() {
  const link = document.createElement("a");
  link.download = "graph.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Initial setup
resetGrid();