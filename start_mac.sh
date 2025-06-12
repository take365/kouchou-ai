echo "Starting Kouchou-AI..."

if ! docker info > /dev/null 2>&1; then
  echo "Docker Desktop is not running."
  echo "Please start Docker Desktop and try again."
  read -p "Press Enter to exit..."
  exit 1
fi

ENV_FILE_ENV=$(grep -E '^ENVIRONMENT=' .env | cut -d= -f2)
if [ "$ENV_FILE_ENV" = "instant" ]; then
  docker compose up -d api client-admin
else
  docker compose up -d
fi

echo ""
echo "Kouchou-AI is now running!"
echo "You can access the following URLs in your browser:"
if [ "$ENV_FILE_ENV" != "instant" ]; then
  echo "  http://localhost:3000 - Report Viewer"
fi
echo "  http://localhost:4000 - Admin Panel"
echo ""
