const slice = document.querySelector('#slice');
const display = document.querySelector('#display');
const ticks = document.querySelector('#ticks');
const minutesSlider = document.querySelector('#minutes-slider');
const minutesInput = document.querySelector('#minutes-input');
const dialScaleSelect = document.querySelector('#dial-scale');
const sliceColorInput = document.querySelector('#slice-color-input');
const startPauseButton = document.querySelector('#start-pause');
const toggleDisplayButton = document.querySelector('#toggle-display');

// Einstellungen
let dialMinutes = 60; // Vollkreis entspricht 30, 60 oder 120 Minuten
let remainingSeconds = 15 * 60; // Start bei 15 Minuten für den Test
let isDisplayVisible = true;
let isRunning = false;
const defaultSliceColor = '#19d9d6';
const svgNs = 'http://www.w3.org/2000/svg';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  // -90 Grad, damit wir oben bei 12 Uhr starten
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeSector(x, y, radius, startAngle, sweepAngle) {
  // SVG-Bogen kann kein exaktes 360deg; daher knapp darunter begrenzen.
  const safeSweep = Math.max(-359.99, Math.min(359.99, sweepAngle));
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, startAngle + safeSweep);
  const largeArcFlag = Math.abs(safeSweep) > 180 ? "1" : "0";
  const sweepFlag = safeSweep >= 0 ? "1" : "0";

  return [
    "M", x, y,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, sweepFlag, end.x, end.y,
    "L", x, y,
    "Z"
  ].join(" ");
}

function drawMinuteTicks() {
  ticks.innerHTML = '';
  const angleStep = 360 / dialMinutes;

  for (let minute = 0; minute < dialMinutes; minute++) {
    // Minuten laufen gegen den Uhrzeigersinn: 0 oben, 5 links weiter ...
    const angle = -minute * angleStep;
    const isMajor = minute % 5 === 0;
    const from = polarToCartesian(100, 100, 95.5, angle);
    const to = polarToCartesian(100, 100, isMajor ? 108 : 103, angle);

    const tickLine = document.createElementNS(svgNs, 'line');
    tickLine.setAttribute('x1', from.x);
    tickLine.setAttribute('y1', from.y);
    tickLine.setAttribute('x2', to.x);
    tickLine.setAttribute('y2', to.y);
    if (isMajor) tickLine.setAttribute('class', 'tick-major');
    ticks.appendChild(tickLine);

    if (!isMajor) continue;
    const labelPos = polarToCartesian(100, 100, 116, angle);
    const label = document.createElementNS(svgNs, 'text');
    label.setAttribute('x', labelPos.x);
    label.setAttribute('y', labelPos.y);
    label.textContent = String(minute);
    ticks.appendChild(label);
  }
}

function render() {
  const dialSeconds = dialMinutes * 60;
  const percentage = Math.max(0, Math.min(1, remainingSeconds / dialSeconds));
  const degrees = percentage * 360;

  // Keil schwindet im Uhrzeigersinn; bei 15 Min liegt Kante auf 9-Uhr-Position.
  if (degrees <= 0.01) {
    slice.setAttribute("d", "");
  } else {
    slice.setAttribute("d", describeSector(100, 100, 95, 0, -degrees));
  }
  
  // Text-Update
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  display.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function setMinutes(minutes) {
  const clamped = Math.max(0, Math.min(dialMinutes, Math.round(minutes)));
  remainingSeconds = clamped * 60;
  minutesSlider.value = String(clamped);
  minutesInput.value = String(clamped);
  render();
}

function updateMinuteBounds() {
  minutesSlider.max = String(dialMinutes);
  minutesInput.max = String(dialMinutes);
  minutesSlider.title = `Minuten 0 bis ${dialMinutes}`;
  minutesInput.title = `Minuten 0 bis ${dialMinutes}`;
}

function updateDisplayVisibility() {
  display.classList.toggle('is-hidden', !isDisplayVisible);
  toggleDisplayButton.setAttribute('aria-pressed', String(isDisplayVisible));
}

function updateStartPauseButton() {
  startPauseButton.textContent = isRunning ? 'Pause' : 'Start';
  startPauseButton.setAttribute('aria-pressed', String(isRunning));
}

function setSliceColor(colorValue) {
  slice.style.fill = colorValue;
  slice.style.filter = `drop-shadow(0 0 5px ${colorValue})`;
}

minutesSlider.addEventListener('input', (event) => {
  setMinutes(Number(event.target.value));
});

minutesInput.addEventListener('input', (event) => {
  const value = Number(event.target.value);
  if (Number.isNaN(value)) return;
  setMinutes(value);
});

dialScaleSelect.addEventListener('change', (event) => {
  const selected = Number(event.target.value);
  dialMinutes = [30, 60, 120].includes(selected) ? selected : 60;
  updateMinuteBounds();
  drawMinuteTicks();
  setMinutes(remainingSeconds / 60);
});

toggleDisplayButton.addEventListener('click', () => {
  isDisplayVisible = !isDisplayVisible;
  updateDisplayVisibility();
});

sliceColorInput.addEventListener('change', (event) => {
  const colorValue = event.target.value.trim();
  if (!CSS.supports('color', colorValue)) {
    event.target.value = defaultSliceColor;
    setSliceColor(defaultSliceColor);
    return;
  }

  setSliceColor(colorValue);
});

startPauseButton.addEventListener('click', () => {
  if (!isRunning && remainingSeconds <= 0) return;
  isRunning = !isRunning;
  updateStartPauseButton();
});

// Intervall für die Zeit
setInterval(() => {
  if (isRunning && remainingSeconds > 0) {
    remainingSeconds--;
    render();
    if (remainingSeconds === 0) {
      isRunning = false;
      updateStartPauseButton();
    }
  }
}, 1000);

// Sofort beim Laden einmal zeichnen!
updateMinuteBounds();
drawMinuteTicks();
render();
updateDisplayVisibility();
updateStartPauseButton();
setSliceColor(defaultSliceColor);

// Erst anzeigen, wenn der erste Render-Durchlauf fertig ist.
requestAnimationFrame(() => {
  document.body.classList.remove('app-loading');
});