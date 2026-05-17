# 🎬 Movie Recommendation Platform

A large-scale recommendation system built with Flask and machine learning, using a dataset of **10,000+ movies** and **106,321 ratings**.

![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.3+-green?style=for-the-badge&logo=flask)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.3+-orange?style=for-the-badge&logo=scikit-learn)
![Dataset](https://img.shields.io/badge/Dataset-10K%2B%20Movies-red?style=for-the-badge)

---

## 🚀 Project Overview

This project is a movie recommendation platform that combines content-based filtering and collaborative filtering in a web application. It serves recommendations from a large movie dataset and includes analytics, model training, and API endpoints.

### Key Capabilities
- **10,000+ movies**
- **106,321 user ratings**
- **Content-based recommendations** using TF-IDF + cosine similarity
- **Collaborative recommendations** using bias-aware SVD
- **Hybrid recommendations** with adjustable content weight
- **Flask web app** with REST API and analytics pages

---

## 📋 Features

- Personalized recommendations for users and movies
- Search and discovery by title and genre
- Analytics dashboard with dataset and model insights
- Model evaluation reporting RMSE, MAE, and accuracy
- Saved models in `models/` for fast reuse

---

## 🛠️ Technology Stack

- Python 3.8+
- Flask
- scikit-learn
- pandas
- NumPy
- SciPy
- Matplotlib / Seaborn
- Bootstrap 5

---

## 📁 Project Structure

```
Movie-Recommender/
├── app.py
├── model_training.py
├── generate_large_dataset.py
├── requirements.txt
├── README.md
├── dataset/
│   ├── movies.csv
│   └── ratings.csv
├── models/
│   ├── content_based_model.pkl
│   ├── collaborative_model.pkl
│   └── movies_data.csv
├── database/
│   └── setup.sql
├── static/
│   ├── css/style.css
│   └── js/script.js
└── templates/
    ├── index.html
    ├── recommendations.html
    ├── analytics.html
    ├── about.html
    └── base.html
```

---

## 🚦 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- `pip`
- Recommended: 4GB+ RAM

### Install Dependencies
```bash
cd "C:/Users/Admin/Downloads/Movie-Recommender/Movie-Recommender"
pip install -r requirements.txt
```

If you use `uv`:
```bash
uv pip install -r requirements.txt
```

### Train Models
```bash
python model_training.py
```

### Run the App
```bash
python app.py
```

Open in your browser:
- `http://127.0.0.1:5000`
- `http://127.0.0.1:5000/recommendations`
- `http://127.0.0.1:5000/analytics`
- `http://127.0.0.1:5000/about`

---

## 📊 Current Model Performance

Latest trained metrics:
- **RMSE**: `1.0105`
- **MAE**: `0.8047`
- **Overall Accuracy**: `83.91%`
- **Within ±1 star**: `68.20%`
- **Within ±0.5 star**: `38.42%`

---

## 🔍 Recommendation Methods

### Content-Based Filtering
- Uses TF-IDF on movie titles and genres
- Measures similarity via cosine similarity
- Recommends movies with similar content

### Collaborative Filtering
- Builds a user-item rating matrix
- Uses Truncated SVD to find latent patterns
- Adds user and movie bias correction for accuracy

### Hybrid Recommendations
- Combines content and collaborative scores
- Supports flexible content weight adjustment

---

## 🔌 API Endpoints

### Movies
```http
GET /api/movies
GET /api/movie/<id>
GET /api/search?q=<query>
```

### Recommendations
```http
GET /api/recommend/content/<movie_id>?n=<count>
GET /api/recommend/collaborative/<user_id>?n=<count>
GET /api/recommend/hybrid/<user_id>?n=<count>&content_weight=<0-1>
```

### Analytics
```http
GET /api/analytics/stats
GET /api/models/status
GET /api/popular?n=<count>
```

### Example Calls
```bash
curl "http://127.0.0.1:5000/api/recommend/content/1?n=5"
curl "http://127.0.0.1:5000/api/recommend/collaborative/1?n=5"
curl "http://127.0.0.1:5000/api/recommend/hybrid/1?n=5&content_weight=0.7"
curl "http://127.0.0.1:5000/api/search?q=Action"
curl "http://127.0.0.1:5000/api/analytics/stats"
```

---

## 🛠️ Customization

### Change Model Settings
Edit `model_training.py` to adjust:
- SVD `n_components`
- TF-IDF settings
- rating normalization and bias smoothing

### Change App Settings
Edit `app.py` to configure:
- host and port
- debug mode
- API behavior

---

## 🐛 Troubleshooting

### Common Issues

#### Missing Models
If the app reports missing models, run:
```bash
python model_training.py
```

#### Missing Packages
```bash
pip install -r requirements.txt
```

#### Port Already in Use
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

#### Slow Collaborative Recommendations
This can happen for SVD-based predictions on large data. Use caching or reduce `n_components`.

---

## 🔮 Future Improvements

- Add user authentication and profiles
- Add real user feedback and retraining
- Add advanced NLP for movie descriptions
- Add neural recommendation models
- Add Redis caching for production

---

## 📄 License
MIT License
