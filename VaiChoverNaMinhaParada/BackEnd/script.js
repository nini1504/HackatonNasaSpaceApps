document.addEventListener('DOMContentLoaded', function () {

    // Configuração dos botões de unidade de temperatura
    const unitButtons = document.querySelectorAll('.unit-btn');
    unitButtons.forEach(button => {
        button.addEventListener('click', function () {
            unitButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // O botão 'Get Forecast' chama a função getWeather (definido no HTML)
    // O botão 'Validate' chama a função getValidate (definido no HTML)
    
    // NOTA: O botão 'search-btn' não existe no seu HTML atual, 
    // a chamada é feita diretamente no HTML: <button onclick="getWeather()" id="get-forecast-btn">
    // Portanto, o código abaixo pode ser removido ou ignorado se você não adicionar esse botão.
    /*
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', getWeather);
    }
    */
});

// REMOVENDO FUNÇÃO DE SIMULAÇÃO: simulateNASAPrediction()

// --> 1. FUNÇÕES DE CONVERSÃO E ÍCONES (INTACTAS)

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

// --> 2. NOVAS FUNÇÕES DE LÓGICA (MODIFICADAS)

// NOVA FUNÇÃO: Lógica para determinar a condição com base nos dados REAIS
function getWeatherCondition(tempCelsius, rainChance) {
    // Lógica para dia/noite simples (apenas para exibição do ícone)
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;

    if (rainChance > 60) return 'stormy';
    if (rainChance > 30) return 'rainy';
    
    if (tempCelsius > 30) return 'sunny';
    if (tempCelsius > 25) return 'partly-cloudy';
    
    if (isNight && tempCelsius > 15) return 'clear-night';

    if (tempCelsius > 10) return 'cloudy';
    if (tempCelsius > 5) return 'rainy';
    if (tempCelsius <= 0) return 'snowy';
    return 'partly-cloudy';
}

// NOVA FUNÇÃO: Simulação horária baseada na temperatura real (para preencher o gráfico)
function generateHourlySimulatedData(baseTempCelsius, tempUnit) {
    const hourlyData = [];
    const now = new Date();
    // Encontra o próximo múltiplo de 3 para começar a simulação (0, 3, 6, 9, etc.)
    const currentHourMultiple = Math.floor(now.getHours() / 3) * 3;
    
    for (let i = 0; i < 8; i++) {
        const hour = (currentHourMultiple + i * 3) % 24;
        
        // Variação sinusoidal para simular o ciclo dia/noite
        const tempVariation = Math.sin(i * Math.PI / 4) * 5; 
        // Pequena variação para mostrar mudança
        const tempCelsius = baseTempCelsius + tempVariation - 3; 

        // Lógica de condição simples para o forecast horário simulado (rainChance=0)
        const condition = getWeatherCondition(tempCelsius, 0); 

        hourlyData.push({
            time: hour,
            tempCelsius: Math.round(tempCelsius * 10) / 10,
            condition: condition
        });
    }
    
    // Converte para a unidade solicitada
    return hourlyData.map(item => ({
        time: item.time,
        temperature: convertTemperature(item.tempCelsius, tempUnit),
        condition: item.condition
    }));
}


// IMPLEMENTAÇÃO DA FUNÇÃO getWeather() - CHAMA A API
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
    
    // Limpar resultados
    document.getElementById('temp-div').innerHTML = '';
    document.getElementById('weather-info').innerHTML = 'Fetching NASA data...';
    document.getElementById('weather-icon').innerHTML = '';
    document.getElementById('hourly-items').innerHTML = '';


    try {
        // CHAMA O ENDPOINT FLASK NA PORTA 5000
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

        // Dados reais do backend
        const currentTempCelsius = data.Temperatura_C; 
        const rainChance = data.Chance_Chuva;
        
        // Determinar a condição e gerar a simulação horária
        const currentCondition = getWeatherCondition(currentTempCelsius, rainChance);
        const hourlySimulatedData = generateHourlySimulatedData(currentTempCelsius, tempUnit); 
        
        const weatherData = {
            current: {
                // Converte a temperatura Celsius (recebida do backend) para a unidade escolhida
                temperature: convertTemperature(currentTempCelsius, tempUnit), 
                condition: currentCondition
            },
            hourly: hourlySimulatedData 
        };
        
        displayWeather(weatherData, tempUnit);
        
        // Adiciona informações extras do backend na área de descrição
        document.getElementById('weather-info').innerHTML += 
            `<p>Relative Humidity: ${data.Umidade_Relativa}%</p>
             <p>Rain Chance: ${data.Chance_Chuva.toFixed(2)}%</p>
             <p>Wind Speed: ${data.Velocidade_Vento.toFixed(2)} m/s</p>`;


    } catch (error) {
        alert('An error occurred while connecting to the forecast server: ' + error);
        document.getElementById('weather-info').innerHTML = 'Connection Error: Cannot reach API server.';
    } finally {
        getForecastBtn.textContent = originalBtnText;
        getForecastBtn.disabled = false;
    }
}


// FUNÇÕES DE EXIBIÇÃO (INTACTAS)

function displayWeather(data, unit) {
    const tempDivInfo = document.getElementById('temp-div');
    const weatherInfoDiv = document.getElementById('weather-info');
    const weatherIcon = document.getElementById('weather-icon');
    const hourlyItemsDiv = document.getElementById('hourly-items');


    weatherInfoDiv.innerHTML = '';
    hourlyItemsDiv.innerHTML = '';
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
    // O weatherInfoDiv é atualizado no final de getWeather() para incluir dados da API
    weatherInfoDiv.innerHTML = weatherHtml; 

    weatherIcon.innerHTML = `<div class="weather-emoji">${icon}</div>`;

    displayHourlyForecast(data.hourly, unit);
}

function displayHourlyForecast(hourlyData, unit) {
    const hourlyItemsDiv = document.getElementById('hourly-items');
    const symbol = getTemperatureSymbol(unit);
    
    // Limpa antes de adicionar o novo forecast
    hourlyItemsDiv.innerHTML = ''; 

    hourlyData.forEach(item => {
        const time = `${item.time}:00`;
        const temperature = item.temperature;
        const icon = getWeatherIcon(item.condition);

        const hourlyItemHtml = `
                        <div class="hourly-item">
                            <div class="time">${time}</div>
                            <div class="icon">${icon}</div>
                            <div class="temp">${temperature}${symbol}</div>
                        </div>
                    `;

        hourlyItemsDiv.innerHTML += hourlyItemHtml;
    });
}


// --> 3. LÓGICA DO MAPA E VALIDAÇÃO DE ENDEREÇO (MODIFICADA PARA SALVAR COORDENADAS)

const initialCoords = [-14.235, -51.925];
const initialZoom = 4;

// Variáveis globais para armazenar as coordenadas selecionadas
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

    // Sua API Key do Google Address Validation (Deve ser mantida fora de repositórios públicos)
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
    
    // CHAVE: SALVAR COORDENADAS GLOBAIS
    window.selectedLatitude = lat; 
    window.selectedLongitude = lng;
    
    validationResultElement.textContent = `Location: ${displayName}\nLatitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`;
}