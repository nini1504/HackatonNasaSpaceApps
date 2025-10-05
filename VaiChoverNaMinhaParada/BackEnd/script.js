document.addEventListener('DOMContentLoaded', function () {

    // Configuração dos botões de unidade de temperatura
    const unitButtons = document.querySelectorAll('.unit-btn');
    unitButtons.forEach(button => {
        button.addEventListener('click', function () {
            unitButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

function convertTemperature(celsius, unit) {
    switch (unit) {
        case 'fahrenheit':
            return Math.round(((celsius * 9 / 5) + 32) * 10) / 10;
        case 'kelvin':
            return Math.round((celsius + 273.15) * 10) / 10;
        default: // celsius
            return celsius;
    }
}

function getTemperatureSymbol(unit) {
    switch (unit) {
        case 'fahrenheit':
            return '°F';
        case 'kelvin':
            return 'K';
        default: // celsius
            return '°C';
    }
}

function getWeatherIcon(condition) {
    const icons = {
        'sunny': '☀️',
        'partly-cloudy': '⛅',
        'cloudy': '☁️',
        'rainy': '🌧️',
        'snowy': '❄️',
        'stormy': '⛈️',
        'clear-night': '🌙'
    };
    return icons[condition];
}

function getWeatherDescription(condition) {
    const descriptions = {
        'sunny': 'Sunny',
        'partly-cloudy': 'Partly Cloudy',
        'cloudy': 'Cloudy',
        'rainy': 'Rainy',
        'snowy': 'Snowy',
        'stormy': 'Stormy',
        'clear-night': 'Clear Night'
    };
    return descriptions[condition] || 'Unknown';
}
function getWeatherCondition(tempCelsius, rainChance) {
    // Lógica para dia/noite simples (apenas para exibição do ícone)
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;

    if (rainChance > 90) return 'stormy';
    if (rainChance > 70) return 'rainy';
    
    if (tempCelsius > 25) return 'sunny';
    if (tempCelsius > 15) return 'partly-cloudy';
    
    if (isNight && tempCelsius > 20) return 'clear-night';

    if (tempCelsius > 10) return 'cloudy';
    if (tempCelsius <= 0) return 'snowy';
    return 'partly-cloudy';
}
async function getWeather() {
    const dateTime = document.getElementById('datetime').value;
    const activeUnitBtn = document.querySelector('.unit-btn.active');
    const tempUnit = activeUnitBtn ? activeUnitBtn.getAttribute('data-unit') : 'celsius';
    
    // Obter coordenadas globais salvas pela função updateLocationInfo
    const lat = window.selectedLatitude;
    const lon = window.selectedLongitude;

    if (!lat || !lon) {
        alert('Please select a location on the map or validate an address first.');
        return;
    }

    if (!dateTime) {
        alert('Please select a date and time');
        return;
    }

    const getForecastBtn = document.getElementById('get-forecast-btn');
    const originalBtnText = getForecastBtn.textContent;
    getForecastBtn.textContent = 'Loading...';
    getForecastBtn.disabled = true;
    document.getElementById('weather-info').innerHTML = 'Fetching NASA data...';

    try {
        const apiUrl = 'http://127.0.0.1:5000/api/forecast'; 
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: lat,
                longitude: lon,
                datetime: dateTime
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(`Error fetching forecast: ${data.error || response.statusText}`);
            document.getElementById('weather-info').innerHTML = `Error: ${data.error || 'Server error'}`;
            return;
        }
        const currentTempCelsius = data.Temperatura_C; 
        const rainChance = data.Chance_Chuva;
        const currentCondition = getWeatherCondition(currentTempCelsius, rainChance); 
        
        const weatherData = {
            current: {
                temperature: convertTemperature(currentTempCelsius, tempUnit), 
                condition: currentCondition
            },
        };        
        displayWeather(weatherData, tempUnit);
        document.getElementById('weather-info').innerHTML += 
            `<p>Relative Humidity: ${data.Umidade_Relativa}%</p>
             <p>Rain Chance: ${data.Chance_Chuva}%</p>
             <p>Temperatura (C): ${data.Temperatura_C} °C</p>
             <p>Wind Speed: ${data.Velocidade_Vento} m/s</p>
             <p>Precipitation: ${data.Precipitacao_chuva} mm</p>
             <p>Snow Precipitation: ${data.Precipitacao_neve} mm</p>
             <p>Pressure: ${data.Pressao_Atmosferica} hPa</p>`
    } catch (error) {
        alert('An error occurred while connecting to the forecast server: ' + error);
        document.getElementById('weather-info').innerHTML = 'Connection Error: Cannot reach API server.';
    } finally {
        getForecastBtn.textContent = originalBtnText;
        getForecastBtn.disabled = false;
    }
}


function displayWeather(data, unit) {
    const tempDivInfo = document.getElementById('temp-div');
    const weatherInfoDiv = document.getElementById('weather-info');
    const weatherIcon = document.getElementById('weather-icon');

    weatherInfoDiv.innerHTML = '';
    tempDivInfo.innerHTML = '';
    weatherIcon.innerHTML = '';

    const temperature = data.current.temperature;
    const condition = data.current.condition;
    const symbol = getTemperatureSymbol(unit);
    const icon = getWeatherIcon(condition);
    const description = getWeatherDescription(condition);

    const temperatureHTML = `
        <p>${temperature}${symbol}</p>
    `;

    const weatherHtml = `
        <p>${description}</p>
    `;

    tempDivInfo.innerHTML = temperatureHTML;
    weatherInfoDiv.innerHTML = weatherHtml; 

    weatherIcon.innerHTML = `<div class="weather-emoji">${icon}</div>`;

}

const initialCoords = [-14.235, -51.925];
const initialZoom = 4;
window.selectedLatitude = null;
window.selectedLongitude = null;

const validationResultElement = document.getElementById('validation-result');
const addressInputElement = document.getElementById('address-input');

const map = L.map('map').setView(initialCoords, initialZoom);
let marker;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

async function getValidate() {
    const addressLine = addressInputElement.value;

    if (!addressLine) {
        alert('Please enter an address!');
        return;
    }

    validationResultElement.textContent = 'Validating...';
    const apiKey = "AIzaSyBnXhTS2l6_GLpvDWZ0e73rXPtOBpku1Ew"; 
    const apiUrl = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;    
    const requestBody = { "address": { "addressLines": [addressLine] } };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        if (data.result?.geocode?.location) {
            const location = data.result.geocode.location;
            const name = data.result.address.formattedAddress;
            const latitude = location.latitude;
            const longitude = location.longitude;
            
            updateLocationInfo(latitude, longitude, name);

        } else if (data.error) {
            validationResultElement.textContent = `Error: ${data.error.message}`;
        } else {
            validationResultElement.textContent = "Could not find the address. Please try to be more specific.";
        }
    } catch (error) {
        validationResultElement.textContent = 'An error occurred during the request: ' + error;
    }
}

map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    
    updateLocationInfo(lat, lng, "Location selected on map");
});

function updateLocationInfo(lat, lng, displayName = "") {
    const zoomLevel = 17;
    
    map.setView([lat, lng], zoomLevel);

    if (!marker) {
        marker = L.marker([lat, lng]).addTo(map);
    } else {
        marker.setLatLng([lat, lng]);
    }
    window.selectedLatitude = lat; 
    window.selectedLongitude = lng;
    
    validationResultElement.textContent = `Location: ${displayName}\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`;
}