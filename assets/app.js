const patientStorageKey = "ps_escola_pacientes";
const triageStorageKey = "ps_escola_triagens";

const screenTitles = {
  cadastro: "Cadastro de paciente",
  triagem: "Determinação de triagem",
  fila: "Fila do pronto socorro"
};

const priorityLabels = {
  branco: "Branco",
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho"
};

const priorityColor = {
  branco: "#dbeafe",
  verde: "#51b56d",
  amarelo: "#f0b83c",
  vermelho: "#d94444"
};

class NavigationController {
  constructor(state, dom) {
    this.state = state;
    this.dom = dom;
  }

  init() {
    this.dom.navTabs.forEach((tab) => {
      tab.addEventListener("click", () => this.setScreen(tab.dataset.screen));
    });
  }

  setScreen(screen) {
    this.state.activeScreen = screen;
    this.dom.screenTitle.textContent = screenTitles[screen];
    this.dom.navTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.screen === screen);
    });
    this.dom.screens.forEach((section) => {
      section.classList.toggle("active", section.id === screen);
    });
  }
}

class DashboardController {
  constructor(state, dom) {
    this.state = state;
    this.dom = dom;
  }

  init() {
    this.updateClock();
    window.setInterval(() => this.updateClock(), 30000);
  }

  updateClock() {
    const now = new Date();
    this.dom.shiftClock.textContent = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  renderCounters() {
    this.dom.patientCount.textContent = this.state.patients.length;
    this.dom.waitingCount.textContent = this.state.triages.length;
    this.dom.criticalCount.textContent = this.state.triages.filter((item) => item.classification === "vermelho").length;
  }
}

class TriageApp {
  constructor() {
    this.state = new AppState(patientStorageKey, triageStorageKey);
    this.dom = this.createDomMap();
    this.navigation = new NavigationController(this.state, this.dom);
    this.dashboard = new DashboardController(this.state, this.dom);
    this.registration = new PatientRegistration(this.state, this.dom, {
      showMessage: (target, message) => this.showMessage(target, message),
      renderAll: () => this.renderAll(),
      setScreen: (screen) => this.navigation.setScreen(screen)
    });
    this.triage = new TriageController(this.state, this.dom, {
      showMessage: (target, message) => this.showMessage(target, message),
      renderAll: () => this.renderAll()
    }, priorityLabels);
    this.queue = new QueueController(this.state, this.dom, priorityLabels, priorityColor, {
      renderAll: () => this.renderAll()
    });
  }

  createDomMap() {
    return {
      screenTitle: document.getElementById("screenTitle"),
      navTabs: document.querySelectorAll(".nav-tab"),
      screens: document.querySelectorAll(".screen"),
      shiftClock: document.getElementById("shiftClock"),
      patientForm: document.getElementById("patientForm"),
      clearPatientForm: document.getElementById("clearPatientForm"),
      patientMessage: document.getElementById("patientMessage"),
      patientSearch: document.getElementById("patientSearch"),
      patientList: document.getElementById("patientList"),
      triageForm: document.getElementById("triageForm"),
      clearTriageForm: document.getElementById("clearTriageForm"),
      triageMessage: document.getElementById("triageMessage"),
      triagePatient: document.getElementById("triagePatient"),
      patientSummary: document.getElementById("patientSummary"),
      vitalPreview: document.getElementById("vitalPreview"),
      suggestRisk: document.getElementById("suggestRisk"),
      riskSuggestion: document.getElementById("riskSuggestion"),
      queueBoard: document.getElementById("queueBoard"),
      callNext: document.getElementById("callNext"),
      patientCount: document.getElementById("patientCount"),
      criticalCount: document.getElementById("criticalCount"),
      waitingCount: document.getElementById("waitingCount")
    };
  }

  init() {
    this.navigation.init();
    this.dashboard.init();
    this.registration.init();
    this.triage.init();
    this.queue.init();
    this.renderAll();
  }

  showMessage(target, message) {
    target.textContent = message;
    window.setTimeout(() => {
      target.textContent = "";
    }, 2800);
  }

  renderAll() {
    this.dashboard.renderCounters();
    this.registration.render();
    this.triage.renderPatientOptions();
    this.triage.renderPatientSummary();
    this.triage.renderVitalPreview();
    this.queue.render();
  }
}

const app = new TriageApp();
app.init();
