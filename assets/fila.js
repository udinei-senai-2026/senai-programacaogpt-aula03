class QueueController {
  constructor(state, dom, priorityLabels, priorityColor, callbacks) {
    this.state = state;
    this.dom = dom;
    this.priorityLabels = priorityLabels;
    this.priorityColor = priorityColor;
    this.callbacks = callbacks;
  }

  init() {
    this.dom.callNext.addEventListener("click", () => this.callNext());
  }

  callNext() {
    if (this.state.triages.length === 0) {
      return;
    }

    if (!window.confirm("Deseja realmente chamar o próximo paciente para atendimento?")) {
      return;
    }

    const called = this.state.triages.shift();
    const patient = this.state.patients.find((item) => item.id === called.patientId);
    window.alert(`${patient ? this.state.getPatientName(patient) : "Paciente"} encaminhado para atendimento.`);
    this.state.save();
    this.callbacks.renderAll();
  }

  render() {
    if (this.state.triages.length === 0) {
      this.dom.queueBoard.innerHTML = `<div class="empty-state">Nenhum paciente aguardando atendimento.</div>`;
      return;
    }
    this.dom.queueBoard.innerHTML = this.state.triages.map((triage) => {
      const patient = this.state.patients.find((item) => item.id === triage.patientId);
      const patientName = patient ? this.state.getPatientName(patient) : "Paciente não encontrado";
      return `
        <article class="queue-card">
          <div class="risk-bar" style="background:${this.priorityColor[triage.classification]}"></div>
          <div class="queue-body">
            <header>
              <div>
                <strong>${patientName}</strong>
                <small>Entrada ${triage.time}</small>
              </div>
              <span class="tag ${triage.classification}">${this.priorityLabels[triage.classification]}</span>
            </header>
            <div class="tag-row">
              <span class="tag">PA ${triage.bloodPressure}</span>
              <span class="tag">Temp ${triage.temperature} °C</span>
              <span class="tag">SpO2 ${triage.oxygen}%</span>
            </div>
            <p class="meta-line">${triage.symptoms}</p>
          </div>
        </article>
      `;
    }).join("");
  }
}

window.QueueController = QueueController;
