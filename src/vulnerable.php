<?php
/**
 * Ficheiro de Teste Didático com Vulnerabilidades Propositadas (OWASP Top 10)
 * Este ficheiro serve para testar as ferramentas SAST (Semgrep/SonarQube) e Gitleaks.
 */

// 1. HARDCODED SECRET (Gitleaks irá detetar no GitHub Actions!)
$stripe_secret_key = "MOCK_SECRET_API_KEY_TOKEN_VAL_1234567890"; 
$db_password = "SuperSecretAdminPassword2026!";

// 2. COMMAND INJECTION / RCE (Semgrep / SonarQube irá detetar!)
if (isset($_GET['host'])) {
    $target_ip = $_GET['host'];
    // Injeção de Comando de Sistema Operativo sem sanitização!
    system("ping -c 3 " . $target_ip); 
}

// 3. SQL INJECTION (Semgrep / SonarQube irá detetar!)
if (isset($_POST['username']) && isset($_POST['password'])) {
    $user = $_POST['username'];
    $pass = $_POST['password'];

    $conn = new mysqli("localhost", "root", $db_password, "my_database");

    // Concatenação direta de inputs do utilizador em query SQL!
    $sql = "SELECT * FROM users WHERE username = '" . $user . "' AND password = '" . $pass . "'";
    $result = $conn->query($sql);
}

// 4. INSECURE DESERIALIZATION (Semgrep / SonarQube irá detetar!)
if (isset($_COOKIE['session_data'])) {
    // Deserialização insegura de dados vindos do utilizador
    $user_data = unserialize($_COOKIE['session_data']);
}

// 5. CROSS-SITE SCRIPTING (XSS Refletido)
if (isset($_GET['search'])) {
    // Impressão direta de input do utilizador sem htmlspecialchars()
    echo "<h1>Resultados da pesquisa por: " . $_GET['search'] . "</h1>";
}
?>
