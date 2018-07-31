const apiKey = require('./apiKey');
const userMoviesService = require('./userMoviesService');
const R = require('ramda');

//createMovieElement:: (Number -> [String]) -> Movie -> String

const createFavoriteMovieTemplate = R.curry(function(ratingsOptions, movie) {
  return `<li><span>${movie.title}</span> 
    <select class="movie-rating" data-movie-id="${movie.id}">
      ${ratingsOptions(movie.rating)}
    </select> 
    <a href="#" class="remove-favorite" data-movie-id="${
      movie.id
    }">Remove</a></li>`;
});

const log = R.curry((prefix, data) => console.log(prefix, data));

//isNotNil :: a -> Boolean
const isNotNil = R.compose(
  R.not,
  R.isNil
);

//hasPoster :: Movie -> Boolean
const hasPoster = R.compose(
  isNotNil,
  R.prop('poster_path')
);

const createMoviesElements = R.compose(
  R.map(
    R.compose(
      createElement,
      R.tap(log('createMovieTemplate')),
      createMovieTemplate
    )
  ),
  R.tap(log('createMovieTemplate')),
  R.filter(hasPoster)
);
//R.tap() //for return because function programing need return value
// function createMoviesElements(createElement, createMovieTemplate, movies) {
//   return movies
//     .filter(hasPoster)
//     .map(createMovieTemplate)
//     .map(createElement);
// }

const createGenresTemplate = R.compose(
  R.join(''),
  R.map(genre => `<li>${genre.name}</li>`)
);

// function createGenresTemplate(genres) {
//   return genres.map(genre => `<li>${genre.name}</li>`).join('');
// }
//reversedRange Number-> Number -> [Number]
const reversedRange = R.compose(
  R.reverse,
  R.range
);

// function ratingsOptions(r) {
//   return [
//     '<option>Rate this movie</option>',
//     ...reversedRange(1, 11).map(
//       i => `<option ${i == r ? 'selected' : ''}>${i}</option>`
//     )
//   ];
// }

const ratingsOptions = r => {
  console.log('afcasd');
  return R.compose(
    R.concat(['<option>Rate this movie</option>']),
    R.tap(log('rate option movie')),
    R.map(i => `<option ${i == r ? 'selected' : ''}>${i}</option>`),
    reversedRange
  )(1, 11);
};

//createElementFromData:: (String ->HtmlElement) -> (Object -> String) -> Object -> HtmlElement
const createElementFromData = R.curry(function(
  createElement,
  createTemplate,
  data
) {
  const movieDetailTemplate = createTemplate(data);
  return createElement(movieDetailTemplate);
});

//createElementFromData:: Object ->HtmlElement

const createMovieNotFoundElement = createElementFromData(
  createElement,
  createMovieNotFoundTemplate
);

//createMovieElement:: Movie ->HtmlElement

const createMovieElement = createElementFromData(
  createElement,
  createMovieDetailsTemplate
);

////createMovieElement:: FavoriteMovie ->HtmlElement

const createFavoriteMovieElement = createElementFromData(
  createElement,
  createFavoriteMovieTemplate(ratingsOptions)
);

function processSearchResponse(response) {
  clearElement('foundMovies');
  const elements =
    response.total_results > 0
      ? createMoviesElements(response.results)
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

$(document).on('click', '.movie img, .movie p', e => {
  e.preventDefault();
  const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${$(e.target)
    .closest('.movie')
    .data('movie-id')}?api_key=${apiKey}`;
  $.getJSON(movieDetailsUrl, response => {
    displayMovieDetails(response);
  });
});

$(document).on('click', 'button[type=submit]', e => {
  e.preventDefault();
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${$(
    '#search'
  ).val()}`;
  $.getJSON(url, response => {
    processSearchResponse(response);
  });
});

$(document).on('click', '.btn-close', function() {
  $(this)
    .closest('div')
    .animate({ opacity: 0 }, 300, function() {
      $(this).remove();
    });
});

$(document).on('click', '.btn-favorite', function() {
  const movieKey = $(this).data('movie-id');
  if (!userMoviesService.loadSavedMovies()[movieKey]) {
    const title = $(this).data('movie-title');
    userMoviesService.addFavorite(movieKey, title);
    displayFavoriteMovies(userMoviesService.loadSavedMovies());
  }
  $(this)
    .closest('div')
    .animate({ opacity: 0 }, 300, function() {
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
  $('.movie-detail').animate(
    {
      opacity: 1
    },
    300
  );
}

function removeElement(className) {
  document.getElementsByClassName(className)[0].remove();
}

function isElementOnPage(className) {
  return document.getElementsByClassName(className).length > 0;
}

window.onload = function() {
  displayFavoriteMovies(userMoviesService.loadSavedMovies());
};
