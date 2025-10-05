# ☁️ Previsão Climática Preditiva com Prophet

**Aplicação de Machine Learning para Previsão de Clima de Longo Prazo**

Este projeto oferece uma solução inovadora para a previsão do tempo de longo prazo, combinando dados climáticos históricos de alta qualidade com o poder do Machine Learning (ML) usando o algoritmo **Prophet**. A aplicação permite que o usuário insira uma localização (cidade, estado) e uma data específica para obter uma previsão do clima baseada em tendências sazonais e históricas.

---

## O Que Faz?

O projeto informa ao usuário a previsão do tempo de uma **data e localização escolhida**. Isso é feito através de um robusto *pipeline* de Ciência de Dados:

1.  **Coleta de Dados:** Uma API climática (**Giovanni - NASA**) fornece informações climáticas históricas dos últimos anos.
2.  **Modelagem de Série Temporal:** Os dados são processados e formatados adequadamente para treinar um modelo de ML baseado no algoritmo **Prophet** (Meta/Facebook). O Prophet é ideal para dados com forte sazonalidade (padrões anuais, semanais e diários).
3.  **Previsão e Entrega:** Após o treinamento, o modelo é capaz de prever o padrão climático em um período de tempo determinado. Desse período, a data selecionada pelo usuário é filtrada e as informações são apresentadas de forma clara na interface.

---

## Benefícios e Impacto

Nossa solução vai além das previsões operacionais de curto prazo, focando no **planejamento estratégico** de longo alcance, permitindo que os usuários tomem decisões informadas com antecedência.

| Área de Impacto | Benefício |
| :--- | :--- |
| **Planejamento Pessoal** | Permite planejar **viagens e eventos ao ar livre** com base em uma expectativa climática sólida, reduzindo incertezas. |
| **Agricultura** | Fundamental para planejar o **plantio, a colheita** e a gestão de recursos hídricos com eficiência máxima. |
| **Logística e Eventos** | Crucial para prever condições para **transporte de mercadorias** (Cadeia de Suprimentos) e organizar grandes **eventos** com maior confiança na tendência climática. |
---

## Tecnologias Utilizadas

| Categoria | Ferramenta / Linguagem | Propósito |
| :--- | :--- | :--- |
| **Ciência de Dados** | **Python** | Linguagem principal para o *backend*, processamento de dados e Machine Learning. |
| **Algoritmo de ML** | **Prophet (Meta/Facebook)** | Algoritmo robusto para previsão de séries temporais com sazonalidade. |
| **Interface (Frontend)** | **JavaScript, HTML, CSS** | Construção da página interativa, simples e intuitiva para o usuário. |
| **Fonte de Dados** | **API Giovanni (NASA)** | Utilizada para a coleta de dados climáticos históricos necessários ao treinamento. |
| **Ambiente de Dev** | **VSCode e Google Colab** | IDE e notebooks de desenvolvimento para codificação e experimentação. |

---

## Link da Aplicação

Você pode acessar e testar a aplicação através do seguinte endereço:

| Campo | Endereço |
| :--- | :--- |
| **Link** | **https://nini1504.github.io/HackatonNasaSpaceApps/** |
