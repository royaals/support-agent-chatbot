# CDP Documentation Assistant

This application provides a user-friendly interface to search and retrieve information from the documentation of various Customer Data Platforms (CDPs). It uses a combination of web scraping and Elasticsearch to efficiently retrieve relevant content from the official documentation.

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```
3. replace the `ELASTICSEARCH_URL` and `ELASTICSEARCH_API_KEY` with your own values in the `.env` file

4. Start the Flask server:
   ```
   python app.py
   ```

The Flask server will run on http://localhost:5000

### Frontend Setup

1. In a new terminal, navigate to the project root directory

2. Install the required npm packages:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

The React application will run on the Vite development server.

## Features

- Search documentation from four major CDPs: Segment, mParticle, Lytics, and Zeotap
- Get relevant snippets and links to official documentation
- User-friendly interface with real-time feedback

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React
- **Backend**: Flask, Elasticsearch
- **Data Processing**: BeautifulSoup for web scraping

## API Endpoints

- `POST /query` - Search the documentation with parameters:
  - `query`: The search query
  - `cdp`: The CDP platform to search (segment, mparticle, lytics, zeotap)

- `GET /health` - Health check endpoint