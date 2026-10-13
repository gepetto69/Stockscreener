<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'POST requis']);
  exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'JSON invalide']);
  exit;
}

$to = isset($payload['to']) ? trim($payload['to']) : '';
$subject = isset($payload['subject']) ? trim($payload['subject']) : '';
$html = isset($payload['html']) ? $payload['html'] : '';
$to = preg_replace('/[\r\n]+/', '', $to);
$subject = preg_replace('/[\r\n]+/', ' ', $subject);

if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Adresse destinataire invalide']);
  exit;
}
if ($subject === '') {
  $subject = 'Revue QualityScreener PRO — portefeuilles & actualités';
}
if (!is_string($html) || strlen($html) < 80 || strlen($html) > 400000) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Contenu newsletter trop court ou trop long']);
  exit;
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/qs_newsletter_' . preg_replace('/[^a-z0-9.]/i', '_', $ip) . '.json';
$now = time();
$hits = [];
if (is_file($rateFile)) {
  $decoded = json_decode(@file_get_contents($rateFile), true);
  if (is_array($decoded)) $hits = $decoded;
}
$hits = array_values(array_filter($hits, function ($t) use ($now) { return $now - intval($t) < 3600; }));
if (count($hits) >= 8) {
  http_response_code(429);
  echo json_encode(['ok' => false, 'error' => 'Trop d’envois depuis cette connexion. Réessayez dans une heure.']);
  exit;
}
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits));

$from = 'info@qualityscreenerpro.com';
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$headers = [
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=UTF-8',
  'From: QualityScreener PRO <' . $from . '>',
  'Reply-To: ' . $from,
  'Bcc: ' . $from,
  'X-Mailer: QualityScreener-Newsletter'
];

$ok = @mail($to, $encodedSubject, $html, implode("\r\n", $headers), '-f' . $from);
if (!$ok) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Hostinger a refusé l’envoi SMTP. Vérifiez que la boîte info@qualityscreenerpro.com est active.']);
  exit;
}

echo json_encode(['ok' => true, 'to' => $to, 'from' => $from, 'bcc' => $from]);
