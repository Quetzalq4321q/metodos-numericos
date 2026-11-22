<?php
declare(strict_types=1);

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Método HTTP no permitido.']);
}

if ($method === 'POST') {
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        respond(415, ['error' => 'El cálculo debe enviarse en formato JSON.']);
    }
    $raw = file_get_contents('php://input', false, null, 0, 4097);
    if ($raw === false || strlen($raw) > 4096) {
        respond(413, ['error' => 'El cálculo excede el tamaño permitido.']);
    }
    $input = json_decode($raw, true);
    $equation = is_array($input) ? ($input['equation'] ?? null) : null;
    if (!is_string($equation) || trim($equation) === '' || strlen($equation) > 640 ||
        preg_match('/\A[0-9a-zA-Zπ×÷−+*\/^().\-\s]+\z/u', $equation) !== 1 ||
        !in_array($input['method'] ?? null, ['euler', 'rk4', 'both'], true)) {
        respond(422, ['error' => 'El cálculo contiene datos no válidos.']);
    }
    foreach (['x0', 'y0', 'end'] as $key) {
        $value = $input[$key] ?? null;
        if ((!is_int($value) && !is_float($value)) || !is_finite((float) $value)) {
            respond(422, ['error' => 'El planteamiento requiere números finitos.']);
        }
    }
    $interval = abs($input['end'] - $input['x0']);
    if ($interval <= 0 || !is_finite((float) $interval)) {
        respond(422, ['error' => 'El intervalo está fuera del rango admitido.']);
    }
    if (array_key_exists('iterations', $input)) {
        $parameter = 'iterations';
        $count = $input[$parameter];
        if (!is_int($count) || $count < 1 || $count > 1000 || $interval / $count <= 0) {
            respond(422, ['error' => 'El número de iteraciones debe ser un entero entre 1 y 1000.']);
        }
    } else {
        $parameter = 'step';
        $step = $input[$parameter] ?? null;
        if ((!is_int($step) && !is_float($step)) || !is_finite((float) $step) ||
            $step <= 0 || $interval / $step > 1000.000000000002) {
            respond(422, ['error' => 'El paso está fuera del rango admitido.']);
        }
    }
    $input = array_intersect_key($input, array_flip(['equation', 'method', 'x0', 'y0', 'end', $parameter]));
}

// The configuration lives outside the web root and is never served to visitors.
$accountHome = dirname(rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\'));
$configPath = getenv('TRAYECTORIA_CONFIG') ?: $accountHome . '/trayectoria-db.php';
if (!is_readable($configPath)) {
    respond(503, ['error' => 'El historial está pendiente de configurar en MySQL.']);
}

try {
    $config = require $configPath;
    // Preserve the original cPanel installation, whose private file only has a password.
    $account = basename($accountHome);
    $host = $config['host'] ?? 'localhost';
    $database = $config['database'] ?? $account . '_basededatos';
    $username = $config['username'] ?? $account . '_basededatos1';
    $password = $config['password'] ?? '';
    if (!is_string($password) || $password === '') {
        respond(503, ['error' => 'El historial está pendiente de configurar en MySQL.']);
    }
    $db = new PDO("mysql:host={$host};dbname={$database};charset=utf8mb4",
        $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    $db->exec('CREATE TABLE IF NOT EXISTS trayectoria_calculos (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        navegador CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        parametros TEXT NOT NULL,
        INDEX trayectoria_por_navegador (navegador, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    // Keep browser histories isolated using a random, HttpOnly browser cookie.
    $token = $_COOKIE['trayectoria_historial'] ?? '';
    if (!is_string($token) || preg_match('/\A[0-9a-f]{64}\z/', $token) !== 1) {
        $token = bin2hex(random_bytes(32));
        setcookie('trayectoria_historial', $token, [
            'expires' => time() + 2592000,
            'path' => rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') . '/',
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
    }
    $browserId = hash('sha256', $token);
    if ($method === 'POST') {
        $insert = $db->prepare('INSERT INTO trayectoria_calculos (navegador, parametros) VALUES (?, ?)');
        $insert->execute([$browserId, json_encode($input, JSON_THROW_ON_ERROR)]);
        respond(201, ['saved' => true]);
    }
    $query = $db->prepare('SELECT parametros FROM trayectoria_calculos WHERE navegador = ? ORDER BY id DESC LIMIT 20');
    $query->execute([$browserId]);
    $items = array_map(static function (string $json): array {
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }, $query->fetchAll(PDO::FETCH_COLUMN));
    respond(200, ['items' => $items]);
} catch (Throwable $error) {
    error_log('Trayectoria: historial MySQL, código ' . $error->getCode());
    respond(503, ['error' => 'No se pudo conectar o inicializar el historial de MySQL.']);
}
