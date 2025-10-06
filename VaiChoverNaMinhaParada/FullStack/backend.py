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
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from prophet import Prophet

# --- INÍCIO DA SEÇÃO DE CONFIGURAÇÃO ---

# URLs da API
signin_url = "https://api.giovanni.earthdata.nasa.gov/signin"
time_series_url = "https://api.giovanni.earthdata.nasa.gov/timeseries"

# Período histórico para buscar dados. A data final agora é dinâmica.
time_start = "2000-09-01T00:00:00"
time_end = datetime.now().strftime('%Y-%m-%d') + "T23:59:59" # BUG CRÍTICO CORRIGIDO AQUI

# Variáveis do GES DISC
prefix = "GLDAS_NOAH025_3H_2_1"
variables = [
    "_Tair_f_inst",    # Temperatura
    "_Qair_f_inst",    # Umidade
    "_Rainf_tavg",     # Precipitação de chuva
    "_Snowf_tavg",     # Precipitação de neve
    "_Wind_f_inst",    # Velocidade do vento
    "_Psurf_f_inst"    # Pressão
]


# --- FUNÇÃO DE AUTENTICAÇÃO REATORADA ---
def get_nasa_token():
    """
    Obtém um novo token de autenticação da NASA Earthdata.
    Esta função deve ser chamada a cada nova requisição para evitar tokens expirados.
    """
    homeDir = os.path.expanduser("~") + os.sep
    urs = 'urs.earthdata.nasa.gov'
    
    # IMPORTANTE: Em um ambiente de produção, não armazene credenciais diretamente no código.
    # Use variáveis de ambiente ou um serviço de gerenciamento de segredos.
    nasa_username = 'matheushcp7'
    nasa_password = '27012004Mhcp!!!'

    # Cria os arquivos de configuração necessários pela API
    with open(homeDir + '.netrc', 'w') as file:
        file.write(f'machine {urs} login {nasa_username} password {nasa_password}')
    
    with open(homeDir + '.urs_cookies', 'w') as file:
        file.write('')

    with open(homeDir + '.dodsrc', 'w') as file:
        file.write(f'HTTP.COOKIEJAR={homeDir}.urs_cookies\n')
        file.write(f'HTTP.NETRC={homeDir}.netrc')

    if platform.system() == "Windows":
        shutil.copy2(homeDir + '.dodsrc', os.getcwd())

    # Obtém as credenciais do arquivo .netrc recém-criado
    creds = netrc.netrc().hosts[urs]
    username, _, password = creds
    
    # Faz a requisição para obter o token
    response = requests.get(signin_url, auth=HTTPBasicAuth(username, password), allow_redirects=True)
    response.raise_for_status()  # Lança um erro se a requisição falhar (ex: 401 Unauthorized)
    
    token = response.text.replace('"', '')
    print("Novo token de autenticação da NASA obtido com sucesso.")
    print(f"Token: {token[:10]}... (truncado)")
    return token
 
# --- FUNÇÕES DE PROCESSAMENTO DE DADOS ---

def call_time_series(lat, lon, time_start, time_end):
    """
    Busca os dados de séries temporais da API da NASA para todas as variáveis.
    Agora obtém um novo token a cada chamada.
    """
    try:
        token = get_nasa_token() # OBTÉM UM NOVO TOKEN AQUI
    except Exception as e:
        print(f"Falha ao obter token de autenticação: {e}")
        # Retorna uma lista de respostas de erro para que o processo possa falhar de forma controlada
        error_response = f"Authentication failed: {e}"
        return [error_response] * len(variables)

    responses = []
    for variable in variables:
        query_parameters = {
            "data": prefix + variable,
            "location": f"[{lat},{lon}]",
            "time": f"{time_start}/{time_end}"
        }
        headers = {"authorizationtoken": token}
        response = requests.get(time_series_url, params=query_parameters, headers=headers)
        responses.append(response.text)
    return responses

def parse_csv(resp):
    # (Sua função parse_csv continua a mesma, já está robusta)
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

# (As funções de cálculo umidade_relativa e estimar_chance_chuva continuam as mesmas)
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
    # (Sua função de previsão, que já estava corrigida, continua a mesma)
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

# --- SEÇÃO DO FLASK APP (VERSÃO FINAL E CORRETA) ---

# Define a pasta raiz do projeto, onde estão index.html, style.css, script.js, etc.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Configura o Flask para saber ONDE estão os arquivos estáticos e COMO servi-los
app = Flask(
    __name__,
    static_folder=project_root,    # A pasta com os arquivos é a raiz do projeto
    static_url_path=''             # Sirva-os a partir da URL raiz (ex: /style.css)
)
CORS(app)


# Rota principal para servir o index.html
@app.route('/')
def serve_frontend():
    # Agora usamos a função interna do Flask, que é otimizada para isso
    return app.send_static_file('index.html')

# Rota da API para a previsão do tempo
@app.route('/api/forecast', methods=['POST'])
def forecast_api():
    data = request.json
    lat, lon, timestamp = data.get('latitude'), data.get('longitude'), data.get('datetime')
    if not all([lat, lon, timestamp]):
        return jsonify({"error": "Parâmetros latitude, longitude ou datetime faltando."}), 400
    try:
        dt_obj = datetime.strptime(timestamp, '%Y-%m-%dT%H:%M')
        date = dt_obj.strftime('%Y-%m-%d')
        hour = (round(dt_obj.hour / 3) * 3) % 24
        hour_str = f"{hour:02d}:00:00"
        result = result_forecast(lat, lon, date, hour_str)
        return jsonify(result)
    except Exception as e:
        print(f"Erro na API: {e}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500

# Executa a aplicação
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)