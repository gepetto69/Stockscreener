<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$defaultSymbols = [
  'GLW','MSFT','AAPL','GOOGL','NVDA','ASML','JNJ','NVO','UNH','COST',
  'PG','KO','MCD','OR.PA','MC.PA','RMS.PA','V','MA','AIR.PA','SU.PA',
  'SAN.PA','AMZN','META','TSLA'
];

$param = isset($_GET['symbols']) ? strtoupper(trim($_GET['symbols'])) : '';
$symbols = $param === '' ? $defaultSymbols : array_values(array_unique(array_filter(array_map('trim', explode(',', $param)))));
$symbols = array_slice($symbols, 0, 40);

function yahoo_url($symbol) {
  return 'https://query1.finance.yahoo.com/v8/finance/chart/' . rawurlencode($symbol) . '?interval=1d&range=5d';
}

function parse_chart($raw) {
  $payload = json_decode($raw, true);
  if (!is_array($payload)) return null;
  $meta = $payload['chart']['result'][0]['meta'] ?? null;
  if (!$meta) return null;
  $price = isset($meta['regularMarketPrice']) ? floatval($meta['regularMarketPrice']) : 0;
  if ($price <= 0) return null;
  $prev = isset($meta['chartPreviousClose']) ? floatval($meta['chartPreviousClose']) : (isset($meta['previousClose']) ? floatval($meta['previousClose']) : 0);
  return [
    'price' => $price,
    'previousClose' => $prev > 0 ? $prev : null,
    'currency' => $meta['currency'] ?? null,
    'asOf' => gmdate('c')
  ];
}

$quotes = [];

if (function_exists('curl_multi_init')) {
  $mh = curl_multi_init();
  $handles = [];
  foreach ($symbols as $symbol) {
    $ch = curl_init(yahoo_url($symbol));
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_TIMEOUT => 6,
      CURLOPT_CONNECTTIMEOUT => 3,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; QualityScreener/1.0)',
      CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    curl_multi_add_handle($mh, $ch);
    $handles[$symbol] = $ch;
  }
  $running = null;
  do {
    curl_multi_exec($mh, $running);
    curl_multi_select($mh, 0.2);
  } while ($running > 0);

  foreach ($handles as $symbol => $ch) {
    $raw = curl_multi_getcontent($ch);
    $parsed = is_string($raw) ? parse_chart($raw) : null;
    if ($parsed) $quotes[$symbol] = $parsed;
    curl_multi_remove_handle($mh, $ch);
    curl_close($ch);
  }
  curl_multi_close($mh);
} else {
  $ctx = stream_context_create([
    'http' => [
      'method' => 'GET',
      'timeout' => 6,
      'header' => "User-Agent: Mozilla/5.0 (compatible; QualityScreener/1.0)\r\nAccept: application/json\r\n"
    ]
  ]);
  foreach ($symbols as $symbol) {
    $raw = @file_get_contents(yahoo_url($symbol), false, $ctx);
    $parsed = is_string($raw) ? parse_chart($raw) : null;
    if ($parsed) $quotes[$symbol] = $parsed;
  }
}

echo json_encode([
  'status' => 'success',
  'source' => count($quotes) ? 'yahoo-php' : 'none',
  'fetched_at' => gmdate('c'),
  'companies_updated' => count($quotes),
  'quotes' => $quotes
]);
