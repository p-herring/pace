const dataUrl = new URL("./data/comeback.json", import.meta.url);

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));

const setText = (field, value) => {
  document.querySelectorAll(`[data-field="${field}"]`).forEach((element) => {
    element.textContent = value;
  });
};

const renderSnapshot = (snapshot) => {
  setText("weekNumber", snapshot.weekNumber);
  setText("bodyweight", snapshot.bodyweight);
  setText("bodyweightChange", snapshot.bodyweightChange);
  setText("runLabel", snapshot.runLabel);
  setText("runPace", snapshot.runPace);
  setText("sessionsCompleted", snapshot.sessionsCompleted);
  setText("recordedOn", formatDate(snapshot.recordedOn));
  setText("note", snapshot.note);
  setText("nextCheckpoint", snapshot.nextCheckpoint);
  setText("sourceLabel", snapshot.sourceLabel);

  const sourceLink = document.querySelector('[data-field="sourceUrl"]');
  if (sourceLink && snapshot.sourceUrl) {
    sourceLink.href = snapshot.sourceUrl;
    sourceLink.hidden = false;
  }

  const liftStrip = document.querySelector("[data-lifts]");
  liftStrip.replaceChildren(
    ...snapshot.lifts.map((lift) => {
      const card = document.createElement("article");
      card.className = "lift-card";
      card.innerHTML = `
        <p>${lift.label}</p>
        <strong>${lift.value}</strong>
        <span>${lift.change}</span>
      `;
      return card;
    }),
  );
};

const renderHistory = (history) => {
  const historyGrid = document.querySelector("[data-history]");
  historyGrid.replaceChildren(
    ...history.map((entry) => {
      const card = document.createElement("article");
      card.className = "history-card";
      card.innerHTML = `
        <span class="label">Week ${entry.weekNumber}</span>
        <strong>${entry.headline}</strong>
        <p>${entry.note}</p>
      `;
      return card;
    }),
  );
};

async function init() {
  const response = await fetch(dataUrl);
  const data = await response.json();

  renderSnapshot(data.snapshot);
  renderHistory(data.history);
}

init().catch((error) => {
  console.error(error);
  setText("note", "The tracker data could not be loaded.");
});
