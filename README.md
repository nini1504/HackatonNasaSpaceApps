# ☁️ Predictive Climate Forecasting with Prophet

**Machine Learning Application for Long-Term Weather Forecasting**

This project offers an innovative solution for long-term weather forecasting, combining high-quality historical climate data with the power of Machine Learning (ML) using the **Prophet** algorithm. The application allows the user to input a location (city, state) and a specific date to obtain a weather forecast based on seasonal and historical trends.

---

## What Does It Do?

The project informs the user of the weather forecast for a **chosen date and location**. This is accomplished through a robust Data Science pipeline:

1.  **Data Collection:** A weather API (**Giovanni - NASA**) provides historical climate information from the last several years.
2.  **Time Series Modeling:** The data is processed and formatted appropriately to train an ML model based on the **Prophet** algorithm (Meta/Facebook). Prophet is ideal for data with strong seasonality (annual, weekly, and daily patterns).
3.  **Forecasting and Delivery:** After training, the model is able to predict the weather pattern over a determined period. From this period, the date selected by the user is filtered, and the information is presented clearly in the interface.

---

## Benefits and Impact

Our solution goes beyond short-term operational forecasts, focusing on long-range **strategic planning**, allowing users to make informed decisions in advance.

Area of Impact | Benefit
--- | ---
**Personal Planning** | Allows planning for **trips and outdoor events** based on a solid weather expectation, reducing uncertainties.
**Agriculture** | Fundamental for planning **planting, harvesting**, and managing water resources with maximum efficiency.
**Logistics and Events** | Crucial for predicting conditions for the **transportation of goods** (Supply Chain) and organizing large **events** with greater confidence in the weather trend.

---

## Technologies Used

Category | Tool / Language | Purpose
--- | --- | ---
**Data Science** | **Python** | Main language for the backend, data processing, and Machine Learning.
**ML Algorithm** | **Prophet (Meta/Facebook)** | A robust algorithm for forecasting time series with seasonality.
**Interface (Frontend)** | **JavaScript, HTML, CSS** | Building the interactive, simple, and intuitive user page.
**Data Source** | **Giovanni API (NASA)** | Used for collecting the historical climate data necessary for training.
**Dev Environment** | **VSCode and Google Colab** | IDE and development notebooks for coding and experimentation.

---

## Application Link

You can access and test the application at the following address:

Field | Address
--- | ---
**Link** | **https://nini1504.github.io/HackatonNasaSpaceApps/](https://staticfile-2f3f5.wasmer.app/**
