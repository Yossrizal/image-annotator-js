const IMAGE_SELECTOR = "#annotated-image";
const LIST_SELECTOR = "#annotation-list";
const MARKER_LAYER_SELECTOR = "#marker-layer";
const ZOOM_LEVEL_SELECTOR = "#zoom-level";
const DATA_URL = document.body.dataset.dataUrl || "./data/data1.json";

const MAX_ZOOM = 2.5;
const MIN_ZOOM = 0.6;
const ZOOM_STEP = 0.15;

const state = {
  data: null,
  activeId: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  pointerStart: null,
  panStart: null,
  isPanning: false,
  activePointerId: null,
};

async function loadData() {
  const response = await fetch(DATA_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load data from ${DATA_URL}`);
  }
  state.data = await response.json();
}

function formatDate(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    return "";
  }
}

function renderImageInfo() {
  const { image } = state.data;
  const imgEl = document.querySelector(IMAGE_SELECTOR);
  imgEl.src = image.url;
  imgEl.alt = image.name || "";

  document.getElementById("image-title").textContent = image.name || "(tanpa nama)";
  document.getElementById("image-mime").textContent = image.mime;
  document.getElementById("image-dimension").textContent = `${image.width} × ${image.height}`;
  document.getElementById("image-created").textContent = formatDate(image.created_at);
}

function clearMarkers() {
  document.querySelector(MARKER_LAYER_SELECTOR).innerHTML = "";
}

function createMarker(annotation) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "marker";
  button.dataset.id = annotation.id;
  button.style.left = `${annotation.x * 100}%`;
  button.style.top = `${annotation.y * 100}%`;
  button.setAttribute("aria-label", annotation.title);

  button.innerHTML = `
    <span aria-hidden="true">●</span>
    <div class="tooltip">
      <p class="annotation-title">${annotation.title}</p>
      ${annotation.description ? `<p class="annotation-description">${annotation.description}</p>` : ""}
      ${annotation.link ? `<a href="${annotation.link}" target="_blank" rel="noopener noreferrer" class="annotation-link">Buka tautan</a>` : ""}
    </div>
  `;

  button.addEventListener("mouseenter", () => setActiveAnnotation(annotation.id));
  button.addEventListener("focus", () => setActiveAnnotation(annotation.id));
  button.addEventListener("mouseleave", () => setActiveAnnotation(null));
  button.addEventListener("blur", () => setActiveAnnotation(null));

  return button;
}

function renderMarkers() {
  clearMarkers();
  const layer = document.querySelector(MARKER_LAYER_SELECTOR);
  state.data.annotations.forEach((annotation) => {
    layer.appendChild(createMarker(annotation));
  });
}

function createAnnotationListItem(annotation) {
  const li = document.createElement("li");
  li.className = "annotation-item";
  li.tabIndex = 0;
  li.dataset.id = annotation.id;
  li.innerHTML = `
    <p class="annotation-title">${annotation.title}</p>
    ${annotation.description ? `<p class="annotation-description">${annotation.description}</p>` : ""}
    ${annotation.link ? `<a href="${annotation.link}" target="_blank" rel="noopener noreferrer" class="annotation-link">Buka tautan</a>` : ""}
  `;

  li.addEventListener("mouseenter", () => setActiveAnnotation(annotation.id));
  li.addEventListener("mouseleave", () => setActiveAnnotation(null));
  li.addEventListener("focus", () => setActiveAnnotation(annotation.id));
  li.addEventListener("blur", () => setActiveAnnotation(null));

  return li;
}

function renderAnnotationList() {
  const list = document.querySelector(LIST_SELECTOR);
  list.innerHTML = "";
  state.data.annotations.forEach((annotation) => {
    list.appendChild(createAnnotationListItem(annotation));
  });
}

function setActiveAnnotation(id) {
  state.activeId = id;

  document.querySelectorAll(".annotation-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.id === id);
  });

  document.querySelectorAll(".marker").forEach((marker) => {
    marker.classList.toggle("active", marker.dataset.id === id);
  });
}

function updateZoomDisplay() {
  document.querySelector(ZOOM_LEVEL_SELECTOR).textContent = `${Math.round(state.zoom * 100)}%`;
}

function clampPan() {
  const imgEl = document.querySelector(IMAGE_SELECTOR);
  const wrapper = imgEl?.parentElement;

  if (!imgEl || !wrapper) return;

  const scaledWidth = imgEl.clientWidth * state.zoom;
  const scaledHeight = imgEl.clientHeight * state.zoom;
  const maxOffsetX = Math.max(0, (scaledWidth - wrapper.clientWidth) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - wrapper.clientHeight) / 2);

  state.pan.x = Math.min(maxOffsetX, Math.max(-maxOffsetX, state.pan.x));
  state.pan.y = Math.min(maxOffsetY, Math.max(-maxOffsetY, state.pan.y));
}

function applyTransform() {
  const imgEl = document.querySelector(IMAGE_SELECTOR);
  const markerLayer = document.querySelector(MARKER_LAYER_SELECTOR);
  if (!imgEl) return;

  const transformValue = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
  imgEl.style.transform = transformValue;

  if (markerLayer) {
    markerLayer.style.transform = transformValue;
  }

  updateZoomDisplay();
}

function adjustPanForZoom(event, previousZoom, nextZoom) {
  const wrapper = document.querySelector(".image-wrapper");
  if (!wrapper || previousZoom <= 0) return;

  const rect = wrapper.getBoundingClientRect();
  const offsetX = event.clientX - rect.left - rect.width / 2;
  const offsetY = event.clientY - rect.top - rect.height / 2;
  const zoomRatio = nextZoom / previousZoom;

  state.pan.x = offsetX * (1 - zoomRatio) + zoomRatio * state.pan.x;
  state.pan.y = offsetY * (1 - zoomRatio) + zoomRatio * state.pan.y;
}

function handleZoom(direction, originEvent) {
  const delta = direction === "in" ? ZOOM_STEP : -ZOOM_STEP;
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, state.zoom + delta));
  const previousZoom = state.zoom;

  if (next === previousZoom) return;

  if (originEvent) {
    adjustPanForZoom(originEvent, previousZoom, next);
  }

  state.zoom = next;
  clampPan();
  applyTransform();
}

function setupZoomControls() {
  document.querySelectorAll(".zoom-controls button").forEach((button) => {
    button.addEventListener("click", () => {
      handleZoom(button.dataset.zoom);
    });
  });

  const wrapper = document.querySelector(".image-wrapper");
  const imgEl = document.querySelector(IMAGE_SELECTOR);

  if (imgEl) {
    imgEl.draggable = false;
  }

  if (!wrapper) return;

  wrapper.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? "in" : "out";
      handleZoom(direction, event);
    },
    { passive: false }
  );
}

function setupPanning() {
  const wrapper = document.querySelector(".image-wrapper");
  if (!wrapper) return;

  const endPan = (event) => {
    if (event.pointerId !== state.activePointerId) return;
    state.isPanning = false;
    state.activePointerId = null;
    state.pointerStart = null;
    state.panStart = null;
    wrapper.classList.remove("is-panning");
    if (wrapper.hasPointerCapture(event.pointerId)) {
      wrapper.releasePointerCapture(event.pointerId);
    }
  };

  wrapper.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    state.isPanning = true;
    state.activePointerId = event.pointerId;
    state.pointerStart = { x: event.clientX, y: event.clientY };
    state.panStart = { ...state.pan };
    wrapper.classList.add("is-panning");
    wrapper.setPointerCapture(event.pointerId);
  });

  wrapper.addEventListener("pointermove", (event) => {
    if (!state.isPanning || event.pointerId !== state.activePointerId) return;
    const dx = event.clientX - state.pointerStart.x;
    const dy = event.clientY - state.pointerStart.y;
    state.pan.x = state.panStart.x + dx;
    state.pan.y = state.panStart.y + dy;
    clampPan();
    applyTransform();
  });

  wrapper.addEventListener("pointerup", endPan);
  wrapper.addEventListener("pointercancel", endPan);
  wrapper.addEventListener("pointerleave", (event) => {
    if (!state.isPanning || event.pointerId !== state.activePointerId) return;
    endPan(event);
  });
}

async function bootstrap() {
  try {
    await loadData();
    renderImageInfo();
    renderMarkers();
    renderAnnotationList();
    setupZoomControls();
    setupPanning();
    applyTransform();
  } catch (error) {
    console.error(error);
    alert("Failed to initialise the annotator. See console for details.");
  }
}

bootstrap();
