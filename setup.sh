#!/bin/bash

echo "🎯 Setting up Real-time Quiz Game..."

# Create virtual environment
python -m venv quiz_env
source quiz_env/bin/activate  # On Windows: quiz_env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations quiz
python manage.py migrate

echo "✅ Setup complete!"
echo ""
echo "To run the application:"
echo "1. Start Redis server: redis-server"
echo "2. Run Django: python manage.py runserver"
echo "3. Visit http://localhost:8000"
echo ""
echo "📝 Create Quiz → Generate QR Code → Players Scan & Join → Real-time Game!"
