const lightbox = document.getElementById("lightbox");
const closeButton = document.querySelector(".close");
const lightboxCard = document.querySelector(".lightbox-card");
const IMAGE_DIR = "./images";
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf"];

let currentRatio = 4 / 5;
let openAnimation = null;

function parseRatio(value) {
  if (!value) return 4 / 5;
  const parts = value.split("/").map((item) => Number(item.trim()));
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1];
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 4 / 5;
}

function getFittedRect() {
  const maxWidth = window.innerWidth * 0.82;
  const maxHeight = window.innerHeight * 0.82;
  const viewportRatio = maxWidth / maxHeight;

  let width;
  let height;

  if (viewportRatio > currentRatio) {
    height = maxHeight;
    width = height * currentRatio;
  } else {
    width = maxWidth;
    height = width / currentRatio;
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height),
    left: Math.floor((window.innerWidth - width) / 2),
    top: Math.floor((window.innerHeight - height) / 2),
  };
}

function applyCanvasDesign(sourceCanvas) {
  lightboxCard.className = "lightbox-card";
  sourceCanvas.classList.forEach((klass) => {
    if (klass !== "canvas" && klass !== "paper") lightboxCard.classList.add(klass);
  });
  lightboxCard.innerHTML = sourceCanvas.innerHTML;
}

function setCardRect(rect) {
  lightboxCard.style.width = `${rect.width}px`;
  lightboxCard.style.height = `${rect.height}px`;
}

function extractCardNumber(figure) {
  const caption = figure.querySelector(".meta-row");
  if (!caption) return null;
  const text = caption.textContent || "";
  const match = text.match(/No\.\s*([0-9]{1,2})/i);
  return match ? Number(match[1]) : null;
}

function createImageForNumber(number) {
  const padded = String(number).padStart(2, "0");
  return {
    padded,
    base: `${IMAGE_DIR}/project-${padded}`,
  };
}

function loadAssetForCanvas(canvas, base, extensions, index = 0) {
  if (index >= extensions.length) {
    canvas.classList.remove("has-image", "has-pdf");
    return;
  }

  const ext = extensions[index];
  const src = `${base}.${ext}`;

  if (ext === "pdf") {
    const probe = document.createElement("embed");
    probe.src = src;
    probe.type = "application/pdf";
    probe.className = "paper-pdf";
    probe.addEventListener("load", () => {
      canvas.classList.add("has-pdf");
      canvas.classList.remove("has-image");
      canvas.appendChild(probe);
    });
    probe.addEventListener("error", () => {
      probe.remove();
      loadAssetForCanvas(canvas, base, extensions, index + 1);
    });
    setTimeout(() => {
      if (!canvas.contains(probe)) {
        loadAssetForCanvas(canvas, base, extensions, index + 1);
      }
    }, 1200);
    return;
  }

  const image = document.createElement("img");
  image.className = "paper-image";
  image.alt = "Project preview";
  image.src = src;
  image.addEventListener("load", () => {
    canvas.classList.add("has-image");
    canvas.classList.remove("has-pdf");
    canvas.appendChild(image);
  });
  image.addEventListener("error", () => {
    image.remove();
    loadAssetForCanvas(canvas, base, extensions, index + 1);
  });
}

function initializeCardImages() {
  const figures = document.querySelectorAll(".gallery-col .art");
  figures.forEach((figure) => {
    const canvas = figure.querySelector(".canvas");
    if (!canvas) return;

    const number = extractCardNumber(figure);
    if (!number) return;

    canvas.querySelectorAll("img.paper-image, embed.paper-pdf, object.paper-pdf").forEach((el) => el.remove());
    canvas.classList.remove("has-image", "has-pdf");

    const asset = createImageForNumber(number);
    loadAssetForCanvas(canvas, asset.base, IMAGE_EXTENSIONS);
  });
}

function openLightboxFromCanvas(sourceCanvas) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sourceRect = sourceCanvas.getBoundingClientRect();
  const sourceImage = sourceCanvas.querySelector("img");
  if (sourceImage && sourceImage.naturalWidth > 0 && sourceImage.naturalHeight > 0) {
    currentRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
  } else if (sourceCanvas.classList.contains("has-pdf")) {
    currentRatio = parseRatio(getComputedStyle(sourceCanvas).aspectRatio);
  } else {
    currentRatio = parseRatio(getComputedStyle(sourceCanvas).aspectRatio);
  }
  applyCanvasDesign(sourceCanvas);
  const targetRect = getFittedRect();
  setCardRect(targetRect);

  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");

  if (openAnimation) {
    openAnimation.cancel();
    openAnimation = null;
  }

  if (prefersReducedMotion) {
    lightboxCard.style.transform = "none";
    return;
  }

  const deltaX = sourceRect.left - targetRect.left;
  const deltaY = sourceRect.top - targetRect.top;
  const scaleX = sourceRect.width / targetRect.width;
  const scaleY = sourceRect.height / targetRect.height;

  lightboxCard.style.transformOrigin = "top left";
  lightboxCard.style.willChange = "transform";
  lightboxCard.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;

  lightboxCard.getBoundingClientRect();

  openAnimation = lightboxCard.animate(
    [
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
      { transform: "translate(0, 0) scale(1, 1)" },
    ],
    {
      duration: 300,
      easing: "cubic-bezier(0.2, 0.75, 0.2, 1)",
      fill: "forwards",
    }
  );

  openAnimation.onfinish = () => {
    lightboxCard.style.transform = "none";
    lightboxCard.style.willChange = "auto";
    openAnimation = null;
  };
}

function closeLightbox() {
  if (openAnimation) {
    openAnimation.cancel();
    openAnimation = null;
  }
  lightboxCard.style.transform = "none";
  lightboxCard.style.willChange = "auto";
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
}

document.querySelectorAll(".zoomable .canvas").forEach((canvas) => {
  canvas.addEventListener("click", () => openLightboxFromCanvas(canvas));
});

closeButton.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
});

window.addEventListener("resize", () => {
  if (!lightbox.classList.contains("open")) return;
  setCardRect(getFittedRect());
});

initializeCardImages();
