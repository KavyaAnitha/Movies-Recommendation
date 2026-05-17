// Custom JavaScript for Movie Recommendation Platform

// Global variables
let currentRecommendations = [];
let isLoading = false;

// Initialize when DOM is ready
$(document).ready(function() {
    initializeApp();
    setupEventListeners();
    setupTooltips();
});

function initializeApp() {
    console.log('Movie Recommendation Platform initialized');
    
    // Check if models are loaded
    checkModelStatus();
    
    // Initialize any components
    initializeComponents();
}

function setupEventListeners() {
    // Search functionality
    $('#searchInput').on('input', debounce(handleSearch, 300));
    
    // Recommendation type tabs
    $('#recommendationTabs button').on('shown.bs.tab', function(e) {
        const target = $(e.target).attr('data-bs-target');
        console.log('Switched to tab:', target);
    });
    
    // Form submissions
    $('.recommendation-form').on('submit', function(e) {
        e.preventDefault();
        handleRecommendationRequest($(this));
    });
    
    // Movie selection
    $(document).on('click', '.movie-select', function() {
        const movieId = $(this).data('movie-id');
        selectMovie(movieId);
    });
    
    // Weight slider
    $('#contentWeight').on('input', function() {
        const value = $(this).val();
        $('#weightValue').text(value);
        updateWeightDisplay(value);
    });
}

function setupTooltips() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initializeComponents() {
    // Initialize sliders, dropdowns, etc.
    $('.form-range').each(function() {
        $(this).on('input', function() {
            const value = $(this).val();
            const target = $(this).data('target');
            if (target) {
                $(target).text(value);
            }
        });
    });
}

// API Functions
function checkModelStatus() {
    return $.get('/api/models/status')
        .done(function(data) {
            updateModelStatusDisplay(data);
            return data;
        })
        .fail(function() {
            console.error('Failed to check model status');
            return null;
        });
}

function updateModelStatusDisplay(status) {
    const indicators = {
        'content_based': status.content_based_trained,
        'collaborative': status.collaborative_trained,
        'data_loaded': status.data_loaded
    };
    
    Object.keys(indicators).forEach(key => {
        const element = $(`#${key}_status`);
        if (element.length) {
            const isOnline = indicators[key];
            element.removeClass('online offline warning')
                   .addClass(isOnline ? 'online' : 'offline')
                   .attr('title', isOnline ? 'Ready' : 'Not Ready');
        }
    });
}

// Search functionality
function handleSearch(event) {
    const query = $(event.target).val().trim();
    
    if (query.length < 2) {
        hideSearchResults();
        return;
    }
    
    searchMovies(query);
}

function searchMovies(query) {
    if (isLoading) return;
    
    isLoading = true;
    showSearchLoading();
    
    $.get('/api/search', { q: query })
        .done(function(data) {
            displaySearchResults(data);
        })
        .fail(function() {
            showSearchError();
        })
        .always(function() {
            isLoading = false;
        });
}

function displaySearchResults(movies) {
    const container = $('#searchResults');
    
    if (!movies || movies.length === 0) {
        container.html('<div class="search-result text-muted">No movies found</div>');
        return;
    }
    
    let html = '';
    movies.forEach(function(movie) {
        html += `
            <div class="search-result movie-select" data-movie-id="${movie.movieId}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${movie.title}</strong>
                        <br>
                        <small class="text-muted">${movie.genres}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="selectMovie(${movie.movieId})">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.html(html);
    container.show();
}

function showSearchLoading() {
    $('#searchResults').html('<div class="search-result text-center"><div class="spinner-border spinner-border-sm"></div> Searching...</div>').show();
}

function showSearchError() {
    $('#searchResults').html('<div class="search-result text-danger">Error loading results</div>').show();
}

function hideSearchResults() {
    $('#searchResults').hide();
}

// Recommendation functions
function handleRecommendationRequest(form) {
    const formData = new FormData(form[0]);
    const params = Object.fromEntries(formData);
    
    // Show loading state
    showRecommendationLoading(form);
    
    // Make API call based on recommendation type
    const recommendationType = form.data('type');
    
    switch(recommendationType) {
        case 'content':
            getContentRecommendations(params.movieId, params.count);
            break;
        case 'collaborative':
            getCollaborativeRecommendations(params.userId, params.count);
            break;
        case 'hybrid':
            getHybridRecommendations(params.userId, params.count, params.contentWeight);
            break;
        default:
            console.error('Unknown recommendation type:', recommendationType);
    }
}

function getContentRecommendations(movieId, count = 10) {
    if (!movieId) {
        showError('Please select a movie');
        return;
    }
    
    showLoadingState('#contentRecommendations');
    
    $.get(`/api/recommend/content/${movieId}`, { n: count })
        .done(function(data) {
            displayRecommendations(data, 'contentRecommendations', 'content');
        })
        .fail(function() {
            showError('Failed to load content-based recommendations', '#contentRecommendations');
        });
}

function getCollaborativeRecommendations(userId, count = 10) {
    if (!userId) {
        showError('Please enter a user ID');
        return;
    }
    
    showLoadingState('#collaborativeRecommendations');
    
    $.get(`/api/recommend/collaborative/${userId}`, { n: count })
        .done(function(data) {
            displayRecommendations(data, 'collaborativeRecommendations', 'collaborative');
        })
        .fail(function() {
            showError('Failed to load collaborative recommendations', '#collaborativeRecommendations');
        });
}

function getHybridRecommendations(userId, count = 10, contentWeight = 0.5) {
    if (!userId) {
        showError('Please enter a user ID');
        return;
    }
    
    showLoadingState('#hybridRecommendations');
    
    $.get(`/api/recommend/hybrid/${userId}`, { 
        n: count, 
        content_weight: contentWeight 
    })
        .done(function(data) {
            displayHybridRecommendations(data, 'hybridRecommendations');
        })
        .fail(function() {
            showError('Failed to load hybrid recommendations', '#hybridRecommendations');
        });
}

function displayRecommendations(movies, containerId, type) {
    const container = $(`#${containerId}`);
    
    if (!movies || movies.length === 0) {
        container.html('<p class="text-muted text-center">No recommendations found</p>');
        return;
    }
    
    currentRecommendations = movies;
    
    let html = '<div class="recommendations-grid">';
    movies.forEach(function(movie, index) {
        html += createRecommendationCard(movie, index + 1, type);
    });
    html += '</div>';
    
    container.html(html);
    container.addClass('fade-in');
}

function displayHybridRecommendations(movies, containerId) {
    const container = $(`#${containerId}`);
    
    if (!movies || movies.length === 0) {
        container.html('<p class="text-muted text-center">No recommendations found</p>');
        return;
    }
    
    currentRecommendations = movies;
    
    let html = '<div class="hybrid-recommendations">';
    movies.forEach(function(movie, index) {
        html += createHybridRecommendationCard(movie, index + 1);
    });
    html += '</div>';
    
    container.html(html);
    container.addClass('fade-in');
}

function createRecommendationCard(movie, rank, type) {
    const scoreClass = getScoreClass(movie.score || 0.5);
    
    return `
        <div class="recommendation-card card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h6 class="card-title mb-1">
                            <span class="badge bg-primary me-2">${rank}</span>
                            ${movie.title}
                        </h6>
                        <p class="card-text">
                            <small class="text-muted">${movie.genres}</small>
                        </p>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="score-display ${scoreClass}">
                            ${type === 'content' ? 'Similarity' : 'Rating'}: ${(movie.score * 100).toFixed(1)}%
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="selectMovie(${movie.movieId})">
                            <i class="fas fa-star me-1"></i>Similar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createHybridRecommendationCard(movie, rank) {
    const contentScore = (movie.content_score * 100).toFixed(1);
    const collabScore = (movie.collab_score * 100).toFixed(1);
    const hybridScore = (movie.hybrid_score * 100).toFixed(1);
    
    return `
        <div class="recommendation-card card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <h6 class="card-title mb-1">
                            <span class="badge bg-warning me-2">${rank}</span>
                            ${movie.title}
                        </h6>
                        <p class="card-text">
                            <small class="text-muted">${movie.genres}</small>
                        </p>
                    </div>
                    <div class="col-md-6">
                        <div class="row text-center">
                            <div class="col-4">
                                <small class="text-muted d-block">Content</small>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-info" style="width: ${contentScore}%"></div>
                                </div>
                                <small>${contentScore}%</small>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Collab</small>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-success" style="width: ${collabScore}%"></div>
                                </div>
                                <small>${collabScore}%</small>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Hybrid</small>
                                <strong>${hybridScore}%</strong>
                            </div>
                        </div>
                        <div class="text-center mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="selectMovie(${movie.movieId})">
                                <i class="fas fa-star me-1"></i>Similar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Utility functions
function selectMovie(movieId) {
    // Switch to content-based tab
    $('#content-tab').click();
    
    // Set the movie in the dropdown
    $('#movieSelect').val(movieId);
    
    // Get recommendations for this movie
    getContentRecommendations(movieId, 10);
    
    // Scroll to recommendations
    $('#content')[0].scrollIntoView({ behavior: 'smooth' });
}

function showLoadingState(containerId) {
    const container = $(containerId);
    container.html('<div class="text-center py-4"><div class="spinner-border"></div><p class="mt-2">Loading recommendations...</p></div>');
}

function showError(message, containerId = null) {
    const errorHtml = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>${message}</div>`;
    
    if (containerId) {
        $(containerId).html(errorHtml);
    } else {
        // Show as a toast or global error
        showNotification(message, 'error');
    }
}

function showNotification(message, type = 'info') {
    const alertClass = type === 'error' ? 'alert-danger' : 
                      type === 'success' ? 'alert-success' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    const notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 1050; max-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    
    $('body').append(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(function() {
        notification.fadeOut(function() {
            $(this).remove();
        });
    }, 5000);
}

function getScoreClass(score) {
    if (score >= 0.7) return 'score-high';
    if (score >= 0.4) return 'score-medium';
    return 'score-low';
}

function updateWeightDisplay(value) {
    const percentage = Math.round(value * 100);
    $('#weightDisplay').text(`${percentage}% Content`);
    
    // Update slider color based on value
    const slider = $('#contentWeight');
    if (value > 0.7) {
        slider.addClass('bg-info').removeClass('bg-success bg-warning');
    } else if (value > 0.3) {
        slider.addClass('bg-success').removeClass('bg-info bg-warning');
    } else {
        slider.addClass('bg-warning').removeClass('bg-info bg-success');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Analytics functions
function loadAnalyticsData() {
    Promise.all([
        $.get('/api/analytics/stats'),
        $.get('/api/models/status')
    ])
    .then(function([stats, status]) {
        updateAnalyticsDisplay(stats);
        updateModelStatusDisplay(status);
    })
    .catch(function() {
        console.error('Failed to load analytics data');
    });
}

function updateAnalyticsDisplay(stats) {
    // Update statistics cards with animation
    animateValue('#totalMovies', stats.total_movies || 0);
    animateValue('#totalUsers', stats.total_users || 0);
    animateValue('#totalRatings', stats.total_ratings || 0);
    animateValue('#avgRating', stats.avg_rating || 0, true);
}

function animateValue(selector, value, isFloat = false) {
    const element = $(selector);
    const duration = 1000;
    const start = 0;
    const increment = value / (duration / 16);
    let current = start;
    
    const timer = setInterval(function() {
        current += increment;
        if (current >= value) {
            current = value;
            clearInterval(timer);
        }
        
        if (isFloat) {
            element.text(current.toFixed(2));
        } else {
            element.text(Math.floor(current));
        }
    }, 16);
}

// Export functions for global access
window.MovieRecommendationApp = {
    selectMovie: selectMovie,
    getContentRecommendations: getContentRecommendations,
    getCollaborativeRecommendations: getCollaborativeRecommendations,
    getHybridRecommendations: getHybridRecommendations,
    searchMovies: searchMovies,
    loadAnalyticsData: loadAnalyticsData
};
