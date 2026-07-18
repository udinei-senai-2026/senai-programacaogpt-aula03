class PatientRegistration {
  constructor(state, dom, callbacks) {
    this.state = state;
    this.dom = dom;
    this.callbacks = callbacks;
  }

  init() {
    this.dom.patientForm.addEventListener("submit", (event) => this.handleSubmit(event));
    this.dom.clearPatientForm.addEventListener("click", () => this.reset());
    this.dom.patientSearch.addEventListener("input", () => this.render());
    this.dom.patientList.addEventListener("click", (event) => this.handleListClick(event));

    this.bindNumericField(document.getElementById("age"), (value) => value.replace(/\D/g, ""));
    this.bindNumericField(document.getElementById("insuranceCard"), (value) => value.replace(/\D/g, ""));

    const insuranceNameField = document.getElementById("insuranceName");
    const insurancePlanField = document.getElementById("insurancePlan");
    this.insuranceValidUntilField = document.getElementById("insuranceValidUntil");

    this.syncInsuranceValidityConstraints();
    insuranceNameField.addEventListener("input", () => this.syncPlanAvailability());
    insuranceNameField.addEventListener("change", () => this.syncPlanAvailability());
    insurancePlanField.addEventListener("change", () => this.syncPlanAvailability());

    this.dom.patientForm.querySelectorAll("input, select").forEach((field) => {
      field.addEventListener("input", () => this.renderLivePreview());
      field.addEventListener("change", () => this.renderLivePreview());
    });

    this.syncPlanAvailability();
    this.renderLivePreview();
  }

  getCurrentMonthValue() {
    return new Date().toISOString().slice(0, 7);
  }

  syncInsuranceValidityConstraints() {
    if (!this.insuranceValidUntilField) {
      return;
    }
    this.insuranceValidUntilField.min = this.getCurrentMonthValue();
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

  handleSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.dom.patientForm);
    const insuranceName = String(data.get("insuranceName") || "").trim();
    const insurancePlan = String(data.get("insurancePlan") || "").trim();
    const age = Number(String(data.get("age") || "").trim());
    const insuranceCard = String(data.get("insuranceCard") || "").trim();
    const insuranceValidUntil = String(data.get("insuranceValidUntil") || "").trim();
    const patient = {
      id: crypto.randomUUID(),
      firstName: String(data.get("firstName") || "").trim(),
      lastName: String(data.get("lastName") || "").trim(),
      age: String(data.get("age") || "").trim(),
      gender: String(data.get("gender") || "").trim(),
      address: String(data.get("address") || "").trim(),
      insuranceName,
      insuranceCard,
      insuranceValidUntil,
      insurancePlan,
      createdAt: new Date().toISOString()
    };

    if (!patient.firstName || !patient.lastName || !patient.age || !patient.gender || !patient.address || !patient.insuranceName || !patient.insuranceCard) {
      this.callbacks.showMessage(this.dom.patientMessage, "Preencha os campos obrigatorios.");
      return;
    }

    if (!Number.isInteger(age) || age < 0 || age > 130) {
      this.callbacks.showMessage(this.dom.patientMessage, "A idade deve estar entre 0 e 130 anos.");
      return;
    }

    if (!/^\d{6,20}$/.test(patient.insuranceCard)) {
      this.callbacks.showMessage(this.dom.patientMessage, "A carteirinha deve ter de 6 a 20 numeros.");
      return;
    }

    const currentMonth = this.getCurrentMonthValue();
    if (!insuranceValidUntil) {
      this.callbacks.showMessage(this.dom.patientMessage, "Informe a validade da carteirinha.");
      return;
    }

    if (insuranceValidUntil < currentMonth) {
      this.callbacks.showMessage(this.dom.patientMessage, "A carteirinha está vencida.");
      return;
    }

    if (patient.insurancePlan === "SUS" && !this.isNoInsurance(patient.insuranceName)) {
      this.callbacks.showMessage(this.dom.patientMessage, "SUS so pode ser usado para pacientes sem convenio.");
      return;
    }

    this.state.patients.push(patient);
    this.state.selectedPatientId = patient.id;
    this.state.save();
    this.reset();
    this.callbacks.showMessage(this.dom.patientMessage, "Paciente cadastrado.");
    this.callbacks.renderAll();
  }

  isNoInsurance(value) {
    const normalized = value.trim().toLowerCase();
    return normalized === "sem convênio" || normalized === "sem convenio";
  }

  handleListClick(event) {
    const selectButton = event.target.closest("[data-select-patient]");
    const deleteButton = event.target.closest("[data-delete-patient]");
    if (selectButton) {
      this.state.selectedPatientId = selectButton.dataset.selectPatient;
      this.callbacks.setScreen("triagem");
      this.callbacks.renderAll();
    }
    if (deleteButton) {
      const index = Number(deleteButton.dataset.deletePatient);
      const removed = this.state.patients.splice(index, 1)[0];
      if (removed) {
        this.state.triages = this.state.triages.filter((triage) => triage.patientId !== removed.id);
      }
      this.state.save();
      this.callbacks.renderAll();
    }
  }

  reset() {
    this.dom.patientForm.reset();
    this.syncInsuranceValidityConstraints();
    this.syncPlanAvailability();
    this.renderLivePreview();
  }

  render() {
    const search = this.dom.patientSearch.value;
    const patients = this.state.patients.filter((patient) => patient.firstName.includes(search));
    if (patients.length === 0) {
      this.dom.patientList.innerHTML = `<div class="empty-state">Nenhum paciente na recepcao.</div>`;
      return;
    }

    this.dom.patientList.innerHTML = patients.map((patient, index) => {
      const inQueue = this.state.triages.some((triage) => triage.patientId === patient.id);
      return `
      <article class="patient-card">
        <header>
          <div>
            <strong>${this.state.getPatientName(patient)}</strong>
            <small>${patient.age} anos Â· ${patient.gender}</small>
          </div>
          <span class="tag">${patient.insurancePlan}</span>
        </header>
        <div class="meta-line">${patient.address}</div>
        <div class="meta-line">${patient.insuranceName} Â· ${patient.insuranceCard}</div>
        <div class="patient-actions">
          ${inQueue ? `<span class="tag">Em fila de atendimento</span>` : `<button class="small-button" data-select-patient="${patient.id}" type="button">Triar</button>`}
          <button class="small-button danger-button" data-delete-patient="${index}" type="button">Remover</button>
        </div>
      </article>
    `;
    }).join("");
  }

  renderLivePreview() {
    if (!this.dom.patientLivePreviewList) {
      return;
    }
    const formData = new FormData(this.dom.patientForm);
    const values = [
      ["Nome", formData.get("firstName")],
      ["Sobrenome", formData.get("lastName")],
      ["Idade", formData.get("age")],
      ["Genero", formData.get("gender")],
      ["Endereco", formData.get("address")],
      ["Convenio", formData.get("insuranceName")],
      ["Carteirinha", formData.get("insuranceCard")],
      ["Validade", formData.get("insuranceValidUntil")],
      ["Plano", formData.get("insurancePlan")]
    ].map(([label, value]) => ({ label, value: String(value || "").trim() }));

    const filled = values.some((item) => item.value);
    this.dom.patientLivePreviewList.innerHTML = filled
      ? values.map((item) => `
          <div class="live-preview-row">
            <span>${item.label}</span>
            <strong>${item.value || "—"}</strong>
          </div>
        `).join("")
      : `<div class="live-preview-empty">Preencha o formulario para ver os valores aqui.</div>`;
  }

  syncPlanAvailability() {
    const insuranceName = document.getElementById("insuranceName").value.trim().toLowerCase();
    const planSelect = document.getElementById("insurancePlan");
    const susOption = planSelect.querySelector('option[value="SUS"]');
    const noInsurance = insuranceName === "" || insuranceName === "sem convênio" || insuranceName === "sem convenio";

    if (susOption) {
      susOption.disabled = !noInsurance;
    }

    if (!noInsurance && planSelect.value === "SUS") {
      planSelect.value = "Enfermaria";
    }
  }
}

window.PatientRegistration = PatientRegistration;
