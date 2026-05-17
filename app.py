"""
Movie Recommendation Platform Flask Application
Main web application with UI and API endpoints
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import pandas as pd
import numpy as np
from model_training import MovieRecommender
import os
import json
from datetime import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO

app = Flask(__name__)
app.secret_key = 'movie_recommendation_secret_key'

# Initialize recommender
recommender = MovieRecommender()

@app.route('/')
def index():
    """Home page"""
    return render_template('index.html')

@app.route('/recommendations')
def recommendations():
    """Recommendations page"""
    return render_template('recommendations.html')

@app.route('/analytics')
def analytics():
    """Analytics page"""
    return render_template('analytics.html')

@app.route('/about')
def about():
    """About page"""
    return render_template('about.html')

# API Endpoints
@app.route('/api/movies')
def get_movies():
    """Get all movies"""
    if recommender.movies_df is not None:
        movies = recommender.movies_df.to_dict('records')
        return jsonify(movies)
    return jsonify({'error': 'No movies data available'}), 404

@app.route('/api/movie/<int:movie_id>')
def get_movie(movie_id):
    """Get specific movie details"""
    if recommender.movies_df is not None:
        movie = recommender.movies_df[recommender.movies_df['movieId'] == movie_id]
        if not movie.empty:
            return jsonify(movie.to_dict('records')[0])
    return jsonify({'error': 'Movie not found'}), 404

@app.route('/api/recommend/content/<int:movie_id>')
def get_content_recommendations(movie_id):
    """Get content-based recommendations for a movie"""
    n_recommendations = request.args.get('n', default=10, type=int)
    
    if recommender.tfidf_matrix is None:
        return jsonify({'error': 'Content-based model not trained'}), 400
    
    recommendations = recommender.get_content_based_recommendations(movie_id, n_recommendations)
    if recommendations is not None and not recommendations.empty:
        return jsonify(recommendations.to_dict('records'))
    return jsonify({'error': 'No recommendations found'}), 404

@app.route('/api/recommend/collaborative/<int:user_id>')
def get_collaborative_recommendations(user_id):
    """Get collaborative filtering recommendations for a user"""
    n_recommendations = request.args.get('n', default=10, type=int)
    
    if recommender.svd_model is None:
        return jsonify({'error': 'Collaborative filtering model not trained'}), 400
    
    recommendations = recommender.get_collaborative_recommendations(user_id, n_recommendations)
    if recommendations is not None and not recommendations.empty:
        return jsonify(recommendations.to_dict('records'))
    return jsonify({'error': 'No recommendations found'}), 404

@app.route('/api/recommend/hybrid/<int:user_id>')
def get_hybrid_recommendations(user_id):
    """Get hybrid recommendations combining both approaches"""
    n_recommendations = request.args.get('n', default=10, type=int)
    content_weight = request.args.get('content_weight', default=0.5, type=float)
    
    if recommender.svd_model is None or recommender.tfidf_matrix is None:
        return jsonify({'error': 'Models not trained'}), 400
    
    # Get collaborative recommendations
    collab_recs = recommender.get_collaborative_recommendations(user_id, n_recommendations * 2)
    
    # Get user's highly rated movies for content-based recommendations
    if recommender.ratings_df is not None:
        user_ratings = recommender.ratings_df[recommender.ratings_df['userId'] == user_id]
        if not user_ratings.empty:
            # Get user's highest rated movie
            top_movie = user_ratings.loc[user_ratings['rating'].idxmax(), 'movieId']
            content_recs = recommender.get_content_based_recommendations(top_movie, n_recommendations * 2)
        else:
            content_recs = recommender.get_popular_movies(n_recommendations * 2)
    else:
        content_recs = recommender.get_popular_movies(n_recommendations * 2)
    
    # Combine recommendations
    hybrid_scores = {}
    
    # Add collaborative filtering scores
    if collab_recs is not None and not collab_recs.empty:
        for idx, movie in collab_recs.iterrows():
            movie_id = movie['movieId']
            hybrid_scores[movie_id] = {
                'movie': movie.to_dict(),
                'collab_score': 1.0 - (collab_recs.index.get_loc(idx) / len(collab_recs)),
                'content_score': 0.0
            }
    
    # Add content-based scores
    if content_recs is not None and not content_recs.empty:
        for idx, movie in content_recs.iterrows():
            movie_id = movie['movieId']
            if movie_id in hybrid_scores:
                hybrid_scores[movie_id]['content_score'] = 1.0 - (content_recs.index.get_loc(idx) / len(content_recs))
            else:
                hybrid_scores[movie_id] = {
                    'movie': movie.to_dict(),
                    'collab_score': 0.0,
                    'content_score': 1.0 - (content_recs.index.get_loc(idx) / len(content_recs))
                }
    
    # Calculate hybrid scores
    final_recommendations = []
    for movie_id, scores in hybrid_scores.items():
        hybrid_score = (content_weight * scores['content_score'] + 
                       (1 - content_weight) * scores['collab_score'])
        final_recommendations.append({
            **scores['movie'],
            'hybrid_score': hybrid_score,
            'collab_score': scores['collab_score'],
            'content_score': scores['content_score']
        })
    
    # Sort by hybrid score and return top recommendations
    final_recommendations.sort(key=lambda x: x['hybrid_score'], reverse=True)
    
    return jsonify(final_recommendations[:n_recommendations])

@app.route('/api/popular')
def get_popular_movies():
    """Get popular movies"""
    n_movies = request.args.get('n', default=10, type=int)
    
    if recommender.movies_df is not None:
        popular = recommender.get_popular_movies(n_movies)
        if popular is not None and not popular.empty:
            return jsonify(popular.to_dict('records'))
    return jsonify({'error': 'No movies data available'}), 404

@app.route('/api/search')
def search_movies():
    """Search movies by title or genre"""
    query = request.args.get('q', '').lower()
    
    if recommender.movies_df is not None and query:
        # Search in title and genre
        mask = (recommender.movies_df['title'].str.lower().str.contains(query, na=False) | 
                recommender.movies_df['genres'].str.lower().str.contains(query, na=False))
        
        results = recommender.movies_df[mask]
        return jsonify(results.to_dict('records'))
    
    return jsonify([])

@app.route('/api/analytics/stats')
def get_analytics_stats():
    """Get analytics statistics"""
    if recommender.movies_df is None or recommender.ratings_df is None:
        return jsonify({'error': 'No data available'}), 404
    
    stats = {
        'total_movies': len(recommender.movies_df),
        'total_ratings': len(recommender.ratings_df),
        'total_users': recommender.ratings_df['userId'].nunique(),
        'avg_rating': recommender.ratings_df['rating'].mean(),
        'rating_distribution': recommender.ratings_df['rating'].value_counts().to_dict(),
        'genre_distribution': recommender.movies_df['genres'].str.split('|').explode().value_counts().head(10).to_dict()
    }
    
    return jsonify(stats)

@app.route('/api/analytics/visualizations')
def get_visualizations():
    """Generate and return visualization data"""
    if recommender.movies_df is None or recommender.ratings_df is None:
        return jsonify({'error': 'No data available'}), 404
    
    visualizations = {}
    
    # Rating distribution plot
    plt.figure(figsize=(10, 6))
    recommender.ratings_df['rating'].hist(bins=20, alpha=0.7, color='skyblue')
    plt.title('Rating Distribution')
    plt.xlabel('Rating')
    plt.ylabel('Frequency')
    plt.grid(True, alpha=0.3)
    
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    plot_data = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    visualizations['rating_distribution'] = plot_data
    
    # Genre distribution plot
    plt.figure(figsize=(12, 6))
    genre_counts = recommender.movies_df['genres'].str.split('|').explode().value_counts().head(10)
    genre_counts.plot(kind='bar', color='lightcoral')
    plt.title('Top 10 Genres')
    plt.xlabel('Genre')
    plt.ylabel('Count')
    plt.xticks(rotation=45)
    plt.grid(True, alpha=0.3)
    
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
    buffer.seek(0)
    plot_data = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    visualizations['genre_distribution'] = plot_data
    
    return jsonify(visualizations)

@app.route('/train_models', methods=['GET', 'POST'])
def train_models():
    """Train recommendation models"""
    if request.method == 'POST':
        try:
            # Load data
            recommender.load_data()
            recommender.preprocess_data()
            
            # Train models
            recommender.train_content_based_model()
            recommender.train_collaborative_filtering_model()
            
            # Evaluate models
            metrics = recommender.evaluate_models()
            
            # Save models
            recommender.save_models()
            
            flash('Models trained successfully!', 'success')
            return redirect(url_for('analytics'))
            
        except Exception as e:
            flash(f'Error training models: {str(e)}', 'error')
            return redirect(url_for('analytics'))
    
    # Training page is currently not available as a template.
    flash('Model training page is unavailable. Please use the analytics page.', 'warning')
    return redirect(url_for('analytics'))

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/api/models/status')
def get_models_status():
    """Check if models are trained and loaded"""
    status = {
        'content_based_trained': recommender.tfidf_matrix is not None,
        'collaborative_trained': recommender.svd_model is not None,
        'data_loaded': recommender.movies_df is not None
    }
    return jsonify(status)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def initialize_app():
    """Initialize the application with models"""
    print("Initializing Movie Recommendation Platform...")
    
    # Try to load existing models
    if not recommender.load_models():
        print("No pre-trained models found. Training new models...")
        try:
            recommender.load_data()
            recommender.preprocess_data()
            recommender.train_content_based_model()
            recommender.train_collaborative_filtering_model()
            recommender.save_models()
            print("Models trained and saved successfully!")
        except Exception as e:
            print(f"Error training models: {e}")
            print("Please visit /train_models to train models manually.")
    else:
        print("Models loaded successfully!")

if __name__ == '__main__':
    initialize_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
