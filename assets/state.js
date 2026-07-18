class AppState {
  constructor(patientStorageKey, triageStorageKey) {
    this.patientStorageKey = patientStorageKey;
    this.triageStorageKey = triageStorageKey;
    this.patients = JSON.parse(localStorage.getItem(patientStorageKey) || "[]");
    this.triages = JSON.parse(localStorage.getItem(triageStorageKey) || "[]");
    this.activeScreen = "cadastro";
    this.selectedPatientId = "";

    if (this.patients.length === 0) {
      this.patients = [{
        id: "demo-patient-001",
        firstName: "Maria",
        lastName: "Silva",
        age: "42",
        gender: "Feminino",
        address: "Rua das Flores, 123",
        insuranceName: "Plano Vida",
        insuranceCard: "1234567890",
        insuranceValidUntil: "2027-12",
        insurancePlan: "Enfermaria",
        createdAt: new Date().toISOString()
      }];
      this.save();
    }
  }

  save() {
    localStorage.setItem(this.patientStorageKey, JSON.stringify(this.patients));
    localStorage.setItem(this.triageStorageKey, JSON.stringify(this.triages));
  }

  getPatientName(patient) {
    return `${patient.firstName} ${patient.lastName}`;
  }

  getSelectedPatient() {
    return this.patients.find((patient) => patient.id === this.selectedPatientId);
  }
}

window.AppState = AppState;
