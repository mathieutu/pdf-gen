#!/usr/bin/env bash
# Builds the production Docker image and exercises the real container:
# boots it, requests a PDF over HTTP, and checks the response is a valid PDF.
set -euo pipefail

IMAGE_TAG="pdf-gen-test"
CONTAINER_NAME="pdf-gen-test-$$"
PORT="3100"
OUTPUT_FILE="$(mktemp)"

cleanup() {
  docker rm -f "$CONTAINER_NAME" > /dev/null 2>&1 || true
  rm -f "$OUTPUT_FILE"
}
trap cleanup EXIT

echo "Building image..."
docker build -t "$IMAGE_TAG" .

echo "Starting container..."
docker run -d --rm --name "$CONTAINER_NAME" -p "$PORT:3000" "$IMAGE_TAG" > /dev/null

echo "Waiting for the server to be ready..."
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$PORT/api/gen" > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Requesting a PDF generation..."
HTTP_STATUS=$(curl -s -o "$OUTPUT_FILE" -w '%{http_code}' \
  --get "http://localhost:$PORT/api/gen" \
  --data-urlencode 'html=<h1>Hello, Docker!</h1>')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "Expected HTTP 200, got $HTTP_STATUS"
  echo "--- Container logs ---"
  docker logs "$CONTAINER_NAME"
  exit 1
fi

if ! head -c 4 "$OUTPUT_FILE" | grep -q '%PDF'; then
  echo "Response body is not a valid PDF"
  echo "--- Container logs ---"
  docker logs "$CONTAINER_NAME"
  exit 1
fi

echo "PDF generated successfully in Docker."
