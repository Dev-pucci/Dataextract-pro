# Dataextract-pro

A web scraping application with scheduled jobs and analytics dashboard.

## Features

- Web scraping for Jumia and Kilimall
- Scheduled scraping jobs with cron implementation
- User authentication and authorization
- Analytics dashboard
- Admin panel for user management
- Job control and monitoring

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy
- Python 3.13
- SQLite database

### Frontend
- React
- Vite
- Tailwind CSS

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
.
├── backend/
│   ├── routers/          # API routes
│   ├── scraper/          # Scraper implementations
│   ├── models.py         # Database models
│   ├── schemas.py        # Pydantic schemas
│   ├── auth.py           # Authentication logic
│   └── main.py           # FastAPI application
└── frontend/
    └── src/
        ├── components/   # React components
        └── App.jsx       # Main application
```
