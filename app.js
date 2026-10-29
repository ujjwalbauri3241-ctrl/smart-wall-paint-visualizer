const canvas = document.getElementById("roomCanvas");
const ctx = canvas.getContext("2d");

const imageUpload = document.getElementById("imageUpload");
const paintColor = document.getElementById("paintColor");
const colorHex = document.getElementById("colorHex");
const opacitySlider = document.getElementById("opacity");
const opacityValue = document.getElementById("opacityValue");

const finishButton = document.getElementById("finishButton");
const undoButton = document.getElementById("undoButton");
const clearButton = document.getElementById("clearButton");
const toggleButton = document.getElementById("toggleButton");
const saveButton = document.getElementById("saveButton");
const loadButton = document.getElementById("loadButton");
const downloadButton = document.getElementById("downloadButton");
const statusMessage = document.getElementById("statusMessage");

const SAVED_DESIGN_KEY = "roomColorSavedDesign";

const roomPhoto = new Image();

let savedImageData = null;
let wallSelections = [];
let currentPoints = [];
let showOriginal = false;

function setStatus(message) {
  statusMessage.textContent = message;
}

function updateControls() {
  const hasImage = Boolean(roomPhoto.src && roomPhoto.naturalWidth);

  finishButton.disabled = !hasImage || currentPoints.length < 3;
  undoButton.disabled = !hasImage || (currentPoints.length === 0 && wallSelections.length === 0);
  clearButton.disabled = !hasImage || (currentPoints.length === 0 && wallSelections.length === 0);
  toggleButton.disabled = !hasImage;
  saveButton.disabled = !hasImage;
  downloadButton.disabled = !hasImage;
}

function drawPlaceholder() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#edf1ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#62746c";
  ctx.textAlign = "center";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText("Your room preview will appear here", canvas.width / 2, canvas.height / 2 - 8);

  ctx.fillStyle = "#84928c";
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText("Upload a JPG or PNG photo to begin", canvas.width / 2, canvas.height / 2 + 25);
}

function drawPolygon(points, color, opacity) {
  if (points.length < 3) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.closePath();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawCurrentOutline() {
  if (currentPoints.length === 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(currentPoints[0].x, currentPoints[0].y);

  for (let i = 1; i < currentPoints.length; i++) {
    ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
  }

  ctx.setLineDash([8, 5]);
  ctx.lineWidth = Math.max(2, canvas.width / 500);
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, canvas.width / 800);
  ctx.strokeStyle = "#285c4b";
  ctx.stroke();

  const pointRadius = Math.max(4, canvas.width / 250);
  for (const point of currentPoints) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#285c4b";
    ctx.stroke();
  }

  ctx.restore();
}

function render() {
  if (!roomPhoto.src || !roomPhoto.naturalWidth) {
    drawPlaceholder();
    updateControls();
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(roomPhoto, 0, 0, canvas.width, canvas.height);

  if (!showOriginal) {
    for (const wall of wallSelections) {
      drawPolygon(wall.points, wall.color, wall.opacity);
    }

    drawCurrentOutline();
  }

  updateControls();
}

imageUpload.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    setStatus("Please choose a JPG or PNG image.");
    imageUpload.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    roomPhoto.onload = () => {
      // Scale large photos down for smoother editing and browser storage.
      const maxDimension = 2200;
      const scale = Math.min(
        1,
        maxDimension / Math.max(roomPhoto.naturalWidth, roomPhoto.naturalHeight)
      );

      canvas.width = Math.round(roomPhoto.naturalWidth * scale);
      canvas.height = Math.round(roomPhoto.naturalHeight * scale);

      const resizedPhoto = document.createElement("canvas");
      resizedPhoto.width = canvas.width;
      resizedPhoto.height = canvas.height;
      resizedPhoto.getContext("2d").drawImage(roomPhoto, 0, 0, canvas.width, canvas.height);

      savedImageData = resizedPhoto.toDataURL("image/jpeg", 0.92);
      wallSelections = [];
      currentPoints = [];
      showOriginal = false;

      toggleButton.textContent = "Show original photo";
      render();
      setStatus("Photo loaded. Click around a wall to outline it.");
    };

    roomPhoto.onerror = () => {
      setStatus("That image could not be opened. Try a different JPG or PNG.");
    };

    roomPhoto.src = reader.result;
  };

  reader.readAsDataURL(file);
  imageUpload.value = "";
});

canvas.addEventListener("click", (event) => {
  if (!roomPhoto.naturalWidth || showOriginal) return;

  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

  currentPoints.push({ x, y });
  render();

  setStatus(
    currentPoints.length < 3
      ? `Point ${currentPoints.length} added. Add at least three points to outline the wall.`
      : `${currentPoints.length} points added. Finish the selection when the outline is complete.`
  );
});

finishButton.addEventListener("click", () => {
  if (currentPoints.length < 3) return;

  wallSelections.push({
    points: [...currentPoints],
    color: paintColor.value,
    opacity: Number(opacitySlider.value) / 100
  });

  currentPoints = [];
  render();
  setStatus("Wall color applied. Outline another wall or download your preview.");
});

undoButton.addEventListener("click", () => {
  if (currentPoints.length > 0) {
    currentPoints.pop();
    render();
    setStatus("Last outline point removed.");
    return;
  }

  if (wallSelections.length > 0) {
    wallSelections.pop();
    render();
    setStatus("Last wall selection removed.");
  }
});

clearButton.addEventListener("click", () => {
  wallSelections = [];
  currentPoints = [];
  render();
  setStatus("All wall selections cleared.");
});

paintColor.addEventListener("input", () => {
  colorHex.textContent = paintColor.value.toUpperCase();
});

opacitySlider.addEventListener("input", () => {
  opacityValue.textContent = `${opacitySlider.value}%`;
});

toggleButton.addEventListener("click", () => {
  showOriginal = !showOriginal;
  toggleButton.textContent = showOriginal ? "Show painted preview" : "Show original photo";
  render();
});

saveButton.addEventListener("click", () => {
  if (!savedImageData) return;

  const design = {
    imageData: savedImageData,
    wallSelections,
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(SAVED_DESIGN_KEY, JSON.stringify(design));
    loadButton.disabled = false;
    setStatus("Design saved in this browser.");
  } catch (error) {
    setStatus("Could not save this design. Browser storage may be full.");
  }
});

loadButton.addEventListener("click", () => {
  let design;

  try {
    const storedDesign = localStorage.getItem(SAVED_DESIGN_KEY);
    if (!storedDesign) {
      setStatus("There is no saved design in this browser yet.");
      return;
    }
    design = JSON.parse(storedDesign);
  } catch (error) {
    setStatus("The saved design could not be loaded.");
    return;
  }

  roomPhoto.onload = () => {
    canvas.width = roomPhoto.naturalWidth;
    canvas.height = roomPhoto.naturalHeight;
    savedImageData = design.imageData;
    wallSelections = Array.isArray(design.wallSelections) ? design.wallSelections : [];
    currentPoints = [];
    showOriginal = false;
    toggleButton.textContent = "Show original photo";
    render();
    setStatus("Saved design loaded.");
  };

  roomPhoto.onerror = () => {
    setStatus("The saved photo could not be opened.");
  };

  roomPhoto.src = design.imageData;
});

downloadButton.addEventListener("click", () => {
  if (!roomPhoto.naturalWidth) return;

  const wasShowingOriginal = showOriginal;
  showOriginal = false;
  render();

  canvas.toBlob((blob) => {
    showOriginal = wasShowingOriginal;
    render();

    if (!blob) {
      setStatus("The preview could not be downloaded.");
      return;
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "room-paint-preview.png";
    link.click();

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    setStatus("Painted preview downloaded.");
  }, "image/png");
});

// Enable the load button if a saved design exists.
try {
  loadButton.disabled = !localStorage.getItem(SAVED_DESIGN_KEY);
} catch (error) {
  loadButton.disabled = true;
}

drawPlaceholder();
updateControls();