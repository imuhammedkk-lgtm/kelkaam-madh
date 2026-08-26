<?php
// Automatically build a song list from singers/<singer>/audio/.
// Works on normal PHP hosting. No manual JS editing is needed when songs are added.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$root = __DIR__ . DIRECTORY_SEPARATOR . 'singers';
$result = [];
$audioExts = ['mp3', 'wav', 'm4a', 'ogg', 'oga', 'aac', 'flac'];
$imageExts = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

function urlPart($value) {
    return rawurlencode($value);
}

function cleanTitle($filename) {
    $base = pathinfo($filename, PATHINFO_FILENAME);
    // Keep the original human-readable filename, only normalising whitespace.
    return trim(preg_replace('/\\s+/u', ' ', $base));
}

function normalKey($name) {
    $name = pathinfo($name, PATHINFO_FILENAME);
    $name = preg_replace('/\\s+/u', ' ', trim($name));
    // Ignore common image-copy suffixes such as [1], (1), -1.
    $name = preg_replace('/\\s*([\\[\\(]-?\\d+[\\]\\)])\\s*$/u', '', $name);
    return function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
}

if (is_dir($root)) {
    $singerDirs = scandir($root);
    foreach ($singerDirs as $singer) {
        if ($singer === '.' || $singer === '..') continue;
        $singerPath = $root . DIRECTORY_SEPARATOR . $singer;
        $audioDir = $singerPath . DIRECTORY_SEPARATOR . 'audio';
        $imageDir = $singerPath . DIRECTORY_SEPARATOR . 'images';
        if (!is_dir($audioDir)) continue;

        $images = [];
        if (is_dir($imageDir)) {
            foreach (scandir($imageDir) as $img) {
                if ($img === '.' || $img === '..') continue;
                $ext = strtolower(pathinfo($img, PATHINFO_EXTENSION));
                if (in_array($ext, $imageExts, true)) {
                    $images[normalKey($img)] = $img;
                }
            }
        }

        $songs = [];
        foreach (scandir($audioDir) as $audio) {
            if ($audio === '.' || $audio === '..') continue;
            $audioPath = $audioDir . DIRECTORY_SEPARATOR . $audio;
            if (!is_file($audioPath)) continue;
            $ext = strtolower(pathinfo($audio, PATHINFO_EXTENSION));
            if (!in_array($ext, $audioExts, true)) continue;

            $image = $images[normalKey($audio)] ?? null;
            $song = [
                'title' => cleanTitle($audio),
                'url' => 'singers/' . urlPart($singer) . '/audio/' . urlPart($audio),
                'local' => true
            ];
            if ($image) {
                $song['img'] = 'singers/' . urlPart($singer) . '/images/' . urlPart($image);
            }
            $songs[] = $song;
        }

        if ($songs) {
            $result[$singer] = $songs;
        }
    }
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
