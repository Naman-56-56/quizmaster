#!/bin/bash

# Django Real-time Multiplayer Quiz Setup Script

echo "🚀 Setting up Django Real-time Multiplayer Quiz Platform..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python -m venv quiz_env

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source quiz_env/bin/activate  # On Windows: quiz_env\Scripts\activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create database and run migrations
echo "🗄️ Setting up database..."
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
echo "👤 Creating superuser (optional)..."
echo "You can skip this by pressing Ctrl+C"
python manage.py createsuperuser

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Create media directories
echo "📂 Creating media directories..."
mkdir -p media/qr_codes

echo "✅ Setup complete!"
echo ""
echo "🎯 To start the development server:"
echo "   python manage.py runserver"
echo ""
echo "🌐 Then visit: http://localhost:8000"
echo ""
echo "📋 Features included:"
echo "   ✓ Real-time WebSocket connections"
echo "   ✓ Timestamp-based scoring system"
echo "   ✓ Dynamic leaderboards"
echo "   ✓ QR code generation"
echo "   ✓ Support for 200+ players"
echo "   ✓ Modern responsive UI"
echo "   ✓ Live game statistics"
echo ""
echo "🔧 For production deployment:"
echo "   - Set DEBUG=False in settings.py"
echo "   - Configure Redis for channel layers"
echo "   - Set up proper database (PostgreSQL recommended)"
echo "   - Configure static file serving"
