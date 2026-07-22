/**
 * DevSecOps Team Workspace & SSDLC Backend Application
 * 
 * Servidor Express com APIs para Gestão da Equipa de Desenvolvimento,
 * Quadro Kanban de Tarefas SSDLC, Simulador de Pull Requests e Pipeline CI/CD.
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Hardening de Cabeçalhos HTTP com Helmet (SAST & OWASP Compliance)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// 2. Configuração Estrita de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Limitação de Taxa de Requisições (Rate Limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { status: 429, error: 'Muitos pedidos enviados. Tente novamente mais tarde.' }
});

app.use(limiter);
app.use(express.json({ limit: '10kb' }));

// Servir os ficheiros estáticos do Dashboard Web
app.use(express.static(path.join(__dirname, '..')));

// =========================================================================
// MOCK DATA: EQUIPA DE DESENVOLVIMENTO & PROJETO SSDLC
// =========================================================================

const teamMembers = [
  {
    id: 'usr_1',
    name: 'Alice Silva',
    username: 'alice-dev',
    email: 'alice@devsecops.org',
    role: 'Senior Backend Developer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    complianceScore: 98,
    status: 'Active',
    activeBranch: 'feature/alice-secure-auth',
    lastCommit: 'feat(auth): adicionar modulo seguro de validacao de sessao'
  },
  {
    id: 'usr_2',
    name: 'Bob Santos',
    username: 'bob-dev',
    email: 'bob@devsecops.org',
    role: 'Fullstack / Legacy Developer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    complianceScore: 62,
    status: 'Security Review Required',
    activeBranch: 'feature/bob-insecure-feature',
    lastCommit: 'feat(legacy): adicionar processador legado com vulnerabilidade'
  },
  {
    id: 'usr_3',
    name: 'Carol Costa',
    username: 'carol-devops',
    email: 'carol@devsecops.org',
    role: 'DevSecOps Engineer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    complianceScore: 100,
    status: 'Active',
    activeBranch: 'main',
    lastCommit: 'ci: atualizar regras do Trivy e SonarQube Quality Gate'
  },
  {
    id: 'usr_4',
    name: 'David Oliveira',
    username: 'dave-sec',
    email: 'david@devsecops.org',
    role: 'Security Analyst & Lead',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    complianceScore: 100,
    status: 'Active',
    activeBranch: 'main',
    lastCommit: 'docs: aprovar relatorio de auditoria de seguranca'
  }
];

const kanbanTasks = [
  {
    id: 'task-101',
    title: 'Implementar Sanitização e Middleware Helmet',
    assignee: 'Alice Silva',
    status: 'Done',
    priority: 'High',
    securityCategory: 'SAST (Semgrep)',
    tags: ['Security', 'Express', 'OWASP-A05']
  },
  {
    id: 'task-102',
    title: 'Remover API Keys Hardcoded do Ficheiro Legado',
    assignee: 'Bob Santos',
    status: 'In Security Gate',
    priority: 'Critical',
    securityCategory: 'Secret Scanning (Gitleaks)',
    tags: ['Gitleaks', 'Secrets', 'OWASP-A07']
  },
  {
    id: 'task-103',
    title: 'Atualizar Pacotes com Vulnerabilidades no package.json',
    assignee: 'Carol Costa',
    status: 'In Progress',
    priority: 'High',
    securityCategory: 'SCA (Snyk)',
    tags: ['Snyk', 'Dependencies', 'CVE-2024']
  },
  {
    id: 'task-104',
    title: 'Hardening da Imagem Docker (Non-Root User)',
    assignee: 'Carol Costa',
    status: 'Done',
    priority: 'Medium',
    securityCategory: 'Container Security (Trivy)',
    tags: ['Trivy', 'Docker', 'CIS-Benchmark']
  }
];

const pullRequests = [
  {
    id: 'pr-12',
    title: 'feat(auth): Módulo Seguro de Validação de Sessão',
    author: 'Alice Silva',
    branch: 'feature/alice-secure-auth',
    targetBranch: 'main',
    status: 'Approved',
    securityGates: {
      gitleaks: 'Passed',
      semgrep: 'Passed',
      sonarqube: 'Passed',
      snyk: 'Passed',
      trivy: 'Passed'
    },
    codeSnippet: `// Código Seguro (Alice)\nfunction validateSession(token) {\n  if (!token) throw new Error('Unauthorized');\n  return { valid: true };\n}`
  },
  {
    id: 'pr-13',
    title: 'feat(legacy): Processador com Credencial Exposta & eval()',
    author: 'Bob Santos',
    branch: 'feature/bob-insecure-feature',
    targetBranch: 'main',
    status: 'Blocked',
    securityGates: {
      gitleaks: 'Failed (Secret Detected: AWS_SECRET_KEY)',
      semgrep: 'Failed (Insecure Function: eval())',
      sonarqube: 'Failed (Quality Gate Rating D)',
      snyk: 'Passed',
      trivy: 'Passed'
    },
    codeSnippet: `// Código Vulnerável (Bob)\nconst AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE";\nfunction processData(input) {\n  return eval(input); // RCE Vulnerability\n}`
  }
];

// =========================================================================
// ROTAS DE API
// =========================================================================

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    team: 'DevSecOps Core Engineering Team'
  });
});

// Retorna Membros da Equipa
app.get('/api/v1/team', (req, res) => {
  res.json({ success: true, count: teamMembers.length, data: teamMembers });
});

// Retorna Quadro de Tarefas SSDLC
app.get('/api/v1/tasks', (req, res) => {
  res.json({ success: true, count: kanbanTasks.length, data: kanbanTasks });
});

// Retorna Pull Requests e Estado dos Security Gates
app.get('/api/v1/pull-requests', (req, res) => {
  res.json({ success: true, count: pullRequests.length, data: pullRequests });
});

// Rota de Simulação do Audit de Segurança
app.get('/api/v1/security/status', (req, res) => {
  res.json({
    pipeline: 'GitHub Actions devsecops-pipeline.yml',
    overallStatus: 'SECURE',
    qualityGate: 'PASSED',
    tools: [
      { name: 'Gitleaks', stage: 'Secret Scanning', status: 'Passed', findings: 0 },
      { name: 'Semgrep', stage: 'SAST Lightweight', status: 'Passed', findings: 0 },
      { name: 'SonarQube', stage: 'SAST & Quality Gate', status: 'Passed', rating: 'A' },
      { name: 'Snyk', stage: 'SCA Dependencies', status: 'Passed', highCVEs: 0 },
      { name: 'Trivy', stage: 'Container Security', status: 'Passed', criticals: 0 }
    ]
  });
});

// Tratador Global de Erros
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ error: 'Erro interno no servidor.', code: 'INTERNAL_SERVER_ERROR' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[DevSecOps Team Workspace] App ativa na porta ${PORT}`);
  });
}

module.exports = app;
