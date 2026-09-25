/**
 * DevSecOps Team Workspace Frontend Application Script
 */

let teamData = [];
let tasksData = [];
let prsData = [];

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadBackendData();
  initPRViewer();
  initSimulation();
});

// 1. Navigation Between Views
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  const viewPanes = document.querySelectorAll('.view-pane');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      viewPanes.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      const targetView = btn.getAttribute('data-view');
      document.getElementById(targetView).classList.add('active');
    });
  });
}

// 2. Fetch Data from Backend Express API
async function loadBackendData() {
  try {
    const [teamRes, tasksRes, prsRes] = await Promise.all([
      fetch('/api/v1/team').catch(() => null),
      fetch('/api/v1/tasks').catch(() => null),
      fetch('/api/v1/pull-requests').catch(() => null)
    ]);

    if (teamRes && teamRes.ok) {
      const json = await teamRes.json();
      teamData = json.data || [];
    } else {
      teamData = getFallbackTeam();
    }

    if (tasksRes && tasksRes.ok) {
      const json = await tasksRes.json();
      tasksData = json.data || [];
    } else {
      tasksData = getFallbackTasks();
    }

    if (prsRes && prsRes.ok) {
      const json = await prsRes.json();
      prsData = json.data || [];
    } else {
      prsData = getFallbackPRs();
    }

    renderTeamMembers();
    renderKanbanBoard();
    renderPRDetail('alice');

  } catch (err) {
    console.error('Erro ao carregar dados da API Backend:', err);
    teamData = getFallbackTeam();
    tasksData = getFallbackTasks();
    prsData = getFallbackPRs();
    renderTeamMembers();
    renderKanbanBoard();
    renderPRDetail('alice');
  }
}

// 3. Render Team Members
function renderTeamMembers() {
  const container = document.getElementById('team-members-container');
  if (!container) return;

  container.innerHTML = teamData.map(member => `
    <div class="team-card">
      <div class="team-card-header">
        <img class="team-avatar" src="${member.avatar}" alt="${member.name}">
        <div class="team-meta">
          <h3>${member.name}</h3>
          <span class="team-role">${member.role}</span>
        </div>
      </div>

      <div class="team-card-body">
        <div class="info-row">
          <span>Branch Ativa:</span>
          <span class="branch-pill"><i class="fa-solid fa-code-branch"></i> ${member.activeBranch}</span>
        </div>

        <div class="info-row">
          <span>SSDLC Compliance:</span>
          <span class="score-badge ${member.complianceScore > 90 ? 'high' : 'medium'}">${member.complianceScore}%</span>
        </div>

        <div class="commit-msg">
          <i class="fa-solid fa-code-commit"></i> ${member.lastCommit}
        </div>
      </div>
    </div>
  `).join('');
}

// 4. Render Kanban Board
function renderKanbanBoard() {
  const todoCol = document.getElementById('col-todo');
  const inProgressCol = document.getElementById('col-inprogress');
  const secGateCol = document.getElementById('col-securitygate');
  const doneCol = document.getElementById('col-done');

  if (!todoCol) return;

  todoCol.innerHTML = '';
  inProgressCol.innerHTML = '';
  secGateCol.innerHTML = '';
  doneCol.innerHTML = '';

  tasksData.forEach(task => {
    const cardHtml = `
      <div class="kanban-card">
        <h4>${task.title}</h4>
        <div class="kanban-card-meta">
          <span><i class="fa-regular fa-user"></i> ${task.assignee}</span>
          <span class="task-tag">${task.securityCategory}</span>
        </div>
      </div>
    `;

    if (task.status === 'To Do') todoCol.innerHTML += cardHtml;
    else if (task.status === 'In Progress') inProgressCol.innerHTML += cardHtml;
    else if (task.status === 'In Security Gate') secGateCol.innerHTML += cardHtml;
    else if (task.status === 'Done') doneCol.innerHTML += cardHtml;
  });
}

// 5. PR Viewer Logic
function initPRViewer() {
  const prBtns = document.querySelectorAll('.btn-pr');
  prBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      prBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const prKey = btn.getAttribute('data-pr');
      renderPRDetail(prKey);
    });
  });
}

function renderPRDetail(prKey) {
  const container = document.getElementById('pr-detail-content');
  if (!container) return;

  const pr = prsData.find(p => p.author.toLowerCase().includes(prKey)) || prsData[0];
  const isApproved = pr.status === 'Approved';

  container.innerHTML = `
    <div class="pr-header">
      <div>
        <h3>${pr.title}</h3>
        <span class="text-muted"><i class="fa-solid fa-code-branch"></i> ${pr.branch} &rarr; ${pr.targetBranch} (Autor: ${pr.author})</span>
      </div>
      <span class="pr-status-tag ${isApproved ? 'approved' : 'blocked'}">
        <i class="fa-solid ${isApproved ? 'fa-circle-check' : 'fa-ban'}"></i> ${pr.status}
      </span>
    </div>

    <h4>Security Quality Gates (Validação Automática no GitHub Actions):</h4>
    <div class="gates-grid">
      <div class="gate-card ${pr.securityGates.gitleaks.includes('Passed') ? 'passed' : 'failed'}">
        <span class="gate-name"><i class="fa-solid fa-key"></i> Gitleaks (Secrets)</span>
        <span class="gate-val">${pr.securityGates.gitleaks}</span>
      </div>

      <div class="gate-card ${pr.securityGates.semgrep.includes('Passed') ? 'passed' : 'failed'}">
        <span class="gate-name"><i class="fa-solid fa-code"></i> Semgrep (SAST)</span>
        <span class="gate-val">${pr.securityGates.semgrep}</span>
      </div>

      <div class="gate-card ${pr.securityGates.sonarqube.includes('Passed') ? 'passed' : 'failed'}">
        <span class="gate-name"><i class="fa-solid fa-cubes"></i> SonarQube</span>
        <span class="gate-val">${pr.securityGates.sonarqube}</span>
      </div>

      <div class="gate-card ${pr.securityGates.snyk.includes('Passed') ? 'passed' : 'failed'}">
        <span class="gate-name"><i class="fa-solid fa-box-open"></i> Snyk (SCA)</span>
        <span class="gate-val">${pr.securityGates.snyk}</span>
      </div>

      <div class="gate-card ${pr.securityGates.trivy.includes('Passed') ? 'passed' : 'failed'}">
        <span class="gate-name"><i class="fa-solid fa-docker"></i> Trivy (Container)</span>
        <span class="gate-val">${pr.securityGates.trivy}</span>
      </div>
    </div>

    <h4>Código Submetido na PR:</h4>
    <pre><code>${pr.codeSnippet}</code></pre>
  `;
}

// 6. Pipeline Simulation Engine
function initSimulation() {
  const runBtn = document.getElementById('run-full-pipeline-btn');
  const quickBtn = document.getElementById('quick-sim-btn');
  const clearBtn = document.getElementById('clear-log-btn');
  const terminalContent = document.getElementById('terminal-content');

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      terminalContent.innerHTML = '<div class="log-line info">[INFO] Log limpo.</div>';
    });
  }

  const startPipelineSim = async () => {
    // Switch to pipeline view tab
    const pipelineTabBtn = document.querySelector('.nav-tab-btn[data-view="view-pipeline"]');
    if (pipelineTabBtn) pipelineTabBtn.click();

    if (runBtn.disabled) return;
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Em Execução...';

    terminalContent.innerHTML = '';
    logTerminal('info', '▶ Iniciando Execução do Workflow GitHub Actions: devsecops-pipeline.yml');
    logTerminal('info', 'Runner OS: Ubuntu-latest (GitHub-hosted)');

    const stages = [
      {
        id: 'secrets',
        name: '1. Gitleaks Secret Scan',
        tool: 'Gitleaks v8.18.2',
        logs: [
          '[STAGE 1/5] A verificar historico de commits e ficheiros fonte...',
          'Config: .gitleaks.toml carregado.',
          'Result: 0 secrets detetados.',
          '✓ Gitleaks Secret Scan: PASSED'
        ]
      },
      {
        id: 'semgrep',
        name: '2. Semgrep SAST Scan',
        tool: 'Semgrep Engine (OWASP Ruleset)',
        logs: [
          '[STAGE 2/5] A executar analise estatica de codigo semantico (SAST)...',
          'Regras ativas: detect-eval-with-code, express-helmet-missing.',
          'Analise concluida: 0 vulnerabilidades criticas.',
          'Relatorio SARIF gerado: semgrep-results.sarif',
          '✓ Semgrep SAST Scan: PASSED'
        ]
      },
      {
        id: 'sonarqube',
        name: '3. SonarQube Quality Gate',
        tool: 'SonarSource Scanner',
        logs: [
          '[STAGE 3/5] A submeter relatorio para o servidor SonarQube...',
          'QUALITY GATE STATUS: PASSED (Rating A em Seguranca e Fiabilidade)',
          '✓ SonarQube Quality Gate: PASSED'
        ]
      },
      {
        id: 'snyk',
        name: '4. Snyk Open Source (SCA)',
        tool: 'Snyk CLI v1.1290.0',
        logs: [
          '[STAGE 4/5] A verificar dependencias listadas no package.json...',
          '0 vulnerabilidades de severidade Alta ou Critica encontradas.',
          '✓ Snyk SCA Scan: PASSED'
        ]
      },
      {
        id: 'trivy',
        name: '5. Trivy Container & Hardening Scan',
        tool: 'Trivy Aqua Security Scanner',
        logs: [
          '[STAGE 5/5] A analisar a imagem Docker (node:20-alpine)...',
          'Hardening no Dockerfile: User non-root ("node") OK.',
          '✓ Trivy Container Security: PASSED'
        ]
      },
      {
        id: 'deploy',
        name: '6. Production Deploy Gate',
        tool: 'GitHub Actions Release Engine',
        logs: [
          '==============================================================',
          '🎉 TODOS OS SECURITY QUALITY GATES FORAM APROVADOS!',
          'Aplicacao promovida para Deployment em Producao com Sucesso.',
          '=============================================================='
        ]
      }
    ];

    for (const stage of stages) {
      highlightStep(stage.id, 'running');
      logTerminal('stage', `\n---> ${stage.name} (${stage.tool})`);

      for (const line of stage.logs) {
        await sleep(350);
        let type = 'info';
        if (line.includes('PASSED') || line.includes('Sucesso') || line.includes('APROVADOS')) type = 'success';
        if (line.includes('Result:') || line.includes('Config:')) type = 'warning';
        logTerminal(type, line);
      }

      highlightStep(stage.id, 'passed');
      await sleep(250);
    }

    runBtn.disabled = false;
    runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Executar Workflow Completo';
  };

  if (runBtn) runBtn.addEventListener('click', startPipelineSim);
  if (quickBtn) quickBtn.addEventListener('click', startPipelineSim);
}

function highlightStep(stageId, status) {
  const stepEl = document.querySelector(`.pipeline-step[data-stage="${stageId}"]`);
  if (!stepEl) return;

  stepEl.classList.remove('active', 'success');
  const indicator = stepEl.querySelector('.status-indicator');

  if (status === 'running') {
    stepEl.classList.add('active');
    indicator.className = 'status-indicator running';
    indicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A analisar...';
  } else if (status === 'passed') {
    stepEl.classList.add('success');
    indicator.className = 'status-indicator passed';
    indicator.innerHTML = '<i class="fa-solid fa-circle-check"></i> Aprovado';
  }
}

function logTerminal(type, text) {
  const terminalContent = document.getElementById('terminal-content');
  if (!terminalContent) return;
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = text;
  terminalContent.appendChild(line);
  terminalContent.scrollTop = terminalContent.scrollHeight;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fallback Data
function getFallbackTeam() {
  return [
    { id: 'usr_1', name: 'Alice Silva', role: 'Senior Backend Dev', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', complianceScore: 98, activeBranch: 'feature/alice-secure-auth', lastCommit: 'feat(auth): modulo seguro de sessao' },
    { id: 'usr_2', name: 'Bob Santos', role: 'Fullstack / Legacy Dev', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', complianceScore: 62, activeBranch: 'feature/bob-insecure-feature', lastCommit: 'feat(legacy): processador legado' },
    { id: 'usr_3', name: 'Carol Costa', role: 'DevSecOps Specialist', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', complianceScore: 100, activeBranch: 'main', lastCommit: 'ci: atualizar regras do Trivy' },
    { id: 'usr_4', name: 'David Oliveira', role: 'Security Analyst & Lead', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', complianceScore: 100, activeBranch: 'main', lastCommit: 'docs: aprovar relatorio de auditoria' }
  ];
}

function getFallbackTasks() {
  return [
    { id: 't1', title: 'Implementar Sanitização & Helmet', assignee: 'Alice Silva', status: 'Done', securityCategory: 'SAST (Semgrep)' },
    { id: 't2', title: 'Remover API Keys Hardcoded', assignee: 'Bob Santos', status: 'In Security Gate', securityCategory: 'Secret Scanning (Gitleaks)' },
    { id: 't3', title: 'Atualizar Pacotes com Vulnerabilidades', assignee: 'Carol Costa', status: 'In Progress', securityCategory: 'SCA (Snyk)' },
    { id: 't4', title: 'Hardening da Imagem Docker (Non-Root)', assignee: 'Carol Costa', status: 'Done', securityCategory: 'Container (Trivy)' }
  ];
}

function getFallbackPRs() {
  return [
    { id: 'pr12', title: 'feat(auth): Módulo Seguro de Validação de Sessão', author: 'Alice Silva', branch: 'feature/alice-secure-auth', targetBranch: 'main', status: 'Approved', securityGates: { gitleaks: 'Passed', semgrep: 'Passed', sonarqube: 'Passed', snyk: 'Passed', trivy: 'Passed' }, codeSnippet: `// Código Seguro (Alice)\nfunction validateSession(token) {\n  if (!token) throw new Error('Unauthorized');\n  return { valid: true };\n}` },
    { id: 'pr13', title: 'feat(legacy): Processador com Credencial Exposta', author: 'Bob Santos', branch: 'feature/bob-insecure-feature', targetBranch: 'main', status: 'Blocked', securityGates: { gitleaks: 'Failed (AWS_SECRET_KEY Exposta)', semgrep: 'Failed (Insecure eval() detected)', sonarqube: 'Failed (Rating D)', snyk: 'Passed', trivy: 'Passed' }, codeSnippet: `// Código Vulnerável (Bob)\nconst AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE";\nfunction processData(input) {\n  return eval(input);\n}` }
  ];
}
