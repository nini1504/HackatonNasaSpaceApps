
        document.addEventListener('DOMContentLoaded', function() {
            
            // Adicionar eventos aos botões de unidade
            const unitButtons = document.querySelectorAll('.unit-btn');
            unitButtons.forEach(button => {
                button.addEventListener('click', function() {
                    unitButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                });
            });
          
            document.getElementById('search-btn').addEventListener('click', getWeather);
        });

        // simulação
        function simulateNASAPrediction(dateTime, tempUnit) {
            
            const baseTemp = 22; 
      
            const hourlyData = [];
            for (let i = 0; i < 8; i++) {
                const hourOffset = i * 3;
                const tempVariation = Math.sin(i * Math.PI / 4) * 8; 
                const tempCelsius = baseTemp + tempVariation;
                const condition = getWeatherCondition(tempCelsius, i);
                
                hourlyData.push({
                    time: hourOffset,
                    tempCelsius: Math.round(tempCelsius * 10) / 10,
                    condition: condition
                });
            }
            

            const requestHour = new Date(dateTime).getHours();
            const closestIndex = Math.floor(requestHour / 3) % 8;
            const currentTempCelsius = hourlyData[closestIndex].tempCelsius;
            const currentCondition = hourlyData[closestIndex].condition;
            
            return {
                current: {
                    temperature: convertTemperature(currentTempCelsius, tempUnit),
                    condition: currentCondition
                },
                hourly: hourlyData.map(item => ({
                    time: item.time,
                    temperature: convertTemperature(item.tempCelsius, tempUnit),
                    condition: item.condition
                }))
            };
        }

        function getWeatherCondition(tempCelsius, hourIndex) {
 
            if (tempCelsius > 30) return 'sunny';
            if (tempCelsius > 25) return 'partly-cloudy';
            if (tempCelsius > 18) {
  
                if (hourIndex >= 5 && hourIndex <= 7) return 'clear-night';
                return 'partly-cloudy';
            }
            if (tempCelsius > 10) return 'cloudy';
            if (tempCelsius > 5) return 'rainy';
            if (tempCelsius > 0) return 'snowy';
            return 'stormy';
        }

        function convertTemperature(celsius, unit) {
            switch(unit) {
                case 'fahrenheit':
                    return Math.round(((celsius * 9/5) + 32) * 10) / 10;
                case 'kelvin':
                    return Math.round((celsius + 273.15) * 10) / 10;
                default: // celsius
                    return celsius;
            }
        }

        function getTemperatureSymbol(unit) {
            switch(unit) {
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

        function getWeather() {
            const dateTime = document.getElementById('datetime').value;
            const activeUnitBtn = document.querySelector('.unit-btn.active');
            const tempUnit = activeUnitBtn ? activeUnitBtn.getAttribute('data-unit') : 'celsius';

            if (!dateTime) {
                alert('Please select a date and time');
                return;
            }

            const weatherData = simulateNASAPrediction(dateTime, tempUnit);

            displayWeather(weatherData, tempUnit);
        }

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
    weatherInfoDiv.innerHTML = weatherHtml;
    
    weatherIcon.innerHTML = `<div class="weather-emoji">${icon}</div>`;

    displayHourlyForecast(data.hourly, unit);
}

        function displayHourlyForecast(hourlyData, unit) {
            const hourlyItemsDiv = document.getElementById('hourly-items');
            const symbol = getTemperatureSymbol(unit);

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
