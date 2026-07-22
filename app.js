/**
 * DevSecOps Dashboard Interactive Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSimulation();
});

// Tab Switcher Logic
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// Pipeline Simulation Engine
function initSimulation() {
  const runBtn = document.getElementById('run-simulation-btn');
  const clearBtn = document.getElementById('clear-log-btn');
  const terminalContent = document.getElementById('terminal-content');

  clearBtn.addEventListener('click', () => {
    terminalContent.innerHTML = '<div class="log-line info">[INFO] Terminal limpo pelo utilizador.</div>';
  });

  runBtn.addEventListener('click', async () => {
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
          'Result: 0 secrets detetados em 14 ficheiros.',
          '✓ Gitleaks Secret Scan: PASSED'
        ]
      },
      {
        id: 'semgrep',
        name: '2. Semgrep SAST Scan',
        tool: 'Semgrep Engine (OWASP Ruleset)',
        logs: [
          '[STAGE 2/5] A executar analise estatica de codigo semantico (SAST)...',
          'Regras ativas: detect-eval-with-code, express-helmet-missing, detect-hardcoded-credentials.',
          'Analise concluida: 0 vulnerabilidades criticas ou de alto risco.',
          'Relatorio SARIF gerado: semgrep-results.sarif',
          '✓ Semgrep SAST Scan: PASSED'
        ]
      },
      {
        id: 'sonarqube',
        name: '3. SonarQube Scanner & Quality Gate',
        tool: 'SonarSource Scanner',
        logs: [
          '[STAGE 3/5] A submeter relatorio para o servidor SonarQube...',
          'A analisar métricas: Security Rating, Bugs, Vulnerabilities, Code Smells.',
          'Waiting for Quality Gate status...',
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
          'Base de dados Snyk: 0 vulnerabilidades de severidade Alta ou Critica encontradas.',
          'Todas as dependencias (express, helmet, rate-limit, cors) estao em conformidade.',
          '✓ Snyk SCA Scan: PASSED'
        ]
      },
      {
        id: 'trivy',
        name: '5. Trivy Container & Hardening Scan',
        tool: 'Trivy Aqua Security Scanner',
        logs: [
          '[STAGE 5/5] A construir e analisar a imagem Docker (node:20-alpine)...',
          'Verificacao de Hardening no Dockerfile: User non-root ("node") detetado.',
          'Varrimento de CVEs na Imagem Base: 0 vulnerabilidades Criticas.',
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
          'Software seguro garantido de acordo com as normas SSDLC.',
          'Aplicacao promovida para Deployment em Producao com Sucesso.',
          '=============================================================='
        ]
      }
    ];

    for (const stage of stages) {
      highlightStep(stage.id, 'running');
      logTerminal('stage', `\n---> ${stage.name} (${stage.tool})`);

      for (const line of stage.logs) {
        await sleep(400);
        let type = 'info';
        if (line.includes('PASSED') || line.includes('Sucesso') || line.includes('APROVADOS')) type = 'success';
        if (line.includes('Result:') || line.includes('Config:')) type = 'warning';
        logTerminal(type, line);
      }

      highlightStep(stage.id, 'passed');
      await sleep(300);
    }

    runBtn.disabled = false;
    runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Simular Novamente';
  });
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
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = text;
  terminalContent.appendChild(line);
  terminalContent.scrollTop = terminalContent.scrollHeight;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
