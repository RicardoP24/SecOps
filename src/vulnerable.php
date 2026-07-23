<?php
/**
 * Ficheiro de Teste Didático com Vulnerabilidades Propositadas (OWASP Top 10)
 * Este ficheiro serve para testar as ferramentas SAST (Semgrep/SonarQube) e Gitleaks.
 */

// 1. HARDCODED SECRET (Gitleaks irá detetar no GitHub Actions!)
echo "olá"
    ?>