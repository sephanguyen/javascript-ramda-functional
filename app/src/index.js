const apiKey = require('./apiKey');
const userMoviesService = require('./userMoviesService');
const R = require('ramda');

const createFavoriteMovieTemplate = R.curry(function (ratingsOptions, movie) {
  return `<li><span>${movie.title}</span> 
    <select class="movie-rating" data-movie-id="${movie.id}">
      ${ratingsOptions(movie.rating)}
    </select> 
    <a href="#" class="remove-favorite" data-movie-id="${movie.id}">Remove</a></li>`;
});

function createMoviesElements(createElement, createMovieTemplate, movies) {
  return movies
    .filter(movie => movie.poster_path !== null && movie.poster_path !== undefined)
    .map(createMovieTemplate)
    .map(createElement);
}

const createElementFromData = R.curry(function (createElement, createTemplate, data) {
  const movieDetailTemplate = createTemplate(data);
  return createElement(movieDetailTemplate);
});

const createMovieNotFoundElement = createElementFromData(createElement, createMovieNotFoundTemplate);

const createMovieElement = createElementFromData(createElement, createMovieDetailsTemplate);

const createFavoriteMovieElement = createElementFromData(createElement, 
  createFavoriteMovieTemplate(ratingsOptions));

function processSearchResponse(response) {
  clearElement('foundMovies');
  const elements = response.total_results > 0
    ? createMoviesElements(createElement, createMovieTemplate, response.results, response.total_results)
    : [createMovieNotFoundElement({})];
  elements.forEach(el => appendElementToParent('foundMovies', el));
}

function displayFavoriteMovies(favorites) {
  clearElement('favorites');
  Object.keys(favorites)
    .map(movieId => createFavoriteMovieElement(favorites[movieId]))
    .forEach(e => appendElementToParent('favorites', e));
}

function displayMovieDetails(movie) {
  const element = createMovieElement(movie);
  addElementToBody(isElementOnPage, removeElement, element);
}

function createGenresTemplate(genres) {
  return genres.map(genre => `<li>${genre.name}</li>`)
    .join('');
}

function ratingsOptions(r) {
  return ['<option>Rate this movie</option>', 
    ...R.range(1, 11)
    .reverse()
    .map(i => `<option ${i == r ? 'selected' : ''}>${i}</option>`)];
}

function createMovieTemplate(movie) {
  return `
    <div class="movie" data-movie-id="${movie.id}">
      <p><strong>${movie.original_title}</strong></p>
      <img src="https://image.tmdb.org/t/p/w185${movie.poster_path}" />
      <p>
        <em>Year</em>: ${movie.release_date.substring(0, 4)}
      </p>
    </div>
  `;
} 

function createMovieDetailsTemplate(movie) {
  return `
    <div class="movie-detail" data-movie-id="${movie.id}">
      <p><strong>${movie.original_title}</strong></p>
      <img src="https://image.tmdb.org/t/p/w185${movie.poster_path}" />
      <p>
        <em>Genres:</em>
        <ul>
          ${createGenresTemplate(movie.genres)}
        </ul>
      </p>
      <p>
        <em>Year</em>: ${movie.release_date.substring(0, 4)}
      </p>
      <p>
        <em>Rating:</em> ${movie.vote_average}
      </p>
      <p>
        <button class="btn-close">Close</button> 
        <button class="btn-favorite" 
          data-movie-title="${movie.title}" data-movie-id="${movie.id}">
            Add to favorites
        </button>
      </p>
    </div>
  `;
}

function createMovieNotFoundTemplate() {
  return `<strong>I'm sorry, we could not found the movie you were looking for<strong>`;
}

$(document).on('click', '.movie img, .movie p', (e) => {
  e.preventDefault();
  const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${$(e.target).closest('.movie').data('movie-id')}?api_key=${apiKey}`;
  $.getJSON(movieDetailsUrl, response => {
    displayMovieDetails(response);
  });
});

$(document).on('click', 'button[type=submit]', (e) => {
  e.preventDefault();
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${$("#search").val()}`;
  $.getJSON(url, response => {
    processSearchResponse(response);
  });
});

$(document).on('click', '.btn-close', function() {
  $(this).closest('div').animate({ opacity: 0 }, 300, function() {
    $(this).remove();
  });
});

$(document).on('click', '.btn-favorite', function() {
  const movieKey = $(this).data('movie-id');
  if(!userMoviesService.loadSavedMovies()[movieKey]) {
    const title = $(this).data('movie-title');
    userMoviesService.addFavorite(movieKey, title);
    displayFavoriteMovies(userMoviesService.loadSavedMovies());
  }
  $(this).closest('div').animate({ opacity: 0 }, 300, function() {
    $(this).remove();
  });
});

$(document).on('click', '.remove-favorite', function(e) {
  e.preventDefault();
  const movieId = $(this).data('movie-id');
  userMoviesService.removeFavorite(movieId);
  displayFavoriteMovies(userMoviesService.loadSavedMovies());
});

$(document).on('change', '.movie-rating', function() {
  const movieId = $(this).data('movie-id');
  var rating = $(this).val();
  userMoviesService.rateMovie(movieId, rating);
});

function clearElement(id) {
  document.getElementById(id).innerHTML = '';
}

function appendElementToParent(parent, el) {
  document.getElementById(parent).appendChild(el.content.firstElementChild);
}

function createElement(template) {
  const el = document.createElement('template');
  el.innerHTML = template;
  return el;
}

function addElementToBody(isElementOnPage, removeElement, el) {
  if (isElementOnPage('movie-detail')) {
    removeElement('movie-detail');
  }
  document.body.appendChild(el.content.firstElementChild);
  $('.movie-detail').animate({
    opacity: 1
  }, 300);
}

function removeElement(className) {
  document.getElementsByClassName(className)[0].remove();
}

function isElementOnPage(className) {
  return document.getElementsByClassName(className).length > 0;
}

window.onload = function() {
  displayFavoriteMovies(userMoviesService.loadSavedMovies());
}