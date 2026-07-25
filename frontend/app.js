// Point this at your deployed backend, or set window.API_BASE_URL before this
// script loads (e.g. <script>window.API_BASE_URL = "https://your-api.onrender.com"</script>).
const API_BASE = window.API_BASE_URL || "http://localhost:8000";

let token = localStorage.getItem("token") || null;
let currentProjectId = null;
let mode = "login"; // or "register"

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const authForm = document.getElementById("auth-form");
const authError = document.getElementById("auth-error");
const authSubmit = document.getElementById("auth-submit");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");

tabLogin.onclick = () => setMode("login");
tabRegister.onclick = () => setMode("register");

function setMode(m) {
  mode = m;
  tabLogin.classList.toggle("active", m === "login");
  tabRegister.classList.toggle("active", m === "register");
  authSubmit.textContent = m === "login" ? "Login" : "Create account";
  authError.textContent = "";
}

authForm.onsubmit = async (e) => {
  e.preventDefault();
  authError.style.color = "var(--danger)";
  authError.textContent = "";
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    if (mode === "register") {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
      setMode("login");
      authError.style.color = "var(--success)";
      authError.textContent = "Account created. Please log in.";
      return;
    }

    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    const data = await res.json();
    token = data.access_token;
    localStorage.setItem("token", token);
    enterApp();
  } catch (err) {
    authError.style.color = "var(--danger)";
    authError.textContent = err.message;
  }
};

document.getElementById("logout-btn").onclick = () => {
  token = null;
  currentProjectId = null;
  localStorage.removeItem("token");
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
};

document.getElementById("help-btn").onclick = () => {
  if (window.ChatbotTour) window.ChatbotTour.replay();
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function enterApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  await loadProjects();
  if (window.ChatbotTour) window.ChatbotTour.maybeStartPhase1();
}

// --- Projects ---
const projectForm = document.getElementById("project-form");
const projectList = document.getElementById("project-list");

projectForm.onsubmit = async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("project-name");
  const name = nameInput.value.trim();
  if (!name) return;
  await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, description: "" }),
  });
  nameInput.value = "";
  await loadProjects();
};

async function loadProjects() {
  const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
  const projects = await res.json();
  projectList.innerHTML = "";
  projects.forEach((p) => {
    const li = document.createElement("li");
    const isActive = p.id === currentProjectId;
    li.innerHTML = `<span class="signal-dot ${isActive ? "live" : ""}"></span><span>${escapeHtml(p.name)}</span>`;
    li.dataset.id = p.id;
    li.className = isActive ? "active" : "";
    li.onclick = () => selectProject(p);
    projectList.appendChild(li);
  });
}

async function selectProject(project) {
  currentProjectId = project.id;
  document.getElementById("no-project").classList.add("hidden");
  document.getElementById("project-view").classList.remove("hidden");
  document.getElementById("project-title").textContent = project.name;
  [...projectList.children].forEach((li) => {
    const isActive = Number(li.dataset.id) === project.id;
    li.classList.toggle("active", isActive);
    const dot = li.querySelector(".signal-dot");
    if (dot) dot.classList.toggle("live", isActive);
  });
  await loadMessages();
  if (window.ChatbotTour) window.ChatbotTour.maybeStartPhase2();
}

// --- Prompts ---
document.getElementById("prompt-form").onsubmit = async (e) => {
  e.preventDefault();
  const content = document.getElementById("prompt-content").value.trim();
  if (!content || !currentProjectId) return;
  await fetch(`${API_BASE}/projects/${currentProjectId}/prompts`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title: "system", content, is_active: true }),
  });
  document.getElementById("prompt-content").value = "";
};

// --- Chat ---
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");

async function loadMessages() {
  const res = await fetch(`${API_BASE}/projects/${currentProjectId}/messages`, {
    headers: authHeaders(),
  });
  const messages = await res.json();
  chatWindow.innerHTML = "";
  messages.forEach(renderMessage);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderMessage(m) {
  const div = document.createElement("div");
  div.className = `msg ${m.role}`;
  div.textContent = m.content;
  chatWindow.appendChild(div);
}

function renderTyping() {
  const div = document.createElement("div");
  div.className = "msg assistant typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  chatWindow.appendChild(div);
  return div;
}

chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text || !currentProjectId) return;
  input.value = "";
  renderMessage({ role: "user", content: text });
  const typingEl = renderTyping();
  chatWindow.scrollTop = chatWindow.scrollHeight;

  const res = await fetch(`${API_BASE}/projects/${currentProjectId}/chat`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message: text }),
  });
  const reply = await res.json();
  typingEl.remove();
  renderMessage(reply);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

// --- Files ---
document.getElementById("upload-btn").onclick = async () => {
  const fileInput = document.getElementById("file-input");
  if (!fileInput.files.length || !currentProjectId) return;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  await fetch(`${API_BASE}/projects/${currentProjectId}/files`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  fileInput.value = "";
};

// --- Boot ---
if (token) enterApp();
