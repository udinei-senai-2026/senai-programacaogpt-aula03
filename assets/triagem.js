class TriageController {
  constructor(state, dom, callbacks, priorityLabels) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
    this.priorityLabels = priorityLabels;
  }

  init() {
    this.dom.triagePatient.addEventListener("change", () => this.selectPatient());
    ["bloodPressure", "temperature", "oxygen", "heartRate"].forEach((id) => {
      document.getElementById(id).addEventListener("input", () => this.renderVitalPreview());
    });
    this.bindNumericField(document.getElementById("bloodPressure"), (value) => {
      const cleaned = value.replace(/[^\d\/-]/g, "");
      const parts = cleaned.split(/[\/-]/);
      if (parts.length > 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return cleaned;
    });
    this.bindNumericField(document.getElementById("temperature"), (value) => value.replace(/[^\d.,]/g, "").replace(",", "."));
    this.bindNumericField(document.getElementById("oxygen"), (value) => value.replace(/\D/g, ""));
    this.bindNumericField(document.getElementById("heartRate"), (value) => value.replace(/\D/g, ""));
    this.dom.suggestRisk.addEventListener("click", () => this.suggestRisk());
    this.dom.triageForm.addEventListener("submit", (event) => this.handleSubmit(event));
    this.dom.clearTriageForm.addEventListener("click", () => this.reset());
  }

  bindNumericField(field, sanitizer) {
    const applySanitizer = () => {
      const sanitized = sanitizer(field.value);
      if (field.value !== sanitized) {
        field.value = sanitized;
      }
    };
    field.addEventListener("input", applySanitizer);
    field.addEventListener("blur", applySanitizer);
    field.addEventListener("paste", () => window.setTimeout(applySanitizer, 0));
  }

  selectPatient() {
    this.state.selectedPatientId = this.dom.triagePatient.value;
    this.renderPatientSummary();
  }

  parseBloodPressure(value) {
    const parts = value.split(/[\/-]/);
    return {
      systolic: Number(parts[0]),
      diastolic: Number(parts[1])
    };
  }

  calculateSuggestion() {
    const pressure = this.parseBloodPressure(document.getElementById("bloodPressure").value);
    const temperature = parseInt(document.getElementById("temperature").value, 10);
    const oxygen = Number(document.getElementById("oxygen").value);
    const symptoms = document.getElementById("symptoms").value.toLowerCase();
    const heartRate = Number(document.getElementById("heartRate").value);
    let risk = "verde";
    if (oxygen < 90 || pressure.systolic >= 180 || temperature >= 38.5 || symptoms.includes("dor no peito") || symptoms.includes("convuls")) {
      risk = "vermelho";
    } else if (oxygen < 94 || pressure.systolic >= 160 || temperature >= 37.8 || heartRate > 120 || symptoms.includes("falta de ar")) {
      risk = "amarelo";
    } else if (symptoms.includes("receita") || symptoms.includes("atestado")) {
      risk = "branco";
    }
    return risk;
  }

  suggestRisk() {
    const risk = this.calculateSuggestion();
    const riskInput = document.querySelector(`[name="classification"][value="${risk}"]`);
    if (riskInput) {
      riskInput.checked = true;
    }
    this.dom.riskSuggestion.textContent = `Sugestão: ${this.priorityLabels[risk]}`;
  }

  handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.dom.triageForm);
    const classification = data.get("classification");
    const bloodPressure = String(data.get("bloodPressure") || "").trim();
    const temperature = Number(String(data.get("temperature") || "").trim());
    const oxygen = Number(String(data.get("oxygen") || "").trim());
    const heartRateRaw = String(data.get("heartRate") || "").trim();
    const heartRate = heartRateRaw ? Number(heartRateRaw) : null;
    const symptoms = String(data.get("symptoms") || "").trim();

    if (!this.state.selectedPatientId || !bloodPressure || !temperature || !oxygen || !symptoms) {
      this.callbacks.showMessage(this.dom.triageMessage, "Preencha todos os dados da triagem.");
      return;
    }

    const pressureMatch = bloodPressure.match(/^(\d{2,3})[\/-](\d{2,3})$/);
    if (!pressureMatch) {
      this.callbacks.showMessage(this.dom.triageMessage, "A pressão deve seguir o formato 120/80.");
      return;
    }

    const systolic = Number(pressureMatch[1]);
    const diastolic = Number(pressureMatch[2]);
    if (systolic < 70 || systolic > 250 || diastolic < 40 || diastolic > 150 || systolic <= diastolic) {
      this.callbacks.showMessage(this.dom.triageMessage, "A pressão informada está fora de uma faixa realista.");
      return;
    }

    if (temperature < 30 || temperature > 45) {
      this.callbacks.showMessage(this.dom.triageMessage, "A temperatura deve estar entre 30 e 45 graus.");
      return;
    }

    if (oxygen < 0 || oxygen > 100) {
      this.callbacks.showMessage(this.dom.triageMessage, "A oxigenação deve estar entre 0 e 100 por cento.");
      return;
    }

    if (heartRate !== null && (heartRate < 30 || heartRate > 220)) {
      this.callbacks.showMessage(this.dom.triageMessage, "A frequência cardíaca deve estar entre 30 e 220 bpm.");
      return;
    }

    if (!classification) {
      this.callbacks.showMessage(this.dom.triageMessage, "Selecione o nível de risco antes de salvar.");
      return;
    }
    this.state.triages.push({
      id: crypto.randomUUID(),
      patientId: this.state.selectedPatientId,
      bloodPressure,
      temperature: String(temperature),
      oxygen: String(oxygen),
      heartRate: heartRate === null ? "" : String(heartRate),
      symptoms,
      classification,
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    });
    this.state.save();
    this.reset();
    this.callbacks.showMessage(this.dom.triageMessage, "Triagem registrada.");
    this.callbacks.renderAll();
  }

  reset() {
    this.dom.triageForm.reset();
    this.state.selectedPatientId = "";
    this.dom.riskSuggestion.textContent = "Sem sugestão";
    this.renderPatientOptions();
    this.renderPatientSummary();
    this.renderVitalPreview();
  }

  renderPatientOptions() {
    if (this.state.patients.length === 0) {
      this.dom.triagePatient.innerHTML = `<option value="">Nenhum paciente cadastrado</option>`;
      return;
    }
    const queuedIds = new Set(this.state.triages.map((triage) => triage.patientId));
    const availablePatients = this.state.patients.filter((patient) => !queuedIds.has(patient.id));
    if (availablePatients.length === 0) {
      this.dom.triagePatient.innerHTML = `<option value="">Nenhum paciente disponível para triagem</option>`;
      this.state.selectedPatientId = "";
      return;
    }
    if (!availablePatients.some((patient) => patient.id === this.state.selectedPatientId)) {
      this.state.selectedPatientId = "";
    }
    this.dom.triagePatient.innerHTML = `<option value="">Selecionar paciente</option>` + availablePatients.map((patient) => `
      <option value="${patient.id}">${patient.firstName}</option>
    `).join("");
    this.dom.triagePatient.value = this.state.selectedPatientId;
  }

  renderPatientSummary() {
    const patient = this.state.getSelectedPatient();
    if (!patient) {
      this.dom.patientSummary.innerHTML = `<div class="empty-state">Selecione um paciente para ver o resumo.</div>`;
      return;
    }
    this.dom.patientSummary.innerHTML = `
      <div class="summary-row"><span>Nome</span><strong>${this.state.getPatientName(patient)}</strong></div>
      <div class="summary-row"><span>Idade</span><strong>${patient.age}</strong></div>
      <div class="summary-row"><span>Gênero</span><strong>${patient.gender}</strong></div>
      <div class="summary-row"><span>Convênio</span><strong>${patient.insuranceName}</strong></div>
      <div class="summary-row"><span>Plano</span><strong>${patient.insurancePlan}</strong></div>
    `;
  }

  renderVitalPreview() {
    const pressure = document.getElementById("bloodPressure").value || "--";
    const temperature = document.getElementById("temperature").value || "--";
    const oxygen = document.getElementById("oxygen").value || "--";
    const oxygenNumber = Number(oxygen);
    const oxygenClass = oxygenNumber < 90 ? "alert" : "";
    this.dom.vitalPreview.innerHTML = `
      <div class="vital-row"><span>Pressão</span><strong>${pressure}</strong></div>
      <div class="vital-row"><span>Temperatura</span><strong>${temperature} °C</strong></div>
      <div class="vital-row"><span>Oxigenação</span><strong class="${oxygenClass}">${oxygen}%</strong></div>
    `;
  }
}

window.TriageController = TriageController;
