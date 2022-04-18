'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your coordinates.');
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 16);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.parentElement.classList.toggle('form__row--hidden');
    inputElevation.parentElement.classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    const values = [
      inputDistance.value,
      inputDuration.value,
      inputCadence.parentElement.classList.contains('form__row--hidden')
        ? inputElevation.value
        : inputCadence.value,
    ];
    let marker;
    if (form.classList.contains('hidden')) return;
    else if (values.some(str => str == '')) {
      alert('Please enter all fields');
    } else if (values.some(str => Number.isNaN(Number(str)))) {
      alert('Not all entry fields are numbers.');
    } else if (values.some(str => Number(str) < 0)) {
      alert('Not all entry fields are greater than 0.');
    } else {
      inputCadence.parentElement.classList.contains('form__row--hidden')
        ? (marker = new Cycling(coords))
        : (marker = new Running(coords));
      this.#workouts.push(marker);
      this._renderWorkoutMarker(marker);
      this._renderWorkout(marker);
      this._hideForm();
      this._setLocalStorage();
    }
  }

  _setLocalStorage() {
    window.localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(window.localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.name}-popup`,
        }).setContent(
          `${
            workout.name == 'running' ? '🏃‍♂️ Running' : '🚴‍♀️ Cycling'
          } on ${Intl.DateTimeFormat(navigator.language, {
            month: 'long',
            day: '2-digit',
          }).format(new Date(workout.date))}`
        )
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    const html = `<li class="workout workout--${workout.name}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${
      workout.name[0].toUpperCase() + workout.name.slice(1)
    } on ${Intl.DateTimeFormat(navigator.language, {
      month: 'long',
      day: '2-digit',
    }).format(new Date(workout.date))}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.name == 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${
        workout.name == 'running'
          ? workout.pace.toFixed(2)
          : workout.speed.toFixed(2)
      }</span>
      <span class="workout__unit">${
        workout.name == 'running' ? 'min/km' : 'km/h'
      }</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.name == 'running' ? '🦶🏼' : '⛰'
      }</span>
      <span class="workout__value">${
        workout.name == 'running' ? workout.cadence : workout.elevationGain
      }</span>
      <span class="workout__unit">${
        workout.name == 'running' ? 'spm' : 'm'
      }</span>
    </div>
  </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const selectedWorkout = this.#workouts.find(
      el => el.id == workoutEl.dataset.id
    );
    this.#map.setView(selectedWorkout.coords, 16, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords) {
    this.distance = +inputDistance.value; // km
    this.duration = +inputDuration.value; // min
    this.coords = coords; // [lat, lng]
  }
}

class Running extends Workout {
  name = 'running';

  constructor(coords) {
    super(coords);
    this.cadence = +inputCadence.value;
    this.pace = this._calcPace();
  }

  _calcPace() {
    return this.duration / this.distance;
  }
}

class Cycling extends Workout {
  name = 'cycling';

  constructor(coords) {
    super(coords);
    this.elevationGain = +inputElevation.value;
    this.speed = this._calcSpeed();
  }

  _calcSpeed() {
    return this.distance / (this.duration / 60);
  }
}
const app = new App();
