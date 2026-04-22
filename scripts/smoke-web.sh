#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://pagewalker.org}"

check_status() {
  local url="$1"
  local expected="$2"
  local got
  got="$(curl -s -o /dev/null -w "%{http_code}" "$url")"
  if [[ "$got" != "$expected" ]]; then
    echo "FAIL: $url expected $expected got $got"
    return 1
  fi
  echo "OK: $url ($got)"
}

echo "Running smoke checks against: $BASE_URL"
check_status "$BASE_URL/" "200"
check_status "$BASE_URL/discover" "200"
check_status "$BASE_URL/profile" "200"
check_status "$BASE_URL/api/config" "200"
check_status "$BASE_URL/api/books?type=trending&startIndex=0&maxResults=5" "200"
check_status "$BASE_URL/api/books?type=genre&genre=fantasy&startIndex=0&maxResults=5" "200"
check_status "$BASE_URL/api/books?type=search&q=harry%20potter&startIndex=0&maxResults=5" "200"
check_status "$BASE_URL/api/books?type=classics&page=1" "200"

echo "All smoke checks passed."
