import os
import netrc
import requests
from requests.auth import HTTPBasicAuth
import io
import pandas as pd
import numpy as np
from datetime import datetime
import platform
import shutil
import math
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from prophet import Prophet

# --- INÍCIO DA SEÇÃO DE CONFIGURAÇÃO ---
signin_url = "https://api.giovanni.earthdata.nasa.gov/signin"
time_series_url = "https://api.giovanni.earthdata.nasa.gov/timeseries"
time_start = "2000-09-01T00:00:00"
time_end = datetime.now().strftime('%Y-%m-%d') + "T23:59:59"
prefix = "GLDAS_NOAH025_3H_2_1"
variables = [
    "_Tair_f_inst", "_Qair_f_inst", "_Rainf_tavg",
    "_Snowf_tavg", "_Wind_f_inst", "_Psurf_f_inst"
]

# --- FUNÇÃO DE AUTENTICAÇÃO CORRIGIDA ---
def get_nasa_token():
    homeDir = os.path.expanduser("~") + os.sep
    urs = 'urs.earthdata.nasa.gov'
    
    nasa_username = 'matheushcp7'
    nasa_password = '27012004Mhcp!!!'

    if not nasa_username or not nasa_password:
        raise ValueError("Credenciais da NASA (NASA_USERNAME, NASA_PASSWORD) não foram encontradas nas variáveis de ambiente.")

    with open(homeDir + '.netrc', 'w') as file:
        file.write(f'machine {urs} login {nasa_username} password {nasa_password}')
    
    with open(homeDir + '.urs_cookies', 'w') as file:
        file.write('')

    with open(homeDir + '.dodsrc', 'w') as file:
        file.write(f'HTTP.COOKIEJAR={homeDir}.urs_cookies\n')
        file.write(f'HTTP.NETRC={homeDir}.netrc')

    if platform.system() == "Windows":
        shutil.copy2(homeDir + '.dodsrc', os.getcwd())

    creds = netrc.netrc().hosts[urs]
    username, _, password = creds
    
    response = requests.get(signin_url, auth=HTTPBasicAuth(username, password), allow_redirects=True)
    response.raise_for_status()
    
    token = response.text.replace('"', '')
    print("Novo token de autenticação da NASA obtido com sucesso.")
    return token

# --- FUNÇÕES DE PROCESSAMENTO DE DADOS ---
def call_time_series(lat, lon, time_start, time_end):
    try:
        token = get_nasa_token()
    except Exception as e:
        print(f"Falha ao obter token de autenticação: {e}")
        error_response = f"Authentication failed: {e}"
        return [error_response] * len(variables)
    responses = []
    for variable in variables:
        query_parameters = {
            "data": prefix + variable, "location": f"[{lat},{lon}]", "time": f"{time_start}/{time_end}"
        }
        headers = {"authorizationtoken": token}
        response = requests.get(time_series_url, params=query_parameters, headers=headers)
        responses.append(response.text)
    return responses

def parse_csv(resp):
    with io.StringIO(resp) as f:
        headers = {}
        f.read(1)
        for i in range(13):
            line = f.readline().strip()
            if not line: continue
            parts = line.split(",", 1)
            if len(parts) == 2:
                key, value = parts
                headers[key] = value.strip()
            else:
                print(f"Aviso: Ignorando linha de cabeçalho mal formatada: '{line}'")
        df = pd.read_csv(
            f, header=1,
            names=("Timestamp", headers.get("param_name", "value")),
            converters={"Timestamp": pd.Timestamp}
        )
    return headers, df

def umidade_relativa(q, T, P):
    e_s = 6.112 * math.exp((17.67 * T) / (T + 243.5)) * 100
    e = (q * P) / (0.622 + q)
    RH = (e / e_s) * 100
    return RH

def estimar_chance_chuva(T, q, P, vento, precip):
    RH = umidade_relativa(q, T, P * 100)
    k1, k2, k3 = 0.5, 0.1, 0.05
    P_chuva = k1*RH + k2*(1013-P) + k3*vento
    return P_chuva

def result_forecast(lat, lon, date, time):
    resp = call_time_series(lat, lon, time_start, time_end)
    dataframes = []
    for r in resp:
        try:
            headers, df = parse_csv(r)
            dataframes.append(df)
        except Exception as e:
            print(f"Falha ao processar CSV para uma variável. Erro: {e}. Resposta recebida: '{r[:200]}'")
            continue
    if not dataframes: raise ValueError("Não foi possível obter ou processar dados da API.")
    result = []
    for df in dataframes:
        if df.shape[0] < 2:
            result.append(pd.Series([np.nan]))
            continue
        df.rename(columns={'Timestamp': 'ds', df.columns[1]: 'y'}, inplace=True)
        df['y'] = pd.to_numeric(df['y'], errors='coerce')
        df.dropna(inplace=True)
        if df.shape[0] < 2:
            result.append(pd.Series([np.nan]))
            continue
        m = Prophet()
        m.fit(df)
        future_df = pd.DataFrame({'ds': [date]})
        forecast = m.predict(future_df)
        predicted_value = forecast.loc[forecast['ds'] == pd.to_datetime(date), 'yhat']
        result.append(predicted_value)
    if not all(isinstance(r, pd.Series) and len(r) > 0 and not r.isnull().all() for r in result) or len(result) < len(variables):
        raise ValueError("A previsão falhou para uma ou mais variáveis, resultando em dados vazios.")
    C = (float(result[0].iloc[0]) - 273.15)
    q = float(result[1].iloc[0])
    precip = float(result[2].iloc[0])
    neve = float(result[3].iloc[0])
    vento = float(result[4].iloc[0])
    P = float(result[5].iloc[0]) / 100
    K = float(result[0].iloc[0])
    RH = umidade_relativa(q, C, P * 100)
    chance_chuva = estimar_chance_chuva(C, q, P, vento, precip)
    return {
        "Temperatura_C": round(C, 2), "Temperatura_F": round(C * 1.8 + 32, 2),
        "Umidade_Relativa": round(RH, 2), "Chance_Chuva": round(chance_chuva, 2),
        "Precipitacao_chuva": round(precip * 3600, 2), "Precipitacao_neve": round(neve * 3600, 2),
        "Velocidade_Vento": round(vento, 2), "Pressao_Atmosferica": round(P, 2),
        "Temperatura_K": round(K, 2)
    }

# --- SEÇÃO DO FLASK APP (VERSÃO FINAL E SIMPLIFICADA) ---
app = Flask(
    __name__,
    static_folder='.', # MODIFICAÇÃO 2: Diz ao Flask que os arquivos estáticos (css, js) estão na mesma pasta
    static_url_path=''
)
CORS(app)

@app.route('/')
def serve_frontend():
    # Esta rota agora encontra o index.html na mesma pasta
    return send_file("index.html")

@app.route('/api/forecast', methods=['POST'])
def forecast_api():
    data = request.json
    lat, lon, timestamp = data.get('latitude'), data.get('longitude'), data.get('datetime')
    if not all([lat, lon, timestamp]):
        return jsonify({"error": "Parâmetros latitude, longitude ou datetime faltando."}), 400
    try:
        dt_obj = datetime.strptime(timestamp, '%Y-%m-%dT%H:%M')
        date = dt_obj.strftime('%Y-%m-%d')
        hour_str = f"{(round(dt_obj.hour / 3) * 3) % 24:02d}:00:00"
        result = result_forecast(lat, lon, date, hour_str)
        return jsonify(result)
    except Exception as e:
        print(f"API error: {e}")
        # MODIFICAÇÃO 3: Corrigindo o typo no jsonify
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    
# Bloco para rodar localmente (Gunicorn não usa isso, mas é bom para testes)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)